// Device MQTT Service - Handles device-authoritative communication
import { 
  DeviceCommand, 
  DeviceAck, 
  DeviceState, 
  DeviceEvent, 
  DevicePresence,
  mqttTopics, 
  parseTopic, 
  generateReqId,
  validateDeviceState,
  validateDeviceCommand,
  validateDeviceAck
} from '@/lib/mqttTopics';
import { deviceStateStore } from '@/stores/deviceStateStore';

export class DeviceMQTTService {
  private publishMessage: (topic: string, payload: string, retain?: boolean) => void;
  private subscribeToTopic: (topic: string) => void;
  private onMessage: (callback: (topic: string, message: string) => void) => void;

  constructor(
    publishMessage: (topic: string, payload: string, retain?: boolean) => void,
    subscribeToTopic: (topic: string) => void,
    onMessage: (callback: (topic: string, message: string) => void) => void
  ) {
    this.publishMessage = publishMessage;
    this.subscribeToTopic = subscribeToTopic;
    this.onMessage = onMessage;
    
    this.setupMessageHandlers();
    this.subscribeToDeviceTopics();
  }

  private setupMessageHandlers() {
    this.onMessage((topic: string, message: string) => {
      const parsed = parseTopic(topic);
      if (!parsed) return;

      const { deviceId, type } = parsed;

      try {
        switch (type) {
          case 'status':
            this.handleDevicePresence(deviceId, message);
            break;
          case 'state':
            this.handleDeviceState(deviceId, message);
            break;
          case 'ack':
            this.handleDeviceAck(deviceId, message);
            break;
          case 'event':
            this.handleDeviceEvent(deviceId, message);
            break;
        }
      } catch (error) {
        console.error(`Error handling ${type} message for device ${deviceId}:`, error);
      }
    });
  }

  private subscribeToDeviceTopics() {
    // Subscribe to all device topics using wildcards
    this.subscribeToTopic('devices/+/status');
    this.subscribeToTopic('devices/+/state');
    this.subscribeToTopic('devices/+/ack');
    this.subscribeToTopic('devices/+/event');
  }

  private handleDevicePresence(deviceId: string, message: string) {
    const presence: DevicePresence = {
      deviceId,
      status: message.trim() as 'online' | 'offline',
      timestamp: Date.now()
    };

    deviceStateStore.updateDevicePresence(deviceId, presence);
  }

  private handleDeviceState(deviceId: string, message: string) {
    try {
      const state = JSON.parse(message);
      
      if (!validateDeviceState(state)) {
        console.error('Invalid device state received:', state);
        return;
      }

      deviceStateStore.updateDeviceState(deviceId, state);
    } catch (error) {
      console.error('Error parsing device state:', error);
    }
  }

  private handleDeviceAck(deviceId: string, message: string) {
    try {
      const ack = JSON.parse(message);
      
      if (!validateDeviceAck(ack)) {
        console.error('Invalid device ACK received:', ack);
        return;
      }

      deviceStateStore.handleDeviceAck(deviceId, ack);
    } catch (error) {
      console.error('Error parsing device ACK:', error);
    }
  }

  private handleDeviceEvent(deviceId: string, message: string) {
    try {
      const event = JSON.parse(message);
      
      if (!event.path || event.value === undefined) {
        console.error('Invalid device event received:', event);
        return;
      }

      deviceStateStore.handleDeviceEvent(deviceId, event);
    } catch (error) {
      console.error('Error parsing device event:', error);
    }
  }

