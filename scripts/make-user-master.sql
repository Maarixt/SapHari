-- Make a Specific User Master
-- Replace 'USER_EMAIL_HERE' with the actual email of the user you want to make master

-- 1. Find the user by email and assign master role
INSERT INTO public.user_roles (user_id, role)
SELECT 
  p.id,
  'master'
FROM public.profiles p
WHERE p.email = 'USER_EMAIL_HERE'  -- Replace with actual email
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
WHERE p.email = 'USER_EMAIL_HERE'  -- Replace with actual email
  AND ur.role = 'master';

-- 3. Test profiles access
SELECT 
  'Profiles Access Test' as test_name,
  COUNT(*) as profiles_count
FROM public.profiles;

-- 4. Show all profiles
SELECT 
  id,
  email,
  display_name,
  created_at
FROM public.profiles
ORDER BY created_at DESC;
