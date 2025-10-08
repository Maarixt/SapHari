-- Allow alert widgets and keep existing constraint up to date
ALTER TABLE public.widgets DROP CONSTRAINT IF EXISTS widgets_type_check;
ALTER TABLE public.widgets
  ADD CONSTRAINT widgets_type_check CHECK (type IN ('switch', 'gauge', 'servo', 'alert'));
