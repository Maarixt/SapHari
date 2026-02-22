import { SimState, SimComponent, Wire } from './types';
import { publish as publishSimEvent } from './events/simEvents';
// import { getSimulationBridge } from './integration/SimulationBridge';

type NetId = string;

export type NetStatus = 'OK' | 'FLOATING' | 'CONFLICT' | 'SHORT';

export type NetSourceType = 'gnd' | '3v3' | 'vin' | 'gpio' | 'dc_pos';

export interface Net {
  id: NetId;
  pins: { compId: string; pinId: string; }[];
  voltage?: number; // 0..3.3 (digital: 0 or 3.3)
  status?: NetStatus;
  /** Source identity from actual pins only; never inferred from voltage. */
  sourceTypes?: Set<NetSourceType>;
}

// --- Pin validity audit & canonical pin ids (display labels → engine pin ids) ---

const PIN_ALIASES: Record<string, string> = {
  P: 'pos',
  N: 'neg',
  A: 'anode',
  K: 'cathode',
};

export function canonicalPinId(pinId: string): string {
  return PIN_ALIASES[pinId] ?? pinId;
}

function getComponentPinIds(c: SimComponent): string[] {
  const pins = c.pins ?? [];
  return pins.map((p) => p.id);
}

export function auditWirePins(components: SimComponent[], wires: Wire[]): string[] {
  const compById = new Map(components.map((c) => [c.id, c]));
  const errors: string[] = [];

  for (const w of wires) {
    const ends = [w.from, w.to].filter(Boolean);
    for (const end of ends) {
      const comp = compById.get(end.componentId);
      if (!comp) {
        errors.push(`Wire ${w.id}: missing component ${end.componentId}`);
        continue;
      }
      const pinIds = getComponentPinIds(comp);
      const canonical = canonicalPinId(end.pinId);
      if (!pinIds.includes(canonical)) {
        errors.push(
          `Wire ${w.id}: ${comp.type ?? 'component'}(${comp.id}) has no pin "${end.pinId}" (canonical: "${canonical}"). Valid: [${pinIds.join(', ')}]`
        );
      }
    }
  }

  return errors;
}

// --- buildNets ---

export function buildNets(state: SimState): Net[] {
  const pinAudit = auditWirePins(state.components, state.wires);
  if (pinAudit.length) {
    console.warn('[NETS] Wire→Pin audit failed:', pinAudit);
  }

  const nets: Net[] = [];
  let counter = 0;

  // Start each pin in its own net (keyed by actual pin id from component)
  const pinToNet = new Map<string, Net>();
  for (const c of state.components) {
    if (c && c.pins && Array.isArray(c.pins)) {
      for (const p of c.pins) {
        if (p && p.id) {
          const id = `n${counter++}`;
          const net: Net = { id, pins: [{ compId: c.id, pinId: p.id }] };
          nets.push(net);
          pinToNet.set(`${c.id}:${p.id}`, net);
        }
      }
    }
  }

  const union = (a: Net, b: Net) => {
    if (a === b) return a;
    if (b.pins && Array.isArray(b.pins)) {
      for (const pin of b.pins) {
        a.pins.push(pin);
        pinToNet.set(`${pin.compId}:${pin.pinId}`, a);
      }
    }
    b.pins = [];
    return a;
  };

  // Union on wires (use canonical pin ids so UI labels A/K, P/N match engine anode/cathode, pos/neg)
  for (const w of state.wires) {
    if (w && w.from && w.to) {
      const keyA = `${w.from.componentId}:${canonicalPinId(w.from.pinId)}`;
      const keyB = `${w.to.componentId}:${canonicalPinId(w.to.pinId)}`;
      const a = pinToNet.get(keyA);
      const b = pinToNet.get(keyB);
      if (a && b) {
        union(a, b);
      }
    }
  }

  // Component-internal conduction: union nets for pin pairs that conduct
  for (const c of state.components) {
    if (!c.pins || c.pins.length < 2) continue;
    for (let i = 0; i < c.pins.length; i++) {
      for (let j = i + 1; j < c.pins.length; j++) {
        const p1 = c.pins[i];
        const p2 = c.pins[j];
        if (!p1?.id || !p2?.id) continue;
        if (!conductsBetween(c, p1.id, p2.id, state)) continue;
        const key1 = `${c.id}:${p1.id}`;
        const key2 = `${c.id}:${p2.id}`;
        const net1 = pinToNet.get(key1);
        const net2 = pinToNet.get(key2);
        // Switch sanity: log if ON but pins missing from nets or nets differ before union
        const isSwitch = c.type === 'switch' || (c.type as string) === 'toggle-switch';
        if (isSwitch && (c.props?.on)) {
          if (!net1 || !net2) {
            console.warn('[SWITCH] ON but pin missing net', { n1: net1?.id, n2: net2?.id, swPin1: p1.id, swPin2: p2.id, compId: c.id });
          } else if (net1 !== net2) {
            console.warn('[SWITCH] ON but nets differ (pre-union)', { n1: net1.id, n2: net2.id });
          }
        }
        if (net1 && net2) union(net1, net2);
      }
    }
  }

  // Compact: remove empty merged nets
  const finalNets = nets.filter((n) => n.pins.length > 0);

  // Net formation trace (why dashed wires stay dashed)
  const pinToNetId: Record<string, string> = {};
  for (const n of finalNets) {
    for (const pin of n.pins) {
      pinToNetId[`${pin.compId}:${pin.pinId}`] = n.id;
    }
  }
  const pick = (cid: string, pid: string) => pinToNetId[`${cid}:${pid}`];
  console.log('[NETS] nets:', finalNets.map((n) => ({
    id: n.id,
    pins: n.pins?.length ?? 0,
    sources: n.sourceTypes ? Array.from(n.sourceTypes) : [],
  })));
  console.log('[NETS] pinToNetId size:', Object.keys(pinToNetId).length);
  const batt = state.components.find((c) => c.type === 'dc_supply');
  const sw = state.components.find((c) => c.type === 'switch' || (c.type as string) === 'toggle-switch');
  const led = state.components.find((c) => c.type === 'led');
  if (batt) console.log('[NETS] battery:', pick(batt.id, 'pos'), pick(batt.id, 'neg'));
  if (sw) console.log('[NETS] switch:', pick(sw.id, 'pin1'), pick(sw.id, 'pin2'));
  if (led) console.log('[NETS] led:', pick(led.id, 'anode'), pick(led.id, 'cathode'));

  return finalNets;
}

