/**
 * Engine2: Orchestrate nets -> netlist -> MNA solve -> outputs.
 * LED: iterative piecewise-linear (OFF -> solve -> check forward bias -> ON -> resolve).
 */

import type { SimState } from '../types';
import { buildNets } from './nets';
import { buildNetlist, type Netlist } from './netlist';
import { buildMNA, solveMNA, type BuildMNAOptions } from './mna';
import type { NetlistComponent, LedOutput, RgbLedOutput, MotorOutput, VoltmeterOutput, PotOutput, TransistorOutput, BuzzerOutput, CapacitorOutput, DiodeOutput } from './models';
import {
  R_ON_LED,
  R_OFF_LED,
  LED_VF_HYSTERESIS,
  I_MIN_MOTOR,
  I_EPS,
  I_LED_MIN,
  I_LED_NOMINAL,
  I_LED_REF_BRIGHTNESS,
  I_FAKE_THRESHOLD,
  I_LED_DAMAGE,
  I_LED_BURNOUT,
  DAMAGE_TICKS_TO_DAMAGED,
  DAMAGE_TICKS_TO_BURNOUT,
  V_MIN_BUZZER,
  I_MIN_BUZZER,
  CAPACITANCE_DEFAULT_FARAD,
  DIODE_VF_HYSTERESIS,
  V_BR_DIODE,
} from './models';
import type { DiodeState } from './mna';
import { pinKey } from './types';
import { hasConductivePath, hasTopologyPath, buildConductiveAdjacency } from './conductivePath';

/** Minimum branch current (A) to consider a net "active" for flow visualization. Below this = no animation. */
const I_MIN_VIS = 1e-6;

export interface SolveResult {
  pinToNetId: Record<string, string>;
  netVoltagesById: Record<string, number>;
  nodeVoltagesByNetId: Record<string, number>;
  branchCurrentsByComponentId: Record<string, number>;
  outputsByComponentId: Record<string, LedOutput | RgbLedOutput | MotorOutput | VoltmeterOutput | PotOutput | TransistorOutput | BuzzerOutput | CapacitorOutput | DiodeOutput>;
  debugReport: import('./debug').DebugReport;
  singular: boolean;
  warnings: string[];
  /** Reference net (ground symbol or dc_supply neg). Null if no reference. */
  groundNetId: string | null;
  /** True if wires + switches + LEDs form a path from battery+ to return (ignores LED bias). */
  hasTopologyPath: boolean;
  /** True if there is a conductive path from battery+ to ground/return (includes forward-biased LEDs). */
  hasReturnPath: boolean;
  /** Energized state: loop closed = current can flow. Motor must not spin when loopClosed is false. */
  energized?: { loopClosed: boolean };
  /** Nets list for Net Inspector (id + pins). */
  nets: { id: string; pins: string[] }[];
  /** Net ids that have non-zero branch current (for current flow animation only). No current = no animation. */
  activeNetIds: Set<string>;
  /** Nets with potential present (reachable from source+ through conductive path). Open switch blocks FEED downstream. */
  feedNetIds: Set<string>;
  /** Key "${netA}:${netB}" -> signed current from netA to netB (for wire flow direction). Positive = conventional current A -> B. */
  netPairToSignedCurrent: Record<string, number>;
}

const MAX_LED_ITER = 10;
const MAX_TRANSIENT_NONLINEAR_ITER = 10;
const GMIN = 1e-12;
const loggedZeroVoltmeterIds = new Set<string>();
const TRANS_EQ_EPS = 1e-6;

type LedMeta = {
  id: string;
  aNode: number;
  bNode: number;
  vf: number;
  on: boolean;
  ron: number;
  roff: number;
  midNode?: number;
  iMax: number;
};

type TransSolveState = {
  region: 'cutoff' | 'active' | 'saturation';
  beOn: boolean;
  ib: number;
  ic: number;
  rceSat: number;
};

type TransMeta = Extract<NetlistComponent, { type: 'Transistor' }>;
type DiodeMeta = Extract<NetlistComponent, { type: 'Diode' }>;

function evaluateTransistor(meta: TransMeta, nodeVoltages: number[]): TransSolveState {
  const vb = nodeVoltages[meta.bNode] ?? 0;
  const vc = nodeVoltages[meta.cNode] ?? 0;
  const ve = nodeVoltages[meta.eNode] ?? 0;
  const vbeSigned = meta.polarity === 'NPN' ? (vb - ve) : (ve - vb);
  if (vbeSigned < meta.vbeOn) {
    return { region: 'cutoff', beOn: false, ib: 0, ic: 0, rceSat: meta.rOff };
  }
  const ib = Math.max(0, (vbeSigned - meta.vbeOn) / Math.max(meta.rBeOn, 1));
  const icTarget = Math.max(0, meta.beta * ib);
  const vceSigned = meta.polarity === 'NPN' ? (vc - ve) : (ve - vc);
  if (vceSigned <= meta.vceSat) {
    const rceSat = Math.max(0.1, meta.vceSat / Math.max(icTarget, 1e-6));
    return { region: 'saturation', beOn: true, ib, ic: icTarget, rceSat };
  }
  return { region: 'active', beOn: true, ib, ic: icTarget, rceSat: meta.rOff };
}

function transistorStateEqual(a: TransSolveState | undefined, b: TransSolveState): boolean {
  if (!a) return false;
  return (
    a.region === b.region &&
    Math.abs(a.ib - b.ib) < TRANS_EQ_EPS &&
    Math.abs(a.ic - b.ic) < TRANS_EQ_EPS &&
    Math.abs(a.rceSat - b.rceSat) < 1e-3
  );
}

const AC_REQUIRES_TRANSIENT_WARNING = 'AC sources require transient simulation; showing DC offset only.';

