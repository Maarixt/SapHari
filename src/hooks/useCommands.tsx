// React hook for command management and reliable command sending
import { useState, useEffect, useCallback } from 'react';
import { commandService } from '../services/commandService';
import { 
  CommandRecord, 
  CommandStats, 
  CommandAck, 
  RetryConfig,
  DEFAULT_RETRY_CONFIG 
} from '../lib/commandTypes';

interface UseCommandsReturn {
  // Command sending
  sendCommand: (
    deviceId: string,
    action: string,
    options?: {
      pin?: number;
      state?: number | boolean;
      value?: number;
      duration?: number;
      metadata?: Record<string, any>;
    },
    retryConfig?: RetryConfig
  ) => Promise<CommandAck>;
  
  // Command management
  getCommandHistory: (deviceId: string, limit?: number) => Promise<CommandRecord[]>;
  getCommandStats: (deviceId?: string) => Promise<CommandStats[]>;
  cancelCommand: (cmdId: string) => boolean;
  retryCommand: (cmdId: string, maxRetries?: number) => Promise<void>;
  
  // State
  pendingCommands: CommandRecord[];
  pendingCount: number;
  isLoading: boolean;
  error: string | null;
  
  // Cleanup
  cleanupExpiredCommands: () => Promise<void>;
}

export function useCommands(): UseCommandsReturn {
  const [pendingCommands, setPendingCommands] = useState<CommandRecord[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update pending commands count
  const updatePendingCount = useCallback(() => {
    const count = commandService.getPendingCommandsCount();
    setPendingCount(count);
  }, []);

  // Send command with reliable acknowledgment
  const sendCommand = useCallback(async (
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
  ): Promise<CommandAck> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const ack = await commandService.sendCommand(deviceId, action, options, retryConfig);
      updatePendingCount();
      return ack;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send command';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [updatePendingCount]);

  // Get command history for a device
  const getCommandHistory = useCallback(async (
    deviceId: string, 
    limit: number = 50
  ): Promise<CommandRecord[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const history = await commandService.getCommandHistory(deviceId, limit);
      return history;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get command history';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get command statistics
  const getCommandStats = useCallback(async (
    deviceId?: string
  ): Promise<CommandStats[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const stats = await commandService.getCommandStats(deviceId);
      return stats;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get command stats';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cancel a pending command
  const cancelCommand = useCallback((cmdId: string): boolean => {
    const cancelled = commandService.cancelCommand(cmdId);
    updatePendingCount();
    return cancelled;
  }, [updatePendingCount]);

  // Retry a failed command
  const retryCommand = useCallback(async (
    cmdId: string, 
    maxRetries: number = 3
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // This would typically make an API call to retry the command
      // For now, we'll just update the local state
      console.log(`Retrying command ${cmdId} with max retries: ${maxRetries}`);
      // TODO: Implement API call to retry command
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to retry command';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Clean up expired commands
  const cleanupExpiredCommands = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await commandService.cleanupExpiredCommands();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cleanup expired commands';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update pending commands periodically
  useEffect(() => {
    const interval = setInterval(() => {
      updatePendingCount();
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [updatePendingCount]);

  // Initial pending count update
  useEffect(() => {
    updatePendingCount();
  }, [updatePendingCount]);

  return {
    sendCommand,
    getCommandHistory,
    getCommandStats,
    cancelCommand,
    retryCommand,
    pendingCommands,
    pendingCount,
    isLoading,
    error,
    cleanupExpiredCommands
  };
}

// Hook for device-specific commands
export function useDeviceCommands(deviceId: string) {
  const commands = useCommands();
  const [commandHistory, setCommandHistory] = useState<CommandRecord[]>([]);
  const [commandStats, setCommandStats] = useState<CommandStats[]>([]);

  // Load command history for this device
  const loadCommandHistory = useCallback(async () => {
    try {
      const history = await commands.getCommandHistory(deviceId);
      setCommandHistory(history);
    } catch (error) {
      console.error('Failed to load command history:', error);
    }
  }, [deviceId, commands]);

  // Load command stats for this device
  const loadCommandStats = useCallback(async () => {
    try {
      const stats = await commands.getCommandStats(deviceId);
      setCommandStats(stats);
    } catch (error) {
      console.error('Failed to load command stats:', error);
    }
  }, [deviceId, commands]);

  // Load data on mount
  useEffect(() => {
    if (deviceId) {
      loadCommandHistory();
      loadCommandStats();
    }
  }, [deviceId, loadCommandHistory, loadCommandStats]);

  return {
    ...commands,
    commandHistory,
    commandStats,
    loadCommandHistory,
    loadCommandStats
  };
}
