import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { create } from 'https://deno.land/x/djwt@v3.0.2/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email, password } = await req.json()

    // Get secrets from environment
    const masterEmail = Deno.env.get('MASTER_EMAIL')
    const masterPassword = Deno.env.get('MASTER_PASSWORD')
    const jwtSecret = Deno.env.get('AUTH_COOKIE_SECRET') || 'default-secret-change-in-production'

    console.log('Secure master login attempt for:', email)

    if (!masterEmail || !masterPassword) {
      console.error('Missing required environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate master credentials
    if (email !== masterEmail || password !== masterPassword) {
      console.log('Invalid master credentials')
      
      // Log failed attempt to audit log
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      await supabaseAdmin.from('audit_logs').insert({
        actor_email: email,
        actor_role: 'user',
        action: 'MASTER_LOGIN_FAILED',
        resource: 'authentication',
        details: { success: false, reason: 'Invalid credentials' },
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown'
      })
      
      return new Response(
        JSON.stringify({ error: 'Invalid master credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Find profile for master user
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', masterEmail)
      .maybeSingle()

    if (!profile) {
      console.log('Master profile not found')
      return new Response(
        JSON.stringify({ error: 'Master account not configured. Create account via normal signup first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = profile.id

    // Check if master role exists
    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'master')
      .maybeSingle()

    if (!existingRole) {
      // Grant master role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'master'
        })

      if (roleError) {
        console.error('Error granting master role:', roleError)
      }
    }

    // Create cryptographically signed JWT
    const payload = {
      sub: userId,
      email: email,
      role: 'master',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (2 * 60 * 60) // 2 hours (reduced from 8)
    }

    const jwt = await create(
      { alg: 'HS256', typ: 'JWT' },
      payload,
      jwtSecret
    )

    // Log successful master login to audit log
    await supabaseAdmin.from('audit_logs').insert({
      actor_email: email,
      actor_role: 'master',
      action: 'MASTER_LOGIN',
      resource: 'authentication',
      details: { success: true, sessionExpiry: payload.exp },
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown'
    })

    console.log('Master login successful with JWT')

    return new Response(
      JSON.stringify({
        ok: true,
        role: 'master',
        userId,
        email,
        sessionToken: jwt
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error) {
    console.error('Master login error:', error)
    return new Response(
      JSON.stringify({ error: 'Authentication failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
