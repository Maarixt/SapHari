import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrganizations, OrgRole } from '@/hooks/useOrganizations';
import { toast } from 'sonner';
import { UserPlus, Shield, Eye, Users } from 'lucide-react';

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const roles: { value: OrgRole; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'admin', label: 'Admin', description: 'Can manage devices and members', icon: <Shield className="h-4 w-4" /> },
  { value: 'member', label: 'Member', description: 'Can control devices', icon: <Users className="h-4 w-4" /> },
  { value: 'viewer', label: 'Viewer', description: 'Can only view devices', icon: <Eye className="h-4 w-4" /> },
];

export function InviteMemberDialog({ open, onOpenChange }: InviteMemberDialogProps) {
  const { inviteMember, currentOrg } = useOrganizations();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgRole>('member');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      await inviteMember(email.trim().toLowerCase(), role);
      toast.success(`Invitation sent to ${email}`);
      onOpenChange(false);
      setEmail('');
      setRole('member');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Invite Member
          </DialogTitle>
          <DialogDescription>
            Invite someone to join {currentOrg?.name}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email Address</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as OrgRole)} disabled={isLoading}>
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    <div className="flex items-center gap-2">
                      {r.icon}
                      <div>
                        <div className="font-medium">{r.label}</div>
                        <div className="text-xs text-muted-foreground">{r.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={!email.trim() || isLoading}>
              {isLoading ? 'Sending...' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
