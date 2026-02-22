/**
 * Schematic potentiometer: resistor body between IN and GND, wiper arrow to OUT (Multisim-style).
 * Footprint 90x50; IN (10,25), OUT (45,8), GND (80,25).
 */
import React from 'react';
import { Group, Circle, Line, Rect, Text } from 'react-konva';
import type { SimComponent, Wire } from '../types';
import { normalizeRotation } from '../utils/transformPins';

const VIS_R = 4;
const HIT_R = 12;
const SW = 2;

const FP = { w: 90, h: 50, ax: 45, ay: 25 };
const P_IN = { x: 10, y: 25 };
const P_OUT = { x: 45, y: 8 };
const P_GND = { x: 80, y: 25 };
const ZIG_START = 18;
const ZIG_END = 72;
const ZIG_AMP = 6;
const ZIG_PEAKS = 5;

function buildZigZag(): number[] {
  const pts: number[] = [];
  pts.push(ZIG_START, P_IN.y);
  const seg = (ZIG_END - ZIG_START) / ZIG_PEAKS;
  for (let i = 0; i < ZIG_PEAKS; i++) {
    const cx = ZIG_START + seg * (i + 0.5);
    const cy = P_IN.y + (i % 2 === 0 ? -ZIG_AMP : ZIG_AMP);
    pts.push(cx, cy);
  }
  pts.push(ZIG_END, P_IN.y);
  return pts;
}

const ZIG = buildZigZag();

function formatResistance(ohms: number): string {
  if (ohms >= 1e6) return (ohms / 1e6).toFixed(ohms % 1e6 === 0 ? 0 : 1) + 'MΩ';
  if (ohms >= 1000) return (ohms % 1000 === 0 ? (ohms / 1000).toFixed(0) : (ohms / 1000).toFixed(1)) + 'kΩ';
  return `${ohms}Ω`;
}

export interface SchematicPotentiometerRendererProps {
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

export function SchematicPotentiometerRenderer({
  comp,
  isSelected,
  onSelect,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
}: SchematicPotentiometerRendererProps) {
  const rTotal = (comp.props?.rTotalOhms as number) ?? 10000;
  const alpha = (comp.props?.alpha as number) ?? 0.5;
  const pct = Math.round(alpha * 100);
  const formattedValue = formatResistance(rTotal);
  const stroke = '#e2e8f0';
  const sel = isSelected ? '#60a5fa' : '#94a3b8';

  return (
    <Group
      x={comp.x}
      y={comp.y}
      offsetX={FP.ax}
      offsetY={FP.ay}
      rotation={normalizeRotation(comp.rotation)}
      scaleX={comp.flipX ? -1 : 1}
      scaleY={comp.flipY ? -1 : 1}
      draggable
      onDragEnd={(e) => onDragEnd(comp.id, e.target.x(), e.target.y())}
      onClick={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
      onTap={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
    >
      <Rect x={0} y={0} width={FP.w} height={FP.h} fill="transparent" listening={false} />
      {/* Resistor body IN–GND */}
      <Line points={[P_IN.x + VIS_R, P_IN.y, ZIG_START, P_IN.y]} stroke={stroke} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
      <Line points={ZIG} stroke={stroke} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
      <Line points={[ZIG_END, P_IN.y, P_GND.x - VIS_R, P_GND.y]} stroke={stroke} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
      {/* Wiper arrow: from body (mid) to OUT pin */}
      <Line points={[45, P_IN.y, P_OUT.x, P_OUT.y + VIS_R]} stroke={stroke} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
      <Line points={[P_OUT.x - 5, P_OUT.y + 8, P_OUT.x, P_OUT.y]} stroke={stroke} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
      <Line points={[P_OUT.x + 5, P_OUT.y + 8, P_OUT.x, P_OUT.y]} stroke={stroke} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
      {/* Labels */}
      <Text x={P_IN.x - 8} y={P_IN.y - 20} text="IN" fontSize={8} fill="#94a3b8" listening={false} />
      <Text x={P_OUT.x - 10} y={P_OUT.y - 14} text="OUT" fontSize={8} fill="#94a3b8" listening={false} />
      <Text x={P_GND.x - 12} y={P_GND.y - 20} text="GND" fontSize={8} fill="#94a3b8" listening={false} />
      <Text x={0} y={2} width={FP.w} text={`${formattedValue} α=${pct}%`} fontSize={8} fill={stroke} align="center" listening={false} />
      {/* Pin hit areas + dots */}
      {(['IN', 'OUT', 'GND'] as const).map((pinId) => {
        const p = pinId === 'IN' ? P_IN : pinId === 'OUT' ? P_OUT : P_GND;
        return (
          <Group key={pinId}>
            <Circle
              x={p.x}
              y={p.y}
              radius={HIT_R}
              fill="transparent"
              stroke="transparent"
              strokeScaleEnabled={false}
              onClick={(e) => { e.cancelBubble = true; onPinClick(comp.id, pinId, (e.evt as MouseEvent).shiftKey); }}
              onTap={(e) => { e.cancelBubble = true; onPinClick(comp.id, pinId, (e.evt as MouseEvent).shiftKey); }}
              onPointerDown={(e) => { e.cancelBubble = true; onPinPointerDown?.(comp.id, pinId); }}
              onPointerUp={(e) => { e.cancelBubble = true; onPinPointerUp?.(comp.id, pinId); }}
            />
            <Circle x={p.x} y={p.y} radius={VIS_R} fill={stroke} stroke={sel} strokeScaleEnabled={false} listening={false} />
          </Group>
        );
      })}
    </Group>
  );
}
