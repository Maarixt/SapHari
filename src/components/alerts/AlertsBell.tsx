import React, { useEffect, useRef, useState } from 'react';
import { AlertsStore } from '@/state/alertsStore';
import { AlertEntry } from '@/state/alertsTypes';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function AlertsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AlertEntry[]>(AlertsStore.listHistory());
  const [unread, setUnread] = useState(AlertsStore.countUnread());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = AlertsStore.subscribe(() => {
      setItems(AlertsStore.listHistory());
      setUnread(AlertsStore.countUnread());
    });
    return unsub;
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-600';
      case 'warning': return 'bg-yellow-600';
      case 'info': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="outline"
        size="icon"
        className="relative h-8 w-8"
        onClick={() => {
          setOpen(!open);
          if (!open) AlertsStore.markAllSeen();
        }}
        title="Alerts"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
          >
            {unread > 9 ? '9+' : unread}
          </Badge>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border bg-card shadow-2xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="font-semibold">Alerts</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => AlertsStore.markAllSeen()}
              className="text-xs"
            >
              Mark all read
            </Button>
          </div>

          <div className="max-h-96 overflow-auto">
            {items.length === 0 ? (
              <div className="px-4 py-6 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No alerts yet</p>
              </div>
            ) : (
              <div className="divide-y">
                {items.map(a => (
                  <div 
                    key={a.id} 
                    className={`px-4 py-3 ${a.seen ? '' : 'bg-muted/50'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-2 h-2 rounded-full ${getSeverityColor(a.severity)}`} />
                          <span className="font-medium text-sm truncate">{a.ruleName}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {a.deviceId} • {String(a.value)} • {new Date(a.ts).toLocaleString()}
                        </div>
                        {a.channels && a.channels.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {a.channels.slice(0, 3).map(channel => (
                              <Badge key={channel} variant="outline" className="text-xs px-1 py-0">
                                {channel}
                              </Badge>
                            ))}
                            {a.channels.length > 3 && (
                              <Badge variant="outline" className="text-xs px-1 py-0">
                                +{a.channels.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {a.ack ? (
                          <Badge variant="secondary" className="text-xs">
                            Ack'd
                          </Badge>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => AlertsStore.ack(a.id)}
                            className="text-xs h-6 px-2"
                          >
                            Ack
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                // This would open the alert rules modal
                console.log('Open alert rules modal');
              }}
              className="text-xs"
            >
              Manage alert rules
            </Button>
            <div className="text-xs text-muted-foreground">
              {items.length} total alerts
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
