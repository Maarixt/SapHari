/**
 * Schematic Battery (DC Voltage Source): long plate (+), short plate (−).
 * Footprint: 90x50, anchor (45,25). P at (5,25), N at (85,25).
 *
 * Geometry:
 * - Terminal lines: (5,25)→(25,25) and (65,25)→(85,25)
 * - Positive plate (long): vertical at x=35, y=10..40
 * - Negative plate (short): vertical at x=55, y=16..34
 * - Optional +/− labels, voltage below
 *
 * Styling: stroke #e5e7eb, strokeWidth 2, no shadows.
 * Connection points at line ends (P and N).
 */

import React from 'react';
import { Group, Circle, Line, Rect, Text } from 'react-konva';
import type { SimComponent, Wire } from '../types';
import { getBatteryPolarity, type Rot } from '../utils/batteryPolarity';

const HIT_R = 12;
const DOT_R = 2;
const SW = 2;
const STROKE = '#e5e7eb';

const FP = { w: 90, h: 50, ax: 45, ay: 25 };
const P = { x: 5, y: 25 };
const N = { x: 85, y: 25 };
const T_LEFT = 25;
const T_RIGHT = 65;
const PLATE_POS_X = 35;
const PLATE_NEG_X = 55;
const PLATE_POS_TOP = 10;
const PLATE_POS_BOT = 40;
const PLATE_NEG_TOP = 16;
const PLATE_NEG_BOT = 34;

function normalizeRot(r: number | undefined): Rot {
  if (r === undefined || r === null) return 0;
  const n = Math.round(Number(r)) % 360;
  if (n === 0 || n === 360) return 0;
  if (n === 90 || n === -270) return 90;
  if (n === 180 || n === -180) return 180;
  if (n === 270 || n === -90) return 270;
  return 0;
}

/** P (left in local) shows right-side polarity when flipX; N (right in local) shows left-side when flipX. */
function endLabels(rotation: Rot, flipX: boolean): { leftLabel: string; rightLabel: string } {
  const p = getBatteryPolarity(rotation);
  const leftLabel = (flipX ? p.pos === 'right' : p.pos === 'left') ? 'P (+)' : 'N (−)';
  const rightLabel = (flipX ? p.pos === 'left' : p.pos === 'right') ? 'P (+)' : 'N (−)';
  return { leftLabel, rightLabel };
}

export interface Props {
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

const AC_CIRCLE_CX = 45;
const AC_CIRCLE_R = 14;
const AC_TERM_LEFT = 18;
const AC_TERM_RIGHT = 72;

function acSinePoints(): number[] {
  const pts: number[] = [];
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * 2 * Math.PI;
    pts.push(AC_CIRCLE_CX + (AC_CIRCLE_R - 3) * (i / n - 0.5) * 2, 25 + (AC_CIRCLE_R - 4) * 0.4 * Math.sin(t));
  }
  return pts;
}

