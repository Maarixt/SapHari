-- Fix Remaining Master Dashboard Issues
-- This script addresses the missing get_master_kpis function and authentication issues

-- 1. Create the missing get_master_kpis function
CREATE OR REPLACE FUNCTION public.get_master_kpis()
RETURNS TABLE (
  total_users BIGINT,
  total_devices BIGINT,
  devices_online BIGINT,
  devices_offline BIGINT,
  critical_alerts_24h BIGINT,
  errors_24h BIGINT,
  mqtt_messages_24h BIGINT,
  mqtt_bytes_24h BIGINT,
  generated_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    (SELECT COUNT(*) FROM public.profiles)::BIGINT as total_users,
    (SELECT COUNT(*) FROM public.devices)::BIGINT as total_devices,
    (SELECT COUNT(*) FROM public.devices WHERE online = true)::BIGINT as devices_online,
    (SELECT COUNT(*) FROM public.devices WHERE online = false)::BIGINT as devices_offline,
    0::BIGINT as critical_alerts_24h,
    0::BIGINT as errors_24h,
    0::BIGINT as mqtt_messages_24h,
    0::BIGINT as mqtt_bytes_24h,
    NOW() as generated_at;
$$;

-- 2. Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.get_master_kpis() TO authenticated;

-- 3. Test the function
SELECT 'Testing get_master_kpis function' as test_name;
SELECT * FROM public.get_master_kpis();

-- 4. Verify master role assignment
SELECT 
  'Master Role Verification' as test_name,
  p.email,
  p.display_name,
  ur.role,
  ur.created_at
FROM public.profiles p
JOIN public.user_roles ur ON p.id = ur.user_id
WHERE ur.role = 'master';

-- 5. Test master access function
SELECT 
  'Master Access Test' as test_name,
  public.can_access_master_features() as can_access_master;

-- 6. Test profiles access
SELECT 
  'Profiles Access Test' as test_name,
  COUNT(*) as profiles_count
FROM public.profiles;

-- 7. Show all profiles (should work for master users)
SELECT 
  'All Profiles' as info,
  id,
  email,
  display_name,
  created_at
FROM public.profiles
ORDER BY created_at DESC;
