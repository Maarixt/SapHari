// MQTT Topic Contract for Device-Authoritative State Management
// This ensures consistent communication between ESP32 devices and the dashboard

export interface DeviceCommand {
  type: 'gpio' | 'servo' | 'gauge' | 'sensor_read';
  pin?: number;
  value?: number | string;
  reqId: string;
  timestamp?: number;
}

export interface DeviceAck {
  reqId: string;
  ok: boolean;
  detail: string;
  timestamp?: number;
}

export interface DeviceState {
  deviceId: string;
  gpio?: Record<string, 0 | 1>;
  sensors?: Record<string, number | string>;
  gauges?: Record<string, number>;
  servos?: Record<string, number>;
  timestamp?: number;
}

export interface DeviceEvent {
  path: string; // e.g., "gpio.4", "sensors.tempC"
  value: number | string;
  timestamp?: number;
}

export interface DevicePresence {
  deviceId: string;
  status: 'online' | 'offline';
  timestamp?: number;
}

// Topic builders for consistent MQTT communication
export const mqttTopics = {
  // Device presence (LWT)
  presence: (deviceId: string) => `devices/${deviceId}/status`,
  
  // Device shadow (reported state snapshots)
  state: (deviceId: string) => `devices/${deviceId}/state`,
  
  // Commands (desired actions from UI)
  command: (deviceId: string) => `devices/${deviceId}/cmd`,
  
  // Command ACK/Result (device → UI)
  ack: (deviceId: string) => `devices/${deviceId}/ack`,
  
  // Fine-grained updates (optional)
  event: (deviceId: string) => `devices/${deviceId}/event`,
};

// Helper functions for topic parsing
export const parseTopic = (topic: string) => {
  const parts = topic.split('/');
  if (parts.length >= 3 && parts[0] === 'devices') {
    return {
      deviceId: parts[1],
      type: parts[2] as 'status' | 'state' | 'cmd' | 'ack' | 'event'
    };
  }
  return null;
};

// Generate unique request IDs for command tracking
export const generateReqId = () => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Validate device state structure
export const validateDeviceState = (state: any): state is DeviceState => {
  return (
    typeof state === 'object' &&
    typeof state.deviceId === 'string' &&
    (state.gpio === undefined || typeof state.gpio === 'object') &&
    (state.sensors === undefined || typeof state.sensors === 'object') &&
    (state.gauges === undefined || typeof state.gauges === 'object') &&
    (state.servos === undefined || typeof state.servos === 'object')
  );
};

// Validate device command structure
export const validateDeviceCommand = (cmd: any): cmd is DeviceCommand => {
  return (
    typeof cmd === 'object' &&
    typeof cmd.type === 'string' &&
    ['gpio', 'servo', 'gauge', 'sensor_read'].includes(cmd.type) &&
    typeof cmd.reqId === 'string' &&
    (cmd.pin === undefined || typeof cmd.pin === 'number') &&
    (cmd.value === undefined || (typeof cmd.value === 'number' || typeof cmd.value === 'string'))
  );
};

// Validate device ACK structure
export const validateDeviceAck = (ack: any): ack is DeviceAck => {
  return (
    typeof ack === 'object' &&
    typeof ack.reqId === 'string' &&
    typeof ack.ok === 'boolean' &&
    typeof ack.detail === 'string'
  );
};
