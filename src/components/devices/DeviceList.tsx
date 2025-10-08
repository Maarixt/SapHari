import { useState, useEffect } from 'react';
import { Plus, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { DeviceCard } from './DeviceCard';
import { AddDeviceDialog } from './AddDeviceDialog';
import { SimulatorModal } from '@/components/simulator/SimulatorModal';
import { useDevices } from '@/hooks/useDevices';
import { DeviceWithRole } from '@/lib/types';

interface DeviceListProps {
  onDeviceSelect: (device: DeviceWithRole) => void;
}

export const DeviceList = ({ onDeviceSelect }: DeviceListProps) => {
  const { devices, loading, refetch } = useDevices();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSim, setShowSim] = useState(false);
  const [simFullscreen, setSimFullscreen] = useState(false);

  const handleAddDevice = () => {
    refetch();
    setShowAddDialog(false);
  };

  const handleDeleteDevice = () => {
    refetch();
  };

  // Refresh device list when returning from device view
  useEffect(() => {
    refetch();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Devices</h2>
        <div className="flex gap-2">
          <Button onClick={() => {
            setSimFullscreen(true);
            setShowSim(true);
          }} variant="outline">
            <Cpu className="mr-2 h-4 w-4" />
            Simulator
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Device
          </Button>
        </div>
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

      <SimulatorModal 
        open={showSim} 
        onOpenChange={(open) => {
          setShowSim(open);
          if (!open) setSimFullscreen(false);
        }} 
        initialFullscreen={simFullscreen}
      />
    </div>
  );
};