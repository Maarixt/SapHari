/**
 * Canonical circuit store: components, wires, tool, multi-selection, activeWireStart, running, wireColor.
 * Uses useReducer (no Zustand). Selection is multi: selectedComponentIds, selectedWireIds.
 */

import { useReducer, useCallback, useRef } from 'react';
import { nanoid } from 'nanoid';
import type { SimComponent, Wire } from '../types';
import { canConnectPin, getWirePoints, insertMidpointIntoWirePoints, repairDanglingEndpoints } from '../helpers';
import { makeJunction } from '../library/junction';
import { cleanupBuzzerAudio } from '../runLoop';
import { SWITCH_VARIANTS, getSwitchVariantId } from '../registry';
import { migrateWiresOnVariantChange } from '../utils/migratePins';
import { canonPinId } from '../engine2';

export type ToolMode = 'select' | 'wire' | 'pan' | 'junction';

export type ViewMode = 'workbench' | 'schematic';

export interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface CircuitState {
  components: SimComponent[];
  wires: Wire[];
  tool: ToolMode;
  selectedComponentIds: string[];
  selectedWireIds: string[];
  activeWireStart: { componentId: string; pinId: string } | null;
  running: boolean;
  wireColor: string;
  viewport: Viewport;
  viewMode: ViewMode;
}

/** Backward-compat: primary selection (first selected component or wire) for panels. */
export type Selection =
  | { type: 'component'; id: string }
  | { type: 'wire'; id: string }
  | { type: null; id?: never };

export function getPrimarySelection(state: CircuitState): Selection {
  if (state.selectedComponentIds.length > 0) {
    return { type: 'component', id: state.selectedComponentIds[0] };
  }
  if (state.selectedWireIds.length > 0) {
    return { type: 'wire', id: state.selectedWireIds[0] };
  }
  return { type: null };
}

/** SimState shape for runLoop/engine compatibility */
export function toSimState(state: CircuitState): { components: SimComponent[]; wires: Wire[]; running: boolean } {
  return {
    components: state.components,
    wires: state.wires,
    running: state.running,
  };
}

type CircuitAction =
  | { type: 'ADD_COMPONENT'; payload: SimComponent }
  | { type: 'MOVE_COMPONENT'; payload: { id: string; x: number; y: number; noSnap?: boolean } }
  | { type: 'SET_TOOL'; payload: ToolMode }
  | { type: 'SELECT_ITEM'; payload: { type: 'component' | 'wire'; id: string } }
  | { type: 'SELECT_ADD_COMPONENT'; payload: string }
  | { type: 'SELECT_ADD_WIRE'; payload: string }
  | { type: 'SELECT_REMOVE_COMPONENT'; payload: string }
  | { type: 'SELECT_REMOVE_WIRE'; payload: string }
  | { type: 'SELECT_BOX'; payload: { componentIds: string[]; wireIds: string[]; merge?: boolean } }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'BEGIN_WIRE'; payload: { componentId: string; pinId: string } }
  | { type: 'COMMIT_WIRE'; payload: { toComponentId: string; toPinId: string; points?: number[] } }
  | { type: 'ADD_WIRE'; payload: { from: { componentId: string; pinId: string }; to: { componentId: string; pinId: string }; color?: string; points?: number[] } }
  | { type: 'UPDATE_WIRE_POINTS'; payload: { id: string; points: number[]; viewMode?: ViewMode } }
  | { type: 'CANCEL_WIRE' }
  | { type: 'DELETE_SELECTED' }
  | { type: 'DELETE_COMPONENT'; payload: string }
  | { type: 'DELETE_WIRE'; payload: string }
  | { type: 'SET_RUNNING'; payload: boolean }
  | { type: 'SET_WIRE_COLOR'; payload: string }
  | { type: 'UPDATE_WIRE_COLOR'; payload: { id: string; color: string } }
  | { type: 'UPDATE_COMPONENT_PROPS'; payload: { id: string; props: Record<string, unknown> } }
  | { type: 'BATCH_UPDATE_COMPONENT_PROPS'; payload: { updates: { id: string; props: Record<string, unknown> }[] } }
  | { type: 'UPDATE_SELECTED_COMPONENT'; payload: Partial<SimComponent> }
  | { type: 'REPLACE_SIM_STATE'; payload: { components: SimComponent[]; wires: Wire[]; running?: boolean } }
  | { type: 'SET_CIRCUIT'; payload: { components: SimComponent[]; wires: Wire[]; wireColor?: string } }
  | { type: 'SET_VIEWPORT'; payload: Viewport }
  | { type: 'PAN_BY'; payload: { dx: number; dy: number } }
  | { type: 'SET_SCALE'; payload: { scale: number; centerStageX?: number; centerStageY?: number } }
  | { type: 'RESET_VIEW' }
  | { type: 'SET_VIEW_MODE'; payload: ViewMode }
  | { type: 'TOGGLE_FLIP_X'; payload: string }
  | { type: 'ROTATE_90'; payload: string }
  | { type: 'FLIP_Y'; payload: string }
  | { type: 'RESET_WIRE_ROUTE'; payload: string }
  | { type: 'SET_VARIANT'; payload: { componentId: string; variantId: string } }
  | { type: 'BATCH_UPDATE_WIRE_POINTS'; payload: { updates: { id: string; points: number[] }[] } }
  | { type: 'INSERT_JUNCTION_AND_SPLIT_WIRE'; payload: { wireId: string; x: number; y: number; segmentIndex: number; viewMode?: ViewMode; junctionId: string } }
  | { type: 'UNDO' }
  | { type: 'REDO' };

