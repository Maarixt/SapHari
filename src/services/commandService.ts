// Reliable command acknowledgment service with retry logic
import { supabase } from '../lib/supabase';
import { 
  CommandPayload, 
  CommandAck, 
  CommandRecord, 
  CommandStats,
  generateCommandId,
  createCommand,
  validateCommand,
  validateCommandAck,
  calculateCommandTimeout,
  calculateRetryDelay,
  DEFAULT_RETRY_CONFIG,
  RetryConfig
} from '../lib/commandTypes';

// Command tracking and retry management
class CommandService {
  private pendingCommands = new Map<string, {
    command: CommandPayload;
    resolve: (ack: CommandAck) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
    retries: number;
    config: RetryConfig;
  }>();

  private mqttClient: any = null;
  private tenantId: string = 'default';

  constructor() {
    this.tenantId = this.getCurrentTenantId();
  }

  // Set MQTT client reference
  setMqttClient(client: any) {
    this.mqttClient = client;
  }

  // Get current tenant ID (placeholder - implement based on user context)
  private getCurrentTenantId(): string {
    // TODO: Implement tenant resolution based on user context
    // For now, return a default tenant
    return 'tenantA';
  }

  // Send command with reliable acknowledgment and retry logic
  async sendCommand(
    deviceId: string, 
    action: string, 
    options: {
      pin?: number;
      state?: number | boolean;
      value?: number;
      duration?: number;
      metadata?: Record<string, any>;
    } = {},
    retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
  ): Promise<CommandAck> {
    
    // Create command payload
    const command = createCommand(action as any, deviceId, options);
    
    // Store command in database
    const { data: commandRecord, error: dbError } = await supabase
      .from('commands')
      .insert({
        device_id: deviceId,
        cmd_id: command.cmd_id,
        payload: command,
        status: 'pending',
        retries: 0,
        max_retries: retryConfig.maxRetries,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Failed to store command: ${dbError.message}`);
    }

    // Send command via MQTT
    return this.sendCommandViaMqtt(command, deviceId, retryConfig);
  }

  // Send command via MQTT with retry logic
  private async sendCommandViaMqtt(
    command: CommandPayload, 
    deviceId: string, 
    config: RetryConfig
  ): Promise<CommandAck> {
    
    return new Promise((resolve, reject) => {
      const topic = `saphari/${this.tenantId}/devices/${deviceId}/cmd`;
      const payload = JSON.stringify(command);
      
      // Store pending command
      const timeout = setTimeout(() => {
        this.handleCommandTimeout(command.cmd_id, config);
      }, config.timeoutMs);

      this.pendingCommands.set(command.cmd_id, {
        command,
        resolve,
        reject,
        timeout,
        retries: 0,
        config
      });

      // Publish command
      if (this.mqttClient && this.mqttClient.connected) {
        this.mqttClient.publish(topic, payload);
        console.log(`Command sent: ${command.cmd_id} to ${deviceId}`);
        
        // Update database status
        this.updateCommandStatus(command.cmd_id, 'sent');
      } else {
        reject(new Error('MQTT client not connected'));
        this.pendingCommands.delete(command.cmd_id);
      }
    });
  }

  // Handle command acknowledgment
  handleCommandAck(ack: CommandAck) {
    const pending = this.pendingCommands.get(ack.cmd_id);
    
    if (!pending) {
      console.warn(`Received ACK for unknown command: ${ack.cmd_id}`);
      return;
    }

    // Clear timeout
    clearTimeout(pending.timeout);
    
    // Update database
    this.updateCommandStatus(ack.cmd_id, ack.ok ? 'acknowledged' : 'failed', ack);
    
    // Resolve promise
    if (ack.ok) {
      pending.resolve(ack);
    } else {
      pending.reject(new Error(ack.error || 'Command failed'));
    }
    
    // Remove from pending
    this.pendingCommands.delete(ack.cmd_id);
  }

  // Handle command timeout
  private async handleCommandTimeout(cmdId: string, config: RetryConfig) {
    const pending = this.pendingCommands.get(cmdId);
    
    if (!pending) return;

    pending.retries++;
    
    if (pending.retries < config.maxRetries) {
      // Retry command
      console.log(`Retrying command ${cmdId} (attempt ${pending.retries + 1}/${config.maxRetries})`);
      
      // Calculate retry delay
      const delay = calculateRetryDelay(pending.retries, config);
      
      setTimeout(() => {
        this.retryCommand(pending, config);
      }, delay);
      
    } else {
      // Max retries exceeded
      console.error(`Command ${cmdId} failed after ${config.maxRetries} retries`);
      
      // Update database
      this.updateCommandStatus(cmdId, 'timeout');
      
      // Reject promise
      pending.reject(new Error(`Command failed after ${config.maxRetries} retries`));
      
      // Remove from pending
      this.pendingCommands.delete(cmdId);
    }
  }

  // Retry command
  private async retryCommand(pending: any, config: RetryConfig) {
    const { command } = pending;
    const deviceId = command.device_id || 'unknown';
    
    // Update retry count in database
    await supabase
      .from('commands')
      .update({ 
        retries: pending.retries,
        last_attempt: new Date().toISOString()
      })
      .eq('cmd_id', command.cmd_id);

    // Set new timeout
    const timeout = setTimeout(() => {
      this.handleCommandTimeout(command.cmd_id, config);
    }, config.timeoutMs);

    pending.timeout = timeout;

    // Publish command again
    if (this.mqttClient && this.mqttClient.connected) {
      const topic = `saphari/${this.tenantId}/devices/${deviceId}/cmd`;
      const payload = JSON.stringify(command);
      this.mqttClient.publish(topic, payload);
      console.log(`Command retry sent: ${command.cmd_id} to ${deviceId}`);
    } else {
      pending.reject(new Error('MQTT client not connected during retry'));
      this.pendingCommands.delete(command.cmd_id);
    }
  }

  // Update command status in database
  private async updateCommandStatus(
    cmdId: string, 
    status: string, 
    ack?: CommandAck
  ) {
    const updateData: any = {
      status,
      last_attempt: new Date().toISOString()
    };

    if (status === 'acknowledged' && ack) {
      updateData.acknowledged_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('commands')
      .update(updateData)
      .eq('cmd_id', cmdId);

    if (error) {
      console.error(`Failed to update command status: ${error.message}`);
    }
  }

  // Get command history for a device
  async getCommandHistory(deviceId: string, limit: number = 50): Promise<CommandRecord[]> {
    const { data, error } = await supabase
      .from('commands')
      .select('*')
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get command history: ${error.message}`);
    }

    return data || [];
  }

