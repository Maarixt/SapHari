// Master Dashboard Audit Tab with Complete Audit Trail
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Database, 
  Search, 
  Filter, 
  Download,
  Calendar,
  User,
  Activity,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { useMasterAuditLogs } from '@/hooks/useMasterDashboard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface AuditLog {
  id: number;
  action: string;
  subject: string;
  meta: any;
  created_at: string;
  profiles?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

// Mock audit statistics
const auditStats = {
  totalEvents: 15420,
  todayEvents: 234,
  criticalEvents: 12,
  userActions: 89,
  systemEvents: 145
};

// Mock chart data
const auditChartData = [
  { time: '00:00', events: 12 },
  { time: '04:00', events: 8 },
  { time: '08:00', events: 45 },
  { time: '12:00', events: 67 },
  { time: '16:00', events: 52 },
  { time: '20:00', events: 38 },
  { time: '24:00', events: 15 },
];

const actionTypes = [
  'user.create', 'user.update', 'user.delete', 'user.login', 'user.logout',
  'device.create', 'device.update', 'device.delete', 'device.online', 'device.offline',
  'alert.create', 'alert.update', 'alert.acknowledge', 'alert.close',
  'system.start', 'system.stop', 'system.restart', 'system.backup',
  'security.key.create', 'security.key.revoke', 'security.rule.create'
];

function AuditStatsCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm text-muted-foreground">Total Events</p>
              <p className="text-2xl font-bold">{auditStats.totalEvents.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">Today</p>
              <p className="text-2xl font-bold">{auditStats.todayEvents}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm text-muted-foreground">Critical</p>
              <p className="text-2xl font-bold">{auditStats.criticalEvents}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-purple-600" />
            <div>
              <p className="text-sm text-muted-foreground">User Actions</p>
              <p className="text-2xl font-bold">{auditStats.userActions}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-600" />
            <div>
              <p className="text-sm text-muted-foreground">System Events</p>
              <p className="text-2xl font-bold">{auditStats.systemEvents}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AuditChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Audit Events Timeline (Last 24 Hours)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={auditChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="events" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function AuditLogItem({ log }: { log: AuditLog }) {
  const getActionIcon = (action: string) => {
    if (action.includes('user')) return <User className="h-4 w-4" />;
    if (action.includes('device')) return <Activity className="h-4 w-4" />;
    if (action.includes('alert')) return <AlertTriangle className="h-4 w-4" />;
    if (action.includes('system')) return <Shield className="h-4 w-4" />;
    if (action.includes('security')) return <Shield className="h-4 w-4" />;
    return <Database className="h-4 w-4" />;
  };

  const getActionColor = (action: string) => {
    if (action.includes('create')) return 'bg-green-50 text-green-700 border-green-200';
    if (action.includes('update')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (action.includes('delete')) return 'bg-red-50 text-red-700 border-red-200';
    if (action.includes('login')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (action.includes('logout')) return 'bg-gray-50 text-gray-700 border-gray-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getSeverityBadge = (action: string) => {
    if (action.includes('delete') || action.includes('revoke')) {
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Critical</Badge>;
    }
    if (action.includes('create') || action.includes('update')) {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Important</Badge>;
    }
    return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Info</Badge>;
  };

  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50">
      <div className="flex-shrink-0 mt-1">
        {getActionIcon(log.action)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className={getActionColor(log.action)}>
            {log.action}
          </Badge>
          {getSeverityBadge(log.action)}
          <span className="text-sm text-muted-foreground">
            {new Date(log.created_at).toLocaleString()}
          </span>
        </div>
        <p className="text-sm font-medium">
          {log.profiles?.full_name || log.profiles?.email || 'System'} - {log.action}
        </p>
        {log.subject && (
          <p className="text-xs text-muted-foreground mt-1">
            Subject: {log.subject}
          </p>
        )}
        {log.meta && Object.keys(log.meta).length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            <details>
              <summary className="cursor-pointer hover:text-foreground">View Details</summary>
              <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                {JSON.stringify(log.meta, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

function ExportAuditDialog() {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState('csv');
  const [timeRange, setTimeRange] = useState('24h');
  const [actionFilter, setActionFilter] = useState('all');

  const handleExport = () => {
    // Implement export functionality
    console.log(`Exporting audit logs: ${format}, ${timeRange}, ${actionFilter}`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Audit Log
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Audit Log</DialogTitle>
          <DialogDescription>
            Export audit trail data for compliance and analysis.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Format</label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="xlsx">Excel</SelectItem>
                <SelectItem value="pdf">PDF Report</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Time Range</label>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Action Filter</label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="user">User Actions</SelectItem>
                <SelectItem value="device">Device Actions</SelectItem>
                <SelectItem value="system">System Actions</SelectItem>
                <SelectItem value="security">Security Actions</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport}>
            Export Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AuditTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('24h');

  const { data: auditLogs, isLoading } = useMasterAuditLogs({
    action: actionFilter !== 'all' ? actionFilter : undefined
  });

  const filteredLogs = auditLogs?.filter((log: AuditLog) => {
    const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesUser = userFilter === 'all' || 
                       (userFilter === 'system' && !log.profiles) ||
                       (userFilter !== 'system' && log.profiles);
    
    return matchesSearch && matchesUser;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Audit Trail</h2>
          <p className="text-muted-foreground">Complete system activity and user action logs</p>
        </div>
        <ExportAuditDialog />
      </div>

      {/* Statistics Cards */}
      <AuditStatsCards />

      {/* Chart */}
      <AuditChart />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search audit logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actionTypes.map((action) => (
                    <SelectItem key={action} value={action}>{action}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="system">System Only</SelectItem>
                <SelectItem value="users">Users Only</SelectItem>
              </SelectContent>
            </Select>

            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Audit Logs ({filteredLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <span>Loading audit logs...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredLogs.map((log: AuditLog) => (
                <AuditLogItem key={log.id} log={log} />
              ))}
              {filteredLogs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No audit logs found</p>
                  <p className="text-sm">Try adjusting your filters</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
