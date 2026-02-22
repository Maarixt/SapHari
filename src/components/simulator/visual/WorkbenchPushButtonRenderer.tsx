import React from 'react';
import { Group, Rect, Circle, Text } from 'react-konva';
import type { SimComponent } from '../types';

const FP = { w: 80, h: 50, ax: 40, ay: 25 };
const P1 = { x: 18, y: 45 };
const P2 = { x: 62, y: 45 };

export interface WorkbenchPushButtonRendererProps {
  comp: SimComponent;
  isSelected: boolean;
  onSelect: (id: string, shift?: boolean) => void;
  onDragEnd?: (compId: string, x: number, y: number, evt?: MouseEvent) => void;
  onPinClick: (compId: string, pinId: string, shift?: boolean) => void;
  onPinPointerDown?: (compId: string, pinId: string) => void;
  onPinPointerUp?: (compId: string, pinId: string) => void;
  /** For momentary: true while pointer held. For latch: next actuated (latched) state. */
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

export function WorkbenchPushButtonRenderer({
  comp,
  isSelected,
  onSelect,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
  onPressChange,
}: WorkbenchPushButtonRendererProps) {
  const { mechanism, contact, isActuated, isClosed } = derivePushButtonViewState(comp);
  const isMomentary = mechanism === 'momentary';
  const isLatch = mechanism === 'latch';
  const badge = `PB (${contact}, ${isMomentary ? 'MOM' : 'LATCH'})`;

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
      {/* Base */}
      <Rect
        x={10}
        y={14}
        width={60}
        height={26}
        cornerRadius={6}
        fill="#374151"
        stroke={isSelected ? '#60a5fa' : '#6b7280'}
        strokeWidth={isSelected ? 2 : 1}
        strokeScaleEnabled={false}
        listening={false}
      />
      {/* Cap hitbox to isolate press interactions from dragging body. */}
      <Rect
        x={16}
        y={6}
        width={48}
        height={24}
        fill="transparent"
        onPointerDown={(e) => {
          e.cancelBubble = true;
          if (isMomentary) onPressChange?.(comp.id, true);
          onSelect(comp.id, (e.evt as MouseEvent).shiftKey);
        }}
        onPointerUp={(e) => {
          e.cancelBubble = true;
          if (isMomentary) onPressChange?.(comp.id, false);
        }}
        onPointerLeave={(e) => {
          e.cancelBubble = true;
          if (isMomentary) onPressChange?.(comp.id, false);
        }}
        onClick={(e) => {
          e.cancelBubble = true;
          if (isLatch) onPressChange?.(comp.id, !isActuated);
          onSelect(comp.id, (e.evt as MouseEvent).shiftKey);
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          if (isLatch) onPressChange?.(comp.id, !isActuated);
          onSelect(comp.id, (e.evt as MouseEvent).shiftKey);
        }}
      />
      {/* Cap */}
      <Rect
        x={18}
        y={isActuated ? 15 : 8}
        width={44}
        height={14}
        cornerRadius={6}
        fill={isActuated ? '#1f2937' : '#4b5563'}
        stroke="#9ca3af"
        strokeWidth={1}
        strokeScaleEnabled={false}
        listening={false}
      />
      <Text x={0} y={2} width={FP.w} text={badge} fontSize={8} fill="#cbd5e1" align="center" listening={false} />
      <Text x={0} y={34} width={FP.w} text={isClosed ? 'CLOSED' : 'OPEN'} fontSize={8} fill={isClosed ? '#22c55e' : '#94a3b8'} align="center" listening={false} />
      {([['P1', P1], ['P2', P2]] as const).map(([id, p]) => (
        <Group key={id}>
          <Circle
            x={p.x}
            y={p.y}
            radius={10}
            fill="transparent"
            stroke="transparent"
            onClick={(e) => { e.cancelBubble = true; onPinClick(comp.id, id, (e.evt as MouseEvent).shiftKey); }}
            onTap={(e) => { e.cancelBubble = true; onPinClick(comp.id, id, (e.evt as MouseEvent).shiftKey); }}
            onPointerDown={(e) => { e.cancelBubble = true; onPinPointerDown?.(comp.id, id); }}
            onPointerUp={(e) => { e.cancelBubble = true; onPinPointerUp?.(comp.id, id); }}
          />
          <Circle x={p.x} y={p.y} radius={3.5} fill="#9ca3af" stroke="#64748b" strokeScaleEnabled={false} listening={false} />
          <Text x={p.x - 6} y={p.y + 5} text={id} fontSize={8} fill="#94a3b8" listening={false} />
        </Group>
      ))}
    </Group>
  );
}

