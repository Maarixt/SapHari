// Master Dashboard Devices Tab with Enhanced Features
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
  Cpu, 
  Search, 
  Filter, 
  MoreHorizontal,
  Wifi,
  WifiOff,
  RefreshCw,
  Power,
  Lock,
  Download,
  MapPin,
  Tag,
  Calendar,
  User,
  Settings,
  AlertTriangle
} from 'lucide-react';
import { useMasterDevices } from '@/hooks/useMasterDashboard';
import { useToast } from '@/hooks/use-toast';

interface Device {
  id: string;
  device_id: string | null;
  device_key: string | null;
  name: string | null;
  owner_id: string | null;
  owner_name: string | null;
  owner_email: string | null;
  online: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  alert_count: number | null;
  widget_count: number | null;
}

function DeviceStatusBadge({ online }: { online: boolean | null }) {
  if (online) {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        <Wifi className="h-3 w-3 mr-1" />
        Online
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
      <WifiOff className="h-3 w-3 mr-1" />
      Offline
    </Badge>
  );
}

function DeviceActions({ device }: { device: Device }) {
  const { toast } = useToast();

  const handleAction = async (action: string) => {
    toast({
      title: "Feature not available",
      description: "Device actions are coming soon.",
      variant: "destructive"
    });
    return;
    try {
      // Stub - mutations not implemented
      switch (action) {
        case 'reboot':
          toast({
            title: "Reboot command sent",
            description: `Reboot command sent to ${device.name}`,
          });
          break;
        case 'lock':
          toast({
            title: "Device locked",
            description: `${device.name} has been locked`,
          });
          break;
        case 'unlock':
          toast({
            title: "Device unlocked",
            description: `${device.name} has been unlocked`,
          });
          break;
        case 'update_firmware':
          toast({
            title: "Firmware update initiated",
            description: `Firmware update started for ${device.name}`,
          });
          break;
        case 'transfer_ownership':
          toast({
            title: "Ownership transfer",
            description: `Ownership transfer initiated for ${device.name}`,
          });
          break;
      }
    } catch (error) {
      toast({
        title: "Action failed",
        description: `Failed to ${action} device. Please try again.`,
        variant: "destructive",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Device Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleAction('reboot')}>
          <Power className="h-4 w-4 mr-2" />
          Reboot Device
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction('lock')}>
          <Lock className="h-4 w-4 mr-2" />
          Lock Device
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction('unlock')}>
          <Lock className="h-4 w-4 mr-2" />
          Unlock Device
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleAction('update_firmware')}>
          <Download className="h-4 w-4 mr-2" />
          Update Firmware
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction('transfer_ownership')}>
          <User className="h-4 w-4 mr-2" />
          Transfer Ownership
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Settings className="h-4 w-4 mr-2" />
          Device Settings
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BulkActionsDialog() {
  const [open, setOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState('');

  const handleBulkAction = () => {
    // Implement bulk actions
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Bulk Actions
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Device Actions</DialogTitle>
          <DialogDescription>
            Perform actions on multiple devices at once.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Action</label>
            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger>
                <SelectValue placeholder="Select action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reboot">Reboot All</SelectItem>
                <SelectItem value="update_firmware">Update Firmware</SelectItem>
                <SelectItem value="lock">Lock All</SelectItem>
                <SelectItem value="unlock">Unlock All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleBulkAction} disabled={!selectedAction}>
            Execute Action
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DevicesTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');

  const { data: devices, isLoading, error } = useMasterDevices();

  const filteredDevices = devices?.filter((device: Device) => {
    const matchesSearch = device.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.device_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.owner_email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'online' && device.online) ||
                         (statusFilter === 'offline' && !device.online);
    const matchesOwner = ownerFilter === 'all' || device.owner_id === ownerFilter;
    return matchesSearch && matchesStatus && matchesOwner;
  }) || [];

  const uniqueOwners = devices?.map((d: Device) => ({
    id: d.owner_id,
    name: d.owner_name || d.owner_email || 'Unknown'
  })) || [];

  if (isLoading) {
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
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">Error Loading Devices</h3>
              <p className="text-red-600">Failed to load device data</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Device Management</h2>
          <p className="text-muted-foreground">Monitor and manage all devices in the system</p>
        </div>
        <div className="flex gap-2">
          <BulkActionsDialog />
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Force Reset All
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Devices</p>
                <p className="text-2xl font-bold">{devices?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Online</p>
                <p className="text-2xl font-bold">
                  {devices?.filter((d: Device) => d.online).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <WifiOff className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Offline</p>
                <p className="text-2xl font-bold">
                  {devices?.filter((d: Device) => !d.online).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Issues</p>
                <p className="text-2xl font-bold">3</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search devices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>


            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Owner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Owners</SelectItem>
                {uniqueOwners.map((owner) => (
                  <SelectItem key={owner.id} value={owner.id}>{owner.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Devices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Devices ({filteredDevices.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Firmware</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDevices.map((device: Device) => (
                <TableRow key={device.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{device.name}</div>
                      <div className="text-sm text-muted-foreground">ID: {device.device_id}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DeviceStatusBadge online={device.online} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {device.owner_name || device.owner_email || 'Unknown'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {device.widget_count || 0} widgets
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {device.alert_count || 0} alerts
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {device.created_at ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(device.created_at).toLocaleDateString()}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Never</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(device.created_at).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DeviceActions device={device} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
