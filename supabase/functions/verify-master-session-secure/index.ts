import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verify } from 'https://deno.land/x/djwt@v3.0.2/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { sessionToken } = await req.json()

    if (!sessionToken) {
      return new Response(
        JSON.stringify({ ok: false, error: 'No session token provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const jwtSecret = Deno.env.get('AUTH_COOKIE_SECRET') || 'default-secret-change-in-production'

    // Verify JWT signature and expiry
    let payload
    try {
      const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(jwtSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
      )
      payload = await verify(sessionToken, key, 'HS256')
    } catch (error) {
      console.log('JWT verification failed:', error.message)
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid or expired session token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check role claim
    if (payload.role !== 'master') {
      return new Response(
        JSON.stringify({ ok: false, error: 'Not a master session' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the user still has master role in database
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: role, error } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', payload.sub)
      .eq('role', 'master')
      .maybeSingle()

    if (error || !role) {
      console.log('Master role not found for user')
      return new Response(
        JSON.stringify({ ok: false, error: 'Master role revoked' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Master session verified successfully')

    return new Response(
      JSON.stringify({
        ok: true,
        role: 'master',
        email: payload.email,
        userId: payload.sub
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Session verification error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: 'Invalid session token' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
