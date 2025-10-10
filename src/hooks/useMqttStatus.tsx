import { useState, useEffect } from 'react';
import { getConnectionStatus } from '@/services/mqtt';

export const useMqttStatus = () => {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting' | 'error'>('disconnected');
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      const { connected: isConnected, status: currentStatus } = getConnectionStatus();
      setConnected(isConnected);
      setStatus(isConnected ? 'connected' : 'disconnected');
    };

    // Update status immediately
    updateStatus();

    // Update status every 2 seconds
    const interval = setInterval(updateStatus, 2000);

    return () => clearInterval(interval);
  }, []);

  return { status, connected };
};
