-- Update platform broker config with production EMQX Cloud settings
UPDATE public.platform_broker_config
SET 
  name = 'SapHari Production (EMQX Cloud)',
  description = 'Production MQTT broker - EMQX Cloud Serverless. DO NOT MODIFY without authorization.',
  tcp_host = 'z110b082.ala.us-east-1.emqxsl.com',
  tcp_port = 1883,
  tls_port = 8883,
  wss_port = 8084,
  wss_url = 'wss://z110b082.ala.us-east-1.emqxsl.com:8084/mqtt',
  use_tls = true,
  is_active = true,
  is_default = true,
  updated_at = now()
WHERE is_default = true;

-- If no default exists, insert one
INSERT INTO public.platform_broker_config (
  name,
  description,
  tcp_host,
  tcp_port,
  tls_port,
  wss_port,
  wss_url,
  use_tls,
  is_active,
  is_default
)
SELECT 
  'SapHari Production (EMQX Cloud)',
  'Production MQTT broker - EMQX Cloud Serverless. DO NOT MODIFY without authorization.',
  'z110b082.ala.us-east-1.emqxsl.com',
  1883,
  8883,
  8084,
  'wss://z110b082.ala.us-east-1.emqxsl.com:8084/mqtt',
  true,
  true,
  true
WHERE NOT EXISTS (SELECT 1 FROM public.platform_broker_config WHERE is_default = true);

-- Create a function to get the production broker config (cached, authoritative)
CREATE OR REPLACE FUNCTION public.get_production_broker_config()
RETURNS TABLE(
  wss_url text,
  tcp_host text,
  tcp_port integer,
  tls_port integer,
  wss_port integer,
  wss_path text,
  use_tls boolean,
  username text,
  password text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.wss_url,
    p.tcp_host,
    p.tcp_port,
    p.tls_port,
    p.wss_port,
    '/mqtt'::text as wss_path,
    p.use_tls,
    p.username,
    p.password
  FROM public.platform_broker_config p
  WHERE p.is_active = true AND p.is_default = true
  LIMIT 1;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_production_broker_config() TO authenticated;