export function SchematicDCSupplyRenderer({
  comp,
  isSelected,
  onSelect,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
}: Props) {
  const posPin = comp.pins[0]?.id ?? 'pos';
  const negPin = comp.pins[1]?.id ?? 'neg';
  const voltage = (comp.props?.voltage as number) ?? 5;
  const flipX = !!comp.flipX;
  const rotation = normalizeRot(comp.rotation);
  const { leftLabel, rightLabel } = endLabels(rotation, flipX);
  const selStroke = isSelected ? '#60a5fa' : STROKE;
  const acEnabled = !!(comp.props?.acEnabled as boolean);
  const amplitude = (comp.props?.amplitude as number) ?? 0;
  const frequencyHz = (comp.props?.frequencyHz as number) ?? 60;
  const voltageMode = (comp.props?.voltageMode as string) ?? 'rms';
  const vrms = amplitude / Math.SQRT2;
  const acLabelVolt = voltageMode === 'peak' ? `${amplitude.toFixed(1)} V` : `${vrms.toFixed(1)} Vrms`;
  const acLabelFreq = `${frequencyHz.toFixed(0)} Hz`;

  const content = acEnabled ? (
    <>
      <Rect x={0} y={0} width={FP.w} height={FP.h} fill="transparent" />
      <Line points={[P.x, P.y, AC_TERM_LEFT, P.y]} stroke={STROKE} strokeWidth={SW} lineCap="round" strokeScaleEnabled={false} listening={false} />
      <Line points={[AC_TERM_RIGHT, N.y, N.x, N.y]} stroke={STROKE} strokeWidth={SW} lineCap="round" strokeScaleEnabled={false} listening={false} />
      <Circle x={AC_CIRCLE_CX} y={25} radius={AC_CIRCLE_R} stroke={STROKE} strokeWidth={SW} listening={false} strokeScaleEnabled={false} />
      <Line points={acSinePoints()} stroke={STROKE} strokeWidth={SW} lineCap="round" strokeScaleEnabled={false} listening={false} />
      <Group scaleX={flipX ? -1 : 1} offsetX={FP.ax} x={FP.ax}>
        <Text x={0} y={8} width={FP.w} text="AC" fontSize={9} fontStyle="bold" fill={STROKE} align="center" listening={false} strokeScaleEnabled={false} />
        <Text x={0} y={38} width={FP.w} text={`${acLabelVolt}, ${acLabelFreq}`} fontSize={8} fill={STROKE} align="center" listening={false} strokeScaleEnabled={false} />
      </Group>
      <Circle x={P.x} y={P.y} radius={HIT_R} opacity={0} onClick={(e) => { e.cancelBubble = true; onPinClick(comp.id, posPin, (e.evt as MouseEvent).shiftKey); }} onTap={(e) => { e.cancelBubble = true; onPinClick(comp.id, posPin, (e.evt as MouseEvent).shiftKey); }} onPointerDown={(e) => { e.cancelBubble = true; onPinPointerDown?.(comp.id, posPin); }} onPointerUp={(e) => { e.cancelBubble = true; onPinPointerUp?.(comp.id, posPin); }} />
      <Circle x={P.x} y={P.y} radius={DOT_R} fill={selStroke} strokeScaleEnabled={false} listening={false} />
      <Circle x={N.x} y={N.y} radius={HIT_R} opacity={0} onClick={(e) => { e.cancelBubble = true; onPinClick(comp.id, negPin, (e.evt as MouseEvent).shiftKey); }} onTap={(e) => { e.cancelBubble = true; onPinClick(comp.id, negPin, (e.evt as MouseEvent).shiftKey); }} onPointerDown={(e) => { e.cancelBubble = true; onPinPointerDown?.(comp.id, negPin); }} onPointerUp={(e) => { e.cancelBubble = true; onPinPointerUp?.(comp.id, negPin); }} />
      <Circle x={N.x} y={N.y} radius={DOT_R} fill={selStroke} strokeScaleEnabled={false} listening={false} />
    </>
  ) : (
    <>
      <Rect x={0} y={0} width={FP.w} height={FP.h} fill="transparent" />

      {/* Terminal line P: (5,25) to (25,25) */}
      <Line
        points={[P.x, P.y, T_LEFT, P.y]}
        stroke={STROKE}
        strokeWidth={SW}
        lineCap="round"
        strokeScaleEnabled={false}
        listening={false}
      />

      {/* Terminal line N: (65,25) to (85,25) */}
      <Line
        points={[T_RIGHT, N.y, N.x, N.y]}
        stroke={STROKE}
        strokeWidth={SW}
        lineCap="round"
        strokeScaleEnabled={false}
        listening={false}
      />

      {/* Stub P terminal to positive plate: (25,25) to (35,25) */}
      <Line
        points={[T_LEFT, P.y, PLATE_POS_X, P.y]}
        stroke={STROKE}
        strokeWidth={SW}
        lineCap="round"
        strokeScaleEnabled={false}
        listening={false}
      />

      {/* Stub between plates: (35,25) to (55,25) — connects pos and neg plates */}
      <Line
        points={[PLATE_POS_X, P.y, PLATE_NEG_X, N.y]}
        stroke={STROKE}
        strokeWidth={SW}
        lineCap="round"
        strokeScaleEnabled={false}
        listening={false}
      />

      {/* Stub negative plate to N terminal: (55,25) to (65,25) */}
      <Line
        points={[PLATE_NEG_X, N.y, T_RIGHT, N.y]}
        stroke={STROKE}
        strokeWidth={SW}
        lineCap="round"
        strokeScaleEnabled={false}
        listening={false}
      />

      {/* Positive plate (long): vertical at x=35, y=10..40 */}
      <Line
        points={[PLATE_POS_X, PLATE_POS_TOP, PLATE_POS_X, PLATE_POS_BOT]}
        stroke={STROKE}
        strokeWidth={SW}
        lineCap="round"
        strokeScaleEnabled={false}
        listening={false}
      />

      {/* Negative plate (short): vertical at x=55, y=16..34 */}
      <Line
        points={[PLATE_NEG_X, PLATE_NEG_TOP, PLATE_NEG_X, PLATE_NEG_BOT]}
        stroke={STROKE}
        strokeWidth={SW}
        lineCap="round"
        strokeScaleEnabled={false}
        listening={false}
      />

      {/* Labels: polarity at ends flips with rotation/mirror; voltage in middle */}
      <Group scaleX={flipX ? -1 : 1} offsetX={FP.ax} x={FP.ax}>
        <Text x={0} y={42} width={FP.w} text={`${voltage}V`} fontSize={9} fill={STROKE} align="center" listening={false} strokeScaleEnabled={false} />
        <Text x={P.x - 10} y={P.y - 12} text={leftLabel} fontSize={8} fill={STROKE} listening={false} strokeScaleEnabled={false} />
        <Text x={N.x - 12} y={N.y - 12} text={rightLabel} fontSize={8} fill={STROKE} listening={false} strokeScaleEnabled={false} />
      </Group>

      {/* Connection point P — hit zone and small dot */}
      <Circle
        x={P.x}
        y={P.y}
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
      <Circle
        x={P.x}
        y={P.y}
        radius={DOT_R}
        fill={selStroke}
        strokeScaleEnabled={false}
        listening={false}
      />

      {/* Connection point N — hit zone and small dot */}
      <Circle
        x={N.x}
        y={N.y}
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
      <Circle
        x={N.x}
        y={N.y}
        radius={DOT_R}
        fill={selStroke}
        strokeScaleEnabled={false}
        listening={false}
      />
    </>
  );

  const rotationDeg = rotation === 90 ? 90 : rotation === 180 ? 180 : rotation === 270 ? 270 : 0;

  return (
    <Group
      x={comp.x}
      y={comp.y}
      offsetX={FP.ax}
      offsetY={FP.ay}
      rotation={rotationDeg}
      scaleX={flipX ? -1 : 1}
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
