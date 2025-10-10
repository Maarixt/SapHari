import React, { useEffect, useState } from 'react';
import { DeviceStore } from '@/state/deviceStore';
import { CommandTracker } from '@/state/commandTracker';
import { useToast } from '@/hooks/use-toast';

export function GpioSwitch({ deviceId, pin }: { deviceId: string; pin: number }){
  const { toast } = useToast();
  const [, setTick] = useState(0);
  
  useEffect(()=>DeviceStore.subscribe(()=>setTick(x=>x+1)),[]);
  
  const snap = DeviceStore.get(deviceId);
  const online = !!snap?.online;
  const reported = (snap?.gpio?.[pin] ?? 0) as 0|1;

  const [optimistic, setOptimistic] = useState<null|0|1>(null);
  
  useEffect(()=>{ // if reported changes, drop optimistic
    setOptimistic(null);
  }, [reported]);

  const effective = optimistic ?? reported;

  async function onToggle(){
    if (!online) return;
    const desired = effective ? 0 : 1;
    setOptimistic(desired as 0|1); // quick visual feedback
    try{
      await CommandTracker.toggleGpio(deviceId, pin, desired as 0|1);
      // final UI update occurs when device publishes state → store → rerender → optimistic reset
    } catch(e){
      setOptimistic(null);
      toast({
        title: "Command Failed",
        description: e instanceof Error ? e.message : 'Failed to toggle GPIO',
        variant: "destructive"
      });
    }
  }

  return (
    <button
      disabled={!online}
      onClick={onToggle}
      className={`px-3 py-2 rounded-lg border transition-colors ${
        online 
          ? 'border-neutral-700 hover:border-neutral-600' 
          : 'border-neutral-900 opacity-50 cursor-not-allowed'
      } ${
        effective 
          ? 'bg-emerald-600 text-white' 
          : 'bg-neutral-800 text-neutral-300'
      }`}
      title={online ? `Toggle GPIO ${pin}` : 'Device offline'}
    >
      GPIO {pin}: {effective ? 'ON' : 'OFF'}
      {optimistic !== null && (
        <span className="ml-2 text-xs opacity-70">(pending...)</span>
      )}
    </button>
  );
}
