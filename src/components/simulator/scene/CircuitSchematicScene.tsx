/**
 * Schematic View: Multisim-style scene with schematic symbols, orthogonal wires, junction dots.
 * Same Stage/Layer/viewport structure as CircuitScene; refs and handlers shared with modal.
 */

import React from 'react';
import { Stage, Layer, Group, Circle, Rect, Line, Text } from 'react-konva';
import type Konva from 'konva';
import { GridBackground } from '../GridBackground';
import { findPin, getWirePoints } from '../helpers';
import { getFootprint } from '../visual/footprints';
import { pinKey } from '../engine2';
import { safePoint } from '../utils/coords';
import type { CircuitState } from '../store/circuitStore';
import type { SimComponent, Wire } from '../types';
import { SchematicToggleSwitchRenderer } from '../visual/SchematicToggleSwitchRenderer';
import { SchematicGroundRenderer } from '../visual/SchematicGroundRenderer';
import { SchematicDCSupplyRenderer } from '../visual/SchematicDCSupplyRenderer';
import { SchematicResistorRenderer } from '../visual/SchematicResistorRenderer';
import { SchematicPotentiometerRenderer } from '../visual/SchematicPotentiometerRenderer';
import { SchematicTransistorRenderer } from '../visual/SchematicTransistorRenderer';
import { SchematicLEDRenderer } from '../visual/SchematicLEDRenderer';
import { SchematicDiodeRenderer } from '../visual/SchematicDiodeRenderer';
import { SchematicRgbLedRenderer } from '../visual/SchematicRgbLedRenderer';
import { SchematicVoltmeterRenderer } from '../visual/SchematicVoltmeterRenderer';
import { SchematicButtonRenderer } from '../visual/SchematicButtonRenderer';
import { SchematicMotorDCRenderer } from '../visual/SchematicMotorDCRenderer';
import { SchematicMotorACRenderer } from '../visual/SchematicMotorACRenderer';
import { SchematicBuzzerRenderer } from '../visual/SchematicBuzzerRenderer';
import { SchematicCapacitorRenderer } from '../visual/SchematicCapacitorRenderer';
import { SchematicCapacitorPolarizedRenderer } from '../visual/SchematicCapacitorPolarizedRenderer';
import { SchematicInductorRenderer } from '../visual/SchematicInductorRenderer';
import { PinNode } from '../visual/PinNode';
import { SelectionOverlayLayer } from './SelectionOverlayLayer';

/** Component types that render as the SPST toggle switch symbol in schematic mode. */
const TOGGLE_SWITCH_SCHEMATIC_TYPES: string[] = ['switch', 'toggle-switch'];

const GRID_EXTENT = 2000;
const SCHEMATIC_GRID = 10;

function snapToGrid(v: number): number {
  return Math.round(v / SCHEMATIC_GRID) * SCHEMATIC_GRID;
}

export interface CircuitSchematicSceneProps {
  state: CircuitState;
  width: number;
  height: number;
  onStageClick: (shift?: boolean) => void;
  onComponentSelect: (id: string, shift?: boolean) => void;
  onComponentDelete: (id: string) => void;
  onComponentDragEnd: (id: string, x: number, y: number) => void;
  onPinClick: (compId: string, pinId: string, shift?: boolean) => void;
  onPinPointerDown?: (compId: string, pinId: string) => void;
  onPinPointerUp?: (compId: string, pinId: string) => void;
  onWireSelect: (id: string, shift?: boolean) => void;
  onWireDelete: (id: string) => void;
  onWireSegmentClick?: (wireId: string, circuitX: number, circuitY: number) => void;
  highlightedWireIds?: string[];
  wireVoltages?: Record<string, number | undefined>;
  wireConflicts?: Record<string, boolean>;
  wireEnergized?: Record<string, boolean>;
  wireStateById?: Record<string, 'off' | 'feed' | 'current'>;
  /** Wire id -> 1 | -1 | 0 for solver-driven flow direction (schematic may use for future animation). */
  wireFlowDirectionById?: Record<string, 1 | -1 | 0>;
  onButtonPressChange?: (compId: string, pressed: boolean) => void;
  onSwitchToggle?: (compId: string) => void;
  stageRef?: React.RefObject<unknown>;
  layerRef?: React.RefObject<Konva.Layer | null>;
  rubberBandLineRef?: React.RefObject<Konva.Line | null>;
  boxSelectRectRef?: React.RefObject<Konva.Rect | null>;
  overlayLayerRef?: React.RefObject<Konva.Layer | null>;
  pinRingRef?: React.RefObject<Konva.Circle | null>;
  ghostDotRef?: React.RefObject<Konva.Circle | null>;
  onWheel?: (e: { evt: WheelEvent; target: { getStage: () => { getPointerPosition: () => { x: number; y: number } } } }) => void;
  onMouseDown?: (e: { evt: MouseEvent }) => void;
  onMouseMove?: (e: { evt: MouseEvent; target: { getStage: () => { getPointerPosition: () => { x: number; y: number } } } }) => void;
  onMouseUp?: (e: { evt: MouseEvent }) => void;
  onMouseLeave?: (e: { evt: MouseEvent }) => void;
  onContextMenu?: (e: { evt: MouseEvent; target: { getStage: () => { getPointerPosition: () => { x: number; y: number } | null } } }) => void;
  /** Net state for voltage-based LED on (forward bias). */
  pinToNetId?: Map<string, string> | Record<string, string>;
  netVoltageById?: Record<string, number> | Map<string, number>;
  /** Pin keys (compId:pinId) whose net has only that pin — show unconnected-pin warning dot. */
  unconnectedPinKeys?: Set<string>;
  /** When in wire mode: pin key of the pin under cursor (for glow + tooltip). */
  hoveredPinKey?: string | null;
}

