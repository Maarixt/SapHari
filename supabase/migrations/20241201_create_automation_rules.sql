-- Automation Rule Engine Database Schema
-- This migration creates the automation rules system with JSON schema support

-- Create automation rules table
CREATE TABLE IF NOT EXISTS automation_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT REFERENCES devices(device_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    condition JSONB NOT NULL, -- Rule condition schema
    action JSONB NOT NULL,    -- Rule action schema
    active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0, -- Higher number = higher priority
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_triggered TIMESTAMP WITH TIME ZONE,
    trigger_count INTEGER DEFAULT 0,
    
    -- Indexes for performance
    CONSTRAINT automation_rules_name_check CHECK (length(name) > 0)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_automation_rules_user_id ON automation_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_device_id ON automation_rules(device_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_active ON automation_rules(active);
CREATE INDEX IF NOT EXISTS idx_automation_rules_priority ON automation_rules(priority DESC);
CREATE INDEX IF NOT EXISTS idx_automation_rules_created_at ON automation_rules(created_at);

-- Create rule execution log table
CREATE TABLE IF NOT EXISTS rule_executions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rule_id UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    condition_data JSONB NOT NULL, -- Data that triggered the rule
    action_result JSONB,           -- Result of the action
    success BOOLEAN NOT NULL,
    error_message TEXT,
    execution_time_ms INTEGER,     -- How long the rule took to execute
    
    -- Indexes for performance
    CONSTRAINT rule_executions_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES automation_rules(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rule_executions_rule_id ON rule_executions(rule_id);
CREATE INDEX IF NOT EXISTS idx_rule_executions_device_id ON rule_executions(device_id);
CREATE INDEX IF NOT EXISTS idx_rule_executions_triggered_at ON rule_executions(triggered_at);
CREATE INDEX IF NOT EXISTS idx_rule_executions_success ON rule_executions(success);

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT REFERENCES devices(device_id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('critical', 'warning', 'info', 'success')),
    channels JSONB NOT NULL DEFAULT '["email"]', -- ["email", "push", "sms", "slack"]
    enabled BOOLEAN DEFAULT true,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '08:00:00',
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one preference per user per device per type
    UNIQUE(user_id, device_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_device_id ON notification_preferences(device_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_type ON notification_preferences(notification_type);

-- Create push notification subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    -- Ensure one subscription per user per endpoint
    UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active);

-- Create notification log table
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT REFERENCES devices(device_id) ON DELETE CASCADE,
    rule_id UUID REFERENCES automation_rules(id) ON DELETE SET NULL,
    notification_type TEXT NOT NULL,
    channel TEXT NOT NULL, -- email, push, sms, slack
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    success BOOLEAN NOT NULL,
    error_message TEXT,
    metadata JSONB,
    
    -- Indexes for performance
    CONSTRAINT notification_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_device_id ON notification_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_success ON notification_logs(success);

-- Enable RLS on all tables
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- AUTOMATION RULES RLS POLICIES
-- =============================================

-- User ownership policies
CREATE POLICY "Users can view their own automation rules" ON automation_rules
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own automation rules" ON automation_rules
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own automation rules" ON automation_rules
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own automation rules" ON automation_rules
    FOR DELETE USING (auth.uid() = user_id);

-- Master role policies
CREATE POLICY "Master users can access all automation rules" ON automation_rules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles r 
            WHERE r.user_id = auth.uid() 
            AND r.role = 'master' 
            AND r.is_active = true
        )
    );

-- Admin role policies
CREATE POLICY "Admin users can access tenant automation rules" ON automation_rules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles r 
            JOIN devices d ON d.device_id = automation_rules.device_id
            WHERE r.user_id = auth.uid() 
            AND r.role = 'admin' 
            AND r.is_active = true
            AND r.tenant_id = d.tenant_id
        )
    );

-- =============================================
-- RULE EXECUTIONS RLS POLICIES
-- =============================================

CREATE POLICY "Users can view executions for their rules" ON rule_executions
    FOR SELECT USING (
        rule_id IN (
            SELECT id FROM automation_rules 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Master users can view all rule executions" ON rule_executions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles r 
            WHERE r.user_id = auth.uid() 
            AND r.role = 'master' 
            AND r.is_active = true
        )
    );

-- =============================================
-- NOTIFICATION PREFERENCES RLS POLICIES
-- =============================================

CREATE POLICY "Users can manage their own notification preferences" ON notification_preferences
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Master users can access all notification preferences" ON notification_preferences
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles r 
            WHERE r.user_id = auth.uid() 
            AND r.role = 'master' 
            AND r.is_active = true
        )
    );

-- =============================================
-- PUSH SUBSCRIPTIONS RLS POLICIES
-- =============================================

CREATE POLICY "Users can manage their own push subscriptions" ON push_subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- NOTIFICATION LOGS RLS POLICIES
-- =============================================

