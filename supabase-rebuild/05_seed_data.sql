-- ============================================================================
-- SapHari Seed Data
-- Script: 05_seed_data.sql
-- Description: Optional seed data for development/testing
-- ============================================================================

-- NOTE: This script is optional and should only be run in development
-- Run this AFTER creating a user account via Supabase Auth

-- ============================================================================
-- MASTER USER ASSIGNMENT
-- ============================================================================

-- To assign master role to a user, first get their user_id from auth.users
-- Then run this INSERT statement:

-- EXAMPLE: Replace 'your-user-id-here' with actual UUID from auth.users
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('your-user-id-here', 'master')
-- ON CONFLICT (user_id, role) DO NOTHING;

-- To find your user ID, run:
-- SELECT id, email FROM auth.users;

-- ============================================================================
-- DEMO DEVICE (Optional)
-- ============================================================================

-- To create a demo device for a user:
-- INSERT INTO public.devices (device_id, device_key, name, user_id, online)
-- VALUES (
--   'ESP32_DEMO_001',
--   encode(gen_random_bytes(16), 'hex'),
--   'Demo ESP32 Device',
--   'your-user-id-here',
--   false
-- );

-- ============================================================================
-- DEMO WIDGETS (Optional)
-- ============================================================================

-- After creating a demo device, you can add demo widgets:
-- WITH demo_device AS (
--   SELECT id FROM public.devices WHERE device_id = 'ESP32_DEMO_001' LIMIT 1
-- )
-- INSERT INTO public.widgets (device_id, type, label, address, pin, gauge_type)
-- SELECT 
--   id,
--   'switch',
--   'LED 1',
--   'led1',
--   2,
--   NULL
-- FROM demo_device
-- UNION ALL
-- SELECT 
--   id,
--   'gauge',
--   'Temperature',
--   'temp1',
--   NULL,
--   'ds18b20'
-- FROM demo_device;

-- ============================================================================
-- HELPFUL QUERIES
-- ============================================================================

-- View all users and their roles:
-- SELECT 
--   p.email,
--   p.display_name,
--   ur.role
-- FROM public.profiles p
-- LEFT JOIN public.user_roles ur ON ur.user_id = p.id
-- ORDER BY ur.role NULLS LAST, p.email;

-- View all devices with owner info:
-- SELECT 
--   d.device_id,
--   d.name,
--   d.online,
--   p.email AS owner_email
-- FROM public.devices d
-- JOIN public.profiles p ON p.id = d.user_id;

-- Grant master role to user by email:
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT id, 'master'::public.app_role
-- FROM auth.users
-- WHERE email = 'your-email@example.com'
-- ON CONFLICT (user_id, role) DO NOTHING;
