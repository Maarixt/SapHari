import React, { useEffect, useState } from 'react';
import { DeviceStore } from '@/state/deviceStore';

export function TempMini({ deviceId }: { deviceId: string }){
  const [, setTick] = useState(0);
  useEffect(()=>DeviceStore.subscribe(()=>setTick(x=>x+1)),[]);
  const t = DeviceStore.get(deviceId)?.sensors?.tempC ?? null;
  return <span>{t===null? '—' : `${t.toFixed(1)} °C`}</span>;
}
