export type PinKind = 'power' | 'ground' | 'digital' | 'analog' | 'pwm' | 'onewire' | 'serial';

export interface PinDef {
  id: string;           // within component
  label: string;        // printed label (e.g., "GPIO2", "3V3")
  kind: PinKind;
  gpio?: number;        // ESP32 GPIO number if applicable
  x: number; y: number; // relative position for rendering
}

export interface SimComponent {
  id: string;
  type: 'esp32' | 'led' | 'resistor' | 'button' | 'buzzer' | 'pot' | 'pir' | 'ultrasonic' | 'ds18b20' | 'servo' | 'power' | 'ground';
  x: number; y: number; rotation?: number;
  props?: Record<string, any>; // e.g., { color: 'red', ohms: 220, name: 'MyComponent' }
  pins: PinDef[];
  selected?: boolean; // selection state for deletion
  name?: string; // optional display name
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
  points?: number[];                // optional path points for pretty curves
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
      { id: '3v3', label: '3V3', kind: 'power', x: 0, y: 0 },
      { id: 'gnd', label: 'GND', kind: 'ground', x: 0, y: 10 },
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
      { id: 'anode', label: '+', kind: 'digital', x: 0, y: 0 },
      { id: 'cathode', label: '-', kind: 'digital', x: 10, y: 0 }
    ]
  },
  resistor: {
    type: 'resistor',
    rotation: 0,
    props: { ohms: 220 },
    pins: [
      { id: 'pin1', label: '1', kind: 'digital', x: 0, y: 0 },
      { id: 'pin2', label: '2', kind: 'digital', x: 20, y: 0 }
    ]
  },
  button: {
    type: 'button',
    rotation: 0,
    props: {},
    pins: [
      { id: 'pin1', label: '1', kind: 'digital', x: 0, y: 0 },
      { id: 'pin2', label: '2', kind: 'digital', x: 10, y: 0 }
    ]
  },
  buzzer: {
    type: 'buzzer',
    rotation: 0,
    props: {},
    pins: [
      { id: 'positive', label: '+', kind: 'digital', x: 0, y: 0 },
      { id: 'negative', label: '-', kind: 'digital', x: 10, y: 0 }
    ]
  },
  pot: {
    type: 'pot',
    rotation: 0,
    props: { maxResistance: 10000 },
    pins: [
      { id: 'vcc', label: 'VCC', kind: 'power', x: 0, y: 0 },
      { id: 'signal', label: 'SIG', kind: 'analog', x: 10, y: 0 },
      { id: 'gnd', label: 'GND', kind: 'ground', x: 20, y: 0 }
    ]
  },
  pir: {
    type: 'pir',
    rotation: 0,
    props: {},
    pins: [
      { id: 'vcc', label: 'VCC', kind: 'power', x: 0, y: 0 },
      { id: 'signal', label: 'OUT', kind: 'digital', x: 10, y: 0 },
      { id: 'gnd', label: 'GND', kind: 'ground', x: 20, y: 0 }
    ]
  },
  ultrasonic: {
    type: 'ultrasonic',
    rotation: 0,
    props: {},
    pins: [
      { id: 'vcc', label: 'VCC', kind: 'power', x: 0, y: 0 },
      { id: 'trig', label: 'TRIG', kind: 'digital', x: 10, y: 0 },
      { id: 'echo', label: 'ECHO', kind: 'digital', x: 20, y: 0 },
      { id: 'gnd', label: 'GND', kind: 'ground', x: 30, y: 0 }
    ]
  },
  ds18b20: {
    type: 'ds18b20',
    rotation: 0,
    props: {},
    pins: [
      { id: 'vcc', label: 'VCC', kind: 'power', x: 0, y: 0 },
      { id: 'data', label: 'DATA', kind: 'onewire', x: 10, y: 0 },
      { id: 'gnd', label: 'GND', kind: 'ground', x: 20, y: 0 }
    ]
  },
  servo: {
    type: 'servo',
    rotation: 0,
    props: {},
    pins: [
      { id: 'vcc', label: 'VCC', kind: 'power', x: 0, y: 0 },
      { id: 'signal', label: 'SIG', kind: 'pwm', x: 10, y: 0 },
      { id: 'gnd', label: 'GND', kind: 'ground', x: 20, y: 0 }
    ]
  }
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
