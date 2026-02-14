-- Allow users to read profiles of other users in the same organization (e.g. Members page).
-- Existing policies: profiles_select_own (own), profiles_select_master (master read all).
CREATE POLICY "profiles_select_same_org" ON public.profiles
FOR SELECT USING (
  id IN (
    SELECT om.user_id
    FROM public.organization_members om
    WHERE om.org_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  )
);