const pinKey = (compId: string, pinId: string) => `${compId}:${pinId}`;

/**
 * Returns whether current flows between the two pins of this component in the current state.
 * Used by buildNets (to union nets) and by flow traversal (to treat nets as connected).
 */
export function conductsBetween(
  component: SimComponent,
  pinIdA: string,
  pinIdB: string,
  _state: SimState
): boolean {
  if (pinIdA === pinIdB) return true;
  const type = component.type;
  const props = component.props ?? {};
  if (type === 'button') {
    return !!props.pressed;
  }
  if (type === 'switch' || (type as string) === 'toggle-switch') {
    return !!props.on;
  }
  if (type === 'resistor') {
    const mode = (props.mode as 'series' | 'pullup' | 'pulldown') ?? 'series';
    return mode === 'series';
  }
  return false;
}

/** Net id that contains the given wire, or null. Uses canonical pin ids so A/K, P/N match. */
export function getNetIdForWire(state: SimState, wireId: string): string | null {
  const wire = state.wires.find(w => w.id === wireId);
  if (!wire) return null;
  const nets = buildNets(state);
  const fromKey = pinKey(wire.from.componentId, canonicalPinId(wire.from.pinId));
  const toKey = pinKey(wire.to.componentId, canonicalPinId(wire.to.pinId));
  const net = nets.find(
    n =>
      n.pins.some(p => pinKey(p.compId, p.pinId) === fromKey) &&
      n.pins.some(p => pinKey(p.compId, p.pinId) === toKey)
  );
  return net?.id ?? null;
}

/** Wire ids that belong to the given net. Uses canonical pin ids for wire endpoints. */
export function getWireIdsInNet(state: SimState, netId: string): string[] {
  const nets = buildNets(state);
  const net = nets.find(n => n.id === netId);
  if (!net) return [];
  const pinSet = new Set(net.pins.map(p => pinKey(p.compId, p.pinId)));
  return state.wires.filter(
    w =>
      pinSet.has(pinKey(w.from.componentId, canonicalPinId(w.from.pinId))) &&
      pinSet.has(pinKey(w.to.componentId, canonicalPinId(w.to.pinId)))
  ).map(w => w.id);
}

