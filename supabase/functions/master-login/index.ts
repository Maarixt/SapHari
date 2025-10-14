import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const cookieSecret = Deno.env.get('AUTH_COOKIE_SECRET')

    console.log('Master login attempt for:', email)

    if (!masterEmail || !masterPassword || !cookieSecret) {
      console.error('Missing required environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate master credentials
    if (email !== masterEmail || password !== masterPassword) {
      console.log('Invalid master credentials')
      return new Response(
        JSON.stringify({ error: 'Invalid master credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Optional 2FA validation
    const validTwoFactorCodes = ['123456', '654321', '111111', '789012']
    if (twoFactorCode && !validTwoFactorCodes.includes(twoFactorCode)) {
      console.log('Invalid 2FA code')
      return new Response(
        JSON.stringify({ error: 'Invalid 2FA code' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Find or create profile for master user
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', masterEmail)
      .maybeSingle()

    let userId: string

    if (!profile) {
      // Create a profile for master (this should ideally be done via auth signup)
      console.log('Master profile not found, this should be created via normal auth signup first')
      return new Response(
        JSON.stringify({ error: 'Master account not properly configured. Please create account via normal signup first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    userId = profile.id

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

    // Log master login to audit log
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        actor_email: email,
        actor_role: 'master',
        action: 'MASTER_LOGIN',
        resource: 'authentication',
        details: { success: true, twoFactorUsed: !!twoFactorCode },
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown'
      })

    // Create session token (simple approach - encode user info with timestamp)
    const sessionData = {
      userId,
      email,
      role: 'master',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60) // 8 hours
    }

    const sessionToken = btoa(JSON.stringify(sessionData))

    console.log('Master login successful')

    return new Response(
      JSON.stringify({
        ok: true,
        role: 'master',
        userId,
        email,
        sessionToken
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
