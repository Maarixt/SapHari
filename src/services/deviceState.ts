import { AlertEngine } from '@/features/alerts/alertEngine';

// Device state tracking
const DeviceState: Record<string, any> = {};

// Process MQTT message and update device state
export function onMqttMessage(deviceId: string, key: string, value: any) {
  DeviceState[deviceId] = DeviceState[deviceId] || { gpio: {}, sensors: {}, gauges: {} };

  if (key.startsWith('gpio.')) {
    const pin = Number(key.split('.')[1]);
    DeviceState[deviceId].gpio[pin] = Number(value) as 0|1;
  } else if (key.startsWith('sensor.')) {
    const sensorKey = key.split('.').slice(1).join('.');
    DeviceState[deviceId][sensorKey] = value;
    DeviceState[deviceId].sensors[sensorKey] = value;
  } else if (key.startsWith('gauge.')) {
    const gaugeKey = key.split('.').slice(1).join('.');
    DeviceState[deviceId][gaugeKey] = value;
    DeviceState[deviceId].gauges[gaugeKey] = value;
  } else {
    // Direct key assignment
    DeviceState[deviceId][key] = value;
    DeviceState[deviceId].sensors[key] = value;
  }

  // Trigger alert engine evaluation
  AlertEngine.onDeviceUpdate(deviceId, DeviceState[deviceId]);
}

// Parse MQTT topic and extract device info
export function parseMqttTopic(topic: string): { deviceId: string; key: string } | null {
  // Expected format: saphari/{device_id}/{type}/{key}
  const parts = topic.split('/');
  if (parts.length >= 4 && parts[0] === 'saphari') {
    const deviceId = parts[1];
    const type = parts[2]; // 'sensor', 'switch', 'gauge', etc.
    const key = parts[3];
    
    return {
      deviceId,
      key: `${type}.${key}`
    };
  }
  
  return null;
}

// Get current device state
export function getDeviceState(deviceId: string) {
  return DeviceState[deviceId] || { gpio: {}, sensors: {}, gauges: {} };
}

// Get all device states
export function getAllDeviceStates() {
  return { ...DeviceState };
}

// Clear device state (for testing)
export function clearDeviceState(deviceId?: string) {
  if (deviceId) {
    delete DeviceState[deviceId];
  } else {
    Object.keys(DeviceState).forEach(key => delete DeviceState[key]);
  }
}
