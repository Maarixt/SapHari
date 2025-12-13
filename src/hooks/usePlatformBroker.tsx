import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

// Production broker configuration - AUTHORITATIVE SOURCE
const PRODUCTION_BROKER = {
  wss_url: 'wss://z110b082.ala.us-east-1.emqxsl.com:8084/mqtt',
  tcp_host: 'z110b082.ala.us-east-1.emqxsl.com',
  tcp_port: 1883,
  tls_port: 8883,
  wss_port: 8084,
  wss_path: '/mqtt',
  use_tls: true
} as const;

export interface BrokerConfig {
  wss_url: string;
  tcp_host: string;
  tcp_port: number;
  tls_port: number;
  wss_port: number;
  use_tls: boolean;
  username: string | null;
  password: string | null;
  source: 'platform' | 'organization' | 'user';
}

export interface PlatformBrokerConfig {
  id: string;
  name: string;
  description: string | null;
  wss_url: string;
  tcp_host: string;
  tcp_port: number;
  tls_port: number;
  wss_port: number;
  use_tls: boolean;
  username: string | null;
  password: string | null;
  is_active: boolean;
  is_default: boolean;
}

export interface BrokerHealthResult {
  dns: { success: boolean; error?: string; ip?: string };
  websocket: { success: boolean; error?: string; latency?: number };
  mqtt: { success: boolean; error?: string };
  overall: boolean;
}

export function usePlatformBroker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [config, setConfig] = useState<BrokerConfig | null>(null);
  const [platformConfigs, setPlatformConfigs] = useState<PlatformBrokerConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [healthResult, setHealthResult] = useState<BrokerHealthResult | null>(null);
  const [testing, setTesting] = useState(false);

  // Load effective broker config - always use production config
  const loadConfig = useCallback(async () => {
    if (!user) return;
    
    try {
      // Use RPC to get production config
      const { data, error } = await supabase.rpc('get_production_broker_config');

      if (error) {
        console.warn('Failed to load broker config from RPC, using fallback:', error);
        // Fallback to hardcoded production config
        setConfig({
          ...PRODUCTION_BROKER,
          username: null,
          password: null,
          source: 'platform'
        });
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        const cfg = data[0];
        setConfig({
          wss_url: cfg.wss_url,
          tcp_host: cfg.tcp_host,
          tcp_port: cfg.tcp_port,
          tls_port: cfg.tls_port,
          wss_port: cfg.wss_port,
          use_tls: cfg.use_tls,
          username: cfg.username,
          password: cfg.password,
          source: 'platform'
        });
      } else {
        // Fallback to hardcoded production config
        setConfig({
          ...PRODUCTION_BROKER,
          username: null,
          password: null,
          source: 'platform'
        });
      }
    } catch (error) {
      console.error('Error loading broker config:', error);
      // Fallback to hardcoded production config
      setConfig({
        ...PRODUCTION_BROKER,
        username: null,
        password: null,
        source: 'platform'
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load all platform configs (for admin UI)
  const loadPlatformConfigs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('platform_broker_config')
        .select('*')
        .order('is_default', { ascending: false });

      if (error) throw error;
      setPlatformConfigs((data || []) as PlatformBrokerConfig[]);
    } catch (error) {
      console.error('Error loading platform configs:', error);
    }
  }, []);

  useEffect(() => {
    loadConfig();
    loadPlatformConfigs();
  }, [loadConfig, loadPlatformConfigs]);

  // Update platform config (master only)
  const updatePlatformConfig = async (id: string, updates: Partial<PlatformBrokerConfig>) => {
    try {
      const { error } = await supabase
        .from('platform_broker_config')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Platform config updated' });
      await loadPlatformConfigs();
      await loadConfig();
    } catch (error) {
      console.error('Error updating platform config:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to update platform config',
        variant: 'destructive' 
      });
    }
  };

  // Save user broker settings using the upsert function
  const saveUserBrokerSettings = async (settings: {
    url: string;
    username?: string;
    password?: string;
    port?: number;
    use_tls?: boolean;
  }) => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('upsert_broker_settings', {
        p_url: settings.url,
        p_username: settings.username || null,
        p_password: settings.password || null,
        p_port: settings.port || 8084,
        p_use_tls: settings.use_tls ?? true
      });

      if (error) throw error;

      toast({ title: 'Broker settings saved' });
      await loadConfig();
    } catch (error) {
      console.error('Error saving broker settings:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to save broker settings',
        variant: 'destructive' 
      });
      throw error;
    }
  };

  // Test broker health
  const testBrokerHealth = async (url?: string): Promise<BrokerHealthResult> => {
    setTesting(true);
    const testUrl = url || config?.wss_url || '';
    
    const result: BrokerHealthResult = {
      dns: { success: false },
      websocket: { success: false },
      mqtt: { success: false },
      overall: false
    };

    try {
      // Extract hostname from URL
      let hostname: string;
      try {
        const parsed = new URL(testUrl);
        hostname = parsed.hostname;
      } catch {
        result.dns = { success: false, error: 'Invalid URL format' };
        setHealthResult(result);
        setTesting(false);
        return result;
      }

      // DNS Test - try to resolve hostname via fetch to a known DNS API
      try {
        const dnsResponse = await fetch(`https://dns.google/resolve?name=${hostname}&type=A`);
        const dnsData = await dnsResponse.json();
        
        if (dnsData.Status === 0 && dnsData.Answer && dnsData.Answer.length > 0) {
          result.dns = { 
            success: true, 
            ip: dnsData.Answer[0].data 
          };
        } else if (dnsData.Status === 3) {
          result.dns = { success: false, error: 'Domain does not exist (NXDOMAIN)' };
        } else {
          result.dns = { success: false, error: `DNS lookup failed (status: ${dnsData.Status})` };
        }
      } catch (e) {
        result.dns = { success: false, error: 'Could not perform DNS lookup' };
      }

      // WebSocket Test - try to establish connection
      if (result.dns.success) {
        try {
          const startTime = Date.now();
          await new Promise<void>((resolve, reject) => {
            const ws = new WebSocket(testUrl);
            const timeout = setTimeout(() => {
              ws.close();
              reject(new Error('Connection timeout'));
            }, 5000);

            ws.onopen = () => {
              clearTimeout(timeout);
              result.websocket = { 
                success: true, 
                latency: Date.now() - startTime 
              };
              ws.close();
              resolve();
            };

            ws.onerror = () => {
              clearTimeout(timeout);
              reject(new Error('WebSocket connection failed'));
            };
          });
        } catch (e) {
          result.websocket = { 
            success: false, 
            error: e instanceof Error ? e.message : 'WebSocket test failed'
          };
        }
      }

      // MQTT Test - if WebSocket connected, we assume MQTT is available
      if (result.websocket.success) {
        result.mqtt = { success: true };
      } else {
        result.mqtt = { success: false, error: 'Cannot test MQTT without WebSocket connection' };
      }

      result.overall = result.dns.success && result.websocket.success && result.mqtt.success;

    } catch (error) {
      console.error('Health test error:', error);
    }

    setHealthResult(result);
    setTesting(false);
    return result;
  };

  return {
    config,
    platformConfigs,
    loading,
    healthResult,
    testing,
    loadConfig,
    loadPlatformConfigs,
    updatePlatformConfig,
    saveUserBrokerSettings,
    testBrokerHealth
  };
}
