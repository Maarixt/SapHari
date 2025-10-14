/**
 * Core types for the ESP32 Circuit Simulator
 * Enhanced with pin-accurate simulation capabilities
 */

export type PinLevel = 0 | 1;
export type AnalogV = number; // volts
export type GpioMode = 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP' | 'INPUT_PULLDOWN' | 'ANALOG' | 'PWM';

export interface PinState {
  mode: GpioMode;
  level: PinLevel;
  analog?: AnalogV;
  pwm?: { freq: number; duty: number }; // 0..1
  pull: 'UP' | 'DOWN' | 'NONE';
}

export interface Net {
  id: string;
  name?: string;
  v: AnalogV;
  pins: { compId: string; pinId: string; }[];
}

export interface SimCtx {
  getNetV(netId: string): AnalogV;
  setNetV(netId: string, v: AnalogV): void;
  readDigital(netId: string): PinLevel;
  writeDigital(netId: string, lvl: PinLevel): void;
  readAnalog(netId: string): AnalogV;
  writeAnalog(netId: string, v: AnalogV): void;
  schedule(fn: () => void, delayMs: number): void;
  raiseInterrupt(pin: number, edge: 'RISING' | 'FALLING' | 'CHANGE'): void;
  rng(): number;
  warn(code: string, msg: string): void;
  getTime(): number;
  getTimeScale(): number;
}

export interface Component {
  id: string;
  label: string;
  pins: Record<string, string>; // pinName -> netId
  init?(ctx: SimCtx): void;
  update(dt: number, ctx: SimCtx): void;
  onPinChange?(pin: string, ctx: SimCtx): void;
  powerDrawmA?: number;
  props?: Record<string, any>;
}

export interface PinDefinition {
  id: string;
  label: string;
  kind: 'digital' | 'analog' | 'power' | 'ground' | 'i2c' | 'spi' | 'pwm' | 'adc';
  gpio?: number;
  x: number;
  y: number;
  capabilities?: {
    input?: boolean;
    output?: boolean;
    pullup?: boolean;
    pulldown?: boolean;
    pwm?: boolean;
    adc?: boolean;
    i2c?: boolean;
    spi?: boolean;
  };
}

export interface SimComponent {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation: number;
  pins: PinDefinition[];
  props: Record<string, any>;
  state?: Record<string, any>;
}

export interface Wire {
  id: string;
  from: { componentId: string; pinId: string };
  to: { componentId: string; pinId: string };
  color?: string;
}

export interface SimState {
  components: SimComponent[];
  wires: Wire[];
  running: boolean;
  selectedId?: string;
  time: number;
  timeScale: number;
  seed: number;
  schemaVersion: string;
}

export interface SimulationMessage {
  type: 'INIT' | 'PLAY' | 'PAUSE' | 'STEP' | 'SET_PROP' | 'CONNECT' | 'DISCONNECT' | 'REQUEST_STATE' | 'STATE' | 'WARNING' | 'ERROR';
  payload?: any;
  id?: string;
}

export interface Warning {
  id: string;
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  componentId?: string;
  netId?: string;
  timestamp: number;
}

export interface InterruptHandler {
  pin: number;
  edge: 'RISING' | 'FALLING' | 'CHANGE';
  callback: () => void;
  enabled: boolean;
}

export interface PWMMode {
  channel: number;
  frequency: number;
  resolution: number; // bits
  duty: number; // 0-1
  attachedPin?: number;
}

export interface ADCMode {
  pin: number;
  attenuation: '0db' | '2.5db' | '6db' | '11db';
  resolution: number; // bits
  calibrated: boolean;
}

export interface I2CDevice {
  address: number;
  connected: boolean;
  lastActivity: number;
}

export interface SPIDevice {
  cs: number;
  connected: boolean;
  lastActivity: number;
}

export interface ComponentProps {
  [key: string]: any;
}

export interface ComponentDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  pins: PinDefinition[];
  defaultProps: ComponentProps;
  createComponent: (x: number, y: number, props?: ComponentProps) => SimComponent;
  updateComponent: (component: SimComponent, dt: number, ctx: SimCtx) => void;
  onPinChange?: (component: SimComponent, pin: string, ctx: SimCtx) => void;
  powerDrawmA?: number;
}

export interface ProfilerEntry {
  componentId: string;
  componentType: string;
  updateTime: number;
  maxTime: number;
  avgTime: number;
  callCount: number;
  lastUpdate: number;
}

export interface AudioContext {
  context: AudioContext | null;
  initialized: boolean;
  muted: boolean;
  volume: number;
}

export interface TimeControls {
  playing: boolean;
  timeScale: number;
  singleStep: boolean;
  maxCatchUp: number; // max ticks per frame
}

export interface CircuitSchema {
  version: string;
  components: SimComponent[];
  wires: Wire[];
  metadata: {
    name: string;
    description?: string;
    created: number;
    modified: number;
    author?: string;
  };
}

// Arduino API types
export interface ArduinoAPI {
  pinMode: (pin: number, mode: GpioMode) => void;
  digitalWrite: (pin: number, value: PinLevel) => void;
  digitalRead: (pin: number) => PinLevel;
  analogRead: (pin: number) => number; // 0-4095
  ledcSetup: (channel: number, frequency: number, resolution: number) => void;
  ledcAttachPin: (pin: number, channel: number) => void;
  ledcWrite: (channel: number, duty: number) => void;
  attachInterrupt: (pin: number, edge: 'RISING' | 'FALLING' | 'CHANGE', callback: () => void) => void;
  detachInterrupt: (pin: number) => void;
  delay: (ms: number) => Promise<void>;
  millis: () => number;
  micros: () => number;
  Wire: {
    begin: () => void;
    beginTransmission: (address: number) => void;
    write: (data: number) => void;
    endTransmission: () => void;
    requestFrom: (address: number, quantity: number) => void;
    available: () => number;
    read: () => number;
  };
  SPI: {
    begin: () => void;
    transfer: (data: number) => number;
    end: () => void;
  };
  Serial: {
    print: (data: any) => void;
    println: (data: any) => void;
    available: () => number;
    read: () => number;
  };
}
