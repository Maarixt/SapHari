// Master Dashboard Diagnostics Tab
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Database, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Wifi, 
  WifiOff,
  RefreshCw,
  Search,
  Filter,
  Play,
  Square
} from 'lucide-react';
import { useMasterAuditLogs, useMasterDevices } from '@/hooks/useMasterDashboard';

interface EventItem {
  id: string;
  timestamp: string;
  type: 'device.online' | 'device.offline' | 'mqtt.error' | 'fw.crash' | 'alert.triggered' | 'user.login';
  device?: string;
  user?: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

interface DeviceHealth {
  id: string;
  name: string;
  device_id: string;
  online: boolean;
  last_seen: string;
  gap: string;
  status: 'healthy' | 'warning' | 'critical';
}

// Mock data - replace with real data from hooks
const mockEvents: EventItem[] = [
  {
    id: '1',
    timestamp: '2024-01-16T10:30:00Z',
    type: 'device.online',
    device: 'ESP32-001',
    message: 'Device ESP32-001 came online',
    severity: 'info'
  },
  {
    id: '2',
    timestamp: '2024-01-16T10:25:00Z',
    type: 'mqtt.error',
    device: 'ESP32-002',
    message: 'MQTT connection timeout',
    severity: 'error'
  },
  {
    id: '3',
    timestamp: '2024-01-16T10:20:00Z',
    type: 'alert.triggered',
    device: 'ESP32-003',
    message: 'Temperature threshold exceeded',
    severity: 'warning'
  },
  {
    id: '4',
    timestamp: '2024-01-16T10:15:00Z',
    type: 'user.login',
    user: 'admin@example.com',
    message: 'User logged in from 192.168.1.100',
    severity: 'info'
  },
  {
    id: '5',
    timestamp: '2024-01-16T10:10:00Z',
    type: 'fw.crash',
    device: 'ESP32-004',
    message: 'Firmware crash detected, restarting...',
    severity: 'critical'
  }
];

const mockDeviceHealth: DeviceHealth[] = [
  {
    id: '1',
    name: 'Living Room Sensor',
    device_id: 'ESP32-001',
    online: true,
    last_seen: '2024-01-16T10:30:00Z',
    gap: '2 minutes',
    status: 'healthy'
  },
  {
    id: '2',
    name: 'Kitchen Monitor',
    device_id: 'ESP32-002',
    online: false,
    last_seen: '2024-01-16T09:45:00Z',
    gap: '45 minutes',
    status: 'critical'
  },
  {
    id: '3',
    name: 'Bedroom Controller',
    device_id: 'ESP32-003',
    online: true,
    last_seen: '2024-01-16T10:28:00Z',
    gap: '4 minutes',
    status: 'warning'
  }
];

function EventItem({ event }: { event: EventItem }) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'error': return 'bg-red-50 text-red-700 border-red-200';
      case 'warning': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'device.online': return <Wifi className="h-4 w-4 text-green-600" />;
      case 'device.offline': return <WifiOff className="h-4 w-4 text-red-600" />;
      case 'mqtt.error': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'fw.crash': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'alert.triggered': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'user.login': return <CheckCircle className="h-4 w-4 text-blue-600" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50">
      <div className="flex-shrink-0 mt-1">
        {getTypeIcon(event.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className={getSeverityColor(event.severity)}>
            {event.severity}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {new Date(event.timestamp).toLocaleString()}
          </span>
        </div>
        <p className="text-sm font-medium">{event.message}</p>
        {(event.device || event.user) && (
          <p className="text-xs text-muted-foreground mt-1">
            {event.device ? `Device: ${event.device}` : `User: ${event.user}`}
          </p>
        )}
      </div>
    </div>
  );
}

function DeviceHealthItem({ device }: { device: DeviceHealth }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-50 text-green-700 border-green-200';
      case 'warning': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'critical': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string, online: boolean) => {
    if (!online) return <WifiOff className="h-4 w-4 text-red-600" />;
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          {getStatusIcon(device.status, device.online)}
        </div>
        <div>
          <h4 className="font-medium">{device.name}</h4>
          <p className="text-sm text-muted-foreground">ID: {device.device_id}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium">
            {device.online ? 'Online' : 'Offline'}
          </p>
          <p className="text-xs text-muted-foreground">
            Gap: {device.gap}
          </p>
        </div>
        <Badge variant="outline" className={getStatusColor(device.status)}>
          {device.status}
        </Badge>
        <Button variant="outline" size="sm">
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export function DiagnosticsTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [isTracing, setIsTracing] = useState(false);

  // Use real data from hooks
  const { data: auditLogs, isLoading: auditLoading } = useMasterAuditLogs();
  const { data: devices, isLoading: devicesLoading } = useMasterDevices();

  const filteredEvents = mockEvents.filter(event => {
    const matchesSearch = event.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.device?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.user?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = eventFilter === 'all' || event.severity === eventFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Tools Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Diagnostic Tools
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Events</option>
              <option value="critical">Critical</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>

            <Button
              variant={isTracing ? "destructive" : "outline"}
              onClick={() => setIsTracing(!isTracing)}
            >
              {isTracing ? <Square className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              {isTracing ? 'Stop Trace' : 'Start Trace'}
            </Button>

            <Button variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Ping All Devices
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events">Events Stream</TabsTrigger>
          <TabsTrigger value="heartbeats">Device Heartbeats</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Real-time Events Stream
                {isTracing && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                    Live
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredEvents.map((event) => (
                  <EventItem key={event.id} event={event} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="heartbeats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                Device Heartbeat Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mockDeviceHealth.map((device) => (
                  <DeviceHealthItem key={device.id} device={device} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Audit Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                    <span>Loading audit logs...</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {auditLogs?.map((log: any) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className="flex-shrink-0 mt-1">
                        <Activity className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">
                            {log.action}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm font-medium">
                          {log.profiles?.full_name || log.profiles?.email} - {log.action}
                        </p>
                        {log.subject && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Subject: {log.subject}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
