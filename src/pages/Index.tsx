import { MQTTProvider } from '@/hooks/useMQTT';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { OrgDashboard } from '@/components/dashboard/OrgDashboard';

const Index = () => {
  return (
    <MQTTProvider>
      <DashboardLayout>
        {({ currentView, setCurrentView }) => (
          <OrgDashboard currentView={currentView} setCurrentView={setCurrentView} />
        )}
      </DashboardLayout>
    </MQTTProvider>
  );
};

export default Index;
