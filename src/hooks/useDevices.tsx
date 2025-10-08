import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { DeviceWithRole, Role } from '@/lib/types';

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
      
      // Load devices with user_id (backward compatibility)
      const { data: deviceData, error: deviceError } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', user.id);
        
      if (deviceError) throw deviceError;

      // Convert to DeviceWithRole format
      const devicesWithRoles: DeviceWithRole[] = (deviceData || []).map(device => ({
        ...device,
        owner_id: device.user_id || user.id,
        userRole: 'owner' as Role,
        collaborators: []
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