export function solveCircuit(state: SimState): SolveResult {
  const { components, wires } = state;
  const netsResult = buildNets(components, wires);
  const warnings = [...netsResult.errors];

  const hasACSource = components.some((c) => c.type === 'dc_supply' && !!(c.props?.acEnabled as boolean));
  if (hasACSource && !warnings.includes(AC_REQUIRES_TRANSIENT_WARNING)) {
    warnings.push(AC_REQUIRES_TRANSIENT_WARNING);
  }

  let ledStates = new Map<string, boolean>();
  let transistorStates = new Map<string, TransSolveState>();
  let diodeStates = new Map<string, DiodeState>();
  let netlist = buildNetlist(netsResult, components, ledStates);
  warnings.push(...netlist.warnings);

  let iter = 0;
  while (iter < MAX_LED_ITER) {
    const expanded = expandForSolve(state, netlist.components, netlist.nNodes, ledStates, transistorStates, diodeStates);
    const ctx = buildMNA(expanded.components, expanded.nNodes, { diodeStates });
    let sol = solveMNA(ctx);
    if (sol.singular) {
      // gmin stabilization retry
      applyGmin(ctx, GMIN);
      sol = solveMNA(ctx);
      if (!warnings.includes('Applied gmin stabilization')) warnings.push('Applied gmin stabilization');
    }

    if (sol.singular) {
      return buildDebugAndOutputs(
        state,
        netsResult,
        { ...netlist, components: expanded.components, nNodes: expanded.nNodes, _ledMeta: expanded.ledMeta, _transMeta: expanded.transMeta, _transState: transistorStates, _diodeMeta: expanded.diodeMeta, _diodeStates: diodeStates } as any,
        sol.nodeVoltages,
        sol.vsourceCurrents,
        sol.singular,
        sol.reason,
        warnings
      );
    }

    const nodeVoltages = sol.nodeVoltages;
    let changed = false;
    for (const d of expanded.diodeMeta) {
      const va = nodeVoltages[d.aNode] ?? 0;
      const vk = nodeVoltages[d.bNode] ?? 0;
      const vd = va - vk;
      const vbr = d.vbr ?? V_BR_DIODE;
      const prev = diodeStates.get(d.id) ?? 'OFF';
      let next: DiodeState = prev;
      if (vd <= -vbr) {
        next = 'BREAKDOWN';
      } else if (prev === 'ON' || prev === 'BREAKDOWN') {
        next = vd >= d.vf - DIODE_VF_HYSTERESIS ? 'ON' : 'OFF';
        if (prev === 'BREAKDOWN' && vd > -vbr) next = vd >= d.vf + DIODE_VF_HYSTERESIS ? 'ON' : 'OFF';
      } else {
        next = vd > d.vf + DIODE_VF_HYSTERESIS ? 'ON' : 'OFF';
      }
      if (next !== prev) {
        if (!changed) diodeStates = new Map(diodeStates);
        diodeStates.set(d.id, next);
        changed = true;
      }
    }
    for (const led of expanded.ledMeta) {
      const va = nodeVoltages[led.aNode] ?? 0;
      const vk = nodeVoltages[led.bNode] ?? 0;
      const v = va - vk;
      const prev = ledStates.get(led.id) ?? false;
      const shouldOn = prev
        ? v >= led.vf - LED_VF_HYSTERESIS
        : v > led.vf + LED_VF_HYSTERESIS;
      if (shouldOn !== prev) {
        if (!changed) ledStates = new Map(ledStates);
        ledStates.set(led.id, shouldOn);
        changed = true;
      }
    }
    for (const t of expanded.transMeta) {
      const next = evaluateTransistor(t, nodeVoltages);
      const prev = transistorStates.get(t.id);
      if (!transistorStateEqual(prev, next)) {
        if (!changed) transistorStates = new Map(transistorStates);
        transistorStates.set(t.id, next);
        changed = true;
      }
    }
    if (!changed) break;
    iter++;
  }

  const expanded = expandForSolve(state, netlist.components, netlist.nNodes, ledStates, transistorStates, diodeStates);
  const ctx = buildMNA(expanded.components, expanded.nNodes, { diodeStates });
  let sol = solveMNA(ctx);
  if (sol.singular) {
    applyGmin(ctx, GMIN);
    sol = solveMNA(ctx);
    if (!warnings.includes('Applied gmin stabilization')) warnings.push('Applied gmin stabilization');
  }
  return buildDebugAndOutputs(
    state,
    netsResult,
    { ...netlist, components: expanded.components, nNodes: expanded.nNodes, _ledMeta: expanded.ledMeta, _transMeta: expanded.transMeta, _transState: transistorStates, _diodeMeta: expanded.diodeMeta, _diodeStates: diodeStates } as any,
    sol.nodeVoltages,
    sol.vsourceCurrents,
    sol.singular ?? false,
    sol.reason,
    warnings
  );
}

/** Per-capacitor vPrev and damaged flag for transient. Per-inductor previous current (a→b) for BE companion. */
export interface TransientState {
  capacitorVPrev: Map<string, number>;
  capacitorDamaged: Map<string, boolean>;
  inductorIPrev: Map<string, number>;
  ledStates: Map<string, boolean>;
  transistorStates: Map<string, TransSolveState>;
  diodeStates: Map<string, DiodeState>;
}

/** One transient step: stamp caps with BE companion, solve, postStep update vPrev, return SolveResult with cap branch currents. */
export function stepTransient(
  state: SimState,
  netsResult: { pinToNetId: Record<string, string>; nets: Map<string, { id: string; pins: string[] }>; errors: string[] },
  netlist: Netlist,
  transientState: TransientState,
  dt: number,
  /** Current simulation time (s). When provided, AC sources use Vs(t). */
  transientTime?: number
): SolveResult {
  const warnings = [...netsResult.errors, ...netlist.warnings];
  const mnaOptsBase: BuildMNAOptions = {
    dt,
    capacitorVPrev: transientState.capacitorVPrev,
    inductorIPrev: transientState.inductorIPrev,
    diodeStates: transientState.diodeStates,
    transientTime,
  };
  let expanded: ReturnType<typeof expandForSolve> = expandForSolve(state, netlist.components, netlist.nNodes, transientState.ledStates, transientState.transistorStates, transientState.diodeStates);
  let sol: ReturnType<typeof solveMNA> = { nodeVoltages: [], vsourceCurrents: {}, singular: true };
  let innerIter = 0;
  while (innerIter < MAX_TRANSIENT_NONLINEAR_ITER) {
    const ctx = buildMNA(expanded.components, expanded.nNodes, mnaOptsBase);
    sol = solveMNA(ctx);
    if (sol.singular) {
      applyGmin(ctx, GMIN);
      sol = solveMNA(ctx);
      if (!warnings.includes('Applied gmin stabilization')) warnings.push('Applied gmin stabilization');
    }
    if (sol.singular) break;
    const nodeVoltages = sol.nodeVoltages;
    let changed = false;
    for (const led of expanded.ledMeta) {
      const va = nodeVoltages[led.aNode] ?? 0;
      const vk = nodeVoltages[led.bNode] ?? 0;
      const v = va - vk;
      const prev = transientState.ledStates.get(led.id) ?? false;
      const shouldOn = prev ? v >= led.vf - LED_VF_HYSTERESIS : v > led.vf + LED_VF_HYSTERESIS;
      if (shouldOn !== prev) {
        transientState.ledStates.set(led.id, shouldOn);
        changed = true;
      }
    }
    for (const t of expanded.transMeta) {
      const next = evaluateTransistor(t, nodeVoltages);
      const prev = transientState.transistorStates.get(t.id);
      if (!transistorStateEqual(prev, next)) {
        transientState.transistorStates.set(t.id, next);
        changed = true;
      }
    }
    for (const d of expanded.diodeMeta) {
      const va = nodeVoltages[d.aNode] ?? 0;
      const vk = nodeVoltages[d.bNode] ?? 0;
      const vd = va - vk;
      const vbr = d.vbr ?? V_BR_DIODE;
      const prev = transientState.diodeStates.get(d.id) ?? 'OFF';
      let next: DiodeState = prev;
      if (vd <= -vbr) next = 'BREAKDOWN';
      else if (prev === 'ON' || prev === 'BREAKDOWN') {
        next = vd >= d.vf - DIODE_VF_HYSTERESIS ? 'ON' : 'OFF';
        if (prev === 'BREAKDOWN' && vd > -vbr) next = vd >= d.vf + DIODE_VF_HYSTERESIS ? 'ON' : 'OFF';
      } else next = vd > d.vf + DIODE_VF_HYSTERESIS ? 'ON' : 'OFF';
      if (next !== prev) {
        transientState.diodeStates.set(d.id, next);
        changed = true;
      }
    }
    if (!changed) break;
    innerIter++;
    expanded = expandForSolve(state, netlist.components, netlist.nNodes, transientState.ledStates, transientState.transistorStates, transientState.diodeStates);
  }
  const nodeVoltages = sol.nodeVoltages;
  const capacitorBranchCurrents: Record<string, number> = {};
  for (const c of netlist.components) {
    if (c.type !== 'Capacitor' || c.floating) continue;
    const va = nodeVoltages[c.aNode] ?? 0;
    const vb = nodeVoltages[c.bNode] ?? 0;
    const vNow = va - vb;
    const vPrev = transientState.capacitorVPrev.get(c.id) ?? 0;
    const iCap = c.capacitance * (vNow - vPrev) / dt;
    capacitorBranchCurrents[c.id] = iCap;
    transientState.capacitorVPrev.set(c.id, vNow);
    if (c.polarized && vNow < -(c.reverseVmax ?? 1)) {
      transientState.capacitorDamaged.set(c.id, true);
    }
  }
  for (const c of netlist.components) {
    if (c.type !== 'Inductor' || c.floating || dt <= 0) continue;
    const va = nodeVoltages[c.aNode] ?? 0;
    const vb = nodeVoltages[c.bNode] ?? 0;
    const L = Math.max(1e-12, c.inductance);
    const G = dt / L;
    const iPrev = transientState.inductorIPrev.get(c.id) ?? 0;
    const i = iPrev + G * (va - vb);
    transientState.inductorIPrev.set(c.id, i);
  }
  expanded = expandForSolve(state, netlist.components, netlist.nNodes, transientState.ledStates, transientState.transistorStates, transientState.diodeStates);
  const fullNetlist = { ...netlist, nNodes: expanded.nNodes, _ledMeta: expanded.ledMeta, _transMeta: expanded.transMeta, _transState: transientState.transistorStates, _diodeMeta: expanded.diodeMeta, _diodeStates: transientState.diodeStates };
  return buildDebugAndOutputs(state, netsResult, fullNetlist, nodeVoltages, sol.vsourceCurrents ?? {}, sol.singular ?? false, sol.reason, warnings, capacitorBranchCurrents);
}

