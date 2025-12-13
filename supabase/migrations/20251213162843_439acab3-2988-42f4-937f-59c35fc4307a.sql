-- ============================================
-- ORGANIZATION HIERARCHY SYSTEM - PART 1 (TABLES ONLY)
-- ============================================

-- 1) Create organization type enum
DO $$ BEGIN
  CREATE TYPE public.org_type AS ENUM ('house', 'farm', 'business', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) Create org member role enum
DO $$ BEGIN
  CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'member', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3) Create invite status enum
DO $$ BEGIN
  CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 4) Create access level enum
DO $$ BEGIN
  CREATE TYPE public.access_level AS ENUM ('full', 'control', 'view', 'deny');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- ORGANIZATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type public.org_type NOT NULL DEFAULT 'house',
  owner_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- ORGANIZATION MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.org_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

-- ============================================
-- ORGANIZATION INVITES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.organization_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_by_user_id uuid NOT NULL,
  invitee_email text NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status public.invite_status NOT NULL DEFAULT 'pending',
  role public.org_role NOT NULL DEFAULT 'member',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- ADD ORG_ID TO DEVICES TABLE
-- ============================================
ALTER TABLE public.devices 
ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- ============================================
-- DEVICE PERMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.device_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  device_id uuid NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  access public.access_level NOT NULL DEFAULT 'view',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (device_id, user_id)
);

-- ============================================
-- WIDGET PERMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.widget_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  widget_type text NOT NULL,
  widget_key text NOT NULL,
  access public.access_level NOT NULL DEFAULT 'view',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (device_id, user_id, widget_type, widget_key)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON public.organization_invites(invitee_email);
CREATE INDEX IF NOT EXISTS idx_devices_org ON public.devices(org_id);
CREATE INDEX IF NOT EXISTS idx_device_perm_device ON public.device_permissions(device_id);
CREATE INDEX IF NOT EXISTS idx_widget_perm_device ON public.widget_permissions(device_id);