import { MasterLayout } from '@/components/master/MasterLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Users, Cpu, Database, Activity, TestTube, Shield, BarChart3, Settings } from 'lucide-react';
import { useMasterAccount } from '@/hooks/useMasterAccount';
import { OverviewTab } from '@/components/master/OverviewTab';
import { DiagnosticsTab } from '@/components/master/DiagnosticsTab';
import { UsersTab } from '@/components/master/UsersTab';
import { DevicesTab } from '@/components/master/DevicesTab';
import { DataLogsTab } from '@/components/master/DataLogsTab';
import { SecurityTab } from '@/components/master/SecurityTab';
import { SystemTab } from '@/components/master/SystemTab';
import { AuditTab } from '@/components/master/AuditTab';
import { SimulatorTab } from '@/components/master/SimulatorTab';



// Main master dashboard component
export default function MasterDashboard() {
  const { logout } = useMasterAccount();

  return (
    <MasterLayout title="Master Control Panel" subtitle="System-wide monitoring and management">
      <div className="space-y-6">

        {/* Modern Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-9 bg-muted/30 p-1 rounded-xl">
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
