import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { MqttClient } from 'mqtt';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { handleIncomingMessage } from '@/services/mqttMessageHandler';
import { initBrowserSync, onSync, fetchPresenceSnapshot } from '@/services/browserSyncService';
import { initializeDevicePresence } from '@/services/presenceService';
import { fetchAuthorizedDevices } from '@/services/mqttGate';
import {
  getDefaultBridgeClient,
  type BridgeStatus,
} from '@/services/realtimeBridgeClient';
import type { ConnectionStatus } from '@/services/mqttConnectionService';
import type { MQTTCredentials } from '@/services/mqttCredentialsManager';

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

interface RealtimeContextType {
  client: MqttClient | null;
  connected: boolean;
  status: ConnectionStatus;
  authStatus: 'pending' | 'ok' | 'error';
  brokerConfig: BrokerConfig | null;
  credentials: MQTTCredentials | null;
  publishMessage: (topic: string, payload: string, retain?: boolean) => void | Promise<{ ok: boolean; reqId?: string }>;
  subscribeToTopic: (topic: string) => void;
  onMessage: (callback: (topic: string, message: string) => void) => () => void;
  reconnect: () => Promise<void>;
  bridgeClient: ReturnType<typeof getDefaultBridgeClient> | null;
}

export const RealtimeContext = createContext<RealtimeContextType>({} as RealtimeContextType);

export const useRealtime = () => useContext(RealtimeContext);

function mapBridgeStatusToConnection(status: BridgeStatus): ConnectionStatus {
  switch (status) {
    case 'connected':
      return 'connected';
    case 'connecting':
    case 'authenticating':
      return 'connecting';
    case 'disconnected':
    default:
      return 'disconnected';
  }
}

export const RealtimeProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [authStatus, setAuthStatus] = useState<'pending' | 'ok' | 'error'>('pending');
  const bridgeClientRef = useRef(getDefaultBridgeClient());
  const messageCallbacks = useRef<((topic: string, message: string) => void)[]>([]);

  const wsUrl = import.meta.env.VITE_BRIDGE_WS_URL as string | undefined;
  const httpUrl = import.meta.env.VITE_BRIDGE_HTTP_URL as string | undefined;

  useEffect(() => {
    if (!user || !session?.access_token || !wsUrl || !httpUrl) {
      bridgeClientRef.current.disconnect();
      setStatus('disconnected');
      setAuthStatus('pending');
      return;
    }

    const client = bridgeClientRef.current;
    const getToken = async () => {
      const { data: { session: s } } = await import('@/integrations/supabase/client').then((m) =>
        m.supabase.auth.getSession()
      );
      return s?.access_token ?? null;
    };

    fetchAuthorizedDevices().then(() => {
      client.connect(wsUrl, httpUrl, getToken);
    });

    const unsubStatus = client.onStatusChange((s) => {
      setStatus(mapBridgeStatusToConnection(s));
      if (s === 'connected') setAuthStatus('ok');
      else if (s === 'disconnected') setAuthStatus('error');
    });

    const unsubMsg = client.onMessage((topic, payload) => {
      handleIncomingMessage(topic, payload);
      messageCallbacks.current.forEach((cb) => {
        try {
          cb(topic, payload);
        } catch (e) {
          console.error('Realtime message callback error:', e);
        }
      });
    });

    const cleanupSync = onSync(async () => {
      const presenceData = await fetchPresenceSnapshot();
      if (presenceData) initializeDevicePresence(presenceData);
    });
    initBrowserSync();

    return () => {
      unsubStatus();
      unsubMsg();
      cleanupSync();
      client.disconnect();
    };
  }, [user, session?.access_token, wsUrl, httpUrl]);

  const publishMessage = useCallback(
    (topic: string, payload: string, _retain = false) => {
      if (status !== 'connected') {
        toast({
          title: 'Bridge Error',
          description: 'Not connected to bridge',
          variant: 'destructive',
        });
        return;
      }
      if (!topic.startsWith('saphari/')) return;
      const parts = topic.split('/');
      const deviceId = parts[1];
      const cmd = parts[2];
      if (cmd === 'cmd' && parts[3] === 'toggle') {
        try {
          const body = JSON.parse(payload) as { addr?: string; pin?: number; state?: 0 | 1; override?: boolean };
          return bridgeClientRef.current.sendToggleCommand(
            deviceId,
            body.addr ?? '',
            body.pin ?? 0,
            (body.state ?? 0) as 0 | 1,
            body.override
          ) as Promise<{ ok: boolean; reqId?: string }>;
        } catch {
          toast({ title: 'Invalid payload', variant: 'destructive' });
        }
      } else if (cmd === 'cmd' && parts[3] === 'servo') {
        try {
          const body = JSON.parse(payload) as { addr?: string; pin?: number; angle?: number };
          bridgeClientRef.current.sendServoCommand(
            deviceId,
            body.addr ?? '',
            body.pin ?? 0,
            body.angle ?? 0
          );
        } catch {
          toast({ title: 'Invalid payload', variant: 'destructive' });
        }
      }
    },
    [status, toast]
  );

  const subscribeToTopic = useCallback(() => {
    // no-op in bridge mode; server pushes all authorized topics
  }, []);

  const onMessageCallback = useCallback((callback: (topic: string, message: string) => void) => {
    messageCallbacks.current.push(callback);
    return () => {
      messageCallbacks.current = messageCallbacks.current.filter((cb) => cb !== callback);
    };
  }, []);

  const reconnect = useCallback(async () => {
    const client = bridgeClientRef.current;
    client.disconnect();
    if (wsUrl && httpUrl && user) {
      const getToken = async () => {
        const { data: { session: s } } = await import('@/integrations/supabase/client').then((m) =>
          m.supabase.auth.getSession()
        );
        return s?.access_token ?? null;
      };
      client.connect(wsUrl, httpUrl, getToken);
    }
  }, [wsUrl, httpUrl, user]);

  const brokerConfig: BrokerConfig | null =
    wsUrl && httpUrl
      ? {
          wss_url: wsUrl,
          tcp_host: '',
          tcp_port: 0,
          tls_port: 0,
          wss_port: 0,
          use_tls: true,
          username: null,
          password: null,
          dashboard_username: null,
          dashboard_password: null,
          source: 'platform',
        }
      : null;

  return (
    <RealtimeContext.Provider
      value={{
        client: null,
        connected: status === 'connected',
        status,
        authStatus,
        brokerConfig,
        credentials: null,
        publishMessage,
        subscribeToTopic,
        onMessage: onMessageCallback,
        reconnect,
        bridgeClient: bridgeClientRef.current,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};
