// MQTT Bridge Service
// Subscribes to MQTT topics and writes data to Supabase database

import mqtt from "mqtt";
import { createClient } from "@supabase/supabase-js";

const MQTT_URL = process.env.MQTT_URL || "wss://broker.emqx.io:8084/mqtt";
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;

// Validate required environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error("Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE");
  process.exit(1);
}

const client = mqtt.connect(MQTT_URL, { 
  reconnectPeriod: 1000,
  clientId: 'mqtt-bridge-' + Math.random().toString(16).slice(2)
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

// Connection event handlers
client.on("connect", () => {
  console.log("🔌 MQTT Bridge connected to broker");
  
  // Subscribe to all device topics
  client.subscribe("devices/+/state");
  client.subscribe("devices/+/event");
  client.subscribe("devices/+/status");
  client.subscribe("devices/+/cmd");
  client.subscribe("devices/+/ack");
  
  console.log("📡 MQTT Bridge subscribed to device topics");
});

client.on("error", (error) => {
  console.error("❌ MQTT Bridge error:", error);
});

client.on("close", () => {
  console.log("🔌 MQTT Bridge disconnected");
});

client.on("reconnect", () => {
  console.log("🔄 MQTT Bridge reconnecting...");
});

// Message processing
client.on("message", async (topic, payloadBuf) => {
  const payloadStr = payloadBuf.toString();
  const payload = safeJSON(payloadStr);
  const device_id = topic.split("/")[1];
  const messageSize = payloadBuf.length;

  console.log(`📨 MQTT Bridge received: ${topic} (${messageSize} bytes)`);

  try {
    // Track raw throughput
    await supabase.from("mqtt_messages").insert({
      device_id,
      topic,
      direction: "sub", // Inbound from devices
      payload: payload
    });

    // Process different topic types
    if (topic.endsWith("/status")) {
      await handleStatusMessage(device_id, payload);
    } else if (topic.endsWith("/event")) {
      await handleEventMessage(device_id, payload);
    } else if (topic.endsWith("/state")) {
      await handleStateMessage(device_id, payload);
    } else if (topic.endsWith("/cmd")) {
      await handleCommandMessage(device_id, payload);
    } else if (topic.endsWith("/ack")) {
      await handleAckMessage(device_id, payload);
    }

  } catch (error) {
    console.error(`❌ Error processing message from ${topic}:`, error);
  }
});

// Handle device status messages
async function handleStatusMessage(device_id: string, payload: any) {
  const { online, ip, rssi, battery_pct } = payload || {};
  
  await supabase.from("device_status")
    .upsert({ 
      device_id, 
      online: !!online, 
      ip, 
      rssi, 
      battery_pct, 
      last_seen: new Date().toISOString() 
    }, {
      onConflict: 'device_id'
    });

  console.log(`📊 Updated device status: ${device_id} - ${online ? 'online' : 'offline'}`);
}

// Handle device event messages
async function handleEventMessage(device_id: string, payload: any) {
  // Normalize level/code/message
  const level = payload?.level ?? "info";
  const code = payload?.code ?? null;
  const message = payload?.message ?? JSON.stringify(payload).slice(0, 500);
  
  await supabase.from("device_events").insert({
    device_id,
    level,
    code,
    message,
    meta: payload
  });

  console.log(`📝 Recorded device event: ${device_id} - ${level} - ${message}`);
}

// Handle device state messages
async function handleStateMessage(device_id: string, payload: any) {
  // Update device status to online when we receive state
  await supabase.from("device_status")
    .upsert({ 
      device_id, 
      online: true, 
      last_seen: new Date().toISOString() 
    }, {
      onConflict: 'device_id'
    });

  // Record state change event
  await supabase.from("device_events").insert({
    device_id,
    level: "info",
    code: "state_update",
    message: "Device state updated",
    meta: payload
  });

  console.log(`🔄 Updated device state: ${device_id}`);
}

// Handle command messages (outbound)
async function handleCommandMessage(device_id: string, payload: any) {
  // Record command in audit logs
  await supabase.from("audit_logs").insert({
    actor_id: null, // System-generated
    action: "device_command",
    target_type: "device",
    target_id: device_id,
    details: payload
  });

  console.log(`📤 Recorded command: ${device_id}`);
}

// Handle acknowledgment messages
async function handleAckMessage(device_id: string, payload: any) {
  // Record acknowledgment
  await supabase.from("device_events").insert({
    device_id,
    level: "info",
    code: "command_ack",
    message: "Command acknowledged",
    meta: payload
  });

  console.log(`✅ Recorded ACK: ${device_id}`);
}

// Safe JSON parsing
function safeJSON(s: string) {
  try { 
    return JSON.parse(s);
  } catch { 
    return { raw: s };
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 MQTT Bridge shutting down...');
  client.end();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 MQTT Bridge shutting down...');
  client.end();
  process.exit(0);
});

// Health check endpoint (if running as HTTP server)
if (process.env.ENABLE_HTTP_SERVER === 'true') {
  const http = require('http');
  const server = http.createServer((req: any, res: any) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'healthy', 
        connected: client.connected,
        timestamp: new Date().toISOString()
      }));
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  const port = process.env.PORT || 3001;
  server.listen(port, () => {
    console.log(`🌐 MQTT Bridge HTTP server listening on port ${port}`);
  });
}

console.log("🚀 MQTT Bridge service started");
console.log(`📡 Connecting to MQTT broker: ${MQTT_URL}`);
console.log(`🗄️  Connecting to Supabase: ${SUPABASE_URL}`);
