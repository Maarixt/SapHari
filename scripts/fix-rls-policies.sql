-- Fix RLS Policies for Profiles Access
-- This script ensures that master users can access all profiles

-- 1. First, let's check current RLS policies
SELECT 
  'Current RLS Policies' as info,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
ORDER BY policyname;

-- 2. Drop all existing policies on profiles table
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_master" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "master_read_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "user_read_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

-- 3. Create new, simpler RLS policies
-- Allow users to read their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
FOR SELECT USING (auth.uid() = id);

-- Allow master users to read all profiles
CREATE POLICY "profiles_select_master" ON public.profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'master'
  )
);

-- Allow users to insert their own profile
CREATE POLICY "profiles_insert_own" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

-- 4. Test the policies
SELECT 
  'Testing RLS Policies' as info,
  COUNT(*) as total_profiles
FROM public.profiles;

-- 5. Check if master role exists for any user
SELECT 
  'Master Role Check' as info,
  COUNT(*) as master_users
FROM public.user_roles 
WHERE role = 'master';

-- 6. Show all user roles
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
