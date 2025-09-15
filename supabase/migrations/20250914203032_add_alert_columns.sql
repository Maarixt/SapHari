-- Add alert widget support
ALTER TABLE public.widgets ADD COLUMN "trigger" integer;
ALTER TABLE public.widgets ADD COLUMN message text;
