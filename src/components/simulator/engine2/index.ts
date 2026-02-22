/**
 * Engine2: MNA-based DC circuit solver.
 */

export { solveCircuit, stepTransient, runTransient, type SolveResult, type TransientState } from './solve';
export { buildNets, type NetsResult, type Net, type ConnectivityIssue } from './nets';
export { buildNetlist, type Netlist } from './netlist';
export { buildMNA, solveMNA, type BuildMNAOptions } from './mna';
export type { LedOutput, MotorOutput, NetlistComponent, DiodeOutput } from './models';
export type { DiodeState } from './mna';
export type { DebugReport } from './debug';
export { canonPinId, pinKey, auditWirePins } from './types';
export { hasConductivePath, hasTopologyPath, buildConductiveAdjacency, buildTopologyAdjacency } from './conductivePath';
