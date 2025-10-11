// OTA Update Status Component
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Download, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Clock,
  RefreshCw,
  History,
  Trash2
} from 'lucide-react';
import { otaService, OTAUpdate, OTAStats } from '@/services/otaService';
import { useToast } from '@/hooks/use-toast';

interface OTAUpdateStatusProps {
  deviceId: string;
  deviceName: string;
}

export function OTAUpdateStatus({ deviceId, deviceName }: OTAUpdateStatusProps) {
  const [otaUpdates, setOtaUpdates] = useState<OTAUpdate[]>([]);
  const [otaStats, setOtaStats] = useState<OTAStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { toast } = useToast();

  // Load OTA data
  const loadOTAData = async () => {
    try {
      setIsLoading(true);
      const [updates, stats] = await Promise.all([
        otaService.getOTAUpdateHistory(deviceId, 10),
        otaService.getOTAStats(deviceId)
      ]);
      setOtaUpdates(updates);
      setOtaStats(stats);
    } catch (error) {
      toast({
        title: 'Failed to load OTA data',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadOTAData();
  }, [deviceId]);

  // Get latest update
  const latestUpdate = otaUpdates[0];
  const deviceStats = otaStats[0];

  // Get status icon and color
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'rollback':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'downloading':
      case 'installing':
        return <Download className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'rollback':
        return 'bg-orange-100 text-orange-800';
      case 'downloading':
      case 'installing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Retry failed update
  const handleRetryUpdate = async (updateId: string) => {
    try {
      await otaService.retryOTAUpdate(updateId);
      toast({
        title: 'Retrying OTA update',
        description: 'The update has been queued for retry'
      });
      loadOTAData();
    } catch (error) {
      toast({
        title: 'Failed to retry update',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  };

  // Cancel pending update
  const handleCancelUpdate = async (updateId: string) => {
    try {
      await otaService.cancelOTAUpdate(updateId);
      toast({
        title: 'OTA update cancelled',
        description: 'The pending update has been cancelled'
      });
      loadOTAData();
    } catch (error) {
      toast({
        title: 'Failed to cancel update',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            OTA Update Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {latestUpdate ? (
            <div className="space-y-4">
              {/* Latest Update Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(latestUpdate.status)}
                  <div>
                    <p className="font-medium">Latest Update</p>
                    <p className="text-sm text-muted-foreground">
                      Version {latestUpdate.firmware_version}
                    </p>
                  </div>
                </div>
                <Badge className={getStatusColor(latestUpdate.status)}>
                  {latestUpdate.status}
                </Badge>
              </div>

              {/* Progress Bar for Active Updates */}
              {(latestUpdate.status === 'downloading' || latestUpdate.status === 'installing') && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{latestUpdate.progress}%</span>
                  </div>
                  <Progress value={latestUpdate.progress} className="w-full" />
                </div>
              )}

              {/* Error Message */}
              {latestUpdate.status === 'failed' && latestUpdate.error_message && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {latestUpdate.error_message}
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                {latestUpdate.status === 'failed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRetryUpdate(latestUpdate.id)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                )}
                {(latestUpdate.status === 'pending' || latestUpdate.status === 'downloading') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancelUpdate(latestUpdate.id)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHistory(true)}
                >
                  <History className="h-4 w-4 mr-2" />
                  View History
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No OTA updates yet</p>
            </div>
          )}

          {/* Statistics */}
          {deviceStats && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {deviceStats.success_rate}%
                </p>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {deviceStats.total_updates}
                </p>
                <p className="text-sm text-muted-foreground">Total Updates</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              OTA Update History - {deviceName}
            </DialogTitle>
            <DialogDescription>
              Complete history of OTA updates for this device
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Statistics Summary */}
            {deviceStats && (
              <div className="grid grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                <div className="text-center">
                  <p className="text-lg font-bold">{deviceStats.total_updates}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-green-600">
                    {deviceStats.successful_updates}
                  </p>
                  <p className="text-sm text-muted-foreground">Successful</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-red-600">
                    {deviceStats.failed_updates}
                  </p>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-orange-600">
                    {deviceStats.rollback_updates}
                  </p>
                  <p className="text-sm text-muted-foreground">Rollbacks</p>
                </div>
              </div>
            )}

            {/* Updates Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {otaUpdates.map((update) => (
                  <TableRow key={update.id}>
                    <TableCell className="font-medium">
                      {update.firmware_version}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(update.status)}
                        <Badge className={getStatusColor(update.status)}>
                          {update.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {update.status === 'downloading' || update.status === 'installing' ? (
                        <div className="flex items-center gap-2">
                          <Progress value={update.progress} className="w-16" />
                          <span className="text-sm">{update.progress}%</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(update.started_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {update.completed_at 
                        ? new Date(update.completed_at).toLocaleString()
                        : <span className="text-muted-foreground">-</span>
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {update.status === 'failed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRetryUpdate(update.id)}
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        )}
                        {(update.status === 'pending' || update.status === 'downloading') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelUpdate(update.id)}
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {otaUpdates.length === 0 && (
              <div className="text-center py-8">
                <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No OTA updates found</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
