-- First, add the collaborators table to the public schema
CREATE TABLE IF NOT EXISTS public.collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'operator', 'collaborator')),
  invited_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(device_id, user_email)
);

-- Enable RLS on collaborators table
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;

-- Update devices table to add owner_id column
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS owner_id UUID;

-- Add foreign key constraint for owner_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'devices_owner_id_fkey'
    ) THEN
        ALTER TABLE public.devices 
        ADD CONSTRAINT devices_owner_id_fkey 
        FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create policies for collaborators
CREATE POLICY IF NOT EXISTS "collab_owner_select" ON public.collaborators
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.devices d
    WHERE d.id = collaborators.device_id
      AND d.owner_id = auth.uid()
  )
);

CREATE POLICY IF NOT EXISTS "collab_owner_insert" ON public.collaborators
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.devices d
    WHERE d.id = collaborators.device_id
      AND d.owner_id = auth.uid()
  )
);

CREATE POLICY IF NOT EXISTS "collab_owner_delete" ON public.collaborators
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.devices d
    WHERE d.id = collaborators.device_id
      AND d.owner_id = auth.uid()
  )
);

CREATE POLICY IF NOT EXISTS "collab_invitee_select" ON public.collaborators
FOR SELECT USING (user_email = auth.jwt()->>'email');