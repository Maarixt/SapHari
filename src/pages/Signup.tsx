import { LoginForm } from '@/components/auth/LoginForm';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useLocation, type Location } from 'react-router-dom';

const Signup = () => {
  const { user } = useAuth();
  const location = useLocation();
  const state = location.state as { from?: Location } | undefined;
  const from = state?.from?.pathname || '/';

  if (user) {
    return <Navigate to={from} replace />;
  }

  return <LoginForm initialMode="signup" />;
};

export default Signup;
