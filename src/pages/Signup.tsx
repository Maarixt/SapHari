import { SignupForm } from '@/components/auth/SignupForm';
import { useAuth } from '@/hooks/useAuth';
import { useMasterAccount } from '@/hooks/useMasterAccount';
import { Navigate, useLocation, type Location } from 'react-router-dom';
import { FullPageLoader } from '@/components/ui/FullPageLoader';

const Signup = () => {
  const { user, loading } = useAuth();
  const { isMaster } = useMasterAccount();
  const location = useLocation();
  const state = location.state as { from?: Location } | undefined;
  const from = state?.from?.pathname || '/';

  if (loading) return <FullPageLoader message="Checking session..." />;
  
  // Redirect master users to master dashboard
  if (isMaster) {
    return <Navigate to="/master" replace />;
  }
  
  // Redirect regular users to their intended destination
  if (user) {
    return <Navigate to={from} replace />;
  }

  return <SignupForm />;
};

export default Signup;