const SNAP_GRID = 10;

function snap(v: number): number {
  return Math.round(v / SNAP_GRID) * SNAP_GRID;
}

function nextRotation(current: number | undefined): 0 | 90 | 180 | 270 {
  const r = (current ?? 0) % 360;
  if (r === 0) return 90;
  if (r === 90) return 180;
  if (r === 180) return 270;
  return 0;
}

/** Clear stored path for wires attached to component so they re-route from new pin positions. */
function clearWirePointsForComponent(wires: Wire[], componentId: string): Wire[] {
  return wires.map((w) =>
    w.from.componentId === componentId || w.to.componentId === componentId
      ? { ...w, points: undefined }
      : w
  );
}

function derivePushButtonProps(props: Record<string, unknown> | undefined): Record<string, unknown> {
  const contact = props?.contact === 'NC' ? 'NC' : 'NO';
  const mechanism = props?.mechanism === 'latch' ? 'latch' : 'momentary';
  const pressed = !!props?.pressed;
  const latched = !!props?.latched;
  const rOnOhms = Math.max(1e-6, Number(props?.rOnOhms) || 0.01);
  const isActuated = mechanism === 'latch' ? latched : pressed;
  const isClosed = contact === 'NO' ? isActuated : !isActuated;
  return {
    ...props,
    contact,
    mechanism,
    pressed,
    latched,
    rOnOhms,
    isClosed,
  };
}

function normalizePushButtonComponent(comp: SimComponent): SimComponent {
  const type = comp.type as string;
  if (type === 'push_button') {
    return {
      ...comp,
      pins: [
        { id: 'P1', label: 'P1', kind: 'digital', role: 'A', x: 10, y: 25 },
        { id: 'P2', label: 'P2', kind: 'digital', role: 'B', x: 80, y: 25 },
      ],
      props: derivePushButtonProps(comp.props),
    };
  }
  if (type === 'push_button_momentary') {
    return {
      ...comp,
      type: 'push_button',
      pins: [
        { id: 'P1', label: 'P1', kind: 'digital', role: 'A', x: 10, y: 25 },
        { id: 'P2', label: 'P2', kind: 'digital', role: 'B', x: 80, y: 25 },
      ],
      props: derivePushButtonProps({ ...comp.props, mechanism: 'momentary', contact: 'NO' }),
    };
  }
  if (type === 'push_button_latch') {
    return {
      ...comp,
      type: 'push_button',
      pins: [
        { id: 'P1', label: 'P1', kind: 'digital', role: 'A', x: 10, y: 25 },
        { id: 'P2', label: 'P2', kind: 'digital', role: 'B', x: 80, y: 25 },
      ],
      props: derivePushButtonProps({ ...comp.props, mechanism: 'latch', contact: 'NO' }),
    };
  }
  if (type === 'button') {
    return {
      ...comp,
      type: 'push_button',
      pins: [
        { id: 'P1', label: 'P1', kind: 'digital', role: 'A', x: 10, y: 25 },
        { id: 'P2', label: 'P2', kind: 'digital', role: 'B', x: 80, y: 25 },
      ],
      props: derivePushButtonProps({ ...comp.props, mechanism: 'momentary', contact: 'NO' }),
    };
  }
  return comp;
}

