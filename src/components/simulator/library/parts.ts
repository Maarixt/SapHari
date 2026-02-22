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

export function makeDiode(x = 380, y = 160): SimComponent {
  const pins: PinDef[] = [
    { id: 'A', label: 'A', kind: 'digital', x: -30, y: 0 },
    { id: 'K', label: 'K', kind: 'digital', x: 30, y: 0 },
  ];
  return {
    id: 'd-' + nanoid(6),
    type: 'diode',
    x,
    y,
    pins,
    props: { vf: 0.7, rOn: 1, vbr: 50, rbr: 10 },
  };
}

export function makeInductor(inductanceH = 0.001, x = 380, y = 200): SimComponent {
  const pins: PinDef[] = [
    { id: 'a', label: 'A', kind: 'digital', role: 'A', x: -30, y: 0 },
    { id: 'b', label: 'B', kind: 'digital', role: 'B', x: 30, y: 0 },
  ];
  return {
    id: 'L-' + nanoid(6),
    type: 'inductor',
    x,
    y,
    pins,
    props: { inductance: inductanceH },
  };
}

export type ResistorMode = 'series' | 'pullup' | 'pulldown';

export function makeResistor(
  ohms = 220,
  x = 380,
  y = 120,
  mode: ResistorMode = 'series'
): SimComponent {
  const pins: PinDef[] = [
    { id: 'a', label: 'A', kind: 'digital', x: -30, y: 0 },
    { id: 'b', label: 'B', kind: 'digital', x: 30, y: 0 },
  ];
  const valueOhms = mode === 'pullup' || mode === 'pulldown' ? 10000 : ohms;
  return {
    id: 'r-' + nanoid(6),
    type: 'resistor',
    x,
    y,
    pins,
    props: { ohms: valueOhms, mode },
  };
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
    { id: 'P', label: '+', kind: 'digital', x: 18, y: 45 },
    { id: 'N', label: '−', kind: 'ground', x: 42, y: 45 },
  ];
  return {
    id: 'buzz-' + nanoid(6),
    type: 'buzzer',
    x,
    y,
    pins,
    props: {
      active: false,
      mode: 'active',
      volume: 0.5,
      frequency: 2000,
      vMin: 2,
      rOn: 167,
      iMin: 0.001,
    },
  };
}

/** Legacy 3-pin pot (ADC-style); use makePotentiometerDC for divider/rheostat. */
export function makePotentiometer(x = 380, y = 280): SimComponent {
  const pins: PinDef[] = [
    { id: 'vcc', label: 'VCC', kind: 'power', x: -30, y: 0 },
    { id: 'signal', label: 'SIG', kind: 'analog', x: 0, y: 0 },
    { id: 'gnd', label: 'GND', kind: 'ground', x: 30, y: 0 },
  ];
  return { id: 'pot-' + nanoid(6), type: 'pot', x, y, pins, props: { value: 0.5, maxResistance: 10000 } };
}

/** 3-terminal DC potentiometer: IN (CW), OUT (wiper), GND (CCW). R_top + R_bot = rTotalOhms, alpha in [0,1]. */
export function makePotentiometerDC(
  x = 380,
  y = 280,
  rTotalOhms = 10000,
  alpha = 0.5
): SimComponent {
  const pins: PinDef[] = [
    { id: 'IN', label: 'IN', kind: 'power', role: 'IN', x: -30, y: 0 },
    { id: 'OUT', label: 'OUT', kind: 'analog', role: 'OUT', x: 0, y: 0 },
    { id: 'GND', label: 'GND', kind: 'ground', role: 'GND', x: 30, y: 0 },
  ];
  return {
    id: 'pot-' + nanoid(6),
    type: 'potentiometer',
    x,
    y,
    pins,
    props: { rTotalOhms, alpha, taper: 'linear', wiperOhms: 0 },
  };
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

export type PowerRailKind = '3v3' | 'vin' | 'gnd';

const POWER_RAIL_LABELS: Record<PowerRailKind, string> = { '3v3': '3V3', vin: 'VIN', gnd: 'GND' };

export function makePowerRailByKind(kind: PowerRailKind, x = 300, y = 100): SimComponent {
  const label = POWER_RAIL_LABELS[kind];
  const pins: PinDef[] = [
    { id: 'out', label, kind: kind === 'gnd' ? 'ground' : 'power', x: 0, y: 0 },
  ];
  return {
    id: 'rail-' + nanoid(6),
    type: 'power_rail',
    x,
    y,
    pins,
    props: { kind },
  };
}
