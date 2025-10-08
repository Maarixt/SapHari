-- Master Account System Migration
-- This migration creates the role-based access control system with Master Account functionality

-- Create custom types for user roles
CREATE TYPE user_role AS ENUM ('master', 'admin', 'developer', 'technician', 'user');

-- Create audit log table for tracking all master account actions
CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT,
  details TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for audit log queries
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Add role column to profiles table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE profiles ADD COLUMN role user_role DEFAULT 'user';
  END IF;
END $$;

-- Add master account specific fields to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_master BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS master_permissions JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_master_login TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending', 'locked'));

-- Create master account sessions table
CREATE TABLE master_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for session cleanup
CREATE INDEX idx_master_sessions_expires_at ON master_sessions(expires_at);
CREATE INDEX idx_master_sessions_user_id ON master_sessions(user_id);

-- Create system settings table for master account configuration
CREATE TABLE system_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create feature flags table for master account control
CREATE TABLE feature_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT FALSE,
  description TEXT,
  target_users JSONB DEFAULT '[]', -- Array of user IDs or roles
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create master account notifications table
CREATE TABLE master_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
  target_roles JSONB DEFAULT '[]', -- Array of roles to notify
  target_users JSONB DEFAULT '[]', -- Array of specific user IDs
  global BOOLEAN DEFAULT FALSE, -- Send to all users
  created_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create master account actions table for tracking critical operations
CREATE TABLE master_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL, -- 'user', 'device', 'system', etc.
  target_id TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  requires_confirmation BOOLEAN DEFAULT FALSE,
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES auth.users(id)
);

-- Create index for master actions queries
CREATE INDEX idx_master_actions_performed_by ON master_actions(performed_by);
CREATE INDEX idx_master_actions_performed_at ON master_actions(performed_at DESC);
CREATE INDEX idx_master_actions_target ON master_actions(target_type, target_id);

-- Insert default master account (this would be created during initial setup)
-- Note: In production, this should be done through a secure setup process
INSERT INTO system_settings (key, value, description) VALUES
('master_accounts', '["master@saphari.com", "root@integron.com", "admin@saphari.io"]', 'List of authorized master account emails'),
('maintenance_mode', 'false', 'System maintenance mode flag'),
('simulator_enabled', 'true', 'ESP32 simulator availability'),
('beta_features_enabled', 'false', 'Beta features availability'),
('audit_retention_days', '365', 'How long to keep audit logs'),
('max_login_attempts', '5', 'Maximum login attempts before lockout'),
('session_timeout_minutes', '480', 'Master session timeout in minutes');

-- Insert default feature flags
INSERT INTO feature_flags (name, enabled, description) VALUES
('esp32_simulator', true, 'ESP32 Circuit Simulator'),
('mqtt_bridge', true, 'MQTT Bridge functionality'),
('device_management', true, 'Device management features'),
('user_management', true, 'User management features'),
('data_export', true, 'Data export functionality'),
('beta_components', false, 'Beta component library'),
('advanced_analytics', false, 'Advanced analytics dashboard');

-- Create RLS policies for audit logs (only master accounts can read)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master accounts can view all audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'master'
    )
  );

CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- Create RLS policies for master sessions
ALTER TABLE master_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own master sessions" ON master_sessions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can manage master sessions" ON master_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'master'
    )
  );

-- Create RLS policies for system settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master accounts can manage system settings" ON system_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'master'
    )
  );

-- Create RLS policies for feature flags
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master accounts can manage feature flags" ON feature_flags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'master'
    )
  );

CREATE POLICY "Users can view enabled feature flags" ON feature_flags
  FOR SELECT USING (enabled = true);

-- Create RLS policies for master notifications
ALTER TABLE master_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master accounts can manage notifications" ON master_notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'master'
    )
  );

CREATE POLICY "Users can view their notifications" ON master_notifications
  FOR SELECT USING (
    global = true OR 
    auth.uid()::text = ANY(SELECT jsonb_array_elements_text(target_users)) OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role::text = ANY(SELECT jsonb_array_elements_text(target_roles))
    )
  );

-- Create RLS policies for master actions
ALTER TABLE master_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master accounts can view all master actions" ON master_actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'master'
    )
  );

CREATE POLICY "System can insert master actions" ON master_actions
  FOR INSERT WITH CHECK (true);

