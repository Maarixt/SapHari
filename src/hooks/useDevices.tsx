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

      // Load widget counts for each device
      const devicesWithCounts = await Promise.all(
        (deviceData || []).map(async (device) => {
          // Get widget counts for this device
          const { data: widgets, error: widgetError } = await supabase
            .from('widgets')
            .select('type, state')
            .eq('device_id', device.id);

          if (widgetError) {
            console.error('Error loading widgets for device:', device.id, widgetError);
            return {
              ...device,
              location: device.location as { lat: number; lng: number } | null,
              owner_id: device.user_id || user.id,
              userRole: 'owner' as any,
              collaborators: [],
              widget_counts: {
                switches: 0,
                gauges: 0,
                servos: 0,
                alerts: 0
              }
            };
          }

          // Calculate widget counts
          const counts = {
            switches: 0,
            gauges: 0,
            servos: 0,
            alerts: 0
          };

          (widgets || []).forEach(widget => {
            // Check if this is an alert widget stored as 'switch' type with isAlert flag
            const state = widget.state as any;
            if (widget.type === 'switch' && state?.isAlert === true) {
              counts.alerts++;
            } else if (widget.type === 'switch') {
              counts.switches++;
            } else if (widget.type === 'gauge') {
              counts.gauges++;
            } else if (widget.type === 'servo') {
              counts.servos++;
            } else if (widget.type === 'alert') {
              counts.alerts++;
            }
          });

          return {
            ...device,
            location: device.location as { lat: number; lng: number } | null,
            owner_id: device.user_id || user.id,
            userRole: 'owner' as any,
            collaborators: [],
            widget_counts: counts
          };
        })
      );

      setDevices(devicesWithCounts);
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