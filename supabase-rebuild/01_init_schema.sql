-- ============================================================================
-- SapHari Database Schema Initialization
-- Script: 01_init_schema.sql
-- Description: Core schema, enums, and base tables
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

-- App roles enum (5 levels: user, technician, developer, admin, master)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('user', 'technician', 'developer', 'admin', 'master');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Alert severity levels
DO $$ BEGIN
  CREATE TYPE public.alert_severity AS ENUM ('info', 'warn', 'crit');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Alert state
DO $$ BEGIN
  CREATE TYPE public.alert_state AS ENUM ('open', 'ack', 'closed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Command status
DO $$ BEGIN
  CREATE TYPE public.command_status AS ENUM ('pending', 'sent', 'acknowledged', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Profiles table (extends auth.users with app-specific data)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (SEPARATE from profiles for security)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Devices table
CREATE TABLE IF NOT EXISTS public.devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id TEXT NOT NULL UNIQUE,
  device_key TEXT NOT NULL,
  name TEXT NOT NULL,
  model TEXT,
  firmware TEXT,
  firmware_version TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  online BOOLEAN NOT NULL DEFAULT false,
  last_seen TIMESTAMPTZ,
  location JSONB,
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Widgets table (device controls and monitors)
CREATE TABLE IF NOT EXISTS public.widgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('gauge', 'servo', 'switch', 'alert', 'sensor')),
  label TEXT NOT NULL,
  address TEXT NOT NULL,
  pin INTEGER,
  echo_pin INTEGER,
  gauge_type TEXT CHECK (gauge_type IN ('analog', 'pwm', 'digital', 'ultrasonic', 'ds18b20', 'pir', 'dht11', 'dht22')),
  min_value NUMERIC,
  max_value NUMERIC,
  override_mode BOOLEAN DEFAULT false,
  state JSONB DEFAULT '{}'::jsonb,
  trigger TEXT,
  message TEXT,
  unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Alerts table (user notifications from devices/rules)
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,
  widget_id UUID REFERENCES public.widgets(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  severity public.alert_severity DEFAULT 'info',
  state public.alert_state DEFAULT 'open',
  read BOOLEAN NOT NULL DEFAULT false,
  ack_by UUID REFERENCES auth.users(id),
  closed_at TIMESTAMPTZ,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Telemetry table (time-series data from devices)
CREATE TABLE IF NOT EXISTS public.telemetry (
  id BIGSERIAL PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  widget_id UUID REFERENCES public.widgets(id) ON DELETE SET NULL,
  topic TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  v_num NUMERIC,
  v_str TEXT,
  v_json JSONB,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Commands table (device command tracking)
CREATE TABLE IF NOT EXISTS public.commands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  command TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  status public.command_status NOT NULL DEFAULT 'pending',
  req_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  error_message TEXT
);

-- Broker settings table (MQTT broker configs per user)
CREATE TABLE IF NOT EXISTS public.broker_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  url TEXT NOT NULL DEFAULT 'wss://mqtt.saphari.net:8084/mqtt',
  username TEXT,
  password TEXT, -- TODO: Encrypt this
  port INTEGER DEFAULT 8084,
  use_tls BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit logs table (for master/admin actions)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_email TEXT NOT NULL,
  actor_role public.app_role NOT NULL,
  action TEXT NOT NULL,
  resource TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications table (in-app notifications)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
  read BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Simulator circuits table
CREATE TABLE IF NOT EXISTS public.sim_circuits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  json JSONB NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Automation rules table
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('threshold', 'schedule', 'event', 'manual')),
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  conditions JSONB DEFAULT '[]'::jsonb,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  cooldown_seconds INTEGER DEFAULT 300,
  last_triggered_at TIMESTAMPTZ,
  execution_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- User roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Devices indexes
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON public.devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_device_id ON public.devices(device_id);
CREATE INDEX IF NOT EXISTS idx_devices_online ON public.devices(online);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON public.devices(last_seen DESC);

-- Widgets indexes
CREATE INDEX IF NOT EXISTS idx_widgets_device_id ON public.widgets(device_id);
CREATE INDEX IF NOT EXISTS idx_widgets_type ON public.widgets(type);

-- Alerts indexes
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON public.alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_device_id ON public.alerts(device_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_read ON public.alerts(read);
CREATE INDEX IF NOT EXISTS idx_alerts_state ON public.alerts(state);

-- Telemetry indexes (time-series optimized)
CREATE INDEX IF NOT EXISTS idx_telemetry_device_ts ON public.telemetry(device_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_widget_ts ON public.telemetry(widget_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_ts ON public.telemetry(ts DESC);

-- Commands indexes
CREATE INDEX IF NOT EXISTS idx_commands_device_id ON public.commands(device_id);
CREATE INDEX IF NOT EXISTS idx_commands_user_id ON public.commands(user_id);
CREATE INDEX IF NOT EXISTS idx_commands_status ON public.commands(status);
CREATE INDEX IF NOT EXISTS idx_commands_req_id ON public.commands(req_id);
CREATE INDEX IF NOT EXISTS idx_commands_created_at ON public.commands(created_at DESC);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_email ON public.audit_logs(actor_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource);

-- Automation rules indexes
CREATE INDEX IF NOT EXISTS idx_automation_rules_user_id ON public.automation_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_device_id ON public.automation_rules(device_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_enabled ON public.automation_rules(enabled);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.profiles IS 'User profile information extending auth.users';
COMMENT ON TABLE public.user_roles IS 'User roles - SEPARATE from profiles for security';
COMMENT ON TABLE public.devices IS 'IoT devices (ESP32, etc.)';
COMMENT ON TABLE public.widgets IS 'Device widgets (switches, sensors, gauges, servos)';
COMMENT ON TABLE public.alerts IS 'User alert notifications from devices/rules';
COMMENT ON TABLE public.telemetry IS 'Time-series telemetry data from devices';
COMMENT ON TABLE public.commands IS 'Device command tracking with acknowledgment';
COMMENT ON TABLE public.broker_settings IS 'Per-user MQTT broker configuration';
COMMENT ON TABLE public.audit_logs IS 'Audit trail for master/admin actions';
COMMENT ON TABLE public.notifications IS 'In-app user notifications';
COMMENT ON TABLE public.sim_circuits IS 'Saved circuit simulator designs';
COMMENT ON TABLE public.automation_rules IS 'User-defined automation rules';
