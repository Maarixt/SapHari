/**
 * Schematic Solar Panel: rectangle with sun rays, P+ and P− terminals.
 * Optional live V / I / P from solve result.
 */

import React from 'react';
import { Group, Circle, Line, Rect, Text } from 'react-konva';
import type { SimComponent, Wire } from '../types';

const HIT_R = 12;
const DOT_R = 2;
const SW = 2;
const STROKE = '#e5e7eb';

const FP = { w: 90, h: 50, ax: 45, ay: 25 };
const P = { x: 5, y: 25 };
const N = { x: 85, y: 25 };
const RECT_X = 25;
const RECT_Y = 10;
const RECT_W = 40;
const RECT_H = 30;

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
  /** Optional live V, I, P from solver. */
  pvOutput?: { v: number; i: number; p: number };
}

export function SchematicSolarPanelRenderer({
  comp,
  isSelected,
  onSelect,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
  pvOutput,
}: Props) {
  const posPin = comp.pins[0]?.id ?? 'pos';
  const negPin = comp.pins[1]?.id ?? 'neg';
  const irradiance = (comp.props?.irradiance as number) ?? 700;
  const dim = irradiance <= 0;
  const selStroke = isSelected ? '#60a5fa' : STROKE;
  const stroke = dim ? '#6b7280' : STROKE;

  const sunRays = [
    { x1: 35, y1: 12, x2: 38, y2: 8 },
    { x1: 45, y1: 8, x2: 45, y2: 5 },
    { x1: 55, y1: 12, x2: 52, y2: 8 },
    { x1: 58, y1: 20, x2: 62, y2: 20 },
    { x1: 55, y1: 28, x2: 52, y2: 32 },
    { x1: 45, y1: 32, x2: 45, y2: 35 },
    { x1: 35, y1: 28, x2: 38, y2: 32 },
    { x1: 32, y1: 20, x2: 28, y2: 20 },
  ];

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
      <Line points={[P.x, P.y, RECT_X, P.y]} stroke={stroke} strokeWidth={SW} lineCap="round" strokeScaleEnabled={false} listening={false} />
      <Line points={[RECT_X + RECT_W, N.y, N.x, N.y]} stroke={stroke} strokeWidth={SW} lineCap="round" strokeScaleEnabled={false} listening={false} />
      <Rect x={RECT_X} y={RECT_Y} width={RECT_W} height={RECT_H} stroke={stroke} strokeWidth={SW} listening={false} />
      {sunRays.map((r, i) => (
        <Line key={i} points={[r.x1, r.y1, r.x2, r.y2]} stroke={stroke} strokeWidth={1} lineCap="round" strokeScaleEnabled={false} listening={false} />
      ))}
      <Text x={RECT_X + 8} y={RECT_Y + 8} text="PV" fontSize={10} fill={stroke} listening={false} strokeScaleEnabled={false} />
      {pvOutput != null && (
        <Text x={RECT_X} y={RECT_Y + 18} text={`V=${pvOutput.v.toFixed(2)} I=${pvOutput.i.toFixed(3)} P=${pvOutput.p.toFixed(2)}`} fontSize={7} fill={stroke} listening={false} strokeScaleEnabled={false} />
      )}
      <Circle
        x={P.x}
        y={P.y}
        radius={HIT_R}
        opacity={0}
        onClick={(e) => { e.cancelBubble = true; onPinClick(comp.id, posPin, (e.evt as MouseEvent).shiftKey); }}
        onTap={(e) => { e.cancelBubble = true; onPinClick(comp.id, posPin, (e.evt as MouseEvent).shiftKey); }}
        onPointerDown={(e) => { e.cancelBubble = true; onPinPointerDown?.(comp.id, posPin); }}
        onPointerUp={(e) => { e.cancelBubble = true; onPinPointerUp?.(comp.id, posPin); }}
      />
      <Circle x={P.x} y={P.y} radius={DOT_R} fill={selStroke} strokeScaleEnabled={false} listening={false} />
      <Circle
        x={N.x}
        y={N.y}
        radius={HIT_R}
        opacity={0}
        onClick={(e) => { e.cancelBubble = true; onPinClick(comp.id, negPin, (e.evt as MouseEvent).shiftKey); }}
        onTap={(e) => { e.cancelBubble = true; onPinClick(comp.id, negPin, (e.evt as MouseEvent).shiftKey); }}
        onPointerDown={(e) => { e.cancelBubble = true; onPinPointerDown?.(comp.id, negPin); }}
        onPointerUp={(e) => { e.cancelBubble = true; onPinPointerUp?.(comp.id, negPin); }}
      />
      <Circle x={N.x} y={N.y} radius={DOT_R} fill={selStroke} strokeScaleEnabled={false} listening={false} />
    </>
  );

  return (
    <Group
      x={comp.x}
      y={comp.y}
      offsetX={FP.ax}
      offsetY={FP.ay}
      scaleX={comp.flipX ? -1 : 1}
      draggable
      onDragEnd={(e) => onDragEnd(comp.id, e.target.x(), e.target.y())}
      onClick={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
      onTap={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
    >
      {content}
    </Group>
  );
}
