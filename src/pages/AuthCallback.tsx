import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FullPageLoader } from '@/components/ui/FullPageLoader';

/**
 * Handles OAuth / email confirmation callback from Supabase.
 * Exchanges the code in the URL for a session via exchangeCodeForSession,
 * then redirects to the app or login on error.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'exchanging' | 'done'>('exchanging');

  useEffect(() => {
    const url = window.location.href;
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash?.replace('#', '') || '');

    const errorInQuery = params.get('error');
    const errorInHash = hashParams.get('error');
    if (errorInQuery || errorInHash) {
      const msg = params.get('error_description') || hashParams.get('error_description') || errorInQuery || errorInHash;
      toast.error(msg || 'Sign in was cancelled or failed');
      navigate('/login', { replace: true });
      setStatus('done');
      return;
    }

    const hasCode = params.has('code');
    const hasHash = hashParams.has('access_token');

    if (!hasCode && !hasHash) {
      toast.error('Invalid or missing auth callback');
      navigate('/login', { replace: true });
      setStatus('done');
      return;
    }

    (async () => {
      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(url);

        if (error) {
          console.error('Auth callback exchange error:', error);
          toast.error(error.message || 'Could not complete sign in');
          navigate('/login', { replace: true });
          setStatus('done');
          return;
        }

        if (data?.session) {
          toast.success('Welcome! You’re signed in.');
          navigate('/app/devices', { replace: true });
        } else {
          navigate('/login', { replace: true });
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        toast.error('Something went wrong. Please try signing in again.');
        navigate('/login', { replace: true });
      } finally {
        setStatus('done');
      }
    })();
  }, [navigate]);

  if (status === 'exchanging') {
    return <FullPageLoader message="Signing you in…" />;
  }

  return null;
}
