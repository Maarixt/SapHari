// src/components/simulator/GridBackground.tsx
import { Group, Line } from 'react-konva';

interface GridBackgroundProps {
  width: number;
  height: number;
  gridSize?: number;
  color?: string;
}

export const GridBackground = ({ 
  width, 
  height, 
  gridSize = 20, 
  color = '#374151' 
}: GridBackgroundProps) => {
  const lines = [];
  
  // Vertical lines
  for (let i = 0; i <= width; i += gridSize) {
    lines.push(
      <Line
        key={`v-${i}`}
        points={[i, 0, i, height]}
        stroke={color}
        strokeWidth={0.5}
        opacity={0.3}
      />
    );
  }
  
  // Horizontal lines
  for (let i = 0; i <= height; i += gridSize) {
    lines.push(
      <Line
        key={`h-${i}`}
        points={[0, i, width, i]}
        stroke={color}
        strokeWidth={0.5}
        opacity={0.3}
      />
    );
  }
  
  return <Group>{lines}</Group>;
};
