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
    const { sessionToken, email } = await req.json()

    if (sessionToken) {
      // Log master logout to audit log
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      await supabaseAdmin
        .from('audit_logs')
        .insert({
          actor_email: email || 'unknown',
          actor_role: 'master',
          action: 'MASTER_LOGOUT',
          resource: 'authentication',
          details: { timestamp: new Date().toISOString() },
          ip_address: req.headers.get('x-forwarded-for') || 'unknown',
          user_agent: req.headers.get('user-agent') || 'unknown'
        })
    }

    console.log('Master logout successful')

    return new Response(
      JSON.stringify({ ok: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Master logout error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
