import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Alert {
  id: string;
  user_id: string;
  device_id?: string | null;
  rule_id?: string | null;
  type: string;
  message: string;
  severity: string | null;
  state: string | null;
  read: boolean;
  details?: any;
  created_at: string;
  closed_at?: string | null;
  ack_by?: string | null;
  // Joined data
  device?: {
    id: string;
    name: string;
    device_id: string;
  } | null;
  rule?: {
    id: string;
    name: string;
  } | null;
}

export function useAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = async () => {
    if (!user) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('alerts')
        .select(`
          *,
          device:devices(id, name, device_id),
          rule:alert_rules(id, name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;

      setAlerts(data || []);
    } catch (err: any) {
      console.error('Error fetching alerts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();

    // Subscribe to realtime updates
    if (!user) return;

    const channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alerts',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Alert realtime update:', payload);
          fetchAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (id: string) => {
    const { error: updateError } = await supabase
      .from('alerts')
      .update({ read: true })
      .eq('id', id);

    if (updateError) {
      console.error('Error marking alert as read:', updateError);
      return;
    }

    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
  };

  const acknowledge = async (id: string) => {
    if (!user) return;

    const { error: updateError } = await supabase
      .from('alerts')
      .update({ 
        state: 'ack',
        read: true,
        ack_by: user.id
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error acknowledging alert:', updateError);
      toast.error('Failed to acknowledge alert');
      return;
    }

    await fetchAlerts();
    toast.success('Alert acknowledged');
  };

  const close = async (id: string) => {
    const { error: updateError } = await supabase
      .from('alerts')
      .update({ 
        state: 'closed',
        read: true,
        closed_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error closing alert:', updateError);
      toast.error('Failed to close alert');
      return;
    }

    await fetchAlerts();
    toast.success('Alert closed');
  };

  const markAllAsRead = async () => {
    const { error: updateError } = await supabase
      .from('alerts')
      .update({ read: true })
      .eq('user_id', user?.id)
      .eq('read', false);

    if (updateError) {
      console.error('Error marking all as read:', updateError);
      return;
    }

    await fetchAlerts();
  };

  const unreadCount = alerts.filter(a => !a.read).length;
  const openCount = alerts.filter(a => a.state === 'open').length;

  return {
    alerts,
    loading,
    error,
    refetch: fetchAlerts,
    markAsRead,
    acknowledge,
    close,
    markAllAsRead,
    unreadCount,
    openCount
  };
}
