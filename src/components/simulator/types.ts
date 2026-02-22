export type PinKind = 'power' | 'ground' | 'digital' | 'analog' | 'pwm' | 'onewire' | 'serial' | 'i2c' | 'spi' | 'uart';

/** Explicit terminal role for connectivity model and hints (VCC, GND, OUT, WIPER, etc.). */
export type PinRole = 'VCC' | 'GND' | 'OUT' | 'SIGNAL' | 'TRIG' | 'ECHO' | 'DQ' | 'WIPER' | 'Anode' | 'Cathode' | 'A' | 'B' | 'C' | 'E' | 'IN' | 'PWM' | 'V+' | 'V-';

export interface PinDef {
  id: string;           // within component
  label: string;        // printed label (e.g., "GPIO2", "3V3")
  kind: PinKind;
  role?: PinRole;       // explicit terminal semantics for connectivity and hints
  gpio?: number;        // ESP32 GPIO number if applicable
  x: number; y: number; // relative position for rendering
}

/** Rotation in degrees: 0, 90, 180, 270. Applied with anchor at center. */
export type RotationDeg = 0 | 90 | 180 | 270;

export interface SimComponent {
  id: string;
  type: 'esp32' | 'led' | 'resistor' | 'button' | 'switch' | 'buzzer' | 'pot' | 'pir' | 'ultrasonic' | 'ds18b20' | 'servo' | 'power' | 'ground' | 'power_rail' | 'wire' | 'potentiometer' | 'junction' | 'dc_supply' | 'motor_dc' | 'motor_ac' | 'voltmeter' | 'transistor' | 'push_button' | 'push_button_momentary' | 'push_button_latch' | 'capacitor' | 'capacitor_polarized' | 'rgb_led' | 'diode' | 'inductor';
  x: number; y: number;
  /** Rotation in degrees (0, 90, 180, 270). Default 0. */
  rotation?: RotationDeg | number;
  props?: Record<string, any>; // e.g., { color: 'red', ohms: 220, voltage: 5, on: false }
  pins: PinDef[];
  selected?: boolean; // selection state for deletion
  name?: string; // optional display name
  /** Component variant (e.g. switch: 'SPST' | 'SPDT' | 'DPST' | 'DPDT'). Affects pins and renderer. */
  variantId?: string;
  /** Horizontal mirror (flip) so pin positions and symbol flip; wires stay attached. */
  flipX?: boolean;
  /** Vertical mirror. */
  flipY?: boolean;
}

export interface WireEnd { 
  componentId: string; 
  pinId: string; 
}

export interface Wire {
  id: string;
  from: WireEnd; 
  to: WireEnd;
  color: string;                    // user-chosen (multi-colored wires)
  points?: number[];                 // optional path points (current view fallback)
  pointsWorkbench?: number[];       // workbench view polyline
  pointsSchematic?: number[];       // schematic view polyline
  selected?: boolean;               // selection state for deletion
}

export interface SimState {
  components: SimComponent[];
  wires: Wire[];
  running: boolean;
  selectedId?: string;
}

