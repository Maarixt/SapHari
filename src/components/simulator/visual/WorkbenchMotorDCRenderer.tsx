/**
 * Workbench DC Motor: footprint 80x70, pins on centerline.
 * Pins are geometry-based: normalized (nx, ny) relative to bounds, rendered as Group children.
 * Spin ONLY when engine2 solved branch current and loop closed; no voltage heuristic.
 * Hit rect + listening so motor is draggable/selectable.
 */

import React, { useRef, useEffect } from 'react';
import { Group, Rect, Circle, Line, Text } from 'react-konva';
import type Konva from 'konva';
import type { SimComponent } from '../types';

const FP_W = 80;
const FP_H = 70;
const ANCHOR_X = 40;
const ANCHOR_Y = 35;
const HOUSING_R = 24;
const ROTOR_R = 14;
const SHAFT_NUB_R = 4;
const PIN_R = 10;
const HIT_R = 14;
const WIRE_MODE_RING_R = 12;
const WIRE_MODE_STROKE = '#e2e8f0';

/** Normalized pin position (0–1) relative to motor width/height. Single source of truth for pin geometry. */
interface NormalizedPin {
  id: string;
  nx: number;
  ny: number;
  label: string;
}

const MOTOR_PINS: NormalizedPin[] = [
  { id: 'P', nx: 0, ny: 0.5, label: 'M+' },
  { id: 'N', nx: 1, ny: 0.5, label: 'M−' },
];

/** Resolve pin position in local space: (FP_W * nx, FP_H * ny). Do not add comp.x/comp.y — Group handles transform. */
function pinLocalFromNormalized(p: NormalizedPin): { x: number; y: number } {
  return { x: FP_W * p.nx, y: FP_H * p.ny };
}

export interface WorkbenchMotorDCRendererProps {
  comp: SimComponent;
  isSelected: boolean;
  onSelect: (id: string, shift?: boolean) => void;
  onDragEnd?: (compId: string, x: number, y: number) => void;
  onPinClick: (compId: string, pinId: string, shift?: boolean) => void;
  onPinPointerDown?: (compId: string, pinId: string) => void;
  onPinPointerUp?: (compId: string, pinId: string) => void;
  /** When true, draw wire-mode snap circles on M+ / M− so they align with the pads. */
  isWiringMode?: boolean;
}

