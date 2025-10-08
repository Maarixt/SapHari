-- Fix devices table RLS policies to use owner_id instead of user_id
-- This migration ensures the policies match the current schema

-- Drop old policies that reference user_id
DROP POLICY IF EXISTS "Users can view own devices" ON public.devices;
DROP POLICY IF EXISTS "Users can create own devices" ON public.devices;
DROP POLICY IF EXISTS "Users can update own devices" ON public.devices;
DROP POLICY IF EXISTS "Users can delete own devices" ON public.devices;

-- Ensure devices table has the correct columns
ALTER TABLE public.devices 
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing devices to have owner_id set to user_id if owner_id is null
UPDATE public.devices 
SET owner_id = user_id 
WHERE owner_id IS NULL AND user_id IS NOT NULL;

-- Create new policies using owner_id
CREATE POLICY "devices_owner_select" ON public.devices
FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "devices_owner_insert" ON public.devices
FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "devices_owner_update" ON public.devices
FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "devices_owner_delete" ON public.devices
FOR DELETE USING (owner_id = auth.uid());

-- Also create a policy for backward compatibility with user_id
CREATE POLICY "devices_user_select" ON public.devices
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "devices_user_insert" ON public.devices
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "devices_user_update" ON public.devices
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "devices_user_delete" ON public.devices
FOR DELETE USING (user_id = auth.uid());
