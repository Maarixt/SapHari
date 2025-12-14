/**
 * MQTT Connection Service
 * 
 * Manages MQTT connection lifecycle with:
 * - Unique client ID generation
 * - Exponential backoff reconnection
 * - Credential refresh handling
 * - Browser sleep/wake recovery
 */

import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { 
  getMQTTCredentials, 
  clearMQTTCredentials, 
  scheduleCredentialRefresh,
  cancelCredentialRefresh,
  type MQTTCredentials 
} from './mqttCredentialsManager';
import { onAuthStateChange, isAuthenticated } from './sessionManager';
import { useMQTTDebugStore } from '@/stores/mqttDebugStore';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';
export type StatusChangeCallback = (status: ConnectionStatus) => void;
export type MessageCallback = (topic: string, payload: string) => void;

// Reconnect configuration
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 10000;
const RECONNECT_MULTIPLIER = 2;

// Connection state
let client: MqttClient | null = null;
let currentCredentials: MQTTCredentials | null = null;
let connectionStatus: ConnectionStatus = 'disconnected';
let reconnectDelay = INITIAL_RECONNECT_DELAY;
let reconnectTimer: number | null = null;
let isManualDisconnect = false;

// Callbacks
const statusCallbacks: StatusChangeCallback[] = [];
const messageCallbacks: MessageCallback[] = [];

// Default subscriptions
const DEFAULT_SUBSCRIPTIONS = [
  'saphari/+/status/online',
  'saphari/+/sensor/#',
  'saphari/+/gpio/#',
  'saphari/+/gauge/#',
  'saphari/+/state',
  'saphari/+/ack',
  'saphari/+/heartbeat'
];

/**
 * Generate unique client ID for browser session
 */
function generateClientId(userId: string): string {
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  const timestamp = Date.now().toString(36);
  return `web_${userId.substring(0, 8)}_${timestamp}_${randomSuffix}`;
}

/**
 * Update connection status and notify listeners
 */
function setStatus(status: ConnectionStatus): void {
  if (connectionStatus === status) return;
  
  connectionStatus = status;
  console.log(`📡 MQTT status: ${status}`);
  
  statusCallbacks.forEach(cb => {
    try {
      cb(status);
    } catch (error) {
      console.error('Status callback error:', error);
    }
  });
}

/**
 * Clear reconnect timer
 */
