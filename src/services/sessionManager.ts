/**
 * Centralized Session Manager
 * 
 * Provides reliable session access with automatic refresh,
 * prevents race conditions, and handles auth state changes.
 */

import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Session expiry buffer - refresh if less than this time remaining
const EXPIRY_BUFFER_MS = 2 * 60 * 1000; // 2 minutes

// Track initialization state
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;
let currentSession: Session | null = null;
let refreshInProgress: Promise<Session | null> | null = null;

// Auth state change listeners
type AuthChangeListener = (event: AuthChangeEvent, session: Session | null) => void;
const authChangeListeners: AuthChangeListener[] = [];

/**
 * Initialize the session manager
 * Must be called before using getValidSession
 */
export async function initializeSessionManager(): Promise<void> {
  if (isInitialized) return;
  
  if (initializationPromise) {
    return initializationPromise;
  }
  
  initializationPromise = new Promise(async (resolve) => {
    console.log('🔐 Initializing session manager...');
    
    // Set up auth state listener FIRST
    supabase.auth.onAuthStateChange((event, session) => {
      console.log(`🔐 Auth state change: ${event}`);
      currentSession = session;
      
      // Notify all listeners
      authChangeListeners.forEach(listener => {
        try {
          listener(event, session);
        } catch (error) {
          console.error('Auth change listener error:', error);
        }
      });
    });
    
    // THEN get initial session
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.warn('Initial session fetch error:', error.message);
      } else {
        currentSession = session;
        console.log(`🔐 Initial session: ${session ? 'present' : 'none'}`);
      }
    } catch (error) {
      console.error('Failed to get initial session:', error);
    }
    
    isInitialized = true;
    resolve();
  });
  
  return initializationPromise;
}

/**
 * Register a listener for auth state changes
 */
export function onAuthStateChange(listener: AuthChangeListener): () => void {
  authChangeListeners.push(listener);
  
  // Return cleanup function
  return () => {
    const index = authChangeListeners.indexOf(listener);
    if (index > -1) {
      authChangeListeners.splice(index, 1);
    }
  };
}

/**
 * Check if session is near expiry
 */
function isSessionNearExpiry(session: Session): boolean {
  if (!session.expires_at) return false;
  
  const expiresAtMs = session.expires_at * 1000; // Convert to milliseconds
  const now = Date.now();
  const timeUntilExpiry = expiresAtMs - now;
  
  return timeUntilExpiry < EXPIRY_BUFFER_MS;
}

/**
 * Get a valid session, refreshing if needed
 * 
 * @param options.forceRefresh - Force a token refresh even if session seems valid
 * @returns Valid session or null if not authenticated
 */
export async function getValidSession(options?: { forceRefresh?: boolean }): Promise<Session | null> {
  // Ensure initialized
  await initializeSessionManager();
  
  // If no session, return null immediately
  if (!currentSession) {
    console.log('🔐 No session available');
    return null;
  }
  
  // Check if refresh is needed
  const needsRefresh = options?.forceRefresh || isSessionNearExpiry(currentSession);
  
  if (!needsRefresh) {
    return currentSession;
  }
  
  // Dedupe concurrent refresh requests
  if (refreshInProgress) {
    console.log('🔐 Refresh already in progress, waiting...');
    return refreshInProgress;
  }
  
  console.log('🔐 Refreshing session...');
  
  refreshInProgress = (async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Session refresh failed:', error.message);
        
        // If refresh token is invalid, session is truly dead
        if (error.message.includes('refresh_token') || 
            error.message.includes('session') ||
            error.message.includes('invalid')) {
          console.warn('🔐 Session invalid, clearing...');
          currentSession = null;
          return null;
        }
        
        // Return existing session for other errors (might still work)
        return currentSession;
      }
      
      if (data.session) {
        console.log('🔐 Session refreshed successfully');
        currentSession = data.session;
        return data.session;
      }
      
      return null;
    } finally {
      refreshInProgress = null;
    }
  })();
  
  return refreshInProgress;
}

/**
 * Get current session without refreshing
 */
export function getCurrentSession(): Session | null {
  return currentSession;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return currentSession !== null;
}

/**
 * Clear session and sign out
 */
export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut();
    currentSession = null;
    console.log('🔐 Signed out');
  } catch (error) {
    console.error('Sign out error:', error);
    // Force clear even on error
    currentSession = null;
  }
}

/**
 * Get access token for API calls
 */
export async function getAccessToken(options?: { forceRefresh?: boolean }): Promise<string | null> {
  const session = await getValidSession(options);
  return session?.access_token || null;
}
