/**
 * Engine2: Convert nets to solvable netlist (node indices, ground, components).
 */

import type { SimComponent } from '../types';
import type { Net, NetsResult } from './nets';
import type { NetlistComponent, VSourceWaveform } from './models';
import { pinKey, canonPinId, getCanonicalPinIds } from './types';
import { getSwitchVariantId } from '../registry';
import {
  R_ON_SWITCH,
  R_OFF_SWITCH,
  R_ON_LED,
  R_OFF_LED,
  LED_VF_DEFAULT,
  LED_I_MAX_DEFAULT,
  R_MIN_POT,
  R_BUZZER_DEFAULT,
  R_LEAK_CAPACITOR_DEFAULT,
  CAPACITANCE_DEFAULT_FARAD,
  CAPACITOR_REVERSE_VMAX_DEFAULT,
  INDUCTANCE_DEFAULT_H,
  VF_DIODE_DEFAULT,
  R_ON_DIODE_DEFAULT,
  V_BR_DIODE,
  R_BR_DIODE,
} from './models';

export interface Netlist {
  nodeIndexByNetId: Map<string, number>;
  nNodes: number;
  groundNodeIndex: number;
  groundNetId: string | null;
  components: NetlistComponent[];
  warnings: string[];
}

function findGroundNet(nets: Map<string, Net>, components: SimComponent[]): string | null {
  for (const [netId, net] of nets) {
    for (const pk of net.pins) {
      const [compId, pinId] = pk.split(':');
      const comp = components.find((c) => c.id === compId);
      if (!comp) continue;
      const canon = canonPinId(pinId);
      if (comp.type === 'ground' || canon === 'gnd') return netId;
      if (comp.type === 'dc_supply' && canon === 'neg') return netId;
    }
  }
  return null;
}

/** True if the component is not connected to the rest of the circuit (both terminals in single-pin nets). Such components must be excluded from the netlist so they do not affect the solver. */
function isComponentFloating(
  comp: SimComponent,
  pins: string[],
  nets: Map<string, Net>,
  pinToNetId: Record<string, string>
): boolean {
  if (pins.length < 2) return true;
  const netIdA = pinToNetId[pinKey(comp.id, pins[0]!)];
  const netIdB = pinToNetId[pinKey(comp.id, pins[1]!)];
  if (!netIdA || !netIdB) return true;
  const netA = nets.get(netIdA);
  const netB = nets.get(netIdB);
  const sizeA = netA?.pins?.length ?? 0;
  const sizeB = netB?.pins?.length ?? 0;
  return sizeA === 1 && sizeB === 1;
}

