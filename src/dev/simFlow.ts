import { DeviceStore } from '@/state/deviceStore';
import { CommandTracker } from '@/state/commandTracker';

// Test script: simulate real flow without hardware
// This simulates the complete device-authoritative flow

export function simulateDeviceFlow() {
  console.log('🚀 Starting device flow simulation...');
  
  // 1) Device comes online
  console.log('1️⃣ Device coming online...');
  DeviceStore.setOnline('pump-1', true);
  
  // 2) Device publishes initial state
  console.log('2️⃣ Device publishing initial state...');
  DeviceStore.upsertState('pump-1', { 
    gpio: {4: 0, 2: 0, 5: 0}, 
    sensors: { tempC: 48.7, humidity: 65, pressure: 1013 }, 
    online: true 
  });
  
  // 3) User tries to toggle GPIO 4 → will throw if offline
  console.log('3️⃣ User attempting to toggle GPIO 4...');
  const stubPublish = (_t: string, _p: string) => {};
  CommandTracker.toggleGpio(stubPublish, 'pump-1', 4, 1).catch((error) => {
    console.warn('Command failed (expected during simulation):', error.message);
  });
  
  // 4) Simulate device ACK & state publish (what firmware actually does)
  console.log('4️⃣ Simulating device ACK and state update...');
  setTimeout(() => {
    // Simulate device published state update: gpio.4 -> 1
    DeviceStore.upsertState('pump-1', { 
      gpio: {4: 1}, 
      online: true 
    });
    console.log('✅ GPIO 4 set to HIGH by device');
  }, 1000);
  
  // 5) Simulate temp rise crossing 50°C threshold
  console.log('5️⃣ Simulating temperature rise...');
  setTimeout(() => {
    DeviceStore.upsertState('pump-1', { 
      sensors: { tempC: 52.1 }, 
      online: true 
    });
    console.log('🌡️ Temperature rose to 52.1°C (should trigger alert if rule exists)');
  }, 2000);
  
  // 6) Simulate sensor logic flipping a pin
  console.log('6️⃣ Simulating sensor logic flipping GPIO 2...');
  setTimeout(() => {
    DeviceStore.upsertState('pump-1', { 
      gpio: {2: 1}, 
      online: true 
    });
    console.log('🔧 Sensor logic flipped GPIO 2 to HIGH');
  }, 3000);
  
  // 7) Simulate device going offline
  console.log('7️⃣ Simulating device going offline...');
  setTimeout(() => {
    DeviceStore.setOnline('pump-1', false);
    console.log('📴 Device went offline');
  }, 4000);
  
  // 8) Try to control offline device (should fail)
  console.log('8️⃣ Attempting to control offline device...');
  setTimeout(() => {
    const stubPublish = (_t: string, _p: string) => {};
    CommandTracker.toggleGpio(stubPublish, 'pump-1', 4, 0).catch((error) => {
      console.warn('❌ Command blocked (device offline):', error.message);
    });
  }, 5000);
  
  // 9) Device comes back online
  console.log('9️⃣ Device coming back online...');
  setTimeout(() => {
    DeviceStore.setOnline('pump-1', true);
    DeviceStore.upsertState('pump-1', { 
      gpio: {4: 1, 2: 1, 5: 0}, 
      sensors: { tempC: 52.1, humidity: 65, pressure: 1013 }, 
      online: true 
    });
    console.log('🔄 Device back online with current state');
  }, 6000);
  
  console.log('✅ Simulation complete! Check the UI to see reactive updates.');
}

// Helper function to simulate specific scenarios
export function simulateGpioToggle(deviceId: string, pin: number, value: 0 | 1) {
  console.log(`🔄 Simulating GPIO ${pin} toggle to ${value ? 'HIGH' : 'LOW'}`);
  DeviceStore.upsertState(deviceId, { 
    gpio: {[pin]: value}, 
    online: true 
  });
}

export function simulateSensorChange(deviceId: string, sensorKey: string, value: any) {
  console.log(`📊 Simulating sensor ${sensorKey} change to ${value}`);
  DeviceStore.upsertState(deviceId, { 
    sensors: {[sensorKey]: value}, 
    online: true 
  });
}

export function simulateDeviceOnline(deviceId: string, online: boolean) {
  console.log(`📡 Simulating device ${deviceId} ${online ? 'online' : 'offline'}`);
  DeviceStore.setOnline(deviceId, online);
}

// Expose to window for easy console access during development
declare global {
  interface Window {
    simulateDeviceFlow: () => void;
    simulateGpioToggle: (deviceId: string, pin: number, value: 0 | 1) => void;
    simulateSensorChange: (deviceId: string, sensorKey: string, value: any) => void;
    simulateDeviceOnline: (deviceId: string, online: boolean) => void;
  }
}

if (import.meta.env.DEV) {
  window.simulateDeviceFlow = simulateDeviceFlow;
  window.simulateGpioToggle = simulateGpioToggle;
  window.simulateSensorChange = simulateSensorChange;
  window.simulateDeviceOnline = simulateDeviceOnline;
  
  console.log('🧪 Device simulation functions available:');
  console.log('- simulateDeviceFlow() - Run complete flow simulation');
  console.log('- simulateGpioToggle("pump-1", 4, 1) - Toggle GPIO pin');
  console.log('- simulateSensorChange("pump-1", "tempC", 55) - Change sensor value');
  console.log('- simulateDeviceOnline("pump-1", false) - Set device online/offline');
}
