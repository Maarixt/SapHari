-- Comprehensive RLS and RBAC Implementation for SapHari
-- This migration implements row-level security and role-based access control

-- First, ensure we have the user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'admin', 'master')),
    tenant_id TEXT, -- For multi-tenant support
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional role expiration
    is_active BOOLEAN DEFAULT true,
    
    -- Ensure one role per user per tenant
    UNIQUE(user_id, tenant_id, role)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id ON user_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(is_active);

-- Enable RLS on user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- User roles policies
CREATE POLICY "Users can view their own roles" ON user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Master users can view all roles" ON user_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles r 
            WHERE r.user_id = auth.uid() 
            AND r.role = 'master' 
            AND r.is_active = true
        )
    );

CREATE POLICY "Master users can manage all roles" ON user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles r 
            WHERE r.user_id = auth.uid() 
            AND r.role = 'master' 
            AND r.is_active = true
        )
    );

-- =============================================
-- DEVICES TABLE RLS POLICIES
-- =============================================

-- Enable RLS on devices table
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own devices" ON devices;
DROP POLICY IF EXISTS "Users can insert their own devices" ON devices;
DROP POLICY IF EXISTS "Users can update their own devices" ON devices;
DROP POLICY IF EXISTS "Users can delete their own devices" ON devices;
DROP POLICY IF EXISTS "Master users can access all devices" ON devices;

-- User ownership policies
CREATE POLICY "Users can view their own devices" ON devices
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own devices" ON devices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own devices" ON devices
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own devices" ON devices
    FOR DELETE USING (auth.uid() = user_id);

-- Master role policies
CREATE POLICY "Master users can access all devices" ON devices
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles r 
            WHERE r.user_id = auth.uid() 
            AND r.role = 'master' 
            AND r.is_active = true
        )
    );

-- Admin role policies (can access devices in their tenant)
CREATE POLICY "Admin users can access tenant devices" ON devices
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles r 
            WHERE r.user_id = auth.uid() 
            AND r.role = 'admin' 
            AND r.is_active = true
            AND r.tenant_id = devices.tenant_id
        )
    );

-- =============================================
-- COMMANDS TABLE RLS POLICIES
-- =============================================

-- Enable RLS on commands table
ALTER TABLE commands ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view commands for their devices" ON commands;
DROP POLICY IF EXISTS "Users can insert commands for their devices" ON commands;
DROP POLICY IF EXISTS "Users can update commands for their devices" ON commands;
DROP POLICY IF EXISTS "Master users can access all commands" ON commands;

-- User ownership policies
CREATE POLICY "Users can view commands for their devices" ON commands
    FOR SELECT USING (
        device_id IN (
            SELECT device_id FROM devices 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert commands for their devices" ON commands
    FOR INSERT WITH CHECK (
        device_id IN (
            SELECT device_id FROM devices 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update commands for their devices" ON commands
    FOR UPDATE USING (
        device_id IN (
            SELECT device_id FROM devices 
            WHERE user_id = auth.uid()
        )
    );

-- Master role policies
CREATE POLICY "Master users can access all commands" ON commands
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles r 
            WHERE r.user_id = auth.uid() 
            AND r.role = 'master' 
            AND r.is_active = true
        )
    );

-- Admin role policies
CREATE POLICY "Admin users can access tenant commands" ON commands
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles r 
            JOIN devices d ON d.device_id = commands.device_id
            WHERE r.user_id = auth.uid() 
            AND r.role = 'admin' 
            AND r.is_active = true
            AND r.tenant_id = d.tenant_id
        )
    );

-- =============================================
-- FIRMWARE_UPLOADS TABLE RLS POLICIES
-- =============================================

-- Enable RLS on firmware_uploads table
ALTER TABLE firmware_uploads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view firmware uploads for their devices" ON firmware_uploads;
DROP POLICY IF EXISTS "Users can upload firmware for their devices" ON firmware_uploads;
DROP POLICY IF EXISTS "Users can update firmware uploads for their devices" ON firmware_uploads;
DROP POLICY IF EXISTS "Master users can access all firmware uploads" ON firmware_uploads;

