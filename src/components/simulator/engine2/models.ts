/**
 * Engine2: Solver component models and output types.
 */

/** Sine waveform for AC source: Vs(t) = voltage + amplitude * sin(2*π*frequencyHz*t + phaseRad). */
export interface VSourceWaveform {
  type: 'sine';
  amplitude: number;
  frequencyHz: number;
  phaseRad?: number;
}

export type NetlistComponent =
  | { type: 'VSource'; id: string; pNode: number; nNode: number; voltage: number; waveform?: VSourceWaveform }
  | { type: 'ISource'; id: string; aNode: number; bNode: number; current: number; floating?: boolean }
  | { type: 'R'; id: string; aNode: number; bNode: number; resistance: number; floating?: boolean }
  | { type: 'Switch'; id: string; aNode: number; bNode: number; on: boolean; rOn: number; rOff: number; floating?: boolean }
  | { type: 'LED'; id: string; aNode: number; bNode: number; vf: number; rOn: number; rOff: number; iMax: number; floating?: boolean }
  | { type: 'Motor'; id: string; aNode: number; bNode: number; r: number; iNom: number; iMinSpin: number; floating?: boolean }
  | {
      type: 'Transistor';
      id: string;
      bNode: number;
      cNode: number;
      eNode: number;
      polarity: 'NPN' | 'PNP';
      beta: number;
      vbeOn: number;
      vceSat: number;
      rBeOn: number;
      rOff: number;
      floating?: boolean;
    }
  | {
      type: 'Capacitor';
      id: string;
      aNode: number;
      bNode: number;
      rLeak: number;
      /** Capacitance (F). Required for transient. */
      capacitance: number;
      polarized?: boolean;
      /** Max allowed reverse voltage (V) before damage. Default 1. */
      reverseVmax?: number;
      floating?: boolean;
    }
  | {
      type: 'Diode';
      id: string;
      aNode: number;
      bNode: number;
      vf: number;
      rOn: number;
      ileak?: number;
      vbr?: number;
      rbr?: number;
      floating?: boolean;
    }
  | {
      type: 'Inductor';
      id: string;
      aNode: number;
      bNode: number;
      inductance: number;
      floating?: boolean;
    };

export type LedStatus = 'ok' | 'overcurrent' | 'damaged' | 'burned';

export interface LedOutput {
  on: boolean;
  current: number;
  voltageDrop: number;
  brightness: number;
  reason?: string;
  /** Human-readable reason when LED is off (floating, not forward biased, no path). */
  reasonIfNot?: string;
  forwardBiased?: boolean;
  hasReturnPath?: boolean;
  hasFeedPath?: boolean;
  /** Power dissipation (W). */
  power?: number;
  status: LedStatus;
  damageAccumTicks: number;
}

/** Minimum current (A) for LED to be considered ON. Below this = OFF. No closed loop → I=0 → OFF. */
export const I_LED_MIN = 0.0005;
/** Nominal safe current (e.g. 20mA). Above this show "resistor recommended". */
export const I_LED_NOMINAL = 0.02;
/** Current (A) for 100% brightness; e.g. 20mA. Used as Iref in brightness = clamp(|I|/Iref, 0, 1). */
export const I_LED_REF_BRIGHTNESS = 0.02;
/** Below this |I| (A), treat as no current so brightness = 0 (no fake current from gmin/leakage). */
export const I_FAKE_THRESHOLD = 1e-6;
/** Current above which damage accumulates (e.g. 60mA). */
export const I_LED_DAMAGE = 0.06;
/** Current above which burnout accumulates quickly (e.g. 120mA). */
export const I_LED_BURNOUT = 0.12;
/** Ticks at overcurrent before "damaged" visual. */
export const DAMAGE_TICKS_TO_DAMAGED = 10;
/** Ticks at damage level before "burned" (open circuit). */
export const DAMAGE_TICKS_TO_BURNOUT = 30;

export interface MotorOutput {
  spinning: boolean;
  speed: number;
  current: number;
  voltage: number;
  /** Node voltage at pin a (M+ or L). */
  va?: number;
  /** Node voltage at pin b (M- or N). */
  vb?: number;
  direction: 1 | -1 | 0;
  /** Power (W). */
  power?: number;
  reason?: string;
  /** Human-readable when not spinning (open loop, no current, etc.). */
  reasonIfNot?: string;
}

/** Default minimum current (A) for motor to be considered spinning. No closed loop = no current = no spin. */
export const I_MIN_SPIN = 0.01;

/** Voltmeter: measurement-only (no MNA stamp). Reading = Va - Vb from solved node voltages. */
export interface VoltmeterOutput {
  type: 'Voltmeter';
  /** Null when probe(s) unconnected or floating/singular. */
  volts: number | null;
  connected: boolean;
  /** True when probes are connected but solve is singular or node voltages are undefined. */
  floating: boolean;
  netPlus: string | null;
  netMinus: string | null;
  vPlus: number | null;
  vMinus: number | null;
}

