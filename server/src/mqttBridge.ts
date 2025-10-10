import mqtt from 'mqtt';
import fetch from 'node-fetch';

export function startMqttBridge(){
  console.log('🌉 Starting MQTT bridge...');
  
  const client = mqtt.connect(process.env.MQTT_URL || 'mqtts://broker.emqx.io:8883', {
    clientId: 'saphari-server-' + Math.random().toString(16).slice(2, 8),
    reconnectPeriod: 2000,
  });
  
  client.on('connect', ()=>{
    console.log('✅ MQTT bridge connected');
    client.subscribe('devices/+/event');
    client.subscribe('devices/+/status');
    client.subscribe('devices/+/state');
  });
  
  client.on('message', async (topic, payload) => {
    try {
      const msg = payload.toString();
      console.log(`📨 MQTT bridge received: ${topic} -> ${msg}`);
      
      // Example: offline → email
      if(topic.endsWith('/status') && msg === 'offline'){
        const [, deviceId] = topic.split('/');
        console.log(`🚨 Device ${deviceId} went offline`);
        
        await fetch(`http://localhost:${process.env.PORT||8080}/api/notify`, {
          method:'POST', 
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            deviceId, 
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
      if(topic.endsWith('/state')) {
        const [, deviceId] = topic.split('/');
        try {
          const state = JSON.parse(msg);
          if (state.sensors?.tempC > 60) {
            console.log(`🌡️ Device ${deviceId} temperature critical: ${state.sensors.tempC}°C`);
            
            await fetch(`http://localhost:${process.env.PORT||8080}/api/notify`, {
              method:'POST', 
              headers:{'Content-Type':'application/json'},
              body: JSON.stringify({
                deviceId, 
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
    } catch (error) {
      console.error('MQTT bridge message error:', error);
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
