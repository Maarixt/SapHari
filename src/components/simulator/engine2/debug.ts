/**
 * Engine2: Debug report for circuit diagnostics.
 */

export interface DebugReport {
  battery: {
    id: string;
    voltage: number;
    netP?: string;
    netN?: string;
    vP?: number;
    vN?: number;
    sourceCurrent?: number;
    reasonIfNot?: string;
  } | null;
  switch: {
    id: string;
    on: boolean;
    va?: number;
    vb?: number;
    current?: number;
    reasonIfNot?: string;
  } | null;
  led: {
    id: string;
    netA?: string;
    netK?: string;
    vA?: number;
    vK?: number;
    forwardBiased?: boolean;
    hasReturnPath?: boolean;
    hasFeedPath?: boolean;
    current?: number;
    brightness?: number;
    voltageDrop?: number;
    power?: number;
    reasonIfNot?: string;
  } | null;
  motor?: {
    id: string;
    v?: number;
    current?: number;
    spinning?: boolean;
    speed?: number;
    direction?: 1 | -1 | 0;
    reasonIfNot?: string;
  } | null;
  diode?: {
    id: string;
    netA?: string;
    netK?: string;
    vA?: number;
    vK?: number;
    vd?: number;
    state?: string;
    current?: number;
    reasonIfNot?: string;
  } | null;
  gnd?: { netIds: string[] };
  energized: {
    loopClosed: boolean;
    reasonIfNot?: string;
    netIds?: string[];
  };
  singular?: boolean;
  reason?: string;
  warnings: string[];
}
