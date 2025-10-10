// src/components/admin/MasterControlPanel.tsx
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuditService } from '@/services/auditService';
import { Switch } from '@/components/ui/switch';
import { 
  Users, 
  Cpu, 
  Database, 
  Shield, 
  Settings, 
  Bell, 
  Code, 
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Trash2,
  Edit,
  Plus,
  Download,
  Upload,
  RefreshCw,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import { UserRole, getRolePermissions, isMasterAccount } from '@/lib/roles';
import { useMasterData, MasterUser, MasterDevice, MasterAuditLog } from '@/hooks/useMasterData';
import { MasterAggregationsDashboard } from '@/components/dashboard/MasterAggregationsDashboard';
import { DiagnosticsFeed } from '@/components/dashboard/DiagnosticsFeed';

interface MasterControlPanelProps {
  userRole: UserRole;
  onLogout: () => void;
}

// Use types from useMasterData hook

export const MasterControlPanel = ({ userRole, onLogout }: MasterControlPanelProps) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedUser, setSelectedUser] = useState<MasterUser | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<MasterDevice | null>(null);
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Load real data from Supabase
  const {
    users,
    devices,
    auditLogs,
    loading,
    error,
    refreshData,
    updateUserRole,
    deleteUser,
    reassignDevice,
    deleteDevice
  } = useMasterData();


  const permissions = getRolePermissions(userRole);
  const isMaster = isMasterAccount(userRole);

  if (!isMaster) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-600" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">Access Denied</h3>
                <p className="text-red-600">Master Account access required for this panel.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleUserAction = async (action: string, userId: string) => {
    if (action === 'delete') {
      if (confirm('Are you sure you want to delete this user? This will also delete all their devices and data.')) {
        await deleteUser(userId);
      }
    } else if (action === 'suspend') {
      // TODO: Implement suspend functionality
      console.log(`Suspend user ${userId}`);
    }
  };

  const handleDeviceAction = async (action: string, deviceId: string) => {
    if (action === 'delete') {
      if (confirm('Are you sure you want to delete this device? This will also delete all associated widgets.')) {
        await deleteDevice(deviceId);
      }
    } else if (action === 'reassign') {
      // TODO: Implement reassign functionality
      console.log(`Reassign device ${deviceId}`);
    } else if (action === 'reset') {
      // TODO: Implement reset functionality
      console.log(`Reset device ${deviceId}`);
    }
  };

  const handleSystemAction = async (action: string) => {
    console.log(`Master system action: ${action}`);
    
    try {
      // Log the system action
      await AuditService.logSystemAction(action, {}, await AuditService.getCurrentUserId());
      
      // Implement actual system management logic
      switch (action) {
        case 'deploy_update':
          console.log('Deploying system update...');
          break;
        case 'restart_services':
          console.log('Restarting services...');
          break;
        case 'backup_system':
          console.log('Creating system backup...');
          break;
        case 'view_logs':
          console.log('Viewing server logs...');
          break;
        case 'emergency_shutdown':
          console.log('Emergency shutdown initiated...');
          break;
        case 'wipe_all_data':
          console.log('Wiping all data...');
          break;
        case 'export_data':
          console.log('Exporting all data...');
          break;
        case 'manage_api_keys':
          console.log('Managing API keys...');
          break;
        case 'encryption_settings':
          console.log('Configuring encryption settings...');
          break;
        case 'open_simulator':
          console.log('Opening master simulator...');
          break;
        default:
          console.log(`Unknown action: ${action}`);
      }
    } catch (error) {
      console.error('Failed to execute system action:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Master Account Header */}
      <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Shield className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-amber-800">Master Control Panel</CardTitle>
                <p className="text-amber-600">Level 0 Root Access - Full System Control</p>
              </div>
            </div>
            <Badge variant="destructive" className="bg-amber-600">
              MASTER ACCOUNT
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Cpu className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{devices.filter(d => d.status === 'online').length}</p>
                <p className="text-sm text-muted-foreground">Online Devices</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Database className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">1.2TB</p>
                <p className="text-sm text-muted-foreground">Data Storage</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">99.9%</p>
                <p className="text-sm text-muted-foreground">Uptime</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Master Control Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="diagnostics">
            <Activity className="h-4 w-4 mr-2" />
            Diagnostics
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="devices">
            <Cpu className="h-4 w-4 mr-2" />
            Devices
          </TabsTrigger>
          <TabsTrigger value="data">
            <Database className="h-4 w-4 mr-2" />
            Data Logs
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="simulator">
            <Code className="h-4 w-4 mr-2" />
            Simulator
          </TabsTrigger>
          <TabsTrigger value="system">
            <Settings className="h-4 w-4 mr-2" />
            System
          </TabsTrigger>
          <TabsTrigger value="audit">
            <Bell className="h-4 w-4 mr-2" />
            Audit
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <MasterAggregationsDashboard />
        </TabsContent>

        {/* Diagnostics Tab */}
        <TabsContent value="diagnostics" className="space-y-4">
          <DiagnosticsFeed />
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>User Management</CardTitle>
                <Button onClick={() => handleUserAction('create', '')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  <span className="ml-2">Loading users...</span>
                </div>
              ) : error ? (
                <div className="text-center p-8 text-red-600">
                  <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
                  <p>Error loading users: {error}</p>
                  <Button onClick={refreshData} className="mt-2">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  <Users className="mx-auto h-8 w-8 mb-2" />
                  <p>No users found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {users.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-medium">{user.email}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant={user.role === 'master' ? 'destructive' : 'secondary'}>
                            {user.role.toUpperCase()}
                          </Badge>
                          <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>
                            {user.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">
                        {user.deviceCount} devices • Last: {new Date(user.lastLogin).toLocaleDateString()}
                      </p>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => setSelectedUser(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleUserAction('suspend', user.id)}>
                          {user.status === 'active' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleUserAction('delete', user.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Devices Tab */}
        <TabsContent value="devices" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Device Management</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleDeviceAction('bulk_update', '')}>
                    <Upload className="h-4 w-4 mr-2" />
                    Bulk Update
                  </Button>
                  <Button onClick={() => handleDeviceAction('force_reset', '')}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Force Reset All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {devices.map(device => (
                  <div key={device.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-medium">{device.name}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant={device.status === 'online' ? 'default' : 'destructive'}>
                            {device.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {device.firmwareVersion}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">
                        Owner: {device.ownerEmail} • {device.location}
                      </p>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleDeviceAction('reassign', device.id)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeviceAction('reset', device.id)}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeviceAction('delete', device.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Logs Tab */}
        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Data Oversight</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleSystemAction('export_data')}>
                    <Download className="h-4 w-4 mr-2" />
                    Export All Data
                  </Button>
                  <Button variant="outline" onClick={() => setShowSensitiveData(!showSensitiveData)}>
                    {showSensitiveData ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                    {showSensitiveData ? 'Hide' : 'Show'} Sensitive Data
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">MQTT Messages</h4>
                      <p className="text-2xl font-bold">2.4M</p>
                      <p className="text-sm text-muted-foreground">Last 24h</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">Database Size</h4>
                      <p className="text-2xl font-bold">1.2TB</p>
                      <p className="text-sm text-muted-foreground">Total Storage</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">API Calls</h4>
                      <p className="text-2xl font-bold">45K</p>
                      <p className="text-sm text-muted-foreground">Last hour</p>
                    </CardContent>
                  </Card>
                </div>
                
                {showSensitiveData && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="font-medium text-red-800 mb-2">⚠️ Sensitive Data Access</h4>
                    <p className="text-sm text-red-600">
                      Raw MQTT payloads, user personal data, and system credentials are now visible.
                      This access is logged and audited.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">Disable public access to the system</p>
                </div>
                <Switch
                  id="maintenance-mode"
                  checked={maintenanceMode}
                  onCheckedChange={setMaintenanceMode}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="api-keys">API Key Management</Label>
                  <p className="text-sm text-muted-foreground">Manage system API keys and tokens</p>
                </div>
                <Button variant="outline" onClick={() => handleSystemAction('manage_api_keys')}>
                  Manage Keys
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="encryption">Encryption Settings</Label>
                  <p className="text-sm text-muted-foreground">Configure data encryption and security</p>
                </div>
                <Button variant="outline" onClick={() => handleSystemAction('encryption_settings')}>
                  Configure
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Simulator Tab */}
        <TabsContent value="simulator" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Simulator Control</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="simulator-access">Enable Simulator for All Users</Label>
                    <p className="text-sm text-muted-foreground">Allow all users to access the ESP32 simulator</p>
                  </div>
                  <Switch id="simulator-access" defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="beta-features">Beta Features</Label>
                    <p className="text-sm text-muted-foreground">Enable experimental features for testing</p>
                  </div>
                  <Switch id="beta-features" />
                </div>
                
                <Button onClick={() => handleSystemAction('open_simulator')} className="w-full">
                  <Code className="h-4 w-4 mr-2" />
                  Open Master Simulator
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button onClick={() => handleSystemAction('deploy_update')} className="h-20">
                  <Upload className="h-6 w-6 mr-2" />
                  Deploy System Update
                </Button>
                <Button onClick={() => handleSystemAction('backup_system')} variant="outline" className="h-20">
                  <Download className="h-6 w-6 mr-2" />
                  Backup System
                </Button>
                <Button onClick={() => handleSystemAction('view_logs')} variant="outline" className="h-20">
                  <Activity className="h-6 w-6 mr-2" />
                  View Server Logs
                </Button>
                <Button onClick={() => handleSystemAction('restart_services')} variant="destructive" className="h-20">
                  <RefreshCw className="h-6 w-6 mr-2" />
                  Restart Services
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditLogs.map(log => (
                  <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{log.action}</p>
                      <p className="text-sm text-muted-foreground">{log.details}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()} • {log.ipAddress}
                      </p>
                    </div>
                    <Badge variant="outline">{log.resource}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Master Account Actions */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800">⚠️ Critical Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button variant="destructive" onClick={() => handleSystemAction('emergency_shutdown')}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              Emergency Shutdown
            </Button>
            <Button variant="destructive" onClick={() => handleSystemAction('wipe_all_data')}>
              <Trash2 className="h-4 w-4 mr-2" />
              Wipe All Data
            </Button>
            <Button variant="destructive" onClick={onLogout}>
              <XCircle className="h-4 w-4 mr-2" />
              Logout Master
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
