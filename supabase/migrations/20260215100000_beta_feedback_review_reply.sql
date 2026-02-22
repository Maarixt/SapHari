-- Add review and reply columns to beta_feedback for master feedback management
ALTER TABLE public.beta_feedback
  ADD COLUMN IF NOT EXISTS reviewed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reply_text text,
  ADD COLUMN IF NOT EXISTS replied_at timestamptz,
  ADD COLUMN IF NOT EXISTS replied_by uuid;

-- Index for filters and badge count (unreviewed, newest first)
CREATE INDEX IF NOT EXISTS idx_beta_feedback_reviewed_created_at
  ON public.beta_feedback (reviewed, created_at DESC);

-- Master can update all feedback (mark reviewed, set reply)
CREATE POLICY "Master can update all feedback"
  ON public.beta_feedback
  FOR UPDATE
  USING (public.is_master_user(auth.uid()));
