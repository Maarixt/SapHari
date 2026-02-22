/**
 * Scene Renderer layer: Konva Stage + Layer, viewport Group, GridBackground, components, wires.
 * Pure render only; no simulation logic, no state mutations except via callbacks.
 * Viewport (scale, offset) is applied to an inner Group so all content is in circuit coordinates.
 * Rubber-band line is updated imperatively via rubberBandLineRef + layerRef.batchDraw() from parent (no state).
 */

import React, { useMemo } from 'react';
import { Stage, Layer, Group, Line, Rect, Circle, Text } from 'react-konva';
import type Konva from 'konva';
import { GridBackground } from '../GridBackground';
import { findPin, getWirePointsWithStatus } from '../helpers';
import { getFootprint } from '../visual/footprints';
import { pinKey } from '../engine2';
import { safePoint, allPointsFinite } from '../utils/coords';
import { SimComponentNode } from '../SimComponentNode';
import { WorkbenchToggleSwitchRenderer } from '../visual/WorkbenchToggleSwitchRenderer';
import { WorkbenchLEDRenderer } from '../visual/WorkbenchLEDRenderer';
import { WorkbenchDiodeRenderer } from '../visual/WorkbenchDiodeRenderer';
import { WorkbenchRgbLedRenderer } from '../visual/WorkbenchRgbLedRenderer';
import { WorkbenchBatteryRenderer } from '../visual/WorkbenchBatteryRenderer';
import { WorkbenchGroundRenderer } from '../visual/WorkbenchGroundRenderer';
import { WorkbenchMotorDCRenderer } from '../visual/WorkbenchMotorDCRenderer';
import { WorkbenchMotorACRenderer } from '../visual/WorkbenchMotorACRenderer';
import { WorkbenchResistorRenderer } from '../visual/WorkbenchResistorRenderer';
import { WorkbenchVoltmeterRenderer } from '../visual/WorkbenchVoltmeterRenderer';
import { WorkbenchPotentiometerRenderer } from '../visual/WorkbenchPotentiometerRenderer';
import { WorkbenchTransistorRenderer } from '../visual/WorkbenchTransistorRenderer';
import { WorkbenchPushButtonRenderer } from '../visual/WorkbenchPushButtonRenderer';
import { WorkbenchBuzzerRenderer } from '../visual/WorkbenchBuzzerRenderer';
import { WorkbenchCapacitorRenderer } from '../visual/WorkbenchCapacitorRenderer';
import { WorkbenchCapacitorPolarizedRenderer } from '../visual/WorkbenchCapacitorPolarizedRenderer';
import { WorkbenchInductorRenderer } from '../visual/WorkbenchInductorRenderer';
import { EnhancedWireNode } from '../EnhancedWireNode';
import { SelectionOverlayLayer } from './SelectionOverlayLayer';
import type { CircuitState } from '../store/circuitStore';
import type { SimComponent, Wire } from '../types';

const GRID_EXTENT = 2000;

