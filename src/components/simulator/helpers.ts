import { SimState, PinKind, SimComponent, Wire, WireEnd } from './types';
import { getFootprint, type ViewMode } from './visual/footprints';
import { transformPinPosition } from './utils/transformPins';
import { getCanonicalPinIds, canonPinId } from './engine2/types';
import { getSwitchVariantId, migrateSwitchPin, SWITCH_VARIANTS, type SwitchVariantId } from './registry';
import { finiteNum, safePoint } from './utils/coords';

// Helper to check if a pin is already used by another wire
export function isPinUsed(state: SimState, compId: string, pinId: string): boolean {
  return state.wires.some(w =>
    (w.from.componentId === compId && w.from.pinId === pinId) ||
    (w.to.componentId === compId && w.to.pinId === pinId)
  );
}

const SWITCH_VARIANT_IDS: SwitchVariantId[] = ['SPST', 'SPDT', 'DPST', 'DPDT'];

/** Resolve wire endpoint pinId (may be canonical e.g. 'a'/'b' or 'P'/'N') to component's actual pin id so findPin can resolve position. */
function resolvePinIdForFindPin(comp: SimComponent, pinId: string): string | null {
  const canonical = canonPinId(pinId);
  let p = comp.pins?.find((p) => p.id === pinId || p.id === canonical);
  if (p) return p.id;
  // Legacy: motor_dc/motor_ac used to have pins a/b; now P/N. Map so old wires still resolve.
  if ((comp.type as string) === 'motor_dc' || (comp.type as string) === 'motor_ac') {
    if (pinId === 'a' || canonical === 'a') return comp.pins?.some((q) => q.id === 'P') ? 'P' : null;
    if (pinId === 'b' || canonical === 'b') return comp.pins?.some((q) => q.id === 'N') ? 'N' : null;
  }
  // dc_supply: overlay/footprint may use P/N; component pins are pos/neg. Map so hit-test and findPin agree.
  if (comp.type === 'dc_supply') {
    if (pinId === 'P' || canonical === 'P') return comp.pins?.some((p) => p.id === 'pos') ? 'pos' : 'P';
    if (pinId === 'N' || canonical === 'N') return comp.pins?.some((p) => p.id === 'neg') ? 'neg' : 'N';
  }

  const canonicalList = getCanonicalPinIds(comp);
  const index = canonicalList.indexOf(canonical);
  if (index >= 0 && comp.pins?.[index]) return comp.pins[index].id;

  // Switch/toggle-switch: wire may reference a pin from another variant (e.g. P1/P2 from SPDT when component is now SPST). Try migration from each variant.
  if ((comp.type === 'switch' || (comp.type as string) === 'toggle-switch') && comp.pins?.length) {
    const currentVariant = getSwitchVariantId(comp.variantId);
    for (const otherVariant of SWITCH_VARIANT_IDS) {
      if (otherVariant === currentVariant) continue;
      const mapped = migrateSwitchPin(otherVariant, currentVariant, pinId);
      if (mapped && comp.pins.some((q) => q.id === mapped)) return mapped;
    }
  }
  return null;
}

/**
 * Returns pin offset (dx, dy) from component position for findPin. World = comp.x+dx, comp.y+dy.
 * Matches Konva Group with offsetX/offsetY: pin at local (px, py) has world comp + (px - anchorX, py - anchorY) = comp + out.
 */
