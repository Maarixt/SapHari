import { DeviceStore } from '@/state/deviceStore';
import { Alerts } from '@/state/alertsEngine';

export function simulate(){
  console.log('🎭 Starting alert simulation...');
  
  // Set device online
  DeviceStore.setOnline('pump-1', true);
  console.log('📱 Device pump-1 set online');
  
  // Initial state - normal temperature, pin 4 low
  DeviceStore.upsertState('pump-1', { 
    gpio: { 4: 0 }, 
    sensors: { tempC: 48.0 }, 
    online: true 
  });
  console.log('🌡️ Initial state: Pin 4 = LOW, Temp = 48°C');
  Alerts.evaluate('pump-1');

  // Trigger Pin 4 HIGH after 1 second
  setTimeout(() => {
    console.log('🔌 Triggering Pin 4 HIGH...');
    DeviceStore.upsertState('pump-1', { gpio: { 4: 1 } }); // should trigger Pin4 HIGH
    Alerts.evaluate('pump-1');
  }, 1000);

  // Trigger high temperature after 2 seconds
  setTimeout(() => {
    console.log('🌡️ Triggering high temperature...');
    DeviceStore.upsertState('pump-1', { sensors: { tempC: 52.3 } }); // trigger temp>50
    Alerts.evaluate('pump-1');
  }, 2000);

  // Trigger critical temperature after 3 seconds
  setTimeout(() => {
    console.log('🔥 Triggering critical temperature...');
    DeviceStore.upsertState('pump-1', { sensors: { tempC: 65.0 } }); // trigger critical temp
    Alerts.evaluate('pump-1');
  }, 3000);

  // Device goes offline after 4 seconds
  setTimeout(() => {
    console.log('📴 Device going offline...');
    DeviceStore.setOnline('pump-1', false);
  }, 4000);

  console.log('✅ Simulation sequence started - watch for alerts!');
}

// Expose to window for easy testing
declare global {
  interface Window {
    simulate: () => void;
  }
}

if (import.meta.env.DEV) {
  window.simulate = simulate;
  console.log('🎭 Simulation function available: window.simulate()');
}
