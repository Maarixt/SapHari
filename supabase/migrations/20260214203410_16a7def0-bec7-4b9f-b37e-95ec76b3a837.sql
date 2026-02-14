CREATE OR REPLACE FUNCTION public.create_device(_device_id text, _name text, _user_id uuid DEFAULT auth.uid())
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _new_device_id UUID;
  _device_key TEXT;
BEGIN
  -- Generate secure device key
  _device_key := encode(extensions.gen_random_bytes(16), 'hex');
  
  -- Insert device
  INSERT INTO public.devices (
    device_id,
    device_key,
    name,
    user_id
  ) VALUES (
    _device_id,
    _device_key,
    _name,
    COALESCE(_user_id, auth.uid())
  )
  RETURNING id INTO _new_device_id;
  
  RETURN _new_device_id;
END;
$function$;