const GridLayer = React.memo(
  function SchematicGridLayer({ viewport }: { viewport: { scale: number; offsetX: number; offsetY: number } }) {
    return (
      <Layer listening={false}>
        <Group
          x={viewport.offsetX}
          y={viewport.offsetY}
          scaleX={viewport.scale}
          scaleY={viewport.scale}
        >
          <GridBackground
            width={GRID_EXTENT * 2}
            height={GRID_EXTENT * 2}
            gridSize={20}
            color="#374151"
            minX={-GRID_EXTENT}
            maxX={GRID_EXTENT}
            minY={-GRID_EXTENT}
            maxY={GRID_EXTENT}
          />
        </Group>
      </Layer>
    );
  },
  (prev, next) =>
    prev.viewport.scale === next.viewport.scale &&
    prev.viewport.offsetX === next.viewport.offsetX &&
    prev.viewport.offsetY === next.viewport.offsetY
);

// --- Schematic symbols (pins drawn at findPin positions; Group at comp.x, comp.y) ---

function SchematicDCSource({
  comp,
  simState,
  isSelected,
  onSelect,
  onDelete,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
}: {
  comp: SimComponent;
  simState: { components: SimComponent[]; wires: Wire[] };
  isSelected: boolean;
  onSelect: (id: string, shift?: boolean) => void;
  onDelete: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onPinClick: (compId: string, pinId: string, shift?: boolean) => void;
  onPinPointerDown?: (compId: string, pinId: string) => void;
  onPinPointerUp?: (compId: string, pinId: string) => void;
}) {
  const kind = (comp.props?.kind as string) ?? '3v3';
  const label = kind === 'gnd' ? 'GND' : kind === 'vin' ? 'VIN' : '3V3';
  const pinPos = findPin(simState, comp.id, 'out');
  if (!pinPos) return null;
  const lx = pinPos.x - comp.x;
  const ly = pinPos.y - comp.y;
  return (
    <Group x={comp.x} y={comp.y} draggable onDragEnd={(e) => onDragEnd(comp.id, e.target.x(), e.target.y())} onClick={(e) => onSelect(comp.id, e.evt.shiftKey)}>
      <Rect width={24} height={12} x={-12} y={-6} fill="none" stroke={isSelected ? '#60a5fa' : '#94a3b8'} strokeWidth={1.5} strokeScaleEnabled={false} />
      <Line points={[-8, -6, -8, 6]} stroke="#94a3b8" strokeWidth={2} strokeScaleEnabled={false} listening={false} />
      <Line points={[4, -2, 4, 2]} stroke="#94a3b8" strokeWidth={2} strokeScaleEnabled={false} listening={false} />
      <Text x={-10} y={-14} text={label} fontSize={10} fill="#e2e8f0" listening={false} />
      <PinNode x={lx} y={ly} pinId="out" compId={comp.id} kind={kind === 'gnd' ? 'ground' : 'power'} radius={5} onClick={onPinClick} onTap={onPinClick} onPointerDown={onPinPointerDown} onPointerUp={onPinPointerUp} />
    </Group>
  );
}

