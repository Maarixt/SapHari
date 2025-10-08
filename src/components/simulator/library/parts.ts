import { SimComponent, PinDef } from '../types';
import { nanoid } from 'nanoid';

export const COLORS = ['red', 'green', 'blue', 'yellow', 'orange', 'purple', 'black', 'white'];

export function makeLED(color = 'red', x = 450, y = 120): SimComponent {
  const pins: PinDef[] = [
    { id: 'anode', label: '+ (A)', kind: 'digital', x: 30, y: 0 },
    { id: 'cathode', label: '- (K)', kind: 'ground', x: -30, y: 0 },
  ];
  return { id: 'led-' + nanoid(6), type: 'led', x, y, pins, props: { color } };
}

export function makeResistor(ohms = 220, x = 380, y = 120): SimComponent {
  const pins: PinDef[] = [
    { id: 'a', label: 'A', kind: 'digital', x: -30, y: 0 },
    { id: 'b', label: 'B', kind: 'digital', x: 30, y: 0 },
  ];
  return { id: 'r-' + nanoid(6), type: 'resistor', x, y, pins, props: { ohms } };
}

export function makeButton(x = 380, y = 200): SimComponent {
  const pins: PinDef[] = [
    { id: 'a', label: 'A', kind: 'digital', x: -30, y: 0 },
    { id: 'b', label: 'B', kind: 'digital', x: 30, y: 0 },
  ];
  return { id: 'btn-' + nanoid(6), type: 'button', x, y, pins, props: { pressed: false } };
}

export function makeBuzzer(x = 520, y = 120): SimComponent {
  const pins: PinDef[] = [
    { id: '+', label: '+ V', kind: 'digital', x: 30, y: 0 },
    { id: '-', label: 'GND', kind: 'ground', x: -30, y: 0 },
  ];
  return { id: 'buzz-' + nanoid(6), type: 'buzzer', x, y, pins, props: { active: false } };
}

export function makePotentiometer(x = 380, y = 280): SimComponent {
  const pins: PinDef[] = [
    { id: 'vcc', label: 'VCC', kind: 'power', x: -30, y: 0 },
    { id: 'signal', label: 'SIG', kind: 'analog', x: 0, y: 0 },
    { id: 'gnd', label: 'GND', kind: 'ground', x: 30, y: 0 },
  ];
  return { id: 'pot-' + nanoid(6), type: 'pot', x, y, pins, props: { value: 0.5, maxResistance: 10000 } };
}

export function makePIRSensor(x = 520, y = 200): SimComponent {
  const pins: PinDef[] = [
    { id: 'vcc', label: 'VCC', kind: 'power', x: -30, y: 0 },
    { id: 'signal', label: 'OUT', kind: 'digital', x: 0, y: 0 },
    { id: 'gnd', label: 'GND', kind: 'ground', x: 30, y: 0 },
  ];
  return { id: 'pir-' + nanoid(6), type: 'pir', x, y, pins, props: { motion: false, sensitivity: 0.5 } };
}

export function makeUltrasonicSensor(x = 520, y = 280): SimComponent {
  const pins: PinDef[] = [
    { id: 'vcc', label: 'VCC', kind: 'power', x: -30, y: 0 },
    { id: 'trig', label: 'TRIG', kind: 'digital', x: -10, y: 0 },
    { id: 'echo', label: 'ECHO', kind: 'digital', x: 10, y: 0 },
    { id: 'gnd', label: 'GND', kind: 'ground', x: 30, y: 0 },
  ];
  return { id: 'ultrasonic-' + nanoid(6), type: 'ultrasonic', x, y, pins, props: { distance: 0, range: 400 } };
}

export function makeTemperatureSensor(x = 380, y = 360): SimComponent {
  const pins: PinDef[] = [
    { id: 'vcc', label: 'VCC', kind: 'power', x: -30, y: 0 },
    { id: 'data', label: 'DATA', kind: 'onewire', x: 0, y: 0 },
    { id: 'gnd', label: 'GND', kind: 'ground', x: 30, y: 0 },
  ];
  return { id: 'temp-' + nanoid(6), type: 'ds18b20', x, y, pins, props: { temperature: 20, unit: 'celsius' } };
}

export function makeServoMotor(x = 520, y = 360): SimComponent {
  const pins: PinDef[] = [
    { id: 'vcc', label: 'VCC', kind: 'power', x: -30, y: 0 },
    { id: 'signal', label: 'SIG', kind: 'pwm', x: 0, y: 0 },
    { id: 'gnd', label: 'GND', kind: 'ground', x: 30, y: 0 },
  ];
  return { id: 'servo-' + nanoid(6), type: 'servo', x, y, pins, props: { angle: 90, range: 180 } };
}

export function makePowerRail(voltage = 3.3, x = 300, y = 100): SimComponent {
  const pins: PinDef[] = [
    { id: 'vcc', label: `${voltage}V`, kind: 'power', x: 0, y: 0 },
  ];
  return { id: 'power-' + nanoid(6), type: 'power', x, y, pins, props: { voltage } };
}

export function makeGroundRail(x = 300, y = 140): SimComponent {
  const pins: PinDef[] = [
    { id: 'gnd', label: 'GND', kind: 'ground', x: 0, y: 0 },
  ];
  return { id: 'ground-' + nanoid(6), type: 'ground', x, y, pins, props: { reference: 0 } };
}
