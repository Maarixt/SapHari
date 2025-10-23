import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Fetch KPIs from Edge Function (safer) or fallback to direct queries
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
        console.warn('Edge function not available, using fallback:', error);
      }

      // Fallback to direct queries
      const [profilesRes, devicesRes, alertsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('devices').select('id, online', { count: 'exact' }),
        supabase.from('alerts').select('id').gte('created_at', new Date(Date.now() - 24*60*60*1000).toISOString())
      ]);
      
      const onlineDevices = devicesRes.data?.filter(d => d.online).length || 0;
      const totalDevices = devicesRes.count || 0;
      
      return {
        totalUsers: profilesRes.count || 0,
        onlineDevices,
        offlineDevices: totalDevices - onlineDevices,
        storageUsage: '0 Bytes',
        uptime: '99.9%',
        alerts24h: alertsRes.data?.length || 0
      };
    },
    refetchInterval: 30000,
    staleTime: 15000
  });
}

// Fetch devices overview
export function useMasterDevices() {
  return useQuery({
    queryKey: ['master-devices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);
      
      if (error) throw error;
      
      // Fetch profiles separately for owners
      const userIds = [...new Set((data || []).map(d => d.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, display_name')
        .in('id', userIds);
      
      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      // Map to expected format
      return (data || []).map(device => {
        const profile = profilesMap.get(device.user_id);
        return {
          id: device.id,
          device_id: device.device_id,
          name: device.name,
          model: device.model,
          firmware: device.firmware,
          firmware_version: device.firmware_version,
          online: device.online,
          last_seen: device.last_seen,
          created_at: device.created_at,
          updated_at: device.updated_at,
          user_id: device.user_id,
          owner_id: device.user_id,
          profiles: profile ? {
            id: profile.id,
            email: profile.email || '',
            full_name: profile.display_name || profile.email || 'Unknown'
          } : undefined
        };
      });
    },
    refetchInterval: 15000
  });
}

// Fetch users overview  
export function useMasterUsers() {
  return useQuery({
    queryKey: ['master-users'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);
      
      if (profilesError) throw profilesError;
      
      // Fetch roles separately
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      const rolesMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
      
      // Map to expected format
      return (profiles || []).map(profile => ({
        id: profile.id,
        email: profile.email || '',
        display_name: profile.display_name,
        full_name: profile.display_name,
        role: rolesMap.get(profile.id) || 'user',
        status: 'active',
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        last_login: undefined
      }));
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
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      
      if (error) throw error;
      return data || [];
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
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      
      if (error) throw error;
      return data || [];
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
