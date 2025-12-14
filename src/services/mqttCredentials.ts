/**
 * Secure MQTT Credentials Service
 * 
 * Fetches short-lived MQTT credentials from the Edge Function
 * instead of reading directly from the database.
 */

import { supabase } from '@/integrations/supabase/client';

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

let cachedCredentials: MQTTCredentials | null = null;
let credentialsFetchTime: number = 0;
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Fetch MQTT credentials from the edge function
 * Caches credentials for 30 minutes to reduce API calls
 */
export async function fetchMQTTCredentials(): Promise<MQTTCredentials | null> {
  // Check cache first
  if (cachedCredentials && Date.now() - credentialsFetchTime < CACHE_DURATION_MS) {
    // Verify credentials haven't expired
    if (new Date(cachedCredentials.expires_at) > new Date()) {
      console.log('Using cached MQTT credentials');
      return cachedCredentials;
    }
  }

  try {
    // CRITICAL: Force refresh the session to get a fresh token
    // This prevents "session not found" errors from stale tokens
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      console.warn('Session refresh failed:', refreshError.message);
      // Try to get current session anyway
    }

    // Get the current session (after refresh attempt)
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return null;
    }
    
    if (!sessionData?.session?.access_token) {
      console.warn('No valid session found - user needs to log in');
      return null;
    }

    console.log('Fetching fresh MQTT credentials from edge function...');
    
    const { data, error } = await supabase.functions.invoke('mqtt-credentials', {
      method: 'POST',
      body: {}
    });

    if (error) {
      console.error('Failed to fetch MQTT credentials:', error);
      
      // If we get a 401, the session is truly invalid - clear it
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        console.warn('Session invalid - clearing local session');
        await supabase.auth.signOut();
      }
      
      return null;
    }

    if (!data || !data.username || !data.password) {
      console.error('Invalid MQTT credentials response:', data);
      return null;
    }

    // Cache the credentials
    cachedCredentials = data as MQTTCredentials;
    credentialsFetchTime = Date.now();

    console.log(`MQTT credentials fetched for ${data.device_ids?.length || 0} devices`);
    return cachedCredentials;

  } catch (error) {
    console.error('Error fetching MQTT credentials:', error);
    return null;
  }
}

/**
 * Clear cached credentials (call on logout)
 */
export function clearMQTTCredentials(): void {
  cachedCredentials = null;
  credentialsFetchTime = 0;
}

/**
 * Check if we have valid cached credentials
 */
export function hasCachedCredentials(): boolean {
  if (!cachedCredentials) return false;
  if (Date.now() - credentialsFetchTime >= CACHE_DURATION_MS) return false;
  if (new Date(cachedCredentials.expires_at) <= new Date()) return false;
  return true;
}
