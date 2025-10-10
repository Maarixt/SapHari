// Supabase Edge Function for Master Metrics
// GET /master/metrics -> { kpis, alerts24h, mqttSeries }

import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    // Check master role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401 });
    
    const { data: roleRow } = await supabase.rpc("is_master", { uid: user.id });
    if (!roleRow) return new Response("Forbidden", { status: 403 });

    // Get master metrics data
    const { data: kpis } = await supabase.rpc("get_master_kpis");
    const { data: alerts24h } = await supabase.from("v_alerts_24h_summary").select("*");
    const { data: mqttSeries } = await supabase.from("v_mqtt_last_hour").select("*");

    return new Response(JSON.stringify({ 
      kpis: kpis?.[0] ?? null, 
      alerts24h, 
      mqttSeries 
    }), {
      headers: { 
        "content-type": "application/json",
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Error in master-metrics function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