export function getPinLocalOffset(state: SimState, compId: string, pinId: string, viewMode?: ViewMode): { dx: number; dy: number } | null {
  const c = state.components.find((c) => c.id === compId);
  if (!c) return null;
  const resolvedId = resolvePinIdForFindPin(c, pinId);
  if (resolvedId == null) return null;
  const p = c.pins?.find((p) => p.id === resolvedId);
  // Motor/buzzer: without viewMode we'd get wrong anchor or schematic pins (e.g. buzzer schematic has pins at y=20). Default to workbench.
  const effectiveViewMode =
    viewMode ??
    ((c.type as string) === 'motor_dc' ||
    (c.type as string) === 'motor_ac' ||
    c.type === 'buzzer'
      ? 'workbench'
      : undefined);
  const footprint = getFootprint(c.type, effectiveViewMode);
  const hasFootprintOffset = footprint?.pinOffsets?.[resolvedId];
  if (!p && !hasFootprintOffset) return null;
  let anchorX = footprint?.anchor?.x ?? (footprint?.width ?? 90) / 2;
  let anchorY = footprint?.anchor?.y ?? (footprint?.height ?? 50) / 2;
  let localX: number;
  let localY: number;
  if ((c.type === 'switch' || (c.type as string) === 'toggle-switch') && getSwitchVariantId(c.variantId) === 'DPST' && ['P1', 'P2', 'P3', 'P4'].includes(resolvedId)) {
    const dpstSchematic: Record<string, { x: number; y: number }> = { P1: { x: 10, y: 15 }, P2: { x: 80, y: 15 }, P3: { x: 10, y: 35 }, P4: { x: 80, y: 35 } };
    const dpstWorkbench: Record<string, { x: number; y: number }> = { P1: { x: 18, y: 18 }, P2: { x: 72, y: 18 }, P3: { x: 18, y: 42 }, P4: { x: 72, y: 42 } };
    const pos = viewMode === 'schematic' ? dpstSchematic[resolvedId] : dpstWorkbench[resolvedId];
    if (pos) {
      localX = finiteNum(pos.x, 0);
      localY = finiteNum(pos.y, 0);
    } else {
      localX = finiteNum((footprint?.pinOffsets?.[resolvedId]?.x ?? p?.x) as number, 0);
      localY = finiteNum((footprint?.pinOffsets?.[resolvedId]?.y ?? p?.y) as number, 0);
    }
  } else if (c.type === 'buzzer' && (resolvedId === 'P' || resolvedId === 'N') && effectiveViewMode === 'workbench') {
    // Single source of truth: match WorkbenchBuzzerRenderer (anchor 30,25; P at 18,45, N at 42,45).
    localX = resolvedId === 'P' ? 18 : 42;
    localY = 45;
    anchorX = 30;
    anchorY = 25;
  } else if ((c.type === 'switch' || (c.type as string) === 'toggle-switch') && getSwitchVariantId(c.variantId) === 'DPDT' && ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'].includes(resolvedId)) {
    const dpdtSchematic: Record<string, { x: number; y: number }> = { P1: { x: 80, y: 5 }, P2: { x: 10, y: 12 }, P3: { x: 80, y: 19 }, P4: { x: 80, y: 31 }, P5: { x: 10, y: 38 }, P6: { x: 80, y: 45 } };
    // Workbench: same 2×3 layout as WorkbenchToggleSwitchRenderer (120×80, anchor 60,40). One truth for snap and pad.
    const dpdtWorkbench: Record<string, { x: number; y: number }> = { P1: { x: 32, y: 44 }, P2: { x: 32, y: 58 }, P3: { x: 32, y: 72 }, P4: { x: 88, y: 44 }, P5: { x: 88, y: 58 }, P6: { x: 88, y: 72 } };
    const pos = viewMode === 'schematic' ? dpdtSchematic[resolvedId] : dpdtWorkbench[resolvedId];
    if (pos) {
      localX = finiteNum(pos.x, 0);
      localY = finiteNum(pos.y, 0);
    } else {
      localX = finiteNum((footprint?.pinOffsets?.[resolvedId]?.x ?? p?.x) as number, 0);
      localY = finiteNum((footprint?.pinOffsets?.[resolvedId]?.y ?? p?.y) as number, 0);
    }
    // DPDT workbench body is 120×80 with anchor (60,40); use that for transform so pad world position matches renderer.
    if (viewMode === 'workbench' && pos) {
      anchorX = 60;
      anchorY = 40;
    }
  } else {
    localX = finiteNum((footprint?.pinOffsets?.[resolvedId]?.x ?? (p as { x?: number })?.x) as number, 0);
    localY = finiteNum((footprint?.pinOffsets?.[resolvedId]?.y ?? (p as { y?: number })?.y) as number, 0);
  }
  const out = transformPinPosition(
    localX,
    localY,
    anchorX,
    anchorY,
    c.rotation,
    c.flipX,
    c.flipY
  );
  return { dx: finiteNum(out.x, 0), dy: finiteNum(out.y, 0) };
}

