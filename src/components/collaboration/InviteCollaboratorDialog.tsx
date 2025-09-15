import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { roleDescriptions } from '@/lib/roles';

interface InviteCollaboratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId: string;
  deviceName: string;
  onInviteSent: () => void;
}

export const InviteCollaboratorDialog = ({
  open,
  onOpenChange,
  deviceId,
  deviceName,
  onInviteSent
}: InviteCollaboratorDialogProps) => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'operator' | 'collaborator'>('viewer');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('collaborators')
        .insert({
          device_id: deviceId,
          user_email: email.trim().toLowerCase(),
          role
        });

      if (error) throw error;

      toast({
        title: "Invitation sent",
        description: `${email} has been invited as ${role} to ${deviceName}`
      });

      setEmail('');
      setRole('viewer');
      onInviteSent();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error sending invitation",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Collaborator</DialogTitle>
          <DialogDescription>
            Invite someone to collaborate on {deviceName}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value: any) => setRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">
                  <div>
                    <div className="font-medium">Viewer</div>
                    <div className="text-sm text-muted-foreground">{roleDescriptions.viewer}</div>
                  </div>
                </SelectItem>
                <SelectItem value="operator">
                  <div>
                    <div className="font-medium">Operator</div>
                    <div className="text-sm text-muted-foreground">{roleDescriptions.operator}</div>
                  </div>
                </SelectItem>
                <SelectItem value="collaborator">
                  <div>
                    <div className="font-medium">Collaborator</div>
                    <div className="text-sm text-muted-foreground">{roleDescriptions.collaborator}</div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};