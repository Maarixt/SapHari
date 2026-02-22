import React from 'react';
import { Group, Rect, Circle, Text } from 'react-konva';
import { SimComponent, PinKind } from './types';
import { getFootprint } from './visual/footprints';
import { LEDNode } from './LEDNode';
import { BuzzerNode } from './parts/BuzzerNode';
import { ButtonNode } from './parts/ButtonNode';
import { ESP32DevkitRenderer } from './visual/ESP32DevkitRenderer';
import { PinNode } from './visual/PinNode';

interface SimComponentNodeProps {
  comp: SimComponent;
  /** When provided, overrides comp.selected for stable props (avoids inline comp spread). */
  selected?: boolean;
  /** For junction: number of wires attached (node degree). When >= 3, junction is drawn larger or with a ring. */
  junctionWireCount?: number;
  tool?: 'select' | 'wire' | 'pan';
  onPinClick: (compId: string, pinId: string, shift?: boolean) => void;
  onPinPointerDown?: (compId: string, pinId: string) => void;
  onPinPointerUp?: (compId: string, pinId: string) => void;
  onSelect: (id: string, shift?: boolean) => void;
  onDelete: (id: string) => void;
  onDragEnd?: (compId: string, x: number, y: number, evt?: MouseEvent) => void;
}

/** Pin position from footprint when available, else PinDef.x/y. Label to right if pin on left half. */
function pinOffsetAndLabel(footprint: ReturnType<typeof getFootprint>, p: { id: string; x: number; y: number }, width: number) {
  const offset = footprint?.pinOffsets[p.id] ?? { x: p.x, y: p.y };
  const labelX = offset.x < (width / 2) ? 12 : -60;
  return { offset, labelX };
}