// Helper to find pin coordinates. Uses footprint pinOffsets when available; applies rotation and flip.
// viewMode: when provided, getFootprint uses view-specific footprint (e.g. workbench switch has terminals at bottom).
// Wire endpoints may store canonical pin ids (a/b, pos/neg, anode/cathode); we resolve to component's actual pin id for lookup.
// Always returns finite x,y when non-null (no NaN).
export function findPin(state: SimState, compId: string, pinId: string, viewMode?: ViewMode): { x: number; y: number } | null {
  const c = state.components.find((c) => c.id === compId);
  if (!c) return null;
  const offset = getPinLocalOffset(state, compId, pinId, viewMode);
  if (!offset) return null;
  const x = finiteNum(c.x, 0) + offset.dx;
  const y = finiteNum(c.y, 0) + offset.dy;
  return safePoint(x, y) ?? { x: 0, y: 0 };
}

/** Bounding box of a component in circuit coordinates (for selection overlay). Uses view-specific footprint when provided. */
export function getComponentBbox(
  state: SimState,
  compId: string,
  viewMode?: ViewMode
): { left: number; top: number; width: number; height: number } | null {
  const c = state.components.find(c => c.id === compId);
  if (!c) return null;
  const fp = getFootprint(c.type, viewMode);
  const w = fp?.width ?? 90;
  const h = fp?.height ?? 50;
  const ax = fp?.anchor?.x ?? w / 2;
  const ay = fp?.anchor?.y ?? h / 2;
  return {
    left: finiteNum(c.x, 0) - ax,
    top: finiteNum(c.y, 0) - ay,
    width: w,
    height: h,
  };
}

const WIRE_SNAP_GRID = 10;

/** Snap value to wire routing grid for neat orthogonal paths. */
export function snapToWireGrid(v: number): number {
  return Math.round(v / WIRE_SNAP_GRID) * WIRE_SNAP_GRID;
}

/** One-elbow Manhattan path: [x1,y1, bendX,bendY, x2,y2]. Neat right-angle routing. Inputs coerced to finite. */
export function orthogonalPath(x1: number, y1: number, x2: number, y2: number): number[] {
  const a = finiteNum(x1, 0);
  const b = finiteNum(y1, 0);
  const c = finiteNum(x2, 0);
  const d = finiteNum(y2, 0);
  const dx = c - a;
  const dy = d - b;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return [a, b, c, b, c, d];
  }
  return [a, b, a, d, c, d];
}

const VIEW_GRID = 10;
function snapToViewGrid(v: number): number {
  return Math.round(v / VIEW_GRID) * VIEW_GRID;
}

/** Transform a point from workbench to schematic (grid snap). Preserve structure. */
export function mapPointWorkbenchToSchematic(x: number, y: number): { x: number; y: number } {
  return { x: snapToViewGrid(x), y: snapToViewGrid(y) };
}

/** Transform a point from schematic to workbench (grid snap). */
export function mapPointSchematicToWorkbench(x: number, y: number): { x: number; y: number } {
  return { x: snapToViewGrid(x), y: snapToViewGrid(y) };
}

