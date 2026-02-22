/**
 * Standard render structure for simulator components. Phase 4 realistic components
 * (e.g. ESP32 DevKit) use this wrapper and only implement renderBody (and optionally
 * Details/Pins/Labels) so layout, selection glow, and shadow stay consistent.
 */

import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import type { SimComponent } from '../types';
import type { Footprint } from './footprints';
import { materials } from './materials';
import type { MaterialProps } from './materials';

export interface BaseComponentRendererProps {
  component: SimComponent;
  footprint: Footprint;
  /** Material for default body when renderBody is not provided. */
  material?: MaterialProps;
  /** Main body (rect or custom shape). When provided, footprint width/height are passed. */
  renderBody?: (props: { width: number; height: number }) => React.ReactNode;
  /** Optional slot for extra detail (e.g. USB, shield). */
  renderDetails?: () => React.ReactNode;
  /** Pins layer. */
  renderPins?: () => React.ReactNode;
  /** Labels layer. */
  renderLabels?: () => React.ReactNode;
  onSelect: (id: string, shift?: boolean) => void;
  onDelete: (id: string) => void;
  onDragEnd?: (compId: string, x: number, y: number) => void;
  onPinClick?: (compId: string, pinId: string, shift?: boolean) => void;
}

export function BaseComponentRenderer({
  component,
  footprint,
  material = materials.plastic,
  renderBody,
  renderDetails,
  renderPins,
  renderLabels,
  onSelect,
  onDelete,
  onDragEnd,
}: BaseComponentRendererProps) {
  const { width, height, anchor } = footprint;
  const anchorX = anchor?.x ?? 0;
  const anchorY = anchor?.y ?? 0;

  const handleDragEnd = (e: { target: { x: () => number; y: () => number } }) => {
    if (onDragEnd) onDragEnd(component.id, e.target.x(), e.target.y());
  };

  return (
    <Group
      x={component.x}
      y={component.y}
      offsetX={anchorX}
      offsetY={anchorY}
      rotation={component.rotation ?? 0}
      draggable
      onDragEnd={handleDragEnd}
      onClick={(e) => onSelect(component.id, e.evt.shiftKey)}
    >
      <Group x={0} y={0}>
        {/* FootprintBase: optional outline (no-op for now; Phase 4 can draw board outline). */}
        {/* Body: from renderBody or default rect with material. */}
        {renderBody ? (
          renderBody({ width, height })
        ) : (
          <Rect
            width={width}
            height={height}
            cornerRadius={8}
            fill={material.fill}
            stroke={component.selected ? '#60a5fa' : material.stroke}
            strokeWidth={component.selected ? 3 : (material.strokeWidth ?? 1)}
            shadowColor={material.shadowColor}
            shadowBlur={component.selected ? 16 : (material.shadowBlur ?? 4)}
            shadowOffset={material.shadowOffset}
            shadowOpacity={material.shadowOpacity}
            strokeScaleEnabled={false}
          />
        )}

        {/* Details slot (Phase 4: USB, RF shield, etc.). */}
        {renderDetails?.()}

        {/* Pins and Labels slots. */}
        {renderPins?.()}
        {renderLabels?.()}
      </Group>
      {/* Delete: use selection overlay or right-click menu or Delete key (no embedded icon). */}
    </Group>
  );
}
