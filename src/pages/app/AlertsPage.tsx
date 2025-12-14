import { AlertRulesList } from '@/components/alerts/AlertRulesList';
import { AlertInbox } from '@/components/alerts/AlertInbox';

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Alerts</h1>
        <p className="text-muted-foreground">Manage notification rules and view alert history</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AlertRulesList />
        <AlertInbox />
      </div>
    </div>
  );
}