-- Create function to log master account actions
CREATE OR REPLACE FUNCTION log_master_action(
  p_action TEXT,
  p_resource TEXT DEFAULT NULL,
  p_details TEXT DEFAULT NULL,
  p_target_type TEXT DEFAULT NULL,
  p_target_id TEXT DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_action_id UUID;
  v_user_role user_role;
BEGIN
  -- Get current user role
  SELECT role INTO v_user_role FROM profiles WHERE id = auth.uid();
  
  -- Only allow master accounts to log actions
  IF v_user_role != 'master' THEN
    RAISE EXCEPTION 'Only master accounts can log actions';
  END IF;
  
  -- Insert into audit log
  INSERT INTO audit_logs (user_id, user_email, action, resource, details, ip_address)
  VALUES (
    auth.uid()::text,
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    p_action,
    p_resource,
    p_details,
    inet_client_addr()
  );
  
  -- Insert into master actions if target specified
  IF p_target_type IS NOT NULL AND p_target_id IS NOT NULL THEN
    INSERT INTO master_actions (
      action_type, target_type, target_id, old_values, new_values, 
      performed_by, ip_address, user_agent
    ) VALUES (
      p_action, p_target_type, p_target_id, p_old_values, p_new_values,
      auth.uid(), inet_client_addr(), current_setting('request.headers', true)::json->>'user-agent'
    ) RETURNING id INTO v_action_id;
  END IF;
  
  RETURN v_action_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is master account
CREATE OR REPLACE FUNCTION is_master_account(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND role = 'master'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(user_id UUID DEFAULT auth.uid())
RETURNS JSONB AS $$
DECLARE
  v_role user_role;
  v_permissions JSONB;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = user_id;
  
  -- Return permissions based on role
  CASE v_role
    WHEN 'master' THEN
      v_permissions := '{
        "canViewUsers": true, "canCreateUsers": true, "canEditUsers": true, "canDeleteUsers": true,
        "canManageRoles": true, "canSuspendUsers": true, "canViewAllDevices": true,
        "canCreateDevices": true, "canEditDevices": true, "canDeleteDevices": true,
        "canReassignDevices": true, "canForceDeviceReset": true, "canUpdateFirmware": true,
        "canViewAllData": true, "canExportData": true, "canAccessRawLogs": true,
        "canManageDataRetention": true, "canAccessSystemSettings": true,
        "canManageAPIKeys": true, "canDeployUpdates": true, "canAccessServerLogs": true,
        "canEnableMaintenanceMode": true, "canSendGlobalNotifications": true,
        "canPostSystemUpdates": true, "canManageIntegrations": true,
        "canAccessSimulator": true, "canManageFeatureFlags": true,
        "canAccessCodeEditor": true, "canManageBetaFeatures": true,
        "canManageEncryption": true, "canAccessAuditLogs": true,
        "canOverrideSecurity": true
      }';
    WHEN 'admin' THEN
      v_permissions := '{
        "canViewUsers": true, "canCreateUsers": true, "canEditUsers": true, "canDeleteUsers": false,
        "canManageRoles": false, "canSuspendUsers": true, "canViewAllDevices": true,
        "canCreateDevices": true, "canEditDevices": true, "canDeleteDevices": false,
        "canReassignDevices": false, "canForceDeviceReset": false, "canUpdateFirmware": false,
        "canViewAllData": true, "canExportData": true, "canAccessRawLogs": false,
        "canManageDataRetention": false, "canAccessSystemSettings": false,
        "canManageAPIKeys": false, "canDeployUpdates": false, "canAccessServerLogs": false,
        "canEnableMaintenanceMode": false, "canSendGlobalNotifications": true,
        "canPostSystemUpdates": false, "canManageIntegrations": false,
        "canAccessSimulator": true, "canManageFeatureFlags": false,
        "canAccessCodeEditor": false, "canManageBetaFeatures": false,
        "canManageEncryption": false, "canAccessAuditLogs": true,
        "canOverrideSecurity": false
      }';
    ELSE
      v_permissions := '{
        "canViewUsers": false, "canCreateUsers": false, "canEditUsers": false, "canDeleteUsers": false,
        "canManageRoles": false, "canSuspendUsers": false, "canViewAllDevices": false,
        "canCreateDevices": true, "canEditDevices": true, "canDeleteDevices": true,
        "canReassignDevices": false, "canForceDeviceReset": false, "canUpdateFirmware": false,
        "canViewAllData": false, "canExportData": false, "canAccessRawLogs": false,
        "canManageDataRetention": false, "canAccessSystemSettings": false,
        "canManageAPIKeys": false, "canDeployUpdates": false, "canAccessServerLogs": false,
        "canEnableMaintenanceMode": false, "canSendGlobalNotifications": false,
        "canPostSystemUpdates": false, "canManageIntegrations": false,
        "canAccessSimulator": false, "canManageFeatureFlags": false,
        "canAccessCodeEditor": false, "canManageBetaFeatures": false,
        "canManageEncryption": false, "canAccessAuditLogs": false,
        "canOverrideSecurity": false
      }';
  END CASE;
  
  RETURN v_permissions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically log profile changes
CREATE OR REPLACE FUNCTION log_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the change if it's a role change or status change
  IF OLD.role IS DISTINCT FROM NEW.role OR OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM log_master_action(
      'PROFILE_UPDATED',
      'profile:' || NEW.id,
      'Role changed from ' || COALESCE(OLD.role::text, 'null') || ' to ' || COALESCE(NEW.role::text, 'null') ||
      ', Status changed from ' || COALESCE(OLD.status, 'null') || ' to ' || COALESCE(NEW.status, 'null'),
      'profile',
      NEW.id::text,
      jsonb_build_object('role', OLD.role, 'status', OLD.status),
      jsonb_build_object('role', NEW.role, 'status', NEW.status)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profile_changes_audit
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_profile_changes();

-- Create cleanup function for expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS VOID AS $$
BEGIN
  DELETE FROM master_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up expired sessions (this would be set up in pg_cron or similar)
-- SELECT cron.schedule('cleanup-sessions', '0 * * * *', 'SELECT cleanup_expired_sessions();');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON master_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON system_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON feature_flags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON master_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON master_actions TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION log_master_action TO authenticated;
GRANT EXECUTE ON FUNCTION is_master_account TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_permissions TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_sessions TO authenticated;
