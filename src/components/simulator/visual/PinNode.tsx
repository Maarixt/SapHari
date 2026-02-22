/**
 * Universal connection point: the visible circular pad IS the connection point.
 * Renders at exact (x, y). No offset, no separate overlay.
 * Same coordinates as findPin / getPinLocalOffset: snap target, wire endpoint, visual center, hitbox center.
 */

import React from 'react';
import { Circle } from 'react-konva';

export interface PinNodeProps {
  /** Position in parent Group (local to component). Must match getPinLocalOffset / findPin. */
  x: number;
  y: number;
  /** Pin id for events. */
  pinId: string;
  /** Component id for events. */
  compId: string;
  radius?: number;
  /** Wire attached to this pin. */
  connected?: boolean;
  /** Net has voltage (electrical state). */
  powered?: boolean;
  /** Mouse hover for snap feedback. */
  hover?: boolean;
  /** Pin's net has only this pin (unconnected warning). Shown as border on pad, not a second dot. */
  unconnectedWarning?: boolean;
  /** Ground-style pin (e.g. power_rail gnd): darker fill. */
  kind?: 'power' | 'ground' | 'digital' | 'analog' | 'default';
  onClick?: (compId: string, pinId: string, shift?: boolean) => void;
  onTap?: (compId: string, pinId: string, shift?: boolean) => void;
  onPointerDown?: (compId: string, pinId: string) => void;
  onPointerUp?: (compId: string, pinId: string) => void;
  /** Hit radius for snapping (>= radius). Default 1.5 * radius. */
  hitRadius?: number;
  listening?: boolean;
  /** Wire tool active: make pad more visible (brighter stroke, slightly larger). */
  wiringMode?: boolean;
}

const PAD_FILL_IDLE = '#1f2937';
const PAD_FILL_CONNECTED = '#374151';
const PAD_FILL_POWERED = '#f59e0b';
const PAD_STROKE = '#9ca3af';
const PAD_STROKE_WIRING = '#cbd5e1';
const PAD_STROKE_HOVER = '#e5e7eb';
const PAD_STROKE_UNCONNECTED = '#f59e0b';
const PAD_GROUND = '#475569';
const DEFAULT_RADIUS = 6;

export function PinNode({
  x,
  y,
  pinId,
  compId,
  radius = DEFAULT_RADIUS,
  connected = false,
  powered = false,
  hover = false,
  unconnectedWarning = false,
  kind = 'default',
  onClick,
  onTap,
  onPointerDown,
  onPointerUp,
  hitRadius,
  listening = true,
  wiringMode = false,
}: PinNodeProps) {
  const hit = hitRadius ?? Math.max(radius * 1.5, 10);
  const padRadius = wiringMode && !hover ? radius + 1 : radius;

  let fill = PAD_FILL_IDLE;
  if (powered) fill = PAD_FILL_POWERED;
  else if (connected) fill = PAD_FILL_CONNECTED;
  else if (kind === 'ground') fill = PAD_GROUND;

  let stroke = PAD_STROKE;
  if (unconnectedWarning) stroke = PAD_STROKE_UNCONNECTED;
  else if (hover) stroke = PAD_STROKE_HOVER;
  else if (wiringMode) stroke = PAD_STROKE_WIRING;

  const strokeWidth = hover || unconnectedWarning ? 2 : wiringMode ? 1.5 : 1;

  return (
    <>
      {/* Hit area: same center (x,y), larger radius for snapping */}
      <Circle
        x={x}
        y={y}
        radius={hit}
        opacity={0}
        listening={listening}
        onClick={(e) => {
          e.cancelBubble = true;
          onClick?.(compId, pinId, (e.evt as MouseEvent).shiftKey);
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onTap?.(compId, pinId, (e.evt as MouseEvent).shiftKey);
        }}
        onPointerDown={(e) => {
          e.cancelBubble = true;
          onPointerDown?.(compId, pinId);
        }}
        onPointerUp={(e) => {
          e.cancelBubble = true;
          onPointerUp?.(compId, pinId);
        }}
      />
      {/* Visible pad: exact (x,y). One anchor, one truth. */}
      <Circle
        x={x}
        y={y}
        radius={padRadius}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        listening={false}
        strokeScaleEnabled={false}
      />
    </>
  );
}
