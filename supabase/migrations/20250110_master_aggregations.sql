-- Master Aggregations Schema for SapHari
-- Comprehensive fleet monitoring and diagnostics database schema

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ======= CORE TABLES =======

-- DEVICES
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  firmware_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DEVICE STATUS (latest heartbeat per device)
CREATE TABLE IF NOT EXISTS device_status (
  device_id TEXT REFERENCES devices(device_id) ON DELETE CASCADE,
  online BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  ip TEXT,
  rssi INT,
  battery_pct NUMERIC,
  CONSTRAINT device_status_pk PRIMARY KEY (device_id)
);

-- MQTT MESSAGES (lightweight envelope for activity/throughput)
CREATE TABLE IF NOT EXISTS mqtt_messages (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT,
  topic TEXT NOT NULL,
  direction TEXT CHECK (direction IN ('pub','sub')) NOT NULL,
  payload JSONB,
  ts TIMESTAMPTZ DEFAULT NOW()
);

-- EVENTS (device-originated "event" channel: info/warn/error)
CREATE TABLE IF NOT EXISTS device_events (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  level TEXT CHECK (level IN ('info','warn','error','critical')) NOT NULL,
  code TEXT,
  message TEXT,
  meta JSONB,
  ts TIMESTAMPTZ DEFAULT NOW()
);

-- ALERTS (rule engine outputs; can reference event or threshold breach)
CREATE TABLE IF NOT EXISTS alerts (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  rule_id TEXT,
  severity TEXT CHECK (severity IN ('low','medium','high','critical')) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES profiles(id),
  ts TIMESTAMPTZ DEFAULT NOW()
);

-- AUDIT LOGS (admin/master actions, role changes, device transfers, etc.)
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  target_type TEXT,        -- 'user' | 'device' | 'system'
  target_id TEXT,          -- profile id or device_id or system key
  details JSONB,
  ts TIMESTAMPTZ DEFAULT NOW()
);

-- ======= INDEXES FOR PERFORMANCE =======

-- Devices indexes
CREATE INDEX IF NOT EXISTS idx_devices_owner_id ON devices(owner_id);
CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);
CREATE INDEX IF NOT EXISTS idx_devices_created_at ON devices(created_at);

-- Device status indexes
CREATE INDEX IF NOT EXISTS idx_device_status_online ON device_status(online);
CREATE INDEX IF NOT EXISTS idx_device_status_last_seen ON device_status(last_seen);

-- MQTT messages indexes
CREATE INDEX IF NOT EXISTS idx_mqtt_messages_device_id ON mqtt_messages(device_id);
CREATE INDEX IF NOT EXISTS idx_mqtt_messages_ts ON mqtt_messages(ts);
CREATE INDEX IF NOT EXISTS idx_mqtt_messages_direction ON mqtt_messages(direction);
CREATE INDEX IF NOT EXISTS idx_mqtt_messages_topic ON mqtt_messages(topic);

-- Device events indexes
CREATE INDEX IF NOT EXISTS idx_device_events_device_id ON device_events(device_id);
CREATE INDEX IF NOT EXISTS idx_device_events_ts ON device_events(ts);
CREATE INDEX IF NOT EXISTS idx_device_events_level ON device_events(level);
CREATE INDEX IF NOT EXISTS idx_device_events_code ON device_events(code);

-- Alerts indexes
CREATE INDEX IF NOT EXISTS idx_alerts_device_id ON alerts(device_id);
CREATE INDEX IF NOT EXISTS idx_alerts_ts ON alerts(ts);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_alerts_rule_id ON alerts(rule_id);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ts ON audit_logs(ts);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_type ON audit_logs(target_type);

-- ======= AGGREGATION VIEWS =======

-- Per-user device counts
CREATE OR REPLACE VIEW v_user_device_counts AS
SELECT
  p.id AS user_id,
  p.email,
  COUNT(d.*) AS device_count
FROM profiles p
LEFT JOIN devices d ON d.owner_id = p.id
GROUP BY p.id, p.email;

