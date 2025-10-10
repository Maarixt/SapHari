// Device status service for MQTT publishing and aggregations

import { sendCommand } from '@/services/mqtt';
import { aggregationService } from '@/services/aggregationService';

export interface DeviceStatus {
  online: boolean;
  ip?: string;
  rssi?: number;
  battery_pct?: number;
  timestamp?: number;
}

export interface DeviceEvent {
  level: 'info' | 'warning' | 'error' | 'critical';
  code: string;
  message: string;
  meta?: Record<string, any>;
}

export class DeviceStatusService {
  /**
   * Publish device status to MQTT
   */
  static async publishStatus(
    deviceId: string, 
    status: DeviceStatus
  ): Promise<void> {
    try {
      const payload = {
        ...status,
        timestamp: status.timestamp || Date.now()
      };

      // Publish to MQTT
      const success = sendCommand(deviceId, {
        type: 'status',
        payload
      });

      if (success) {
        console.log(`📡 Published status for ${deviceId}:`, payload);
        
        // Record in aggregations
        await aggregationService.recordDeviceOnlineStatus(
          deviceId,
          '', // userId will be resolved from device ownership
          status.online,
          status.ip,
          status.rssi,
          status.battery_pct
        );
      } else {
        console.warn(`❌ Failed to publish status for ${deviceId}`);
      }
    } catch (error) {
      console.error(`Error publishing status for ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Publish device event to MQTT
   */
  static async publishEvent(
    deviceId: string, 
    event: DeviceEvent
  ): Promise<void> {
    try {
      const payload = {
        ...event,
        timestamp: Date.now()
      };

      // Publish to MQTT
      const success = sendCommand(deviceId, {
        type: 'event',
        payload
      });

      if (success) {
        console.log(`📡 Published event for ${deviceId}:`, payload);
        
        // Record in aggregations
        await aggregationService.recordDeviceEvent(
          deviceId,
          '', // userId will be resolved from device ownership
          event.code,
          event.meta || {},
          event.level,
          event.message
        );
      } else {
        console.warn(`❌ Failed to publish event for ${deviceId}`);
      }
    } catch (error) {
      console.error(`Error publishing event for ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Publish device online status
   */
  static async publishOnline(deviceId: string, ip?: string, rssi?: number): Promise<void> {
    await this.publishStatus(deviceId, {
      online: true,
      ip,
      rssi,
      timestamp: Date.now()
    });
  }

  /**
   * Publish device offline status (LWT)
   */
  static async publishOffline(deviceId: string): Promise<void> {
    await this.publishStatus(deviceId, {
      online: false,
      timestamp: Date.now()
    });
  }

  /**
   * Publish sensor fault event
   */
  static async publishSensorFault(
    deviceId: string, 
    sensor: string, 
    error: string
  ): Promise<void> {
    await this.publishEvent(deviceId, {
      level: 'error',
      code: 'sensor_fault',
      message: `Sensor ${sensor} fault: ${error}`,
      meta: { sensor, error }
    });
  }

  /**
   * Publish overheat warning
   */
  static async publishOverheat(deviceId: string, temperature: number): Promise<void> {
    await this.publishEvent(deviceId, {
      level: 'warning',
      code: 'overheat',
      message: `Device overheating: ${temperature}°C`,
      meta: { temperature }
    });
  }

  /**
   * Publish retry event
   */
  static async publishRetry(
    deviceId: string, 
    operation: string, 
    attempt: number, 
    maxAttempts: number
  ): Promise<void> {
    await this.publishEvent(deviceId, {
      level: 'info',
      code: 'retry',
      message: `Retrying ${operation} (${attempt}/${maxAttempts})`,
      meta: { operation, attempt, maxAttempts }
    });
  }

  /**
   * Publish connection event
   */
  static async publishConnection(
    deviceId: string, 
    connected: boolean, 
    reason?: string
  ): Promise<void> {
    await this.publishEvent(deviceId, {
      level: 'info',
      code: connected ? 'connected' : 'disconnected',
      message: connected ? 'Device connected' : `Device disconnected: ${reason || 'Unknown'}`,
      meta: { connected, reason }
    });
  }

  /**
   * Publish battery low warning
   */
  static async publishBatteryLow(deviceId: string, batteryPct: number): Promise<void> {
    await this.publishEvent(deviceId, {
      level: 'warning',
      code: 'battery_low',
      message: `Battery low: ${batteryPct}%`,
      meta: { battery_pct: batteryPct }
    });
  }

  /**
   * Publish firmware update event
   */
  static async publishFirmwareUpdate(
    deviceId: string, 
    fromVersion: string, 
    toVersion: string, 
    success: boolean
  ): Promise<void> {
    await this.publishEvent(deviceId, {
      level: success ? 'info' : 'error',
      code: 'firmware_update',
      message: success 
        ? `Firmware updated from ${fromVersion} to ${toVersion}`
        : `Firmware update failed from ${fromVersion} to ${toVersion}`,
      meta: { fromVersion, toVersion, success }
    });
  }

  /**
   * Publish configuration change
   */
  static async publishConfigChange(
    deviceId: string, 
    configKey: string, 
    oldValue: any, 
    newValue: any
  ): Promise<void> {
    await this.publishEvent(deviceId, {
      level: 'info',
      code: 'config_change',
      message: `Configuration changed: ${configKey}`,
      meta: { configKey, oldValue, newValue }
    });
  }
}
