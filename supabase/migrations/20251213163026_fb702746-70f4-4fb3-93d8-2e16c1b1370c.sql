-- ============================================
-- ORGANIZATION HIERARCHY SYSTEM - PART 2 (FUNCTIONS + RLS)
-- ============================================

-- ============================================
-- HELPER FUNCTIONS (SECURITY DEFINER)
-- ============================================

-- Check if user is org member
CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE org_id = p_org_id AND user_id = COALESCE(p_user_id, auth.uid())
  );
$$;

-- Check if user is org owner
CREATE OR REPLACE FUNCTION public.is_org_owner(p_org_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = p_org_id AND owner_user_id = COALESCE(p_user_id, auth.uid())
  );
$$;

-- Check if user is org admin or owner
CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE org_id = p_org_id 
      AND user_id = COALESCE(p_user_id, auth.uid())
      AND (role = 'owner'::public.org_role OR role = 'admin'::public.org_role)
  );
$$;

-- Get user's org role
CREATE OR REPLACE FUNCTION public.get_org_role(p_org_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS public.org_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.organization_members
  WHERE org_id = p_org_id AND user_id = COALESCE(p_user_id, auth.uid())
  LIMIT 1;
$$;

-- Check device access level
CREATE OR REPLACE FUNCTION public.get_device_access(p_device_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS public.access_level
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_org_role public.org_role;
  v_device_access public.access_level;
BEGIN
  SELECT org_id INTO v_org_id FROM public.devices WHERE id = p_device_id;
  IF v_org_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT access INTO v_device_access 
  FROM public.device_permissions 
  WHERE device_id = p_device_id AND user_id = COALESCE(p_user_id, auth.uid());
  
  IF v_device_access IS NOT NULL THEN
    RETURN v_device_access;
  END IF;
  
  SELECT role INTO v_org_role 
  FROM public.organization_members 
  WHERE org_id = v_org_id AND user_id = COALESCE(p_user_id, auth.uid());
  
  IF v_org_role = 'owner'::public.org_role OR v_org_role = 'admin'::public.org_role THEN
    RETURN 'full'::public.access_level;
  ELSIF v_org_role = 'member'::public.org_role THEN
    RETURN 'control'::public.access_level;
  ELSIF v_org_role = 'viewer'::public.org_role THEN
    RETURN 'view'::public.access_level;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Helper to check if user can delete org member (not the owner)
CREATE OR REPLACE FUNCTION public.can_delete_org_member(p_org_id uuid, p_target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  SELECT owner_user_id INTO v_owner_id FROM public.organizations WHERE id = p_org_id;
  RETURN public.is_org_admin(p_org_id, auth.uid()) AND p_target_user_id IS DISTINCT FROM v_owner_id;
END;
$$;

-- ============================================
-- ENABLE RLS
-- ============================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: ORGANIZATIONS
-- ============================================
DROP POLICY IF EXISTS "org_select_member" ON public.organizations;
CREATE POLICY "org_select_member" ON public.organizations
FOR SELECT USING (
  public.is_org_member(id, auth.uid()) OR owner_user_id = auth.uid()
);

DROP POLICY IF EXISTS "org_insert_own" ON public.organizations;
CREATE POLICY "org_insert_own" ON public.organizations
FOR INSERT WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "org_update_admin" ON public.organizations;
CREATE POLICY "org_update_admin" ON public.organizations
FOR UPDATE USING (public.is_org_admin(id, auth.uid()));

DROP POLICY IF EXISTS "org_delete_owner" ON public.organizations;
CREATE POLICY "org_delete_owner" ON public.organizations
FOR DELETE USING (owner_user_id = auth.uid());

-- ============================================
-- RLS POLICIES: ORGANIZATION MEMBERS
-- ============================================
DROP POLICY IF EXISTS "org_members_select" ON public.organization_members;
CREATE POLICY "org_members_select" ON public.organization_members
FOR SELECT USING (public.is_org_member(org_id, auth.uid()));

DROP POLICY IF EXISTS "org_members_insert_admin" ON public.organization_members;
CREATE POLICY "org_members_insert_admin" ON public.organization_members
FOR INSERT WITH CHECK (public.is_org_admin(org_id, auth.uid()));

DROP POLICY IF EXISTS "org_members_update_admin" ON public.organization_members;
CREATE POLICY "org_members_update_admin" ON public.organization_members
FOR UPDATE USING (public.is_org_admin(org_id, auth.uid()));

DROP POLICY IF EXISTS "org_members_delete_admin" ON public.organization_members;
CREATE POLICY "org_members_delete_admin" ON public.organization_members
FOR DELETE USING (public.can_delete_org_member(org_id, user_id));

-- ============================================
-- RLS POLICIES: ORGANIZATION INVITES
-- ============================================
DROP POLICY IF EXISTS "org_invites_select_member" ON public.organization_invites;
CREATE POLICY "org_invites_select_member" ON public.organization_invites
FOR SELECT USING (
  public.is_org_member(org_id, auth.uid()) 
  OR invitee_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "org_invites_insert_admin" ON public.organization_invites;
CREATE POLICY "org_invites_insert_admin" ON public.organization_invites
FOR INSERT WITH CHECK (public.is_org_admin(org_id, auth.uid()));

DROP POLICY IF EXISTS "org_invites_update" ON public.organization_invites;
CREATE POLICY "org_invites_update" ON public.organization_invites
FOR UPDATE USING (
  public.is_org_admin(org_id, auth.uid())
  OR invitee_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "org_invites_delete_admin" ON public.organization_invites;
CREATE POLICY "org_invites_delete_admin" ON public.organization_invites
FOR DELETE USING (public.is_org_admin(org_id, auth.uid()));

-- ============================================
-- RLS POLICIES: DEVICE PERMISSIONS
-- ============================================
DROP POLICY IF EXISTS "device_perm_select" ON public.device_permissions;
CREATE POLICY "device_perm_select" ON public.device_permissions
FOR SELECT USING (public.is_org_member(org_id, auth.uid()));

DROP POLICY IF EXISTS "device_perm_insert_admin" ON public.device_permissions;
CREATE POLICY "device_perm_insert_admin" ON public.device_permissions
FOR INSERT WITH CHECK (public.is_org_admin(org_id, auth.uid()));

DROP POLICY IF EXISTS "device_perm_update_admin" ON public.device_permissions;
CREATE POLICY "device_perm_update_admin" ON public.device_permissions
FOR UPDATE USING (public.is_org_admin(org_id, auth.uid()));

DROP POLICY IF EXISTS "device_perm_delete_admin" ON public.device_permissions;
CREATE POLICY "device_perm_delete_admin" ON public.device_permissions
FOR DELETE USING (public.is_org_admin(org_id, auth.uid()));

-- ============================================
-- RLS POLICIES: WIDGET PERMISSIONS
-- ============================================
DROP POLICY IF EXISTS "widget_perm_select" ON public.widget_permissions;
CREATE POLICY "widget_perm_select" ON public.widget_permissions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.devices d
    WHERE d.id = widget_permissions.device_id AND public.is_org_member(d.org_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "widget_perm_insert_admin" ON public.widget_permissions;
CREATE POLICY "widget_perm_insert_admin" ON public.widget_permissions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.devices d
    WHERE d.id = widget_permissions.device_id AND public.is_org_admin(d.org_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "widget_perm_update_admin" ON public.widget_permissions;
CREATE POLICY "widget_perm_update_admin" ON public.widget_permissions
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.devices d
    WHERE d.id = widget_permissions.device_id AND public.is_org_admin(d.org_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "widget_perm_delete_admin" ON public.widget_permissions;
CREATE POLICY "widget_perm_delete_admin" ON public.widget_permissions
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.devices d
    WHERE d.id = widget_permissions.device_id AND public.is_org_admin(d.org_id, auth.uid())
  )
);

-- ============================================
-- GRANTS
-- ============================================
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_role(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_device_access(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_delete_org_member(uuid, uuid) TO authenticated;