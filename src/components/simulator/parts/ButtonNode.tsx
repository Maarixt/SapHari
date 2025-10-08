// src/components/simulator/parts/ButtonNode.tsx
import { Group, Rect } from 'react-konva';
import { SimComponent } from '../types';

export function ButtonNode({ comp }: { comp: SimComponent }) {
  const pressed = !!comp.props?.pressed;
  return (
    <Group x={comp.x} y={comp.y}>
      {/* Button base */}
      <Rect 
        width={24} 
        height={16} 
        cornerRadius={4} 
        fill="#374151" 
        stroke="#6b7280" 
        strokeWidth={1} 
      />
      {/* Button top */}
      <Rect 
        x={2} 
        y={pressed ? 8 : 2} 
        width={20} 
        height={8} 
        cornerRadius={3} 
        fill={pressed ? "#1f2937" : "#4b5563"} 
        stroke="#9ca3af" 
        strokeWidth={0.5} 
      />
    </Group>
  );
}
