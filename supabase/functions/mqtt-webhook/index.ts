import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MQTTPayload {
  topic: string;
  payload: string;
  ts?: number;
  clientid?: string;
}

interface AlertRule {
  id: string;
  user_id: string;
  device_id: string;
  name: string;
  source: 'GPIO' | 'SENSOR' | 'ONLINE';
  pin?: number;
  sensor_key?: string;
  condition: string;
  expected_value?: string;
  message_template: string;
  severity: string;
  cooldown_seconds: number;
  last_fired_at?: string;
}

// Parse topic to extract deviceId and type
function parseTopic(topic: string): { deviceId: string; type: string; key: string } | null {
  // Expected format: saphari/<deviceId>/<type>/<key>
  // e.g., saphari/saph-mavkby/gpio/2
  const parts = topic.split('/');
  if (parts.length < 4 || parts[0] !== 'saphari') return null;
  
  return {
    deviceId: parts[1],
    type: parts[2],
    key: parts[3]
  };
}

// Check if value matches condition
function evaluateCondition(condition: string, currentValue: any, expectedValue: any, prevValue?: any): boolean {
  switch (condition) {
    case 'equals':
      return String(currentValue) === String(expectedValue);
    case 'not_equals':
      return String(currentValue) !== String(expectedValue);
    case 'greater_than':
      return Number(currentValue) > Number(expectedValue);
    case 'less_than':
      return Number(currentValue) < Number(expectedValue);
    case 'rising':
      return prevValue === 0 && Number(currentValue) === 1;
    case 'falling':
      return prevValue === 1 && Number(currentValue) === 0;
    case 'changes':
      return prevValue !== undefined && String(currentValue) !== String(prevValue);
    default:
      return false;
  }
}

// Replace template variables
function formatMessage(template: string, vars: Record<string, any>): string {
  let message = template;
  for (const [key, value] of Object.entries(vars)) {
    message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
  }
  return message;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: MQTTPayload = await req.json();
    console.log('MQTT Webhook received:', payload);

    const parsed = parseTopic(payload.topic);
    if (!parsed) {
      console.log('Invalid topic format:', payload.topic);
      return new Response(JSON.stringify({ success: false, error: 'Invalid topic format' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { deviceId, type, key } = parsed;
    const value = payload.payload;
    const timestamp = payload.ts || Date.now();

    console.log(`Processing: device=${deviceId}, type=${type}, key=${key}, value=${value}`);

    // Find the device by device_id
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('id, user_id, name')
      .eq('device_id', deviceId)
      .single();

    if (deviceError || !device) {
      console.log('Device not found:', deviceId);
      return new Response(JSON.stringify({ success: false, error: 'Device not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch enabled alert rules for this device
    const { data: rules, error: rulesError } = await supabase
      .from('alert_rules')
      .select('*')
      .eq('device_id', device.id)
      .eq('enabled', true);

    if (rulesError) {
      console.error('Error fetching rules:', rulesError);
      return new Response(JSON.stringify({ success: false, error: 'Error fetching rules' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${rules?.length || 0} active rules for device`);

    const alertsToCreate: any[] = [];
    const rulesToUpdate: string[] = [];

    for (const rule of rules || []) {
      let shouldFire = false;

      // Check if rule matches the incoming message type
      if (type === 'gpio' && rule.source === 'GPIO') {
        // Check if pin matches
        if (rule.pin !== null && String(rule.pin) === key) {
          shouldFire = evaluateCondition(rule.condition, value, rule.expected_value);
        }
      } else if (type === 'sensor' && rule.source === 'SENSOR') {
        // Check if sensor key matches
        if (rule.sensor_key === key) {
          shouldFire = evaluateCondition(rule.condition, value, rule.expected_value);
        }
      } else if (type === 'status' && rule.source === 'ONLINE') {
        shouldFire = evaluateCondition(rule.condition, value, rule.expected_value);
      }

      if (!shouldFire) continue;

      // Check cooldown
      if (rule.last_fired_at) {
        const lastFired = new Date(rule.last_fired_at).getTime();
        const cooldownMs = (rule.cooldown_seconds || 30) * 1000;
        if (timestamp - lastFired < cooldownMs) {
          console.log(`Rule ${rule.id} skipped due to cooldown`);
          continue;
        }
      }

      // Format the message
      const message = formatMessage(rule.message_template, {
        value,
        pin: key,
        device: device.name,
        deviceId,
        timestamp: new Date(timestamp).toISOString()
      });

      console.log(`Rule ${rule.id} fired: ${message}`);

      alertsToCreate.push({
        user_id: device.user_id,
        device_id: device.id,
        rule_id: rule.id,
        type: 'alert_rule',
        message,
        severity: rule.severity,
        state: 'open',
        details: {
          source: type,
          key,
          value,
          rule_name: rule.name,
          condition: rule.condition,
          expected_value: rule.expected_value
        }
      });

      rulesToUpdate.push(rule.id);
    }

    // Insert alerts
    if (alertsToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from('alerts')
        .insert(alertsToCreate);

      if (insertError) {
        console.error('Error inserting alerts:', insertError);
      } else {
        console.log(`Created ${alertsToCreate.length} alerts`);
      }
    }

    // Update last_fired_at for triggered rules
    if (rulesToUpdate.length > 0) {
      const { error: updateError } = await supabase
        .from('alert_rules')
        .update({ last_fired_at: new Date(timestamp).toISOString() })
        .in('id', rulesToUpdate);

      if (updateError) {
        console.error('Error updating rules:', updateError);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed: true,
      alerts_created: alertsToCreate.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
