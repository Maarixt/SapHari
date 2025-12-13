-- Add dashboard-specific credential columns to platform_broker_config
ALTER TABLE public.platform_broker_config
ADD COLUMN IF NOT EXISTS dashboard_username text,
ADD COLUMN IF NOT EXISTS dashboard_password text;

-- Update the active config with dashboard credentials
UPDATE public.platform_broker_config
SET 
  dashboard_username = 'sapHari-connect',
  dashboard_password = 'sicnarf03'
WHERE is_active = true AND is_default = true;