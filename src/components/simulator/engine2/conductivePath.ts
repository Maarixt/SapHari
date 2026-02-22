/**
 * Engine2: Conductive and topology connectivity between nets.
 * - Topology: wires + closed switches + LEDs (always, bidirectional) — "is it wired?"
 * - Conductive: resistor, switch when ON, LED only when forward-biased (directed anode→cathode).
 */

import type { SimComponent } from '../types';
import { pinKey, canonPinId } from './types';
import { getSwitchVariantId } from '../registry';

export type DiodeState = 'OFF' | 'ON' | 'BREAKDOWN';

export interface ConductivePathOptions {
  /** Component IDs to exclude when building edges (e.g. the LED we're testing). */
  excludeComponentIds?: string[];
  /** LED id -> true if forward-biased. When set, adds directed edge anodeNet→cathodeNet for those LEDs. */
  ledForwardBias?: Map<string, boolean> | Record<string, boolean>;
  /** Diode id -> state. When ON: directed edge anodeNet→cathodeNet. When BREAKDOWN: cathodeNet→anodeNet. */
  diodeStates?: Map<string, DiodeState> | Record<string, DiodeState>;
}

/**
 * Whether a component conducts between its two pins (for conductive path).
 * Resistor: always. Switch: only when ON. LED: only via ledForwardBias (directed).
 */
function componentConducts(
  c: SimComponent,
  pinIdA: string,
  pinIdB: string
): boolean {
  if (c.type === 'resistor') return true;
  if ((c.type as string) === 'potentiometer') return true;
  if ((c.type as string) === 'transistor') {
    const on = c.props?.transistorOn === true;
    const a = pinIdA.toUpperCase();
    const b = pinIdB.toUpperCase();
    if ((a === 'B' && b === 'E') || (a === 'E' && b === 'B')) return on;
    if ((a === 'C' && b === 'E') || (a === 'E' && b === 'C')) return on;
    return false;
  }
  if ((c.type as string) === 'push_button' || (c.type as string) === 'push_button_momentary' || (c.type as string) === 'push_button_latch') {
    return !!c.props?.isClosed;
  }
  if ((c.type as string) === 'motor_dc' || (c.type as string) === 'motor_ac') {
    const a = canonPinId(pinIdA).toUpperCase();
    const b = canonPinId(pinIdB).toUpperCase();
    return (a === 'P' && b === 'N') || (a === 'N' && b === 'P');
  }
  if (c.type === 'buzzer') {
    const a = canonPinId(pinIdA).toLowerCase();
    const b = canonPinId(pinIdB).toLowerCase();
    return (a === 'p' && b === 'n') || (a === 'n' && b === 'p') || (a === 'pos' && b === 'neg') || (a === 'neg' && b === 'pos');
  }
  if (c.type === 'capacitor') {
    const a = canonPinId(pinIdA).toLowerCase();
    const b = canonPinId(pinIdB).toLowerCase();
    return (a === 'a' && b === 'b') || (a === 'b' && b === 'a');
  }
  if (c.type === 'rgb_led') {
    const a = canonPinId(pinIdA).toUpperCase();
    const b = canonPinId(pinIdB).toUpperCase();
    const com = a === 'COM' || b === 'COM';
    const rgb = (a === 'R' || a === 'G' || a === 'B') && (b === 'R' || b === 'G' || b === 'B');
    return com && (a === 'R' || a === 'G' || a === 'B' || b === 'R' || b === 'G' || b === 'B') && !rgb;
  }
  if ((c.type as string) === 'capacitor_polarized') {
    const a = canonPinId(pinIdA).toUpperCase();
    const b = canonPinId(pinIdB).toUpperCase();
    return (a === 'P' && b === 'N') || (a === 'N' && b === 'P');
  }
  if (c.type === 'switch' || (c.type as string) === 'toggle-switch') {
    const variantId = getSwitchVariantId(c.variantId);
    if (variantId === 'SPDT') {
      const position = (c.props?.position as string) === 'B' ? 'B' : 'A';
      const a = pinIdA.toUpperCase();
      const b = pinIdB.toUpperCase();
      const p1 = a === 'P1' || b === 'P1';
      const p2 = a === 'P2' || b === 'P2';
      const p3 = a === 'P3' || b === 'P3';
      if (position === 'A' && p2 && p1) return true;
      if (position === 'B' && p2 && p3) return true;
      return false;
    }
    if (variantId === 'DPST') {
      if (!c.props?.on) return false;
      const a = pinIdA.toUpperCase();
      const b = pinIdB.toUpperCase();
      if ((a === 'P1' && b === 'P2') || (a === 'P2' && b === 'P1')) return true;
      if ((a === 'P3' && b === 'P4') || (a === 'P4' && b === 'P3')) return true;
      return false;
    }
    if (variantId === 'DPDT') {
      const position = (c.props?.position as string) === 'B' ? 'B' : 'A';
      const a = pinIdA.toUpperCase();
      const b = pinIdB.toUpperCase();
      if (position === 'A') {
        if ((a === 'P2' && b === 'P1') || (a === 'P1' && b === 'P2')) return true;
        if ((a === 'P5' && b === 'P4') || (a === 'P4' && b === 'P5')) return true;
      } else {
        if ((a === 'P2' && b === 'P3') || (a === 'P3' && b === 'P2')) return true;
        if ((a === 'P5' && b === 'P6') || (a === 'P6' && b === 'P5')) return true;
      }
      return false;
    }
    return !!(c.props?.on);
  }
  return false;
}

