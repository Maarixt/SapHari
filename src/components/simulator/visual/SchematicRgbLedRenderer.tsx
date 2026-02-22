/**
 * Schematic RGB LED: three channel pins R, G, B on one side, COM on the other.
 * Labels R, G, B, COM; small text "RGB (CC)" or "RGB (CA)".
 */

import React from 'react';
import { Group, Circle, Line, Rect, Text } from 'react-konva';
import type { SimComponent, Wire } from '../types';
import { getFootprint } from './footprints';

const HIT_R = 10;
const DOT_R = 2;
const SW = 2;
const STROKE = '#e5e7eb';

export interface SchematicRgbLedRendererProps {
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

export function SchematicRgbLedRenderer({
  comp,
  isSelected,
  onSelect,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
}: SchematicRgbLedRendererProps) {
  const footprint = getFootprint(comp.type, 'schematic') ?? {
    width: 80,
    height: 50,
    anchor: { x: 40, y: 25 },
    pinOffsets: { R: { x: 10, y: 12 }, G: { x: 10, y: 25 }, B: { x: 10, y: 38 }, COM: { x: 70, y: 25 } },
  };
  const w = footprint.width;
  const h = footprint.height;
  const ax = footprint.anchor?.x ?? w / 2;
  const ay = footprint.anchor?.y ?? h / 2;
  const variantId = (comp.props?.variantId as 'CC' | 'CA') ?? 'CC';
  const pinIds = ['R', 'G', 'B', 'COM'] as const;
  const selStroke = isSelected ? '#60a5fa' : STROKE;

  const content = (
    <>
      <Rect
        x={0}
        y={0}
        width={w}
        height={h}
        fill="transparent"
        onClick={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
        onTap={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
      />
      <Text
        x={w / 2 - 24}
        y={2}
        text={`RGB (${variantId})`}
        fontSize={8}
        fill={STROKE}
        listening={false}
        strokeScaleEnabled={false}
      />
      {pinIds.map((pid) => {
        const off = footprint.pinOffsets[pid];
        if (!off) return null;
        const isLeft = off.x < w / 2;
        const lineEnd = isLeft ? { x: off.x + 18, y: off.y } : { x: off.x - 18, y: off.y };
        return (
          <React.Fragment key={pid}>
            <Line
              points={[off.x, off.y, lineEnd.x, lineEnd.y]}
              stroke={STROKE}
              strokeWidth={SW}
              lineCap="round"
              strokeScaleEnabled={false}
              listening={false}
            />
            <Text
              x={isLeft ? off.x - 10 : off.x + 4}
              y={off.y - 5}
              text={pid === 'COM' ? (variantId === 'CC' ? 'COM (−)' : 'COM (+)') : `${pid}`}
              fontSize={8}
              fill={STROKE}
              listening={false}
              strokeScaleEnabled={false}
            />
            <Circle
              x={off.x}
              y={off.y}
              radius={HIT_R}
              opacity={0}
              onClick={(e) => {
                e.cancelBubble = true;
                onPinClick(comp.id, pid, (e.evt as MouseEvent).shiftKey);
              }}
              onTap={(e) => {
                e.cancelBubble = true;
                onPinClick(comp.id, pid, (e.evt as MouseEvent).shiftKey);
              }}
              onPointerDown={(e) => {
                e.cancelBubble = true;
                onPinPointerDown?.(comp.id, pid);
              }}
              onPointerUp={(e) => {
                e.cancelBubble = true;
                onPinPointerUp?.(comp.id, pid);
              }}
            />
            <Circle
              x={off.x}
              y={off.y}
              radius={DOT_R}
              fill={selStroke}
              strokeScaleEnabled={false}
              listening={false}
            />
          </React.Fragment>
        );
      })}
    </>
  );

  return (
    <Group
      x={comp.x}
      y={comp.y}
      offsetX={ax}
      offsetY={ay}
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