function normalizePushButtonComponents(components: SimComponent[]): SimComponent[] {
  return components.map(normalizePushButtonComponent);
}

function circuitReducer(state: CircuitState, action: CircuitAction): CircuitState {
  switch (action.type) {
    case 'ADD_COMPONENT':
      return {
        ...state,
        components: [...state.components, normalizePushButtonComponent(action.payload)],
      };

    case 'MOVE_COMPONENT': {
      const { id, x, y, noSnap } = action.payload;
      const x2 = noSnap ? x : snap(x);
      const y2 = noSnap ? y : snap(y);
      return {
        ...state,
        components: state.components.map((c) =>
          c.id === id ? { ...c, x: x2, y: y2 } : c
        ),
        wires: clearWirePointsForComponent(state.wires, id),
      };
    }

    case 'SET_TOOL':
      return { ...state, tool: action.payload };

    case 'SELECT_ITEM': {
      const { type, id } = action.payload;
      if (type === 'component') {
        return { ...state, selectedComponentIds: [id], selectedWireIds: [] };
      }
      return { ...state, selectedComponentIds: [], selectedWireIds: [id] };
    }

    case 'SELECT_ADD_COMPONENT': {
      const id = action.payload;
      const set = new Set(state.selectedComponentIds);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...state, selectedComponentIds: [...set], selectedWireIds: [] };
    }

    case 'SELECT_ADD_WIRE': {
      const id = action.payload;
      const set = new Set(state.selectedWireIds);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...state, selectedComponentIds: [], selectedWireIds: [...set] };
    }

    case 'SELECT_REMOVE_COMPONENT':
      return {
        ...state,
        selectedComponentIds: state.selectedComponentIds.filter((x) => x !== action.payload),
      };

    case 'SELECT_REMOVE_WIRE':
      return {
        ...state,
        selectedWireIds: state.selectedWireIds.filter((x) => x !== action.payload),
      };

    case 'SELECT_BOX': {
      const { componentIds, wireIds, merge } = action.payload;
      if (merge) {
        return {
          ...state,
          selectedComponentIds: [...new Set([...state.selectedComponentIds, ...componentIds])],
          selectedWireIds: [...new Set([...state.selectedWireIds, ...wireIds])],
        };
      }
      return { ...state, selectedComponentIds: componentIds, selectedWireIds: wireIds };
    }

    case 'CLEAR_SELECTION':
      return { ...state, selectedComponentIds: [], selectedWireIds: [] };

    case 'BEGIN_WIRE':
      return { ...state, activeWireStart: action.payload };

    case 'COMMIT_WIRE': {
      const { toComponentId, toPinId, points } = action.payload;
      if (!state.activeWireStart) return state;
      const newWire: Wire = {
        id: 'w-' + nanoid(6),
        from: { componentId: state.activeWireStart.componentId, pinId: canonPinId(state.activeWireStart.pinId) },
        to: { componentId: toComponentId, pinId: canonPinId(toPinId) },
        color: state.wireColor,
        ...(points && points.length >= 4 && { points }),
      };
      const nextWires = [...state.wires, newWire];
      return {
        ...state,
        wires: nextWires,
        activeWireStart: null,
      };
    }

    case 'CANCEL_WIRE':
      return { ...state, activeWireStart: null };

    case 'ADD_WIRE': {
      const { from, to, color, points } = action.payload;
      const newWire: Wire = {
        id: 'w-' + nanoid(6),
        from: { componentId: from.componentId, pinId: canonPinId(from.pinId) },
        to: { componentId: to.componentId, pinId: canonPinId(to.pinId) },
        color: color ?? state.wireColor,
        ...(points && points.length >= 4 && { points }),
      };
      return { ...state, wires: [...state.wires, newWire] };
    }

    case 'UPDATE_WIRE_POINTS': {
      const { id, points, viewMode } = action.payload;
      if (!points || points.length < 4) return state;
      return {
        ...state,
        wires: state.wires.map((w) => {
          if (w.id !== id) return w;
          const next: Wire = { ...w, points: [...points] };
          if (viewMode === 'schematic') next.pointsSchematic = [...points];
          else next.pointsWorkbench = [...points];
          return next;
        }),
      };
    }

    case 'DELETE_SELECTED': {
      const compIds = new Set(state.selectedComponentIds);
      const wireIds = new Set(state.selectedWireIds);
      if (compIds.size === 0 && wireIds.size === 0) return state;
      cleanupBuzzerAudio([...compIds]);
      return {
        ...state,
        selectedComponentIds: [],
        selectedWireIds: [],
        components: state.components.filter((c) => !compIds.has(c.id)),
        wires: state.wires.filter(
          (w) => !wireIds.has(w.id) && !compIds.has(w.from.componentId) && !compIds.has(w.to.componentId)
        ),
      };
    }

    case 'DELETE_COMPONENT': {
      const id = action.payload;
      cleanupBuzzerAudio([id]);
      return {
        ...state,
        selectedComponentIds: state.selectedComponentIds.filter((x) => x !== id),
        selectedWireIds: state.selectedWireIds.filter(
          (wid) => state.wires.find((w) => w.id === wid)?.from.componentId !== id && state.wires.find((w) => w.id === wid)?.to.componentId !== id
        ),
        components: state.components.filter((c) => c.id !== id),
        wires: state.wires.filter(
          (w) => w.from.componentId !== id && w.to.componentId !== id
        ),
      };
    }

    case 'DELETE_WIRE': {
      const id = action.payload;
      return {
        ...state,
        selectedWireIds: state.selectedWireIds.filter((x) => x !== id),
        wires: state.wires.filter((w) => w.id !== id),
      };
    }

    case 'SET_RUNNING':
      return { ...state, running: action.payload };

    case 'SET_WIRE_COLOR':
      return { ...state, wireColor: action.payload };

    case 'UPDATE_WIRE_COLOR': {
      const { id, color } = action.payload;
      return {
        ...state,
        wires: state.wires.map((w) => (w.id === id ? { ...w, color } : w)),
      };
    }

    case 'UPDATE_COMPONENT_PROPS': {
      const { id, props } = action.payload;
      return {
        ...state,
        components: state.components.map((c) =>
          c.id === id
            ? normalizePushButtonComponent({ ...c, props: { ...c.props, ...props } })
            : c
        ),
      };
    }

    case 'BATCH_UPDATE_COMPONENT_PROPS': {
      const { updates } = action.payload;
      if (updates.length === 0) return state;
      const byId = new Map(updates.map((u) => [u.id, u.props]));
      return {
        ...state,
        components: state.components.map((c) => {
          const props = byId.get(c.id);
          if (props == null) return c;
          return normalizePushButtonComponent({ ...c, props: { ...c.props, ...props } });
        }),
      };
    }

    case 'UPDATE_SELECTED_COMPONENT': {
      const firstId = state.selectedComponentIds[0];
      if (!firstId) return state;
      const updates = action.payload;
      return {
        ...state,
        components: state.components.map((c) =>
          c.id === firstId ? { ...c, ...updates } : c
        ),
      };
    }

    case 'REPLACE_SIM_STATE': {
      const { components, wires, running } = action.payload;
      return {
        ...state,
        components: normalizePushButtonComponents(components ?? state.components),
        wires: wires ?? state.wires,
        ...(running !== undefined && { running }),
      };
    }

    case 'SET_CIRCUIT': {
      const { components, wires, wireColor } = action.payload;
      return {
        ...state,
        components: normalizePushButtonComponents(components),
        wires,
        selectedComponentIds: [],
        selectedWireIds: [],
        ...(wireColor !== undefined && { wireColor }),
      };
    }

    case 'SET_VIEWPORT':
      return { ...state, viewport: action.payload };

    case 'PAN_BY': {
      const { dx, dy } = action.payload;
      return {
        ...state,
        viewport: {
          ...state.viewport,
          offsetX: state.viewport.offsetX + dx,
          offsetY: state.viewport.offsetY + dy,
        },
      };
    }

    case 'SET_SCALE': {
      const { scale: nextScale, centerStageX, centerStageY } = action.payload;
      const { scale: prevScale, offsetX, offsetY } = state.viewport;
      const minScale = 0.2;
      const maxScale = 4;
      const scale = Math.max(minScale, Math.min(maxScale, nextScale));
      if (centerStageX != null && centerStageY != null) {
        const circuitX = (centerStageX - offsetX) / prevScale;
        const circuitY = (centerStageY - offsetY) / prevScale;
        return {
          ...state,
          viewport: {
            scale,
            offsetX: centerStageX - circuitX * scale,
            offsetY: centerStageY - circuitY * scale,
          },
        };
      }
      return {
        ...state,
        viewport: { ...state.viewport, scale },
      };
    }

    case 'RESET_VIEW':
      return {
        ...state,
        viewport: { scale: 1, offsetX: 0, offsetY: 0 },
      };

    case 'SET_VIEW_MODE': {
      const newViewMode = action.payload;
      const simState = { components: state.components, wires: state.wires, running: state.running };
      const { wires: repairedWires, repairs } = repairDanglingEndpoints(simState, 12, newViewMode);
      if (repairs.length > 0 && typeof console !== 'undefined' && console.log) {
        console.log('[Simulator] Endpoint repair on view switch:', repairs);
      }
      return {
        ...state,
        viewMode: newViewMode,
        wires: repairs.length > 0 ? repairedWires : state.wires,
      };
    }

    case 'TOGGLE_FLIP_X': {
      const id = action.payload;
      return {
        ...state,
        components: state.components.map((c) =>
          c.id === id ? { ...c, flipX: !c.flipX } : c
        ),
        wires: clearWirePointsForComponent(state.wires, id),
      };
    }

    case 'ROTATE_90': {
      const id = action.payload;
      return {
        ...state,
        components: state.components.map((c) =>
          c.id === id ? { ...c, rotation: nextRotation(c.rotation) } : c
        ),
        wires: clearWirePointsForComponent(state.wires, id),
      };
    }

    case 'FLIP_Y': {
      const id = action.payload;
      return {
        ...state,
        components: state.components.map((c) =>
          c.id === id ? { ...c, flipY: !c.flipY } : c
        ),
        wires: clearWirePointsForComponent(state.wires, id),
      };
    }

    case 'RESET_WIRE_ROUTE': {
      const wireId = action.payload;
      return {
        ...state,
        wires: state.wires.map((w) =>
          w.id === wireId ? { ...w, points: undefined } : w
        ),
      };
    }

    case 'SET_VARIANT': {
      const { componentId, variantId } = action.payload;
      const comp = state.components.find((c) => c.id === componentId);
      if (!comp) return state;
      const compType = comp.type;
      if (compType !== 'switch' && (compType as string) !== 'toggle-switch') return state;
      const variantDef = SWITCH_VARIANTS[variantId as keyof typeof SWITCH_VARIANTS];
      if (!variantDef) return state;
      const oldVariant = comp.variantId ?? getSwitchVariantId(undefined);
      const { wires: newWires, unmappedEndpoints } = migrateWiresOnVariantChange(
        componentId,
        oldVariant,
        variantId,
        compType,
        state.wires
      );
      if (unmappedEndpoints.length > 0) {
        console.warn('[SET_VARIANT] Unmapped wire endpoints (detached):', unmappedEndpoints);
      }
      const isPositionSwitch = variantId === 'SPDT' || variantId === 'DPDT';
      const updatedComponents = state.components.map((c) =>
        c.id === componentId
          ? {
              ...c,
              variantId,
              pins: variantDef.pins.map((p) => ({ ...p })),
              props: isPositionSwitch ? { ...c.props, position: 'A' as const } : c.props,
            }
          : c
      );
      return {
        ...state,
        components: updatedComponents,
        wires: clearWirePointsForComponent(newWires, componentId),
      };
    }

    case 'BATCH_UPDATE_WIRE_POINTS': {
      const { updates } = action.payload;
      if (updates.length === 0) return state;
      const byId = new Map(updates.map((u) => [u.id, u.points]));
      return {
        ...state,
        wires: state.wires.map((w) => {
          const points = byId.get(w.id);
          if (points == null || points.length < 4) return w;
          return { ...w, points: [...points] };
        }),
      };
    }

    case 'INSERT_JUNCTION_AND_SPLIT_WIRE': {
      const { wireId, x, y, segmentIndex, viewMode, junctionId } = action.payload;
      const wire = state.wires.find((w) => w.id === wireId);
      if (!wire) return state;
      const simState = { components: state.components, wires: state.wires, running: state.running };
      const points = getWirePoints(simState, wire, viewMode);
      if (points.length < 4) return state;
      const merged = insertMidpointIntoWirePoints(points, segmentIndex, x, y);
      const insertAt = (segmentIndex + 1) * 2;
      const points1 = merged.slice(0, insertAt + 2);
      const points2 = merged.slice(insertAt);
      if (points1.length < 4 || points2.length < 4) return state;
      const jx = x - 8;
      const jy = y - 8;
      const junction = makeJunction(jx, jy, junctionId);
      const wire1: Wire = {
        id: 'w-' + nanoid(6),
        from: { componentId: wire.from.componentId, pinId: canonPinId(wire.from.pinId) },
        to: { componentId: junctionId, pinId: 'J' },
        color: wire.color,
        points: points1,
      };
      const wire2: Wire = {
        id: 'w-' + nanoid(6),
        from: { componentId: junctionId, pinId: 'J' },
        to: { componentId: wire.to.componentId, pinId: canonPinId(wire.to.pinId) },
        color: wire.color,
        points: points2,
      };
      const nextWires = state.wires.filter((w) => w.id !== wireId);
      nextWires.push(wire1, wire2);
      const nextComponents = [...state.components, junction];
      const nextSelectedWireIds = state.selectedWireIds.filter((id) => id !== wireId);
      return {
        ...state,
        components: nextComponents,
        wires: nextWires,
        selectedWireIds: nextSelectedWireIds,
      };
    }

    default:
      return state;
  }
}

