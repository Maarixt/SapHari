/**
 * Workbench resistor: physical axial resistor body with leads.
 * Footprint: 90x50, anchor (45,25). Pins a (left) and b (right) at (10,25) and (80,25).
 *
 * Physical structure:
 * - Rounded body (Rect with cornerRadius)
 * - Two leads (Line) from body to pin positions
 * - Optional 3-4 color bands based on resistance value
 */

import React from 'react';
import { Group, Rect, Line, Circle, Text } from 'react-konva';
import type { SimComponent } from '../types';
import { normalizeRotation } from '../utils/transformPins';

const FP = { w: 90, h: 50, ax: 45, ay: 25 };
const PA = { x: 10, y: 25 };
const PB = { x: 80, y: 25 };
const BODY_LEFT = 18;
const BODY_RIGHT = 72;
const BODY_TOP = 12;
const BODY_BOT = 38;
const BODY_R = 6;
const LEG_STROKE = '#9ca3af';
const LEG_SW = 2;
const HIT_R = 12;

/** Color band mapping (digit / multiplier). 3-band: digit1, digit2, multiplier. */
const BAND_COLORS: Record<string, string> = {
  black: '#1a1a1a',
  brown: '#8B4513',
  red: '#dc2626',
  orange: '#ea580c',
  yellow: '#eab308',
  green: '#16a34a',
  blue: '#2563eb',
  violet: '#7c3aed',
  grey: '#6b7280',
  white: '#f8fafc',
  gold: '#d4af37',
  silver: '#94a3b8',
};

const DIGIT_KEYS = ['black', 'brown', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'grey', 'white'];
const MULT_KEYS = ['black', 'brown', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'grey', 'white', 'gold', 'silver'];

/** Derive 3 color bands from resistance (digit1, digit2, multiplier). Simple mapping. */
function resistanceToBands(ohms: number): string[] {
  if (ohms <= 0 || !Number.isFinite(ohms)) return [BAND_COLORS.brown, BAND_COLORS.black, BAND_COLORS.brown];
  let val = ohms;
  let exp = 0;
  while (val >= 100) {
    val /= 10;
    exp++;
  }
  while (val < 10 && val >= 1) {
    val *= 10;
    exp--;
  }
  const d1 = Math.floor(val / 10) % 10;
  const d2 = Math.floor(val) % 10;
  const multIdx = Math.max(0, Math.min(exp, MULT_KEYS.length - 1));
  return [
    BAND_COLORS[DIGIT_KEYS[d1] ?? 'black'] ?? BAND_COLORS.brown,
    BAND_COLORS[DIGIT_KEYS[d2] ?? 'black'] ?? BAND_COLORS.black,
    BAND_COLORS[MULT_KEYS[multIdx] ?? 'brown'] ?? BAND_COLORS.brown,
  ];
}

export interface WorkbenchResistorRendererProps {
  comp: SimComponent;
  isSelected: boolean;
  onSelect: (id: string, shift?: boolean) => void;
  onDragEnd?: (compId: string, x: number, y: number, evt?: MouseEvent) => void;
  onPinClick: (compId: string, pinId: string, shift?: boolean) => void;
  onPinPointerDown?: (compId: string, pinId: string) => void;
  onPinPointerUp?: (compId: string, pinId: string) => void;
}

