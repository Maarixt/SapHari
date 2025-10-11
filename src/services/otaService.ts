// OTA (Over-The-Air) update service for ESP32 devices
import { supabase } from '../lib/supabase';
// import { commandService } from './commandService'; // Temporarily commented out
import { sendReliableCommand } from './mqtt';

export interface FirmwareUpload {
  id: string;
  device_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  checksum_sha256: string;
  version?: string;
  description?: string;
  status: 'uploaded' | 'deployed' | 'failed' | 'rollback';
  uploaded_by: string;
  uploaded_at: string;
  deployed_at?: string;
  deployed_to_device_at?: string;
  rollback_at?: string;
  error_message?: string;
}

export interface FirmwareStats {
  device_id: string;
  total_uploads: number;
  successful_deployments: number;
  failed_deployments: number;
  rollbacks: number;
  success_rate: number;
  latest_version?: string;
}

export interface OTAUpdateProgress {
  deviceId: string;
  status: 'starting' | 'downloading' | 'validating' | 'success' | 'error' | 'rebooting';
  message: string;
  progress: number;
  timestamp: number;
  totalSize: number;
  downloadedSize: number;
}

class OTAService {
  private updateProgress = new Map<string, OTAUpdateProgress>();
  private progressCallbacks = new Set<(progress: OTAUpdateProgress) => void>();

  // Upload firmware file to Supabase Storage
  async uploadFirmware(
    deviceId: string,
    file: File,
    version?: string,
    description?: string
  ): Promise<FirmwareUpload> {
    try {
      // Calculate SHA256 checksum
      const checksum = await this.calculateFileChecksum(file);
      
      // Generate file path: deviceId/filename_timestamp.bin
      const timestamp = Date.now();
      const fileName = `${file.name.replace(/\.[^/.]+$/, '')}_${timestamp}.bin`;
      const filePath = `${deviceId}/${fileName}`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('firmware')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Create database record
      const { data: firmwareRecord, error: dbError } = await supabase
        .from('firmware_uploads')
        .insert({
          device_id: deviceId,
          file_name: fileName,
          file_path: filePath,
          file_size: file.size,
          checksum_sha256: checksum,
          version,
          description,
          status: 'uploaded'
        })
        .select()
        .single();

      if (dbError) {
        // Clean up uploaded file if database insert fails
        await supabase.storage.from('firmware').remove([filePath]);
        throw new Error(`Database error: ${dbError.message}`);
      }

      console.log(`Firmware uploaded successfully: ${fileName}`);
      return firmwareRecord;
      
    } catch (error) {
      console.error('Firmware upload failed:', error);
      throw error;
    }
  }

