import mqtt from 'mqtt';
import { DeviceStore } from '@/state/deviceStore';
import { Alerts } from '@/state/alertsEngine';
// aggregationService temporarily disabled
// import { aggregationService } from '@/services/aggregationService';
import { useAuth } from '@/hooks/useAuth';
// Temporarily commented out to fix import issues
// import { commandService } from './commandService';
// import { CommandAck, validateCommandAck } from '../lib/commandTypes';
// OTA service temporarily disabled
// import { otaService, OTAUpdateProgress } from './otaService';
type OTAUpdateProgress = any;
// automationService temporarily disabled
// import { automationService } from './automationService';

let client: mqtt.MqttClient;

// Helper functions for secure MQTT
function getCurrentTenantId(): string {
  // TODO: Implement tenant resolution based on user context
  // For now, return a default tenant
  return 'tenantA';
}

function generateWebJWT(tenantId: string): string {
  // TODO: Implement JWT generation for web client
  // This should generate a JWT token with user permissions
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: 'web-client',
    tenant: tenantId,
    role: 'user',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
  }));
  const signature = btoa('web-secret' + header + payload); // Simplified
  return `${header}.${payload}.${signature}`;
}

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

// Legacy sendCommand function - temporarily disabled
export function sendCommand(deviceId: string, command: any) {
  console.warn('sendCommand is temporarily disabled - command service not available');
  return Promise.resolve({ success: false, message: 'Command service temporarily disabled' });
}

// New reliable command sending function - temporarily disabled
export async function sendReliableCommand(
  deviceId: string, 
  action: string, 
  options: {
    pin?: number;
    state?: number | boolean;
    value?: number;
    duration?: number;
    metadata?: Record<string, any>;
  } = {}
): Promise<any> {
  console.warn('sendReliableCommand is temporarily disabled - command service not available');
  return Promise.resolve({ success: false, message: 'Command service temporarily disabled' });
}

