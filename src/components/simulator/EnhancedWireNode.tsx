// src/components/simulator/EnhancedWireNode.tsx
import { Group, Line, Circle } from 'react-konva';
import { SimState, Wire } from './types';
import { findPin } from './helpers';

interface EnhancedWireNodeProps {
  wire: Wire;
  state: SimState;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  isHovered?: boolean;
  isValidConnection?: boolean;
}

export const EnhancedWireNode = ({
  wire,
  state,
  onSelect,
  onDelete,
  isHovered = false,
  isValidConnection = true
}: EnhancedWireNodeProps) => {
  const from = findPin(state, wire.from.componentId, wire.from.pinId);
  const to = findPin(state, wire.to.componentId, wire.to.pinId);
  
  if (!from || !to) return null;

  const points = wire.points && wire.points.length >= 4
    ? wire.points
    : [from.x, from.y, to.x, to.y];

  // Calculate midpoint for delete handle
  const midX = (points[0] + points[points.length - 2]) / 2;
  const midY = (points[1] + points[points.length - 1]) / 2;

  // Determine wire appearance based on state
  const isSelected = wire.selected;
  const isActive = isValidConnection;
  
  // Wire styling based on state
  const getWireStyle = () => {
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
    
    if (isHovered) {
      return {
        stroke: wire.color,
        strokeWidth: 4,
        shadowColor: wire.color,
        shadowBlur: 12,
        shadowOpacity: 0.6
      };
    }
    
    // Default state
    return {
      stroke: wire.color,
      strokeWidth: 3,
      shadowColor: wire.color,
      shadowBlur: isActive ? 6 : 0,
      shadowOpacity: 0.4
    };
  };

  const wireStyle = getWireStyle();

  return (
    <Group>
      {/* Fat invisible hit-line for easy clicking */}
      <Line
        points={points}
        stroke="transparent"
        strokeWidth={16}
        hitStrokeWidth={16}
        onClick={() => onSelect(wire.id)}
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
        points={points}
        {...wireStyle}
        lineCap="round"
        lineJoin="round"
        perfectDrawEnabled={false}
      />
      
      {/* Connection glow effect for valid connections */}
      {isActive && (
        <Line
          points={points}
          stroke={wire.color}
          strokeWidth={1}
          opacity={0.3}
          shadowColor={wire.color}
          shadowBlur={20}
          lineCap="round"
          lineJoin="round"
        />
      )}
      
      {/* Delete handle appears when selected */}
      {isSelected && (
        <Circle
          x={midX}
          y={midY}
          radius={10}
          fill="#ef4444"
          stroke="#ffffff"
          strokeWidth={2}
          shadowColor="#ef4444"
          shadowBlur={8}
          onClick={(e) => {
            e.cancelBubble = true;
            onDelete(wire.id);
          }}
          onMouseEnter={() => {
            document.body.style.cursor = 'pointer';
          }}
          onMouseLeave={() => {
            document.body.style.cursor = 'default';
          }}
        />
      )}
      
      {/* Connection status indicator */}
      {!isActive && (
        <Circle
          x={midX}
          y={midY}
          radius={6}
          fill="#ef4444"
          stroke="#ffffff"
          strokeWidth={1}
        />
      )}
    </Group>
  );
};