/** Potentiometer debug output: voltages, split resistances, currents, power. */
export interface PotOutput {
  rTotal: number;
  alpha: number;
  rTop: number;
  rBot: number;
  vIn: number;
  vOut: number;
  vGnd: number;
  iTop: number;
  iBot: number;
  pTop: number;
  pBot: number;
  pTotal: number;
  /** True if pot was floating (no valid stamp); values may be 0/NaN. */
  floating?: boolean;
}

export interface TransistorOutput {
  polarity: 'NPN' | 'PNP';
  region: 'cutoff' | 'active' | 'saturation' | 'floating';
  vb: number | null;
  vc: number | null;
  ve: number | null;
  vbe: number | null;
  vce: number | null;
  ib: number;
  ic: number;
}

/** Buzzer: sound only from solved branch current; polarity and Vmin enforced. */
export interface BuzzerOutput {
  /** True only when solved ok, Vbuz >= Vmin, |I| >= Imin, correct polarity. */
  audible: boolean;
  vPlus: number;
  vMinus: number;
  vBuz: number;
  current: number;
  /** Human-readable reason when not audible. */
  reasonIfNot?: string;
}

/** Default R for active buzzer (e.g. 5V/30mA ≈ 167Ω). */
export const R_BUZZER_DEFAULT = 167;
/** Minimum voltage (V) across buzzer for active sound. */
export const V_MIN_BUZZER = 2.0;
/** Minimum current (A) for buzzer to sound (0.5 mA so low-current paths still beep). */
export const I_MIN_BUZZER = 0.0005;

/** Capacitor (DC mode): open circuit via leakage only. Voltage across, branch current, energy; polarity damage for electrolytic. */
export interface CapacitorOutput {
  voltage: number;
  current: number;
  energy: number;
  reversed?: boolean;
  damaged?: boolean;
}

/** Default leakage resistance (Ω) for capacitor in DC; 100MΩ so steady-state current is negligible. */
export const R_LEAK_CAPACITOR_DEFAULT = 1e8;
/** Default capacitance (F) when not specified (e.g. 1µF). */
export const CAPACITANCE_DEFAULT_FARAD = 1e-6;
/** Default reverse voltage (V) before polarized cap damage. */
export const CAPACITOR_REVERSE_VMAX_DEFAULT = 1.0;
/** Default inductance (H) when not specified (e.g. 1 mH). */
export const INDUCTANCE_DEFAULT_H = 0.001;

/** Per-capacitor state for transient: vPrev and optional damage. */
export interface CapacitorState {
  vPrev: number;
  damaged?: boolean;
}

/** Diode: piecewise-linear (Level 2). vd = Va - Vk; state OFF / ON / BREAKDOWN; id = branch current (A). */
export interface DiodeOutput {
  vd: number;
  state: 'OFF' | 'ON' | 'BREAKDOWN';
  /** Branch current (A), positive = anode → cathode. */
  id: number;
  reasonIfNot?: string;
  /** Power dissipation (W). */
  power?: number;
}

/** Diode constants (Level 2 piecewise-linear). */
export const VF_DIODE_DEFAULT = 0.7;
export const R_ON_DIODE_DEFAULT = 1;
export const I_LEAK_DIODE = 1e-12;
export const V_BR_DIODE = 50;
export const R_BR_DIODE = 10;
export const DIODE_VF_HYSTERESIS = 0.01;
/** Large resistance when OFF for stability (avoid open circuit in MNA). */
export const R_OFF_DIODE = 1e9;

/** RGB LED: per-channel brightness and current from three internal diodes (R, G, B). */
export interface RgbLedOutput {
  brightnessR: number;
  brightnessG: number;
  brightnessB: number;
  currentR: number;
  currentG: number;
  currentB: number;
  voltageDropR: number;
  voltageDropG: number;
  voltageDropB: number;
  /** Mixed color 0..1 for display. */
  mixedColor?: { r: number; g: number; b: number };
}

export type ComponentOutput = LedOutput | MotorOutput | VoltmeterOutput | PotOutput | TransistorOutput | BuzzerOutput | CapacitorOutput | RgbLedOutput | DiodeOutput;

export const R_ON_SWITCH = 0.05;
export const R_OFF_SWITCH = 1e9;
/** When ON: Vf source + this dynamic resistance (series). */
export const R_ON_LED = 30;
/** When OFF: finite so solver stays stable; not infinite. */
export const R_OFF_LED = 1e6;
/** Default forward voltage (e.g. red ≈ 2V). */
export const LED_VF_DEFAULT = 2.0;
/** Hysteresis: ON if Vd > Vf + 0.05, OFF if Vd < Vf - 0.05. */
export const LED_VF_HYSTERESIS = 0.05;
export const LED_I_MAX_DEFAULT = 0.03;
/** @deprecated Use current-based spin only (I > iMinSpin). Kept for backward compat. */
export const V_MIN_SPIN = 1;
export const I_MIN_MOTOR = 0.02;
export const EPS = 1e-9;
export const I_EPS = 1e-6;
/** Minimum resistance (Ω) for pot segments to avoid singular MNA. */
export const R_MIN_POT = 0.1;
