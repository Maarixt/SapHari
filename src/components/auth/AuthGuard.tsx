import { useAuth } from '@/hooks/useAuth';
import { useMasterAccount } from '@/hooks/useMasterAccount';
import { Navigate, useLocation } from 'react-router-dom';
import { FullPageLoader } from '@/components/ui/FullPageLoader';
import { useEffect, useState } from 'react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { user, loading } = useAuth();
  const { isMaster, isLoading: masterLoading } = useMasterAccount();
  const location = useLocation();
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    // Give time for both auth systems to initialize
    const timer = setTimeout(() => {
      setInitialLoad(false);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  // Show loading while either auth system is loading or during initial load
  if (loading || masterLoading || initialLoad) {
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