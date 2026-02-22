import React from 'react';
import { Group, Circle, Line, Rect, Text } from 'react-konva';
import type { SimComponent, Wire } from '../types';

const VIS_R = 4;
const HIT_R = 12;
const SW = 2;

const FP = { w: 90, h: 50, ax: 45, ay: 25 };
const PA = { x: 10, y: 25 };
const PB = { x: 80, y: 25 };

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
  onPressChange?: (compId: string, actuated: boolean) => void;
}

function derivePushButtonViewState(comp: SimComponent) {
  const mechanism = comp.props?.mechanism === 'latch' ? 'latch' : 'momentary';
  const contact = comp.props?.contact === 'NC' ? 'NC' : 'NO';
  const pressed = !!comp.props?.pressed;
  const latched = !!comp.props?.latched;
  const isActuated = mechanism === 'latch' ? latched : pressed;
  const isClosed = contact === 'NO' ? isActuated : !isActuated;
  return { mechanism, contact, isActuated, isClosed };
}

export function SchematicButtonRenderer({ comp, isSelected, onSelect, onDragEnd, onPinClick, onPinPointerDown, onPinPointerUp, onPressChange }: Props) {
  const pinA = 'P1';
  const pinB = 'P2';
  const { mechanism, contact, isActuated, isClosed } = derivePushButtonViewState(comp);
  const isMomentary = mechanism === 'momentary';
  const isLatch = mechanism === 'latch';
  const gx = comp.x - FP.ax;
  const gy = comp.y - FP.ay;
  const stroke = '#e2e8f0';
  const sel = isSelected ? '#60a5fa' : '#94a3b8';
  const contactY = 30;
  const leftContactX = 34;
  const rightContactX = 56;

  return (
    <Group x={gx} y={gy} draggable
      onDragEnd={e => onDragEnd(comp.id, e.target.x() + FP.ax, e.target.y() + FP.ay)}
      onClick={e => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
      onTap={e => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}>
      {/* body hit for selection/drag — drawn first so cap hitbox can sit on top for press */}
      <Rect x={0} y={0} width={FP.w} height={FP.h} fill="transparent" listening={true} />
      {/* Cap hitbox for press; must be after body so it receives clicks on the actuator area */}
      <Rect
        x={30}
        y={4}
        width={30}
        height={16}
        fill="transparent"
        onPointerDown={e => {
          e.cancelBubble = true;
          if (isMomentary) onPressChange?.(comp.id, true);
          onSelect(comp.id, (e.evt as MouseEvent).shiftKey);
        }}
        onPointerUp={e => {
          e.cancelBubble = true;
          if (isMomentary) onPressChange?.(comp.id, false);
        }}
        onPointerLeave={e => {
          e.cancelBubble = true;
          if (isMomentary) onPressChange?.(comp.id, false);
        }}
        onClick={e => {
          e.cancelBubble = true;
          if (isLatch) onPressChange?.(comp.id, !isActuated);
          onSelect(comp.id, (e.evt as MouseEvent).shiftKey);
        }}
        onTap={e => {
          e.cancelBubble = true;
          if (isLatch) onPressChange?.(comp.id, !isActuated);
          onSelect(comp.id, (e.evt as MouseEvent).shiftKey);
        }}
      />
      {/* Terminal stubs */}
      <Line points={[PA.x + VIS_R, PA.y, leftContactX, contactY]} stroke={stroke} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
      <Line points={[rightContactX, contactY, PB.x - VIS_R, PB.y]} stroke={stroke} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
      {/* Contact circles */}
      <Circle x={leftContactX} y={contactY} radius={3} fill="transparent" stroke={stroke} strokeWidth={1.5} strokeScaleEnabled={false} listening={false} />
      <Circle x={rightContactX} y={contactY} radius={3} fill="transparent" stroke={stroke} strokeWidth={1.5} strokeScaleEnabled={false} listening={false} />
      {/* Contact state (NO/NC depends on actuated state) */}
      {isClosed ? (
        <Line points={[leftContactX + 3, contactY, rightContactX - 3, contactY]} stroke={stroke} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
      ) : (
        <>
          <Line points={[leftContactX + 3, contactY, 43, contactY]} stroke={stroke} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
          <Line points={[47, contactY, rightContactX - 3, contactY]} stroke={stroke} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
        </>
      )}
      {/* Pushbutton actuator (rod + cap) */}
      <Line points={[45, 12, 45, 22]} stroke={stroke} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
      <Line points={[33, 12, 57, 12]} stroke={stroke} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
      {/* Label + pin names */}
      <Text x={0} y={1} width={FP.w} text={`PB (${contact}, ${isMomentary ? 'MOM' : 'LATCH'})`} fontSize={8} fill={stroke} align="center" listening={false} />
      <Text x={PA.x - 8} y={PA.y + 7} text="P1" fontSize={8} fill="#94a3b8" listening={false} />
      <Text x={PB.x - 8} y={PB.y + 7} text="P2" fontSize={8} fill="#94a3b8" listening={false} />
      {/* pin A */}
      <Circle x={PA.x} y={PA.y} radius={HIT_R} fill="transparent" stroke="transparent" strokeScaleEnabled={false}
        onClick={e => { e.cancelBubble = true; onPinClick(comp.id, pinA, (e.evt as MouseEvent).shiftKey); }}
        onTap={e => { e.cancelBubble = true; onPinClick(comp.id, pinA, (e.evt as MouseEvent).shiftKey); }}
        onPointerDown={e => { e.cancelBubble = true; onPinPointerDown?.(comp.id, pinA); }}
        onPointerUp={e => { e.cancelBubble = true; onPinPointerUp?.(comp.id, pinA); }} />
      <Circle x={PA.x} y={PA.y} radius={VIS_R} fill={stroke} stroke={sel} strokeScaleEnabled={false} listening={false} />
      {/* pin B */}
      <Circle x={PB.x} y={PB.y} radius={HIT_R} fill="transparent" stroke="transparent" strokeScaleEnabled={false}
        onClick={e => { e.cancelBubble = true; onPinClick(comp.id, pinB, (e.evt as MouseEvent).shiftKey); }}
        onTap={e => { e.cancelBubble = true; onPinClick(comp.id, pinB, (e.evt as MouseEvent).shiftKey); }}
        onPointerDown={e => { e.cancelBubble = true; onPinPointerDown?.(comp.id, pinB); }}
        onPointerUp={e => { e.cancelBubble = true; onPinPointerUp?.(comp.id, pinB); }} />
      <Circle x={PB.x} y={PB.y} radius={VIS_R} fill={stroke} stroke={sel} strokeScaleEnabled={false} listening={false} />
    </Group>
  );
}
