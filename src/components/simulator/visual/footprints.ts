/**
 * Footprint system: physical geometry and pin layout per component type.
 * Phase 4 (realistic ESP32, etc.) can register custom footprints (DevKit outline,
 * mounting holes, header positions) here so layout stays data-driven.
 */

import type { SimComponent } from '../types';
import { COMPONENT_DEFINITIONS } from '../types';

export interface Footprint {
  width: number;
  height: number;
  /** Pin id -> offset from component origin (0,0). */
  pinOffsets: Record<string, { x: number; y: number }>;
  /** Optional rotation/origin (default top-left). */
  anchor?: { x: number; y: number };
}

/** World position of a pin: component origin + pin offset. */
export function getPinWorldPosition(
  component: SimComponent,
  pinId: string,
  footprint: Footprint
): { x: number; y: number } {
  const offset = footprint.pinOffsets[pinId];
  if (!offset) return { x: component.x, y: component.y };
  return {
    x: component.x + offset.x,
    y: component.y + offset.y,
  };
}

const footprintRegistry: Partial<Record<SimComponent['type'], Footprint>> = {};
/** View-specific overrides: when viewMode is 'workbench', use these if present. */
let workbenchFootprintRegistry: Partial<Record<SimComponent['type'], Footprint>> & Record<string, Footprint> = {};
/** Schematic-only overrides (e.g. LED 70x40 with A/K at 10,20 and 60,20). */
let schematicFootprintRegistry: Partial<Record<SimComponent['type'], Footprint>> & Record<string, Footprint> = {};

/** Explicit ESP32 DevKit footprint: 200x260, two vertical header rows. Do not overwrite with auto-generated. */
const ESP32_WIDTH = 200;
const ESP32_HEIGHT = 260;
const ESP32_ANCHOR = { x: ESP32_WIDTH / 2, y: ESP32_HEIGHT / 2 };
const LEFT_HEADER_X = 14;
const RIGHT_HEADER_X = 186;
const PIN_SPACING = 22;
const FIRST_PIN_Y = 42;

/** Left column pins (top to bottom); right column pins (top to bottom). Supports both 10-pin and 18-pin ESP32 defs. */
export const ESP32_FOOTPRINT: Footprint = {
  width: ESP32_WIDTH,
  height: ESP32_HEIGHT,
  anchor: ESP32_ANCHOR,
  pinOffsets: {
    // Left header (x=14)
    '3v3': { x: LEFT_HEADER_X, y: FIRST_PIN_Y },
    gnd: { x: LEFT_HEADER_X, y: FIRST_PIN_Y + PIN_SPACING },
    gnd1: { x: LEFT_HEADER_X, y: FIRST_PIN_Y + PIN_SPACING },
    gpio2: { x: LEFT_HEADER_X, y: FIRST_PIN_Y + PIN_SPACING * 2 },
    gpio4: { x: LEFT_HEADER_X, y: FIRST_PIN_Y + PIN_SPACING * 3 },
    gpio5: { x: LEFT_HEADER_X, y: FIRST_PIN_Y + PIN_SPACING * 4 },
    gpio12: { x: LEFT_HEADER_X, y: FIRST_PIN_Y + PIN_SPACING * 5 },
    gpio13: { x: LEFT_HEADER_X, y: FIRST_PIN_Y + PIN_SPACING * 6 },
    gpio14: { x: LEFT_HEADER_X, y: FIRST_PIN_Y + PIN_SPACING * 7 },
    gpio15: { x: LEFT_HEADER_X, y: FIRST_PIN_Y + PIN_SPACING * 8 },
    // Right header (x=186)
    vin: { x: RIGHT_HEADER_X, y: FIRST_PIN_Y },
    gnd2: { x: RIGHT_HEADER_X, y: FIRST_PIN_Y + PIN_SPACING },
    gpio16: { x: RIGHT_HEADER_X, y: FIRST_PIN_Y + PIN_SPACING * 2 },
    gpio17: { x: RIGHT_HEADER_X, y: FIRST_PIN_Y + PIN_SPACING * 3 },
    gpio18: { x: RIGHT_HEADER_X, y: FIRST_PIN_Y + PIN_SPACING * 4 },
    gpio19: { x: RIGHT_HEADER_X, y: FIRST_PIN_Y + PIN_SPACING * 5 },
    gpio21: { x: RIGHT_HEADER_X, y: FIRST_PIN_Y + PIN_SPACING * 6 },
    gpio22: { x: RIGHT_HEADER_X, y: FIRST_PIN_Y + PIN_SPACING * 7 },
    gpio23: { x: RIGHT_HEADER_X, y: FIRST_PIN_Y + PIN_SPACING * 8 },
  },
};

