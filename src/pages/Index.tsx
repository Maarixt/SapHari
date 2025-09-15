import { MQTTProvider } from '@/hooks/useMQTT';
import { Dashboard } from '@/components/dashboard/Dashboard';

const Index = () => {
  return (
    <MQTTProvider>
      <Dashboard />
    </MQTTProvider>
  );
};

export default Index;
