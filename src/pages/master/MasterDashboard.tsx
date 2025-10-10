import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MasterLayout } from '@/components/master/MasterLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, RefreshCw, Users, Cpu, Database, Activity, TestTube } from 'lucide-react';
import { fetchMasterMetrics, fetchFleetKPIs, fetchDeviceHealth, fetchRecentEvents } from '@/lib/api';
import { useMasterAccount } from '@/hooks/useMasterAccount';

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

// Users tab component
function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, 
          email, 
          display_name, 
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      setUsers(data || []);
    } catch (err) {
      console.error('Error loading users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <span>Loading users...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Error loading users" description={error} onRetry={loadUsers} />;
  }

  if (users.length === 0) {
    return <EmptyState title="No users found" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">User Management</h3>
        <Button variant="outline" size="sm">
          <Users className="h-4 w-4 mr-2" />
          Create User
        </Button>
      </div>
      
      <div className="grid gap-4">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{user.display_name || user.email}</h4>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Joined: {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="outline">Active</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Devices tab component
function DevicesTab() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('devices')
        .select(`
          id,
          device_id,
          name,
          firmware_version,
          created_at,
          owner:profiles (
            id,
            email,
            display_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      setDevices(data || []);
    } catch (err) {
      console.error('Error loading devices:', err);
      setError(err instanceof Error ? err.message : 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <span>Loading devices...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Error loading devices" description={error} onRetry={loadDevices} />;
  }

  if (devices.length === 0) {
    return <EmptyState title="No devices found" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Device Management</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Bulk Update
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Force Reset All
          </Button>
        </div>
      </div>
      
      <div className="grid gap-4">
        {devices.map((device) => (
          <Card key={device.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{device.name}</h4>
                  <p className="text-sm text-muted-foreground">ID: {device.device_id}</p>
                  <p className="text-sm text-muted-foreground">
                    Owner: {device.owner?.display_name || device.owner?.email || 'Unknown'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created: {new Date(device.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {device.firmware_version || 'Unknown'}
                  </Badge>
                  <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                    Offline
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Main master dashboard component
export default function MasterDashboard() {
  const { logout } = useMasterAccount();
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadKPIs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to fetch from Edge Function first
      try {
        const metrics = await fetchMasterMetrics(supabase);
        setKpis(metrics.kpis);
      } catch (edgeError) {
        console.warn('Edge function failed, trying RPC:', edgeError);
        // Fallback to RPC
        const kpiData = await fetchFleetKPIs(supabase);
        setKpis(kpiData);
      }
    } catch (err) {
      console.error('Error loading KPIs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load master data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKPIs();
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis?.total_users || 0}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Online Devices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis?.devices_online || 0}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Data Storage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1.2TB</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Uptime</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">99.9%</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="diagnostics" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Diagnostics
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="devices" className="flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              Devices
            </TabsTrigger>
            <TabsTrigger value="data-logs">Data Logs</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="simulator">Simulator</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Master dashboard overview coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="diagnostics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Diagnostics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Diagnostics panel coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <UsersTab />
          </TabsContent>

          <TabsContent value="devices" className="space-y-4">
            <DevicesTab />
          </TabsContent>

          <TabsContent value="data-logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Data Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Data logs panel coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Security panel coming soon...</p>
              </CardContent>
            </Card>
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
            <Card>
              <CardHeader>
                <CardTitle>System</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">System panel coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Audit</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Audit panel coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Critical Actions */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Critical Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button variant="destructive" size="sm">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Emergency Shutdown
              </Button>
              <Button variant="destructive" size="sm">
                <Database className="h-4 w-4 mr-2" />
                Wipe All Data
              </Button>
              <Button variant="destructive" size="sm" onClick={logout}>
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
