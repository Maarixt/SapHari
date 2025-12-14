// Device State Store - Centralized state management for device-authoritative system
import { DeviceState, DevicePresence, DeviceAck, DeviceEvent } from '@/lib/mqttTopics';

type DeviceStateListener = (deviceId: string, state: DeviceState) => void;
type DevicePresenceListener = (deviceId: string, presence: DevicePresence) => void;
type DeviceAckListener = (deviceId: string, ack: DeviceAck) => void;
type DeviceEventListener = (deviceId: string, event: DeviceEvent) => void;

// In-memory state storage
const deviceStates: Record<string, DeviceState> = {};
const devicePresence: Record<string, DevicePresence> = {};
const pendingCommands: Record<string, { reqId: string; timestamp: number; type: string }> = {};

// Event listeners
let stateListeners: DeviceStateListener[] = [];
let presenceListeners: DevicePresenceListener[] = [];
let ackListeners: DeviceAckListener[] = [];
let eventListeners: DeviceEventListener[] = [];

// Notify all listeners
const notifyStateListeners = (deviceId: string, state: DeviceState) => {
  stateListeners.forEach(listener => listener(deviceId, state));
};

const notifyPresenceListeners = (deviceId: string, presence: DevicePresence) => {
  presenceListeners.forEach(listener => listener(deviceId, presence));
};

const notifyAckListeners = (deviceId: string, ack: DeviceAck) => {
  ackListeners.forEach(listener => listener(deviceId, ack));
};

const notifyEventListeners = (deviceId: string, event: DeviceEvent) => {
  eventListeners.forEach(listener => listener(deviceId, event));
};

/**
 * Clear all state - CRITICAL for logout to prevent cross-account data leakage
 */
function clearAllState(): void {
  console.log('🧹 deviceStateStore: Clearing all state');
  
  // Clear all device data
  Object.keys(deviceStates).forEach(key => delete deviceStates[key]);
  Object.keys(devicePresence).forEach(key => delete devicePresence[key]);
  Object.keys(pendingCommands).forEach(key => delete pendingCommands[key]);
  
  // Clear all listeners (they'll re-register on next component mount)
  stateListeners = [];
  presenceListeners = [];
  ackListeners = [];
  eventListeners = [];
}

export const deviceStateStore = {
  // State management
  updateDeviceState(deviceId: string, state: DeviceState) {
    deviceStates[deviceId] = { ...state, timestamp: Date.now() };
    notifyStateListeners(deviceId, deviceStates[deviceId]);
  },

  getDeviceState(deviceId: string): DeviceState | undefined {
    return deviceStates[deviceId];
  },

  getAllDeviceStates(): Record<string, DeviceState> {
    return { ...deviceStates };
  },

  // Presence management
  updateDevicePresence(deviceId: string, presence: DevicePresence) {
    devicePresence[deviceId] = { ...presence, timestamp: Date.now() };
    notifyPresenceListeners(deviceId, devicePresence[deviceId]);
  },

  getDevicePresence(deviceId: string): DevicePresence | undefined {
    return devicePresence[deviceId];
  },

  isDeviceOnline(deviceId: string): boolean {
    const presence = devicePresence[deviceId];
    return presence?.status === 'online';
  },

  // Command tracking
  addPendingCommand(deviceId: string, reqId: string, type: string) {
    pendingCommands[reqId] = {
      reqId,
      timestamp: Date.now(),
      type
    };
  },

  removePendingCommand(reqId: string) {
    delete pendingCommands[reqId];
  },

  getPendingCommand(reqId: string) {
    return pendingCommands[reqId];
  },

  getAllPendingCommands() {
    return { ...pendingCommands };
  },

  // ACK handling
  handleDeviceAck(deviceId: string, ack: DeviceAck) {
    // Remove from pending commands
    this.removePendingCommand(ack.reqId);
    
    // Notify listeners
    notifyAckListeners(deviceId, ack);
  },

  // Event handling
  handleDeviceEvent(deviceId: string, event: DeviceEvent) {
    // Update the specific path in device state
    const currentState = deviceStates[deviceId];
    if (currentState) {
      const newState = { ...currentState };
      
      // Parse path (e.g., "gpio.4" -> gpio["4"])
      const pathParts = event.path.split('.');
      if (pathParts.length === 2) {
        const [category, key] = pathParts;
        
        if (category === 'gpio' && !newState.gpio) newState.gpio = {};
        if (category === 'sensors' && !newState.sensors) newState.sensors = {};
        if (category === 'gauges' && !newState.gauges) newState.gauges = {};
        if (category === 'servos' && !newState.servos) newState.servos = {};
        
        if (newState[category as keyof DeviceState]) {
          (newState[category as keyof DeviceState] as any)[key] = event.value;
        }
      }
      
      this.updateDeviceState(deviceId, newState);
    }
    
    // Notify event listeners
    notifyEventListeners(deviceId, event);
  },

  // Event listeners
  subscribeToState(listener: DeviceStateListener) {
    stateListeners.push(listener);
    return () => {
      stateListeners = stateListeners.filter(l => l !== listener);
    };
  },

  subscribeToPresence(listener: DevicePresenceListener) {
    presenceListeners.push(listener);
    return () => {
      presenceListeners = presenceListeners.filter(l => l !== listener);
    };
  },

  subscribeToAck(listener: DeviceAckListener) {
    ackListeners.push(listener);
    return () => {
      ackListeners = ackListeners.filter(l => l !== listener);
    };
  },

  subscribeToEvents(listener: DeviceEventListener) {
    eventListeners.push(listener);
    return () => {
      eventListeners = eventListeners.filter(l => l !== listener);
    };
  },

  // Utility methods
  getDeviceGpioState(deviceId: string, pin: number): 0 | 1 | undefined {
    const state = deviceStates[deviceId];
    return state?.gpio?.[pin.toString()];
  },

  getDeviceSensorValue(deviceId: string, sensorKey: string): number | string | undefined {
    const state = deviceStates[deviceId];
    return state?.sensors?.[sensorKey];
  },

  getDeviceGaugeValue(deviceId: string, gaugeKey: string): number | undefined {
    const state = deviceStates[deviceId];
    return state?.gauges?.[gaugeKey];
  },

  getDeviceServoValue(deviceId: string, servoKey: string): number | undefined {
    const state = deviceStates[deviceId];
    return state?.servos?.[servoKey];
  },

  // Cleanup old pending commands (older than 30 seconds)
  cleanupOldPendingCommands() {
    const now = Date.now();
    const thirtySeconds = 30 * 1000;
    
    Object.entries(pendingCommands).forEach(([reqId, cmd]) => {
      if (now - cmd.timestamp > thirtySeconds) {
        delete pendingCommands[reqId];
      }
    });
  },

  /**
   * Clear all state - CRITICAL for logout
   */
  clear: clearAllState
};

// Cleanup old pending commands every 10 seconds
setInterval(() => {
  deviceStateStore.cleanupOldPendingCommands();
}, 10000);
