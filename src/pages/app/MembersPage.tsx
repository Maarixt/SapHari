import { OrgMembersPanel } from '@/components/organizations/OrgMembersPanel';

export default function MembersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Members & Access</h1>
        <p className="text-muted-foreground">Manage organization members and permissions</p>
      </div>
      
      <OrgMembersPanel />
    </div>
  );
}
