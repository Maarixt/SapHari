import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeviceCard } from './DeviceCard';
import { AddDeviceDialog } from './AddDeviceDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Device {
  id: string;
  device_id: string;
  device_key: string;
  name: string;
  online: boolean;
  created_at: string;
  widget_counts?: {
    switches: number;
    gauges: number;
    servos: number;
    alerts: number;
  };
}

interface DeviceListProps {
  onDeviceSelect: (device: Device) => void;
}

export const DeviceList = ({ onDeviceSelect }: DeviceListProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const loadDevices = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('devices')
        .select(`
          *,
          widgets(type)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const devicesWithCounts = data.map(device => ({
        ...device,
        widget_counts: {
          switches: device.widgets?.filter((w: any) => w.type === 'switch').length || 0,
          gauges: device.widgets?.filter((w: any) => w.type === 'gauge').length || 0,
          servos: device.widgets?.filter((w: any) => w.type === 'servo').length || 0,
          alerts: device.widgets?.filter((w: any) => w.type === 'alert').length || 0,
        }
      }));

      setDevices(devicesWithCounts);
    } catch (error) {
      console.error('Error loading devices:', error);
      toast({
        title: "Error",
        description: "Failed to load devices",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, [user]);

  const handleAddDevice = async (deviceData: { name: string; device_id: string; device_key: string }) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('devices')
        .insert({
          user_id: user.id,
          name: deviceData.name,
          device_id: deviceData.device_id,
          device_key: deviceData.device_key
        })
        .select()
        .single();

      if (error) throw error;

      await loadDevices();
      toast({
        title: "Device added",
        description: `${deviceData.name} has been added successfully`
      });
    } catch (error: any) {
      console.error('Error adding device:', error);
      toast({
        title: "Error",
        description: error.message?.includes('duplicate') 
          ? "A device with this ID already exists" 
          : "Failed to add device",
        variant: "destructive"
      });
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    try {
      const { error } = await supabase
        .from('devices')
        .delete()
        .eq('id', deviceId);

      if (error) throw error;

      await loadDevices();
      toast({
        title: "Device deleted",
        description: "Device has been removed successfully"
      });
    } catch (error) {
      console.error('Error deleting device:', error);
      toast({
        title: "Error",
        description: "Failed to delete device",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Devices</h2>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Device
        </Button>
      </div>

      {devices.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No devices yet. Add your first device to get started.</p>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Device
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              onSelect={() => onDeviceSelect(device)}
              onDelete={() => handleDeleteDevice(device.id)}
            />
          ))}
        </div>
      )}

      <AddDeviceDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdd={handleAddDevice}
      />
    </div>
  );
};