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

  // Check for existing master session on mount
  useEffect(() => {
    const checkMasterSession = async () => {
      try {
        const storedRole = localStorage.getItem('saphari_user_role') as UserRole;
        const sessionToken = localStorage.getItem('saphari_master_session');
        
        if (storedRole && isMasterAccount(storedRole) && sessionToken) {
          // Verify session is still valid
          const { data, error } = await supabase.functions.invoke('verify-master-session', {
            body: { sessionToken }
          });
          
          if (!error && data?.ok) {
            setUserRole('master');
          } else {
            localStorage.removeItem('saphari_user_role');
            localStorage.removeItem('saphari_master_session');
          }
        }
      } catch (error) {
        console.error('Failed to verify master session:', error);
        localStorage.removeItem('saphari_user_role');
        localStorage.removeItem('saphari_master_session');
      }
    };

    checkMasterSession();
  }, []);

  const loginAsMaster = async (email: string, password: string, twoFactorCode?: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Call master-login edge function
      const { data, error: loginError } = await supabase.functions.invoke('master-login', {
        body: { email, password, twoFactorCode }
      });

      if (loginError || !data?.ok) {
        setError(data?.error || 'Invalid master credentials');
        return false;
      }

      // Set master role
      setUserRole('master');
      localStorage.setItem('saphari_user_role', 'master');
      localStorage.setItem('saphari_master_session', data.sessionToken);
      localStorage.setItem('saphari_master_login_time', new Date().toISOString());

      return true;
    } catch (error) {
      setError('Login failed. Please try again.');
      console.error('Master login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    const sessionToken = localStorage.getItem('saphari_master_session');
    const email = localStorage.getItem('saphari_master_email');
    
    // Log master logout for audit
    supabase.functions.invoke('master-logout', {
      body: { sessionToken, email }
    }).catch(console.error);

    setUserRole('user');
    localStorage.removeItem('saphari_user_role');
    localStorage.removeItem('saphari_master_session');
    localStorage.removeItem('saphari_master_email');
    localStorage.removeItem('saphari_master_login_time');
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