function SchematicGround({
  comp,
  simState,
  isSelected,
  onSelect,
  onDelete,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
}: {
  comp: SimComponent;
  simState: { components: SimComponent[]; wires: Wire[] };
  isSelected: boolean;
  onSelect: (id: string, shift?: boolean) => void;
  onDelete: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onPinClick: (compId: string, pinId: string, shift?: boolean) => void;
  onPinPointerDown?: (compId: string, pinId: string) => void;
  onPinPointerUp?: (compId: string, pinId: string) => void;
}) {
  const pinId = comp.pins[0]?.id ?? 'out';
  const pinPos = findPin(simState, comp.id, pinId);
  if (!pinPos) return null;
  const lx = pinPos.x - comp.x;
  const ly = pinPos.y - comp.y;
  return (
    <Group x={comp.x} y={comp.y} draggable onDragEnd={(e) => onDragEnd(comp.id, e.target.x(), e.target.y())} onClick={(e) => onSelect(comp.id, e.evt.shiftKey)}>
      <Line points={[0, -12, 0, 0]} stroke="#64748b" strokeWidth={2} strokeScaleEnabled={false} listening={false} />
      <Line points={[-8, 0, 8, 0]} stroke="#64748b" strokeWidth={2} strokeScaleEnabled={false} listening={false} />
      <Line points={[-5, 4, 5, 4]} stroke="#64748b" strokeWidth={2} strokeScaleEnabled={false} listening={false} />
      <Line points={[-2, 8, 2, 8]} stroke="#64748b" strokeWidth={2} strokeScaleEnabled={false} listening={false} />
      <PinNode x={lx} y={ly} pinId={pinId} compId={comp.id} kind="ground" radius={5} onClick={onPinClick} onTap={onPinClick} onPointerDown={onPinPointerDown} onPointerUp={onPinPointerUp} />
    </Group>
  );
}

function SchematicSPST({
  comp,
  simState,
  isSelected,
  onSelect,
  onDelete,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
  onPressChange,
}: {
  comp: SimComponent;
  simState: { components: SimComponent[]; wires: Wire[] };
  isSelected: boolean;
  onSelect: (id: string, shift?: boolean) => void;
  onDelete: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onPinClick: (compId: string, pinId: string, shift?: boolean) => void;
  onPinPointerDown?: (compId: string, pinId: string) => void;
  onPinPointerUp?: (compId: string, pinId: string) => void;
  onPressChange?: (compId: string, pressed: boolean) => void;
}) {
  const closed = !!comp.props?.pressed;
  const pa = findPin(simState, comp.id, 'a');
  const pb = findPin(simState, comp.id, 'b');
  if (!pa || !pb) return null;
  const ax = pa.x - comp.x, ay = pa.y - comp.y;
  const bx = pb.x - comp.x, by = pb.y - comp.y;
  const midX = (ax + bx) / 2, midY = (ay + by) / 2;
  return (
    <Group x={comp.x} y={comp.y} draggable onDragEnd={(e) => onDragEnd(comp.id, e.target.x(), e.target.y())} onClick={(e) => onSelect(comp.id, e.evt.shiftKey)}>
      <Line points={[ax, ay, midX, midY]} stroke="#94a3b8" strokeWidth={2} strokeScaleEnabled={false} listening={false} />
      {!closed && <Line points={[midX, midY, bx, by]} stroke="#94a3b8" strokeWidth={2} strokeScaleEnabled={false} listening={false} dash={[4, 2]} />}
      {closed && <Line points={[midX, midY, bx, by]} stroke="#94a3b8" strokeWidth={2} strokeScaleEnabled={false} listening={false} />}
      <PinNode x={ax} y={ay} pinId="a" compId={comp.id} radius={5} onClick={onPinClick} onTap={onPinClick} onPointerDown={onPinPointerDown} onPointerUp={onPinPointerUp} />
      <PinNode x={bx} y={by} pinId="b" compId={comp.id} radius={5} onClick={onPinClick} onTap={onPinClick} onPointerDown={onPinPointerDown} onPointerUp={onPinPointerUp} />
    </Group>
  );
}

function SchematicResistor({
  comp,
  simState,
  isSelected,
  onSelect,
  onDelete,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
}: {
  comp: SimComponent;
  simState: { components: SimComponent[]; wires: Wire[] };
  isSelected: boolean;
  onSelect: (id: string, shift?: boolean) => void;
  onDelete: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onPinClick: (compId: string, pinId: string, shift?: boolean) => void;
  onPinPointerDown?: (compId: string, pinId: string) => void;
  onPinPointerUp?: (compId: string, pinId: string) => void;
}) {
  const pa = findPin(simState, comp.id, comp.pins[0]?.id ?? 'a');
  const pb = findPin(simState, comp.id, comp.pins[1]?.id ?? 'b');
  if (!pa || !pb) return null;
  const ax = pa.x - comp.x, ay = pa.y - comp.y;
  const bx = pb.x - comp.x, by = pb.y - comp.y;
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const perpX = -uy, perpY = ux;
  const zig: number[] = [];
  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = ax + dx * t + perpX * (i % 2 === 0 ? 4 : -4);
    const y = ay + dy * t + perpY * (i % 2 === 0 ? 4 : -4);
    zig.push(x, y);
  }
  return (
    <Group x={comp.x} y={comp.y} draggable onDragEnd={(e) => onDragEnd(comp.id, e.target.x(), e.target.y())} onClick={(e) => onSelect(comp.id, e.evt.shiftKey)}>
      <Line points={zig} stroke="#cbd5e1" strokeWidth={1.5} strokeScaleEnabled={false} listening={false} />
      <PinNode x={ax} y={ay} pinId={comp.pins[0]?.id ?? 'a'} compId={comp.id} radius={5} onClick={onPinClick} onTap={onPinClick} onPointerDown={onPinPointerDown} onPointerUp={onPinPointerUp} />
      <PinNode x={bx} y={by} pinId={comp.pins[1]?.id ?? 'b'} compId={comp.id} radius={5} onClick={onPinClick} onTap={onPinClick} onPointerDown={onPinPointerDown} onPointerUp={onPinPointerUp} />
    </Group>
  );
}

