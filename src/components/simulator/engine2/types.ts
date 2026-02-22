/**
 * Engine2: canonical pin IDs and shared types.
 * UI/definitions may use A/K, P/N, pin1/pin2; engine uses only canonical IDs.
 */

import type { SimComponent, Wire, SimState } from '../types';
import { getSwitchVariantId } from '../registry';

export const PIN_ALIAS: Record<string, string> = {
  // DC supply and voltmeter use pos/neg (no alias so they stay as-is)
  A: 'anode',
  K: 'cathode',
  pin1: 'a',
  pin2: 'b',
  vcc: 'IN',
  signal: 'OUT',
  out: 'OUT',
  gnd: 'GND',
  b: 'B',
  c: 'C',
  e: 'E',
  p1: 'P1',
  p2: 'P2',
  // Motor: accept common labels -> P/N (canonical for motor_dc / motor_ac)
  'M+': 'P',
  'M-': 'N',
  '+': 'P',
  '-': 'N',
  POS: 'P',
  NEG: 'N',
  positive: 'P',
  negative: 'N',
};

export function canonPinId(pinId: string): string {
  return PIN_ALIAS[pinId] ?? pinId;
}

export function pinKey(componentId: string, pinId: string): string {
  return `${componentId}:${canonPinId(pinId)}`;
}

/** Canonical pin IDs per component type (engine expects these). */
export const CANONICAL_PINS: Record<string, string[]> = {
  dc_supply: ['pos', 'neg'],
  ground: ['gnd'],
  switch: ['a', 'b'],
  resistor: ['a', 'b'],
  led: ['anode', 'cathode'],
  button: ['a', 'b'],
  buzzer: ['P', 'N'],
  junction: ['J'],
  power_rail: ['out'],
  esp32: ['3v3', 'gnd', 'gpio2', 'gpio4', 'gpio5', 'gpio18', 'gpio19', 'gpio21', 'gpio22', 'gpio23'],
  pot: ['vcc', 'signal', 'gnd'],
  potentiometer: ['IN', 'OUT', 'GND'],
  pir: ['vcc', 'signal', 'gnd'],
  ultrasonic: ['vcc', 'trig', 'echo', 'gnd'],
  ds18b20: ['vcc', 'data', 'gnd'],
  servo: ['vcc', 'signal', 'gnd'],
  motor_dc: ['P', 'N'],
  motor_ac: ['P', 'N'],
  voltmeter: ['pos', 'neg'],
  transistor: ['B', 'C', 'E'],
  push_button: ['P1', 'P2'],
  push_button_momentary: ['P1', 'P2'],
  push_button_latch: ['P1', 'P2'],
  capacitor: ['a', 'b'],
  capacitor_polarized: ['P', 'N'],
  rgb_led: ['R', 'G', 'B', 'COM'],
};

/** Resolve component's pin to canonical; switch SPDT uses P1,P2,P3; SPST uses a,b. */
export function getCanonicalPinIds(comp: SimComponent): string[] {
  const type = comp.type as string;
  if (type === 'switch' || type === 'toggle-switch') {
    const variantId = getSwitchVariantId(comp.variantId);
    if (variantId === 'SPDT') return ['P1', 'P2', 'P3'];
    if (variantId === 'DPST') return ['P1', 'P2', 'P3', 'P4'];
    if (variantId === 'DPDT') return ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];
  }
  const canonical = CANONICAL_PINS[type];
  if (canonical) return canonical;
  return (comp.pins ?? []).map((p) => canonPinId(p.id));
}

/** Audit: wire endpoints must reference existing pins (after canonical mapping). */
export function auditWirePins(components: SimComponent[], wires: Wire[]): string[] {
  const compById = new Map(components.map((c) => [c.id, c]));
  const errors: string[] = [];
  for (const w of wires) {
    for (const end of [w.from, w.to]) {
      if (!end) continue;
      const comp = compById.get(end.componentId);
      if (!comp) {
        errors.push(`Wire ${w.id}: missing component ${end.componentId}`);
        continue;
      }
      const canonical = canonPinId(end.pinId);
      const validIds = getCanonicalPinIds(comp);
      const hasPin = comp.pins?.some((p) => canonPinId(p.id) === canonical) || validIds.includes(canonical);
      if (!hasPin) {
        errors.push(
          `Wire ${w.id}: ${comp.type}(${comp.id}) has no pin "${end.pinId}" (canonical: "${canonical}"). Valid: [${validIds.join(', ')}]`
        );
      }
    }
  }
  return errors;
}

export type { SimState, SimComponent, Wire };
