// src/components/admin/MasterControlPanel.tsx
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  RefreshCw
} from 'lucide-react';
import { UserRole, getRolePermissions, isMasterAccount } from '@/lib/roles';

interface MasterControlPanelProps {
  userRole: UserRole;
  onLogout: () => void;
}

interface SystemUser {
  id: string;
  email: string;
  role: UserRole;
  status: 'active' | 'suspended' | 'pending';
  lastLogin: string;
  deviceCount: number;
  createdAt: string;
}

interface SystemDevice {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  status: 'online' | 'offline' | 'error';
  lastSeen: string;
  firmwareVersion: string;
  location?: string;
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  details: string;
  ipAddress: string;
}

export const MasterControlPanel = ({ userRole, onLogout }: MasterControlPanelProps) => {
  const [activeTab, setActiveTab] = useState('users');
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<SystemDevice | null>(null);
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Mock data - in real implementation, this would come from API
  const [users] = useState<SystemUser[]>([
    {
      id: '1',
      email: 'admin@saphari.com',
      role: 'admin',
      status: 'active',
      lastLogin: '2024-01-15T10:30:00Z',
      deviceCount: 5,
      createdAt: '2023-12-01T00:00:00Z'
    },
    {
      id: '2',
      email: 'dev@saphari.com',
      role: 'developer',
      status: 'active',
      lastLogin: '2024-01-15T09:15:00Z',
      deviceCount: 12,
      createdAt: '2023-11-15T00:00:00Z'
    },
    {
      id: '3',
      email: 'user1@example.com',
      role: 'user',
      status: 'active',
      lastLogin: '2024-01-14T16:45:00Z',
      deviceCount: 2,
      createdAt: '2024-01-01T00:00:00Z'
    }
  ]);

  const [devices] = useState<SystemDevice[]>([
    {
      id: 'esp32-001',
      name: 'Living Room Sensor',
      ownerId: '1',
      ownerEmail: 'admin@saphari.com',
      status: 'online',
      lastSeen: '2024-01-15T10:25:00Z',
      firmwareVersion: 'v2.1.0',
      location: 'Living Room'
    },
    {
      id: 'esp32-002',
      name: 'Kitchen Controller',
      ownerId: '2',
      ownerEmail: 'dev@saphari.com',
      status: 'offline',
      lastSeen: '2024-01-14T22:10:00Z',
      firmwareVersion: 'v2.0.5',
      location: 'Kitchen'
    }
  ]);

  const [auditLogs] = useState<AuditLogEntry[]>([
    {
      id: '1',
      timestamp: '2024-01-15T10:30:00Z',
      userId: 'master',
      userEmail: 'master@saphari.com',
      action: 'USER_ROLE_CHANGED',
      resource: 'user:2',
      details: 'Changed role from developer to admin',
      ipAddress: '192.168.1.100'
    },
    {
      id: '2',
      timestamp: '2024-01-15T09:15:00Z',
      userId: 'master',
      userEmail: 'master@saphari.com',
      action: 'DEVICE_REASSIGNED',
      resource: 'device:esp32-001',
      details: 'Reassigned from user:3 to user:1',
      ipAddress: '192.168.1.100'
    }
  ]);

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

  const handleUserAction = (action: string, userId: string) => {
    console.log(`Master action: ${action} on user ${userId}`);
    // Implement actual user management logic
  };

  const handleDeviceAction = (action: string, deviceId: string) => {
    console.log(`Master action: ${action} on device ${deviceId}`);
    // Implement actual device management logic
  };

  const handleSystemAction = (action: string) => {
    console.log(`Master system action: ${action}`);
    // Implement actual system management logic
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
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="data">Data Logs</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="simulator">Simulator</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

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
                    <CardContent className="p4">
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
