-- Test Web Application Authentication
-- This script helps verify if the web app authentication is working

-- 1. Check if auth.uid() works (should return null in SQL Editor, but user ID in web app)
SELECT 
  'Auth context test' as test_name,
  auth.uid() as current_auth_user,
  current_user as current_db_user;

-- 2. Test the master access function (will fail in SQL Editor but work in web app)
SELECT 
  'Master access function test' as test_name,
  public.can_access_master_features() as can_access_master;

-- 3. Show what the function should return for Omari Francis
SELECT 
  'Expected result for Omari Francis' as test_name,
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = '212171f4-5196-4f39-9405-746e3b70e40b' 
    AND role = 'master'
  ) as should_be_true;

-- 4. Test profiles access (works in SQL Editor with postgres role)
SELECT 
  'Profiles access test' as test_name,
  COUNT(*) as profiles_count
FROM public.profiles;

-- 5. Show all profiles (should work for master users in web app)
SELECT 
  'All Profiles' as info,
  id,
  email,
  display_name,
  created_at
FROM public.profiles
ORDER BY created_at DESC;
