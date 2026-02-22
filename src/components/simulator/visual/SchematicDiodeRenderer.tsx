/**
 * Schematic diode: standard symbol (triangle anode, bar cathode). No light rays.
 * Footprint: 80x40, anchor (40,20). A at (5,20), K at (75,20).
 */

import React from 'react';
import { Group, Circle, Line, Rect, Text } from 'react-konva';
import type { SimComponent, Wire } from '../types';

const HIT_R = 10;
const DOT_R = 2;
const SW = 2;
const STROKE = '#e5e7eb';

const FP = { w: 80, h: 40, ax: 40, ay: 20 };
const A = { x: 5, y: 20 };
const K = { x: 75, y: 20 };
const T_LEFT = 25;
const T_RIGHT = 50;
const T1 = { x: 25, y: 10 };
const T2 = { x: 25, y: 30 };
const T3 = { x: 50, y: 20 };
const CBAR_X = 50;
const CBAR_TOP = 10;
const CBAR_BOT = 30;

export interface Props {
  comp: SimComponent;
  simState: { components: SimComponent[]; wires: Wire[] };
  isSelected: boolean;
  onSelect: (id: string, shift?: boolean) => void;
  onDelete: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onPinClick: (compId: string, pinId: string, shift?: boolean) => void;
  onPinPointerDown?: (compId: string, pinId: string) => void;
  onPinPointerUp?: (compId: string, pinId: string) => void;
  /** Optional: when ON, use slightly brighter stroke. */
  diodeState?: 'OFF' | 'ON' | 'BREAKDOWN';
}

export function SchematicDiodeRenderer({
  comp,
  isSelected,
  onSelect,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
  diodeState = 'OFF',
}: Props) {
  const anodeId = comp.pins[0]?.id ?? 'A';
  const cathodeId = comp.pins[1]?.id ?? 'K';
  const flipX = !!comp.flipX;
  const selStroke = isSelected ? '#60a5fa' : STROKE;
  const stroke = diodeState === 'ON' ? '#94a3b8' : diodeState === 'BREAKDOWN' ? '#f59e0b' : STROKE;

  const content = (
    <>
      <Rect
        x={0}
        y={0}
        width={FP.w}
        height={FP.h}
        fill="transparent"
        onClick={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
        onTap={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
      />
      <Line points={[A.x, A.y, T_LEFT, A.y]} stroke={STROKE} strokeWidth={SW} lineCap="round" strokeScaleEnabled={false} listening={false} />
      <Line points={[T_RIGHT, K.y, K.x, K.y]} stroke={STROKE} strokeWidth={SW} lineCap="round" strokeScaleEnabled={false} listening={false} />
      <Line
        points={[T1.x, T1.y, T2.x, T2.y, T3.x, T3.y, T1.x, T1.y]}
        closed
        stroke={stroke}
        strokeWidth={SW}
        lineCap="round"
        lineJoin="round"
        strokeScaleEnabled={false}
        listening={false}
      />
      <Line points={[CBAR_X, CBAR_TOP, CBAR_X, CBAR_BOT]} stroke={stroke} strokeWidth={SW} lineCap="round" strokeScaleEnabled={false} listening={false} />
      <Group scaleX={flipX ? -1 : 1} offsetX={FP.ax} x={FP.ax}>
        <Text x={A.x - 2} y={A.y - 12} text="A" fontSize={8} fill={STROKE} listening={false} strokeScaleEnabled={false} />
        <Text x={K.x - 8} y={K.y - 12} text="K" fontSize={8} fill={STROKE} listening={false} strokeScaleEnabled={false} />
      </Group>
      <Circle
        x={A.x}
        y={A.y}
        radius={HIT_R}
        opacity={0}
        onClick={(e) => { e.cancelBubble = true; onPinClick(comp.id, anodeId, (e.evt as MouseEvent).shiftKey); }}
        onTap={(e) => { e.cancelBubble = true; onPinClick(comp.id, anodeId, (e.evt as MouseEvent).shiftKey); }}
        onPointerDown={(e) => { e.cancelBubble = true; onPinPointerDown?.(comp.id, anodeId); }}
        onPointerUp={(e) => { e.cancelBubble = true; onPinPointerUp?.(comp.id, anodeId); }}
      />
      <Circle x={A.x} y={A.y} radius={DOT_R} fill={selStroke} strokeScaleEnabled={false} listening={false} />
      <Circle
        x={K.x}
        y={K.y}
        radius={HIT_R}
        opacity={0}
        onClick={(e) => { e.cancelBubble = true; onPinClick(comp.id, cathodeId, (e.evt as MouseEvent).shiftKey); }}
        onTap={(e) => { e.cancelBubble = true; onPinClick(comp.id, cathodeId, (e.evt as MouseEvent).shiftKey); }}
        onPointerDown={(e) => { e.cancelBubble = true; onPinPointerDown?.(comp.id, cathodeId); }}
        onPointerUp={(e) => { e.cancelBubble = true; onPinPointerUp?.(comp.id, cathodeId); }}
      />
      <Circle x={K.x} y={K.y} radius={DOT_R} fill={selStroke} strokeScaleEnabled={false} listening={false} />
    </>
  );

  return (
    <Group
      x={comp.x}
      y={comp.y}
      offsetX={FP.ax}
      offsetY={FP.ay}
      scaleX={flipX ? -1 : 1}
      draggable
      onDragEnd={(e) => onDragEnd(comp.id, e.target.x(), e.target.y())}
      onClick={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
      onTap={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
    >
      <Group x={0} y={0}>{content}</Group>
    </Group>
  );
}
