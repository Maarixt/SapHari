import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Command validation schemas
const commandSchema = z.object({
  deviceId: z.string().min(1).max(100),
  command: z.enum(['toggle', 'servo', 'sensor_read', 'gpio_write']),
  params: z.object({
    addr: z.string().optional(),
    pin: z.number().int().min(0).max(39).optional(),
    state: z.union([z.number(), z.boolean()]).optional(),
    angle: z.number().min(0).max(180).optional(),
    value: z.number().optional(),
  }).passthrough()
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Authenticate user via getClaims
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.error('Authentication failed:', claimsError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = claimsData.claims.sub as string;

    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Validate request body
    const body = await req.json()
    const validation = commandSchema.safeParse(body)
    
    if (!validation.success) {
      console.error('Validation failed:', validation.error)
      return new Response(
        JSON.stringify({ error: 'Invalid request', details: validation.error.issues }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { deviceId, command, params } = validation.data

    // 3. Check device ownership
    const { data: device, error: deviceError } = await supabaseAdmin
      .from('devices')
      .select('id, device_key, device_id')
      .eq('device_id', deviceId)
      .eq('user_id', userId)
      .single()

    if (deviceError || !device) {
      console.error('Device not found or access denied:', deviceError)
      return new Response(
        JSON.stringify({ error: 'Device not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Rate limit check (100 commands per minute per user)
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString()
    const { count } = await supabaseAdmin
      .from('commands')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', oneMinuteAgo)

    if (count && count > 100) {
      console.log('Rate limit exceeded for user:', userId)
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded: max 100 commands per minute' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Create HMAC signature for command authentication
    const timestamp = Date.now()
    const payloadToSign = JSON.stringify({ command, params, timestamp })
    
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(device.device_key),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(payloadToSign)
    )
    
    const signature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // 6. Prepare command payload with signature
    const commandPayload = {
      ...params,
      _sig: signature,
      _ts: timestamp
    }

    // 7. Audit log the command
    const reqId = crypto.randomUUID()
    
    const { error: commandLogError } = await supabaseAdmin
      .from('commands')
      .insert({
        user_id: userId,
        device_id: device.id,
        command,
        payload: params,
        req_id: reqId,
        status: 'sent',
        sent_at: new Date().toISOString()
      })

    if (commandLogError) {
      console.error('Failed to log command:', commandLogError)
    }

    console.log(`Command ${command} sent to device ${deviceId} with signature`)

    // 8. Return success
    return new Response(
      JSON.stringify({
        ok: true,
        topic: `saphari/${device.device_id}/cmd/${command}`,
        payload: commandPayload,
        reqId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Device command error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
