-- Create missing profile for existing auth user
INSERT INTO public.profiles (id, email, display_name)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'display_name', email) as display_name
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Ensure user_roles exist for all users (default to 'user')
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'user'::app_role
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_roles WHERE role = 'user')
ON CONFLICT (user_id, role) DO NOTHING;