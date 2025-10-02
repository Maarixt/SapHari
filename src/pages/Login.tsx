import { LoginForm } from '@/components/auth/LoginForm';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useLocation, Location } from 'react-router-dom';

const Login = () => {
  const { user } = useAuth();
  const location = useLocation();
  const state = location.state as { from?: Location } | undefined;
  const from = state?.from?.pathname || '/';

  if (user) {
    return <Navigate to={from} replace />;
  }

  return <LoginForm />;
};

export default Login;