export function assignVoltages(nets: Net[], components: SimComponent[], gpioOverrides?: Map<string, number>) {
  // GND = 0V, 3V3 = 3.3V, VIN = 5V. Detect shorts and conflicting GPIO.
  // Populate sourceTypes from pins only (never from voltage); used for weak-pull and guards.
  for (const n of nets) {
    const sourceTypes = new Set<NetSourceType>();
    let has3v = false, hasGnd = false, hasVin = false;
    let hasDcSupplyPos = false;
    let dcSupplyVoltage: number | undefined;
    const gpioValues = new Set<number>();

    for (const pin of n.pins) {
      const c = components.find(c => c.id === pin.compId)!;
      const p = c.pins.find(pp => pp.id === pin.pinId)!;

      if (c.type === 'dc_supply') {
        const v = (c.props?.voltage as number) ?? 5;
        const isPos = pin.pinId === 'pos' || pin.pinId === 'P' || pin.pinId === (c.pins[0]?.id ?? 'pos');
        if (isPos) {
          hasDcSupplyPos = true;
          dcSupplyVoltage = v;
          sourceTypes.add('dc_pos');
        } else {
          hasGnd = true;
          sourceTypes.add('gnd');
        }
      } else if (c.type === 'power_rail') {
        const kind = (c.props?.kind as '3v3' | 'vin' | 'gnd') ?? '3v3';
        if (kind === 'gnd') {
          hasGnd = true;
          sourceTypes.add('gnd');
        } else if (kind === 'vin') {
          hasVin = true;
          sourceTypes.add('vin');
        } else {
          has3v = true;
          sourceTypes.add('3v3');
        }
      } else if (c.type === 'power') {
        const v = (c.props?.voltage as number | undefined) ?? 3.3;
        if (v < 4) {
          has3v = true;
          sourceTypes.add('3v3');
        } else {
          hasVin = true;
          sourceTypes.add('vin');
        }
      } else if (c.type === 'ground') {
        hasGnd = true;
        sourceTypes.add('gnd');
      } else if (p.kind === 'ground') {
        hasGnd = true;
        sourceTypes.add('gnd');
      } else if (p.kind === 'power') {
        if (p.label === 'VIN' || p.id === 'vin') {
          hasVin = true;
          sourceTypes.add('vin');
        } else {
          has3v = true;
          sourceTypes.add('3v3');
        }
      }
      if (p.gpio !== undefined) sourceTypes.add('gpio');

      if (gpioOverrides && p.gpio !== undefined) {
        const override = gpioOverrides.get(`gpio${p.gpio}`);
        if (override !== undefined) gpioValues.add(override);
      }
    }
    n.sourceTypes = sourceTypes;

    const gpioArray = Array.from(gpioValues);
    if (gpioArray.length > 1) {
      n.voltage = 0;
      n.status = 'CONFLICT';
      publishSimEvent('WARNING', { netId: n.id, code: 'CONFLICT_GPIO', message: 'Conflicting GPIO outputs on same net', severity: 'error' });
    } else if (gpioArray.length === 1) {
      n.voltage = gpioArray[0];
    } else if (hasGnd) {
      n.voltage = 0;
      if (has3v || hasVin || hasDcSupplyPos) {
        n.status = 'SHORT';
        publishSimEvent('WARNING', { netId: n.id, code: 'SHORT', message: 'Short: power tied to GND', severity: 'error' });
      }
    } else if (hasDcSupplyPos && dcSupplyVoltage !== undefined) {
      n.voltage = dcSupplyVoltage;
    } else if (has3v && hasVin) {
      n.voltage = 0;
      n.status = 'CONFLICT';
      publishSimEvent('WARNING', { netId: n.id, code: 'CONFLICT', message: '3V3 and VIN on same net', severity: 'error' });
    } else if (hasVin) {
      n.voltage = 5;
    } else if (has3v) {
      n.voltage = 3.3;
    }
  }

  // pinToNetId for weak-pull and FLOATING_INPUT
  const pinToNetId = new Map<string, string>();
  for (const n of nets) {
    for (const pin of n.pins) {
      pinToNetId.set(`${pin.compId}:${pin.pinId}`, n.id);
    }
  }

  // True source nets: from sourceTypes only (never from voltage; CONFLICT/SHORT nets stay excluded)
  const netIdsGnd = new Set<NetId>(nets.filter((n) => n.sourceTypes?.has('gnd')).map((n) => n.id));
  const netIds3v3 = new Set<NetId>(nets.filter((n) => n.sourceTypes?.has('3v3')).map((n) => n.id));

  // Weak-pull pass: resistor must connect floating net to 3V3 or GND net
  for (const c of components) {
    if (c.type !== 'resistor' || !c.pins || c.pins.length < 2) continue;
    const mode = (c.props?.mode as 'series' | 'pullup' | 'pulldown') ?? 'series';
    if (mode === 'series') continue;
    const netIdA = pinToNetId.get(`${c.id}:${c.pins[0].id}`);
    const netIdB = pinToNetId.get(`${c.id}:${c.pins[1].id}`);
    if (!netIdA || !netIdB) continue;
    const netA = nets.find(n => n.id === netIdA);
    const netB = nets.find(n => n.id === netIdB);
    if (!netA || !netB) continue;
    if (mode === 'pullup') {
      if (netIds3v3.has(netIdA) && netB.voltage === undefined) netB.voltage = 3.3;
      else if (netIds3v3.has(netIdB) && netA.voltage === undefined) netA.voltage = 3.3;
    } else if (mode === 'pulldown') {
      if (netIdsGnd.has(netIdA) && netB.voltage === undefined) netB.voltage = 0;
      else if (netIdsGnd.has(netIdB) && netA.voltage === undefined) netA.voltage = 0;
    }
  }

  // Pot wiper voltage: Vcc * position (0–1). Wiper is weak source (voltage follower).
  for (const c of components) {
    if ((c.type !== 'pot' && c.type !== 'potentiometer') || !c.pins) continue;
    const vccPin = c.pins.find(p => p.id === 'vcc');
    const gndPin = c.pins.find(p => p.id === 'gnd');
    const wiperPin = c.pins.find(p => p.id === 'signal' || p.id === 'out');
    if (!vccPin || !gndPin || !wiperPin) continue;
    const netIdVcc = pinToNetId.get(`${c.id}:${vccPin.id}`);
    const netIdGnd = pinToNetId.get(`${c.id}:${gndPin.id}`);
    const netIdWiper = pinToNetId.get(`${c.id}:${wiperPin.id}`);
    if (!netIdVcc || !netIdGnd || !netIdWiper) continue;
    const netVcc = nets.find(n => n.id === netIdVcc);
    const netGnd = nets.find(n => n.id === netIdGnd);
    const netWiper = nets.find(n => n.id === netIdWiper);
    if (!netVcc || !netGnd || !netWiper) continue;
    const vccVoltage = netVcc.voltage;
    const gndVoltage = netGnd.voltage;
    if (vccVoltage === undefined || gndVoltage === undefined) continue;
    if (netGnd.sourceTypes?.has('gnd') && netGnd.voltage === 0) {
      const max = (c.props?.max as number) ?? 4095;
      const raw = (c.props?.value as number) ?? 0;
      const position = typeof c.props?.position === 'number' ? c.props.position : (max > 0 ? raw / max : 0);
      const clamped = Math.max(0, Math.min(1, position));
      if (netWiper.voltage === undefined) {
        netWiper.voltage = vccVoltage * clamped;
      }
    }
  }

  // FLOATING_INPUT only for nets that are floating and contain an ESP32 GPIO pin
  for (const n of nets) {
    if (n.voltage !== undefined) continue;
    const hasGpioPin = n.pins.some(pin => {
      const c = components.find(c => c.id === pin.compId);
      const p = c?.pins.find(pp => pp.id === pin.pinId);
      return c?.type === 'esp32' && p && p.gpio !== undefined;
    });
    if (hasGpioPin) {
      publishSimEvent('WARNING', {
        netId: n.id,
        code: 'FLOATING_INPUT',
        message: 'Floating GPIO input: no drive or pull resistor',
        severity: 'warning',
      });
    }
  }

  // Set status for nets that don't have it yet
  for (const n of nets) {
    if (n.status !== undefined) continue;
    if (n.voltage === undefined) n.status = 'FLOATING';
    else n.status = 'OK';
  }

  // Power-validity: UNPOWERED_COMPONENT, NO_COMMON_GROUND
  checkPowerValidity(nets, components);
}

