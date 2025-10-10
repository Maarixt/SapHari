// Test script for Master Aggregations system

import { supabase } from '@/integrations/supabase/client';
import { AuditService } from '@/services/auditService';
import { DeviceStatusService } from '@/services/deviceStatusService';
import { AlertsStore } from '@/state/alertsStore';
import { DeviceStore } from '@/state/deviceStore';
import { Alerts } from '@/state/alertsEngine';

export async function testAggregations() {
  console.log('🧪 Testing Master Aggregations System...');

  try {
    // Test 1: Create test users and devices
    console.log('1️⃣ Creating test data...');
    await createTestData();

    // Test 2: Test device status publishing
    console.log('2️⃣ Testing device status publishing...');
    await testDeviceStatus();

    // Test 3: Test device events
    console.log('3️⃣ Testing device events...');
    await testDeviceEvents();

    // Test 4: Test alert generation
    console.log('4️⃣ Testing alert generation...');
    await testAlertGeneration();

    // Test 5: Test audit logging
    console.log('5️⃣ Testing audit logging...');
    await testAuditLogging();

    // Test 6: Test master KPIs
    console.log('6️⃣ Testing master KPIs...');
    await testMasterKPIs();

    // Test 7: Test real-time subscriptions
    console.log('7️⃣ Testing real-time subscriptions...');
    await testRealtimeSubscriptions();

    console.log('🎉 All aggregation tests completed!');
    
  } catch (error) {
    console.error('❌ Aggregation test failed:', error);
  }
}

async function createTestData() {
  // Create test users
  const testUsers = [
    { email: 'testuser1@example.com', role: 'user' },
    { email: 'testuser2@example.com', role: 'user' },
    { email: 'testadmin@example.com', role: 'admin' }
  ];

  for (const user of testUsers) {
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: 'testpassword123',
        email_confirm: true
      });

      if (error) {
        console.log(`User ${user.email} might already exist:`, error.message);
      } else {
        console.log(`✅ Created user: ${user.email}`);
        
        // Add role
        await supabase.from('user_roles').insert({
          user_id: data.user.id,
          role: user.role
        });
      }
    } catch (error) {
      console.log(`Error creating user ${user.email}:`, error);
    }
  }

  // Create test devices
  const testDevices = [
    { id: 'test-device-1', name: 'Test Device 1', type: 'ESP32' },
    { id: 'test-device-2', name: 'Test Device 2', type: 'ESP32' },
    { id: 'test-device-3', name: 'Test Device 3', type: 'Arduino' }
  ];

  for (const device of testDevices) {
    try {
      const { error } = await supabase.from('devices').insert({
        id: device.id,
        name: device.name,
        type: device.type,
        owner_id: 'test-user-id', // This would be a real user ID in practice
        created_at: new Date().toISOString()
      });

      if (error) {
        console.log(`Device ${device.id} might already exist:`, error.message);
      } else {
        console.log(`✅ Created device: ${device.id}`);
      }
    } catch (error) {
      console.log(`Error creating device ${device.id}:`, error);
    }
  }
}

async function testDeviceStatus() {
  const deviceId = 'test-device-1';
  
  // Test online status
  await DeviceStatusService.publishOnline(deviceId, '192.168.1.100', -45);
  console.log(`✅ Published online status for ${deviceId}`);

  // Test offline status
  await DeviceStatusService.publishOffline(deviceId);
  console.log(`✅ Published offline status for ${deviceId}`);

  // Test with battery info
  await DeviceStatusService.publishStatus(deviceId, {
    online: true,
    ip: '192.168.1.101',
    rssi: -50,
    battery_pct: 85
  });
  console.log(`✅ Published detailed status for ${deviceId}`);
}

async function testDeviceEvents() {
  const deviceId = 'test-device-2';

  // Test sensor fault
  await DeviceStatusService.publishSensorFault(deviceId, 'temperature', 'Sensor reading out of range');
  console.log(`✅ Published sensor fault for ${deviceId}`);

  // Test overheat warning
  await DeviceStatusService.publishOverheat(deviceId, 85.5);
  console.log(`✅ Published overheat warning for ${deviceId}`);

  // Test retry event
  await DeviceStatusService.publishRetry(deviceId, 'mqtt_connect', 2, 3);
  console.log(`✅ Published retry event for ${deviceId}`);

  // Test connection event
  await DeviceStatusService.publishConnection(deviceId, true);
  console.log(`✅ Published connection event for ${deviceId}`);

  // Test battery low warning
  await DeviceStatusService.publishBatteryLow(deviceId, 15);
  console.log(`✅ Published battery low warning for ${deviceId}`);

  // Test firmware update
  await DeviceStatusService.publishFirmwareUpdate(deviceId, '1.0.0', '1.1.0', true);
  console.log(`✅ Published firmware update for ${deviceId}`);

  // Test config change
  await DeviceStatusService.publishConfigChange(deviceId, 'wifi_ssid', 'OldSSID', 'NewSSID');
  console.log(`✅ Published config change for ${deviceId}`);
}

