/**
 * Schematic resistor: US-style zig-zag between two terminals.
 * Footprint 90x50, anchor center, pins a (left) and b (right) at (10,25) and (80,25).
 * Rotation and flip preserve pin ids in local space; transform handles world position.
 */
import React from 'react';
import { Group, Circle, Line, Rect, Text } from 'react-konva';
import type { SimComponent, Wire } from '../types';
import { normalizeRotation } from '../utils/transformPins';

const VIS_R = 4;
const HIT_R = 12;
const SW = 2;

const FP = { w: 90, h: 50, ax: 45, ay: 25 };
const PA = { x: 10, y: 25 };
const PB = { x: 80, y: 25 };
const ZIG_START = 25;
const ZIG_END = 65;
const ZIG_AMP = 8;
const ZIG_PEAKS = 6;

function buildZigZag(): number[] {
  const pts: number[] = [];
  pts.push(ZIG_START, PA.y);
  const seg = (ZIG_END - ZIG_START) / ZIG_PEAKS;
  for (let i = 0; i < ZIG_PEAKS; i++) {
    const cx = ZIG_START + seg * (i + 0.5);
    const cy = PA.y + (i % 2 === 0 ? -ZIG_AMP : ZIG_AMP);
    pts.push(cx, cy);
  }
  pts.push(ZIG_END, PA.y);
  return pts;
}

const ZIG = buildZigZag();

function formatResistance(ohms: number): string {
  if (ohms >= 1000) {
    return (ohms % 1000 === 0 ? (ohms / 1000).toFixed(0) : (ohms / 1000).toFixed(1)) + 'kΩ';
  }
  return `${ohms}Ω`;
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

export function SchematicResistorRenderer({ comp, isSelected, onSelect, onDragEnd, onPinClick, onPinPointerDown, onPinPointerUp }: Props) {
  const pinAId = comp.pins.find((p) => p.id === 'a')?.id ?? comp.pins[0]?.id ?? 'a';
  const pinBId = comp.pins.find((p) => p.id === 'b')?.id ?? comp.pins[1]?.id ?? 'b';
  const ohms = (comp.props?.resistanceOhms ?? comp.props?.ohms) as number | undefined;
  const resistance = ohms ?? 220;
  const formattedValue = formatResistance(resistance);
  const flipX = !!comp.flipX;
  const flipY = !!comp.flipY;
  const stroke = '#e2e8f0';
  const sel = isSelected ? '#60a5fa' : '#94a3b8';

  const content = (
    <>
      <Rect x={0} y={0} width={FP.w} height={FP.h} fill="transparent" />
      {/* stub A */}
      <Line points={[PA.x + VIS_R, PA.y, ZIG_START, PA.y]} stroke={stroke} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
      {/* zig-zag body */}
      <Line points={ZIG} stroke={stroke} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
      {/* stub B */}
      <Line points={[ZIG_END, PA.y, PB.x - VIS_R, PB.y]} stroke={stroke} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
      {/* label: R + value */}
      <Text x={0} y={4} width={FP.w} text={`R ${formattedValue}`} fontSize={9} fill={stroke} align="center" listening={false} />
      {/* pin A */}
      <Circle
        x={PA.x}
        y={PA.y}
        radius={HIT_R}
        fill="transparent"
        stroke="transparent"
        strokeScaleEnabled={false}
        onClick={(e) => { e.cancelBubble = true; onPinClick(comp.id, pinAId, (e.evt as MouseEvent).shiftKey); }}
        onTap={(e) => { e.cancelBubble = true; onPinClick(comp.id, pinAId, (e.evt as MouseEvent).shiftKey); }}
        onPointerDown={(e) => { e.cancelBubble = true; onPinPointerDown?.(comp.id, pinAId); }}
        onPointerUp={(e) => { e.cancelBubble = true; onPinPointerUp?.(comp.id, pinAId); }}
      />
      <Circle x={PA.x} y={PA.y} radius={VIS_R} fill={stroke} stroke={sel} strokeScaleEnabled={false} listening={false} />
      {/* pin B */}
      <Circle
        x={PB.x}
        y={PB.y}
        radius={HIT_R}
        fill="transparent"
        stroke="transparent"
        strokeScaleEnabled={false}
        onClick={(e) => { e.cancelBubble = true; onPinClick(comp.id, pinBId, (e.evt as MouseEvent).shiftKey); }}
        onTap={(e) => { e.cancelBubble = true; onPinClick(comp.id, pinBId, (e.evt as MouseEvent).shiftKey); }}
        onPointerDown={(e) => { e.cancelBubble = true; onPinPointerDown?.(comp.id, pinBId); }}
        onPointerUp={(e) => { e.cancelBubble = true; onPinPointerUp?.(comp.id, pinBId); }}
      />
      <Circle x={PB.x} y={PB.y} radius={VIS_R} fill={stroke} stroke={sel} strokeScaleEnabled={false} listening={false} />
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