/**
 * Topology adjacency: nets connected by wires + closed switches + LEDs (ignoring bias).
 * Used to answer "is the circuit wired in a loop?" without requiring LEDs to be on.
 */
export function buildTopologyAdjacency(
  components: SimComponent[],
  pinToNetId: Record<string, string>
): Map<string, Set<string>> {
  const adjacent = new Map<string, Set<string>>();
  const ensure = (netId: string) => {
    if (!adjacent.has(netId)) adjacent.set(netId, new Set());
    return adjacent.get(netId)!;
  };

  for (const c of components) {
    const pins = c.pins;
    if (!pins || pins.length < 2) continue;
    if (c.type === 'resistor') {
      const keyA = pinKey(c.id, 'a');
      const keyB = pinKey(c.id, 'b');
      const netA = pinToNetId[keyA];
      const netB = pinToNetId[keyB];
      if (netA && netB && netA !== netB) {
        ensure(netA).add(netB);
        ensure(netB).add(netA);
      }
      continue;
    }
    if (c.type === 'switch' || (c.type as string) === 'toggle-switch') {
      const variantId = getSwitchVariantId(c.variantId);
      if (variantId === 'SPDT') {
        const position = (c.props?.position as string) === 'B' ? 'B' : 'A';
        const keyCom = pinKey(c.id, 'P2');
        const keyA = pinKey(c.id, 'P1');
        const keyB = pinKey(c.id, 'P3');
        const netCom = pinToNetId[keyCom];
        const netA = pinToNetId[keyA];
        const netB = pinToNetId[keyB];
        if (position === 'A' && netCom && netA && netCom !== netA) {
          ensure(netCom).add(netA);
          ensure(netA).add(netCom);
        }
        if (position === 'B' && netCom && netB && netCom !== netB) {
          ensure(netCom).add(netB);
          ensure(netB).add(netCom);
        }
      } else if (variantId === 'DPST' && c.props?.on) {
        const netP1 = pinToNetId[pinKey(c.id, 'P1')];
        const netP2 = pinToNetId[pinKey(c.id, 'P2')];
        const netP3 = pinToNetId[pinKey(c.id, 'P3')];
        const netP4 = pinToNetId[pinKey(c.id, 'P4')];
        if (netP1 && netP2 && netP1 !== netP2) {
          ensure(netP1).add(netP2);
          ensure(netP2).add(netP1);
        }
        if (netP3 && netP4 && netP3 !== netP4) {
          ensure(netP3).add(netP4);
          ensure(netP4).add(netP3);
        }
      } else if (variantId === 'DPDT') {
        const position = (c.props?.position as string) === 'B' ? 'B' : 'A';
        const netP1 = pinToNetId[pinKey(c.id, 'P1')];
        const netP2 = pinToNetId[pinKey(c.id, 'P2')];
        const netP3 = pinToNetId[pinKey(c.id, 'P3')];
        const netP4 = pinToNetId[pinKey(c.id, 'P4')];
        const netP5 = pinToNetId[pinKey(c.id, 'P5')];
        const netP6 = pinToNetId[pinKey(c.id, 'P6')];
        if (position === 'A') {
          if (netP2 && netP1 && netP2 !== netP1) { ensure(netP2).add(netP1); ensure(netP1).add(netP2); }
          if (netP5 && netP4 && netP5 !== netP4) { ensure(netP5).add(netP4); ensure(netP4).add(netP5); }
        } else {
          if (netP2 && netP3 && netP2 !== netP3) { ensure(netP2).add(netP3); ensure(netP3).add(netP2); }
          if (netP5 && netP6 && netP5 !== netP6) { ensure(netP5).add(netP6); ensure(netP6).add(netP5); }
        }
      } else if (c.props?.on) {
        const keyA = pinKey(c.id, 'a');
        const keyB = pinKey(c.id, 'b');
        const netA = pinToNetId[keyA];
        const netB = pinToNetId[keyB];
        if (netA && netB && netA !== netB) {
          ensure(netA).add(netB);
          ensure(netB).add(netA);
        }
      }
      continue;
    }
    if (((c.type as string) === 'push_button' || (c.type as string) === 'push_button_momentary' || (c.type as string) === 'push_button_latch') && c.props?.isClosed) {
      const keyA = pinKey(c.id, 'P1');
      const keyB = pinKey(c.id, 'P2');
      const netA = pinToNetId[keyA];
      const netB = pinToNetId[keyB];
      if (netA && netB && netA !== netB) {
        ensure(netA).add(netB);
        ensure(netB).add(netA);
      }
      continue;
    }
    if (c.type === 'led') {
      const anodeNet = pinToNetId[pinKey(c.id, 'anode')] ?? pinToNetId[pinKey(c.id, 'A')];
      const cathodeNet = pinToNetId[pinKey(c.id, 'cathode')] ?? pinToNetId[pinKey(c.id, 'K')];
      if (anodeNet && cathodeNet && anodeNet !== cathodeNet) {
        ensure(anodeNet).add(cathodeNet);
        ensure(cathodeNet).add(anodeNet);
      }
      continue;
    }
    if ((c.type as string) === 'diode') {
      const anodeNet = pinToNetId[pinKey(c.id, 'A')] ?? pinToNetId[pinKey(c.id, 'anode')];
      const cathodeNet = pinToNetId[pinKey(c.id, 'K')] ?? pinToNetId[pinKey(c.id, 'cathode')];
      if (anodeNet && cathodeNet && anodeNet !== cathodeNet) {
        ensure(anodeNet).add(cathodeNet);
        ensure(cathodeNet).add(anodeNet);
      }
      continue;
    }
    if (c.type === 'rgb_led') {
      const netR = pinToNetId[pinKey(c.id, 'R')];
      const netG = pinToNetId[pinKey(c.id, 'G')];
      const netB = pinToNetId[pinKey(c.id, 'B')];
      const netCOM = pinToNetId[pinKey(c.id, 'COM')];
      if (netR && netCOM && netR !== netCOM) { ensure(netR).add(netCOM); ensure(netCOM).add(netR); }
      if (netG && netCOM && netG !== netCOM) { ensure(netG).add(netCOM); ensure(netCOM).add(netG); }
      if (netB && netCOM && netB !== netCOM) { ensure(netB).add(netCOM); ensure(netCOM).add(netB); }
      continue;
    }
    if ((c.type as string) === 'motor_dc' || (c.type as string) === 'motor_ac') {
      const netP = pinToNetId[pinKey(c.id, 'P')];
      const netN = pinToNetId[pinKey(c.id, 'N')];
      if (netP && netN && netP !== netN) {
        ensure(netP).add(netN);
        ensure(netN).add(netP);
      }
      continue;
    }
    if (c.type === 'capacitor') {
      const netA = pinToNetId[pinKey(c.id, 'a')];
      const netB = pinToNetId[pinKey(c.id, 'b')];
      if (netA && netB && netA !== netB) {
        ensure(netA).add(netB);
        ensure(netB).add(netA);
      }
      continue;
    }
    if ((c.type as string) === 'capacitor_polarized') {
      const netP = pinToNetId[pinKey(c.id, 'P')];
      const netN = pinToNetId[pinKey(c.id, 'N')];
      if (netP && netN && netP !== netN) {
        ensure(netP).add(netN);
        ensure(netN).add(netP);
      }
      continue;
    }
    if ((c.type as string) === 'potentiometer') {
      const netIn = pinToNetId[pinKey(c.id, 'IN')];
      const netOut = pinToNetId[pinKey(c.id, 'OUT')];
      const netGnd = pinToNetId[pinKey(c.id, 'GND')];
      if (netIn && netOut && netIn !== netOut) { ensure(netIn).add(netOut); ensure(netOut).add(netIn); }
      if (netOut && netGnd && netOut !== netGnd) { ensure(netOut).add(netGnd); ensure(netGnd).add(netOut); }
      if (netIn && netGnd && netIn !== netGnd) { ensure(netIn).add(netGnd); ensure(netGnd).add(netIn); }
      continue;
    }
    if ((c.type as string) === 'transistor' && c.props?.transistorOn) {
      const netB = pinToNetId[pinKey(c.id, 'B')];
      const netC = pinToNetId[pinKey(c.id, 'C')];
      const netE = pinToNetId[pinKey(c.id, 'E')];
      if (netB && netE && netB !== netE) { ensure(netB).add(netE); ensure(netE).add(netB); }
      if (netC && netE && netC !== netE) { ensure(netC).add(netE); ensure(netE).add(netC); }
    }
  }
  return adjacent;
}