export function WorkbenchMotorDCRenderer({
  comp,
  isSelected,
  onSelect,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
  isWiringMode = false,
}: WorkbenchMotorDCRendererProps) {
  const spinning = !!(comp.props?.spinning);
  const speed = Math.min(1, Math.max(0, (comp.props?.speed as number) ?? 0));
  const direction = (comp.props?.direction as number) ?? 0;
  const rotorRef = useRef<Konva.Group>(null);
  const angleRef = useRef(0);

  useEffect(() => {
    if (!spinning || speed < 0.01) return;
    let id: number;
    const step = () => {
      const dir = direction > 0 ? 1 : direction < 0 ? -1 : 0;
      angleRef.current += dir * speed * 12;
      const node = rotorRef.current;
      if (node) {
        node.rotation(angleRef.current);
        node.getLayer()?.batchDraw();
      }
      id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [spinning, speed, direction]);

  const dirLabel = direction > 0 ? 'CW' : direction < 0 ? 'CCW' : '';

  return (
    <Group
      x={comp.x}
      y={comp.y}
      offsetX={ANCHOR_X}
      offsetY={ANCHOR_Y}
      draggable
      listening={true}
      onDragEnd={(e) => onDragEnd?.(comp.id, e.target.x(), e.target.y(), (e.evt as MouseEvent))}
      onClick={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
      onTap={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
    >
      {/* Invisible hit area so drag/click register even with circles/strokes */}
      <Rect
        x={0}
        y={0}
        width={FP_W}
        height={FP_H}
        fill="rgba(0,0,0,0)"
        listening={true}
        onClick={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
        onTap={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
      />
      {/* Terminal stubs: from pin positions to housing */}
      <Line
        points={[FP_W * 0, FP_H * 0.5, ANCHOR_X - HOUSING_R, ANCHOR_Y]}
        stroke="#6b7280"
        strokeWidth={2.5}
        listening={false}
      />
      <Line
        points={[ANCHOR_X + HOUSING_R, ANCHOR_Y, FP_W * 1, FP_H * 0.5]}
        stroke="#6b7280"
        strokeWidth={2.5}
        listening={false}
      />
      {/* Outer housing */}
      <Circle
        x={ANCHOR_X}
        y={ANCHOR_Y}
        radius={HOUSING_R}
        fill="#374151"
        stroke={isSelected ? '#60a5fa' : '#4b5563'}
        strokeWidth={2.5}
        listening={false}
        opacity={1}
      />
      {/* Inner rotor (animates only when isSpinning) */}
      <Group ref={rotorRef} x={ANCHOR_X} y={ANCHOR_Y} listening={false}>
        <Circle x={0} y={0} radius={ROTOR_R} fill="#4b5563" stroke="#6b7280" strokeWidth={1.5} opacity={1} />
        <Line points={[-ROTOR_R, 0, ROTOR_R, 0]} stroke="#22c55e" strokeWidth={2.5} opacity={1} />
        <Line points={[0, -ROTOR_R, 0, ROTOR_R]} stroke="#22c55e" strokeWidth={2.5} opacity={1} />
      </Group>
      {/* Shaft nub on right */}
      <Circle
        x={ANCHOR_X + HOUSING_R + SHAFT_NUB_R + 2}
        y={ANCHOR_Y}
        radius={SHAFT_NUB_R}
        fill="#6b7280"
        stroke="#9ca3af"
        strokeWidth={1}
        listening={false}
        opacity={1}
      />
      {/* Center: motor body label only (not a connection point) */}
      <Text x={ANCHOR_X - 8} y={ANCHOR_Y - 8} text="M" fontSize={14} fontStyle="bold" fill="#9ca3af" listening={false} opacity={1} />
      {isSelected && (dirLabel || speed > 0) && (
        <Text
          x={ANCHOR_X - 22}
          y={ANCHOR_Y + HOUSING_R + 4}
          text={dirLabel ? `${dirLabel} ${Math.round(speed * 100)}%` : `${Math.round(speed * 100)}%`}
          fontSize={10}
          fill="#94a3b8"
          listening={false}
          opacity={1}
        />
      )}
      {/* Pins as Group children: positions from normalized (nx, ny); no extra comp.x/comp.y */}
      {MOTOR_PINS.map((p) => {
        const pos = pinLocalFromNormalized(p);
        return (
          <React.Fragment key={p.id}>
            <Circle
              x={pos.x}
              y={pos.y}
              radius={HIT_R}
              fill="transparent"
              stroke="#94a3b8"
              strokeWidth={1.5}
              onClick={(e) => { e.cancelBubble = true; onPinClick(comp.id, p.id, (e.evt as MouseEvent).shiftKey); }}
              onTap={(e) => { e.cancelBubble = true; onPinClick(comp.id, p.id, (e.evt as MouseEvent).shiftKey); }}
              onPointerDown={(e) => { e.cancelBubble = true; onPinPointerDown?.(comp.id, p.id); }}
              onPointerUp={(e) => { e.cancelBubble = true; onPinPointerUp?.(comp.id, p.id); }}
            />
            <Circle x={pos.x} y={pos.y} radius={PIN_R} fill="#1e293b" stroke="#64748b" strokeWidth={1} listening={false} opacity={1} />
            {isWiringMode && (
              <Circle x={pos.x} y={pos.y} radius={WIRE_MODE_RING_R} stroke={WIRE_MODE_STROKE} strokeWidth={2} opacity={0.9} listening={false} strokeScaleEnabled={false} />
            )}
            <Text x={pos.x - 12} y={pos.y - 20} text={p.label} fontSize={9} fill="#94a3b8" listening={false} opacity={1} />
          </React.Fragment>
        );
      })}
    </Group>
  );
}
