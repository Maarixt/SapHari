/**
 * Schematic capacitor (non-polar): two parallel plates | | with leads.
 * Footprint: 90x50 schematic, pins a (5,25), b (85,25), anchor (45,25).
 */

import React from 'react';
import { Group, Rect, Line, Circle, Text } from 'react-konva';
import type { SimComponent, Wire } from '../types';
import { normalizeRotation } from '../utils/transformPins';

const FP = { w: 90, h: 50, ax: 45, ay: 25 };
const PA = { x: 5, y: 25 };
const PB = { x: 85, y: 25 };
const PLATE_GAP = 20;
const PLATE_HALF = 10;
const PLATE_LEFT = FP.ax - PLATE_GAP / 2 - 2;
const PLATE_RIGHT = FP.ax + PLATE_GAP / 2 + 2;
const HIT_R = 12;
const VIS_R = 3;
const SW = 2;
const STROKE = '#e5e7eb';

export interface SchematicCapacitorRendererProps {
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

export function SchematicCapacitorRenderer({
  comp,
  isSelected,
  onSelect,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
}: SchematicCapacitorRendererProps) {
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
      {/* Lead a -> left plate */}
      <Line points={[PA.x, PA.y, PLATE_LEFT, PA.y]} stroke={STROKE} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
      {/* Left plate (vertical) */}
      <Line points={[PLATE_LEFT, PA.y - PLATE_HALF, PLATE_LEFT, PA.y + PLATE_HALF]} stroke={STROKE} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
      {/* Right plate (vertical) */}
      <Line points={[PLATE_RIGHT, PA.y - PLATE_HALF, PLATE_RIGHT, PA.y + PLATE_HALF]} stroke={STROKE} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
      {/* Right plate -> lead b */}
      <Line points={[PLATE_RIGHT, PA.y, PB.x, PB.y]} stroke={STROKE} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
      {/* Pin a */}
      <Circle x={PA.x} y={PA.y} radius={HIT_R} fill="transparent" stroke="transparent" strokeScaleEnabled={false} onClick={(e) => { e.cancelBubble = true; onPinClick(comp.id, pinAId, (e.evt as MouseEvent).shiftKey); }} onTap={(e) => { e.cancelBubble = true; onPinClick(comp.id, pinAId, (e.evt as MouseEvent).shiftKey); }} onPointerDown={(e) => { e.cancelBubble = true; onPinPointerDown?.(comp.id, pinAId); }} onPointerUp={(e) => { e.cancelBubble = true; onPinPointerUp?.(comp.id, pinAId); }} />
      <Circle x={PA.x} y={PA.y} radius={VIS_R} fill={STROKE} stroke={sel} strokeScaleEnabled={false} listening={false} />
      {/* Pin b */}
      <Circle x={PB.x} y={PB.y} radius={HIT_R} fill="transparent" stroke="transparent" strokeScaleEnabled={false} onClick={(e) => { e.cancelBubble = true; onPinClick(comp.id, pinBId, (e.evt as MouseEvent).shiftKey); }} onTap={(e) => { e.cancelBubble = true; onPinClick(comp.id, pinBId, (e.evt as MouseEvent).shiftKey); }} onPointerDown={(e) => { e.cancelBubble = true; onPinPointerDown?.(comp.id, pinBId); }} onPointerUp={(e) => { e.cancelBubble = true; onPinPointerUp?.(comp.id, pinBId); }} />
      <Circle x={PB.x} y={PB.y} radius={VIS_R} fill={STROKE} stroke={sel} strokeScaleEnabled={false} listening={false} />
    </Group>
  );
}