/** Shared endpoint resolution for both engine2 and wire renderer. Single source of truth. Never returns NaN. */
export function resolveEndpoint(
  state: SimState,
  endpoint: { componentId: string; pinId: string },
  viewMode?: ViewMode
): { x: number; y: number; pinKey: string; resolved: boolean; missingReason?: string } {
  const comp = state.components.find((c) => c.id === endpoint.componentId);
  const pos = findPin(state, endpoint.componentId, endpoint.pinId, viewMode);
  const pinKeyStr = `${endpoint.componentId}:${endpoint.pinId}`;
  if (!comp) {
    if (import.meta.env.DEV) console.warn('[WIRE RESOLVE FAIL] component missing', endpoint.componentId, endpoint.pinId);
    return { x: 0, y: 0, pinKey: pinKeyStr, resolved: false, missingReason: 'component missing' };
  }
  const compX = finiteNum(comp.x, 0);
  const compY = finiteNum(comp.y, 0);
  if (!pos) {
    const availablePins = (comp.pins ?? []).map((p) => p.id).join(', ');
    if (import.meta.env.DEV) {
      console.warn('[WIRE RESOLVE FAIL] pin or position unresolved', {
        componentType: comp.type,
        componentId: endpoint.componentId,
        pinId: endpoint.pinId,
        availablePins: availablePins || '(none)',
      });
    }
    return { x: compX, y: compY, pinKey: pinKeyStr, resolved: false, missingReason: 'pin or position unresolved' };
  }
  const pt = safePoint(pos.x, pos.y);
  if (!pt) {
    if (import.meta.env.DEV) console.warn('[PIN WORLD NaN]', endpoint.componentId, endpoint.pinId, { compX, compY, pos });
    return { x: compX, y: compY, pinKey: pinKeyStr, resolved: false, missingReason: 'coordinates invalid' };
  }
  return { x: pt.x, y: pt.y, pinKey: pinKeyStr, resolved: true };
}

export interface WirePointsResult {
  points: number[];
  fromResolved: boolean;
  toResolved: boolean;
  fromPos: { x: number; y: number } | null;
  toPos: { x: number; y: number } | null;
  missingFromReason?: string;
  missingToReason?: string;
}

/** Wire points plus resolution status for renderer (broken-wire indicator). */
export function getWirePointsWithStatus(
  state: SimState,
  wire: { from: { componentId: string; pinId: string }; to: { componentId: string; pinId: string }; points?: number[]; pointsWorkbench?: number[]; pointsSchematic?: number[] },
  viewMode?: ViewMode
): WirePointsResult {
  const from = resolveEndpoint(state, wire.from, viewMode);
  const to = resolveEndpoint(state, wire.to, viewMode);
  const viewPoints = viewMode === 'schematic'
    ? (wire.pointsSchematic ?? wire.points)
    : (wire.pointsWorkbench ?? wire.points);
  if (from.resolved && to.resolved) {
    const points = viewPoints && viewPoints.length >= 4 ? viewPoints : orthogonalPath(from.x, from.y, to.x, to.y);
    return { points, fromResolved: true, toResolved: true, fromPos: { x: from.x, y: from.y }, toPos: { x: to.x, y: to.y } };
  }
  const points: number[] = from.resolved && !to.resolved
    ? [...(viewPoints && viewPoints.length >= 4 ? viewPoints : orthogonalPath(from.x, from.y, to.x, to.y))]
    : !from.resolved && to.resolved
      ? [...(viewPoints && viewPoints.length >= 4 ? viewPoints : orthogonalPath(from.x, from.y, to.x, to.y))]
      : [from.x, from.y, to.x, to.y];
  if (from.resolved && !to.resolved) {
    return { points, fromResolved: true, toResolved: false, fromPos: { x: from.x, y: from.y }, toPos: { x: to.x, y: to.y }, missingToReason: to.missingReason };
  }
  if (!from.resolved && to.resolved) {
    return { points, fromResolved: false, toResolved: true, fromPos: { x: from.x, y: from.y }, toPos: { x: to.x, y: to.y }, missingFromReason: from.missingReason };
  }
  return { points, fromResolved: false, toResolved: false, fromPos: { x: from.x, y: from.y }, toPos: { x: to.x, y: to.y }, missingFromReason: from.missingReason, missingToReason: to.missingReason };
}