function buildFootprints(): void {
  const defs = COMPONENT_DEFINITIONS as Record<string, { type: string; pins: { id: string; x: number; y: number }[] }>;
  const defaultSize = { w: 90, h: 50 };
  const sizes: Partial<Record<string, { w: number; h: number }>> = {};

  for (const key of Object.keys(defs)) {
    if (key === 'esp32' || key === 'junction' || key === 'power_rail') continue;
    const def = defs[key];
    if (!def?.pins) continue;
    const size = sizes[key] ?? defaultSize;
    const pinOffsets: Record<string, { x: number; y: number }> = {};
    for (const p of def.pins) {
      pinOffsets[p.id] = { x: p.x, y: p.y };
    }
    footprintRegistry[key as SimComponent['type']] = {
      width: size.w,
      height: size.h,
      pinOffsets,
      anchor: { x: size.w / 2, y: size.h / 2 },
    };
  }
  footprintRegistry.esp32 = ESP32_FOOTPRINT;

  const JUNCTION_FOOTPRINT: Footprint = {
    width: 16,
    height: 16,
    anchor: { x: 8, y: 8 },
    pinOffsets: { J: { x: 8, y: 8 } },
  };
  footprintRegistry.junction = JUNCTION_FOOTPRINT;
  workbenchFootprintRegistry.junction = JUNCTION_FOOTPRINT;
  schematicFootprintRegistry.junction = JUNCTION_FOOTPRINT;

  const POWER_RAIL_FOOTPRINT: Footprint = {
    width: 44,
    height: 24,
    anchor: { x: 22, y: 12 },
    pinOffsets: { out: { x: 22, y: 12 } },
  };
  footprintRegistry.power_rail = POWER_RAIL_FOOTPRINT;

  /** SPST/SPDT/DPST/DPDT toggle switch SCHEMATIC: 90x50. DPDT: two SPDT stacked vertically; top pole COM1 (10,12) A1 (80,5) B1 (80,19), bottom pole COM2 (10,38) A2 (80,31) B2 (80,45). */
  const TOGGLE_SWITCH_SCHEMATIC: Footprint = {
    width: 90,
    height: 50,
    anchor: { x: 45, y: 25 },
    pinOffsets: {
      pin1: { x: 10, y: 25 },
      pin2: { x: 80, y: 25 },
      P1: { x: 80, y: 12 },
      P2: { x: 10, y: 25 },
      P3: { x: 80, y: 38 },
      P4: { x: 80, y: 35 },
      P5: { x: 10, y: 38 },
      P6: { x: 80, y: 45 },
    },
  };
  footprintRegistry.switch = TOGGLE_SWITCH_SCHEMATIC;
  (footprintRegistry as Record<string, Footprint>)['toggle-switch'] = TOGGLE_SWITCH_SCHEMATIC;

  /** Workbench switch: SPST pin1 (18,38), pin2 (72,38). SPDT: P1 (18,38), P2 (45,38), P3 (72,38). DPST: P1 (18,18), P2 (72,18), P3 (18,42), P4 (72,42). DPDT: 2×3 grid. a/b = SPST canonical. */
  const TOGGLE_SWITCH_WORKBENCH: Footprint = {
    width: 90,
    height: 50,
    anchor: { x: 45, y: 25 },
    pinOffsets: {
      a: { x: 18, y: 38 },
      b: { x: 72, y: 38 },
      pin1: { x: 18, y: 38 },
      pin2: { x: 72, y: 38 },
      P1: { x: 18, y: 38 },
      P2: { x: 45, y: 38 },
      P3: { x: 72, y: 38 },
      P4: { x: 72, y: 42 },
      P5: { x: 72, y: 38 },
      P6: { x: 72, y: 42 },
    },
  };
  workbenchFootprintRegistry.switch = TOGGLE_SWITCH_WORKBENCH;
  (workbenchFootprintRegistry as Record<string, Footprint>)['toggle-switch'] = TOGGLE_SWITCH_WORKBENCH;

  /** Ground symbol: 40x40, terminal at top center. gnd and out pin ids. */
  const GROUND_FOOTPRINT: Footprint = {
    width: 40,
    height: 40,
    anchor: { x: 20, y: 10 },
    pinOffsets: { gnd: { x: 20, y: 10 }, out: { x: 20, y: 10 } },
  };
  footprintRegistry.ground = GROUND_FOOTPRINT;
  schematicFootprintRegistry.ground = GROUND_FOOTPRINT;
  workbenchFootprintRegistry.ground = GROUND_FOOTPRINT;

  /** DC Supply (battery): 90x50, pos left, neg right. */
  footprintRegistry.dc_supply = {
    width: 90, height: 50,
    anchor: { x: 45, y: 25 },
    pinOffsets: { pos: { x: 10, y: 25 }, neg: { x: 80, y: 25 }, P: { x: 10, y: 25 }, N: { x: 80, y: 25 } },
  };

  /** DC Supply schematic: 90x50, P at (5,25), N at (85,25). Battery plates symbol. */
  const DC_SUPPLY_SCHEMATIC: Footprint = {
    width: 90,
    height: 50,
    anchor: { x: 45, y: 25 },
    pinOffsets: {
      P: { x: 5, y: 25 },
      N: { x: 85, y: 25 },
      pos: { x: 5, y: 25 },
      neg: { x: 85, y: 25 },
    },
  };
  schematicFootprintRegistry.dc_supply = DC_SUPPLY_SCHEMATIC;

  /** DC Supply workbench: 90x120. pos = left (0°), neg = right; rotation moves terminals (0/180 left/right, 90/270 top/bottom). */
  const DC_SUPPLY_WORKBENCH: Footprint = {
    width: 90,
    height: 120,
    anchor: { x: 45, y: 60 },
    pinOffsets: {
      pos: { x: 0, y: 60 },
      neg: { x: 90, y: 60 },
      P: { x: 0, y: 60 },
      N: { x: 90, y: 60 },
    },
  };
  workbenchFootprintRegistry.dc_supply = DC_SUPPLY_WORKBENCH;

  /** Resistor: 90x50, pins left/right. */
  footprintRegistry.resistor = {
    width: 90, height: 50,
    anchor: { x: 45, y: 25 },
    pinOffsets: { a: { x: 10, y: 25 }, b: { x: 80, y: 25 } },
  };

  /** LED: base 90x50 (workbench). Schematic override below. */
  footprintRegistry.led = {
    width: 90, height: 50,
    anchor: { x: 45, y: 25 },
    pinOffsets: { anode: { x: 10, y: 25 }, cathode: { x: 80, y: 25 } },
  };

  /** LED workbench: 60x95, physical 5mm. A (long leg) at (22,90), K (short leg) at (38,78). */
  const LED_WORKBENCH: Footprint = {
    width: 60,
    height: 95,
    anchor: { x: 30, y: 47 },
    pinOffsets: {
      A: { x: 22, y: 90 },
      K: { x: 38, y: 78 },
      anode: { x: 22, y: 90 },
      cathode: { x: 38, y: 78 },
    },
  };
  workbenchFootprintRegistry.led = LED_WORKBENCH;

  /** RGB LED workbench: 5mm 4-pin. Dome at top; R, G, B in a row; COM (common) at bottom center. */
  const RGB_LED_WORKBENCH: Footprint = {
    width: 70,
    height: 95,
    anchor: { x: 35, y: 47 },
    pinOffsets: {
      R: { x: 15, y: 88 },
      G: { x: 35, y: 85 },
      B: { x: 55, y: 88 },
      COM: { x: 35, y: 90 },
    },
  };
  footprintRegistry.rgb_led = {
    width: 70,
    height: 95,
    anchor: { x: 35, y: 47 },
    pinOffsets: { ...RGB_LED_WORKBENCH.pinOffsets },
  };
  workbenchFootprintRegistry.rgb_led = RGB_LED_WORKBENCH;

  /** RGB LED schematic: R, G, B on left; COM on right. */
  const RGB_LED_SCHEMATIC: Footprint = {
    width: 80,
    height: 50,
    anchor: { x: 40, y: 25 },
    pinOffsets: {
      R: { x: 10, y: 12 },
      G: { x: 10, y: 25 },
      B: { x: 10, y: 38 },
      COM: { x: 70, y: 25 },
    },
  };
  schematicFootprintRegistry.rgb_led = RGB_LED_SCHEMATIC;

  /** LED schematic: 80x40, A at (5,20), K at (75,20). Textbook symbol. */
  const LED_SCHEMATIC: Footprint = {
    width: 80,
    height: 40,
    anchor: { x: 40, y: 20 },
    pinOffsets: {
      A: { x: 5, y: 20 },
      K: { x: 75, y: 20 },
      anode: { x: 5, y: 20 },
      cathode: { x: 75, y: 20 },
    },
  };
  schematicFootprintRegistry.led = LED_SCHEMATIC;

  /** Diode schematic: 80x40, A at (5,20), K at (75,20). Triangle + bar, no light rays. */
  const DIODE_SCHEMATIC: Footprint = {
    width: 80,
    height: 40,
    anchor: { x: 40, y: 20 },
    pinOffsets: {
      A: { x: 5, y: 20 },
      K: { x: 75, y: 20 },
      anode: { x: 5, y: 20 },
      cathode: { x: 75, y: 20 },
    },
  };
  (footprintRegistry as Record<string, Footprint>).diode = { ...DIODE_SCHEMATIC };
  schematicFootprintRegistry.diode = DIODE_SCHEMATIC;

  /** Diode workbench: axial 56x24, lead tips at (8,12) and (48,12). */
  const DIODE_WORKBENCH: Footprint = {
    width: 56,
    height: 24,
    anchor: { x: 28, y: 12 },
    pinOffsets: {
      A: { x: 8, y: 12 },
      K: { x: 48, y: 12 },
      anode: { x: 8, y: 12 },
      cathode: { x: 48, y: 12 },
    },
  };
  workbenchFootprintRegistry.diode = DIODE_WORKBENCH;

  /** Voltmeter: circle with V. Schematic only; pos left, neg right, anchor center. */
  const VOLTMETER_SCHEMATIC: Footprint = {
    width: 50,
    height: 40,
    anchor: { x: 25, y: 20 },
    pinOffsets: {
      pos: { x: 5, y: 20 },
      neg: { x: 45, y: 20 },
    },
  };
  (footprintRegistry as Record<string, Footprint>).voltmeter = { ...VOLTMETER_SCHEMATIC };
  schematicFootprintRegistry.voltmeter = VOLTMETER_SCHEMATIC;

  /** Voltmeter workbench: multimeter body, two jack terminals on top (pos left, neg right). */
  const VOLTMETER_WORKBENCH: Footprint = {
    width: 72,
    height: 48,
    anchor: { x: 36, y: 24 },
    pinOffsets: {
      pos: { x: 18, y: 0 },
      neg: { x: 54, y: 0 },
    },
  };
  workbenchFootprintRegistry.voltmeter = VOLTMETER_WORKBENCH;

  /** Push-button: 90x50, two pins. */
  footprintRegistry.button = {
    width: 90, height: 50,
    anchor: { x: 45, y: 25 },
    pinOffsets: { pin1: { x: 10, y: 25 }, pin2: { x: 80, y: 25 }, A1: { x: 10, y: 25 }, A2: { x: 10, y: 25 }, B1: { x: 80, y: 25 }, B2: { x: 80, y: 25 } },
  };

  /** Potentiometer schematic: resistor body IN–GND, wiper OUT. IN (10,25), OUT (45,8), GND (80,25). */
  const POT_SCHEMATIC: Footprint = {
    width: 90,
    height: 50,
    anchor: { x: 45, y: 25 },
    pinOffsets: {
      IN: { x: 10, y: 25 },
      OUT: { x: 45, y: 8 },
      GND: { x: 80, y: 25 },
    },
  };
  (footprintRegistry as Record<string, Footprint>).potentiometer = POT_SCHEMATIC;
  schematicFootprintRegistry.potentiometer = POT_SCHEMATIC;

  /** Potentiometer workbench: body + knob; pins at bottom. IN (15,55), OUT (45,55), GND (75,55). */
  const POT_WORKBENCH: Footprint = {
    width: 90,
    height: 60,
    anchor: { x: 45, y: 30 },
    pinOffsets: {
      IN: { x: 15, y: 55 },
      OUT: { x: 45, y: 55 },
      GND: { x: 75, y: 55 },
    },
  };
  workbenchFootprintRegistry.potentiometer = POT_WORKBENCH;

  /** Transistor schematic: B left-mid, C top-right, E bottom-right. */
  const TRANSISTOR_SCHEMATIC: Footprint = {
    width: 90,
    height: 60,
    anchor: { x: 45, y: 30 },
    pinOffsets: {
      B: { x: 15, y: 30 },
      C: { x: 75, y: 12 },
      E: { x: 75, y: 48 },
    },
  };
  (footprintRegistry as Record<string, Footprint>).transistor = TRANSISTOR_SCHEMATIC;
  schematicFootprintRegistry.transistor = TRANSISTOR_SCHEMATIC;

  /** Transistor workbench: TO-92 style with legs C-B-E. */
  const TRANSISTOR_WORKBENCH: Footprint = {
    width: 70,
    height: 80,
    anchor: { x: 35, y: 40 },
    pinOffsets: {
      C: { x: 20, y: 75 },
      B: { x: 35, y: 75 },
      E: { x: 50, y: 75 },
    },
  };
  workbenchFootprintRegistry.transistor = TRANSISTOR_WORKBENCH;

  /** Push button schematic footprints: P1 left, P2 right. */
  const PUSH_BUTTON_SCHEMATIC: Footprint = {
    width: 90,
    height: 50,
    anchor: { x: 45, y: 25 },
    pinOffsets: {
      P1: { x: 10, y: 25 },
      P2: { x: 80, y: 25 },
    },
  };
  (footprintRegistry as Record<string, Footprint>).push_button = PUSH_BUTTON_SCHEMATIC;
  (footprintRegistry as Record<string, Footprint>).push_button_momentary = PUSH_BUTTON_SCHEMATIC; // legacy
  (footprintRegistry as Record<string, Footprint>).push_button_latch = PUSH_BUTTON_SCHEMATIC; // legacy
  schematicFootprintRegistry.push_button = PUSH_BUTTON_SCHEMATIC;
  schematicFootprintRegistry.push_button_momentary = PUSH_BUTTON_SCHEMATIC; // legacy
  schematicFootprintRegistry.push_button_latch = PUSH_BUTTON_SCHEMATIC; // legacy

  /** Workbench push button footprints: two terminals at bottom. */
  const PUSH_BUTTON_WORKBENCH: Footprint = {
    width: 80,
    height: 50,
    anchor: { x: 40, y: 25 },
    pinOffsets: {
      P1: { x: 18, y: 45 },
      P2: { x: 62, y: 45 },
    },
  };
  workbenchFootprintRegistry.push_button = PUSH_BUTTON_WORKBENCH;
  workbenchFootprintRegistry.push_button_momentary = PUSH_BUTTON_WORKBENCH; // legacy
  workbenchFootprintRegistry.push_button_latch = PUSH_BUTTON_WORKBENCH; // legacy

  /** Buzzer: P (+), N (-). Default 60x50. */
  const BUZZER_FOOTPRINT: Footprint = {
    width: 60,
    height: 50,
    anchor: { x: 30, y: 25 },
    pinOffsets: {
      P: { x: 18, y: 45 },
      N: { x: 42, y: 45 },
      positive: { x: 18, y: 45 },
      negative: { x: 42, y: 45 },
    },
  };
  (footprintRegistry as Record<string, Footprint>).buzzer = BUZZER_FOOTPRINT;
  workbenchFootprintRegistry.buzzer = BUZZER_FOOTPRINT;

  /** Buzzer schematic: standard symbol, two pins left/right. */
  const BUZZER_SCHEMATIC: Footprint = {
    width: 50,
    height: 40,
    anchor: { x: 25, y: 20 },
    pinOffsets: {
      P: { x: 5, y: 20 },
      N: { x: 45, y: 20 },
      positive: { x: 5, y: 20 },
      negative: { x: 45, y: 20 },
    },
  };
  schematicFootprintRegistry.buzzer = BUZZER_SCHEMATIC;

  /** Capacitor (non-polar): 90x50, pins a (left), b (right). */
  const CAPACITOR_FOOTPRINT: Footprint = {
    width: 90,
    height: 50,
    anchor: { x: 45, y: 25 },
    pinOffsets: { a: { x: 10, y: 25 }, b: { x: 80, y: 25 } },
  };
  (footprintRegistry as Record<string, Footprint>).capacitor = CAPACITOR_FOOTPRINT;

  /** Capacitor schematic: two parallel plates | |, pins a (5,25), b (85,25). */
  const CAPACITOR_SCHEMATIC: Footprint = {
    width: 90,
    height: 50,
    anchor: { x: 45, y: 25 },
    pinOffsets: { a: { x: 5, y: 25 }, b: { x: 85, y: 25 } },
  };
  schematicFootprintRegistry.capacitor = CAPACITOR_SCHEMATIC;

  /** Capacitor polarized (electrolytic): P left, N right. */
  const CAPACITOR_POLARIZED_FOOTPRINT: Footprint = {
    width: 90,
    height: 50,
    anchor: { x: 45, y: 25 },
    pinOffsets: { P: { x: 10, y: 25 }, N: { x: 80, y: 25 }, pos: { x: 10, y: 25 }, neg: { x: 80, y: 25 } },
  };
  (footprintRegistry as Record<string, Footprint>).capacitor_polarized = CAPACITOR_POLARIZED_FOOTPRINT;

  /** Capacitor polarized schematic: P at (5,25), N at (85,25). */
  const CAPACITOR_POLARIZED_SCHEMATIC: Footprint = {
    width: 90,
    height: 50,
    anchor: { x: 45, y: 25 },
    pinOffsets: { P: { x: 5, y: 25 }, N: { x: 85, y: 25 }, pos: { x: 5, y: 25 }, neg: { x: 85, y: 25 } },
  };
  schematicFootprintRegistry.capacitor_polarized = CAPACITOR_POLARIZED_SCHEMATIC;
}

