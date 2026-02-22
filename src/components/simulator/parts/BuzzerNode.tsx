// src/components/simulator/parts/BuzzerNode.tsx
import { Group, Circle } from 'react-konva';
import { SimComponent } from '../types';

export function BuzzerNode({ comp }: { comp: SimComponent }) {
  const active = !!comp.props?.active;
  return (
    <Group x={comp.x} y={comp.y}>
      <Circle radius={18} fill="#111827" stroke="#374151" strokeWidth={1} strokeScaleEnabled={false} />
      <Circle radius={3} fill="#0f172a" />
      {/* glow when active */}
      <Circle radius={18} stroke={active ? '#22c55e' : 'transparent'} strokeWidth={active ? 3 : 0} strokeScaleEnabled={false} />
    </Group>
  );
}
