-- Create beta_feedback table
CREATE TABLE public.beta_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature', 'general')),
  message TEXT NOT NULL,
  page_url TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can submit feedback"
  ON public.beta_feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
  ON public.beta_feedback
  FOR SELECT
  USING (auth.uid() = user_id);

-- Master users can view all feedback
CREATE POLICY "Master users can view all feedback"
  ON public.beta_feedback
  FOR SELECT
  USING (public.is_master_user(auth.uid()));

-- Create index for user_id
CREATE INDEX idx_beta_feedback_user_id ON public.beta_feedback(user_id);
CREATE INDEX idx_beta_feedback_created_at ON public.beta_feedback(created_at DESC);