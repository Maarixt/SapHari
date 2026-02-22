import { useState, useEffect } from 'react';
import { DeviceStore, DeviceSnapshot } from '@/state/deviceStore';
import { CommandTracker } from '@/state/commandTracker';
import { useMQTT } from '@/hooks/useMQTT';

export function useDevice(deviceId: string) {
  const [device, setDevice] = useState<DeviceSnapshot | undefined>(DeviceStore.get(deviceId));

  useEffect(() => {
    const unsubscribe = DeviceStore.subscribe(() => {
      setDevice(DeviceStore.get(deviceId));
    });
    return unsubscribe;
  }, [deviceId]);

  return device;
}

export function useAllDevices() {
  const [devices, setDevices] = useState<Record<string, DeviceSnapshot>>(DeviceStore.all());

  useEffect(() => {
    const unsubscribe = DeviceStore.subscribe(() => {
      setDevices(DeviceStore.all());
    });
    return unsubscribe;
  }, []);

  return devices;
}

export function useDeviceStore(deviceId: string) {
  const [device, setDevice] = useState<DeviceSnapshot | undefined>(DeviceStore.get(deviceId));
  const { publishMessage } = useMQTT();

  useEffect(() => {
    const unsubscribe = DeviceStore.subscribe(() => {
      setDevice(DeviceStore.get(deviceId));
    });
    return unsubscribe;
  }, [deviceId]);

  const isOnline = device?.online ?? false;

  const controlGpio = async (pin: number, value: 0 | 1) => {
    try {
      await CommandTracker.toggleGpio(publishMessage, deviceId, pin, value);
      console.log(`GPIO control: ${deviceId} pin ${pin} = ${value}`);
    } catch (error) {
      console.error('Failed to control GPIO:', error);
      throw error;
    }
  };

  const controlServo = (pin: number, angle: number) => {
    console.log(`Servo control: ${deviceId} pin ${pin} = ${angle}°`);
  };

  const controlGauge = (pin: number, value: number) => {
    console.log(`Gauge control: ${deviceId} pin ${pin} = ${value}`);
  };

  const getGpioState = (pin: number): 0 | 1 | undefined => {
    return device?.gpio?.[pin];
  };

  const getSensorValue = (key: string): any => {
    return device?.sensors?.[key];
  };

  return {
    device,
    isOnline,
    controlGpio,
    controlServo,
    controlGauge,
    getGpioState,
    getSensorValue
  };
}