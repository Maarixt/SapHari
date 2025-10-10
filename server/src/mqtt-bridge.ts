import mqtt from 'mqtt';
import { config } from './config';
import { AlertService } from './services/alert-service';

let mqttClient: mqtt.MqttClient | null = null;

export function setupMqttBridge() {
  console.log('🔌 Setting up MQTT bridge...');
  
  mqttClient = mqtt.connect(config.mqtt.url, {
    clientId: 'saphari-alerts-server-' + Math.random().toString(16).slice(2, 8),
    clean: true,
    reconnectPeriod: 2000,
    keepalive: 60,
    connectTimeout: 30 * 1000,
  });

  mqttClient.on('connect', () => {
    console.log('✅ MQTT bridge connected');
    
    // Subscribe to device topics
    mqttClient!.subscribe('devices/+/status', { qos: 1 });
    mqttClient!.subscribe('devices/+/state', { qos: 1 });
    mqttClient!.subscribe('devices/+/event', { qos: 1 });
  });

  mqttClient.on('message', async (topic, payload) => {
    try {
      const [_, deviceId, channel] = topic.split('/');
      const message = payload.toString();
      
      console.log(`📨 MQTT message: ${topic} -> ${message}`);
      
      // Process different message types
      if (channel === 'status') {
        await handleDeviceStatus(deviceId, message);
      } else if (channel === 'state') {
        await handleDeviceState(deviceId, message);
      } else if (channel === 'event') {
        await handleDeviceEvent(deviceId, message);
      }
    } catch (error) {
      console.error('❌ Error processing MQTT message:', error);
    }
  });

  mqttClient.on('error', (error) => {
    console.error('❌ MQTT bridge error:', error);
  });

  mqttClient.on('close', () => {
    console.log('🔌 MQTT bridge disconnected');
  });

  mqttClient.on('reconnect', () => {
    console.log('🔄 MQTT bridge reconnecting...');
  });
}

async function handleDeviceStatus(deviceId: string, status: string) {
  const isOnline = status === 'online';
  console.log(`📱 Device ${deviceId} is now ${isOnline ? 'online' : 'offline'}`);
  
  // Trigger device status alerts if needed
  await AlertService.processDeviceStatusChange(deviceId, isOnline);
}

async function handleDeviceState(deviceId: string, stateJson: string) {
  try {
    const state = JSON.parse(stateJson);
    console.log(`📊 Device ${deviceId} state update:`, state);
    
    // Process state changes for alerts
    await AlertService.processDeviceStateChange(deviceId, state);
  } catch (error) {
    console.error('❌ Error parsing device state:', error);
  }
}

async function handleDeviceEvent(deviceId: string, eventJson: string) {
  try {
    const event = JSON.parse(eventJson);
    console.log(`⚡ Device ${deviceId} event:`, event);
    
    // Process events for alerts
    await AlertService.processDeviceEvent(deviceId, event);
  } catch (error) {
    console.error('❌ Error parsing device event:', error);
  }
}

export { mqttClient };
