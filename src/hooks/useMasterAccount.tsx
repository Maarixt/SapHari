import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserRole, isMasterAccount, getRolePermissions } from '@/lib/roles';
import { supabase } from '@/integrations/supabase/client';

interface MasterAccountContextType {
  userRole: UserRole;
  isMaster: boolean;
  permissions: ReturnType<typeof getRolePermissions>;
  loginAsMaster: (email: string, password: string, twoFactorCode?: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const MasterAccountContext = createContext<MasterAccountContextType | undefined>(undefined);

interface MasterAccountProviderProps {
  children: ReactNode;
}

export const MasterAccountProvider = ({ children }: MasterAccountProviderProps) => {
  const [userRole, setUserRole] = useState<UserRole>('user');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMaster = isMasterAccount(userRole);
  const permissions = getRolePermissions(userRole);

  // Check for existing master session on mount - ALWAYS verify server-side
  useEffect(() => {
    const checkMasterSession = async () => {
      try {
        const sessionToken = localStorage.getItem('saphari_master_session');
        
        // CRITICAL: Never trust localStorage role - always verify server-side
        if (sessionToken) {
          // Verify session with secure endpoint
          const { data, error } = await supabase.functions.invoke('verify-master-session-secure', {
            body: { sessionToken }
          });
          
          if (!error && data?.ok && data?.role === 'master') {
            // Only set master role if server confirms it
            setUserRole('master');
          } else {
            // Clear invalid session
            localStorage.removeItem('saphari_master_session');
            localStorage.removeItem('saphari_master_email');
            localStorage.removeItem('saphari_master_login_time');
          }
        }
      } catch (error) {
        console.error('Failed to verify master session:', error);
        // Clear session on error
        localStorage.removeItem('saphari_master_session');
        localStorage.removeItem('saphari_master_email');
        localStorage.removeItem('saphari_master_login_time');
      }
    };

    checkMasterSession();
  }, []);

  const loginAsMaster = async (email: string, password: string, twoFactorCode?: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // 1) Ensure Supabase auth session for RLS (sign in or create account)
      let sessionRes = await supabase.auth.signInWithPassword({ email, password });
      if (sessionRes.error) {
        // If user doesn't exist, create it (normal signup flow)
        const signUpRes = await supabase.auth.signUp({ email, password });
        if (signUpRes.error) {
          // If signup also failed, surface error
          throw new Error(signUpRes.error.message || 'Failed to authenticate');
        }
        // After signup, sign in again
        sessionRes = await supabase.auth.signInWithPassword({ email, password });
        if (sessionRes.error) {
          throw new Error(sessionRes.error.message || 'Failed to authenticate');
        }
      }

      // 2) Obtain signed master session token (and ensure role exists)
      const { data, error: loginError } = await supabase.functions.invoke('master-login-secure', {
        body: { email, password, twoFactorCode }
      });

      if (loginError || !data?.ok) {
        if (data?.rateLimited) {
          setError(data.error || 'Too many attempts. Please wait 10 minutes.');
        } else {
          setError(data?.error || 'Invalid master credentials');
        }
        return false;
      }

      // 3) Mark as master only after server verification
      setUserRole('master');

      // Store only the signed master session token
      localStorage.setItem('saphari_master_session', data.sessionToken);
      localStorage.setItem('saphari_master_email', email);
      localStorage.setItem('saphari_master_login_time', new Date().toISOString());

      console.log('Master login successful - Supabase session + master JWT ready');
      return true;
    } catch (error: any) {
      setError(error?.message || 'Login failed. Please try again.');
      console.error('Master login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    console.log('Master logout initiated');
    const sessionToken = localStorage.getItem('saphari_master_session');
    const email = localStorage.getItem('saphari_master_email');
    
    // Log master logout for audit
    supabase.functions.invoke('master-logout', {
      body: { sessionToken, email }
    }).catch(console.error);

    setUserRole('user');
    
    // Clear all master session data
    localStorage.removeItem('saphari_master_session');
    localStorage.removeItem('saphari_master_email');
    localStorage.removeItem('saphari_master_login_time');
    
    console.log('Master session cleared, redirecting to login');
    
    // Force page reload to clear all state and navigate to master login
    window.location.href = '/master-login';
  };

  const value: MasterAccountContextType = {
    userRole,
    isMaster,
    permissions,
    loginAsMaster,
    logout,
    isLoading,
    error
  };

  return (
    <MasterAccountContext.Provider value={value}>
      {children}
    </MasterAccountContext.Provider>
  );
};

export const useMasterAccount = (): MasterAccountContextType => {
  const context = useContext(MasterAccountContext);
  if (context === undefined) {
    throw new Error('useMasterAccount must be used within a MasterAccountProvider');
  }
  return context;
};

// Master Account Login Component
export const MasterAccountLogin = () => {
  const { loginAsMaster, isLoading, error } = useMasterAccount();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showTwoFactor, setShowTwoFactor] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const success = await loginAsMaster(email, password, twoFactorCode);
    if (success) {
      setEmail('');
      setPassword('');
      setTwoFactorCode('');
      setShowTwoFactor(false);
    } else if (!showTwoFactor) {
      setShowTwoFactor(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Master Account Access
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Level 0 Root Authentication Required
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Master Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500"
                placeholder="master@saphari.com"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Master Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500"
                placeholder="Enter master password"
              />
            </div>
            
            {showTwoFactor && (
              <div>
                <label htmlFor="twoFactor" className="block text-sm font-medium text-gray-700">
                  2FA Code (Optional)
                </label>
                <input
                  id="twoFactor"
                  type="text"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500"
                  placeholder="123456"
                />
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50"
            >
              {isLoading ? 'Authenticating...' : 'Access Master Panel'}
            </button>
          </div>
        </form>
        
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Master accounts have full system access. All actions are logged and audited.
          </p>
        </div>
      </div>
    </div>
  );
};
