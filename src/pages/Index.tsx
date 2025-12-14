import { Navigate } from 'react-router-dom';

// This page redirects to the main app - the actual routing is handled in App.tsx
const Index = () => {
  return <Navigate to="/app/devices" replace />;
};

export default Index;
