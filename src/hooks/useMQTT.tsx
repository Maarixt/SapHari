import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { MqttClient } from 'mqtt';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { validateMQTTTopic, validateMQTTMessage, validateSapHariTopic } from '@/lib/mqttValidation';
import { mqttPublishLimiter, mqttSubscribeLimiter } from '@/lib/rateLimiter';
import { handleGpioConfirmation } from '@/services/commandService';
import { handlePresenceUpdate, recordDeviceActivity, startPresenceChecker, stopPresenceChecker, initializeDevicePresence } from '@/services/presenceService';
import { 
  connect as mqttConnect, 
  disconnect as mqttDisconnect, 
  publish as mqttPublish, 
  subscribe as mqttSubscribe,
  onStatusChange,
  onMessage as onMqttMessage,
  getCredentials,
  getClient,
  forceReconnect,
  type ConnectionStatus
} from '@/services/mqttConnectionService';
import { type MQTTCredentials } from '@/services/mqttCredentialsManager';
import { initBrowserSync, onSync, fetchPresenceSnapshot } from '@/services/browserSyncService';
import { DeviceStore } from '@/state/deviceStore';

interface BrokerConfig {
  wss_url: string;
  tcp_host: string;
  tcp_port: number;
  tls_port: number;
  wss_port: number;
  use_tls: boolean;
  username: string | null;
  password: string | null;
  dashboard_username: string | null;
  dashboard_password: string | null;
  source: 'platform' | 'organization' | 'user';
}

interface MQTTContextType {
  client: MqttClient | null;
  connected: boolean;
  status: ConnectionStatus;
  brokerConfig: BrokerConfig | null;
  credentials: MQTTCredentials | null;
  publishMessage: (topic: string, payload: string, retain?: boolean) => void;
  subscribeToTopic: (topic: string) => void;
  onMessage: (callback: (topic: string, message: string) => void) => () => void;
  reconnect: () => Promise<void>;
}

const MQTTContext = createContext<MQTTContextType>({} as MQTTContextType);

export const useMQTT = () => useContext(MQTTContext);

