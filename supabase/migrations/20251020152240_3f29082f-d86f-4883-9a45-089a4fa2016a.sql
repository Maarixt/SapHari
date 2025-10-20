-- ============================================================================
-- CRITICAL SECURITY FIXES - Simplified Approach
-- ============================================================================

-- Fix 1: Create safe devices view without device_key
-- ============================================================================

DROP VIEW IF EXISTS public.devices_safe CASCADE;

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
  updated_at
FROM public.devices;

COMMENT ON VIEW public.devices_safe IS 'Devices view without device_key for security';
GRANT SELECT ON public.devices_safe TO authenticated;

-- Fix 2: Update SECURITY DEFINER views with proper is_master() checks
-- ============================================================================

DROP VIEW IF EXISTS public.v_master_kpis CASCADE;
DROP VIEW IF EXISTS public.v_devices_overview CASCADE;
DROP VIEW IF EXISTS public.v_users_overview CASCADE;
DROP VIEW IF EXISTS public.v_alerts_recent CASCADE;
DROP VIEW IF EXISTS public.v_audit_recent CASCADE;
DROP VIEW IF EXISTS public.v_device_health CASCADE;

CREATE VIEW public.v_master_kpis
WITH (security_invoker = false)
AS
SELECT
  (SELECT COUNT(*) FROM public.profiles WHERE public.is_master(auth.uid()))::BIGINT AS total_users,
  (SELECT COUNT(*) FROM public.devices WHERE public.is_master(auth.uid()))::BIGINT AS total_devices,
  (SELECT COUNT(*) FROM public.devices WHERE online = true AND public.is_master(auth.uid()))::BIGINT AS online_devices,
  (SELECT COUNT(*) FROM public.devices WHERE online = false AND public.is_master(auth.uid()))::BIGINT AS offline_devices,
  (SELECT COUNT(*) FROM public.alerts 
   WHERE created_at > now() - interval '24 hours' AND public.is_master(auth.uid()))::BIGINT AS alerts_24h,
  (SELECT pg_database_size(current_database()) WHERE public.is_master(auth.uid()))::BIGINT AS telemetry_bytes
WHERE public.is_master(auth.uid());

CREATE VIEW public.v_devices_overview
WITH (security_invoker = false)
AS
SELECT
  d.id,
  d.device_id,
  d.name,
  d.online,
  d.created_at,
  d.updated_at,
  d.user_id AS owner_id,
  p.email AS owner_email,
  p.display_name AS owner_name,
  (SELECT COUNT(*) FROM public.widgets w WHERE w.device_id = d.id) AS widget_count,
  (SELECT COUNT(*) FROM public.alerts a WHERE a.device_id = d.id AND a.read = false) AS alert_count
FROM public.devices d
LEFT JOIN public.profiles p ON p.id = d.user_id
WHERE public.is_master(auth.uid());

CREATE VIEW public.v_users_overview
WITH (security_invoker = false)
AS
SELECT
  p.id,
  p.email,
  p.display_name,
  p.created_at,
  p.updated_at,
  ur.role,
  (SELECT COUNT(*) FROM public.devices d WHERE d.user_id = p.id) AS device_count,
  (SELECT COUNT(*) FROM public.alerts a WHERE a.user_id = p.id AND a.read = false) AS unread_alerts
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
WHERE public.is_master(auth.uid());

CREATE VIEW public.v_alerts_recent
WITH (security_invoker = false)
AS
SELECT
  a.id,
  a.user_id,
  a.device_id,
  a.type,
  a.message,
  a.read,
  a.created_at,
  p.display_name AS user_name,
  d.name AS device_name
FROM public.alerts a
LEFT JOIN public.profiles p ON p.id = a.user_id
LEFT JOIN public.devices d ON d.id = a.device_id
WHERE public.is_master(auth.uid())
ORDER BY a.created_at DESC
LIMIT 100;

CREATE VIEW public.v_audit_recent
WITH (security_invoker = false)
AS
SELECT
  id,
  actor_email,
  actor_role,
  action,
  resource,
  details,
  ip_address,
  user_agent,
  timestamp,
  created_at
FROM public.audit_logs
WHERE public.is_master(auth.uid())
ORDER BY timestamp DESC
LIMIT 100;

CREATE VIEW public.v_device_health
WITH (security_invoker = false)
AS
SELECT
  d.id,
  d.device_id,
  d.name,
  d.online,
  d.last_seen,
  CASE
    WHEN d.online THEN 'healthy'
    WHEN d.last_seen > now() - interval '1 hour' THEN 'warning'
    ELSE 'critical'
  END AS status,
  EXTRACT(EPOCH FROM (now() - d.last_seen)) AS seconds_offline,
  (SELECT COUNT(*) FROM public.alerts a 
   WHERE a.device_id = d.id 
   AND a.severity = 'crit' 
   AND a.state = 'open') AS critical_alerts,
  (SELECT COUNT(*) FROM public.commands c 
   WHERE c.device_id = d.id 
   AND c.status = 'failed' 
   AND c.created_at > now() - interval '24 hours') AS failed_commands_24h
FROM public.devices d
WHERE public.is_master(auth.uid());

-- Fix 3: Secure device key functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_device_key_once(p_device_id uuid)
RETURNS TABLE(device_key text, time_remaining_seconds integer)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_device_key text;
  v_created_at timestamptz;
  v_time_since_creation integer;
BEGIN
  SELECT d.device_key, d.created_at
  INTO v_device_key, v_created_at
  FROM public.devices d
  WHERE d.id = p_device_id
    AND d.user_id = auth.uid();
  
  IF v_device_key IS NULL THEN
    RAISE EXCEPTION 'Device not found or access denied';
  END IF;
  
  v_time_since_creation := EXTRACT(EPOCH FROM (now() - v_created_at))::integer;
  
  IF v_time_since_creation > 300 THEN
    RAISE EXCEPTION 'Device key viewing window expired (5 minutes after creation)';
  END IF;
  
  RETURN QUERY SELECT v_device_key, (300 - v_time_since_creation)::integer;
END;
$$;

CREATE OR REPLACE FUNCTION public.rotate_device_key(p_device_id uuid)
RETURNS text
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_key text;
BEGIN
  v_new_key := encode(gen_random_bytes(16), 'hex');
  
  UPDATE public.devices
  SET device_key = v_new_key,
      updated_at = now()
  WHERE id = p_device_id
    AND user_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Device not found or access denied';
  END IF;
  
  RETURN v_new_key;
END;
$$;

COMMENT ON FUNCTION public.get_device_key_once IS 'Returns device key only within 5 minutes of creation';
COMMENT ON FUNCTION public.rotate_device_key IS 'Generates and returns new device key';