-- Online/Offline counts
CREATE OR REPLACE VIEW v_device_online_counts AS
SELECT
  SUM(CASE WHEN ds.online THEN 1 ELSE 0 END) AS online_count,
  SUM(CASE WHEN NOT ds.online THEN 1 ELSE 0 END) AS offline_count,
  COUNT(*) AS total_count
FROM device_status ds;

-- Alerts summary last 24h
CREATE OR REPLACE VIEW v_alerts_24h_summary AS
SELECT
  severity,
  COUNT(*) AS count
FROM alerts
WHERE ts > NOW() - INTERVAL '24 hours'
GROUP BY severity
ORDER BY
  CASE severity
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    ELSE 4
  END;

-- MQTT throughput (messages/min) last hour
CREATE OR REPLACE VIEW v_mqtt_last_hour AS
SELECT
  DATE_TRUNC('minute', ts) AS minute,
  direction,
  COUNT(*) AS msg_count
FROM mqtt_messages
WHERE ts > NOW() - INTERVAL '60 minutes'
GROUP BY minute, direction
ORDER BY minute ASC;

-- Device health summary
CREATE OR REPLACE VIEW v_device_health AS
SELECT
  d.device_id,
  d.name,
  d.owner_id,
  p.email AS owner_email,
  ds.online,
  ds.last_seen,
  ds.ip,
  ds.rssi,
  ds.battery_pct,
  CASE 
    WHEN ds.last_seen > NOW() - INTERVAL '5 minutes' THEN 'healthy'
    WHEN ds.last_seen > NOW() - INTERVAL '1 hour' THEN 'warning'
    ELSE 'critical'
  END AS health_status,
  COALESCE(alert_counts.alert_count, 0) AS alerts_24h,
  COALESCE(error_counts.error_count, 0) AS errors_24h
FROM devices d
LEFT JOIN device_status ds ON d.device_id = ds.device_id
LEFT JOIN profiles p ON d.owner_id = p.id
LEFT JOIN (
  SELECT device_id, COUNT(*) AS alert_count
  FROM alerts
  WHERE ts > NOW() - INTERVAL '24 hours'
  GROUP BY device_id
) alert_counts ON d.device_id = alert_counts.device_id
LEFT JOIN (
  SELECT device_id, COUNT(*) AS error_count
  FROM device_events
  WHERE level IN ('error', 'critical') AND ts > NOW() - INTERVAL '24 hours'
  GROUP BY device_id
) error_counts ON d.device_id = error_counts.device_id;

-- ======= MATERIALIZED VIEWS =======

-- Materialized fleet KPIs (fast load for master)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_master_kpis AS
SELECT
  (SELECT COUNT(*) FROM profiles) AS total_users,
  (SELECT COUNT(*) FROM devices) AS total_devices,
  (SELECT online_count FROM v_device_online_counts) AS devices_online,
  (SELECT offline_count FROM v_device_online_counts) AS devices_offline,
  (SELECT COUNT(*) FROM alerts WHERE severity IN ('high','critical') AND ts > NOW() - INTERVAL '24 hours') AS critical_alerts_24h,
  (SELECT COUNT(*) FROM device_events WHERE level IN ('error','critical') AND ts > NOW() - INTERVAL '24 hours') AS errors_24h,
  (SELECT COUNT(*) FROM mqtt_messages WHERE ts > NOW() - INTERVAL '24 hours') AS mqtt_messages_24h,
  (SELECT COALESCE(SUM(LENGTH(payload::text)), 0) FROM mqtt_messages WHERE ts > NOW() - INTERVAL '24 hours') AS mqtt_bytes_24h,
  NOW() AS generated_at;

-- Create unique index for materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_master_kpis_unique ON mv_master_kpis(generated_at);

-- ======= HELPER FUNCTIONS =======

-- Master role detection
CREATE OR REPLACE FUNCTION is_master(uid UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = uid AND ur.role = 'master'
  );
$$;

