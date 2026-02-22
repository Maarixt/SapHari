import { useAuth } from '@/hooks/useAuth';
import { useMasterAccount } from '@/hooks/useMasterAccount';
import { Navigate, useLocation } from 'react-router-dom';
import { FullPageLoader } from '@/components/ui/FullPageLoader';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { user, loading } = useAuth();
  const { isMaster, isLoading: masterLoading } = useMasterAccount();
  const location = useLocation();

  if (loading || masterLoading) {
    return <FullPageLoader message="Verifying session..." />;
  }

  // CRITICAL: Only allow access if:
  // 1. User has a regular authenticated session, OR
  // 2. User has a verified master session (checked server-side in useMasterAccount)
  // Never trust client-side role checks - isMaster is set only after server verification
  if (!user && !isMaster) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};