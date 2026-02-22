/**
 * REFACTOR NOTES (4-layer architecture)
 * -------------------------------------
 * 1) Workbench/UI: This file (SimulatorModal). Toolbar, palette, right-side tabs (Sketch/SimJS/Warnings),
 *    fullscreen/sidebar toggles, demo load, Save/Load/MQTT footer. No circuit state; delegates to store.
 * 2) Scene Renderer: scene/CircuitScene.tsx — pure Konva Stage/Layer, GridBackground, components, wires.
 *    Receives circuit state + callbacks; no simulation, no state mutations.
 * 3) Interaction: interaction/useCircuitInteraction.ts — handlers only (stage click, component/wire/pin).
 *    Wires events to store actions; 10px snap and canConnectPin live in store / this hook.
 * 4) Simulation: sim/useSimulatorRuntime.ts — start/stop run loop (runLoop.ts); store provides getState/replaceSimState.
 * Circuit state lives in store/circuitStore.ts (useReducer). Selection is { type, id }; no per-item selected flags.
 * TODO: Remove CircuitCanvas when no longer referenced anywhere (currently unused).
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { makeESP32 } from './library/esp32';
import { makeLED } from './library/parts';
import { SimComponent } from './types';
import { nanoid } from 'nanoid';
import { useMQTT } from '@/hooks/useMQTT';
import { EnhancedComponentPalette } from './EnhancedComponentPalette';
import { useSimulatorMQTT } from './mqttBridge';
import { toast } from 'sonner';
import Editor from '@monaco-editor/react';
import { runSimScript, stopSimScript } from './scriptRuntime';
import { generateSketchFromState } from './sketchGenerator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, Info, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useCircuitStore, toSimState, getPrimarySelection, canCommitWire } from './store/circuitStore';
import { CircuitScene } from './scene/CircuitScene';
import { CircuitSchematicScene } from './scene/CircuitSchematicScene';
import { useCircuitInteraction, type CircuitInteractionApi } from './interaction/useCircuitInteraction';
import { findPin, getComponentsAndWiresInBox, getHitTarget, getNearestPin, getWirePoints, insertMidpointIntoWirePoints, nearestPointOnPolyline, orthogonalPath, snapToWireGrid } from './helpers';
import { Inspector } from './Inspector';
import { WireInspector } from './WireInspector';
import { getSwitchVariantId } from './registry';
import { getObstacles } from './routing/obstacles';
import { routeManhattan } from './routing/router';
import { makeJunction } from './library/junction';
import { computeNetState, explainCircuit, type DebugReport } from './engine';
import { pinKey, canonPinId, solveCircuit } from './engine2';
import { getEngine2SolveResult, setEngine2SolveResultRef } from './runLoop';
import { ensureAudioResumed } from './audio';
import type Konva from 'konva';
import { useSimulatorRuntime } from './sim/useSimulatorRuntime';
import { getRuntimeMode, setRuntimeMode, RuntimeMode } from './sim/runtimeMode';
import { subscribe } from './events/simEvents';
import { createLedBrightnessDemo, createMotorSpeedDemo, createRCLedFadeDemo, createRgbLedDemo } from './demos/voltageDemos';
import {
  saveCircuit,
  loadCircuits,
  loadCircuit,
  getLastCircuitFromStorage,
  setLastCircuitInStorage,
} from './supabase';
import { supabase } from '@/integrations/supabase/client';

const SIMULATOR_BETA_DISMISSED_KEY = 'saphari-simulator-beta-dismissed';
/** Snap threshold in screen px. Wire endpoint snaps to PinNode center when within this distance. */
const SNAP_RADIUS_PX = 16;

interface SimulatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialFullscreen?: boolean;
}

