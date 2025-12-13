-- ================================================
-- PRODUCTION MQTT BROKER CONFIGURATION SYSTEM
-- Platform-level + Organization override architecture
-- ================================================

-- 1. Create platform_broker_config table (admin-managed defaults)
CREATE TABLE IF NOT EXISTS public.platform_broker_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'default',
  description text,
  wss_url text NOT NULL DEFAULT 'wss://broker.emqx.io:8084/mqtt',
  tcp_host text NOT NULL DEFAULT 'broker.emqx.io',
  tcp_port integer NOT NULL DEFAULT 1883,
  tls_port integer DEFAULT 8883,
  wss_port integer DEFAULT 8084,
  use_tls boolean DEFAULT true,
  username text,
  password text,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Create organization_broker_override table (per-org customization)
CREATE TABLE IF NOT EXISTS public.organization_broker_override (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  wss_url text NOT NULL,
  tcp_host text NOT NULL,
  tcp_port integer NOT NULL DEFAULT 1883,
  tls_port integer DEFAULT 8883,
  wss_port integer DEFAULT 8084,
  use_tls boolean DEFAULT true,
  username text,
  password text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id)
);

-- 3. Add unique constraint to broker_settings for proper upsert
-- First check if constraint exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'broker_settings_user_id_unique'
  ) THEN
    -- The constraint broker_settings_user_id_key already exists based on error
    -- Just ensure we can properly upsert
    NULL;
  END IF;
END $$;

-- 4. Enable RLS on new tables
ALTER TABLE public.platform_broker_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_broker_override ENABLE ROW LEVEL SECURITY;

-- 5. Platform config policies (admin/master can manage, all authenticated can read)
CREATE POLICY "platform_broker_config_select_authenticated" 
ON public.platform_broker_config 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "platform_broker_config_all_master" 
ON public.platform_broker_config 
FOR ALL 
USING (is_master(auth.uid()))
WITH CHECK (is_master(auth.uid()));

-- 6. Organization override policies
CREATE POLICY "organization_broker_override_select_authenticated" 
ON public.organization_broker_override 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "organization_broker_override_all_master" 
ON public.organization_broker_override 
FOR ALL 
USING (is_master(auth.uid()))
WITH CHECK (is_master(auth.uid()));

-- 7. Insert default platform broker config
INSERT INTO public.platform_broker_config (
  name, 
  description, 
  wss_url, 
  tcp_host, 
  tcp_port, 
  tls_port, 
  wss_port, 
  use_tls, 
  is_active, 
  is_default
) VALUES (
  'SapHari Production',
  'Default production MQTT broker for all SapHari devices',
  'wss://broker.emqx.io:8084/mqtt',
  'broker.emqx.io',
  1883,
  8883,
  8084,
  true,
  true,
  true
) ON CONFLICT DO NOTHING;

-- 8. Create function to get effective broker config for a user/org
CREATE OR REPLACE FUNCTION public.get_effective_broker_config(p_user_id uuid DEFAULT auth.uid(), p_organization_id uuid DEFAULT NULL)
RETURNS TABLE (
  wss_url text,
  tcp_host text,
  tcp_port integer,
  tls_port integer,
  wss_port integer,
  use_tls boolean,
  username text,
  password text,
  source text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- First check for organization override
  IF p_organization_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      o.wss_url,
      o.tcp_host,
      o.tcp_port,
      o.tls_port,
      o.wss_port,
      o.use_tls,
      o.username,
      o.password,
      'organization'::text as source
    FROM public.organization_broker_override o
    WHERE o.organization_id = p_organization_id
      AND o.is_active = true
    LIMIT 1;
    
    IF FOUND THEN
      RETURN;
    END IF;
  END IF;
  
  -- Check for user-specific settings
  RETURN QUERY
  SELECT 
    bs.url as wss_url,
    split_part(replace(replace(bs.url, 'wss://', ''), 'ws://', ''), ':', 1) as tcp_host,
    COALESCE(bs.port, 1883) as tcp_port,
    8883 as tls_port,
    COALESCE(bs.port, 8084) as wss_port,
    COALESCE(bs.use_tls, true) as use_tls,
    bs.username,
    bs.password,
    'user'::text as source
  FROM public.broker_settings bs
  WHERE bs.user_id = p_user_id
  LIMIT 1;
  
  IF FOUND THEN
    RETURN;
  END IF;
  
  -- Fall back to platform default
  RETURN QUERY
  SELECT 
    p.wss_url,
    p.tcp_host,
    p.tcp_port,
    p.tls_port,
    p.wss_port,
    p.use_tls,
    p.username,
    p.password,
    'platform'::text as source
  FROM public.platform_broker_config p
  WHERE p.is_active = true AND p.is_default = true
  LIMIT 1;
END;
$$;

-- 9. Create upsert function for broker_settings to avoid conflict errors
CREATE OR REPLACE FUNCTION public.upsert_broker_settings(
  p_url text,
  p_username text DEFAULT NULL,
  p_password text DEFAULT NULL,
  p_port integer DEFAULT 8084,
  p_use_tls boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_setting_id uuid;
BEGIN
  INSERT INTO public.broker_settings (user_id, url, username, password, port, use_tls, updated_at)
  VALUES (v_user_id, p_url, p_username, p_password, p_port, p_use_tls, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET
    url = EXCLUDED.url,
    username = EXCLUDED.username,
    password = EXCLUDED.password,
    port = EXCLUDED.port,
    use_tls = EXCLUDED.use_tls,
    updated_at = now()
  RETURNING id INTO v_setting_id;
  
  RETURN v_setting_id;
END;
$$;

-- 10. Create trigger for updated_at on new tables
CREATE TRIGGER update_platform_broker_config_updated_at
  BEFORE UPDATE ON public.platform_broker_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_broker_override_updated_at
  BEFORE UPDATE ON public.organization_broker_override
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();