/**
 * Workbench electrolytic capacitor: cylinder with negative stripe, pins P (+) and N (−).
 * Footprint: 90x50, anchor (45,25). P at (10,25), N at (80,25).
 * Shows damage/reversed state when output from solver indicates it.
 */

import React from 'react';
import { Group, Rect, Line, Circle, Text } from 'react-konva';
import type { SimComponent } from '../types';
import { normalizeRotation } from '../utils/transformPins';

const FP = { w: 90, h: 50, ax: 45, ay: 25 };
const P_PIN = { x: 10, y: 25 };
const N_PIN = { x: 80, y: 25 };
const BODY_LEFT = 22;
const BODY_RIGHT = 68;
const BODY_TOP = 10;
const BODY_BOT = 40;
const LEG_STROKE = '#9ca3af';
const LEG_PLUS = '#dc2626';
const LEG_MINUS = '#4b5563';
const LEG_SW = 2;
const HIT_R = 12;
const STRIPE_WIDTH = 8;
const WIRE_MODE_RING_R = 12;

export interface CapacitorOutputLike {
  reversed?: boolean;
  damaged?: boolean;
}

export interface WorkbenchCapacitorPolarizedRendererProps {
  comp: SimComponent;
  isSelected: boolean;
  onSelect: (id: string, shift?: boolean) => void;
  onDragEnd?: (compId: string, x: number, y: number, evt?: MouseEvent) => void;
  onPinClick: (compId: string, pinId: string, shift?: boolean) => void;
  onPinPointerDown?: (compId: string, pinId: string) => void;
  onPinPointerUp?: (compId: string, pinId: string) => void;
  isWiringMode?: boolean;
  /** From solver: reversed polarity or damaged for UX (e.g. red glow). */
  capOutput?: CapacitorOutputLike;
}

export function WorkbenchCapacitorPolarizedRenderer({
  comp,
  isSelected,
  onSelect,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
  isWiringMode = false,
  capOutput,
}: WorkbenchCapacitorPolarizedRendererProps) {
  const pinPId = comp.pins?.find((p) => p.id === 'P' || p.id === '+' || p.id === 'pos')?.id ?? 'P';
  const pinNId = comp.pins?.find((p) => p.id === 'N' || p.id === '-' || p.id === 'neg')?.id ?? 'N';
  const flipX = !!comp.flipX;
  const flipY = !!comp.flipY;
  const reversed = !!capOutput?.reversed;
  const damaged = !!capOutput?.damaged;
  const showDamage = reversed || damaged;

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
      {/* Leads: + red, − dark */}
      <Line points={[P_PIN.x, P_PIN.y, BODY_LEFT, P_PIN.y]} stroke={LEG_PLUS} strokeWidth={LEG_SW} lineCap="round" strokeScaleEnabled={false} listening={false} />
      <Line points={[BODY_RIGHT, P_PIN.y, N_PIN.x, N_PIN.y]} stroke={LEG_MINUS} strokeWidth={LEG_SW} lineCap="round" strokeScaleEnabled={false} listening={false} />
      {/* Cylinder body (rounded rect) */}
      <Rect
        x={BODY_LEFT}
        y={BODY_TOP}
        width={BODY_RIGHT - BODY_LEFT}
        height={BODY_BOT - BODY_TOP}
        fill={showDamage ? '#6b7280' : '#c4b8a8'}
        stroke={showDamage ? '#dc2626' : isSelected ? '#60a5fa' : '#9ca3af'}
        strokeWidth={isSelected ? 2 : 1}
        cornerRadius={14}
        strokeScaleEnabled={false}
        listening={false}
      />
      {/* Negative stripe (left side of body) */}
      <Rect
        x={BODY_LEFT + 2}
        y={BODY_TOP + 2}
        width={STRIPE_WIDTH}
        height={BODY_BOT - BODY_TOP - 4}
        fill="#374151"
        cornerRadius={2}
        strokeScaleEnabled={false}
        listening={false}
      />
      {/* + label near positive lead */}
      <Text x={BODY_LEFT - 6} y={BODY_TOP + 10} text="+" fontSize={10} fill="#1f2937" listening={false} strokeScaleEnabled={false} />
      {showDamage && (
        <Rect
          x={BODY_LEFT}
          y={BODY_TOP}
          width={BODY_RIGHT - BODY_LEFT}
          height={BODY_BOT - BODY_TOP}
          cornerRadius={14}
          stroke="#dc2626"
          strokeWidth={2}
          opacity={0.4}
          listening={false}
          strokeScaleEnabled={false}
        />
      )}
      {/* Pin hit areas */}
      <Circle
        x={P_PIN.x}
        y={P_PIN.y}
        radius={HIT_R}
        opacity={0}
        onClick={(e) => { e.cancelBubble = true; onPinClick(comp.id, pinPId, (e.evt as MouseEvent).shiftKey); }}
        onTap={(e) => { e.cancelBubble = true; onPinClick(comp.id, pinPId, (e.evt as MouseEvent).shiftKey); }}
        onPointerDown={(e) => { e.cancelBubble = true; onPinPointerDown?.(comp.id, pinPId); }}
        onPointerUp={(e) => { e.cancelBubble = true; onPinPointerUp?.(comp.id, pinPId); }}
      />
      <Circle x={P_PIN.x} y={P_PIN.y} radius={4} fill="#374151" stroke={LEG_PLUS} strokeWidth={1} strokeScaleEnabled={false} listening={false} />
      <Circle
        x={N_PIN.x}
        y={N_PIN.y}
        radius={HIT_R}
        opacity={0}
        onClick={(e) => { e.cancelBubble = true; onPinClick(comp.id, pinNId, (e.evt as MouseEvent).shiftKey); }}
        onTap={(e) => { e.cancelBubble = true; onPinClick(comp.id, pinNId, (e.evt as MouseEvent).shiftKey); }}
        onPointerDown={(e) => { e.cancelBubble = true; onPinPointerDown?.(comp.id, pinNId); }}
        onPointerUp={(e) => { e.cancelBubble = true; onPinPointerUp?.(comp.id, pinNId); }}
      />
      <Circle x={N_PIN.x} y={N_PIN.y} radius={4} fill="#374151" stroke={LEG_MINUS} strokeWidth={1} strokeScaleEnabled={false} listening={false} />
      {isWiringMode && (
        <>
          <Circle x={P_PIN.x} y={P_PIN.y} radius={WIRE_MODE_RING_R} stroke="#e2e8f0" strokeWidth={2} opacity={0.9} listening={false} strokeScaleEnabled={false} />
          <Circle x={N_PIN.x} y={N_PIN.y} radius={WIRE_MODE_RING_R} stroke="#e2e8f0" strokeWidth={2} opacity={0.9} listening={false} strokeScaleEnabled={false} />
        </>
      )}
    </Group>
  );
}
