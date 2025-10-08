import { Group, Line, Circle } from 'react-konva';
import { Wire, SimState } from './types';

interface WireNodeProps {
  wire: Wire;
  state: SimState;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export const WireNode = ({ wire, state, onSelect, onDelete }: WireNodeProps) => {
  const from = findPin(state, wire.from.componentId, wire.from.pinId);
  const to = findPin(state, wire.to.componentId, wire.to.pinId);
  
  if (!from || !to) return null;
  
  const points = wire.points && wire.points.length >= 4
    ? wire.points
    : [from.x, from.y, to.x, to.y];

  // Midpoint handle for delete
  const mid = {
    x: (points[0] + points[points.length - 2]) / 2,
    y: (points[1] + points[points.length - 1]) / 2,
  };

  return (
    <Group>
      {/* Fat invisible hit-line for easy clicking */}
      <Line
        points={points}
        stroke="transparent"
        strokeWidth={12}
        hitStrokeWidth={12}
        onClick={() => onSelect(wire.id)}
      />
      <Line
        points={points}
        stroke={wire.selected ? '#fff' : wire.color}
        strokeWidth={wire.selected ? 4 : 3}
        lineCap="round"
        lineJoin="round"
        shadowColor={wire.color}
        shadowBlur={wire.selected ? 12 : 0}
      />
      {/* Delete handle appears when selected */}
      {wire.selected && (
        <Circle
          x={mid.x}
          y={mid.y}
          radius={8}
          fill="#ef4444"
          stroke="#fee2e2"
          strokeWidth={2}
          onClick={() => onDelete(wire.id)}
        />
      )}
    </Group>
  );
};

function findPin(state: SimState, compId: string, pinId: string) {
  const c = state.components.find(c => c.id === compId);
  if (!c) return null;
  const p = c.pins.find(p => p.id === pinId);
  if (!p) return null;
  return { x: (c.x + p.x), y: (c.y + p.y) };
}
