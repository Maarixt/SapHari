/**
 * Workbench diode: axial (1N4007 style). Black cylinder, silver band on cathode side, two leads.
 * Pin anchors at lead tips.
 */

import React from 'react';
import { Group, Circle, Line, Rect } from 'react-konva';
import type { SimComponent } from '../types';

const FP = { w: 56, h: 24, ax: 28, ay: 12 };
const BODY_W = 32;
const BODY_H = 14;
const BODY_X = (FP.w - BODY_W) / 2;
const BODY_Y = (FP.h - BODY_H) / 2;
const BAND_W = 4;
const BAND_X = BODY_X + BODY_W - BAND_W;
const A = { x: 8, y: 12 };
const K = { x: 48, y: 12 };
const LEG_SW = 2;
const LEG_COLOR = '#6b7280';
const BODY_FILL = '#1f2937';
const BAND_FILL = '#9ca3af';
const HIT_R = 10;

export interface WorkbenchDiodeRendererProps {
  comp: SimComponent;
  isSelected: boolean;
  onSelect: (id: string, shift?: boolean) => void;
  onDragEnd?: (compId: string, x: number, y: number) => void;
  onPinClick: (compId: string, pinId: string, shift?: boolean) => void;
  onPinPointerDown?: (compId: string, pinId: string) => void;
  onPinPointerUp?: (compId: string, pinId: string) => void;
}

export function WorkbenchDiodeRenderer({
  comp,
  isSelected,
  onSelect,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
}: WorkbenchDiodeRendererProps) {
  const anodeId = comp.pins[0]?.id ?? 'A';
  const cathodeId = comp.pins[1]?.id ?? 'K';
  const flipX = !!comp.flipX;
  const selStroke = isSelected ? '#60a5fa' : '#475569';

  const content = (
    <>
      <Rect x={0} y={0} width={FP.w} height={FP.h} fill="transparent" onClick={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)} onTap={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)} />
      <Line points={[A.x, A.y, BODY_X, A.y]} stroke={LEG_COLOR} strokeWidth={LEG_SW} lineCap="round" strokeScaleEnabled={false} listening={false} />
      <Line points={[BODY_X + BODY_W, K.y, K.x, K.y]} stroke={LEG_COLOR} strokeWidth={LEG_SW} lineCap="round" strokeScaleEnabled={false} listening={false} />
      <Rect x={BODY_X} y={BODY_Y} width={BODY_W} height={BODY_H} fill={BODY_FILL} stroke={selStroke} strokeWidth={isSelected ? 2 : 1} cornerRadius={2} strokeScaleEnabled={false} listening={false} />
      <Rect x={BAND_X} y={BODY_Y} width={BAND_W} height={BODY_H} fill={BAND_FILL} listening={false} strokeScaleEnabled={false} />
      <Circle x={A.x} y={A.y} radius={HIT_R} opacity={0} onClick={(e) => { e.cancelBubble = true; onPinClick(comp.id, anodeId, (e.evt as MouseEvent).shiftKey); }} onTap={(e) => { e.cancelBubble = true; onPinClick(comp.id, anodeId, (e.evt as MouseEvent).shiftKey); }} onPointerDown={(e) => { e.cancelBubble = true; onPinPointerDown?.(comp.id, anodeId); }} onPointerUp={(e) => { e.cancelBubble = true; onPinPointerUp?.(comp.id, anodeId); }} />
      <Circle x={A.x} y={A.y} radius={3} fill={selStroke} strokeScaleEnabled={false} listening={false} />
      <Circle x={K.x} y={K.y} radius={HIT_R} opacity={0} onClick={(e) => { e.cancelBubble = true; onPinClick(comp.id, cathodeId, (e.evt as MouseEvent).shiftKey); }} onTap={(e) => { e.cancelBubble = true; onPinClick(comp.id, cathodeId, (e.evt as MouseEvent).shiftKey); }} onPointerDown={(e) => { e.cancelBubble = true; onPinPointerDown?.(comp.id, cathodeId); }} onPointerUp={(e) => { e.cancelBubble = true; onPinPointerUp?.(comp.id, cathodeId); }} />
      <Circle x={K.x} y={K.y} radius={3} fill={selStroke} strokeScaleEnabled={false} listening={false} />
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
      onDragEnd={(e) => onDragEnd?.(comp.id, e.target.x(), e.target.y())}
      onClick={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
      onTap={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
    >
      <Group x={0} y={0}>{content}</Group>
    </Group>
  );
}