export const MQTTProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [credentials, setCredentials] = useState<MQTTCredentials | null>(null);
  
  const messageCallbacks = useRef<((topic: string, message: string) => void)[]>([]);

  // Initialize browser sync and MQTT connection
  useEffect(() => {
    if (!user) {
      mqttDisconnect();
      setStatus('disconnected');
      setCredentials(null);
      return;
    }

    console.log('🔌 Initializing MQTT connection for user:', user.id);
    
    // Initialize browser sync service
    const cleanupBrowserSync = initBrowserSync();
    
    // Subscribe to status changes
    const cleanupStatus = onStatusChange((newStatus) => {
      setStatus(newStatus);
      
      if (newStatus === 'connected') {
        startPresenceChecker();
        setCredentials(getCredentials());
      } else if (newStatus === 'disconnected') {
        stopPresenceChecker();
      }
    });
    
    // Subscribe to messages
    const cleanupMessages = onMqttMessage((topic, message) => {
      handleIncomingMessage(topic, message);
      
      // Call registered callbacks
      messageCallbacks.current.forEach(callback => {
        try {
          callback(topic, message);
        } catch (error) {
          console.error('Message callback error:', error);
        }
      });
    });
    
    // Subscribe to sync events to refresh device presence
    const cleanupSync = onSync(async () => {
      console.log('🔄 Sync event - refreshing device presence...');
      const presenceData = await fetchPresenceSnapshot();
      if (presenceData) {
        initializeDevicePresence(presenceData);
      }
    });
    
    // Connect to MQTT
    mqttConnect();

    return () => {
      cleanupBrowserSync();
      cleanupStatus();
      cleanupMessages();
      cleanupSync();
      mqttDisconnect();
    };
  }, [user]);

  // Handle incoming MQTT messages
  const handleIncomingMessage = useCallback((topic: string, message: string) => {
    if (!topic.startsWith('saphari/')) return;
    
    const parts = topic.split('/');
    if (parts.length < 3) return;
    
    const deviceId = parts[1];
    const channel = parts[2];
    
    // Handle device online/offline status
    if (channel === 'status' && parts[3] === 'online') {
      const presenceStatus = message === 'online' ? 'online' : 'offline';
      handlePresenceUpdate(deviceId, presenceStatus);
    }
    
    // Handle GPIO confirmations
    if (channel === 'gpio' && parts.length >= 4) {
      const pin = parseInt(parts[3], 10);
      const value = parseInt(message, 10) as 0 | 1;
      
      if (!isNaN(pin) && (value === 0 || value === 1)) {
        recordDeviceActivity(deviceId);
        
        DeviceStore.upsertState(deviceId, {
          gpio: { [pin]: value },
          online: true
        });
        
        handleGpioConfirmation(deviceId, pin, value);
        console.log(`📥 GPIO update: ${deviceId} pin ${pin} = ${value}`);
      }
    }
    
    // Handle state/sensor updates
    if (channel === 'state' || channel === 'sensor') {
      recordDeviceActivity(deviceId);
      
      try {
        const stateData = JSON.parse(message);
        DeviceStore.upsertState(deviceId, {
          sensors: stateData,
          online: true
        });
      } catch {
        // Non-JSON message, that's okay
      }
    }
    
    // Handle heartbeat
    if (channel === 'heartbeat') {
      recordDeviceActivity(deviceId);
    }
    
    // Handle other updates for alerts
    if (parts.length >= 4 && channel !== 'gpio') {
      const type = parts[2];
      const key = parts.slice(3).join('.');
      
      import('@/services/deviceState').then(({ onMqttMessage }) => {
        onMqttMessage(deviceId, `${type}.${key}`, message);
      });
    }
  }, []);

  const publishMessage = useCallback((topic: string, payload: string, retain = false) => {
    if (status !== 'connected') {
      toast({
        title: "MQTT Error",
        description: "Not connected to MQTT broker",
        variant: "destructive"
      });
      return;
    }

    if (!mqttPublishLimiter.isAllowed('publish')) {
      const remainingTime = mqttPublishLimiter.getRemainingTime('publish');
      toast({
        title: "Rate Limit",
        description: `Too many requests. Try again in ${Math.ceil(remainingTime / 1000)}s.`,
        variant: "destructive"
      });
      return;
    }

    const topicValidation = validateSapHariTopic(topic);
    if (!topicValidation.isValid) {
      toast({
        title: "Invalid Topic",
        description: topicValidation.error || "Topic validation failed",
        variant: "destructive"
      });
      return;
    }

    const messageValidation = validateMQTTMessage(payload);
    if (!messageValidation.isValid) {
      toast({
        title: "Invalid Message",
        description: messageValidation.error || "Message validation failed",
        variant: "destructive"
      });
      return;
    }

    const success = mqttPublish(topic, payload, retain);
    if (!success) {
      toast({
        title: "Publish Error",
        description: "Failed to publish message",
        variant: "destructive"
      });
    }
  }, [status, toast]);

  const subscribeToTopic = useCallback((topic: string) => {
    if (status !== 'connected') {
      toast({
        title: "MQTT Error",
        description: "Not connected to MQTT broker",
        variant: "destructive"
      });
      return;
    }

    if (!mqttSubscribeLimiter.isAllowed('subscribe')) {
      const remainingTime = mqttSubscribeLimiter.getRemainingTime('subscribe');
      toast({
        title: "Rate Limit",
        description: `Too many requests. Try again in ${Math.ceil(remainingTime / 1000)}s.`,
        variant: "destructive"
      });
      return;
    }

    const topicValidation = validateMQTTTopic(topic);
    if (!topicValidation.isValid) {
      toast({
        title: "Invalid Topic",
        description: topicValidation.error || "Topic validation failed",
        variant: "destructive"
      });
      return;
    }

    const success = mqttSubscribe(topic);
    if (!success) {
      toast({
        title: "Subscribe Error",
        description: "Failed to subscribe to topic",
        variant: "destructive"
      });
    }
  }, [status, toast]);

  const onMessageCallback = useCallback((callback: (topic: string, message: string) => void) => {
    messageCallbacks.current.push(callback);
    
    return () => {
      messageCallbacks.current = messageCallbacks.current.filter(cb => cb !== callback);
    };
  }, []);

  const reconnect = useCallback(async () => {
    console.log('🔄 Manual reconnect requested');
    await forceReconnect();
  }, []);

  // Build broker config from credentials for compatibility
  const brokerConfig: BrokerConfig | null = credentials ? {
    wss_url: credentials.wss_url,
    tcp_host: credentials.tcp_host,
    tcp_port: 8883,
    tls_port: 8883,
    wss_port: credentials.wss_port,
    use_tls: true,
    username: null,
    password: null,
    dashboard_username: credentials.username,
    dashboard_password: credentials.password,
    source: 'platform'
  } : null;

  return (
    <MQTTContext.Provider value={{
      client: getClient(),
      connected: status === 'connected',
      status,
      brokerConfig,
      credentials,
      publishMessage,
      subscribeToTopic,
      onMessage: onMessageCallback,
      reconnect
    }}>
      {children}
    </MQTTContext.Provider>
  );
};
