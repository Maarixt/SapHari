import { useOrganizations } from '@/hooks/useOrganizations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Mail, Check, X, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function PendingInvites() {
  const { pendingInvites, acceptInvite, declineInvite } = useOrganizations();

  if (pendingInvites.length === 0) {
    return null;
  }

  const handleAccept = async (token: string) => {
    try {
      await acceptInvite(token);
      toast.success('You have joined the organization');
    } catch (error: any) {
      toast.error(error.message || 'Failed to accept invite');
    }
  };

  const handleDecline = async (inviteId: string) => {
    try {
      await declineInvite(inviteId);
      toast.success('Invite declined');
    } catch (error: any) {
      toast.error(error.message || 'Failed to decline invite');
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mail className="h-5 w-5 text-primary" />
          Pending Invitations
        </CardTitle>
        <CardDescription>
          You have been invited to join these organizations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingInvites.map((invite) => (
          <div
            key={invite.id}
            className="flex items-center justify-between gap-4 p-3 rounded-lg bg-background border"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">
                {invite.organization?.name || 'Unknown Organization'}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary" className="capitalize">
                  {invite.role}
                </Badge>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Expires {formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDecline(invite.id)}
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => handleAccept(invite.token)}
              >
                <Check className="h-4 w-4 mr-1" />
                Accept
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
