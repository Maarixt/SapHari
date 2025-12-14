/**
 * MQTT Credentials Manager
 * 
 * Manages MQTT credential lifecycle with:
 * - Caching with expiry tracking
 * - Automatic refresh before expiry
 * - Request deduplication
 * - Error handling with retry
 */

import { supabase } from '@/integrations/supabase/client';
import { getValidSession, signOut } from './sessionManager';

export interface MQTTCredentials {
  wss_url: string;
  tcp_host: string;
  wss_port: number;
  username: string;
  password: string;
  client_id: string;
  allowed_topics: string[];
  device_ids: string[];
  expires_at: string;
  user_id: string;
}

// Credentials cache
let cachedCredentials: MQTTCredentials | null = null;
let credentialsFetchTime: number = 0;

// Refresh credentials 60 seconds before expiry
const REFRESH_BUFFER_MS = 60 * 1000;

// Cache duration fallback (if no expires_at)
const DEFAULT_CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// Track in-flight request for deduplication
let fetchInProgress: Promise<MQTTCredentials | null> | null = null;

// Retry configuration
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

/**
 * Check if credentials need refresh
 */
function needsRefresh(): boolean {
  if (!cachedCredentials) return true;
  
  // Check expires_at from server
  if (cachedCredentials.expires_at) {
    const expiresAt = new Date(cachedCredentials.expires_at).getTime();
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    
    if (timeUntilExpiry < REFRESH_BUFFER_MS) {
      console.log('🔑 MQTT credentials expiring soon, need refresh');
      return true;
    }
    
    return false;
  }
  
  // Fallback: check cache age
  const cacheAge = Date.now() - credentialsFetchTime;
  return cacheAge >= DEFAULT_CACHE_DURATION_MS - REFRESH_BUFFER_MS;
}

/**
 * Fetch credentials from edge function
 */
async function fetchFromEdgeFunction(): Promise<MQTTCredentials | null> {
  // Get valid session first
  const session = await getValidSession();
  
  if (!session) {
    console.warn('🔑 No valid session, cannot fetch MQTT credentials');
    return null;
  }
  
  console.log('🔑 Fetching MQTT credentials from edge function...');
  
  const { data, error } = await supabase.functions.invoke('mqtt-credentials', {
    method: 'POST',
    body: {}
  });
  
  if (error) {
    console.error('🔑 Edge function error:', error);
    throw error;
  }
  
  if (!data || !data.username || !data.password) {
    console.error('🔑 Invalid credentials response:', data);
    throw new Error('Invalid credentials response');
  }
  
  return data as MQTTCredentials;
}

/**
 * Handle authentication error - try refresh once, then sign out
 */
async function handleAuthError(): Promise<MQTTCredentials | null> {
  console.warn('🔑 Auth error, attempting session refresh...');
  
  // Force refresh the session
  const session = await getValidSession({ forceRefresh: true });
  
  if (!session) {
    console.error('🔑 Session refresh failed, signing out');
    await signOut();
    return null;
  }
  
  // Try one more time with fresh session
  try {
    const creds = await fetchFromEdgeFunction();
    return creds;
  } catch (error) {
    console.error('🔑 Retry after refresh failed:', error);
    await signOut();
    return null;
  }
}

/**
 * Get MQTT credentials with caching and auto-refresh
 */
export async function getMQTTCredentials(options?: { forceRefresh?: boolean }): Promise<MQTTCredentials | null> {
  // Return cached if valid and not forcing refresh
  if (!options?.forceRefresh && cachedCredentials && !needsRefresh()) {
    console.log('🔑 Using cached MQTT credentials');
    return cachedCredentials;
  }
  
  // Dedupe concurrent requests
  if (fetchInProgress) {
    console.log('🔑 Credentials fetch in progress, waiting...');
    return fetchInProgress;
  }
  
  // Start fetch with retry logic
  fetchInProgress = (async () => {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const credentials = await fetchFromEdgeFunction();
        
        if (credentials) {
          // Cache successful result
          cachedCredentials = credentials;
          credentialsFetchTime = Date.now();
          console.log(`🔑 MQTT credentials cached for ${credentials.device_ids?.length || 0} devices`);
          return credentials;
        }
        
        return null;
      } catch (error: any) {
        lastError = error;
        
        // Check for auth errors
        const isAuthError = 
          error.message?.includes('401') || 
          error.message?.includes('Unauthorized') ||
          error.message?.includes('Invalid token');
        
        if (isAuthError) {
          // Handle auth error specially - don't retry normally
          return await handleAuthError();
        }
        
        // For other errors, retry with delay
        if (attempt < MAX_RETRIES) {
          console.warn(`🔑 Credential fetch attempt ${attempt + 1} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
        }
      }
    }
    
    console.error('🔑 All credential fetch attempts failed:', lastError);
    return null;
  })();
  
  try {
    return await fetchInProgress;
  } finally {
    fetchInProgress = null;
  }
}

/**
 * Clear cached credentials (call on logout)
 */
export function clearMQTTCredentials(): void {
  cachedCredentials = null;
  credentialsFetchTime = 0;
  console.log('🔑 MQTT credentials cleared');
}

/**
 * Check if we have valid cached credentials
 */
export function hasCachedCredentials(): boolean {
  return cachedCredentials !== null && !needsRefresh();
}

/**
 * Get the current cached credentials without fetching
 */
export function getCachedCredentials(): MQTTCredentials | null {
  return cachedCredentials;
}

/**
 * Schedule credential refresh before expiry
 */
let refreshTimer: number | null = null;

export function scheduleCredentialRefresh(): void {
  // Clear existing timer
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  
  if (!cachedCredentials?.expires_at) return;
  
  const expiresAt = new Date(cachedCredentials.expires_at).getTime();
  const refreshAt = expiresAt - REFRESH_BUFFER_MS;
  const delay = refreshAt - Date.now();
  
  if (delay <= 0) {
    // Already needs refresh
    getMQTTCredentials({ forceRefresh: true });
    return;
  }
  
  console.log(`🔑 Scheduled credential refresh in ${Math.round(delay / 1000 / 60)} minutes`);
  
  refreshTimer = window.setTimeout(async () => {
    console.log('🔑 Executing scheduled credential refresh...');
    await getMQTTCredentials({ forceRefresh: true });
    scheduleCredentialRefresh(); // Schedule next refresh
  }, delay);
}

export function cancelCredentialRefresh(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}