/** Run transient from t=0 to duration; seed LED/transistor state with one DC convergence. */
export function runTransient(
  state: SimState,
  options: { dt: number; duration: number; vInitCap?: Record<string, number>; onStep?: (t: number, result: SolveResult) => void }
): { lastResult: SolveResult; transientState: TransientState } {
  const { dt, duration, vInitCap = {}, onStep } = options;
  const netsResult = buildNets(state.components, state.wires);
  let ledStates = new Map<string, boolean>();
  let transistorStates = new Map<string, TransSolveState>();
  let diodeStates = new Map<string, DiodeState>();
  let netlist = buildNetlist(netsResult, state.components, ledStates);
  let iter = 0;
  while (iter < MAX_LED_ITER) {
    const expanded = expandForSolve(state, netlist.components, netlist.nNodes, ledStates, transistorStates, diodeStates);
    const ctx = buildMNA(expanded.components, expanded.nNodes, { diodeStates });
    let sol = solveMNA(ctx);
    if (sol.singular) {
      applyGmin(ctx, GMIN);
      sol = solveMNA(ctx);
    }
    if (sol.singular) break;
    const nodeVoltages = sol.nodeVoltages;
    let changed = false;
    for (const d of expanded.diodeMeta) {
      const va = nodeVoltages[d.aNode] ?? 0;
      const vk = nodeVoltages[d.bNode] ?? 0;
      const vd = va - vk;
      const vbr = d.vbr ?? V_BR_DIODE;
      const prev = diodeStates.get(d.id) ?? 'OFF';
      let next: DiodeState = prev;
      if (vd <= -vbr) next = 'BREAKDOWN';
      else if (prev === 'ON' || prev === 'BREAKDOWN') {
        next = vd >= d.vf - DIODE_VF_HYSTERESIS ? 'ON' : 'OFF';
        if (prev === 'BREAKDOWN' && vd > -vbr) next = vd >= d.vf + DIODE_VF_HYSTERESIS ? 'ON' : 'OFF';
      } else next = vd > d.vf + DIODE_VF_HYSTERESIS ? 'ON' : 'OFF';
      if (next !== prev) {
        if (!changed) diodeStates = new Map(diodeStates);
        diodeStates.set(d.id, next);
        changed = true;
      }
    }
    for (const led of expanded.ledMeta) {
      const va = nodeVoltages[led.aNode] ?? 0;
      const vk = nodeVoltages[led.bNode] ?? 0;
      const v = va - vk;
      const prev = ledStates.get(led.id) ?? false;
      const shouldOn = prev ? v >= led.vf - LED_VF_HYSTERESIS : v > led.vf + LED_VF_HYSTERESIS;
      if (shouldOn !== prev) {
        if (!changed) ledStates = new Map(ledStates);
        ledStates.set(led.id, shouldOn);
        changed = true;
      }
    }
    for (const t of expanded.transMeta) {
      const next = evaluateTransistor(t, nodeVoltages);
      const prev = transistorStates.get(t.id);
      if (!transistorStateEqual(prev, next)) {
        if (!changed) transistorStates = new Map(transistorStates);
        transistorStates.set(t.id, next);
        changed = true;
      }
    }
    if (!changed) break;
    iter++;
  }
  const capacitorVPrev = new Map<string, number>();
  const inductorIPrev = new Map<string, number>();
  for (const c of netlist.components) {
    if (c.type === 'Capacitor') capacitorVPrev.set(c.id, vInitCap[c.id] ?? 0);
  }
  const transientState: TransientState = {
    capacitorVPrev,
    capacitorDamaged: new Map(),
    inductorIPrev,
    ledStates,
    transistorStates,
    diodeStates,
  };
  let lastResult: SolveResult = solveCircuit(state);
  const nSteps = Math.max(1, Math.floor(duration / dt));
  for (let step = 0; step < nSteps; step++) {
    const t = (step + 1) * dt;
    lastResult = stepTransient(state, netsResult, netlist, transientState, dt, t);
    onStep?.(t, lastResult);
  }
  return { lastResult, transientState };
}

function applyGmin(ctx: ReturnType<typeof buildMNA>, gmin: number) {
  for (let i = 1; i < ctx.nNodes; i++) {
    ctx.G[i]![i]! += gmin;
  }
}

