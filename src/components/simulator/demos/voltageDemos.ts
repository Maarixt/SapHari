/**
 * Demo circuits for voltage variation: LED brightness, motor speed, RC + LED fade.
 * Each returns { components, wires } for setCircuit().
 */

import { nanoid } from 'nanoid';
import type { SimComponent, Wire } from '../types';

const WIRE_COLOR = '#94a3b8';

function makeLedBrightnessDemo(): { components: SimComponent[]; wires: Wire[] } {
  const vs = nanoid(6);
  const r1 = nanoid(6);
  const led1 = nanoid(6);
  const gnd1 = nanoid(6);
  const components: SimComponent[] = [
    {
      id: vs,
      type: 'dc_supply',
      name: 'Vs',
      x: 80,
      y: 200,
      pins: [
        { id: 'pos', label: '+', kind: 'power', role: 'VCC', x: 10, y: 25 },
        { id: 'neg', label: '−', kind: 'ground', role: 'GND', x: 80, y: 25 },
      ],
      props: { voltage: 5, rInternal: 50, vMax: 12 },
    },
    {
      id: r1,
      type: 'resistor',
      name: 'R',
      x: 240,
      y: 200,
      pins: [
        { id: 'a', label: 'A', kind: 'digital', role: 'A', x: 10, y: 25 },
        { id: 'b', label: 'B', kind: 'digital', role: 'B', x: 80, y: 25 },
      ],
      props: { resistanceOhms: 330, ohms: 330 },
    },
    {
      id: led1,
      type: 'led',
      name: 'LED',
      x: 400,
      y: 200,
      pins: [
        { id: 'anode', label: '+', kind: 'digital', role: 'Anode', x: 0, y: 0 },
        { id: 'cathode', label: '-', kind: 'digital', role: 'Cathode', x: 10, y: 0 },
      ],
      props: { color: 'red' },
    },
    {
      id: gnd1,
      type: 'ground',
      name: 'GND',
      x: 560,
      y: 200,
      pins: [{ id: 'gnd', label: 'GND', kind: 'ground', role: 'GND', x: 20, y: 0 }],
      props: {},
    },
  ];
  const wires: Wire[] = [
    { id: nanoid(8), from: { componentId: vs, pinId: 'pos' }, to: { componentId: r1, pinId: 'a' }, color: WIRE_COLOR },
    { id: nanoid(8), from: { componentId: r1, pinId: 'b' }, to: { componentId: led1, pinId: 'anode' }, color: WIRE_COLOR },
    { id: nanoid(8), from: { componentId: led1, pinId: 'cathode' }, to: { componentId: gnd1, pinId: 'gnd' }, color: WIRE_COLOR },
    { id: nanoid(8), from: { componentId: vs, pinId: 'neg' }, to: { componentId: gnd1, pinId: 'gnd' }, color: WIRE_COLOR },
  ];
  return { components, wires };
}

function makeMotorSpeedDemo(): { components: SimComponent[]; wires: Wire[] } {
  const vs = nanoid(6);
  const motor1 = nanoid(6);
  const gnd1 = nanoid(6);
  const components: SimComponent[] = [
    {
      id: vs,
      type: 'dc_supply',
      name: 'Vs',
      x: 120,
      y: 200,
      pins: [
        { id: 'pos', label: '+', kind: 'power', role: 'VCC', x: 10, y: 25 },
        { id: 'neg', label: '−', kind: 'ground', role: 'GND', x: 80, y: 25 },
      ],
      props: { voltage: 5, rInternal: 50, vMax: 12 },
    },
    {
      id: motor1,
      type: 'motor_dc',
      name: 'Motor',
      x: 320,
      y: 200,
      pins: [
        { id: 'P', label: 'M+', kind: 'digital', role: 'VCC', x: 0, y: 35 },
        { id: 'N', label: 'M−', kind: 'digital', role: 'GND', x: 80, y: 35 },
      ],
      props: { rOhms: 10, iNom: 0.2, iMinSpin: 0.01, speed: 0, spinning: false },
    },
    {
      id: gnd1,
      type: 'ground',
      name: 'GND',
      x: 520,
      y: 200,
      pins: [{ id: 'gnd', label: 'GND', kind: 'ground', role: 'GND', x: 20, y: 0 }],
      props: {},
    },
  ];
  const wires: Wire[] = [
    { id: nanoid(8), from: { componentId: vs, pinId: 'pos' }, to: { componentId: motor1, pinId: 'P' }, color: WIRE_COLOR },
    { id: nanoid(8), from: { componentId: motor1, pinId: 'N' }, to: { componentId: gnd1, pinId: 'gnd' }, color: WIRE_COLOR },
    { id: nanoid(8), from: { componentId: vs, pinId: 'neg' }, to: { componentId: gnd1, pinId: 'gnd' }, color: WIRE_COLOR },
  ];
  return { components, wires };
}

