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
    const { sessionToken } = await req.json()

    if (!sessionToken) {
      return new Response(
        JSON.stringify({ ok: false, error: 'No session token provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Decode and verify session token
    const sessionData = JSON.parse(atob(sessionToken))
    const now = Math.floor(Date.now() / 1000)

    if (sessionData.exp < now) {
      console.log('Session expired')
      return new Response(
        JSON.stringify({ ok: false, error: 'Session expired' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (sessionData.role !== 'master') {
      return new Response(
        JSON.stringify({ ok: false, error: 'Not a master session' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the user still has master role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: role, error } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', sessionData.userId)
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
        email: sessionData.email,
        userId: sessionData.userId
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
