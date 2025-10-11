// OTA Update Dialog Component
import React, { useState, useRef } from 'react';
import { useDeviceOTA } from '../../hooks/useOTA';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Upload, Download, AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface OTAUpdateDialogProps {
  deviceId: string;
  deviceName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OTAUpdateDialog({ deviceId, deviceName, open, onOpenChange }: OTAUpdateDialogProps) {
  const {
    uploadFirmware,
    deployFirmware,
    deleteFirmware,
    firmwareUploads,
    deviceOTAProgress,
    isLoading,
    error,
    validateFirmwareFile
  } = useDeviceOTA(deviceId);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [version, setVersion] = useState('');
  const [description, setDescription] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFirmware, setUploadedFirmware] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateFirmwareFile(file);
    if (!validation.valid) {
      alert(validation.error);
        return;
      }
      
    setSelectedFile(file);
    setVersion(file.name.replace(/\.[^/.]+$/, '')); // Use filename as default version
  };

  // Handle firmware upload
  const handleUpload = async () => {
    if (!selectedFile) return;

      setIsUploading(true);
      setUploadProgress(0);
    setError(null);
      
    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const firmware = await uploadFirmware(deviceId, selectedFile, version, description);

      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadedFirmware(firmware);

      // Reset form
      setSelectedFile(null);
      setVersion('');
      setDescription('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle firmware deployment
  const handleDeploy = async (firmwareId: string) => {
    try {
      await deployFirmware(deviceId, firmwareId);
    } catch (error) {
      console.error('Deployment failed:', error);
    }
  };

  // Handle firmware deletion
  const handleDelete = async (firmwareId: string) => {
    if (!confirm('Are you sure you want to delete this firmware?')) return;
    
    try {
      await deleteFirmware(firmwareId);
    } catch (error) {
      console.error('Deletion failed:', error);
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploaded':
        return <Upload className="h-4 w-4 text-blue-500" />;
      case 'deployed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'rollback':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
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

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>OTA Update - {deviceName}</DialogTitle>
          <DialogDescription>
            Upload and deploy firmware updates to your ESP32 device over-the-air.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* OTA Progress */}
          {deviceOTAProgress && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>OTA Update Progress</span>
                    <span>{deviceOTAProgress.progress}%</span>
                  </div>
                  <Progress value={deviceOTAProgress.progress} className="w-full" />
                  <p className="text-sm text-muted-foreground">
                    {deviceOTAProgress.message}
                  </p>
          </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Upload Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Upload New Firmware</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firmware-file">Firmware File (.bin)</Label>
                <Input
                  id="firmware-file"
                  type="file"
                  accept=".bin"
                  onChange={handleFileSelect}
                  ref={fileInputRef}
                  disabled={isUploading}
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </p>
                )}
            </div>

              <div className="space-y-2">
                    <Label htmlFor="version">Version</Label>
                    <Input
                      id="version"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="e.g., v2.1.0"
                  disabled={isUploading}
                    />
                  </div>
                </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what's new in this firmware version..."
                disabled={isUploading}
                  />
                </div>

                {isUploading && (
                  <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="w-full" />
                  </div>
                )}

                  <Button
              onClick={handleUpload} 
              disabled={!selectedFile || isUploading || !version}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                    Upload Firmware
                </>
              )}
                  </Button>
                </div>

          {/* Firmware List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Available Firmware</h3>
            
            {firmwareUploads.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No firmware uploads found for this device.
              </p>
            ) : (
            <div className="space-y-2">
                {firmwareUploads.map((firmware) => (
                  <div key={firmware.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(firmware.status)}
                        <div>
                          <p className="font-medium">{firmware.file_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {firmware.version && `Version: ${firmware.version}`}
                            {firmware.version && firmware.description && ' • '}
                            {firmware.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(firmware.file_size)} • {formatDate(firmware.uploaded_at)}
                          </p>
                  </div>
                </div>
                
                      <div className="flex items-center space-x-2">
                        {firmware.status === 'uploaded' && (
                          <Button
                            size="sm"
                            onClick={() => handleDeploy(firmware.id)}
                            disabled={isLoading}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Deploy
                          </Button>
                        )}
                        
                        {firmware.status === 'deployed' && (
                          <span className="text-sm text-green-600 font-medium">
                            Deployed
                          </span>
                        )}
                        
                        {firmware.status === 'failed' && (
                          <span className="text-sm text-red-600 font-medium">
                            Failed
                    </span>
                        )}
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(firmware.id)}
                          disabled={isLoading}
                        >
                          Delete
                        </Button>
                  </div>
                </div>
                
                    {firmware.error_message && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {firmware.error_message}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ))}
                  </div>
                )}
              </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}