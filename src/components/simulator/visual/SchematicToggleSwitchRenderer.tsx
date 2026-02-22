/**
 * Schematic SPST Toggle Switch — LOCKED DESIGN
 *
 * Footprint (authoritative):
 *   width 90, height 50, anchor center (45,25)
 *   pin1 (left terminal)  → offset (10,25)
 *   pin2 (right terminal) → offset (80,25)
 *
 * Symbol geometry (local footprint coords, origin = top-left):
 *   Terminal circles at (10,25) and (80,25)
 *   Stub line: (14,25) → (34,25)
 *   Lever pivot: (34,25)
 *     Closed: lever (34,25)→(76,25), contact stub (76,25)→(80,25)
 *     Open:   lever (34,25)→(70,14), visible gap to T2
 *   Label "SW" at (45,6) center-aligned
 *
 * Styling:
 *   stroke #e5e7eb, strokeWidth 2, lineCap round, strokeScaleEnabled false. No shadows.
 *   Terminal visible: r=3.5, fill #111827, stroke #e5e7eb, strokeWidth 2
 *   Terminal hit:     r=12, opacity 0 (invisible)
 *   Selection: stroke highlight only (no shadow).
 *
 * Interaction:
 *   Terminal click → onPinClick + cancelBubble (never toggles)
 *   Body click     → onSwitchToggle (toggles props.on)
 */

import React from 'react';
import { Group, Circle, Line, Rect, Text } from 'react-konva';
import type { SimComponent, Wire } from '../types';
import { getSwitchVariantId } from '../registry';

/* ── constants ── */
const VIS_R = 3.5;
const HIT_R = 12;
const SW = 2;
const STROKE = '#e5e7eb';
const TERM_FILL = '#111827';

const FP = { w: 90, h: 50, ax: 45, ay: 25 };

const T1 = { x: 10, y: 25 };
const T2 = { x: 80, y: 25 };
const STUB_START = { x: 14, y: 25 };
const STUB_END   = { x: 34, y: 25 };
const PIVOT      = { x: 34, y: 25 };
const LEVER_CLOSED_END = { x: 76, y: 25 };
const LEVER_OPEN_END   = { x: 70, y: 14 };

/* SPDT: COM left, A top-right, B bottom-right (match reference symbol) */
const SPDT_COM = { x: 10, y: 25 };
const SPDT_A  = { x: 80, y: 12 };
const SPDT_B  = { x: 80, y: 38 };
const SPDT_BLADE_START = { x: 14, y: 25 };
const SPDT_BLADE_TO_A = { x: 76, y: 12 };
const SPDT_BLADE_TO_B = { x: 76, y: 38 };

/* DPST: two poles, left P1/P3 right P2/P4. Pole1 top (15), pole2 bottom (35). */
const DPST_P1 = { x: 10, y: 15 };
const DPST_P2 = { x: 80, y: 15 };
const DPST_P3 = { x: 10, y: 35 };
const DPST_P4 = { x: 80, y: 35 };
const DPST_STUB_1 = { start: { x: 14, y: 15 }, pivot: { x: 34, y: 15 }, closed: { x: 76, y: 15 }, open: { x: 70, y: 8 } };
const DPST_STUB_2 = { start: { x: 14, y: 35 }, pivot: { x: 34, y: 35 }, closed: { x: 76, y: 35 }, open: { x: 70, y: 42 } };
const DPST_LINKAGE = { top: 15, bottom: 35, x: 34 };

