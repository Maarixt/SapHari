import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export type OrgType = 'house' | 'farm' | 'business' | 'other';
export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface Organization {
  id: string;
  name: string;
  type: OrgType;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
  profile?: {
    email: string | null;
    display_name: string | null;
  };
}

export interface OrganizationInvite {
  id: string;
  org_id: string;
  invited_by_user_id: string;
  invitee_email: string;
  token: string;
  status: InviteStatus;
  role: OrgRole;
  expires_at: string;
  created_at: string;
  organization?: Organization;
}

interface OrganizationsContextType {
  organizations: Organization[];
  currentOrg: Organization | null;
  setCurrentOrg: (org: Organization | null) => void;
  isLoading: boolean;
  error: string | null;
  myRole: OrgRole | null;
  isOwnerOrAdmin: boolean;
  pendingInvites: OrganizationInvite[];
  createOrganization: (name: string, type: OrgType) => Promise<Organization>;
  updateOrganization: (id: string, data: Partial<Organization>) => Promise<void>;
  deleteOrganization: (id: string) => Promise<void>;
  inviteMember: (email: string, role: OrgRole) => Promise<void>;
  acceptInvite: (token: string) => Promise<void>;
  declineInvite: (inviteId: string) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  updateMemberRole: (memberId: string, role: OrgRole) => Promise<void>;
  refetch: () => void;
}

const OrganizationsContext = createContext<OrganizationsContextType | undefined>(undefined);

const CURRENT_ORG_KEY = 'saphari-current-org';

