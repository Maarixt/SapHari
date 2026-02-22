/**
 * Workbench Buzzer: round piezo-style body with two legs (P, N).
 * Footprint: 60x50, anchor (30,25). P at (18,45), N at (42,45).
 * Sound only when solver says audible (branch current + polarity).
 */

import React from 'react';
import { Group, Circle, Line, Rect, Text } from 'react-konva';
import type { SimComponent } from '../types';

const FP = { w: 60, h: 50, ax: 30, ay: 25 };
const P_PIN = { x: 18, y: 45 };
const N_PIN = { x: 42, y: 45 };
const BODY_CX = 30;
const BODY_CY = 20;
const BODY_R = 16;
const HOLE_R = 4;
const LEG_STROKE = '#9ca3af';
const LEG_PLUS = '#dc2626';
const LEG_MINUS = '#4b5563';
const LEG_SW = 2;
const HIT_R = 12;

const WIRE_MODE_RING_R = 12;
const WIRE_MODE_STROKE = '#e2e8f0';

export interface WorkbenchBuzzerRendererProps {
  comp: SimComponent;
  isSelected: boolean;
  onSelect: (id: string, shift?: boolean) => void;
  onDragEnd?: (compId: string, x: number, y: number) => void;
  onPinClick: (compId: string, pinId: string, shift?: boolean) => void;
  onPinPointerDown?: (compId: string, pinId: string) => void;
  onPinPointerUp?: (compId: string, pinId: string) => void;
  /** When true, draw wire-mode snap circles at P/N so they always align with the pads. */
  isWiringMode?: boolean;
}

export function WorkbenchBuzzerRenderer({
  comp,
  isSelected,
  onSelect,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
  isWiringMode = false,
}: WorkbenchBuzzerRendererProps) {
  const active = !!(comp.props?.active);
  const pinPId = comp.pins?.find((p) => p.id === 'P' || p.id === '+' || p.id === 'positive')?.id ?? 'P';
  const pinNId = comp.pins?.find((p) => p.id === 'N' || p.id === '-' || p.id === 'negative')?.id ?? 'N';

  const handleDragEnd = (e: { target: { x: () => number; y: () => number } }) => {
    if (onDragEnd) onDragEnd(comp.id, e.target.x(), e.target.y());
  };

  return (
    <Group
      x={comp.x}
      y={comp.y}
      offsetX={FP.ax}
      offsetY={FP.ay}
      draggable
      onDragEnd={handleDragEnd}
      onClick={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
    >
      <Rect x={0} y={0} width={FP.w} height={FP.h} fill="transparent" listening={true} />
      {/* Body: round can */}
      <Circle
        x={BODY_CX}
        y={BODY_CY}
        radius={BODY_R}
        fill="#1f2937"
        stroke={isSelected ? '#60a5fa' : '#374151'}
        strokeWidth={isSelected ? 2 : 1}
        strokeScaleEnabled={false}
        listening={false}
      />
      <Circle
        x={BODY_CX}
        y={BODY_CY}
        radius={HOLE_R}
        fill="#0f172a"
        strokeScaleEnabled={false}
        listening={false}
      />
      {active && (
        <Circle
          x={BODY_CX}
          y={BODY_CY}
          radius={BODY_R}
          stroke="#22c55e"
          strokeWidth={2}
          strokeScaleEnabled={false}
          listening={false}
        />
      )}
      {/* Legs: red tip for +, dark for − */}
      <Line
        points={[BODY_CX - 6, BODY_CY + 12, P_PIN.x, P_PIN.y]}
        stroke={LEG_PLUS}
        strokeWidth={LEG_SW}
        lineCap="round"
        strokeScaleEnabled={false}
        listening={false}
      />
      <Line
        points={[BODY_CX + 6, BODY_CY + 12, N_PIN.x, N_PIN.y]}
        stroke={LEG_MINUS}
        strokeWidth={LEG_SW}
        lineCap="round"
        strokeScaleEnabled={false}
        listening={false}
      />
      <Text x={P_PIN.x - 6} y={P_PIN.y - 12} text="+" fontSize={9} fill="#9ca3af" listening={false} strokeScaleEnabled={false} />
      <Text x={N_PIN.x - 4} y={N_PIN.y - 12} text="−" fontSize={9} fill="#9ca3af" listening={false} strokeScaleEnabled={false} />
      {/* Pin hit areas */}
      <Circle
        x={P_PIN.x}
        y={P_PIN.y}
        radius={HIT_R}
        opacity={0}
        onClick={(e) => {
          e.cancelBubble = true;
          onPinClick(comp.id, pinPId, (e.evt as MouseEvent).shiftKey);
        }}
        onPointerDown={(e) => {
          e.cancelBubble = true;
          onPinPointerDown?.(comp.id, pinPId);
        }}
        onPointerUp={(e) => {
          e.cancelBubble = true;
          onPinPointerUp?.(comp.id, pinPId);
        }}
      />
      <Circle
        x={N_PIN.x}
        y={N_PIN.y}
        radius={HIT_R}
        opacity={0}
        onClick={(e) => {
          e.cancelBubble = true;
          onPinClick(comp.id, pinNId, (e.evt as MouseEvent).shiftKey);
        }}
        onPointerDown={(e) => {
          e.cancelBubble = true;
          onPinPointerDown?.(comp.id, pinNId);
        }}
        onPointerUp={(e) => {
          e.cancelBubble = true;
          onPinPointerUp?.(comp.id, pinNId);
        }}
      />
      {/* Visible pads: + red accent, − gray */}
      <Circle x={P_PIN.x} y={P_PIN.y} radius={6} fill="#374151" stroke={LEG_PLUS} strokeWidth={1.5} strokeScaleEnabled={false} listening={false} />
      <Circle x={N_PIN.x} y={N_PIN.y} radius={6} fill="#374151" stroke={LEG_MINUS} strokeWidth={1} strokeScaleEnabled={false} listening={false} />
      {/* Wire-mode snap circles: same positions as pads so they always align */}
      {isWiringMode && (
        <>
          <Circle x={P_PIN.x} y={P_PIN.y} radius={WIRE_MODE_RING_R} stroke={WIRE_MODE_STROKE} strokeWidth={2} opacity={0.9} listening={false} strokeScaleEnabled={false} />
          <Circle x={N_PIN.x} y={N_PIN.y} radius={WIRE_MODE_RING_R} stroke={WIRE_MODE_STROKE} strokeWidth={2} opacity={0.9} listening={false} strokeScaleEnabled={false} />
        </>
      )}
    </Group>
  );
}
