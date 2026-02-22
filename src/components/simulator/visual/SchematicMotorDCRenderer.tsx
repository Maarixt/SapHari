/**
 * Schematic DC Motor: circle with "M", DC indicator (solid line over dashed).
 * Pins M+ (a) and M− (b). State when selected: I (A), P (W), direction.
 */

import React from 'react';
import { Group, Circle, Line, Text } from 'react-konva';
import type { SimComponent, Wire } from '../types';
import { normalizeRotation } from '../utils/transformPins';

const HIT_R = 12;
const VIS_R = 4;
const SW = 2;
const STROKE = '#e5e7eb';

const FP = { w: 70, h: 44, ax: 35, ay: 22 };
const PA = { x: 8, y: 22 };
const PB = { x: 62, y: 22 };
const CX = 35;
const CY = 22;
const CIRCLE_R = 14;
const DC_Y = 30;
const DC_LEFT = 28;
const DC_RIGHT = 42;

export interface SchematicMotorDCRendererProps {
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

export function SchematicMotorDCRenderer({
  comp,
  isSelected,
  onSelect,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
}: SchematicMotorDCRendererProps) {
  const pinPId = comp.pins?.find((p) => p.id === 'P')?.id ?? 'P';
  const pinNId = comp.pins?.find((p) => p.id === 'N')?.id ?? 'N';
  const flipX = !!comp.flipX;
  const flipY = !!comp.flipY;
  const stroke = STROKE;
  const sel = isSelected ? '#60a5fa' : '#94a3b8';

  const current = (comp.props?.motorCurrent as number) ?? 0;
  const power = (comp.props?.motorPower as number) ?? 0;
  const direction = (comp.props?.direction as number) ?? 0;
  const dirLabel = direction > 0 ? 'CW' : direction < 0 ? 'CCW' : '';

  const content = (
    <>
      <Line points={[PA.x, PA.y, PA.x + 6, PA.y]} stroke={stroke} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
      <Line points={[PB.x - 6, PB.y, PB.x, PB.y]} stroke={stroke} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
      <Circle x={CX} y={CY} radius={CIRCLE_R} fill="transparent" stroke={stroke} strokeWidth={SW} listening={false} />
      <Text x={CX - 5} y={CY - 6} text="M" fontSize={12} fontStyle="bold" fill={stroke} listening={false} />
      <Line points={[DC_LEFT, DC_Y, DC_RIGHT, DC_Y]} stroke={stroke} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
      <Line points={[DC_LEFT, DC_Y + 4, DC_LEFT + 4, DC_Y + 4]} stroke={stroke} strokeWidth={1} strokeScaleEnabled={false} listening={false} dash={[2, 2]} />
      <Line points={[DC_LEFT + 6, DC_Y + 4, DC_RIGHT - 6, DC_Y + 4]} stroke={stroke} strokeWidth={1} strokeScaleEnabled={false} listening={false} dash={[2, 2]} />
      <Line points={[DC_RIGHT - 4, DC_Y + 4, DC_RIGHT, DC_Y + 4]} stroke={stroke} strokeWidth={1} strokeScaleEnabled={false} listening={false} dash={[2, 2]} />
      {isSelected && (current !== 0 || power !== 0 || dirLabel) && (
        <Text x={0} y={FP.h - 2} width={FP.w} text={`I=${current.toFixed(3)}A  P=${power.toFixed(2)}W${dirLabel ? `  ${dirLabel}` : ''}`} fontSize={8} fill={sel} align="center" listening={false} />
      )}
      <Circle x={PA.x} y={PA.y} radius={HIT_R} fill="transparent" stroke="transparent" strokeScaleEnabled={false} onClick={(e) => { e.cancelBubble = true; onPinClick(comp.id, pinPId, (e.evt as MouseEvent).shiftKey); }} onTap={(e) => { e.cancelBubble = true; onPinClick(comp.id, pinPId, (e.evt as MouseEvent).shiftKey); }} onPointerDown={(e) => { e.cancelBubble = true; onPinPointerDown?.(comp.id, pinPId); }} onPointerUp={(e) => { e.cancelBubble = true; onPinPointerUp?.(comp.id, pinPId); }} />
      <Circle x={PA.x} y={PA.y} radius={VIS_R} fill={stroke} stroke={sel} strokeScaleEnabled={false} listening={false} />
      <Text x={PA.x - 10} y={PA.y - 18} text="P +" fontSize={8} fill={stroke} listening={false} />
      <Circle x={PB.x} y={PB.y} radius={HIT_R} fill="transparent" stroke="transparent" strokeScaleEnabled={false} onClick={(e) => { e.cancelBubble = true; onPinClick(comp.id, pinNId, (e.evt as MouseEvent).shiftKey); }} onTap={(e) => { e.cancelBubble = true; onPinClick(comp.id, pinNId, (e.evt as MouseEvent).shiftKey); }} onPointerDown={(e) => { e.cancelBubble = true; onPinPointerDown?.(comp.id, pinNId); }} onPointerUp={(e) => { e.cancelBubble = true; onPinPointerUp?.(comp.id, pinNId); }} />
      <Circle x={PB.x} y={PB.y} radius={VIS_R} fill={stroke} stroke={sel} strokeScaleEnabled={false} listening={false} />
      <Text x={PB.x - 8} y={PB.y - 18} text="N −" fontSize={8} fill={stroke} listening={false} />
    </>
  );

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
      <Group x={0} y={0}>{content}</Group>
    </Group>
  );
}
