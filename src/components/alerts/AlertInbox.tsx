import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Inbox, Check, CheckCheck, X, AlertTriangle, Info, AlertCircle, Cpu } from 'lucide-react';
import { useAlerts, Alert } from '@/hooks/useAlerts';
import { formatDistanceToNow } from 'date-fns';

function getSeverityIcon(severity: string | null) {
  switch (severity) {
    case 'crit':
    case 'critical':
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    case 'warn':
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
}

function getStateColor(state: string | null): 'default' | 'secondary' | 'outline' {
  switch (state) {
    case 'open': return 'default';
    case 'ack': return 'secondary';
    case 'closed': return 'outline';
    default: return 'outline';
  }
}

function AlertItem({ alert, onAcknowledge, onClose }: { 
  alert: Alert; 
  onAcknowledge: (id: string) => void;
  onClose: (id: string) => void;
}) {
  const isOpen = alert.state === 'open';
  const isAck = alert.state === 'ack';

  return (
    <div className={`border border-border rounded-lg p-4 bg-card ${!alert.read ? 'border-l-4 border-l-primary' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {getSeverityIcon(alert.severity)}
            <span className="font-medium">{alert.message}</span>
            <Badge variant={getStateColor(alert.state)} className="text-xs">
              {alert.state || 'unknown'}
            </Badge>
          </div>
          
          {alert.device && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Cpu className="h-3.5 w-3.5" />
              <span>{alert.device.name}</span>
            </div>
          )}

          {alert.rule && (
            <p className="text-xs text-muted-foreground">
              Rule: {alert.rule.name}
            </p>
          )}

          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {isOpen && (
            <>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onAcknowledge(alert.id)} title="Acknowledge">
                <Check className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onClose(alert.id)} title="Close">
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
          {isAck && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onClose(alert.id)} title="Close">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function AlertInbox() {
  const { alerts, loading, acknowledge, close, markAllAsRead, unreadCount, openCount } = useAlerts();
  const [filter, setFilter] = useState<'all' | 'open' | 'ack' | 'closed'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'info' | 'warn' | 'crit'>('all');

  const filteredAlerts = alerts.filter(alert => {
    if (filter !== 'all' && alert.state !== filter) return false;
    if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            Alert Inbox
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            Alert Inbox
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">{unreadCount} new</Badge>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {openCount} open alerts
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="ack">Acknowledged</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as any)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="crit">Critical</SelectItem>
              <SelectItem value="warn">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>

          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {filteredAlerts.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <Inbox className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No alerts</p>
            <p className="text-sm">
              {filter !== 'all' || severityFilter !== 'all' 
                ? 'No alerts match your filters' 
                : 'When alerts are triggered, they will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map(alert => (
              <AlertItem key={alert.id} alert={alert} onAcknowledge={acknowledge} onClose={close} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