-- Refresh helper for materialized views
CREATE OR REPLACE FUNCTION refresh_mv_master_kpis()
RETURNS VOID LANGUAGE SQL SECURITY DEFINER AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_master_kpis;
$$;

-- ======= RPC FUNCTIONS =======

-- RPC to return the single KPI row (most recent)
CREATE OR REPLACE FUNCTION get_master_kpis()
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
) LANGUAGE SQL STABLE AS $$
  SELECT * FROM mv_master_kpis;
$$;

-- Recent feed for dashboard (alerts + events + audits)
CREATE OR REPLACE FUNCTION get_master_feed(limit_count INT DEFAULT 100)
RETURNS TABLE (
  kind TEXT,
  device_id TEXT,
  level TEXT,
  title TEXT,
  message TEXT,
  actor_email TEXT,
  ts TIMESTAMPTZ
) LANGUAGE SQL STABLE AS $$
  WITH a AS (
    SELECT 'alert'::TEXT AS kind, a.device_id, a.severity AS level, a.title, COALESCE(a.description,'') AS message, NULL::TEXT AS actor_email, a.ts
    FROM alerts a
  ), e AS (
    SELECT 'event'::TEXT AS kind, e.device_id, e.level, COALESCE(e.code,'event') AS title, COALESCE(e.message,'') AS message, NULL::TEXT AS actor_email, e.ts
    FROM device_events e
  ), u AS (
    SELECT 'audit'::TEXT AS kind, NULL::TEXT AS device_id, 'info' AS level, al.action AS title, COALESCE(al.details::TEXT,'') AS message, p.email AS actor_email, al.ts
    FROM audit_logs al
    LEFT JOIN profiles p ON p.id = al.actor_id
  )
  SELECT * FROM a
  UNION ALL SELECT * FROM e
  UNION ALL SELECT * FROM u
  ORDER BY ts DESC
  LIMIT limit_count;
$$;

-- Get device health with filtering
CREATE OR REPLACE FUNCTION get_device_health(
  health_filter TEXT DEFAULT 'all',
  limit_count INT DEFAULT 100,
  offset_count INT DEFAULT 0
)
RETURNS TABLE (
  device_id TEXT,
  name TEXT,
  owner_email TEXT,
  online BOOLEAN,
  last_seen TIMESTAMPTZ,
  health_status TEXT,
  alerts_24h BIGINT,
  errors_24h BIGINT
) LANGUAGE SQL STABLE AS $$
  SELECT 
    vh.device_id,
    vh.name,
    vh.owner_email,
    vh.online,
    vh.last_seen,
    vh.health_status,
    vh.alerts_24h,
    vh.errors_24h
  FROM v_device_health vh
  WHERE 
    CASE 
      WHEN health_filter = 'healthy' THEN vh.health_status = 'healthy'
      WHEN health_filter = 'warning' THEN vh.health_status = 'warning'
      WHEN health_filter = 'critical' THEN vh.health_status = 'critical'
      ELSE TRUE
    END
  ORDER BY 
    CASE vh.health_status
      WHEN 'critical' THEN 1
      WHEN 'warning' THEN 2
      WHEN 'healthy' THEN 3
    END,
    vh.last_seen DESC
  LIMIT limit_count
  OFFSET offset_count;
$$;

