import { SimComponent, PinDef } from '../types';
import { nanoid } from 'nanoid';

export function makeESP32(x = 200, y = 100): SimComponent {
  const leftPins: PinDef[] = [
    { id: '3v3', label: '3V3', kind: 'power', x: 0, y: 20 },
    { id: 'gnd1', label: 'GND', kind: 'ground', x: 0, y: 40 },
    { id: 'gpio2', label: 'GPIO2', kind: 'digital', gpio: 2, x: 0, y: 60 },
    { id: 'gpio4', label: 'GPIO4', kind: 'digital', gpio: 4, x: 0, y: 80 },
    { id: 'gpio5', label: 'GPIO5', kind: 'digital', gpio: 5, x: 0, y: 100 },
    { id: 'gpio12', label: 'GPIO12', kind: 'analog', gpio: 12, x: 0, y: 120 },
    { id: 'gpio13', label: 'GPIO13', kind: 'pwm', gpio: 13, x: 0, y: 140 },
    { id: 'gpio14', label: 'GPIO14', kind: 'pwm', gpio: 14, x: 0, y: 160 },
    { id: 'gpio15', label: 'GPIO15', kind: 'digital', gpio: 15, x: 0, y: 180 },
  ];

  const rightPins: PinDef[] = [
    { id: 'vin', label: 'VIN', kind: 'power', x: 140, y: 20 },
    { id: 'gnd2', label: 'GND', kind: 'ground', x: 140, y: 40 },
    { id: 'gpio16', label: 'GPIO16', kind: 'digital', gpio: 16, x: 140, y: 60 },
    { id: 'gpio17', label: 'GPIO17', kind: 'digital', gpio: 17, x: 140, y: 80 },
    { id: 'gpio18', label: 'GPIO18', kind: 'pwm', gpio: 18, x: 140, y: 100 },
    { id: 'gpio19', label: 'GPIO19', kind: 'pwm', gpio: 19, x: 140, y: 120 },
    { id: 'gpio21', label: 'GPIO21', kind: 'digital', gpio: 21, x: 140, y: 140 },
    { id: 'gpio22', label: 'GPIO22', kind: 'digital', gpio: 22, x: 140, y: 160 },
    { id: 'gpio23', label: 'GPIO23', kind: 'digital', gpio: 23, x: 140, y: 180 },
  ];

  return {
    id: 'esp32-' + nanoid(6),
    type: 'esp32',
    x,
    y,
    pins: [...leftPins, ...rightPins],
    props: { name: 'ESP32 DevKit' },
  };
}
