import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Fetch KPIs from Edge Function (safer) or fallback to view
export function useMasterKPIs() {
  return useQuery({
    queryKey: ['master-kpis'],
    queryFn: async () => {
      // Try Edge function first
      try {
        const { data: session } = await supabase.auth.getSession();
        if (session?.session?.access_token) {
          const response = await fetch(
            'https://wrdeomgtkbehvbfhiprm.supabase.co/functions/v1/master-kpis',
            {
              headers: {
                Authorization: `Bearer ${session.session.access_token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          if (response.ok) {
            return await response.json();
          }
        }
      } catch (error) {
        console.warn('Edge function not available, falling back to view:', error);
      }

      // Fallback to view
      const { data, error } = await supabase
        .from('v_master_kpis')
        .select('*')
        .single();
      
      if (error) throw error;
      
      // Format for consistency
      return {
        totalUsers: data.total_users,
        onlineDevices: data.online_devices,
        offlineDevices: data.offline_devices,
        storageUsage: '0 Bytes', // Placeholder
        uptime: '99.9%',
        alerts24h: data.alerts_24h
      };
    },
    refetchInterval: 30000, // 30 seconds
    staleTime: 15000
  });
}

// Fetch devices overview
export function useMasterDevices() {
  return useQuery({
    queryKey: ['master-devices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_devices_overview')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000
  });
}

// Fetch users overview
export function useMasterUsers() {
  return useQuery({
    queryKey: ['master-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_users_overview')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000
  });
}

// Fetch recent alerts
export function useMasterAlerts() {
  return useQuery({
    queryKey: ['master-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_alerts_recent')
        .select('*')
        .limit(500);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000
  });
}

// Fetch recent audit logs
export function useMasterAudit() {
  return useQuery({
    queryKey: ['master-audit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_audit_recent')
        .select('*')
        .limit(500);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000
  });
}

// Real-time subscriptions for Master Dashboard
export function useMasterRealtime(onUpdate?: () => void) {
  return useQuery({
    queryKey: ['master-realtime'],
    queryFn: async () => {
      const channel = supabase
        .channel('master-dashboard-realtime')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'devices' },
          () => onUpdate?.()
        )
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'alerts' },
          () => onUpdate?.()
        )
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'audit_logs' },
          () => onUpdate?.()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    },
    enabled: false // Manual control
  });
}