function SchematicLED({
  comp,
  simState,
  isSelected,
  onSelect,
  onDelete,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
}: {
  comp: SimComponent;
  simState: { components: SimComponent[]; wires: Wire[] };
  isSelected: boolean;
  onSelect: (id: string, shift?: boolean) => void;
  onDelete: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onPinClick: (compId: string, pinId: string, shift?: boolean) => void;
  onPinPointerDown?: (compId: string, pinId: string) => void;
  onPinPointerUp?: (compId: string, pinId: string) => void;
}) {
  const anode = findPin(simState, comp.id, 'anode');
  const cathode = findPin(simState, comp.id, 'cathode');
  if (!anode || !cathode) return null;
  const ax = anode.x - comp.x, ay = anode.y - comp.y;
  const cx = cathode.x - comp.x, cy = cathode.y - comp.y;
  const mx = (ax + cx) / 2, my = (ay + cy) / 2;
  const color = (comp.props?.color as string) ?? 'red';
  const on = !!comp.props?.on;
  return (
    <Group x={comp.x} y={comp.y} draggable onDragEnd={(e) => onDragEnd(comp.id, e.target.x(), e.target.y())} onClick={(e) => onSelect(comp.id, e.evt.shiftKey)}>
      <Line points={[ax, ay, mx - 8, my]} stroke="#94a3b8" strokeWidth={1.5} strokeScaleEnabled={false} listening={false} />
      <Line points={[mx + 8, my, cx, cy]} stroke="#94a3b8" strokeWidth={1.5} strokeScaleEnabled={false} listening={false} />
      <Line points={[mx - 6, my - 6, mx + 6, my + 6]} stroke={on ? color : '#64748b'} strokeWidth={2} strokeScaleEnabled={false} listening={false} />
      <Line points={[mx - 6, my + 6, mx + 6, my - 6]} stroke={on ? color : '#64748b'} strokeWidth={2} strokeScaleEnabled={false} listening={false} />
      <PinNode x={ax} y={ay} pinId="anode" compId={comp.id} radius={5} onClick={onPinClick} onTap={onPinClick} onPointerDown={onPinPointerDown} onPointerUp={onPinPointerUp} />
      <PinNode x={cx} y={cy} pinId="cathode" compId={comp.id} radius={5} onClick={onPinClick} onTap={onPinClick} onPointerDown={onPinPointerDown} onPointerUp={onPinPointerUp} />
    </Group>
  );
}

function SchematicESP32({
  comp,
  simState,
  isSelected,
  onSelect,
  onDelete,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
}: {
  comp: SimComponent;
  simState: { components: SimComponent[]; wires: Wire[] };
  isSelected: boolean;
  onSelect: (id: string, shift?: boolean) => void;
  onDelete: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onPinClick: (compId: string, pinId: string, shift?: boolean) => void;
  onPinPointerDown?: (compId: string, pinId: string) => void;
  onPinPointerUp?: (compId: string, pinId: string) => void;
}) {
  const w = 80, h = 100;
  return (
    <Group x={comp.x} y={comp.y} draggable onDragEnd={(e) => onDragEnd(comp.id, e.target.x(), e.target.y())} onClick={(e) => onSelect(comp.id, e.evt.shiftKey)}>
      <Rect width={w} height={h} x={-w/2} y={-h/2} fill="#1e293b" stroke={isSelected ? '#60a5fa' : '#475569'} strokeWidth={2} strokeScaleEnabled={false} />
      <Text x={-w/2 + 4} y={-h/2 + 4} text="ESP32" fontSize={11} fill="#e2e8f0" listening={false} />
      {comp.pins.map((pin) => {
        const pos = findPin(simState, comp.id, pin.id);
        if (!pos) return null;
        const lx = pos.x - comp.x, ly = pos.y - comp.y;
        return (
          <React.Fragment key={pin.id}>
            <PinNode x={lx} y={ly} pinId={pin.id} compId={comp.id} radius={5} onClick={onPinClick} onTap={onPinClick} onPointerDown={onPinPointerDown} onPointerUp={onPinPointerUp} />
            <Text x={lx + 6} y={ly - 5} text={pin.label} fontSize={8} fill="#94a3b8" listening={false} />
          </React.Fragment>
        );
      })}
    </Group>
  );
}

