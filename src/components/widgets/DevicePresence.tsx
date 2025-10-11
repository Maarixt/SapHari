import React, { useEffect, useState } from 'react';
import { DeviceStore } from '@/state/deviceStore';

export function DevicePresence({ deviceId }: { deviceId: string }){
  const [, setTick] = useState(0);
  useEffect(() => {
    return DeviceStore.subscribe(() => setTick(x => x + 1));
  }, []);
  const d = DeviceStore.get(deviceId);
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${d?.online ? 'text-emerald-400' : 'text-rose-400'}`}>
      <span className={`w-2 h-2 rounded-full ${d?.online ? 'bg-emerald-400' : 'bg-rose-500'}`}/>
      {d?.online ? 'Online' : 'Offline'}
    </span>
  );
}
