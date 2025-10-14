-- Master Dashboard Schema Migration
-- Run this in your Supabase SQL Editor to add the new tables and functions

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ======= TENANTS / ORGS (Multi-tenant support) =======
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ======= ENHANCED PROFILES =======
-- Add tenant support and enhanced fields to existing profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id),
ADD COLUMN IF NOT EXISTS full_name text,
ADD COLUMN IF NOT EXISTS role text CHECK (role IN ('master','admin','tech','user')) DEFAULT 'user',
ADD COLUMN IF NOT EXISTS last_login timestamptz,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending', 'locked'));

-- ======= ENHANCED DEVICES =======
-- Add location, tags, and tenant support to existing devices
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id),
ADD COLUMN IF NOT EXISTS model text,
ADD COLUMN IF NOT EXISTS firmware text,
ADD COLUMN IF NOT EXISTS last_seen timestamptz,
ADD COLUMN IF NOT EXISTS online boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS location jsonb, -- {lat, lng}
ADD COLUMN IF NOT EXISTS tags text[];

-- ======= TELEMETRY (MQTT → Edge function ingests) =======
CREATE TABLE IF NOT EXISTS telemetry (
  id bigserial PRIMARY KEY,
  device_id uuid REFERENCES devices(id) ON DELETE CASCADE,
  topic text NOT NULL,
  ts timestamptz NOT NULL DEFAULT now(),
  v_num double precision,
  v_str text,
  v_json jsonb
);

CREATE INDEX IF NOT EXISTS telemetry_device_ts ON telemetry(device_id, ts DESC);
CREATE INDEX IF NOT EXISTS telemetry_topic_ts ON telemetry(topic, ts DESC);
CREATE INDEX IF NOT EXISTS telemetry_device_topic_ts ON telemetry(device_id, topic, ts DESC);

-- ======= ENHANCED ALERTS =======
-- Enhance existing alerts table
ALTER TABLE alerts 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id),
ADD COLUMN IF NOT EXISTS device_id uuid REFERENCES devices(id),
ADD COLUMN IF NOT EXISTS severity text CHECK (severity IN ('info','warn','crit')) DEFAULT 'info',
ADD COLUMN IF NOT EXISTS title text NOT NULL,
ADD COLUMN IF NOT EXISTS details jsonb,
ADD COLUMN IF NOT EXISTS state text CHECK (state IN ('open','ack','closed')) DEFAULT 'open',
ADD COLUMN IF NOT EXISTS ack_by uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- ======= AUDIT LOG =======
CREATE TABLE IF NOT EXISTS audit_log (
  id bigserial PRIMARY KEY,
  actor uuid REFERENCES profiles(id),
  tenant_id uuid REFERENCES tenants(id),
  action text NOT NULL,       -- 'user.create', 'device.update', 'login'
  subject text,               -- resource id or email
  meta jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_actor_ts ON audit_log(actor, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_action_ts ON audit_log(action, created_at DESC);

-- ======= API KEYS =======
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id),
  created_by uuid REFERENCES profiles(id),
  name text,
  hash text,
  created_at timestamptz DEFAULT now(),
  revoked boolean DEFAULT false
);

-- ======= IP RULES =======
CREATE TABLE IF NOT EXISTS ip_rules (
  id bigserial PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id),
  rule text CHECK (rule IN ('allow','deny')),
  cidr text NOT NULL, -- '203.0.113.0/24'
  created_at timestamptz DEFAULT now()
);

-- ======= SYSTEM STATUS =======
CREATE TABLE IF NOT EXISTS system_status (
  component text PRIMARY KEY,          -- 'api','broker','db'
  version text, 
  ok boolean, 
  updated_at timestamptz DEFAULT now(),
  meta jsonb
);

-- ======= BACKUPS =======
CREATE TABLE IF NOT EXISTS backups (
  id bigserial PRIMARY KEY,
  label text, 
  created_at timestamptz DEFAULT now(), 
  size_bytes bigint, 
  location text
);

-- ======= SIMULATOR BINDINGS =======
CREATE TABLE IF NOT EXISTS sim_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid REFERENCES devices(id),
  script text,
  enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ======= RETENTION RULES =======
CREATE TABLE IF NOT EXISTS retention_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid REFERENCES devices(id),
  topic text,
  keep_days int,
  created_at timestamptz DEFAULT now()
);

-- ======= RLS POLICIES =======

-- Master bypass for all tables
CREATE POLICY IF NOT EXISTS master_all_profiles ON profiles
  FOR ALL USING (EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='master'));

