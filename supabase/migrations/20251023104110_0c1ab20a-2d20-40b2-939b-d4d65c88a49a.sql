-- Phase 1: Secure Master Authentication
-- Add TOTP 2FA secrets table

-- Create table for storing TOTP secrets
CREATE TABLE IF NOT EXISTS public.master_2fa_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  secret_encrypted TEXT NOT NULL,
  backup_codes_encrypted TEXT[], -- Array of encrypted backup codes
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.master_2fa_secrets ENABLE ROW LEVEL SECURITY;

-- Only master users can access their own 2FA secrets
CREATE POLICY "Master users can view own 2FA secrets"
  ON public.master_2fa_secrets
  FOR SELECT
  USING (auth.uid() = user_id AND public.is_master_user(auth.uid()));

CREATE POLICY "Master users can update own 2FA secrets"
  ON public.master_2fa_secrets
  FOR UPDATE
  USING (auth.uid() = user_id AND public.is_master_user(auth.uid()));

CREATE POLICY "Master users can insert own 2FA secrets"
  ON public.master_2fa_secrets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_master_user(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_master_2fa_secrets_updated_at
  BEFORE UPDATE ON public.master_2fa_secrets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for performance
CREATE INDEX idx_master_2fa_secrets_user_id ON public.master_2fa_secrets(user_id);

-- Add table for tracking failed login attempts (rate limiting)
CREATE TABLE IF NOT EXISTS public.master_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  attempt_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT false,
  ip_address TEXT,
  user_agent TEXT
);

-- Add index for rate limiting queries
CREATE INDEX idx_master_login_attempts_email_time ON public.master_login_attempts(email, attempt_time DESC);
CREATE INDEX idx_master_login_attempts_ip_time ON public.master_login_attempts(ip_address, attempt_time DESC);

-- Function to check rate limiting (3 failed attempts in 10 minutes)
CREATE OR REPLACE FUNCTION public.check_master_login_rate_limit(
  p_email TEXT,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_failed_attempts INTEGER;
BEGIN
  -- Count failed attempts in last 10 minutes
  SELECT COUNT(*)
  INTO v_failed_attempts
  FROM public.master_login_attempts
  WHERE email = p_email
    AND success = false
    AND attempt_time > now() - interval '10 minutes'
    AND (p_ip_address IS NULL OR ip_address = p_ip_address);
  
  -- Return false if rate limit exceeded (3+ failed attempts)
  RETURN v_failed_attempts < 3;
END;
$$;

COMMENT ON TABLE public.master_2fa_secrets IS 'Stores encrypted TOTP secrets for master account 2FA';
COMMENT ON TABLE public.master_login_attempts IS 'Tracks master login attempts for rate limiting and security monitoring';
COMMENT ON FUNCTION public.check_master_login_rate_limit IS 'Checks if master login rate limit has been exceeded (3 attempts per 10 minutes)';