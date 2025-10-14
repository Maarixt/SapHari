// Master Dashboard Overview Tab
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KPICard } from '@/components/ui/kpi-card';
import { 
  Users, 
  Cpu, 
  Database, 
  Activity, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  HardDrive
} from 'lucide-react';
import { useMasterKPIs, useMasterRealtime } from '@/hooks/useMasterDashboard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Mock data for sparklines (replace with real data from telemetry)
const mockSparklineData = [
  { time: '00:00', value: 45 },
  { time: '04:00', value: 52 },
  { time: '08:00', value: 48 },
  { time: '12:00', value: 61 },
  { time: '16:00', value: 55 },
  { time: '20:00', value: 49 },
  { time: '24:00', value: 47 },
];

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  sparkline?: boolean;
  color?: 'default' | 'success' | 'warning' | 'destructive';
}

function KPICard({ title, value, icon, trend, trendValue, sparkline, color = 'default' }: KPICardProps) {
  const colorClasses = {
    default: 'text-blue-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    destructive: 'text-red-600'
  };

  const trendIcon = trend === 'up' ? <TrendingUp className="h-3 w-3" /> : 
                   trend === 'down' ? <TrendingDown className="h-3 w-3" /> : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={colorClasses[color]}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && trendValue && (
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            {trendIcon}
            <span className="ml-1">{trendValue}</span>
          </div>
        )}
        {sparkline && (
          <div className="h-8 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockSparklineData}>
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={color === 'success' ? '#22c55e' : color === 'warning' ? '#eab308' : color === 'destructive' ? '#ef4444' : '#3b82f6'} 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function OverviewTab() {
  const { data: kpis, isLoading, error } = useMasterKPIs();
  
  // Setup real-time updates
  useMasterRealtime();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-0 pb-4">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-20 bg-muted rounded"></div>
                  <div className="h-8 w-8 bg-muted rounded-lg"></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-8 w-16 bg-muted rounded"></div>
                <div className="h-3 w-24 bg-muted rounded"></div>
                <div className="h-12 w-full bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div>
              <h3 className="text-lg font-semibold text-destructive">Error Loading KPIs</h3>
              <p className="text-destructive/80">Failed to load master dashboard data</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Modern KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPICard
          title="Total Users"
          value={kpis?.totalUsers || 0}
          icon={<Users className="h-5 w-5" />}
          trend={{ value: 12, direction: 'up', period: 'vs last month' }}
          sparkline={
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockSparklineData}>
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          }
        />
        
        <KPICard
          title="Online Devices"
          value={kpis?.onlineDevices || 0}
          icon={<Cpu className="h-5 w-5" />}
          trend={{ value: 5, direction: 'up', period: 'vs last hour' }}
          variant="success"
          sparkline={
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockSparklineData}>
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--success))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          }
        />
        
        <KPICard
          title="Data Storage"
          value={kpis?.storageUsage || '0 Bytes'}
          icon={<HardDrive className="h-5 w-5" />}
          trend={{ value: 8, direction: 'up', period: 'vs last week' }}
          variant="warning"
          sparkline={
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockSparklineData}>
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--warning))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          }
        />
        
        <KPICard
          title="System Uptime"
          value={kpis?.uptime || '0%'}
          icon={<Activity className="h-5 w-5" />}
          trend={{ value: 0.2, direction: 'up', period: 'vs last day' }}
          variant="success"
          sparkline={
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockSparklineData}>
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--success))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          }
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-24 flex flex-col items-center gap-3 hover:shadow-md transition-all duration-200">
              <div className="p-2 rounded-lg bg-primary/10">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <span className="font-medium">View Diagnostics</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col items-center gap-3 hover:shadow-md transition-all duration-200">
              <div className="p-2 rounded-lg bg-success/10">
                <Cpu className="h-6 w-6 text-success" />
              </div>
              <span className="font-medium">Manage Devices</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col items-center gap-3 hover:shadow-md transition-all duration-200">
              <div className="p-2 rounded-lg bg-warning/10">
                <Users className="h-6 w-6 text-warning" />
              </div>
              <span className="font-medium">User Management</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-success/5 border border-success/20">
                <span className="text-sm font-medium">API Server</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-success rounded-full animate-pulse"></div>
                  <span className="text-sm text-success font-medium">Healthy</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-success/5 border border-success/20">
                <span className="text-sm font-medium">MQTT Broker</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-success rounded-full animate-pulse"></div>
                  <span className="text-sm text-success font-medium">Healthy</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-success/5 border border-success/20">
                <span className="text-sm font-medium">Database</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-success rounded-full animate-pulse"></div>
                  <span className="text-sm text-success font-medium">Healthy</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Device connections</span>
                <span className="text-muted-foreground">2 min ago</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>User login</span>
                <span className="text-muted-foreground">5 min ago</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Alert resolved</span>
                <span className="text-muted-foreground">12 min ago</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Firmware update</span>
                <span className="text-muted-foreground">1 hour ago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Metrics (Last 24 Hours)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockSparklineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Active Devices"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
