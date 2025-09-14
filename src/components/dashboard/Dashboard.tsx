import { useState, useEffect } from 'react';
import { Header } from './Header';
import { DeviceList } from '../devices/DeviceList';
import { DeviceView } from '../devices/DeviceView';
import { BrokerSettingsDialog } from './BrokerSettingsDialog';
import { NotificationsDialog } from './NotificationsDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Device {
  id: string;
  device_id: string;
  device_key: string;
  name: string;
  online: boolean;
  created_at: string;
}

export const Dashboard = () => {
  const { user } = useAuth();
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [showBrokerSettings, setShowBrokerSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  // Load unread alerts count
  const loadUnreadAlerts = async () => {
    if (!user) return;

    try {
      const { count, error } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
      setUnreadAlerts(count || 0);
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  useEffect(() => {
    loadUnreadAlerts();
    
    // Set up real-time subscription for alerts
    const subscription = supabase
      .channel('alerts')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'alerts',
        filter: `user_id=eq.${user?.id}`
      }, () => {
        loadUnreadAlerts();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  return (
    <div className="min-h-screen bg-background dark">
      <Header
        onSettingsClick={() => setShowBrokerSettings(true)}
        onNotificationsClick={() => setShowNotifications(true)}
        unreadAlerts={unreadAlerts}
      />
      
      <main>
        {selectedDevice ? (
          <DeviceView
            device={selectedDevice}
            onBack={() => setSelectedDevice(null)}
          />
        ) : (
          <DeviceList onDeviceSelect={setSelectedDevice} />
        )}
      </main>
      
      <BrokerSettingsDialog
        open={showBrokerSettings}
        onOpenChange={setShowBrokerSettings}
      />
      
      <NotificationsDialog
        open={showNotifications}
        onOpenChange={setShowNotifications}
        onAlertsRead={loadUnreadAlerts}
      />
    </div>
  );
};