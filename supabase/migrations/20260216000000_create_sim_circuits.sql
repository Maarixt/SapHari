-- Simulator circuits: user-saved circuits (components + wires as JSON).
CREATE TABLE public.sim_circuits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sim_circuits ENABLE ROW LEVEL SECURITY;

-- Users can CRUD only their own rows.
CREATE POLICY "Users can view own sim_circuits"
  ON public.sim_circuits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sim_circuits"
  ON public.sim_circuits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sim_circuits"
  ON public.sim_circuits FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sim_circuits"
  ON public.sim_circuits FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_sim_circuits_user_id ON public.sim_circuits(user_id);
CREATE INDEX idx_sim_circuits_created_at ON public.sim_circuits(created_at DESC);

-- Keep updated_at in sync.
CREATE OR REPLACE FUNCTION public.set_sim_circuits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sim_circuits_updated_at
  BEFORE UPDATE ON public.sim_circuits
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_sim_circuits_updated_at();