function clearReconnectTimer(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

/**
 * Schedule reconnection with exponential backoff
 */
function scheduleReconnect(): void {
  if (isManualDisconnect || !isAuthenticated()) {
    console.log('📡 Skipping reconnect (manual disconnect or not authenticated)');
    return;
  }
  
  clearReconnectTimer();
  
  console.log(`📡 Scheduling reconnect in ${reconnectDelay}ms`);
  setStatus('reconnecting');
  
  reconnectTimer = window.setTimeout(async () => {
    console.log('📡 Attempting reconnection...');
    
    // Get fresh credentials
    const creds = await getMQTTCredentials({ forceRefresh: true });
    
    if (!creds) {
      console.warn('📡 No credentials for reconnect, will retry...');
      reconnectDelay = Math.min(reconnectDelay * RECONNECT_MULTIPLIER, MAX_RECONNECT_DELAY);
      scheduleReconnect();
      return;
    }
    
    // Attempt connection
    await connectWithCredentials(creds);
  }, reconnectDelay);
  
  // Increase delay for next attempt
  reconnectDelay = Math.min(reconnectDelay * RECONNECT_MULTIPLIER, MAX_RECONNECT_DELAY);
}

/**
 * Connect to MQTT broker with given credentials
 */
async function connectWithCredentials(credentials: MQTTCredentials): Promise<boolean> {
  if (client) {
    console.log('📡 Closing existing connection...');
    client.end(true);
    client = null;
  }
  
  if (!credentials.username || !credentials.password || !credentials.wss_url) {
    console.warn('📡 Invalid credentials, cannot connect');
    setStatus('error');
    return false;
  }
  
  currentCredentials = credentials;
  setStatus('connecting');
  
  const clientId = credentials.client_id || generateClientId(credentials.user_id);
  console.log(`📡 Connecting to MQTT: ${credentials.wss_url} as ${clientId}`);
  
  const options: IClientOptions = {
    clientId,
    username: credentials.username,
    password: credentials.password,
    reconnectPeriod: 0, // We handle reconnection ourselves
    keepalive: 60,
    clean: true,
    connectTimeout: 15000,
    protocolVersion: 4,
    rejectUnauthorized: false,
  };
  
  return new Promise((resolve) => {
    try {
      client = mqtt.connect(credentials.wss_url, options);
      
      client.on('connect', () => {
        console.log('📡 MQTT connected');
        setStatus('connected');
        reconnectDelay = INITIAL_RECONNECT_DELAY; // Reset backoff
        
        // Subscribe to default topics
        DEFAULT_SUBSCRIPTIONS.forEach(topic => {
          client?.subscribe(topic, { qos: 1 }, (err) => {
            if (err) {
              console.error(`📡 Subscribe error for ${topic}:`, err);
            }
          });
        });
        
        // Schedule credential refresh
        scheduleCredentialRefresh();
        
        resolve(true);
      });
      
      client.on('close', () => {
        console.log('📡 MQTT connection closed');
        if (!isManualDisconnect) {
          setStatus('disconnected');
          scheduleReconnect();
        }
      });
      
      client.on('error', (error) => {
        console.error('📡 MQTT error:', error);
        
        // Check for auth errors
        const errorMsg = error.message?.toLowerCase() || '';
        if (errorMsg.includes('not authorized') || 
            errorMsg.includes('unauthorized') ||
            errorMsg.includes('bad user name or password')) {
          console.warn('📡 Auth error, refreshing credentials...');
          
          // Clear cached credentials and reconnect
          clearMQTTCredentials();
          if (client) {
            client.end(true);
            client = null;
          }
          scheduleReconnect();
        }
        
        setStatus('error');
      });
      
      client.on('offline', () => {
        console.log('📡 MQTT offline');
        setStatus('disconnected');
      });
      
      client.on('message', (topic, payload) => {
        const message = payload.toString();
        
        // Log to debug store if enabled
        const debugStore = useMQTTDebugStore.getState();
        if (debugStore.enabled) {
          debugStore.addLog({
            direction: 'incoming',
            topic,
            payload: message,
          });
        }
        
        // Notify all message listeners
        messageCallbacks.forEach(cb => {
          try {
            cb(topic, message);
          } catch (error) {
            console.error('Message callback error:', error);
          }
        });
      });
      
      // Timeout if connection doesn't establish
      setTimeout(() => {
        if (connectionStatus === 'connecting') {
          console.warn('📡 Connection timeout');
          if (client) {
            client.end(true);
            client = null;
          }
          setStatus('error');
          scheduleReconnect();
          resolve(false);
        }
      }, 15000);
      
    } catch (error) {
      console.error('📡 Connection error:', error);
      setStatus('error');
      scheduleReconnect();
      resolve(false);
    }
  });
}

/**
 * Connect to MQTT (fetches credentials if needed)
 */
export async function connect(): Promise<boolean> {
  if (!isAuthenticated()) {
    console.warn('📡 Not authenticated, cannot connect');
    return false;
  }
  
  isManualDisconnect = false;
  clearReconnectTimer();
  
  // Get credentials
  const credentials = await getMQTTCredentials();
  
  if (!credentials) {
    console.warn('📡 Failed to get credentials');
    setStatus('error');
    return false;
  }
  
  return connectWithCredentials(credentials);
}

/**
 * Disconnect from MQTT
 */
export function disconnect(): void {
  isManualDisconnect = true;
  clearReconnectTimer();
  cancelCredentialRefresh();
  
  if (client) {
    console.log('📡 Disconnecting MQTT...');
    client.end(true);
    client = null;
  }
  
  currentCredentials = null;
  setStatus('disconnected');
}

/**
 * Publish message to topic
 */
export function publish(topic: string, payload: string, retain = false): boolean {
  if (!client || connectionStatus !== 'connected') {
    console.warn('📡 Cannot publish: not connected');
    return false;
  }
  
  // Log to debug store if enabled
  const debugStore = useMQTTDebugStore.getState();
  if (debugStore.enabled) {
    debugStore.addLog({
      direction: 'outgoing',
      topic,
      payload,
    });
  }
  
  client.publish(topic, payload, { retain });
  return true;
}

/**
 * Subscribe to topic
 */
export function subscribe(topic: string): boolean {
  if (!client || connectionStatus !== 'connected') {
    console.warn('📡 Cannot subscribe: not connected');
    return false;
  }
  
  client.subscribe(topic, { qos: 1 });
  return true;
}

/**
 * Register status change callback
 */
export function onStatusChange(callback: StatusChangeCallback): () => void {
  statusCallbacks.push(callback);
  
  // Immediately call with current status
  callback(connectionStatus);
  
  return () => {
    const index = statusCallbacks.indexOf(callback);
    if (index > -1) {
      statusCallbacks.splice(index, 1);
    }
  };
}

/**
 * Register message callback
 */
export function onMessage(callback: MessageCallback): () => void {
  messageCallbacks.push(callback);
  
  return () => {
    const index = messageCallbacks.indexOf(callback);
    if (index > -1) {
      messageCallbacks.splice(index, 1);
    }
  };
}

/**
 * Get current connection status
 */
export function getStatus(): ConnectionStatus {
  return connectionStatus;
}

/**
 * Get current credentials
 */
export function getCredentials(): MQTTCredentials | null {
  return currentCredentials;
}

/**
 * Get MQTT client (for advanced use)
 */
export function getClient(): MqttClient | null {
  return client;
}

/**
 * Force reconnection with fresh credentials
 */
export async function forceReconnect(): Promise<boolean> {
  console.log('📡 Force reconnecting...');
  
  disconnect();
  isManualDisconnect = false;
  
  // Clear cached credentials to force fresh fetch
  clearMQTTCredentials();
  
  return connect();
}

// Set up auth state listener
onAuthStateChange((event, session) => {
  console.log(`📡 Auth event received: ${event}`);
  
  switch (event) {
    case 'SIGNED_OUT':
      disconnect();
      clearMQTTCredentials();
      break;
      
    case 'TOKEN_REFRESHED':
      // Credentials may need refresh if they were tied to old token
      console.log('📡 Token refreshed, checking credentials...');
      if (connectionStatus === 'connected') {
        // Keep connection, credentials should still be valid
      } else if (connectionStatus !== 'connecting') {
        // Try to reconnect with fresh credentials
        connect();
      }
      break;
      
    case 'SIGNED_IN':
      if (!client && session) {
        connect();
      }
      break;
  }
});
