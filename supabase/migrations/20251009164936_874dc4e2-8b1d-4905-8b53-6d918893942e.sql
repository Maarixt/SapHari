-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('master', 'admin', 'developer', 'technician', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'master' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'developer' THEN 3
      WHEN 'technician' THEN 4
      WHEN 'user' THEN 5
    END
  LIMIT 1
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only master can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'master'));

CREATE POLICY "Only master can update roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'master'));

CREATE POLICY "Only master can delete roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'master'));

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  actor_email TEXT NOT NULL,
  actor_role public.app_role NOT NULL,
  action TEXT NOT NULL,
  resource TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for audit_logs (only master and admin can view)
CREATE POLICY "Master and admin can view audit logs"
ON public.audit_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- Add updated_at trigger for user_roles
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster role lookups
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_actor_email ON public.audit_logs(actor_email);