  // Public methods for sending commands to devices
  public sendGpioCommand(deviceId: string, pin: number, value: 0 | 1): Promise<boolean> {
    return new Promise((resolve) => {
      const reqId = generateReqId();
      const command: DeviceCommand = {
        type: 'gpio',
        pin,
        value,
        reqId,
        timestamp: Date.now()
      };

      // Track pending command
      deviceStateStore.addPendingCommand(deviceId, reqId, 'gpio');

      // Set up ACK listener
      const unsubscribe = deviceStateStore.subscribeToAck((ackDeviceId, ack) => {
        if (ackDeviceId === deviceId && ack.reqId === reqId) {
          unsubscribe();
          resolve(ack.ok);
        }
      });

      // Send command
      this.publishMessage(
        mqttTopics.command(deviceId),
        JSON.stringify(command),
        false
      );

      // Timeout after 10 seconds
      setTimeout(() => {
        unsubscribe();
        deviceStateStore.removePendingCommand(reqId);
        resolve(false);
      }, 10000);
    });
  }

  public sendServoCommand(deviceId: string, pin: number, value: number): Promise<boolean> {
    return new Promise((resolve) => {
      const reqId = generateReqId();
      const command: DeviceCommand = {
        type: 'servo',
        pin,
        value,
        reqId,
        timestamp: Date.now()
      };

      deviceStateStore.addPendingCommand(deviceId, reqId, 'servo');

      const unsubscribe = deviceStateStore.subscribeToAck((ackDeviceId, ack) => {
        if (ackDeviceId === deviceId && ack.reqId === reqId) {
          unsubscribe();
          resolve(ack.ok);
        }
      });

      this.publishMessage(
        mqttTopics.command(deviceId),
        JSON.stringify(command),
        false
      );

      setTimeout(() => {
        unsubscribe();
        deviceStateStore.removePendingCommand(reqId);
        resolve(false);
      }, 10000);
    });
  }

  public sendGaugeCommand(deviceId: string, gaugeKey: string, value: number): Promise<boolean> {
    return new Promise((resolve) => {
      const reqId = generateReqId();
      const command: DeviceCommand = {
        type: 'gauge',
        value: value,
        reqId,
        timestamp: Date.now()
      };

      deviceStateStore.addPendingCommand(deviceId, reqId, 'gauge');

      const unsubscribe = deviceStateStore.subscribeToAck((ackDeviceId, ack) => {
        if (ackDeviceId === deviceId && ack.reqId === reqId) {
          unsubscribe();
          resolve(ack.ok);
        }
      });

      this.publishMessage(
        mqttTopics.command(deviceId),
        JSON.stringify(command),
        false
      );

      setTimeout(() => {
        unsubscribe();
        deviceStateStore.removePendingCommand(reqId);
        resolve(false);
      }, 10000);
    });
  }

  // Utility methods
  public isDeviceOnline(deviceId: string): boolean {
    return deviceStateStore.isDeviceOnline(deviceId);
  }

  public getDeviceState(deviceId: string): DeviceState | undefined {
    return deviceStateStore.getDeviceState(deviceId);
  }

  public getDeviceGpioState(deviceId: string, pin: number): 0 | 1 | undefined {
    return deviceStateStore.getDeviceGpioState(deviceId, pin);
  }

  public getDeviceSensorValue(deviceId: string, sensorKey: string): number | string | undefined {
    return deviceStateStore.getDeviceSensorValue(deviceId, sensorKey);
  }

  public getDeviceGaugeValue(deviceId: string, gaugeKey: string): number | undefined {
    return deviceStateStore.getDeviceGaugeValue(deviceId, gaugeKey);
  }

  public getDeviceServoValue(deviceId: string, servoKey: string): number | undefined {
    return deviceStateStore.getDeviceServoValue(deviceId, servoKey);
  }

  // Subscribe to device state changes
  public subscribeToDeviceState(listener: (deviceId: string, state: DeviceState) => void) {
    return deviceStateStore.subscribeToState(listener);
  }

  public subscribeToDevicePresence(listener: (deviceId: string, presence: DevicePresence) => void) {
    return deviceStateStore.subscribeToPresence(listener);
  }

  public subscribeToDeviceEvents(listener: (deviceId: string, event: DeviceEvent) => void) {
    return deviceStateStore.subscribeToEvents(listener);
  }
}