function SchematicJunction({ comp, simState, isSelected, onSelect, onDelete, onDragEnd, onPinClick, onPinPointerDown, onPinPointerUp, junctionWireCount = 0 }: {
  comp: SimComponent;
  simState: { components: SimComponent[]; wires: Wire[] };
  isSelected: boolean;
  onSelect: (id: string, shift?: boolean) => void;
  onDelete: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onPinClick: (compId: string, pinId: string, shift?: boolean) => void;
  onPinPointerDown?: (compId: string, pinId: string) => void;
  onPinPointerUp?: (compId: string, pinId: string) => void;
  junctionWireCount?: number;
}) {
  const pos = findPin(simState, comp.id, 'J', 'schematic');
  if (!pos) return null;
  const lx = pos.x - comp.x, ly = pos.y - comp.y;
  const hasMultipleBranches = junctionWireCount >= 3;
  const radius = hasMultipleBranches ? 6 : 5;
  return (
    <Group x={comp.x} y={comp.y} draggable onDragEnd={(e) => onDragEnd(comp.id, e.target.x(), e.target.y())} onClick={(e) => onSelect(comp.id, e.evt.shiftKey)}>
      {hasMultipleBranches && <Circle x={lx} y={ly} radius={8} fill="transparent" stroke="#94a3b8" strokeWidth={1.5} strokeScaleEnabled={false} listening={false} />}
      <PinNode x={lx} y={ly} pinId="J" compId={comp.id} kind="ground" radius={radius} onClick={onPinClick} onTap={onPinClick} onPointerDown={onPinPointerDown} onPointerUp={onPinPointerUp} />
    </Group>
  );
}

