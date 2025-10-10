const fetch = require('node-fetch');

const SERVER_URL = 'http://localhost:8080';

async function testAlertSystem() {
  console.log('🧪 Testing SapHari Alert System...\n');

  try {
    // Test server health
    console.log('1️⃣ Testing server health...');
    const healthResponse = await fetch(`${SERVER_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Server health:', healthData.status);

    // Test web push public key
    console.log('\n2️⃣ Testing web push public key...');
    const keyResponse = await fetch(`${SERVER_URL}/api/alerts/web-push/public-key`);
    const keyData = await keyResponse.json();
    if (keyData.success) {
      console.log('✅ Web push public key available');
    } else {
      console.log('❌ Web push public key failed');
    }

    // Test alert rules endpoint
    console.log('\n3️⃣ Testing alert rules endpoint...');
    const rulesResponse = await fetch(`${SERVER_URL}/api/alerts/rules`);
    const rulesData = await rulesResponse.json();
    if (rulesData.success) {
      console.log('✅ Alert rules endpoint working');
      console.log(`📊 Found ${rulesData.rules.length} alert rules`);
    } else {
      console.log('❌ Alert rules endpoint failed');
    }

    // Test adding a sample rule
    console.log('\n4️⃣ Testing alert rule creation...');
    const sampleRule = {
      id: 'test_rule_' + Date.now(),
      name: 'Test Temperature Alert',
      deviceId: 'test_device',
      source: 'SENSOR',
      key: 'tempC',
      op: '>',
      value: 50,
      isActive: true,
      notifications: {
        inApp: true,
        browser: true,
        webPush: true,
        email: false,
        slack: false,
        discord: false,
        telegram: false,
        webhook: false,
      }
    };

    const addRuleResponse = await fetch(`${SERVER_URL}/api/alerts/rules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sampleRule),
    });

    const addRuleData = await addRuleResponse.json();
    if (addRuleData.success) {
      console.log('✅ Alert rule created successfully');
    } else {
      console.log('❌ Alert rule creation failed');
    }

    // Test notification endpoints
    console.log('\n5️⃣ Testing notification endpoints...');
    const notificationTypes = ['web-push', 'email', 'slack', 'discord', 'telegram'];
    
    for (const type of notificationTypes) {
      try {
        const testResponse = await fetch(`${SERVER_URL}/api/alerts/test`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type,
            message: `Test ${type} notification from SapHari`,
          }),
        });

        const testData = await testResponse.json();
        if (testData.success) {
          console.log(`✅ ${type} notification test passed`);
        } else {
          console.log(`⚠️ ${type} notification test failed: ${testData.error}`);
        }
      } catch (error) {
        console.log(`❌ ${type} notification test error: ${error.message}`);
      }
    }

    console.log('\n🎉 Alert system test completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Start the server: npm run dev');
    console.log('2. Open the frontend and go to Alert Rules > Notifications');
    console.log('3. Configure your notification preferences');
    console.log('4. Test notifications using the test buttons');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the server is running: npm run dev');
  }
}

// Run the test
testAlertSystem();