-- User ownership policies
CREATE POLICY "Users can view firmware uploads for their devices" ON firmware_uploads
    FOR SELECT USING (
        device_id IN (
            SELECT device_id FROM devices 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can upload firmware for their devices" ON firmware_uploads
    FOR INSERT WITH CHECK (
        device_id IN (
            SELECT device_id FROM devices 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update firmware uploads for their devices" ON firmware_uploads
    FOR UPDATE USING (
        device_id IN (
            SELECT device_id FROM devices 
            WHERE user_id = auth.uid()
        )
    );

-- Master role policies
CREATE POLICY "Master users can access all firmware uploads" ON firmware_uploads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles r 
            WHERE r.user_id = auth.uid() 
            AND r.role = 'master' 
            AND r.is_active = true
        )
    );

-- Admin role policies
CREATE POLICY "Admin users can access tenant firmware uploads" ON firmware_uploads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles r 
            JOIN devices d ON d.device_id = firmware_uploads.device_id
            WHERE r.user_id = auth.uid() 
            AND r.role = 'admin' 
            AND r.is_active = true
            AND r.tenant_id = d.tenant_id
        )
    );

-- =============================================
-- DEVICE_EVENTS TABLE RLS POLICIES (if exists)
-- =============================================

-- Enable RLS on device_events table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'device_events') THEN
        ALTER TABLE device_events ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can view events for their devices" ON device_events;
        DROP POLICY IF EXISTS "Users can insert events for their devices" ON device_events;
        DROP POLICY IF EXISTS "Master users can access all device events" ON device_events;
        
        -- User ownership policies
        CREATE POLICY "Users can view events for their devices" ON device_events
            FOR SELECT USING (
                device_id IN (
                    SELECT device_id FROM devices 
                    WHERE user_id = auth.uid()
                )
            );
        
        CREATE POLICY "Users can insert events for their devices" ON device_events
            FOR INSERT WITH CHECK (
                device_id IN (
                    SELECT device_id FROM devices 
                    WHERE user_id = auth.uid()
                )
            );
        
        -- Master role policies
        CREATE POLICY "Master users can access all device events" ON device_events
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM user_roles r 
                    WHERE r.user_id = auth.uid() 
                    AND r.role = 'master' 
                    AND r.is_active = true
                )
            );
        
        -- Admin role policies
        CREATE POLICY "Admin users can access tenant device events" ON device_events
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM user_roles r 
                    JOIN devices d ON d.device_id = device_events.device_id
                    WHERE r.user_id = auth.uid() 
                    AND r.role = 'admin' 
                    AND r.is_active = true
                    AND r.tenant_id = d.tenant_id
                )
            );
    END IF;
END $$;

-- =============================================
-- STORAGE POLICIES
-- =============================================

-- Firmware storage policies
DROP POLICY IF EXISTS "Users can upload firmware for their devices" ON storage.objects;
DROP POLICY IF EXISTS "Users can view firmware for their devices" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete firmware for their devices" ON storage.objects;
DROP POLICY IF EXISTS "Master users can access all firmware files" ON storage.objects;