function makeRCLedFadeDemo(): { components: SimComponent[]; wires: Wire[] } {
  const vs = nanoid(6);
  const rCharge = nanoid(6);
  const cap = nanoid(6);
  const gnd1 = nanoid(6);
  const sw = nanoid(6);
  const rDischarge = nanoid(6);
  const led1 = nanoid(6);
  const components: SimComponent[] = [
    {
      id: vs,
      type: 'dc_supply',
      name: 'Vs',
      x: 80,
      y: 180,
      pins: [
        { id: 'pos', label: '+', kind: 'power', role: 'VCC', x: 10, y: 25 },
        { id: 'neg', label: '−', kind: 'ground', role: 'GND', x: 80, y: 25 },
      ],
      props: { voltage: 5, rInternal: 50, vMax: 12 },
    },
    {
      id: rCharge,
      type: 'resistor',
      name: 'R charge',
      x: 220,
      y: 180,
      pins: [
        { id: 'a', label: 'A', kind: 'digital', role: 'A', x: 10, y: 25 },
        { id: 'b', label: 'B', kind: 'digital', role: 'B', x: 80, y: 25 },
      ],
      props: { resistanceOhms: 10000, ohms: 10000 },
    },
    {
      id: cap,
      type: 'capacitor',
      name: 'C',
      x: 360,
      y: 180,
      pins: [
        { id: 'a', label: 'A', kind: 'digital', role: 'A', x: 10, y: 25 },
        { id: 'b', label: 'B', kind: 'digital', role: 'B', x: 80, y: 25 },
      ],
      props: { capacitance: 0.0001, rLeak: 1e8 },
    },
    {
      id: gnd1,
      type: 'ground',
      name: 'GND',
      x: 500,
      y: 180,
      pins: [{ id: 'gnd', label: 'GND', kind: 'ground', role: 'GND', x: 20, y: 0 }],
      props: {},
    },
    {
      id: sw,
      type: 'switch',
      name: 'Discharge',
      x: 360,
      y: 320,
      variantId: 'SPST',
      pins: [
        { id: 'pin1', label: '1', kind: 'digital', role: 'A', x: 0, y: 0 },
        { id: 'pin2', label: '2', kind: 'digital', role: 'B', x: 10, y: 0 },
      ],
      props: { on: false },
    },
    {
      id: rDischarge,
      type: 'resistor',
      name: 'R discharge',
      x: 360,
      y: 400,
      pins: [
        { id: 'a', label: 'A', kind: 'digital', role: 'A', x: 10, y: 25 },
        { id: 'b', label: 'B', kind: 'digital', role: 'B', x: 80, y: 25 },
      ],
      props: { resistanceOhms: 330, ohms: 330 },
    },
    {
      id: led1,
      type: 'led',
      name: 'LED',
      x: 360,
      y: 480,
      pins: [
        { id: 'anode', label: '+', kind: 'digital', role: 'Anode', x: 0, y: 0 },
        { id: 'cathode', label: '-', kind: 'digital', role: 'Cathode', x: 10, y: 0 },
      ],
      props: { color: 'red' },
    },
  ];
  const wires: Wire[] = [
    { id: nanoid(8), from: { componentId: vs, pinId: 'pos' }, to: { componentId: rCharge, pinId: 'a' }, color: WIRE_COLOR },
    { id: nanoid(8), from: { componentId: rCharge, pinId: 'b' }, to: { componentId: cap, pinId: 'a' }, color: WIRE_COLOR },
    { id: nanoid(8), from: { componentId: cap, pinId: 'b' }, to: { componentId: gnd1, pinId: 'gnd' }, color: WIRE_COLOR },
    { id: nanoid(8), from: { componentId: vs, pinId: 'neg' }, to: { componentId: gnd1, pinId: 'gnd' }, color: WIRE_COLOR },
    { id: nanoid(8), from: { componentId: cap, pinId: 'a' }, to: { componentId: sw, pinId: 'pin1' }, color: WIRE_COLOR },
    { id: nanoid(8), from: { componentId: sw, pinId: 'pin2' }, to: { componentId: rDischarge, pinId: 'a' }, color: WIRE_COLOR },
    { id: nanoid(8), from: { componentId: rDischarge, pinId: 'b' }, to: { componentId: led1, pinId: 'anode' }, color: WIRE_COLOR },
    { id: nanoid(8), from: { componentId: led1, pinId: 'cathode' }, to: { componentId: gnd1, pinId: 'gnd' }, color: WIRE_COLOR },
  ];
  return { components, wires };
}