function renderSchematicSymbol(
  comp: SimComponent,
  simState: { components: SimComponent[]; wires: Wire[] },
  isSelected: boolean,
  handlers: {
    onComponentSelect: (id: string, shift?: boolean) => void;
    onComponentDelete: (id: string) => void;
    onComponentDragEnd: (id: string, x: number, y: number) => void;
    onPinClick: (compId: string, pinId: string, shift?: boolean) => void;
    onPinPointerDown?: (compId: string, pinId: string) => void;
    onPinPointerUp?: (compId: string, pinId: string) => void;
    onButtonPressChange?: (compId: string, pressed: boolean) => void;
    onSwitchToggle?: (compId: string) => void;
  },
  pinToNetId?: Map<string, string> | Record<string, string>,
  netVoltageById?: Record<string, number> | Map<string, number>
) {
  const common = { comp, simState, isSelected, onSelect: handlers.onComponentSelect, onDelete: handlers.onComponentDelete, onDragEnd: handlers.onComponentDragEnd, onPinClick: handlers.onPinClick, onPinPointerDown: handlers.onPinPointerDown, onPinPointerUp: handlers.onPinPointerUp };
  // Explicit mapping: toggle switch (by runtime type) always uses schematic symbol, never fallback
  if (TOGGLE_SWITCH_SCHEMATIC_TYPES.includes(comp.type)) {
    return <SchematicToggleSwitchRenderer {...common} onSwitchToggle={handlers.onSwitchToggle} />;
  }
  if (comp.type === 'power_rail') {
    const kind = (comp.props?.kind as string) ?? '3v3';
    if (kind === 'gnd') return <SchematicGroundRenderer {...common} />;
    return <SchematicDCSource {...common} />;
  }
  if (comp.type === 'ground') return <SchematicGroundRenderer {...common} />;
  if (comp.type === 'dc_supply') return <SchematicDCSupplyRenderer {...common} />;
  if (
    (comp.type as string) === 'push_button'
    || (comp.type as string) === 'push_button_momentary'
    || (comp.type as string) === 'push_button_latch'
    || comp.type === 'button'
  ) {
    return <SchematicButtonRenderer {...common} onPressChange={handlers.onButtonPressChange} />;
  }
  if (comp.type === 'resistor') return <SchematicResistorRenderer {...common} />;
  if (comp.type === 'led') return <SchematicLEDRenderer {...common} pinToNetId={pinToNetId} netVoltageById={netVoltageById} />;
  if ((comp.type as string) === 'diode') return <SchematicDiodeRenderer {...common} diodeState={comp.props?.diodeState as 'OFF' | 'ON' | 'BREAKDOWN' | undefined} />;
  if (comp.type === 'rgb_led') return <SchematicRgbLedRenderer {...common} />;
  if ((comp.type as string) === 'transistor') return <SchematicTransistorRenderer {...common} />;
  if (comp.type === 'voltmeter') {
    const solvedVolts = comp.props?.voltmeterVolts as number | null | undefined;
    const solvedConnected = comp.props?.voltmeterConnected as boolean | undefined;
    const solvedFloating = comp.props?.voltmeterFloating as boolean | undefined;
    if (solvedConnected !== undefined) {
      const connected = solvedConnected && !solvedFloating;
      const voltmeterReading = solvedVolts ?? undefined;
      return <SchematicVoltmeterRenderer {...common} voltmeterReading={voltmeterReading} connected={connected} />;
    }
    const getNet = (pk: string) => (pinToNetId && (pinToNetId instanceof Map ? pinToNetId.get(pk) : (pinToNetId as Record<string, string>)[pk]));
    const netA = getNet(pinKey(comp.id, 'pos'));
    const netB = getNet(pinKey(comp.id, 'neg'));
    const Va = netA != null && netVoltageById ? netVoltageById[netA] : undefined;
    const Vb = netB != null && netVoltageById ? netVoltageById[netB] : undefined;
    const connected = netA != null && netB != null && Va !== undefined && Vb !== undefined;
    const voltmeterReading = connected ? Va - Vb : 0;
    return <SchematicVoltmeterRenderer {...common} voltmeterReading={voltmeterReading} connected={connected} />;
  }
  if (comp.type === 'esp32') return <SchematicESP32 {...common} />;
  if ((comp.type as string) === 'potentiometer') return <SchematicPotentiometerRenderer {...common} />;
  if (comp.type === 'motor_dc') return <SchematicMotorDCRenderer {...common} />;
  if (comp.type === 'motor_ac') return <SchematicMotorACRenderer {...common} />;
  if (comp.type === 'buzzer') return <SchematicBuzzerRenderer {...common} />;
  if (comp.type === 'capacitor') return <SchematicCapacitorRenderer {...common} />;
  if (comp.type === 'capacitor_polarized') return <SchematicCapacitorPolarizedRenderer {...common} />;
  if (comp.type === 'inductor') return <SchematicInductorRenderer {...common} />;
  if (comp.type === 'junction') {
    const junctionWireCount = simState.wires.filter((w) => w.from.componentId === comp.id || w.to.componentId === comp.id).length;
    return <SchematicJunction {...common} junctionWireCount={junctionWireCount} />;
  }
  return <SchematicFallback {...common} />;
}

function SchematicFallback({
  comp,
  simState,
  isSelected,
  onSelect,
  onDelete,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
}: {
  comp: SimComponent;
  simState: { components: SimComponent[]; wires: Wire[] };
  isSelected: boolean;
  onSelect: (id: string, shift?: boolean) => void;
  onDelete: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onPinClick: (compId: string, pinId: string, shift?: boolean) => void;
  onPinPointerDown?: (compId: string, pinId: string) => void;
  onPinPointerUp?: (compId: string, pinId: string) => void;
}) {
  return (
    <Group x={comp.x} y={comp.y} draggable onDragEnd={(e) => onDragEnd(comp.id, e.target.x(), e.target.y())} onClick={(e) => onSelect(comp.id, e.evt.shiftKey)}>
      <Rect width={40} height={24} x={-20} y={-12} fill="#1e293b" stroke={isSelected ? '#60a5fa' : '#475569'} strokeWidth={1.5} strokeScaleEnabled={false} />
      <Text x={-18} y={-8} text={comp.type} fontSize={9} fill="#94a3b8" listening={false} />
      {comp.pins.map((pin) => {
        const pos = findPin(simState, comp.id, pin.id);
        if (!pos) return null;
        const lx = pos.x - comp.x, ly = pos.y - comp.y;
        return (
          <PinNode key={pin.id} x={lx} y={ly} pinId={pin.id} compId={comp.id} radius={5} onClick={onPinClick} onTap={onPinClick} onPointerDown={onPinPointerDown} onPointerUp={onPinPointerUp} />
        );
      })}
    </Group>
  );
}

