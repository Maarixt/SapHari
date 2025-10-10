// Test script for Master Aggregations System
// Simulates data collection and aggregation

import { aggregationService } from '@/services/aggregationService';
import { DeviceStore } from '@/state/deviceStore';
import { AlertsStore } from '@/state/alertsStore';

export function testMasterAggregations() {
  console.log('🧪 Testing Master Aggregations System...');

  // Simulate device states
  const testDevices = [
    { id: 'device-001', userId: 'user-001', name: 'ESP32-001' },
    { id: 'device-002', userId: 'user-002', name: 'ESP32-002' },
    { id: 'device-003', userId: 'user-001', name: 'ESP32-003' }
  ];

  // Simulate device state updates
  testDevices.forEach((device, index) => {
    const state = {
      online: Math.random() > 0.2, // 80% online
      gpio: { 2: Math.random() > 0.5 ? 1 : 0, 4: Math.random() > 0.5 ? 1 : 0 },
      sensors: { 
        tempC: 20 + Math.random() * 30, 
        humidity: 40 + Math.random() * 40,
        pressure: 1000 + Math.random() * 50
      },
      lastSeen: Date.now() - Math.random() * 3600000 // Random time within last hour
    };

    DeviceStore.upsertState(device.id, state);
    aggregationService.recordDeviceState(device.id, device.userId, state);
    
    console.log(`✅ Recorded state for ${device.name}:`, {
      online: state.online,
      tempC: state.sensors.tempC.toFixed(1),
      gpio2: state.gpio[2]
    });
  });

  // Simulate device events
  const eventTypes = ['status_change', 'alert_triggered', 'command_sent', 'error_occurred'];
  const severities = ['info', 'warning', 'error', 'critical'];
  
  for (let i = 0; i < 10; i++) {
    const device = testDevices[Math.floor(Math.random() * testDevices.length)];
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    
    aggregationService.recordDeviceEvent(
      device.id,
      device.userId,
      eventType,
      { 
        timestamp: Date.now(),
        value: Math.random() * 100,
        details: `Test event ${i + 1}`
      },
      severity,
      `${eventType} occurred on ${device.name}`
    );
    
    console.log(`📝 Recorded ${severity} ${eventType} for ${device.name}`);
  }

  // Simulate MQTT traffic
  const topics = ['devices/+/status', 'devices/+/state', 'devices/+/cmd', 'devices/+/ack'];
  
  for (let i = 0; i < 50; i++) {
    const device = testDevices[Math.floor(Math.random() * testDevices.length)];
    const topic = topics[Math.floor(Math.random() * topics.length)].replace('+', device.id);
    const messageSize = 50 + Math.random() * 500; // 50-550 bytes
    const direction = Math.random() > 0.5 ? 'inbound' : 'outbound';
    
    aggregationService.recordMQTTTraffic(device.id, topic, messageSize, direction);
  }
  
  console.log('📡 Recorded 50 MQTT traffic events');

  // Simulate system errors
  const errorTypes = ['connection_timeout', 'mqtt_error', 'device_unresponsive', 'sensor_failure'];
  
  for (let i = 0; i < 5; i++) {
    const device = testDevices[Math.floor(Math.random() * testDevices.length)];
    const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
    
    aggregationService.recordSystemError(
      device.id,
      device.userId,
      errorType,
      `Test error: ${errorType} on ${device.name}`,
      'Stack trace would go here...',
      { 
        timestamp: Date.now(),
        retryCount: Math.floor(Math.random() * 3)
      },
      Math.random() > 0.7 ? 'critical' : 'error'
    );
    
    console.log(`❌ Recorded ${errorType} for ${device.name}`);
  }

  // Test alert rules
  const testRule = {
    id: 'test-temp-rule',
    name: 'High Temperature Alert',
    deviceId: 'device-001',
    source: 'SENSOR' as const,
    key: 'tempC',
    op: '>' as const,
    value: 40,
    severity: 'warning' as const,
    channels: ['toast', 'browser'] as const,
    isActive: true,
    debounceMs: 5000,
  };

  AlertsStore.updateRule(testRule);
  console.log('🔔 Added test alert rule for temperature > 40°C');

  // Simulate alert trigger
  DeviceStore.upsertState('device-001', {
    online: true,
    gpio: { 2: 1, 4: 0 },
    sensors: { tempC: 45, humidity: 60 }, // High temperature
    lastSeen: Date.now()
  });

  console.log('🌡️ Simulated high temperature (45°C) to trigger alert');

  // Test data retrieval
  setTimeout(async () => {
    console.log('\n📊 Testing data retrieval...');
    
    try {
      const kpis = await aggregationService.getFleetKPIs();
      console.log('📈 Fleet KPIs:', kpis);
      
      const deviceHealth = await aggregationService.getDeviceHealth();
      console.log('🏥 Device Health:', deviceHealth.length, 'devices');
      
      const recentEvents = await aggregationService.getRecentEvents();
      console.log('📋 Recent Events:', recentEvents.length, 'events');
      
      const mqttStats = await aggregationService.getMQTTTrafficStats();
      console.log('📡 MQTT Stats:', mqttStats);
      
    } catch (error) {
      console.error('❌ Error retrieving data:', error);
    }
  }, 1000);

  console.log('\n🎉 Master Aggregations test completed!');
  console.log('💡 Check the Master Control Panel > Overview tab to see the data');
}

// Expose to window for easy testing
declare global {
  interface Window {
    testMasterAggregations: () => void;
  }
}

if (import.meta.env.DEV) {
  window.testMasterAggregations = testMasterAggregations;
}
