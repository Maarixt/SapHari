// Master Dashboard System Tab with Service Status and Backups
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Settings, 
  Server, 
  Database, 
  HardDrive, 
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Activity,
  Cpu,
  MemoryStick,
  Globe,
  Shield,
  Plus,
  Trash2,
  Play,
  Square
} from 'lucide-react';
import { useMasterSystemStatus, useMasterBackups } from '@/hooks/useMasterDashboard';
import { useToast } from '@/hooks/use-toast';

interface ServiceStatus {
  component: string;
  version: string;
  ok: boolean;
  updated_at: string;
  meta: any;
}

interface Backup {
  id: number;
  label: string;
  created_at: string;
  size_bytes: number;
  location: string;
}

// Mock system metrics
const systemMetrics = {
  cpu: { usage: 45, cores: 8 },
  memory: { used: 12.5, total: 32, unit: 'GB' },
  disk: { used: 450, total: 1000, unit: 'GB' },
  network: { in: 125, out: 89, unit: 'Mbps' }
};

function ServiceStatusCard({ service }: { service: ServiceStatus }) {
  const getStatusIcon = (ok: boolean) => {
    return ok ? (
      <CheckCircle className="h-5 w-5 text-green-600" />
    ) : (
      <XCircle className="h-5 w-5 text-red-600" />
    );
  };

  const getStatusBadge = (ok: boolean) => {
    return ok ? (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        Healthy
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
        Unhealthy
      </Badge>
    );
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon(service.ok)}
            <div>
              <h4 className="font-medium capitalize">{service.component}</h4>
              <p className="text-sm text-muted-foreground">v{service.version}</p>
            </div>
          </div>
          <div className="text-right">
            {getStatusBadge(service.ok)}
            <p className="text-xs text-muted-foreground mt-1">
              Updated: {new Date(service.updated_at).toLocaleTimeString()}
            </p>
          </div>
        </div>
        
        {service.meta && (
          <div className="mt-3 pt-3 border-t">
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(service.meta).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-muted-foreground capitalize">{key.replace('_', ' ')}:</span>
                  <span className="font-medium">{value as string}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SystemMetrics() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          System Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <Cpu className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-muted-foreground">CPU Usage</p>
              <p className="text-2xl font-bold">{systemMetrics.cpu.usage}%</p>
              <p className="text-xs text-muted-foreground">{systemMetrics.cpu.cores} cores</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <MemoryStick className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">Memory</p>
              <p className="text-2xl font-bold">{systemMetrics.memory.used}</p>
              <p className="text-xs text-muted-foreground">of {systemMetrics.memory.total} {systemMetrics.memory.unit}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <HardDrive className="h-8 w-8 text-yellow-600" />
            <div>
              <p className="text-sm text-muted-foreground">Disk Usage</p>
              <p className="text-2xl font-bold">{systemMetrics.disk.used}</p>
              <p className="text-xs text-muted-foreground">of {systemMetrics.disk.total} {systemMetrics.disk.unit}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <Globe className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-sm text-muted-foreground">Network</p>
              <p className="text-2xl font-bold">{systemMetrics.network.in}</p>
              <p className="text-xs text-muted-foreground">↓{systemMetrics.network.in} ↑{systemMetrics.network.out} {systemMetrics.network.unit}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateBackupDialog() {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const { toast } = useToast();

  const handleCreateBackup = () => {
    // Implement backup creation
    toast({
      title: "Backup created successfully",
      description: `Backup "${label}" has been created.`,
    });
    setOpen(false);
    setLabel('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Backup
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create System Backup</DialogTitle>
          <DialogDescription>
            Create a full system backup including database and configuration files.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Backup Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Pre-deployment backup"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateBackup} disabled={!label}>
            Create Backup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BackupItem({ backup }: { backup: Backup }) {
  const { toast } = useToast();

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = () => {
    toast({
      title: "Download started",
      description: `Downloading backup "${backup.label}"`,
    });
  };

  const handleDelete = () => {
    toast({
      title: "Backup deleted",
      description: `Backup "${backup.label}" has been deleted.`,
    });
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        <HardDrive className="h-5 w-5 text-blue-600" />
        <div>
          <h4 className="font-medium">{backup.label}</h4>
          <p className="text-sm text-muted-foreground">
            Created: {new Date(backup.created_at).toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">
            Size: {formatBytes(backup.size_bytes)} • Location: {backup.location}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
        <Button variant="outline" size="sm" onClick={handleDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function SystemTab() {
  const { data: systemStatus, isLoading: statusLoading } = useMasterSystemStatus();
  const { data: backups, isLoading: backupsLoading } = useMasterBackups();
  const { toast } = useToast();

  const handleRestartService = (serviceName: string) => {
    toast({
      title: "Service restart initiated",
      description: `Restarting ${serviceName} service...`,
    });
  };

  const handleSystemRestart = () => {
    toast({
      title: "System restart scheduled",
      description: "System will restart in 60 seconds.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">System Management</h2>
          <p className="text-muted-foreground">Monitor system health, services, and backups</p>
        </div>
        <div className="flex gap-2">
          <CreateBackupDialog />
          <Button variant="outline" onClick={handleSystemRestart}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Restart System
          </Button>
        </div>
      </div>

      {/* System Metrics */}
      <SystemMetrics />

      {/* Service Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Service Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statusLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <span>Loading service status...</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.isArray(systemStatus) && systemStatus.map((service: ServiceStatus) => (
                <ServiceStatusCard key={service.component} service={service} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Service Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center gap-2"
              onClick={() => handleRestartService('API')}
            >
              <Server className="h-6 w-6" />
              <span>Restart API</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center gap-2"
              onClick={() => handleRestartService('MQTT Broker')}
            >
              <Globe className="h-6 w-6" />
              <span>Restart Broker</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center gap-2"
              onClick={() => handleRestartService('Database')}
            >
              <Database className="h-6 w-6" />
              <span>Restart DB</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center gap-2"
              onClick={() => handleRestartService('All Services')}
            >
              <RefreshCw className="h-6 w-6" />
              <span>Restart All</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Backups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            System Backups
          </CardTitle>
        </CardHeader>
        <CardContent>
          {backupsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <span>Loading backups...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {backups?.map((backup: Backup) => (
                <BackupItem key={backup.id} backup={backup} />
              ))}
              {(!backups || backups.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <HardDrive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No backups found</p>
                  <p className="text-sm">Create your first backup to get started</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">SSL/TLS Certificate</h4>
                  <p className="text-sm text-muted-foreground">Valid until 2024-12-31</p>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Valid
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Firewall Status</h4>
                  <p className="text-sm text-muted-foreground">All ports secured</p>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Intrusion Detection</h4>
                  <p className="text-sm text-muted-foreground">No threats detected</p>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Secure
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">OS Version:</span>
                <span className="font-medium">Ubuntu 22.04 LTS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kernel:</span>
                <span className="font-medium">5.15.0-91-generic</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Uptime:</span>
                <span className="font-medium">15 days, 8 hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Load Average:</span>
                <span className="font-medium">0.45, 0.52, 0.48</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Update:</span>
                <span className="font-medium">2024-01-10 14:30</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
