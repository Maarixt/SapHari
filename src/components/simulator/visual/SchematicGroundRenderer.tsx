/**
 * Schematic ground symbol: terminal dot at top, 3 horizontal bars decreasing width below.
 * Standard IEEE/IEC ground symbol. Pin at top center.
 */
import React from 'react';
import { Group, Circle, Line, Rect, Text } from 'react-konva';
import type { SimComponent, Wire } from '../types';

const VIS_R = 4;
const HIT_R = 12;
const SW = 2;

const FP = { w: 40, h: 40, ax: 20, ay: 10 };
const PIN = { x: 20, y: 10 };

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
}

export function SchematicGroundRenderer({ comp, isSelected, onSelect, onDragEnd, onPinClick, onPinPointerDown, onPinPointerUp }: Props) {
  const pinId = comp.pins[0]?.id ?? 'gnd';
  const flipX = !!comp.flipX;
  const stroke = '#e2e8f0';
  const sel = isSelected ? '#60a5fa' : '#94a3b8';

  const content = (
    <>
      <Rect x={0} y={0} width={FP.w} height={FP.h} fill="transparent" />
      <Line points={[PIN.x, PIN.y + VIS_R, PIN.x, 22]} stroke={stroke} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
      <Line points={[PIN.x - 12, 22, PIN.x + 12, 22]} stroke={stroke} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
      <Line points={[PIN.x - 8, 27, PIN.x + 8, 27]} stroke={stroke} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
      <Line points={[PIN.x - 4, 32, PIN.x + 4, 32]} stroke={stroke} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
      <Group scaleX={flipX ? -1 : 1} offsetX={FP.ax} x={FP.ax}>
        <Text x={0} y={34} width={FP.w} text="GND" fontSize={9} fill={stroke} align="center" listening={false} strokeScaleEnabled={false} />
      </Group>
      <Circle
        x={PIN.x}
        y={PIN.y}
        radius={HIT_R}
        fill="transparent"
        stroke="transparent"
        strokeScaleEnabled={false}
        onClick={e => { e.cancelBubble = true; onPinClick(comp.id, pinId, (e.evt as MouseEvent).shiftKey); }}
        onTap={e => { e.cancelBubble = true; onPinClick(comp.id, pinId, (e.evt as MouseEvent).shiftKey); }}
        onPointerDown={e => { e.cancelBubble = true; onPinPointerDown?.(comp.id, pinId); }}
        onPointerUp={e => { e.cancelBubble = true; onPinPointerUp?.(comp.id, pinId); }} />
      <Circle x={PIN.x} y={PIN.y} radius={VIS_R} fill={stroke} stroke={sel} strokeScaleEnabled={false} listening={false} />
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
      onDragEnd={e => onDragEnd(comp.id, e.target.x(), e.target.y())}
      onClick={e => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
      onTap={e => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
    >
      <Group x={0} y={0}>
        {content}
      </Group>
    </Group>
  );
}