export function OrganizationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentOrg, setCurrentOrgState] = useState<Organization | null>(null);

  // Fetch organizations
  const { data: organizations = [], isLoading, error, refetch } = useQuery({
    queryKey: ['organizations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as Organization[];
    },
    enabled: !!user,
  });

  // Fetch pending invites for current user
  const { data: pendingInvites = [] } = useQuery({
    queryKey: ['pending-invites', user?.id],
    queryFn: async () => {
      if (!user?.email) return [];
      const { data, error } = await supabase
        .from('organization_invites')
        .select('*, organization:organizations(*)')
        .eq('invitee_email', user.email)
        .eq('status', 'pending');
      
      if (error) throw error;
      return (data || []).map(invite => ({
        ...invite,
        organization: invite.organization as unknown as Organization
      })) as OrganizationInvite[];
    },
    enabled: !!user?.email,
  });

  // Fetch current user's role in current org
  const { data: myRole } = useQuery({
    queryKey: ['my-org-role', currentOrg?.id, user?.id],
    queryFn: async () => {
      if (!currentOrg || !user) return null;
      const { data, error } = await supabase
        .from('organization_members')
        .select('role')
        .eq('org_id', currentOrg.id)
        .eq('user_id', user.id)
        .single();
      
      if (error) return null;
      return data?.role as OrgRole;
    },
    enabled: !!currentOrg && !!user,
  });

  // Set current org from localStorage or first org
  useEffect(() => {
    if (organizations.length > 0 && !currentOrg) {
      const savedOrgId = localStorage.getItem(CURRENT_ORG_KEY);
      const savedOrg = organizations.find(o => o.id === savedOrgId);
      setCurrentOrgState(savedOrg || organizations[0]);
    }
  }, [organizations, currentOrg]);

  const setCurrentOrg = useCallback((org: Organization | null) => {
    setCurrentOrgState(org);
    if (org) {
      localStorage.setItem(CURRENT_ORG_KEY, org.id);
    } else {
      localStorage.removeItem(CURRENT_ORG_KEY);
    }
    queryClient.invalidateQueries({ queryKey: ['devices'] });
  }, [queryClient]);

  // Create organization
  const createOrganization = async (name: string, type: OrgType): Promise<Organization> => {
    if (!user) throw new Error('Not authenticated');
    
    // Insert organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ name, type, owner_user_id: user.id })
      .select()
      .single();
    
    if (orgError) throw orgError;
    
    // Add owner as member
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({ org_id: org.id, user_id: user.id, role: 'owner' });
    
    if (memberError) throw memberError;
    
    queryClient.invalidateQueries({ queryKey: ['organizations'] });
    setCurrentOrg(org as Organization);
    return org as Organization;
  };

  // Update organization
  const updateOrganization = async (id: string, data: Partial<Organization>) => {
    const { error } = await supabase
      .from('organizations')
      .update(data)
      .eq('id', id);
    
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['organizations'] });
  };

  // Delete organization
  const deleteOrganization = async (id: string) => {
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    if (currentOrg?.id === id) {
      const remaining = organizations.filter(o => o.id !== id);
      setCurrentOrg(remaining[0] || null);
    }
    queryClient.invalidateQueries({ queryKey: ['organizations'] });
  };

  // Invite member
  const inviteMember = async (email: string, role: OrgRole) => {
    if (!currentOrg || !user) throw new Error('No organization selected');
    
    const { error } = await supabase
      .from('organization_invites')
      .insert({
        org_id: currentOrg.id,
        invited_by_user_id: user.id,
        invitee_email: email,
        role,
      });
    
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['org-invites'] });
  };

  // Accept invite
  const acceptInvite = async (token: string) => {
    if (!user) throw new Error('Not authenticated');
    
    // Get invite
    const { data: invite, error: inviteError } = await supabase
      .from('organization_invites')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();
    
    if (inviteError || !invite) throw new Error('Invalid or expired invite');
    
    // Check expiry
    if (new Date(invite.expires_at) < new Date()) {
      await supabase
        .from('organization_invites')
        .update({ status: 'expired' })
        .eq('id', invite.id);
      throw new Error('Invite has expired');
    }
    
    // Add as member
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        org_id: invite.org_id,
        user_id: user.id,
        role: invite.role,
      });
    
    if (memberError) throw memberError;
    
    // Mark invite as accepted
    await supabase
      .from('organization_invites')
      .update({ status: 'accepted' })
      .eq('id', invite.id);
    
    queryClient.invalidateQueries({ queryKey: ['organizations'] });
    queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
  };

  // Decline invite
  const declineInvite = async (inviteId: string) => {
    const { error } = await supabase
      .from('organization_invites')
      .update({ status: 'revoked' })
      .eq('id', inviteId);
    
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
  };

  // Remove member
  const removeMember = async (memberId: string) => {
    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', memberId);
    
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['org-members'] });
  };

  // Update member role
  const updateMemberRole = async (memberId: string, role: OrgRole) => {
    const { error } = await supabase
      .from('organization_members')
      .update({ role })
      .eq('id', memberId);
    
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['org-members'] });
  };

  const isOwnerOrAdmin = myRole === 'owner' || myRole === 'admin';

  return (
    <OrganizationsContext.Provider value={{
      organizations,
      currentOrg,
      setCurrentOrg,
      isLoading,
      error: error?.message || null,
      myRole,
      isOwnerOrAdmin,
      pendingInvites,
      createOrganization,
      updateOrganization,
      deleteOrganization,
      inviteMember,
      acceptInvite,
      declineInvite,
      removeMember,
      updateMemberRole,
      refetch,
    }}>
      {children}
    </OrganizationsContext.Provider>
  );
}

export function useOrganizations() {
  const context = useContext(OrganizationsContext);
  if (!context) {
    throw new Error('useOrganizations must be used within OrganizationsProvider');
  }
  return context;
}

// Hook to get org members
export function useOrgMembers(orgId: string | undefined) {
  return useQuery({
    queryKey: ['org-members', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      
      // First get the members
      const { data: members, error: membersError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: true });
      
      if (membersError) throw membersError;
      if (!members || members.length === 0) return [];
      
      // Then get profiles for each member
      const userIds = members.map(m => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, display_name')
        .in('id', userIds);
      
      if (profilesError) throw profilesError;
      
      // Combine the data
      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
      return members.map(m => ({
        ...m,
        profile: profilesMap.get(m.user_id) || null,
      })) as OrganizationMember[];
    },
    enabled: !!orgId,
  });
}

// Hook to get org invites
export function useOrgInvites(orgId: string | undefined) {
  return useQuery({
    queryKey: ['org-invites', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('organization_invites')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as OrganizationInvite[];
    },
    enabled: !!orgId,
  });
}
