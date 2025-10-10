-- Quick fix to give your current user master role
-- Run this in Supabase SQL Editor after the main migration

-- First, check what users exist
SELECT id, email FROM auth.users;

-- Give your current user master role (replace with your actual user ID)
-- You can find your user ID from the query above
INSERT INTO public.user_roles (user_id, role) VALUES
  ('YOUR_USER_ID_HERE', 'master')
ON CONFLICT (user_id) DO UPDATE SET role = 'master';

-- Or if you want to give master role to a specific email:
-- First get the user ID from auth.users, then insert into user_roles

-- Check if it worked
SELECT 
  u.email,
  ur.role
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email = 'your-email@example.com';
