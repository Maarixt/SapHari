/**
 * Browser Sync Service
 * 
 * Handles browser sleep/wake and network online/offline events
 * to ensure the app stays synchronized.
 */

import { getValidSession, isAuthenticated } from './sessionManager';
import { forceReconnect, getStatus } from './mqttConnectionService';
import { supabase } from '@/integrations/supabase/client';

// Track if we've initialized
let isInitialized = false;

// Track visibility state
let wasHidden = false;
let hiddenSince: number | null = null;

// Minimum time hidden before doing a full resync (30 seconds)
const RESYNC_THRESHOLD_MS = 30 * 1000;

// Callbacks for sync events
type SyncCallback = () => void;
const syncCallbacks: SyncCallback[] = [];

/**
 * Perform full resync after wake/network restore
 */
async function performResync(reason: string): Promise<void> {
  console.log(`🔄 Performing resync: ${reason}`);
  
  if (!isAuthenticated()) {
    console.log('🔄 Not authenticated, skipping resync');
    return;
  }
  
  try {
    // 1. Ensure session is valid
    const session = await getValidSession({ forceRefresh: true });
    if (!session) {
      console.log('🔄 Session refresh failed during resync');
      return;
    }
    
    // 2. Ensure MQTT is connected
    const mqttStatus = getStatus();
    if (mqttStatus !== 'connected' && mqttStatus !== 'connecting') {
      console.log('🔄 Reconnecting MQTT...');
      await forceReconnect();
    }
    
    // 3. Notify listeners to refresh their data
    console.log('🔄 Notifying sync listeners...');
    syncCallbacks.forEach(cb => {
      try {
        cb();
      } catch (error) {
        console.error('Sync callback error:', error);
      }
    });
    
    console.log('🔄 Resync complete');
  } catch (error) {
    console.error('🔄 Resync error:', error);
  }
}

/**
 * Handle visibility change (tab hidden/shown)
 */
function handleVisibilityChange(): void {
  if (document.hidden) {
    // Tab is now hidden
    wasHidden = true;
    hiddenSince = Date.now();
    console.log('🌙 Tab hidden');
  } else if (wasHidden) {
    // Tab is now visible after being hidden
    wasHidden = false;
    const hiddenDuration = hiddenSince ? Date.now() - hiddenSince : 0;
    hiddenSince = null;
    
    console.log(`☀️ Tab visible after ${Math.round(hiddenDuration / 1000)}s`);
    
    // Only do full resync if hidden for a while
    if (hiddenDuration >= RESYNC_THRESHOLD_MS) {
      performResync('tab wake after ' + Math.round(hiddenDuration / 1000) + 's');
    } else {
      // Quick check - just ensure MQTT is connected
      const mqttStatus = getStatus();
      if (mqttStatus !== 'connected' && mqttStatus !== 'connecting') {
        performResync('MQTT disconnected during short sleep');
      }
    }
  }
}

/**
 * Handle network online event
 */
function handleOnline(): void {
  console.log('🌐 Network online');
  performResync('network online');
}

/**
 * Handle network offline event
 */
function handleOffline(): void {
  console.log('🌐 Network offline');
  // Nothing to do when offline - just wait for online
}

/**
 * Initialize browser sync service
 */
export function initBrowserSync(): () => void {
  if (isInitialized) {
    console.log('🔄 Browser sync already initialized');
    return () => {};
  }
  
  console.log('🔄 Initializing browser sync service');
  isInitialized = true;
  
  // Add event listeners
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Also handle focus event as backup
  window.addEventListener('focus', () => {
    if (wasHidden) {
      handleVisibilityChange();
    }
  });
  
  // Return cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    isInitialized = false;
  };
}

/**
 * Register a callback to be called on sync
 */
export function onSync(callback: SyncCallback): () => void {
  syncCallbacks.push(callback);
  
  return () => {
    const index = syncCallbacks.indexOf(callback);
    if (index > -1) {
      syncCallbacks.splice(index, 1);
    }
  };
}

/**
 * Manually trigger a resync
 */
export function triggerResync(): void {
  performResync('manual trigger');
}

/**
 * Fetch device presence snapshot from database
 * Used during resync to ensure UI matches DB truth
 */
export async function fetchPresenceSnapshot(): Promise<Array<{
  device_id: string;
  online: boolean;
  last_seen: string | null;
}> | null> {
  try {
    const { data, error } = await supabase
      .from('devices')
      .select('device_id, online, last_seen');
    
    if (error) {
      console.error('Failed to fetch presence snapshot:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching presence snapshot:', error);
    return null;
  }
}
