// Enhanced Master Dashboard Hook
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  fetchOnlineDevicesCount,
  fetchTotalUsersCount,
  fetchStorageUsage,
  fetchUptimePercentage,
  fetchUsers,
  fetchDevices,
  fetchAuditLogs,
  fetchApiKeys,
  fetchIpRules,
  fetchSystemStatus,
  fetchBackups,
  fetchSimBindings,
  fetchTelemetrySeries,
  fetchTopTalkers,
  createUser,
  updateUserRole,
  updateDeviceStatus,
  createApiKey,
  createSimBinding
} from '@/lib/api';

// ======= KPI HOOK =======
export const useMasterKPIs = () => {
  return useQuery({
    queryKey: ['master-kpis'],
    queryFn: async () => {
      const [onlineDevices, totalUsers, storageUsage, uptime] = await Promise.all([
        fetchOnlineDevicesCount(supabase),
        fetchTotalUsersCount(supabase),
        fetchStorageUsage(supabase),
        fetchUptimePercentage(supabase)
      ]);

      return {
        onlineDevices,
        totalUsers,
        storageUsage: formatBytes(storageUsage),
        uptime: `${uptime}%`
      };
    },
    refetchInterval: 30000, // 30 seconds
    staleTime: 15000 // 15 seconds
  });
};

// ======= USERS HOOK =======
export const useMasterUsers = (filters?: any) => {
  return useQuery({
    queryKey: ['master-users', filters],
    queryFn: () => fetchUsers(supabase, filters),
    refetchInterval: 60000, // 1 minute
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userData: any) => createUser(supabase, userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-users'] });
    },
  });
};

export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => 
      updateUserRole(supabase, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-users'] });
    },
  });
};

// ======= DEVICES HOOK =======
export const useMasterDevices = (filters?: any) => {
  return useQuery({
    queryKey: ['master-devices', filters],
    queryFn: () => fetchDevices(supabase, filters),
    refetchInterval: 30000, // 30 seconds
  });
};

export const useUpdateDeviceStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ deviceId, status }: { deviceId: string; status: any }) => 
      updateDeviceStatus(supabase, deviceId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-devices'] });
    },
  });
};

// ======= AUDIT LOGS HOOK =======
export const useMasterAuditLogs = (filters?: any) => {
  return useQuery({
    queryKey: ['master-audit-logs', filters],
    queryFn: () => fetchAuditLogs(supabase, filters),
    refetchInterval: 10000, // 10 seconds for real-time updates
  });
};

// ======= SECURITY HOOKS =======
export const useMasterApiKeys = () => {
  return useQuery({
    queryKey: ['master-api-keys'],
    queryFn: () => fetchApiKeys(supabase),
  });
};

export const useCreateApiKey = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (keyData: any) => createApiKey(supabase, keyData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-api-keys'] });
    },
  });
};

export const useMasterIpRules = () => {
  return useQuery({
    queryKey: ['master-ip-rules'],
    queryFn: () => fetchIpRules(supabase),
  });
};

// ======= SYSTEM STATUS HOOKS =======
export const useMasterSystemStatus = () => {
  return useQuery({
    queryKey: ['master-system-status'],
    queryFn: () => fetchSystemStatus(supabase),
    refetchInterval: 30000, // 30 seconds
  });
};

export const useMasterBackups = () => {
  return useQuery({
    queryKey: ['master-backups'],
    queryFn: () => fetchBackups(supabase),
  });
};

// ======= SIMULATOR HOOKS =======
export const useMasterSimBindings = () => {
  return useQuery({
    queryKey: ['master-sim-bindings'],
    queryFn: () => fetchSimBindings(supabase),
  });
};

export const useCreateSimBinding = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (bindingData: any) => createSimBinding(supabase, bindingData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-sim-bindings'] });
    },
  });
};

// ======= TELEMETRY HOOKS =======
export const useTelemetrySeries = (
  deviceId: string,
  topic: string,
  from: string,
  to: string,
  interval: 'minute' | 'hour' = 'minute'
) => {
  return useQuery({
    queryKey: ['telemetry-series', deviceId, topic, from, to, interval],
    queryFn: () => fetchTelemetrySeries(supabase, deviceId, topic, from, to, interval),
    enabled: !!deviceId && !!topic && !!from && !!to,
  });
};

export const useTopTalkers = (hours: number = 24) => {
  return useQuery({
    queryKey: ['top-talkers', hours],
    queryFn: () => fetchTopTalkers(supabase, hours),
    refetchInterval: 60000, // 1 minute
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
