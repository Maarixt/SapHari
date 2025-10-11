-- Create firmware storage bucket for OTA updates
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'firmware',
  'firmware',
  false, -- Private bucket for security
  10485760, -- 10MB file size limit
  ARRAY['application/octet-stream', 'application/x-binary']
);

-- Create firmware_uploads table for tracking OTA updates
CREATE TABLE IF NOT EXISTS firmware_uploads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    checksum_sha256 TEXT NOT NULL,
    version TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'deployed', 'failed', 'rollback')),
    uploaded_by UUID REFERENCES auth.users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deployed_at TIMESTAMP WITH TIME ZONE,
    deployed_to_device_at TIMESTAMP WITH TIME ZONE,
    rollback_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    -- Indexes for performance
    CONSTRAINT firmware_uploads_device_id_fkey FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_firmware_uploads_device_id ON firmware_uploads(device_id);
CREATE INDEX IF NOT EXISTS idx_firmware_uploads_status ON firmware_uploads(status);
CREATE INDEX IF NOT EXISTS idx_firmware_uploads_uploaded_at ON firmware_uploads(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_firmware_uploads_checksum ON firmware_uploads(checksum_sha256);

-- Create function to generate signed URLs for firmware downloads
CREATE OR REPLACE FUNCTION generate_firmware_signed_url(
    file_path TEXT,
    expires_in_seconds INTEGER DEFAULT 3600
)
RETURNS TEXT AS $$
DECLARE
    signed_url TEXT;
BEGIN
    -- Generate signed URL for private bucket access
    SELECT storage.create_signed_url('firmware', file_path, expires_in_seconds) INTO signed_url;
    RETURN signed_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get firmware upload statistics
CREATE OR REPLACE FUNCTION get_firmware_stats(device_id_param TEXT DEFAULT NULL)
RETURNS TABLE (
    device_id TEXT,
    total_uploads BIGINT,
    successful_deployments BIGINT,
    failed_deployments BIGINT,
    rollbacks BIGINT,
    success_rate NUMERIC,
    latest_version TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.device_id,
        COUNT(*) as total_uploads,
        COUNT(*) FILTER (WHERE f.status = 'deployed') as successful_deployments,
        COUNT(*) FILTER (WHERE f.status = 'failed') as failed_deployments,
        COUNT(*) FILTER (WHERE f.status = 'rollback') as rollbacks,
        ROUND(
            (COUNT(*) FILTER (WHERE f.status = 'deployed')::NUMERIC / COUNT(*)) * 100, 
            2
        ) as success_rate,
        (SELECT version FROM firmware_uploads f2 
         WHERE f2.device_id = f.device_id 
         AND f2.status = 'deployed' 
         ORDER BY f2.deployed_at DESC LIMIT 1) as latest_version
    FROM firmware_uploads f
    WHERE (device_id_param IS NULL OR f.device_id = device_id_param)
    AND f.uploaded_at > NOW() - INTERVAL '30 days'
    GROUP BY f.device_id
    ORDER BY total_uploads DESC;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE firmware_uploads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
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

-- Master users can access all firmware uploads
CREATE POLICY "Master users can access all firmware uploads" ON firmware_uploads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'master'
        )
    );

-- Storage policies for firmware bucket
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

-- Master users can access all firmware files
CREATE POLICY "Master users can access all firmware files" ON storage.objects
    FOR ALL USING (
        bucket_id = 'firmware' AND
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'master'
        )
    );