function makeRgbLedDemo(): { components: SimComponent[]; wires: Wire[] } {
  const vs = nanoid(6);
  const rr = nanoid(6);
  const rg = nanoid(6);
  const rb = nanoid(6);
  const rgb1 = nanoid(6);
  const gnd1 = nanoid(6);
  const components: SimComponent[] = [
    {
      id: vs,
      type: 'dc_supply',
      name: 'Vs',
      x: 80,
      y: 200,
      pins: [
        { id: 'pos', label: '+', kind: 'power', role: 'VCC', x: 10, y: 25 },
        { id: 'neg', label: '−', kind: 'ground', role: 'GND', x: 80, y: 25 },
      ],
      props: { voltage: 5, rInternal: 50, vMax: 12 },
    },
    {
      id: rr,
      type: 'resistor',
      name: 'Rr',
      x: 200,
      y: 120,
      pins: [
        { id: 'a', label: 'A', kind: 'digital', role: 'A', x: 10, y: 25 },
        { id: 'b', label: 'B', kind: 'digital', role: 'B', x: 80, y: 25 },
      ],
      props: { resistanceOhms: 330, ohms: 330 },
    },
    {
      id: rg,
      type: 'resistor',
      name: 'Rg',
      x: 200,
      y: 200,
      pins: [
        { id: 'a', label: 'A', kind: 'digital', role: 'A', x: 10, y: 25 },
        { id: 'b', label: 'B', kind: 'digital', role: 'B', x: 80, y: 25 },
      ],
      props: { resistanceOhms: 330, ohms: 330 },
    },
    {
      id: rb,
      type: 'resistor',
      name: 'Rb',
      x: 200,
      y: 280,
      pins: [
        { id: 'a', label: 'A', kind: 'digital', role: 'A', x: 10, y: 25 },
        { id: 'b', label: 'B', kind: 'digital', role: 'B', x: 80, y: 25 },
      ],
      props: { resistanceOhms: 330, ohms: 330 },
    },
    {
      id: rgb1,
      type: 'rgb_led',
      name: 'RGB',
      x: 400,
      y: 200,
      pins: [
        { id: 'R', label: 'R', kind: 'digital', role: 'A', x: 10, y: 15 },
        { id: 'G', label: 'G', kind: 'digital', role: 'A', x: 30, y: 15 },
        { id: 'B', label: 'B', kind: 'digital', role: 'A', x: 50, y: 15 },
        { id: 'COM', label: '−', kind: 'digital', role: 'Cathode', x: 30, y: 35 },
      ],
      props: { variantId: 'CC', vfR: 2, vfG: 3, vfB: 3, rdynR: 20, rdynG: 20, rdynB: 20, iref: 0.02 },
    },
    {
      id: gnd1,
      type: 'ground',
      name: 'GND',
      x: 560,
      y: 200,
      pins: [{ id: 'gnd', label: 'GND', kind: 'ground', role: 'GND', x: 20, y: 0 }],
      props: {},
    },
  ];
  const wires: Wire[] = [
    { id: nanoid(8), from: { componentId: vs, pinId: 'pos' }, to: { componentId: rr, pinId: 'a' }, color: WIRE_COLOR },
    { id: nanoid(8), from: { componentId: rr, pinId: 'b' }, to: { componentId: rgb1, pinId: 'R' }, color: WIRE_COLOR },
    { id: nanoid(8), from: { componentId: vs, pinId: 'pos' }, to: { componentId: rg, pinId: 'a' }, color: WIRE_COLOR },
    { id: nanoid(8), from: { componentId: rg, pinId: 'b' }, to: { componentId: rgb1, pinId: 'G' }, color: WIRE_COLOR },
    { id: nanoid(8), from: { componentId: vs, pinId: 'pos' }, to: { componentId: rb, pinId: 'a' }, color: WIRE_COLOR },
    { id: nanoid(8), from: { componentId: rb, pinId: 'b' }, to: { componentId: rgb1, pinId: 'B' }, color: WIRE_COLOR },
    { id: nanoid(8), from: { componentId: rgb1, pinId: 'COM' }, to: { componentId: gnd1, pinId: 'gnd' }, color: WIRE_COLOR },
    { id: nanoid(8), from: { componentId: vs, pinId: 'neg' }, to: { componentId: gnd1, pinId: 'gnd' }, color: WIRE_COLOR },
  ];
  return { components, wires };
}

export function createLedBrightnessDemo(): { components: SimComponent[]; wires: Wire[] } {
  return makeLedBrightnessDemo();
}

export function createMotorSpeedDemo(): { components: SimComponent[]; wires: Wire[] } {
  return makeMotorSpeedDemo();
}

export function createRCLedFadeDemo(): { components: SimComponent[]; wires: Wire[] } {
  return makeRCLedFadeDemo();
}

export function createRgbLedDemo(): { components: SimComponent[]; wires: Wire[] } {
  return makeRgbLedDemo();
}
