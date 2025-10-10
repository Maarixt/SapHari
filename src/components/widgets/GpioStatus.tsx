import React, { useEffect, useState } from 'react';
import { DeviceStore } from '@/state/deviceStore';

interface GpioStatusProps {
  deviceId: string;
  pin: number;
  label?: string;
}

export function GpioStatus({ deviceId, pin, label }: GpioStatusProps){
  const [, setTick] = useState(0);
  useEffect(()=>DeviceStore.subscribe(()=>setTick(x=>x+1)),[]);
  
  const value = DeviceStore.get(deviceId)?.gpio?.[pin] ?? null;
  
  return (
    <div className="flex items-center gap-2 text-sm">
      {label && <span className="text-neutral-400">{label}:</span>}
      <div className={`w-2 h-2 rounded-full ${value ? 'bg-emerald-400' : 'bg-neutral-600'}`} />
      <span className="font-mono text-xs">
        GPIO {pin}: {value === null ? '—' : value ? 'HIGH' : 'LOW'}
      </span>
    </div>
  );
}