/**
 * True if there is a topology path (wires + switches + LEDs as connections) from start to target.
 */
export function hasTopologyPath(
  components: SimComponent[],
  pinToNetId: Record<string, string>,
  startNetId: string,
  targetNetId: string
): boolean {
  if (startNetId === targetNetId) return true;
  const adjacent = buildTopologyAdjacency(components, pinToNetId);
  const visited = new Set<string>();
  const queue: string[] = [startNetId];
  visited.add(startNetId);
  while (queue.length > 0) {
    const netId = queue.shift()!;
    for (const next of adjacent.get(netId) ?? []) {
      if (visited.has(next)) continue;
      if (next === targetNetId) return true;
      visited.add(next);
      queue.push(next);
    }
  }
  return false;
}

/**
 * Build conductive adjacency: netId -> Set of netIds reachable in one hop.
 * Resistor/switch: bidirectional. LED: directed anodeNet→cathodeNet only when ledForwardBias[id].
 */
export function buildConductiveAdjacency(
  components: SimComponent[],
  pinToNetId: Record<string, string>,
  options?: ConductivePathOptions
): Map<string, Set<string>> {
  const exclude = new Set(options?.excludeComponentIds ?? []);
  const ledBias = options?.ledForwardBias;
  const ledOn = (id: string) =>
    ledBias instanceof Map ? ledBias.get(id) : ledBias != null && (ledBias as Record<string, boolean>)[id];
  const diodeStates = options?.diodeStates;
  const diodeState = (id: string): DiodeState | undefined =>
    diodeStates instanceof Map ? diodeStates.get(id) : diodeStates != null ? (diodeStates as Record<string, DiodeState>)[id] : undefined;
  const adjacent = new Map<string, Set<string>>();

  const ensure = (netId: string) => {
    if (!adjacent.has(netId)) adjacent.set(netId, new Set());
    return adjacent.get(netId)!;
  };

  for (const c of components) {
    if (exclude.has(c.id)) continue;
    const pins = c.pins;
    const isMotor = (c.type as string) === 'motor_dc' || (c.type as string) === 'motor_ac';
    const isBuzzer = c.type === 'buzzer';
    const isCapacitor = c.type === 'capacitor' || (c.type as string) === 'capacitor_polarized';
    if (!isMotor && !isBuzzer && !isCapacitor && (!pins || pins.length < 2)) continue;

    if (c.type === 'led') {
      if (!ledOn(c.id)) continue;
      const anodeNet = pinToNetId[pinKey(c.id, 'anode')] ?? pinToNetId[pinKey(c.id, 'A')];
      const cathodeNet = pinToNetId[pinKey(c.id, 'cathode')] ?? pinToNetId[pinKey(c.id, 'K')];
      if (anodeNet && cathodeNet && anodeNet !== cathodeNet) {
        ensure(anodeNet).add(cathodeNet);
      }
      continue;
    }
    if ((c.type as string) === 'diode') {
      const state = diodeState(c.id);
      const anodeNet = pinToNetId[pinKey(c.id, 'A')] ?? pinToNetId[pinKey(c.id, 'anode')];
      const cathodeNet = pinToNetId[pinKey(c.id, 'K')] ?? pinToNetId[pinKey(c.id, 'cathode')];
      if (anodeNet && cathodeNet && anodeNet !== cathodeNet) {
        if (state === 'ON') ensure(anodeNet).add(cathodeNet);
        else if (state === 'BREAKDOWN') ensure(cathodeNet).add(anodeNet);
      }
      continue;
    }
    if (c.type === 'rgb_led') {
      const netR = pinToNetId[pinKey(c.id, 'R')];
      const netG = pinToNetId[pinKey(c.id, 'G')];
      const netB = pinToNetId[pinKey(c.id, 'B')];
      const netCOM = pinToNetId[pinKey(c.id, 'COM')];
      const variantId = (c.props?.variantId as 'CC' | 'CA') ?? 'CC';
      const onR = ledOn(`${c.id}:R`);
      const onG = ledOn(`${c.id}:G`);
      const onB = ledOn(`${c.id}:B`);
      if (variantId === 'CC') {
        if (onR && netR && netCOM && netR !== netCOM) { ensure(netR).add(netCOM); ensure(netCOM).add(netR); }
        if (onG && netG && netCOM && netG !== netCOM) { ensure(netG).add(netCOM); ensure(netCOM).add(netG); }
        if (onB && netB && netCOM && netB !== netCOM) { ensure(netB).add(netCOM); ensure(netCOM).add(netB); }
      } else {
        if (onR && netCOM && netR && netCOM !== netR) { ensure(netCOM).add(netR); ensure(netR).add(netCOM); }
        if (onG && netCOM && netG && netCOM !== netG) { ensure(netCOM).add(netG); ensure(netG).add(netCOM); }
        if (onB && netCOM && netB && netCOM !== netB) { ensure(netCOM).add(netB); ensure(netB).add(netCOM); }
      }
      continue;
    }

    // Motors: use canonical P/N so we connect the same nets as the netlist (wires use P/N).
    if ((c.type as string) === 'motor_dc' || (c.type as string) === 'motor_ac') {
      const netP = pinToNetId[pinKey(c.id, 'P')];
      const netN = pinToNetId[pinKey(c.id, 'N')];
      if (netP && netN && netP !== netN) {
        ensure(netP).add(netN);
        ensure(netN).add(netP);
      }
      continue;
    }

    // Buzzer: use canonical P/N so we connect the same nets as the netlist (wires use P/N).
    if (c.type === 'buzzer') {
      const netP = pinToNetId[pinKey(c.id, 'P')];
      const netN = pinToNetId[pinKey(c.id, 'N')];
      if (netP && netN && netP !== netN) {
        ensure(netP).add(netN);
        ensure(netN).add(netP);
      }
      continue;
    }

    // Capacitor (DC: leakage only): use canonical a/b or P/N so same nets as netlist.
    if (c.type === 'capacitor') {
      const netA = pinToNetId[pinKey(c.id, 'a')];
      const netB = pinToNetId[pinKey(c.id, 'b')];
      if (netA && netB && netA !== netB) {
        ensure(netA).add(netB);
        ensure(netB).add(netA);
      }
      continue;
    }
    if ((c.type as string) === 'capacitor_polarized') {
      const netP = pinToNetId[pinKey(c.id, 'P')];
      const netN = pinToNetId[pinKey(c.id, 'N')];
      if (netP && netN && netP !== netN) {
        ensure(netP).add(netN);
        ensure(netN).add(netP);
      }
      continue;
    }

    for (let i = 0; i < pins.length; i++) {
      for (let j = i + 1; j < pins.length; j++) {
        const p1 = pins[i]!;
        const p2 = pins[j]!;
        const id1 = p1.id ?? '';
        const id2 = p2.id ?? '';
        const key1 = pinKey(c.id, id1);
        const key2 = pinKey(c.id, id2);
        const net1 = pinToNetId[key1];
        const net2 = pinToNetId[key2];
        if (!net1 || !net2 || net1 === net2) continue;
        if (!componentConducts(c, id1, id2)) continue;
        ensure(net1).add(net2);
        ensure(net2).add(net1);
      }
    }
  }

  return adjacent;
}

