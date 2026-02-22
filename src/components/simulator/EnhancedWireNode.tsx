// src/components/simulator/EnhancedWireNode.tsx
import React, { useRef, useEffect } from 'react';
import Konva from 'konva';
import { Group, Line, Circle, Text } from 'react-konva';
import { SimState, Wire } from './types';
import { getWirePoints, getWirePointsWithStatus, snapToWireGrid } from './helpers';
import { sanitizePoints, safePoint } from './utils/coords';

interface ViewportLike {
  scale: number;
  offsetX: number;
  offsetY: number;
}

interface EnhancedWireNodeProps {
  wire: Wire;
  /** When provided, overrides wire.selected for stable props (avoids inline wire spread). */
  selected?: boolean;
  /** Either state or (components + wires) for findPin; prefer components/wires to avoid new object each render. */
  state?: SimState;
  components?: SimState['components'];
  wires?: SimState['wires'];
  viewport?: ViewportLike;
  /** When provided, wires use view-specific pin positions (workbench vs schematic). */
  viewMode?: 'workbench' | 'schematic';
  tool?: 'select' | 'wire' | 'pan';
  onSelect: (id: string, shift?: boolean) => void;
  onDelete: (id: string) => void;
  /** When tool is wire: commit to pin. When tool is select: (wireId, x, y, segmentIndex?) inserts midpoint. */
  onWireSegmentClick?: (wireId: string, circuitX: number, circuitY: number, segmentIndex?: number) => void;
  /** Insert a bend point at segment midpoint (called when user clicks "+" on segment). */
  onWireInsertMidpoint?: (wireId: string, segmentIndex: number, x: number, y: number) => void;
  /** When provided and wire is selected, waypoint handles are draggable to edit path. */
  onWirePointsChange?: (wireId: string, points: number[]) => void;
  isHovered?: boolean;
  isHighlighted?: boolean;
  voltage?: number;
  hasConflict?: boolean;
  isEnergized?: boolean;
  /** "off" | "feed" | "current". Only "current" shows animated dash; "feed" = dim potential present. */
  wireState?: 'off' | 'feed' | 'current';
  /** Solver-driven flow direction: 1 = forward (polyline first→last), -1 = backward, 0 = no animation. */
  flowDirection?: 1 | -1 | 0;
  isValidConnection?: boolean;
}

