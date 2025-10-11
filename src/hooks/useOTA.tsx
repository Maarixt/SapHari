// React hook for OTA (Over-The-Air) update management
import { useState, useEffect, useCallback } from 'react';
import { otaService, FirmwareUpload, FirmwareStats, OTAUpdateProgress } from '../services/otaService';

interface UseOTAReturn {
  // Firmware management
  uploadFirmware: (
    deviceId: string,
    file: File,
    version?: string,
    description?: string
  ) => Promise<FirmwareUpload>;
  
  deployFirmware: (
    deviceId: string,
    firmwareId: string,
    retryConfig?: any
  ) => Promise<void>;
  
  deleteFirmware: (firmwareId: string) => Promise<void>;
  rollbackFirmware: (firmwareId: string) => Promise<void>;
  
  // Data retrieval
  getFirmwareUploads: (deviceId: string, limit?: number) => Promise<FirmwareUpload[]>;
  getFirmwareStats: (deviceId?: string) => Promise<FirmwareStats[]>;
  getLatestFirmware: (deviceId: string) => Promise<FirmwareUpload | null>;
  
  // OTA progress tracking
  otaProgress: OTAUpdateProgress[];
  getOTAProgress: (deviceId: string) => OTAUpdateProgress | undefined;
  clearOTAProgress: (deviceId: string) => void;
  
  // State
  isLoading: boolean;
  error: string | null;
  
  // Validation
  validateFirmwareFile: (file: File) => { valid: boolean; error?: string };
}

export function useOTA(): UseOTAReturn {
  const [otaProgress, setOtaProgress] = useState<OTAUpdateProgress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update OTA progress when service updates
  useEffect(() => {
    const unsubscribe = otaService.onOTAProgress((progress) => {
      setOtaProgress(prev => {
        const existing = prev.find(p => p.deviceId === progress.deviceId);
        if (existing) {
          return prev.map(p => p.deviceId === progress.deviceId ? progress : p);
        } else {
          return [...prev, progress];
        }
      });
    });

    return unsubscribe;
  }, []);

  // Upload firmware file
  const uploadFirmware = useCallback(async (
    deviceId: string,
    file: File,
    version?: string,
    description?: string
  ): Promise<FirmwareUpload> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const firmware = await otaService.uploadFirmware(deviceId, file, version, description);
      return firmware;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload firmware';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Deploy firmware to device
  const deployFirmware = useCallback(async (
    deviceId: string,
    firmwareId: string,
    retryConfig?: any
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await otaService.deployFirmware(deviceId, firmwareId, retryConfig);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deploy firmware';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Delete firmware
  const deleteFirmware = useCallback(async (firmwareId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await otaService.deleteFirmware(firmwareId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete firmware';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Rollback firmware
  const rollbackFirmware = useCallback(async (firmwareId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await otaService.rollbackFirmware(firmwareId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to rollback firmware';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get firmware uploads
  const getFirmwareUploads = useCallback(async (
    deviceId: string, 
    limit: number = 50
  ): Promise<FirmwareUpload[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const uploads = await otaService.getFirmwareUploads(deviceId, limit);
      return uploads;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get firmware uploads';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get firmware statistics
  const getFirmwareStats = useCallback(async (
    deviceId?: string
  ): Promise<FirmwareStats[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const stats = await otaService.getFirmwareStats(deviceId);
      return stats;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get firmware stats';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get latest firmware
  const getLatestFirmware = useCallback(async (
    deviceId: string
  ): Promise<FirmwareUpload | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const firmware = await otaService.getLatestFirmware(deviceId);
      return firmware;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get latest firmware';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get OTA progress for specific device
  const getOTAProgress = useCallback((deviceId: string): OTAUpdateProgress | undefined => {
    return otaService.getOTAProgress(deviceId);
  }, []);

  // Clear OTA progress for specific device
  const clearOTAProgress = useCallback((deviceId: string) => {
    otaService.clearOTAProgress(deviceId);
    setOtaProgress(prev => prev.filter(p => p.deviceId !== deviceId));
  }, []);

  // Validate firmware file
  const validateFirmwareFile = useCallback((file: File) => {
    return otaService.validateFirmwareFile(file);
  }, []);

  return {
    uploadFirmware,
    deployFirmware,
    deleteFirmware,
    rollbackFirmware,
    getFirmwareUploads,
    getFirmwareStats,
    getLatestFirmware,
    otaProgress,
    getOTAProgress,
    clearOTAProgress,
    isLoading,
    error,
    validateFirmwareFile
  };
}

// Hook for device-specific OTA operations
export function useDeviceOTA(deviceId: string) {
  const ota = useOTA();
  const [firmwareUploads, setFirmwareUploads] = useState<FirmwareUpload[]>([]);
  const [firmwareStats, setFirmwareStats] = useState<FirmwareStats[]>([]);
  const [latestFirmware, setLatestFirmware] = useState<FirmwareUpload | null>(null);

  // Load firmware data for this device
  const loadFirmwareData = useCallback(async () => {
    if (!deviceId) return;

    try {
      const [uploads, stats, latest] = await Promise.all([
        ota.getFirmwareUploads(deviceId),
        ota.getFirmwareStats(deviceId),
        ota.getLatestFirmware(deviceId)
      ]);

      setFirmwareUploads(uploads);
      setFirmwareStats(stats);
      setLatestFirmware(latest);
    } catch (error) {
      console.error('Failed to load firmware data:', error);
    }
  }, [deviceId, ota]);

  // Load data on mount and when deviceId changes
  useEffect(() => {
    loadFirmwareData();
  }, [loadFirmwareData]);

  // Get OTA progress for this device
  const deviceOTAProgress = ota.getOTAProgress(deviceId);

  return {
    ...ota,
    firmwareUploads,
    firmwareStats,
    latestFirmware,
    deviceOTAProgress,
    loadFirmwareData
  };
}

// Hook for OTA progress monitoring
export function useOTAProgress() {
  const [otaProgress, setOtaProgress] = useState<OTAUpdateProgress[]>([]);

  useEffect(() => {
    const unsubscribe = otaService.onOTAProgress((progress) => {
      setOtaProgress(prev => {
        const existing = prev.find(p => p.deviceId === progress.deviceId);
        if (existing) {
          return prev.map(p => p.deviceId === progress.deviceId ? progress : p);
        } else {
          return [...prev, progress];
        }
      });
    });

    return unsubscribe;
  }, []);

  // Get progress for specific device
  const getDeviceProgress = useCallback((deviceId: string) => {
    return otaProgress.find(p => p.deviceId === deviceId);
  }, [otaProgress]);

  // Get all active updates (not completed)
  const getActiveUpdates = useCallback(() => {
    return otaProgress.filter(p => 
      !['success', 'error'].includes(p.status)
    );
  }, [otaProgress]);

  // Get completed updates
  const getCompletedUpdates = useCallback(() => {
    return otaProgress.filter(p => 
      ['success', 'error'].includes(p.status)
    );
  }, [otaProgress]);

  // Clear progress for device
  const clearDeviceProgress = useCallback((deviceId: string) => {
    otaService.clearOTAProgress(deviceId);
    setOtaProgress(prev => prev.filter(p => p.deviceId !== deviceId));
  }, []);

  return {
    otaProgress,
    getDeviceProgress,
    getActiveUpdates,
    getCompletedUpdates,
    clearDeviceProgress
  };
}