CREATE POLICY "Users can view their own notification logs" ON notification_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Master users can view all notification logs" ON notification_logs
    FOR SELECT USING (
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

-- Function to update rule trigger count and last triggered
CREATE OR REPLACE FUNCTION update_rule_triggered(rule_id_param UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE automation_rules 
    SET 
        last_triggered = NOW(),
        trigger_count = trigger_count + 1,
        updated_at = NOW()
    WHERE id = rule_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active rules for a device
CREATE OR REPLACE FUNCTION get_active_rules_for_device(device_id_param TEXT)
RETURNS TABLE (
    id UUID,
    name TEXT,
    condition JSONB,
    action JSONB,
    priority INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.name,
        r.condition,
        r.action,
        r.priority
    FROM automation_rules r
    WHERE r.device_id = device_id_param
    AND r.active = true
    ORDER BY r.priority DESC, r.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get notification preferences for user
CREATE OR REPLACE FUNCTION get_notification_preferences(user_id_param UUID, device_id_param TEXT DEFAULT NULL)
RETURNS TABLE (
    notification_type TEXT,
    channels JSONB,
    enabled BOOLEAN,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    timezone TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        np.notification_type,
        np.channels,
        np.enabled,
        np.quiet_hours_start,
        np.quiet_hours_end,
        np.timezone
    FROM notification_preferences np
    WHERE np.user_id = user_id_param
    AND (device_id_param IS NULL OR np.device_id = device_id_param)
    AND np.enabled = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if notification should be sent (considering quiet hours)
CREATE OR REPLACE FUNCTION should_send_notification(
    user_id_param UUID,
    notification_type_param TEXT,
    device_id_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    pref RECORD;
    current_time TIME;
    user_timezone TEXT;
BEGIN
    -- Get user's notification preferences
    SELECT * INTO pref
    FROM notification_preferences
    WHERE user_id = user_id_param
    AND notification_type = notification_type_param
    AND (device_id_param IS NULL OR device_id = device_id_param)
    AND enabled = true
    LIMIT 1;
    
    -- If no preferences found, default to sending
    IF NOT FOUND THEN
        RETURN true;
    END IF;
    
    -- Check quiet hours
    current_time := CURRENT_TIME;
    user_timezone := COALESCE(pref.timezone, 'UTC');
    
    -- If current time is within quiet hours, don't send
    IF pref.quiet_hours_start > pref.quiet_hours_end THEN
        -- Quiet hours span midnight
        IF current_time >= pref.quiet_hours_start OR current_time <= pref.quiet_hours_end THEN
            RETURN false;
        END IF;
    ELSE
        -- Normal quiet hours
        IF current_time >= pref.quiet_hours_start AND current_time <= pref.quiet_hours_end THEN
            RETURN false;
        END IF;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log notification
CREATE OR REPLACE FUNCTION log_notification(
    user_id_param UUID,
    device_id_param TEXT,
    rule_id_param UUID,
    notification_type_param TEXT,
    channel_param TEXT,
    title_param TEXT,
    message_param TEXT,
    success_param BOOLEAN,
    error_message_param TEXT DEFAULT NULL,
    metadata_param JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO notification_logs (
        user_id,
        device_id,
        rule_id,
        notification_type,
        channel,
        title,
        message,
        success,
        error_message,
        metadata
    ) VALUES (
        user_id_param,
        device_id_param,
        rule_id_param,
        notification_type_param,
        channel_param,
        title_param,
        message_param,
        success_param,
        error_message_param,
        metadata_param
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_automation_rules_updated_at 
    BEFORE UPDATE ON automation_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at 
    BEFORE UPDATE ON notification_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- COMMENTS AND DOCUMENTATION
-- =============================================

COMMENT ON TABLE automation_rules IS 'Automation rules with JSON condition and action schemas';
COMMENT ON COLUMN automation_rules.condition IS 'JSON schema defining rule conditions (WHEN)';
COMMENT ON COLUMN automation_rules.action IS 'JSON schema defining rule actions (THEN)';
COMMENT ON COLUMN automation_rules.priority IS 'Rule execution priority (higher number = higher priority)';

COMMENT ON TABLE rule_executions IS 'Log of all rule executions for audit and debugging';
COMMENT ON TABLE notification_preferences IS 'User notification preferences and quiet hours';
COMMENT ON TABLE push_subscriptions IS 'Web push notification subscriptions';
COMMENT ON TABLE notification_logs IS 'Log of all notifications sent for audit trail';

COMMENT ON FUNCTION get_active_rules_for_device(TEXT) IS 'Get all active automation rules for a specific device';
COMMENT ON FUNCTION should_send_notification(UUID, TEXT, TEXT) IS 'Check if notification should be sent considering quiet hours';
COMMENT ON FUNCTION log_notification(UUID, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, JSONB) IS 'Log notification for audit trail';
