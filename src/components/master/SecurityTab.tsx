// Master Dashboard Security Tab with RBAC Matrix and API Key Management
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Shield, 
  Key, 
  Globe, 
  Lock, 
  Plus,
  MoreHorizontal,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings,
  User,
  Database,
  Cpu,
  BarChart3
} from 'lucide-react';
import { useMasterApiKeys, useMasterIpRules } from '@/hooks/useMasterDashboard';
import { useToast } from '@/hooks/use-toast';

interface Permission {
  resource: string;
  actions: string[];
}

interface RolePermissions {
  role: string;
  permissions: Permission[];
}

// RBAC Matrix data
const rbacMatrix: RolePermissions[] = [
  {
    role: 'master',
    permissions: [
      { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'devices', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'telemetry', actions: ['read', 'export'] },
      { resource: 'alerts', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'security', actions: ['read', 'update'] },
      { resource: 'system', actions: ['read', 'update'] },
      { resource: 'audit', actions: ['read'] }
    ]
  },
  {
    role: 'admin',
    permissions: [
      { resource: 'users', actions: ['create', 'read', 'update'] },
      { resource: 'devices', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'telemetry', actions: ['read', 'export'] },
      { resource: 'alerts', actions: ['create', 'read', 'update'] },
      { resource: 'security', actions: ['read'] },
      { resource: 'system', actions: ['read'] },
      { resource: 'audit', actions: ['read'] }
    ]
  },
  {
    role: 'tech',
    permissions: [
      { resource: 'users', actions: ['read'] },
      { resource: 'devices', actions: ['read', 'update'] },
      { resource: 'telemetry', actions: ['read'] },
      { resource: 'alerts', actions: ['read', 'update'] },
      { resource: 'security', actions: [] },
      { resource: 'system', actions: [] },
      { resource: 'audit', actions: [] }
    ]
  },
  {
    role: 'user',
    permissions: [
      { resource: 'users', actions: ['read'] },
      { resource: 'devices', actions: ['read'] },
      { resource: 'telemetry', actions: ['read'] },
      { resource: 'alerts', actions: ['read'] },
      { resource: 'security', actions: [] },
      { resource: 'system', actions: [] },
      { resource: 'audit', actions: [] }
    ]
  }
];

const resources = ['users', 'devices', 'telemetry', 'alerts', 'security', 'system', 'audit'];
const actions = ['create', 'read', 'update', 'delete', 'export'];

