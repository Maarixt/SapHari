/**
 * Workbench LED: physical 5mm through-hole LED.
 * Footprint: 60x95, anchor (30,47). Pins at leg tips: A (22,90) long, K (38,78) short.
 *
 * Physical structure:
 * - Dome: circular with flat cut on cathode side (not an added block)
 * - Plastic base ring under dome
 * - Two metal legs: anode visibly longer, cathode shorter
 * - Connection points exactly at leg tips
 * - Glow when props.on
 */

import React from 'react';
import { Group, Circle, Line, Ellipse, Rect, Text } from 'react-konva';
import type { SimComponent } from '../types';

const FP = { w: 60, h: 95, ax: 30, ay: 47 };
// Pin positions at leg tips only — anode longer, cathode shorter
const A = { x: 22, y: 90 };  // anode, long leg
const K = { x: 38, y: 78 };  // cathode, short leg
const DOME_CX = 30;
const DOME_CY = 25;
const DOME_R = 18;
// Legs emerge from base ring
const BASE_Y = 46;
const LEG_STROKE = '#9ca3af';
const LEG_SW = 2;
const HIT_R = 12;

const COLOR_MAP: Record<string, string> = {
  red: '#ef4444',
  green: '#22c55e',
  blue: '#3b82f6',
  yellow: '#eab308',
  white: '#f8fafc',
  orange: '#f97316',
  purple: '#a855f7',
};

function ledColor(color: string | undefined): string {
  return (color && COLOR_MAP[color]) || COLOR_MAP.red || '#ef4444';
}

export interface WorkbenchLEDRendererProps {
  comp: SimComponent;
  isSelected: boolean;
  onSelect: (id: string, shift?: boolean) => void;
  onDragEnd?: (compId: string, x: number, y: number) => void;
  onPinClick: (compId: string, pinId: string, shift?: boolean) => void;
  onPinPointerDown?: (compId: string, pinId: string) => void;
  onPinPointerUp?: (compId: string, pinId: string) => void;
  /** When provided, LED on/brightness is derived from net voltages (forward bias) instead of props. */
  pinToNetId?: Map<string, string> | Record<string, string>;
  netVoltageById?: Record<string, number> | Map<string, number>;
}

