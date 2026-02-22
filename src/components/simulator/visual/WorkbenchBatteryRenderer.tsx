/**
 * Workbench Battery: polarity depends on rotation (0° left=+, right=−; 180° swapped; 90°/270° top/bottom).
 * Two terminals only: one "+" and one "−" at the connection dots. Optional voltage label in the middle.
 * Pin positions come from footprint + transformPinPosition so wires and simulation stay in sync.
 */

import React from 'react';
import { Group, Rect, Circle, Text } from 'react-konva';
import type { SimComponent } from '../types';
import { getFootprint } from './footprints';
import { transformPinPosition } from '../utils/transformPins';
import { getBatteryPolarity, type Rot } from '../utils/batteryPolarity';

const FP = { w: 90, h: 120, ax: 45, ay: 60 };
const BODY_COLOR = '#1f2937';
const CAP_COLOR = '#ea580c';
const TERMINAL_STROKE = '#9ca3af';
const HIT_R = 12;
const TERMINAL_R = 5;

function normalizeRot(r: number | undefined): Rot {
  if (r === undefined || r === null) return 0;
  const n = Math.round(Number(r)) % 360;
  if (n === 0 || n === 360) return 0;
  if (n === 90 || n === -270) return 90;
  if (n === 180 || n === -180) return 180;
  if (n === 270 || n === -90) return 270;
  return 0;
}

/** Label offset so "+" / "−" sit beside the terminal (not inside body). */
function labelOffset(side: 'left' | 'right' | 'top' | 'bottom', isPos: boolean): { x: number; y: number } {
  const d = 10;
  switch (side) {
    case 'left': return { x: -d - 6, y: -6 };
    case 'right': return { x: d, y: -6 };
    case 'top': return { x: -6, y: -d - 10 };
    case 'bottom': return { x: -6, y: d };
    default: return { x: -5, y: -12 };
  }
}

