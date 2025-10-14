-- Assign Master Role to Current User
-- Run this in Supabase SQL Editor

-- 1. First, let's see who the current user is
SELECT 
  auth.uid() as current_user_id,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as current_user_email;

-- 2. Check if current user already has master role
SELECT 
  'Current user master role check' as status,
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'master'
  ) as has_master_role;

-- 3. Assign master role to current user
INSERT INTO public.user_roles (user_id, role)
VALUES (auth.uid(), 'master')
ON CONFLICT (user_id, role) DO NOTHING;

-- 4. Verify the assignment
SELECT 
  'Master role assignment' as status,
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'master'
  ) as now_has_master_role;

-- 5. Test master access again
SELECT 
  'Final test' as status,
  public.can_access_master_features() as can_access_master,
  (SELECT COUNT(*) FROM public.profiles) as total_profiles;