export interface CircuitSceneProps {
  /** Current circuit state (components, wires, selection). */
  state: CircuitState;
  /** Stage width/height */
  width: number;
  height: number;
  /** Callbacks from interaction layer (no mutations here). */
  onStageClick: (shift?: boolean) => void;
  onComponentSelect: (id: string, shift?: boolean) => void;
  onComponentDelete: (id: string) => void;
  onComponentDragEnd: (id: string, x: number, y: number, evt?: MouseEvent) => void;
  onPinClick: (compId: string, pinId: string, shift?: boolean) => void;
  onPinPointerDown?: (compId: string, pinId: string) => void;
  onPinPointerUp?: (compId: string, pinId: string) => void;
  onWireSelect: (id: string, shift?: boolean) => void;
  onWireDelete: (id: string) => void;
  /** When tool is wire: click on wire segment inserts midpoint. */
  onWireSegmentClick?: (wireId: string, circuitX: number, circuitY: number, segmentIndex?: number) => void;
  /** When wire is selected: click "+" on segment inserts bend point. */
  onWireInsertMidpoint?: (wireId: string, segmentIndex: number, x: number, y: number) => void;
  /** When wire is selected: drag waypoints to edit path. */
  onWirePointsChange?: (wireId: string, points: number[]) => void;
  /** Wire ids to highlight (e.g. same net as inspected wire). */
  highlightedWireIds?: string[];
  /** Wire id -> net voltage for flow visualization (0V dim, 3.3V bright). */
  wireVoltages?: Record<string, number | undefined>;
  /** Wire id -> true if that wire's net has a warning (red outline). */
  wireConflicts?: Record<string, boolean>;
  /** Wire id -> true if that wire's net is on an energized closed loop. */
  wireEnergized?: Record<string, boolean>;
  /** Wire id -> "off" | "feed" | "current" for flow visuals. Only "current" shows animated dash. */
  wireStateById?: Record<string, 'off' | 'feed' | 'current'>;
  /** Wire id -> 1 | -1 | 0 for solver-driven flow animation direction. */
  wireFlowDirectionById?: Record<string, 1 | -1 | 0>;
  onButtonPressChange?: (compId: string, pressed: boolean) => void;
  onSwitchToggle?: (compId: string) => void;
  /** Potentiometer: start knob drag (parent handles mousemove and updates alpha). */
  onPotKnobDragStart?: (compId: string) => void;
  /** View mode for wire pin positions (workbench vs schematic). */
  viewMode?: 'workbench' | 'schematic';
  stageRef?: React.RefObject<unknown>;
  /** Refs for rubber-band: parent updates line points and calls layerRef.current.batchDraw() on throttled mousemove. */
  layerRef?: React.RefObject<Konva.Layer | null>;
  rubberBandLineRef?: React.RefObject<Konva.Line | null>;
  /** Ref for box-select rectangle (Select tool drag). Parent sets visible/position/size and batchDraw(). */
  boxSelectRectRef?: React.RefObject<Konva.Rect | null>;
  /** Overlay layer and hover shapes: parent updates pin ring + ghost junction in rAF and batchDraw(). */
  overlayLayerRef?: React.RefObject<Konva.Layer | null>;
  pinRingRef?: React.RefObject<Konva.Circle | null>;
  ghostDotRef?: React.RefObject<Konva.Circle | null>;
  /** Zoom/pan: optional Stage-level handlers (in screen coords). */
  onWheel?: (e: { evt: WheelEvent; target: { getStage: () => { getPointerPosition: () => { x: number; y: number } } } }) => void;
  onMouseDown?: (e: { evt: MouseEvent }) => void;
  onMouseMove?: (e: { evt: MouseEvent; target: { getStage: () => { getPointerPosition: () => { x: number; y: number } } } }) => void;
  onMouseUp?: (e: { evt: MouseEvent }) => void;
  onMouseLeave?: (e: { evt: MouseEvent }) => void;
  onContextMenu?: (e: { evt: MouseEvent; target: { getStage: () => { getPointerPosition: () => { x: number; y: number } | null } } }) => void;
  /** Net state for voltage-based LED on/brightness (forward bias). */
  pinToNetId?: Map<string, string> | Record<string, string>;
  netVoltageById?: Record<string, number> | Map<string, number>;
  /** Pin keys (compId:pinId) whose net has only that pin — show unconnected-pin warning dot. */
  unconnectedPinKeys?: Set<string>;
  /** When in wire mode: pin key of the pin under cursor (for glow + tooltip). */
  hoveredPinKey?: string | null;
  /** Solver outputs per component (e.g. capacitor reversed/damaged for workbench renderers). */
  outputsByComponentId?: Record<string, unknown>;
}

function isComponentSelected(selectedComponentIds: string[], compId: string): boolean {
  return selectedComponentIds.includes(compId);
}

function isWireSelected(selectedWireIds: string[], wireId: string): boolean {
  return selectedWireIds.includes(wireId);
}

/** Viewport for grid (scale and offset only). */
interface ViewportLike {
  scale: number;
  offsetX: number;
  offsetY: number;
}

