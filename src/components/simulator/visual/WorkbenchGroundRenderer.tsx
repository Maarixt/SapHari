/**
 * Workbench ground symbol: same as schematic - terminal dot at top, 3 horizontal bars.
 * Pin at exact footprint position for wire alignment.
 */
import React from 'react';
import { Group, Circle, Line, Text } from 'react-konva';
import type { SimComponent } from '../types';
import { getFootprint } from './footprints';

const VIS_R = 4;
const HIT_R = 12;
const SW = 2;

export interface WorkbenchGroundRendererProps {
  comp: SimComponent;
  isSelected: boolean;
  onSelect: (id: string, shift?: boolean) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onPinClick: (compId: string, pinId: string, shift?: boolean) => void;
  onPinPointerDown?: (compId: string, pinId: string) => void;
  onPinPointerUp?: (compId: string, pinId: string) => void;
}

export function WorkbenchGroundRenderer({
  comp,
  isSelected,
  onSelect,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
}: WorkbenchGroundRendererProps) {
  const pinId = comp.pins[0]?.id ?? 'gnd';
  const fp = getFootprint('ground', 'workbench') ?? getFootprint('ground');
  const ax = fp?.anchor?.x ?? 20;
  const ay = fp?.anchor?.y ?? 10;
  const pinOffset = fp?.pinOffsets?.[pinId] ?? fp?.pinOffsets?.gnd ?? { x: 20, y: 10 };
  const flipX = !!comp.flipX;
  const stroke = '#e2e8f0';
  const sel = isSelected ? '#60a5fa' : '#94a3b8';

  const content = (
    <>
      {/* stem */}
      <Line
        points={[pinOffset.x, pinOffset.y + VIS_R, pinOffset.x, pinOffset.y + 12]}
        stroke={stroke}
        strokeWidth={SW}
        strokeScaleEnabled={false}
        listening={false}
      />
      {/* bars */}
      <Line
        points={[pinOffset.x - 12, pinOffset.y + 12, pinOffset.x + 12, pinOffset.y + 12]}
        stroke={stroke}
        strokeWidth={SW}
        strokeScaleEnabled={false}
        listening={false}
      />
      <Line
        points={[pinOffset.x - 8, pinOffset.y + 17, pinOffset.x + 8, pinOffset.y + 17]}
        stroke={stroke}
        strokeWidth={SW}
        strokeScaleEnabled={false}
        listening={false}
      />
      <Line
        points={[pinOffset.x - 4, pinOffset.y + 22, pinOffset.x + 4, pinOffset.y + 22]}
        stroke={stroke}
        strokeWidth={SW}
        strokeScaleEnabled={false}
        listening={false}
      />
      <Group scaleX={flipX ? -1 : 1} offsetX={ax} x={ax}>
        <Text x={0} y={24} width={40} text="GND" fontSize={9} fill={stroke} align="center" listening={false} strokeScaleEnabled={false} />
      </Group>
      {/* visible terminal dot */}
      <Circle
        x={pinOffset.x}
        y={pinOffset.y}
        radius={VIS_R}
        fill={stroke}
        stroke={sel}
        strokeScaleEnabled={false}
        listening={false}
      />
      {/* Invisible hit circle at exact pin position (r=12, on top for reliable clicks) */}
      <Circle
        x={pinOffset.x}
        y={pinOffset.y}
        radius={HIT_R}
        fill="transparent"
        stroke="transparent"
        strokeScaleEnabled={false}
        listening={true}
        onClick={(e) => {
          e.cancelBubble = true;
          onPinClick(comp.id, pinId, (e.evt as MouseEvent).shiftKey);
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onPinClick(comp.id, pinId, (e.evt as MouseEvent).shiftKey);
        }}
        onPointerDown={(e) => {
          e.cancelBubble = true;
          onPinPointerDown?.(comp.id, pinId);
        }}
        onPointerUp={(e) => {
          e.cancelBubble = true;
          onPinPointerUp?.(comp.id, pinId);
        }}
      />
    </>
  );

  return (
    <Group
      x={comp.x}
      y={comp.y}
      offsetX={ax}
      offsetY={ay}
      scaleX={flipX ? -1 : 1}
      draggable
      onDragEnd={(e) => onDragEnd(comp.id, e.target.x(), e.target.y(), e.evt as MouseEvent)}
      onClick={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
      onTap={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
    >
      <Group x={0} y={0}>
        {content}
      </Group>
    </Group>
  );
}
