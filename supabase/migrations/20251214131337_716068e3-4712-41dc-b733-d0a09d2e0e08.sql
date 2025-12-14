-- Create device_presence_events table for tracking online/offline history
CREATE TABLE IF NOT EXISTS public.device_presence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('online', 'offline')),
  source text DEFAULT 'mqtt', -- 'mqtt', 'ttl', 'manual'
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_device_presence_device_created ON public.device_presence_events(device_id, created_at DESC);
CREATE INDEX idx_device_presence_created ON public.device_presence_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.device_presence_events ENABLE ROW LEVEL SECURITY;

-- Users can only view presence events for their own devices
CREATE POLICY "device_presence_events_select_own" ON public.device_presence_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.devices d 
      WHERE d.device_id = device_presence_events.device_id 
      AND d.user_id = auth.uid()
    )
  );

-- Users can insert presence events for their own devices
CREATE POLICY "device_presence_events_insert_own" ON public.device_presence_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.devices d 
      WHERE d.device_id = device_presence_events.device_id 
      AND d.user_id = auth.uid()
    )
  );

-- Master can view all presence events
CREATE POLICY "device_presence_events_select_master" ON public.device_presence_events
  FOR SELECT USING (is_master(auth.uid()));

-- Allow service role to insert (for edge functions)
CREATE POLICY "device_presence_events_insert_service" ON public.device_presence_events
  FOR INSERT WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE public.device_presence_events IS 'Tracks device online/offline status changes from MQTT LWT and TTL';