/** Memoized grid layer: re-renders only when viewport (scale, offset) changes. */
const GridLayer = React.memo(
  function GridLayer({ viewport }: { viewport: ViewportLike }) {
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

/** Rubber-band temp wire line. Parent updates points via rubberBandLineRef + layerRef.batchDraw(); no state. Never pass NaN. */
function TempWireLine({
  rubberBandLineRef,
  fromX,
  fromY,
}: {
  rubberBandLineRef?: React.RefObject<Konva.Line | null>;
  fromX: number;
  fromY: number;
}) {
  const x = Number.isFinite(fromX) ? fromX : 0;
  const y = Number.isFinite(fromY) ? fromY : 0;
  return (
    <Line
      ref={rubberBandLineRef}
      points={[x, y, x, y]}
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
}

export function CircuitScene({
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
  onWireInsertMidpoint,
  onWirePointsChange,
  highlightedWireIds = [],
  wireVoltages = {},
  wireConflicts = {},
  wireEnergized = {},
  wireStateById = {},
  wireFlowDirectionById = {},
  onButtonPressChange,
  onSwitchToggle,
  onPotKnobDragStart,
  viewMode = 'workbench',
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
  outputsByComponentId,
}: CircuitSceneProps) {
  const { components, wires, selectedComponentIds, selectedWireIds, viewport, activeWireStart } = state;
  const fromPin = activeWireStart && findPin({ components, wires }, activeWireStart.componentId, activeWireStart.pinId, viewMode);
  const showRubberBand = !!fromPin;
  const isWiringMode = state.tool === 'wire';

  const simState = useMemo(() => ({ components, wires }), [components, wires]);
  const debugHud = useMemo(() => {
    if (!import.meta.env.DEV) return null;
    let rendered = 0;
    let dropped = 0;
    const reasons: Record<string, number> = {};
    for (const wire of wires) {
      const st = getWirePointsWithStatus(simState, wire, viewMode);
      const bothResolved = st.fromResolved && st.toResolved;
      const pointsValid = st.points.length >= 4 && allPointsFinite(st.points);
      if (bothResolved && pointsValid) rendered++;
      else {
        dropped++;
        if (!st.fromResolved && st.missingFromReason) reasons[st.missingFromReason] = (reasons[st.missingFromReason] ?? 0) + 1;
        if (!st.toResolved && st.missingToReason) reasons[st.missingToReason] = (reasons[st.missingToReason] ?? 0) + 1;
        if (bothResolved && !pointsValid) reasons['NaN in points'] = (reasons['NaN in points'] ?? 0) + 1;
      }
    }
    return {
      components: components.length,
      wires: wires.length,
      renderedWireSegmentsCount: rendered,
      droppedWireSegmentsCount: dropped,
      reasons: Object.entries(reasons).map(([k, v]) => `${k}: ${v}`).join(', ') || '—',
    };
  }, [simState, wires, viewMode, components.length]);

  const isSwitchType = (t: string) => t === 'switch' || t === 'toggle-switch';

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
      <GridLayer viewport={viewport} />
      <Layer ref={layerRef}>
        <Group
          x={viewport.offsetX}
          y={viewport.offsetY}
          scaleX={viewport.scale}
          scaleY={viewport.scale}
        >
          {components.map((comp) => {
            const selected = isComponentSelected(selectedComponentIds, comp.id);
            const safeComp: SimComponent = { ...comp, x: Number.isFinite(comp.x) ? comp.x : 0, y: Number.isFinite(comp.y) ? comp.y : 0 };
            if (
              (safeComp.type as string) === 'push_button'
              || (safeComp.type as string) === 'push_button_momentary'
              || (safeComp.type as string) === 'push_button_latch'
              || safeComp.type === 'button'
            ) {
              return (
                <WorkbenchPushButtonRenderer
                  key={safeComp.id}
                  comp={safeComp}
                  isSelected={selected}
                  onSelect={onComponentSelect}
                  onDragEnd={onComponentDragEnd}
                  onPinClick={onPinClick}
                  onPinPointerDown={onPinPointerDown}
                  onPinPointerUp={onPinPointerUp}
                  onPressChange={onButtonPressChange}
                />
              );
            }
            if (safeComp.type === 'led') {
              return (
                <WorkbenchLEDRenderer
                  key={safeComp.id}
                  comp={safeComp}
                  isSelected={selected}
                  onSelect={onComponentSelect}
                  onDragEnd={onComponentDragEnd}
                  onPinClick={onPinClick}
                  onPinPointerDown={onPinPointerDown}
                  onPinPointerUp={onPinPointerUp}
                  pinToNetId={pinToNetId}
                  netVoltageById={netVoltageById}
                />
              );
            }
            if (safeComp.type === 'rgb_led') {
              return (
                <WorkbenchRgbLedRenderer
                  key={safeComp.id}
                  comp={safeComp}
                  isSelected={selected}
                  onSelect={onComponentSelect}
                  onDragEnd={onComponentDragEnd}
                  onPinClick={onPinClick}
                  onPinPointerDown={onPinPointerDown}
                  onPinPointerUp={onPinPointerUp}
                />
              );
            }
            if ((safeComp.type as string) === 'diode') {
              return (
                <WorkbenchDiodeRenderer
                  key={safeComp.id}
                  comp={safeComp}
                  isSelected={selected}
                  onSelect={onComponentSelect}
                  onDragEnd={onComponentDragEnd}
                  onPinClick={onPinClick}
                  onPinPointerDown={onPinPointerDown}
                  onPinPointerUp={onPinPointerUp}
                />
              );
            }
            if (safeComp.type === 'ground') {
              return (
                <WorkbenchGroundRenderer
                  key={safeComp.id}
                  comp={safeComp}
                  isSelected={selected}
                  onSelect={onComponentSelect}
                  onDragEnd={onComponentDragEnd}
                  onPinClick={onPinClick}
                  onPinPointerDown={onPinPointerDown}
                  onPinPointerUp={onPinPointerUp}
                />
              );
            }
            if (safeComp.type === 'dc_supply') {
              return (
                <WorkbenchBatteryRenderer
                  key={safeComp.id}
                  comp={safeComp}
                  isSelected={selected}
                  onSelect={onComponentSelect}
                  onDragEnd={onComponentDragEnd}
                  onPinClick={onPinClick}
                  onPinPointerDown={onPinPointerDown}
                  onPinPointerUp={onPinPointerUp}
                />
              );
            }
            if (safeComp.type === 'motor_dc') {
              return (
                <WorkbenchMotorDCRenderer
                  key={safeComp.id}
                  comp={safeComp}
                  isSelected={selected}
                  onSelect={onComponentSelect}
                  onDragEnd={onComponentDragEnd}
                  onPinClick={onPinClick}
                  onPinPointerDown={onPinPointerDown}
                  onPinPointerUp={onPinPointerUp}
                  isWiringMode={state.tool === 'wire'}
                />
              );
            }
            if (safeComp.type === 'motor_ac') {
              return (
                <WorkbenchMotorACRenderer
                  key={safeComp.id}
                  comp={safeComp}
                  isSelected={selected}
                  onSelect={onComponentSelect}
                  onDragEnd={onComponentDragEnd}
                  onPinClick={onPinClick}
                  onPinPointerDown={onPinPointerDown}
                  onPinPointerUp={onPinPointerUp}
                  isWiringMode={state.tool === 'wire'}
                />
              );
            }
            if (isSwitchType(safeComp.type as string)) {
              return (
                <WorkbenchToggleSwitchRenderer
                  key={safeComp.id}
                  comp={safeComp}
                  isSelected={selected}
                  onSelect={onComponentSelect}
                  onDelete={onComponentDelete}
                  onDragEnd={onComponentDragEnd}
                  onPinClick={onPinClick}
                  onPinPointerDown={onPinPointerDown}
                  onPinPointerUp={onPinPointerUp}
                  onSwitchToggle={onSwitchToggle}
                />
              );
            }
            if (safeComp.type === 'resistor') {
              return (
                <WorkbenchResistorRenderer
                  key={safeComp.id}
                  comp={safeComp}
                  isSelected={selected}
                  onSelect={onComponentSelect}
                  onDragEnd={onComponentDragEnd}
                  onPinClick={onPinClick}
                  onPinPointerDown={onPinPointerDown}
                  onPinPointerUp={onPinPointerUp}
                />
              );
            }
            if (safeComp.type === 'voltmeter') {
              return (
                <WorkbenchVoltmeterRenderer
                  key={safeComp.id}
                  comp={safeComp}
                  isSelected={selected}
                  onSelect={onComponentSelect}
                  onDragEnd={onComponentDragEnd}
                  onPinClick={onPinClick}
                  onPinPointerDown={onPinPointerDown}
                  onPinPointerUp={onPinPointerUp}
                />
              );
            }
            if ((safeComp.type as string) === 'transistor') {
              return (
                <WorkbenchTransistorRenderer
                  key={safeComp.id}
                  comp={safeComp}
                  isSelected={selected}
                  onSelect={onComponentSelect}
                  onDragEnd={onComponentDragEnd}
                  onPinClick={onPinClick}
                  onPinPointerDown={onPinPointerDown}
                  onPinPointerUp={onPinPointerUp}
                />
              );
            }
            if ((safeComp.type as string) === 'potentiometer') {
              return (
                <WorkbenchPotentiometerRenderer
                  key={safeComp.id}
                  comp={safeComp}
                  isSelected={selected}
                  onSelect={onComponentSelect}
                  onDragEnd={onComponentDragEnd}
                  onPinClick={onPinClick}
                  onPinPointerDown={onPinPointerDown}
                  onPinPointerUp={onPinPointerUp}
                  onKnobDragStart={onPotKnobDragStart}
                />
              );
            }
            if (safeComp.type === 'buzzer') {
              return (
                <WorkbenchBuzzerRenderer
                  key={safeComp.id}
                  comp={safeComp}
                  isSelected={selected}
                  onSelect={onComponentSelect}
                  onDragEnd={onComponentDragEnd}
                  onPinClick={onPinClick}
                  onPinPointerDown={onPinPointerDown}
                  onPinPointerUp={onPinPointerUp}
                  isWiringMode={state.tool === 'wire'}
                />
              );
            }
            if (safeComp.type === 'capacitor') {
              return (
                <WorkbenchCapacitorRenderer
                  key={safeComp.id}
                  comp={safeComp}
                  isSelected={selected}
                  onSelect={onComponentSelect}
                  onDragEnd={onComponentDragEnd}
                  onPinClick={onPinClick}
                  onPinPointerDown={onPinPointerDown}
                  onPinPointerUp={onPinPointerUp}
                  isWiringMode={state.tool === 'wire'}
                />
              );
            }
            if (safeComp.type === 'capacitor_polarized') {
              return (
                <WorkbenchCapacitorPolarizedRenderer
                  key={safeComp.id}
                  comp={safeComp}
                  isSelected={selected}
                  onSelect={onComponentSelect}
                  onDragEnd={onComponentDragEnd}
                  onPinClick={onPinClick}
                  onPinPointerDown={onPinPointerDown}
                  onPinPointerUp={onPinPointerUp}
                  isWiringMode={state.tool === 'wire'}
                  capOutput={outputsByComponentId?.[safeComp.id] as { reversed?: boolean; damaged?: boolean } | undefined}
                />
              );
            }
            if (safeComp.type === 'inductor') {
              return (
                <WorkbenchInductorRenderer
                  key={safeComp.id}
                  comp={safeComp}
                  isSelected={selected}
                  onSelect={onComponentSelect}
                  onDragEnd={onComponentDragEnd}
                  onPinClick={onPinClick}
                  onPinPointerDown={onPinPointerDown}
                  onPinPointerUp={onPinPointerUp}
                  isWiringMode={state.tool === 'wire'}
                />
              );
            }
            return (
              <SimComponentNode
                key={safeComp.id}
                comp={safeComp}
                selected={selected}
                junctionWireCount={safeComp.type === 'junction' ? wires.filter((w) => w.from.componentId === safeComp.id || w.to.componentId === safeComp.id).length : undefined}
                tool={state.tool}
                onPinClick={onPinClick}
                onPinPointerDown={onPinPointerDown}
                onPinPointerUp={onPinPointerUp}
                onSelect={onComponentSelect}
                onDelete={onComponentDelete}
                onDragEnd={onComponentDragEnd}
              />
            );
          })}

          {wires.map((wire) => (
            <EnhancedWireNode
              key={wire.id}
              wire={wire}
              selected={isWireSelected(selectedWireIds, wire.id)}
              components={components}
              wires={wires}
              viewport={viewport}
              viewMode={viewMode}
              tool={state.tool}
              onSelect={onWireSelect}
              onDelete={onWireDelete}
              onWireSegmentClick={onWireSegmentClick}
              onWireInsertMidpoint={onWireInsertMidpoint}
              onWirePointsChange={onWirePointsChange}
              isHighlighted={highlightedWireIds.includes(wire.id)}
              voltage={wireVoltages[wire.id]}
              hasConflict={wireConflicts[wire.id]}
              isEnergized={wireEnergized[wire.id]}
              wireState={wireStateById[wire.id] ?? 'off'}
              flowDirection={wireFlowDirectionById[wire.id] ?? 0}
              isValidConnection={true}
            />
          ))}

          {showRubberBand && fromPin && (
            <TempWireLine
              rubberBandLineRef={rubberBandLineRef}
              fromX={fromPin.x}
              fromY={fromPin.y}
            />
          )}
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
            x={viewport.offsetX}
            y={viewport.offsetY}
            scaleX={viewport.scale}
            scaleY={viewport.scale}
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
            {/* Wire mode: show pin pads at findPin positions (one convention: comp + offset-from-anchor). */}
            {isWiringMode &&
              components.flatMap((comp) => {
                const footprint = getFootprint(comp.type, viewMode);
                // Buzzer and motors draw their own wire-mode circles inside their Group so they always align with the pads; skip here to avoid duplicates.
                if (comp.type === 'buzzer' || (comp.type as string) === 'motor_dc' || (comp.type as string) === 'motor_ac') return [];
                const useFootprintPins = comp.type === 'dc_supply';
                const pinIds =
                  useFootprintPins && footprint?.pinOffsets
                    ? Object.keys(footprint.pinOffsets)
                    : (comp.pins ?? []).map((pin) => pin.id);
                return pinIds.map((pinId) => {
                  const pos = findPin({ components, wires }, comp.id, pinId, viewMode);
                  if (!pos) return null;
                  const pt = safePoint(pos.x, pos.y);
                  if (!pt) {
                    if (import.meta.env.DEV) console.warn('[PIN WORLD NaN]', comp.id, pinId, pos);
                    return null;
                  }
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
            {/* Tooltip for hovered pin in wire mode — only when coords valid */}
            {isWiringMode && hoveredPinKey && (() => {
              const colon = hoveredPinKey.indexOf(':');
              const compId = colon >= 0 ? hoveredPinKey.slice(0, colon) : '';
              const pinId = colon >= 0 ? hoveredPinKey.slice(colon + 1) : hoveredPinKey;
              const comp = components.find((c) => c.id === compId);
              const pin = comp?.pins?.find((p) => p.id === pinId);
              const pos = comp && pin ? findPin({ components, wires }, compId, pinId, viewMode) : null;
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
        viewport={viewport}
        viewMode={viewMode}
        selectedComponentIds={selectedComponentIds}
        selectedWireIds={selectedWireIds}
        components={components}
        wires={wires}
        onDeleteComponent={onComponentDelete}
        onDeleteWire={onWireDelete}
      />
      {debugHud && (
        <Layer listening={false}>
          <Group x={10} y={10}>
            <Rect x={0} y={0} width={280} height={72} fill="rgba(0,0,0,0.75)" cornerRadius={4} />
            <Text x={6} y={4} text={`components: ${debugHud.components}  wires: ${debugHud.wires}`} fontSize={11} fill="#e5e7eb" listening={false} />
            <Text x={6} y={20} text={`rendered: ${debugHud.renderedWireSegmentsCount}  dropped: ${debugHud.droppedWireSegmentsCount}`} fontSize={11} fill="#e5e7eb" listening={false} />
            <Text x={6} y={36} text={`reasons: ${debugHud.reasons}`} fontSize={10} fill="#94a3b8" listening={false} width={268} wrap="word" />
          </Group>
        </Layer>
      )}
    </Stage>
  );
}