/**
 * Returns true if there is a conductive path from startNetId to targetNetId
 * (BFS over conductive adjacency). Optionally exclude certain components from the graph.
 */
export function hasConductivePath(
  components: SimComponent[],
  pinToNetId: Record<string, string>,
  startNetId: string,
  targetNetId: string,
  options?: ConductivePathOptions
): boolean {
  if (startNetId === targetNetId) return true;
  const adjacent = buildConductiveAdjacency(components, pinToNetId, options);
  const visited = new Set<string>();
  const queue: string[] = [startNetId];
  visited.add(startNetId);

  while (queue.length > 0) {
    const netId = queue.shift()!;
    for (const next of adjacent.get(netId) ?? []) {
      if (visited.has(next)) continue;
      if (next === targetNetId) return true;
      visited.add(next);
      queue.push(next);
    }
  }
  return false;
}

/**
 * Simple inline tests for hasConductivePath (run manually in dev if needed).
 */
export function runConductivePathTests(): { passed: number; failed: number } {
  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(msg);
  };
  let passed = 0;
  let failed = 0;
  try {
    const compsResistor: SimComponent[] = [
      { id: 'r1', type: 'resistor', x: 0, y: 0, pins: [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 10, y: 0 }], props: { ohms: 220 } },
    ];
    const pinToNet1: Record<string, string> = { 'r1:a': 'n0', 'r1:b': 'n1' };
    assert(hasConductivePath(compsResistor, pinToNet1, 'n0', 'n1') === true, 'resistor connects n0-n1');
    passed++;
  } catch {
    failed++;
  }
  try {
    const compsSwitchOff: SimComponent[] = [
      { id: 'sw1', type: 'switch', x: 0, y: 0, pins: [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 10, y: 0 }], props: { on: false } },
    ];
    const pinToNet2: Record<string, string> = { 'sw1:a': 'n0', 'sw1:b': 'n1' };
    assert(hasConductivePath(compsSwitchOff, pinToNet2, 'n0', 'n1') === false, 'switch off disconnects');
    passed++;
  } catch {
    failed++;
  }
  try {
    const comps: SimComponent[] = [
      { id: 'r1', type: 'resistor', x: 0, y: 0, pins: [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 10, y: 0 }], props: { ohms: 220 } },
      { id: 'led1', type: 'led', x: 10, y: 0, pins: [{ id: 'anode', x: 0, y: 0 }, { id: 'cathode', x: 10, y: 0 }], props: {} },
    ];
    const pinToNet3: Record<string, string> = { 'r1:a': 'nBat', 'r1:b': 'nAnode', 'led1:anode': 'nAnode', 'led1:cathode': 'nK' };
    assert(hasConductivePath(comps, pinToNet3, 'nBat', 'nAnode', { excludeComponentIds: ['led1'] }) === true, 'feed path battery->anode via resistor');
    assert(hasConductivePath(comps, pinToNet3, 'nK', 'nGnd', { excludeComponentIds: ['led1'] }) === false, 'no return path cathode->gnd without LED');
    assert(hasTopologyPath(comps, pinToNet3, 'nBat', 'nK') === true, 'topology path battery->cathode via resistor and LED');
    passed++;
  } catch {
    failed++;
  }
  return { passed, failed };
}
