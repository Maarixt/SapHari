import { Eye, Key, Trash2, Edit, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { DeviceCredentialsDialog } from './DeviceCredentialsDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Device {
  id: string;
  device_id: string;
  device_key: string;
  name: string;
  online: boolean;
  widget_counts?: {
    switches: number;
    gauges: number;
    servos: number;
    alerts: number;
  };
}

interface DeviceCardProps {
  device: Device;
  onSelect: () => void;
  onDelete: () => void;
  onEdit?: () => void;
}

export const DeviceCard = ({ device, onSelect, onDelete, onEdit }: DeviceCardProps) => {
  const [showCredentials, setShowCredentials] = useState(false);

  return (
    <Card className={`border-border/50 hover:shadow-lg transition-all duration-300 ${
      device.online 
        ? 'border-success/20 bg-gradient-to-br from-success/5 to-success/10' 
        : 'border-muted/20 bg-gradient-to-br from-muted/5 to-muted/10'
    }`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${device.online ? 'bg-success/20' : 'bg-muted/20'}`}>
                <Cpu className={`h-5 w-5 ${device.online ? 'text-success' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <h3 className="font-bold text-lg tracking-tight">{device.name}</h3>
                <p className="text-sm text-muted-foreground font-mono">{device.device_id}</p>
              </div>
            </div>
          </div>
          <Badge 
            variant="outline"
            className={device.online 
              ? "bg-success/10 text-success border-success/20" 
              : "bg-muted/10 text-muted-foreground border-muted/20"
            }
          >
            <div className={`h-2 w-2 rounded-full mr-2 ${device.online ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`}></div>
            {device.online ? 'Online' : 'Offline'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            Switches: {device.widget_counts?.switches || 0}
          </Badge>
          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
            Gauges: {device.widget_counts?.gauges || 0}
          </Badge>
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
            Servos: {device.widget_counts?.servos || 0}
          </Badge>
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
            Alerts: {device.widget_counts?.alerts || 0}
          </Badge>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={onSelect} 
            className="flex-1 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <Eye className="mr-2 h-4 w-4" />
            Open
          </Button>
          {onEdit && (
            <Button 
              variant="outline" 
              size="icon" 
              onClick={onEdit}
              className="shadow-sm hover:shadow-md transition-all duration-200"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setShowCredentials(true)}
            className="shadow-sm hover:shadow-md transition-all duration-200"
          >
            <Key className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                className="shadow-sm hover:shadow-md transition-all duration-200"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Device</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{device.name}"? This action cannot be undone and will also delete all associated widgets.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>

      <DeviceCredentialsDialog
        device={device}
        open={showCredentials}
        onOpenChange={setShowCredentials}
      />
    </Card>
  );
};