const initialViewport: Viewport = { scale: 1, offsetX: 0, offsetY: 0 };

const initialState: CircuitState = {
  components: [],
  wires: [],
  tool: 'select',
  selectedComponentIds: [],
  selectedWireIds: [],
  activeWireStart: null,
  running: false,
  wireColor: 'red',
  viewport: initialViewport,
  viewMode: 'workbench',
};

const UNDOABLE: CircuitAction['type'][] = [
  'ADD_COMPONENT', 'MOVE_COMPONENT', 'COMMIT_WIRE', 'ADD_WIRE', 'UPDATE_WIRE_POINTS',
  'DELETE_SELECTED', 'DELETE_COMPONENT', 'DELETE_WIRE', 'SET_CIRCUIT', 'REPLACE_SIM_STATE',
  'BATCH_UPDATE_WIRE_POINTS', 'INSERT_JUNCTION_AND_SPLIT_WIRE', 'UPDATE_WIRE_COLOR', 'SET_VARIANT', 'RESET_WIRE_ROUTE', 'UPDATE_COMPONENT_PROPS',
  'BATCH_UPDATE_COMPONENT_PROPS', 'UPDATE_SELECTED_COMPONENT', 'TOGGLE_FLIP_X', 'ROTATE_90', 'FLIP_Y',
];

