-- Create commands table for reliable command acknowledgment
CREATE TABLE IF NOT EXISTS commands (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id TEXT NOT NULL,
    cmd_id TEXT NOT NULL UNIQUE,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'acknowledged', 'failed', 'timeout')),
    retries INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    last_attempt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '5 minutes'),
    
    -- Indexes for performance
    CONSTRAINT commands_device_id_fkey FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_commands_device_id ON commands(device_id);
CREATE INDEX IF NOT EXISTS idx_commands_status ON commands(status);
CREATE INDEX IF NOT EXISTS idx_commands_cmd_id ON commands(cmd_id);
CREATE INDEX IF NOT EXISTS idx_commands_created_at ON commands(created_at);
CREATE INDEX IF NOT EXISTS idx_commands_expires_at ON commands(expires_at);

-- Create function to clean up expired commands
CREATE OR REPLACE FUNCTION cleanup_expired_commands()
RETURNS void AS $$
BEGIN
    UPDATE commands 
    SET status = 'timeout' 
    WHERE status IN ('pending', 'sent') 
    AND expires_at < NOW();
    
    -- Delete commands older than 24 hours
    DELETE FROM commands 
    WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Create function to get command statistics
CREATE OR REPLACE FUNCTION get_command_stats(device_id_param TEXT DEFAULT NULL)
RETURNS TABLE (
    device_id TEXT,
    total_commands BIGINT,
    successful_commands BIGINT,
    failed_commands BIGINT,
    timeout_commands BIGINT,
    success_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.device_id,
        COUNT(*) as total_commands,
        COUNT(*) FILTER (WHERE c.status = 'acknowledged') as successful_commands,
        COUNT(*) FILTER (WHERE c.status = 'failed') as failed_commands,
        COUNT(*) FILTER (WHERE c.status = 'timeout') as timeout_commands,
        ROUND(
            (COUNT(*) FILTER (WHERE c.status = 'acknowledged')::NUMERIC / COUNT(*)) * 100, 
            2
        ) as success_rate
    FROM commands c
    WHERE (device_id_param IS NULL OR c.device_id = device_id_param)
    AND c.created_at > NOW() - INTERVAL '24 hours'
    GROUP BY c.device_id
    ORDER BY total_commands DESC;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE commands ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
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

-- Master users can access all commands
CREATE POLICY "Master users can access all commands" ON commands
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'master'
        )
    );
