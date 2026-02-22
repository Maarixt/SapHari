import { useState, useEffect } from 'react';
import { DeviceList } from '../devices/DeviceList';
import { DeviceView } from '../devices/DeviceView';
import { BrokerSettingsDialog } from './BrokerSettingsDialog';
import { AlertRuleDialog } from './AlertRuleDialog';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useMasterAccount } from '@/hooks/useMasterAccount';
import { seedAlertRules } from '@/dev/seedRules';
import { connectMqtt } from '@/services/mqtt';
import { Toaster } from 'sonner';
import { DeviceWithRole } from '@/lib/types';
import { OrgMembersPanel } from '@/components/organizations/OrgMembersPanel';
import { PendingInvites } from '@/components/organizations/PendingInvites';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cpu, Users, Bell, Zap, Settings } from 'lucide-react';
import { MQTTDebugPanel } from '@/components/debug/MQTTDebugPanel';

interface OrgDashboardProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

export function OrgDashboard({ currentView, setCurrentView }: OrgDashboardProps) {
  const { user } = useAuth();
  const { isMaster } = useMasterAccount();
  const { currentOrg, pendingInvites } = useOrganizations();
  const [selectedDevice, setSelectedDevice] = useState<DeviceWithRole | null>(null);
  const [showBrokerSettings, setShowBrokerSettings] = useState(false);
  const [showAlertRules, setShowAlertRules] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV) {
      seedAlertRules();
    }
  }, []);

  useEffect(() => {
    connectMqtt();
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [user]);

  if (selectedDevice) {
    return (
      <DeviceView device={selectedDevice} onBack={() => setSelectedDevice(null)} />
    );
  }

  const renderContent = () => {
    switch (currentView) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold">{currentOrg?.name || 'Dashboard'}</h1>
              <p className="text-muted-foreground">Organization overview</p>
            </div>
            {pendingInvites.length > 0 && <PendingInvites />}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Devices</CardTitle>
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">--</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Members</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">--</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Alerts</CardTitle>
                  <Bell className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">--</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Automations</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">--</div>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      case 'members':
        return <OrgMembersPanel />;
      case 'invites':
        return (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">Invitations</h1>
            <PendingInvites />
          </div>
        );
      case 'settings':
        return (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">Settings</h1>
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Organization settings coming soon</p>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return <DeviceList onDeviceSelect={setSelectedDevice} />;
    }
  };

  return (
    <div className="space-y-6">
      {renderContent()}
      <BrokerSettingsDialog open={showBrokerSettings} onOpenChange={setShowBrokerSettings} />
      <AlertRuleDialog open={showAlertRules} onOpenChange={setShowAlertRules} defaultDeviceId={selectedDevice?.id} />
      {isMaster && <MQTTDebugPanel />}
      <Toaster position="top-right" expand richColors closeButton />
    </div>
  );
}
