/**
 * Engine2: Build nets from wires and ideal closures (switch ON, GND).
 * Union-find over canonical pin keys. Wire polyline points are visual only.
 */

import type { SimComponent, Wire } from '../types';
import { pinKey, canonPinId, getCanonicalPinIds } from './types';
import { getSwitchVariantId } from '../registry';

export interface Net {
  id: string;
  pins: string[]; // pinKey list
}

/** Structured connectivity issues for UI/debug (not just strings). */
export type ConnectivityIssue =
  | { type: 'WIRE_PIN_MISSING'; wireId: string; end: 'from' | 'to'; componentId: string; pinId: string }
  | { type: 'NO_REFERENCE_NODE' }
  | { type: 'OPEN_SWITCH_FLOATING'; componentId: string }
  | { type: 'UNUSED_PIN'; pinKey: string };

export interface NetsResult {
  nets: Map<string, Net>;
  pinToNetId: Record<string, string>;
  /** Structured issues for UI/debug. */
  issues: ConnectivityIssue[];
  /** Backward compatibility: human-readable strings derived from issues. */
  errors: string[];
}

function unionFind<T>(elements: T[]): {
  parent: Map<T, T>;
  find: (x: T) => T;
  union: (x: T, y: T) => void;
} {
  const parent = new Map<T, T>();
  for (const e of elements) parent.set(e, e);
  const find = (x: T): T => {
    const p = parent.get(x)!;
    if (p === x) return x;
    const root = find(p);
    parent.set(x, root);
    return root;
  };
  const union = (x: T, y: T) => {
    const rx = find(x);
    const ry = find(y);
    if (rx !== ry) parent.set(rx, ry);
  };
  return { parent, find, union };
}

function collectWirePinIssues(components: SimComponent[], wires: Wire[]): ConnectivityIssue[] {
  const compById = new Map(components.map((c) => [c.id, c]));
  const issues: ConnectivityIssue[] = [];
  for (const w of wires) {
    const ends: { end: 'from' | 'to'; compId: string; pinId: string }[] = [];
    if (w.from) ends.push({ end: 'from', compId: w.from.componentId, pinId: w.from.pinId });
    if (w.to) ends.push({ end: 'to', compId: w.to.componentId, pinId: w.to.pinId });
    for (const { end, compId, pinId } of ends) {
      const comp = compById.get(compId);
      if (!comp) {
        issues.push({ type: 'WIRE_PIN_MISSING', wireId: w.id, end, componentId: compId, pinId });
        continue;
      }
      const canonical = canonPinId(pinId);
      const validIds = getCanonicalPinIds(comp);
      let hasPin =
        comp.pins?.some((p) => canonPinId(p.id) === canonical) || validIds.includes(canonical);
      if (!hasPin && ((comp.type as string) === 'motor_dc' || (comp.type as string) === 'motor_ac')) {
        if (pinId === 'a' || pinId === 'b') hasPin = true; // legacy wire endpoints
      }
      if (!hasPin) {
        issues.push({ type: 'WIRE_PIN_MISSING', wireId: w.id, end, componentId: compId, pinId });
      }
    }
  }
  return issues;
}

function issueToMessage(i: ConnectivityIssue): string {
  switch (i.type) {
    case 'WIRE_PIN_MISSING':
      return `Wire ${i.wireId}: ${i.end} pin ${i.componentId}:${i.pinId} missing or invalid`;
    case 'NO_REFERENCE_NODE':
      return 'No reference node (no ground symbol and no dc_supply)';
    case 'OPEN_SWITCH_FLOATING':
      return `Switch ${i.componentId} open and pin(s) may be floating`;
    case 'UNUSED_PIN':
      return `Unused pin ${i.pinKey}`;
    default:
      return String(i);
  }
}

