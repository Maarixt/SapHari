import { Alerts } from '@/state/alertsEngine';
import { AlertsStore } from '@/state/alertsStore';
import { DeviceStore } from '@/state/deviceStore';

// Test the alert engine with sample data
export async function testAlertEngine() {
  console.log('🧪 Testing Alert Engine...');

  // Add a test rule
  const testRule = {
    id: 'test_temp_rule',
    name: 'High Temperature Alert',
    deviceId: 'test_device',
    source: 'SENSOR' as const,
    key: 'tempC',
    op: '>' as const,
    value: 50,
    severity: 'critical' as const,
    channels: ['toast', 'browser'],
    isActive: true,
    debounceMs: 5000,
  };

  AlertsStore.updateRule(testRule);
  console.log('✅ Test rule added');

  // Set up device state
  DeviceStore.upsertState('test_device', {
    online: true,
    gpio: { 2: 1, 4: 0 },
    sensors: { tempC: 25, humidity: 60 },
  });
  console.log('✅ Device state set');

  // Test normal temperature (should not trigger)
  console.log('🌡️ Testing normal temperature (25°C)...');
  await Alerts.evaluate('test_device');

  // Test high temperature (should trigger)
  console.log('🌡️ Testing high temperature (55°C)...');
  DeviceStore.upsertState('test_device', {
    sensors: { tempC: 55, humidity: 60 },
  });
  await Alerts.evaluate('test_device');

  // Test GPIO rule
  const gpioRule = {
    id: 'test_gpio_rule',
    name: 'GPIO 2 High Alert',
    deviceId: 'test_device',
    source: 'GPIO' as const,
    pin: 2,
    whenPinEquals: 1 as 0 | 1,
    severity: 'warning' as const,
    channels: ['toast'],
    isActive: true,
  };

  AlertsStore.updateRule(gpioRule);
  console.log('✅ GPIO rule added');

  // Test GPIO trigger
  console.log('🔌 Testing GPIO 2 HIGH...');
  DeviceStore.upsertState('test_device', {
    gpio: { 2: 1, 4: 0 },
  });
  await Alerts.evaluate('test_device');

  console.log('🎉 Alert engine test completed!');
  console.log('📊 Current rules:', AlertsStore.listRules().length);
  console.log('📱 Device state:', DeviceStore.get('test_device'));
  console.log('📋 Alert history:', AlertsStore.listHistory().length);
}

// Expose to window for easy testing
declare global {
  interface Window {
    testAlertEngine: () => Promise<void>;
  }
}

if (import.meta.env.DEV) {
  window.testAlertEngine = testAlertEngine;
  console.log('🧪 Alert engine test function available: window.testAlertEngine()');
}
