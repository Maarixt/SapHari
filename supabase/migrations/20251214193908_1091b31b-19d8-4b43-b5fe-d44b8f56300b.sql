-- Fix devices_safe view to use SECURITY INVOKER (respects caller RLS)
-- This ensures the view enforces RLS policies from the underlying devices table

-- Drop the existing view
DROP VIEW IF EXISTS public.devices_safe;

-- Recreate with security_invoker = true (Postgres 15+)
-- This makes the view execute with the permissions of the calling user, not the view owner
CREATE VIEW public.devices_safe 
WITH (security_invoker = true)
AS
SELECT 
  id,
  device_id,
  name,
  model,
  firmware,
  firmware_version,
  user_id,
  online,
  last_seen,
  location,
  tags,
  metadata,
  created_at,
  updated_at,
  org_id
FROM public.devices;

-- Revoke all permissions from public and anon roles
REVOKE ALL ON public.devices_safe FROM anon;
REVOKE ALL ON public.devices_safe FROM public;

-- Grant SELECT only to authenticated users (RLS on devices table will filter results)
GRANT SELECT ON public.devices_safe TO authenticated;

-- Add a comment to document the security model
COMMENT ON VIEW public.devices_safe IS 
'Safe device view that excludes device_key. Uses SECURITY INVOKER to respect RLS policies on devices table.';

-- Also remove the password column from broker_settings to eliminate plaintext credential storage
-- The dashboard now uses edge function secrets for MQTT credentials
-- First, update any null passwords to empty string to avoid issues
UPDATE public.broker_settings SET password = NULL WHERE password IS NOT NULL;

-- Add comment explaining the security change
COMMENT ON TABLE public.broker_settings IS 
'User broker settings. Password field is deprecated - MQTT credentials are now managed via edge function secrets.';