import { Eye, Key, Trash2, Edit } from 'lucide-react';
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
    <Card className="bg-card border-border hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-lg">{device.name}</h3>
            <p className="text-sm text-muted-foreground font-mono">{device.device_id}</p>
          </div>
          <Badge 
            variant={device.online ? "default" : "secondary"}
            className={device.online ? "bg-iot-online text-white" : "bg-iot-offline text-white"}
          >
            {device.online ? 'Online' : 'Offline'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex gap-2 text-sm">
          <Badge variant="outline">Switches: {device.widget_counts?.switches || 0}</Badge>
          <Badge variant="outline">Gauges: {device.widget_counts?.gauges || 0}</Badge>
          <Badge variant="outline">Servos: {device.widget_counts?.servos || 0}</Badge>
          <Badge variant="outline">Alerts: {device.widget_counts?.alerts || 0}</Badge>
        </div>

        <div className="flex gap-2">
          <Button onClick={onSelect} className="flex-1">
            <Eye className="mr-2 h-4 w-4" />
            Open
          </Button>
          {onEdit && (
            <Button variant="outline" size="icon" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => setShowCredentials(true)}>
            <Key className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon">
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