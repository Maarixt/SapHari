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
    const { email, password, twoFactorCode } = await req.json()

    // Get secrets from environment
    const masterEmail = Deno.env.get('MASTER_EMAIL')
    const masterPassword = Deno.env.get('MASTER_PASSWORD')
    const jwtSecret = Deno.env.get('AUTH_COOKIE_SECRET') || 'default-secret-change-in-production'

    console.log('Secure master login attempt for:', email)

    // Create Supabase client for tracking attempts
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    if (!masterEmail || !masterPassword) {
      console.error('Missing required environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check rate limiting BEFORE credential validation (prevent enumeration)
    const { data: rateLimitOk } = await supabaseAdmin.rpc('check_master_login_rate_limit', {
      p_email: email,
      p_ip_address: ipAddress
    })

    if (!rateLimitOk) {
      console.log('Rate limit exceeded for:', email)
      
      // Log rate limit attempt
      await supabaseAdmin.from('master_login_attempts').insert({
        email,
        success: false,
        ip_address: ipAddress,
        user_agent: userAgent
      })
      
      return new Response(
        JSON.stringify({ 
          error: 'Too many failed attempts. Please wait 10 minutes before trying again.',
          rateLimited: true
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate master credentials
    if (email !== masterEmail || password !== masterPassword) {
      console.log('Invalid master credentials')
      
      // Log failed attempt to both tables
      await Promise.all([
        supabaseAdmin.from('master_login_attempts').insert({
          email,
          success: false,
          ip_address: ipAddress,
          user_agent: userAgent
        }),
        supabaseAdmin.from('audit_logs').insert({
          actor_email: email,
          actor_role: 'user',
          action: 'MASTER_LOGIN_FAILED',
          resource: 'authentication',
          details: { success: false, reason: 'Invalid credentials' },
          ip_address: ipAddress,
          user_agent: userAgent
        })
      ])
      
      return new Response(
        JSON.stringify({ error: 'Invalid master credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    // Validate 2FA if enabled (future: implement TOTP)
    // For now, accept hardcoded codes for backwards compatibility
    const validCodes = ['123456', '654321', '111111', '789012']
    if (twoFactorCode && !validCodes.includes(twoFactorCode)) {
      console.log('Invalid 2FA code provided')
      
      await supabaseAdmin.from('master_login_attempts').insert({
        email,
        success: false,
        ip_address: ipAddress,
        user_agent: userAgent
      })
      
      return new Response(
        JSON.stringify({ error: 'Invalid 2FA code' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create cryptographically signed JWT with shorter expiration
    const payload = {
      sub: userId,
      email: email,
      role: 'master',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (2 * 60 * 60), // 2 hours (reduced from 8)
      jti: crypto.randomUUID() // JWT ID for token revocation tracking
    }

    const jwt = await create(
      { alg: 'HS256', typ: 'JWT' },
      payload,
      jwtSecret
    )

    // Log successful master login to both tables
    await Promise.all([
      supabaseAdmin.from('master_login_attempts').insert({
        email,
        success: true,
        ip_address: ipAddress,
        user_agent: userAgent
      }),
      supabaseAdmin.from('audit_logs').insert({
        actor_email: email,
        actor_role: 'master',
        action: 'MASTER_LOGIN_SUCCESS',
        resource: 'authentication',
        details: { 
          success: true, 
          sessionExpiry: payload.exp,
          jti: payload.jti,
          twoFactorUsed: !!twoFactorCode
        },
        ip_address: ipAddress,
        user_agent: userAgent
      })
    ])

    console.log('Master login successful with signed JWT')

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