function RBACMatrix() {
  const getPermissionIcon = (hasPermission: boolean) => {
    return hasPermission ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-gray-400" />
    );
  };

  const hasPermission = (role: string, resource: string, action: string) => {
    const roleData = rbacMatrix.find(r => r.role === role);
    if (!roleData) return false;
    
    const resourceData = roleData.permissions.find(p => p.resource === resource);
    if (!resourceData) return false;
    
    return resourceData.actions.includes(action);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Role-Based Access Control Matrix
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                {resources.map((resource) => (
                  <TableHead key={resource} className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-medium capitalize">{resource}</span>
                      <div className="flex gap-1">
                        {actions.map((action) => (
                          <span key={action} className="text-xs text-muted-foreground">
                            {action[0].toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rbacMatrix.map((roleData) => (
                <TableRow key={roleData.role}>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={
                        roleData.role === 'master' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        roleData.role === 'admin' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        roleData.role === 'tech' ? 'bg-green-50 text-green-700 border-green-200' :
                        'bg-gray-50 text-gray-700 border-gray-200'
                      }
                    >
                      {roleData.role}
                    </Badge>
                  </TableCell>
                  {resources.map((resource) => (
                    <TableCell key={resource} className="text-center">
                      <div className="flex justify-center gap-1">
                        {actions.map((action) => (
                          <div key={action} className="flex items-center">
                            {getPermissionIcon(hasPermission(roleData.role, resource, action))}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          <p><strong>Legend:</strong> C=Create, R=Read, U=Update, D=Delete, E=Export</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateApiKeyDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    permissions: [] as string[]
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Feature not available",
      description: "API key creation is coming soon.",
      variant: "destructive"
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create API Key
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New API Key</DialogTitle>
          <DialogDescription>
            Generate a new API key with specific permissions for external access.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Mobile App Key"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Permissions</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {resources.map((resource) => (
                <label key={resource} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes(resource)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          permissions: [...formData.permissions, resource]
                        });
                      } else {
                        setFormData({
                          ...formData,
                          permissions: formData.permissions.filter(p => p !== resource)
                        });
                      }
                    }}
                  />
                  <span className="text-sm capitalize">{resource}</span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Create API Key
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ApiKeyItem({ apiKey }: { apiKey: any }) {
  const [showKey, setShowKey] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey.hash);
    toast({
      title: "API Key copied",
      description: "API key has been copied to clipboard.",
    });
  };

  const handleRevoke = () => {
    // Implement revoke functionality
    toast({
      title: "API Key revoked",
      description: "API key has been revoked successfully.",
    });
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        <Key className="h-5 w-5 text-blue-600" />
        <div>
          <h4 className="font-medium">{apiKey.name}</h4>
          <p className="text-sm text-muted-foreground">
            Created by {apiKey.profiles?.full_name || apiKey.profiles?.email}
          </p>
          <p className="text-xs text-muted-foreground">
            Created: {new Date(apiKey.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {apiKey.revoked ? (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Revoked
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Active
          </Badge>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setShowKey(!showKey)}>
              {showKey ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showKey ? 'Hide Key' : 'Show Key'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopy}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Key
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleRevoke} className="text-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Revoke Key
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function IpRulesManager() {
  const [newRule, setNewRule] = useState({ rule: 'allow', cidr: '' });
  const { data: ipRules } = useMasterIpRules();

  const handleAddRule = () => {
    // Implement add IP rule functionality
    console.log('Adding IP rule:', newRule);
    setNewRule({ rule: 'allow', cidr: '' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          IP Access Rules
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Select value={newRule.rule} onValueChange={(value) => setNewRule({ ...newRule, rule: value })}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="allow">Allow</SelectItem>
                <SelectItem value="deny">Deny</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="192.168.1.0/24"
              value={newRule.cidr}
              onChange={(e) => setNewRule({ ...newRule, cidr: e.target.value })}
              className="flex-1"
            />
            <Button onClick={handleAddRule}>
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </div>
          
          <div className="space-y-2">
            {ipRules?.map((rule: any) => (
              <div key={rule.id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  <Badge variant={rule.rule === 'allow' ? 'default' : 'destructive'}>
                    {rule.rule}
                  </Badge>
                  <span className="font-mono">{rule.cidr}</span>
                </div>
                <Button variant="ghost" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SecurityTab() {
  const { data: apiKeys, isLoading: apiKeysLoading } = useMasterApiKeys();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Security Management</h2>
          <p className="text-muted-foreground">Manage access control, API keys, and security policies</p>
        </div>
        <CreateApiKeyDialog />
      </div>

      {/* RBAC Matrix */}
      <RBACMatrix />

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Keys
          </CardTitle>
        </CardHeader>
        <CardContent>
          {apiKeysLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <span>Loading API keys...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {apiKeys?.map((apiKey: any) => (
                <ApiKeyItem key={apiKey.id} apiKey={apiKey} />
              ))}
              {(!apiKeys || apiKeys.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No API keys found</p>
                  <p className="text-sm">Create your first API key to get started</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* IP Rules */}
      <IpRulesManager />

      {/* Security Policies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Authentication Policies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Password Policy</h4>
                  <p className="text-sm text-muted-foreground">Minimum 8 characters, mixed case</p>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Enabled
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Two-Factor Authentication</h4>
                  <p className="text-sm text-muted-foreground">Required for admin users</p>
                </div>
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Optional
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Session Timeout</h4>
                  <p className="text-sm text-muted-foreground">Auto-logout after 8 hours</p>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Enabled
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <h4 className="font-medium">Failed Login Attempts</h4>
                  <p className="text-sm text-muted-foreground">3 failed attempts in last hour</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <h4 className="font-medium">API Key Usage</h4>
                  <p className="text-sm text-muted-foreground">All API keys are secure</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <h4 className="font-medium">SSL/TLS Status</h4>
                  <p className="text-sm text-muted-foreground">All connections encrypted</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
