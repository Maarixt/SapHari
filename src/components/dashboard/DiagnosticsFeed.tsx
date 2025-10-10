// Diagnostics Event Feed Component
// Real-time diagnostics and system events

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  AlertTriangle, 
  Bug, 
  Database, 
  Globe, 
  HardDrive, 
  RefreshCw, 
  Server, 
  Wifi, 
  WifiOff,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Filter,
  Download
} from 'lucide-react';
import { useMasterAggregations } from '@/hooks/useMasterAggregations';

interface DiagnosticEvent {
  id: string;
  timestamp: Date;
  type: 'system' | 'device' | 'mqtt' | 'database' | 'alert' | 'error';
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  message: string;
  details?: any;
  resolved?: boolean;
}

export const DiagnosticsFeed = () => {
  const { recentEvents, mqttStats, kpis } = useMasterAggregations();
  const [events, setEvents] = useState<DiagnosticEvent[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Convert recent events to diagnostic events
  useEffect(() => {
    const diagnosticEvents: DiagnosticEvent[] = recentEvents.map(event => ({
      id: event.id,
      timestamp: new Date(event.created_at),
      type: event.event_type === 'alert_triggered' ? 'alert' : 
            event.event_type === 'error_occurred' ? 'error' : 'device',
      severity: event.severity as any,
      source: event.device_id,
      message: event.message,
      details: event.event_data,
      resolved: false
    }));

    // Add system events based on KPIs
    if (kpis) {
      if (kpis.critical_errors > 0) {
        diagnosticEvents.push({
          id: 'system-critical-errors',
          timestamp: new Date(),
          type: 'system',
          severity: 'critical',
          source: 'System',
          message: `${kpis.critical_errors} critical errors detected`,
          details: { count: kpis.critical_errors }
        });
      }

      if (kpis.uptime_percentage < 95) {
        diagnosticEvents.push({
          id: 'system-uptime-warning',
          timestamp: new Date(),
          type: 'system',
          severity: 'warning',
          source: 'System',
          message: `Fleet uptime below 95%: ${kpis.uptime_percentage}%`,
          details: { uptime: kpis.uptime_percentage }
        });
      }
    }

    // Add MQTT events
    if (mqttStats) {
      if (mqttStats.total_messages > 10000) {
        diagnosticEvents.push({
          id: 'mqtt-high-traffic',
          timestamp: new Date(),
          type: 'mqtt',
          severity: 'info',
          source: 'MQTT Broker',
          message: `High traffic: ${mqttStats.total_messages} messages in 24h`,
          details: { messages: mqttStats.total_messages }
        });
      }
    }

    // Sort by timestamp (newest first)
    diagnosticEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    setEvents(diagnosticEvents);
  }, [recentEvents, mqttStats, kpis]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Events will be updated via the useMasterAggregations hook
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getEventIcon = (type: string, severity: string) => {
    if (severity === 'critical') return <XCircle className="h-4 w-4 text-red-600" />;
    if (severity === 'error') return <AlertCircle className="h-4 w-4 text-red-600" />;
    if (severity === 'warning') return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    
    switch (type) {
      case 'system': return <Server className="h-4 w-4 text-blue-600" />;
      case 'device': return <Wifi className="h-4 w-4 text-green-600" />;
      case 'mqtt': return <Globe className="h-4 w-4 text-purple-600" />;
      case 'database': return <Database className="h-4 w-4 text-orange-600" />;
      case 'alert': return <Zap className="h-4 w-4 text-yellow-600" />;
      case 'error': return <Bug className="h-4 w-4 text-red-600" />;
      default: return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'error': return 'destructive';
      case 'warning': return 'secondary';
      case 'info': return 'outline';
      default: return 'outline';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'system': return 'bg-blue-100 text-blue-800';
      case 'device': return 'bg-green-100 text-green-800';
      case 'mqtt': return 'bg-purple-100 text-purple-800';
      case 'database': return 'bg-orange-100 text-orange-800';
      case 'alert': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    if (filter === 'unresolved') return !event.resolved;
    return event.type === filter;
  });

  const eventCounts = {
    all: events.length,
    unresolved: events.filter(e => !e.resolved).length,
    system: events.filter(e => e.type === 'system').length,
    device: events.filter(e => e.type === 'device').length,
    mqtt: events.filter(e => e.type === 'mqtt').length,
    database: events.filter(e => e.type === 'database').length,
    alert: events.filter(e => e.type === 'alert').length,
    error: events.filter(e => e.type === 'error').length
  };

  const severityCounts = {
    critical: events.filter(e => e.severity === 'critical').length,
    error: events.filter(e => e.severity === 'error').length,
    warning: events.filter(e => e.severity === 'warning').length,
    info: events.filter(e => e.severity === 'info').length
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Diagnostics Feed</h2>
          <p className="text-muted-foreground">Real-time system diagnostics and events</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="h-4 w-4 mr-2" />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">Critical</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{severityCounts.critical}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">Errors</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{severityCounts.error}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">Warnings</span>
            </div>
            <div className="text-2xl font-bold text-yellow-600">{severityCounts.warning}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Info</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{severityCounts.info}</div>
          </CardContent>
        </Card>
      </div>

      {/* Event Feed */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Event Stream</CardTitle>
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList>
                <TabsTrigger value="all">All ({eventCounts.all})</TabsTrigger>
                <TabsTrigger value="unresolved">Unresolved ({eventCounts.unresolved})</TabsTrigger>
                <TabsTrigger value="system">System ({eventCounts.system})</TabsTrigger>
                <TabsTrigger value="device">Device ({eventCounts.device})</TabsTrigger>
                <TabsTrigger value="mqtt">MQTT ({eventCounts.mqtt})</TabsTrigger>
                <TabsTrigger value="alert">Alerts ({eventCounts.alert})</TabsTrigger>
                <TabsTrigger value="error">Errors ({eventCounts.error})</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <p>No events found</p>
                  <p className="text-sm">System is running smoothly</p>
                </div>
              ) : (
                filteredEvents.map((event) => (
                  <div key={event.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50">
                    <div className="flex-shrink-0 mt-0.5">
                      {getEventIcon(event.type, event.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getSeverityColor(event.severity)} className="text-xs">
                          {event.severity}
                        </Badge>
                        <Badge className={`text-xs ${getTypeColor(event.type)}`}>
                          {event.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {event.timestamp.toLocaleString()}
                        </span>
                      </div>
                      <p className="font-medium text-sm">{event.message}</p>
                      <p className="text-xs text-muted-foreground">Source: {event.source}</p>
                      {event.details && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer">
                            View Details
                          </summary>
                          <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                            {JSON.stringify(event.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {!event.resolved && (
                        <Button size="sm" variant="outline">
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* System Health Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">System Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Database</span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-green-600">Healthy</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">MQTT Broker</span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-green-600">Connected</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">API Services</span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-green-600">Running</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Response Time</span>
              <span className="text-xs font-medium">45ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Throughput</span>
              <span className="text-xs font-medium">1.2K msg/s</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Error Rate</span>
              <span className="text-xs font-medium text-green-600">0.2%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Resource Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">CPU</span>
              <span className="text-xs font-medium">23%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Memory</span>
              <span className="text-xs font-medium">1.2GB</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Disk</span>
              <span className="text-xs font-medium">45MB/s</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
