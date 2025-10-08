// src/components/dashboard/MasterDashboard.tsx
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Users, 
  Cpu, 
  Database, 
  Settings, 
  Bell, 
  Code,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { MasterControlPanel } from '../admin/MasterControlPanel';
import { useMasterAccount } from '@/hooks/useMasterAccount';

export const MasterDashboard = () => {
  const { isMaster, userRole, logout } = useMasterAccount();
  const [showControlPanel, setShowControlPanel] = useState(false);

  if (!isMaster) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-600" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">Access Denied</h3>
                <p className="text-red-600">Master Account access required.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Master Account Status Banner */}
      <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Shield className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-amber-800">Master Account Active</CardTitle>
                <p className="text-amber-600">Level 0 Root Access - Full System Control</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="bg-amber-600">
                MASTER
              </Badge>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowControlPanel(!showControlPanel)}
              >
                {showControlPanel ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showControlPanel ? 'Hide' : 'Show'} Control Panel
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Master Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setShowControlPanel(true)}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium">User Management</p>
                <p className="text-xs text-muted-foreground">Manage all users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setShowControlPanel(true)}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Cpu className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium">Device Control</p>
                <p className="text-xs text-muted-foreground">All ESP32 devices</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setShowControlPanel(true)}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Database className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Data Oversight</p>
                <p className="text-xs text-muted-foreground">System data access</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setShowControlPanel(true)}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Settings className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm font-medium">System Settings</p>
                <p className="text-xs text-muted-foreground">Full system control</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Master Account Warnings */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-yellow-800 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Master Account Warnings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-yellow-700">
            <CheckCircle className="h-4 w-4" />
            All actions are logged and audited
          </div>
          <div className="flex items-center gap-2 text-sm text-yellow-700">
            <CheckCircle className="h-4 w-4" />
            Master access can modify or delete any data
          </div>
          <div className="flex items-center gap-2 text-sm text-yellow-700">
            <CheckCircle className="h-4 w-4" />
            System-wide changes affect all users
          </div>
          <div className="flex items-center gap-2 text-sm text-yellow-700">
            <CheckCircle className="h-4 w-4" />
            Use with extreme caution
          </div>
        </CardContent>
      </Card>

      {/* Master Control Panel */}
      {showControlPanel && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Master Control Panel</h2>
            <Button variant="outline" onClick={() => setShowControlPanel(false)}>
              <XCircle className="h-4 w-4 mr-2" />
              Close Panel
            </Button>
          </div>
          <MasterControlPanel userRole={userRole} onLogout={logout} />
        </div>
      )}

      {/* Master Account Footer */}
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Master Account • Role: {userRole.toUpperCase()} • Full System Access
            </div>
            <Button variant="destructive" size="sm" onClick={logout}>
              <XCircle className="h-4 w-4 mr-2" />
              Logout Master
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