  // Calculate SHA256 checksum of file
  private async calculateFileChecksum(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Generate signed URL for firmware download
  async generateSignedUrl(filePath: string, expiresInSeconds: number = 3600): Promise<string> {
    const { data, error } = await supabase
      .rpc('generate_firmware_signed_url', {
        file_path: filePath,
        expires_in_seconds: expiresInSeconds
      });

    if (error) {
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }

    return data;
  }

  // Deploy firmware to device
  async deployFirmware(
    deviceId: string,
    firmwareId: string,
    retryConfig?: any
  ): Promise<void> {
    try {
      // Get firmware record
      const { data: firmware, error: fetchError } = await supabase
        .from('firmware_uploads')
        .select('*')
        .eq('id', firmwareId)
        .eq('device_id', deviceId)
        .single();

      if (fetchError || !firmware) {
        throw new Error('Firmware not found');
      }

      if (firmware.status !== 'uploaded') {
        throw new Error(`Firmware status is ${firmware.status}, cannot deploy`);
      }

      // Generate signed URL (expires in 1 hour)
      const signedUrl = await this.generateSignedUrl(firmware.file_path, 3600);

      // Update status to deploying
      await supabase
        .from('firmware_uploads')
        .update({ 
          status: 'deployed',
          deployed_at: new Date().toISOString()
        })
        .eq('id', firmwareId);

      // Send OTA command to device
      const command = {
        action: 'ota_update',
        url: signedUrl,
        checksum: firmware.checksum_sha256,
        version: firmware.version,
        description: firmware.description
      };

      console.log(`Deploying firmware to device ${deviceId}:`, command);

      // Temporarily disabled - command service not available
      console.log('OTA deployment temporarily disabled - command service not available');
      return { success: false, command, message: 'Command service temporarily disabled' };
      
      // // Use reliable command service for OTA command
      // const ack = await commandService.sendCommand(deviceId, 'ota_update', {
      //   url: signedUrl,
      //   checksum: firmware.checksum_sha256,
      //   version: firmware.version,
      //   description: firmware.description
      // }, retryConfig);

      // if (ack.ok) {
      //   console.log(`OTA command sent successfully to ${deviceId}`);
      //   
      //   // Update status
      //   await supabase
      //     .from('firmware_uploads')
      //     .update({ 
      //       deployed_to_device_at: new Date().toISOString()
      //     })
      //     .eq('id', firmwareId);
      // } else {
      //   throw new Error(ack.error || 'OTA command failed');
      // }

    } catch (error) {
      console.error('Firmware deployment failed:', error);
      
      // Update status to failed
      await supabase
        .from('firmware_uploads')
        .update({ 
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', firmwareId);
      
      throw error;
    }
  }

  // Get firmware uploads for a device
  async getFirmwareUploads(deviceId: string, limit: number = 50): Promise<FirmwareUpload[]> {
    const { data, error } = await supabase
      .from('firmware_uploads')
      .select('*')
      .eq('device_id', deviceId)
      .order('uploaded_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get firmware uploads: ${error.message}`);
    }

    return data || [];
  }

  // Get firmware statistics
  async getFirmwareStats(deviceId?: string): Promise<FirmwareStats[]> {
    const { data, error } = await supabase
      .rpc('get_firmware_stats', { device_id_param: deviceId || null });

    if (error) {
      throw new Error(`Failed to get firmware stats: ${error.message}`);
    }

    return data || [];
  }

  // Delete firmware upload
  async deleteFirmware(firmwareId: string): Promise<void> {
    try {
      // Get firmware record
      const { data: firmware, error: fetchError } = await supabase
        .from('firmware_uploads')
        .select('file_path')
        .eq('id', firmwareId)
        .single();

      if (fetchError || !firmware) {
        throw new Error('Firmware not found');
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('firmware')
        .remove([firmware.file_path]);

      if (storageError) {
        console.warn('Failed to delete from storage:', storageError);
      }

      // Delete database record
      const { error: dbError } = await supabase
        .from('firmware_uploads')
        .delete()
        .eq('id', firmwareId);

      if (dbError) {
        throw new Error(`Failed to delete firmware record: ${dbError.message}`);
      }

      console.log(`Firmware deleted: ${firmwareId}`);
      
    } catch (error) {
      console.error('Failed to delete firmware:', error);
      throw error;
    }
  }

  // Handle OTA progress updates from MQTT
  handleOTAProgress(progress: OTAUpdateProgress) {
    this.updateProgress.set(progress.deviceId, progress);
    
    // Notify all callbacks
    this.progressCallbacks.forEach(callback => {
      try {
        callback(progress);
      } catch (error) {
        console.error('Error in OTA progress callback:', error);
      }
    });
  }

  // Subscribe to OTA progress updates
  onOTAProgress(callback: (progress: OTAUpdateProgress) => void) {
    this.progressCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.progressCallbacks.delete(callback);
    };
  }

  // Get current OTA progress for a device
  getOTAProgress(deviceId: string): OTAUpdateProgress | undefined {
    return this.updateProgress.get(deviceId);
  }

  // Get all OTA progress updates
  getAllOTAProgress(): OTAUpdateProgress[] {
    return Array.from(this.updateProgress.values());
  }

  // Clear OTA progress for a device
  clearOTAProgress(deviceId: string) {
    this.updateProgress.delete(deviceId);
  }

  // Rollback firmware (mark as rollback in database)
  async rollbackFirmware(firmwareId: string): Promise<void> {
    const { error } = await supabase
      .from('firmware_uploads')
      .update({ 
        status: 'rollback',
        rollback_at: new Date().toISOString()
      })
      .eq('id', firmwareId);

    if (error) {
      throw new Error(`Failed to rollback firmware: ${error.message}`);
    }
  }

  // Get latest deployed firmware for a device
  async getLatestFirmware(deviceId: string): Promise<FirmwareUpload | null> {
    const { data, error } = await supabase
      .from('firmware_uploads')
      .select('*')
      .eq('device_id', deviceId)
      .eq('status', 'deployed')
      .order('deployed_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Failed to get latest firmware: ${error.message}`);
    }

    return data || null;
  }

  // Validate firmware file
  validateFirmwareFile(file: File): { valid: boolean; error?: string } {
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return { valid: false, error: 'File size exceeds 10MB limit' };
    }

    // Check file type
    if (!file.name.endsWith('.bin')) {
      return { valid: false, error: 'File must be a .bin file' };
    }

    // Check minimum size (should be at least 1KB for a valid firmware)
    if (file.size < 1024) {
      return { valid: false, error: 'File size too small for valid firmware' };
    }

    return { valid: true };
  }
}

// Export singleton instance
export const otaService = new OTAService();