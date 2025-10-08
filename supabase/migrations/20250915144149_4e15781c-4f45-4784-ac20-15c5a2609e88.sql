-- Update devices table to include owner_id
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing devices to have the current user as owner (if any exist)
-- This will be handled when auth is implemented

-- Create collaborators table for role-based access
CREATE TABLE IF NOT EXISTS public.collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'operator', 'collaborator')),
  invited_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(device_id, user_email)
);

-- Enable RLS on new table
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;

-- Update RLS policies for devices table
DROP POLICY IF EXISTS "Users can view own devices" ON public.devices;
DROP POLICY IF EXISTS "Users can create own devices" ON public.devices;
DROP POLICY IF EXISTS "Users can update own devices" ON public.devices;
DROP POLICY IF EXISTS "Users can delete own devices" ON public.devices;

-- Devices policies - owners can CRUD their devices
CREATE POLICY "devices_owner_select" ON public.devices
FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "devices_owner_insert" ON public.devices
FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "devices_owner_update" ON public.devices
FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "devices_owner_delete" ON public.devices
FOR DELETE USING (owner_id = auth.uid());

-- Collaborators can read devices they're invited to
CREATE POLICY "devices_collab_select" ON public.devices
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.collaborators c
    WHERE c.device_id = devices.id
      AND c.user_email = auth.jwt()->>'email'
  )
);

-- Collaborators policies
CREATE POLICY "collab_owner_select" ON public.collaborators
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.devices d
    WHERE d.id = collaborators.device_id
      AND d.owner_id = auth.uid()
  )
);

CREATE POLICY "collab_owner_insert" ON public.collaborators
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.devices d
    WHERE d.id = collaborators.device_id
      AND d.owner_id = auth.uid()
  )
);

CREATE POLICY "collab_owner_delete" ON public.collaborators
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.devices d
    WHERE d.id = collaborators.device_id
      AND d.owner_id = auth.uid()
  )
);

-- Invitees can read their own invites
CREATE POLICY "collab_invitee_select" ON public.collaborators
FOR SELECT USING (user_email = auth.jwt()->>'email');

-- Update widgets policies
DROP POLICY IF EXISTS "Users can view own widgets" ON public.widgets;
DROP POLICY IF EXISTS "Users can create widgets for own devices" ON public.widgets;
DROP POLICY IF EXISTS "Users can update own widgets" ON public.widgets;
DROP POLICY IF EXISTS "Users can delete own widgets" ON public.widgets;

-- Owners full access to widgets
CREATE POLICY "widgets_owner_select" ON public.widgets
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.devices d WHERE d.id = widgets.device_id AND d.owner_id = auth.uid())
);

CREATE POLICY "widgets_owner_insert" ON public.widgets
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.devices d WHERE d.id = widgets.device_id AND d.owner_id = auth.uid())
);

CREATE POLICY "widgets_owner_update" ON public.widgets
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.devices d WHERE d.id = widgets.device_id AND d.owner_id = auth.uid())
);

CREATE POLICY "widgets_owner_delete" ON public.widgets
FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.devices d WHERE d.id = widgets.device_id AND d.owner_id = auth.uid())
);

-- Collaborators read widgets of shared devices
CREATE POLICY "widgets_collab_select" ON public.widgets
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.collaborators c
    WHERE c.device_id = widgets.device_id
      AND c.user_email = auth.jwt()->>'email'
  )
);

-- Collaborators (editor role) can write widgets
CREATE POLICY "widgets_collab_write" ON public.widgets
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.collaborators c
    WHERE c.device_id = widgets.device_id
      AND c.user_email = auth.jwt()->>'email'
      AND c.role = 'collaborator'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.collaborators c
    WHERE c.device_id = widgets.device_id
      AND c.user_email = auth.jwt()->>'email'
      AND c.role = 'collaborator'
  )
);

-- Update alerts table to work with new device ownership
DROP POLICY IF EXISTS "Users can view own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can create own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can update own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can delete own alerts" ON public.alerts;

CREATE POLICY "alerts_user_access" ON public.alerts
FOR ALL USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create profiles table for user information
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON public.profiles
FOR SELECT USING (true); -- Profiles can be viewed by everyone for collaboration

CREATE POLICY "profiles_insert" ON public.profiles
FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update" ON public.profiles
FOR UPDATE USING (id = auth.uid());

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  
  -- Also create broker settings for new user
  INSERT INTO public.broker_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();