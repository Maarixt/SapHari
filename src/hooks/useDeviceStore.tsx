import { useState, useEffect } from 'react';
import { DeviceStore, DeviceSnapshot } from '@/state/deviceStore';
import { CommandTracker } from '@/state/commandTracker';

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

  useEffect(() => {
    const unsubscribe = DeviceStore.subscribe(() => {
      setDevice(DeviceStore.get(deviceId));
    });
    return unsubscribe;
  }, [deviceId]);

  const isOnline = device?.online ?? false;

  const controlGpio = (pin: number, value: 0 | 1) => {
    const commandId = crypto.randomUUID();
    CommandTracker.addCommand(commandId, deviceId, 'gpio', { pin, value });
    // In a real implementation, this would publish to MQTT
    console.log(`GPIO control: ${deviceId} pin ${pin} = ${value}`);
  };

  const controlServo = (pin: number, angle: number) => {
    const commandId = crypto.randomUUID();
    CommandTracker.addCommand(commandId, deviceId, 'servo', { pin, angle });
    console.log(`Servo control: ${deviceId} pin ${pin} = ${angle}°`);
  };

  const controlGauge = (pin: number, value: number) => {
    const commandId = crypto.randomUUID();
    CommandTracker.addCommand(commandId, deviceId, 'gauge', { pin, value });
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