/**
 * Engine2: MNA stamping and Gaussian elimination solver.
 * Ground at node 0 (fixed 0V). Unknowns: V[1..n-1], J[0..nVsrc-1].
 */

import type { NetlistComponent } from './models';
import { EPS, R_OFF_DIODE } from './models';

export interface MNAContext {
  nNodes: number;
  nVsrc: number;
  G: number[][];
  B: number[][];
  C: number[][];
  I: number[];
  E: number[];
  vsrcMap: { compId: string; pNode: number; nNode: number }[];
}

function createMatrix(rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(0));
}

export type DiodeState = 'OFF' | 'ON' | 'BREAKDOWN';

export interface BuildMNAOptions {
  /** Time step (s) for transient. If > 0, capacitors use Backward Euler companion model. */
  dt?: number;
  /** Per-capacitor id -> voltage across at previous step (V). Used for Ieq = (C/dt)*vPrev. */
  capacitorVPrev?: Map<string, number>;
  /** Per-diode id -> state for piecewise-linear stamping. */
  diodeStates?: Map<string, DiodeState>;
  /** Current simulation time (s). When set, VSource with waveform uses Vs(t) = voltage + amplitude*sin(2π*f*t+φ). */
  transientTime?: number;
  /** Per-inductor id -> current (A) from a to b at previous step. Used for Backward Euler companion Ieq. */
  inductorIPrev?: Map<string, number>;
}

export function buildMNA(
  components: NetlistComponent[],
  nNodesParam: number,
  options?: BuildMNAOptions
): MNAContext {
  const nNodes = nNodesParam > 0 ? nNodesParam : 1 + Math.max(0, ...components.flatMap((c) => {
    if (c.type === 'VSource') return [c.pNode, c.nNode];
    if (c.type === 'R' || c.type === 'Switch' || c.type === 'LED' || c.type === 'ISource' || c.type === 'Diode' || c.type === 'Inductor') return [c.aNode, c.bNode];
    return [];
  }));
  const vsrcs = components.filter((c): c is NetlistComponent & { type: 'VSource' } => c.type === 'VSource');
  const nVsrc = vsrcs.length;
  const G = createMatrix(nNodes, nNodes);
  const B = createMatrix(nNodes, nVsrc);
  const C = createMatrix(nVsrc, nNodes);
  const I = Array(nNodes).fill(0);
  const E = Array(nVsrc).fill(0);
  const vsrcMap: { compId: string; pNode: number; nNode: number }[] = [];

  const stampResistor = (a: number, b: number, g: number) => {
    if (g < 1e-15) return;
    if (a > 0) G[a]![a]! += g;
    if (b > 0) G[b]![b]! += g;
    if (a > 0 && b > 0) {
      G[a]![b]! -= g;
      G[b]![a]! -= g;
    }
  };

  /** Current source: Ieq from node a toward b (into a: +Ieq, into b: -Ieq). */
  const stampCurrentSource = (a: number, b: number, Ieq: number) => {
    if (a > 0) I[a]! += Ieq;
    if (b > 0) I[b]! -= Ieq;
  };

  const opts = options ?? {};
  const dt = opts.dt ?? 0;
  const capacitorVPrev = opts.capacitorVPrev ?? new Map<string, number>();
  const diodeStates = opts.diodeStates ?? new Map<string, import('./models').DiodeState>();
  const transientTime = opts.transientTime;
  const inductorIPrev = opts.inductorIPrev ?? new Map<string, number>();

  for (const c of components) {
    if (c.type === 'VSource') {
      const k = vsrcMap.length;
      vsrcMap.push({ compId: c.id, pNode: c.pNode, nNode: c.nNode });
      let voltage = c.voltage;
      if (transientTime != null && c.waveform?.type === 'sine') {
        const w = c.waveform;
        const phase = w.phaseRad ?? 0;
        voltage = c.voltage + w.amplitude * Math.sin(2 * Math.PI * w.frequencyHz * transientTime + phase);
      }
      E[k] = voltage;
      if (c.pNode > 0) { B[c.pNode]![k]! = 1; C[k]![c.pNode]! = 1; }
      if (c.nNode > 0) { B[c.nNode]![k]! = -1; C[k]![c.nNode]! = -1; }
      continue;
    }
    if (c.type === 'R' && !c.floating) {
      const g = 1 / c.resistance;
      stampResistor(c.aNode, c.bNode, g);
      continue;
    }
    if (c.type === 'Switch' && !c.floating) {
      const r = c.on ? c.rOn : c.rOff;
      const g = 1 / r;
      stampResistor(c.aNode, c.bNode, g);
      continue;
    }
    if (c.type === 'Motor' && !c.floating) {
      const g = 1 / c.r;
      stampResistor(c.aNode, c.bNode, g);
      continue;
    }
    if (c.type === 'Capacitor' && !c.floating) {
      if (dt > 0 && c.capacitance > 0) {
        const G = c.capacitance / dt;
        const vPrev = capacitorVPrev.get(c.id) ?? 0;
        const Ieq = G * vPrev;
        stampResistor(c.aNode, c.bNode, G);
        stampCurrentSource(c.aNode, c.bNode, Ieq);
      } else {
        const g = 1 / c.rLeak;
        stampResistor(c.aNode, c.bNode, g);
      }
      continue;
    }
    if (c.type === 'ISource' && !c.floating) {
      const { aNode, bNode, current } = c;
      if (aNode > 0) I[aNode]! -= current;
      if (bNode > 0) I[bNode]! += current;
      continue;
    }
    if (c.type === 'Inductor' && !c.floating) {
      const L = Math.max(1e-12, c.inductance);
      if (dt > 0) {
        const G = dt / L;
        const iPrev = inductorIPrev.get(c.id) ?? 0;
        stampResistor(c.aNode, c.bNode, G);
        stampCurrentSource(c.aNode, c.bNode, iPrev);
      } else {
        stampResistor(c.aNode, c.bNode, 1e9);
      }
      continue;
    }
    if (c.type === 'Diode' && !c.floating) {
      const state = diodeStates.get(c.id) ?? 'OFF';
      const vbr = c.vbr ?? 50;
      const rbr = c.rbr ?? 10;
      if (state === 'ON') {
        const G = 1 / Math.max(c.rOn, 1e-6);
        const Ieq = G * c.vf;
        stampResistor(c.aNode, c.bNode, G);
        stampCurrentSource(c.aNode, c.bNode, Ieq);
      } else if (state === 'BREAKDOWN') {
        const Gbr = 1 / Math.max(rbr, 0.1);
        const IeqBr = Gbr * vbr;
        stampResistor(c.aNode, c.bNode, Gbr);
        stampCurrentSource(c.aNode, c.bNode, IeqBr);
      } else {
        const gOff = 1 / R_OFF_DIODE;
        stampResistor(c.aNode, c.bNode, gOff);
      }
      continue;
    }
  }

  return { nNodes, nVsrc, G, B, C, I, E, vsrcMap };
}