  // Get command statistics
  async getCommandStats(deviceId?: string): Promise<CommandStats[]> {
    const { data, error } = await supabase
      .rpc('get_command_stats', { device_id_param: deviceId });

    if (error) {
      throw new Error(`Failed to get command stats: ${error.message}`);
    }

    return data || [];
  }

  // Clean up expired commands
  async cleanupExpiredCommands(): Promise<void> {
    const { error } = await supabase
      .rpc('cleanup_expired_commands');

    if (error) {
      console.error(`Failed to cleanup expired commands: ${error.message}`);
    }
  }

  // Get pending commands count
  getPendingCommandsCount(): number {
    return this.pendingCommands.size;
  }

  // Cancel pending command
  cancelCommand(cmdId: string): boolean {
    const pending = this.pendingCommands.get(cmdId);
    
    if (!pending) return false;

    clearTimeout(pending.timeout);
    pending.reject(new Error('Command cancelled'));
    this.pendingCommands.delete(cmdId);
    
    // Update database
    this.updateCommandStatus(cmdId, 'failed');
    
    return true;
  }

  // Get all pending commands
  getPendingCommands(): CommandPayload[] {
    return Array.from(this.pendingCommands.values()).map(p => p.command);
  }
}

// Export singleton instance
export const commandService = new CommandService();

// Export types and utilities
export {
  CommandPayload,
  CommandAck,
  CommandRecord,
  CommandStats,
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
  generateCommandId,
  createCommand,
  validateCommand,
  validateCommandAck
};
