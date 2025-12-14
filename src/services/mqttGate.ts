/**
 * MQTT Connection Gate
 * 
 * CRITICAL: MQTT must NOT connect until:
 * 1. Auth session is loaded
 * 2. Authorized devices for current user are fetched
 * 3. User has at least one device (or explicitly selected a device)
 * 
 * This prevents cross-account data leakage.
 */

import { supabase } from '@/integrations/supabase/client';
import { getCurrentSession, isAuthenticated } from './sessionManager';

export interface AuthorizedDevice {
  id: string;
  device_id: string;
  name: string;
  online: boolean;
}

// Gate state
let authorizedDevices: AuthorizedDevice[] = [];
let devicesFetched = false;
let fetchPromise: Promise<AuthorizedDevice[]> | null = null;

/**
 * Check if MQTT connection should be allowed
 */
export function canConnectMQTT(): boolean {
  // Must be authenticated
  if (!isAuthenticated()) {
    console.log('🚫 MQTT gate: not authenticated');
    return false;
  }
  
  // Must have fetched devices
  if (!devicesFetched) {
    console.log('🚫 MQTT gate: devices not yet fetched');
    return false;
  }
  
  // Must have at least one device
  if (authorizedDevices.length === 0) {
    console.log('🚫 MQTT gate: no authorized devices');
    return false;
  }
  
  return true;
}

/**
 * Get list of authorized device IDs for MQTT subscriptions
 */
export function getAuthorizedDeviceIds(): string[] {
  return authorizedDevices.map(d => d.device_id);
}

/**
 * Get authorized devices
 */
export function getAuthorizedDevices(): AuthorizedDevice[] {
  return [...authorizedDevices];
}

/**
 * Check if a device ID is authorized for current user
 */
export function isDeviceAuthorized(deviceId: string): boolean {
  return authorizedDevices.some(d => d.device_id === deviceId);
}

/**
 * Fetch authorized devices for current user
 * Returns cached value if already fetched
 */
export async function fetchAuthorizedDevices(): Promise<AuthorizedDevice[]> {
  const session = getCurrentSession();
  
  if (!session) {
    console.log('🔐 No session, clearing authorized devices');
    authorizedDevices = [];
    devicesFetched = true;
    return [];
  }
  
  // Dedupe concurrent fetches
  if (fetchPromise) {
    return fetchPromise;
  }
  
  fetchPromise = (async () => {
    try {
      console.log('🔐 Fetching authorized devices for user:', session.user.id);
      
      const { data, error } = await supabase
        .from('devices_safe')
        .select('id, device_id, name, online')
        .eq('user_id', session.user.id);
      
      if (error) {
        console.error('Failed to fetch authorized devices:', error);
        authorizedDevices = [];
      } else {
        authorizedDevices = (data || []) as AuthorizedDevice[];
        console.log(`🔐 Authorized devices: ${authorizedDevices.length}`);
      }
      
      devicesFetched = true;
      return authorizedDevices;
    } finally {
      fetchPromise = null;
    }
  })();
  
  return fetchPromise;
}

/**
 * Clear authorized devices (call on logout)
 */
export function clearAuthorizedDevices(): void {
  console.log('🔐 Clearing authorized devices');
  authorizedDevices = [];
  devicesFetched = false;
  fetchPromise = null;
}

/**
 * Refresh authorized devices (call when devices change)
 */
export async function refreshAuthorizedDevices(): Promise<AuthorizedDevice[]> {
  devicesFetched = false;
  return fetchAuthorizedDevices();
}

/**
 * Build subscription topics for authorized devices only
 * NO wildcards that could leak other users' data
 */
export function buildAuthorizedSubscriptions(): string[] {
  const topics: string[] = [];
  
  for (const device of authorizedDevices) {
    const deviceId = device.device_id;
    topics.push(
      `saphari/${deviceId}/status/online`,
      `saphari/${deviceId}/gpio/#`,
      `saphari/${deviceId}/sensor/#`,
      `saphari/${deviceId}/gauge/#`,
      `saphari/${deviceId}/state`,
      `saphari/${deviceId}/ack`,
      `saphari/${deviceId}/heartbeat`
    );
  }
  
  return topics;
}
