import { AlertEngine } from '@/features/alerts/alertEngine';

// Device snapshot for simulation
const snap = {
  gpio: { 4: 1 },
  sensors: { tempC: 51.3 }
};

/**
 * Simulate alert triggers for testing
 * This simulates a device update that should trigger both GPIO and sensor alerts
 */
export function simulate() {
  console.log('🚨 Simulating alert triggers...');
  console.log('Device snapshot:', snap);
  
  // Trigger the alert engine with the simulated device state
  AlertEngine.onDeviceUpdate('pump-1', snap);
  
  console.log('✅ Simulation complete! Check the alerts bell and snippet stream.');
}

/**
 * Simulate GPIO alert only (pin 4 HIGH)
 */
export function simulateGpioAlert() {
  const gpioSnap = {
    gpio: { 4: 1 },
    sensors: {},
    gauges: {}
  };
  
  console.log('🔌 Simulating GPIO alert (pin 4 HIGH)...');
  AlertEngine.onDeviceUpdate('pump-1', gpioSnap);
  console.log('✅ GPIO simulation complete!');
}

/**
 * Simulate sensor alert only (tempC > 50)
 */
export function simulateSensorAlert() {
  const sensorSnap = {
    gpio: {},
    sensors: { tempC: 51.3 },
    gauges: {}
  };
  
  console.log('🌡️ Simulating sensor alert (tempC > 50°C)...');
  AlertEngine.onDeviceUpdate('pump-1', sensorSnap);
  console.log('✅ Sensor simulation complete!');
}

/**
 * Simulate water level alert (waterLevelPct < 20)
 */
export function simulateWaterLevelAlert() {
  const waterSnap = {
    gpio: {},
    sensors: { waterLevelPct: 15 },
    gauges: {}
  };
  
  console.log('💧 Simulating water level alert (waterLevelPct < 20%)...');
  AlertEngine.onDeviceUpdate('pump-1', waterSnap);
  console.log('✅ Water level simulation complete!');
}

/**
 * Simulate multiple alerts in sequence
 */
export function simulateAll() {
  console.log('🎭 Running full simulation sequence...');
  
  setTimeout(() => simulateGpioAlert(), 1000);
  setTimeout(() => simulateSensorAlert(), 2000);
  setTimeout(() => simulateWaterLevelAlert(), 3000);
  
  console.log('✅ Full simulation sequence started!');
}

// Make functions available globally for console access
if (typeof window !== 'undefined') {
  (window as any).simulate = simulate;
  (window as any).simulateGpioAlert = simulateGpioAlert;
  (window as any).simulateSensorAlert = simulateSensorAlert;
  (window as any).simulateWaterLevelAlert = simulateWaterLevelAlert;
  (window as any).simulateAll = simulateAll;
  
  console.log('🎮 Alert simulation functions available:');
  console.log('  simulate() - Simulate both GPIO and sensor alerts');
  console.log('  simulateGpioAlert() - Simulate GPIO alert only');
  console.log('  simulateSensorAlert() - Simulate sensor alert only');
  console.log('  simulateWaterLevelAlert() - Simulate water level alert');
  console.log('  simulateAll() - Run all simulations in sequence');
}
