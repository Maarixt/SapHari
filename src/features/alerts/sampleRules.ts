import { AlertRule } from './types';
import { AlertsStore } from './alertsStore';

// Sample alert rules for demonstration
export const sampleRules: AlertRule[] = [
  {
    id: 'sample_gpio_overheat',
    name: 'Overheat (pin4)',
    deviceId: 'pump-1',
    source: 'GPIO',
    pin: 4,
    whenPinEquals: 1,
    isActive: true,
    debounceMs: 3000,
    hysteresis: 0,
    once: false
  },
  {
    id: 'sample_sensor_temp',
    name: 'Temperature > 50°C',
    deviceId: 'pump-1',
    source: 'SENSOR',
    key: 'tempC',
    op: '>',
    value: 50,
    isActive: true,
    debounceMs: 10000,
    hysteresis: 1,
    once: false
  },
  {
    id: 'sample_water_level_rule',
    name: 'Water Level Low',
    deviceId: 'pump-1',
    source: 'SENSOR',
    key: 'waterLevelPct',
    op: '<',
    value: 20,
    isActive: true,
    debounceMs: 0,
    hysteresis: 0,
    once: true
  }
];

// Function to load sample rules
export function loadSampleRules() {
  const existingRules = AlertsStore.listRules();
  
  // Only add sample rules if no rules exist
  if (existingRules.length === 0) {
    sampleRules.forEach(rule => {
      AlertsStore.addRule(rule);
    });
  }
}

// Function to clear all rules (for testing)
export function clearAllRules() {
  const rules = AlertsStore.listRules();
  rules.forEach(rule => {
    AlertsStore.deleteRule(rule.id);
  });
}
