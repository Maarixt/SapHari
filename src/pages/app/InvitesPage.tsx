import { PendingInvites } from '@/components/organizations/PendingInvites';

export default function InvitesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Invitations</h1>
        <p className="text-muted-foreground">Manage pending invitations</p>
      </div>
      
      <PendingInvites />
    </div>
  );
}
