import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MasterLayout } from '@/components/master/MasterLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, RefreshCw, Users, Cpu, Database, Activity, TestTube, Shield, BarChart3, Settings, TrendingUp, CheckCircle, MessageSquare } from 'lucide-react';
import { fetchMasterMetrics, fetchFleetKPIs, fetchDeviceHealth, fetchRecentEvents } from '@/lib/api';
import { useMasterAccount } from '@/hooks/useMasterAccount';
import { useMasterRealtime, useUnreviewedFeedbackCount } from '@/hooks/useMasterData';
import { OverviewTab } from '@/components/master/OverviewTab';
import { DiagnosticsTab } from '@/components/master/DiagnosticsTab';
import { UsersTab } from '@/components/master/UsersTab';
import { DevicesTab } from '@/components/master/DevicesTab';
import { DataLogsTab } from '@/components/master/DataLogsTab';
import { SecurityTab } from '@/components/master/SecurityTab';
import { SystemTab } from '@/components/master/SystemTab';
import { AuditTab } from '@/components/master/AuditTab';
import { SimulatorTab } from '@/components/master/SimulatorTab';

// Error state component
function ErrorState({ title, description, onRetry }: { 
  title: string; 
  description: string; 
  onRetry: () => void; 
}) {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-red-600" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-800">{title}</h3>
            <p className="text-red-600">{description}</p>
          </div>
          <Button variant="outline" onClick={onRetry} className="border-red-300 text-red-700 hover:bg-red-100">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Empty state component
function EmptyState({ title }: { title: string }) {
  return (
    <Card>
      <CardContent className="p-6 text-center">
        <p className="text-muted-foreground">{title}</p>
      </CardContent>
    </Card>
  );
}


// Main master dashboard component
export default function MasterDashboard() {
  const { logout } = useMasterAccount();
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Subscribe to real-time database changes
  const { refetch: subscribeRealtime } = useMasterRealtime();
  const { count: unreviewedFeedbackCount } = useUnreviewedFeedbackCount();

  useEffect(() => {
    subscribeRealtime();
  }, [subscribeRealtime]);

  const loadKPIs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use direct Supabase RPC (checks master role via RLS)
      const kpiData = await fetchFleetKPIs(supabase);
      setKpis(kpiData);
    } catch (err) {
      console.error('Error loading KPIs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load master data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKPIs();
    
    // Set up real-time updates every 5 seconds
    const interval = setInterval(loadKPIs, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <MasterLayout title="Master Control Panel" subtitle="System-wide monitoring and management">
      <div className="space-y-6">
        {/* KPI Cards */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              <span>Loading master data...</span>
            </div>
          </div>
        ) : error ? (
          <ErrorState title="Error loading master data" description={error} onRetry={loadKPIs} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-sm font-medium text-primary">Total Users</CardTitle>
                <div className="p-2 rounded-lg bg-primary/20">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{kpis?.total_users || 0}</div>
                <p className="text-sm text-primary/70 flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3" />
                  +12% from last month
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-success/20 bg-gradient-to-br from-success/5 to-success/10 hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-sm font-medium text-success">Online Devices</CardTitle>
                <div className="p-2 rounded-lg bg-success/20">
                  <Cpu className="h-5 w-5 text-success" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success">{kpis?.devices_online || 0}</div>
                <p className="text-sm text-success/70 flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3" />
                  +5 devices this hour
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-warning/20 bg-gradient-to-br from-warning/5 to-warning/10 hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-sm font-medium text-warning">Data Storage</CardTitle>
                <div className="p-2 rounded-lg bg-warning/20">
                  <Database className="h-5 w-5 text-warning" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-warning">1.2TB</div>
                <p className="text-sm text-warning/70 flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3" />
                  +2.1GB today
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-success/20 bg-gradient-to-br from-success/5 to-success/10 hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-sm font-medium text-success">Uptime</CardTitle>
                <div className="p-2 rounded-lg bg-success/20">
                  <Activity className="h-5 w-5 text-success" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success">99.9%</div>
                <p className="text-sm text-success/70 flex items-center gap-1 mt-2">
                  <CheckCircle className="h-3 w-3" />
                  Last 24h
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Modern Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-10 bg-muted/30 p-1 rounded-xl">
            <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Activity className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="diagnostics" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Database className="h-4 w-4" />
              Diagnostics
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="devices" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Cpu className="h-4 w-4" />
              Devices
            </TabsTrigger>
            <TabsTrigger value="data-logs" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="h-4 w-4" />
              Data Logs
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="simulator" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <TestTube className="h-4 w-4" />
              Simulator
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Settings className="h-4 w-4" />
              System
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Database className="h-4 w-4" />
              Audit
            </TabsTrigger>
            <Link
              to="/master/feedback"
              className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <MessageSquare className="h-4 w-4" />
              Feedback
              {unreviewedFeedbackCount > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                  {unreviewedFeedbackCount}
                </span>
              )}
            </Link>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <OverviewTab />
          </TabsContent>

          <TabsContent value="diagnostics" className="space-y-4">
            <DiagnosticsTab />
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <UsersTab />
          </TabsContent>

          <TabsContent value="devices" className="space-y-4">
            <DevicesTab />
          </TabsContent>

          <TabsContent value="data-logs" className="space-y-4">
            <DataLogsTab />
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <SecurityTab />
          </TabsContent>

          <TabsContent value="simulator" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Simulator</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Simulator panel coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-4">
            <SystemTab />
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <AuditTab />
          </TabsContent>

          <TabsContent value="simulator" className="space-y-4">
            <SimulatorTab />
          </TabsContent>
        </Tabs>

        {/* Critical Actions */}
        <Card className="border-destructive/20 bg-gradient-to-r from-destructive/5 to-destructive/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Critical Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="destructive" size="sm" className="shadow-sm hover:shadow-md">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Emergency Shutdown
              </Button>
              <Button variant="destructive" size="sm" className="shadow-sm hover:shadow-md">
                <Database className="h-4 w-4 mr-2" />
                Wipe All Data
              </Button>
              <Button variant="destructive" size="sm" onClick={logout} className="shadow-sm hover:shadow-md">
                <Users className="h-4 w-4 mr-2" />
                Logout Master
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MasterLayout>
  );
}
