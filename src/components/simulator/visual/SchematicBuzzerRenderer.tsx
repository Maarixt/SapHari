/**
 * Schematic Buzzer: standard half-circle (dome) symbol, two pins left/right, "+" polarity marking.
 * Footprint: 50x40, anchor (25,20). P at (5,20), N at (45,20).
 */

import React from 'react';
import { Group, Circle, Line, Rect, Text } from 'react-konva';
import type { SimComponent, Wire } from '../types';

const HIT_R = 12;
const VIS_R = 3;
const SW = 2;
const STROKE = '#e5e7eb';

const FP = { w: 50, h: 40, ax: 25, ay: 20 };
const P_PIN = { x: 5, y: 20 };
const N_PIN = { x: 45, y: 20 };
const DOME_LEFT = 15;
const DOME_RIGHT = 35;
const DOME_CX = 25;
const DOME_CY = 20;
const DOME_R = 10;

// Top semicircle points: from (DOME_RIGHT,20) over the top to (DOME_LEFT,20)
function getSemicirclePoints(): number[] {
  const pts: number[] = [];
  for (let i = 0; i <= 12; i++) {
    const angle = (i / 12) * Math.PI;
    pts.push(DOME_CX + DOME_R * Math.cos(angle), DOME_CY - DOME_R * Math.sin(angle));
  }
  return pts;
}

const SEMICIRCLE = getSemicirclePoints();

export interface SchematicBuzzerRendererProps {
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

export function SchematicBuzzerRenderer({
  comp,
  isSelected,
  onSelect,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
}: SchematicBuzzerRendererProps) {
  const pinPId = comp.pins?.find((p) => p.id === 'P' || p.id === '+' || p.id === 'positive')?.id ?? 'P';
  const pinNId = comp.pins?.find((p) => p.id === 'N' || p.id === '-' || p.id === 'negative')?.id ?? 'N';
  const selStroke = isSelected ? '#60a5fa' : STROKE;

  return (
    <Group
      x={comp.x}
      y={comp.y}
      offsetX={FP.ax}
      offsetY={FP.ay}
      draggable
      onDragEnd={(e) => onDragEnd(comp.id, e.target.x(), e.target.y())}
      onClick={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
    >
      <Rect x={0} y={0} width={FP.w} height={FP.h} fill="transparent" listening={true} />
      {/* P terminal wire */}
      <Line
        points={[P_PIN.x, P_PIN.y, DOME_LEFT, P_PIN.y]}
        stroke={STROKE}
        strokeWidth={SW}
        strokeScaleEnabled={false}
        listening={false}
      />
      {/* Dome: semicircle */}
      <Line
        points={SEMICIRCLE}
        stroke={STROKE}
        strokeWidth={SW}
        strokeScaleEnabled={false}
        closed={false}
        listening={false}
      />
      {/* N terminal wire */}
      <Line
        points={[DOME_RIGHT, N_PIN.y, N_PIN.x, N_PIN.y]}
        stroke={STROKE}
        strokeWidth={SW}
        strokeScaleEnabled={false}
        listening={false}
      />
      {/* Polarity "+" near P */}
      <Text
        x={P_PIN.x - 2}
        y={P_PIN.y - 14}
        text="+"
        fontSize={10}
        fill={STROKE}
        listening={false}
        strokeScaleEnabled={false}
      />
      {/* Label */}
      <Text
        x={0}
        y={22}
        width={FP.w}
        text="BZ"
        fontSize={8}
        fill={STROKE}
        align="center"
        listening={false}
        strokeScaleEnabled={false}
      />
      {/* Pin P hit + visible */}
      <Circle
        x={P_PIN.x}
        y={P_PIN.y}
        radius={HIT_R}
        fill="transparent"
        stroke="transparent"
        strokeScaleEnabled={false}
        onClick={(e) => {
          e.cancelBubble = true;
          onPinClick(comp.id, pinPId, (e.evt as MouseEvent).shiftKey);
        }}
        onTap={(e) => {
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
        x={P_PIN.x}
        y={P_PIN.y}
        radius={VIS_R}
        fill={STROKE}
        stroke={selStroke}
        strokeWidth={1}
        strokeScaleEnabled={false}
        listening={false}
      />
      {/* Pin N hit + visible */}
      <Circle
        x={N_PIN.x}
        y={N_PIN.y}
        radius={HIT_R}
        fill="transparent"
        stroke="transparent"
        strokeScaleEnabled={false}
        onClick={(e) => {
          e.cancelBubble = true;
          onPinClick(comp.id, pinNId, (e.evt as MouseEvent).shiftKey);
        }}
        onTap={(e) => {
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
      <Circle
        x={N_PIN.x}
        y={N_PIN.y}
        radius={VIS_R}
        fill={STROKE}
        stroke={selStroke}
        strokeWidth={1}
        strokeScaleEnabled={false}
        listening={false}
      />
    </Group>
  );
}
