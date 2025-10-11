import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import { TileButton } from '@/components/ui/TileButton';
import { DeviceList } from '../devices/DeviceList';
import { DeviceView } from '../devices/DeviceView';
import { BrokerSettingsDialog } from './BrokerSettingsDialog';
import { AlertRuleDialog } from './AlertRuleDialog';
import { SnippetStream } from './SnippetStream';
import { MasterDashboard } from './MasterDashboard';
import AlertBell from '@/components/alerts/AlertBell';
import { useAuth } from '@/hooks/useAuth';
import { useMasterAccount } from '@/hooks/useMasterAccount';
import { seedAlertRules } from '@/dev/seedRules';
import { connectMqtt } from '@/services/mqtt';
import { DeviceControlDemo } from '@/components/demo/DeviceControlDemo';
import { Toaster } from 'sonner';
import { DeviceWithRole } from '@/lib/types';
import { Settings } from 'lucide-react';

export const Dashboard = () => {
  const { user } = useAuth();
  const { isMaster } = useMasterAccount();
  const navigate = useNavigate();
  
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
    <AppShell 
      title="SapHari" 
      actions={
        <>
          <AlertBell unread={0} />
          <button 
            onClick={() => setShowBrokerSettings(true)}
            className="rounded-xl border border-ink-200 bg-white px-3 py-2 hover:bg-[var(--surface)]"
          >
            <Settings className="h-4 w-4" />
          </button>
        </>
      }
    >
      {showDeviceDemo ? (
        <DeviceControlDemo onBack={() => setShowDeviceDemo(false)} />
      ) : selectedDevice ? (
        <DeviceView
          device={selectedDevice}
          onBack={() => setSelectedDevice(null)}
        />
      ) : (
        <>
          <PageHeader 
            title="Dashboard" 
            subtitle="Control devices and monitor sensors in real-time." 
          />
          
          <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <TileButton 
              label="Add Device" 
              icon="➕" 
              onClick={() => {/* TODO: Add device dialog */}} 
            />
            <TileButton 
              label="Circuit Simulator" 
              icon="🧪" 
              onClick={() => navigate('/simulator')} 
            />
            <TileButton 
              label="Alerts" 
              icon="🔔" 
              onClick={() => setShowAlertRules(true)} 
            />
          </section>

          <DeviceList
            onDeviceSelect={setSelectedDevice}
            key={selectedDevice ? 'device-selected' : 'device-list'}
          />
        </>
      )}
      
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
    </AppShell>
  );
};