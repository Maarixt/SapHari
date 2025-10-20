-- ============================================================================
-- SapHari Database Clean RLS - Clean Rebuild  
-- Drop everything cleanly, then recreate
-- ============================================================================

-- Step 1: Drop all RLS policies first (dependencies)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Step 2: Drop functions with CASCADE
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.is_master_user(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_master_user() CASCADE;
DROP FUNCTION IF EXISTS public.is_master(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_access_master_features() CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;

-- Step 3: Recreate all security functions
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid DEFAULT auth.uid())
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.user_roles 
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

CREATE OR REPLACE FUNCTION public.is_master(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = COALESCE(uid, auth.uid()) 
    AND role = 'master'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_master_user(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_master(uid);
$$;

CREATE OR REPLACE FUNCTION public.can_access_master_features()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_master(auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Step 4: Create clean, consistent RLS policies

-- Profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_select_master" ON public.profiles FOR SELECT USING (public.is_master(auth.uid()));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- User Roles
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_roles_select_master" ON public.user_roles FOR SELECT USING (public.is_master(auth.uid()));
CREATE POLICY "user_roles_insert_master" ON public.user_roles FOR INSERT WITH CHECK (public.is_master(auth.uid()));
CREATE POLICY "user_roles_update_master" ON public.user_roles FOR UPDATE USING (public.is_master(auth.uid()));
CREATE POLICY "user_roles_delete_master" ON public.user_roles FOR DELETE USING (public.is_master(auth.uid()));

-- Devices
CREATE POLICY "devices_select_own" ON public.devices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "devices_select_master" ON public.devices FOR SELECT USING (public.is_master(auth.uid()));
CREATE POLICY "devices_insert_own" ON public.devices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "devices_update_own" ON public.devices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "devices_update_master" ON public.devices FOR UPDATE USING (public.is_master(auth.uid()));
CREATE POLICY "devices_delete_own" ON public.devices FOR DELETE USING (auth.uid() = user_id);

-- Widgets
CREATE POLICY "widgets_select_own" ON public.widgets FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.devices d WHERE d.id = widgets.device_id AND d.user_id = auth.uid())
);
CREATE POLICY "widgets_select_master" ON public.widgets FOR SELECT USING (public.is_master(auth.uid()));
CREATE POLICY "widgets_insert_own" ON public.widgets FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.devices d WHERE d.id = widgets.device_id AND d.user_id = auth.uid())
);
CREATE POLICY "widgets_update_own" ON public.widgets FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.devices d WHERE d.id = widgets.device_id AND d.user_id = auth.uid())
);
CREATE POLICY "widgets_update_master" ON public.widgets FOR UPDATE USING (public.is_master(auth.uid()));
CREATE POLICY "widgets_delete_own" ON public.widgets FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.devices d WHERE d.id = widgets.device_id AND d.user_id = auth.uid())
);

-- Alerts
CREATE POLICY "alerts_select_own" ON public.alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "alerts_select_master" ON public.alerts FOR SELECT USING (public.is_master(auth.uid()));
CREATE POLICY "alerts_insert_own" ON public.alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "alerts_update_own" ON public.alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "alerts_update_master" ON public.alerts FOR UPDATE USING (public.is_master(auth.uid()));
CREATE POLICY "alerts_delete_own" ON public.alerts FOR DELETE USING (auth.uid() = user_id);

-- Telemetry
CREATE POLICY "telemetry_select_own" ON public.telemetry FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.devices d WHERE d.id = telemetry.device_id AND d.user_id = auth.uid())
);
CREATE POLICY "telemetry_select_master" ON public.telemetry FOR SELECT USING (public.is_master(auth.uid()));
CREATE POLICY "telemetry_insert_own" ON public.telemetry FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.devices d WHERE d.id = telemetry.device_id AND d.user_id = auth.uid())
);

-- Commands
CREATE POLICY "commands_select_own" ON public.commands FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "commands_select_master" ON public.commands FOR SELECT USING (public.is_master(auth.uid()));
CREATE POLICY "commands_insert_own" ON public.commands FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (SELECT 1 FROM public.devices d WHERE d.id = commands.device_id AND d.user_id = auth.uid())
);
CREATE POLICY "commands_update_own" ON public.commands FOR UPDATE USING (auth.uid() = user_id);

-- Broker Settings
CREATE POLICY "broker_settings_select_own" ON public.broker_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "broker_settings_select_master" ON public.broker_settings FOR SELECT USING (public.is_master(auth.uid()));
CREATE POLICY "broker_settings_insert_own" ON public.broker_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "broker_settings_update_own" ON public.broker_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "broker_settings_delete_own" ON public.broker_settings FOR DELETE USING (auth.uid() = user_id);

-- Audit Logs
CREATE POLICY "audit_logs_select_master" ON public.audit_logs FOR SELECT USING (public.is_master(auth.uid()));
CREATE POLICY "audit_logs_insert_master" ON public.audit_logs FOR INSERT WITH CHECK (public.is_master(auth.uid()));

-- Notifications
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_select_master" ON public.notifications FOR SELECT USING (public.is_master(auth.uid()));
CREATE POLICY "notifications_insert_own" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notifications_delete_own" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- Sim Circuits
CREATE POLICY "sim_circuits_select_own" ON public.sim_circuits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sim_circuits_select_master" ON public.sim_circuits FOR SELECT USING (public.is_master(auth.uid()));
CREATE POLICY "sim_circuits_insert_own" ON public.sim_circuits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sim_circuits_update_own" ON public.sim_circuits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "sim_circuits_delete_own" ON public.sim_circuits FOR DELETE USING (auth.uid() = user_id);

-- Automation Rules
CREATE POLICY "automation_rules_select_own" ON public.automation_rules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "automation_rules_select_master" ON public.automation_rules FOR SELECT USING (public.is_master(auth.uid()));
CREATE POLICY "automation_rules_insert_own" ON public.automation_rules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "automation_rules_update_own" ON public.automation_rules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "automation_rules_delete_own" ON public.automation_rules FOR DELETE USING (auth.uid() = user_id);