interface RootState {
  circuit: CircuitState;
  past: CircuitState[];
  future: CircuitState[];
}

const MAX_HISTORY = 50;

function rootReducer(root: RootState, action: CircuitAction): RootState {
  if (action.type === 'UNDO') {
    if (root.past.length === 0) return root;
    const [prev, ...past] = root.past;
    return { circuit: prev, past, future: [root.circuit, ...root.future].slice(0, MAX_HISTORY) };
  }
  if (action.type === 'REDO') {
    if (root.future.length === 0) return root;
    const [next, ...future] = root.future;
    return { circuit: next, past: [root.circuit, ...root.past].slice(0, MAX_HISTORY), future };
  }
  const nextCircuit = circuitReducer(root.circuit, action);
  const changed = nextCircuit !== root.circuit;
  const undoable = UNDOABLE.includes(action.type);
  if (changed && undoable) {
    return {
      circuit: nextCircuit,
      past: [root.circuit, ...root.past].slice(0, MAX_HISTORY),
      future: [],
    };
  }
  return { ...root, circuit: nextCircuit };
}

const initialRoot: RootState = { circuit: initialState, past: [], future: [] };

export function useCircuitStore(initializer?: (state: CircuitState) => CircuitState) {
  const [root, dispatch] = useReducer(
    rootReducer,
    initialRoot,
    (init: RootState) => initializer ? { ...init, circuit: initializer(init.circuit) } : init
  );
  const state = root.circuit;

  const addComponent = useCallback((component: SimComponent) => {
    dispatch({ type: 'ADD_COMPONENT', payload: component });
  }, []);

  const moveComponent = useCallback((id: string, x: number, y: number, noSnap?: boolean) => {
    dispatch({ type: 'MOVE_COMPONENT', payload: { id, x, y, noSnap } });
  }, []);

  const selectComponent = useCallback((id: string, shift?: boolean) => {
    if (shift) dispatch({ type: 'SELECT_ADD_COMPONENT', payload: id });
    else dispatch({ type: 'SELECT_ITEM', payload: { type: 'component', id } });
  }, []);

  const selectWire = useCallback((id: string, shift?: boolean) => {
    if (shift) dispatch({ type: 'SELECT_ADD_WIRE', payload: id });
    else dispatch({ type: 'SELECT_ITEM', payload: { type: 'wire', id } });
  }, []);

  const setTool = useCallback((tool: ToolMode) => {
    dispatch({ type: 'SET_TOOL', payload: tool });
  }, []);

  const selectAddComponent = useCallback((id: string) => {
    dispatch({ type: 'SELECT_ADD_COMPONENT', payload: id });
  }, []);

  const selectAddWire = useCallback((id: string) => {
    dispatch({ type: 'SELECT_ADD_WIRE', payload: id });
  }, []);

  const selectBox = useCallback((componentIds: string[], wireIds: string[], merge?: boolean) => {
    dispatch({ type: 'SELECT_BOX', payload: { componentIds, wireIds, merge } });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
  }, []);

  const beginWire = useCallback((componentId: string, pinId: string) => {
    dispatch({ type: 'BEGIN_WIRE', payload: { componentId, pinId } });
  }, []);

  const commitWire = useCallback((toComponentId: string, toPinId: string, points?: number[]) => {
    dispatch({ type: 'COMMIT_WIRE', payload: { toComponentId, toPinId, points } });
  }, []);

  const updateWirePoints = useCallback((wireId: string, points: number[], viewMode?: ViewMode) => {
    dispatch({ type: 'UPDATE_WIRE_POINTS', payload: { id: wireId, points, viewMode } });
  }, []);

  const addWire = useCallback(
    (from: { componentId: string; pinId: string }, to: { componentId: string; pinId: string }, color?: string) => {
      dispatch({ type: 'ADD_WIRE', payload: { from, to, color } });
    },
    []
  );

  const cancelWire = useCallback(() => {
    dispatch({ type: 'CANCEL_WIRE' });
  }, []);

  const deleteSelected = useCallback(() => {
    dispatch({ type: 'DELETE_SELECTED' });
  }, []);

  const deleteComponent = useCallback((id: string) => {
    dispatch({ type: 'DELETE_COMPONENT', payload: id });
  }, []);

  const deleteWire = useCallback((id: string) => {
    dispatch({ type: 'DELETE_WIRE', payload: id });
  }, []);

  const setRunning = useCallback((running: boolean) => {
    dispatch({ type: 'SET_RUNNING', payload: running });
  }, []);

  const setWireColor = useCallback((color: string) => {
    dispatch({ type: 'SET_WIRE_COLOR', payload: color });
  }, []);

  const updateWireColor = useCallback((wireId: string, color: string) => {
    dispatch({ type: 'UPDATE_WIRE_COLOR', payload: { id: wireId, color } });
  }, []);

  const updateComponentProps = useCallback((id: string, props: Record<string, unknown>) => {
    dispatch({ type: 'UPDATE_COMPONENT_PROPS', payload: { id, props } });
  }, []);

  const batchUpdateComponentProps = useCallback(
    (updates: { id: string; props: Record<string, unknown> }[]) => {
      if (updates.length > 0) {
        dispatch({ type: 'BATCH_UPDATE_COMPONENT_PROPS', payload: { updates } });
      }
    },
    []
  );

  const updateSelectedComponent = useCallback((updates: Partial<SimComponent>) => {
    dispatch({ type: 'UPDATE_SELECTED_COMPONENT', payload: updates });
  }, []);

  /** Replace components/wires (and optionally running) from simulation loop. */
  const replaceSimState = useCallback(
    (payload: { components: SimComponent[]; wires: Wire[]; running?: boolean }) => {
      dispatch({ type: 'REPLACE_SIM_STATE', payload });
    },
    []
  );

  const setCircuit = useCallback(
    (payload: { components: SimComponent[]; wires: Wire[]; wireColor?: string }) => {
      dispatch({ type: 'SET_CIRCUIT', payload });
    },
    []
  );

  const setViewport = useCallback((viewport: Viewport) => {
    dispatch({ type: 'SET_VIEWPORT', payload: viewport });
  }, []);

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);

  const panBy = useCallback((dx: number, dy: number) => {
    dispatch({ type: 'PAN_BY', payload: { dx, dy } });
  }, []);

  const setScale = useCallback(
    (scale: number, centerStageX?: number, centerStageY?: number) => {
      dispatch({ type: 'SET_SCALE', payload: { scale, centerStageX, centerStageY } });
    },
    []
  );

  const resetView = useCallback(() => {
    dispatch({ type: 'RESET_VIEW' });
  }, []);

  const setViewMode = useCallback((viewMode: ViewMode) => {
    dispatch({ type: 'SET_VIEW_MODE', payload: viewMode });
  }, []);

  const toggleFlipX = useCallback((componentId: string) => {
    dispatch({ type: 'TOGGLE_FLIP_X', payload: componentId });
  }, []);

  const rotate90 = useCallback((componentId: string) => {
    dispatch({ type: 'ROTATE_90', payload: componentId });
  }, []);

  const flipY = useCallback((componentId: string) => {
    dispatch({ type: 'FLIP_Y', payload: componentId });
  }, []);

  const resetWireRoute = useCallback((wireId: string) => {
    dispatch({ type: 'RESET_WIRE_ROUTE', payload: wireId });
  }, []);

  const setVariant = useCallback((componentId: string, variantId: string) => {
    dispatch({ type: 'SET_VARIANT', payload: { componentId, variantId } });
  }, []);

  const batchUpdateWirePoints = useCallback(
    (updates: { id: string; points: number[] }[]) => {
      if (updates.length > 0) {
        dispatch({ type: 'BATCH_UPDATE_WIRE_POINTS', payload: { updates } });
      }
    },
    []
  );

  const getStateRef = useRef(state);
  getStateRef.current = state;

  const getState = useCallback(() => getStateRef.current, []);

  const JUNCTION_NEAR_THRESHOLD = 12;
  const insertJunctionAndSplitWire = useCallback(
    (wireId: string, x: number, y: number, segmentIndex: number, viewMode?: ViewMode): string => {
      const s = getStateRef.current;
      for (const c of s.components) {
        if (c.type === 'junction') {
          const jx = c.x + 8;
          const jy = c.y + 8;
          if (Math.hypot(jx - x, jy - y) < JUNCTION_NEAR_THRESHOLD) return c.id;
        }
      }
      const junctionId = 'junction-' + nanoid(6);
      dispatch({
        type: 'INSERT_JUNCTION_AND_SPLIT_WIRE',
        payload: { wireId, x, y, segmentIndex, viewMode, junctionId },
      });
      return junctionId;
    },
    [dispatch]
  );

  return {
    state,
    dispatch,
    getState,
    toSimState: () => toSimState(state),
    addComponent,
    moveComponent,
    setTool,
    selectComponent,
    selectWire,
    selectAddComponent,
    selectAddWire,
    selectBox,
    clearSelection,
    beginWire,
    commitWire,
    updateWirePoints,
    addWire,
    cancelWire,
    deleteSelected,
    deleteComponent,
    deleteWire,
    setRunning,
    setWireColor,
    updateWireColor,
    updateComponentProps,
    batchUpdateComponentProps,
    updateSelectedComponent,
    replaceSimState,
    setCircuit,
    setViewport,
    panBy,
    setScale,
    resetView,
    setViewMode,
    toggleFlipX,
    rotate90,
    flipY,
    resetWireRoute,
    setVariant,
    batchUpdateWirePoints,
    insertJunctionAndSplitWire,
    undo,
    redo,
    canUndo: root.past.length > 0,
    canRedo: root.future.length > 0,
  };
}

/** Helper: can we complete a wire from activeWireStart to (compId, pinId)? Returns true if allowed. */
export function canCommitWire(
  state: CircuitState,
  toCompId: string,
  toPinId: string
): boolean {
  if (!state.activeWireStart) return false;
  if (state.activeWireStart.componentId === toCompId && state.activeWireStart.pinId === toPinId)
    return false;
  const simState = toSimState(state);
  return canConnectPin(simState, toCompId, toPinId);
}
