/**
 * Workbench RGB LED: 5mm 4-pin (R, G, B, COM).
 * Dome fill = mix of brightnessR, brightnessG, brightnessB from props (synced from RgbLedOutput).
 * COM leg marked "−" for CC or "+" for CA.
 */

import React from 'react';
import { Group, Circle, Line, Rect, Ellipse, Text } from 'react-konva';
import type { SimComponent } from '../types';
import { getFootprint } from './footprints';

const DOME_R = 18;
const BASE_Y = 46;
const LEG_STROKE = '#9ca3af';
const LEG_SW = 2;
const HIT_R = 12;

export interface WorkbenchRgbLedRendererProps {
  comp: SimComponent;
  isSelected: boolean;
  onSelect: (id: string, shift?: boolean) => void;
  onDragEnd?: (compId: string, x: number, y: number) => void;
  onPinClick: (compId: string, pinId: string, shift?: boolean) => void;
  onPinPointerDown?: (compId: string, pinId: string) => void;
  onPinPointerUp?: (compId: string, pinId: string) => void;
}

function mixColor(r: number, g: number, b: number): string {
  const R = Math.round(Math.min(1, Math.max(0, r)) * 255);
  const G = Math.round(Math.min(1, Math.max(0, g)) * 255);
  const B = Math.round(Math.min(1, Math.max(0, b)) * 255);
  return `rgb(${R},${G},${B})`;
}

export function WorkbenchRgbLedRenderer({
  comp,
  isSelected,
  onSelect,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
}: WorkbenchRgbLedRendererProps) {
  const footprint = getFootprint(comp.type, 'workbench') ?? { width: 70, height: 95, pinOffsets: {}, anchor: { x: 35, y: 47 } };
  const w = footprint.width;
  const h = footprint.height;
  const ax = footprint.anchor?.x ?? w / 2;
  const ay = footprint.anchor?.y ?? h / 2;
  const variantId = (comp.props?.variantId as 'CC' | 'CA') ?? 'CC';
  const brightnessR = Math.min(1, Math.max(0, (comp.props?.brightnessR as number) ?? 0));
  const brightnessG = Math.min(1, Math.max(0, (comp.props?.brightnessG as number) ?? 0));
  const brightnessB = Math.min(1, Math.max(0, (comp.props?.brightnessB as number) ?? 0));
  const on = brightnessR > 0.01 || brightnessG > 0.01 || brightnessB > 0.01;
  const domeFill = on ? mixColor(brightnessR, brightnessG, brightnessB) : mixColor(0.2, 0.2, 0.2);
  const domeCx = ax;
  const domeCy = 25;
  const pinIds = ['R', 'G', 'B', 'COM'] as const;

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
      {on && (
        <Circle
          x={domeCx}
          y={domeCy}
          radius={DOME_R + 4}
          fill={domeFill}
          opacity={0.3 + (brightnessR + brightnessG + brightnessB) / 3 * 0.5}
          shadowColor={domeFill}
          shadowBlur={10}
          shadowOpacity={0.5}
          strokeScaleEnabled={false}
          listening={false}
        />
      )}
      <Ellipse
        x={domeCx}
        y={BASE_Y}
        radiusX={14}
        radiusY={4}
        fill="#374151"
        stroke="#4b5563"
        strokeWidth={1}
        strokeScaleEnabled={false}
        listening={false}
      />
      <Circle
        x={domeCx}
        y={domeCy}
        radius={DOME_R}
        fill={domeFill}
        stroke={isSelected ? '#60a5fa' : '#64748b'}
        strokeWidth={isSelected ? 2 : 1}
        strokeScaleEnabled={false}
        listening={false}
      />
      <Circle
        x={domeCx - 5}
        y={domeCy - 6}
        radius={5}
        fill="rgba(255,255,255,0.3)"
        strokeScaleEnabled={false}
        listening={false}
      />
      {pinIds.map((pid) => {
        const off = footprint.pinOffsets[pid];
        if (!off) return null;
        const isCom = pid === 'COM';
        const label = isCom ? (variantId === 'CC' ? '−' : '+') : pid;
        return (
          <React.Fragment key={pid}>
            <Line
              points={[domeCx, BASE_Y, off.x, off.y]}
              stroke={LEG_STROKE}
              strokeWidth={LEG_SW}
              lineCap="round"
              strokeScaleEnabled={false}
              listening={false}
            />
            <Text
              x={off.x - (isCom ? 4 : 4)}
              y={BASE_Y - 10}
              text={label}
              fontSize={8}
              fill="#9ca3af"
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
      onDragEnd={(e) => onDragEnd?.(comp.id, e.target.x(), e.target.y(), e.evt as MouseEvent)}
      onClick={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
      onTap={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
    >
      <Group x={0} y={0}>
        {content}
      </Group>
    </Group>
  );
}