export function WorkbenchLEDRenderer({
  comp,
  isSelected,
  onSelect,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
  pinToNetId,
  netVoltageById,
}: WorkbenchLEDRendererProps) {
  const vf = (comp.props?.vf as number) ?? 1.8;
  const ledStatus = comp.props?.ledStatus as string | undefined;
  let on: boolean;
  let brightness: number;
  // LED on/brightness only from engine (branch current). No voltage-only fallback — no current = OFF.
  if (comp.props?.on !== undefined && comp.props?.brightness !== undefined) {
    on = !!comp.props.on;
    brightness = Math.min(1, Math.max(0, (comp.props.brightness as number) ?? 0));
  } else {
    on = false;
    brightness = 0;
  }
  const color = ledColor(comp.props?.color as string);
  const anodeId = comp.pins[0]?.id ?? 'anode';
  const cathodeId = comp.pins[1]?.id ?? 'cathode';
  const flipX = !!comp.flipX;

  const dimColor = (c: string, factor: number) => {
    const hex = c.replace('#', '');
    const r = Math.round(parseInt(hex.slice(0, 2), 16) * factor);
    const g = Math.round(parseInt(hex.slice(2, 4), 16) * factor);
    const b = Math.round(parseInt(hex.slice(4, 6), 16) * factor);
    return `rgb(${r},${g},${b})`;
  };

  const isBurned = ledStatus === 'burned';
  const isDamaged = ledStatus === 'damaged';
  const isOvercurrent = ledStatus === 'overcurrent';
  const damageDim = isBurned ? 0.2 : isDamaged ? 0.45 : isOvercurrent ? 0.85 : 1;
  const lensFill = isBurned ? '#1f2937' : on ? dimColor(color, damageDim) : dimColor(color, 0.55);
  const glowVisible = on && !isBurned;

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

      {/* Glow behind dome when on */}
      {glowVisible && (
        <Circle
          x={DOME_CX}
          y={DOME_CY}
          radius={DOME_R + 4}
          fill={color}
          opacity={0.3 + brightness * 0.5}
          shadowColor={color}
          shadowBlur={10 + brightness * 15}
          shadowOpacity={0.5 + brightness * 0.3}
          strokeScaleEnabled={false}
          listening={false}
        />
      )}

      {/* Plastic base ring: small horizontal ellipse under dome */}
      <Ellipse
        x={DOME_CX}
        y={BASE_Y}
        radiusX={14}
        radiusY={4}
        fill="#374151"
        stroke="#4b5563"
        strokeWidth={1}
        strokeScaleEnabled={false}
        listening={false}
      />

      {/* Dome: smooth circular top */}
      <Circle
        x={DOME_CX}
        y={DOME_CY}
        radius={DOME_R}
        fill={lensFill}
        stroke={isSelected ? '#60a5fa' : isBurned ? '#7f1d1d' : isDamaged ? '#b45309' : '#64748b'}
        strokeWidth={isSelected ? 2 : isBurned || isDamaged ? 1.5 : 1}
        strokeScaleEnabled={false}
        listening={false}
      />
      {/* Status badge: overcurrent / damaged / burned */}
      {(isOvercurrent || isDamaged || isBurned) && (
        <Text
          x={DOME_CX - 14}
          y={DOME_CY - 6}
          text={isBurned ? 'Burned' : isDamaged ? 'Damaged' : '!'}
          fontSize={isBurned ? 7 : 8}
          fill={isBurned ? '#fca5a5' : isDamaged ? '#fdba74' : '#fde047'}
          listening={false}
          strokeScaleEnabled={false}
        />
      )}

      {/* Highlight reflection: top-left, circular */}
      <Circle
        x={DOME_CX - 5}
        y={DOME_CY - 6}
        radius={5}
        fill="rgba(255,255,255,0.3)"
        strokeScaleEnabled={false}
        listening={false}
      />

      {/* Darker internal core (cup), circular */}
      <Circle
        x={DOME_CX + 4}
        y={DOME_CY + 3}
        radius={5}
        fill="rgba(0,0,0,0.2)"
        strokeScaleEnabled={false}
        listening={false}
      />

      <Group scaleX={flipX ? -1 : 1} offsetX={FP.ax} x={FP.ax}>
        <Text x={A.x - 14} y={BASE_Y - 8} text="A (+)" fontSize={8} fill="#9ca3af" listening={false} strokeScaleEnabled={false} />
        <Text x={K.x - 4} y={BASE_Y - 8} text="K (−)" fontSize={8} fill="#9ca3af" listening={false} strokeScaleEnabled={false} />
      </Group>

      {/* Legs: thin metal lines from base to leg tips. Anode longer than cathode. */}
      <Line
        points={[A.x, BASE_Y, A.x, A.y]}
        stroke={LEG_STROKE}
        strokeWidth={LEG_SW}
        lineCap="round"
        strokeScaleEnabled={false}
        listening={false}
      />
      <Line
        points={[K.x, BASE_Y, K.x, K.y]}
        stroke={LEG_STROKE}
        strokeWidth={LEG_SW}
        lineCap="round"
        strokeScaleEnabled={false}
        listening={false}
      />

      {/* Connection points: exactly at leg tips, r=12, invisible */}
      <Circle
        x={A.x}
        y={A.y}
        radius={HIT_R}
        opacity={0}
        onClick={(e) => {
          e.cancelBubble = true;
          onPinClick(comp.id, anodeId, (e.evt as MouseEvent).shiftKey);
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onPinClick(comp.id, anodeId, (e.evt as MouseEvent).shiftKey);
        }}
        onPointerDown={(e) => {
          e.cancelBubble = true;
          onPinPointerDown?.(comp.id, anodeId);
        }}
        onPointerUp={(e) => {
          e.cancelBubble = true;
          onPinPointerUp?.(comp.id, anodeId);
        }}
      />
      <Circle
        x={K.x}
        y={K.y}
        radius={HIT_R}
        opacity={0}
        onClick={(e) => {
          e.cancelBubble = true;
          onPinClick(comp.id, cathodeId, (e.evt as MouseEvent).shiftKey);
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onPinClick(comp.id, cathodeId, (e.evt as MouseEvent).shiftKey);
        }}
        onPointerDown={(e) => {
          e.cancelBubble = true;
          onPinPointerDown?.(comp.id, cathodeId);
        }}
        onPointerUp={(e) => {
          e.cancelBubble = true;
          onPinPointerUp?.(comp.id, cathodeId);
        }}
      />
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
