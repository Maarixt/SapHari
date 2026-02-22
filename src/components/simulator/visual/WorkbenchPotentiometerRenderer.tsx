/**
 * Workbench potentiometer: cylindrical body, knob with tick for alpha; drag knob to adjust.
 * Pins at bottom: IN (15,55), OUT (45,55), GND (75,55) per footprint.
 * Parent (modal) handles mousemove and calls updateComponentProps(compId, { alpha }); this only signals drag start.
 */
import React from 'react';
import { Group, Circle, Line, Rect, Text } from 'react-konva';
import type { SimComponent } from '../types';

const FP = { w: 90, h: 60, ax: 45, ay: 30 };
const P_IN = { x: 15, y: 55 };
const P_OUT = { x: 45, y: 55 };
const P_GND = { x: 75, y: 55 };
export const POT_KNOB_CX = 45;
export const POT_KNOB_CY = 22;
const KNOB_R = 14;
const BODY_TOP = 8;
const BODY_BOT = 48;
const HIT_R = 10;
const STROKE = '#94a3b8';
const FILL = '#64748b';
/** Full rotation span in degrees (e.g. 300° for single-turn). */
export const POT_ROTATION_DEG = 300;

function formatValue(ohms: number): string {
  if (ohms >= 1e6) return (ohms / 1e6).toFixed(0) + 'M';
  if (ohms >= 1000) return (ohms / 1000).toFixed(ohms % 1000 ? 1 : 0) + 'k';
  return `${ohms}`;
}

export interface WorkbenchPotentiometerRendererProps {
  comp: SimComponent;
  isSelected: boolean;
  onSelect: (id: string, shift?: boolean) => void;
  onDragEnd?: (compId: string, x: number, y: number, evt?: MouseEvent) => void;
  onPinClick: (compId: string, pinId: string, shift?: boolean) => void;
  onPinPointerDown?: (compId: string, pinId: string) => void;
  onPinPointerUp?: (compId: string, pinId: string) => void;
  /** Called when user starts dragging the knob; parent handles mousemove and updates alpha. */
  onKnobDragStart?: (compId: string) => void;
}

export function WorkbenchPotentiometerRenderer({
  comp,
  isSelected,
  onSelect,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
  onKnobDragStart,
}: WorkbenchPotentiometerRendererProps) {
  const alpha = Math.max(0, Math.min(1, (comp.props?.alpha as number) ?? 0.5));
  const rTotal = (comp.props?.rTotalOhms as number) ?? 10000;
  const pct = Math.round(alpha * 100);
  const tickAngle = -90 + alpha * POT_ROTATION_DEG;
  const tickRad = (tickAngle * Math.PI) / 180;
  const tickLen = 8;
  const tickX = POT_KNOB_CX + tickLen * Math.cos(tickRad);
  const tickY = POT_KNOB_CY - tickLen * Math.sin(tickRad);

  const handleKnobPointerDown = (e: { evt: MouseEvent }) => {
    e.evt.stopPropagation();
    onKnobDragStart?.(comp.id);
  };

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
      {/* Body: rounded rect */}
      <Rect
        x={12}
        y={BODY_TOP}
        width={66}
        height={BODY_BOT - BODY_TOP}
        fill={FILL}
        stroke={isSelected ? '#60a5fa' : STROKE}
        strokeWidth={isSelected ? 2 : 1}
        cornerRadius={6}
        strokeScaleEnabled={false}
        listening={false}
      />
      {/* Knob circle */}
      <Circle
        x={POT_KNOB_CX}
        y={POT_KNOB_CY}
        radius={KNOB_R}
        fill="#475569"
        stroke={isSelected ? '#60a5fa' : STROKE}
        strokeWidth={1.5}
        strokeScaleEnabled={false}
        onPointerDown={handleKnobPointerDown}
      />
      {/* Tick on knob */}
      <Line
        points={[POT_KNOB_CX, POT_KNOB_CY, tickX, tickY]}
        stroke="#e2e8f0"
        strokeWidth={2}
        strokeScaleEnabled={false}
        listening={false}
      />
      {/* Pin labels */}
      <Text x={P_IN.x - 6} y={P_IN.y + 4} text="IN" fontSize={8} fill="#94a3b8" listening={false} />
      <Text x={P_OUT.x - 10} y={P_OUT.y + 4} text="OUT" fontSize={8} fill="#94a3b8" listening={false} />
      <Text x={P_GND.x - 10} y={P_GND.y + 4} text="GND" fontSize={8} fill="#94a3b8" listening={false} />
      {/* Value readout */}
      <Text
        x={10}
        y={BODY_BOT - 12}
        width={70}
        text={`${formatValue(rTotal)}Ω @ ${pct}%`}
        fontSize={8}
        fill="#94a3b8"
        align="center"
        listening={false}
      />
      {/* Pin hit areas */}
      {[
        { id: 'IN' as const, p: P_IN },
        { id: 'OUT' as const, p: P_OUT },
        { id: 'GND' as const, p: P_GND },
      ].map(({ id, p }) => (
        <Group key={id}>
          <Circle
            x={p.x}
            y={p.y}
            radius={HIT_R}
            fill="transparent"
            stroke="transparent"
            strokeScaleEnabled={false}
            onClick={(e) => { e.cancelBubble = true; onPinClick(comp.id, id, (e.evt as MouseEvent).shiftKey); }}
            onTap={(e) => { e.cancelBubble = true; onPinClick(comp.id, id, (e.evt as MouseEvent).shiftKey); }}
            onPointerDown={(e) => { e.cancelBubble = true; onPinPointerDown?.(comp.id, id); }}
            onPointerUp={(e) => { e.cancelBubble = true; onPinPointerUp?.(comp.id, id); }}
          />
          <Circle x={p.x} y={p.y} radius={4} fill={STROKE} stroke="#64748b" strokeScaleEnabled={false} listening={false} />
        </Group>
      ))}
    </Group>
  );
}
