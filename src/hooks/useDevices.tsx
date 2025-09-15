import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Device, Collaborator, DeviceWithRole } from '@/lib/types';
import { resolveUserRole } from '@/lib/roles';

export const useDevices = () => {
  const { user } = useAuth();
  const [devices, setDevices] = useState<DeviceWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDevices = async () => {
    if (!user) {
      setDevices([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Load all collaborations for this user
      const { data: collaborations, error: collabError } = await supabase
        .from('collaborators')
        .select('*')
        .eq('user_email', user.email);

      if (collabError) throw collabError;

      // Load owned devices
      const { data: ownedDevices, error: ownedError } = await supabase
        .from('devices')
        .select('*')
        .eq('owner_id', user.id);

      if (ownedError) throw ownedError;

      // Load shared devices (where user is collaborator)
      const sharedDeviceIds = collaborations?.map(c => c.device_id) || [];
      let sharedDevices: Device[] = [];
      
      if (sharedDeviceIds.length > 0) {
        const { data, error: sharedError } = await supabase
          .from('devices')
          .select('*')
          .in('id', sharedDeviceIds);

        if (sharedError) throw sharedError;
        sharedDevices = data || [];
      }

      // Combine and add role information
      const allDevices = [
        ...(ownedDevices || []),
        ...sharedDevices
      ];

      const devicesWithRoles: DeviceWithRole[] = allDevices.map(device => ({
        ...device,
        userRole: resolveUserRole(device, user.id, user.email || '', collaborations || []),
        collaborators: collaborations?.filter(c => c.device_id === device.id) || []
      }));

      setDevices(devicesWithRoles);
    } catch (err: any) {
      console.error('Error loading devices:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, [user]);

  const refetch = () => {
    setLoading(true);
    loadDevices();
  };

  return {
    devices,
    loading,
    error,
    refetch
  };
};