buildFootprints();

/** DC/AC motor workbench: larger body 80x70, pins P (left) and N (right) on centerline. */
const MOTOR_WORKBENCH: Footprint = {
  width: 80,
  height: 70,
  anchor: { x: 40, y: 35 },
  pinOffsets: {
    P: { x: 0, y: 35 },
    N: { x: 80, y: 35 },
  },
};
workbenchFootprintRegistry.motor_dc = MOTOR_WORKBENCH;
workbenchFootprintRegistry.motor_ac = MOTOR_WORKBENCH;

/** Motor schematic: 70x44, P at (8,22), N at (62,22) to match SchematicMotorDC/AC symbol. */
const MOTOR_SCHEMATIC: Footprint = {
  width: 70,
  height: 44,
  anchor: { x: 35, y: 22 },
  pinOffsets: {
    P: { x: 8, y: 22 },
    N: { x: 62, y: 22 },
  },
};
schematicFootprintRegistry.motor_dc = MOTOR_SCHEMATIC;
schematicFootprintRegistry.motor_ac = MOTOR_SCHEMATIC;

export type ViewMode = 'workbench' | 'schematic';

/** One footprint per component type. With viewMode, view-specific overrides are used when available. */
export function getFootprint(
  componentType: SimComponent['type'] | string,
  viewMode?: ViewMode
): Footprint | undefined {
  const base =
    footprintRegistry[componentType as SimComponent['type']] ??
    (footprintRegistry as Record<string, Footprint>)[componentType];
  if (viewMode === 'workbench' && workbenchFootprintRegistry) {
    const workbench =
      workbenchFootprintRegistry[componentType as SimComponent['type']] ??
      (workbenchFootprintRegistry as Record<string, Footprint>)[componentType];
    if (workbench) return workbench;
  }
  if (viewMode === 'schematic' && schematicFootprintRegistry) {
    const schematic =
      schematicFootprintRegistry[componentType as SimComponent['type']] ??
      (schematicFootprintRegistry as Record<string, Footprint>)[componentType];
    if (schematic) return schematic;
  }
  return base;
}
