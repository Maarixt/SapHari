/**
 * Schematic inductor: coil symbol (arcs) between two terminals.
 * Footprint: 90x50, anchor (45,25). Pins a (10,25), b (80,25).
 */

import React from 'react';
import { Group, Line, Circle, Rect } from 'react-konva';
import type { SimComponent, Wire } from '../types';
import { normalizeRotation } from '../utils/transformPins';

const FP = { w: 90, h: 50, ax: 45, ay: 25 };
const PA = { x: 10, y: 25 };
const PB = { x: 80, y: 25 };
const COIL_LEFT = 20;
const COIL_RIGHT = 60;
const COIL_R = 5;
const COIL_ARC_COUNT = 4;
const STEP = (COIL_RIGHT - COIL_LEFT) / COIL_ARC_COUNT;
const HIT_R = 12;
const VIS_R = 3;
const SW = 2;
const STROKE = '#e5e7eb';

function coilPoints(): number[] {
  const pts: number[] = [PA.x, PA.y, COIL_LEFT, PA.y];
  for (let i = 0; i < COIL_ARC_COUNT; i++) {
    const cx = COIL_LEFT + STEP * (i + 0.5);
    const up = i % 2 === 0;
    const segs = 6;
    for (let k = 1; k <= segs; k++) {
      const t = up ? Math.PI - (Math.PI * k) / segs : (Math.PI * k) / segs;
      pts.push(cx + COIL_R * Math.cos(t), PA.y + COIL_R * Math.sin(t));
    }
  }
  pts.push(COIL_RIGHT, PA.y, PB.x, PB.y);
  return pts;
}

const COIL_LINE = coilPoints();

export interface SchematicInductorRendererProps {
  comp: SimComponent;
  simState: { components: SimComponent[]; wires: Wire[] };
  isSelected: boolean;
  onSelect: (id: string, shift?: boolean) => void;
  onDelete: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onPinClick: (compId: string, pinId: string, shift?: boolean) => void;
  onPinPointerDown?: (compId: string, pinId: string) => void;
  onPinPointerUp?: (compId: string, pinId: string) => void;
}

export function SchematicInductorRenderer({
  comp,
  isSelected,
  onSelect,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
}: SchematicInductorRendererProps) {
  const pinAId = comp.pins?.find((p) => p.id === 'a')?.id ?? comp.pins[0]?.id ?? 'a';
  const pinBId = comp.pins?.find((p) => p.id === 'b')?.id ?? comp.pins[1]?.id ?? 'b';
  const flipX = !!comp.flipX;
  const flipY = !!comp.flipY;
  const sel = isSelected ? '#60a5fa' : STROKE;

  return (
    <Group
      x={comp.x}
      y={comp.y}
      offsetX={FP.ax}
      offsetY={FP.ay}
      rotation={normalizeRotation(comp.rotation)}
      scaleX={flipX ? -1 : 1}
      scaleY={flipY ? -1 : 1}
      draggable
      onDragEnd={(e) => onDragEnd(comp.id, e.target.x(), e.target.y())}
      onClick={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
      onTap={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
    >
      <Rect x={0} y={0} width={FP.w} height={FP.h} fill="transparent" listening={true} />
      <Line points={COIL_LINE} stroke={STROKE} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
      <Circle x={PA.x} y={PA.y} radius={HIT_R} fill="transparent" stroke="transparent" strokeScaleEnabled={false} onClick={(e) => { e.cancelBubble = true; onPinClick(comp.id, pinAId, (e.evt as MouseEvent).shiftKey); }} onTap={(e) => { e.cancelBubble = true; onPinClick(comp.id, pinAId, (e.evt as MouseEvent).shiftKey); }} onPointerDown={(e) => { e.cancelBubble = true; onPinPointerDown?.(comp.id, pinAId); }} onPointerUp={(e) => { e.cancelBubble = true; onPinPointerUp?.(comp.id, pinAId); }} />
      <Circle x={PA.x} y={PA.y} radius={VIS_R} fill={STROKE} stroke={sel} strokeScaleEnabled={false} listening={false} />
      <Circle x={PB.x} y={PB.y} radius={HIT_R} fill="transparent" stroke="transparent" strokeScaleEnabled={false} onClick={(e) => { e.cancelBubble = true; onPinClick(comp.id, pinBId, (e.evt as MouseEvent).shiftKey); }} onTap={(e) => { e.cancelBubble = true; onPinClick(comp.id, pinBId, (e.evt as MouseEvent).shiftKey); }} onPointerDown={(e) => { e.cancelBubble = true; onPinPointerDown?.(comp.id, pinBId); }} onPointerUp={(e) => { e.cancelBubble = true; onPinPointerUp?.(comp.id, pinBId); }} />
      <Circle x={PB.x} y={PB.y} radius={VIS_R} fill={STROKE} stroke={sel} strokeScaleEnabled={false} listening={false} />
    </Group>
  );
}
