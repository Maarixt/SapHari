// src/components/simulator/GridBackground.tsx
import { Group, Line } from 'react-konva';

interface GridBackgroundProps {
  width: number;
  height: number;
  gridSize?: number;
  color?: string;
  /** Optional: draw grid in circuit space over a range (for zoom/pan). Defaults to 0..width, 0..height. */
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
}

export const GridBackground = ({
  width,
  height,
  gridSize = 20,
  color = '#374151',
  minX,
  maxX,
  minY,
  maxY,
}: GridBackgroundProps) => {
  const xMin = minX ?? 0;
  const xMax = maxX ?? width;
  const yMin = minY ?? 0;
  const yMax = maxY ?? height;
  const lines = [];

  for (let i = xMin; i <= xMax; i += gridSize) {
    lines.push(
      <Line
        key={`v-${i}`}
        points={[i, yMin, i, yMax]}
        stroke={color}
        strokeWidth={0.5}
        opacity={0.3}
      />
    );
  }
  for (let i = yMin; i <= yMax; i += gridSize) {
    lines.push(
      <Line
        key={`h-${i}`}
        points={[xMin, i, xMax, i]}
        stroke={color}
        strokeWidth={0.5}
        opacity={0.3}
      />
    );
  }

  return <Group>{lines}</Group>;
};
