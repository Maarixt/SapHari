import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeviceCard } from './DeviceCard';
import { AddDeviceDialog } from './AddDeviceDialog';
import { useDevices } from '@/hooks/useDevices';
import { DeviceWithRole } from '@/lib/types';

interface DeviceListProps {
  onDeviceSelect: (device: DeviceWithRole) => void;
}

export const DeviceList = ({ onDeviceSelect }: DeviceListProps) => {
  const { devices, loading, refetch } = useDevices();
  const [showAddDialog, setShowAddDialog] = useState(false);

  const handleAddDevice = () => {
    refetch();
    setShowAddDialog(false);
  };

  const handleDeleteDevice = () => {
    refetch();
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
              onDelete={handleDeleteDevice}
            />
          ))}
        </div>
      )}

      <AddDeviceDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onDeviceAdded={handleAddDevice}
      />
    </div>
  );
};