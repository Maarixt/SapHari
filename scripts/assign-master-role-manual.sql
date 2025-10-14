-- Assign Master Role Manually
-- Run this in Supabase SQL Editor
-- This works around the auth.uid() null issue

-- 1. First, let's see all users and their current roles
SELECT 
  'All Users and Roles' as info,
  p.id as user_id,
  p.email,
  p.display_name,
  ur.role,
  ur.created_at as role_created
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
ORDER BY p.created_at ASC;

-- 2. Check which users already have master role
SELECT 
  'Current Master Users' as info,
  ur.user_id,
  p.email,
  p.display_name,
  ur.created_at
FROM public.user_roles ur
JOIN public.profiles p ON ur.user_id = p.id
WHERE ur.role = 'master';

-- 3. Assign master role to the first user (if no master exists)
-- Replace the UUID below with the actual user ID you want to make master
DO $$
DECLARE
  first_user_id UUID;
  master_count INTEGER;
BEGIN
  -- Count existing master roles
  SELECT COUNT(*) INTO master_count FROM public.user_roles WHERE role = 'master';
  
  -- If no master role exists, assign it to the first user
  IF master_count = 0 THEN
    SELECT id INTO first_user_id FROM public.profiles ORDER BY created_at ASC LIMIT 1;
    
    IF first_user_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (first_user_id, 'master')
      ON CONFLICT (user_id, role) DO NOTHING;
      
      RAISE NOTICE 'Master role assigned to user: %', first_user_id;
    END IF;
  ELSE
    RAISE NOTICE 'Master role already exists. Count: %', master_count;
  END IF;
END $$;

-- 4. Show final master users
SELECT 
  'Final Master Users' as info,
  ur.user_id,
  p.email,
  p.display_name,
  ur.created_at
FROM public.user_roles ur
JOIN public.profiles p ON ur.user_id = p.id
WHERE ur.role = 'master';

-- 5. Test profiles access (this should work now)
SELECT 
  'Profiles Access Test' as test_name,
  COUNT(*) as profiles_count
FROM public.profiles;

-- 6. Show all profiles (this should work if master access is working)
SELECT 
  'All Profiles' as info,
  id,
  email,
  display_name,
  created_at
FROM public.profiles
ORDER BY created_at DESC;
