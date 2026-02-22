import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { DeviceWithRole } from '@/lib/types';
import { initializeDevicePresence } from '@/services/presenceService';

export const useDevices = () => {
  const { user } = useAuth();

  const {
    data: devices = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['devices', user?.id],
    queryFn: async (): Promise<DeviceWithRole[]> => {
      if (!user) return [];

      const { data: deviceData, error: deviceError } = await supabase
        .from('devices_safe')
        .select('*')
        .eq('user_id', user.id);

      if (deviceError) throw deviceError;

      const devicesWithCounts = await Promise.all(
        (deviceData || []).map(async (device) => {
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
              role: 'owner',
              collaborators: [],
              widget_counts: {
                switches: 0,
                gauges: 0,
                servos: 0,
                alerts: 0,
              },
            };
          }

          const counts = {
            switches: 0,
            gauges: 0,
            servos: 0,
            alerts: 0,
          };

          (widgets || []).forEach((widget) => {
            const state = widget.state as { isAlert?: boolean } | null;
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
            role: 'owner',
            collaborators: [],
            widget_counts: counts,
          };
        })
      );

      initializeDevicePresence(
        devicesWithCounts.map((d) => ({
          device_id: d.device_id,
          online: d.online,
          last_seen: d.last_seen,
        }))
      );

      return devicesWithCounts;
    },
    enabled: !!user,
  });

  return {
    devices,
    loading,
    error: queryError ? (queryError as Error).message : null,
    refetch,
  };
};
