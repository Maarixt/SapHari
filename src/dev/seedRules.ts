import { AlertsStore } from '@/state/alertsStore';
import { AlertRule } from '@/state/alertsTypes';

const seed: AlertRule[] = [
  {
    id: crypto.randomUUID(), 
    name:'Pin4 HIGH', 
    deviceId:'pump-1',
    source:'GPIO', 
    pin:4, 
    whenPinEquals:1,
    severity:'critical', 
    channels:['app','toast','browser','push','email']
  },
  {
    id: crypto.randomUUID(), 
    name:'Temp > 50°C', 
    deviceId:'pump-1',
    source:'SENSOR', 
    key:'tempC', 
    op:'>', 
    value:50, 
    hysteresis:1, 
    debounceMs:10000,
    severity:'warning', 
    channels:['app','toast','browser','push']
  }
];

export function seedAlertRules() {
  console.log('🌱 Seeding alert rules...');
  
  // Only seed if no rules exist
  const existingRules = AlertsStore.listRules();
  if (existingRules.length === 0) {
    seed.forEach(rule => {
      AlertsStore.updateRule(rule);
    });
    console.log(`✅ Seeded ${seed.length} alert rules`);
  } else {
    console.log(`⚠️ ${existingRules.length} rules already exist, skipping seed`);
  }
}

// Expose to window for easy testing
declare global {
  interface Window {
    seedAlertRules: () => void;
  }
}

if (import.meta.env.DEV) {
  window.seedAlertRules = seedAlertRules;
  console.log('🌱 Seed rules function available: window.seedAlertRules()');
}