/** Components that require VCC + GND to function. */
const COMPONENT_TYPES_NEEDING_POWER = new Set<string>([
  'pot', 'potentiometer', 'pir', 'ultrasonic', 'ds18b20', 'servo', 'buzzer'
]);

function checkPowerValidity(nets: Net[], components: SimComponent[]): void {
  const pinToNetId = new Map<string, string>();
  for (const n of nets) {
    for (const pin of n.pins) pinToNetId.set(`${pin.compId}:${pin.pinId}`, n.id);
  }

  const esp32GndNetIds = new Set<string>();
  for (const c of components) {
    if (c.type !== 'esp32' || !c.pins) continue;
    const gndPin = c.pins.find(p => p.kind === 'ground' || p.id === 'gnd');
    if (gndPin) {
      const netId = pinToNetId.get(`${c.id}:${gndPin.id}`);
      if (netId) esp32GndNetIds.add(netId);
    }
  }

  for (const c of components) {
    if (!COMPONENT_TYPES_NEEDING_POWER.has(c.type) || !c.pins) continue;
    let hasPower = false;
    let hasGnd = false;
    let gndNetId: string | undefined;
    const signalPinIds: string[] = [];
    for (const p of c.pins) {
      const netId = pinToNetId.get(`${c.id}:${p.id}`);
      if (!netId) continue;
      const net = nets.find(n => n.id === netId);
      if (!net) continue;
      if (net.sourceTypes?.has('3v3') || net.sourceTypes?.has('vin')) hasPower = true;
      if (net.sourceTypes?.has('gnd')) {
        hasGnd = true;
        gndNetId = netId;
      }
      if (p.kind !== 'power' && p.kind !== 'ground') signalPinIds.push(p.id);
    }
    if (!hasPower || !hasGnd) {
      publishSimEvent('WARNING', {
        componentId: c.id,
        code: 'UNPOWERED_COMPONENT',
        message: `Component ${c.type} has no VCC and/or GND connection`,
        severity: 'warning',
      });
    }
    if (hasPower && hasGnd && gndNetId && esp32GndNetIds.size > 0) {
      for (const pinId of signalPinIds) {
        const netId = pinToNetId.get(`${c.id}:${pinId}`);
        if (!netId) continue;
        const net = nets.find(n => n.id === netId);
        if (!net) continue;
        const hasEsp32Gpio = net.pins.some(pin => {
          const comp = components.find(x => x.id === pin.compId);
          const pinDef = comp?.pins.find(pp => pp.id === pin.pinId);
          return comp?.type === 'esp32' && pinDef && (pinDef as { gpio?: number }).gpio !== undefined;
        });
        if (hasEsp32Gpio && !esp32GndNetIds.has(gndNetId)) {
          publishSimEvent('WARNING', {
            componentId: c.id,
            code: 'NO_COMMON_GROUND',
            message: `Component ${c.type} signal shares net with ESP32 GPIO but has no common ground with ESP32`,
            severity: 'warning',
          });
          break;
        }
      }
    }
  }
}

