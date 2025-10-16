import React, { useEffect, useState } from 'react';
import { DeviceStore } from '@/state/deviceStore';

interface SensorDisplayProps {
  deviceId: string;
  sensorKey: string;
  label?: string;
  unit?: string;
  precision?: number;
}

export function SensorDisplay({ 
  deviceId, 
  sensorKey, 
  label, 
  unit = '', 
  precision = 1 
}: SensorDisplayProps){
  const [, setTick] = useState(0);
  useEffect(() => {
    return DeviceStore.subscribe(() => setTick(x => x + 1));
  }, []);
  
  const value = DeviceStore.get(deviceId)?.sensors?.[sensorKey] ?? null;
  
  const displayValue = value === null 
    ? '—' 
    : typeof value === 'number' 
      ? `${value.toFixed(precision)}${unit}`
      : `${value}${unit}`;
  
  return (
    <div className="text-sm">
      {label && <span className="text-neutral-400 mr-2">{label}:</span>}
      <span className="font-mono">{displayValue}</span>
    </div>
  );
}
