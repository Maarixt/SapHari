-- Master Access Fix - FINAL VERSION
-- This script fixes the RLS policies and role system conflicts
-- Run this in Supabase SQL Editor

-- 1. Create a unified is_master function that works with the current system
CREATE OR REPLACE FUNCTION public.is_master(uid UUID DEFAULT auth.uid())
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

-- 2. Create a comprehensive master check that works with user_roles table only
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

-- 3. Create a helper function to check if current user can access master features
CREATE OR REPLACE FUNCTION public.can_access_master_features()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_master_user(auth.uid());
$$;

-- 4. Fix RLS policies for profiles table
-- Drop existing conflicting policies
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "master_read_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "user_read_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

-- Create comprehensive RLS policies for profiles
CREATE POLICY "profiles_select_own" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_select_master" ON public.profiles
FOR SELECT USING (public.is_master_user(auth.uid()));

CREATE POLICY "profiles_insert_own" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

-- 5. Fix RLS policies for devices table (using user_id instead of owner_id)
DROP POLICY IF EXISTS "user_read_own_devices" ON public.devices;
DROP POLICY IF EXISTS "master_read_all_devices" ON public.devices;
DROP POLICY IF EXISTS "devices_select_own" ON public.devices;

CREATE POLICY "devices_select_own" ON public.devices
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "devices_select_master" ON public.devices
FOR SELECT USING (public.is_master_user(auth.uid()));

CREATE POLICY "devices_insert_own" ON public.devices
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "devices_update_own" ON public.devices
FOR UPDATE USING (user_id = auth.uid());

-- 6. Fix RLS policies for user_roles table
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
DROP POLICY IF EXISTS "Only master can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only master can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only master can delete roles" ON public.user_roles;

CREATE POLICY "user_roles_select_own" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_roles_select_master" ON public.user_roles
FOR SELECT USING (public.is_master_user(auth.uid()));

CREATE POLICY "user_roles_insert_master" ON public.user_roles
FOR INSERT WITH CHECK (public.is_master_user(auth.uid()));

CREATE POLICY "user_roles_update_master" ON public.user_roles
FOR UPDATE USING (public.is_master_user(auth.uid()));

CREATE POLICY "user_roles_delete_master" ON public.user_roles
FOR DELETE USING (public.is_master_user(auth.uid()));

-- 7. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.is_master(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_master_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_master_features() TO authenticated;

-- 8. Ensure at least one user has master role
-- Check if any user has master role in user_roles table
DO $$
DECLARE
  master_count INTEGER;
  first_user_id UUID;
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

-- 9. Test the setup
SELECT 
  'Setup Complete' as status,
  (SELECT COUNT(*) FROM public.profiles) as total_profiles,
  (SELECT COUNT(*) FROM public.user_roles WHERE role = 'master') as master_users,
  public.can_access_master_features() as current_user_can_access_master;
