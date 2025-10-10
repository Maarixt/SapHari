-- Master Aggregations Schema for SapHari
-- This migration creates tables, views, and functions for fleet-wide monitoring

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Device States Table (for historical tracking)
CREATE TABLE IF NOT EXISTS device_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    state_data JSONB NOT NULL DEFAULT '{}',
    online BOOLEAN NOT NULL DEFAULT false,
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Device Events Table (for all device activities)
CREATE TABLE IF NOT EXISTS device_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'state_change', 'alert_triggered', 'command_sent', 'error_occurred'
    event_data JSONB NOT NULL DEFAULT '{}',
    severity TEXT DEFAULT 'info', -- 'info', 'warning', 'error', 'critical'
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MQTT Traffic Table (for throughput monitoring)
CREATE TABLE IF NOT EXISTS mqtt_traffic (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id TEXT,
    topic TEXT NOT NULL,
    message_size INTEGER NOT NULL DEFAULT 0,
    direction TEXT NOT NULL, -- 'inbound', 'outbound'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- System Errors Table (for error tracking)
CREATE TABLE IF NOT EXISTS system_errors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    context JSONB DEFAULT '{}',
    severity TEXT DEFAULT 'error',
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_device_states_device_id ON device_states(device_id);
CREATE INDEX IF NOT EXISTS idx_device_states_user_id ON device_states(user_id);
CREATE INDEX IF NOT EXISTS idx_device_states_created_at ON device_states(created_at);
CREATE INDEX IF NOT EXISTS idx_device_states_online ON device_states(online);

CREATE INDEX IF NOT EXISTS idx_device_events_device_id ON device_events(device_id);
CREATE INDEX IF NOT EXISTS idx_device_events_user_id ON device_events(user_id);
CREATE INDEX IF NOT EXISTS idx_device_events_type ON device_events(event_type);
CREATE INDEX IF NOT EXISTS idx_device_events_created_at ON device_events(created_at);
CREATE INDEX IF NOT EXISTS idx_device_events_severity ON device_events(severity);

CREATE INDEX IF NOT EXISTS idx_mqtt_traffic_device_id ON mqtt_traffic(device_id);
CREATE INDEX IF NOT EXISTS idx_mqtt_traffic_created_at ON mqtt_traffic(created_at);
CREATE INDEX IF NOT EXISTS idx_mqtt_traffic_direction ON mqtt_traffic(direction);

CREATE INDEX IF NOT EXISTS idx_system_errors_device_id ON system_errors(device_id);
CREATE INDEX IF NOT EXISTS idx_system_errors_user_id ON system_errors(user_id);
CREATE INDEX IF NOT EXISTS idx_system_errors_created_at ON system_errors(created_at);
CREATE INDEX IF NOT EXISTS idx_system_errors_severity ON system_errors(severity);
CREATE INDEX IF NOT EXISTS idx_system_errors_resolved ON system_errors(resolved);

-- Materialized View for Fleet KPIs (refreshed every 5 minutes)
CREATE MATERIALIZED VIEW IF NOT EXISTS fleet_kpis AS
SELECT 
    COUNT(DISTINCT d.id) as total_devices,
    COUNT(DISTINCT CASE WHEN ds.online = true THEN ds.device_id END) as online_devices,
    COUNT(DISTINCT p.id) as total_users,
    COUNT(DISTINCT CASE WHEN p.created_at > NOW() - INTERVAL '24 hours' THEN p.id END) as new_users_24h,
    COUNT(DISTINCT CASE WHEN ds.last_seen > NOW() - INTERVAL '1 hour' THEN ds.device_id END) as active_devices_1h,
    COUNT(DISTINCT CASE WHEN de.event_type = 'alert_triggered' AND de.created_at > NOW() - INTERVAL '24 hours' THEN de.id END) as alerts_24h,
    COUNT(DISTINCT CASE WHEN se.severity = 'critical' AND se.resolved = false THEN se.id END) as critical_errors,
    COALESCE(SUM(mt.message_size), 0) as mqtt_traffic_24h_bytes,
    COUNT(DISTINCT CASE WHEN mt.created_at > NOW() - INTERVAL '24 hours' THEN mt.id END) as mqtt_messages_24h,
    NOW() as last_updated
FROM devices d
LEFT JOIN device_states ds ON d.device_id = ds.device_id
LEFT JOIN profiles p ON d.user_id = p.id
LEFT JOIN device_events de ON d.device_id = de.device_id
LEFT JOIN system_errors se ON d.device_id = se.device_id
LEFT JOIN mqtt_traffic mt ON d.device_id = mt.device_id;

-- Create unique index for materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_fleet_kpis_unique ON fleet_kpis(last_updated);

-- Materialized View for Device Health Summary
CREATE MATERIALIZED VIEW IF NOT EXISTS device_health_summary AS
SELECT 
    d.device_id,
    d.name as device_name,
    d.user_id,
    p.email as owner_email,
    ds.online,
    ds.last_seen,
    CASE 
        WHEN ds.last_seen > NOW() - INTERVAL '5 minutes' THEN 'healthy'
        WHEN ds.last_seen > NOW() - INTERVAL '1 hour' THEN 'warning'
        ELSE 'critical'
    END as health_status,
    COUNT(DISTINCT CASE WHEN de.event_type = 'alert_triggered' AND de.created_at > NOW() - INTERVAL '24 hours' THEN de.id END) as alerts_24h,
    COUNT(DISTINCT CASE WHEN se.severity = 'error' AND se.resolved = false THEN se.id END) as unresolved_errors,
    COALESCE(SUM(CASE WHEN mt.created_at > NOW() - INTERVAL '1 hour' THEN mt.message_size END), 0) as traffic_1h_bytes,
    NOW() as last_updated
FROM devices d
LEFT JOIN device_states ds ON d.device_id = ds.device_id
LEFT JOIN profiles p ON d.user_id = p.id
LEFT JOIN device_events de ON d.device_id = de.device_id
LEFT JOIN system_errors se ON d.device_id = se.device_id
LEFT JOIN mqtt_traffic mt ON d.device_id = mt.device_id
GROUP BY d.device_id, d.name, d.user_id, p.email, ds.online, ds.last_seen;

-- Create unique index for device health summary
CREATE UNIQUE INDEX IF NOT EXISTS idx_device_health_summary_unique ON device_health_summary(device_id, last_updated);

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_fleet_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY fleet_kpis;
    REFRESH MATERIALIZED VIEW CONCURRENTLY device_health_summary;
END;
$$ LANGUAGE plpgsql;

-- Function to get fleet KPIs with time range
CREATE OR REPLACE FUNCTION get_fleet_kpis(time_range INTERVAL DEFAULT '24 hours')
RETURNS TABLE (
    total_devices BIGINT,
    online_devices BIGINT,
    total_users BIGINT,
    new_users_24h BIGINT,
    active_devices_1h BIGINT,
    alerts_24h BIGINT,
    critical_errors BIGINT,
    mqtt_traffic_24h_bytes BIGINT,
    mqtt_messages_24h BIGINT,
    uptime_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fk.total_devices,
        fk.online_devices,
        fk.total_users,
        fk.new_users_24h,
        fk.active_devices_1h,
        fk.alerts_24h,
        fk.critical_errors,
        fk.mqtt_traffic_24h_bytes,
        fk.mqtt_messages_24h,
        CASE 
            WHEN fk.total_devices > 0 THEN 
                ROUND((fk.online_devices::NUMERIC / fk.total_devices::NUMERIC) * 100, 2)
            ELSE 0
        END as uptime_percentage
    FROM fleet_kpis fk
    WHERE fk.last_updated > NOW() - INTERVAL '10 minutes';
END;
$$ LANGUAGE plpgsql;

-- Function to get device health with filters
CREATE OR REPLACE FUNCTION get_device_health(
    health_filter TEXT DEFAULT 'all',
    limit_count INTEGER DEFAULT 100,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    device_id TEXT,
    device_name TEXT,
    owner_email TEXT,
    online BOOLEAN,
    last_seen TIMESTAMPTZ,
    health_status TEXT,
    alerts_24h BIGINT,
    unresolved_errors BIGINT,
    traffic_1h_bytes BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dhs.device_id,
        dhs.device_name,
        dhs.owner_email,
        dhs.online,
        dhs.last_seen,
        dhs.health_status,
        dhs.alerts_24h,
        dhs.unresolved_errors,
        dhs.traffic_1h_bytes
    FROM device_health_summary dhs
    WHERE 
        CASE 
            WHEN health_filter = 'healthy' THEN dhs.health_status = 'healthy'
            WHEN health_filter = 'warning' THEN dhs.health_status = 'warning'
            WHEN health_filter = 'critical' THEN dhs.health_status = 'critical'
            ELSE true
        END
    ORDER BY 
        CASE dhs.health_status
            WHEN 'critical' THEN 1
            WHEN 'warning' THEN 2
            WHEN 'healthy' THEN 3
        END,
        dhs.last_seen DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get recent events with pagination
CREATE OR REPLACE FUNCTION get_recent_events(
    event_types TEXT[] DEFAULT ARRAY['alert_triggered', 'error_occurred'],
    limit_count INTEGER DEFAULT 50,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    device_id TEXT,
    device_name TEXT,
    owner_email TEXT,
    event_type TEXT,
    severity TEXT,
    message TEXT,
    event_data JSONB,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        de.id,
        de.device_id,
        d.name as device_name,
        p.email as owner_email,
        de.event_type,
        de.severity,
        de.message,
        de.event_data,
        de.created_at
    FROM device_events de
    LEFT JOIN devices d ON de.device_id = d.device_id
    LEFT JOIN profiles p ON de.user_id = p.id
    WHERE 
        de.event_type = ANY(event_types)
    ORDER BY de.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get MQTT traffic statistics
CREATE OR REPLACE FUNCTION get_mqtt_traffic_stats(time_range INTERVAL DEFAULT '24 hours')
RETURNS TABLE (
    total_messages BIGINT,
    total_bytes BIGINT,
    inbound_messages BIGINT,
    outbound_messages BIGINT,
    inbound_bytes BIGINT,
    outbound_bytes BIGINT,
    top_devices JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_messages,
        COALESCE(SUM(message_size), 0) as total_bytes,
        COUNT(CASE WHEN direction = 'inbound' THEN 1 END) as inbound_messages,
        COUNT(CASE WHEN direction = 'outbound' THEN 1 END) as outbound_messages,
        COALESCE(SUM(CASE WHEN direction = 'inbound' THEN message_size END), 0) as inbound_bytes,
        COALESCE(SUM(CASE WHEN direction = 'outbound' THEN message_size END), 0) as outbound_bytes,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'device_id', device_id,
                    'message_count', message_count,
                    'total_bytes', total_bytes
                ) ORDER BY message_count DESC
            ) FILTER (WHERE device_id IS NOT NULL),
            '[]'::jsonb
        ) as top_devices
    FROM (
        SELECT 
            device_id,
            COUNT(*) as message_count,
            SUM(message_size) as total_bytes
        FROM mqtt_traffic
        WHERE created_at > NOW() - time_range
        GROUP BY device_id
        ORDER BY message_count DESC
        LIMIT 10
    ) top_devices_stats
    CROSS JOIN (
        SELECT COUNT(*) as total_messages, SUM(message_size) as total_bytes
        FROM mqtt_traffic
        WHERE created_at > NOW() - time_range
    ) totals;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for master access
ALTER TABLE device_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE mqtt_traffic ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_errors ENABLE ROW LEVEL SECURITY;

-- Master can read all data
CREATE POLICY "Master can read all device states" ON device_states
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'master'
        )
    );

