// Test Master Dashboard functionality

import { supabase } from '@/integrations/supabase/client';
import { fetchMasterMetrics, checkMasterRole } from '@/lib/api';

export async function testMasterDashboard() {
  console.log('🧪 Testing Master Dashboard...');

  try {
    // Test 1: Check master role
    console.log('1️⃣ Testing master role check...');
    const isMaster = await checkMasterRole(supabase);
    console.log('✅ Master role check result:', isMaster);

    // Test 2: Fetch master metrics
    console.log('2️⃣ Testing master metrics fetch...');
    try {
      const metrics = await fetchMasterMetrics(supabase);
      console.log('✅ Master metrics:', metrics);
    } catch (error) {
      console.log('⚠️ Master metrics fetch failed (expected if not master):', error);
    }

    // Test 3: Test Edge Function directly
    console.log('3️⃣ Testing Edge Function directly...');
    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      
      if (accessToken) {
        const response = await fetch('/functions/v1/master-metrics', {
          headers: { 
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Edge Function response:', data);
        } else {
          const errorText = await response.text();
          console.log('⚠️ Edge Function error:', response.status, errorText);
        }
      } else {
        console.log('⚠️ No access token available');
      }
    } catch (error) {
      console.log('⚠️ Edge Function test failed:', error);
    }

    // Test 4: Test RPC functions
    console.log('4️⃣ Testing RPC functions...');
    try {
      const { data: kpis, error: kpisError } = await supabase.rpc('get_master_kpis');
      if (kpisError) {
        console.log('⚠️ get_master_kpis error:', kpisError);
      } else {
        console.log('✅ get_master_kpis result:', kpis);
      }

      const { data: alerts, error: alertsError } = await supabase
        .from('v_alerts_24h_summary')
        .select('*');
      if (alertsError) {
        console.log('⚠️ v_alerts_24h_summary error:', alertsError);
      } else {
        console.log('✅ v_alerts_24h_summary result:', alerts);
      }

      const { data: mqtt, error: mqttError } = await supabase
        .from('v_mqtt_last_hour')
        .select('*');
      if (mqttError) {
        console.log('⚠️ v_mqtt_last_hour error:', mqttError);
      } else {
        console.log('✅ v_mqtt_last_hour result:', mqtt);
      }
    } catch (error) {
      console.log('⚠️ RPC functions test failed:', error);
    }

    console.log('🎉 Master Dashboard test completed!');
    
  } catch (error) {
    console.error('❌ Master Dashboard test failed:', error);
  }
}

// Expose to window for easy testing
declare global {
  interface Window {
    testMasterDashboard: () => void;
  }
}

if (import.meta.env.DEV) {
  window.testMasterDashboard = testMasterDashboard;
}
