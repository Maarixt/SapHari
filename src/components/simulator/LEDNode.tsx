// src/components/simulator/LEDNode.tsx
import { Group, Circle } from 'react-konva';
import { SimComponent } from './types';

export function LEDNode({ comp }: { comp: SimComponent }) {
  const on = !!comp.props?.on;           // set during sim loop
  const color = comp.props?.color || 'red';

  return (
    <Group x={comp.x} y={comp.y}>
      <Circle
        radius={10}
        fill={color}
        opacity={0.9}
        shadowColor={color}
        shadowBlur={on ? 16 : 2}
        shadowOpacity={on ? 0.9 : 0.2}
        stroke="#111827"
        strokeWidth={1}
      />
    </Group>
  );
}
