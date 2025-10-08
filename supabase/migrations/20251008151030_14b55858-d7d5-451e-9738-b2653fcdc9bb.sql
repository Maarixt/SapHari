-- Fix handle_new_user function to use 'id' instead of 'user_id' for profiles table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert into profiles using 'id' column (not 'user_id')
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    new.email
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Insert into broker_settings (this table uses user_id)
  INSERT INTO public.broker_settings (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN new;
END;
$function$;