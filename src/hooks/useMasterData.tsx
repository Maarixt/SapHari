import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export interface MasterUser {
  id: string;
  email: string;
  role: 'master' | 'admin' | 'developer' | 'technician' | 'user';
  status: 'active' | 'suspended' | 'pending';
  lastLogin: string;
  deviceCount: number;
  createdAt: string;
  displayName?: string;
}

export interface MasterDevice {
  id: string;
  name: string;
  device_id: string;
  device_key: string;
  ownerId: string;
  ownerEmail: string;
  status: 'online' | 'offline' | 'error';
  lastSeen: string;
  firmwareVersion?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MasterAuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  details: string;
  ipAddress: string;
}

export const useMasterData = () => {
  const [users, setUsers] = useState<MasterUser[]>([]);
  const [devices, setDevices] = useState<MasterDevice[]>([]);
  const [auditLogs, setAuditLogs] = useState<MasterAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadUsers = async () => {
    try {
      // Load all profiles (users)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Load user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Load device counts for each user
      const { data: deviceCounts, error: deviceError } = await supabase
        .from('devices')
        .select('user_id')
        .not('user_id', 'is', null);

      if (deviceError) throw deviceError;

      // Count devices per user
      const deviceCountMap = (deviceCounts || []).reduce((acc, device) => {
        acc[device.user_id] = (acc[device.user_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Combine data
      const usersWithRoles = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        const deviceCount = deviceCountMap[profile.id] || 0;
        
        return {
          id: profile.id,
          email: profile.email || 'No email',
          role: (userRole?.role as any) || 'user',
          status: 'active' as const, // Default to active, could be enhanced with actual status
          lastLogin: profile.updated_at, // Use updated_at as proxy for last login
          deviceCount,
          createdAt: profile.created_at,
          displayName: profile.display_name || undefined
        };
      });

      setUsers(usersWithRoles);
    } catch (err: any) {
      console.error('Error loading users:', err);
      setError(err.message);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive"
      });
    }
  };

  const loadDevices = async () => {
    try {
      // Load all devices with owner information
      const { data: deviceData, error: deviceError } = await supabase
        .from('devices')
        .select(`
          *,
          profiles!devices_user_id_fkey (
            email,
            display_name
          )
        `)
        .order('created_at', { ascending: false });

      if (deviceError) throw deviceError;

      const devicesWithOwners = (deviceData || []).map(device => ({
        id: device.id,
        name: device.name,
        device_id: device.device_id,
        device_key: device.device_key,
        ownerId: device.user_id,
        ownerEmail: (device.profiles as any)?.email || 'Unknown',
        status: device.online ? 'online' : 'offline',
        lastSeen: device.updated_at, // Use updated_at as proxy for last seen
        firmwareVersion: 'v1.0.0', // Default, could be enhanced with actual firmware tracking
        location: undefined, // Could be enhanced with location data
        createdAt: device.created_at,
        updatedAt: device.updated_at
      }));

      setDevices(devicesWithOwners);
    } catch (err: any) {
      console.error('Error loading devices:', err);
      setError(err.message);
      toast({
        title: "Error",
        description: "Failed to load devices",
        variant: "destructive"
      });
    }
  };

  const loadAuditLogs = async () => {
    try {
      // Load audit logs if they exist
      const { data: logs, error: logsError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) {
        // Audit logs table might not exist yet, that's okay
        console.warn('Audit logs not available:', logsError.message);
        setAuditLogs([]);
        return;
      }

      const formattedLogs = (logs || []).map(log => ({
        id: log.id,
        timestamp: log.created_at,
        userId: log.user_id,
        userEmail: log.user_email || 'Unknown',
        action: log.action,
        resource: log.resource,
        details: log.details,
        ipAddress: log.ip_address || 'Unknown'
      }));

      setAuditLogs(formattedLogs);
    } catch (err: any) {
      console.error('Error loading audit logs:', err);
      // Don't show error toast for audit logs as they're optional
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    
    await Promise.all([
      loadUsers(),
      loadDevices(),
      loadAuditLogs()
    ]);
    
    setLoading(false);
  };

  const refreshData = () => {
    loadAllData();
  };

  // User management functions
  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({
          user_id: userId,
          role: newRole
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "User role updated successfully"
      });

      await loadUsers();
    } catch (err: any) {
      console.error('Error updating user role:', err);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive"
      });
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      // First delete user's devices and widgets
      const { error: deviceError } = await supabase
        .from('devices')
        .delete()
        .eq('user_id', userId);

      if (deviceError) throw deviceError;

      // Delete user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (roleError) throw roleError;

      // Delete profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) throw profileError;

      toast({
        title: "Success",
        description: "User deleted successfully"
      });

      await loadAllData();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive"
      });
    }
  };

  // Device management functions
  const reassignDevice = async (deviceId: string, newOwnerId: string) => {
    try {
      const { error } = await supabase
        .from('devices')
        .update({ user_id: newOwnerId })
        .eq('id', deviceId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Device reassigned successfully"
      });

      await loadDevices();
    } catch (err: any) {
      console.error('Error reassigning device:', err);
      toast({
        title: "Error",
        description: "Failed to reassign device",
        variant: "destructive"
      });
    }
  };

  const deleteDevice = async (deviceId: string) => {
    try {
      // Delete widgets first
      const { error: widgetError } = await supabase
        .from('widgets')
        .delete()
        .eq('device_id', deviceId);

      if (widgetError) throw widgetError;

      // Delete device
      const { error: deviceError } = await supabase
        .from('devices')
        .delete()
        .eq('id', deviceId);

      if (deviceError) throw deviceError;

      toast({
        title: "Success",
        description: "Device deleted successfully"
      });

      await loadAllData();
    } catch (err: any) {
      console.error('Error deleting device:', err);
      toast({
        title: "Error",
        description: "Failed to delete device",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  return {
    users,
    devices,
    auditLogs,
    loading,
    error,
    refreshData,
    updateUserRole,
    deleteUser,
    reassignDevice,
    deleteDevice
  };
};
