// OTA (Over-The-Air) update API routes
import { Router } from 'express';
import { supabase } from '../integrations';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/octet-stream' || file.originalname.endsWith('.bin')) {
      cb(null, true);
    } else {
      cb(new Error('Only .bin firmware files are allowed'));
    }
  }
});

// Calculate SHA256 checksum
function calculateSHA256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// Upload firmware file
router.post('/upload', upload.single('firmware'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No firmware file provided' });
    }

    const { version, description, releaseNotes } = req.body;

    if (!version) {
      return res.status(400).json({ error: 'Version is required' });
    }

    // Calculate checksum
    const checksum = calculateSHA256(req.file.buffer);

    // Generate unique filename
    const fileName = `firmware_${version}_${Date.now()}.bin`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('firmware')
      .upload(fileName, req.file.buffer, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      return res.status(500).json({ error: `Failed to upload firmware: ${uploadError.message}` });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('firmware')
      .getPublicUrl(fileName);

    // Create firmware version record
    const { data: firmwareData, error: firmwareError } = await supabase
      .from('firmware_versions')
      .insert({
        version,
        description: description || '',
        release_notes: releaseNotes || '',
        firmware_url: urlData.publicUrl,
        firmware_checksum: checksum,
        firmware_size: req.file.size,
        is_stable: false,
        is_latest: false
      })
      .select()
      .single();

    if (firmwareError) {
      return res.status(500).json({ error: `Failed to create firmware version: ${firmwareError.message}` });
    }

    res.json({ 
      message: 'Firmware uploaded successfully',
      firmware: firmwareData
    });
  } catch (error) {
    console.error('Failed to upload firmware:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get firmware versions
router.get('/firmware', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('firmware_versions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ firmware: data || [] });
  } catch (error) {
    console.error('Failed to get firmware versions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get latest firmware version
router.get('/firmware/latest', async (req, res) => {
  try {
    const { data, error } = await supabase
      .rpc('get_latest_firmware_version');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ firmware: data && data.length > 0 ? data[0] : null });
  } catch (error) {
    console.error('Failed to get latest firmware version:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get stable firmware versions
router.get('/firmware/stable', async (req, res) => {
  try {
    const { data, error } = await supabase
      .rpc('get_stable_firmware_versions');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ firmware: data || [] });
  } catch (error) {
    console.error('Failed to get stable firmware versions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start OTA update
router.post('/update/start', async (req, res) => {
  try {
    const { deviceId, firmwareVersion, firmwareUrl, firmwareChecksum, firmwareSize, description } = req.body;

    if (!deviceId || !firmwareVersion || !firmwareUrl || !firmwareChecksum || !firmwareSize) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create OTA update record
    const { data: otaData, error: otaError } = await supabase
      .from('ota_updates')
      .insert({
        device_id: deviceId,
        firmware_version: firmwareVersion,
        firmware_url: firmwareUrl,
        firmware_checksum: firmwareChecksum,
        firmware_size: firmwareSize,
        status: 'pending',
        progress: 0
      })
      .select()
      .single();

    if (otaError) {
      return res.status(500).json({ error: `Failed to create OTA update record: ${otaError.message}` });
    }

    res.json({ 
      message: 'OTA update started',
      update: otaData
    });
  } catch (error) {
    console.error('Failed to start OTA update:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update OTA status
router.post('/update/:updateId/status', async (req, res) => {
  try {
    const { updateId } = req.params;
    const { status, progress, errorMessage } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const updateData: any = {
      status,
      last_attempt: new Date().toISOString()
    };

    if (progress !== undefined) {
      updateData.progress = progress;
    }

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    if (['success', 'failed', 'rollback'].includes(status)) {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('ota_updates')
      .update(updateData)
      .eq('id', updateId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: `Failed to update OTA status: ${error.message}` });
    }

    if (!data) {
      return res.status(404).json({ error: 'OTA update not found' });
    }

    res.json({ 
      message: 'OTA status updated',
      update: data
    });
  } catch (error) {
    console.error('Failed to update OTA status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get OTA update history
router.get('/updates/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const { data, error } = await supabase
      .from('ota_updates')
      .select('*')
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ updates: data || [] });
  } catch (error) {
    console.error('Failed to get OTA update history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get OTA statistics
router.get('/stats', async (req, res) => {
  try {
    const { deviceId } = req.query;

    const { data, error } = await supabase
      .rpc('get_ota_update_stats', { device_id_param: deviceId || null });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ stats: data || [] });
  } catch (error) {
    console.error('Failed to get OTA stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pending OTA updates
router.get('/updates/pending', async (req, res) => {
  try {
    const { deviceId } = req.query;

    let query = supabase
      .from('ota_updates')
      .select('*')
      .in('status', ['pending', 'downloading', 'installing'])
      .order('created_at', { ascending: false });

    if (deviceId) {
      query = query.eq('device_id', deviceId);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ updates: data || [] });
  } catch (error) {
    console.error('Failed to get pending OTA updates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel OTA update
router.post('/update/:updateId/cancel', async (req, res) => {
  try {
    const { updateId } = req.params;

    const { data, error } = await supabase
      .from('ota_updates')
      .update({
        status: 'failed',
        error_message: 'Update cancelled by user',
        completed_at: new Date().toISOString()
      })
      .eq('id', updateId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'OTA update not found' });
    }

    res.json({ 
      message: 'OTA update cancelled',
      update: data
    });
  } catch (error) {
    console.error('Failed to cancel OTA update:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Retry OTA update
router.post('/update/:updateId/retry', async (req, res) => {
  try {
    const { updateId } = req.params;
    const { maxRetries = 3 } = req.body;

    // Get the failed update
    const { data: updateData, error: fetchError } = await supabase
      .from('ota_updates')
      .select('*')
      .eq('id', updateId)
      .single();

    if (fetchError || !updateData) {
      return res.status(404).json({ error: 'OTA update not found' });
    }

    // Reset status
    const { data, error } = await supabase
      .from('ota_updates')
      .update({
        status: 'pending',
        progress: 0,
        error_message: null,
        completed_at: null,
        max_retries: maxRetries
      })
      .eq('id', updateId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ 
      message: 'OTA update queued for retry',
      update: data
    });
  } catch (error) {
    console.error('Failed to retry OTA update:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark firmware as stable
router.post('/firmware/:versionId/stable', async (req, res) => {
  try {
    const { versionId } = req.params;

    const { data, error } = await supabase
      .from('firmware_versions')
      .update({ is_stable: true })
      .eq('id', versionId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Firmware version not found' });
    }

    res.json({ 
      message: 'Firmware marked as stable',
      firmware: data
    });
  } catch (error) {
    console.error('Failed to mark firmware as stable:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark firmware as latest
router.post('/firmware/:versionId/latest', async (req, res) => {
  try {
    const { versionId } = req.params;

    const { data, error } = await supabase
      .from('firmware_versions')
      .update({ is_latest: true })
      .eq('id', versionId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Firmware version not found' });
    }

    res.json({ 
      message: 'Firmware marked as latest',
      firmware: data
    });
  } catch (error) {
    console.error('Failed to mark firmware as latest:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete firmware version
router.delete('/firmware/:versionId', async (req, res) => {
  try {
    const { versionId } = req.params;

    // Get firmware version to get file path
    const { data: firmwareData, error: fetchError } = await supabase
      .from('firmware_versions')
      .select('firmware_url')
      .eq('id', versionId)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: 'Firmware version not found' });
    }

    // Extract filename from URL
    const url = new URL(firmwareData.firmware_url);
    const fileName = url.pathname.split('/').pop();

    // Delete from storage
    if (fileName) {
      const { error: storageError } = await supabase.storage
        .from('firmware')
        .remove([fileName]);

      if (storageError) {
        console.warn('Failed to delete firmware file from storage:', storageError);
      }
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('firmware_versions')
      .delete()
      .eq('id', versionId);

    if (dbError) {
      return res.status(500).json({ error: `Failed to delete firmware version: ${dbError.message}` });
    }

    res.json({ message: 'Firmware version deleted successfully' });
  } catch (error) {
    console.error('Failed to delete firmware version:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get OTA update by ID
router.get('/update/:updateId', async (req, res) => {
  try {
    const { updateId } = req.params;

    const { data, error } = await supabase
      .from('ota_updates')
      .select('*')
      .eq('id', updateId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'OTA update not found' });
      }
      return res.status(500).json({ error: error.message });
    }

    res.json({ update: data });
  } catch (error) {
    console.error('Failed to get OTA update:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