/** Wire points for rendering: use view-specific stored points if valid, else orthogonal path between pins. Returns [] only when both endpoints unresolved (call getWirePointsWithStatus for broken-wire UI). */
export function getWirePoints(
  state: SimState,
  wire: { from: { componentId: string; pinId: string }; to: { componentId: string; pinId: string }; points?: number[]; pointsWorkbench?: number[]; pointsSchematic?: number[] },
  viewMode?: ViewMode
): number[] {
  const from = findPin(state, wire.from.componentId, wire.from.pinId, viewMode);
  const to = findPin(state, wire.to.componentId, wire.to.pinId, viewMode);
  if (!from || !to) return [];
  const viewPoints = viewMode === 'schematic'
    ? (wire.pointsSchematic ?? wire.points)
    : (wire.pointsWorkbench ?? wire.points);
  if (viewPoints && viewPoints.length >= 4) return viewPoints;
  return orthogonalPath(from.x, from.y, to.x, to.y);
}

/** Insert a new bend point into wire points at the given segment (0-based). */
export function insertMidpointIntoWirePoints(
  points: number[],
  segmentIndex: number,
  x: number,
  y: number
): number[] {
  if (points.length < 4) return points;
  const insertAt = Math.min((segmentIndex + 1) * 2, points.length);
  return [...points.slice(0, insertAt), x, y, ...points.slice(insertAt)];
}

// Helper to check if a pin is a GPIO pin
export function isGPIOPin(state: SimState, compId: string, pinId: string): boolean {
  const component = state.components.find(c => c.id === compId);
  if (!component) return false;
  
  const pin = component.pins.find(p => p.id === pinId);
  if (!pin) return false;
  
  // GPIO pins are digital, analog, or pwm pins
  return pin.kind === 'digital' || pin.kind === 'analog' || pin.kind === 'pwm';
}

// Helper to validate wire connections with GPIO blocking
export function canConnectPin(state: SimState, compId: string, pinId: string): boolean {
  const component = state.components.find(c => c.id === compId);
  if (!component) return false;

  // Resolve canonical/footprint pin ids (e.g. P/N for dc_supply) to component's actual pin so we accept the same ids as getNearestPin/findPin
  const resolvedId = resolvePinIdForFindPin(component, pinId) ?? pinId;
  const pin = component.pins?.find(p => p.id === resolvedId);
  if (!pin) {
    // Footprint-only pin (e.g. dc_supply with empty pins reporting P/N)
    const fp = getFootprint(component.type);
    if (fp?.pinOffsets?.[resolvedId] ?? fp?.pinOffsets?.[pinId]) return true;
    return false;
  }

  // Allow multiple connections to power and ground pins
  if (pin.kind === 'power' || pin.kind === 'ground') {
    return true;
  }

  // Junction node: allow multiple connections (pin->junction, junction->junction)
  if (component.type === 'junction' && (pinId === 'J' || pinId === 'node')) {
    return true;
  }

  // For GPIO pins (digital, analog, pwm), enforce single connection
  if (isGPIOPin(state, compId, pinId)) {
    if (isPinUsed(state, compId, pinId)) {
      return false; // GPIO pin already used
    }
  }

  return true;
}

/** Box in circuit coords (minX, minY, maxX, maxY). Returns component and wire ids that overlap the box. */
export function getComponentsAndWiresInBox(
  state: SimState,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): { componentIds: string[]; wireIds: string[] } {
  const componentIds: string[] = [];
  for (const c of state.components) {
    const fp = getFootprint(c.type);
    const w = fp?.width ?? 90;
    const h = fp?.height ?? 50;
    const ax = fp?.anchor?.x ?? w / 2;
    const ay = fp?.anchor?.y ?? h / 2;
    const cx = c.x - ax;
    const cy = c.y - ay;
    if (cx + w >= minX && cx <= maxX && cy + h >= minY && cy <= maxY) {
      componentIds.push(c.id);
    }
  }
  const wireIds: string[] = [];
  for (const w of state.wires) {
    const from = findPin(state, w.from.componentId, w.from.pinId);
    const to = findPin(state, w.to.componentId, w.to.pinId);
    if (!from || !to) continue;
    const inBox = (p: { x: number; y: number }) =>
      p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
    if (inBox(from) || inBox(to)) wireIds.push(w.id);
  }
  return { componentIds, wireIds };
}

