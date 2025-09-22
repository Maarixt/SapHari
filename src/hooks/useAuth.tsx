import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
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
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, login, signup, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};