export function buildNetlist(
  netsResult: NetsResult,
  components: SimComponent[],
  ledStates?: Map<string, boolean>
): Netlist {
  const { nets, pinToNetId } = netsResult;
  const warnings: string[] = [];
  const groundNetId = findGroundNet(nets, components);
  if (!groundNetId) {
    const batt = components.find((c) => c.type === 'dc_supply');
    if (batt) {
      const negKey = pinKey(batt.id, 'neg');
      const negNet = pinToNetId[negKey];
      if (negNet) {
        warnings.push('No explicit ground; using battery negative as reference');
      }
    }
  }
  // Only assign node indices to nets that are part of the connected circuit:
  // (1) ground net, or (2) nets with more than one pin. Single-pin (floating) nets
  // are excluded so unconnected components do not affect the matrix or cause singularity.
  const allNetIds = [...nets.keys()];
  const connectedNetIds = allNetIds.filter((netId) => {
    const net = nets.get(netId);
    const pinCount = net?.pins?.length ?? 0;
    return netId === groundNetId || pinCount > 1;
  });
  const groundIdx = groundNetId ? connectedNetIds.indexOf(groundNetId) : -1;
  const nodeIndexByNetId = new Map<string, number>();
  let idx = 0;
  if (groundIdx >= 0) {
    nodeIndexByNetId.set(connectedNetIds[groundIdx]!, 0);
    idx = 1;
  }
  for (let i = 0; i < connectedNetIds.length; i++) {
    if (i === groundIdx) continue;
    nodeIndexByNetId.set(connectedNetIds[i]!, idx++);
  }
  const groundNodeIndex = groundIdx >= 0 ? 0 : idx;
  let nodeCount = idx;

  const getNode = (compId: string, pinId: string): number | undefined => {
    const pk = pinKey(compId, pinId);
    const netId = pinToNetId[pk];
    if (!netId) return undefined;
    return nodeIndexByNetId.get(netId);
  };

  const solverComponents: NetlistComponent[] = [];

  /** Default internal resistance (Ω). Provides KVL headroom so e.g. 5V can drive 2×2V LEDs in series. */
  const R_INTERNAL_DEFAULT = 50;

  for (const c of components) {
    if (c.type === 'dc_supply') {
      const pNode = getNode(c.id, 'pos');
      const nNode = getNode(c.id, 'neg');
      if (pNode === undefined || nNode === undefined) {
        warnings.push(`Battery ${c.id}: floating pin`);
        continue;
      }
      const vMax = Math.max(1, (c.props?.vMax as number) ?? 12);
      const vRaw = (c.props?.voltage as number) ?? 5;
      const v = Math.max(0, Math.min(vMax, vRaw));
      const rInternal = (c.props?.rInternal as number) ?? R_INTERNAL_DEFAULT;
      const internalNode = nodeCount++;
      solverComponents.push({
        type: 'R',
        id: `${c.id}:rInternal`,
        aNode: pNode,
        bNode: internalNode,
        resistance: rInternal,
        floating: false,
      });
      const acEnabled = !!(c.props?.acEnabled as boolean);
      const amplitude = Math.max(0, (c.props?.amplitude as number) ?? 0);
      const frequencyHz = Math.max(0.001, (c.props?.frequencyHz as number) ?? 1);
      const phaseDeg = (c.props?.phaseDeg as number) ?? 0;
      const phaseRad = (phaseDeg * Math.PI) / 180;
      const waveform: VSourceWaveform | undefined = acEnabled && amplitude > 0
        ? { type: 'sine', amplitude, frequencyHz, phaseRad }
        : undefined;
      solverComponents.push({ type: 'VSource', id: c.id, pNode: internalNode, nNode, voltage: v, waveform });
      continue;
    }
    if (c.type === 'resistor') {
      const pins = getCanonicalPinIds(c);
      if (isComponentFloating(c, pins, nets, pinToNetId)) continue;
      const aNode = getNode(c.id, pins[0] ?? 'a');
      const bNode = getNode(c.id, pins[1] ?? 'b');
      const floating = aNode === undefined || bNode === undefined;
      const r = (c.props?.resistanceOhms ?? c.props?.ohms) as number | undefined ?? 220;
      solverComponents.push({
        type: 'R',
        id: c.id,
        aNode: aNode ?? 0,
        bNode: bNode ?? 0,
        resistance: r,
        floating,
      });
      continue;
    }
    if (c.type === 'switch' || (c.type as string) === 'toggle-switch') {
      const variantId = getSwitchVariantId(c.variantId);
      if (variantId === 'SPDT') {
        const comNode = getNode(c.id, 'P2');
        const aNode = getNode(c.id, 'P1');
        const bNode = getNode(c.id, 'P3');
        const position = (c.props?.position as string) === 'B' ? 'B' : 'A';
        const floating = comNode === undefined || aNode === undefined || bNode === undefined;
        solverComponents.push({
          type: 'Switch',
          id: `${c.id}:COM-A`,
          aNode: comNode ?? 0,
          bNode: aNode ?? 0,
          on: position === 'A',
          rOn: R_ON_SWITCH,
          rOff: R_OFF_SWITCH,
          floating,
        });
        solverComponents.push({
          type: 'Switch',
          id: `${c.id}:COM-B`,
          aNode: comNode ?? 0,
          bNode: bNode ?? 0,
          on: position === 'B',
          rOn: R_ON_SWITCH,
          rOff: R_OFF_SWITCH,
          floating,
        });
      } else if (variantId === 'DPST') {
        const on = !!(c.props?.on);
        const p1Node = getNode(c.id, 'P1');
        const p2Node = getNode(c.id, 'P2');
        const p3Node = getNode(c.id, 'P3');
        const p4Node = getNode(c.id, 'P4');
        const floating1 = p1Node === undefined || p2Node === undefined;
        const floating2 = p3Node === undefined || p4Node === undefined;
        solverComponents.push({
          type: 'Switch',
          id: `${c.id}:P1-P2`,
          aNode: p1Node ?? 0,
          bNode: p2Node ?? 0,
          on,
          rOn: R_ON_SWITCH,
          rOff: R_OFF_SWITCH,
          floating: floating1,
        });
        solverComponents.push({
          type: 'Switch',
          id: `${c.id}:P3-P4`,
          aNode: p3Node ?? 0,
          bNode: p4Node ?? 0,
          on,
          rOn: R_ON_SWITCH,
          rOff: R_OFF_SWITCH,
          floating: floating2,
        });
      } else if (variantId === 'DPDT') {
        const position = (c.props?.position as string) === 'B' ? 'B' : 'A';
        const p1Node = getNode(c.id, 'P1');
        const p2Node = getNode(c.id, 'P2');
        const p3Node = getNode(c.id, 'P3');
        const p4Node = getNode(c.id, 'P4');
        const p5Node = getNode(c.id, 'P5');
        const p6Node = getNode(c.id, 'P6');
        const floatingA1 = p2Node === undefined || p1Node === undefined;
        const floatingB1 = p2Node === undefined || p3Node === undefined;
        const floatingA2 = p5Node === undefined || p4Node === undefined;
        const floatingB2 = p5Node === undefined || p6Node === undefined;
        solverComponents.push({
          type: 'Switch',
          id: `${c.id}:COM1-A1`,
          aNode: p2Node ?? 0,
          bNode: p1Node ?? 0,
          on: position === 'A',
          rOn: R_ON_SWITCH,
          rOff: R_OFF_SWITCH,
          floating: floatingA1,
        });
        solverComponents.push({
          type: 'Switch',
          id: `${c.id}:COM1-B1`,
          aNode: p2Node ?? 0,
          bNode: p3Node ?? 0,
          on: position === 'B',
          rOn: R_ON_SWITCH,
          rOff: R_OFF_SWITCH,
          floating: floatingB1,
        });
        solverComponents.push({
          type: 'Switch',
          id: `${c.id}:COM2-A2`,
          aNode: p5Node ?? 0,
          bNode: p4Node ?? 0,
          on: position === 'A',
          rOn: R_ON_SWITCH,
          rOff: R_OFF_SWITCH,
          floating: floatingA2,
        });
        solverComponents.push({
          type: 'Switch',
          id: `${c.id}:COM2-B2`,
          aNode: p5Node ?? 0,
          bNode: p6Node ?? 0,
          on: position === 'B',
          rOn: R_ON_SWITCH,
          rOff: R_OFF_SWITCH,
          floating: floatingB2,
        });
      } else {
        const pins = getCanonicalPinIds(c);
        if (isComponentFloating(c, pins, nets, pinToNetId)) continue;
        const aNode = getNode(c.id, pins[0] ?? 'a');
        const bNode = getNode(c.id, pins[1] ?? 'b');
        const floating = aNode === undefined || bNode === undefined;
        const on = !!(c.props?.on);
        solverComponents.push({
          type: 'Switch',
          id: c.id,
          aNode: aNode ?? 0,
          bNode: bNode ?? 0,
          on,
          rOn: R_ON_SWITCH,
          rOff: R_OFF_SWITCH,
          floating,
        });
      }
      continue;
    }
    if ((c.type as string) === 'push_button' || (c.type as string) === 'push_button_momentary' || (c.type as string) === 'push_button_latch') {
      const p1 = getNode(c.id, 'P1');
      const p2 = getNode(c.id, 'P2');
      const floating = p1 === undefined || p2 === undefined;
      const isClosed = !!(c.props?.isClosed);
      const rOn = Math.max(1e-6, ((c.props?.rOnOhms as number) ?? 0.01));
      solverComponents.push({
        type: 'Switch',
        id: c.id,
        aNode: p1 ?? 0,
        bNode: p2 ?? 0,
        on: isClosed,
        rOn,
        rOff: R_OFF_SWITCH,
        floating,
      });
      continue;
    }
    if (c.type === 'buzzer') {
      const pins = getCanonicalPinIds(c);
      if (isComponentFloating(c, pins, nets, pinToNetId)) continue;
      const aNode = getNode(c.id, pins[0] ?? 'P');
      const bNode = getNode(c.id, pins[1] ?? 'N');
      const floating = aNode === undefined || bNode === undefined;
      const mode = (c.props?.mode as string) ?? 'active';
      const rOn = Math.max(1, (c.props?.rOn as number) ?? (c.props?.rOhms as number) ?? R_BUZZER_DEFAULT);
      const r = mode === 'passive' ? 1e9 : rOn;
      solverComponents.push({
        type: 'R',
        id: c.id,
        aNode: aNode ?? 0,
        bNode: bNode ?? 0,
        resistance: r,
        floating,
      });
      continue;
    }
    if (c.type === 'capacitor' || (c.type as string) === 'capacitor_polarized') {
      const pins = getCanonicalPinIds(c);
      if (isComponentFloating(c, pins, nets, pinToNetId)) continue;
      const aNode = getNode(c.id, pins[0] ?? 'a');
      const bNode = getNode(c.id, pins[1] ?? 'b');
      const floating = aNode === undefined || bNode === undefined;
      const rLeak = Math.max(1, (c.props?.rLeak as number) ?? R_LEAK_CAPACITOR_DEFAULT);
      const capacitance = Math.max(1e-12, (c.props?.capacitance as number) ?? CAPACITANCE_DEFAULT_FARAD);
      const polarized = (c.type as string) === 'capacitor_polarized';
      const ratedV = (c.props?.ratedVoltage as number) ?? 16;
      const reverseVmax = Math.min(ratedV * 0.1, (c.props?.reverseVmax as number) ?? CAPACITOR_REVERSE_VMAX_DEFAULT);
      solverComponents.push({
        type: 'Capacitor',
        id: c.id,
        aNode: aNode ?? 0,
        bNode: bNode ?? 0,
        rLeak,
        capacitance,
        polarized,
        reverseVmax,
        floating,
      });
      continue;
    }
    if (c.type === 'rgb_led') {
      const pins = ['R', 'G', 'B', 'COM'];
      const variantId = (c.props?.variantId as 'CC' | 'CA') ?? 'CC';
      const vfR = (c.props?.vfR as number) ?? 2;
      const vfG = (c.props?.vfG as number) ?? 3;
      const vfB = (c.props?.vfB as number) ?? 3;
      const rdyn = (v: number) => Math.max(1, Math.min(1e4, v));
      const rOnR = rdyn((c.props?.rdynR as number) ?? 20);
      const rOnG = rdyn((c.props?.rdynG as number) ?? 20);
      const rOnB = rdyn((c.props?.rdynB as number) ?? 20);
      const iMax = 0.03;
      const pushLed = (channel: 'R' | 'G' | 'B', aNode: number | undefined, bNode: number | undefined, vf: number, rOn: number) => {
        const floating = aNode === undefined || bNode === undefined;
        const ledOn = ledStates?.get(`${c.id}:${channel}`) ?? false;
        solverComponents.push({
          type: 'LED',
          id: `${c.id}:${channel}`,
          aNode: aNode ?? 0,
          bNode: bNode ?? 0,
          vf,
          rOn: ledOn ? rOn : R_OFF_LED,
          rOff: R_OFF_LED,
          iMax,
          floating,
        });
      };
      if (variantId === 'CC') {
        pushLed('R', getNode(c.id, 'R'), getNode(c.id, 'COM'), vfR, rOnR);
        pushLed('G', getNode(c.id, 'G'), getNode(c.id, 'COM'), vfG, rOnG);
        pushLed('B', getNode(c.id, 'B'), getNode(c.id, 'COM'), vfB, rOnB);
      } else {
        pushLed('R', getNode(c.id, 'COM'), getNode(c.id, 'R'), vfR, rOnR);
        pushLed('G', getNode(c.id, 'COM'), getNode(c.id, 'G'), vfG, rOnG);
        pushLed('B', getNode(c.id, 'COM'), getNode(c.id, 'B'), vfB, rOnB);
      }
      continue;
    }
    if (c.type === 'led') {
      const pins = ['anode', 'cathode'];
      if (isComponentFloating(c, pins, nets, pinToNetId)) continue;
      const aNode = getNode(c.id, 'anode');
      const bNode = getNode(c.id, 'cathode');
      const floating = aNode === undefined || bNode === undefined;
      const vf = (c.props?.forwardVoltage as number) ?? (c.props?.vf as number) ?? LED_VF_DEFAULT;
      const ledOn = ledStates?.get(c.id) ?? false;
      solverComponents.push({
        type: 'LED',
        id: c.id,
        aNode: aNode ?? 0,
        bNode: bNode ?? 0,
        vf,
        rOn: ledOn ? R_ON_LED : R_OFF_LED,
        rOff: R_OFF_LED,
        iMax: 0.03,
        floating,
      });
      continue;
    }
    if ((c.type as string) === 'diode') {
      const pins = ['A', 'K'];
      if (isComponentFloating(c, pins, nets, pinToNetId)) continue;
      const aNode = getNode(c.id, 'A') ?? getNode(c.id, 'anode');
      const bNode = getNode(c.id, 'K') ?? getNode(c.id, 'cathode');
      const floating = aNode === undefined || bNode === undefined;
      const vf = (c.props?.vf as number) ?? (c.props?.forwardVoltage as number) ?? VF_DIODE_DEFAULT;
      const rOn = Math.max(0.1, (c.props?.rOn as number) ?? R_ON_DIODE_DEFAULT);
      const vbr = (c.props?.vbr as number) ?? V_BR_DIODE;
      const rbr = Math.max(0.1, (c.props?.rbr as number) ?? R_BR_DIODE);
      solverComponents.push({
        type: 'Diode',
        id: c.id,
        aNode: aNode ?? 0,
        bNode: bNode ?? 0,
        vf,
        rOn,
        vbr,
        rbr,
        floating,
      });
      continue;
    }
    if ((c.type as string) === 'inductor') {
      const pins = getCanonicalPinIds(c);
      if (isComponentFloating(c, pins, nets, pinToNetId)) continue;
      const aNode = getNode(c.id, pins[0] ?? 'a');
      const bNode = getNode(c.id, pins[1] ?? 'b');
      const floating = aNode === undefined || bNode === undefined;
      const inductance = Math.max(1e-12, (c.props?.inductance as number) ?? INDUCTANCE_DEFAULT_H);
      solverComponents.push({
        type: 'Inductor',
        id: c.id,
        aNode: aNode ?? 0,
        bNode: bNode ?? 0,
        inductance,
        floating,
      });
      continue;
    }
    if ((c.type as string) === 'motor_dc') {
      const pins = getCanonicalPinIds(c);
      if (isComponentFloating(c, pins, nets, pinToNetId)) continue;
      const aNode = getNode(c.id, pins[0] ?? 'a');
      const bNode = getNode(c.id, pins[1] ?? 'b');
      const floating = aNode === undefined || bNode === undefined;
      const r = Math.max(0.1, (c.props?.rOhms as number) ?? (c.props?.r as number) ?? 10);
      const iNom = Math.max(0.01, (c.props?.iNom as number) ?? 0.2);
      const iMinSpin = Math.max(0, (c.props?.iMinSpin as number) ?? 0.01);
      solverComponents.push({
        type: 'Motor',
        id: c.id,
        aNode: aNode ?? 0,
        bNode: bNode ?? 0,
        r,
        iNom,
        iMinSpin,
        floating,
      });
      continue;
    }
    if ((c.type as string) === 'motor_ac') {
      const pins = getCanonicalPinIds(c);
      if (isComponentFloating(c, pins, nets, pinToNetId)) continue;
      const aNode = getNode(c.id, pins[0] ?? 'a');
      const bNode = getNode(c.id, pins[1] ?? 'b');
      const floating = aNode === undefined || bNode === undefined;
      const r = Math.max(0.1, (c.props?.rOhms as number) ?? 20);
      const iNom = Math.max(0.01, (c.props?.iNom as number) ?? 0.2);
      const iMinSpin = Math.max(0, (c.props?.iMinSpin as number) ?? 0.01);
      solverComponents.push({
        type: 'Motor',
        id: c.id,
        aNode: aNode ?? 0,
        bNode: bNode ?? 0,
        r,
        iNom,
        iMinSpin,
        floating,
      });
      continue;
    }
    if ((c.type as string) === 'transistor') {
      const bNode = getNode(c.id, 'B');
      const cNode = getNode(c.id, 'C');
      const eNode = getNode(c.id, 'E');
      const floating = cNode === undefined || eNode === undefined;
      solverComponents.push({
        type: 'Transistor',
        id: c.id,
        bNode: bNode ?? 0,
        cNode: cNode ?? 0,
        eNode: eNode ?? 0,
        polarity: ((c.props?.polarity as 'NPN' | 'PNP') ?? 'NPN'),
        beta: Math.max(1, (c.props?.beta as number) ?? 100),
        vbeOn: Math.max(0.4, (c.props?.vbeOn as number) ?? 0.7),
        vceSat: Math.max(0.05, (c.props?.vceSat as number) ?? 0.2),
        rBeOn: Math.max(10, (c.props?.rBeOn as number) ?? 1000),
        rOff: 1e9,
        floating,
      });
      continue;
    }
    if ((c.type as string) === 'potentiometer') {
      const inNode = getNode(c.id, 'IN');
      const outNode = getNode(c.id, 'OUT');
      const gndNode = getNode(c.id, 'GND');
      if (inNode === undefined || outNode === undefined || gndNode === undefined) continue;
      const rTotal = (c.props?.rTotalOhms as number) ?? 10000;
      let alpha = (c.props?.alpha as number) ?? 0.5;
      const taper = (c.props?.taper as string) ?? 'linear';
      if (taper === 'log') alpha = Math.pow(Math.max(0, Math.min(1, alpha)), 2.2);
      const rTop = Math.max(R_MIN_POT, Math.min(rTotal - R_MIN_POT, alpha * rTotal));
      const rBot = Math.max(R_MIN_POT, rTotal - rTop);
      solverComponents.push({
        type: 'R',
        id: `${c.id}:R_top`,
        aNode: inNode,
        bNode: outNode,
        resistance: rTop,
        floating: false,
      });
      solverComponents.push({
        type: 'R',
        id: `${c.id}:R_bot`,
        aNode: outNode,
        bNode: gndNode,
        resistance: rBot,
        floating: false,
      });
      continue;
    }
  }

  return {
    nodeIndexByNetId,
    nNodes: nodeCount,
    groundNodeIndex,
    groundNetId,
    components: solverComponents,
    warnings,
  };
}