CREATE POLICY "Master can read all device events" ON device_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'master'
        )
    );

CREATE POLICY "Master can read all MQTT traffic" ON mqtt_traffic
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'master'
        )
    );

CREATE POLICY "Master can read all system errors" ON system_errors
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'master'
        )
    );

-- Users can read their own data
CREATE POLICY "Users can read own device states" ON device_states
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can read own device events" ON device_events
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can read own system errors" ON system_errors
    FOR SELECT USING (user_id = auth.uid());

-- Insert policies for data collection
CREATE POLICY "Allow device state inserts" ON device_states
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow device event inserts" ON device_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow MQTT traffic inserts" ON mqtt_traffic
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow system error inserts" ON system_errors
    FOR INSERT WITH CHECK (true);

-- Create a scheduled job to refresh materialized views (requires pg_cron extension)
-- This would be set up in production with pg_cron
-- SELECT cron.schedule('refresh-fleet-views', '*/5 * * * *', 'SELECT refresh_fleet_views();');

-- Grant permissions
GRANT SELECT ON fleet_kpis TO authenticated;
GRANT SELECT ON device_health_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_fleet_kpis TO authenticated;
GRANT EXECUTE ON FUNCTION get_device_health TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_events TO authenticated;
GRANT EXECUTE ON FUNCTION get_mqtt_traffic_stats TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_fleet_views TO authenticated;
