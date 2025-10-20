-- ============================================================================
-- SapHari Complete Database Rebuild - Single File
-- Run this entire file in Supabase SQL Editor to rebuild your database
-- ============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('user', 'technician', 'developer', 'admin', 'master');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.alert_severity AS ENUM ('info', 'warn', 'crit');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.alert_state AS ENUM ('open', 'ack', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.command_status AS ENUM ('pending', 'sent', 'acknowledged', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

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

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

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

CREATE TABLE IF NOT EXISTS public.broker_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  url TEXT NOT NULL DEFAULT 'wss://mqtt.saphari.net:8084/mqtt',
  username TEXT,
  password TEXT,
  port INTEGER DEFAULT 8084,
  use_tls BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON public.devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_device_id ON public.devices(device_id);
CREATE INDEX IF NOT EXISTS idx_devices_online ON public.devices(online);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON public.devices(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_widgets_device_id ON public.widgets(device_id);
CREATE INDEX IF NOT EXISTS idx_widgets_type ON public.widgets(type);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON public.alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_device_id ON public.alerts(device_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_read ON public.alerts(read);
CREATE INDEX IF NOT EXISTS idx_alerts_state ON public.alerts(state);
CREATE INDEX IF NOT EXISTS idx_telemetry_device_ts ON public.telemetry(device_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_widget_ts ON public.telemetry(widget_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_ts ON public.telemetry(ts DESC);
CREATE INDEX IF NOT EXISTS idx_commands_device_id ON public.commands(device_id);
CREATE INDEX IF NOT EXISTS idx_commands_user_id ON public.commands(user_id);
CREATE INDEX IF NOT EXISTS idx_commands_status ON public.commands(status);
CREATE INDEX IF NOT EXISTS idx_commands_req_id ON public.commands(req_id);
CREATE INDEX IF NOT EXISTS idx_commands_created_at ON public.commands(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_email ON public.audit_logs(actor_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_automation_rules_user_id ON public.automation_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_device_id ON public.automation_rules(device_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_enabled ON public.automation_rules(enabled);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_user_role(check_user_id uuid)
RETURNS public.app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles 
  WHERE user_id = check_user_id 
  ORDER BY 
    CASE role
      WHEN 'master' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'developer' THEN 3
      WHEN 'technician' THEN 4
      WHEN 'user' THEN 5
    END
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_master_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'master'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_master_features()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('master', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_roles_updated_at ON public.user_roles;
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_devices_updated_at ON public.devices;
CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON public.devices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_widgets_updated_at ON public.widgets;
CREATE TRIGGER update_widgets_updated_at BEFORE UPDATE ON public.widgets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_broker_settings_updated_at ON public.broker_settings;
CREATE TRIGGER update_broker_settings_updated_at BEFORE UPDATE ON public.broker_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sim_circuits_updated_at ON public.sim_circuits;
CREATE TRIGGER update_sim_circuits_updated_at BEFORE UPDATE ON public.sim_circuits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_automation_rules_updated_at ON public.automation_rules;
CREATE TRIGGER update_automation_rules_updated_at BEFORE UPDATE ON public.automation_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sim_circuits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Masters can view all profiles" ON public.profiles;
CREATE POLICY "Masters can view all profiles" ON public.profiles FOR SELECT USING (public.is_master_user());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles policies
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Masters can view all roles" ON public.user_roles;
CREATE POLICY "Masters can view all roles" ON public.user_roles FOR SELECT USING (public.is_master_user());

DROP POLICY IF EXISTS "Masters can manage roles" ON public.user_roles;
CREATE POLICY "Masters can manage roles" ON public.user_roles FOR ALL USING (public.is_master_user());

-- Devices policies
DROP POLICY IF EXISTS "Users can view own devices" ON public.devices;
CREATE POLICY "Users can view own devices" ON public.devices FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Masters can view all devices" ON public.devices;
CREATE POLICY "Masters can view all devices" ON public.devices FOR SELECT USING (public.is_master_user());

DROP POLICY IF EXISTS "Users can insert own devices" ON public.devices;
CREATE POLICY "Users can insert own devices" ON public.devices FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own devices" ON public.devices;
CREATE POLICY "Users can update own devices" ON public.devices FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own devices" ON public.devices;
CREATE POLICY "Users can delete own devices" ON public.devices FOR DELETE USING (auth.uid() = user_id);

-- Widgets policies
DROP POLICY IF EXISTS "Users can view own widgets" ON public.widgets;
CREATE POLICY "Users can view own widgets" ON public.widgets FOR SELECT USING (
  auth.uid() IN (SELECT user_id FROM public.devices WHERE id = widgets.device_id)
);

DROP POLICY IF EXISTS "Users can insert own widgets" ON public.widgets;
CREATE POLICY "Users can insert own widgets" ON public.widgets FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT user_id FROM public.devices WHERE id = widgets.device_id)
);

DROP POLICY IF EXISTS "Users can update own widgets" ON public.widgets;
CREATE POLICY "Users can update own widgets" ON public.widgets FOR UPDATE USING (
  auth.uid() IN (SELECT user_id FROM public.devices WHERE id = widgets.device_id)
);

DROP POLICY IF EXISTS "Users can delete own widgets" ON public.widgets;
CREATE POLICY "Users can delete own widgets" ON public.widgets FOR DELETE USING (
  auth.uid() IN (SELECT user_id FROM public.devices WHERE id = widgets.device_id)
);

-- Alerts policies
DROP POLICY IF EXISTS "Users can view own alerts" ON public.alerts;
CREATE POLICY "Users can view own alerts" ON public.alerts FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own alerts" ON public.alerts;
CREATE POLICY "Users can insert own alerts" ON public.alerts FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own alerts" ON public.alerts;
CREATE POLICY "Users can update own alerts" ON public.alerts FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own alerts" ON public.alerts;
CREATE POLICY "Users can delete own alerts" ON public.alerts FOR DELETE USING (auth.uid() = user_id);

-- Telemetry policies
DROP POLICY IF EXISTS "Users can view own telemetry" ON public.telemetry;
CREATE POLICY "Users can view own telemetry" ON public.telemetry FOR SELECT USING (
  auth.uid() IN (SELECT user_id FROM public.devices WHERE id = telemetry.device_id)
);

DROP POLICY IF EXISTS "Users can insert own telemetry" ON public.telemetry;
CREATE POLICY "Users can insert own telemetry" ON public.telemetry FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT user_id FROM public.devices WHERE id = telemetry.device_id)
);

-- Commands policies
DROP POLICY IF EXISTS "Users can view own commands" ON public.commands;
CREATE POLICY "Users can view own commands" ON public.commands FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own commands" ON public.commands;
CREATE POLICY "Users can insert own commands" ON public.commands FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own commands" ON public.commands;
CREATE POLICY "Users can update own commands" ON public.commands FOR UPDATE USING (auth.uid() = user_id);

-- Broker settings policies
DROP POLICY IF EXISTS "Users can view own broker settings" ON public.broker_settings;
CREATE POLICY "Users can view own broker settings" ON public.broker_settings FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own broker settings" ON public.broker_settings;
CREATE POLICY "Users can insert own broker settings" ON public.broker_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own broker settings" ON public.broker_settings;
CREATE POLICY "Users can update own broker settings" ON public.broker_settings FOR UPDATE USING (auth.uid() = user_id);

-- Notifications policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Sim circuits policies
DROP POLICY IF EXISTS "Users can view own circuits" ON public.sim_circuits;
CREATE POLICY "Users can view own circuits" ON public.sim_circuits FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own circuits" ON public.sim_circuits;
CREATE POLICY "Users can insert own circuits" ON public.sim_circuits FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own circuits" ON public.sim_circuits;
CREATE POLICY "Users can update own circuits" ON public.sim_circuits FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own circuits" ON public.sim_circuits;
CREATE POLICY "Users can delete own circuits" ON public.sim_circuits FOR DELETE USING (auth.uid() = user_id);

-- Automation rules policies
DROP POLICY IF EXISTS "Users can view own rules" ON public.automation_rules;
CREATE POLICY "Users can view own rules" ON public.automation_rules FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own rules" ON public.automation_rules;
CREATE POLICY "Users can insert own rules" ON public.automation_rules FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own rules" ON public.automation_rules;
CREATE POLICY "Users can update own rules" ON public.automation_rules FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own rules" ON public.automation_rules;
CREATE POLICY "Users can delete own rules" ON public.automation_rules FOR DELETE USING (auth.uid() = user_id);

-- Audit logs (master only)
DROP POLICY IF EXISTS "Masters can view audit logs" ON public.audit_logs;
CREATE POLICY "Masters can view audit logs" ON public.audit_logs FOR SELECT USING (public.is_master_user());

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Database rebuild complete!';
  RAISE NOTICE '📝 Next step: Assign master role to your user';
  RAISE NOTICE 'Run: INSERT INTO public.user_roles (user_id, role) VALUES (''YOUR_USER_ID'', ''master'');';
END $$;
