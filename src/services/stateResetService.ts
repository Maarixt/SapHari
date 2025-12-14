/**
 * State Reset Service
 * 
 * CRITICAL: This service handles complete app state reset on logout/user switch
 * to prevent cross-account data leakage.
 * 
 * This is a P0 security feature - all user-specific state MUST be cleared.
 */

import { clearMQTTCredentials, cancelCredentialRefresh } from './mqttCredentialsManager';
import { disconnect as disconnectMQTT } from './mqttConnectionService';
import { clearAuthorizedDevices } from './mqttGate';

/**
 * Get all localStorage keys that belong to the app
 */
function getAppLocalStorageKeys(): string[] {
  const appPrefixes = [
    'saphari-',
    'saphari_',
    'alert.',
    'alerts.',
    'sb-',  // Supabase auth tokens
    'integron:',
  ];
  
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && appPrefixes.some(prefix => key.startsWith(prefix))) {
      keys.push(key);
    }
  }
  return keys;
}

/**
 * Clear user-specific localStorage keys
 * Preserves non-user-specific preferences like theme
 */
function clearUserLocalStorage(): void {
  const preserveKeys = [
    'saphari-theme', // User may want to keep theme preference
    'saphari-simulator-beta-dismissed', // UI preference, not user data
    'saphari-mqtt-debug', // Debug preference only (no actual logs stored in persist)
  ];
  
  const keys = getAppLocalStorageKeys();
  
  keys.forEach(key => {
    if (!preserveKeys.includes(key)) {
      console.log(`🧹 Clearing localStorage: ${key}`);
      localStorage.removeItem(key);
    }
  });
}

/**
 * Clear session storage
 */
function clearSessionStorage(): void {
  // Clear all app-related session storage
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => {
    sessionStorage.removeItem(key);
  });
}

/**
 * Clear in-memory stores - imported dynamically to avoid circular deps
 */
async function clearInMemoryStores(): Promise<void> {
  console.log('🧹 Clearing in-memory stores...');
  
  try {
    // Dynamic imports to avoid circular dependency issues
    const [deviceStoreModule, deviceStateStoreModule, alertsStoreModule, mqttDebugStoreModule] = await Promise.all([
      import('@/state/deviceStore'),
      import('@/stores/deviceStateStore'),
      import('@/features/alerts/alertsStore'),
      import('@/stores/mqttDebugStore'),
    ]);
    
    // Clear each store using their exported clear methods
    deviceStoreModule.DeviceStore.clear();
    deviceStateStoreModule.deviceStateStore.clear();
    alertsStoreModule.AlertsStore.clear();
    mqttDebugStoreModule.useMQTTDebugStore.getState().clearLogs();
    
    console.log('🧹 In-memory stores cleared');
  } catch (error) {
    console.error('🧹 Error clearing stores:', error);
  }
}

/**
 * Complete app state reset - call on logout
 */
export async function resetAllState(): Promise<void> {
  console.log('🧹 Starting complete state reset...');
  
  try {
    // 1. Disconnect MQTT and clear credentials
    console.log('🧹 Disconnecting MQTT...');
    disconnectMQTT();
    clearMQTTCredentials();
    cancelCredentialRefresh();
    clearAuthorizedDevices(); // Clear authorized devices gate
    
    // 2. Clear in-memory stores
    await clearInMemoryStores();
    
    // 3. Clear localStorage (user-specific)
    console.log('🧹 Clearing user localStorage...');
    clearUserLocalStorage();
    
    // 4. Clear sessionStorage
    console.log('🧹 Clearing sessionStorage...');
    clearSessionStorage();
    
    console.log('🧹 State reset complete');
    
  } catch (error) {
    console.error('🧹 State reset error:', error);
    // Force clear even on error
    clearUserLocalStorage();
    clearSessionStorage();
  }
}

/**
 * Verify state is clean (for debugging)
 */
export function verifyStateClean(): { isClean: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check localStorage
  const appKeys = getAppLocalStorageKeys();
  const userDataKeys = appKeys.filter(key => 
    !key.startsWith('saphari-theme') && 
    !key.startsWith('saphari-simulator-beta-dismissed') &&
    !key.startsWith('saphari-mqtt-debug')
  );
  
  if (userDataKeys.length > 0) {
    issues.push(`User data in localStorage: ${userDataKeys.join(', ')}`);
  }
  
  // Check sessionStorage
  if (sessionStorage.length > 0) {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) keys.push(key);
    }
    issues.push(`Data in sessionStorage: ${keys.join(', ')}`);
  }
  
  return {
    isClean: issues.length === 0,
    issues
  };
}
