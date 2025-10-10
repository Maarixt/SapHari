-- Complete fix for Master Dashboard database relationships
-- Run this entire script in Supabase SQL Editor

-- 1. Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  email text UNIQUE,
  display_name text,
  created_at timestamptz DEFAULT now()
);

-- 2. Create devices table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text UNIQUE NOT NULL,
  owner_id uuid NOT NULL,
  name text NOT NULL,
  firmware_version text,
  created_at timestamptz DEFAULT now()
);

-- 3. Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- 4. Create device_status table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.device_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  online boolean DEFAULT false,
  last_seen timestamptz,
  ip text,
  rssi integer,
  battery_pct integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Create alerts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id text,
  device_id text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  title text NOT NULL,
  description text,
  channels text[],
  created_at timestamptz DEFAULT now(),
  acknowledged boolean DEFAULT false,
  seen boolean DEFAULT false
);

-- 6. Create device_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.device_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  level text NOT NULL DEFAULT 'info',
  code text NOT NULL,
  message text,
  meta jsonb,
  created_at timestamptz DEFAULT now()
);

-- 7. Create mqtt_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.mqtt_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text,
  topic text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('pub', 'sub')),
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- 8. Create audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- 9. Remove any existing foreign key constraints
DO $$
BEGIN
  -- Remove devices FK if exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'devices' AND c.conname = 'devices_owner_id_fkey'
  ) THEN
    ALTER TABLE public.devices DROP CONSTRAINT devices_owner_id_fkey;
  END IF;

  -- Remove device_status FK if exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'device_status' AND c.conname = 'device_status_device_fk'
  ) THEN
    ALTER TABLE public.device_status DROP CONSTRAINT device_status_device_fk;
  END IF;
END $$;

-- 10. Add foreign key constraints
ALTER TABLE public.devices
  ADD CONSTRAINT devices_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.device_status
  ADD CONSTRAINT device_status_device_fk
  FOREIGN KEY (device_id) REFERENCES public.devices(device_id) ON DELETE CASCADE;

-- 11. Create indexes
CREATE INDEX IF NOT EXISTS idx_devices_owner_id ON public.devices(owner_id);
CREATE INDEX IF NOT EXISTS idx_device_status_device_id ON public.device_status(device_id);
CREATE INDEX IF NOT EXISTS idx_alerts_device_id ON public.alerts(device_id);
CREATE INDEX IF NOT EXISTS idx_device_events_device_id ON public.device_events(device_id);
CREATE INDEX IF NOT EXISTS idx_mqtt_messages_device_id ON public.mqtt_messages(device_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);

-- 12. Create is_master function
CREATE OR REPLACE FUNCTION public.is_master(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = uid AND role = 'master'
  );
$$;

-- 13. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mqtt_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 14. Create RLS policies for profiles
DROP POLICY IF EXISTS user_read_own_profile ON public.profiles;
CREATE POLICY user_read_own_profile ON public.profiles
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS master_read_all_profiles ON public.profiles;
CREATE POLICY master_read_all_profiles ON public.profiles
  FOR SELECT USING (public.is_master(auth.uid()));

-- 15. Create RLS policies for devices
DROP POLICY IF EXISTS user_read_own_devices ON public.devices;
CREATE POLICY user_read_own_devices ON public.devices
  FOR SELECT USING (owner_id = auth.uid());

DROP POLICY IF EXISTS master_read_all_devices ON public.devices;
CREATE POLICY master_read_all_devices ON public.devices
  FOR SELECT USING (public.is_master(auth.uid()));

-- 16. Create RLS policies for user_roles
DROP POLICY IF EXISTS user_read_own_role ON public.user_roles;
CREATE POLICY user_read_own_role ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS master_read_all_roles ON public.user_roles;
CREATE POLICY master_read_all_roles ON public.user_roles
  FOR SELECT USING (public.is_master(auth.uid()));

-- 17. Create RLS policies for device_status
DROP POLICY IF EXISTS user_read_own_device_status ON public.device_status;
CREATE POLICY user_read_own_device_status ON public.device_status
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.devices 
      WHERE devices.device_id = device_status.device_id 
      AND devices.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS master_read_all_device_status ON public.device_status;
