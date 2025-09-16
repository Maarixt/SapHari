import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

  const handleInviteClick = () => {
    toast({
      title: "Feature coming soon",
      description: "Collaboration features will be available after the database migration is complete."
    });
  };

  return (
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
              onClick={handleInviteClick}
              className="w-full"
              variant="outline"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Collaborator
            </Button>
          )}

          <div className="text-center py-8 text-muted-foreground">
            <Users className="mx-auto h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">Collaboration features coming soon!</p>
            <p className="text-xs mt-1">
              You'll be able to invite team members to view and control your devices.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};