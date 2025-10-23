import { createContext, useContext, useEffect, useState, useRef } from 'react';
import mqtt, { MqttClient } from 'mqtt';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { validateMQTTTopic, validateMQTTMessage, validateSapHariTopic } from '@/lib/mqttValidation';
import { mqttPublishLimiter, mqttSubscribeLimiter, withRateLimit } from '@/lib/rateLimiter';

interface BrokerSettings {
  url: string;
  username: string;
  password: string;
}

interface MQTTContextType {
  client: MqttClient | null;
  connected: boolean;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  brokerSettings: BrokerSettings;
  updateBrokerSettings: (settings: BrokerSettings) => Promise<void>;
  publishMessage: (topic: string, payload: string, retain?: boolean) => void;
  subscribeToTopic: (topic: string) => void;
  onMessage: (callback: (topic: string, message: string) => void) => void;
}

const MQTTContext = createContext<MQTTContextType>({} as MQTTContextType);

export const useMQTT = () => useContext(MQTTContext);

export const MQTTProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [client, setClient] = useState<MqttClient | null>(null);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [brokerSettings, setBrokerSettings] = useState<BrokerSettings>({
    url: 'wss://broker.emqx.io:8084/mqtt',
    username: '',
    password: ''
  });
  
  const messageCallbacks = useRef<((topic: string, message: string) => void)[]>([]);

  // Load broker settings from database
  useEffect(() => {
    if (!user) return;

    const loadBrokerSettings = async () => {
      const { data, error } = await supabase
        .from('broker_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading broker settings:', error);
        return;
      }

      if (data) {
        setBrokerSettings({
          url: data.url,
          username: data.username || '',
          password: data.password || ''
        });
      }
    };

    loadBrokerSettings();
  }, [user]);

  // Connect to MQTT broker
  useEffect(() => {
    if (!user || !brokerSettings.url) return;

    // Only reconnect if URL or credentials changed
    const connectionKey = `${brokerSettings.url}-${brokerSettings.username}-${brokerSettings.password}`;
    
    const connectMQTT = () => {
      try {
        setStatus('connecting');
        
        const mqttClient = mqtt.connect(brokerSettings.url, {
          username: brokerSettings.username || undefined,
          password: brokerSettings.password || undefined,
          reconnectPeriod: 2000,
          keepalive: 60,
          clean: true,
        });

        mqttClient.on('connect', () => {
          setConnected(true);
          setStatus('connected');
          setClient(mqttClient);
          
          // Subscribe to all device topics for this user
          mqttClient.subscribe('saphari/+/sensor/#');
          mqttClient.subscribe('saphari/+/status/#');
        });

        mqttClient.on('reconnect', () => {
          setStatus('connecting');
        });

        mqttClient.on('close', () => {
          setConnected(false);
          setStatus('disconnected');
        });

        mqttClient.on('error', (error) => {
          console.error('MQTT Error:', error);
          setStatus('error');
          setConnected(false);
        });

        mqttClient.on('message', (topic, payload) => {
          const message = payload.toString();
          
          // Update DeviceStore for device state tracking
          if (topic.startsWith('saphari/')) {
            const parts = topic.split('/');
            if (parts.length >= 3) {
              const deviceId = parts[1];
              const channel = parts[2]; // 'status', 'state', 'sensor', etc.
              
              // Handle device online/offline status
              if (channel === 'status') {
                import('@/state/deviceStore').then(({ DeviceStore }) => {
                  DeviceStore.setOnline(deviceId, message === 'online');
                });
              }
              
              // Handle device state updates
              if (channel === 'state' || channel === 'sensor') {
                try {
                  const stateData = JSON.parse(message);
                  import('@/state/deviceStore').then(({ DeviceStore }) => {
                    DeviceStore.upsertState(deviceId, {
                      sensors: stateData,
                      online: true
                    });
                  });
                } catch (e) {
                  console.error('Failed to parse MQTT state:', e);
                }
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

    const mqttClient = connectMQTT();

    return () => {
      if (mqttClient) {
        mqttClient.end(true);
      }
    };
  }, [user, brokerSettings.url, brokerSettings.username, brokerSettings.password]);

  const updateBrokerSettings = async (settings: BrokerSettings) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('broker_settings')
        .upsert({
          user_id: user.id,
          url: settings.url,
          username: settings.username,
          password: settings.password
        });

      if (error) throw error;

      setBrokerSettings(settings);
      toast({
        title: "Broker settings updated",
        description: "MQTT broker configuration saved and reconnecting..."
      });
    } catch (error) {
      console.error('Error updating broker settings:', error);
      toast({
        title: "Error",
        description: "Failed to update broker settings",
        variant: "destructive"
      });
    }
  };

  const publishMessage = (topic: string, payload: string, retain = false) => {
    if (!client || !connected) {
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
      client.publish(topic, payload, { retain });
    } catch (error) {
      console.error('Error publishing message:', error);
      toast({
        title: "Publish Error",
        description: "Failed to publish message",
        variant: "destructive"
      });
    }
  };

  const subscribeToTopic = (topic: string) => {
    if (!client || !connected) {
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
      client.subscribe(topic);
    } catch (error) {
      console.error('Error subscribing to topic:', error);
      toast({
        title: "Subscribe Error",
        description: "Failed to subscribe to topic",
        variant: "destructive"
      });
    }
  };

  const onMessage = (callback: (topic: string, message: string) => void) => {
    messageCallbacks.current.push(callback);
    
    // Return cleanup function
    return () => {
      messageCallbacks.current = messageCallbacks.current.filter(cb => cb !== callback);
    };
  };

  return (
    <MQTTContext.Provider value={{
      client,
      connected,
      status,
      brokerSettings,
      updateBrokerSettings,
      publishMessage,
      subscribeToTopic,
      onMessage
    }}>
      {children}
    </MQTTContext.Provider>
  );
};