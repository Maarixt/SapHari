// OTA Progress Monitor Component
import React from 'react';
import { useOTAProgress } from '../../hooks/useOTA';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Smartphone, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Download, 
  AlertCircle,
  Clock,
  Wifi
} from 'lucide-react';

export function OTAProgressMonitor() {
  const { 
    otaProgress, 
    getActiveUpdates, 
    getCompletedUpdates, 
    clearDeviceProgress 
  } = useOTAProgress();

  const activeUpdates = getActiveUpdates();
  const completedUpdates = getCompletedUpdates();

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'starting':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'downloading':
        return <Download className="h-4 w-4 animate-pulse text-blue-500" />;
      case 'validating':
        return <AlertCircle className="h-4 w-4 animate-pulse text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'rebooting':
        return <Wifi className="h-4 w-4 animate-pulse text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'starting':
      case 'downloading':
      case 'validating':
      case 'rebooting':
        return 'default';
      case 'success':
        return 'default';
      case 'error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format duration
  const formatDuration = (startTime: number) => {
    const duration = Date.now() - startTime;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Clear completed updates
  const handleClearCompleted = () => {
    completedUpdates.forEach(update => {
      clearDeviceProgress(update.deviceId);
    });
  };

  if (otaProgress.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5" />
            <span>OTA Updates</span>
          </CardTitle>
          <CardDescription>
            Monitor over-the-air firmware updates for your devices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No OTA updates in progress or completed.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5" />
            <span>OTA Updates</span>
            {activeUpdates.length > 0 && (
              <Badge variant="default">{activeUpdates.length} Active</Badge>
            )}
          </div>
          {completedUpdates.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClearCompleted}
            >
              Clear Completed
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          Monitor over-the-air firmware updates for your devices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active Updates */}
        {activeUpdates.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground">Active Updates</h4>
            {activeUpdates.map((update) => (
              <div key={update.deviceId} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(update.status)}
                    <span className="font-medium">{update.deviceId}</span>
                    <Badge variant={getStatusBadge(update.status)}>
                      {update.status}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatDuration(update.timestamp)}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{update.message}</span>
                    <span>{update.progress}%</span>
                  </div>
                  <Progress value={update.progress} className="w-full" />
                  
                  {update.totalSize > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatFileSize(update.downloadedSize)} / {formatFileSize(update.totalSize)}</span>
                      <span>
                        {update.downloadedSize > 0 && update.totalSize > 0 && (
                          `${Math.round((update.downloadedSize / update.totalSize) * 100)}%`
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Completed Updates */}
        {completedUpdates.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground">Completed Updates</h4>
            {completedUpdates.map((update) => (
              <div key={update.deviceId} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(update.status)}
                    <span className="font-medium">{update.deviceId}</span>
                    <Badge variant={getStatusBadge(update.status)}>
                      {update.status}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {formatDuration(update.timestamp)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => clearDeviceProgress(update.deviceId)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground">{update.message}</p>
                
                {update.status === 'error' && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Update failed. Check device logs for details.
                    </AlertDescription>
                  </Alert>
                )}
                
                {update.status === 'success' && (
                  <Alert className="mt-2">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Firmware update completed successfully. Device is rebooting.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