export function WorkbenchResistorRenderer({
  comp,
  isSelected,
  onSelect,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
}: WorkbenchResistorRendererProps) {
  const ohms = (comp.props?.resistanceOhms ?? comp.props?.ohms) as number | undefined;
  const resistance = ohms ?? 1000;
  const pinAId = comp.pins.find((p) => p.id === 'a')?.id ?? comp.pins[0]?.id ?? 'a';
  const pinBId = comp.pins.find((p) => p.id === 'b')?.id ?? comp.pins[1]?.id ?? 'b';
  const flipX = !!comp.flipX;
  const flipY = !!comp.flipY;
  const bands = resistanceToBands(resistance);
  const overloaded = (comp.props?.resistorOverload as boolean) ?? false;
  const bodyFill = overloaded ? '#6b7280' : '#d4c4a8';

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

      {/* Left lead: pin to body */}
      <Line
        points={[PA.x, PA.y, BODY_LEFT, PA.y]}
        stroke={LEG_STROKE}
        strokeWidth={LEG_SW}
        lineCap="round"
        strokeScaleEnabled={false}
        listening={false}
      />
      {/* Right lead: body to pin */}
      <Line
        points={[BODY_RIGHT, PA.y, PB.x, PB.y]}
        stroke={LEG_STROKE}
        strokeWidth={LEG_SW}
        lineCap="round"
        strokeScaleEnabled={false}
        listening={false}
      />

      {/* Rounded body */}
      <Rect
        x={BODY_LEFT}
        y={BODY_TOP}
        width={BODY_RIGHT - BODY_LEFT}
        height={BODY_BOT - BODY_TOP}
        fill={bodyFill}
        stroke={isSelected ? '#60a5fa' : '#9ca3af'}
        strokeWidth={isSelected ? 2 : 1}
        cornerRadius={BODY_R}
        strokeScaleEnabled={false}
        listening={false}
      />

      {/* Optional 3 color bands */}
      {bands.length >= 3 && (
        <>
          {bands.map((color, i) => (
            <Rect
              key={i}
              x={BODY_LEFT + 6 + i * 14}
              y={BODY_TOP + 2}
              width={8}
              height={BODY_BOT - BODY_TOP - 4}
              fill={color}
              strokeScaleEnabled={false}
              listening={false}
            />
          ))}
        </>
      )}

      {/* Value label below body */}
      <Text
        x={BODY_LEFT}
        y={BODY_BOT + 2}
        width={BODY_RIGHT - BODY_LEFT}
        text={resistance >= 1000 ? `${(resistance / 1000).toFixed(resistance % 1000 ? 1 : 0)}kΩ` : `${resistance}Ω`}
        fontSize={9}
        fill="#6b7280"
        align="center"
        listening={false}
        strokeScaleEnabled={false}
      />

      {/* Pin hit areas */}
      <Circle
        x={PA.x}
        y={PA.y}
        radius={HIT_R}
        opacity={0}
        onClick={(e) => {
          e.cancelBubble = true;
          onPinClick(comp.id, pinAId, (e.evt as MouseEvent).shiftKey);
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onPinClick(comp.id, pinAId, (e.evt as MouseEvent).shiftKey);
        }}
        onPointerDown={(e) => {
          e.cancelBubble = true;
          onPinPointerDown?.(comp.id, pinAId);
        }}
        onPointerUp={(e) => {
          e.cancelBubble = true;
          onPinPointerUp?.(comp.id, pinAId);
        }}
      />
      <Circle
        x={PA.x}
        y={PA.y}
        radius={4}
        fill={LEG_STROKE}
        stroke={isSelected ? '#60a5fa' : '#94a3b8'}
        strokeWidth={1}
        strokeScaleEnabled={false}
        listening={false}
      />
      <Circle
        x={PB.x}
        y={PB.y}
        radius={HIT_R}
        opacity={0}
        onClick={(e) => {
          e.cancelBubble = true;
          onPinClick(comp.id, pinBId, (e.evt as MouseEvent).shiftKey);
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onPinClick(comp.id, pinBId, (e.evt as MouseEvent).shiftKey);
        }}
        onPointerDown={(e) => {
          e.cancelBubble = true;
          onPinPointerDown?.(comp.id, pinBId);
        }}
        onPointerUp={(e) => {
          e.cancelBubble = true;
          onPinPointerUp?.(comp.id, pinBId);
        }}
      />
      <Circle
        x={PB.x}
        y={PB.y}
        radius={4}
        fill={LEG_STROKE}
        stroke={isSelected ? '#60a5fa' : '#94a3b8'}
        strokeWidth={1}
        strokeScaleEnabled={false}
        listening={false}
      />
    </>
  );

  return (
    <Group
      x={comp.x}
      y={comp.y}
      offsetX={FP.ax}
      offsetY={FP.ay}
      rotation={normalizeRotation(comp.rotation)}
      scaleX={flipX ? -1 : 1}
      scaleY={flipY ? -1 : 1}
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
