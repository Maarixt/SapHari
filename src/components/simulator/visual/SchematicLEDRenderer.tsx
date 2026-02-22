/**
 * Schematic LED: textbook diode symbol.
 * Footprint: 80x40, anchor (40,20). A at (5,20), K at (75,20).
 *
 * Geometry:
 * - Terminal lines: (5,20)→(25,20) and (50,20)→(75,20)
 * - Triangle: (25,10), (25,30), (50,20) — apex touches cathode bar
 * - Cathode bar: x=50, y 10..30 (adjacent to triangle tip)
 * - Light arrows: two arrows with arrowheads, pointing up-right
 *
 * Styling: stroke #e5e7eb, strokeWidth 2, no fill, no glow.
 * Terminals: invisible hit r=10 at line ends; small clean dots only.
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
// Terminal line ends at body
const T_LEFT = 25;
const T_RIGHT = 50;
// Triangle: (25,10), (25,30), (50,20) — apex at cathode bar
const T1 = { x: 25, y: 10 };
const T2 = { x: 25, y: 30 };
const T3 = { x: 50, y: 20 };
// Cathode bar: x=50, y 10..30 (touches triangle apex)
const CBAR_X = 50;
const CBAR_TOP = 10;
const CBAR_BOT = 30;

const LED_COLOR_MAP: Record<string, string> = {
  red: '#ef4444',
  green: '#22c55e',
  blue: '#3b82f6',
  yellow: '#eab308',
  orange: '#f97316',
  purple: '#a855f7',
  white: '#f8fafc',
};

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
  /** When provided, LED on state is derived from net voltages (forward bias). */
  pinToNetId?: Map<string, string> | Record<string, string>;
  netVoltageById?: Record<string, number> | Map<string, number>;
}