export interface NetStateResult {
  nets: Net[];
  pinToNetId: Map<string, string>;
  netVoltageById: Record<NetId, number | undefined>;
  netStatusById: Record<NetId, NetStatus | undefined>;
  /** Nets that are on a current path from 3v3/vin to GND (traversal respects conductsBetween). */
  energizedNetIds?: Set<NetId>;
}

/** Debug report: why a circuit might not be working (battery/switch/LED/loop). */
export interface DebugReport {
  battery: {
    id: string;
    voltage: number;
    netP: string | undefined;
    netN: string | undefined;
    vP: number | undefined;
    vN: number | undefined;
    reasonIfNot?: string;
  } | null;
  switch: {
    id: string;
    on: boolean;
    pin1Net: string | undefined;
    pin2Net: string | undefined;
    conducts: boolean;
    reasonIfNot?: string;
  } | null;
  led: {
    id: string;
    netA: string | undefined;
    netK: string | undefined;
    vA: number | undefined;
    vK: number | undefined;
    forwardBiased: boolean;
    reasonIfNot?: string;
  } | null;
  gnd: { netIds: string[] };
  energized: {
    netIds: string[];
    loopClosed: boolean;
    reasonIfNot?: string;
  };
  warnings: string[];
}

const LED_FORWARD_THRESHOLD_V = 1.8;

/**
 * Returns whether current flows between pins for flow traversal.
 * LED conducts only when forward biased (V_anode > V_cathode + threshold).
 */
function conductsBetweenForFlow(
  component: SimComponent,
  pinIdA: string,
  pinIdB: string,
  state: SimState,
  pinToNetId: Map<string, string>,
  netVoltageById: Record<NetId, number | undefined>
): boolean {
  if (component.type === 'led') {
    const anodeId = component.pins?.some((p) => (p.id === 'A' || p.id === 'anode')) ? ('A' as string) : 'anode';
    const cathodeId = component.pins?.some((p) => (p.id === 'K' || p.id === 'cathode')) ? ('K' as string) : 'cathode';
    const isAnode = (id: string) => id === 'A' || id === 'anode';
    const isCathode = (id: string) => id === 'K' || id === 'cathode';
    const netA = pinToNetId.get(`${component.id}:${pinIdA}`);
    const netB = pinToNetId.get(`${component.id}:${pinIdB}`);
    if (!netA || !netB) return false;
    const vA = netVoltageById[netA] ?? -Infinity;
    const vB = netVoltageById[netB] ?? Infinity;
    return (isAnode(pinIdA) && isCathode(pinIdB) && vA - vB > LED_FORWARD_THRESHOLD_V) ||
           (isAnode(pinIdB) && isCathode(pinIdA) && vB - vA > LED_FORWARD_THRESHOLD_V);
  }
  return conductsBetween(component, pinIdA, pinIdB, state);
}

/**
 * Compute the set of net ids that are on an energized path: from 3v3/vin/dc_pos source nets,
 * traversing until reaching GND. Used only for wire coloring (red = hot). LED glow is driven
 * by forward bias (vA - vK > vf) in runLoop, not by membership in this set.
 */
