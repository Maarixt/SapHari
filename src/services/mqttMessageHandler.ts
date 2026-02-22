/**
 * Shared handler for incoming MQTT/bridge messages. Used by useMQTT and useRealtime.
 * Only process messages from authorized devices (caller ensures bridge already filtered by backend).
 */

import { handleGpioConfirmation } from '@/services/commandService';
import {
  handlePresenceUpdate,
  recordDeviceActivity,
} from '@/services/presenceService';
import { DeviceStore } from '@/state/deviceStore';
import { isDeviceAuthorized } from '@/services/mqttGate';

export function handleIncomingMessage(topic: string, message: string): void {
  if (!topic.startsWith('saphari/')) return;

  const parts = topic.split('/');
  if (parts.length < 3) return;

  const deviceId = parts[1];

  if (!isDeviceAuthorized(deviceId)) {
    return;
  }

  const channel = parts[2];

  if (channel === 'status' && parts[3] === 'online') {
    const presenceStatus = message === 'online' ? 'online' : 'offline';
    handlePresenceUpdate(deviceId, presenceStatus);
  }

  if (channel === 'gpio' && parts.length >= 4) {
    const pin = parseInt(parts[3], 10);
    const value = parseInt(message, 10) as 0 | 1;

    if (!isNaN(pin) && (value === 0 || value === 1)) {
      recordDeviceActivity(deviceId);
      DeviceStore.upsertState(deviceId, {
        gpio: { [pin]: value },
        online: true,
      });
      handleGpioConfirmation(deviceId, pin, value);
    }
  }

  if (channel === 'state' || channel === 'sensor') {
    recordDeviceActivity(deviceId);
    try {
      const stateData = JSON.parse(message);
      DeviceStore.upsertState(deviceId, {
        sensors: stateData,
        online: true,
      });
    } catch {
      // non-JSON ok
    }
  }

  if (channel === 'heartbeat') {
    recordDeviceActivity(deviceId);
  }

  if (parts.length >= 4 && channel !== 'gpio') {
    const type = parts[2];
    const key = parts.slice(3).join('.');
    import('@/services/deviceState').then(({ onMqttMessage }) => {
      onMqttMessage(deviceId, `${type}.${key}`, message);
    });
  }
}