function pinLocalPosition(
  comp: SimComponent,
  pinId: string
): { x: number; y: number } | null {
  const footprint = getFootprint(comp.type, 'workbench');
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

export interface WorkbenchBatteryRendererProps {
  comp: SimComponent;
  isSelected: boolean;
  onSelect: (id: string, shift?: boolean) => void;
  onDragEnd?: (compId: string, x: number, y: number) => void;
  onPinClick: (compId: string, pinId: string, shift?: boolean) => void;
  onPinPointerDown?: (compId: string, pinId: string) => void;
  onPinPointerUp?: (compId: string, pinId: string) => void;
}

export function WorkbenchBatteryRenderer({
  comp,
  isSelected,
  onSelect,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
}: WorkbenchBatteryRendererProps) {
  const voltage = (comp.props?.voltage as number) ?? 9;
  const acEnabled = !!(comp.props?.acEnabled as boolean);
  const amplitude = (comp.props?.amplitude as number) ?? 0;
  const frequencyHz = (comp.props?.frequencyHz as number) ?? 60;
  const vrms = amplitude / Math.SQRT2;
  const acLabel = acEnabled ? `AC ${vrms.toFixed(0)}Vrms ${frequencyHz.toFixed(0)}Hz` : null;
  const posPin = comp.pins[0]?.id ?? 'pos';
  const negPin = comp.pins[1]?.id ?? 'neg';
  const flipX = !!comp.flipX;
  const rotation = normalizeRot(comp.rotation);
  const polarity = getBatteryPolarity(rotation);

  const posPt = pinLocalPosition(comp, posPin);
  const negPt = pinLocalPosition(comp, negPin);
  const posLabelOff = labelOffset(polarity.pos, true);
  const negLabelOff = labelOffset(polarity.neg, false);

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

      {/* Battery body: rounded rect, dark */}
      <Rect
        x={2}
        y={24}
        width={FP.w - 4}
        height={FP.h - 26}
        cornerRadius={14}
        fill={BODY_COLOR}
        stroke={isSelected ? '#60a5fa' : '#374151'}
        strokeWidth={isSelected ? 2 : 1}
        strokeScaleEnabled={false}
        listening={false}
      />

      {/* Top highlight strip */}
      <Rect
        x={4}
        y={26}
        width={FP.w - 8}
        height={4}
        cornerRadius={2}
        fill="rgba(255,255,255,0.06)"
        strokeScaleEnabled={false}
        listening={false}
      />

      {/* Top cap: orange */}
      <Rect
        x={0}
        y={0}
        width={FP.w}
        height={24}
        cornerRadius={[14, 14, 0, 0]}
        fill={CAP_COLOR}
        stroke={isSelected ? '#60a5fa' : '#c2410c'}
        strokeWidth={isSelected ? 2 : 1}
        strokeScaleEnabled={false}
        listening={false}
      />

      {/* Positive terminal: dot + "+" label only */}
      {posPt && (
        <>
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
          <Text
            x={posPt.x + posLabelOff.x}
            y={posPt.y + posLabelOff.y}
            text="+"
            fontSize={12}
            fill="white"
            listening={false}
            strokeScaleEnabled={false}
          />
        </>
      )}

      {/* Negative terminal: dot + "−" label only */}
      {negPt && (
        <>
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
          <Text
            x={negPt.x + negLabelOff.x}
            y={negPt.y + negLabelOff.y}
            text="−"
            fontSize={12}
            fill="white"
            listening={false}
            strokeScaleEnabled={false}
          />
        </>
      )}

      {/* Optional voltage label in the middle; AC mode shows "AC 12Vrms 60Hz" */}
      <Group scaleX={flipX ? -1 : 1} offsetX={FP.ax} x={FP.ax}>
        <Text
          x={0}
          y={50}
          width={FP.w}
          text={acLabel ?? `${voltage}V`}
          fontSize={acLabel ? 11 : 16}
          fontStyle="bold"
          fill="#e5e7eb"
          align="center"
          listening={false}
          strokeScaleEnabled={false}
        />
      </Group>

      {/* Connection hit areas at same positions as terminal dots */}
      {posPt && (
        <Circle
          x={posPt.x}
          y={posPt.y}
          radius={HIT_R}
          opacity={0}
          onClick={(e) => {
            e.cancelBubble = true;
            onPinClick(comp.id, posPin, (e.evt as MouseEvent).shiftKey);
          }}
          onTap={(e) => {
            e.cancelBubble = true;
            onPinClick(comp.id, posPin, (e.evt as MouseEvent).shiftKey);
          }}
          onPointerDown={(e) => {
            e.cancelBubble = true;
            onPinPointerDown?.(comp.id, posPin);
          }}
          onPointerUp={(e) => {
            e.cancelBubble = true;
            onPinPointerUp?.(comp.id, posPin);
          }}
        />
      )}
      {negPt && (
        <Circle
          x={negPt.x}
          y={negPt.y}
          radius={HIT_R}
          opacity={0}
          onClick={(e) => {
            e.cancelBubble = true;
            onPinClick(comp.id, negPin, (e.evt as MouseEvent).shiftKey);
          }}
          onTap={(e) => {
            e.cancelBubble = true;
            onPinClick(comp.id, negPin, (e.evt as MouseEvent).shiftKey);
          }}
          onPointerDown={(e) => {
            e.cancelBubble = true;
            onPinPointerDown?.(comp.id, negPin);
          }}
          onPointerUp={(e) => {
            e.cancelBubble = true;
            onPinPointerUp?.(comp.id, negPin);
          }}
        />
      )}
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
      onDragEnd={(e) => onDragEnd?.(comp.id, e.target.x(), e.target.y(), (e.evt as MouseEvent))}
      onClick={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
      onTap={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
    >
      <Group x={0} y={0}>
        {content}
      </Group>
    </Group>
  );
}