function expandForSolve(
  state: SimState,
  base: NetlistComponent[],
  nNodesBase: number,
  ledStates: Map<string, boolean>,
  transistorStates: Map<string, TransSolveState>,
  diodeStates: Map<string, DiodeState>
): { components: NetlistComponent[]; nNodes: number; ledMeta: LedMeta[]; transMeta: TransMeta[]; diodeMeta: DiodeMeta[] } {
  let nextNode = nNodesBase;
  const out: NetlistComponent[] = [];
  const ledMeta: LedMeta[] = [];
  const transMeta: TransMeta[] = [];
  const diodeMeta: DiodeMeta[] = [];
  for (const c of base) {
    if (c.type === 'Diode') {
      if (!c.floating) diodeMeta.push(c);
      out.push(c);
      continue;
    }
    if (c.type === 'Transistor') {
      transMeta.push(c);
      if (c.floating) continue;
      const ts = transistorStates.get(c.id) ?? { region: 'cutoff', beOn: false, ib: 0, ic: 0, rceSat: c.rOff };
      // Base-emitter branch (piecewise resistor approximation of B-E diode).
      out.push({
        type: 'R',
        id: `q:${c.id}:be`,
        aNode: c.bNode,
        bNode: c.eNode,
        resistance: ts.beOn ? c.rBeOn : c.rOff,
      });
      if (ts.region === 'active' && ts.ic > 0) {
        out.push(
          c.polarity === 'NPN'
            ? { type: 'ISource', id: `q:${c.id}:ic`, aNode: c.cNode, bNode: c.eNode, current: ts.ic }
            : { type: 'ISource', id: `q:${c.id}:ic`, aNode: c.eNode, bNode: c.cNode, current: ts.ic }
        );
        out.push({ type: 'R', id: `q:${c.id}:ce_off`, aNode: c.cNode, bNode: c.eNode, resistance: c.rOff });
      } else if (ts.region === 'saturation') {
        out.push({ type: 'R', id: `q:${c.id}:ce_sat`, aNode: c.cNode, bNode: c.eNode, resistance: ts.rceSat });
      } else {
        out.push({ type: 'R', id: `q:${c.id}:ce_off`, aNode: c.cNode, bNode: c.eNode, resistance: c.rOff });
      }
      continue;
    }
    if (c.type !== 'LED') {
      out.push(c);
      continue;
    }
    const rOn = (c as { rOn?: number }).rOn ?? R_ON_LED;
    const ledComp = state.components.find((cc) => cc.id === c.id);
    const burned = !!(ledComp?.props?.ledBurned as boolean);
    const on = !burned && (ledStates.get(c.id) ?? false);
    const meta: LedMeta = {
      id: c.id,
      aNode: c.aNode,
      bNode: c.bNode,
      vf: c.vf,
      on,
      ron: rOn,
      roff: R_OFF_LED,
      iMax: c.iMax ?? 0.03,
    };
    if (c.floating) {
      ledMeta.push({ ...meta, on: false });
      continue;
    }
    if (!on) {
      // OFF: very large resistor between anode/cathode
      out.push({ type: 'R', id: `led:${c.id}:off`, aNode: c.aNode, bNode: c.bNode, resistance: R_OFF_LED });
      ledMeta.push(meta);
      continue;
    }
    // ON: hidden mid node, resistor anode->mid, voltage source mid->cathode = Vf
    const mid = nextNode++;
    meta.midNode = mid;
    out.push({ type: 'R', id: `led:${c.id}:ron`, aNode: c.aNode, bNode: mid, resistance: rOn });
    out.push({ type: 'VSource', id: `led:${c.id}:vf`, pNode: mid, nNode: c.bNode, voltage: c.vf });
    ledMeta.push(meta);
  }
  return { components: out, nNodes: nextNode, ledMeta, transMeta, diodeMeta };
}