export function connectMqtt() {
  // Get current user's tenant ID (you'll need to implement this)
  const tenantId = getCurrentTenantId(); // TODO: Implement tenant resolution
  
  client = mqtt.connect('wss://broker.emqx.io:8084/mqtt', {
    clientId: 'web-' + Math.random().toString(16).slice(2),
    reconnectPeriod: 2000,
    // Add JWT authentication for web client
    username: generateWebJWT(tenantId), // TODO: Implement JWT generation
    password: '', // No password when using JWT
  });

  // Set MQTT client reference in command service
  // commandService.setMqttClient(client); // Temporarily commented out

  client.on('connect', () => {
    console.log('✅ Secure MQTT connected');
    // Subscribe to secure tenant-isolated topics
    client.subscribe(`saphari/${tenantId}/devices/+/status`);
    client.subscribe(`saphari/${tenantId}/devices/+/state`);
    client.subscribe(`saphari/${tenantId}/devices/+/ack`);
    client.subscribe(`saphari/${tenantId}/devices/+/event`);
    client.subscribe(`saphari/${tenantId}/devices/+/ota_status`);
    client.subscribe(`saphari/${tenantId}/devices/+/heartbeat`);
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
    
    // Parse secure topic structure: saphari/{tenant}/devices/{device}/{channel}
    const topicParts = topic.split('/');
    if (topicParts.length < 5 || topicParts[0] !== 'saphari') {
      console.warn('Received message with invalid topic structure:', topic);
      return;
    }
    
    const tenantId = topicParts[1];
    const deviceId = topicParts[3];
    const channel = topicParts[4];
    
    // Validate tenant access (TODO: implement proper tenant validation)
    if (tenantId !== getCurrentTenantId()) {
      console.warn('Received message for different tenant, ignoring:', tenantId);
      return;
    }
    
    // Record MQTT traffic - temporarily disabled
    // aggregationService.recordMQTTTraffic(deviceId, topic, messageSize, 'inbound');
    
    try {
      if (channel === 'status') {
        const isOnline = msg === 'online';
        DeviceStore.setOnline(deviceId, isOnline);
        
        // Record device status change - temporarily disabled
        // aggregationService.recordDeviceEvent(
        //   deviceId,
        //   '', // userId will be resolved from device ownership
        //   'status_change',
        //   { online: isOnline },
        //   isOnline ? 'info' : 'warning',
        //   `Device ${deviceId} ${isOnline ? 'came online' : 'went offline'}`
        // );
        return;
      }

          if (channel === 'state') {
            const doc = JSON.parse(msg);
            const state = {
              gpio: doc.gpio || {},
              sensors: doc.sensors || {},
              online: true,
            };
            DeviceStore.upsertState(deviceId, state);
            
            // Record device state update - temporarily disabled
            // aggregationService.recordDeviceState(deviceId, '', state);
            
            // Process automation rules - temporarily disabled
            // automationService.processDeviceData(deviceId, doc).catch(console.error);
            
            Alerts.evaluate(deviceId).catch(console.error); // ALERTS ON REPORTED STATE
            return;
          }

      if (channel === 'event') {
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

      // Temporarily commented out command ACK handling
      // if (channel === 'ack') {
      //   // Handle command acknowledgment with reliable command service
      //   try {
      //     const ackData = JSON.parse(msg);
      //     console.log(`✅ Received ACK from ${deviceId}:`, ackData);
      //   } catch (error) {
      //     console.error(`Failed to parse ACK from ${deviceId}:`, error);
      //   }
      // }

      // Handle OTA status updates
      if (channel === 'ota_status') {
        try {
          const otaData = JSON.parse(msg);
          
          // Validate OTA progress structure
          if (otaData.deviceId && otaData.status && otaData.timestamp) {
            const progress: OTAUpdateProgress = {
              deviceId: otaData.deviceId,
              status: otaData.status,
              message: otaData.message || '',
              progress: otaData.progress || 0,
              timestamp: otaData.timestamp,
              totalSize: otaData.totalSize || 0,
              downloadedSize: otaData.downloadedSize || 0
            };
            
            // Process OTA progress through OTA service - temporarily disabled
            // otaService.handleOTAProgress(progress);
            
            console.log(`📱 OTA Progress from ${deviceId}:`, progress);
            
            // Record OTA event - temporarily disabled
            // aggregationService.recordDeviceEvent(
            //   deviceId,
            //   '', // userId will be resolved from device ownership
            //   'ota_update',
            //   progress,
            //   progress.status === 'error' ? 'error' : 'info',
            //   `OTA Update: ${progress.status} - ${progress.message}`
            // );
          } else {
            console.warn(`Invalid OTA status format from ${deviceId}:`, msg);
          }
        } catch (error) {
          console.error(`Failed to parse OTA status from ${deviceId}:`, error);
        }
      }

      // Handle device heartbeat
      if (channel === 'heartbeat') {
        try {
          const heartbeatData = JSON.parse(msg);
          
          // Validate heartbeat structure
          if (heartbeatData.deviceId && heartbeatData.timestamp) {
            console.log(`💓 Heartbeat from ${deviceId}:`, heartbeatData);
            
            // Process heartbeat data for automation rules - temporarily disabled
            // automationService.processDeviceData(deviceId, heartbeatData).catch(console.error);
            
            // Record heartbeat event - temporarily disabled
            // aggregationService.recordDeviceEvent(
            //   deviceId,
            //   '', // userId will be resolved from device ownership
            //   'heartbeat',
            //   heartbeatData,
            //   'info',
            //   `Device heartbeat: ${heartbeatData.isHealthy ? 'healthy' : 'unhealthy'}`
            // );
          } else {
            console.warn(`Invalid heartbeat format from ${deviceId}:`, msg);
          }
        } catch (error) {
          console.error(`Failed to parse heartbeat from ${deviceId}:`, error);
        }
      }
    } catch (e) {
      console.error('MQTT parse error', topic, msg, e);
    }
  });

}
