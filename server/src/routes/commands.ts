// Command management API routes for reliable command acknowledgment
import { Router } from 'express';
import { supabase } from '../integrations';

const router = Router();

// Get command history for a device
router.get('/history/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const { data, error } = await supabase
      .from('commands')
      .select('*')
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ commands: data || [] });
  } catch (error) {
    console.error('Failed to get command history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get command statistics
router.get('/stats', async (req, res) => {
  try {
    const { deviceId } = req.query;

    const { data, error } = await supabase
      .rpc('get_command_stats', { device_id_param: deviceId || null });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ stats: data || [] });
  } catch (error) {
    console.error('Failed to get command stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pending commands
router.get('/pending', async (req, res) => {
  try {
    const { deviceId } = req.query;

    let query = supabase
      .from('commands')
      .select('*')
      .in('status', ['pending', 'sent'])
      .order('created_at', { ascending: false });

    if (deviceId) {
      query = query.eq('device_id', deviceId);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ pendingCommands: data || [] });
  } catch (error) {
    console.error('Failed to get pending commands:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel a command
router.post('/cancel/:cmdId', async (req, res) => {
  try {
    const { cmdId } = req.params;

    const { data, error } = await supabase
      .from('commands')
      .update({ 
        status: 'failed',
        last_attempt: new Date().toISOString()
      })
      .eq('cmd_id', cmdId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Command not found' });
    }

    res.json({ message: 'Command cancelled', command: data });
  } catch (error) {
    console.error('Failed to cancel command:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Retry a failed command
router.post('/retry/:cmdId', async (req, res) => {
  try {
    const { cmdId } = req.params;
    const { maxRetries = 3 } = req.body;

    const { data, error } = await supabase
      .from('commands')
      .update({ 
        status: 'pending',
        retries: 0,
        max_retries: maxRetries,
        last_attempt: new Date().toISOString(),
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      })
      .eq('cmd_id', cmdId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Command not found' });
    }

    res.json({ message: 'Command queued for retry', command: data });
  } catch (error) {
    console.error('Failed to retry command:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle command acknowledgment from MQTT bridge
router.post('/ack', async (req, res) => {
  try {
    const { deviceId, tenantId, cmd_id, ok, error, result, timestamp } = req.body;

    if (!cmd_id) {
      return res.status(400).json({ error: 'cmd_id is required' });
    }

    const updateData: any = {
      status: ok ? 'acknowledged' : 'failed',
      last_attempt: new Date().toISOString()
    };

    if (ok) {
      updateData.acknowledged_at = new Date().toISOString();
    }

    const { data, error: dbError } = await supabase
      .from('commands')
      .update(updateData)
      .eq('cmd_id', cmd_id)
      .select()
      .single();

    if (dbError) {
      console.error('Failed to update command status:', dbError);
      return res.status(500).json({ error: 'Failed to update command status' });
    }

    if (!data) {
      console.warn(`Command ${cmd_id} not found in database`);
      return res.status(404).json({ error: 'Command not found' });
    }

    console.log(`Command ${cmd_id} ${ok ? 'acknowledged' : 'failed'}:`, {
      deviceId,
      tenantId,
      error,
      result
    });

    res.json({ message: 'Command acknowledgment processed', command: data });
  } catch (error) {
    console.error('Failed to process command acknowledgment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clean up expired commands
router.post('/cleanup', async (req, res) => {
  try {
    const { error } = await supabase
      .rpc('cleanup_expired_commands');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Expired commands cleaned up' });
  } catch (error) {
    console.error('Failed to cleanup expired commands:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get command by ID
router.get('/:cmdId', async (req, res) => {
  try {
    const { cmdId } = req.params;

    const { data, error } = await supabase
      .from('commands')
      .select('*')
      .eq('cmd_id', cmdId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Command not found' });
      }
      return res.status(500).json({ error: error.message });
    }

    res.json({ command: data });
  } catch (error) {
    console.error('Failed to get command:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
