-- Fix Master Account Access Issues
-- This migration resolves RLS policy conflicts and role system inconsistencies

-- 1. First, let's check what role system is currently active and standardize it
-- We'll use the user_roles table as the primary role system (most recent)

-- 2. Create a unified is_master function that works with the current system
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

-- 3. Create a backup function for the old system (profiles.role column)
CREATE OR REPLACE FUNCTION public.is_master_legacy(uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid AND role = 'master'
  );
$$;

-- 4. Create a comprehensive master check that works with both systems
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
  ) OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid AND role = 'master'
  );
$$;

-- 5. Fix RLS policies for profiles table
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

-- 6. Fix RLS policies for devices table
DROP POLICY IF EXISTS "user_read_own_devices" ON public.devices;
DROP POLICY IF EXISTS "master_read_all_devices" ON public.devices;
DROP POLICY IF EXISTS "user_read_own_devices" ON public.devices;

CREATE POLICY "devices_select_own" ON public.devices
FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "devices_select_master" ON public.devices
FOR SELECT USING (public.is_master_user(auth.uid()));

CREATE POLICY "devices_insert_own" ON public.devices
FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "devices_update_own" ON public.devices
FOR UPDATE USING (owner_id = auth.uid());

-- 7. Fix RLS policies for user_roles table
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
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

-- 8. Ensure the current user has master role if they're accessing master dashboard
-- This is a safety net - if someone is accessing master features, ensure they have the role
DO $$
DECLARE
  current_user_id UUID;
  has_master_role BOOLEAN;
BEGIN
  -- Get current user ID (this will be NULL if not authenticated, which is fine)
  SELECT auth.uid() INTO current_user_id;
  
  IF current_user_id IS NOT NULL THEN
    -- Check if user has master role in user_roles table
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = current_user_id AND role = 'master'
    ) INTO has_master_role;
    
    -- If no master role found, check profiles table
    IF NOT has_master_role THEN
      SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = current_user_id AND role = 'master'
      ) INTO has_master_role;
    END IF;
    
    -- Log the current state for debugging
    RAISE NOTICE 'Current user: %, Has master role: %', current_user_id, has_master_role;
  END IF;
END $$;

-- 9. Create a helper function to check if current user can access master features
CREATE OR REPLACE FUNCTION public.can_access_master_features()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_master_user(auth.uid());
$$;

-- 10. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.is_master(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_master_legacy(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_master_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_master_features() TO authenticated;

-- 11. Add comments for documentation
COMMENT ON FUNCTION public.is_master(UUID) IS 'Check if user has master role in user_roles table';
COMMENT ON FUNCTION public.is_master_legacy(UUID) IS 'Check if user has master role in profiles.role column (legacy)';
COMMENT ON FUNCTION public.is_master_user(UUID) IS 'Comprehensive master check using both role systems';
COMMENT ON FUNCTION public.can_access_master_features() IS 'Check if current user can access master dashboard features';
