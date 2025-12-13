-- UPDATE DEVICES RLS TO INCLUDE ORG CHECK
DROP POLICY IF EXISTS "devices_select_own" ON public.devices;
DROP POLICY IF EXISTS "devices_insert_own" ON public.devices;
DROP POLICY IF EXISTS "devices_update_own" ON public.devices;
DROP POLICY IF EXISTS "devices_delete_own" ON public.devices;
DROP POLICY IF EXISTS "devices_select_master" ON public.devices;
DROP POLICY IF EXISTS "devices_update_master" ON public.devices;
DROP POLICY IF EXISTS "devices_select_org" ON public.devices;
DROP POLICY IF EXISTS "devices_insert_org" ON public.devices;
DROP POLICY IF EXISTS "devices_update_org" ON public.devices;
DROP POLICY IF EXISTS "devices_delete_org" ON public.devices;

CREATE POLICY "devices_select_org" ON public.devices
FOR SELECT USING (
  user_id = auth.uid() 
  OR (org_id IS NOT NULL AND public.is_org_member(org_id, auth.uid()))
  OR public.is_master(auth.uid())
);

CREATE POLICY "devices_insert_org" ON public.devices
FOR INSERT WITH CHECK (
  user_id = auth.uid() 
  AND (org_id IS NULL OR public.is_org_admin(org_id, auth.uid()))
);

CREATE POLICY "devices_update_org" ON public.devices
FOR UPDATE USING (
  user_id = auth.uid() 
  OR (org_id IS NOT NULL AND public.is_org_admin(org_id, auth.uid()))
  OR public.is_master(auth.uid())
);

CREATE POLICY "devices_delete_org" ON public.devices
FOR DELETE USING (
  user_id = auth.uid() 
  OR (org_id IS NOT NULL AND public.is_org_admin(org_id, auth.uid()))
);

-- MIGRATION: CREATE DEFAULT ORGS FOR EXISTING USERS WITH DEVICES
DO $$
DECLARE
  r RECORD;
  new_org_id uuid;
BEGIN
  FOR r IN 
    SELECT DISTINCT d.user_id, p.display_name, p.email
    FROM public.devices d
    LEFT JOIN public.profiles p ON p.id = d.user_id
    WHERE d.org_id IS NULL
  LOOP
    INSERT INTO public.organizations (name, type, owner_user_id)
    VALUES (COALESCE(r.display_name, split_part(r.email, '@', 1), 'User') || '''s Home', 'house'::public.org_type, r.user_id)
    RETURNING id INTO new_org_id;
    
    INSERT INTO public.organization_members (org_id, user_id, role)
    VALUES (new_org_id, r.user_id, 'owner'::public.org_role);
    
    UPDATE public.devices 
    SET org_id = new_org_id 
    WHERE user_id = r.user_id AND org_id IS NULL;
  END LOOP;
END $$;