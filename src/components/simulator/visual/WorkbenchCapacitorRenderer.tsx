/**
 * Workbench capacitor (non-polar): ceramic/disk style body, two pins a and b.
 * Footprint: 90x50, anchor (45,25). Pins a (10,25), b (80,25).
 */

import React from 'react';
import { Group, Rect, Line, Circle } from 'react-konva';
import type { SimComponent } from '../types';
import { normalizeRotation } from '../utils/transformPins';

const FP = { w: 90, h: 50, ax: 45, ay: 25 };
const PA = { x: 10, y: 25 };
const PB = { x: 80, y: 25 };
const BODY_LEFT = 22;
const BODY_RIGHT = 68;
const BODY_TOP = 15;
const BODY_BOT = 35;
const LEG_STROKE = '#9ca3af';
const LEG_SW = 2;
const HIT_R = 12;

export interface WorkbenchCapacitorRendererProps {
  comp: SimComponent;
  isSelected: boolean;
  onSelect: (id: string, shift?: boolean) => void;
  onDragEnd?: (compId: string, x: number, y: number, evt?: MouseEvent) => void;
  onPinClick: (compId: string, pinId: string, shift?: boolean) => void;
  onPinPointerDown?: (compId: string, pinId: string) => void;
  onPinPointerUp?: (compId: string, pinId: string) => void;
  isWiringMode?: boolean;
}

export function WorkbenchCapacitorRenderer({
  comp,
  isSelected,
  onSelect,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
  isWiringMode = false,
}: WorkbenchCapacitorRendererProps) {
  const pinAId = comp.pins?.find((p) => p.id === 'a')?.id ?? comp.pins[0]?.id ?? 'a';
  const pinBId = comp.pins?.find((p) => p.id === 'b')?.id ?? comp.pins[1]?.id ?? 'b';
  const flipX = !!comp.flipX;
  const flipY = !!comp.flipY;
  const WIRE_MODE_RING_R = 12;

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
      onDragEnd={(e) => onDragEnd?.(comp.id, e.target.x(), e.target.y(), e.evt as MouseEvent)}
      onClick={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
      onTap={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
    >
      <Rect x={0} y={0} width={FP.w} height={FP.h} fill="transparent" listening={true} />
      {/* Leads */}
      <Line points={[PA.x, PA.y, BODY_LEFT, PA.y]} stroke={LEG_STROKE} strokeWidth={LEG_SW} lineCap="round" strokeScaleEnabled={false} listening={false} />
      <Line points={[BODY_RIGHT, PA.y, PB.x, PB.y]} stroke={LEG_STROKE} strokeWidth={LEG_SW} lineCap="round" strokeScaleEnabled={false} listening={false} />
      {/* Body: small rectangle (ceramic cap style) */}
      <Rect
        x={BODY_LEFT}
        y={BODY_TOP}
        width={BODY_RIGHT - BODY_LEFT}
        height={BODY_BOT - BODY_TOP}
        fill="#e5e7eb"
        stroke={isSelected ? '#60a5fa' : '#9ca3af'}
        strokeWidth={isSelected ? 2 : 1}
        cornerRadius={2}
        strokeScaleEnabled={false}
        listening={false}
      />
      {/* Pin hit areas */}
      <Circle
        x={PA.x}
        y={PA.y}
        radius={HIT_R}
        opacity={0}
        onClick={(e) => { e.cancelBubble = true; onPinClick(comp.id, pinAId, (e.evt as MouseEvent).shiftKey); }}
        onTap={(e) => { e.cancelBubble = true; onPinClick(comp.id, pinAId, (e.evt as MouseEvent).shiftKey); }}
        onPointerDown={(e) => { e.cancelBubble = true; onPinPointerDown?.(comp.id, pinAId); }}
        onPointerUp={(e) => { e.cancelBubble = true; onPinPointerUp?.(comp.id, pinAId); }}
      />
      <Circle x={PA.x} y={PA.y} radius={4} fill={LEG_STROKE} stroke={isSelected ? '#60a5fa' : '#94a3b8'} strokeWidth={1} strokeScaleEnabled={false} listening={false} />
      <Circle
        x={PB.x}
        y={PB.y}
        radius={HIT_R}
        opacity={0}
        onClick={(e) => { e.cancelBubble = true; onPinClick(comp.id, pinBId, (e.evt as MouseEvent).shiftKey); }}
        onTap={(e) => { e.cancelBubble = true; onPinClick(comp.id, pinBId, (e.evt as MouseEvent).shiftKey); }}
        onPointerDown={(e) => { e.cancelBubble = true; onPinPointerDown?.(comp.id, pinBId); }}
        onPointerUp={(e) => { e.cancelBubble = true; onPinPointerUp?.(comp.id, pinBId); }}
      />
      <Circle x={PB.x} y={PB.y} radius={4} fill={LEG_STROKE} stroke={isSelected ? '#60a5fa' : '#94a3b8'} strokeWidth={1} strokeScaleEnabled={false} listening={false} />
      {isWiringMode && (
        <>
          <Circle x={PA.x} y={PA.y} radius={WIRE_MODE_RING_R} stroke="#e2e8f0" strokeWidth={2} opacity={0.9} listening={false} strokeScaleEnabled={false} />
          <Circle x={PB.x} y={PB.y} radius={WIRE_MODE_RING_R} stroke="#e2e8f0" strokeWidth={2} opacity={0.9} listening={false} strokeScaleEnabled={false} />
        </>
      )}
    </Group>
  );
}
