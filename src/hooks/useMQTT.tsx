import { createContext, useContext, useEffect, useState, useRef } from 'react';
import mqtt, { MqttClient } from 'mqtt';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

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
  }, [user, brokerSettings]);

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
    if (client && connected) {
      client.publish(topic, payload, { retain });
    }
  };

  const subscribeToTopic = (topic: string) => {
    if (client && connected) {
      client.subscribe(topic);
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