export function getEnergizedNetIds(
  state: SimState,
  nets: Net[],
  components: SimComponent[],
  pinToNetId: Map<string, string>,
  netVoltageById: Record<NetId, number | undefined>
): Set<NetId> {
  const netIds3v3 = new Set(nets.filter((n) => n.sourceTypes?.has('3v3')).map((n) => n.id));
  const netIdsVin = new Set(nets.filter((n) => n.sourceTypes?.has('vin')).map((n) => n.id));
  const netIdsDcPos = new Set(nets.filter((n) => n.sourceTypes?.has('dc_pos')).map((n) => n.id));
  const netIdsGnd = new Set(nets.filter((n) => n.sourceTypes?.has('gnd')).map((n) => n.id));
  const sourceNetIds = new Set<NetId>([...netIds3v3, ...netIdsVin, ...netIdsDcPos]);

  const adjacent = new Map<NetId, Set<NetId>>();
  for (const n of nets) {
    adjacent.set(n.id, new Set());
  }
  for (const c of components) {
    if (!c.pins || c.pins.length < 2) continue;
    for (let i = 0; i < c.pins.length; i++) {
      for (let j = i + 1; j < c.pins.length; j++) {
        const p1 = c.pins[i];
        const p2 = c.pins[j];
        if (!p1?.id || !p2?.id) continue;
        const net1 = pinToNetId.get(`${c.id}:${p1.id}`);
        const net2 = pinToNetId.get(`${c.id}:${p2.id}`);
        if (!net1 || !net2 || net1 === net2) continue;
        if (!conductsBetweenForFlow(c, p1.id, p2.id, state, pinToNetId, netVoltageById)) continue;
        adjacent.get(net1)!.add(net2);
        adjacent.get(net2)!.add(net1);
      }
    }
  }

  const visited = new Set<NetId>();
  const queue: NetId[] = [...sourceNetIds];
  for (const id of sourceNetIds) visited.add(id);
  while (queue.length > 0) {
    const netId = queue.shift()!;
    if (netIdsGnd.has(netId)) continue;
    for (const next of adjacent.get(netId) ?? []) {
      if (visited.has(next)) continue;
      visited.add(next);
      queue.push(next);
    }
  }
  return visited;
}

/** Single net computation: buildNets + assignVoltages, then return nets and maps for UI. */
export function computeNetState(
  state: SimState,
  components: SimComponent[],
  gpioOverrides?: Map<string, number>
): NetStateResult {
  const nets = buildNets(state);
  assignVoltages(nets, components, gpioOverrides);
  const pinToNetId = new Map<string, string>();
  const netVoltageById: Record<NetId, number | undefined> = {};
  const netStatusById: Record<NetId, NetStatus | undefined> = {};
  for (const n of nets) {
    for (const pin of n.pins) pinToNetId.set(`${pin.compId}:${pin.pinId}`, n.id);
    netVoltageById[n.id] = n.voltage;
    netStatusById[n.id] = n.status;
  }
  const energizedNetIds = getEnergizedNetIds(state, nets, components, pinToNetId, netVoltageById);
  return { nets, pinToNetId, netVoltageById, netStatusById, energizedNetIds };
}

/** Build adjacency map: netId -> Set of netIds reachable via one conductive hop (wire/switch when on/LED when forward biased/resistor). */
function buildNetAdjacency(
  state: SimState,
  nets: Net[],
  pinToNetId: Map<string, string>,
  netVoltageById: Record<NetId, number | undefined>
): Map<NetId, Set<NetId>> {
  const adjacent = new Map<NetId, Set<NetId>>();
  for (const n of nets) adjacent.set(n.id, new Set());
  const components = state.components;
  for (const c of components) {
    if (!c.pins || c.pins.length < 2) continue;
    for (let i = 0; i < c.pins.length; i++) {
      for (let j = i + 1; j < c.pins.length; j++) {
        const p1 = c.pins[i];
        const p2 = c.pins[j];
        if (!p1?.id || !p2?.id) continue;
        const net1 = pinToNetId.get(`${c.id}:${p1.id}`);
        const net2 = pinToNetId.get(`${c.id}:${p2.id}`);
        if (!net1 || !net2 || net1 === net2) continue;
        if (!conductsBetweenForFlow(c, p1.id, p2.id, state, pinToNetId, netVoltageById)) continue;
        adjacent.get(net1)!.add(net2);
        adjacent.get(net2)!.add(net1);
      }
    }
  }
  return adjacent;
}

/** Returns set of net ids reachable from startNetId (BFS). */
function reachableFrom(
  startNetId: NetId,
  adjacent: Map<NetId, Set<NetId>>
): Set<NetId> {
  const visited = new Set<NetId>();
  const queue: NetId[] = [startNetId];
  visited.add(startNetId);
  while (queue.length > 0) {
    const netId = queue.shift()!;
    for (const next of adjacent.get(netId) ?? []) {
      if (visited.has(next)) continue;
      visited.add(next);
      queue.push(next);
    }
  }
  return visited;
}

/**
 * Explain why a circuit might not be working. Call after computeNetState.
 * Fills battery/switch/led/gnd/energized and human-readable reasons.
 */