async function testAlertGeneration() {
  const deviceId = 'test-device-3';

  // Set up device state
  DeviceStore.upsertState(deviceId, {
    online: true,
    gpio: { 2: 1, 4: 0 },
    sensors: { tempC: 75, humidity: 60 }
  });

  // Create test alert rules
  const testRules = [
    {
      id: 'test-temp-rule',
      name: 'High Temperature Alert',
      deviceId: deviceId,
      source: 'SENSOR' as const,
      key: 'tempC',
      op: '>' as const,
      value: 70,
      severity: 'critical' as const,
      channels: ['app', 'toast', 'browser'] as const,
      isActive: true
    },
    {
      id: 'test-gpio-rule',
      name: 'GPIO 2 High Alert',
      deviceId: deviceId,
      source: 'GPIO' as const,
      pin: 2,
      whenPinEquals: 1,
      severity: 'warning' as const,
      channels: ['app', 'toast'] as const,
      isActive: true
    }
  ];

  // Add rules to store
  for (const rule of testRules) {
    AlertsStore.updateRule(rule);
  }

  console.log('✅ Added test alert rules');

  // Trigger alerts
  await Alerts.evaluate(deviceId);
  console.log('✅ Triggered alert evaluation');

  // Check alert history
  const history = AlertsStore.listHistory();
  console.log(`✅ Generated ${history.length} alerts`);
}

async function testAuditLogging() {
  // Test device reassignment
  await AuditService.logDeviceReassign('test-device-1', 'user1', 'user2');
  console.log('✅ Logged device reassignment');

  // Test role change
  await AuditService.logRoleChange('test-user-id', 'user', 'admin');
  console.log('✅ Logged role change');

  // Test maintenance mode
  await AuditService.logMaintenanceMode(true);
  console.log('✅ Logged maintenance mode toggle');

  // Test system action
  await AuditService.logSystemAction('deploy_update', { version: '1.2.0' });
  console.log('✅ Logged system action');

  // Test device action
  await AuditService.logDeviceAction('test-device-1', 'firmware_update', { version: '1.1.0' });
  console.log('✅ Logged device action');

  // Test user action
  await AuditService.logUserAction('test-user-id', 'password_change');
  console.log('✅ Logged user action');
}

async function testMasterKPIs() {
  try {
    // Test RPC function
    const { data: kpis, error } = await supabase.rpc('get_master_kpis');
    
    if (error) {
      console.log('⚠️ get_master_kpis error:', error);
    } else {
      console.log('✅ Master KPIs:', kpis);
    }

    // Test views
    const { data: alerts, error: alertsError } = await supabase
      .from('v_alerts_24h_summary')
      .select('*');
    
    if (alertsError) {
      console.log('⚠️ v_alerts_24h_summary error:', alertsError);
    } else {
      console.log('✅ Alerts 24h summary:', alerts);
    }

    const { data: mqtt, error: mqttError } = await supabase
      .from('v_mqtt_last_hour')
      .select('*');
    
    if (mqttError) {
      console.log('⚠️ v_mqtt_last_hour error:', mqttError);
    } else {
      console.log('✅ MQTT last hour:', mqtt);
    }

  } catch (error) {
    console.log('⚠️ Master KPIs test failed:', error);
  }
}

async function testRealtimeSubscriptions() {
  console.log('✅ Setting up real-time subscriptions...');
  
  // Subscribe to alerts
  const alertsChannel = supabase.channel('test_alerts')
    .on('postgres_changes', { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'alerts' 
    }, (payload) => {
      console.log('📨 New alert via realtime:', payload.new);
    })
    .subscribe();

  // Subscribe to device events
  const eventsChannel = supabase.channel('test_events')
    .on('postgres_changes', { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'device_events' 
    }, (payload) => {
      console.log('📨 New device event via realtime:', payload.new);
    })
    .subscribe();

  // Subscribe to audit logs
  const auditChannel = supabase.channel('test_audit')
    .on('postgres_changes', { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'audit_logs' 
    }, (payload) => {
      console.log('📨 New audit log via realtime:', payload.new);
    })
    .subscribe();

  console.log('✅ Real-time subscriptions active');

  // Clean up after 10 seconds
  setTimeout(() => {
    supabase.removeChannel(alertsChannel);
    supabase.removeChannel(eventsChannel);
    supabase.removeChannel(auditChannel);
    console.log('✅ Cleaned up real-time subscriptions');
  }, 10000);
}

// Expose to window for easy testing
declare global {
  interface Window {
    testAggregations: () => void;
  }
}

if (import.meta.env.DEV) {
  window.testAggregations = testAggregations;
}