/* DPDT: two SPDT sections stacked vertically (reference layout). Top = Pole 1, Bottom = Pole 2. Common left, throws right (A above B). Dashed horizontal between poles; dashed vertical linkage. */
const DPDT_COM1 = { x: 10, y: 12 };
const DPDT_A1 = { x: 80, y: 5 };
const DPDT_B1 = { x: 80, y: 19 };
const DPDT_PIVOT1 = { x: 34, y: 12 };
const DPDT_BLADE1_TO_A = { x: 76, y: 5 };
const DPDT_BLADE1_TO_B = { x: 76, y: 19 };
const DPDT_COM2 = { x: 10, y: 38 };
const DPDT_A2 = { x: 80, y: 31 };
const DPDT_B2 = { x: 80, y: 45 };
const DPDT_PIVOT2 = { x: 34, y: 38 };
const DPDT_BLADE2_TO_A = { x: 76, y: 31 };
const DPDT_BLADE2_TO_B = { x: 76, y: 45 };
const DPDT_H_DASH = { y: 25, xStart: 0, xEnd: 90 };
const DPDT_V_LINKAGE = { x: 34, yTop: 12, yBottom: 38 };
const DPDT_POSITIONS = [DPDT_A1, DPDT_COM1, DPDT_B1, DPDT_A2, DPDT_COM2, DPDT_B2] as const;

/* ── props ── */
export interface SchematicToggleSwitchRendererProps {
  comp: SimComponent;
  simState: { components: SimComponent[]; wires: Wire[] };
  isSelected: boolean;
  onSelect: (id: string, shift?: boolean) => void;
  onDelete: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onPinClick: (compId: string, pinId: string, shift?: boolean) => void;
  onPinPointerDown?: (compId: string, pinId: string) => void;
  onPinPointerUp?: (compId: string, pinId: string) => void;
  onSwitchToggle?: (compId: string) => void;
}

