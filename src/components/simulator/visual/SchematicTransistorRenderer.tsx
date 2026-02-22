import React from 'react';
import { Group, Circle, Line, Rect, Text } from 'react-konva';
import type { SimComponent, Wire } from '../types';

const FP = { w: 90, h: 60, ax: 45, ay: 30 };
const PIN_B = { x: 15, y: 30 };
const PIN_C = { x: 75, y: 12 };
const PIN_E = { x: 75, y: 48 };
const CENTER = { x: 45, y: 30 };
const R = 16;

export interface SchematicTransistorRendererProps {
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

export function SchematicTransistorRenderer({
  comp,
  isSelected,
  onSelect,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
}: SchematicTransistorRendererProps) {
  const stroke = '#e5e7eb';
  const selStroke = isSelected ? '#60a5fa' : stroke;
  const polarity = ((comp.props?.polarity as 'NPN' | 'PNP') ?? 'NPN');
  const arrowIn = polarity === 'PNP';

  return (
    <Group
      x={comp.x}
      y={comp.y}
      offsetX={FP.ax}
      offsetY={FP.ay}
      draggable
      onDragEnd={(e) => onDragEnd(comp.id, e.target.x(), e.target.y())}
      onClick={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
      onTap={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
    >
      <Rect x={0} y={0} width={FP.w} height={FP.h} fill="transparent" listening={false} />
      <Circle x={CENTER.x} y={CENTER.y} radius={R} stroke={selStroke} strokeWidth={2} fill="transparent" strokeScaleEnabled={false} listening={false} />
      <Line points={[PIN_B.x, PIN_B.y, CENTER.x - 8, CENTER.y]} stroke={stroke} strokeWidth={2} strokeScaleEnabled={false} listening={false} />
      <Line points={[CENTER.x - 2, CENTER.y - 8, CENTER.x - 2, CENTER.y + 8]} stroke={stroke} strokeWidth={2} strokeScaleEnabled={false} listening={false} />
      <Line points={[CENTER.x - 2, CENTER.y - 5, PIN_C.x, PIN_C.y]} stroke={stroke} strokeWidth={2} strokeScaleEnabled={false} listening={false} />
      <Line points={[CENTER.x - 2, CENTER.y + 5, PIN_E.x, PIN_E.y]} stroke={stroke} strokeWidth={2} strokeScaleEnabled={false} listening={false} />
      {/* Emitter arrow */}
      {arrowIn ? (
        <>
          <Line points={[PIN_E.x - 9, PIN_E.y - 2, PIN_E.x - 1, PIN_E.y]} stroke={stroke} strokeWidth={2} strokeScaleEnabled={false} listening={false} />
          <Line points={[PIN_E.x - 6, PIN_E.y - 8, PIN_E.x - 1, PIN_E.y]} stroke={stroke} strokeWidth={2} strokeScaleEnabled={false} listening={false} />
        </>
      ) : (
        <>
          <Line points={[PIN_E.x - 1, PIN_E.y, PIN_E.x - 9, PIN_E.y - 2]} stroke={stroke} strokeWidth={2} strokeScaleEnabled={false} listening={false} />
          <Line points={[PIN_E.x - 1, PIN_E.y, PIN_E.x - 6, PIN_E.y - 8]} stroke={stroke} strokeWidth={2} strokeScaleEnabled={false} listening={false} />
        </>
      )}
      <Text x={36} y={6} text={polarity} fontSize={8} fill="#94a3b8" listening={false} />
      {(['B', 'C', 'E'] as const).map((id) => {
        const p = id === 'B' ? PIN_B : id === 'C' ? PIN_C : PIN_E;
        return (
          <Group key={id}>
            <Circle
              x={p.x}
              y={p.y}
              radius={10}
              opacity={0}
              onClick={(e) => { e.cancelBubble = true; onPinClick(comp.id, id, (e.evt as MouseEvent).shiftKey); }}
              onTap={(e) => { e.cancelBubble = true; onPinClick(comp.id, id, (e.evt as MouseEvent).shiftKey); }}
              onPointerDown={(e) => { e.cancelBubble = true; onPinPointerDown?.(comp.id, id); }}
              onPointerUp={(e) => { e.cancelBubble = true; onPinPointerUp?.(comp.id, id); }}
            />
            <Circle x={p.x} y={p.y} radius={3} fill={selStroke} strokeScaleEnabled={false} listening={false} />
            <Text x={p.x - 4} y={p.y + 5} text={id} fontSize={8} fill="#94a3b8" listening={false} />
          </Group>
        );
      })}
    </Group>
  );
}

