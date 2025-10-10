import mqtt from 'mqtt';
import { DeviceStore } from '@/state/deviceStore';
import { Alerts } from '@/state/alertsEngine';
import { aggregationService } from '@/services/aggregationService';

let client: mqtt.MqttClient;

export function getConnectionStatus() {
  if (!client) {
    return { connected: false, status: 'disconnected' };
  }
  
  const connected = client.connected;
  return {
    connected,
    status: connected ? 'connected' : 'disconnected'
  };
}

export function reconnectMqtt() {
  if (client) {
    client.reconnect();
  } else {
    connectMqtt();
  }
}

export function sendCommand(deviceId: string, command: any) {
  if (!client || !client.connected) {
    console.warn('MQTT not connected, cannot send command');
    return false;
  }
  
  const topic = `devices/${deviceId}/cmd`;
  const payload = JSON.stringify(command);
  
  try {
    client.publish(topic, payload);
    console.log(`📤 Sent command to ${deviceId}:`, command);
    
    // Record MQTT traffic
    aggregationService.recordMQTTTraffic(deviceId, topic, payload.length, 'outbound');
    
    return true;
  } catch (error) {
    console.error('Failed to send command:', error);
    return false;
  }
}

export function connectMqtt() {
  client = mqtt.connect('wss://broker.emqx.io:8084/mqtt', {
    clientId: 'web-' + Math.random().toString(16).slice(2),
    reconnectPeriod: 2000,
  });

  client.on('connect', () => {
    console.log('✅ MQTT connected');
    client.subscribe('devices/+/status');
    client.subscribe('devices/+/state');
    client.subscribe('devices/+/ack');
    client.subscribe('devices/+/event');
  });

  client.on('error', (error) => {
    console.error('❌ MQTT error:', error);
  });

  client.on('close', () => {
    console.log('🔌 MQTT disconnected');
  });

  client.on('reconnect', () => {
    console.log('🔄 MQTT reconnecting...');
  });

  client.on('message', (topic, payload) => {
    const msg = payload.toString();
    const messageSize = payload.length;
    
    // Record MQTT traffic
    const [, deviceId] = topic.split('/');
    aggregationService.recordMQTTTraffic(deviceId, topic, messageSize, 'inbound');
    
    try {
      if (topic.endsWith('/status')) {
        const [, deviceId] = topic.split('/');
        const isOnline = msg === 'online';
        DeviceStore.setOnline(deviceId, isOnline);
        
        // Record device status change
        aggregationService.recordDeviceEvent(
          deviceId,
          '', // userId will be resolved from device ownership
          'status_change',
          { online: isOnline },
          isOnline ? 'info' : 'warning',
          `Device ${deviceId} ${isOnline ? 'came online' : 'went offline'}`
        );
        return;
      }

      if (topic.endsWith('/state')) {
        const [, deviceId] = topic.split('/');
        const doc = JSON.parse(msg);
        const state = {
          gpio: doc.gpio || {},
          sensors: doc.sensors || {},
          online: true,
        };
        DeviceStore.upsertState(deviceId, state);
        
        // Record device state update
        aggregationService.recordDeviceState(deviceId, '', state);
        
                Alerts.evaluate(deviceId).catch(console.error); // ALERTS ON REPORTED STATE
        return;
      }

      if (topic.endsWith('/event')) {
        const [, deviceId] = topic.split('/');
        const doc = JSON.parse(msg); // {path, value}
        if (String(doc.path).startsWith('gpio.')) {
          const pin = Number(String(doc.path).split('.')[1]);
          DeviceStore.upsertState(deviceId, { gpio: { [pin]: Number(doc.value) as 0|1 }, online: true });
        } else {
          const key = String(doc.path).replace(/^sensors\./, '');
          DeviceStore.upsertState(deviceId, { sensors: { [key]: doc.value }, online: true });
        }
                Alerts.evaluate(deviceId).catch(console.error);
        return;
      }

      if (topic.endsWith('/ack')) {
        // wire to your existing command tracker if needed
      }
    } catch (e) {
      console.error('MQTT parse error', topic, msg, e);
    }
  });

}