-- Get MQTT traffic statistics
CREATE OR REPLACE FUNCTION get_mqtt_traffic_stats(time_range INTERVAL DEFAULT '24 hours')
RETURNS TABLE (
  total_messages BIGINT,
  total_bytes BIGINT,
  inbound_messages BIGINT,
  outbound_messages BIGINT,
  inbound_bytes BIGINT,
  outbound_bytes BIGINT,
  top_devices JSONB
) LANGUAGE SQL STABLE AS $$
  SELECT 
    COUNT(*) AS total_messages,
    COALESCE(SUM(LENGTH(payload::TEXT)), 0) AS total_bytes,
    COUNT(CASE WHEN direction = 'sub' THEN 1 END) AS inbound_messages,
    COUNT(CASE WHEN direction = 'pub' THEN 1 END) AS outbound_messages,
    COALESCE(SUM(CASE WHEN direction = 'sub' THEN LENGTH(payload::TEXT) END), 0) AS inbound_bytes,
    COALESCE(SUM(CASE WHEN direction = 'pub' THEN LENGTH(payload::TEXT) END), 0) AS outbound_bytes,
    COALESCE(
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'device_id', device_id,
          'message_count', message_count,
          'total_bytes', total_bytes
        ) ORDER BY message_count DESC
      ) FILTER (WHERE device_id IS NOT NULL),
      '[]'::JSONB
    ) AS top_devices
  FROM (
    SELECT 
      device_id,
      COUNT(*) AS message_count,
      SUM(LENGTH(payload::TEXT)) AS total_bytes
    FROM mqtt_messages
    WHERE ts > NOW() - time_range
    GROUP BY device_id
    ORDER BY message_count DESC
    LIMIT 10
  ) top_devices_stats
  CROSS JOIN (
    SELECT COUNT(*) AS total_messages, SUM(LENGTH(payload::TEXT)) AS total_bytes
    FROM mqtt_messages
    WHERE ts > NOW() - time_range
  ) totals;
$$;

-- ======= ROW LEVEL SECURITY =======

-- Enable RLS on all tables
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE mqtt_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ======= RLS POLICIES =======

-- Devices policies
CREATE POLICY user_read_own_devices ON devices
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY master_read_all_devices ON devices
  FOR SELECT USING (is_master(auth.uid()));

CREATE POLICY user_insert_own_devices ON devices
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY master_insert_devices ON devices
  FOR INSERT WITH CHECK (is_master(auth.uid()));

CREATE POLICY user_update_own_devices ON devices
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY master_update_all_devices ON devices
  FOR UPDATE USING (is_master(auth.uid()));

CREATE POLICY user_delete_own_devices ON devices
  FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY master_delete_all_devices ON devices
  FOR DELETE USING (is_master(auth.uid()));

-- Device status policies
CREATE POLICY user_read_own_device_status ON device_status
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM devices d 
      WHERE d.device_id = device_status.device_id 
      AND d.owner_id = auth.uid()
    )
  );

CREATE POLICY master_read_all_device_status ON device_status
  FOR SELECT USING (is_master(auth.uid()));

CREATE POLICY user_update_own_device_status ON device_status
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM devices d 
      WHERE d.device_id = device_status.device_id 
      AND d.owner_id = auth.uid()
    )
  );

CREATE POLICY master_update_all_device_status ON device_status
  FOR UPDATE USING (is_master(auth.uid()));

CREATE POLICY allow_device_status_insert ON device_status
  FOR INSERT WITH CHECK (TRUE);

-- MQTT messages policies
CREATE POLICY user_read_own_mqtt_messages ON mqtt_messages
  FOR SELECT USING (
    device_id IS NULL OR EXISTS (
      SELECT 1 FROM devices d 
      WHERE d.device_id = mqtt_messages.device_id 
      AND d.owner_id = auth.uid()
    )
  );

CREATE POLICY master_read_all_mqtt_messages ON mqtt_messages
  FOR SELECT USING (is_master(auth.uid()));

CREATE POLICY allow_mqtt_messages_insert ON mqtt_messages
  FOR INSERT WITH CHECK (TRUE);

-- Device events policies
CREATE POLICY user_read_own_device_events ON device_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM devices d 
      WHERE d.device_id = device_events.device_id 
      AND d.owner_id = auth.uid()
    )
  );

CREATE POLICY master_read_all_device_events ON device_events
  FOR SELECT USING (is_master(auth.uid()));

CREATE POLICY allow_device_events_insert ON device_events
  FOR INSERT WITH CHECK (TRUE);

-- Alerts policies
CREATE POLICY user_read_own_alerts ON alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM devices d 
      WHERE d.device_id = alerts.device_id 
      AND d.owner_id = auth.uid()
    )
  );

CREATE POLICY master_read_all_alerts ON alerts
  FOR SELECT USING (is_master(auth.uid()));

