/**
 * Realistic ESP32 DevKit renderer using footprint + materials.
 *
 * Pattern for future realistic components:
 * 1. Define an explicit footprint in footprints.ts (width, height, anchor, pinOffsets).
 * 2. Use BaseComponentRenderer with that footprint.
 * 3. Implement renderBody (PCB/shape), renderDetails (holes, shield, USB, etc.),
 *    renderPins (clickable pins at footprint.pinOffsets), renderLabels (silkscreen).
 * 4. Use materials (pcbDark, metal, plastic, goldPin, silkscreen) and set
 *    strokeScaleEnabled={false} on stroked shapes so zoom doesn’t change stroke width.
 * 5. Wire findPin() in helpers.ts to use footprint pinOffsets when present so wires attach at visual pins.
 */

import React from 'react';
import { Group, Rect, Circle, Text } from 'react-konva';
import type { SimComponent } from '../types';
import { BaseComponentRenderer } from './BaseComponentRenderer';
import { ESP32_FOOTPRINT } from './footprints';
import { materials } from './materials';

const W = ESP32_FOOTPRINT.width;
const H = ESP32_FOOTPRINT.height;
const ANCHOR_X = ESP32_FOOTPRINT.anchor!.x;
const ANCHOR_Y = ESP32_FOOTPRINT.anchor!.y;

/** Mounting hole: metal ring + dark center. */
function MountingHole({ x, y }: { x: number; y: number }) {
  return (
    <Group x={x} y={y}>
      <Circle radius={6} fill="#374151" stroke="#6b7280" strokeWidth={1} strokeScaleEnabled={false} />
      <Circle radius={3} fill="#0f172a" listening={false} />
    </Group>
  );
}

export interface ESP32DevkitRendererProps {
  component: SimComponent;
  tool?: 'select' | 'wire' | 'pan';
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDragEnd?: (compId: string, x: number, y: number) => void;
  onPinClick: (compId: string, pinId: string, shift?: boolean) => void;
  onPinPointerDown?: (compId: string, pinId: string) => void;
  onPinPointerUp?: (compId: string, pinId: string) => void;
}

export function ESP32DevkitRenderer({
  component,
  tool,
  onSelect,
  onDelete,
  onDragEnd,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
}: ESP32DevkitRendererProps) {
  const { pinOffsets } = ESP32_FOOTPRINT;

  const renderBody = ({ width, height }: { width: number; height: number }) => (
    <>
      {/* PCB body — rounded corners, dark, subtle shadow */}
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        cornerRadius={12}
        fill={materials.pcbDark.fill}
        stroke={materials.pcbDark.stroke}
        strokeWidth={materials.pcbDark.strokeWidth}
        shadowColor={materials.pcbDark.shadowColor}
        shadowBlur={materials.pcbDark.shadowBlur}
        shadowOffset={materials.pcbDark.shadowOffset}
        shadowOpacity={materials.pcbDark.shadowOpacity}
        strokeScaleEnabled={false}
      />
    </>
  );

  const renderDetails = () => (
    <>
      {/* 4 mounting holes at corners */}
      <MountingHole x={12} y={12} />
      <MountingHole x={W - 12} y={12} />
      <MountingHole x={W - 12} y={H - 12} />
      <MountingHole x={12} y={H - 12} />

      {/* RF shield — metal, centered upper area, slight inner stroke */}
      <Group x={W * 0.25} y={18} listening={false}>
        <Rect
          width={W * 0.5}
          height={72}
          cornerRadius={4}
          fill={materials.metal.fill}
          stroke={materials.metal.stroke}
          strokeWidth={1}
          shadowColor={materials.metal.shadowColor}
          shadowBlur={materials.metal.shadowBlur}
          strokeScaleEnabled={false}
        />
        <Rect
          x={2}
          y={2}
          width={W * 0.5 - 4}
          height={68}
          cornerRadius={2}
          stroke="#4b5563"
          strokeWidth={1}
          listening={false}
          strokeScaleEnabled={false}
        />
        <Text text="ESP-WROOM-32" x={8} y={26} fontSize={8} fill="#9ca3af" fontStyle="bold" listening={false} />
      </Group>

      {/* USB port at bottom center */}
      <Group x={W / 2 - 18} y={H - 28} listening={false}>
        <Rect
          width={36}
          height={14}
          cornerRadius={2}
          fill="#4b5563"
          stroke="#6b7280"
          strokeWidth={1}
          strokeScaleEnabled={false}
        />
        <Rect x={4} y={3} width={28} height={8} fill="#1f2937" listening={false} />
      </Group>

      {/* Header strips (plastic) — left and right */}
      <Rect
        x={4}
        y={36}
        width={12}
        height={H - 72}
        cornerRadius={2}
        fill={materials.plastic.fill}
        stroke={materials.plastic.stroke}
        strokeWidth={1}
        listening={false}
        strokeScaleEnabled={false}
      />
      <Rect
        x={W - 16}
        y={36}
        width={12}
        height={H - 72}
        cornerRadius={2}
        fill={materials.plastic.fill}
        stroke={materials.plastic.stroke}
        strokeWidth={1}
        listening={false}
        strokeScaleEnabled={false}
      />

      {/* Selection overlay */}
      {component.selected && (
        <Rect
          x={2}
          y={2}
          width={W - 4}
          height={H - 4}
          cornerRadius={10}
          stroke="#60a5fa"
          strokeWidth={3}
          listening={false}
          strokeScaleEnabled={false}
        />
      )}
    </>
  );

  const renderPins = () => (
    <>
      {component.pins.map((pin) => {
        const pos = pinOffsets[pin.id];
        if (!pos) return null;
        return (
          <Group
            key={pin.id}
            x={pos.x}
            y={pos.y}
            onClick={(e) => {
              e.cancelBubble = true;
              onPinClick(component.id, pin.id, e.evt.shiftKey);
            }}
            onPointerDown={(e) => {
              if (tool === 'wire' && onPinPointerDown) {
                e.cancelBubble = true;
                onPinPointerDown(component.id, pin.id);
              }
            }}
            onPointerUp={(e) => {
              if (tool === 'wire' && onPinPointerUp) {
                e.cancelBubble = true;
                onPinPointerUp(component.id, pin.id);
              }
            }}
          >
            {/* Gold pin — main circle */}
            <Circle
              radius={5}
              fill={materials.goldPin.fill}
              stroke={materials.goldPin.stroke}
              strokeWidth={1}
              strokeScaleEnabled={false}
            />
            {/* Slightly darker at bottom for depth */}
            <Circle radius={3} y={1} fill="#a16207" listening={false} />
          </Group>
        );
      })}
    </>
  );

  const renderLabels = () => (
    <>
      {component.pins.map((pin) => {
        const pos = pinOffsets[pin.id];
        if (!pos) return null;
        const isLeft = pos.x < ANCHOR_X;
        const labelX = isLeft ? 10 : -32;
        return (
          <Text
            key={`label-${pin.id}`}
            x={pos.x + labelX}
            y={pos.y - 4}
            text={pin.label}
            fontSize={8}
            fill={materials.silkscreen.fill}
            opacity={materials.silkscreen.opacity ?? 1}
            listening={false}
          />
        );
      })}
    </>
  );

  return (
    <BaseComponentRenderer
      component={component}
      footprint={ESP32_FOOTPRINT}
      material={materials.pcbDark}
      renderBody={renderBody}
      renderDetails={renderDetails}
      renderPins={renderPins}
      renderLabels={renderLabels}
      onSelect={onSelect}
      onDelete={onDelete}
      onDragEnd={onDragEnd}
    />
  );
}