// Component definitions with their pin configurations
export const COMPONENT_DEFINITIONS: Record<string, Omit<SimComponent, 'id' | 'x' | 'y'>> = {
  esp32: {
    type: 'esp32',
    rotation: 0,
    props: {},
    pins: [
      { id: '3v3', label: '3V3', kind: 'power', role: 'VCC', x: 0, y: 0 },
      { id: 'gnd', label: 'GND', kind: 'ground', role: 'GND', x: 0, y: 10 },
      { id: 'gpio2', label: 'GPIO2', kind: 'digital', gpio: 2, x: 20, y: 0 },
      { id: 'gpio4', label: 'GPIO4', kind: 'digital', gpio: 4, x: 20, y: 10 },
      { id: 'gpio5', label: 'GPIO5', kind: 'digital', gpio: 5, x: 40, y: 0 },
      { id: 'gpio18', label: 'GPIO18', kind: 'digital', gpio: 18, x: 40, y: 10 },
      { id: 'gpio19', label: 'GPIO19', kind: 'digital', gpio: 19, x: 60, y: 0 },
      { id: 'gpio21', label: 'GPIO21', kind: 'digital', gpio: 21, x: 60, y: 10 },
      { id: 'gpio22', label: 'GPIO22', kind: 'digital', gpio: 22, x: 80, y: 0 },
      { id: 'gpio23', label: 'GPIO23', kind: 'digital', gpio: 23, x: 80, y: 10 },
    ]
  },
  led: {
    type: 'led',
    rotation: 0,
    props: { color: 'red' },
    pins: [
      { id: 'anode', label: '+', kind: 'digital', role: 'Anode', x: 0, y: 0 },
      { id: 'cathode', label: '-', kind: 'digital', role: 'Cathode', x: 10, y: 0 }
    ]
  },
  resistor: {
    type: 'resistor',
    rotation: 0,
    props: { ohms: 220, mode: 'series' as 'series' | 'pullup' | 'pulldown' },
    pins: [
      { id: 'a', label: 'A', kind: 'digital', role: 'A', x: 10, y: 25 },
      { id: 'b', label: 'B', kind: 'digital', role: 'B', x: 80, y: 25 }
    ]
  },
  diode: {
    type: 'diode',
    rotation: 0,
    props: { vf: 0.7, rOn: 1, vbr: 50, rbr: 10 },
    pins: [
      { id: 'A', label: 'A', kind: 'digital', role: 'Anode', x: 0, y: 0 },
      { id: 'K', label: 'K', kind: 'digital', role: 'Cathode', x: 20, y: 0 }
    ]
  },
  inductor: {
    type: 'inductor',
    rotation: 0,
    props: { inductance: 0.001 },
    pins: [
      { id: 'a', label: 'A', kind: 'digital', role: 'A', x: 10, y: 25 },
      { id: 'b', label: 'B', kind: 'digital', role: 'B', x: 80, y: 25 }
    ]
  },
  button: {
    type: 'button',
    rotation: 0,
    props: { bounceMs: 10, contactResistance: 0.08, orientation: 0 },
    pins: [
      { id: 'A1', label: 'A1', kind: 'digital', role: 'A', x: 0, y: 0 },
      { id: 'A2', label: 'A2', kind: 'digital', role: 'A', x: 10, y: 0 },
      { id: 'B1', label: 'B1', kind: 'digital', role: 'B', x: 0, y: 10 },
      { id: 'B2', label: 'B2', kind: 'digital', role: 'B', x: 10, y: 10 }
    ]
  },
  switch: {
    type: 'switch',
    rotation: 0,
    props: { on: false },
    pins: [
      { id: 'pin1', label: '1', kind: 'digital', role: 'A', x: 0, y: 0 },
      { id: 'pin2', label: '2', kind: 'digital', role: 'B', x: 10, y: 0 }
    ]
  },
  buzzer: {
    type: 'buzzer',
    rotation: 0,
    props: {},
    pins: [
      { id: 'positive', label: '+', kind: 'digital', role: 'SIGNAL', x: 0, y: 0 },
      { id: 'negative', label: '-', kind: 'digital', role: 'GND', x: 10, y: 0 }
    ]
  },
  pot: {
    type: 'pot',
    rotation: 0,
    props: { maxResistance: 10000 },
    pins: [
      { id: 'vcc', label: 'VCC', kind: 'power', role: 'VCC', x: 0, y: 0 },
      { id: 'signal', label: 'SIG', kind: 'analog', role: 'WIPER', x: 10, y: 0 },
      { id: 'gnd', label: 'GND', kind: 'ground', role: 'GND', x: 20, y: 0 }
    ]
  },
  pir: {
    type: 'pir',
    rotation: 0,
    props: {},
    pins: [
      { id: 'vcc', label: 'VCC', kind: 'power', role: 'VCC', x: 0, y: 0 },
      { id: 'signal', label: 'OUT', kind: 'digital', role: 'OUT', x: 10, y: 0 },
      { id: 'gnd', label: 'GND', kind: 'ground', role: 'GND', x: 20, y: 0 }
    ]
  },
  ultrasonic: {
    type: 'ultrasonic',
    rotation: 0,
    props: {},
    pins: [
      { id: 'vcc', label: 'VCC', kind: 'power', role: 'VCC', x: 0, y: 0 },
      { id: 'trig', label: 'TRIG', kind: 'digital', role: 'TRIG', x: 10, y: 0 },
      { id: 'echo', label: 'ECHO', kind: 'digital', role: 'ECHO', x: 20, y: 0 },
      { id: 'gnd', label: 'GND', kind: 'ground', role: 'GND', x: 30, y: 0 }
    ]
  },
  ds18b20: {
    type: 'ds18b20',
    rotation: 0,
    props: {},
    pins: [
      { id: 'vcc', label: 'VCC', kind: 'power', role: 'VCC', x: 0, y: 0 },
      { id: 'data', label: 'DATA', kind: 'onewire', role: 'DQ', x: 10, y: 0 },
      { id: 'gnd', label: 'GND', kind: 'ground', role: 'GND', x: 20, y: 0 }
    ]
  },
  servo: {
    type: 'servo',
    rotation: 0,
    props: {},
    pins: [
      { id: 'vcc', label: 'VCC', kind: 'power', role: 'VCC', x: 0, y: 0 },
      { id: 'signal', label: 'SIG', kind: 'pwm', role: 'PWM', x: 10, y: 0 },
      { id: 'gnd', label: 'GND', kind: 'ground', role: 'GND', x: 20, y: 0 }
    ]
  },
  junction: {
    type: 'junction',
    rotation: 0,
    props: {},
    pins: [{ id: 'J', label: '', kind: 'digital', role: 'SIGNAL', x: 0, y: 0 }]
  },
  power_rail: {
    type: 'power_rail',
    rotation: 0,
    props: { kind: '3v3' as '3v3' | 'vin' | 'gnd' },
    pins: [{ id: 'out', label: '3V3', kind: 'power', x: 0, y: 0 }]
  },
  dc_supply: {
    type: 'dc_supply',
    rotation: 0,
    props: { voltage: 5, rInternal: 50, vMax: 12 },
    pins: [
      { id: 'pos', label: '+', kind: 'power', role: 'VCC', x: 10, y: 25 },
      { id: 'neg', label: '−', kind: 'ground', role: 'GND', x: 80, y: 25 },
    ]
  },
  capacitor: {
    type: 'capacitor',
    rotation: 0,
    props: { capacitance: 1e-5, rLeak: 1e8 },
    pins: [
      { id: 'a', label: 'A', kind: 'digital', role: 'A', x: 10, y: 25 },
      { id: 'b', label: 'B', kind: 'digital', role: 'B', x: 80, y: 25 },
    ],
  },
  capacitor_polarized: {
    type: 'capacitor_polarized',
    rotation: 0,
    props: { capacitance: 1e-5, ratedVoltage: 16, rLeak: 1e8 },
    pins: [
      { id: 'P', label: '+', kind: 'digital', role: 'V+', x: 10, y: 25 },
      { id: 'N', label: '−', kind: 'digital', role: 'V-', x: 80, y: 25 },
    ],
  },
  rgb_led: {
    type: 'rgb_led',
    rotation: 0,
    props: { variantId: 'CC' as 'CC' | 'CA', vfR: 2, vfG: 3, vfB: 3, rdynR: 20, rdynG: 20, rdynB: 20, iref: 0.02 },
    pins: [
      { id: 'R', label: 'R', kind: 'digital', role: 'A', x: 10, y: 15 },
      { id: 'G', label: 'G', kind: 'digital', role: 'A', x: 30, y: 15 },
      { id: 'B', label: 'B', kind: 'digital', role: 'A', x: 50, y: 15 },
      { id: 'COM', label: '−', kind: 'digital', role: 'Cathode', x: 30, y: 35 },
    ],
  },
  motor_dc: {
    type: 'motor_dc',
    rotation: 0,
    props: { rOhms: 10, iNom: 0.2, iMinSpin: 0.01, speed: 0, spinning: false },
    pins: [
      { id: 'P', label: 'M+', kind: 'digital', role: 'VCC', x: 0, y: 35 },
      { id: 'N', label: 'M−', kind: 'digital', role: 'GND', x: 80, y: 35 },
    ],
  },
  motor_ac: {
    type: 'motor_ac',
    rotation: 0,
    props: { rOhms: 20, iNom: 0.2, iMinSpin: 0.01, speed: 0, spinning: false, placeholderModel: true },
    pins: [
      { id: 'P', label: 'L', kind: 'digital', role: 'VCC', x: 0, y: 35 },
      { id: 'N', label: 'N', kind: 'digital', role: 'GND', x: 80, y: 35 },
    ],
  },
  voltmeter: {
    type: 'voltmeter',
    rotation: 0,
    props: { range: 'auto' },
    pins: [
      { id: 'pos', label: '+', kind: 'digital', role: 'V+', x: 10, y: 25 },
      { id: 'neg', label: '−', kind: 'digital', role: 'V-', x: 80, y: 25 },
    ],
  },
  potentiometer: {
    type: 'potentiometer',
    rotation: 0,
    props: { rTotalOhms: 10000, alpha: 0.5, taper: 'linear' as 'linear' | 'log', wiperOhms: 0 },
    pins: [
      { id: 'IN', label: 'IN', kind: 'power', role: 'IN', x: 10, y: 25 },
      { id: 'OUT', label: 'OUT', kind: 'analog', role: 'OUT', x: 45, y: 8 },
      { id: 'GND', label: 'GND', kind: 'ground', role: 'GND', x: 80, y: 25 },
    ],
  },
  transistor: {
    type: 'transistor',
    rotation: 0,
    props: { polarity: 'NPN' as 'NPN' | 'PNP', beta: 100, vbeOn: 0.7, vceSat: 0.2, rBeOn: 1000, rOff: 1e9 },
    pins: [
      { id: 'C', label: 'C', kind: 'digital', role: 'C', x: 10, y: 8 },
      { id: 'B', label: 'B', kind: 'digital', role: 'B', x: 45, y: 42 },
      { id: 'E', label: 'E', kind: 'digital', role: 'E', x: 80, y: 8 },
    ],
  },
  push_button: {
    type: 'push_button',
    rotation: 0,
    props: { contact: 'NO' as 'NO' | 'NC', mechanism: 'momentary' as 'momentary' | 'latch', latched: false, pressed: false, isClosed: false, rOnOhms: 0.01 },
    pins: [
      { id: 'P1', label: 'P1', kind: 'digital', role: 'A', x: 10, y: 25 },
      { id: 'P2', label: 'P2', kind: 'digital', role: 'B', x: 80, y: 25 },
    ],
  },
  /** Legacy type kept for migration compatibility. */
  push_button_momentary: {
    type: 'push_button_momentary',
    rotation: 0,
    props: { isClosed: false, pressed: false, rOnOhms: 0.01, rOffOhms: 1e12 },
    pins: [
      { id: 'P1', label: 'P1', kind: 'digital', role: 'A', x: 10, y: 25 },
      { id: 'P2', label: 'P2', kind: 'digital', role: 'B', x: 80, y: 25 },
    ],
  },
  /** Legacy type kept for migration compatibility. */
  push_button_latch: {
    type: 'push_button_latch',
    rotation: 0,
    props: { isClosed: false, latched: false, rOnOhms: 0.01, rOffOhms: 1e12 },
    pins: [
      { id: 'P1', label: 'P1', kind: 'digital', role: 'A', x: 10, y: 25 },
      { id: 'P2', label: 'P2', kind: 'digital', role: 'B', x: 80, y: 25 },
    ],
  },
};

