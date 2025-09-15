import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Trash2, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { InviteCollaboratorDialog } from './InviteCollaboratorDialog';
import { Collaborator } from '@/lib/types';
import { roleDescriptions } from '@/lib/roles';

interface CollaboratorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId: string;
  deviceName: string;
  canManageCollaborators: boolean;
}

export const CollaboratorsDialog = ({
  open,
  onOpenChange,
  deviceId,
  deviceName,
  canManageCollaborators
}: CollaboratorsDialogProps) => {
  const { toast } = useToast();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const loadCollaborators = async () => {
    try {
      const { data, error } = await supabase
        .from('collaborators')
        .select('*')
        .eq('device_id', deviceId)
        .order('invited_at', { ascending: false });

      if (error) throw error;
      setCollaborators(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading collaborators",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const removeCollaborator = async (collaboratorId: string, email: string) => {
    try {
      const { error } = await supabase
        .from('collaborators')
        .delete()
        .eq('id', collaboratorId);

      if (error) throw error;

      toast({
        title: "Collaborator removed",
        description: `${email} has been removed from ${deviceName}`
      });

      loadCollaborators();
    } catch (error: any) {
      toast({
        title: "Error removing collaborator",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (open) {
      loadCollaborators();
    }
  }, [open, deviceId]);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'collaborator': return 'default';
      case 'operator': return 'secondary';
      case 'viewer': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Collaborators</DialogTitle>
            <DialogDescription>
              Manage who has access to {deviceName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {canManageCollaborators && (
              <Button
                onClick={() => setShowInviteDialog(true)}
                className="w-full"
                variant="outline"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Collaborator
              </Button>
            )}

            {loading ? (
              <div className="text-center py-4 text-muted-foreground">
                Loading collaborators...
              </div>
            ) : collaborators.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No collaborators yet
              </div>
            ) : (
              <div className="space-y-2">
                {collaborators.map((collaborator) => (
                  <div
                    key={collaborator.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{collaborator.user_email}</div>
                      <div className="text-sm text-muted-foreground">
                        {roleDescriptions[collaborator.role as keyof typeof roleDescriptions]}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getRoleBadgeVariant(collaborator.role)}>
                        {collaborator.role}
                      </Badge>
                      {canManageCollaborators && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeCollaborator(collaborator.id, collaborator.user_email)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {canManageCollaborators && (
        <InviteCollaboratorDialog
          open={showInviteDialog}
          onOpenChange={setShowInviteDialog}
          deviceId={deviceId}
          deviceName={deviceName}
          onInviteSent={loadCollaborators}
        />
      )}
    </>
  );
};