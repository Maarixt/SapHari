-- ============================================================================
-- SapHari Master Dashboard Views
-- Script: 04_master_dashboard_views.sql
-- Description: Aggregated views for master dashboard
-- ============================================================================

-- ============================================================================
-- MASTER KPIs VIEW
-- ============================================================================

CREATE OR REPLACE VIEW public.v_master_kpis
WITH (security_invoker = false) -- SECURITY DEFINER
AS
SELECT
  (SELECT COUNT(*) FROM public.profiles)::BIGINT AS total_users,
  (SELECT COUNT(*) FROM public.devices)::BIGINT AS total_devices,
  (SELECT COUNT(*) FROM public.devices WHERE online = true)::BIGINT AS online_devices,
  (SELECT COUNT(*) FROM public.devices WHERE online = false)::BIGINT AS offline_devices,
  (SELECT COUNT(*) FROM public.alerts 
   WHERE created_at > now() - interval '24 hours')::BIGINT AS alerts_24h,
  (SELECT pg_database_size(current_database()))::BIGINT AS telemetry_bytes
WHERE public.is_master(auth.uid());

COMMENT ON VIEW public.v_master_kpis IS 'Master dashboard KPI metrics (master-only)';

-- ============================================================================
-- DEVICES OVERVIEW VIEW (for master dashboard)
-- ============================================================================

CREATE OR REPLACE VIEW public.v_devices_overview
WITH (security_invoker = false) -- SECURITY DEFINER
AS
SELECT
  d.id,
  d.device_id,
  d.device_key,
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

COMMENT ON VIEW public.v_devices_overview IS 'Devices with owner info and stats (master-only)';

-- ============================================================================
-- USERS OVERVIEW VIEW (for master dashboard)
-- ============================================================================

CREATE OR REPLACE VIEW public.v_users_overview
WITH (security_invoker = false) -- SECURITY DEFINER
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

COMMENT ON VIEW public.v_users_overview IS 'Users with roles and stats (master-only)';

-- ============================================================================
-- RECENT ALERTS VIEW (for master dashboard)
-- ============================================================================

CREATE OR REPLACE VIEW public.v_alerts_recent
WITH (security_invoker = false) -- SECURITY DEFINER
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

COMMENT ON VIEW public.v_alerts_recent IS 'Recent 100 alerts across all users (master-only)';

-- ============================================================================
-- RECENT AUDIT LOGS VIEW (for master dashboard)
-- ============================================================================

CREATE OR REPLACE VIEW public.v_audit_recent
WITH (security_invoker = false) -- SECURITY DEFINER
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

COMMENT ON VIEW public.v_audit_recent IS 'Recent 100 audit log entries (master-only)';

-- ============================================================================
-- DEVICE HEALTH VIEW (optional - for future use)
-- ============================================================================

CREATE OR REPLACE VIEW public.v_device_health
WITH (security_invoker = false) -- SECURITY DEFINER
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

COMMENT ON VIEW public.v_device_health IS 'Device health status and metrics (master-only)';