// Helper functions for working with the data model
export const createComponent = (
  type: string, 
  x: number, 
  y: number, 
  id?: string
): SimComponent => {
  const definition = COMPONENT_DEFINITIONS[type];
  if (!definition) {
    throw new Error(`Unknown component type: ${type}`);
  }
  
  return {
    id: id || `${type}-${Date.now()}`,
    type: definition.type,
    x,
    y,
    rotation: definition.rotation,
    props: { ...definition.props },
    pins: [...definition.pins]
  };
};

export const createWire = (
  fromComponentId: string,
  fromPinId: string,
  toComponentId: string,
  toPinId: string,
  color: string = '#000000',
  id?: string
): Wire => ({
  id: id || `wire-${Date.now()}`,
  from: { componentId: fromComponentId, pinId: fromPinId },
  to: { componentId: toComponentId, pinId: toPinId },
  color
});

export const findComponentById = (components: SimComponent[], id: string): SimComponent | undefined => {
  return components.find(comp => comp.id === id);
};

export const findPinById = (component: SimComponent, pinId: string): PinDef | undefined => {
  return component.pins.find(pin => pin.id === pinId);
};

export const getConnectedWires = (wires: Wire[], componentId: string, pinId?: string): Wire[] => {
  return wires.filter(wire => 
    (wire.from.componentId === componentId && (!pinId || wire.from.pinId === pinId)) ||
    (wire.to.componentId === componentId && (!pinId || wire.to.pinId === pinId))
  );
};
