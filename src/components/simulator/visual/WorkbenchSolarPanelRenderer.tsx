/**
 * Workbench Solar Panel: panel block with cell grid, sun icon, P+ and P− terminals.
 * Optional G=XXX W/m² badge. Dim when irradiance 0.
 */

import React from 'react';
import { Group, Rect, Circle, Text, Line } from 'react-konva';
import type { SimComponent } from '../types';
import { getFootprint } from './footprints';
import { transformPinPosition } from '../utils/transformPins';

const FP = { w: 90, h: 50, ax: 45, ay: 25 };
const BODY_COLOR = '#1e3a5f';
const GRID_COLOR = 'rgba(255,255,255,0.12)';
const DIM_COLOR = '#4b5563';
const TERMINAL_STROKE = '#9ca3af';
const HIT_R = 12;
const TERMINAL_R = 5;

function pinLocalPosition(
  comp: SimComponent,
  pinId: string
): { x: number; y: number } | null {
  const footprint = getFootprint(comp.type as string, 'workbench');
  if (!footprint?.pinOffsets?.[pinId] || !footprint.anchor) return null;
  const anchorX = footprint.anchor.x;
  const anchorY = footprint.anchor.y;
  const localX = footprint.pinOffsets[pinId].x;
  const localY = footprint.pinOffsets[pinId].y;
  const { x: dx, y: dy } = transformPinPosition(
    localX,
    localY,
    anchorX,
    anchorY,
    comp.rotation,
    comp.flipX,
    comp.flipY
  );
  return { x: anchorX + dx, y: anchorY + dy };
}

export interface WorkbenchSolarPanelRendererProps {
  comp: SimComponent;
  isSelected: boolean;
  onSelect: (id: string, shift?: boolean) => void;
  onDragEnd?: (compId: string, x: number, y: number) => void;
  onPinClick: (compId: string, pinId: string, shift?: boolean) => void;
  onPinPointerDown?: (compId: string, pinId: string) => void;
  onPinPointerUp?: (compId: string, pinId: string) => void;
}

export function WorkbenchSolarPanelRenderer({
  comp,
  isSelected,
  onSelect,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
}: WorkbenchSolarPanelRendererProps) {
  const irradiance = (comp.props?.irradiance as number) ?? 700;
  const dim = irradiance <= 0;
  const posPin = comp.pins[0]?.id ?? 'pos';
  const negPin = comp.pins[1]?.id ?? 'neg';
  const posPt = pinLocalPosition(comp, posPin);
  const negPt = pinLocalPosition(comp, negPin);
  const fill = dim ? DIM_COLOR : BODY_COLOR;
  const gridStroke = dim ? 'rgba(255,255,255,0.06)' : GRID_COLOR;

  const cells = [];
  const cellW = 12;
  const cellH = 10;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      cells.push(
        <Rect
          key={`${row}-${col}`}
          x={8 + col * cellW}
          y={12 + row * cellH}
          width={cellW - 2}
          height={cellH - 2}
          stroke={gridStroke}
          strokeWidth={1}
          listening={false}
          strokeScaleEnabled={false}
        />
      );
    }
  }

  return (
    <Group
      x={comp.x}
      y={comp.y}
      offsetX={FP.ax}
      offsetY={FP.ay}
      draggable
      onDragEnd={(e) => onDragEnd?.(comp.id, e.target.x(), e.target.y())}
      onClick={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
      onTap={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
    >
      <Rect
        x={0}
        y={0}
        width={FP.w}
        height={FP.h}
        fill="transparent"
        onClick={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
        onTap={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
      />
      <Rect
        x={2}
        y={2}
        width={FP.w - 4}
        height={FP.h - 4}
        cornerRadius={4}
        fill={fill}
        stroke={isSelected ? '#60a5fa' : '#374151'}
        strokeWidth={isSelected ? 2 : 1}
        strokeScaleEnabled={false}
        listening={false}
      />
      {cells}
      <Group x={68} y={18} listening={false}>
        <Circle x={0} y={0} radius={8} stroke={gridStroke} strokeWidth={1} listening={false} strokeScaleEnabled={false} />
        <Line points={[-4, 0, 4, 0]} stroke={gridStroke} strokeWidth={1} listening={false} strokeScaleEnabled={false} />
        <Line points={[0, -4, 0, 4]} stroke={gridStroke} strokeWidth={1} listening={false} strokeScaleEnabled={false} />
        <Line points={[-2.8, -2.8, 2.8, 2.8]} stroke={gridStroke} strokeWidth={1} listening={false} strokeScaleEnabled={false} />
        <Line points={[-2.8, 2.8, 2.8, -2.8]} stroke={gridStroke} strokeWidth={1} listening={false} strokeScaleEnabled={false} />
      </Group>
      {posPt && (
        <>
          <Circle
            x={posPt.x}
            y={posPt.y}
            radius={HIT_R}
            opacity={0}
            onClick={(e) => { e.cancelBubble = true; onPinClick(comp.id, posPin, (e.evt as MouseEvent).shiftKey); }}
            onTap={(e) => { e.cancelBubble = true; onPinClick(comp.id, posPin, (e.evt as MouseEvent).shiftKey); }}
            onPointerDown={(e) => { e.cancelBubble = true; onPinPointerDown?.(comp.id, posPin); }}
            onPointerUp={(e) => { e.cancelBubble = true; onPinPointerUp?.(comp.id, posPin); }}
          />
          <Circle
            x={posPt.x}
            y={posPt.y}
            radius={TERMINAL_R}
            fill="#6b7280"
            stroke={TERMINAL_STROKE}
            strokeWidth={1}
            strokeScaleEnabled={false}
            listening={false}
          />
          <Text x={posPt.x - 18} y={posPt.y - 6} text="P+" fontSize={9} fill="#e5e7eb" listening={false} strokeScaleEnabled={false} />
        </>
      )}
      {negPt && (
        <>
          <Circle
            x={negPt.x}
            y={negPt.y}
            radius={HIT_R}
            opacity={0}
            onClick={(e) => { e.cancelBubble = true; onPinClick(comp.id, negPin, (e.evt as MouseEvent).shiftKey); }}
            onTap={(e) => { e.cancelBubble = true; onPinClick(comp.id, negPin, (e.evt as MouseEvent).shiftKey); }}
            onPointerDown={(e) => { e.cancelBubble = true; onPinPointerDown?.(comp.id, negPin); }}
            onPointerUp={(e) => { e.cancelBubble = true; onPinPointerUp?.(comp.id, negPin); }}
          />
          <Circle
            x={negPt.x}
            y={negPt.y}
            radius={TERMINAL_R}
            fill="#6b7280"
            stroke={TERMINAL_STROKE}
            strokeWidth={1}
            strokeScaleEnabled={false}
            listening={false}
          />
          <Text x={negPt.x + 6} y={negPt.y - 6} text="P−" fontSize={9} fill="#e5e7eb" listening={false} strokeScaleEnabled={false} />
        </>
      )}
      <Text x={4} y={FP.h - 14} text={`G=${irradiance} W/m²`} fontSize={9} fill="#9ca3af" listening={false} strokeScaleEnabled={false} />
    </Group>
  );
}
