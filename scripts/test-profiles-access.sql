-- Test Profiles Access
-- Run this to verify that master access is working

-- 1. Test the master access function
SELECT 
  'Master Access Test' as test_name,
  public.can_access_master_features() as can_access_master;

-- 2. Test profiles access directly
SELECT 
  'Profiles Access Test' as test_name,
  COUNT(*) as profiles_count
FROM public.profiles;

-- 3. Show all profiles (this should work if master access is working)
SELECT 
  id,
  email,
  display_name,
  created_at
FROM public.profiles
ORDER BY created_at DESC;

-- 4. Show current user roles
SELECT 
  'Current User Roles' as test_name,
  ur.role,
  ur.created_at
FROM public.user_roles ur
WHERE ur.user_id = auth.uid();
