import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { initializeSessionManager } from '@/services/sessionManager';
import { clearMQTTCredentials } from '@/services/mqttCredentialsManager';
import { resetAllState } from '@/services/stateResetService';
import { AlertsStore } from '@/features/alerts/alertsStore';

export interface SignupProfile {
  firstName?: string;
  lastName?: string;
  company?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, profile?: SignupProfile) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  login: async () => {},
  signup: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Initialize session manager first
    initializeSessionManager();
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`🔐 Auth event: ${event}, user: ${session?.user?.id?.substring(0, 8) || 'none'}`);
        
        const newUserId = session?.user?.id || null;
        const previousUserId = previousUserIdRef.current;
        
        // CRITICAL: Detect user switch (different user logging in)
        if (previousUserId && newUserId && previousUserId !== newUserId) {
          console.log('🔐 USER SWITCH DETECTED - resetting all state');
          await resetAllState();
        }
        
        // CRITICAL: Handle sign out
        if (event === 'SIGNED_OUT' || !session) {
          console.log('🔐 SIGNED_OUT - resetting all state');
          await resetAllState();
        }
        
        // Update refs and state
        previousUserIdRef.current = newUserId;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Initialize user-scoped stores on login
        if (newUserId && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
          console.log(`🔐 Initializing stores for user: ${newUserId.substring(0, 8)}...`);
          AlertsStore.initForUser(newUserId);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const userId = session?.user?.id || null;
      previousUserIdRef.current = userId;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Initialize user-scoped stores
      if (userId) {
        console.log(`🔐 Existing session found, initializing stores for user: ${userId.substring(0, 8)}...`);
        AlertsStore.initForUser(userId);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signup = async (email: string, password: string, profile: SignupProfile = {}) => {
    const redirectUrl = `${window.location.origin}/`;
    const displayName = [profile.firstName, profile.lastName]
      .filter(Boolean)
      .join(' ')
      .trim() || profile.company || email.split('@')[0];

    const metadata: Record<string, string | undefined> = {
      display_name: displayName,
      first_name: profile.firstName?.trim(),
      last_name: profile.lastName?.trim(),
      company: profile.company?.trim(),
    };

    const sanitizedMetadata = Object.fromEntries(
      Object.entries(metadata).filter(([, value]) => Boolean(value))
    ) as Record<string, string>;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: sanitizedMetadata,
      },
    });

    if (error) throw error;
  };

  const signOut = async () => {
    console.log('🔐 Sign out initiated');
    
    try {
      // CRITICAL: Reset ALL state first
      await resetAllState();
      
      // Clear local state
      setUser(null);
      setSession(null);
      previousUserIdRef.current = null;
      
      // Check if we have a valid session before attempting signOut
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (currentSession) {
        // Only attempt signOut if we have a valid session
        const { error } = await supabase.auth.signOut();
        
        if (error) {
          console.warn('Supabase signOut error:', error);
          // Continue with local cleanup even if Supabase signOut fails
        }
      } else {
        console.log('No active session to sign out from');
      }
      
      // Force clear any remaining session data from localStorage
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'wrdeomgtkbehvbfhiprm';
      localStorage.removeItem(`sb-${projectId}-auth-token`);
      
      // Clear all Supabase-related localStorage items
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') && key.includes('auth-token')) {
          localStorage.removeItem(key);
        }
      });
      
      console.log('🔐 Sign out complete');
      
    } catch (error) {
      console.error('Sign out error:', error);
      // Force clear local state even if there's an error
      setUser(null);
      setSession(null);
      previousUserIdRef.current = null;
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, login, signup, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