const EnhancedWireNodeInner = ({
  wire,
  selected: selectedProp,
  state: stateProp,
  components,
  wires,
  viewport,
  viewMode,
  tool = 'select',
  onSelect,
  onDelete,
  onWireSegmentClick,
  onWireInsertMidpoint,
  onWirePointsChange,
  isHovered = false,
  isHighlighted = false,
  voltage,
  hasConflict = false,
  isEnergized = false,
  wireState = 'off',
  flowDirection = 0,
  isValidConnection = true
}: EnhancedWireNodeProps) => {
  const lineRef = useRef<Konva.Line | null>(null);
  const showCurrentAnimation = wireState === 'current' && flowDirection !== 0;
  useEffect(() => {
    if (!showCurrentAnimation) return;
    const sign = flowDirection === -1 ? 1 : -1;
    let id: number;
    let offset = 0;
    const tick = () => {
      offset = (offset + 4) % 24;
      const node = lineRef.current;
      if (node) {
        node.dashOffset(sign * offset);
        node.getLayer()?.batchDraw();
      }
      id = requestAnimationFrame(tick);
    };
    const node = lineRef.current;
    if (node) {
      node.dashOffset(sign * offset);
      node.getLayer()?.batchDraw();
    }
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [showCurrentAnimation, flowDirection]);

  const state: SimState = stateProp ?? (components != null && wires != null ? { components, wires, running: false } : { components: [], wires: [], running: false });
  const status = getWirePointsWithStatus(state, wire, viewMode);
  const { points, fromResolved, toResolved, fromPos, toPos, missingFromReason, missingToReason } = status;
  const isBroken = !fromResolved || !toResolved;

  // Never pass NaN to Konva: sanitize points; skip render if invalid
  const safePoints = sanitizePoints(points);
  if (!safePoints || safePoints.length < 4) {
    if (import.meta.env.DEV && (missingFromReason || missingToReason)) {
      console.warn('[Wire]', wire.id, 'endpoint unresolved', { from: wire.from, to: wire.to, missingFromReason, missingToReason });
    }
    return null;
  }

  if (import.meta.env.DEV && isBroken) {
    console.warn('[Wire]', wire.id, 'broken wire', { fromResolved, toResolved, missingFromReason, missingToReason });
  }

  // Calculate midpoint for delete handle (use sanitized points)
  const midX = (safePoints[0]! + safePoints[safePoints.length - 2]!) / 2;
  const midY = (safePoints[1]! + safePoints[safePoints.length - 1]!) / 2;

  // Determine wire appearance based on state (prefer explicit selected prop for stable memo)
  const isSelected = selectedProp !== undefined ? selectedProp : wire.selected;
  const isActive = isValidConnection;
  
  // Wire styling based on state
  const getWireStyle = () => {
    const baseColor = (wire.color ?? '').toLowerCase();
    const isVeryDark =
      baseColor === 'black' ||
      baseColor === '#000' ||
      baseColor === '#000000' ||
      baseColor === 'rgb(0,0,0)';
    const visibleColor = isVeryDark ? '#9ca3af' : wire.color;

    if (!isActive) {
      return {
        stroke: '#ef4444', // Red for invalid connections
        strokeWidth: 4,
        shadowColor: '#ef4444',
        shadowBlur: 8,
        dash: [5, 5] // Dashed line for invalid
      };
    }
    
    if (isSelected) {
      return {
        stroke: '#ffffff', // White when selected
        strokeWidth: 5,
        shadowColor: wire.color,
        shadowBlur: 15,
        shadowOpacity: 0.8
      };
    }

    if (isHighlighted) {
      return {
        stroke: visibleColor,
        strokeWidth: 4,
        shadowColor: '#60a5fa',
        shadowBlur: 8,
        shadowOpacity: 0.6
      };
    }
    
    if (isHovered) {
      return {
        stroke: visibleColor,
        strokeWidth: 4,
        shadowColor: visibleColor,
        shadowBlur: 12,
        shadowOpacity: 0.6
      };
    }

    if (hasConflict) {
      return {
        stroke: '#ef4444',
        strokeWidth: 4,
        shadowColor: '#ef4444',
        shadowBlur: 8,
        dash: undefined,
        opacity: 1
      };
    }

    // CURRENT: strong animated red (dash animation runs only when wireState==='current')
    if (wireState === 'current' && voltage !== undefined) {
      const stroke =
        voltage >= 4.5 ? '#ef4444' : voltage >= 3 ? '#f97316' : voltage === 0 ? '#9ca3af' : wire.color;
      return {
        stroke,
        strokeWidth: 3,
        dash: [6, 6],
        shadowColor: stroke,
        shadowBlur: 6,
        shadowOpacity: 0.5,
        opacity: voltage === 0 ? 0.7 : 1
      };
    }
    if (wireState === 'current') {
      return {
        stroke: visibleColor,
        strokeWidth: 3,
        dash: [6, 6],
        opacity: 0.5,
        shadowBlur: 0
      };
    }
    // FEED: potential present upstream (e.g. up to open switch). Dim, no animation.
    if (wireState === 'feed') {
      return {
        stroke: voltage !== undefined && voltage > 0.5 ? '#b91c1c' : visibleColor,
        strokeWidth: 2.5,
        dash: [4, 4],
        opacity: 0.55,
        shadowBlur: 0
      };
    }

    // Voltage-based brightness (non-energized or floating)
    if (voltage !== undefined) {
      const opacity = voltage === 0 ? 0.5 : voltage >= 3 ? 1 : 0.75;
      return {
        stroke: visibleColor,
        strokeWidth: 3,
        shadowColor: visibleColor,
        shadowBlur: isActive ? 6 : 0,
        shadowOpacity: opacity * 0.4,
        opacity
      };
    }

    // Floating (no voltage assigned): dashed and dim
    return {
      stroke: visibleColor,
      strokeWidth: 3,
      shadowColor: visibleColor,
      shadowBlur: 0,
      shadowOpacity: 0.2,
      dash: [6, 4],
      opacity: 0.4
    };
  };

  const wireStyle = isBroken
    ? { stroke: '#6b7280', strokeWidth: 3, dash: [8, 4], opacity: 0.8, shadowBlur: 0 }
    : getWireStyle();

  return (
    <Group>
      {/* Fat invisible hit-line for easy clicking */}
      <Line
        points={safePoints}
        stroke="transparent"
        strokeWidth={16}
        hitStrokeWidth={16}
        onClick={(e) => {
          if (tool === 'wire' && onWireSegmentClick && viewport) {
            const stage = e.target.getStage();
            if (stage) {
              const pos = stage.getPointerPosition();
              if (pos) {
                const circuitX = (pos.x - viewport.offsetX) / viewport.scale;
                const circuitY = (pos.y - viewport.offsetY) / viewport.scale;
                onWireSegmentClick(wire.id, circuitX, circuitY);
              }
            }
          } else {
            onSelect(wire.id, (e.evt as MouseEvent).shiftKey);
          }
        }}
        onMouseEnter={() => {
          // Add hover effect
          document.body.style.cursor = 'pointer';
        }}
        onMouseLeave={() => {
          document.body.style.cursor = 'default';
        }}
      />
      
      {/* Main wire line */}
      <Line
        ref={lineRef}
        points={safePoints}
        {...wireStyle}
        lineCap="round"
        lineJoin="round"
        perfectDrawEnabled={false}
        strokeScaleEnabled={false}
      />
      
      {/* Connection glow effect for valid connections (not for broken wires) */}
      {isActive && !isBroken && (
        <Line
          points={safePoints}
          stroke={wire.color}
          strokeWidth={1}
          strokeScaleEnabled={false}
          opacity={0.3}
          shadowColor={wire.color}
          shadowBlur={20}
          lineCap="round"
          lineJoin="round"
        />
      )}
      
      {/* Connection status indicator (invalid or midpoint) */}
      {!isActive && !isBroken && (
        <Circle
          x={midX}
          y={midY}
          radius={6}
          fill="#ef4444"
          stroke="#ffffff"
          strokeWidth={1}
          strokeScaleEnabled={false}
        />
      )}

      {/* Broken wire: red warning badge at unresolved endpoint(s) — only if coords valid */}
      {isBroken && fromPos && !fromResolved && (() => {
        const fp = safePoint(fromPos.x, fromPos.y);
        return fp ? <Circle x={fp.x} y={fp.y} radius={6} fill="#ef4444" stroke="#fca5a5" strokeWidth={2} strokeScaleEnabled={false} listening={false} /> : null;
      })()}
      {isBroken && toPos && !toResolved && (() => {
        const tp = safePoint(toPos.x, toPos.y);
        return tp ? (
          <Circle
            x={tp.x}
            y={tp.y}
            radius={6}
            fill="#ef4444"
            stroke="#fca5a5"
            strokeWidth={2}
            strokeScaleEnabled={false}
            listening={false}
          />
        ) : null;
      })()}

      {/* "+" add-bend nodes at segment midpoints when selected (click to insert midpoint) */}
      {isSelected && tool === 'select' && onWireInsertMidpoint && safePoints.length >= 4 && (() => {
        const numSegments = Math.floor(safePoints.length / 2) - 1;
        const nodes: React.ReactNode[] = [];
        for (let seg = 0; seg < numSegments; seg++) {
          const ax = safePoints[seg * 2]!;
          const ay = safePoints[seg * 2 + 1]!;
          const bx = safePoints[seg * 2 + 2]!;
          const by = safePoints[seg * 2 + 3]!;
          const midX = (ax + bx) / 2;
          const midY = (ay + by) / 2;
          nodes.push(
            <Group key={`add-${seg}`} x={midX} y={midY}>
              <Circle
                radius={8}
                fill="rgba(96,165,250,0.9)"
                stroke="#fff"
                strokeWidth={1.5}
                strokeScaleEnabled={false}
                listening={true}
                onClick={(e) => {
                  e.cancelBubble = true;
                  const snap = (v: number) => Math.round(v / 10) * 10;
                  onWireInsertMidpoint(wire.id, seg, snap(midX), snap(midY));
                }}
                onMouseEnter={() => { document.body.style.cursor = 'pointer'; }}
                onMouseLeave={() => { document.body.style.cursor = 'default'; }}
              />
              <Text text="+" fontSize={12} fill="#fff" fontStyle="bold" x={-5} y={-6} width={10} align="center" listening={false} strokeScaleEnabled={false} />
            </Group>
          );
        }
        return <>{nodes}</>;
      })()}

      {/* Draggable waypoint handles when wire is selected (edit path) — all bend points */}
      {isSelected && tool === 'select' && onWirePointsChange && safePoints.length >= 6 && (
        <>
          {(() => {
            const handles: React.ReactNode[] = [];
            for (let i = 2; i <= safePoints.length - 4; i += 2) {
              const px = safePoints[i]!;
              const py = safePoints[i + 1]!;
              const pointIndex = i;
              handles.push(
                <Circle
                  key={`wp-${i}`}
                  x={px}
                  y={py}
                  radius={8}
                  fill="#60a5fa"
                  stroke="#fff"
                  strokeWidth={2}
                  strokeScaleEnabled={false}
                  listening={true}
                  draggable
                  onDragEnd={(e) => {
                    const node = e.target;
                    const newPoints = safePoints.slice();
                    newPoints[pointIndex] = snapToWireGrid(node.x());
                    newPoints[pointIndex + 1] = snapToWireGrid(node.y());
                    onWirePointsChange(wire.id, newPoints);
                  }}
                  onMouseEnter={() => { document.body.style.cursor = 'move'; }}
                  onMouseLeave={() => { document.body.style.cursor = 'default'; }}
                  onClick={(e) => { e.cancelBubble = true; onSelect(wire.id, (e.evt as MouseEvent).shiftKey); }}
                />
              );
            }
            return handles;
          })()}
        </>
      )}
    </Group>
  );
};

export const EnhancedWireNode = React.memo(EnhancedWireNodeInner);