function buildDebugAndOutputs(
  state: SimState,
  netsResult: { pinToNetId: Record<string, string>; nets: Map<string, { id: string; pins: string[] }> },
  netlist: { nodeIndexByNetId: Map<string, number>; components: NetlistComponent[]; nNodes: number; _ledMeta?: LedMeta[]; _transMeta?: TransMeta[]; _transState?: Map<string, TransSolveState>; _diodeMeta?: DiodeMeta[]; _diodeStates?: Map<string, DiodeState>; groundNetId?: string | null },
  nodeVoltages: number[],
  vsourceCurrents: Record<string, number>,
  singular: boolean,
  reason: string | undefined,
  warnings: string[],
  /** When in transient, cap branch current = C*(vNow-vPrev)/dt; override DC (va-vb)/rLeak. */
  capacitorBranchCurrents?: Record<string, number>
): SolveResult {
  const netVoltagesById: Record<string, number> = {};
  const nodeVoltagesByNetId: Record<string, number> = {};
  for (const [netId, nodeIdx] of netlist.nodeIndexByNetId) {
    const v = nodeVoltages[nodeIdx] ?? 0;
    netVoltagesById[netId] = v;
    nodeVoltagesByNetId[netId] = v;
  }

  const branchCurrentsByComponentId: Record<string, number> = {};
  const outputsByComponentId: Record<string, LedOutput | RgbLedOutput | MotorOutput | VoltmeterOutput | PotOutput | TransistorOutput | BuzzerOutput | CapacitorOutput | DiodeOutput> = {};

  for (const c of netlist.components) {
    if (c.type === 'VSource') {
      branchCurrentsByComponentId[c.id] = vsourceCurrents[c.id] ?? 0;
      continue;
    }
    if (c.type === 'R' || c.type === 'Switch') {
      const va = nodeVoltages[c.aNode] ?? 0;
      const vb = nodeVoltages[c.bNode] ?? 0;
      const r = c.type === 'Switch' ? (c.on ? c.rOn : c.rOff) : c.resistance;
      branchCurrentsByComponentId[c.id] = (va - vb) / r;
      continue;
    }
    if (c.type === 'Capacitor') {
      if (capacitorBranchCurrents != null && capacitorBranchCurrents[c.id] !== undefined) {
        branchCurrentsByComponentId[c.id] = capacitorBranchCurrents[c.id]!;
      } else {
        const va = nodeVoltages[c.aNode] ?? 0;
        const vb = nodeVoltages[c.bNode] ?? 0;
        branchCurrentsByComponentId[c.id] = (va - vb) / c.rLeak;
      }
      continue;
    }
    if (c.type === 'Motor') {
      const va = nodeVoltages[c.aNode] ?? 0;
      const vb = nodeVoltages[c.bNode] ?? 0;
      const v = va - vb;
      const r = Math.max(1e-6, c.r);
      const iSigned = v / r;
      const i = Math.abs(iSigned);
      branchCurrentsByComponentId[c.id] = iSigned;
      const iMinSpin = (c as { iMinSpin?: number }).iMinSpin ?? I_MIN_MOTOR;
      const iNom = (c as { iNom?: number }).iNom ?? 0.2;
      // Motor spin ONLY from solved branch current. No voltage heuristic. (hasReturnPath guard applied later.)
      const spinning = !singular && i > iMinSpin;
      const speed = iNom > 0 ? Math.min(1, i / iNom) : 0;
      const dir: 1 | -1 | 0 = iSigned > 1e-9 ? 1 : iSigned < -1e-9 ? -1 : 0;
      const power = v * iSigned;
      let reasonIfNot: string | undefined;
      if (singular) reasonIfNot = 'Circuit singular or unsolved';
      else if (!spinning) reasonIfNot = i <= iMinSpin ? 'No current (open loop or no path)' : undefined;
      outputsByComponentId[c.id] = {
        spinning,
        speed,
        current: iSigned,
        voltage: v,
        va,
        vb,
        direction: dir,
        power,
        reasonIfNot,
      };
      continue;
    }
  }

  const pinToNetId = netsResult.pinToNetId;

  for (const c of state.components) {
    if (c.type !== 'buzzer') continue;
    const netP = pinToNetId[pinKey(c.id, 'P')];
    const netN = pinToNetId[pinKey(c.id, 'N')];
    const vPlus = netP != null ? netVoltagesById[netP] : undefined;
    const vMinus = netN != null ? netVoltagesById[netN] : undefined;
    const vBuz = vPlus != null && vMinus != null ? vPlus - vMinus : 0;
    const i = branchCurrentsByComponentId[c.id] ?? 0;
    const mode = (c.props?.mode as string) ?? 'active';
    const vMin = (c.props?.vMin as number) ?? V_MIN_BUZZER;
    const iMin = (c.props?.iMin as number) ?? I_MIN_BUZZER;
    const audible =
      !singular &&
      mode === 'active' &&
      vPlus != null &&
      vMinus != null &&
      vBuz >= vMin &&
      Math.abs(i) >= iMin &&
      vBuz > 0;
    let reasonIfNot: string | undefined;
    if (singular) reasonIfNot = 'Circuit singular or unsolved';
    else if (mode === 'passive') reasonIfNot = 'Requires PWM/AC input';
    else if (vPlus == null || vMinus == null) reasonIfNot = 'Floating pin(s)';
    else if (vBuz < vMin) reasonIfNot = `Vbuz < Vmin (${vBuz.toFixed(2)}V < ${vMin}V)`;
    else if (Math.abs(i) < iMin) reasonIfNot = 'No current (open loop or no path)';
    else if (vBuz <= 0) reasonIfNot = 'Reversed polarity';
    outputsByComponentId[c.id] = {
      audible,
      vPlus: vPlus ?? 0,
      vMinus: vMinus ?? 0,
      vBuz,
      current: i,
      reasonIfNot,
    };
  }

  for (const led of netlist._ledMeta ?? []) {
    const va = nodeVoltages[led.aNode] ?? 0;
    const vk = nodeVoltages[led.bNode] ?? 0;
    const vdrop = va - vk;
    let i = 0;
    if (led.on && led.midNode != null) {
      const vmid = nodeVoltages[led.midNode] ?? vk;
      i = Math.max(0, (va - vmid) / led.ron);
    } else {
      i = Math.max(0, vdrop / led.roff);
    }
    i = Math.min(i, led.iMax);
    const power = vdrop * i;

    const ledComp = state.components.find((cc) => cc.id === led.id);
    let damageAccumTicks = (ledComp?.props?.ledDamageAccumTicks as number) ?? 0;
    if (i > I_LED_BURNOUT) damageAccumTicks += 2;
    else if (i > I_LED_DAMAGE) damageAccumTicks += 1;
    else if (i <= I_LED_NOMINAL) damageAccumTicks = Math.max(0, damageAccumTicks - 1);

    let status: import('./models').LedStatus = 'ok';
    if (damageAccumTicks >= DAMAGE_TICKS_TO_BURNOUT) status = 'burned';
    else if (damageAccumTicks >= DAMAGE_TICKS_TO_DAMAGED) status = 'damaged';
    else if (i > I_LED_NOMINAL) status = 'overcurrent';

    // Hard rule: LED ON only from branch current. No closed loop → I=0 → OFF. No "voltage somewhere" faking.
    const burned = status === 'burned';
    const on = !singular && !burned && i > I_LED_MIN && vdrop > led.vf;
    const absI = Math.abs(i);
    const brightness =
      absI < I_FAKE_THRESHOLD ? 0 : on ? Math.min(1, Math.max(0, absI / I_LED_REF_BRIGHTNESS)) : 0;

    let reasonOut: string | undefined;
    if (singular) reasonOut = reason;
    else if (!on) reasonOut = burned ? 'LED burned out' : i <= I_LED_MIN ? 'No current (open loop or no path)' : vdrop <= led.vf ? 'Not forward biased' : `Insufficient voltage (Va-Vk=${vdrop.toFixed(2)}V)`;
    else if (i > I_LED_NOMINAL) reasonOut = 'Resistor recommended';
    if (status === 'damaged') reasonOut = (reasonOut ? reasonOut + '; ' : '') + 'LED damaged';
    if (status === 'burned') reasonOut = (reasonOut ? reasonOut + '; ' : '') + 'LED burned out';

    outputsByComponentId[led.id] = {
      on,
      current: i,
      voltageDrop: vdrop,
      brightness,
      reason: reasonOut,
      power,
      status,
      damageAccumTicks,
    };
    branchCurrentsByComponentId[led.id] = i;
  }

  // Diode: piecewise-linear output from _diodeMeta and _diodeStates.
  const diodeStates = netlist._diodeStates ?? new Map<string, DiodeState>();
  for (const d of netlist._diodeMeta ?? []) {
    const va = nodeVoltages[d.aNode] ?? 0;
    const vk = nodeVoltages[d.bNode] ?? 0;
    const vd = va - vk;
    const state = diodeStates.get(d.id) ?? 'OFF';
    const vbr = d.vbr ?? 50;
    const rbr = Math.max(0.1, d.rbr ?? 10);
    let id: number;
    let reasonIfNot: string | undefined;
    if (state === 'ON') {
      id = (1 / Math.max(d.rOn, 1e-6)) * (vd - d.vf);
      if (singular) reasonIfNot = 'Circuit singular or unsolved';
    } else if (state === 'BREAKDOWN') {
      id = (vd + vbr) / rbr;
      if (singular) reasonIfNot = 'Circuit singular or unsolved';
    } else {
      const rOff = 1e9;
      id = vd / rOff;
      if (singular) reasonIfNot = 'Circuit singular or unsolved';
      else reasonIfNot = vd < d.vf ? 'Not forward biased' : undefined;
    }
    const power = vd * id;
    (outputsByComponentId as Record<string, DiodeOutput>)[d.id] = { vd, state, id, reasonIfNot, power };
    branchCurrentsByComponentId[d.id] = id;
  }

  // Aggregate per-channel LedOutputs into RgbLedOutput for each rgb_led (keep :R, :G, :B entries for branch currents).
  for (const c of state.components) {
    if (c.type !== 'rgb_led') continue;
    const outR = outputsByComponentId[`${c.id}:R`] as LedOutput | undefined;
    const outG = outputsByComponentId[`${c.id}:G`] as LedOutput | undefined;
    const outB = outputsByComponentId[`${c.id}:B`] as LedOutput | undefined;
    const iref = Math.max(1e-6, (c.props?.iref as number) ?? I_LED_REF_BRIGHTNESS);
    const b = (out: LedOutput | undefined): number => {
      if (!out) return 0;
      const i = Math.abs(out.current);
      return i < I_FAKE_THRESHOLD ? 0 : Math.min(1, Math.max(0, i / iref));
    };
    const brightnessR = b(outR);
    const brightnessG = b(outG);
    const brightnessB = b(outB);
    const mixedColor = { r: brightnessR, g: brightnessG, b: brightnessB };
    (outputsByComponentId as Record<string, RgbLedOutput>)[c.id] = {
      brightnessR,
      brightnessG,
      brightnessB,
      currentR: outR?.current ?? 0,
      currentG: outG?.current ?? 0,
      currentB: outB?.current ?? 0,
      voltageDropR: outR?.voltageDrop ?? 0,
      voltageDropG: outG?.voltageDrop ?? 0,
      voltageDropB: outB?.voltageDrop ?? 0,
      mixedColor,
    };
  }

  // Overlay: add diagnostic fields only. Do NOT overwrite on/brightness — those come from branch current above.
  const battery = state.components.find((c) => c.type === 'dc_supply');
  const netP = battery ? (pinToNetId[pinKey(battery.id, 'pos')] ?? pinToNetId[pinKey(battery.id, 'P')]) : undefined;
  const netN = battery ? (pinToNetId[pinKey(battery.id, 'neg')] ?? pinToNetId[pinKey(battery.id, 'N')]) : undefined;
  const groundNetId = (netlist as { groundNetId?: string | null }).groundNetId ?? undefined;
  const returnNet = groundNetId ?? netN ?? null;

  for (const led of netlist._ledMeta ?? []) {
    // RGB LED channels use ids like "compId:R"; they have no anode/cathode pin keys on the netlist.
    if (led.id.includes(':')) continue;
    const netA = pinToNetId[pinKey(led.id, 'anode')] ?? pinToNetId[pinKey(led.id, 'A')];
    const netK = pinToNetId[pinKey(led.id, 'cathode')] ?? pinToNetId[pinKey(led.id, 'K')];
    const vA = netA != null ? netVoltagesById[netA] : undefined;
    const vK = netK != null ? netVoltagesById[netK] : undefined;

    let reasonIfNot: string | undefined;
    if (!netA || !netK) {
      reasonIfNot = 'Floating pin(s)';
    } else if (vA === undefined || vK === undefined) {
      reasonIfNot = 'Floating pin(s)';
    } else {
      const forwardBiased = (vA - vK) > led.vf;
      const hasReturn =
        returnNet != null &&
        hasConductivePath(state.components, pinToNetId, netK, returnNet, {
          excludeComponentIds: [led.id],
        });
      const hasFeed =
        netP != null &&
        hasConductivePath(state.components, pinToNetId, netP, netA, {
          excludeComponentIds: [led.id],
        });

      if (!forwardBiased) {
        reasonIfNot = 'Not forward biased';
      } else if (returnNet == null) {
        reasonIfNot = 'No reference/return net';
      } else if (!hasReturn) {
        reasonIfNot = 'No conductive return path to battery- / GND';
      } else if (!hasFeed) {
        reasonIfNot = 'No conductive feed path from battery+';
      }
    }

    const prev = outputsByComponentId[led.id] as LedOutput;
    const forwardBiased = netA != null && netK != null && vA !== undefined && vK !== undefined && (vA - vK) > led.vf;
    const hasReturn =
      returnNet != null &&
      netK != null &&
      hasConductivePath(state.components, pinToNetId, netK, returnNet, { excludeComponentIds: [led.id] });
    const hasFeed =
      netP != null &&
      netA != null &&
      hasConductivePath(state.components, pinToNetId, netP, netA, { excludeComponentIds: [led.id] });

    // Merge diagnostics only; keep prev.on and prev.brightness (from branch current).
    outputsByComponentId[led.id] = {
      ...prev,
      reasonIfNot,
      forwardBiased,
      hasReturnPath: hasReturn,
      hasFeedPath: hasFeed,
    };
  }

  // Voltmeter: measurement-only (no MNA stamp). Reading = V(net_pos) - V(net_neg) from solved voltages.
  for (const c of state.components) {
    if (c.type === 'voltmeter') {
      const netPlus = pinToNetId[pinKey(c.id, 'pos')] ?? null;
      const netMinus = pinToNetId[pinKey(c.id, 'neg')] ?? null;
      const connected = netPlus != null && netMinus != null;
      const vPlus = netPlus != null ? netVoltagesById[netPlus] : undefined;
      const vMinus = netMinus != null ? netVoltagesById[netMinus] : undefined;
      const hasVoltages = vPlus !== undefined && vMinus !== undefined && Number.isFinite(vPlus) && Number.isFinite(vMinus);
      const floating = connected && (singular || !hasVoltages);
      let volts: number | null = null;
      if (connected && !floating) {
        volts = netPlus === netMinus ? 0 : (vPlus! - vMinus!);
      }
      if (
        import.meta.env.DEV &&
        connected &&
        !floating &&
        volts !== null &&
        Math.abs(volts) < 1e-9 &&
        !loggedZeroVoltmeterIds.has(c.id)
      ) {
        loggedZeroVoltmeterIds.add(c.id);
        console.log('[Voltmeter debug] 0V reading', { id: c.id, netPlus, netMinus, vPlus, vMinus });
      }
      (outputsByComponentId as Record<string, VoltmeterOutput>)[c.id] = {
        type: 'Voltmeter',
        volts,
        connected,
        floating,
        netPlus,
        netMinus,
        vPlus: vPlus ?? null,
        vMinus: vMinus ?? null,
      };
    }
  }

  // Capacitor (DC mode): voltage across, branch current (~0), energy; polarity damage for electrolytic.
  for (const c of state.components) {
    if (c.type !== 'capacitor' && (c.type as string) !== 'capacitor_polarized') continue;
    const pins = c.type === 'capacitor' ? ['a', 'b'] : ['P', 'N'];
    const netA = pinToNetId[pinKey(c.id, pins[0]!)];
    const netB = pinToNetId[pinKey(c.id, pins[1]!)];
    const vA = netA != null ? netVoltagesById[netA] : undefined;
    const vB = netB != null ? netVoltagesById[netB] : undefined;
    const vAcross = vA != null && vB != null ? vA - vB : 0;
    const current = branchCurrentsByComponentId[c.id] ?? 0;
    const capacitance = (c.props?.capacitance as number) ?? CAPACITANCE_DEFAULT_FARAD;
    const energy = 0.5 * capacitance * vAcross * vAcross;
    const polarized = (c.type as string) === 'capacitor_polarized';
    const reversed = polarized && vAcross < 0;
    const ratedV = (c.props?.ratedVoltage as number) ?? Infinity;
    const damaged = polarized && (reversed || (Number.isFinite(ratedV) && Math.abs(vAcross) > ratedV));
    (outputsByComponentId as Record<string, CapacitorOutput>)[c.id] = {
      voltage: vAcross,
      current,
      energy,
      reversed: reversed || undefined,
      damaged: damaged || undefined,
    };
  }

  // Potentiometer: debug output from node voltages and branch currents (R_top, R_bot).
  for (const c of state.components) {
    if ((c.type as string) === 'potentiometer') {
      const netIn = pinToNetId[pinKey(c.id, 'IN')];
      const netOut = pinToNetId[pinKey(c.id, 'OUT')];
      const netGnd = pinToNetId[pinKey(c.id, 'GND')];
      const vIn = netIn != null ? (netVoltagesById[netIn] ?? 0) : 0;
      const vOut = netOut != null ? (netVoltagesById[netOut] ?? 0) : 0;
      const vGnd = netGnd != null ? (netVoltagesById[netGnd] ?? 0) : 0;
      const rTotal = (c.props?.rTotalOhms as number) ?? 10000;
      let alpha = (c.props?.alpha as number) ?? 0.5;
      const taper = (c.props?.taper as string) ?? 'linear';
      const alphaEff = taper === 'log' ? Math.pow(Math.max(0, Math.min(1, alpha)), 2.2) : alpha;
      const R_MIN_POT = 0.1;
      const rTop = Math.max(R_MIN_POT, Math.min(rTotal - R_MIN_POT, alphaEff * rTotal));
      const rBot = Math.max(R_MIN_POT, rTotal - rTop);
      const iTop = singular ? 0 : Math.abs(branchCurrentsByComponentId[`${c.id}:R_top`] ?? 0);
      const iBot = singular ? 0 : Math.abs(branchCurrentsByComponentId[`${c.id}:R_bot`] ?? 0);
      const pTop = (vIn - vOut) * (branchCurrentsByComponentId[`${c.id}:R_top`] ?? 0);
      const pBot = (vOut - vGnd) * (branchCurrentsByComponentId[`${c.id}:R_bot`] ?? 0);
      const floating = netIn == null || netOut == null || netGnd == null;
      (outputsByComponentId as Record<string, PotOutput>)[c.id] = {
        rTotal,
        alpha,
        rTop,
        rBot,
        vIn: floating ? NaN : vIn,
        vOut: floating ? NaN : vOut,
        vGnd: floating ? NaN : vGnd,
        iTop,
        iBot,
        pTop: singular ? 0 : (Number.isFinite(pTop) ? pTop : 0),
        pBot: singular ? 0 : (Number.isFinite(pBot) ? pBot : 0),
        pTotal: singular ? 0 : (Number.isFinite(pTop) && Number.isFinite(pBot) ? pTop + pBot : 0),
        floating,
      };
    }
  }

  // Transistor: report region and node/branch values from solved operating point.
  for (const c of state.components) {
    if ((c.type as string) !== 'transistor') continue;
    const netB = pinToNetId[pinKey(c.id, 'B')];
    const netC = pinToNetId[pinKey(c.id, 'C')];
    const netE = pinToNetId[pinKey(c.id, 'E')];
    const vb = netB != null ? netVoltagesById[netB] : undefined;
    const vc = netC != null ? netVoltagesById[netC] : undefined;
    const ve = netE != null ? netVoltagesById[netE] : undefined;
    const polarity = ((c.props?.polarity as 'NPN' | 'PNP') ?? 'NPN');
    const vbe = vb === undefined || ve === undefined ? null : (polarity === 'NPN' ? vb - ve : ve - vb);
    const vce = vc === undefined || ve === undefined ? null : (polarity === 'NPN' ? vc - ve : ve - vc);
    const ts = netlist._transState?.get(c.id);
    const ib = ts?.ib ?? 0;
    const ic = Math.abs(
      branchCurrentsByComponentId[`q:${c.id}:ic`] ??
      branchCurrentsByComponentId[`q:${c.id}:ce_sat`] ??
      branchCurrentsByComponentId[`q:${c.id}:ce_off`] ??
      0
    );
    const region: TransistorOutput['region'] =
      vb === undefined || vc === undefined || ve === undefined || singular
        ? 'floating'
        : (ts?.region ?? 'cutoff');
    (outputsByComponentId as Record<string, TransistorOutput>)[c.id] = {
      polarity,
      region,
      vb: vb ?? null,
      vc: vc ?? null,
      ve: ve ?? null,
      vbe,
      vce,
      ib,
      ic,
    };
  }

  // Nets with non-zero branch current only (for flow animation). Switch OFF / open circuit => no current => no animation.
  const activeNetIds = new Set<string>();
  const nodeIdxToNetId: (string | undefined)[] = [];
  for (const [netId, idx] of netlist.nodeIndexByNetId) {
    nodeIdxToNetId[idx] = netId;
  }
  for (const c of netlist.components) {
    const i = branchCurrentsByComponentId[c.id];
    if (i == null || Math.abs(i) <= I_MIN_VIS) continue;
    const a = 'aNode' in c ? c.aNode : (c as { pNode: number }).pNode;
    const b = 'bNode' in c ? c.bNode : (c as { nNode: number }).nNode;
    const netA = nodeIdxToNetId[a];
    const netB = nodeIdxToNetId[b];
    if (netA) activeNetIds.add(netA);
    if (netB) activeNetIds.add(netB);
  }

  const netPairToSignedCurrent: Record<string, number> = {};
  if (!singular) {
    for (const c of netlist.components) {
      const i = branchCurrentsByComponentId[c.id];
      if (i == null || Math.abs(i) <= I_MIN_VIS) continue;
      const a = 'aNode' in c ? c.aNode : (c as { pNode: number }).pNode;
      const b = 'bNode' in c ? c.bNode : (c as { nNode: number }).nNode;
      const netA = nodeIdxToNetId[a];
      const netB = nodeIdxToNetId[b];
      if (!netA || !netB || netA === netB) continue;
      netPairToSignedCurrent[`${netA}:${netB}`] = i;
    }
  }

  // FEED: nets reachable from source+ through conductive path. Open switch blocks FEED beyond it (no edge in adjacency).
  const feedNetIds = new Set<string>();
  if (netP) {
    const ledForwardBias = new Map<string, boolean>();
    for (const led of netlist._ledMeta ?? []) {
      const out = outputsByComponentId[led.id] as LedOutput | undefined;
      const biased = led.id.includes(':') ? (out?.on ?? false) : (out?.forwardBiased ?? false);
      ledForwardBias.set(led.id, biased);
    }
    const feedAdj = buildConductiveAdjacency(state.components, pinToNetId, { ledForwardBias, diodeStates: netlist._diodeStates });
    const feedQueue: string[] = [netP];
    feedNetIds.add(netP);
    while (feedQueue.length > 0) {
      const netId = feedQueue.shift()!;
      for (const next of feedAdj.get(netId) ?? []) {
        if (feedNetIds.has(next)) continue;
        feedNetIds.add(next);
        feedQueue.push(next);
      }
    }
  }

  const debugReport = buildDebugReport(
    state,
    netlist,
    nodeVoltages,
    vsourceCurrents,
    outputsByComponentId,
    singular,
    reason,
    pinToNetId,
    netVoltagesById
  );

  const nets = Array.from(netsResult.nets.entries()).map(([id, net]) => ({ id, pins: net.pins }));

  const hasTopology =
    netP != null &&
    returnNet != null &&
    hasTopologyPath(state.components, pinToNetId, netP, returnNet);

  const ledForwardBias = new Map<string, boolean>();
  for (const led of netlist._ledMeta ?? []) {
    ledForwardBias.set(led.id, led.on);
  }
  const hasReturn =
    netP != null &&
    returnNet != null &&
    hasConductivePath(state.components, pinToNetId, netP, returnNet, {
      ledForwardBias,
      diodeStates: netlist._diodeStates,
    });

  // Guardrail: motor must NEVER spin when circuit has no closed loop (no fake output).
  for (const c of state.components) {
    if ((c.type as string) === 'motor_dc' || (c.type as string) === 'motor_ac') {
      const out = outputsByComponentId[c.id] as MotorOutput | undefined;
      if (out && !hasReturn) {
        (outputsByComponentId as Record<string, MotorOutput>)[c.id] = {
          ...out,
          spinning: false,
          reasonIfNot: out.reasonIfNot || 'No closed loop',
        };
      }
    }
  }

  return {
    pinToNetId: netsResult.pinToNetId,
    netVoltagesById,
    nodeVoltagesByNetId,
    branchCurrentsByComponentId,
    outputsByComponentId,
    debugReport,
    singular,
    warnings,
    groundNetId: groundNetId ?? null,
    hasTopologyPath: hasTopology,
    hasReturnPath: hasReturn,
    energized: { loopClosed: hasReturn },
    nets,
    activeNetIds,
    feedNetIds,
    netPairToSignedCurrent,
  };
}