export function SchematicLEDRenderer({
  comp,
  isSelected,
  onSelect,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
  pinToNetId,
  netVoltageById,
}: Props) {
  const ledStatus = comp.props?.ledStatus as string | undefined;
  // LED on only from engine (branch current). No voltage fallback.
  const on = comp.props?.on === true;
  const isBurned = ledStatus === 'burned';
  const isDamaged = ledStatus === 'damaged';
  const isOvercurrent = ledStatus === 'overcurrent';
  const anodeId = comp.pins[0]?.id ?? 'anode';
  const cathodeId = comp.pins[1]?.id ?? 'cathode';
  const flipX = !!comp.flipX;
  const selStroke = isSelected ? '#60a5fa' : STROKE;
  const diodeStroke = isBurned
    ? '#7f1d1d'
    : on
      ? (LED_COLOR_MAP[(comp.props?.color as string) ?? 'red'] ?? '#ef4444')
      : STROKE;

  const content = (
    <>
      {/* Body hit area: click selects only */}
      <Rect
        x={0}
        y={0}
        width={FP.w}
        height={FP.h}
        fill="transparent"
        onClick={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
        onTap={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
      />

      {/* Terminal line A: (5,20) to (25,20) */}
      <Line
        points={[A.x, A.y, T_LEFT, A.y]}
        stroke={STROKE}
        strokeWidth={SW}
        lineCap="round"
        strokeScaleEnabled={false}
        listening={false}
      />

      {/* Terminal line K: (50,20) to (75,20) */}
      <Line
        points={[T_RIGHT, K.y, K.x, K.y]}
        stroke={STROKE}
        strokeWidth={SW}
        lineCap="round"
        strokeScaleEnabled={false}
        listening={false}
      />

      {/* Diode triangle: (25,10), (25,30), (50,20) — apex touches cathode bar */}
      <Line
        points={[T1.x, T1.y, T2.x, T2.y, T3.x, T3.y, T1.x, T1.y]}
        closed
        stroke={diodeStroke}
        strokeWidth={SW}
        lineCap="round"
        lineJoin="round"
        strokeScaleEnabled={false}
        listening={false}
        opacity={isBurned ? 0.4 : isDamaged ? 0.7 : 1}
      />

      {/* Cathode bar: x=50, y 10..30 (adjacent to triangle tip) */}
      <Line
        points={[CBAR_X, CBAR_TOP, CBAR_X, CBAR_BOT]}
        stroke={diodeStroke}
        strokeWidth={SW}
        lineCap="round"
        strokeScaleEnabled={false}
        listening={false}
        opacity={isBurned ? 0.4 : isDamaged ? 0.7 : 1}
      />

      {/* Light arrows: shaft + arrowhead, pointing up-right */}
      <Line
        points={[33, 16, 38, 12]}
        stroke={STROKE}
        strokeWidth={1.5}
        lineCap="round"
        strokeScaleEnabled={false}
        listening={false}
      />
      <Line
        points={[38, 12, 35, 13.5, 36, 14.5, 38, 12]}
        closed
        stroke={STROKE}
        strokeWidth={1}
        lineJoin="miter"
        strokeScaleEnabled={false}
        listening={false}
      />
      <Line
        points={[36, 18, 41, 14]}
        stroke={STROKE}
        strokeWidth={1.5}
        lineCap="round"
        strokeScaleEnabled={false}
        listening={false}
      />
      <Line
        points={[41, 14, 38, 15.5, 39, 16.5, 41, 14]}
        closed
        stroke={STROKE}
        strokeWidth={1}
        lineJoin="miter"
        strokeScaleEnabled={false}
        listening={false}
      />

      <Group scaleX={flipX ? -1 : 1} offsetX={FP.ax} x={FP.ax}>
        <Text x={A.x - 2} y={A.y - 12} text="A (+)" fontSize={8} fill={STROKE} listening={false} strokeScaleEnabled={false} />
        <Text x={K.x - 14} y={K.y - 12} text="K (−)" fontSize={8} fill={STROKE} listening={false} strokeScaleEnabled={false} />
      </Group>

      {/* Status badge: overcurrent / damaged / burned */}
      {(isOvercurrent || isDamaged || isBurned) && (
        <Text
          x={CBAR_X + 6}
          y={CBAR_TOP - 2}
          text={isBurned ? 'Burned' : isDamaged ? 'Damaged' : '!'}
          fontSize={7}
          fill={isBurned ? '#7f1d1d' : isDamaged ? '#c2410c' : '#b45309'}
          listening={false}
          strokeScaleEnabled={false}
        />
      )}

      {/* Terminal A — hit zone and small clean dot at line end */}
      <Circle
        x={A.x}
        y={A.y}
        radius={HIT_R}
        opacity={0}
        onClick={(e) => {
          e.cancelBubble = true;
          onPinClick(comp.id, anodeId, (e.evt as MouseEvent).shiftKey);
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onPinClick(comp.id, anodeId, (e.evt as MouseEvent).shiftKey);
        }}
        onPointerDown={(e) => {
          e.cancelBubble = true;
          onPinPointerDown?.(comp.id, anodeId);
        }}
        onPointerUp={(e) => {
          e.cancelBubble = true;
          onPinPointerUp?.(comp.id, anodeId);
        }}
      />
      <Circle
        x={A.x}
        y={A.y}
        radius={DOT_R}
        fill={selStroke}
        strokeScaleEnabled={false}
        listening={false}
      />

      {/* Terminal K — hit zone and small clean dot at line end */}
      <Circle
        x={K.x}
        y={K.y}
        radius={HIT_R}
        opacity={0}
        onClick={(e) => {
          e.cancelBubble = true;
          onPinClick(comp.id, cathodeId, (e.evt as MouseEvent).shiftKey);
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onPinClick(comp.id, cathodeId, (e.evt as MouseEvent).shiftKey);
        }}
        onPointerDown={(e) => {
          e.cancelBubble = true;
          onPinPointerDown?.(comp.id, cathodeId);
        }}
        onPointerUp={(e) => {
          e.cancelBubble = true;
          onPinPointerUp?.(comp.id, cathodeId);
        }}
      />
      <Circle
        x={K.x}
        y={K.y}
        radius={DOT_R}
        fill={selStroke}
        strokeScaleEnabled={false}
        listening={false}
      />
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
      <Group x={0} y={0}>
        {content}
      </Group>
    </Group>
  );
}
