-- Fix RLS Policies - Final Solution
-- This creates proper RLS policies that allow master users to access all profiles

-- 1. Re-enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_master" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "master_read_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "user_read_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

-- 3. Create a simple master check function
CREATE OR REPLACE FUNCTION public.is_master_user(uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = uid AND role = 'master'
  );
$$;

-- 4. Create new RLS policies
-- Allow users to read their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
FOR SELECT USING (auth.uid() = id);

-- Allow master users to read ALL profiles
CREATE POLICY "profiles_select_master" ON public.profiles
FOR SELECT USING (public.is_master_user(auth.uid()));

-- Allow users to insert their own profile
CREATE POLICY "profiles_insert_own" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION public.is_master_user(UUID) TO authenticated;

-- 6. Test the policies
SELECT 
  'Testing RLS Policies' as info,
  COUNT(*) as total_profiles
FROM public.profiles;

-- 7. Show current policies
SELECT 
  'Current RLS Policies' as info,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
ORDER BY policyname;

-- 8. Verify master role exists
SELECT 
  'Master Role Verification' as info,
  ur.user_id,
  p.email,
  p.display_name,
  ur.role
FROM public.user_roles ur
JOIN public.profiles p ON ur.user_id = p.id
WHERE ur.role = 'master';