/** Nearest point on segment (ax,ay)-(bx,by) to point (px,py). */
export function nearestPointOnSegment(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  px: number,
  py: number
): { x: number; y: number } {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: ax, y: ay };
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return { x: ax + t * dx, y: ay + t * dy };
}

/** Nearest point on polyline (points as x0,y0, x1,y1, ...) to (px, py). Returns point, distance, and segment index. */
export function nearestPointOnPolyline(
  points: number[],
  px: number,
  py: number
): { x: number; y: number; dist: number; segmentIndex: number } {
  let best = { x: points[0] ?? 0, y: points[1] ?? 0, dist: Infinity, segmentIndex: 0 };
  for (let i = 0; i + 3 < points.length; i += 2) {
    const ax = points[i];
    const ay = points[i + 1];
    const bx = points[i + 2];
    const by = points[i + 3];
    const np = nearestPointOnSegment(ax, ay, bx, by, px, py);
    const dist = Math.hypot(np.x - px, np.y - py);
    if (dist < best.dist) {
      best = { x: np.x, y: np.y, dist, segmentIndex: i / 2 };
    }
  }
  return best;
}

/** Default hit radius for pin snap (circuit units). Use threshold = SNAP_RADIUS_PX / viewport.scale for screen-pixel consistency. */
export const PIN_HIT_RADIUS_CIRCUIT = 14;

/**
 * Single source of truth: all pins in world (circuit) coordinates for the active view.
 * Same coordinates as PinNode rendering and findPin. Use for wire snapping and hit testing.
 */
export function getAllPinsInWorld(
  state: SimState,
  viewMode?: ViewMode
): Array<{ componentId: string; pinId: string; x: number; y: number; hitRadius: number }> {
  const out: Array<{ componentId: string; pinId: string; x: number; y: number; hitRadius: number }> = [];
  for (const c of state.components) {
    for (const p of c.pins) {
      const pos = findPin(state, c.id, p.id, viewMode);
      if (!pos) continue;
      out.push({
        componentId: c.id,
        pinId: p.id,
        x: pos.x,
        y: pos.y,
        hitRadius: PIN_HIT_RADIUS_CIRCUIT,
      });
    }
  }
  return out;
}

/** Nearest pin to (circuitX, circuitY) within threshold. Uses same coords as PinNode/findPin. viewMode for pin positions. */
export function getNearestPin(
  state: SimState,
  circuitX: number,
  circuitY: number,
  threshold: number,
  viewMode?: ViewMode
): { compId: string; pinId: string; x: number; y: number } | null {
  let best: { compId: string; pinId: string; x: number; y: number; dist: number } | null = null;
  for (const c of state.components) {
    const pinIds =
      c.pins?.length !== undefined && c.pins.length > 0
        ? c.pins.map((p) => p.id)
        : Object.keys(getFootprint(c.type, viewMode)?.pinOffsets ?? {});
    for (const pinId of pinIds) {
      const pos = findPin(state, c.id, pinId, viewMode);
      if (!pos) continue;
      const dist = Math.hypot(pos.x - circuitX, pos.y - circuitY);
      if (dist <= threshold && (best === null || dist < best.dist)) {
        best = { compId: c.id, pinId, x: pos.x, y: pos.y, dist };
      }
    }
  }
  return best ? { compId: best.compId, pinId: best.pinId, x: best.x, y: best.y } : null;
}

export type HitTarget =
  | { type: 'pin'; compId: string; pinId: string }
  | { type: 'wire'; wireId: string; x: number; y: number; segmentIndex: number }
  | null;

