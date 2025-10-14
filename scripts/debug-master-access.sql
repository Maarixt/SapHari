-- Debug Master Access Issues
-- This script helps identify why master access isn't working in the web app

-- 1. Check if user_roles table has the correct structure
SELECT 
  'user_roles table structure' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_roles'
ORDER BY ordinal_position;

-- 2. Check all user roles
SELECT 
  'All User Roles' as info,
  ur.user_id,
  p.email,
  p.display_name,
  ur.role,
  ur.created_at
FROM public.user_roles ur
LEFT JOIN public.profiles p ON ur.user_id = p.id
ORDER BY ur.created_at DESC;

-- 3. Check if the is_master_user function works
SELECT 
  'is_master_user function test' as test_name,
  public.is_master_user() as result;

-- 4. Check if can_access_master_features function works
SELECT 
  'can_access_master_features function test' as test_name,
  public.can_access_master_features() as result;

-- 5. Test direct role check for Omari Francis
SELECT 
  'Direct role check for Omari Francis' as test_name,
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = '212171f4-5196-4f39-9405-746e3b70e40b' 
    AND role = 'master'
  ) as has_master_role;

-- 6. Check RLS policies on profiles table
SELECT 
  'RLS Policies on profiles table' as info,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
ORDER BY policyname;

-- 7. Test profiles access with different approaches
SELECT 
  'Profiles access test 1' as test_name,
  COUNT(*) as count
FROM public.profiles;

-- 8. Check if there are any authentication issues
SELECT 
  'Authentication context' as info,
  current_user as current_db_user,
  session_user as session_user;
