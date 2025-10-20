-- ============================================================================
-- SapHari Row Level Security (RLS) Policies
-- Script: 03_rls_policies.sql
-- Description: Comprehensive RLS policies for all tables
-- ============================================================================

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
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

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

-- Users can view their own profile
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

-- Masters can view all profiles
DROP POLICY IF EXISTS profiles_select_master ON public.profiles;
CREATE POLICY profiles_select_master ON public.profiles
  FOR SELECT
  USING (public.is_master(auth.uid()));

-- Users can insert their own profile (handled by trigger)
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- Users can update their own profile
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE
  USING (id = auth.uid());

-- ============================================================================
-- USER_ROLES POLICIES
-- ============================================================================

-- Users can view their own roles
DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
CREATE POLICY user_roles_select_own ON public.user_roles
  FOR SELECT
  USING (user_id = auth.uid());

-- Masters can view all roles
DROP POLICY IF EXISTS user_roles_select_master ON public.user_roles;
CREATE POLICY user_roles_select_master ON public.user_roles
  FOR SELECT
  USING (public.is_master(auth.uid()));

-- Only masters can insert roles
DROP POLICY IF EXISTS user_roles_insert_master ON public.user_roles;
CREATE POLICY user_roles_insert_master ON public.user_roles
  FOR INSERT
  WITH CHECK (public.is_master(auth.uid()));

-- Only masters can update roles
DROP POLICY IF EXISTS user_roles_update_master ON public.user_roles;
CREATE POLICY user_roles_update_master ON public.user_roles
  FOR UPDATE
  USING (public.is_master(auth.uid()));

-- Only masters can delete roles
DROP POLICY IF EXISTS user_roles_delete_master ON public.user_roles;
CREATE POLICY user_roles_delete_master ON public.user_roles
  FOR DELETE
  USING (public.is_master(auth.uid()));

-- ============================================================================
-- DEVICES POLICIES
-- ============================================================================

-- Users can view their own devices
DROP POLICY IF EXISTS devices_select_own ON public.devices;
CREATE POLICY devices_select_own ON public.devices
  FOR SELECT
  USING (user_id = auth.uid());

-- Masters can view all devices
DROP POLICY IF EXISTS devices_select_master ON public.devices;
CREATE POLICY devices_select_master ON public.devices
  FOR SELECT
  USING (public.is_master(auth.uid()));

-- Users can insert their own devices
DROP POLICY IF EXISTS devices_insert_own ON public.devices;
CREATE POLICY devices_insert_own ON public.devices
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own devices
DROP POLICY IF EXISTS devices_update_own ON public.devices;
CREATE POLICY devices_update_own ON public.devices
  FOR UPDATE
  USING (user_id = auth.uid());

-- Masters can update all devices
DROP POLICY IF EXISTS devices_update_master ON public.devices;
CREATE POLICY devices_update_master ON public.devices
  FOR UPDATE
  USING (public.is_master(auth.uid()));

-- Users can delete their own devices
DROP POLICY IF EXISTS devices_delete_own ON public.devices;
CREATE POLICY devices_delete_own ON public.devices
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- WIDGETS POLICIES
-- ============================================================================

-- Users can view widgets of their own devices
DROP POLICY IF EXISTS widgets_select_own ON public.widgets;
CREATE POLICY widgets_select_own ON public.widgets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.devices d
      WHERE d.id = widgets.device_id
        AND d.user_id = auth.uid()
    )
  );

-- Masters can view all widgets
DROP POLICY IF EXISTS widgets_select_master ON public.widgets;
CREATE POLICY widgets_select_master ON public.widgets
  FOR SELECT
  USING (public.is_master(auth.uid()));

-- Users can insert widgets for their own devices
DROP POLICY IF EXISTS widgets_insert_own ON public.widgets;
CREATE POLICY widgets_insert_own ON public.widgets
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.devices d
      WHERE d.id = widgets.device_id
        AND d.user_id = auth.uid()
    )
  );

-- Users can update their own device widgets
DROP POLICY IF EXISTS widgets_update_own ON public.widgets;
CREATE POLICY widgets_update_own ON public.widgets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.devices d
      WHERE d.id = widgets.device_id
        AND d.user_id = auth.uid()
    )
  );