CREATE POLICY IF NOT EXISTS master_all_devices ON devices
  FOR ALL USING (EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='master'));

CREATE POLICY IF NOT EXISTS master_all_telemetry ON telemetry
  FOR ALL USING (EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='master'));

CREATE POLICY IF NOT EXISTS master_all_alerts ON alerts
  FOR ALL USING (EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='master'));

CREATE POLICY IF NOT EXISTS master_all_audit_log ON audit_log
  FOR ALL USING (EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='master'));

CREATE POLICY IF NOT EXISTS master_all_api_keys ON api_keys
  FOR ALL USING (EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='master'));

CREATE POLICY IF NOT EXISTS master_all_ip_rules ON ip_rules
  FOR ALL USING (EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='master'));

CREATE POLICY IF NOT EXISTS master_all_system_status ON system_status
  FOR ALL USING (EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='master'));

CREATE POLICY IF NOT EXISTS master_all_backups ON backups
  FOR ALL USING (EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='master'));

-- Tenant-based access for non-masters
CREATE POLICY IF NOT EXISTS tenant_profiles ON profiles
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id=auth.uid()));

CREATE POLICY IF NOT EXISTS tenant_devices ON devices
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id=auth.uid()));

-- ======= HELPER FUNCTIONS =======

-- Function for time-bucketed series (downsampling)
CREATE OR REPLACE FUNCTION series_avg_minute(
  p_device_id uuid,
  p_topic text,
  p_from timestamptz,
  p_to timestamptz
) RETURNS TABLE(t timestamptz, y double precision) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    date_trunc('minute', ts) as t,
    avg(v_num) as y
  FROM telemetry
  WHERE device_id = p_device_id 
    AND topic = p_topic
    AND ts BETWEEN p_from AND p_to
  GROUP BY 1 
  ORDER BY 1;
END;
$$ LANGUAGE plpgsql;

-- Function for hourly downsampling
CREATE OR REPLACE FUNCTION series_avg_hour(
  p_device_id uuid,
  p_topic text,
  p_from timestamptz,
  p_to timestamptz
) RETURNS TABLE(t timestamptz, y double precision) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    date_trunc('hour', ts) as t,
    avg(v_num) as y
  FROM telemetry
  WHERE device_id = p_device_id 
    AND topic = p_topic
    AND ts BETWEEN p_from AND p_to
  GROUP BY 1 
  ORDER BY 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get online devices count
CREATE OR REPLACE FUNCTION get_online_devices_count()
RETURNS integer AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM devices WHERE online = true);
END;
$$ LANGUAGE plpgsql;

-- Function to get total users count
CREATE OR REPLACE FUNCTION get_total_users_count()
RETURNS integer AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM profiles);
END;
$$ LANGUAGE plpgsql;

-- Function to get storage usage
CREATE OR REPLACE FUNCTION get_storage_usage()
RETURNS bigint AS $$
BEGIN
  RETURN (SELECT pg_total_relation_size('telemetry'));
END;
$$ LANGUAGE plpgsql;

-- Function to get uptime percentage (last 24h)
CREATE OR REPLACE FUNCTION get_uptime_percentage()
RETURNS numeric AS $$
DECLARE
  result numeric;
BEGIN
  WITH mins AS (
    SELECT date_trunc('minute', ts) m, count(*) > 0 as ok
    FROM telemetry 
    WHERE topic = 'system/broker/heartbeat'
      AND ts > now() - interval '24 hour'
    GROUP BY 1
  )
  SELECT round(100.0 * sum((ok)::int)/greatest(count(*),1), 1) INTO result
  FROM mins;
  
  RETURN COALESCE(result, 0);
END;
$$ LANGUAGE plpgsql;

-- ======= SAMPLE DATA =======

-- Insert default tenant
INSERT INTO tenants (id, name) VALUES 
  ('00000000-0000-0000-0000-000000000000', 'Default Tenant')
ON CONFLICT (id) DO NOTHING;

-- Insert sample system status
INSERT INTO system_status (component, version, ok, meta) VALUES 
  ('api', '1.0.0', true, '{"uptime": "99.9%", "response_time": "45ms"}'),
  ('broker', '2.1.0', true, '{"connections": 150, "messages_per_sec": 1200}'),
  ('db', '15.4', true, '{"connections": 25, "cache_hit_ratio": "98.5%"}')
ON CONFLICT (component) DO NOTHING;
