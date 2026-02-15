// Supabase client: uses VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY from .env when set;
// falls back to build-time / generated values otherwise.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ??
  "https://wrdeomgtkbehvbfhiprm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyZGVvbWd0a2JlaHZiZmhpcHJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1OTYxMTEsImV4cCI6MjA3MzE3MjExMX0.mZNoXWuvPUKZfHgkjtlg4IPP1vyHTxdehTs9yiOgPlE";

// Runtime validation for self-hosted / ejected deployments
if (import.meta.env.DEV) {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    console.error(
      'Missing Supabase configuration. ' +
        'Create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, then restart Vite.'
    );
  }
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});