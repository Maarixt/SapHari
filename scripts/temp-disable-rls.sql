-- Temporarily disable RLS on profiles table for testing
-- WARNING: This removes security - only use for testing!

-- 1. Disable RLS on profiles table
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. Test profiles access
SELECT 
  'RLS Disabled - Testing Profiles Access' as info,
  COUNT(*) as total_profiles
FROM public.profiles;

-- 3. Show all profiles
SELECT 
  'All Profiles (RLS Disabled)' as info,
  id,
  email,
  display_name,
  created_at
FROM public.profiles
ORDER BY created_at DESC;

-- 4. Re-enable RLS (uncomment when ready)
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
