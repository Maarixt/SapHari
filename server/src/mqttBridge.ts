import mqtt from 'mqtt';
import fetch from 'node-fetch';

// Command acknowledgment validation (simplified version for server)
interface CommandAck {
  cmd_id: string;
  ok: boolean;
  error?: string;
  result?: any;
  ts: number;
}

function validateCommandAck(ack: any): ack is CommandAck {
  return (
    typeof ack === 'object' &&
    typeof ack.cmd_id === 'string' &&
    typeof ack.ok === 'boolean' &&
    typeof ack.ts === 'number' &&
    ack.cmd_id.length > 0
  );
}

// Generate server JWT for MQTT authentication
function generateServerJWT(): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({
    sub: 'saphari-server',
    role: 'admin',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
  })).toString('base64');
  const signature = Buffer.from('server-secret' + header + payload).toString('base64'); // Simplified
  return `${header}.${payload}.${signature}`;
}

export function startMqttBridge(){
  console.log('🌉 Starting secure MQTT bridge...');
  
  // Generate server JWT for MQTT authentication
  const serverJWT = generateServerJWT();
  
  const client = mqtt.connect(process.env.MQTT_URL || 'mqtts://broker.emqx.io:8883', {
    clientId: 'saphari-server-' + Math.random().toString(16).slice(2, 8),
    reconnectPeriod: 2000,
    username: serverJWT, // JWT authentication
    password: '', // No password when using JWT
  });
  
  client.on('connect', ()=>{
    console.log('✅ Secure MQTT bridge connected');
    // Subscribe to all tenant topics (server has admin access)
    client.subscribe('saphari/+/devices/+/event');
    client.subscribe('saphari/+/devices/+/status');
    client.subscribe('saphari/+/devices/+/state');
    client.subscribe('saphari/+/devices/+/ack'); // Subscribe to command acknowledgments
  });
  
  client.on('message', async (topic, payload) => {
    try {
      const msg = payload.toString();
      console.log(`📨 Secure MQTT bridge received: ${topic} -> ${msg}`);
      
      // Parse secure topic structure: saphari/{tenant}/devices/{device}/{channel}
      const topicParts = topic.split('/');
      if (topicParts.length < 5 || topicParts[0] !== 'saphari') {
        console.warn('Received message with invalid topic structure:', topic);
        return;
      }
      
      const tenantId = topicParts[1];
      const deviceId = topicParts[3];
      const channel = topicParts[4];
      
      // Example: offline → email
      if(channel === 'status' && msg === 'offline'){
        console.log(`🚨 Device ${deviceId} (tenant: ${tenantId}) went offline`);
        
        await fetch(`http://localhost:${process.env.PORT||8080}/api/notify`, {
          method:'POST', 
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            deviceId, 
            tenantId,
            name:'Device Offline', 
            value:'offline',
            severity:'critical', 
            channels:['email','slack']
          })
        }).catch((err) => {
          console.error('Failed to send offline notification:', err);
        });
      }
      
      // Example: high temperature → email
      if(channel === 'state') {
        try {
          const state = JSON.parse(msg);
          if (state.sensors?.tempC > 60) {
            console.log(`🌡️ Device ${deviceId} (tenant: ${tenantId}) temperature critical: ${state.sensors.tempC}°C`);
            
            await fetch(`http://localhost:${process.env.PORT||8080}/api/notify`, {
              method:'POST', 
              headers:{'Content-Type':'application/json'},
              body: JSON.stringify({
                deviceId, 
                tenantId,
                name:'Critical Temperature', 
                value: state.sensors.tempC,
                severity:'critical', 
                channels:['email','slack','telegram']
              })
            }).catch((err) => {
              console.error('Failed to send temperature alert:', err);
            });
          }
        } catch (e) {
          console.error('Failed to parse state message:', e);
        }
      }
      
      // Handle command acknowledgments
      if(channel === 'ack') {
        try {
          const ackData = JSON.parse(msg);
          
          if (validateCommandAck(ackData)) {
            const ack: CommandAck = {
              cmd_id: ackData.cmd_id,
              ok: ackData.ok,
              error: ackData.error,
              result: ackData.result,
              ts: ackData.ts
            };
            
            console.log(`✅ Command ACK from ${deviceId} (tenant: ${tenantId}): ${ack.cmd_id} - ${ack.ok ? 'SUCCESS' : 'FAILED'}`);
            
            // Log command acknowledgment for audit
            await fetch(`http://localhost:${process.env.PORT||8080}/api/commands/ack`, {
              method:'POST', 
              headers:{'Content-Type':'application/json'},
              body: JSON.stringify({
                deviceId,
                tenantId,
                cmd_id: ack.cmd_id,
                ok: ack.ok,
                error: ack.error,
                result: ack.result,
                timestamp: ack.ts
              })
            }).catch((err) => {
              console.error('Failed to log command ACK:', err);
            });
            
            // Send notification for failed commands
            if (!ack.ok) {
              console.log(`🚨 Command ${ack.cmd_id} failed on device ${deviceId}: ${ack.error}`);
              
              await fetch(`http://localhost:${process.env.PORT||8080}/api/notify`, {
                method:'POST', 
                headers:{'Content-Type':'application/json'},
                body: JSON.stringify({
                  deviceId, 
                  tenantId,
                  name:'Command Failed', 
                  value: ack.error || 'Unknown error',
                  severity:'warning', 
                  channels:['email','slack'],
                  metadata: {
                    cmd_id: ack.cmd_id,
                    command_type: 'device_command'
                  }
                })
              }).catch((err) => {
                console.error('Failed to send command failure notification:', err);
              });
            }
          } else {
            console.warn(`Invalid ACK format from ${deviceId} (tenant: ${tenantId}):`, msg);
          }
        } catch (e) {
          console.error('Failed to parse ACK message:', e);
        }
      }
    } catch (error) {
      console.error('Secure MQTT bridge message error:', error);
    }
  });
  
  client.on('error', (error) => {
    console.error('❌ MQTT bridge error:', error);
  });
  
  client.on('close', () => {
    console.log('🔌 MQTT bridge disconnected');
  });
  
  client.on('reconnect', () => {
    console.log('🔄 MQTT bridge reconnecting...');
  });
}
