import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import mqtt, { MqttClient } from 'mqtt';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { validateMQTTTopic, validateMQTTMessage, validateSapHariTopic } from '@/lib/mqttValidation';
import { mqttPublishLimiter, mqttSubscribeLimiter } from '@/lib/rateLimiter';
import { handleGpioConfirmation } from '@/services/commandService';
import { useMQTTDebugStore } from '@/stores/mqttDebugStore';
import { handlePresenceUpdate, recordDeviceActivity, startPresenceChecker, stopPresenceChecker } from '@/services/presenceService';
// Production broker configuration - AUTHORITATIVE SOURCE (TLS ONLY)
// DO NOT use port 1883 in production - TLS is REQUIRED
const PRODUCTION_BROKER = {
  wss_url: 'wss://z110b082.ala.us-east-1.emqxsl.com:8084/mqtt',
  tcp_host: 'z110b082.ala.us-east-1.emqxsl.com',
  tcp_port: 8883,  // TLS port (NOT 1883)
  tls_port: 8883,
  wss_port: 8084,
  wss_path: '/mqtt',
  use_tls: true
} as const;

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
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  brokerConfig: BrokerConfig | null;
  publishMessage: (topic: string, payload: string, retain?: boolean) => void;
  subscribeToTopic: (topic: string) => void;
  onMessage: (callback: (topic: string, message: string) => void) => () => void;
}

const MQTTContext = createContext<MQTTContextType>({} as MQTTContextType);

export const useMQTT = () => useContext(MQTTContext);

