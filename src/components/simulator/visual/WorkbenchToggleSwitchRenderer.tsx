/**
 * Workbench Toggle Switch — physical-looking SPST switch.
 * Delete: select component + press Delete (no embedded delete icon).
 *
 * Footprint (workbench): 90x50, anchor center (45,25).
 * pin1 at (18, 38), pin2 at (72, 38) — terminals along bottom.
 *
 * Geometry (local 0..90, 0..50):
 * - Body: rounded rect 90x50, radius 16, fill #1f2937, subtle top highlight.
 * - Lever plate: #374151, subtle bottom edge for depth.
 * - Knob: OFF slightly left -15°; ON slightly right +15°. fill #6b7280, stroke #9ca3af.
 * - Terminals: outer #374151, stroke #9ca3af, inner dot for metal feel; hit r=12.
 */

import React from 'react';
import { Group, Circle, Line, Rect, Text } from 'react-konva';
import type { SimComponent } from '../types';
import { getSwitchVariantId } from '../registry';

const FP = { w: 90, h: 50, ax: 45, ay: 25 };
const PIN1 = { x: 18, y: 38 };
const PIN2 = { x: 72, y: 38 };
const SPDT_P1 = { x: 18, y: 38 };
const SPDT_P2 = { x: 45, y: 38 };
const SPDT_P3 = { x: 72, y: 38 };
const VIS_R = 6;
const INNER_R = 2;
const HIT_R = 12;
const BODY_R = 16;
const PLATE_X = 28;
const PLATE_Y = 10;
const PLATE_W = 34;
const PLATE_H = 18;
const PLATE_R = 8;
const KNOB_W = 14;
const KNOB_H = 10;
const KNOB_OFF_CX = 39;
const KNOB_ON_CX = 51;
const KNOB_CY = 18;
const INDICATOR = { x: 72, y: 12, r: 4 };
const SPDT_LEVER_LEFT_CX = 32;
const SPDT_LEVER_RIGHT_CX = 58;
const SPDT_LEVER_CY = 18;

const DPST_P1 = { x: 18, y: 18 };
const DPST_P2 = { x: 72, y: 18 };
const DPST_P3 = { x: 18, y: 42 };
const DPST_P4 = { x: 72, y: 42 };
const DPST_INDICATOR_1 = { x: 32, y: 14, r: 3 };
const DPST_INDICATOR_2 = { x: 58, y: 14, r: 3 };

/* DPDT: body sized for 6 clear connection points + labels fully inside. 120x80. */
const DPDT_FP = { w: 120, h: 80, ax: 60, ay: 40 };
const DPDT_LEFT_COL_X = 32;
const DPDT_RIGHT_COL_X = 88;
const DPDT_ROW1_Y = 44;
const DPDT_ROW2_Y = 58;
const DPDT_ROW3_Y = 72;
const DPDT_P1 = { x: DPDT_LEFT_COL_X, y: DPDT_ROW1_Y };
const DPDT_P2 = { x: DPDT_LEFT_COL_X, y: DPDT_ROW2_Y };
const DPDT_P3 = { x: DPDT_LEFT_COL_X, y: DPDT_ROW3_Y };
const DPDT_P4 = { x: DPDT_RIGHT_COL_X, y: DPDT_ROW1_Y };
const DPDT_P5 = { x: DPDT_RIGHT_COL_X, y: DPDT_ROW2_Y };
const DPDT_P6 = { x: DPDT_RIGHT_COL_X, y: DPDT_ROW3_Y };
const DPDT_ACTUATOR_CX = 60;
const DPDT_ACTUATOR_CY = 16;
const DPDT_LABEL_LEFT_X = 4;
const DPDT_LABEL_RIGHT_X = 94;
const DPDT_ARROW_UP = { points: [0, 6, -5, -4, 5, -4] };
const DPDT_ARROW_DOWN = { points: [0, -6, -5, 4, 5, 4] };
const DPDT_BODY_R = 10;
const DPDT_PAD_R = 7;
const DPDT_PAD_HIT_R = 14;
const DPDT_LABEL_Y_OFFSET = -5;

