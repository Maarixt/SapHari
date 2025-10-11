-- Create OTA updates table for firmware update tracking
CREATE TABLE IF NOT EXISTS ota_updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id TEXT NOT NULL,
    firmware_version TEXT NOT NULL,
    firmware_url TEXT NOT NULL,
    firmware_checksum TEXT,
    firmware_size BIGINT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'downloading', 'installing', 'success', 'failed', 'rollback')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    CONSTRAINT ota_updates_device_id_fkey FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ota_updates_device_id ON ota_updates(device_id);
CREATE INDEX IF NOT EXISTS idx_ota_updates_status ON ota_updates(status);
CREATE INDEX IF NOT EXISTS idx_ota_updates_firmware_version ON ota_updates(firmware_version);
CREATE INDEX IF NOT EXISTS idx_ota_updates_created_at ON ota_updates(created_at);
CREATE INDEX IF NOT EXISTS idx_ota_updates_started_at ON ota_updates(started_at);

-- Create firmware versions table for version management
CREATE TABLE IF NOT EXISTS firmware_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    version TEXT NOT NULL UNIQUE,
    description TEXT,
    release_notes TEXT,
    firmware_url TEXT NOT NULL,
    firmware_checksum TEXT NOT NULL,
    firmware_size BIGINT NOT NULL,
    is_stable BOOLEAN DEFAULT false,
    is_latest BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for firmware versions
CREATE INDEX IF NOT EXISTS idx_firmware_versions_version ON firmware_versions(version);
CREATE INDEX IF NOT EXISTS idx_firmware_versions_is_stable ON firmware_versions(is_stable);
CREATE INDEX IF NOT EXISTS idx_firmware_versions_is_latest ON firmware_versions(is_latest);

-- Create function to get OTA update statistics
CREATE OR REPLACE FUNCTION get_ota_update_stats(device_id_param TEXT DEFAULT NULL)
RETURNS TABLE (
    device_id TEXT,
    total_updates BIGINT,
    successful_updates BIGINT,
    failed_updates BIGINT,
    rollback_updates BIGINT,
    success_rate NUMERIC,
    avg_update_time INTERVAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.device_id,
        COUNT(*) as total_updates,
        COUNT(*) FILTER (WHERE o.status = 'success') as successful_updates,
        COUNT(*) FILTER (WHERE o.status = 'failed') as failed_updates,
        COUNT(*) FILTER (WHERE o.status = 'rollback') as rollback_updates,
        ROUND(
            (COUNT(*) FILTER (WHERE o.status = 'success')::NUMERIC / COUNT(*)) * 100, 
            2
        ) as success_rate,
        AVG(o.completed_at - o.started_at) FILTER (WHERE o.completed_at IS NOT NULL) as avg_update_time
    FROM ota_updates o
    WHERE (device_id_param IS NULL OR o.device_id = device_id_param)
    AND o.created_at > NOW() - INTERVAL '30 days'
    GROUP BY o.device_id
    ORDER BY total_updates DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to get latest firmware version
CREATE OR REPLACE FUNCTION get_latest_firmware_version()
RETURNS TABLE (
    version TEXT,
    description TEXT,
    release_notes TEXT,
    firmware_url TEXT,
    firmware_checksum TEXT,
    firmware_size BIGINT,
    is_stable BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fv.version,
        fv.description,
        fv.release_notes,
        fv.firmware_url,
        fv.firmware_checksum,
        fv.firmware_size,
        fv.is_stable,
        fv.created_at
    FROM firmware_versions fv
    WHERE fv.is_latest = true
    ORDER BY fv.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Create function to get stable firmware versions
CREATE OR REPLACE FUNCTION get_stable_firmware_versions()
RETURNS TABLE (
    version TEXT,
    description TEXT,
    release_notes TEXT,
    firmware_url TEXT,
    firmware_checksum TEXT,
    firmware_size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fv.version,
        fv.description,
        fv.release_notes,
        fv.firmware_url,
        fv.firmware_checksum,
        fv.firmware_size,
        fv.created_at
    FROM firmware_versions fv
    WHERE fv.is_stable = true
    ORDER BY fv.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to update OTA status
CREATE OR REPLACE FUNCTION update_ota_status(
    update_id UUID,
    new_status TEXT,
    new_progress INTEGER DEFAULT NULL,
    error_msg TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE ota_updates 
    SET 
        status = new_status,
        progress = COALESCE(new_progress, progress),
        error_message = COALESCE(error_msg, error_message),
        completed_at = CASE 
            WHEN new_status IN ('success', 'failed', 'rollback') THEN NOW()
            ELSE completed_at
        END
    WHERE id = update_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE ota_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE firmware_versions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ota_updates
CREATE POLICY "Users can view OTA updates for their devices" ON ota_updates
    FOR SELECT USING (
        device_id IN (
            SELECT device_id FROM devices 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert OTA updates for their devices" ON ota_updates
    FOR INSERT WITH CHECK (
        device_id IN (
            SELECT device_id FROM devices 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update OTA updates for their devices" ON ota_updates
    FOR UPDATE USING (
        device_id IN (
            SELECT device_id FROM devices 
            WHERE user_id = auth.uid()
        )
    );

-- Create RLS policies for firmware_versions
CREATE POLICY "Users can view firmware versions" ON firmware_versions
    FOR SELECT USING (true);

CREATE POLICY "Master users can manage firmware versions" ON firmware_versions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'master'
        )
    );

-- Master users can access all OTA updates
CREATE POLICY "Master users can access all OTA updates" ON ota_updates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'master'
        )
    );

-- Create trigger to automatically set is_latest flag
CREATE OR REPLACE FUNCTION update_latest_firmware_flag()
RETURNS TRIGGER AS $$
BEGIN
    -- If this version is marked as latest, unmark all others
    IF NEW.is_latest = true THEN
        UPDATE firmware_versions 
        SET is_latest = false 
        WHERE id != NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_latest_firmware_flag
    AFTER INSERT OR UPDATE ON firmware_versions
    FOR EACH ROW
    EXECUTE FUNCTION update_latest_firmware_flag();
