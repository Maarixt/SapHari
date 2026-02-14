import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * MQTT Credentials Edge Function
 * 
 * Issues short-lived MQTT credentials for authenticated users.
 * Returns dashboard-scoped credentials that allow subscribing to the user's device topics.
 * 
 * SECURITY: Dashboard credentials are now stored in Supabase secrets, not in the database.
 */
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with the user's auth header
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader }
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    });

    // Verify user via getClaims (faster, local JWT validation)
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.error('Auth claims error:', claimsError?.message || 'No claims');
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub as string;
    console.log(`Issuing MQTT credentials for user: ${userId}`);

    // Use service role for database queries
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    });

    // Get the user's devices to scope the credentials
    const { data: devices, error: devicesError } = await supabaseAdmin
      .from('devices')
      .select('device_id')
      .eq('user_id', userId);

    if (devicesError) {
      console.error('Error fetching devices:', devicesError);
      return new Response(
        JSON.stringify({ error: 'Database error', message: 'Failed to fetch devices' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get platform broker config (without password - we'll use secrets)
    const { data: brokerConfig, error: brokerError } = await supabaseAdmin
      .from('platform_broker_config')
      .select('wss_url, tcp_host, wss_port')
      .eq('is_active', true)
      .eq('is_default', true)
      .single();

    if (brokerError || !brokerConfig) {
      console.error('Broker config error:', brokerError);
      return new Response(
        JSON.stringify({ error: 'Configuration error', message: 'MQTT broker not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get dashboard credentials from Supabase secrets (NOT from database)
    const dashboardUsername = Deno.env.get('MQTT_DASHBOARD_USERNAME');
    const dashboardPassword = Deno.env.get('MQTT_DASHBOARD_PASSWORD');

    if (!dashboardUsername || !dashboardPassword) {
      console.error('MQTT dashboard credentials not configured in secrets');
      return new Response(
        JSON.stringify({ error: 'Configuration error', message: 'MQTT credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build list of allowed topics for this user
    const deviceIds = devices?.map(d => d.device_id) || [];
    const allowedTopics = deviceIds.flatMap(deviceId => [
      `saphari/${deviceId}/status`,
      `saphari/${deviceId}/status/online`,
      `saphari/${deviceId}/gpio/#`,
      `saphari/${deviceId}/sensor/#`,
      `saphari/${deviceId}/gauge/#`,
      `saphari/${deviceId}/state`,
      `saphari/${deviceId}/ack`
    ]);

    // Generate a unique client ID for this session (avoids collision with ESP32 devices)
    const clientId = `web_${userId.substring(0, 8)}_${Date.now().toString(36)}`;

    // Return credentials (dashboard credentials from secrets, NOT database)
    const credentials = {
      wss_url: brokerConfig.wss_url,
      tcp_host: brokerConfig.tcp_host,
      wss_port: brokerConfig.wss_port || 8084,
      username: dashboardUsername,
      password: dashboardPassword,
      client_id: clientId,
      allowed_topics: allowedTopics,
      device_ids: deviceIds,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      user_id: userId
    };

    console.log(`Issued credentials for ${deviceIds.length} devices, client: ${clientId}`);

    return new Response(
      JSON.stringify(credentials),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Server error', message: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
