import { useState } from 'react';
import { useOrganizations, useOrgMembers, useOrgInvites, OrgRole } from '@/hooks/useOrganizations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Users, UserPlus, Mail, Trash2, Crown, Shield, User, Eye, Clock, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { InviteMemberDialog } from './InviteMemberDialog';

const roleIcons: Record<OrgRole, React.ReactNode> = {
  owner: <Crown className="h-3 w-3" />,
  admin: <Shield className="h-3 w-3" />,
  member: <User className="h-3 w-3" />,
  viewer: <Eye className="h-3 w-3" />,
};

const roleColors: Record<OrgRole, string> = {
  owner: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  admin: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  member: 'bg-green-500/10 text-green-600 border-green-500/20',
  viewer: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
};

export function OrgMembersPanel() {
  const { currentOrg, isOwnerOrAdmin, removeMember, updateMemberRole } = useOrganizations();
  const { data: members = [], isLoading: membersLoading } = useOrgMembers(currentOrg?.id);
  const { data: invites = [], isLoading: invitesLoading } = useOrgInvites(currentOrg?.id);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const pendingInvites = invites.filter(i => i.status === 'pending');

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeMember(memberId);
      toast.success('Member removed');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove member');
    }
  };

  const handleRoleChange = async (memberId: string, newRole: OrgRole) => {
    try {
      await updateMemberRole(memberId, newRole);
      toast.success('Role updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update role');
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    // Would need to add this to the hook - for now just show toast
    toast.info('Invite cancellation coming soon');
  };

  if (!currentOrg) {
    return <div className="p-4 text-center text-muted-foreground">No organization selected</div>;
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Members
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage who has access to {currentOrg.name}
          </p>
        </div>
        {isOwnerOrAdmin && (
          <Button onClick={() => setShowInviteDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite
          </Button>
        )}
      </div>

      {/* Members list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Members</CardTitle>
          <CardDescription>{members.length} member(s)</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
              <Avatar>
                <AvatarFallback>
                  {(member.profile?.display_name || member.profile?.email || '?')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {member.profile?.display_name || member.profile?.email || 'Unknown'}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {member.profile?.email}
                </div>
              </div>
              
              {isOwnerOrAdmin && member.role !== 'owner' ? (
                <Select
                  value={member.role}
                  onValueChange={(v) => handleRoleChange(member.id, v as OrgRole)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline" className={roleColors[member.role]}>
                  {roleIcons[member.role]}
                  <span className="ml-1 capitalize">{member.role}</span>
                </Badge>
              )}

              {isOwnerOrAdmin && member.role !== 'owner' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleRemoveMember(member.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Pending Invites
            </CardTitle>
            <CardDescription>{pendingInvites.length} pending</CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                <Avatar>
                  <AvatarFallback>{invite.invitee_email[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{invite.invitee_email}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Expires {formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })}
                  </div>
                </div>
                <Badge variant="outline" className={roleColors[invite.role]}>
                  {roleIcons[invite.role]}
                  <span className="ml-1 capitalize">{invite.role}</span>
                </Badge>
                {isOwnerOrAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCancelInvite(invite.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <InviteMemberDialog open={showInviteDialog} onOpenChange={setShowInviteDialog} />
    </div>
  );
}