-- Masters can update all widgets
DROP POLICY IF EXISTS widgets_update_master ON public.widgets;
CREATE POLICY widgets_update_master ON public.widgets
  FOR UPDATE
  USING (public.is_master(auth.uid()));

-- Users can delete their own device widgets
DROP POLICY IF EXISTS widgets_delete_own ON public.widgets;
CREATE POLICY widgets_delete_own ON public.widgets
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.devices d
      WHERE d.id = widgets.device_id
        AND d.user_id = auth.uid()
    )
  );

-- ============================================================================
-- ALERTS POLICIES
-- ============================================================================

-- Users can view their own alerts
DROP POLICY IF EXISTS alerts_select_own ON public.alerts;
CREATE POLICY alerts_select_own ON public.alerts
  FOR SELECT
  USING (user_id = auth.uid());

-- Masters can view all alerts
DROP POLICY IF EXISTS alerts_select_master ON public.alerts;
CREATE POLICY alerts_select_master ON public.alerts
  FOR SELECT
  USING (public.is_master(auth.uid()));

-- Users can insert their own alerts
DROP POLICY IF EXISTS alerts_insert_own ON public.alerts;
CREATE POLICY alerts_insert_own ON public.alerts
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own alerts
DROP POLICY IF EXISTS alerts_update_own ON public.alerts;
CREATE POLICY alerts_update_own ON public.alerts
  FOR UPDATE
  USING (user_id = auth.uid());

-- Masters can update all alerts
DROP POLICY IF EXISTS alerts_update_master ON public.alerts;
  FOR UPDATE
  USING (public.is_master(auth.uid()));

-- Users can delete their own alerts
DROP POLICY IF EXISTS alerts_delete_own ON public.alerts;
CREATE POLICY alerts_delete_own ON public.alerts
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- TELEMETRY POLICIES
-- ============================================================================

-- Users can view telemetry from their own devices
DROP POLICY IF EXISTS telemetry_select_own ON public.telemetry;
CREATE POLICY telemetry_select_own ON public.telemetry
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.devices d
      WHERE d.id = telemetry.device_id
        AND d.user_id = auth.uid()
    )
  );

-- Masters can view all telemetry
DROP POLICY IF EXISTS telemetry_select_master ON public.telemetry;
CREATE POLICY telemetry_select_master ON public.telemetry
  FOR SELECT
  USING (public.is_master(auth.uid()));

-- Users can insert telemetry for their own devices
DROP POLICY IF EXISTS telemetry_insert_own ON public.telemetry;
CREATE POLICY telemetry_insert_own ON public.telemetry
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.devices d
      WHERE d.id = telemetry.device_id
        AND d.user_id = auth.uid()
    )
  );

-- ============================================================================
-- COMMANDS POLICIES
-- ============================================================================

-- Users can view their own commands
DROP POLICY IF EXISTS commands_select_own ON public.commands;
CREATE POLICY commands_select_own ON public.commands
  FOR SELECT
  USING (user_id = auth.uid());

-- Masters can view all commands
DROP POLICY IF EXISTS commands_select_master ON public.commands;
CREATE POLICY commands_select_master ON public.commands
  FOR SELECT
  USING (public.is_master(auth.uid()));

-- Users can insert commands for their own devices
DROP POLICY IF EXISTS commands_insert_own ON public.commands;
CREATE POLICY commands_insert_own ON public.commands
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.devices d
      WHERE d.id = commands.device_id
        AND d.user_id = auth.uid()
    )
  );

-- Users can update their own commands
DROP POLICY IF EXISTS commands_update_own ON public.commands;
CREATE POLICY commands_update_own ON public.commands
  FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================================================
-- BROKER_SETTINGS POLICIES
-- ============================================================================

-- Users can view their own broker settings
DROP POLICY IF EXISTS broker_settings_select_own ON public.broker_settings;
CREATE POLICY broker_settings_select_own ON public.broker_settings
  FOR SELECT
  USING (user_id = auth.uid());

-- Masters can view all broker settings (for debugging)
DROP POLICY IF EXISTS broker_settings_select_master ON public.broker_settings;
CREATE POLICY broker_settings_select_master ON public.broker_settings
  FOR SELECT
  USING (public.is_master(auth.uid()));