export function explainCircuit(state: SimState, netState: NetStateResult): DebugReport {
  const { nets, pinToNetId, netVoltageById, energizedNetIds } = netState;
  const components = state.components;
  const warnings: string[] = [];

  const battery = components.find((c) => c.type === 'dc_supply') ?? null;
  const batteryReport = battery
    ? (() => {
        const voltage = (battery.props?.voltage as number) ?? 5;
        const posPinId = battery.pins[0]?.id ?? 'pos';
        const negPinId = battery.pins.find((p) => p.id === 'neg' || p.id === 'N')?.id ?? battery.pins[1]?.id ?? 'neg';
        const netP = pinToNetId.get(`${battery.id}:${posPinId}`) ?? pinToNetId.get(`${battery.id}:pos`) ?? pinToNetId.get(`${battery.id}:P`);
        const netN = pinToNetId.get(`${battery.id}:${negPinId}`) ?? pinToNetId.get(`${battery.id}:neg`) ?? pinToNetId.get(`${battery.id}:N`);
        const vP = netP != null ? netVoltageById[netP] : undefined;
        const vN = netN != null ? netVoltageById[netN] : undefined;
        let reasonIfNot: string | undefined;
        if (vP === undefined) {
          reasonIfNot = 'Battery positive net has no voltage (not driving net)';
          warnings.push(reasonIfNot);
        } else if (vN === undefined) {
          reasonIfNot = 'Battery negative net has no voltage (should be 0V / GND)';
          warnings.push(reasonIfNot);
        } else if (vN !== 0) {
          reasonIfNot = `Battery negative net is ${vN}V but should be 0V`;
          warnings.push(reasonIfNot);
        }
        return {
          id: battery.id,
          voltage,
          netP,
          netN,
          vP,
          vN,
          reasonIfNot,
        };
      })()
    : null;

  const sw = components.find((c) => c.type === 'switch' || (c.type as string) === 'toggle-switch') ?? null;
  const switchReport = sw
    ? (() => {
        const on = !!(sw.props?.on);
        const pin1Id = sw.pins[0]?.id ?? 'pin1';
        const pin2Id = sw.pins[1]?.id ?? 'pin2';
        const pin1Net = pinToNetId.get(`${sw.id}:${pin1Id}`);
        const pin2Net = pinToNetId.get(`${sw.id}:${pin2Id}`);
        const sameNet = pin1Net != null && pin2Net != null && pin1Net === pin2Net;
        const conducts = on && sameNet;
        let reasonIfNot: string | undefined;
        if (!on) {
          reasonIfNot = 'Switch is open';
        } else if (pin1Net === undefined || pin2Net === undefined) {
          reasonIfNot = 'Switch pin(s) not in any net (pin id mismatch?)';
          warnings.push('Component pin ids may not match engine assumptions (switch pin1/pin2)');
        } else if (!sameNet) {
          reasonIfNot = 'Switch is ON but pins are not in same net (union not applied)';
          warnings.push(reasonIfNot);
        }
        return {
          id: sw.id,
          on,
          pin1Net,
          pin2Net,
          conducts,
          reasonIfNot,
        };
      })()
    : null;

  const ledComp = components.find((c) => c.type === 'led') ?? null;
  const ledReport = ledComp
    ? (() => {
        const anodeId = ledComp.pins?.some((p) => p.id === 'A' || p.id === 'anode') ? 'anode' : 'A';
        const cathodeId = ledComp.pins?.some((p) => p.id === 'K' || p.id === 'cathode') ? 'cathode' : 'K';
        const netA = pinToNetId.get(`${ledComp.id}:anode`) ?? pinToNetId.get(`${ledComp.id}:A`);
        const netK = pinToNetId.get(`${ledComp.id}:cathode`) ?? pinToNetId.get(`${ledComp.id}:K`);
        const vA = netA != null ? netVoltageById[netA] : undefined;
        const vK = netK != null ? netVoltageById[netK] : undefined;
        const forwardBiased =
          vA !== undefined && vK !== undefined && vA - vK > LED_FORWARD_THRESHOLD_V;
        let reasonIfNot: string | undefined;
        if (netA === undefined || netK === undefined) {
          reasonIfNot = 'LED pin(s) not in any net (pin id mismatch? expect anode/cathode or A/K)';
          warnings.push('Component pin ids may not match engine assumptions (LED A/K or anode/cathode)');
        } else if (vA === undefined || vK === undefined) {
          reasonIfNot = 'LED anode or cathode net has no voltage (floating)';
          warnings.push(reasonIfNot);
        } else if (!forwardBiased) {
          if (vA <= vK) {
            reasonIfNot = `LED reverse biased or insufficient (vA=${vA}V, vK=${vK}V; need vA > vK + ${LED_FORWARD_THRESHOLD_V}V)`;
          } else {
            reasonIfNot = `LED forward voltage too low (vA-vK=${vA - vK}V < ${LED_FORWARD_THRESHOLD_V}V threshold)`;
          }
          warnings.push(reasonIfNot);
        }
        return {
          id: ledComp.id,
          netA,
          netK,
          vA,
          vK,
          forwardBiased,
          reasonIfNot,
        };
      })()
    : null;

  const netIdsGnd = new Set(nets.filter((n) => n.sourceTypes?.has('gnd')).map((n) => n.id));
  const gndReport = { netIds: [...netIdsGnd] };

  const adjacent = buildNetAdjacency(state, nets, pinToNetId, netVoltageById);
  const netP = batteryReport?.netP;
  const netN = batteryReport?.netN;
  let loopClosed = false;
  let reasonIfNot = 'No battery in circuit';
  if (netP != null && netN != null) {
    const reachable = reachableFrom(netP, adjacent);
    loopClosed = reachable.has(netN);
    if (!loopClosed) {
      if (!batteryReport?.vP && batteryReport?.vP !== 0) {
        reasonIfNot = 'No path from + to - (battery positive net not driven)';
      } else if (switchReport && switchReport.on && switchReport.pin1Net !== switchReport.pin2Net) {
        reasonIfNot = 'Path breaks at switch (ON but pins not in same net)';
      } else if (ledReport && !ledReport.forwardBiased) {
        reasonIfNot = 'Path breaks at LED (reverse bias or floating)';
      } else {
        reasonIfNot = 'No conductive path from battery+ to battery-';
      }
      // Minimal "closed loop" proof: log why loop didn't close
      const neighbors = adjacent.get(netP)?.size ?? 0;
      console.warn('[NETS] Loop not closed: battery+ net has', neighbors, 'neighbors;', reasonIfNot);
    } else {
      reasonIfNot = undefined;
    }
  }

  const energizedReport = {
    netIds: energizedNetIds ? [...energizedNetIds] : [],
    loopClosed,
    reasonIfNot,
  };

  return {
    battery: batteryReport,
    switch: switchReport,
    led: ledReport,
    gnd: gndReport,
    energized: energizedReport,
    warnings,
  };
}

