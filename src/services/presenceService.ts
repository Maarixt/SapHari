/**
 * Device Presence Service
 * Handles real-time device online/offline tracking via MQTT status messages
 * with TTL fallback for reliable presence detection.
 */

import { DeviceStore } from '@/state/deviceStore';
import { supabase } from '@/integrations/supabase/client';

// TTL configuration
const PRESENCE_TTL_MS = 45000; // 45 seconds - mark offline if no update
const PRESENCE_CHECK_INTERVAL_MS = 10000; // Check every 10 seconds

// Track last seen timestamps per device
const deviceLastSeen: Map<string, number> = new Map();
let presenceTimerId: number | null = null;

/**
 * Handle device presence update from MQTT status message
 * Topic: saphari/<deviceId>/status/online
 * Payload: "online" or "offline"
 */
export function handlePresenceUpdate(deviceId: string, status: 'online' | 'offline') {
  const now = Date.now();
  const isOnline = status === 'online';
  
  // Update last seen timestamp
  deviceLastSeen.set(deviceId, now);
  
  // Update local store
  DeviceStore.setOnline(deviceId, isOnline);
  
  // Persist to database for global visibility
  updateDeviceStatusInDB(deviceId, isOnline);
  
  console.log(`📡 Device ${deviceId} is now ${status}`);
}

/**
 * Record device activity (for any MQTT message from device)
 * This resets the TTL timer for presence tracking
 */
export function recordDeviceActivity(deviceId: string) {
  const now = Date.now();
  deviceLastSeen.set(deviceId, now);
  
  // Ensure device is marked online on any activity
  const currentState = DeviceStore.get(deviceId);
  if (!currentState?.online) {
    DeviceStore.setOnline(deviceId, true);
    updateDeviceStatusInDB(deviceId, true);
  }
}

/**
 * Check all tracked devices and mark offline if TTL exceeded
 */
function checkPresenceTTL() {
  const now = Date.now();
  
  deviceLastSeen.forEach((lastSeen, deviceId) => {
    const elapsed = now - lastSeen;
    
    if (elapsed > PRESENCE_TTL_MS) {
      const currentState = DeviceStore.get(deviceId);
      
      // Only mark offline if currently online
      if (currentState?.online) {
        console.log(`⏰ Device ${deviceId} TTL expired (${Math.round(elapsed / 1000)}s), marking offline`);
        DeviceStore.setOnline(deviceId, false);
        updateDeviceStatusInDB(deviceId, false);
      }
    }
  });
}

/**
 * Update device status in Supabase database
 */
async function updateDeviceStatusInDB(deviceId: string, isOnline: boolean) {
  try {
    const { error } = await supabase
      .from('devices')
      .update({ 
        online: isOnline,
        last_seen: new Date().toISOString()
      })
      .eq('device_id', deviceId);
    
    if (error) {
      console.error('Failed to update device status in DB:', error);
    }
  } catch (err) {
    console.error('Error updating device status:', err);
  }
}

/**
 * Start the presence TTL checker
 */
export function startPresenceChecker() {
  if (presenceTimerId !== null) {
    return; // Already running
  }
  
  presenceTimerId = window.setInterval(checkPresenceTTL, PRESENCE_CHECK_INTERVAL_MS);
  console.log('🔄 Presence TTL checker started');
}

/**
 * Stop the presence TTL checker
 */
export function stopPresenceChecker() {
  if (presenceTimerId !== null) {
    window.clearInterval(presenceTimerId);
    presenceTimerId = null;
    console.log('⏹️ Presence TTL checker stopped');
  }
}

/**
 * Initialize presence for a list of devices (e.g., on dashboard load)
 * Sets initial last_seen based on DB values
 */
export function initializeDevicePresence(devices: Array<{ device_id: string; online: boolean; last_seen: string | null }>) {
  devices.forEach(device => {
    // Set initial state in store
    DeviceStore.setOnline(device.device_id, device.online);
    
    // If device has a last_seen, use it for TTL tracking
    if (device.last_seen) {
      const lastSeenTime = new Date(device.last_seen).getTime();
      deviceLastSeen.set(device.device_id, lastSeenTime);
      
      // Check if TTL already expired
      const elapsed = Date.now() - lastSeenTime;
      if (elapsed > PRESENCE_TTL_MS && device.online) {
        // Device was marked online but hasn't been seen in a while
        DeviceStore.setOnline(device.device_id, false);
        updateDeviceStatusInDB(device.device_id, false);
      }
    } else if (device.online) {
      // Device marked online but no last_seen - use now
      deviceLastSeen.set(device.device_id, Date.now());
    }
  });
}

/**
 * Get the last seen timestamp for a device
 */
export function getDeviceLastSeen(deviceId: string): number | undefined {
  return deviceLastSeen.get(deviceId);
}

/**
 * Clear all presence tracking data
 */
export function clearPresenceData() {
  deviceLastSeen.clear();
}
