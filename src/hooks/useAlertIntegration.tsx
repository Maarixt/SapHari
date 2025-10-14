// Alert Integration Hook - Connects device state to alert engine
import { useEffect } from 'react';
import { DeviceStore } from '@/state/deviceStore';

export const useAlertIntegration = () => {
  useEffect(() => {
    // Subscribe to device state changes and trigger alerts
    return DeviceStore.subscribe(() => {
      // The DeviceStore already calls AlertEngine.onDeviceUpdate when state changes
      // This hook just ensures the integration is active
    });
  }, []);

  return null; // This hook doesn't return anything, it just sets up the integration
};
