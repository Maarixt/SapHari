import { useState, useEffect } from 'react';
import { Header } from './Header';
import { DeviceList } from '../devices/DeviceList';
import { DeviceView } from '../devices/DeviceView';
import { BrokerSettingsDialog } from './BrokerSettingsDialog';
import { AlertRuleDialog } from './AlertRuleDialog';
import { SnippetStream } from './SnippetStream';
import { MasterDashboard } from './MasterDashboard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMasterAccount } from '@/hooks/useMasterAccount';
import { Alerts } from '@/state/alertsEngine';
import { seedAlertRules } from '@/dev/seedRules';
import { connectMqtt } from '@/services/mqtt';
import { DeviceControlDemo } from '@/components/demo/DeviceControlDemo';
import { Toaster } from 'sonner';
import { DeviceWithRole } from '@/lib/types';

export const Dashboard = () => {
  const { user } = useAuth();
  const { isMaster } = useMasterAccount();
  // Initialize alert engine
  useEffect(() => {
    // Seed example rules in development
    if (import.meta.env.DEV) {
      seedAlertRules();
    }
    console.log('Alert engine initialized');
  }, []);
  const [selectedDevice, setSelectedDevice] = useState<DeviceWithRole | null>(null);
  const [showBrokerSettings, setShowBrokerSettings] = useState(false);
  const [showAlertRules, setShowAlertRules] = useState(false);
  const [showSnippetStream, setShowSnippetStream] = useState(false);
  const [showDeviceDemo, setShowDeviceDemo] = useState(false);

  useEffect(() => {
    // Initialize MQTT connection
    connectMqtt();
    
    // Request notification permission once during app boot
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
  }, [user]);

  // Show Master Dashboard if user is master account
  if (isMaster) {
    return <MasterDashboard />;
  }

  return (
    <div className="min-h-screen bg-background dark">
              <Header
                onSettingsClick={() => setShowBrokerSettings(true)}
                onAlertRulesClick={() => setShowAlertRules(true)}
                onSnippetStreamClick={() => setShowSnippetStream(true)}
                onDeviceDemoClick={() => setShowDeviceDemo(true)}
              />
      
      <main>
        {showDeviceDemo ? (
          <DeviceControlDemo onBack={() => setShowDeviceDemo(false)} />
        ) : selectedDevice ? (
          <DeviceView
            device={selectedDevice}
            onBack={() => setSelectedDevice(null)}
          />
        ) : (
          <DeviceList
            onDeviceSelect={setSelectedDevice}
            key={selectedDevice ? 'device-selected' : 'device-list'} // Force re-render when returning from device
          />
        )}
      </main>
      
      <BrokerSettingsDialog
        open={showBrokerSettings}
        onOpenChange={setShowBrokerSettings}
      />
      

      <AlertRuleDialog
        open={showAlertRules}
        onOpenChange={setShowAlertRules}
        defaultDeviceId={selectedDevice?.id}
      />

              <SnippetStream
                className={showSnippetStream ? "fixed top-20 right-4 w-96 z-50" : "hidden"}
                onClose={() => setShowSnippetStream(false)}
              />

      <Toaster 
        position="top-right" 
        expand={true}
        richColors={true}
        closeButton={true}
      />
    </div>
  );
};