/** For nets, normalize pin id so motor/buzzer use canonical P/N and netlist lookups succeed. */
function pinIdForNet(comp: SimComponent | undefined, pinId: string): string {
  if (!comp) return canonPinId(pinId);
  if ((comp.type as string) === 'motor_dc' || (comp.type as string) === 'motor_ac') {
    if (pinId === 'a') return 'P';
    if (pinId === 'b') return 'N';
  }
  if (comp.type === 'buzzer') {
    if (pinId === 'pos' || pinId === 'P' || pinId === '+') return 'P';
    if (pinId === 'neg' || pinId === 'N' || pinId === '-') return 'N';
  }
  if ((comp.type as string) === 'capacitor_polarized') {
    if (pinId === 'pos' || pinId === 'P' || pinId === '+') return 'P';
    if (pinId === 'neg' || pinId === 'N' || pinId === '-') return 'N';
  }
  return canonPinId(pinId);
}

/** Build nets: union-find over all pin keys (from wires + all component pins). */
export function buildNets(components: SimComponent[], wires: Wire[]): NetsResult {
  const issues = collectWirePinIssues(components, wires);
  const compById = new Map(components.map((c) => [c.id, c]));

  const allPinKeys = new Set<string>();
  for (const c of components) {
    if (c.pins?.length) {
      for (const p of c.pins) {
        allPinKeys.add(pinKey(c.id, p.id));
      }
    }
    // So netlist getNode(compId, 'P'/'N') finds a key; wires may store pos/neg but solver uses P/N.
    if (c.type === 'buzzer') {
      allPinKeys.add(pinKey(c.id, 'P'));
      allPinKeys.add(pinKey(c.id, 'N'));
    }
    if (c.type === 'capacitor') {
      allPinKeys.add(pinKey(c.id, 'a'));
      allPinKeys.add(pinKey(c.id, 'b'));
    }
    if ((c.type as string) === 'capacitor_polarized') {
      allPinKeys.add(pinKey(c.id, 'P'));
      allPinKeys.add(pinKey(c.id, 'N'));
    }
    if (c.type === 'rgb_led') {
      allPinKeys.add(pinKey(c.id, 'R'));
      allPinKeys.add(pinKey(c.id, 'G'));
      allPinKeys.add(pinKey(c.id, 'B'));
      allPinKeys.add(pinKey(c.id, 'COM'));
    }
  }
  for (const w of wires) {
    if (w.from) {
      const comp = compById.get(w.from.componentId);
      allPinKeys.add(pinKey(w.from.componentId, pinIdForNet(comp, w.from.pinId)));
    }
    if (w.to) {
      const comp = compById.get(w.to.componentId);
      allPinKeys.add(pinKey(w.to.componentId, pinIdForNet(comp, w.to.pinId)));
    }
  }

  const uf = unionFind([...allPinKeys]);

  for (const w of wires) {
    if (w.from && w.to) {
      const compFrom = compById.get(w.from.componentId);
      const compTo = compById.get(w.to.componentId);
      const ka = pinKey(w.from.componentId, pinIdForNet(compFrom, w.from.pinId));
      const kb = pinKey(w.to.componentId, pinIdForNet(compTo, w.to.pinId));
      uf.union(ka, kb);
    }
  }

  for (const c of components) {
    if (c.type === 'switch' || (c.type as string) === 'toggle-switch') {
      const variantId = getSwitchVariantId(c.variantId);
      if (variantId === 'SPDT') {
        const position = (c.props?.position as string) === 'B' ? 'B' : 'A';
        const kCom = pinKey(c.id, 'P2');
        const kA = pinKey(c.id, 'P1');
        const kB = pinKey(c.id, 'P3');
        if (position === 'A' && allPinKeys.has(kCom) && allPinKeys.has(kA)) uf.union(kCom, kA);
        if (position === 'B' && allPinKeys.has(kCom) && allPinKeys.has(kB)) uf.union(kCom, kB);
      } else if (variantId === 'DPST' && c.props?.on) {
        const k1 = pinKey(c.id, 'P1');
        const k2 = pinKey(c.id, 'P2');
        const k3 = pinKey(c.id, 'P3');
        const k4 = pinKey(c.id, 'P4');
        if (allPinKeys.has(k1) && allPinKeys.has(k2)) uf.union(k1, k2);
        if (allPinKeys.has(k3) && allPinKeys.has(k4)) uf.union(k3, k4);
      } else if (variantId === 'DPDT') {
        const position = (c.props?.position as string) === 'B' ? 'B' : 'A';
        const kP1 = pinKey(c.id, 'P1');
        const kP2 = pinKey(c.id, 'P2');
        const kP3 = pinKey(c.id, 'P3');
        const kP4 = pinKey(c.id, 'P4');
        const kP5 = pinKey(c.id, 'P5');
        const kP6 = pinKey(c.id, 'P6');
        if (position === 'A') {
          if (allPinKeys.has(kP2) && allPinKeys.has(kP1)) uf.union(kP2, kP1);
          if (allPinKeys.has(kP5) && allPinKeys.has(kP4)) uf.union(kP5, kP4);
        } else {
          if (allPinKeys.has(kP2) && allPinKeys.has(kP3)) uf.union(kP2, kP3);
          if (allPinKeys.has(kP5) && allPinKeys.has(kP6)) uf.union(kP5, kP6);
        }
      } else if (c.props?.on) {
        const pins = getCanonicalPinIds(c);
        if (pins.length >= 2) {
          const ka = pinKey(c.id, pins[0]!);
          const kb = pinKey(c.id, pins[1]!);
          if (allPinKeys.has(ka) && allPinKeys.has(kb)) uf.union(ka, kb);
        }
      }
    }
    if (((c.type as string) === 'push_button' || (c.type as string) === 'push_button_momentary' || (c.type as string) === 'push_button_latch') && c.props?.isClosed) {
      const pins = getCanonicalPinIds(c);
      if (pins.length >= 2) {
        const ka = pinKey(c.id, pins[0]!);
        const kb = pinKey(c.id, pins[1]!);
        if (allPinKeys.has(ka) && allPinKeys.has(kb)) uf.union(ka, kb);
      }
    }
  }

  // Global ground: union ALL GND-like pins into one net (ground symbols, dc_supply neg, power_rail gnd, esp32 gnd)
  const gndKeys: string[] = [];
  for (const c of components) {
    if (c.type === 'ground') {
      for (const p of c.pins ?? []) {
        const key = pinKey(c.id, p.id);
        if (allPinKeys.has(key)) gndKeys.push(key);
      }
      continue;
    }
    if (c.type === 'dc_supply') {
      const key = pinKey(c.id, 'neg');
      if (allPinKeys.has(key)) gndKeys.push(key);
      continue;
    }
    if (c.type === 'power_rail' && (c.props?.kind as string) === 'gnd') {
      const key = pinKey(c.id, 'out');
      if (allPinKeys.has(key)) gndKeys.push(key);
      continue;
    }
    if (c.type === 'esp32') {
      for (const p of c.pins ?? []) {
        if (canonPinId(p.id) === 'gnd') {
          const key = pinKey(c.id, p.id);
          if (allPinKeys.has(key)) gndKeys.push(key);
        }
      }
    }
  }

  if (gndKeys.length > 0) {
    for (let i = 1; i < gndKeys.length; i++) {
      uf.union(gndKeys[0]!, gndKeys[i]!);
    }
  }

  const hasGroundNet = gndKeys.length > 0;
  if (!hasGroundNet && components.length > 0) {
    issues.push({ type: 'NO_REFERENCE_NODE' });
  }

  const rootToPins = new Map<string, string[]>();
  for (const key of allPinKeys) {
    const root = uf.find(key);
    let list = rootToPins.get(root);
    if (!list) {
      list = [];
      rootToPins.set(root, list);
    }
    list.push(key);
  }

  for (const [root, pins] of rootToPins) {
    pins.sort();
  }

  const sortedRoots = [...rootToPins.entries()].sort((a, b) => {
    const minA = a[1].length > 0 ? a[1][0]! : '';
    const minB = b[1].length > 0 ? b[1][0]! : '';
    return minA.localeCompare(minB);
  });

  const nets = new Map<string, Net>();
  const pinToNetId: Record<string, string> = {};
  let netCounter = 0;
  for (const [, pins] of sortedRoots) {
    const netId = `n${netCounter++}`;
    nets.set(netId, { id: netId, pins: [...pins] });
    for (const p of pins) pinToNetId[p] = netId;
  }

  const errors = issues.map(issueToMessage);

  return { nets, pinToNetId, issues, errors };
}
