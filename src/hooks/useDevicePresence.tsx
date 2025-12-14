import { useState, useEffect } from 'react';
import { DeviceStore, DeviceSnapshot } from '@/state/deviceStore';

/**
 * Hook to get real-time device presence status
 * Uses the DeviceStore which is updated by MQTT status messages
 */
export function useDevicePresence(deviceId: string) {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    const device = DeviceStore.get(deviceId);
    return device?.online ?? false;
  });
  
  const [lastSeen, setLastSeen] = useState<number>(() => {
    const device = DeviceStore.get(deviceId);
    return device?.lastSeen ?? 0;
  });

  useEffect(() => {
    // Subscribe to device store updates
    const unsubscribe = DeviceStore.subscribe(() => {
      const device = DeviceStore.get(deviceId);
      setIsOnline(device?.online ?? false);
      setLastSeen(device?.lastSeen ?? 0);
    });

    return unsubscribe;
  }, [deviceId]);

  return {
    isOnline,
    lastSeen,
    lastSeenFormatted: lastSeen ? new Date(lastSeen).toLocaleString() : 'Never'
  };
}

/**
 * Hook to get all device presence states
 */
export function useAllDevicePresence() {
  const [devices, setDevices] = useState<Record<string, DeviceSnapshot>>(() => DeviceStore.all());

  useEffect(() => {
    const unsubscribe = DeviceStore.subscribe(() => {
      setDevices({ ...DeviceStore.all() });
    });

    return unsubscribe;
  }, []);

  return devices;
}
