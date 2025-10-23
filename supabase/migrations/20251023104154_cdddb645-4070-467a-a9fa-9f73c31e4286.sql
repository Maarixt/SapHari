-- Fix RLS for master_login_attempts table
ALTER TABLE public.master_login_attempts ENABLE ROW LEVEL SECURITY;

-- Only master users can view login attempts (for security monitoring)
CREATE POLICY "Master users can view all login attempts"
  ON public.master_login_attempts
  FOR SELECT
  USING (public.is_master_user(auth.uid()));

-- System can insert login attempts (no auth required for edge function)
CREATE POLICY "System can insert login attempts"
  ON public.master_login_attempts
  FOR INSERT
  WITH CHECK (true);

COMMENT ON POLICY "System can insert login attempts" ON public.master_login_attempts 
  IS 'Allows edge functions to log login attempts without authentication';