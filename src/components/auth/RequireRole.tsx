import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { checkMasterRole, getUserRole } from '@/lib/api';
import { useMasterAccount } from '@/hooks/useMasterAccount';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Shield, XCircle } from 'lucide-react';

interface RequireRoleProps {
  role: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RequireRole({ role, children, fallback }: RequireRoleProps) {
  const [loading, setLoading] = useState(true);
  const [hasRole, setHasRole] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { isMaster, userRole: masterUserRole } = useMasterAccount();

  useEffect(() => {
    const checkRole = async () => {
      try {
        setLoading(true);
        
        if (role === 'master') {
          // Use master account context instead of database check
          setHasRole(isMaster);
          setUserRole(isMaster ? 'master' : null);
        } else {
          const roleResult = await getUserRole(supabase);
          setUserRole(roleResult);
          setHasRole(roleResult === role);
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        setHasRole(false);
      } finally {
        setLoading(false);
      }
    };

    checkRole();
  }, [supabase, role, isMaster]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Checking permissions...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasRole) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96 border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-600" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">Access Denied</h3>
                <p className="text-red-600">
                  You need <strong>{role}</strong> role to access this page.
                  {userRole && (
                    <span className="block text-sm mt-1">
                      Your current role: <strong>{userRole}</strong>
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

// Specialized component for master role
export function RequireMaster({ children, fallback }: Omit<RequireRoleProps, 'role'>) {
  return (
    <RequireRole role="master" fallback={fallback}>
      {children}
    </RequireRole>
  );
}

// Component to show role-based content
export function RoleBasedContent({ 
  role, 
  children, 
  fallback 
}: { 
  role: string; 
  children: React.ReactNode; 
  fallback?: React.ReactNode; 
}) {
  const [loading, setLoading] = useState(true);
  const [hasRole, setHasRole] = useState(false);
  const { isMaster } = useMasterAccount();

  useEffect(() => {
    const checkRole = async () => {
      try {
        setLoading(true);
        
        if (role === 'master') {
          // Use master account context instead of database check
          setHasRole(isMaster);
        } else {
          const userRole = await getUserRole(supabase);
          setHasRole(userRole === role);
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        setHasRole(false);
      } finally {
        setLoading(false);
      }
    };

    checkRole();
  }, [supabase, role, isMaster]);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!hasRole) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

// Hook to check if user has specific role
export function useRole(role: string) {
  const [loading, setLoading] = useState(true);
  const [hasRole, setHasRole] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { isMaster } = useMasterAccount();

  useEffect(() => {
    const checkRole = async () => {
      try {
        setLoading(true);
        
        if (role === 'master') {
          // Use master account context instead of database check
          setHasRole(isMaster);
          setUserRole(isMaster ? 'master' : null);
        } else {
          const roleResult = await getUserRole(supabase);
          setUserRole(roleResult);
          setHasRole(roleResult === role);
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        setHasRole(false);
      } finally {
        setLoading(false);
      }
    };

    checkRole();
  }, [supabase, role, isMaster]);

  return { loading, hasRole, userRole };
}

// Hook specifically for master role
export function useMasterRole() {
  return useRole('master');
}