export function CircuitSchematicScene({
  state,
  width,
  height,
  onStageClick,
  onComponentSelect,
  onComponentDelete,
  onComponentDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
  onWireSelect,
  onWireDelete,
  onWireSegmentClick,
  highlightedWireIds = [],
  wireVoltages = {},
  wireConflicts = {},
  wireEnergized = {},
  wireStateById = {},
  wireFlowDirectionById = {},
  onButtonPressChange,
  onSwitchToggle,
  stageRef,
  layerRef,
  rubberBandLineRef,
  boxSelectRectRef,
  overlayLayerRef,
  pinRingRef,
  ghostDotRef,
  onWheel,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  onContextMenu,
  pinToNetId,
  netVoltageById,
  unconnectedPinKeys = new Set<string>(),
  hoveredPinKey = null,
}: CircuitSchematicSceneProps) {
  const { components, wires, selectedComponentIds, selectedWireIds, viewport: vp, activeWireStart, tool } = state;
  const isWiringMode = tool === 'wire';
  const simState = { components, wires };

  const wirePointsMap = React.useMemo(() => {
    const map = new Map<string, number[]>();
    const state = { components, wires, running: false };
    for (const w of wires) {
      const pts = getWirePoints(state, w, 'schematic');
      if (pts.length >= 4) map.set(w.id, pts);
    }
    return map;
  }, [wires, components]);

  const junctionPoints = React.useMemo(() => {
    const countByKey = new Map<string, number>();
    const add = (x: number, y: number) => {
      const k = `${snapToGrid(x)}_${snapToGrid(y)}`;
      countByKey.set(k, (countByKey.get(k) ?? 0) + 1);
    };
    for (const w of wires) {
      const pts = wirePointsMap.get(w.id);
      if (pts) {
        for (let i = 0; i < pts.length; i += 2) add(pts[i], pts[i + 1]);
      }
    }
    for (const c of components) {
      if (c.type === 'junction') {
        const pos = findPin(simState, c.id, 'J', 'schematic');
        if (pos) add(pos.x, pos.y);
      } else {
        for (const p of c.pins) {
          const pos = findPin(simState, c.id, p.id, 'schematic');
          if (pos) add(pos.x, pos.y);
        }
      }
    }
    const out: { x: number; y: number }[] = [];
    countByKey.forEach((count, key) => {
      if (count >= 3) {
        const [x, y] = key.split('_').map(Number);
        out.push({ x, y });
      }
    });
    return out;
  }, [wires, components, wirePointsMap]);

  const fromPin = activeWireStart && findPin(simState, activeWireStart.componentId, activeWireStart.pinId, 'schematic');

  const handlers = {
    onComponentSelect,
    onComponentDelete,
    onComponentDragEnd,
    onPinClick,
    onPinPointerDown,
    onPinPointerUp,
    onButtonPressChange,
    onSwitchToggle,
  };

  return (
    <Stage
      ref={stageRef as React.RefObject<HTMLDivElement>}
      width={width}
      height={height}
      className="bg-neutral-900"
      onClick={(e) => {
        if (e.target === e.target.getStage()) {
          onStageClick(e.evt.shiftKey);
        }
      }}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onContextMenu={onContextMenu}
    >
      <GridLayer viewport={vp} />
      <Layer ref={layerRef}>
        <Group
          x={vp.offsetX}
          y={vp.offsetY}
          scaleX={vp.scale}
          scaleY={vp.scale}
        >
          {wires.map((wire) => {
            const points = wirePointsMap.get(wire.id);
            if (!points || points.length < 4) return null;
            const voltage = wireVoltages[wire.id];
            const hasConflict = wireConflicts[wire.id];
            const wireState = wireStateById[wire.id] ?? 'off';
            const isHighlighted = highlightedWireIds.includes(wire.id);
            const isSelected = selectedWireIds.includes(wire.id);
            let stroke = wire.color;
            let opacity = 1;
            let dash: number[] | undefined;
            if (hasConflict) {
              stroke = '#ef4444';
              opacity = 1;
            } else if (wireState === 'current' && voltage !== undefined) {
              stroke = voltage >= 4.5 ? '#ef4444' : voltage >= 3 ? '#f97316' : voltage === 0 ? '#9ca3af' : wire.color;
              dash = [6, 6];
              opacity = voltage === 0 ? 0.7 : 1;
            } else if (wireState === 'current') {
              dash = [6, 6];
              opacity = 0.5;
            } else if (wireState === 'feed') {
              stroke = voltage !== undefined && voltage > 0.5 ? '#b91c1c' : wire.color;
              dash = [4, 4];
              opacity = 0.55;
            } else if (voltage !== undefined) {
              opacity = voltage === 0 ? 0.5 : voltage >= 3 ? 1 : 0.75;
            } else {
              dash = [6, 4];
              opacity = 0.5;
            }
            return (
              <Line
                key={wire.id}
                points={points}
                stroke={stroke}
                strokeWidth={isSelected ? 5 : isHighlighted ? 4 : 3}
                lineCap="round"
                lineJoin="round"
                opacity={opacity}
                dash={dash}
                strokeScaleEnabled={false}
                onClick={(e) => { e.cancelBubble = true; onWireSelect(wire.id, e.evt.shiftKey); }}
                onTap={(e) => { e.cancelBubble = true; onWireSelect(wire.id, e.evt.shiftKey); }}
              />
            );
          })}

          {junctionPoints.map((pt, i) => (
            <Circle key={`j-${i}`} x={pt.x} y={pt.y} radius={4} fill="#64748b" stroke="#94a3b8" strokeWidth={1} strokeScaleEnabled={false} listening={false} />
          ))}

          {components.map((comp) => {
            const isSelected = selectedComponentIds.includes(comp.id);
            const el = renderSchematicSymbol(comp, simState, isSelected, handlers, pinToNetId, netVoltageById);
            return el ? <React.Fragment key={comp.id}>{el}</React.Fragment> : null;
          })}

          {fromPin && rubberBandLineRef && (() => {
            const pt = safePoint(fromPin.x, fromPin.y);
            if (!pt) return null;
            return (
              <Line
                ref={rubberBandLineRef}
                points={[pt.x, pt.y, pt.x, pt.y]}
                stroke="#94a3b8"
                strokeWidth={2}
                strokeScaleEnabled={false}
                dash={[8, 4]}
                opacity={0.7}
                lineCap="round"
                lineJoin="round"
                listening={false}
              />
            );
          })()}

          <Rect
            ref={boxSelectRectRef}
            x={0}
            y={0}
            width={0}
            height={0}
            stroke="#60a5fa"
            strokeWidth={2}
            fill="rgba(96,165,250,0.1)"
            listening={false}
            visible={false}
            strokeScaleEnabled={false}
          />
        </Group>
      </Layer>
      {overlayLayerRef && (
        <Layer ref={overlayLayerRef} listening={false}>
          <Group
            x={vp.offsetX}
            y={vp.offsetY}
            scaleX={vp.scale}
            scaleY={vp.scale}
          >
            <Circle
              ref={pinRingRef}
              radius={12}
              stroke="#60a5fa"
              strokeWidth={2}
              listening={false}
              visible={false}
              strokeScaleEnabled={false}
            />
            <Circle
              ref={ghostDotRef}
              radius={4}
              fill="#94a3b8"
              stroke="#cbd5e1"
              strokeWidth={1}
              listening={false}
              visible={false}
              strokeScaleEnabled={false}
            />
            {isWiringMode &&
              components.flatMap((comp) => {
                const footprint = getFootprint(comp.type, 'schematic');
                const pinIds =
                  (comp.type as string) === 'motor_dc' || (comp.type as string) === 'motor_ac'
                    ? (footprint ? Object.keys(footprint.pinOffsets) : ['P', 'N'])
                    : (comp.pins ?? []).map((pin) => pin.id);
                return pinIds.map((pinId) => {
                  const pos = findPin(simState, comp.id, pinId, 'schematic');
                  if (!pos) return null;
                  const pt = safePoint(pos.x, pos.y);
                  if (!pt) return null;
                  return (
                    <Circle
                      key={`${comp.id}:${pinId}`}
                      x={pt.x}
                      y={pt.y}
                      radius={12}
                      stroke="#e2e8f0"
                      strokeWidth={2}
                      opacity={0.9}
                      listening={false}
                      strokeScaleEnabled={false}
                    />
                  );
                });
              })}
            {isWiringMode && hoveredPinKey && (() => {
              const colon = hoveredPinKey.indexOf(':');
              const compId = colon >= 0 ? hoveredPinKey.slice(0, colon) : '';
              const pinId = colon >= 0 ? hoveredPinKey.slice(colon + 1) : hoveredPinKey;
              const comp = components.find((c) => c.id === compId);
              const pin = comp?.pins?.find((p) => p.id === pinId);
              const pos = comp && pin ? findPin(simState, compId, pinId, 'schematic') : null;
              if (!pos) return null;
              const pt = safePoint(pos.x, pos.y);
              if (!pt) return null;
              const compLabel = (comp?.props?.label as string) || comp?.type || compId;
              const pinLabel = pin?.label || pinId;
              return (
                <Group x={pt.x} y={pt.y - 16}>
                  <Text
                    text={`${compLabel}.${pinLabel}`}
                    fontSize={10}
                    fill="#e5e7eb"
                    listening={false}
                    strokeScaleEnabled={false}
                  />
                </Group>
              );
            })()}
          </Group>
        </Layer>
      )}
      <SelectionOverlayLayer
        viewport={vp}
        viewMode="schematic"
        selectedComponentIds={selectedComponentIds}
        selectedWireIds={selectedWireIds}
        components={components}
        wires={wires}
        onDeleteComponent={onComponentDelete}
        onDeleteWire={onWireDelete}
      />
    </Stage>
  );
}
