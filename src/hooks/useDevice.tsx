// Device Hook - Provides device state and control for UI components
import { useState, useEffect, useCallback } from 'react';
import { useMQTT } from './useMQTT';
import { DeviceMQTTService } from '@/services/deviceMQTT';
import { DeviceState, DevicePresence } from '@/lib/mqttTopics';
import { useToast } from './use-toast';

export const useDevice = (deviceId: string) => {
  const { publishMessage, subscribeToTopic, onMessage, connected } = useMQTT();
  const { toast } = useToast();
  
  const [deviceState, setDeviceState] = useState<DeviceState | undefined>();
  const [devicePresence, setDevicePresence] = useState<DevicePresence | undefined>();
  const [isOnline, setIsOnline] = useState(false);
  const [pendingCommands, setPendingCommands] = useState<Set<string>>(new Set());
  const [deviceMQTT, setDeviceMQTT] = useState<DeviceMQTTService | null>(null);

  // Initialize device MQTT service
  useEffect(() => {
    if (connected && publishMessage && subscribeToTopic && onMessage) {
      const service = new DeviceMQTTService(publishMessage, subscribeToTopic, onMessage);
      setDeviceMQTT(service);
    }
  }, [connected, publishMessage, subscribeToTopic, onMessage]);

  // Subscribe to device state changes
  useEffect(() => {
    if (!deviceMQTT) return;

    const unsubscribeState = deviceMQTT.subscribeToDeviceState((id, state) => {
      if (id === deviceId) {
        setDeviceState(state);
      }
    });

    const unsubscribePresence = deviceMQTT.subscribeToDevicePresence((id, presence) => {
      if (id === deviceId) {
        setDevicePresence(presence);
        setIsOnline(presence.status === 'online');
      }
    });

    return () => {
      unsubscribeState();
      unsubscribePresence();
    };
  }, [deviceMQTT, deviceId]);

  // Control GPIO pin
  const controlGpio = useCallback(async (pin: number, value: 0 | 1) => {
    if (!deviceMQTT || !isOnline) {
      toast({
        title: "Device Offline",
        description: "Cannot control device while offline",
        variant: "destructive"
      });
      return false;
    }

    const reqId = `gpio_${pin}_${value}_${Date.now()}`;
    setPendingCommands(prev => new Set([...prev, reqId]));

    try {
      const success = await deviceMQTT.sendGpioCommand(deviceId, pin, value);
      
      if (success) {
        toast({
          title: "Command Sent",
          description: `GPIO ${pin} set to ${value ? 'HIGH' : 'LOW'}`,
        });
      } else {
        toast({
          title: "Command Failed",
          description: "Device did not acknowledge the command",
          variant: "destructive"
        });
      }
      
      return success;
    } catch (error) {
      console.error('Error controlling GPIO:', error);
      toast({
        title: "Command Error",
        description: "Failed to send command to device",
        variant: "destructive"
      });
      return false;
    } finally {
      setPendingCommands(prev => {
        const newSet = new Set(prev);
        newSet.delete(reqId);
        return newSet;
      });
    }
  }, [deviceMQTT, deviceId, isOnline, toast]);

  // Control servo
  const controlServo = useCallback(async (pin: number, value: number) => {
    if (!deviceMQTT || !isOnline) {
      toast({
        title: "Device Offline",
        description: "Cannot control device while offline",
        variant: "destructive"
      });
      return false;
    }

    const reqId = `servo_${pin}_${value}_${Date.now()}`;
    setPendingCommands(prev => new Set([...prev, reqId]));

    try {
      const success = await deviceMQTT.sendServoCommand(deviceId, pin, value);
      
      if (success) {
        toast({
          title: "Command Sent",
          description: `Servo ${pin} set to ${value}°`,
        });
      } else {
        toast({
          title: "Command Failed",
          description: "Device did not acknowledge the command",
          variant: "destructive"
        });
      }
      
      return success;
    } catch (error) {
      console.error('Error controlling servo:', error);
      toast({
        title: "Command Error",
        description: "Failed to send command to device",
        variant: "destructive"
      });
      return false;
    } finally {
      setPendingCommands(prev => {
        const newSet = new Set(prev);
        newSet.delete(reqId);
        return newSet;
      });
    }
  }, [deviceMQTT, deviceId, isOnline, toast]);

  // Control gauge
  const controlGauge = useCallback(async (gaugeKey: string, value: number) => {
    if (!deviceMQTT || !isOnline) {
      toast({
        title: "Device Offline",
        description: "Cannot control device while offline",
        variant: "destructive"
      });
      return false;
    }

    const reqId = `gauge_${gaugeKey}_${value}_${Date.now()}`;
    setPendingCommands(prev => new Set([...prev, reqId]));

    try {
      const success = await deviceMQTT.sendGaugeCommand(deviceId, gaugeKey, value);
      
      if (success) {
        toast({
          title: "Command Sent",
          description: `Gauge ${gaugeKey} set to ${value}`,
        });
      } else {
        toast({
          title: "Command Failed",
          description: "Device did not acknowledge the command",
          variant: "destructive"
        });
      }
      
      return success;
    } catch (error) {
      console.error('Error controlling gauge:', error);
      toast({
        title: "Command Error",
        description: "Failed to send command to device",
        variant: "destructive"
      });
      return false;
    } finally {
      setPendingCommands(prev => {
        const newSet = new Set(prev);
        newSet.delete(reqId);
        return newSet;
      });
    }
  }, [deviceMQTT, deviceId, isOnline, toast]);

  // Get GPIO state
  const getGpioState = useCallback((pin: number): 0 | 1 | undefined => {
    return deviceMQTT?.getDeviceGpioState(deviceId, pin);
  }, [deviceMQTT, deviceId]);

  // Get sensor value
  const getSensorValue = useCallback((sensorKey: string): number | string | undefined => {
    return deviceMQTT?.getDeviceSensorValue(deviceId, sensorKey);
  }, [deviceMQTT, deviceId]);

  // Get gauge value
  const getGaugeValue = useCallback((gaugeKey: string): number | undefined => {
    return deviceMQTT?.getDeviceGaugeValue(deviceId, gaugeKey);
  }, [deviceMQTT, deviceId]);

  // Get servo value
  const getServoValue = useCallback((servoKey: string): number | undefined => {
    return deviceMQTT?.getDeviceServoValue(deviceId, servoKey);
  }, [deviceMQTT, deviceId]);

  // Check if command is pending
  const isCommandPending = useCallback((commandType: string, pin?: number, value?: number | string): boolean => {
    const reqId = `${commandType}_${pin || ''}_${value || ''}_`;
    return Array.from(pendingCommands).some(cmd => cmd.startsWith(reqId));
  }, [pendingCommands]);

  return {
    // State
    deviceState,
    devicePresence,
    isOnline,
    isConnected: connected,
    
    // Control methods
    controlGpio,
    controlServo,
    controlGauge,
    
    // Getter methods
    getGpioState,
    getSensorValue,
    getGaugeValue,
    getServoValue,
    
    // Utility methods
    isCommandPending,
    hasPendingCommands: pendingCommands.size > 0,
  };
};