CREATE POLICY "Users can upload firmware for their devices" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'firmware' AND
        (storage.foldername(name))[1] IN (
            SELECT device_id FROM devices 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view firmware for their devices" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'firmware' AND
        (storage.foldername(name))[1] IN (
            SELECT device_id FROM devices 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete firmware for their devices" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'firmware' AND
        (storage.foldername(name))[1] IN (
            SELECT device_id FROM devices 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Master users can access all firmware files" ON storage.objects
    FOR ALL USING (
        bucket_id = 'firmware' AND
        EXISTS (
            SELECT 1 FROM user_roles r 
            WHERE r.user_id = auth.uid() 
            AND r.role = 'master' 
            AND r.is_active = true
        )
    );

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to check if user has role
CREATE OR REPLACE FUNCTION user_has_role(role_name TEXT, tenant_id_param TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles r 
        WHERE r.user_id = auth.uid() 
        AND r.role = role_name 
        AND r.is_active = true
        AND (tenant_id_param IS NULL OR r.tenant_id = tenant_id_param)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's roles
CREATE OR REPLACE FUNCTION get_user_roles()
RETURNS TABLE (role TEXT, tenant_id TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT r.role, r.tenant_id
    FROM user_roles r
    WHERE r.user_id = auth.uid() 
    AND r.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user owns device
CREATE OR REPLACE FUNCTION user_owns_device(device_id_param TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM devices d
        WHERE d.device_id = device_id_param
        AND d.user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's tenant ID
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS TEXT AS $$
DECLARE
    tenant_id_result TEXT;
BEGIN
    SELECT r.tenant_id INTO tenant_id_result
    FROM user_roles r
    WHERE r.user_id = auth.uid() 
    AND r.is_active = true
    AND r.tenant_id IS NOT NULL
    LIMIT 1;
    
    RETURN tenant_id_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- ROLE MANAGEMENT FUNCTIONS
-- =============================================

-- Function to grant role to user (master only)
CREATE OR REPLACE FUNCTION grant_user_role(
    target_user_id UUID,
    role_name TEXT,
    tenant_id_param TEXT DEFAULT NULL,
    expires_at_param TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if current user is master
    IF NOT user_has_role('master') THEN
        RAISE EXCEPTION 'Only master users can grant roles';
    END IF;
    
    -- Insert or update role
    INSERT INTO user_roles (user_id, role, tenant_id, granted_by, expires_at)
    VALUES (target_user_id, role_name, tenant_id_param, auth.uid(), expires_at_param)
    ON CONFLICT (user_id, tenant_id, role) 
    DO UPDATE SET 
        is_active = true,
        granted_by = auth.uid(),
        granted_at = NOW(),
        expires_at = expires_at_param;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke role from user (master only)
CREATE OR REPLACE FUNCTION revoke_user_role(
    target_user_id UUID,
    role_name TEXT,
    tenant_id_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if current user is master
    IF NOT user_has_role('master') THEN
        RAISE EXCEPTION 'Only master users can revoke roles';
    END IF;
    
    -- Deactivate role
    UPDATE user_roles 
    SET is_active = false
    WHERE user_id = target_user_id 
    AND role = role_name
    AND (tenant_id_param IS NULL OR tenant_id = tenant_id_param);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- AUDIT LOGGING
-- =============================================

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only master users can view audit logs
CREATE POLICY "Master users can view audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles r 
            WHERE r.user_id = auth.uid() 
            AND r.role = 'master' 
            AND r.is_active = true
        )
    );

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
    action_name TEXT,
    table_name_param TEXT,
    record_id_param TEXT DEFAULT NULL,
    old_values_param JSONB DEFAULT NULL,
    new_values_param JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values
    ) VALUES (
        auth.uid(),
        action_name,
        table_name_param,
        record_id_param,
        old_values_param,
        new_values_param
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- INITIAL DATA SETUP
-- =============================================

-- Create default master role for existing users (if any)
-- This should be run manually for specific users
-- INSERT INTO user_roles (user_id, role, tenant_id) 
-- VALUES ('user-uuid-here', 'master', NULL);

-- =============================================
-- COMMENTS AND DOCUMENTATION
-- =============================================

COMMENT ON TABLE user_roles IS 'User roles and permissions for RBAC system';
COMMENT ON COLUMN user_roles.role IS 'Role name: user, admin, or master';
COMMENT ON COLUMN user_roles.tenant_id IS 'Tenant ID for multi-tenant isolation (NULL for master)';
COMMENT ON COLUMN user_roles.expires_at IS 'Optional role expiration timestamp';

COMMENT ON FUNCTION user_has_role(TEXT, TEXT) IS 'Check if current user has specified role';
COMMENT ON FUNCTION get_user_roles() IS 'Get all roles for current user';
COMMENT ON FUNCTION user_owns_device(TEXT) IS 'Check if current user owns specified device';
COMMENT ON FUNCTION get_user_tenant_id() IS 'Get tenant ID for current user';
COMMENT ON FUNCTION grant_user_role(UUID, TEXT, TEXT, TIMESTAMP WITH TIME ZONE) IS 'Grant role to user (master only)';
COMMENT ON FUNCTION revoke_user_role(UUID, TEXT, TEXT) IS 'Revoke role from user (master only)';
COMMENT ON FUNCTION log_audit_event(TEXT, TEXT, TEXT, JSONB, JSONB) IS 'Log audit event for security tracking';
