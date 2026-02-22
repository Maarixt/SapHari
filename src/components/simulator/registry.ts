/**
 * Component definitions and variants: pins per variant, pin migration on variant change.
 * Used by Inspector (variant dropdown) and by store when applying SET_VARIANT.
 */

import type { PinDef } from './types';
import { PinKind } from './types';

export type SwitchVariantId = 'SPST' | 'SPDT' | 'DPST' | 'DPDT';

const digital: PinKind = 'digital';

/** Switch variant definitions: pin ids and positions (local to symbol). */
export const SWITCH_VARIANTS: Record<
  SwitchVariantId,
  { label: string; pins: PinDef[] }
> = {
  SPST: {
    label: 'SPST',
    pins: [
      { id: 'pin1', label: '1', kind: digital, x: 0, y: 0 },
      { id: 'pin2', label: '2', kind: digital, x: 10, y: 0 },
    ],
  },
  SPDT: {
    label: 'SPDT',
    pins: [
      { id: 'P1', label: 'A', kind: digital, x: 80, y: 12 },
      { id: 'P2', label: 'COM', kind: digital, x: 10, y: 25 },
      { id: 'P3', label: 'B', kind: digital, x: 80, y: 38 },
    ],
  },
  DPST: {
    label: 'DPST',
    pins: [
      { id: 'P1', label: 'P1', kind: digital, x: 10, y: 15 },
      { id: 'P2', label: 'P2', kind: digital, x: 80, y: 15 },
      { id: 'P3', label: 'P3', kind: digital, x: 10, y: 35 },
      { id: 'P4', label: 'P4', kind: digital, x: 80, y: 35 },
    ],
  },
  DPDT: {
    label: 'DPDT',
    pins: [
      { id: 'P1', label: 'A1', kind: digital, x: 15, y: 10 },
      { id: 'P2', label: 'COM1', kind: digital, x: 15, y: 25 },
      { id: 'P3', label: 'B1', kind: digital, x: 15, y: 40 },
      { id: 'P4', label: 'A2', kind: digital, x: 85, y: 10 },
      { id: 'P5', label: 'COM2', kind: digital, x: 85, y: 25 },
      { id: 'P6', label: 'B2', kind: digital, x: 85, y: 40 },
    ],
  },
};

/** Default switch variant when none set (backward compat). */
export const DEFAULT_SWITCH_VARIANT: SwitchVariantId = 'SPST';

/**
 * Pin id mapping when changing switch variant: oldId -> newId (or undefined = detach).
 * Used to migrate wire endpoints. If old pin has no entry, we try by index (pin1->first, etc).
 */
export const SWITCH_PIN_MIGRATION: Partial<
  Record<SwitchVariantId, Partial<Record<string, string>>>
> = {
  SPST: { pin1: 'pin1', pin2: 'pin2' },
  SPDT: {
    pin1: 'P1',
    pin2: 'P2',
    pin3: 'P3',
    com: 'P2',
    no: 'P1',
    nc: 'P3',
    P1: 'P1',
    P2: 'P2',
    P3: 'P3',
  },
  DPST: {
    pin1: 'P1',
    pin2: 'P2',
    pin3: 'P3',
    pin4: 'P4',
    a1: 'P1',
    a2: 'P2',
    b1: 'P3',
    b2: 'P4',
    P1: 'P1',
    P2: 'P2',
    P3: 'P3',
    P4: 'P4',
  },
  DPDT: {
    pin1: 'P1',
    pin2: 'P2',
    pin3: 'P3',
    pin4: 'P4',
    pin5: 'P5',
    pin6: 'P6',
    acom: 'P2',
    ano: 'P1',
    anc: 'P3',
    bcom: 'P5',
    bno: 'P4',
    bnc: 'P6',
    P1: 'P1',
    P2: 'P2',
    P3: 'P3',
    P4: 'P4',
    P5: 'P5',
    P6: 'P6',
  },
};

/**
 * Get effective switch variant id from component (variantId or default).
 */
export function getSwitchVariantId(variantId?: string): SwitchVariantId {
  if (variantId && SWITCH_VARIANTS[variantId as SwitchVariantId]) {
    return variantId as SwitchVariantId;
  }
  return DEFAULT_SWITCH_VARIANT;
}

/**
 * Resolve pin migration: old variant pin id -> new variant pin id.
 * Returns undefined if wire should be detached.
 */
export function migrateSwitchPin(
  oldVariantId: string,
  newVariantId: string,
  oldPinId: string
): string | undefined {
  const map = SWITCH_PIN_MIGRATION[newVariantId as SwitchVariantId];
  if (!map) return undefined;
  const direct = map[oldPinId];
  if (direct) return direct;
  const oldV = SWITCH_VARIANTS[oldVariantId as SwitchVariantId];
  const newV = SWITCH_VARIANTS[newVariantId as SwitchVariantId];
  if (!oldV || !newV) return undefined;
  const oldIdx = oldV.pins.findIndex((p) => p.id === oldPinId);
  if (oldIdx < 0) return undefined;
  const newPin = newV.pins[oldIdx];
  return newPin?.id;
}