-- Users can insert their own broker settings
DROP POLICY IF EXISTS broker_settings_insert_own ON public.broker_settings;
CREATE POLICY broker_settings_insert_own ON public.broker_settings
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own broker settings
DROP POLICY IF EXISTS broker_settings_update_own ON public.broker_settings;
CREATE POLICY broker_settings_update_own ON public.broker_settings
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own broker settings
DROP POLICY IF EXISTS broker_settings_delete_own ON public.broker_settings;
CREATE POLICY broker_settings_delete_own ON public.broker_settings
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- AUDIT_LOGS POLICIES
-- ============================================================================

-- Only masters can view audit logs
DROP POLICY IF EXISTS audit_logs_select_master ON public.audit_logs;
CREATE POLICY audit_logs_select_master ON public.audit_logs
  FOR SELECT
  USING (public.is_master(auth.uid()));

-- Only masters can insert audit logs
DROP POLICY IF EXISTS audit_logs_insert_master ON public.audit_logs;
CREATE POLICY audit_logs_insert_master ON public.audit_logs
  FOR INSERT
  WITH CHECK (public.is_master(auth.uid()));

-- ============================================================================
-- NOTIFICATIONS POLICIES
-- ============================================================================

-- Users can view their own notifications
DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- Masters can view all notifications
DROP POLICY IF EXISTS notifications_select_master ON public.notifications;
CREATE POLICY notifications_select_master ON public.notifications
  FOR SELECT
  USING (public.is_master(auth.uid()));

-- Users can insert their own notifications
DROP POLICY IF EXISTS notifications_insert_own ON public.notifications;
CREATE POLICY notifications_insert_own ON public.notifications
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own notifications
DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own notifications
DROP POLICY IF EXISTS notifications_delete_own ON public.notifications;
CREATE POLICY notifications_delete_own ON public.notifications
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- SIM_CIRCUITS POLICIES
-- ============================================================================

-- Users can view their own circuits
DROP POLICY IF EXISTS sim_circuits_select_own ON public.sim_circuits;
CREATE POLICY sim_circuits_select_own ON public.sim_circuits
  FOR SELECT
  USING (user_id = auth.uid());

-- Masters can view all circuits
DROP POLICY IF EXISTS sim_circuits_select_master ON public.sim_circuits;
CREATE POLICY sim_circuits_select_master ON public.sim_circuits
  FOR SELECT
  USING (public.is_master(auth.uid()));

-- Users can insert their own circuits
DROP POLICY IF EXISTS sim_circuits_insert_own ON public.sim_circuits;
CREATE POLICY sim_circuits_insert_own ON public.sim_circuits
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own circuits
DROP POLICY IF EXISTS sim_circuits_update_own ON public.sim_circuits;
CREATE POLICY sim_circuits_update_own ON public.sim_circuits
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own circuits
DROP POLICY IF EXISTS sim_circuits_delete_own ON public.sim_circuits;
CREATE POLICY sim_circuits_delete_own ON public.sim_circuits
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- AUTOMATION_RULES POLICIES
-- ============================================================================

-- Users can view their own automation rules
DROP POLICY IF EXISTS automation_rules_select_own ON public.automation_rules;
CREATE POLICY automation_rules_select_own ON public.automation_rules
  FOR SELECT
  USING (user_id = auth.uid());

-- Masters can view all automation rules
DROP POLICY IF EXISTS automation_rules_select_master ON public.automation_rules;
CREATE POLICY automation_rules_select_master ON public.automation_rules
  FOR SELECT
  USING (public.is_master(auth.uid()));

-- Users can insert their own automation rules
DROP POLICY IF EXISTS automation_rules_insert_own ON public.automation_rules;
CREATE POLICY automation_rules_insert_own ON public.automation_rules
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own automation rules
DROP POLICY IF EXISTS automation_rules_update_own ON public.automation_rules;
CREATE POLICY automation_rules_update_own ON public.automation_rules
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own automation rules
DROP POLICY IF EXISTS automation_rules_delete_own ON public.automation_rules;
CREATE POLICY automation_rules_delete_own ON public.automation_rules
  FOR DELETE
  USING (user_id = auth.uid());
