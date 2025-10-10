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
  const { isMaster, userRole, isLoading: masterLoading } = useMasterAccount();
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
    return <FullPageLoader message="Checking session..." />;
  }

  // Allow access if user has regular session OR master session
  if (!user && !isMaster) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};