import React from 'react';
import { Group, Rect, Line, Circle, Text } from 'react-konva';
import type { SimComponent } from '../types';
import { getFootprint } from './footprints';
import { transformPinPosition } from '../utils/transformPins';

const FP = { w: 70, h: 80, ax: 35, ay: 40 };

function pinLocalPosition(comp: SimComponent, pinId: string): { x: number; y: number } | null {
  const footprint = getFootprint(comp.type, 'workbench');
  if (!footprint?.pinOffsets?.[pinId] || !footprint.anchor) return null;
  const anchorX = footprint.anchor.x;
  const anchorY = footprint.anchor.y;
  const localX = footprint.pinOffsets[pinId].x;
  const localY = footprint.pinOffsets[pinId].y;
  const { x: dx, y: dy } = transformPinPosition(localX, localY, anchorX, anchorY, comp.rotation ?? 0, !!comp.flipX, !!comp.flipY);
  return { x: anchorX + dx, y: anchorY + dy };
}

export interface WorkbenchTransistorRendererProps {
  comp: SimComponent;
  isSelected: boolean;
  onSelect: (id: string, shift?: boolean) => void;
  onDragEnd?: (compId: string, x: number, y: number, evt?: MouseEvent) => void;
  onPinClick: (compId: string, pinId: string, shift?: boolean) => void;
  onPinPointerDown?: (compId: string, pinId: string) => void;
  onPinPointerUp?: (compId: string, pinId: string) => void;
}

export function WorkbenchTransistorRenderer({
  comp,
  isSelected,
  onSelect,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
}: WorkbenchTransistorRendererProps) {
  const polarity = ((comp.props?.polarity as 'NPN' | 'PNP') ?? 'NPN');
  const pts = {
    C: pinLocalPosition(comp, 'C') ?? { x: 20, y: 75 },
    B: pinLocalPosition(comp, 'B') ?? { x: 35, y: 75 },
    E: pinLocalPosition(comp, 'E') ?? { x: 50, y: 75 },
  };
  const bodyX = 18;
  const bodyY = 8;
  const bodyW = 34;
  const bodyH = 28;

  return (
    <Group
      x={comp.x}
      y={comp.y}
      offsetX={FP.ax}
      offsetY={FP.ay}
      draggable
      onDragEnd={(e) => onDragEnd?.(comp.id, e.target.x(), e.target.y(), e.evt as MouseEvent)}
      onClick={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
      onTap={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
    >
      <Rect x={0} y={0} width={FP.w} height={FP.h} fill="transparent" listening={false} />
      <Rect
        x={bodyX}
        y={bodyY}
        width={bodyW}
        height={bodyH}
        cornerRadius={4}
        fill="#111827"
        stroke={isSelected ? '#60a5fa' : '#4b5563'}
        strokeWidth={isSelected ? 2 : 1}
        strokeScaleEnabled={false}
        listening={false}
      />
      <Text x={18} y={40} width={34} text={polarity} fontSize={8} fill="#94a3b8" align="center" listening={false} />
      <Line points={[20, 36, pts.C.x, pts.C.y]} stroke="#9ca3af" strokeWidth={2} strokeScaleEnabled={false} listening={false} />
      <Line points={[35, 36, pts.B.x, pts.B.y]} stroke="#9ca3af" strokeWidth={2} strokeScaleEnabled={false} listening={false} />
      <Line points={[50, 36, pts.E.x, pts.E.y]} stroke="#9ca3af" strokeWidth={2} strokeScaleEnabled={false} listening={false} />
      {(['C', 'B', 'E'] as const).map((id) => {
        const p = pts[id];
        return (
          <Group key={id}>
            <Circle
              x={p.x}
              y={p.y}
              radius={10}
              fill="transparent"
              stroke="transparent"
              onClick={(e) => { e.cancelBubble = true; onPinClick(comp.id, id, (e.evt as MouseEvent).shiftKey); }}
              onTap={(e) => { e.cancelBubble = true; onPinClick(comp.id, id, (e.evt as MouseEvent).shiftKey); }}
              onPointerDown={(e) => { e.cancelBubble = true; onPinPointerDown?.(comp.id, id); }}
              onPointerUp={(e) => { e.cancelBubble = true; onPinPointerUp?.(comp.id, id); }}
            />
            <Circle x={p.x} y={p.y} radius={3.5} fill="#9ca3af" stroke="#64748b" strokeScaleEnabled={false} listening={false} />
            <Text x={p.x - 4} y={p.y + 5} text={id} fontSize={8} fill="#94a3b8" listening={false} />
          </Group>
        );
      })}
    </Group>
  );
}

