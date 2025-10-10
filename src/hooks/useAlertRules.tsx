import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { useMQTT } from './useMQTT';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { AlertsStore } from '@/features/alerts/alertsStore';
import { onMqttMessage, parseMqttTopic } from '@/services/deviceState';

export const useAlertRules = () => {
  const { user } = useAuth();
  const { onMessage } = useMQTT();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Load alert rules from database
  const loadRules = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('alert_rules')
        .select('*')
        .eq('user_id', user.id)
        .eq('enabled', true);

      if (error) throw error;
      
      // Rules are now managed by AlertsStore, so we don't need to set them here
      // The alert engine will automatically pick up rules from AlertsStore
    } catch (error) {
      console.error('Error loading alert rules:', error);
    } finally {
      setLoading(false);
    }
  };

  // Process MQTT message and update device state
  const handleMQTTMessage = (topic: string, message: string) => {
    // Parse the MQTT topic to extract device ID and key
    const parsed = parseMqttTopic(topic);
    if (parsed) {
      // Convert message to appropriate type
      let value: any = message;
      if (!isNaN(Number(message))) {
        value = Number(message);
      }
      
      // Update device state and trigger alert evaluation
      onMqttMessage(parsed.deviceId, parsed.key, value);
    }
  };


  // Set up MQTT message listener
  useEffect(() => {
    if (!onMessage) return;

    // Subscribe to MQTT messages
    const unsubscribe = onMessage(handleMQTTMessage);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [onMessage]);

  // Load rules when user changes
  useEffect(() => {
    if (user) {
      loadRules();
    }
  }, [user]);

  return {
    loading,
    loadRules
  };
};
