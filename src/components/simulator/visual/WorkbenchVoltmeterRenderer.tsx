/**
 * Workbench Voltmeter: multimeter body with live display (e.g. "4.98 V"), red and black jack terminals.
 * Pin positions from workbench footprint so hit areas align with findPin().
 */

import React from 'react';
import { Group, Rect, Circle, Text } from 'react-konva';
import type { SimComponent } from '../types';
import { getFootprint } from './footprints';
import { transformPinPosition } from '../utils/transformPins';

const FP = { w: 72, h: 48, ax: 36, ay: 24 };
const BODY_COLOR = '#1e293b';
const SCREEN_COLOR = '#fef3c7';
const SCREEN_TEXT_COLOR = '#1f2937';
const POS_COLOR = '#ef4444';
const NEG_COLOR = '#374151';
const TERMINAL_R = 5;
const HIT_R = 12;

function pinLocalPosition(comp: SimComponent, pinId: string): { x: number; y: number } | null {
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
    comp.rotation ?? 0,
    !!comp.flipX,
    !!comp.flipY
  );
  return { x: anchorX + dx, y: anchorY + dy };
}

/** Auto-range: |V| < 1 => mV, else V */
function formatVoltage(volts: number | null, connected: boolean, floating: boolean): string {
  if (!connected) return '—';
  if (floating || volts == null || !Number.isFinite(volts)) return 'Floating';
  if (Math.abs(volts) < 1) return `${(volts * 1000).toFixed(0)} mV`;
  return `${volts.toFixed(2)} V`;
}

export interface WorkbenchVoltmeterRendererProps {
  comp: SimComponent;
  isSelected: boolean;
  onSelect: (id: string, shift?: boolean) => void;
  onDragEnd?: (compId: string, x: number, y: number) => void;
  onPinClick: (compId: string, pinId: string, shift?: boolean) => void;
  onPinPointerDown?: (compId: string, pinId: string) => void;
  onPinPointerUp?: (compId: string, pinId: string) => void;
}

export function WorkbenchVoltmeterRenderer({
  comp,
  isSelected,
  onSelect,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
}: WorkbenchVoltmeterRendererProps) {
  const volts = (comp.props?.voltmeterVolts as number | null) ?? null;
  const connected = (comp.props?.voltmeterConnected as boolean) ?? false;
  const floating = (comp.props?.voltmeterFloating as boolean) ?? false;
  const displayText = formatVoltage(volts, connected, floating);
  const posPin = comp.pins[0]?.id ?? 'pos';
  const negPin = comp.pins[1]?.id ?? 'neg';
  const posPt = pinLocalPosition(comp, posPin);
  const negPt = pinLocalPosition(comp, negPin);
  const flipX = !!comp.flipX;

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

      {/* Body: rounded rect */}
      <Rect
        x={4}
        y={10}
        width={FP.w - 8}
        height={FP.h - 10}
        cornerRadius={8}
        fill={BODY_COLOR}
        stroke={isSelected ? '#60a5fa' : '#475569'}
        strokeWidth={isSelected ? 2 : 1}
        strokeScaleEnabled={false}
        listening={false}
      />

      {/* Screen (display area) */}
      <Rect
        x={10}
        y={18}
        width={FP.w - 20}
        height={20}
        cornerRadius={4}
        fill={SCREEN_COLOR}
        stroke="#d4a574"
        strokeWidth={1}
        strokeScaleEnabled={false}
        listening={false}
      />
      <Text
        x={10}
        y={20}
        width={FP.w - 20}
        text={displayText}
        fontSize={14}
        fontStyle="bold"
        fill={SCREEN_TEXT_COLOR}
        align="center"
        listening={false}
        strokeScaleEnabled={false}
      />

      {/* Red (+) jack terminal */}
      {posPt && (
        <>
          <Circle
            x={posPt.x}
            y={posPt.y}
            radius={TERMINAL_R}
            fill={POS_COLOR}
            stroke="#b91c1c"
            strokeWidth={1}
            strokeScaleEnabled={false}
            listening={false}
          />
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
        </>
      )}

      {/* Black (−) jack terminal */}
      {negPt && (
        <>
          <Circle
            x={negPt.x}
            y={negPt.y}
            radius={TERMINAL_R}
            fill={NEG_COLOR}
            stroke="#1e293b"
            strokeWidth={1}
            strokeScaleEnabled={false}
            listening={false}
          />
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
        </>
      )}

      {/* Labels under jacks */}
      {posPt && (
        <Text
          x={posPt.x - 6}
          y={posPt.y + 8}
          text="+"
          fontSize={10}
          fill="#e5e7eb"
          listening={false}
          strokeScaleEnabled={false}
        />
      )}
      {negPt && (
        <Text
          x={negPt.x - 6}
          y={negPt.y + 8}
          text="−"
          fontSize={10}
          fill="#e5e7eb"
          listening={false}
          strokeScaleEnabled={false}
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
      onDragEnd={(e) => onDragEnd?.(comp.id, e.target.x(), e.target.y())}
      onClick={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
      onTap={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
    >
      <Group x={0} y={0}>
        {content}
      </Group>
    </Group>
  );
}