const BODY_FILL = '#1f2937';
const BODY_HIGHLIGHT = 'rgba(255,255,255,0.06)';
const PLATE_FILL = '#374151';
const PLATE_EDGE = '#1f2937';
const KNOB_FILL = '#6b7280';
const KNOB_STROKE = '#9ca3af';
const ON_DOT = '#22c55e';
const OFF_DOT = '#4b5563';
const PAD_FILL = '#374151';
const PAD_STROKE = '#9ca3af';
const PAD_INNER = '#6b7280';
/** Mechanical connection bars (solid red — distinct from electrical flow) */
const DPDT_MECHANICAL_BAR = '#ef4444';
const DPDT_BAR_WIDTH = 4;
export interface WorkbenchToggleSwitchRendererProps {
  comp: SimComponent;
  isSelected: boolean;
  onSelect: (id: string, shift?: boolean) => void;
  onDelete: (id: string) => void;
  onDragEnd?: (compId: string, x: number, y: number) => void;
  onPinClick: (compId: string, pinId: string, shift?: boolean) => void;
  onPinPointerDown?: (compId: string, pinId: string) => void;
  onPinPointerUp?: (compId: string, pinId: string) => void;
  onSwitchToggle?: (compId: string) => void;
}

export function WorkbenchToggleSwitchRenderer({
  comp,
  isSelected,
  onSelect,
  onDelete,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
  onSwitchToggle,
}: WorkbenchToggleSwitchRendererProps) {
  if (!comp.pins?.length || comp.pins.length < 2) return null;

  const variantId = comp.pins.length >= 6 && comp.variantId === 'DPDT'
    ? 'DPDT'
    : getSwitchVariantId(comp.variantId);
  const flipX = !!comp.flipX;

  if (variantId === 'SPDT') {
    const position = (comp.props?.position as string) === 'B' ? 'B' : 'A';
    const leverCx = position === 'A' ? SPDT_LEVER_LEFT_CX : SPDT_LEVER_RIGHT_CX;
    const pinP1 = comp.pins.find((p) => p.id === 'P1');
    const pinP2 = comp.pins.find((p) => p.id === 'P2');
    const pinP3 = comp.pins.find((p) => p.id === 'P3');
    const content = (
      <>
        <Rect x={0} y={0} width={FP.w} height={FP.h} cornerRadius={BODY_R} fill={BODY_FILL}
          stroke={isSelected ? '#60a5fa' : undefined} strokeWidth={isSelected ? 2 : 0} strokeScaleEnabled={false} />
        <Rect x={2} y={2} width={FP.w - 4} height={Math.floor(FP.h / 2) - 2} cornerRadius={[BODY_R - 2, BODY_R - 2, 0, 0]}
          fill={BODY_HIGHLIGHT} listening={false} strokeScaleEnabled={false} />
        <Rect x={0} y={0} width={FP.w} height={FP.h} fill="transparent" listening={true}
          onClick={(e) => { e.cancelBubble = true; onSwitchToggle?.(comp.id); onSelect(comp.id, (e.evt as MouseEvent).shiftKey); }}
          onTap={(e) => { e.cancelBubble = true; onSwitchToggle?.(comp.id); onSelect(comp.id, (e.evt as MouseEvent).shiftKey); }} />
        <Rect x={24} y={PLATE_Y} width={42} height={PLATE_H} cornerRadius={PLATE_R} fill={PLATE_FILL} strokeScaleEnabled={false} listening={false} />
        <Group x={leverCx} y={SPDT_LEVER_CY} offsetX={KNOB_W / 2} offsetY={KNOB_H / 2}>
          <Rect x={0} y={0} width={KNOB_W} height={KNOB_H} cornerRadius={4} fill={KNOB_FILL} stroke={KNOB_STROKE} strokeWidth={1} strokeScaleEnabled={false} listening={false} />
        </Group>
        <Group scaleX={flipX ? -1 : 1} offsetX={FP.ax} x={FP.ax}>
          <Text x={38} y={PLATE_Y + PLATE_H + 2} width={14} text={position} fontSize={10} fill={position === 'A' ? '#86efac' : '#9ca3af'} align="center" listening={false} strokeScaleEnabled={false} />
          <Text x={SPDT_P1.x - 3} y={SPDT_P1.y - 10} text="A" fontSize={9} fill={PAD_STROKE} listening={false} strokeScaleEnabled={false} />
          <Text x={SPDT_P2.x - 10} y={SPDT_P2.y - 10} text="COM" fontSize={9} fill={PAD_STROKE} listening={false} strokeScaleEnabled={false} />
          <Text x={SPDT_P3.x - 3} y={SPDT_P3.y - 10} text="B" fontSize={9} fill={PAD_STROKE} listening={false} strokeScaleEnabled={false} />
        </Group>
        {[['P1', SPDT_P1, pinP1?.id ?? 'P1'], ['P2', SPDT_P2, pinP2?.id ?? 'P2'], ['P3', SPDT_P3, pinP3?.id ?? 'P3']].map(([_label, pos, pinId]) => (
          <React.Fragment key={String(pinId)}>
            <Circle x={(pos as { x: number; y: number }).x} y={(pos as { x: number; y: number }).y} radius={HIT_R} opacity={0}
              onClick={(e) => { e.cancelBubble = true; onPinClick(comp.id, pinId as string, (e.evt as MouseEvent).shiftKey); }}
              onTap={(e) => { e.cancelBubble = true; onPinClick(comp.id, pinId as string, (e.evt as MouseEvent).shiftKey); }}
              onPointerDown={(e) => { e.cancelBubble = true; onPinPointerDown?.(comp.id, pinId as string); }}
              onPointerUp={(e) => { e.cancelBubble = true; onPinPointerUp?.(comp.id, pinId as string); }} />
            <Circle x={(pos as { x: number; y: number }).x} y={(pos as { x: number; y: number }).y} radius={VIS_R} fill={PAD_FILL} stroke={PAD_STROKE} strokeWidth={1} strokeScaleEnabled={false} listening={false} />
            <Circle x={(pos as { x: number; y: number }).x} y={(pos as { x: number; y: number }).y} radius={INNER_R} fill={PAD_INNER} strokeScaleEnabled={false} listening={false} />
          </React.Fragment>
        ))}
      </>
    );
    return (
      <Group x={comp.x} y={comp.y} offsetX={FP.ax} offsetY={FP.ay} scaleX={flipX ? -1 : 1} draggable
        onDragEnd={(e) => onDragEnd?.(comp.id, e.target.x(), e.target.y(), (e.evt as MouseEvent))}
        onClick={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)} onTap={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}>
        <Group x={0} y={0}>{content}</Group>
      </Group>
    );
  }

  if (variantId === 'DPDT') {
    const position = (comp.props?.position as string) === 'B' ? 'B' : 'A';
    const isUp = position === 'A';
    const dpdtPads: [string, { x: number; y: number }, string][] = [
      ['P1', DPDT_P1, 'A1'], ['P2', DPDT_P2, 'COM1'], ['P3', DPDT_P3, 'B1'],
      ['P4', DPDT_P4, 'A2'], ['P5', DPDT_P5, 'COM2'], ['P6', DPDT_P6, 'B2'],
    ];
    const content = (
      <>
        <Rect x={0} y={0} width={DPDT_FP.w} height={DPDT_FP.h} cornerRadius={DPDT_BODY_R} fill={BODY_FILL}
          stroke={isSelected ? '#60a5fa' : undefined} strokeWidth={isSelected ? 2 : 0} strokeScaleEnabled={false} />
        <Rect x={2} y={2} width={DPDT_FP.w - 4} height={26} cornerRadius={[DPDT_BODY_R - 2, DPDT_BODY_R - 2, 0, 0]}
          fill={BODY_HIGHLIGHT} listening={false} strokeScaleEnabled={false} />
        <Rect x={0} y={0} width={DPDT_FP.w} height={DPDT_FP.h} fill="transparent" listening={true}
          onClick={(e) => { e.cancelBubble = true; onSwitchToggle?.(comp.id); onSelect(comp.id, (e.evt as MouseEvent).shiftKey); }}
          onTap={(e) => { e.cancelBubble = true; onSwitchToggle?.(comp.id); onSelect(comp.id, (e.evt as MouseEvent).shiftKey); }} />
        {/* Internal mechanical connection bars (solid red). Position A: COM→A (bars upward). Position B: COM→B (bars downward). Do NOT highlight unselected throws. */}
        {position === 'A' && (
          <>
            <Line points={[DPDT_P2.x, DPDT_P2.y, DPDT_P1.x, DPDT_P1.y]} stroke={DPDT_MECHANICAL_BAR} strokeWidth={DPDT_BAR_WIDTH} lineCap="round" strokeScaleEnabled={false} listening={false} />
            <Line points={[DPDT_P5.x, DPDT_P5.y, DPDT_P4.x, DPDT_P4.y]} stroke={DPDT_MECHANICAL_BAR} strokeWidth={DPDT_BAR_WIDTH} lineCap="round" strokeScaleEnabled={false} listening={false} />
          </>
        )}
        {position === 'B' && (
          <>
            <Line points={[DPDT_P2.x, DPDT_P2.y, DPDT_P3.x, DPDT_P3.y]} stroke={DPDT_MECHANICAL_BAR} strokeWidth={DPDT_BAR_WIDTH} lineCap="round" strokeScaleEnabled={false} listening={false} />
            <Line points={[DPDT_P5.x, DPDT_P5.y, DPDT_P6.x, DPDT_P6.y]} stroke={DPDT_MECHANICAL_BAR} strokeWidth={DPDT_BAR_WIDTH} lineCap="round" strokeScaleEnabled={false} listening={false} />
          </>
        )}
        {/* Mechanical linkage between poles: dashed horizontal at common row */}
        <Line points={[DPDT_P2.x, DPDT_P2.y, DPDT_P5.x, DPDT_P5.y]} stroke={DPDT_MECHANICAL_BAR} strokeWidth={1} lineCap="round" strokeScaleEnabled={false} listening={false} dash={[4, 4]} opacity={0.6} />
        {/* Actuator: UP = position A (arrow up), DOWN = position B (arrow down). No ON/OFF — position only. */}
        <Group x={DPDT_ACTUATOR_CX} y={DPDT_ACTUATOR_CY} listening={false}>
          <Line points={isUp ? DPDT_ARROW_UP.points : DPDT_ARROW_DOWN.points} closed fill={isUp ? '#86efac' : '#9ca3af'} stroke={KNOB_STROKE} strokeWidth={1} strokeScaleEnabled={false} />
        </Group>
        <Group scaleX={flipX ? -1 : 1} offsetX={DPDT_FP.ax} x={DPDT_FP.ax}>
          <Text x={-48} y={18} width={96} text={isUp ? 'UP (A)' : 'DOWN (B)'} fontSize={9} fill={PAD_STROKE} align="center" listening={false} strokeScaleEnabled={false} />
          <Text x={-24} y={DPDT_P1.y + DPDT_LABEL_Y_OFFSET} text="P1 A1" fontSize={8} fill={PAD_STROKE} listening={false} strokeScaleEnabled={false} />
          <Text x={-28} y={DPDT_P2.y + DPDT_LABEL_Y_OFFSET} text="P2 COM1" fontSize={8} fill={PAD_STROKE} listening={false} strokeScaleEnabled={false} />
          <Text x={-24} y={DPDT_P3.y + DPDT_LABEL_Y_OFFSET} text="P3 B1" fontSize={8} fill={PAD_STROKE} listening={false} strokeScaleEnabled={false} />
          <Text x={8} y={DPDT_P4.y + DPDT_LABEL_Y_OFFSET} text="P4 A2" fontSize={8} fill={PAD_STROKE} listening={false} strokeScaleEnabled={false} />
          <Text x={4} y={DPDT_P5.y + DPDT_LABEL_Y_OFFSET} text="P5 COM2" fontSize={8} fill={PAD_STROKE} listening={false} strokeScaleEnabled={false} />
          <Text x={8} y={DPDT_P6.y + DPDT_LABEL_Y_OFFSET} text="P6 B2" fontSize={8} fill={PAD_STROKE} listening={false} strokeScaleEnabled={false} />
        </Group>
        {/* Pads: grey only. Mechanical state shown by red bars; electrical (powered net) would be separate overlay. */}
        {dpdtPads.map(([pid, pos]) => {
          const pin = comp.pins.find((p) => p.id === pid);
          return (
            <React.Fragment key={pid}>
              <Circle x={pos.x} y={pos.y} radius={DPDT_PAD_HIT_R} opacity={0}
                onClick={(e) => { e.cancelBubble = true; onPinClick(comp.id, pin?.id ?? pid, (e.evt as MouseEvent).shiftKey); }}
                onTap={(e) => { e.cancelBubble = true; onPinClick(comp.id, pin?.id ?? pid, (e.evt as MouseEvent).shiftKey); }}
                onPointerDown={(e) => { e.cancelBubble = true; onPinPointerDown?.(comp.id, pin?.id ?? pid); }}
                onPointerUp={(e) => { e.cancelBubble = true; onPinPointerUp?.(comp.id, pin?.id ?? pid); }} />
              <Circle x={pos.x} y={pos.y} radius={DPDT_PAD_R} fill={PAD_FILL} stroke={PAD_STROKE} strokeWidth={1} strokeScaleEnabled={false} listening={false} />
              <Circle x={pos.x} y={pos.y} radius={INNER_R} fill={PAD_INNER} strokeScaleEnabled={false} listening={false} />
            </React.Fragment>
          );
        })}
      </>
    );
    return (
      <Group x={comp.x} y={comp.y} offsetX={DPDT_FP.ax} offsetY={DPDT_FP.ay} scaleX={flipX ? -1 : 1} draggable
        onDragEnd={(e) => onDragEnd?.(comp.id, e.target.x(), e.target.y(), (e.evt as MouseEvent))}
        onClick={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)} onTap={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}>
        <Group x={0} y={0}>{content}</Group>
      </Group>
    );
  }

  if (variantId === 'DPST') {
    const on = !!comp.props?.on;
    const knobCx = on ? KNOB_ON_CX : KNOB_OFF_CX;
    const knobRotation = on ? 15 : -15;
    const dpstPins: [string, { x: number; y: number }][] = [['P1', DPST_P1], ['P2', DPST_P2], ['P3', DPST_P3], ['P4', DPST_P4]];
    const content = (
      <>
        <Rect x={0} y={0} width={FP.w} height={FP.h} cornerRadius={BODY_R} fill={BODY_FILL}
          stroke={isSelected ? '#60a5fa' : undefined} strokeWidth={isSelected ? 2 : 0} strokeScaleEnabled={false} />
        <Rect x={2} y={2} width={FP.w - 4} height={Math.floor(FP.h / 2) - 2} cornerRadius={[BODY_R - 2, BODY_R - 2, 0, 0]}
          fill={BODY_HIGHLIGHT} listening={false} strokeScaleEnabled={false} />
        <Rect x={0} y={0} width={FP.w} height={FP.h} fill="transparent" listening={true}
          onClick={(e) => { e.cancelBubble = true; onSwitchToggle?.(comp.id); onSelect(comp.id, (e.evt as MouseEvent).shiftKey); }}
          onTap={(e) => { e.cancelBubble = true; onSwitchToggle?.(comp.id); onSelect(comp.id, (e.evt as MouseEvent).shiftKey); }} />
        <Rect x={PLATE_X} y={PLATE_Y} width={PLATE_W} height={PLATE_H} cornerRadius={PLATE_R} fill={PLATE_FILL} strokeScaleEnabled={false} listening={false} />
        <Group x={knobCx} y={KNOB_CY} rotation={knobRotation} offsetX={KNOB_W / 2} offsetY={KNOB_H / 2}>
          <Rect x={0} y={0} width={KNOB_W} height={KNOB_H} cornerRadius={4} fill={KNOB_FILL} stroke={KNOB_STROKE} strokeWidth={1} strokeScaleEnabled={false} listening={false} />
        </Group>
        <Group scaleX={flipX ? -1 : 1} offsetX={FP.ax} x={FP.ax}>
          <Text x={PLATE_X} y={PLATE_Y + PLATE_H + 2} width={PLATE_W} text={on ? 'ON' : 'OFF'} fontSize={9} fill={on ? '#86efac' : '#9ca3af'} align="center" listening={false} strokeScaleEnabled={false} />
          <Text x={DPST_P1.x - 6} y={DPST_P1.y - 8} text="P1" fontSize={8} fill={PAD_STROKE} listening={false} strokeScaleEnabled={false} />
          <Text x={DPST_P2.x - 6} y={DPST_P2.y - 8} text="P2" fontSize={8} fill={PAD_STROKE} listening={false} strokeScaleEnabled={false} />
          <Text x={DPST_P3.x - 6} y={DPST_P3.y + 4} text="P3" fontSize={8} fill={PAD_STROKE} listening={false} strokeScaleEnabled={false} />
          <Text x={DPST_P4.x - 6} y={DPST_P4.y + 4} text="P4" fontSize={8} fill={PAD_STROKE} listening={false} strokeScaleEnabled={false} />
        </Group>
        {on && (
          <>
            <Circle x={DPST_INDICATOR_1.x} y={DPST_INDICATOR_1.y} radius={DPST_INDICATOR_1.r} fill={ON_DOT} strokeScaleEnabled={false} listening={false} />
            <Circle x={DPST_INDICATOR_2.x} y={DPST_INDICATOR_2.y} radius={DPST_INDICATOR_2.r} fill={ON_DOT} strokeScaleEnabled={false} listening={false} />
          </>
        )}
        {dpstPins.map(([pid, pos]) => {
          const pin = comp.pins.find((p) => p.id === pid);
          return (
            <React.Fragment key={pid}>
              <Circle x={pos.x} y={pos.y} radius={HIT_R} opacity={0}
                onClick={(e) => { e.cancelBubble = true; onPinClick(comp.id, pin?.id ?? pid, (e.evt as MouseEvent).shiftKey); }}
                onTap={(e) => { e.cancelBubble = true; onPinClick(comp.id, pin?.id ?? pid, (e.evt as MouseEvent).shiftKey); }}
                onPointerDown={(e) => { e.cancelBubble = true; onPinPointerDown?.(comp.id, pin?.id ?? pid); }}
                onPointerUp={(e) => { e.cancelBubble = true; onPinPointerUp?.(comp.id, pin?.id ?? pid); }} />
              <Circle x={pos.x} y={pos.y} radius={VIS_R} fill={PAD_FILL} stroke={PAD_STROKE} strokeWidth={1} strokeScaleEnabled={false} listening={false} />
              <Circle x={pos.x} y={pos.y} radius={INNER_R} fill={PAD_INNER} strokeScaleEnabled={false} listening={false} />
            </React.Fragment>
          );
        })}
      </>
    );
    return (
      <Group x={comp.x} y={comp.y} offsetX={FP.ax} offsetY={FP.ay} scaleX={flipX ? -1 : 1} draggable
        onDragEnd={(e) => onDragEnd?.(comp.id, e.target.x(), e.target.y(), (e.evt as MouseEvent))}
        onClick={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)} onTap={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}>
        <Group x={0} y={0}>{content}</Group>
      </Group>
    );
  }

  const on = !!comp.props?.on;
  const pin1Id = comp.pins[0]?.id ?? 'pin1';
  const pin2Id = comp.pins[1]?.id ?? 'pin2';
  const knobCx = on ? KNOB_ON_CX : KNOB_OFF_CX;
  const knobRotation = on ? 15 : -15;

  const content = (
    <>
      {/* Body: rounded rect, dark plastic, subtle top highlight, stroke only when selected */}
      <Rect
        x={0}
        y={0}
        width={FP.w}
        height={FP.h}
        cornerRadius={BODY_R}
        fill={BODY_FILL}
        stroke={isSelected ? '#60a5fa' : undefined}
        strokeWidth={isSelected ? 2 : 0}
        strokeScaleEnabled={false}
      />
      <Rect
        x={2}
        y={2}
        width={FP.w - 4}
        height={Math.floor(FP.h / 2) - 2}
        cornerRadius={[BODY_R - 2, BODY_R - 2, 0, 0]}
        fill={BODY_HIGHLIGHT}
        listening={false}
        strokeScaleEnabled={false}
      />

      {/* Body hit area: click toggles switch (terminals cancelBubble) */}
      <Rect
        x={0}
        y={0}
        width={FP.w}
        height={FP.h}
        fill="transparent"
        listening={true}
        onClick={(e) => {
          e.cancelBubble = true;
          onSwitchToggle?.(comp.id);
          onSelect(comp.id, (e.evt as MouseEvent).shiftKey);
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onSwitchToggle?.(comp.id);
          onSelect(comp.id, (e.evt as MouseEvent).shiftKey);
        }}
      />

      {/* Lever base plate: fill + subtle bottom edge for depth */}
      <Rect
        x={PLATE_X}
        y={PLATE_Y}
        width={PLATE_W}
        height={PLATE_H}
        cornerRadius={PLATE_R}
        fill={PLATE_FILL}
        strokeScaleEnabled={false}
        listening={false}
      />
      <Rect
        x={PLATE_X}
        y={PLATE_Y + PLATE_H - 1}
        width={PLATE_W}
        height={1}
        fill={PLATE_EDGE}
        strokeScaleEnabled={false}
        listening={false}
      />

      {/* Knob: rotated rounded rect, position and angle by state */}
      <Group x={knobCx} y={KNOB_CY} rotation={knobRotation} offsetX={KNOB_W / 2} offsetY={KNOB_H / 2}>
        <Rect
          x={0}
          y={0}
          width={KNOB_W}
          height={KNOB_H}
          cornerRadius={4}
          fill={KNOB_FILL}
          stroke={KNOB_STROKE}
          strokeWidth={1}
          strokeScaleEnabled={false}
          listening={false}
        />
      </Group>

      <Group scaleX={flipX ? -1 : 1} offsetX={FP.ax} x={FP.ax}>
        <Text
          x={PLATE_X}
          y={PLATE_Y + PLATE_H + 2}
          width={PLATE_W}
          text={on ? 'ON' : 'OFF'}
          fontSize={9}
          fill={on ? '#86efac' : '#9ca3af'}
          align="center"
          listening={false}
          strokeScaleEnabled={false}
        />
        <Text x={PIN1.x - 3} y={PIN1.y - 10} text="1" fontSize={9} fill={PAD_STROKE} listening={false} strokeScaleEnabled={false} />
        <Text x={PIN2.x - 3} y={PIN2.y - 10} text="2" fontSize={9} fill={PAD_STROKE} listening={false} strokeScaleEnabled={false} />
      </Group>

      {/* Terminal 1 — hit then visible */}
      <Circle
        x={PIN1.x}
        y={PIN1.y}
        radius={HIT_R}
        opacity={0}
        onClick={(e) => {
          e.cancelBubble = true;
          onPinClick(comp.id, pin1Id, (e.evt as MouseEvent).shiftKey);
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onPinClick(comp.id, pin1Id, (e.evt as MouseEvent).shiftKey);
        }}
        onPointerDown={(e) => {
          e.cancelBubble = true;
          onPinPointerDown?.(comp.id, pin1Id);
        }}
        onPointerUp={(e) => {
          e.cancelBubble = true;
          onPinPointerUp?.(comp.id, pin1Id);
        }}
      />
      <Circle
        x={PIN1.x}
        y={PIN1.y}
        radius={VIS_R}
        fill={PAD_FILL}
        stroke={PAD_STROKE}
        strokeWidth={1}
        strokeScaleEnabled={false}
        listening={false}
      />
      <Circle
        x={PIN1.x}
        y={PIN1.y}
        radius={INNER_R}
        fill={PAD_INNER}
        strokeScaleEnabled={false}
        listening={false}
      />

      {/* Terminal 2 */}
      <Circle
        x={PIN2.x}
        y={PIN2.y}
        radius={HIT_R}
        opacity={0}
        onClick={(e) => {
          e.cancelBubble = true;
          onPinClick(comp.id, pin2Id, (e.evt as MouseEvent).shiftKey);
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onPinClick(comp.id, pin2Id, (e.evt as MouseEvent).shiftKey);
        }}
        onPointerDown={(e) => {
          e.cancelBubble = true;
          onPinPointerDown?.(comp.id, pin2Id);
        }}
        onPointerUp={(e) => {
          e.cancelBubble = true;
          onPinPointerUp?.(comp.id, pin2Id);
        }}
      />
      <Circle
        x={PIN2.x}
        y={PIN2.y}
        radius={VIS_R}
        fill={PAD_FILL}
        stroke={PAD_STROKE}
        strokeWidth={1}
        strokeScaleEnabled={false}
        listening={false}
      />
      <Circle
        x={PIN2.x}
        y={PIN2.y}
        radius={INNER_R}
        fill={PAD_INNER}
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
      scaleX={flipX ? -1 : 1}
      draggable
      onDragEnd={(e) => onDragEnd?.(comp.id, e.target.x(), e.target.y(), (e.evt as MouseEvent))}
      onClick={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
      onTap={(e) => onSelect(comp.id, (e.evt as MouseEvent).shiftKey)}
    >
      <Group x={0} y={0}>
        {content}
      </Group>
    </Group>
  );
}
