// Enhanced Master Dashboard Hook - Now using database views
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  useMasterKPIs as useKPIsData,
  useMasterDevices as useDevicesData,
  useMasterUsers as useUsersData,
  useMasterAlerts as useAlertsData,
  useMasterAudit as useAuditData
} from './useMasterData';

// Re-export data hooks
export const useMasterKPIs = useKPIsData;
export const useMasterUsers = useUsersData;
export const useMasterDevices = useDevicesData;
export const useMasterAuditLogs = useAuditData;
export const useMasterAlerts = useAlertsData;

// Placeholder hooks for features not yet migrated to views
export const useMasterApiKeys = () => {
  return useQuery({
    queryKey: ['master-api-keys'],
    queryFn: async () => [],
    enabled: false
  });
};

export const useMasterIpRules = () => {
  return useQuery({
    queryKey: ['master-ip-rules'],
    queryFn: async () => [],
    enabled: false
  });
};

export const useMasterSystemStatus = () => {
  return useQuery({
    queryKey: ['master-system-status'],
    queryFn: async () => ({ status: 'healthy' }),
    enabled: false
  });
};

export const useMasterBackups = () => {
  return useQuery({
    queryKey: ['master-backups'],
    queryFn: async () => [],
    enabled: false
  });
};

export const useMasterSimBindings = () => {
  return useQuery({
    queryKey: ['master-sim-bindings'],
    queryFn: async () => [],
    enabled: false
  });
};

export const useTelemetrySeries = (
  deviceId: string,
  topic: string,
  from: string,
  to: string,
  interval: 'minute' | 'hour' = 'minute'
) => {
  return useQuery({
    queryKey: ['telemetry-series', deviceId, topic, from, to, interval],
    queryFn: async () => [],
    enabled: false
  });
};

export const useTopTalkers = (hours: number = 24) => {
  return useQuery({
    queryKey: ['top-talkers', hours],
    queryFn: async () => [],
    enabled: false
  });
};

// ======= REAL-TIME UPDATES =======
export const useMasterRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('master-dashboard')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'devices' },
        () => queryClient.invalidateQueries({ queryKey: ['master-devices'] })
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'profiles' },
        () => queryClient.invalidateQueries({ queryKey: ['master-users'] })
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'audit_log' },
        () => queryClient.invalidateQueries({ queryKey: ['master-audit-logs'] })
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'telemetry' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['master-kpis'] });
          queryClient.invalidateQueries({ queryKey: ['top-talkers'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};

// ======= UTILITY FUNCTIONS =======
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ======= COMBINED MASTER DASHBOARD HOOK =======
export const useMasterDashboard = () => {
  const kpis = useMasterKPIs();
  const users = useMasterUsers();
  const devices = useMasterDevices();
  const auditLogs = useMasterAuditLogs();
  const systemStatus = useMasterSystemStatus();
  
  // Setup real-time updates
  useMasterRealtime();

  return {
    kpis,
    users,
    devices,
    auditLogs,
    systemStatus,
    loading: kpis.isLoading || users.isLoading || devices.isLoading,
    error: kpis.error || users.error || devices.error
  };
};
