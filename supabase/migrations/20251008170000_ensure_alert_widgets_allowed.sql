-- Ensure alert widgets are allowed in the database
-- This migration fixes the widgets_type_check constraint to include 'alert'

-- Drop the existing constraint if it exists
ALTER TABLE public.widgets DROP CONSTRAINT IF EXISTS widgets_type_check;

-- Add the updated constraint that includes 'alert'
ALTER TABLE public.widgets
  ADD CONSTRAINT widgets_type_check CHECK (type IN ('switch', 'gauge', 'servo', 'alert'));

-- Also ensure the trigger and message columns exist for alert widgets
ALTER TABLE public.widgets 
  ADD COLUMN IF NOT EXISTS trigger INTEGER;

ALTER TABLE public.widgets 
  ADD COLUMN IF NOT EXISTS message TEXT;
