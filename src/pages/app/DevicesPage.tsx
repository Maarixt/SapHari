import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DeviceList } from '@/components/devices/DeviceList';
import { DeviceView } from '@/components/devices/DeviceView';
import { DeviceWithRole } from '@/lib/types';

export default function DevicesPage() {
  const [searchParams] = useSearchParams();
  const [selectedDevice, setSelectedDevice] = useState<DeviceWithRole | null>(null);

  // Check if we should auto-open add device dialog
  const shouldOpenAddDevice = searchParams.get('add') === '1';

  if (selectedDevice) {
    return (
      <DeviceView device={selectedDevice} onBack={() => setSelectedDevice(null)} />
    );
  }

  return (
    <DeviceList 
      onDeviceSelect={setSelectedDevice} 
      autoOpenAddDialog={shouldOpenAddDevice}
    />
  );
}