function buildDebugReport(
  state: SimState,
  netlist: { nodeIndexByNetId: Map<string, number>; components: NetlistComponent[] },
  nodeVoltages: number[],
  vsourceCurrents: Record<string, number>,
  outputsByComponentId: Record<string, LedOutput | MotorOutput | VoltmeterOutput | PotOutput | TransistorOutput | DiodeOutput>,
  singular: boolean,
  reason: string | undefined,
  pinToNetId: Record<string, string>,
  netVoltagesById: Record<string, number>
): import('./debug').DebugReport {
  const battery = state.components.find((c) => c.type === 'dc_supply');
  const battComp = netlist.components.find((c) => c.type === 'VSource');
  const swComp = netlist.components.find((c) => c.type === 'Switch');
  const ledComp = state.components.find((c) => c.type === 'led');
  const motorComp = state.components.find((c) => (c.type as string) === 'motor_dc' || (c.type as string) === 'motor_ac');
  const ibatt = battery ? (vsourceCurrents[battery.id] ?? 0) : 0;
  const loopClosed = !singular && Math.abs(ibatt) > I_EPS;

  const netP = battery ? (pinToNetId[pinKey(battery.id, 'pos')] ?? pinToNetId[pinKey(battery.id, 'P')]) : undefined;
  const netN = battery ? (pinToNetId[pinKey(battery.id, 'neg')] ?? pinToNetId[pinKey(battery.id, 'N')]) : undefined;

  return {
    battery: battery
      ? {
          id: battery.id,
          voltage: (battery.props?.voltage as number) ?? 5,
          netP,
          netN,
          vP: battComp ? (nodeVoltages[(battComp as { pNode: number }).pNode] ?? 0) : undefined,
          vN: battComp ? (nodeVoltages[(battComp as { nNode: number }).nNode] ?? 0) : undefined,
          sourceCurrent: ibatt,
          reasonIfNot: singular ? reason : undefined,
        }
      : null,
    switch: swComp
      ? {
          id: (swComp as { id: string }).id,
          on: (swComp as { on: boolean }).on,
          va: nodeVoltages[(swComp as { aNode: number }).aNode],
          vb: nodeVoltages[(swComp as { bNode: number }).bNode],
          current: undefined,
          reasonIfNot: undefined,
        }
      : null,
    led: ledComp
      ? (() => {
          const out = outputsByComponentId[ledComp.id] as LedOutput | undefined;
          const netA = pinToNetId[pinKey(ledComp.id, 'anode')] ?? pinToNetId[pinKey(ledComp.id, 'A')];
          const netK = pinToNetId[pinKey(ledComp.id, 'cathode')] ?? pinToNetId[pinKey(ledComp.id, 'K')];
          return {
            id: ledComp.id,
            netA,
            netK,
            vA: netA != null ? netVoltagesById[netA] : undefined,
            vK: netK != null ? netVoltagesById[netK] : undefined,
            forwardBiased: out?.forwardBiased ?? false,
            hasReturnPath: out?.hasReturnPath,
            hasFeedPath: out?.hasFeedPath,
            current: out?.current,
            brightness: out?.brightness,
            voltageDrop: out?.voltageDrop,
            power: out?.power,
            reasonIfNot: out?.reasonIfNot ?? out?.reason,
          };
        })()
      : null,
    motor: motorComp
      ? {
          id: motorComp.id,
          v: (outputsByComponentId[motorComp.id] as MotorOutput)?.voltage,
          current: (outputsByComponentId[motorComp.id] as MotorOutput)?.current,
          spinning: (outputsByComponentId[motorComp.id] as MotorOutput)?.spinning,
          speed: (outputsByComponentId[motorComp.id] as MotorOutput)?.speed,
          direction: (outputsByComponentId[motorComp.id] as MotorOutput)?.direction,
          reasonIfNot: (outputsByComponentId[motorComp.id] as MotorOutput)?.reason,
        }
      : null,
    diode: (() => {
      const diodeComp = state.components.find((c) => (c.type as string) === 'diode');
      if (!diodeComp) return null;
      const out = outputsByComponentId[diodeComp.id] as DiodeOutput | undefined;
      const netA = pinToNetId[pinKey(diodeComp.id, 'A')] ?? pinToNetId[pinKey(diodeComp.id, 'anode')];
      const netK = pinToNetId[pinKey(diodeComp.id, 'K')] ?? pinToNetId[pinKey(diodeComp.id, 'cathode')];
      return {
        id: diodeComp.id,
        netA,
        netK,
        vA: netA != null ? netVoltagesById[netA] : undefined,
        vK: netK != null ? netVoltagesById[netK] : undefined,
        vd: out?.vd,
        state: out?.state,
        current: out?.id,
        reasonIfNot: out?.reasonIfNot,
      };
    })(),
    energized: { loopClosed, reasonIfNot: singular ? reason : undefined },
    singular,
    reason,
    warnings: [],
  };
}
