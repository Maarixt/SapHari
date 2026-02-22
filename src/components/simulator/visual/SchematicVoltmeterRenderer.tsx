/**
 * Schematic Voltmeter: circle with "V", two terminals (pos +, neg −).
 * Measurement-only; no circuit loading. Reading shown from solve result when both probes wired.
 */

import React from 'react';
import { Group, Circle, Line, Rect, Text } from 'react-konva';
import type { SimComponent, Wire } from '../types';

const HIT_R = 10;
const DOT_R = 2;
const SW = 2;
const STROKE = '#e5e7eb';
const POS_COLOR = '#ef4444';
const NEG_COLOR = '#3b82f6';

const FP = { w: 50, h: 40, ax: 25, ay: 20 };
const POS = { x: 5, y: 20 };
const NEG = { x: 45, y: 20 };
const CIRCLE_R = 14;
const CIRCLE_CX = 25;

export interface SchematicVoltmeterRendererProps {
  comp: SimComponent;
  simState: { components: SimComponent[]; wires: Wire[] };
  isSelected: boolean;
  onSelect: (id: string, shift?: boolean) => void;
  onDelete: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onPinClick: (compId: string, pinId: string, shift?: boolean) => void;
  onPinPointerDown?: (compId: string, pinId: string) => void;
  onPinPointerUp?: (compId: string, pinId: string) => void;
  /** When provided, show reading from solve result (volts). */
  voltmeterReading?: number | undefined;
  connected?: boolean;
}

export function SchematicVoltmeterRenderer({
  comp,
  isSelected,
  onSelect,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
  voltmeterReading,
  connected = false,
}: SchematicVoltmeterRendererProps) {
  const posId = comp.pins[0]?.id ?? 'pos';
  const negId = comp.pins[1]?.id ?? 'neg';
  const selStroke = isSelected ? '#60a5fa' : STROKE;

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

      {/* Lead from pos to circle */}
      <Line
        points={[POS.x, POS.y, CIRCLE_CX - CIRCLE_R, 20]}
        stroke={POS_COLOR}
        strokeWidth={SW}
        lineCap="round"
        strokeScaleEnabled={false}
        listening={false}
      />
      {/* Lead from circle to neg */}
      <Line
        points={[CIRCLE_CX + CIRCLE_R, 20, NEG.x, NEG.y]}
        stroke={NEG_COLOR}
        strokeWidth={SW}
        lineCap="round"
        strokeScaleEnabled={false}
        listening={false}
      />

      {/* Circle with V */}
      <Circle
        x={CIRCLE_CX}
        y={20}
        radius={CIRCLE_R}
        stroke={selStroke}
        strokeWidth={SW}
        fill="transparent"
        listening={false}
        strokeScaleEnabled={false}
      />
      <Text
        x={CIRCLE_CX - 6}
        y={12}
        text="V"
        fontSize={14}
        fontStyle="bold"
        fill={STROKE}
        listening={false}
        strokeScaleEnabled={false}
      />

      {/* Optional reading */}
      {connected && voltmeterReading !== undefined && (
        <Text
          x={CIRCLE_CX - 18}
          y={32}
          text={`${voltmeterReading.toFixed(2)} V`}
          fontSize={9}
          fill={STROKE}
          listening={false}
          strokeScaleEnabled={false}
        />
      )}

      {/* Terminal pos — hit zone and dot */}
      <Circle
        x={POS.x}
        y={POS.y}
        radius={HIT_R}
        opacity={0}
        onClick={(e) => { e.cancelBubble = true; onPinClick(comp.id, posId, (e.evt as MouseEvent).shiftKey); }}
        onTap={(e) => { e.cancelBubble = true; onPinClick(comp.id, posId, (e.evt as MouseEvent).shiftKey); }}
        onPointerDown={(e) => { e.cancelBubble = true; onPinPointerDown?.(comp.id, posId); }}
        onPointerUp={(e) => { e.cancelBubble = true; onPinPointerUp?.(comp.id, posId); }}
      />
      <Circle x={POS.x} y={POS.y} radius={DOT_R} fill={selStroke} strokeScaleEnabled={false} listening={false} />

      {/* Terminal neg */}
      <Circle
        x={NEG.x}
        y={NEG.y}
        radius={HIT_R}
        opacity={0}
        onClick={(e) => { e.cancelBubble = true; onPinClick(comp.id, negId, (e.evt as MouseEvent).shiftKey); }}
        onTap={(e) => { e.cancelBubble = true; onPinClick(comp.id, negId, (e.evt as MouseEvent).shiftKey); }}
        onPointerDown={(e) => { e.cancelBubble = true; onPinPointerDown?.(comp.id, negId); }}
        onPointerUp={(e) => { e.cancelBubble = true; onPinPointerUp?.(comp.id, negId); }}
      />
      <Circle x={NEG.x} y={NEG.y} radius={DOT_R} fill={selStroke} strokeScaleEnabled={false} listening={false} />
    </>
  );

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
      <Group x={0} y={0}>
        {content}
      </Group>
    </Group>
  );
}
