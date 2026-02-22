/**
 * Schematic electrolytic capacitor: two plates with "+" beside positive plate.
 * P at (5,25), N at (85,25). Anchor (45,25).
 */

import React from 'react';
import { Group, Rect, Line, Circle, Text } from 'react-konva';
import type { SimComponent, Wire } from '../types';
import { normalizeRotation } from '../utils/transformPins';

const FP = { w: 90, h: 50, ax: 45, ay: 25 };
const P_PIN = { x: 5, y: 25 };
const N_PIN = { x: 85, y: 25 };
const PLATE_GAP = 20;
const PLATE_HALF = 10;
const PLATE_LEFT = FP.ax - PLATE_GAP / 2 - 2;
const PLATE_RIGHT = FP.ax + PLATE_GAP / 2 + 2;
const HIT_R = 12;
const VIS_R = 3;
const SW = 2;
const STROKE = '#e5e7eb';

export interface SchematicCapacitorPolarizedRendererProps {
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

export function SchematicCapacitorPolarizedRenderer({
  comp,
  isSelected,
  onSelect,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
}: SchematicCapacitorPolarizedRendererProps) {
  const pinPId = comp.pins?.find((p) => p.id === 'P' || p.id === '+' || p.id === 'pos')?.id ?? 'P';
  const pinNId = comp.pins?.find((p) => p.id === 'N' || p.id === '-' || p.id === 'neg')?.id ?? 'N';
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
      {/* Lead P -> left plate (positive side) */}
      <Line points={[P_PIN.x, P_PIN.y, PLATE_LEFT, P_PIN.y]} stroke={STROKE} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
      <Line points={[PLATE_LEFT, P_PIN.y - PLATE_HALF, PLATE_LEFT, P_PIN.y + PLATE_HALF]} stroke={STROKE} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
      <Line points={[PLATE_RIGHT, P_PIN.y - PLATE_HALF, PLATE_RIGHT, P_PIN.y + PLATE_HALF]} stroke={STROKE} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
      <Line points={[PLATE_RIGHT, P_PIN.y, N_PIN.x, N_PIN.y]} stroke={STROKE} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
      {/* "+" beside positive (left) plate */}
      <Text x={PLATE_LEFT - 14} y={P_PIN.y - 6} text="+" fontSize={12} fill={STROKE} listening={false} strokeScaleEnabled={false} />
      {/* Pin P */}
      <Circle x={P_PIN.x} y={P_PIN.y} radius={HIT_R} fill="transparent" stroke="transparent" strokeScaleEnabled={false} onClick={(e) => { e.cancelBubble = true; onPinClick(comp.id, pinPId, (e.evt as MouseEvent).shiftKey); }} onTap={(e) => { e.cancelBubble = true; onPinClick(comp.id, pinPId, (e.evt as MouseEvent).shiftKey); }} onPointerDown={(e) => { e.cancelBubble = true; onPinPointerDown?.(comp.id, pinPId); }} onPointerUp={(e) => { e.cancelBubble = true; onPinPointerUp?.(comp.id, pinPId); }} />
      <Circle x={P_PIN.x} y={P_PIN.y} radius={VIS_R} fill={STROKE} stroke={sel} strokeScaleEnabled={false} listening={false} />
      {/* Pin N */}
      <Circle x={N_PIN.x} y={N_PIN.y} radius={HIT_R} fill="transparent" stroke="transparent" strokeScaleEnabled={false} onClick={(e) => { e.cancelBubble = true; onPinClick(comp.id, pinNId, (e.evt as MouseEvent).shiftKey); }} onTap={(e) => { e.cancelBubble = true; onPinClick(comp.id, pinNId, (e.evt as MouseEvent).shiftKey); }} onPointerDown={(e) => { e.cancelBubble = true; onPinPointerDown?.(comp.id, pinNId); }} onPointerUp={(e) => { e.cancelBubble = true; onPinPointerUp?.(comp.id, pinNId); }} />
      <Circle x={N_PIN.x} y={N_PIN.y} radius={VIS_R} fill={STROKE} stroke={sel} strokeScaleEnabled={false} listening={false} />
    </Group>
  );
}
