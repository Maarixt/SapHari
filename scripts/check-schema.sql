-- Check current database schema
-- Run this first to understand the current structure

-- 1. Check profiles table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Check user_roles table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_roles'
ORDER BY ordinal_position;

-- 3. Check if user_roles table exists and has data
SELECT 
  'user_roles' as table_name,
  COUNT(*) as row_count
FROM public.user_roles
UNION ALL
SELECT 
  'profiles' as table_name,
  COUNT(*) as row_count
FROM public.profiles;

-- 4. Check existing RLS policies on profiles table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'profiles';

-- 5. Check existing functions
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%master%'
ORDER BY routine_name;
