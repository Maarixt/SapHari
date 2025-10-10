// MQTT Connection Test
import { connectMqtt, getConnectionStatus, reconnectMqtt } from '@/services/mqtt';

export function testMqttConnection() {
  console.log('🧪 Testing MQTT Connection...');
  
  // Test initial connection
  console.log('1️⃣ Initial connection status:', getConnectionStatus());
  
  // Connect to MQTT
  console.log('2️⃣ Connecting to MQTT...');
  connectMqtt();
  
  // Check status after connection attempt
  setTimeout(() => {
    console.log('3️⃣ Status after connection:', getConnectionStatus());
  }, 2000);
  
  // Test reconnection
  setTimeout(() => {
    console.log('4️⃣ Testing reconnection...');
    reconnectMqtt();
  }, 5000);
  
  // Final status check
  setTimeout(() => {
    console.log('5️⃣ Final status:', getConnectionStatus());
  }, 8000);
}

// Expose to window for easy console access
declare global {
  interface Window {
    testMqttConnection: () => void;
  }
}

if (import.meta.env.DEV) {
  window.testMqttConnection = testMqttConnection;
  console.log('🧪 MQTT test function available: testMqttConnection()');
}
