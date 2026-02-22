/**
 * Selection overlay: small delete button when a single component or wire is selected.
 * Rendered in stage (screen) coordinates so the button stays a fixed size.
 * No embedded delete on parts; delete via this overlay or keyboard.
 */

import React from 'react';
import { Layer, Group, Circle, Text } from 'react-konva';
import type { Viewport } from '../store/circuitStore';
import type { SimComponent, Wire } from '../types';
import { getComponentBbox, getWirePoints } from '../helpers';

const BUTTON_R = 9;
const OFFSET_X = 8;
const OFFSET_Y = -8;

function circuitToStage(
  viewport: Viewport,
  circuitX: number,
  circuitY: number
): { x: number; y: number } {
  return {
    x: viewport.offsetX + circuitX * viewport.scale,
    y: viewport.offsetY + circuitY * viewport.scale,
  };
}

export interface SelectionOverlayLayerProps {
  viewport: Viewport;
  viewMode?: 'workbench' | 'schematic';
  selectedComponentIds: string[];
  selectedWireIds: string[];
  components: SimComponent[];
  wires: Wire[];
  onDeleteComponent: (id: string) => void;
  onDeleteWire: (id: string) => void;
}

/** Delete button: subtle circle with × */
function DeleteButton({
  stageX,
  stageY,
  onDelete,
}: {
  stageX: number;
  stageY: number;
  onDelete: () => void;
}) {
  return (
    <Group
      x={stageX}
      y={stageY}
      onClick={(e) => {
        e.cancelBubble = true;
        onDelete();
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onDelete();
      }}
    >
      <Circle
        radius={BUTTON_R}
        fill="#374151"
        stroke="#64748b"
        strokeWidth={1.5}
        strokeScaleEnabled={false}
        listening={true}
      />
      <Text
        text="×"
        x={-5}
        y={-6}
        width={10}
        height={12}
        fontSize={12}
        fill="#94a3b8"
        align="center"
        listening={false}
      />
    </Group>
  );
}

export function SelectionOverlayLayer({
  viewport,
  viewMode = 'workbench',
  selectedComponentIds,
  selectedWireIds,
  components,
  wires,
  onDeleteComponent,
  onDeleteWire,
}: SelectionOverlayLayerProps) {
  const state = { components, wires };
  const singleComponent =
    selectedComponentIds.length === 1 ? selectedComponentIds[0]! : null;
  const singleWire =
    selectedWireIds.length === 1 ? selectedWireIds[0]! : null;

  let deleteButton: { stageX: number; stageY: number; onDelete: () => void } | null = null;

  if (singleComponent) {
    const bbox = getComponentBbox(state, singleComponent, viewMode);
    if (bbox) {
      const topRightCircuit = { x: bbox.left + bbox.width, y: bbox.top };
      const stagePos = circuitToStage(
        viewport,
        topRightCircuit.x,
        topRightCircuit.y
      );
      deleteButton = {
        stageX: stagePos.x + OFFSET_X,
        stageY: stagePos.y + OFFSET_Y,
        onDelete: () => onDeleteComponent(singleComponent),
      };
    }
  } else if (singleWire) {
    const wire = wires.find((w) => w.id === singleWire);
    if (wire) {
      const points = getWirePoints(state, wire, viewMode);
      if (points.length >= 4) {
        const midX = (points[0]! + points[points.length - 2]!) / 2;
        const midY = (points[1]! + points[points.length - 1]!) / 2;
        const stagePos = circuitToStage(viewport, midX, midY);
        deleteButton = {
          stageX: stagePos.x + OFFSET_X,
          stageY: stagePos.y + OFFSET_Y,
          onDelete: () => onDeleteWire(singleWire),
        };
      }
    }
  }

  if (!deleteButton) return null;

  return (
    <Layer listening={true}>
      <DeleteButton
        stageX={deleteButton.stageX}
        stageY={deleteButton.stageY}
        onDelete={deleteButton.onDelete}
      />
    </Layer>
  );
}