const SimComponentNodeInner = ({ comp, selected: selectedProp, junctionWireCount, tool, onPinClick, onPinPointerDown, onPinPointerUp, onSelect, onDelete, onDragEnd }: SimComponentNodeProps) => {
  const footprint = getFootprint(comp.type);
  const w = footprint?.width ?? (comp.type === 'esp32' ? 180 : 90);
  const h = footprint?.height ?? (comp.type === 'esp32' ? 240 : 50);

  const isSelected = selectedProp !== undefined ? selectedProp : comp.selected;

  // Get simulation state for visual feedback
  const isOn = comp.props?.on || false;
  const isActive = comp.props?.active || false;
  const isPressed = comp.props?.pressed || false;

  const handleDragEnd = (e: { target: { x: () => number; y: () => number }; evt: MouseEvent }) => {
    if (onDragEnd) {
      onDragEnd(comp.id, e.target.x(), e.target.y(), e.evt);
    }
  };

  // Special rendering for different component types
  if (comp.type === 'led') {
    return (
      <Group 
        x={comp.x} 
        y={comp.y} 
        draggable
        onDragEnd={handleDragEnd}
        onClick={(e) => onSelect(comp.id, e.evt.shiftKey)}
      >
        {/* LED Node */}
        <LEDNode comp={comp} />

        {/* Pins */}
        {comp.pins.map((p) => {
          const { offset, labelX } = pinOffsetAndLabel(footprint, p, w);
          return (
            <Group
              key={p.id}
              x={offset.x}
              y={offset.y}
              onClick={(e) => {
                e.cancelBubble = true;
                onPinClick(comp.id, p.id, e.evt.shiftKey);
              }}
              onPointerDown={(e) => {
                if (tool === 'wire' && onPinPointerDown) {
                  e.cancelBubble = true;
                  onPinPointerDown(comp.id, p.id);
                }
              }}
              onPointerUp={(e) => {
                if (tool === 'wire' && onPinPointerUp) {
                  e.cancelBubble = true;
                  onPinPointerUp(comp.id, p.id);
                }
              }}
            >
              <Circle radius={6} fill={pinFill(p.kind)} stroke="#64748b" strokeScaleEnabled={false} />
              <Text text={p.label} x={labelX} y={-6} fill="#94a3b8" fontSize={10} />
            </Group>
          );
        })}
      </Group>
    );
  }

  if (comp.type === 'buzzer') {
    return (
      <Group 
        x={comp.x} 
        y={comp.y} 
        draggable
        onDragEnd={handleDragEnd}
        onClick={(e) => onSelect(comp.id, e.evt.shiftKey)}
      >
        {/* Buzzer Node */}
        <BuzzerNode comp={comp} />

        {/* Pins */}
        {comp.pins.map((p) => {
          const { offset, labelX } = pinOffsetAndLabel(footprint, p, w);
          return (
            <Group
              key={p.id}
              x={offset.x}
              y={offset.y}
              onClick={(e) => {
                e.cancelBubble = true;
                onPinClick(comp.id, p.id, e.evt.shiftKey);
              }}
              onPointerDown={(e) => {
                if (tool === 'wire' && onPinPointerDown) {
                  e.cancelBubble = true;
                  onPinPointerDown(comp.id, p.id);
                }
              }}
              onPointerUp={(e) => {
                if (tool === 'wire' && onPinPointerUp) {
                  e.cancelBubble = true;
                  onPinPointerUp(comp.id, p.id);
                }
              }}
            >
              <Circle radius={6} fill={pinFill(p.kind)} stroke="#64748b" strokeScaleEnabled={false} />
              <Text text={p.label} x={labelX} y={-6} fill="#94a3b8" fontSize={10} />
            </Group>
          );
        })}
      </Group>
    );
  }

  if (comp.type === 'button') {
    return (
      <Group 
        x={comp.x} 
        y={comp.y} 
        draggable
        onDragEnd={handleDragEnd}
        onClick={(e) => onSelect(comp.id, e.evt.shiftKey)}
      >
        {/* Button Node */}
        <ButtonNode comp={comp} />

        {/* Pins */}
        {comp.pins.map((p) => {
          const { offset, labelX } = pinOffsetAndLabel(footprint, p, w);
          return (
            <Group
              key={p.id}
              x={offset.x}
              y={offset.y}
              onClick={(e) => {
                e.cancelBubble = true;
                onPinClick(comp.id, p.id, e.evt.shiftKey);
              }}
              onPointerDown={(e) => {
                if (tool === 'wire' && onPinPointerDown) {
                  e.cancelBubble = true;
                  onPinPointerDown(comp.id, p.id);
                }
              }}
              onPointerUp={(e) => {
                if (tool === 'wire' && onPinPointerUp) {
                  e.cancelBubble = true;
                  onPinPointerUp(comp.id, p.id);
                }
              }}
            >
              <Circle radius={6} fill={pinFill(p.kind)} stroke="#64748b" strokeScaleEnabled={false} />
              <Text text={p.label} x={labelX} y={-6} fill="#94a3b8" fontSize={10} />
            </Group>
          );
        })}
      </Group>
    );
  }

  if (comp.type === 'esp32') {
    return (
      <ESP32DevkitRenderer
        component={comp}
        tool={tool}
        onSelect={onSelect}
        onDelete={onDelete}
        onDragEnd={onDragEnd}
        onPinClick={onPinClick}
        onPinPointerDown={onPinPointerDown}
        onPinPointerUp={onPinPointerUp}
      />
    );
  }

  if (comp.type === 'junction') {
    const degree = junctionWireCount ?? 0;
    const hasMultipleBranches = degree >= 3;
    const radius = hasMultipleBranches ? 6 : 5;
    return (
      <Group
        x={comp.x}
        y={comp.y}
        draggable
        onDragEnd={handleDragEnd}
        onClick={(e) => onSelect(comp.id, e.evt.shiftKey)}
      >
        <Group
          x={0}
          y={0}
          onClick={(e) => {
            e.cancelBubble = true;
            onPinClick(comp.id, 'J', e.evt.shiftKey);
          }}
          onPointerDown={(e) => {
            if (tool === 'wire' && onPinPointerDown) {
              e.cancelBubble = true;
              onPinPointerDown(comp.id, 'J');
            }
          }}
          onPointerUp={(e) => {
            if (tool === 'wire' && onPinPointerUp) {
              e.cancelBubble = true;
              onPinPointerUp(comp.id, 'J');
            }
          }}
        >
          {hasMultipleBranches && (
            <Circle radius={8} fill="transparent" stroke="#9ca3af" strokeWidth={1.5} strokeScaleEnabled={false} />
          )}
          <Circle radius={radius} fill="#6b7280" stroke="#9ca3af" strokeWidth={1} strokeScaleEnabled={false} />
        </Group>
      </Group>
    );
  }

  if (comp.type === 'power_rail') {
    const kind = (comp.props?.kind as '3v3' | 'vin' | 'gnd') ?? '3v3';
    const label = kind === 'gnd' ? 'GND' : kind === 'vin' ? 'VIN' : '3V3';
    const stripFill = kind === 'gnd' ? '#374151' : kind === 'vin' ? '#f59e0b' : '#10b981';
    const fp = getFootprint('power_rail');
    const anchor = fp?.anchor ?? { x: 22, y: 12 };
    const pinOffset = fp?.pinOffsets?.out ?? { x: 22, y: 12 };
    const gx = comp.x - anchor.x;
    const gy = comp.y - anchor.y;
    return (
      <Group
        x={gx}
        y={gy}
        draggable
        onDragEnd={(e) => onDragEnd?.(comp.id, e.target.x() + anchor.x, e.target.y() + anchor.y, e.evt as MouseEvent)}
        onClick={(e) => onSelect(comp.id, e.evt.shiftKey)}
      >
        <Rect
          width={44}
          height={24}
          x={0}
          y={0}
          cornerRadius={4}
          fill={stripFill}
          stroke="#64748b"
          strokeWidth={1}
          strokeScaleEnabled={false}
        />
        <Text text={label} x={8} y={6} fill="#e2e8f0" fontSize={11} />
        <PinNode
          x={pinOffset.x}
          y={pinOffset.y}
          pinId="out"
          compId={comp.id}
          kind={kind === 'gnd' ? 'ground' : 'power'}
          radius={5}
          onClick={onPinClick}
          onTap={onPinClick}
          onPointerDown={onPinPointerDown}
          onPointerUp={onPointerUp}
        />
      </Group>
    );
  }

  return (
    <Group 
      x={comp.x} 
      y={comp.y} 
      draggable
      onDragEnd={handleDragEnd}
      onClick={(e) => onSelect(comp.id, e.evt.shiftKey)}
    >
      <Rect 
        width={w} 
        height={h} 
        cornerRadius={10} 
        fill={(comp.type as string) === 'esp32' ? '#111827' : '#1f2937'} 
        stroke={isSelected ? '#60a5fa' : '#374151'} 
        strokeWidth={isSelected ? 3 : 1.5} 
        shadowBlur={isSelected ? 16 : 4}
        shadowColor="#000"
        strokeScaleEnabled={false}
      />
      
      {/* Title */}
      <Text 
        text={comp.props?.name || comp.type.toUpperCase()} 
        x={8} 
        y={8} 
        fill="#cbd5e1" 
        fontSize={12} 
      />

      {/* Visual simulation feedback */}
      {(comp.type as string) === 'buzzer' && isActive && (
        <Rect 
          x={4} 
          y={4} 
          width={w - 8} 
          height={h - 8} 
          cornerRadius={4} 
          fill="#f59e0b" 
          opacity={0.3} 
        />
      )}

      {(comp.type as string) === 'button' && isPressed && (
        <Rect 
          x={4} 
          y={4} 
          width={w - 8} 
          height={h - 8} 
          cornerRadius={4} 
          fill="#22c55e" 
          opacity={0.3} 
        />
      )}

      {/* Pins */}
      {comp.pins.map((p) => {
        const { offset, labelX } = pinOffsetAndLabel(footprint, p, w);
        return (
          <Group
            key={p.id}
            x={offset.x}
            y={offset.y}
            onClick={(e) => {
              e.cancelBubble = true;
              onPinClick(comp.id, p.id, e.evt.shiftKey);
            }}
            onPointerDown={(e) => {
              if (tool === 'wire' && onPinPointerDown) {
                e.cancelBubble = true;
                onPinPointerDown(comp.id, p.id);
              }
            }}
            onPointerUp={(e) => {
              if (tool === 'wire' && onPinPointerUp) {
                e.cancelBubble = true;
                onPinPointerUp(comp.id, p.id);
              }
            }}
          >
            <Circle radius={6} fill={pinFill(p.kind)} stroke="#64748b" strokeScaleEnabled={false} />
            <Text text={p.label} x={labelX} y={-6} fill="#94a3b8" fontSize={10} />
          </Group>
        );
      })}
    </Group>
  );
};

export const SimComponentNode = React.memo(SimComponentNodeInner);

function pinFill(kind: PinKind) {
  switch(kind) {
    case 'power':  return '#f59e0b'; // amber
    case 'ground': return '#6b7280'; // gray
    case 'analog': return '#10b981'; // teal
    case 'pwm':    return '#8b5cf6'; // violet
    default:       return '#334155'; // slate
  }
}
