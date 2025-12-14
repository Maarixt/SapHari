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
  // Check cache
  if (cachedCredentials && Date.now() - credentialsFetchTime < CACHE_DURATION_MS) {
    // Verify credentials haven't expired
    if (new Date(cachedCredentials.expires_at) > new Date()) {
      console.log('Using cached MQTT credentials');
      return cachedCredentials;
    }
  }

  try {
    console.log('Fetching fresh MQTT credentials from edge function...');
    
    const { data, error } = await supabase.functions.invoke('mqtt-credentials', {
      method: 'POST',
      body: {}
    });

    if (error) {
      console.error('Failed to fetch MQTT credentials:', error);
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
