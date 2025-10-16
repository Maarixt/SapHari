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

  // Auto-assign units when not explicitly provided
  const autoUnit = (() => {
    if (unit) return unit; // explicit override
    const key = sensorKey.toLowerCase();
    if (key.includes('ds18b20') || key.includes('temp')) return '°C';
    if (key.includes('humidity') || key.includes('hum')) return '%';
    if (key.includes('pressure')) return ' hPa';
    if (key.includes('distance') || key.includes('ultrasonic')) return ' cm';
    if (key.includes('voltage') || key.endsWith('v')) return ' V';
    if (key.includes('current') || key.endsWith('a')) return ' A';
    if (key.includes('power') || key.endsWith('w')) return ' W';
    if (key.includes('speed') || key.includes('rpm')) return ' RPM';
    if (key.includes('light') || key.includes('lux')) return ' lx';
    return '';
  })();

  const displayValue = value === null
    ? '—'
    : typeof value === 'number'
      ? `${value.toFixed(precision)}${autoUnit}`
      : `${value}${autoUnit}`;
  
  return (
    <div className="text-sm">
      {label && <span className="text-neutral-400 mr-2">{label}:</span>}
      <span className="font-mono">{displayValue}</span>
    </div>
  );
}
