import { LoginForm } from '@/components/auth/LoginForm';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useLocation, type Location } from 'react-router-dom';
import { FullPageLoader } from '@/components/ui/FullPageLoader';

const Login = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const state = location.state as { from?: Location } | undefined;
  const from = state?.from?.pathname || '/';

  if (loading) return <FullPageLoader message="Checking session..." />;
  if (user) {
    return <Navigate to={from} replace />;
  }

  return <LoginForm />;
};

export default Login;