CREATE POLICY master_read_all_device_status ON public.device_status
  FOR SELECT USING (public.is_master(auth.uid()));

-- 18. Create RLS policies for alerts
DROP POLICY IF EXISTS user_read_own_alerts ON public.alerts;
CREATE POLICY user_read_own_alerts ON public.alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.devices 
      WHERE devices.device_id = alerts.device_id 
      AND devices.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS master_read_all_alerts ON public.alerts;
CREATE POLICY master_read_all_alerts ON public.alerts
  FOR SELECT USING (public.is_master(auth.uid()));

-- 19. Create RLS policies for device_events
DROP POLICY IF EXISTS user_read_own_device_events ON public.device_events;
CREATE POLICY user_read_own_device_events ON public.device_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.devices 
      WHERE devices.device_id = device_events.device_id 
      AND devices.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS master_read_all_device_events ON public.device_events;
CREATE POLICY master_read_all_device_events ON public.device_events
  FOR SELECT USING (public.is_master(auth.uid()));

-- 20. Create RLS policies for mqtt_messages
DROP POLICY IF EXISTS user_read_own_mqtt_messages ON public.mqtt_messages;
CREATE POLICY user_read_own_mqtt_messages ON public.mqtt_messages
  FOR SELECT USING (
    device_id IS NULL OR EXISTS (
      SELECT 1 FROM public.devices 
      WHERE devices.device_id = mqtt_messages.device_id 
      AND devices.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS master_read_all_mqtt_messages ON public.mqtt_messages;
CREATE POLICY master_read_all_mqtt_messages ON public.mqtt_messages
  FOR SELECT USING (public.is_master(auth.uid()));

-- 21. Create RLS policies for audit_logs
DROP POLICY IF EXISTS user_read_own_audit_logs ON public.audit_logs;
CREATE POLICY user_read_own_audit_logs ON public.audit_logs
  FOR SELECT USING (actor_id = auth.uid());

DROP POLICY IF EXISTS master_read_all_audit_logs ON public.audit_logs;
CREATE POLICY master_read_all_audit_logs ON public.audit_logs
  FOR SELECT USING (public.is_master(auth.uid()));

-- 22. Create trigger functions for auth sync
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (new.id, new.email, split_part(new.email, '@', 1))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles 
  SET email = new.email,
      display_name = coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  WHERE id = new.id;
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.profiles WHERE id = old.id;
  RETURN old;
END;
$$;

-- 23. Create triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_user_update();

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_user_delete();

-- 24. Create views for master dashboard
CREATE OR REPLACE VIEW public.v_user_device_counts AS
SELECT 
  p.id as user_id,
  p.email,
  p.display_name,
  COUNT(d.id) as device_count
FROM public.profiles p
LEFT JOIN public.devices d ON d.owner_id = p.id
GROUP BY p.id, p.email, p.display_name;

CREATE OR REPLACE VIEW public.v_device_online_counts AS
SELECT 
  COUNT(*) FILTER (WHERE ds.online = true) as devices_online,
  COUNT(*) FILTER (WHERE ds.online = false OR ds.online IS NULL) as devices_offline,
  COUNT(*) as total_devices
FROM public.devices d
LEFT JOIN public.device_status ds ON ds.device_id = d.device_id;

CREATE OR REPLACE VIEW public.v_alerts_24h_summary AS
SELECT 
  severity,
  COUNT(*) as count
FROM public.alerts
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY severity;

CREATE OR REPLACE VIEW public.v_mqtt_last_hour AS
SELECT 
  DATE_TRUNC('minute', created_at) as minute,
  direction,
  COUNT(*) as msg_count
FROM public.mqtt_messages
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY DATE_TRUNC('minute', created_at), direction
ORDER BY minute;

-- 25. Create materialized view for KPIs
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_master_kpis AS
SELECT 
  (SELECT COUNT(*) FROM public.profiles) as total_users,
  (SELECT COUNT(*) FROM public.devices) as total_devices,
  (SELECT devices_online FROM public.v_device_online_counts) as devices_online,
  (SELECT devices_offline FROM public.v_device_online_counts) as devices_offline,
  (SELECT COUNT(*) FROM public.alerts WHERE created_at >= NOW() - INTERVAL '24 hours' AND severity = 'critical') as critical_alerts_24h,
  (SELECT COUNT(*) FROM public.device_events WHERE created_at >= NOW() - INTERVAL '24 hours' AND level = 'error') as errors_24h,
  (SELECT COALESCE(SUM(pg_column_size(payload)), 0) FROM public.mqtt_messages WHERE created_at >= NOW() - INTERVAL '24 hours') as mqtt_bytes_24h,
  (SELECT COUNT(*) FROM public.mqtt_messages WHERE created_at >= NOW() - INTERVAL '24 hours') as mqtt_messages_24h,
  NOW() as generated_at;

-- 26. Create RPC functions
CREATE OR REPLACE FUNCTION public.refresh_mv_master_kpis()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  REFRESH MATERIALIZED VIEW public.mv_master_kpis;
$$;

CREATE OR REPLACE FUNCTION public.get_master_kpis()
RETURNS TABLE (
  total_users bigint,
  total_devices bigint,
  devices_online bigint,
  devices_offline bigint,
  critical_alerts_24h bigint,
  errors_24h bigint,
  mqtt_bytes_24h bigint,
  mqtt_messages_24h bigint,
  generated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM public.mv_master_kpis;
$$;

CREATE OR REPLACE FUNCTION public.get_master_feed(limit_count integer DEFAULT 200)
RETURNS TABLE (
  kind text,
  id uuid,
  device_id text,
  title text,
  code text,
  action text,
  message text,
  ts timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    'alert'::text as kind,
    id,
    device_id,
    title,
    NULL::text as code,
    NULL::text as action,
    description as message,
    created_at as ts
  FROM public.alerts
  WHERE created_at >= NOW() - INTERVAL '24 hours'
  
  UNION ALL
  
  SELECT 
    'event'::text as kind,
    id,
    device_id,
    NULL::text as title,
    code,
    NULL::text as action,
    message,
    created_at as ts
  FROM public.device_events
  WHERE created_at >= NOW() - INTERVAL '24 hours'
  
  UNION ALL
  
  SELECT 
    'audit'::text as kind,
    id,
    NULL::text as device_id,
    action as title,
    NULL::text as code,
    target_type as action,
    details::text as message,
    created_at as ts
  FROM public.audit_logs
  WHERE created_at >= NOW() - INTERVAL '24 hours'
  
  ORDER BY ts DESC
  LIMIT limit_count;
$$;

-- 27. Insert sample data for testing
INSERT INTO public.profiles (id, email, display_name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@example.com', 'Admin User'),
  ('00000000-0000-0000-0000-000000000002', 'user@example.com', 'Test User')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'master'),
  ('00000000-0000-0000-0000-000000000002', 'user')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.devices (device_id, owner_id, name, firmware_version) VALUES
  ('esp32-001', '00000000-0000-0000-0000-000000000001', 'Master Device', '1.0.0'),
  ('esp32-002', '00000000-0000-0000-0000-000000000002', 'User Device', '1.0.0')
ON CONFLICT (device_id) DO NOTHING;

INSERT INTO public.device_status (device_id, online, last_seen) VALUES
  ('esp32-001', true, NOW()),
  ('esp32-002', false, NOW() - INTERVAL '1 hour')
ON CONFLICT (device_id) DO NOTHING;

-- 28. Refresh materialized view
REFRESH MATERIALIZED VIEW public.mv_master_kpis;

-- 29. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- 30. Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Database setup complete! Master dashboard should now work properly.';
  RAISE NOTICE '📊 Created tables: profiles, devices, user_roles, device_status, alerts, device_events, mqtt_messages, audit_logs';
  RAISE NOTICE '🔐 RLS policies created for all tables';
  RAISE NOTICE '🔗 Foreign key relationships established';
  RAISE NOTICE '👤 Sample data inserted for testing';
  RAISE NOTICE '🎯 Master dashboard ready!';
END $$;
