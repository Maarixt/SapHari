import { useState } from 'react';
import { Bug, Trash2, ChevronDown, ChevronUp, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useMQTTDebugStore } from '@/stores/mqttDebugStore';
import { cn } from '@/lib/utils';

export function MQTTDebugPanel() {
  const { enabled, logs, setEnabled, clearLogs } = useMQTTDebugStore();
  const [expanded, setExpanded] = useState(false);

  if (!enabled && !expanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setExpanded(true)}
          className="gap-2"
        >
          <Bug className="h-4 w-4" />
          MQTT Debug
        </Button>
      </div>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-96 max-h-[60vh] flex flex-col shadow-lg">
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bug className="h-4 w-4" />
            MQTT Debug
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={clearLogs}
              title="Clear logs"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Switch
            id="mqtt-debug"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
          <Label htmlFor="mqtt-debug" className="text-xs">
            {enabled ? 'Logging enabled' : 'Logging disabled'}
          </Label>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent className="flex-1 overflow-hidden p-2">
          <ScrollArea className="h-64">
            {logs.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                No logs yet. Toggle a switch to see MQTT traffic.
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={cn(
                      "p-2 rounded text-xs font-mono",
                      log.direction === 'outgoing' 
                        ? "bg-blue-500/10 border-l-2 border-blue-500" 
                        : "bg-green-500/10 border-l-2 border-green-500"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        {log.direction === 'outgoing' ? (
                          <><ArrowUp className="h-2 w-2 mr-1" />OUT</>
                        ) : (
                          <><ArrowDown className="h-2 w-2 mr-1" />IN</>
                        )}
                      </Badge>
                      <span className="text-muted-foreground">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-muted-foreground truncate" title={log.topic}>
                      {log.topic}
                    </div>
                    <div className="mt-1 break-all">{log.payload}</div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
}