function swapRows(M: number[][], b: number[], i: number, j: number) {
  [M[i], M[j]] = [M[j]!, M[i]!];
  [b[i], b[j]] = [b[j]!, b[i]!];
}

function swapCols(M: number[][], i: number, j: number) {
  for (let r = 0; r < M.length; r++) {
    [M[r]![i], M[r]![j]] = [M[r]![j]!, M[r]![i]!];
  }
}

/** Solve [G B; C 0] [V; J] = [I; E] with ground at 0. Returns nodeVoltages (V[0]=0) and vsourceCurrents. */
export function solveMNA(ctx: MNAContext): {
  nodeVoltages: number[];
  vsourceCurrents: Record<string, number>;
  singular: boolean;
  reason?: string;
} {
  const { nNodes, nVsrc, G, B, C, I, E, vsrcMap } = ctx;
  const n = nNodes - 1 + nVsrc;
  const M = createMatrix(n, n);
  const b = Array(n).fill(0);
  for (let i = 1; i < nNodes; i++) {
    for (let j = 1; j < nNodes; j++) M[i - 1]![j - 1]! = G[i]![j]!;
    for (let k = 0; k < nVsrc; k++) M[i - 1]![nNodes - 1 + k]! = B[i]![k]!;
    b[i - 1] = I[i]!;
  }
  for (let k = 0; k < nVsrc; k++) {
    for (let j = 1; j < nNodes; j++) M[nNodes - 1 + k]![j - 1]! = C[k]![j]!;
    b[nNodes - 1 + k] = E[k]!;
  }

  for (let col = 0; col < n; col++) {
    let best = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row]![col]!) > Math.abs(M[best]![col]!)) best = row;
    }
    if (Math.abs(M[best]![col]!) < EPS) {
      return {
        nodeVoltages: Array(nNodes).fill(0),
        vsourceCurrents: {},
        singular: true,
        reason: 'Circuit is floating/open; no DC solution',
      };
    }
    if (best !== col) {
      swapRows(M, b, col, best);
    }
    const pivot = M[col]![col]!;
    for (let row = col + 1; row < n; row++) {
      const f = M[row]![col]! / pivot;
      for (let c = col; c < n; c++) M[row]![c]! -= f * M[col]![c]!;
      b[row]! -= f * b[col]!;
    }
  }
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = b[i]!;
    for (let j = i + 1; j < n; j++) sum -= M[i]![j]! * x[j]!;
    x[i] = sum / M[i]![i]!;
  }
  const nodeVoltages = Array(nNodes).fill(0);
  for (let i = 1; i < nNodes; i++) nodeVoltages[i] = x[i - 1]!;
  const vsourceCurrents: Record<string, number> = {};
  for (let k = 0; k < nVsrc; k++) {
    vsourceCurrents[vsrcMap[k]!.compId] = x[nNodes - 1 + k]!;
  }
  return { nodeVoltages, vsourceCurrents, singular: false };
}