CREATE POLICY allow_alerts_insert ON alerts
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY user_update_own_alerts ON alerts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM devices d 
      WHERE d.device_id = alerts.device_id 
      AND d.owner_id = auth.uid()
    )
  );

CREATE POLICY master_update_all_alerts ON alerts
  FOR UPDATE USING (is_master(auth.uid()));

-- Audit logs policies
CREATE POLICY user_read_own_audit_logs ON audit_logs
  FOR SELECT USING (actor_id = auth.uid());

CREATE POLICY master_read_all_audit_logs ON audit_logs
  FOR SELECT USING (is_master(auth.uid()));

CREATE POLICY allow_audit_logs_insert ON audit_logs
  FOR INSERT WITH CHECK (TRUE);

-- ======= GRANTS =======

-- Grant permissions to authenticated users
GRANT SELECT ON v_user_device_counts TO authenticated;
GRANT SELECT ON v_device_online_counts TO authenticated;
GRANT SELECT ON v_alerts_24h_summary TO authenticated;
GRANT SELECT ON v_mqtt_last_hour TO authenticated;
GRANT SELECT ON v_device_health TO authenticated;
GRANT SELECT ON mv_master_kpis TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_master_kpis() TO authenticated;
GRANT EXECUTE ON FUNCTION get_master_feed(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_device_health(TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mqtt_traffic_stats(INTERVAL) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_mv_master_kpis() TO authenticated;
GRANT EXECUTE ON FUNCTION is_master(UUID) TO authenticated;

-- ======= INITIAL DATA =======

-- Insert initial materialized view data
INSERT INTO mv_master_kpis 
SELECT 
  (SELECT COUNT(*) FROM profiles) AS total_users,
  (SELECT COUNT(*) FROM devices) AS total_devices,
  (SELECT online_count FROM v_device_online_counts) AS devices_online,
  (SELECT offline_count FROM v_device_online_counts) AS devices_offline,
  (SELECT COUNT(*) FROM alerts WHERE severity IN ('high','critical') AND ts > NOW() - INTERVAL '24 hours') AS critical_alerts_24h,
  (SELECT COUNT(*) FROM device_events WHERE level IN ('error','critical') AND ts > NOW() - INTERVAL '24 hours') AS errors_24h,
  (SELECT COUNT(*) FROM mqtt_messages WHERE ts > NOW() - INTERVAL '24 hours') AS mqtt_messages_24h,
  (SELECT COALESCE(SUM(LENGTH(payload::TEXT)), 0) FROM mqtt_messages WHERE ts > NOW() - INTERVAL '24 hours') AS mqtt_bytes_24h,
  NOW() AS generated_at;

-- ======= COMMENTS =======

COMMENT ON TABLE devices IS 'Device registry with ownership and metadata';
COMMENT ON TABLE device_status IS 'Current online/offline status and health metrics per device';
COMMENT ON TABLE mqtt_messages IS 'MQTT message traffic for throughput monitoring';
COMMENT ON TABLE device_events IS 'Device-originated events (info/warn/error/critical)';
COMMENT ON TABLE alerts IS 'Alert rule engine outputs with acknowledgment tracking';
COMMENT ON TABLE audit_logs IS 'Admin/master actions and system changes audit trail';

COMMENT ON MATERIALIZED VIEW mv_master_kpis IS 'Fleet-wide KPIs for master dashboard (refreshed periodically)';
COMMENT ON FUNCTION get_master_kpis() IS 'Returns current fleet KPIs for master dashboard';
COMMENT ON FUNCTION get_master_feed(INT) IS 'Returns recent alerts, events, and audit logs for master feed';
COMMENT ON FUNCTION get_device_health(TEXT, INT, INT) IS 'Returns device health with filtering and pagination';
COMMENT ON FUNCTION get_mqtt_traffic_stats(INTERVAL) IS 'Returns MQTT traffic statistics for specified time range';
COMMENT ON FUNCTION is_master(UUID) IS 'Helper function to check if user has master role';
