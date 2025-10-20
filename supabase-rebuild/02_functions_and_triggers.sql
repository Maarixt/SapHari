-- ============================================================================
-- SapHari Database Functions and Triggers
-- Script: 02_functions_and_triggers.sql
-- Description: Helper functions, triggers, and utility RPCs
-- ============================================================================

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function: Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function: Get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID DEFAULT auth.uid())
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role 
     FROM public.user_roles 
     WHERE user_id = COALESCE(_user_id, auth.uid())
     ORDER BY 
       CASE role
         WHEN 'master' THEN 1
         WHEN 'admin' THEN 2
         WHEN 'developer' THEN 3
         WHEN 'technician' THEN 4
         WHEN 'user' THEN 5
       END
     LIMIT 1),
    'user'::public.app_role
  );
$$;

-- Function: Check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Function: Check if user is master
CREATE OR REPLACE FUNCTION public.is_master(uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = COALESCE(uid, auth.uid())
      AND role = 'master'
  );
$$;

-- Function: Check if user is master (alias for compatibility)
CREATE OR REPLACE FUNCTION public.is_master_user(uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_master(uid);
$$;

-- Function: Check if user can access master features
CREATE OR REPLACE FUNCTION public.can_access_master_features()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_master(auth.uid());
$$;

-- Function: Check if user owns device
CREATE OR REPLACE FUNCTION public.user_owns_device(_device_id UUID, _user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.devices
    WHERE id = _device_id
      AND user_id = COALESCE(_user_id, auth.uid())
  );
$$;

-- Function: Check if user owns widget (through device)
CREATE OR REPLACE FUNCTION public.user_owns_widget(_widget_id UUID, _user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.widgets w
    JOIN public.devices d ON d.id = w.device_id
    WHERE w.id = _widget_id
      AND d.user_id = COALESCE(_user_id, auth.uid())
  );
$$;

-- Function: Get master KPIs (aggregated metrics)
CREATE OR REPLACE FUNCTION public.get_master_kpis()
RETURNS TABLE (
  total_users BIGINT,
  total_devices BIGINT,
  devices_online BIGINT,
  devices_offline BIGINT,
  critical_alerts_24h BIGINT,
  errors_24h BIGINT,
  mqtt_messages_24h BIGINT,
  mqtt_bytes_24h BIGINT,
  generated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is master
  IF NOT public.is_master(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: master role required';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.profiles)::BIGINT AS total_users,
    (SELECT COUNT(*) FROM public.devices)::BIGINT AS total_devices,
    (SELECT COUNT(*) FROM public.devices WHERE online = true)::BIGINT AS devices_online,
    (SELECT COUNT(*) FROM public.devices WHERE online = false)::BIGINT AS devices_offline,
    (SELECT COUNT(*) FROM public.alerts 
     WHERE severity = 'crit' 
       AND created_at > now() - interval '24 hours')::BIGINT AS critical_alerts_24h,
    (SELECT COUNT(*) FROM public.alerts 
     WHERE type = 'error' 
       AND created_at > now() - interval '24 hours')::BIGINT AS errors_24h,
    0::BIGINT AS mqtt_messages_24h, -- Placeholder
    0::BIGINT AS mqtt_bytes_24h, -- Placeholder
    now() AS generated_at;
END;
$$;

-- Function: Log audit event
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _actor_email TEXT,
  _actor_role public.app_role,
  _action TEXT,
  _resource TEXT DEFAULT NULL,
  _details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    actor_email,
    actor_role,
    action,
    resource,
    details,
    ip_address,
    user_agent
  ) VALUES (
    _actor_email,
    _actor_role,
    _action,
    _resource,
    _details,
    current_setting('request.headers', true)::json->>'x-forwarded-for',
    current_setting('request.headers', true)::json->>'user-agent'
  )
  RETURNING id INTO _log_id;
  
  RETURN _log_id;
END;
$$;

-- Function: Create device with automatic key generation
CREATE OR REPLACE FUNCTION public.create_device(
  _device_id TEXT,
  _name TEXT,
  _user_id UUID DEFAULT auth.uid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_device_id UUID;
  _device_key TEXT;
BEGIN
  -- Generate secure device key
  _device_key := encode(gen_random_bytes(16), 'hex');
  
  -- Insert device
  INSERT INTO public.devices (
    device_id,
    device_key,
    name,
    user_id
  ) VALUES (
    _device_id,
    _device_key,
    _name,
    COALESCE(_user_id, auth.uid())
  )
  RETURNING id INTO _new_device_id;
  
  RETURN _new_device_id;
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Auto-update updated_at on profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Auto-update updated_at on user_roles
DROP TRIGGER IF EXISTS update_user_roles_updated_at ON public.user_roles;
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Auto-update updated_at on devices
DROP TRIGGER IF EXISTS update_devices_updated_at ON public.devices;
CREATE TRIGGER update_devices_updated_at
  BEFORE UPDATE ON public.devices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Auto-update updated_at on widgets
DROP TRIGGER IF EXISTS update_widgets_updated_at ON public.widgets;
CREATE TRIGGER update_widgets_updated_at
  BEFORE UPDATE ON public.widgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Auto-update updated_at on broker_settings
DROP TRIGGER IF EXISTS update_broker_settings_updated_at ON public.broker_settings;
CREATE TRIGGER update_broker_settings_updated_at
  BEFORE UPDATE ON public.broker_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Auto-update updated_at on sim_circuits
DROP TRIGGER IF EXISTS update_sim_circuits_updated_at ON public.sim_circuits;
CREATE TRIGGER update_sim_circuits_updated_at
  BEFORE UPDATE ON public.sim_circuits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Auto-update updated_at on automation_rules
DROP TRIGGER IF EXISTS update_automation_rules_updated_at ON public.automation_rules;
CREATE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function: Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Insert default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Create default broker settings
  INSERT INTO public.broker_settings (user_id, url)
  VALUES (NEW.id, 'wss://mqtt.saphari.net:8084/mqtt')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger: Auto-create profile and role on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function: Update command timestamps
CREATE OR REPLACE FUNCTION public.update_command_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update sent_at when status changes to 'sent'
  IF NEW.status = 'sent' AND OLD.status != 'sent' AND NEW.sent_at IS NULL THEN
    NEW.sent_at = now();
  END IF;
  
  -- Update acknowledged_at when status changes to 'acknowledged'
  IF NEW.status = 'acknowledged' AND OLD.status != 'acknowledged' AND NEW.acknowledged_at IS NULL THEN
    NEW.acknowledged_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger: Auto-update command timestamps
DROP TRIGGER IF EXISTS update_commands_timestamps ON public.commands;
CREATE TRIGGER update_commands_timestamps
  BEFORE UPDATE ON public.commands
  FOR EACH ROW
  EXECUTE FUNCTION public.update_command_timestamps();
