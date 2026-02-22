// src/components/simulator/parts/ESP32Node.tsx
import { Group, Rect, Circle, Text } from 'react-konva';
import { SimComponent, PinKind } from '../types';

export function ESP32Node({ comp }: { comp: SimComponent }) {
  const w = 180;
  const h = 240;

  return (
    <Group x={comp.x} y={comp.y}>
      {/* PCB Body */}
      <Rect 
        width={w} 
        height={h} 
        cornerRadius={8} 
        fill="#0f172a" 
        stroke="#1e293b" 
        strokeWidth={2}
        shadowColor="#000"
        shadowBlur={8}
        shadowOpacity={0.3}
        strokeScaleEnabled={false}
      />
      
      {/* Title */}
      <Text 
        text="ESP32 DevKit" 
        x={8} 
        y={8} 
        fill="#cbd5e1" 
        fontSize={12} 
        fontStyle="bold"
      />

      {/* Left Header */}
      <Group x={8} y={30}>
        {comp.pins.filter(p => p.x < 90).map((pin, i) => (
          <Group key={pin.id} x={0} y={i * 20}>
            <Circle 
              radius={4} 
              fill={pinFill(pin.kind)} 
              stroke="#64748b" 
              strokeWidth={1}
              strokeScaleEnabled={false}
            />
            <Text 
              text={pin.label} 
              x={8} 
              y={-4} 
              fill={pin.kind === 'power' ? '#f59e0b' : pin.kind === 'ground' ? '#6b7280' : '#94a3b8'} 
              fontSize={9}
              fontStyle={pin.kind === 'power' || pin.kind === 'ground' ? 'bold' : 'normal'}
            />
          </Group>
        ))}
      </Group>

      {/* Right Header */}
      <Group x={w - 16} y={30}>
        {comp.pins.filter(p => p.x >= 90).map((pin, i) => (
          <Group key={pin.id} x={0} y={i * 20}>
            <Circle 
              radius={4} 
              fill={pinFill(pin.kind)} 
              stroke="#64748b" 
              strokeWidth={1}
              strokeScaleEnabled={false}
            />
            <Text 
              text={pin.label} 
              x={-40} 
              y={-4} 
              fill={pin.kind === 'power' ? '#f59e0b' : pin.kind === 'ground' ? '#6b7280' : '#94a3b8'} 
              fontSize={9}
              fontStyle={pin.kind === 'power' || pin.kind === 'ground' ? 'bold' : 'normal'}
            />
          </Group>
        ))}
      </Group>

      {/* Power Rails Labels */}
      <Text 
        text="3V3" 
        x={12} 
        y={h - 20} 
        fill="#f59e0b" 
        fontSize={10} 
        fontStyle="bold"
      />
      <Text 
        text="GND" 
        x={w - 25} 
        y={h - 20} 
        fill="#6b7280" 
        fontSize={10} 
        fontStyle="bold"
      />
    </Group>
  );
}

function pinFill(kind: PinKind) {
  switch(kind) {
    case 'power':  return '#f59e0b'; // amber
    case 'ground': return '#6b7280'; // gray
    case 'analog': return '#10b981'; // teal
    case 'pwm':    return '#8b5cf6'; // violet
    default:       return '#334155'; // slate
  }
}