/* ── component ── */
export function SchematicToggleSwitchRenderer({
  comp, isSelected, onSelect, onDragEnd,
  onPinClick, onPinPointerDown, onPinPointerUp,
  onSwitchToggle,
}: SchematicToggleSwitchRendererProps) {
  if (!comp.pins?.length || comp.pins.length < 2) return null;

  const variantId = comp.pins.length >= 6 && comp.variantId === 'DPDT'
    ? 'DPDT'
    : getSwitchVariantId(comp.variantId);
  const flipX = !!comp.flipX;
  const selStroke = isSelected ? '#60a5fa' : STROKE;

  if (variantId === 'SPDT') {
    const position = (comp.props?.position as string) === 'B' ? 'B' : 'A';
    const pinP1 = comp.pins.find((p) => p.id === 'P1');
    const pinP2 = comp.pins.find((p) => p.id === 'P2');
    const pinP3 = comp.pins.find((p) => p.id === 'P3');
    const content = (
      <>
        <Rect x={0} y={0} width={FP.w} height={FP.h} fill="transparent"
          onClick={e => { e.cancelBubble = true; onSwitchToggle?.(comp.id); onSelect(comp.id, (e.evt as MouseEvent).shiftKey); }}
          onTap={e => { e.cancelBubble = true; onSwitchToggle?.(comp.id); onSelect(comp.id, (e.evt as MouseEvent).shiftKey); }} />
        {/* COM stub (left) */}
        <Line points={[SPDT_BLADE_START.x, SPDT_COM.y, SPDT_COM.x, SPDT_COM.y]} stroke={STROKE} strokeWidth={SW} lineCap="round" strokeScaleEnabled={false} listening={false} />
        {/* Blade from COM to selected contact */}
        <Line
          points={position === 'A'
            ? [SPDT_BLADE_START.x, SPDT_COM.y, SPDT_BLADE_TO_A.x, SPDT_BLADE_TO_A.y]
            : [SPDT_BLADE_START.x, SPDT_COM.y, SPDT_BLADE_TO_B.x, SPDT_BLADE_TO_B.y]}
          stroke={STROKE} strokeWidth={SW} lineCap="round" strokeScaleEnabled={false} listening={false}
        />
        {/* Stubs from blade end to A/B dots */}
        {position === 'A' && <Line points={[SPDT_BLADE_TO_A.x, SPDT_BLADE_TO_A.y, SPDT_A.x, SPDT_A.y]} stroke={STROKE} strokeWidth={SW} lineCap="round" strokeScaleEnabled={false} listening={false} />}
        {position === 'B' && <Line points={[SPDT_BLADE_TO_B.x, SPDT_BLADE_TO_B.y, SPDT_B.x, SPDT_B.y]} stroke={STROKE} strokeWidth={SW} lineCap="round" strokeScaleEnabled={false} listening={false} />}
        <Group scaleX={flipX ? -1 : 1} offsetX={FP.ax} x={FP.ax}>
          <Text x={FP.ax - 12} y={2} width={24} text="SW SPDT" fontSize={8} fill={STROKE} align="center" listening={false} strokeScaleEnabled={false} />
          <Text x={SPDT_COM.x - 14} y={SPDT_COM.y - 5} text="COM" fontSize={8} fill={STROKE} listening={false} strokeScaleEnabled={false} />
          <Text x={SPDT_A.x + 2} y={SPDT_A.y - 6} text="A" fontSize={8} fill={STROKE} listening={false} strokeScaleEnabled={false} />
          <Text x={SPDT_B.x + 2} y={SPDT_B.y + 2} text="B" fontSize={8} fill={STROKE} listening={false} strokeScaleEnabled={false} />
        </Group>
        {/* COM terminal */}
        <Circle x={SPDT_COM.x} y={SPDT_COM.y} radius={HIT_R} opacity={0}
          onClick={e => { e.cancelBubble = true; onPinClick(comp.id, pinP2?.id ?? 'P2', (e.evt as MouseEvent).shiftKey); }}
          onTap={e => { e.cancelBubble = true; onPinClick(comp.id, pinP2?.id ?? 'P2', (e.evt as MouseEvent).shiftKey); }}
          onPointerDown={e => { e.cancelBubble = true; onPinPointerDown?.(comp.id, pinP2?.id ?? 'P2'); }}
          onPointerUp={e => { e.cancelBubble = true; onPinPointerUp?.(comp.id, pinP2?.id ?? 'P2'); }} />
        <Circle x={SPDT_COM.x} y={SPDT_COM.y} radius={VIS_R} fill={TERM_FILL} stroke={selStroke} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
        {/* A terminal */}
        <Circle x={SPDT_A.x} y={SPDT_A.y} radius={HIT_R} opacity={0}
          onClick={e => { e.cancelBubble = true; onPinClick(comp.id, pinP1?.id ?? 'P1', (e.evt as MouseEvent).shiftKey); }}
          onTap={e => { e.cancelBubble = true; onPinClick(comp.id, pinP1?.id ?? 'P1', (e.evt as MouseEvent).shiftKey); }}
          onPointerDown={e => { e.cancelBubble = true; onPinPointerDown?.(comp.id, pinP1?.id ?? 'P1'); }}
          onPointerUp={e => { e.cancelBubble = true; onPinPointerUp?.(comp.id, pinP1?.id ?? 'P1'); }} />
        <Circle x={SPDT_A.x} y={SPDT_A.y} radius={VIS_R} fill={TERM_FILL} stroke={selStroke} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
        {/* B terminal */}
        <Circle x={SPDT_B.x} y={SPDT_B.y} radius={HIT_R} opacity={0}
          onClick={e => { e.cancelBubble = true; onPinClick(comp.id, pinP3?.id ?? 'P3', (e.evt as MouseEvent).shiftKey); }}
          onTap={e => { e.cancelBubble = true; onPinClick(comp.id, pinP3?.id ?? 'P3', (e.evt as MouseEvent).shiftKey); }}
          onPointerDown={e => { e.cancelBubble = true; onPinPointerDown?.(comp.id, pinP3?.id ?? 'P3'); }}
          onPointerUp={e => { e.cancelBubble = true; onPinPointerUp?.(comp.id, pinP3?.id ?? 'P3'); }} />
        <Circle x={SPDT_B.x} y={SPDT_B.y} radius={VIS_R} fill={TERM_FILL} stroke={selStroke} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
      </>
    );
    return (
      <Group x={comp.x} y={comp.y} offsetX={FP.ax} offsetY={FP.ay} scaleX={flipX ? -1 : 1} draggable onDragEnd={e => onDragEnd(comp.id, e.target.x(), e.target.y())}>
        <Group x={0} y={0}>{content}</Group>
      </Group>
    );
  }

  if (variantId === 'DPST') {
    const on = !!comp.props?.on;
    const s1 = DPST_STUB_1;
    const s2 = DPST_STUB_2;
    const content = (
      <>
        <Rect x={0} y={0} width={FP.w} height={FP.h} fill="transparent"
          onClick={e => { e.cancelBubble = true; onSwitchToggle?.(comp.id); onSelect(comp.id, (e.evt as MouseEvent).shiftKey); }}
          onTap={e => { e.cancelBubble = true; onSwitchToggle?.(comp.id); onSelect(comp.id, (e.evt as MouseEvent).shiftKey); }} />
        {/* Pole 1: stub + lever */}
        <Line points={[s1.start.x, s1.start.y, s1.pivot.x, s1.pivot.y]} stroke={STROKE} strokeWidth={SW} lineCap="round" strokeScaleEnabled={false} listening={false} />
        <Line points={on ? [s1.pivot.x, s1.pivot.y, s1.closed.x, s1.closed.y] : [s1.pivot.x, s1.pivot.y, s1.open.x, s1.open.y]} stroke={STROKE} strokeWidth={SW} lineCap="round" strokeScaleEnabled={false} listening={false} />
        {on && <Line points={[s1.closed.x, s1.closed.y, DPST_P2.x, DPST_P2.y]} stroke={STROKE} strokeWidth={SW} lineCap="round" strokeScaleEnabled={false} listening={false} />}
        {/* Pole 2: stub + lever */}
        <Line points={[s2.start.x, s2.start.y, s2.pivot.x, s2.pivot.y]} stroke={STROKE} strokeWidth={SW} lineCap="round" strokeScaleEnabled={false} listening={false} />
        <Line points={on ? [s2.pivot.x, s2.pivot.y, s2.closed.x, s2.closed.y] : [s2.pivot.x, s2.pivot.y, s2.open.x, s2.open.y]} stroke={STROKE} strokeWidth={SW} lineCap="round" strokeScaleEnabled={false} listening={false} />
        {on && <Line points={[s2.closed.x, s2.closed.y, DPST_P4.x, DPST_P4.y]} stroke={STROKE} strokeWidth={SW} lineCap="round" strokeScaleEnabled={false} listening={false} />}
        {/* Mechanical linkage (dashed) */}
        <Line points={[DPST_LINKAGE.x, DPST_LINKAGE.top, DPST_LINKAGE.x, DPST_LINKAGE.bottom]} stroke={STROKE} strokeWidth={SW} lineCap="round" strokeScaleEnabled={false} listening={false} dash={[4, 4]} />
        <Group scaleX={flipX ? -1 : 1} offsetX={FP.ax} x={FP.ax}>
          <Text x={FP.ax - 14} y={2} width={28} text="SW (DPST)" fontSize={8} fill={STROKE} align="center" listening={false} strokeScaleEnabled={false} />
          <Text x={DPST_P1.x - 8} y={DPST_P1.y - 5} text="P1" fontSize={8} fill={STROKE} listening={false} strokeScaleEnabled={false} />
          <Text x={DPST_P2.x + 2} y={DPST_P2.y - 5} text="P2" fontSize={8} fill={STROKE} listening={false} strokeScaleEnabled={false} />
          <Text x={DPST_P3.x - 8} y={DPST_P3.y - 5} text="P3" fontSize={8} fill={STROKE} listening={false} strokeScaleEnabled={false} />
          <Text x={DPST_P4.x + 2} y={DPST_P4.y - 5} text="P4" fontSize={8} fill={STROKE} listening={false} strokeScaleEnabled={false} />
        </Group>
        {(['P1', 'P2', 'P3', 'P4'] as const).map((pid, i) => {
          const pos = [DPST_P1, DPST_P2, DPST_P3, DPST_P4][i]!;
          const pin = comp.pins.find((p) => p.id === pid);
          return (
            <React.Fragment key={pid}>
              <Circle x={pos.x} y={pos.y} radius={HIT_R} opacity={0}
                onClick={e => { e.cancelBubble = true; onPinClick(comp.id, pin?.id ?? pid, (e.evt as MouseEvent).shiftKey); }}
                onTap={e => { e.cancelBubble = true; onPinClick(comp.id, pin?.id ?? pid, (e.evt as MouseEvent).shiftKey); }}
                onPointerDown={e => { e.cancelBubble = true; onPinPointerDown?.(comp.id, pin?.id ?? pid); }}
                onPointerUp={e => { e.cancelBubble = true; onPinPointerUp?.(comp.id, pin?.id ?? pid); }} />
              <Circle x={pos.x} y={pos.y} radius={VIS_R} fill={TERM_FILL} stroke={selStroke} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
            </React.Fragment>
          );
        })}
      </>
    );
    return (
      <Group x={comp.x} y={comp.y} offsetX={FP.ax} offsetY={FP.ay} scaleX={flipX ? -1 : 1} draggable onDragEnd={e => onDragEnd(comp.id, e.target.x(), e.target.y())}>
        <Group x={0} y={0}>{content}</Group>
      </Group>
    );
  }

  if (variantId === 'DPDT') {
    const position = (comp.props?.position as string) === 'B' ? 'B' : 'A';
    const pinIds = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'] as const;
    const content = (
      <>
        <Rect x={0} y={0} width={FP.w} height={FP.h} fill="transparent"
          onClick={e => { e.cancelBubble = true; onSwitchToggle?.(comp.id); onSelect(comp.id, (e.evt as MouseEvent).shiftKey); }}
          onTap={e => { e.cancelBubble = true; onSwitchToggle?.(comp.id); onSelect(comp.id, (e.evt as MouseEvent).shiftKey); }} />
        {/* Dashed horizontal line between the two poles */}
        <Line points={[DPDT_H_DASH.xStart, DPDT_H_DASH.y, DPDT_H_DASH.xEnd, DPDT_H_DASH.y]} stroke={STROKE} strokeWidth={SW} lineCap="round" strokeScaleEnabled={false} listening={false} dash={[4, 4]} />
        {/* Pole 1 (top): COM1 left — horizontal to pivot — diagonal blade to A1 or B1 */}
        <Line points={[DPDT_COM1.x, DPDT_COM1.y, DPDT_PIVOT1.x, DPDT_PIVOT1.y]} stroke={STROKE} strokeWidth={SW} lineCap="round" strokeScaleEnabled={false} listening={false} />
        <Line
          points={position === 'A'
            ? [DPDT_PIVOT1.x, DPDT_PIVOT1.y, DPDT_BLADE1_TO_A.x, DPDT_BLADE1_TO_A.y]
            : [DPDT_PIVOT1.x, DPDT_PIVOT1.y, DPDT_BLADE1_TO_B.x, DPDT_BLADE1_TO_B.y]}
          stroke={STROKE} strokeWidth={SW} lineCap="round" strokeScaleEnabled={false} listening={false}
        />
        {position === 'A' && <Line points={[DPDT_BLADE1_TO_A.x, DPDT_BLADE1_TO_A.y, DPDT_A1.x, DPDT_A1.y]} stroke={STROKE} strokeWidth={SW} lineCap="round" strokeScaleEnabled={false} listening={false} />}
        {position === 'B' && <Line points={[DPDT_BLADE1_TO_B.x, DPDT_BLADE1_TO_B.y, DPDT_B1.x, DPDT_B1.y]} stroke={STROKE} strokeWidth={SW} lineCap="round" strokeScaleEnabled={false} listening={false} />}
        {/* Pole 2 (bottom): COM2 left — horizontal to pivot — diagonal blade to A2 or B2 */}
        <Line points={[DPDT_COM2.x, DPDT_COM2.y, DPDT_PIVOT2.x, DPDT_PIVOT2.y]} stroke={STROKE} strokeWidth={SW} lineCap="round" strokeScaleEnabled={false} listening={false} />
        <Line
          points={position === 'A'
            ? [DPDT_PIVOT2.x, DPDT_PIVOT2.y, DPDT_BLADE2_TO_A.x, DPDT_BLADE2_TO_A.y]
            : [DPDT_PIVOT2.x, DPDT_PIVOT2.y, DPDT_BLADE2_TO_B.x, DPDT_BLADE2_TO_B.y]}
          stroke={STROKE} strokeWidth={SW} lineCap="round" strokeScaleEnabled={false} listening={false}
        />
        {position === 'A' && <Line points={[DPDT_BLADE2_TO_A.x, DPDT_BLADE2_TO_A.y, DPDT_A2.x, DPDT_A2.y]} stroke={STROKE} strokeWidth={SW} lineCap="round" strokeScaleEnabled={false} listening={false} />}
        {position === 'B' && <Line points={[DPDT_BLADE2_TO_B.x, DPDT_BLADE2_TO_B.y, DPDT_B2.x, DPDT_B2.y]} stroke={STROKE} strokeWidth={SW} lineCap="round" strokeScaleEnabled={false} listening={false} />}
        {/* Mechanical linkage: dashed vertical line connecting the two blade pivots */}
        <Line points={[DPDT_V_LINKAGE.x, DPDT_V_LINKAGE.yTop, DPDT_V_LINKAGE.x, DPDT_V_LINKAGE.yBottom]} stroke={STROKE} strokeWidth={SW} lineCap="round" strokeScaleEnabled={false} listening={false} dash={[4, 4]} />
        <Group scaleX={flipX ? -1 : 1} offsetX={FP.ax} x={FP.ax}>
          <Text x={2} y={2} text="SW DPDT" fontSize={7} fill={STROKE} listening={false} strokeScaleEnabled={false} />
          <Text x={DPDT_A1.x + 4} y={DPDT_A1.y - 4} text="P1 A1" fontSize={7} fill={STROKE} listening={false} strokeScaleEnabled={false} />
          <Text x={DPDT_COM1.x - 22} y={DPDT_COM1.y - 4} text="P2 COM1" fontSize={7} fill={STROKE} listening={false} strokeScaleEnabled={false} />
          <Text x={DPDT_B1.x + 4} y={DPDT_B1.y + 1} text="P3 B1" fontSize={7} fill={STROKE} listening={false} strokeScaleEnabled={false} />
          <Text x={DPDT_A2.x + 4} y={DPDT_A2.y - 4} text="P4 A2" fontSize={7} fill={STROKE} listening={false} strokeScaleEnabled={false} />
          <Text x={DPDT_COM2.x - 22} y={DPDT_COM2.y - 4} text="P5 COM2" fontSize={7} fill={STROKE} listening={false} strokeScaleEnabled={false} />
          <Text x={DPDT_B2.x + 4} y={DPDT_B2.y + 1} text="P6 B2" fontSize={7} fill={STROKE} listening={false} strokeScaleEnabled={false} />
        </Group>
        {pinIds.map((pid, i) => {
          const pos = DPDT_POSITIONS[i]!;
          const pin = comp.pins.find((p) => p.id === pid);
          return (
            <React.Fragment key={pid}>
              <Circle x={pos.x} y={pos.y} radius={HIT_R} opacity={0}
                onClick={e => { e.cancelBubble = true; onPinClick(comp.id, pin?.id ?? pid, (e.evt as MouseEvent).shiftKey); }}
                onTap={e => { e.cancelBubble = true; onPinClick(comp.id, pin?.id ?? pid, (e.evt as MouseEvent).shiftKey); }}
                onPointerDown={e => { e.cancelBubble = true; onPinPointerDown?.(comp.id, pin?.id ?? pid); }}
                onPointerUp={e => { e.cancelBubble = true; onPinPointerUp?.(comp.id, pin?.id ?? pid); }} />
              <Circle x={pos.x} y={pos.y} radius={VIS_R} fill={TERM_FILL} stroke={selStroke} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
            </React.Fragment>
          );
        })}
      </>
    );
    return (
      <Group x={comp.x} y={comp.y} offsetX={FP.ax} offsetY={FP.ay} scaleX={flipX ? -1 : 1} draggable onDragEnd={e => onDragEnd(comp.id, e.target.x(), e.target.y())}>
        <Group x={0} y={0}>{content}</Group>
      </Group>
    );
  }

  /* SPST */
  const closed  = !!comp.props?.on;
  const pinAId  = comp.pins[0]?.id ?? 'pin1';
  const pinBId  = comp.pins[1]?.id ?? 'pin2';

  const content = (
    <>
      <Rect x={0} y={0} width={FP.w} height={FP.h} fill="transparent"
        onClick={e => { e.cancelBubble = true; onSwitchToggle?.(comp.id); onSelect(comp.id, (e.evt as MouseEvent).shiftKey); }}
        onTap={e =>   { e.cancelBubble = true; onSwitchToggle?.(comp.id); onSelect(comp.id, (e.evt as MouseEvent).shiftKey); }} />
      <Line points={[STUB_START.x, STUB_START.y, STUB_END.x, STUB_END.y]}
        stroke={STROKE} strokeWidth={SW} lineCap="round" strokeScaleEnabled={false} listening={false} />
      <Line
        points={closed ? [PIVOT.x, PIVOT.y, LEVER_CLOSED_END.x, LEVER_CLOSED_END.y] : [PIVOT.x, PIVOT.y, LEVER_OPEN_END.x, LEVER_OPEN_END.y]}
        stroke={STROKE} strokeWidth={SW} lineCap="round" strokeScaleEnabled={false} listening={false} />
      {closed && (
        <Line points={[LEVER_CLOSED_END.x, LEVER_CLOSED_END.y, T2.x, T2.y]}
          stroke={STROKE} strokeWidth={SW} lineCap="round" strokeScaleEnabled={false} listening={false} />
      )}
      <Group scaleX={flipX ? -1 : 1} offsetX={FP.ax} x={FP.ax}>
        <Text x={FP.ax - 10} y={6} width={20} text="SW" fontSize={9} fill={STROKE} align="center" listening={false} strokeScaleEnabled={false} />
        <Text x={T1.x - 4} y={T1.y - 10} text="1" fontSize={8} fill={STROKE} listening={false} strokeScaleEnabled={false} />
        <Text x={T2.x - 4} y={T2.y - 10} text="2" fontSize={8} fill={STROKE} listening={false} strokeScaleEnabled={false} />
      </Group>
      <Circle x={T1.x} y={T1.y} radius={HIT_R} opacity={0}
        onClick={e => { e.cancelBubble = true; onPinClick(comp.id, pinAId, (e.evt as MouseEvent).shiftKey); }}
        onTap={e => { e.cancelBubble = true; onPinClick(comp.id, pinAId, (e.evt as MouseEvent).shiftKey); }}
        onPointerDown={e => { e.cancelBubble = true; onPinPointerDown?.(comp.id, pinAId); }}
        onPointerUp={e => { e.cancelBubble = true; onPinPointerUp?.(comp.id, pinAId); }} />
      <Circle x={T1.x} y={T1.y} radius={VIS_R} fill={TERM_FILL} stroke={selStroke} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
      <Circle x={T2.x} y={T2.y} radius={HIT_R} opacity={0}
        onClick={e => { e.cancelBubble = true; onPinClick(comp.id, pinBId, (e.evt as MouseEvent).shiftKey); }}
        onTap={e => { e.cancelBubble = true; onPinClick(comp.id, pinBId, (e.evt as MouseEvent).shiftKey); }}
        onPointerDown={e => { e.cancelBubble = true; onPinPointerDown?.(comp.id, pinBId); }}
        onPointerUp={e => { e.cancelBubble = true; onPinPointerUp?.(comp.id, pinBId); }} />
      <Circle x={T2.x} y={T2.y} radius={VIS_R} fill={TERM_FILL} stroke={selStroke} strokeWidth={SW} strokeScaleEnabled={false} listening={false} />
    </>
  );

  return (
    <Group x={comp.x} y={comp.y} offsetX={FP.ax} offsetY={FP.ay} scaleX={flipX ? -1 : 1} draggable onDragEnd={e => onDragEnd(comp.id, e.target.x(), e.target.y())}>
      <Group x={0} y={0}>{content}</Group>
    </Group>
  );
}
