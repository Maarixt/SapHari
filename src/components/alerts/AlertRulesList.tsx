import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, Trash2, Pencil, Cpu } from 'lucide-react';
import { useAlertRules, AlertRule } from '@/hooks/useAlertRules';
import { CreateAlertRuleDialog } from './CreateAlertRuleDialog';
import { formatDistanceToNow } from 'date-fns';

function getSeverityColor(severity: string) {
  switch (severity) {
    case 'critical': return 'destructive';
    case 'warning': return 'secondary';
    default: return 'outline';
  }
}

function getConditionLabel(condition: string): string {
  switch (condition) {
    case 'equals': return '=';
    case 'not_equals': return '≠';
    case 'greater_than': return '>';
    case 'less_than': return '<';
    case 'rising': return '↑ (0→1)';
    case 'falling': return '↓ (1→0)';
    case 'changes': return '~ changes';
    default: return condition;
  }
}

function RuleCard({ rule, onToggle, onDelete }: { 
  rule: AlertRule; 
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const sourceLabel = rule.source === 'GPIO' 
    ? `GPIO ${rule.pin}` 
    : rule.source === 'SENSOR'
    ? rule.sensor_key
    : 'Online Status';

  return (
    <div className="border border-border rounded-lg p-4 bg-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium truncate">{rule.name}</h3>
            <Badge variant={getSeverityColor(rule.severity)} className="text-xs">
              {rule.severity}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Cpu className="h-3.5 w-3.5" />
            <span>{rule.device?.name || 'Unknown device'}</span>
          </div>

          <p className="text-sm text-muted-foreground">
            When <span className="font-mono text-foreground">{sourceLabel}</span>
            {' '}{getConditionLabel(rule.condition)}{' '}
            <span className="font-mono text-foreground">{rule.expected_value}</span>
          </p>

          <p className="text-sm mt-1">
            → "{rule.message_template}"
          </p>

          {rule.last_fired_at && (
            <p className="text-xs text-muted-foreground mt-2">
              Last fired {formatDistanceToNow(new Date(rule.last_fired_at), { addSuffix: true })}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={rule.enabled}
            onCheckedChange={(checked) => onToggle(rule.id, checked)}
          />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(rule.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AlertRulesList() {
  const { rules, loading, toggleRule, deleteRule } = useAlertRules();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alert Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Alert Rules
        </CardTitle>
        <CreateAlertRuleDialog />
      </CardHeader>
      <CardContent>
        {rules.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No alert rules yet</p>
            <p className="text-sm mb-4">Create a rule to get notified when device conditions are met</p>
            <CreateAlertRuleDialog trigger={
              <Button variant="outline">Create your first rule</Button>
            } />
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map(rule => (
              <RuleCard 
                key={rule.id} 
                rule={rule} 
                onToggle={toggleRule}
                onDelete={deleteRule}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
