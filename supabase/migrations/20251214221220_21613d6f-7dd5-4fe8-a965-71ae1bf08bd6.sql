-- A) Fix: Create RPC for organization creation with SECURITY DEFINER
-- This bypasses RLS issues when inserting organization_members

CREATE OR REPLACE FUNCTION public.create_organization_with_owner(
  p_name TEXT,
  p_type TEXT DEFAULT 'house'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
  v_org_type org_type;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Cast to org_type enum
  v_org_type := p_type::org_type;
  
  -- Create the organization
  INSERT INTO public.organizations (name, type, owner_user_id)
  VALUES (p_name, v_org_type, v_user_id)
  RETURNING id INTO v_org_id;
  
  -- Add the creator as owner member
  INSERT INTO public.organization_members (org_id, user_id, role)
  VALUES (v_org_id, v_user_id, 'owner');
  
  RETURN v_org_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.create_organization_with_owner(TEXT, TEXT) TO authenticated;