export const SimulatorModal = ({ open, onOpenChange, initialFullscreen = false }: SimulatorModalProps) => {
  const [simId] = useState(() => `sim-${nanoid(8)}`);
  const [tab, setTab] = useState<'sketch' | 'simjs' | 'warnings' | 'debug'>('sketch');
  const [debugLogToConsole, setDebugLogToConsole] = useState(false);
  const [simCode, setSimCode] = useState(`// Example Simulator JS
loop(() => {
  digitalWrite(13, HIGH);
  delay(500);
  digitalWrite(13, LOW);
  delay(500);
});`);
  const [isFullscreen, setIsFullscreen] = useState(initialFullscreen);
  const LEFT_PANEL_STORAGE_KEY = 'saphari.sidebar.leftWidth';
  const LEFT_PANEL_LEGACY_KEY = 'saphari-sim-leftPanelWidth';
  const LEFT_PANEL_COLLAPSED_KEY = 'saphari-sim-leftPanelCollapsed';
  const LEFT_PANEL_MIN = 260;
  const LEFT_PANEL_MAX = 520;
  const LEFT_PANEL_DEFAULT = 320;
  const RIGHT_PANEL_STORAGE_KEY = 'saphari.sidebar.rightWidth';
  const RIGHT_PANEL_MIN = 320;
  const RIGHT_PANEL_MAX = 720;
  const RIGHT_PANEL_DEFAULT = 384;
  const COLLAPSED_RAIL_PX = 40;
  const [leftPanelWidth, setLeftPanelWidth] = useState(() => {
    try {
      const w = parseInt(localStorage.getItem(LEFT_PANEL_STORAGE_KEY) ?? localStorage.getItem(LEFT_PANEL_LEGACY_KEY) ?? '', 10);
      if (Number.isFinite(w) && w >= LEFT_PANEL_MIN && w <= LEFT_PANEL_MAX) return w;
    } catch (_) {}
    return LEFT_PANEL_DEFAULT;
  });
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(() => {
    try {
      const v = localStorage.getItem(LEFT_PANEL_COLLAPSED_KEY);
      if (v !== null) return v !== 'true';
    } catch (_) {}
    return true;
  });
  const [resizingLeftPanel, setResizingLeftPanel] = useState(false);
  const resizeStartRef = useRef({ x: 0, w: 0 });
  const [rightPanelWidth, setRightPanelWidth] = useState(() => {
    try {
      const w = parseInt(localStorage.getItem(RIGHT_PANEL_STORAGE_KEY) ?? '', 10);
      if (Number.isFinite(w) && w >= RIGHT_PANEL_MIN && w <= RIGHT_PANEL_MAX) return w;
    } catch (_) {}
    return RIGHT_PANEL_DEFAULT;
  });
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [resizingRightPanel, setResizingRightPanel] = useState(false);
  const resizeRightStartRef = useRef({ x: 0, w: 0 });
  const [warnings, setWarnings] = useState<any[]>([]);
  const [showBetaNotice, setShowBetaNotice] = useState(() => {
    return localStorage.getItem(SIMULATOR_BETA_DISMISSED_KEY) !== 'true';
  });
  const [contextMenu, setContextMenu] = useState<{
    clientX: number;
    clientY: number;
    type: 'component' | 'wire';
    id: string;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<unknown>(null);
  const { publishMessage, connected } = useMQTT();

  const store = useCircuitStore();
  const { state, getState, replaceSimState, batchUpdateComponentProps, setRunning, addComponent, setWireColor, updateWireColor, deleteSelected, setCircuit, updateSelectedComponent, setScale, panBy, resetView, cancelWire, setTool, selectBox, clearSelection, addWire, deleteWire, beginWire, commitWire, updateWirePoints, setViewMode, toggleFlipX, rotate90, flipY, setVariant, resetWireRoute, batchUpdateWirePoints, insertJunctionAndSplitWire, undo, redo } = store;
  const primarySelection = getPrimarySelection(state);
  const { netStateResult, wireVoltages, wireConflicts, wireEnergized, wireStateById, wireFlowDirectionById, solveResult, unconnectedPinKeys } = useMemo(() => {
    const simState = toSimState(state);
    // When not running: run DC solve on circuit change so LED/voltmeter update without clicking Run
    // When running: use result from run loop (updated every tick)
    const eng2 = state.running
      ? getEngine2SolveResult()
      : (simState.components.length > 0 || simState.wires.length > 0 ? solveCircuit(simState) : getEngine2SolveResult());
    if (eng2) {
      const voltages: Record<string, number | undefined> = {};
      const conflicts: Record<string, boolean> = {};
      const energized: Record<string, boolean> = {};
      const wireStateById: Record<string, 'off' | 'feed' | 'current'> = {};
      const wireFlowDirectionById: Record<string, 1 | -1 | 0> = {};
      const pinToNet = new Map<string, string>(Object.entries(eng2.pinToNetId));
      const feedNetIds = eng2.feedNetIds ?? new Set<string>();
      const activeNetIds = eng2.activeNetIds ?? new Set<string>();
      const netPair = eng2.netPairToSignedCurrent ?? {};
      const I_MIN_VIS = 1e-6;
      for (const w of state.wires) {
        const keyFrom = pinKey(w.from.componentId, canonPinId(w.from.pinId));
        const keyTo = pinKey(w.to.componentId, canonPinId(w.to.pinId));
        const netFrom = pinToNet.get(keyFrom);
        const netTo = pinToNet.get(keyTo);
        const netId = netFrom ?? netTo;
        voltages[w.id] = netId != null ? eng2.netVoltagesById[netId] : undefined;
        conflicts[w.id] = false;
        const hasCurrent = netId != null && activeNetIds.has(netId);
        const hasFeed = netId != null && feedNetIds.has(netId);
        energized[w.id] = hasCurrent;
        wireStateById[w.id] = hasCurrent ? 'current' : hasFeed ? 'feed' : 'off';
        if (eng2.singular || !netFrom || !netTo) {
          wireFlowDirectionById[w.id] = 0;
        } else if (netFrom === netTo) {
          // Wire endpoints are on the same net (connected by this wire). No net-pair current;
          // use default forward so current-flow animation is visible when loop has current.
          wireFlowDirectionById[w.id] = hasCurrent ? 1 : 0;
        } else {
          let signedI = netPair[`${netFrom}:${netTo}`] ?? (netPair[`${netTo}:${netFrom}`] != null ? -netPair[`${netTo}:${netFrom}`]! : undefined);
          if (signedI === undefined) {
            const vFrom = eng2.netVoltagesById[netFrom];
            const vTo = eng2.netVoltagesById[netTo];
            if (vFrom != null && vTo != null) signedI = vFrom > vTo ? 1 : vTo > vFrom ? -1 : 0;
            else signedI = 0;
          }
          if (Math.abs(signedI) < I_MIN_VIS) wireFlowDirectionById[w.id] = 0;
          else wireFlowDirectionById[w.id] = signedI! > 0 ? 1 : -1;
        }
      }
      const netIds = [...new Set(Object.values(eng2.pinToNetId))];
      const nets = netIds.map((id) => ({
        id,
        pins: Object.entries(eng2.pinToNetId)
          .filter(([, nid]) => nid === id)
          .map(([pk]) => {
            const [compId, pinId] = pk.split(':');
            return { compId, pinId };
          }),
      }));
      const netStateCompat = {
        nets,
        pinToNetId: pinToNet,
        netVoltageById: eng2.netVoltagesById,
        netStatusById: {} as Record<string, string>,
        energizedNetIds: new Set<string>(),
      };
      // Single-pin nets = unconnected pins (pin's net contains only itself)
      const unconnected = new Set<string>(
        (eng2.nets ?? []).filter((n) => n.pins.length === 1).flatMap((n) => n.pins)
      );
      return {
        netStateResult: netStateCompat,
        wireVoltages: voltages,
        wireConflicts: conflicts,
        wireEnergized: energized,
        wireStateById,
        wireFlowDirectionById,
        solveResult: eng2,
        unconnectedPinKeys: unconnected,
      };
    }
    const netState = computeNetState(simState, state.components);
    const voltages: Record<string, number | undefined> = {};
    const conflicts: Record<string, boolean> = {};
    const energized: Record<string, boolean> = {};
    const wireFlowDirectionById: Record<string, 1 | -1 | 0> = {};
    for (const w of state.wires) {
      const netId = netState.pinToNetId.get(`${w.from.componentId}:${w.from.pinId}`);
      voltages[w.id] = netId != null ? netState.netVoltageById[netId] : undefined;
      const status = netId != null ? netState.netStatusById[netId] : undefined;
      conflicts[w.id] = status === 'CONFLICT' || status === 'SHORT';
      energized[w.id] = false;
      wireFlowDirectionById[w.id] = 0;
    }
    const wireStateById: Record<string, 'off' | 'feed' | 'current'> = {};
    for (const w of state.wires) wireStateById[w.id] = 'off';
    return {
      netStateResult: netState,
      wireVoltages: voltages,
      wireConflicts: conflicts,
      wireEnergized: energized,
      wireStateById,
      wireFlowDirectionById,
      solveResult: null,
      unconnectedPinKeys: new Set<string>(),
    };
  }, [state.components, state.wires, state.running]);

  useEffect(() => {
    if (!state.running) setEngine2SolveResultRef(solveResult);
  }, [solveResult, state.running]);

  // Apply DC solve outputs to component props so LED lights / voltmeter reads without clicking "Run Simulation"
  useEffect(() => {
    if (!solveResult || !state.components.length) return;
    const updates: { id: string; props: Record<string, unknown> }[] = [];
    for (const c of state.components) {
      const out = solveResult.outputsByComponentId[c.id];
      if (c.type === 'led' && out && 'on' in out) {
        const o = out as { on?: boolean; brightness?: number; status?: string; damageAccumTicks?: number };
        const next = {
          on: o.on,
          brightness: o.brightness,
          ledStatus: o.status,
          ledDamageAccumTicks: o.damageAccumTicks ?? 0,
          ledBurned: o.status === 'burned',
        };
        if (
          c.props?.on !== next.on ||
          c.props?.brightness !== next.brightness ||
          c.props?.ledStatus !== next.ledStatus
        ) {
          updates.push({ id: c.id, props: { ...c.props, ...next } });
        }
      }
      if ((c.type as string) === 'diode' && out && 'state' in out) {
        const o = out as { state?: string; vd?: number; id?: number };
        const next = { diodeState: o.state ?? 'OFF' };
        if (c.props?.diodeState !== next.diodeState) {
          updates.push({ id: c.id, props: { ...c.props, ...next } });
        }
      }
      if (c.type === 'voltmeter' && out && 'type' in out && (out as { type: string }).type === 'Voltmeter') {
        const o = out as {
          volts: number | null;
          connected: boolean;
          floating: boolean;
          netPlus: string | null;
          netMinus: string | null;
          vPlus: number | null;
          vMinus: number | null;
        };
        if (
          c.props?.voltmeterVolts !== o.volts ||
          c.props?.voltmeterConnected !== o.connected ||
          c.props?.voltmeterFloating !== o.floating ||
          c.props?.voltmeterNetPlus !== o.netPlus ||
          c.props?.voltmeterNetMinus !== o.netMinus ||
          c.props?.voltmeterVPlus !== o.vPlus ||
          c.props?.voltmeterVMinus !== o.vMinus
        ) {
          updates.push({
            id: c.id,
            props: {
              ...c.props,
              voltmeterVolts: o.volts,
              voltmeterConnected: o.connected,
              voltmeterFloating: o.floating,
              voltmeterNetPlus: o.netPlus,
              voltmeterNetMinus: o.netMinus,
              voltmeterVPlus: o.vPlus,
              voltmeterVMinus: o.vMinus,
            },
          });
        }
      }
      if ((c.type as string) === 'motor_dc' && out && 'spinning' in out) {
        const o = out as { spinning?: boolean; speed?: number; direction?: number };
        if (
          c.props?.spinning !== o.spinning ||
          c.props?.speed !== o.speed ||
          c.props?.direction !== o.direction
        ) {
          updates.push({ id: c.id, props: { ...c.props, spinning: o.spinning, speed: o.speed, direction: o.direction } });
        }
      }
      if ((c.type as string) === 'transistor' && out && 'region' in out) {
        const o = out as {
          region: 'cutoff' | 'active' | 'saturation' | 'floating';
          vb: number | null;
          vc: number | null;
          ve: number | null;
          vbe: number | null;
          vce: number | null;
          ib: number;
          ic: number;
        };
        const on = o.region === 'active' || o.region === 'saturation';
        if (
          c.props?.transistorRegion !== o.region ||
          c.props?.transistorOn !== on ||
          c.props?.vb !== o.vb ||
          c.props?.vc !== o.vc ||
          c.props?.ve !== o.ve ||
          c.props?.vbe !== o.vbe ||
          c.props?.vce !== o.vce ||
          c.props?.ib !== o.ib ||
          c.props?.ic !== o.ic
        ) {
          updates.push({
            id: c.id,
            props: {
              ...c.props,
              transistorRegion: o.region,
              transistorOn: on,
              vb: o.vb,
              vc: o.vc,
              ve: o.ve,
              vbe: o.vbe,
              vce: o.vce,
              ib: o.ib,
              ic: o.ic,
            },
          });
        }
      }
    }
    if (updates.length > 0) batchUpdateComponentProps(updates);
  }, [solveResult, state.components, batchUpdateComponentProps]);

  const debugReport = useMemo((): DebugReport => {
    const eng2 = getEngine2SolveResult();
    if (eng2?.debugReport) return eng2.debugReport as DebugReport;
    const simState = toSimState(state);
    return explainCircuit(simState, netStateResult);
  }, [state, netStateResult]);

  useEffect(() => {
    if (debugLogToConsole && open) {
      console.log('[Circuit Debug]', debugReport);
    }
  }, [debugLogToConsole, open, debugReport]);

  const { nets, netStatusById, inspectedNetId, highlightedWireIds } = useMemo(() => {
    const netState = netStateResult;
    const selWire =
      state.selectedWireIds.length === 1 ? state.wires.find((w) => w.id === state.selectedWireIds[0]) : null;
    const inspectedNetId = selWire
      ? (netState.pinToNetId.get?.(pinKey(selWire.from.componentId, selWire.from.pinId)) ??
        netState.pinToNetId.get?.(`${selWire.from.componentId}:${selWire.from.pinId}`) ??
        null)
      : null;
    const highlightedWireIds =
      inspectedNetId != null
        ? state.wires
            .filter((w) => {
              const net = netState.nets.find((n) => n.id === inspectedNetId);
              if (!net) return false;
              const fromKey = pinKey(w.from.componentId, w.from.pinId);
              const toKey = pinKey(w.to.componentId, w.to.pinId);
              const pinMatch = (p: { compId: string; pinId: string }, key: string) =>
                pinKey(p.compId, p.pinId) === key;
              const fromIn = net.pins.some((p) => pinMatch(p as { compId: string; pinId: string }, fromKey));
              const toIn = net.pins.some((p) => pinMatch(p as { compId: string; pinId: string }, toKey));
              return fromIn && toIn;
            })
            .map((w) => w.id)
        : [];
    return {
      nets: netState.nets,
      netStatusById: netState.netStatusById,
      inspectedNetId,
      highlightedWireIds,
    };
  }, [netStateResult, state.selectedWireIds, state.wires]);

  const ledDebugInfo = useMemo(() => {
    const sel = primarySelection.type === 'component' && primarySelection.id
      ? state.components.find((c) => c.id === primarySelection.id)
      : undefined;
    if (!sel || sel.type !== 'led') return null;
    const ns = netStateResult;
    const anodeNetId = ns.pinToNetId.get(`${sel.id}:anode`) ?? ns.pinToNetId.get(`${sel.id}:A`);
    const cathodeNetId = ns.pinToNetId.get(`${sel.id}:cathode`) ?? ns.pinToNetId.get(`${sel.id}:K`);
    const vA = anodeNetId != null ? ns.netVoltageById[anodeNetId] : undefined;
    const vK = cathodeNetId != null ? ns.netVoltageById[cathodeNetId] : undefined;
    const forwardBiased = vA !== undefined && vK !== undefined && (vA - vK) > 1.8;
    const sourceConnected = anodeNetId != null && (ns.energizedNetIds?.has(anodeNetId) ?? false);
    const cathodeNet = cathodeNetId != null ? ns.nets.find((n) => n.id === cathodeNetId) : undefined;
    const groundConnected = (cathodeNet?.voltage === 0 || cathodeNet?.sourceTypes?.has('gnd')) ?? false;
    return { vA, vK, forwardBiased, sourceConnected, groundConnected, on: !!sel.props?.on };
  }, [primarySelection, state.components, netStateResult]);

  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<{ x: number; y: number } | null>(null);
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  /** Pin key under cursor in wire mode (for tooltip + highlight). Only updates when value changes. */
  const [hoveredPinKey, setHoveredPinKey] = useState<string | null>(null);
  const hoveredPinKeyRef = useRef<string | null>(null);
  const layerRef = useRef<Konva.Layer | null>(null);
  const rubberBandLineRef = useRef<Konva.Line | null>(null);
  const pointerCircuitRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rafScheduledRef = useRef(false);
  const boxStartRef = useRef<{ x: number; y: number } | null>(null);
  const boxSelectRectRef = useRef<Konva.Rect | null>(null);
  const overlayLayerRef = useRef<Konva.Layer | null>(null);
  const pinRingRef = useRef<Konva.Circle | null>(null);
  const ghostDotRef = useRef<Konva.Circle | null>(null);
  /** Accumulated polyline corners while drawing a wire (between start anchor and current cursor). Cleared on commit/cancel or when starting a new wire. */
  const activeWirePointsRef = useRef<number[]>([]);
  const prevActiveWireStartRef = useRef<typeof state.activeWireStart>(null);
  /** When set, mousemove updates this potentiometer's alpha from cursor angle. */
  const potKnobDraggingRef = useRef<string | null>(null);

  const interactionApi: CircuitInteractionApi = useMemo(
    () => ({
      clearSelection: store.clearSelection,
      selectComponent: store.selectComponent,
      selectWire: store.selectWire,
      moveComponent: store.moveComponent,
      beginWire: store.beginWire,
      commitWire: store.commitWire,
      cancelWire: store.cancelWire,
      deleteComponent: store.deleteComponent,
      deleteWire: store.deleteWire,
    }),
    [
      store.clearSelection,
      store.selectComponent,
      store.selectWire,
      store.moveComponent,
      store.beginWire,
      store.commitWire,
      store.cancelWire,
      store.deleteComponent,
      store.deleteWire,
    ]
  );
  const handlers = useCircuitInteraction(state, interactionApi);

  const setStateForMQTT = useCallback(
    (updater: unknown) => {
      if (typeof updater === 'function') {
        const next = (updater as (prev: ReturnType<typeof toSimState>) => ReturnType<typeof toSimState>)(toSimState(getState()));
        replaceSimState({ components: next.components, wires: next.wires, running: next.running });
      } else {
        const next = updater as ReturnType<typeof toSimState>;
        replaceSimState({ components: next.components, wires: next.wires, running: next.running });
      }
    },
    [getState, replaceSimState]
  );
  useSimulatorMQTT(toSimState(state), setStateForMQTT, simId);

  useSimulatorRuntime({
    running: state.running,
    getState,
    replaceSimState,
    batchUpdateComponentProps,
    publishMessage,
    simId,
  });

  const dismissBetaNotice = () => {
    setShowBetaNotice(false);
    localStorage.setItem(SIMULATOR_BETA_DISMISSED_KEY, 'true');
  };

  const handleButtonPressChange = useCallback(
    (compId: string, actuated: boolean) => {
      const comp = state.components.find((c) => c.id === compId);
      if (!comp) return;
      if (
        (comp.type as string) === 'push_button'
        || (comp.type as string) === 'push_button_momentary'
        || (comp.type as string) === 'push_button_latch'
        || comp.type === 'button'
      ) {
        const mechanism = comp.props?.mechanism === 'latch' ? 'latch' : 'momentary';
        if (mechanism === 'latch') {
          store.updateComponentProps(compId, { latched: actuated });
        } else {
          store.updateComponentProps(compId, { pressed: actuated });
        }
        return;
      }
      store.updateComponentProps(compId, { pressed: actuated });
    },
    [store, state.components]
  );

  const handleSwitchToggle = useCallback(
    (compId: string) => {
      const comp = state.components.find((c) => c.id === compId);
      if (!comp) return;
      if (comp.type !== 'switch' && comp.type !== 'toggle-switch') return;
      const variantId = getSwitchVariantId(comp.variantId);
      if (variantId === 'SPDT' || variantId === 'DPDT') {
        const position = (comp.props?.position as string) === 'B' ? 'B' : 'A';
        store.updateComponentProps(compId, { position: position === 'A' ? 'B' : 'A' });
      } else {
        const nextOn = !comp.props?.on;
        store.updateComponentProps(compId, { on: nextOn });
      }
    },
    [store, state.components]
  );

  // Canvas starts blank — no default components; user adds from palette

  // Keyboard: Esc cancel wire or clear selection; Delete ONLY removes selection (Backspace does nothing). Ctrl/Cmd+A select all.
  // Must stop Propagation so Radix Dialog does not close the simulator on Escape when cancelling a wire
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || (target?.isContentEditable ?? false);
      if (inInput) return;

      if (e.key === 'Escape') {
        if (!open) return;
        // Never let Escape close the simulator; cancel tool or clear selection only.
        e.preventDefault();
        e.stopPropagation();
        if (state.activeWireStart) {
          cancelWire();
          return;
        }
        if (state.tool === 'wire' || state.tool === 'junction') {
          setTool('select');
          return;
        }
        if (state.tool === 'select') {
          clearSelection();
        }
        return;
      }
      if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (!open) return;
        const s = getState();
        const stageWidth = isFullscreen
          ? window.innerWidth - (leftSidebarOpen ? leftPanelWidth : COLLAPSED_RAIL_PX) - (rightSidebarOpen ? rightPanelWidth + 6 : 0)
          : 600;
        const stageHeight = isFullscreen ? window.innerHeight - 120 : window.innerHeight * 0.7;
        const { scale, offsetX, offsetY } = s.viewport;
        const minX = -offsetX / scale;
        const minY = -offsetY / scale;
        const maxX = (-offsetX + stageWidth) / scale;
        const maxY = (-offsetY + stageHeight) / scale;
        const { componentIds, wireIds } = getComponentsAndWiresInBox(
          toSimState(s),
          minX,
          minY,
          maxX,
          maxY
        );
        selectBox(componentIds, wireIds, false);
        return;
      }
      if (e.key === 'm' || e.key === 'M') {
        const target = e.target as HTMLElement;
        if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
        if (open && state.selectedComponentIds.length === 1) {
          const id = state.selectedComponentIds[0];
          const comp = state.components.find((c) => c.id === id);
          if (comp && ['dc_supply', 'led', 'switch', 'ground'].includes(comp.type)) {
            e.preventDefault();
            toggleFlipX(id);
          }
        }
        return;
      }
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        if (open) undo();
        return;
      }
      if ((e.key === 'y' && (e.ctrlKey || e.metaKey)) || (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) {
        e.preventDefault();
        if (open) redo();
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        return;
      }
      if (e.key === 'Enter' && open && state.activeWireStart) {
        e.preventDefault();
        cancelWire();
        return;
      }
      if ((e.key === '[' || e.key === ']') && open && state.selectedComponentIds.length === 1) {
        const comp = getState().components.find((c) => c.id === state.selectedComponentIds[0]);
        if (comp && (comp.type === 'potentiometer' || (comp.type as string) === 'potentiometer')) {
          e.preventDefault();
          const step = e.shiftKey ? 0.05 : 0.01;
          const alpha = Math.max(0, Math.min(1, (comp.props?.alpha ?? 0.5) + (e.key === ']' ? step : -step)));
          store.updateComponentProps(comp.id, { alpha });
          return;
        }
      }
      if (e.key === 'Delete') {
        e.preventDefault();
        if (open) deleteSelected();
        return;
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [
    open,
    state.tool,
    state.activeWireStart,
    state.selectedComponentIds,
    state.components,
    isFullscreen,
    leftSidebarOpen,
    rightSidebarOpen,
    getState,
    selectBox,
    clearSelection,
    deleteSelected,
    cancelWire,
    setTool,
    toggleFlipX,
    undo,
    redo,
  ]);

  useEffect(() => {
    try {
      localStorage.setItem(LEFT_PANEL_STORAGE_KEY, String(leftPanelWidth));
    } catch (_) {}
  }, [leftPanelWidth]);

  useEffect(() => {
    try {
      localStorage.setItem(LEFT_PANEL_COLLAPSED_KEY, leftSidebarOpen ? 'false' : 'true');
    } catch (_) {}
  }, [leftSidebarOpen]);

  useEffect(() => {
    try {
      localStorage.setItem(RIGHT_PANEL_STORAGE_KEY, String(rightPanelWidth));
    } catch (_) {}
  }, [rightPanelWidth]);

  useEffect(() => {
    if (!resizingLeftPanel && !resizingRightPanel) return;
    const onMove = (e: MouseEvent) => {
      if (resizingLeftPanel) {
        const dx = e.clientX - resizeStartRef.current.x;
        const next = Math.max(LEFT_PANEL_MIN, Math.min(LEFT_PANEL_MAX, resizeStartRef.current.w + dx));
        setLeftPanelWidth(next);
      }
      if (resizingRightPanel) {
        const dx = e.clientX - resizeRightStartRef.current.x;
        const next = Math.max(RIGHT_PANEL_MIN, Math.min(RIGHT_PANEL_MAX, resizeRightStartRef.current.w - dx));
        setRightPanelWidth(next);
      }
    };
    const onUp = () => {
      setResizingLeftPanel(false);
      setResizingRightPanel(false);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizingLeftPanel, resizingRightPanel]);

  useEffect(() => {
    return subscribe('SHORT_CIRCUIT', () => {
      toast.error('⚠️ Short circuit detected! Power and ground connected on same net.');
    });
  }, []);

  useEffect(() => {
    if (open) setWarnings([]);
  }, [open]);

  useEffect(() => {
    return subscribe('WARNING', (payload: { netId?: string; componentId?: string; code?: string; message?: string; severity?: string }) => {
      if (!payload?.message) return;
      const id = `${payload.netId ?? payload.componentId ?? 'global'}:${payload.code ?? 'warn'}`;
      setWarnings((prev) => {
        const same = (w: typeof prev[0]) => (payload.componentId ? w.componentId === payload.componentId : w.netId === payload.netId) && w.code === payload.code;
        if (prev.some((w) => same(w))) return prev;
        return [...prev, { ...payload, id, netId: payload.netId, componentId: payload.componentId, code: payload.code, message: payload.message, severity: payload.severity ?? 'error' }];
      });
    });
  }, []);

  // Track Space for space+drag pan
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpaceDown(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpaceDown(false);
        setIsPanning(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const handleStageWheel = useCallback(
    (e: { evt: WheelEvent; target: { getStage: () => { getPointerPosition: () => { x: number; y: number } } } }) => {
      e.evt.preventDefault();
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition();
      if (!pos) return;
      const delta = e.evt.deltaY > 0 ? -0.002 : 0.002;
      const nextScale = Math.max(0.2, Math.min(4, state.viewport.scale * (1 + delta * Math.abs(e.evt.deltaY))));
      setScale(nextScale, pos.x, pos.y);
    },
    [state.viewport.scale, setScale]
  );

  const handleStageMouseDown = useCallback(
    (e: { evt: MouseEvent; target: { getStage?: () => { getPointerPosition: () => { x: number; y: number } } } }) => {
      ensureAudioResumed();
      const stage = e.target?.getStage?.();
      if (!stage) return;
      const pos = stage.getPointerPosition?.();
      if (e.evt.button === 1 || (isSpaceDown && e.evt.button === 0)) {
        e.evt.preventDefault();
        setIsPanning(true);
        setLastPanPoint(pos ?? { x: 0, y: 0 });
        return;
      }
      if (state.tool === 'select' && e.evt.button === 0 && !isSpaceDown && e.target === stage && pos) {
        const { scale, offsetX, offsetY } = state.viewport;
        const circuitX = (pos.x - offsetX) / scale;
        const circuitY = (pos.y - offsetY) / scale;
        boxStartRef.current = { x: circuitX, y: circuitY };
        pointerCircuitRef.current = { x: circuitX, y: circuitY };
        if (boxSelectRectRef.current && layerRef.current) {
          boxSelectRectRef.current.visible(true);
          boxSelectRectRef.current.x(circuitX);
          boxSelectRectRef.current.y(circuitY);
          boxSelectRectRef.current.width(0);
          boxSelectRectRef.current.height(0);
          layerRef.current.batchDraw();
        }
      }
    },
    [isSpaceDown, state.tool, state.viewport]
  );

  const handleStageMouseMove = useCallback(
    (e: { evt: MouseEvent; target: { getStage: () => { getPointerPosition: () => { x: number; y: number } } } }) => {
      const pos = e.target.getStage()?.getPointerPosition();
      if (!pos) return;
      if (isPanning && lastPanPoint != null) {
        panBy(pos.x - lastPanPoint.x, pos.y - lastPanPoint.y);
        setLastPanPoint(pos);
        return;
      }
      const { scale, offsetX, offsetY } = state.viewport;
      const circuitX = (pos.x - offsetX) / scale;
      const circuitY = (pos.y - offsetY) / scale;
      if (boxStartRef.current && boxSelectRectRef.current && layerRef.current) {
        pointerCircuitRef.current = { x: circuitX, y: circuitY };
        const minX = Math.min(boxStartRef.current.x, circuitX);
        const minY = Math.min(boxStartRef.current.y, circuitY);
        const maxX = Math.max(boxStartRef.current.x, circuitX);
        const maxY = Math.max(boxStartRef.current.y, circuitY);
        boxSelectRectRef.current.x(minX);
        boxSelectRectRef.current.y(minY);
        boxSelectRectRef.current.width(maxX - minX);
        boxSelectRectRef.current.height(maxY - minY);
        layerRef.current.batchDraw();
        return;
      }
      if (state.tool === 'wire') {
        pointerCircuitRef.current = { x: circuitX, y: circuitY };
        if (!rafScheduledRef.current) {
          rafScheduledRef.current = true;
          requestAnimationFrame(() => {
            rafScheduledRef.current = false;
            const s = getState();
            const simState = toSimState(s);
            const { x, y } = pointerCircuitRef.current;
            if (potKnobDraggingRef.current) {
              const compId = potKnobDraggingRef.current;
              const comp = s.components.find((c) => c.id === compId);
              if (comp && (comp.type === 'potentiometer' || (comp.type as string) === 'pot')) {
                const knobCenterX = comp.x;
                const knobCenterY = comp.y - 8;
                const dx = x - knobCenterX;
                const dy = y - knobCenterY;
                const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
                const alpha = Math.max(0, Math.min(1, (angleDeg + 90) / 300));
                store.updateComponentProps(compId, { alpha });
              }
            }
            const thresholdCircuit = SNAP_RADIUS_PX / s.viewport.scale;
            const nearestPin = getNearestPin(simState, x, y, thresholdCircuit, s.viewMode);
            if (s.activeWireStart) {
              const fromPin = findPin(simState, s.activeWireStart.componentId, s.activeWireStart.pinId, s.viewMode);
              if (fromPin && rubberBandLineRef.current && layerRef.current) {
                const corners = activeWirePointsRef.current;
                const endX = nearestPin ? nearestPin.x : (Number.isFinite(x) ? x : 0);
                const endY = nearestPin ? nearestPin.y : (Number.isFinite(y) ? y : 0);
                const pts = corners.length === 0
                  ? orthogonalPath(fromPin.x, fromPin.y, endX, endY)
                  : [...[fromPin.x, fromPin.y], ...corners, endX, endY];
                const safePts = pts.map((v) => (Number.isFinite(v) ? v : 0));
                rubberBandLineRef.current.points(safePts);
                layerRef.current.batchDraw();
              }
            }
            const hit = getHitTarget(simState, x, y, thresholdCircuit, s.viewMode);
            const newHoveredKey = nearestPin ? `${nearestPin.compId}:${nearestPin.pinId}` : null;
            if (newHoveredKey !== hoveredPinKeyRef.current) {
              hoveredPinKeyRef.current = newHoveredKey;
              setHoveredPinKey(newHoveredKey);
            }
            if (pinRingRef.current) {
              if (nearestPin) {
                const rx = Number.isFinite(nearestPin.x) ? nearestPin.x : 0;
                const ry = Number.isFinite(nearestPin.y) ? nearestPin.y : 0;
                pinRingRef.current.position({ x: rx, y: ry });
                pinRingRef.current.visible(true);
                const invalid =
                  !!s.activeWireStart &&
                  !canCommitWire(s, nearestPin.compId, nearestPin.pinId);
                pinRingRef.current.stroke(invalid ? '#ef4444' : '#22c55e');
              } else {
                pinRingRef.current.visible(false);
              }
            }
            if (ghostDotRef.current) {
              if (!nearestPin && hit?.type === 'wire') {
                const gx = Number.isFinite(hit.x) ? hit.x : 0;
                const gy = Number.isFinite(hit.y) ? hit.y : 0;
                ghostDotRef.current.position({ x: gx, y: gy });
                ghostDotRef.current.visible(true);
              } else {
                ghostDotRef.current.visible(false);
              }
            }
            overlayLayerRef.current?.batchDraw();
            if (s.tool === 'wire') {
              if (
                s.activeWireStart &&
                nearestPin &&
                !canCommitWire(s, nearestPin.compId, nearestPin.pinId)
              ) {
                document.body.style.cursor = 'not-allowed';
              } else if (nearestPin || hit?.type === 'wire') {
                document.body.style.cursor = 'crosshair';
              } else {
                document.body.style.cursor = '';
              }
            }
          });
        }
      }
    },
    [isPanning, lastPanPoint, panBy, state.tool, state.activeWireStart, state.viewport, getState]
  );

  const handleWireSegmentClick = useCallback(
    (wireId: string, circuitX: number, circuitY: number, segmentIndex?: number) => {
      const s = getState();
      const wire = s.wires.find((w) => w.id === wireId);
      if (!wire) return;
      const simState = toSimState(s);
      const points = getWirePoints(simState, wire, s.viewMode);
      if (points.length < 4) return;
      const thresholdCircuit = SNAP_RADIUS_PX / s.viewport.scale;
      const nearest = nearestPointOnPolyline(points, circuitX, circuitY);
      const segIdx = segmentIndex ?? (nearest.dist <= thresholdCircuit ? nearest.segmentIndex : -1);
      if (segIdx < 0) return;
      const snap = (v: number) => Math.round(v / 10) * 10;
      const newPoints = insertMidpointIntoWirePoints(points, segIdx, snap(circuitX), snap(circuitY));
      updateWirePoints(wireId, newPoints, s.viewMode);
    },
    [getState, updateWirePoints]
  );

  const handleStageMouseUp = useCallback(
    (e?: { evt: MouseEvent }) => {
      potKnobDraggingRef.current = null;
      const s = getState();
      const { x, y } = pointerCircuitRef.current;
      const simState = toSimState(s);
      const thresholdCircuit = SNAP_RADIUS_PX / s.viewport.scale;
      const hit = getHitTarget(simState, x, y, thresholdCircuit, s.viewMode);

      if (s.tool === 'junction' && !boxStartRef.current) {
        if (hit?.type === 'wire') {
          const junctionId = insertJunctionAndSplitWire(hit.wireId, hit.x, hit.y, hit.segmentIndex, s.viewMode);
          if (import.meta.env.DEV && typeof console !== 'undefined') {
            console.log('[Simulator] Junction created by wire tap:', junctionId);
          }
        } else if (!hit) {
          const jx = x - 8;
          const jy = y - 8;
          addComponent(makeJunction(jx, jy));
          if (import.meta.env.DEV && typeof console !== 'undefined') {
            console.log('[Simulator] Junction placed at canvas:', jx, jy);
          }
        }
        setIsPanning(false);
        setLastPanPoint(null);
        return;
      }

      if (s.tool === 'wire' && hit?.type === 'wire') {
        const junctionId = insertJunctionAndSplitWire(hit.wireId, hit.x, hit.y, hit.segmentIndex, s.viewMode);
        if (s.activeWireStart) {
          const fromPin = findPin(simState, s.activeWireStart.componentId, s.activeWireStart.pinId, s.viewMode);
          const corners = activeWirePointsRef.current;
          const points = fromPin
            ? (corners.length === 0 ? orthogonalPath(fromPin.x, fromPin.y, hit.x, hit.y) : [fromPin.x, fromPin.y, ...corners, hit.x, hit.y])
            : undefined;
          commitWire(junctionId, 'J', points);
          activeWirePointsRef.current = [];
        } else {
          beginWire(junctionId, 'J');
        }
        setIsPanning(false);
        setLastPanPoint(null);
        return;
      }

      if (s.activeWireStart && s.tool === 'wire') {
        if (hit?.type === 'pin') {
          if (!canCommitWire(s, hit.compId, hit.pinId)) {
            setIsPanning(false);
            setLastPanPoint(null);
            return;
          }
          const fromPin = findPin(simState, s.activeWireStart.componentId, s.activeWireStart.pinId, s.viewMode);
          const toPin = findPin(simState, hit.compId, hit.pinId, s.viewMode);
          const corners = activeWirePointsRef.current;
          const points = fromPin && toPin
            ? (corners.length === 0 ? orthogonalPath(fromPin.x, fromPin.y, toPin.x, toPin.y) : [fromPin.x, fromPin.y, ...corners, toPin.x, toPin.y])
            : undefined;
          commitWire(hit.compId, hit.pinId, points);
          activeWirePointsRef.current = [];
        } else if (e?.evt?.detail === 2) {
          cancelWire();
          activeWirePointsRef.current = [];
        } else if (!hit) {
          const snap = (v: number) => snapToWireGrid(v);
          activeWirePointsRef.current.push(snap(x), snap(y));
        } else {
          cancelWire();
          activeWirePointsRef.current = [];
        }
        setIsPanning(false);
        setLastPanPoint(null);
        return;
      }
      if (boxStartRef.current) {
        const minX = Math.min(boxStartRef.current.x, x);
        const minY = Math.min(boxStartRef.current.y, y);
        const maxX = Math.max(boxStartRef.current.x, x);
        const maxY = Math.max(boxStartRef.current.y, y);
        const { componentIds, wireIds } = getComponentsAndWiresInBox(toSimState(s), minX, minY, maxX, maxY);
        selectBox(componentIds, wireIds, e?.evt.shiftKey ?? false);
        boxStartRef.current = null;
        if (boxSelectRectRef.current && layerRef.current) {
          boxSelectRectRef.current.visible(false);
          layerRef.current.batchDraw();
        }
      }
      setIsPanning(false);
      setLastPanPoint(null);
    },
    [getState, selectBox, cancelWire, handleWireSegmentClick, handlers, insertJunctionAndSplitWire, commitWire, beginWire]
  );

  const handleStageMouseLeave = useCallback(() => {
    setIsPanning(false);
    setLastPanPoint(null);
    hoveredPinKeyRef.current = null;
    setHoveredPinKey(null);
    if (pinRingRef.current) pinRingRef.current.visible(false);
    if (ghostDotRef.current) ghostDotRef.current.visible(false);
    overlayLayerRef.current?.batchDraw();
    document.body.style.cursor = '';
  }, []);

  const handleStageContextMenu = useCallback(
    (e: { evt: MouseEvent; target: { getStage: () => { getPointerPosition: () => { x: number; y: number } | null } } }) => {
      e.evt.preventDefault();
      const s = getState();
      const stage = e.target.getStage();
      const pos = stage.getPointerPosition();
      if (!pos) return;
      const circuitX = (pos.x - s.viewport.offsetX) / s.viewport.scale;
      const circuitY = (pos.y - s.viewport.offsetY) / s.viewport.scale;
      const threshold = SNAP_RADIUS_PX / s.viewport.scale;
      const hit = getHitTarget(toSimState(s), circuitX, circuitY, threshold, s.viewMode);
      if (hit?.type === 'pin') {
        setContextMenu({ clientX: e.evt.clientX, clientY: e.evt.clientY, type: 'component', id: hit.compId });
      } else if (hit?.type === 'wire') {
        setContextMenu({ clientX: e.evt.clientX, clientY: e.evt.clientY, type: 'wire', id: hit.wireId });
      } else {
        setContextMenu(null);
      }
    },
    [getState]
  );

  const getSpawnPosition = useCallback(() => {
    const s = getState();
    const stageW = isFullscreen ? window.innerWidth - (leftSidebarOpen ? leftPanelWidth : COLLAPSED_RAIL_PX) - (rightSidebarOpen ? rightPanelWidth + 6 : 0) : 600;
    const stageH = isFullscreen ? window.innerHeight - 120 : window.innerHeight * 0.7;
    const { scale, offsetX, offsetY } = s.viewport;
    const centerX = (-offsetX + stageW / 2) / scale;
    const centerY = (-offsetY + stageH / 2) / scale;
    const jitter = 24;
    return {
      x: centerX + (Math.random() - 0.5) * jitter,
      y: centerY + (Math.random() - 0.5) * jitter,
    };
  }, [getState, isFullscreen, leftSidebarOpen, leftPanelWidth, rightSidebarOpen, rightPanelWidth]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = (ev: MouseEvent) => {
      if (contextMenuRef.current && ev.target instanceof Node && !contextMenuRef.current.contains(ev.target)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', close, true);
    return () => document.removeEventListener('mousedown', close, true);
  }, [contextMenu]);

  useEffect(() => {
    if (state.activeWireStart && !prevActiveWireStartRef.current) {
      activeWirePointsRef.current = [];
    }
    prevActiveWireStartRef.current = state.activeWireStart;
  }, [state.activeWireStart]);

  useEffect(() => {
    if (state.tool !== 'wire' || !state.activeWireStart) {
      if (pinRingRef.current) pinRingRef.current.visible(false);
      if (ghostDotRef.current) ghostDotRef.current.visible(false);
      overlayLayerRef.current?.batchDraw();
      if (!state.activeWireStart) document.body.style.cursor = '';
    }
  }, [state.tool, state.activeWireStart]);

  const saveCircuitToSupabase = async () => {
    const name = prompt('Enter circuit name:');
    if (!name?.trim()) return;
    const simState = toSimState(state);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        await saveCircuit(name.trim(), simState, user.id);
        setLastCircuitInStorage(name.trim(), simState);
        toast.success(`Circuit "${name}" saved.`);
      } else {
        setLastCircuitInStorage(name.trim(), simState);
        toast.success('Saved to this device (not logged in).');
      }
    } catch (err) {
      setLastCircuitInStorage(name.trim(), simState);
      toast.success('Saved to this device (cloud failed).');
    }
  };

  const loadCircuitFromSupabase = async () => {
    try {
      const circuits = await loadCircuits();
      if (circuits.length === 0) {
        const last = getLastCircuitFromStorage();
        if (last) {
          if (confirm('No cloud circuits. Load last saved on this device?')) {
            setCircuit({ components: last.json.components, wires: last.json.wires });
            if (last.json.wires?.[0]?.color) setWireColor(last.json.wires[0].color);
            toast.success('Loaded last circuit from this device.');
          }
        } else {
          toast.info('No saved circuits found.');
        }
        return;
      }
      const list = circuits.map((c, i) => `${i + 1}. ${c.name}`).join('\n');
      const choice = prompt(`Select circuit (1–${circuits.length}):\n${list}`);
      const idx = parseInt(choice ?? '', 10);
      if (Number.isNaN(idx) || idx < 1 || idx > circuits.length) return;
      const selected = circuits[idx - 1];
      const full = await loadCircuit(selected.id);
      if (!full) {
        toast.error('Circuit not found.');
        return;
      }
      setCircuit({ components: full.json.components, wires: full.json.wires });
      if (full.json.wires?.[0]?.color) setWireColor(full.json.wires[0].color);
      toast.success(`Loaded "${full.name}".`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Load failed: ${msg}`);
      const last = getLastCircuitFromStorage();
      if (last && confirm('Load last circuit from this device instead?')) {
        setCircuit({ components: last.json.components, wires: last.json.wires });
        if (last.json.wires?.[0]?.color) setWireColor(last.json.wires[0].color);
        toast.success('Loaded last circuit from this device.');
      }
    }
  };

  const loadLastFromDevice = () => {
    const last = getLastCircuitFromStorage();
    if (!last) {
      toast.info('No circuit saved on this device.');
      return;
    }
    setCircuit({ components: last.json.components, wires: last.json.wires });
    if (last.json.wires?.[0]?.color) setWireColor(last.json.wires[0].color);
    toast.success('Loaded last circuit from this device.');
  };

  // Connect to MQTT
  const connectMQTT = () => {
    if (connected) {
      console.log(`Simulator ${simId} connected to MQTT`);
      // Publish initial status
      publishMessage(`saphari/${simId}/status/online`, '1', true);
    } else {
      console.log('Connecting to MQTT...');
      // MQTT connection logic would go here
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={isFullscreen ? "max-w-none w-screen h-screen p-0 overflow-hidden flex flex-col" : "max-w-[1100px] h-[80vh] p-0 overflow-hidden flex flex-col"}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="shrink-0 px-4 py-2 border-b flex items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            ESP32 Circuit Simulator
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className="ml-2 bg-primary/10 text-primary border-primary/30 text-xs font-medium px-2 py-0.5 cursor-help"
                  >
                    BETA
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>This feature is under active development.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="secondary"
              onClick={() => {
                // Load tactile switch test circuit
                const tactSwitchTestCircuit = {
                  components: [
                    {
                      id: 'esp32-test',
                      type: 'esp32' as const,
                      x: 100,
                      y: 100,
                      rotation: 0,
                      props: {},
                      pins: [
                        { id: '3v3', label: '3V3', kind: 'power' as const, x: 0, y: 0 },
                        { id: 'gnd', label: 'GND', kind: 'ground' as const, x: 0, y: 10 },
                        { id: 'gpio2', label: 'GPIO2', kind: 'digital' as const, gpio: 2, x: 20, y: 0 },
                        { id: 'gpio15', label: 'GPIO15', kind: 'digital' as const, gpio: 15, x: 20, y: 10 },
                      ]
                    },
                    {
                      id: 'tact-switch-test',
                      type: 'button' as const,
                      x: 200,
                      y: 100,
                      rotation: 0,
                      props: { 
                        bounceMs: 10, 
                        contactResistance: 0.08, 
                        orientation: 0,
                        label: 'TACT-SW'
                      },
                      pins: [
                        { id: 'A1', label: 'A1', kind: 'digital' as const, x: 0, y: 0 },
                        { id: 'A2', label: 'A2', kind: 'digital' as const, x: 10, y: 0 },
                        { id: 'B1', label: 'B1', kind: 'digital' as const, x: 0, y: 10 },
                        { id: 'B2', label: 'B2', kind: 'digital' as const, x: 10, y: 10 },
                      ]
                    },
                    {
                      id: 'led-test',
                      type: 'led' as const,
                      x: 300,
                      y: 100,
                      rotation: 0,
                      props: { color: 'red', forwardVoltage: 1.8 },
                      pins: [
                        { id: 'anode', label: '+', kind: 'digital' as const, x: 0, y: 0 },
                        { id: 'cathode', label: '-', kind: 'digital' as const, x: 10, y: 0 }
                      ]
                    }
                  ],
                  wires: [
                    // A-side to GND (either A1 or A2)
                    {
                      id: 'wire-switch-a1-gnd',
                      from: { componentId: 'tact-switch-test', pinId: 'A1' },
                      to: { componentId: 'esp32-test', pinId: 'gnd' },
                      color: 'black'
                    },
                    // B-side to GPIO15 (either B1 or B2)
                    {
                      id: 'wire-switch-b1-gpio',
                      from: { componentId: 'tact-switch-test', pinId: 'B1' },
                      to: { componentId: 'esp32-test', pinId: 'gpio15' },
                      color: 'blue'
                    },
                    // LED connections
                    {
                      id: 'wire-led-anode',
                      from: { componentId: 'esp32-test', pinId: 'gpio2' },
                      to: { componentId: 'led-test', pinId: 'anode' },
                      color: 'red'
                    },
                    {
                      id: 'wire-led-cathode',
                      from: { componentId: 'led-test', pinId: 'cathode' },
                      to: { componentId: 'esp32-test', pinId: 'gnd' },
                      color: 'black'
                    }
                  ]
                };
                
                setCircuit({
                  components: tactSwitchTestCircuit.components,
                  wires: tactSwitchTestCircuit.wires,
                });
                
                // Load the test sketch
                setSimCode(`// Tactile Switch Test Sketch
// Demonstrates proper 4-leg switch wiring and net bridging

const BUTTON_PIN = 15;  // GPIO15 - connect to button B1 or B2
const LED_PIN = 2;      // GPIO2 - built-in LED

void setup() {
  // Configure button pin with internal pull-up
  // Connect A1/A2 to GND, B1/B2 to GPIO15
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  
  // Configure LED pin
  pinMode(LED_PIN, OUTPUT);
  
  // Optional: attach interrupt for immediate response
  attachInterrupt(BUTTON_PIN, buttonInterrupt, CHANGE);
  
  Serial.begin(115200);
  Serial.println("Tactile Switch Test Started");
  Serial.println("Press the 4-leg switch to toggle LED");
  Serial.println("A1/A2 are internally shorted");
  Serial.println("B1/B2 are internally shorted");
  Serial.println("Pressing bridges A-side to B-side");
}

void loop() {
  // Read button state (LOW when pressed due to pull-up)
  int buttonState = digitalRead(BUTTON_PIN);
  
  // Invert logic: button pressed = LOW, so we invert for LED
  digitalWrite(LED_PIN, buttonState ? LOW : HIGH);
  
  // Optional: print button state
  if (buttonState == LOW) {
    Serial.println("Switch PRESSED - A-side bridged to B-side");
  }
  
  delay(10); // Small delay for stability
}

// Interrupt handler for immediate response
void buttonInterrupt() {
  int buttonState = digitalRead(BUTTON_PIN);
  digitalWrite(LED_PIN, buttonState ? LOW : HIGH);
  
  if (buttonState == LOW) {
    Serial.println("Switch interrupt: PRESSED - Net bridge active");
  } else {
    Serial.println("Switch interrupt: RELEASED - Net bridge removed");
  }
}`);
                
                toast.success('4-Leg Tactile Switch Test loaded! Click the switch to test net bridging.');
              }}
            >
              🔘 Tact Switch
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
            >
              {leftSidebarOpen ? 'Hide Parts' : 'Show Parts'}
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
            >
              {rightSidebarOpen ? 'Hide Code' : 'Show Code'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => resetView()}>
              Reset view
            </Button>
            <Button
              size="sm"
              variant={state.viewMode === 'workbench' ? 'secondary' : 'outline'}
              onClick={() => setViewMode('workbench')}
            >
              Workbench
            </Button>
            <Button
              size="sm"
              variant={state.viewMode === 'schematic' ? 'secondary' : 'outline'}
              onClick={() => setViewMode('schematic')}
            >
              Schematic
            </Button>
            <Button
              size="sm"
              variant={state.tool === 'select' ? 'secondary' : 'outline'}
              onClick={() => setTool('select')}
            >
              Select
            </Button>
            <Button
              size="sm"
              variant={state.tool === 'wire' ? 'secondary' : 'outline'}
              onClick={() => setTool('wire')}
            >
              Wire
            </Button>
            <Button
              size="sm"
              variant={state.tool === 'junction' ? 'secondary' : 'outline'}
              onClick={() => setTool('junction')}
              title="Place junction on canvas or tap a wire to split"
            >
              Junction
            </Button>
            {import.meta.env.DEV && (
              <>
                <Button
                  size="sm"
                  variant={getRuntimeMode() === RuntimeMode.UI_LOOP ? 'secondary' : 'outline'}
                  onClick={() => {
                    setRuntimeMode(RuntimeMode.UI_LOOP);
                    if (state.running) {
                      setRunning(false);
                      setTimeout(() => setRunning(true), 0);
                    }
                  }}
                >
                  UI Loop
                </Button>
                <Button
                  size="sm"
                  variant={getRuntimeMode() === RuntimeMode.WORKER ? 'secondary' : 'outline'}
                  onClick={() => {
                    setRuntimeMode(RuntimeMode.WORKER);
                    if (state.running) {
                      setRunning(false);
                      setTimeout(() => setRunning(true), 0);
                    }
                  }}
                >
                  Worker
                </Button>
              </>
            )}
          </div>
        </DialogHeader>
        
        {/* Beta Notice - shown once per user */}
        {showBetaNotice && (
          <Alert className="shrink-0 mx-4 mt-2 mb-0 border-primary/30 bg-primary/5">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="flex items-center justify-between flex-1">
              <span className="text-sm">
                The ESP32 Circuit Simulator is currently in beta and actively being improved. Some features may be limited or change.
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-4 h-6 px-2 text-muted-foreground hover:text-foreground"
                onClick={dismissBetaNotice}
              >
                <X className="h-4 w-4 mr-1" />
                Got it
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left panel: resizable, collapsible, visible */}
          <div
            className="flex shrink-0 flex-col border-r border-border bg-card shadow-sm relative"
            style={{
              width: leftSidebarOpen ? leftPanelWidth : COLLAPSED_RAIL_PX,
              minWidth: leftSidebarOpen ? leftPanelWidth : COLLAPSED_RAIL_PX,
            }}
          >
            {leftSidebarOpen ? (
              <>
                <div className="flex items-center justify-between px-2 py-1.5 border-b border-border bg-muted/30 shrink-0">
                  <span className="text-sm font-medium text-foreground">Parts</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setLeftSidebarOpen(false)}
                    title="Hide Parts"
                    aria-label="Hide Parts panel"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden min-w-0">
                  <EnhancedComponentPalette
                    onAddComponent={addComponent}
                    getSpawnPosition={getSpawnPosition}
                    wireColor={state.wireColor}
                    onWireColorChange={(color) => {
                      setWireColor(color);
                      getState().selectedWireIds.forEach((id) => updateWireColor(id, color));
                    }}
                    onRunToggle={() => {
                      ensureAudioResumed();
                      setRunning(!state.running);
                    }}
                    running={state.running}
                    selectedComponent={
                      primarySelection.type === 'component' && primarySelection.id
                        ? state.components.find((c) => c.id === primarySelection.id)
                        : undefined
                    }
                    onUpdateComponent={updateSelectedComponent}
                    ledDebugInfo={ledDebugInfo}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center py-2 h-full justify-start">
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => setLeftSidebarOpen(true)}
                  title="Show Parts"
                  aria-label="Show Parts panel"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>

          {/* Left resize handle: between Parts and Canvas */}
          {leftSidebarOpen && (
            <div
              className="shrink-0 w-1.5 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors border-r border-border"
              onMouseDown={(e) => {
                e.preventDefault();
                resizeStartRef.current = { x: e.clientX, w: leftPanelWidth };
                setResizingLeftPanel(true);
              }}
              title="Drag to resize Parts panel"
              aria-label="Resize Parts panel"
            />
          )}

          {/* Canvas: Scene Renderer layer — min-w-0 so flex doesn't overflow */}
          <div className="flex-1 relative min-h-0 min-w-0">
            {state.components.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <p className="text-muted-foreground/70 text-sm">Add a component to begin</p>
              </div>
            )}
            {state.viewMode === 'workbench' ? (
              <CircuitScene
                state={state}
                width={isFullscreen ? window.innerWidth - (leftSidebarOpen ? leftPanelWidth : COLLAPSED_RAIL_PX) - (rightSidebarOpen ? rightPanelWidth + 6 : 0) : 600}
                height={isFullscreen ? window.innerHeight - 120 : window.innerHeight * 0.7}
                onStageClick={handlers.onStageClick}
                onComponentSelect={handlers.onComponentSelect}
                onComponentDelete={handlers.onComponentDelete}
                onComponentDragEnd={handlers.onComponentDragEnd}
                onPinClick={handlers.onPinClick}
                onPinPointerDown={handlers.onPinPointerDown}
                onPinPointerUp={handlers.onPinPointerUp}
                onWireSelect={handlers.onWireSelect}
                onWireDelete={handlers.onWireDelete}
                onWireSegmentClick={state.tool === 'wire' ? handleWireSegmentClick : undefined}
                onWireInsertMidpoint={state.tool === 'select' ? (wireId, segIdx, x, y) => handleWireSegmentClick(wireId, x, y, segIdx) : undefined}
                onWirePointsChange={(wireId, points) => updateWirePoints(wireId, points, state.viewMode)}
                highlightedWireIds={highlightedWireIds}
                wireVoltages={wireVoltages}
                wireConflicts={wireConflicts}
                wireEnergized={wireEnergized}
                wireStateById={wireStateById}
                wireFlowDirectionById={wireFlowDirectionById}
                onButtonPressChange={handleButtonPressChange}
                onSwitchToggle={handleSwitchToggle}
                onPotKnobDragStart={(id) => { potKnobDraggingRef.current = id; }}
                viewMode="workbench"
                stageRef={stageRef}
                layerRef={layerRef}
                rubberBandLineRef={rubberBandLineRef}
                boxSelectRectRef={boxSelectRectRef}
                overlayLayerRef={overlayLayerRef}
                pinRingRef={pinRingRef}
                ghostDotRef={ghostDotRef}
                onWheel={handleStageWheel}
                onMouseDown={handleStageMouseDown}
                onMouseMove={handleStageMouseMove}
                onMouseUp={handleStageMouseUp}
                onMouseLeave={handleStageMouseLeave}
                onContextMenu={handleStageContextMenu}
                pinToNetId={netStateResult.pinToNetId}
                netVoltageById={netStateResult.netVoltageById}
                unconnectedPinKeys={unconnectedPinKeys}
                hoveredPinKey={hoveredPinKey}
                outputsByComponentId={solveResult?.outputsByComponentId}
              />
            ) : (
              <CircuitSchematicScene
                state={state}
                width={isFullscreen ? window.innerWidth - (leftSidebarOpen ? leftPanelWidth : COLLAPSED_RAIL_PX) - (rightSidebarOpen ? rightPanelWidth + 6 : 0) : 600}
                height={isFullscreen ? window.innerHeight - 120 : window.innerHeight * 0.7}
                onStageClick={handlers.onStageClick}
                onComponentSelect={handlers.onComponentSelect}
                onComponentDelete={handlers.onComponentDelete}
                onComponentDragEnd={handlers.onComponentDragEnd}
                onPinClick={handlers.onPinClick}
                onPinPointerDown={handlers.onPinPointerDown}
                onPinPointerUp={handlers.onPinPointerUp}
                onWireSelect={handlers.onWireSelect}
                onWireDelete={handlers.onWireDelete}
                onWireSegmentClick={state.tool === 'wire' ? handleWireSegmentClick : undefined}
                highlightedWireIds={highlightedWireIds}
                wireVoltages={wireVoltages}
                wireConflicts={wireConflicts}
                wireEnergized={wireEnergized}
                wireStateById={wireStateById}
                wireFlowDirectionById={wireFlowDirectionById}
                onButtonPressChange={handleButtonPressChange}
                onSwitchToggle={handleSwitchToggle}
                stageRef={stageRef}
                layerRef={layerRef}
                rubberBandLineRef={rubberBandLineRef}
                boxSelectRectRef={boxSelectRectRef}
                overlayLayerRef={overlayLayerRef}
                pinRingRef={pinRingRef}
                ghostDotRef={ghostDotRef}
                onWheel={handleStageWheel}
                onMouseDown={handleStageMouseDown}
                onMouseMove={handleStageMouseMove}
                onMouseUp={handleStageMouseUp}
                onMouseLeave={handleStageMouseLeave}
                onContextMenu={handleStageContextMenu}
                pinToNetId={netStateResult.pinToNetId}
                netVoltageById={netStateResult.netVoltageById}
                unconnectedPinKeys={unconnectedPinKeys}
                hoveredPinKey={hoveredPinKey}
              />
            )}
            {/* Right-click context menu */}
            {contextMenu && (
              <div
                ref={contextMenuRef}
                className="fixed z-50 min-w-[120px] rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-md"
                style={{ left: contextMenu.clientX, top: contextMenu.clientY }}
              >
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={() => {
                    if (contextMenu.type === 'component') {
                      handlers.onComponentDelete(contextMenu.id);
                    } else {
                      handlers.onWireDelete(contextMenu.id);
                    }
                    setContextMenu(null);
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>

          {/* Right resize handle: between Canvas and Inspector */}
          {rightSidebarOpen && (
            <div
              className="shrink-0 w-1.5 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors border-l border-border"
              onMouseDown={(e) => {
                e.preventDefault();
                resizeRightStartRef.current = { x: e.clientX, w: rightPanelWidth };
                setResizingRightPanel(true);
              }}
              title="Drag to resize Inspector panel"
              aria-label="Resize Inspector panel"
            />
          )}

          {/* Right Coding Panel */}
          {rightSidebarOpen && (
            <div
              className="shrink-0 flex flex-col h-full border-l border-border bg-card overflow-hidden"
              style={{ width: rightPanelWidth, minWidth: RIGHT_PANEL_MIN, maxWidth: RIGHT_PANEL_MAX }}
            >
              {/* Selection Inspector: component or wire */}
              {primarySelection.type === 'component' && (() => {
                const selectedComponent = state.components.find((c) => c.id === primarySelection.id);
                if (!selectedComponent) return null;
                return (
                  <div className="p-3 border-b bg-background">
                    <Inspector
                      selectedComponent={selectedComponent}
                      onUpdateComponent={updateSelectedComponent}
                      onRotate90={rotate90}
                      onFlipX={toggleFlipX}
                      onFlipY={flipY}
                      onSetVariant={setVariant}
                      solveResult={solveResult}
                    />
                  </div>
                );
              })()}
              {primarySelection.type === 'wire' && (() => {
                const selectedWire = state.wires.find((w) => w.id === primarySelection.id);
                if (!selectedWire) return null;
                return (
                  <div className="p-3 border-b bg-background">
                    <WireInspector
                      wire={selectedWire}
                      onDelete={deleteWire}
                      onResetRoute={resetWireRoute}
                    />
                  </div>
                );
              })()}
              {/* Net Inspector: shown when a wire is selected (inspected net) */}
              {inspectedNetId && (() => {
                const net = nets.find((n) => n.id === inspectedNetId);
                if (!net) return null;
                const sources = new Set<string>();
                for (const p of net.pins) {
                  const comp = state.components.find((c) => c.id === p.compId);
                  const pinDef = comp?.pins.find((x) => x.id === p.pinId);
                  if (pinDef?.kind === 'ground') sources.add('GND');
                  else if (pinDef?.kind === 'power') {
                    if (pinDef.label === 'VIN' || pinDef.id === 'vin') sources.add('VIN');
                    else sources.add('3V3');
                  } else if (pinDef && 'gpio' in pinDef && pinDef.gpio !== undefined) sources.add('GPIO');
                }
                const netWarnings = warnings.filter((w: { netId?: string }) => w.netId === inspectedNetId);
                const status = netStatusById[inspectedNetId];
                return (
                  <div className="p-3 border-b bg-muted/20 text-sm">
                    <h3 className="font-medium mb-2">Net</h3>
                    <p className="text-xs text-muted-foreground">ID: {net.id}</p>
                    {status && status !== 'OK' && (
                      <p className="text-xs mt-1 font-medium text-amber-600 dark:text-amber-400">Status: {status}</p>
                    )}
                    <p className="text-xs mt-1">
                      Voltage: {net.voltage != null ? `${net.voltage} V` : '—'}
                    </p>
                    {sources.size > 0 && (
                      <p className="text-xs mt-1">
                        Sources: {Array.from(sources).sort().join(', ')}
                      </p>
                    )}
                    <p className="text-xs mt-2 font-medium">Connected pins</p>
                    <ul className="text-xs list-disc list-inside mt-1 space-y-0.5">
                      {net.pins.map((p) => {
                        const comp = state.components.find((c) => c.id === p.compId);
                        const pinDef = comp?.pins.find((x) => x.id === p.pinId);
                        const label = pinDef?.label || p.pinId;
                        const name = comp?.name || comp?.type || p.compId;
                        return (
                          <li key={`${p.compId}:${p.pinId}`}>
                            {name} ({label})
                          </li>
                        );
                      })}
                    </ul>
                    {netWarnings.length > 0 && (
                      <>
                        <p className="text-xs mt-2 font-medium text-amber-600 dark:text-amber-400">Warnings</p>
                        <ul className="text-xs list-disc list-inside mt-1 space-y-0.5 text-amber-700 dark:text-amber-300">
                          {netWarnings.map((w: { id?: string; code?: string; message?: string }) => (
                            <li key={w.id ?? w.code}>
                              {w.code}: {w.message}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                );
              })()}
              {/* Fixed Tab Header */}
              <div className="flex border-b bg-muted/30">
                <button 
                  className={`px-3 py-2 text-sm flex-1 ${tab === 'sketch' ? 'bg-muted border-b-2 border-primary' : ''}`} 
                  onClick={() => setTab('sketch')}
                >
                  Sketch
                </button>
                <button 
                  className={`px-3 py-2 text-sm flex-1 ${tab === 'simjs' ? 'bg-muted border-b-2 border-primary' : ''}`} 
                  onClick={() => setTab('simjs')}
                >
                  Simulator JS
                </button>
                <button 
                  className={`px-3 py-2 text-sm flex-1 relative ${tab === 'warnings' ? 'bg-muted border-b-2 border-primary' : ''}`} 
                  onClick={() => setTab('warnings')}
                >
                  Warnings
                  {warnings.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {warnings.length}
                    </span>
                  )}
                </button>
                <button 
                  className={`px-3 py-2 text-sm flex-1 ${tab === 'debug' ? 'bg-muted border-b-2 border-primary' : ''}`} 
                  onClick={() => setTab('debug')}
                >
                  Debug
                </button>
              </div>
              
              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 hover:scrollbar-thumb-gray-500">
                {tab === 'sketch' ? (
                  <div className="p-3">
                    <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">{generateSketchFromState(toSimState(state))}</pre>
                  </div>
                ) : tab === 'simjs' ? (
                  <div className="h-full flex flex-col">
                    <div className="flex-1">
                      <Editor
                        height="100%"
                        defaultLanguage="javascript"
                        value={simCode}
                        onChange={(v) => setSimCode(v ?? '')}
                        options={{ 
                          minimap: { enabled: false }, 
                          fontSize: 12,
                          scrollBeyondLastLine: false,
                          automaticLayout: true
                        }}
                      />
                    </div>
                    <div className="p-2 border-t bg-muted/30">
                      <Button size="sm" onClick={() => runSimScript(simCode)}>Run Script</Button>
                      <Button size="sm" variant="outline" className="ml-2" onClick={stopSimScript}>Stop</Button>
                    </div>
                  </div>
                ) : tab === 'debug' ? (
                  <div className="p-3 space-y-4 text-sm">
                    <div className="flex flex-wrap gap-2 items-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const simState = toSimState(state);
                          const viewMode = state.viewMode;
                          const updates: { id: string; points: number[] }[] = [];
                          for (const w of state.wires) {
                            const from = findPin(simState, w.from.componentId, w.from.pinId, viewMode);
                            const to = findPin(simState, w.to.componentId, w.to.pinId, viewMode);
                            if (!from || !to) continue;
                            const exclude = new Set([w.from.componentId, w.to.componentId]);
                            const obs = getObstacles(simState, viewMode, exclude);
                            const points = routeManhattan(from, to, obs);
                            if (points.length >= 4) updates.push({ id: w.id, points });
                          }
                          batchUpdateWirePoints(updates);
                        }}
                      >
                        Auto-route all wires
                      </Button>
                      <span className="text-xs text-muted-foreground">Manhattan routing, avoid components</span>
                    </div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={debugLogToConsole}
                        onChange={(e) => setDebugLogToConsole(e.target.checked)}
                      />
                      <span>Log report to console each update</span>
                    </label>
                    {debugReport.battery && (
                      <div className="rounded border p-2 bg-muted/20">
                        <h4 className="font-medium mb-1">Battery</h4>
                        <p className="text-xs">id: {debugReport.battery.id}, voltage: {debugReport.battery.voltage}V</p>
                        <p className="text-xs">net P: {debugReport.battery.netP ?? '—'}, net N: {debugReport.battery.netN ?? '—'}</p>
                        <p className="text-xs">vP: {debugReport.battery.vP ?? '—'}, vN: {debugReport.battery.vN ?? '—'}</p>
                        {debugReport.battery.reasonIfNot && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{debugReport.battery.reasonIfNot}</p>
                        )}
                      </div>
                    )}
                    {debugReport.switch && (
                      <div className="rounded border p-2 bg-muted/20">
                        <h4 className="font-medium mb-1">Switch</h4>
                        <p className="text-xs">id: {debugReport.switch.id}, on: {String(debugReport.switch.on)}</p>
                        {(debugReport.switch as { pin1Net?: string }).pin1Net != null ? (
                          <p className="text-xs">pin1Net: {(debugReport.switch as { pin1Net: string }).pin1Net}, pin2Net: {(debugReport.switch as { pin2Net: string }).pin2Net}</p>
                        ) : (debugReport.switch as { va?: number }).va != null ? (
                          <p className="text-xs">Va: {(debugReport.switch as { va: number }).va?.toFixed(2)}V, Vb: {(debugReport.switch as { vb: number }).vb?.toFixed(2)}V</p>
                        ) : null}
                        {(debugReport.switch as { conducts?: boolean }).conducts != null && (
                          <p className="text-xs">conducts: {String((debugReport.switch as { conducts: boolean }).conducts)}</p>
                        )}
                        {debugReport.switch.reasonIfNot && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{debugReport.switch.reasonIfNot}</p>
                        )}
                      </div>
                    )}
                    {debugReport.led && (
                      <div className="rounded border p-2 bg-muted/20">
                        <h4 className="font-medium mb-1">LED</h4>
                        <p className="text-xs">id: {debugReport.led.id}</p>
                        <p className="text-xs">netA: {debugReport.led.netA ?? '—'}, netK: {debugReport.led.netK ?? '—'}</p>
                        <p className="text-xs">vA: {debugReport.led.vA ?? '—'}, vK: {debugReport.led.vK ?? '—'}</p>
                        <p className="text-xs">forwardBiased: {String(debugReport.led.forwardBiased)}</p>
                        {(debugReport.led as { hasReturnPath?: boolean }).hasReturnPath != null && (
                          <p className="text-xs">hasReturnPath: {String((debugReport.led as { hasReturnPath: boolean }).hasReturnPath)}, hasFeedPath: {String((debugReport.led as { hasFeedPath?: boolean }).hasFeedPath)}</p>
                        )}
                        {(debugReport.led as { current?: number; brightness?: number }).current != null && (
                          <p className="text-xs">current: {(debugReport.led as { current: number }).current.toFixed(4)}A, brightness: {(debugReport.led as { brightness?: number }).brightness ?? '—'}</p>
                        )}
                        <p className="text-xs">Vdrop: {debugReport.led.voltageDrop != null ? `${debugReport.led.voltageDrop.toFixed(2)} V` : '—'}, P: {debugReport.led.power != null ? `${debugReport.led.power.toFixed(3)} W` : '—'}</p>
                        {debugReport.led.reasonIfNot && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{debugReport.led.reasonIfNot}</p>
                        )}
                      </div>
                    )}
                    {debugReport.motor != null && (
                      <div className="rounded border p-2 bg-muted/20">
                        <h4 className="font-medium mb-1">Motor (engine2)</h4>
                        <p className="text-xs">id: {debugReport.motor.id}</p>
                        <p className="text-xs">V: {debugReport.motor.v != null ? debugReport.motor.v.toFixed(2) : '—'}V, I: {debugReport.motor.current != null ? debugReport.motor.current.toFixed(4) : '—'}A</p>
                        <p className="text-xs">spinning: {String(debugReport.motor.spinning)}, speed: {debugReport.motor.speed != null ? debugReport.motor.speed.toFixed(2) : '—'}, direction: {debugReport.motor.direction ?? '—'}</p>
                        {debugReport.motor.reasonIfNot && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{debugReport.motor.reasonIfNot}</p>
                        )}
                      </div>
                    )}
                    {debugReport.diode != null && (
                      <div className="rounded border p-2 bg-muted/20">
                        <h4 className="font-medium mb-1">Diode</h4>
                        <p className="text-xs">id: {debugReport.diode.id}</p>
                        <p className="text-xs">netA: {debugReport.diode.netA ?? '—'}, netK: {debugReport.diode.netK ?? '—'}</p>
                        <p className="text-xs">vA: {debugReport.diode.vA != null ? debugReport.diode.vA.toFixed(2) : '—'}, vK: {debugReport.diode.vK != null ? debugReport.diode.vK.toFixed(2) : '—'}</p>
                        <p className="text-xs">Vd: {debugReport.diode.vd != null ? `${debugReport.diode.vd.toFixed(3)} V` : '—'}, state: {debugReport.diode.state ?? '—'}, Id: {debugReport.diode.current != null ? `${(debugReport.diode.current * 1000).toFixed(2)} mA` : '—'}</p>
                        {debugReport.diode.reasonIfNot && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{debugReport.diode.reasonIfNot}</p>
                        )}
                      </div>
                    )}
                    {debugReport.battery && (debugReport as { battery?: { sourceCurrent?: number } }).battery?.sourceCurrent != null && (
                      <p className="text-xs">Battery source current: {(debugReport as { battery: { sourceCurrent: number } }).battery.sourceCurrent.toFixed(4)}A</p>
                    )}
                    {debugReport.gnd && (
                      <div className="rounded border p-2 bg-muted/20">
                        <h4 className="font-medium mb-1">GND</h4>
                        <p className="text-xs">netIds: {debugReport.gnd.netIds?.length ? debugReport.gnd.netIds.join(', ') : '—'}</p>
                      </div>
                    )}
                    <div className="rounded border p-2 bg-muted/20">
                      <h4 className="font-medium mb-1">Energized / Loop</h4>
                      <p className="text-xs">loopClosed: {String(debugReport.energized.loopClosed)}</p>
                      {debugReport.energized.netIds != null && <p className="text-xs">energized nets: {debugReport.energized.netIds.length}</p>}
                      {debugReport.energized.reasonIfNot && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">Why loop not closed: {debugReport.energized.reasonIfNot}</p>
                      )}
                    </div>
                    {(debugReport.singular || debugReport.reason) && (
                      <div className="rounded border border-amber-300 p-2 bg-amber-50 dark:bg-amber-950/30">
                        <h4 className="font-medium mb-1">Solver</h4>
                        <p className="text-xs">singular: {String(debugReport.singular)}</p>
                        {debugReport.reason && <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">{debugReport.reason}</p>}
                      </div>
                    )}
                    {debugReport.warnings && debugReport.warnings.length > 0 && (
                      <div className="rounded border border-amber-300 p-2 bg-amber-50 dark:bg-amber-950/30">
                        <h4 className="font-medium mb-1 text-amber-800 dark:text-amber-200">Warnings</h4>
                        <ul className="text-xs list-disc list-inside space-y-0.5">
                          {debugReport.warnings.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3">
                    {warnings.length > 0 ? (
                      <ul className="space-y-2 text-sm">
                        {warnings.map((w) => (
                          <li key={w.id} className="flex flex-col gap-0.5 rounded border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50 p-2">
                            <span className="font-medium text-amber-800 dark:text-amber-200">{w.code ?? 'Warning'}</span>
                            <span className="text-muted-foreground">{w.message}</span>
                            {w.netId && <span className="text-xs text-muted-foreground">Net: {w.netId}</span>}
                            {w.componentId && <span className="text-xs text-muted-foreground">Component: {w.componentId}</span>}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <h3 className="font-medium mb-2">Enhanced Warnings Panel</h3>
                        <p className="text-sm">
                          Real-time circuit warnings and safety checks will appear here.
                        </p>
                        <p className="text-xs mt-2">
                          Features: Short circuit detection, brownout warnings, floating inputs, component protection
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer: reserved space so canvas never overlaps it */}
        <div className="shrink-0 border-t p-3 flex items-center justify-between bg-muted/10 relative z-10">
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={saveCircuitToSupabase}>Save</Button>
            <Button size="sm" variant="outline" onClick={loadCircuitFromSupabase}>Load</Button>
            <Button size="sm" variant="outline" onClick={loadLastFromDevice}>Load last (local)</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  Demos <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={() => {
                    const { components, wires } = createLedBrightnessDemo();
                    setCircuit({ components, wires });
                    toast.success('Loaded LED brightness demo. Adjust supply voltage to see current and brightness.');
                  }}
                >
                  LED brightness demo
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const { components, wires } = createMotorSpeedDemo();
                    setCircuit({ components, wires });
                    toast.success('Loaded motor speed demo. Adjust supply voltage to see current and speed.');
                  }}
                >
                  Motor speed demo
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const { components, wires } = createRCLedFadeDemo();
                    setCircuit({ components, wires });
                    toast.success('Loaded RC + LED fade demo. Charge cap, then close switch to discharge through LED.');
                  }}
                >
                  RC + LED fade demo
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const { components, wires } = createRgbLedDemo();
                    setCircuit({ components, wires });
                    toast.success('Loaded RGB LED demo. All three channels driven from supply via 330Ω; COM to GND.');
                  }}
                >
                  RGB LED demo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="outline" onClick={connectMQTT}>
              Connect to MQTT
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            {state.components.length} components, {state.wires.length} wires
            <div className="text-xs mt-1 text-blue-500">
              🚀 Enhanced Features Ready
            </div>
            {state.selectedComponentIds.length > 0 && (
              <div className="text-xs mt-1 text-blue-500">
                {state.selectedComponentIds.length} component(s) selected - Press Delete to remove
              </div>
            )}
            {state.selectedWireIds.length > 0 && (
              <div className="text-xs mt-1 text-red-500">
                {state.selectedWireIds.length} wire(s) selected - Press Delete to remove
              </div>
            )}
            {state.running && (
              <div className="text-xs mt-1">
                Simulator ID: {simId}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};