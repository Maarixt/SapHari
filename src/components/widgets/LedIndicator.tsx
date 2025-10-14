import React, { useEffect, useState } from 'react';
import { DeviceStore } from '@/state/deviceStore';

export function LedIndicator({ deviceId, pin }: { deviceId: string; pin: number }){
  const [, setTick] = useState(0);
  useEffect(() => {
    return DeviceStore.subscribe(() => setTick(x => x + 1));
  }, []);
  const v = DeviceStore.get(deviceId)?.gpio?.[pin] ?? 0;
  return <div className={`w-3 h-3 rounded-full ${v ? 'bg-lime-400' : 'bg-neutral-700'}`} />;
}