/** What is under (circuitX, circuitY)? Pin takes precedence over wire within threshold. viewMode used for pin positions. */
export function getHitTarget(
  state: SimState,
  circuitX: number,
  circuitY: number,
  threshold: number,
  viewMode?: ViewMode
): HitTarget {
  const pin = getNearestPin(state, circuitX, circuitY, threshold, viewMode);
  if (pin) return { type: 'pin', compId: pin.compId, pinId: pin.pinId };

  let bestWire: { wireId: string; x: number; y: number; dist: number; segmentIndex: number } | null = null;
  for (const w of state.wires) {
    const from = findPin(state, w.from.componentId, w.from.pinId, viewMode);
    const to = findPin(state, w.to.componentId, w.to.pinId, viewMode);
    if (!from || !to) continue;
    const points = w.points && w.points.length >= 4 ? w.points : [from.x, from.y, to.x, to.y];
    const result = nearestPointOnPolyline(points, circuitX, circuitY);
    if (result.dist <= threshold && (bestWire === null || result.dist < bestWire.dist)) {
      bestWire = { wireId: w.id, x: result.x, y: result.y, dist: result.dist, segmentIndex: result.segmentIndex };
    }
  }
  if (bestWire) return { type: 'wire', wireId: bestWire.wireId, x: bestWire.x, y: bestWire.y, segmentIndex: bestWire.segmentIndex };
  return null;
}

/** Resolve wire endpoint to anchored position (from component/junction pin). Always use for rendering. */
export function getWireEndpointPosition(
  state: SimState,
  wire: { from: WireEnd; to: WireEnd },
  end: 'from' | 'to',
  viewMode?: ViewMode
): { x: number; y: number } | null {
  const ref = end === 'from' ? wire.from : wire.to;
  return findPin(state, ref.componentId, ref.pinId, viewMode);
}

const REPAIR_SNAP_PX = 12;

/**
 * On view switch: reattach wire endpoints that are within REPAIR_SNAP_PX of a pin/junction.
 * Uses viewMode for pin positions (run in target view's coordinates).
 * Returns updated wires (same ids, from/to possibly updated) and a list of repair messages for debugging.
 */
export function repairDanglingEndpoints(
  state: SimState,
  snapPx: number = REPAIR_SNAP_PX,
  viewMode?: ViewMode
): { wires: Wire[]; repairs: string[] } {
  const repairs: string[] = [];
  const wires = state.wires.map((w) => {
    const fromPos = findPin(state, w.from.componentId, w.from.pinId, viewMode);
    const toPos = findPin(state, w.to.componentId, w.to.pinId, viewMode);
    let newFrom = w.from;
    let newTo = w.to;
    if (!fromPos) {
      const approx = w.points && w.points.length >= 2 ? { x: w.points[0]!, y: w.points[1]! } : toPos ?? null;
      if (approx) {
        const nearest = getNearestPin(state, approx.x, approx.y, snapPx, viewMode);
        if (nearest && (nearest.compId !== w.to.componentId || nearest.pinId !== w.to.pinId)) {
          newFrom = { componentId: nearest.compId, pinId: nearest.pinId };
          repairs.push(`Wire ${w.id}: reattached from to ${nearest.compId}:${nearest.pinId}`);
        }
      }
    }
    if (!toPos) {
      const approx = w.points && w.points.length >= 4
        ? { x: w.points[w.points.length - 2]!, y: w.points[w.points.length - 1]! }
        : fromPos ?? null;
      if (approx) {
        const nearest = getNearestPin(state, approx.x, approx.y, snapPx, viewMode);
        if (nearest && (nearest.compId !== newFrom.componentId || nearest.pinId !== newFrom.pinId)) {
          newTo = { componentId: nearest.compId, pinId: nearest.pinId };
          repairs.push(`Wire ${w.id}: reattached to to ${nearest.compId}:${nearest.pinId}`);
        }
      }
    }
    if (newFrom !== w.from || newTo !== w.to) {
      return { ...w, from: newFrom, to: newTo };
    }
    return w;
  });
  return { wires, repairs };
}
