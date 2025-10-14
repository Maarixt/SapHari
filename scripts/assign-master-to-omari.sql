-- Assign Master Role to Omari Francis
-- This will make Omari Francis a master user

-- 1. Assign master role to Omari Francis
INSERT INTO public.user_roles (user_id, role)
VALUES ('212171f4-5196-4f39-9405-746e3b70e40b', 'master')
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Verify the assignment
SELECT 
  'Master Role Assignment' as status,
  p.email,
  p.display_name,
  ur.role,
  ur.created_at
FROM public.profiles p
JOIN public.user_roles ur ON p.id = ur.user_id
WHERE p.id = '212171f4-5196-4f39-9405-746e3b70e40b'
  AND ur.role = 'master';

-- 3. Show all master users
SELECT 
  'All Master Users' as info,
  p.email,
  p.display_name,
  ur.created_at
FROM public.profiles p
JOIN public.user_roles ur ON p.id = ur.user_id
WHERE ur.role = 'master';

-- 4. Test profiles access
SELECT 
  'Profiles Access Test' as test_name,
  COUNT(*) as profiles_count
FROM public.profiles;
