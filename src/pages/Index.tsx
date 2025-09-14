import { AuthProvider } from '@/hooks/useAuth';
import { MQTTProvider } from '@/hooks/useMQTT';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Dashboard } from '@/components/dashboard/Dashboard';

const Index = () => {
  return (
    <AuthProvider>
      <AuthGuard>
        <MQTTProvider>
          <Dashboard />
        </MQTTProvider>
      </AuthGuard>
    </AuthProvider>
  );
};

export default Index;