export const MQTTProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [client, setClient] = useState<MqttClient | null>(null);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [brokerConfig, setBrokerConfig] = useState<BrokerConfig | null>(null);
  
  const messageCallbacks = useRef<((topic: string, message: string) => void)[]>([]);
  const clientRef = useRef<MqttClient | null>(null);

  // Load platform broker config from database (authoritative source)
  const loadBrokerConfig = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch from platform_broker_config table directly to get dashboard credentials
      const { data, error } = await supabase
        .from('platform_broker_config')
        .select('*')
        .eq('is_active', true)
        .eq('is_default', true)
        .single();

      if (error) {
        console.warn('Failed to load broker config, using fallback:', error);
        setBrokerConfig({
          ...PRODUCTION_BROKER,
          username: null,
          password: null,
          dashboard_username: null,
          dashboard_password: null,
          source: 'platform'
        });
        return;
      }

      if (data) {
        setBrokerConfig({
          wss_url: data.wss_url,
          tcp_host: data.tcp_host,
          tcp_port: data.tcp_port,
          tls_port: data.tls_port || 8883,
          wss_port: data.wss_port || 8084,
          use_tls: data.use_tls ?? true,
          username: data.username,
          password: data.password,
          dashboard_username: (data as any).dashboard_username || null,
          dashboard_password: (data as any).dashboard_password || null,
          source: 'platform'
        });
      } else {
        setBrokerConfig({
          ...PRODUCTION_BROKER,
          username: null,
          password: null,
          dashboard_username: null,
          dashboard_password: null,
          source: 'platform'
        });
      }
    } catch (error) {
      console.error('Error loading broker config:', error);
      setBrokerConfig({
        ...PRODUCTION_BROKER,
        username: null,
        password: null,
        dashboard_username: null,
        dashboard_password: null,
        source: 'platform'
      });
    }
  }, [user]);

  useEffect(() => {
    loadBrokerConfig();
  }, [loadBrokerConfig]);

  // Connect to MQTT broker using dashboard credentials
  useEffect(() => {
    if (!user || !brokerConfig?.wss_url) return;

    // Cleanup previous connection
    if (clientRef.current) {
      clientRef.current.end(true);
      clientRef.current = null;
    }

    // Check if dashboard credentials are configured
    const hasDashboardCredentials = brokerConfig.dashboard_username && brokerConfig.dashboard_password;
    
    if (!hasDashboardCredentials) {
      console.warn('⚠️ MQTT disabled: dashboard broker credentials not configured');
      setStatus('disconnected');
      setConnected(false);
      return;
    }

    const connectMQTT = () => {
      try {
        setStatus('connecting');
        const clientId = `dashboard-${Math.random().toString(36).substring(2, 10)}`;
        console.info(`🔌 Connecting to MQTT: ${brokerConfig.wss_url} as ${clientId}`);
        
        const mqttClient = mqtt.connect(brokerConfig.wss_url, {
          clientId,
          username: brokerConfig.dashboard_username || undefined,
          password: brokerConfig.dashboard_password || undefined,
          reconnectPeriod: 2000,
          keepalive: 60,
          clean: true,
          connectTimeout: 10000,
          protocolVersion: 4, // MQTT v3.1.1
          rejectUnauthorized: false,
        });

        clientRef.current = mqttClient;

        mqttClient.on('connect', () => {
          setConnected(true);
          setStatus('connected');
          setClient(mqttClient);
          console.info('✅ MQTT connected to production broker');
          
          // Subscribe to all device topics (including retained status messages)
          mqttClient.subscribe('saphari/+/status/online', { qos: 1 });
          mqttClient.subscribe('saphari/+/sensor/#');
          mqttClient.subscribe('saphari/+/gpio/#');
          mqttClient.subscribe('saphari/+/gauge/#');
          mqttClient.subscribe('saphari/+/state');
          mqttClient.subscribe('saphari/+/ack');
          
          // Start presence TTL checker
          startPresenceChecker();
        });

        mqttClient.on('reconnect', () => {
          setStatus('connecting');
          console.info('🔄 MQTT reconnecting...');
        });

        mqttClient.on('close', () => {
          setConnected(false);
          setStatus('disconnected');
          stopPresenceChecker();
        });

        mqttClient.on('error', (error) => {
          console.error('❌ MQTT Error:', error);
          setStatus('error');
          setConnected(false);
        });

        mqttClient.on('message', (topic, payload) => {
          const message = payload.toString();
          
          // Log incoming message if debug enabled
          const debugStore = useMQTTDebugStore.getState();
          if (debugStore.enabled) {
            debugStore.addLog({
              direction: 'incoming',
              topic,
              payload: message,
            });
          }
          
          // Update DeviceStore for device state tracking and trigger alerts
          if (topic.startsWith('saphari/')) {
            const parts = topic.split('/');
            if (parts.length >= 3) {
              const deviceId = parts[1];
              const channel = parts[2]; // 'status', 'state', 'sensor', 'gpio', etc.
              
              // Handle device online/offline status via presence service
              // Topic: saphari/<deviceId>/status/online
              if (channel === 'status' && parts[3] === 'online') {
                const status = message === 'online' ? 'online' : 'offline';
                handlePresenceUpdate(deviceId, status);
              }
              
              // Handle GPIO confirmations from device
              // Topic format: saphari/<deviceId>/gpio/<pin>
              if (channel === 'gpio' && parts.length >= 4) {
                const pin = parseInt(parts[3], 10);
                const value = parseInt(message, 10) as 0 | 1;
                
                if (!isNaN(pin) && (value === 0 || value === 1)) {
                  // Record activity to keep device online
                  recordDeviceActivity(deviceId);
                  
                  // Update DeviceStore with new GPIO state
                  import('@/state/deviceStore').then(({ DeviceStore }) => {
                    DeviceStore.upsertState(deviceId, {
                      gpio: { [pin]: value },
                      online: true
                    });
                  });
                  
                  // Notify command service of confirmation
                  handleGpioConfirmation(deviceId, pin, value);
                  
                  console.log(`📥 GPIO update: ${deviceId} pin ${pin} = ${value}`);
                }
              }
              
              // Handle device state updates
              if (channel === 'state' || channel === 'sensor') {
                // Record activity to keep device online
                recordDeviceActivity(deviceId);
                
                try {
                  const stateData = JSON.parse(message);
                  import('@/state/deviceStore').then(({ DeviceStore }) => {
                    DeviceStore.upsertState(deviceId, {
                      sensors: stateData,
                      online: true
                    });
                  });
                } catch {
                  // Non-JSON message, that's okay for some topics
                }
              }
              
              // Handle other updates and trigger alert engine
              if (parts.length >= 4 && channel !== 'gpio') {
                const type = parts[2]; // 'sensor', 'gauge', etc.
                const key = parts.slice(3).join('.'); // remaining parts as key
                
                // Import and update device state service for alerts
                import('@/services/deviceState').then(({ onMqttMessage }) => {
                  onMqttMessage(deviceId, `${type}.${key}`, message);
                });
              }
            }
          }
          
          // Call all registered callbacks
          messageCallbacks.current.forEach(callback => {
            callback(topic, message);
          });
        });

        return mqttClient;
      } catch (error) {
        console.error('Failed to connect to MQTT:', error);
        setStatus('error');
        return null;
      }
    };

    connectMQTT();

    return () => {
      if (clientRef.current) {
        clientRef.current.end(true);
        clientRef.current = null;
      }
    };
  }, [user, brokerConfig?.wss_url, brokerConfig?.dashboard_username, brokerConfig?.dashboard_password]);

  const publishMessage = useCallback((topic: string, payload: string, retain = false) => {
    if (!clientRef.current || !connected) {
      toast({
        title: "MQTT Error",
        description: "Not connected to MQTT broker",
        variant: "destructive"
      });
      return;
    }

    // Check rate limit
    if (!mqttPublishLimiter.isAllowed('publish')) {
      const remainingTime = mqttPublishLimiter.getRemainingTime('publish');
      toast({
        title: "Rate Limit Exceeded",
        description: `Too many publish requests. Try again in ${Math.ceil(remainingTime / 1000)} seconds.`,
        variant: "destructive"
      });
      return;
    }

    // Validate topic
    const topicValidation = validateSapHariTopic(topic);
    if (!topicValidation.isValid) {
      toast({
        title: "Invalid Topic",
        description: topicValidation.error || "Topic validation failed",
        variant: "destructive"
      });
      return;
    }

    // Validate message
    const messageValidation = validateMQTTMessage(payload);
    if (!messageValidation.isValid) {
      toast({
        title: "Invalid Message",
        description: messageValidation.error || "Message validation failed",
        variant: "destructive"
      });
      return;
    }

    try {
      // Log outgoing message if debug enabled
      const debugStore = useMQTTDebugStore.getState();
      if (debugStore.enabled) {
        debugStore.addLog({
          direction: 'outgoing',
          topic,
          payload,
        });
      }
      
      clientRef.current.publish(topic, payload, { retain });
    } catch (error) {
      console.error('Error publishing message:', error);
      toast({
        title: "Publish Error",
        description: "Failed to publish message",
        variant: "destructive"
      });
    }
  }, [connected, toast]);

  const subscribeToTopic = useCallback((topic: string) => {
    if (!clientRef.current || !connected) {
      toast({
        title: "MQTT Error",
        description: "Not connected to MQTT broker",
        variant: "destructive"
      });
      return;
    }

    // Check rate limit
    if (!mqttSubscribeLimiter.isAllowed('subscribe')) {
      const remainingTime = mqttSubscribeLimiter.getRemainingTime('subscribe');
      toast({
        title: "Rate Limit Exceeded",
        description: `Too many subscribe requests. Try again in ${Math.ceil(remainingTime / 1000)} seconds.`,
        variant: "destructive"
      });
      return;
    }

    // Validate topic
    const topicValidation = validateMQTTTopic(topic);
    if (!topicValidation.isValid) {
      toast({
        title: "Invalid Topic",
        description: topicValidation.error || "Topic validation failed",
        variant: "destructive"
      });
      return;
    }

    try {
      clientRef.current.subscribe(topic);
    } catch (error) {
      console.error('Error subscribing to topic:', error);
      toast({
        title: "Subscribe Error",
        description: "Failed to subscribe to topic",
        variant: "destructive"
      });
    }
  }, [connected, toast]);

  const onMessage = useCallback((callback: (topic: string, message: string) => void) => {
    messageCallbacks.current.push(callback);
    
    // Return cleanup function
    return () => {
      messageCallbacks.current = messageCallbacks.current.filter(cb => cb !== callback);
    };
  }, []);

  return (
    <MQTTContext.Provider value={{
      client,
      connected,
      status,
      brokerConfig,
      publishMessage,
      subscribeToTopic,
      onMessage
    }}>
      {children}
    </MQTTContext.Provider>
  );
};