// Get voltage at a specific pin
export function getPinVoltage(nets: Net[], compId: string, pinId: string): number | undefined {
  const net = nets.find(n => 
    n.pins.some(p => p.compId === compId && p.pinId === pinId)
  );
  return net?.voltage;
}

// Simulate component behavior based on net voltages
export function simulateComponents(state: SimState, nets: Net[]): SimState {
  const updatedComponents = state.components.map(comp => {
    const updatedComp = { ...comp };
    
    switch (comp.type) {
      case 'led':
        // LED simulation is handled in runLoop for better control
        break;
        
      case 'button':
        // Button state is controlled by user interaction, not simulation
        // The pressed state is managed by the UI
        break;
        
      case 'buzzer':
        const posVoltage = getPinVoltage(nets, comp.id, '+');
        const negVoltage = getPinVoltage(nets, comp.id, '-');
        
        if (posVoltage !== undefined && negVoltage !== undefined) {
          const voltageDiff = posVoltage - negVoltage;
          // Buzzer is active if voltage difference > 2V
          updatedComp.props = {
            ...comp.props,
            active: voltageDiff > 2.0
          };
        }
        break;
        
      case 'pot':
        // Potentiometer value is controlled by user interaction
        // The value is managed by the UI slider
        break;
        
      case 'pir':
        // PIR sensor motion detection is controlled by user interaction
        // The motion state is managed by the UI
        break;
        
      case 'ultrasonic':
        // Ultrasonic sensor distance is controlled by user interaction
        // The distance value is managed by the UI
        break;
        
      case 'ds18b20':
        // Temperature sensor value is controlled by user interaction
        // The temperature is managed by the UI
        break;
        
      case 'servo':
        // Servo angle is controlled by user interaction
        // The angle is managed by the UI
        break;
        
      default:
        // No simulation for other component types
        break;
    }
    
    return updatedComp;
  });
  
  return {
    ...state,
    components: updatedComponents
  };
}

// Main simulation step
export function simulateStep(state: SimState): SimState {
  // Try enhanced simulation first (commented out for now)
  // const bridge = getSimulationBridge();
  // if (bridge.isEnhancedModeActive()) {
  //   return bridge.runSimulationStep(state);
  // }
  
  // Fall back to original simulation
  // Build nets from current state
  const nets = buildNets(state);
  
  // Assign voltages based on power and ground connections
  assignVoltages(nets, state.components);
  
  // Apply MQTT command overrides
  const overriddenState = applyMQTTOverrides(state);
  
  // Simulate component behavior
  const updatedState = simulateComponents(overriddenState, nets);
  
  return updatedState;
}

// Apply MQTT command overrides to component states
function applyMQTTOverrides(state: SimState): SimState {
  // This will be enhanced to handle MQTT commands
  // For now, return the state as-is
  return state;
}

// Get net information for debugging
export function getNetInfo(nets: Net[]): string[] {
  return nets.map(net => {
    const voltage = net.voltage !== undefined ? `${net.voltage}V` : 'unknown';
    const pinCount = net.pins.length;
    return `Net ${net.id}: ${voltage} (${pinCount} pins)`;
  });
}
