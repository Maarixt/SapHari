import { Group, Rect, Circle, Text } from 'react-konva';
import { SimComponent, PinKind } from './types';
import { LEDNode } from './LEDNode';
import { BuzzerNode } from './parts/BuzzerNode';
import { ButtonNode } from './parts/ButtonNode';
import { ESP32Node } from './parts/ESP32Node';

interface SimComponentNodeProps {
  comp: SimComponent;
  onPinClick: (compId: string, pinId: string) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDragEnd?: (compId: string, x: number, y: number) => void;
}

export const SimComponentNode = ({ comp, onPinClick, onSelect, onDelete, onDragEnd }: SimComponentNodeProps) => {
  const w = comp.type === 'esp32' ? 180 : 90;
  const h = comp.type === 'esp32' ? 240 : 50;

  // Get simulation state for visual feedback
  const isOn = comp.props?.on || false;
  const isActive = comp.props?.active || false;
  const isPressed = comp.props?.pressed || false;

  const handleDragEnd = (e: any) => {
    if (onDragEnd) {
      onDragEnd(comp.id, e.target.x(), e.target.y());
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
        onClick={() => onSelect(comp.id)}
      >
        {/* LED Node */}
        <LEDNode comp={comp} />
        
        {/* Delete icon (×) in the top-right */}
        <Group 
          x={w - 20} 
          y={6} 
          onClick={(e) => { 
            e.cancelBubble = true; 
            onDelete(comp.id); 
          }}
        >
          <Rect width={14} height={14} cornerRadius={3} fill="#b91c1c" />
          <Text text="×" x={3.5} y={-1} fontSize={14} fill="#fff" />
        </Group>

        {/* Pins */}
        {comp.pins.map((p) => (
          <Group 
            key={p.id} 
            x={p.x} 
            y={p.y} 
            onClick={(e) => { 
              e.cancelBubble = true; 
              onPinClick(comp.id, p.id); 
            }}
          >
            <Circle radius={6} fill={pinFill(p.kind)} stroke="#64748b" />
            <Text 
              text={p.label} 
              x={p.x < 70 ? 12 : -60} 
              y={-6} 
              fill="#94a3b8" 
              fontSize={10} 
            />
          </Group>
        ))}
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
        onClick={() => onSelect(comp.id)}
      >
        {/* Buzzer Node */}
        <BuzzerNode comp={comp} />
        
        {/* Delete icon (×) in the top-right */}
        <Group 
          x={w - 20} 
          y={6} 
          onClick={(e) => { 
            e.cancelBubble = true; 
            onDelete(comp.id); 
          }}
        >
          <Rect width={14} height={14} cornerRadius={3} fill="#b91c1c" />
          <Text text="×" x={3.5} y={-1} fontSize={14} fill="#fff" />
        </Group>

        {/* Pins */}
        {comp.pins.map((p) => (
          <Group 
            key={p.id} 
            x={p.x} 
            y={p.y} 
            onClick={(e) => { 
              e.cancelBubble = true; 
              onPinClick(comp.id, p.id); 
            }}
          >
            <Circle radius={6} fill={pinFill(p.kind)} stroke="#64748b" />
            <Text 
              text={p.label} 
              x={p.x < 70 ? 12 : -60} 
              y={-6} 
              fill="#94a3b8" 
              fontSize={10} 
            />
          </Group>
        ))}
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
        onClick={() => onSelect(comp.id)}
      >
        {/* Button Node */}
        <ButtonNode comp={comp} />
        
        {/* Delete icon (×) in the top-right */}
        <Group 
          x={w - 20} 
          y={6} 
          onClick={(e) => { 
            e.cancelBubble = true; 
            onDelete(comp.id); 
          }}
        >
          <Rect width={14} height={14} cornerRadius={3} fill="#b91c1c" />
          <Text text="×" x={3.5} y={-1} fontSize={14} fill="#fff" />
        </Group>

        {/* Pins */}
        {comp.pins.map((p) => (
          <Group 
            key={p.id} 
            x={p.x} 
            y={p.y} 
            onClick={(e) => { 
              e.cancelBubble = true; 
              onPinClick(comp.id, p.id); 
            }}
          >
            <Circle radius={6} fill={pinFill(p.kind)} stroke="#64748b" />
            <Text 
              text={p.label} 
              x={p.x < 70 ? 12 : -60} 
              y={-6} 
              fill="#94a3b8" 
              fontSize={10} 
            />
          </Group>
        ))}
      </Group>
    );
  }

  if (comp.type === 'esp32') {
    return (
      <Group 
        x={comp.x} 
        y={comp.y} 
        draggable
        onDragEnd={handleDragEnd}
        onClick={() => onSelect(comp.id)}
      >
        {/* ESP32 Node */}
        <ESP32Node comp={comp} />
        
        {/* Delete icon (×) in the top-right */}
        <Group 
          x={w - 20} 
          y={6} 
          onClick={(e) => { 
            e.cancelBubble = true; 
            onDelete(comp.id); 
          }}
        >
          <Rect width={14} height={14} cornerRadius={3} fill="#b91c1c" />
          <Text text="×" x={3.5} y={-1} fontSize={14} fill="#fff" />
        </Group>
      </Group>
    );
  }

  return (
    <Group 
      x={comp.x} 
      y={comp.y} 
      draggable
      onDragEnd={handleDragEnd}
      onClick={() => onSelect(comp.id)}
    >
      <Rect 
        width={w} 
        height={h} 
        cornerRadius={10} 
        fill={comp.type === 'esp32' ? '#111827' : '#1f2937'} 
        stroke={comp.selected ? '#60a5fa' : '#374151'} 
        strokeWidth={comp.selected ? 3 : 1.5} 
        shadowBlur={comp.selected ? 16 : 4}
        shadowColor="#000"
      />
      
      {/* Title */}
      <Text 
        text={comp.props?.name || comp.type.toUpperCase()} 
        x={8} 
        y={8} 
        fill="#cbd5e1" 
        fontSize={12} 
      />

      {/* Delete icon (×) in the top-right */}
      <Group 
        x={w - 20} 
        y={6} 
        onClick={(e) => { 
          e.cancelBubble = true; 
          onDelete(comp.id); 
        }}
      >
        <Rect width={14} height={14} cornerRadius={3} fill="#b91c1c" />
        <Text text="×" x={3.5} y={-1} fontSize={14} fill="#fff" />
      </Group>

      {/* Visual simulation feedback */}
      {comp.type === 'buzzer' && isActive && (
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

      {comp.type === 'button' && isPressed && (
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
      {comp.pins.map((p) => (
        <Group 
          key={p.id} 
          x={p.x} 
          y={p.y} 
          onClick={(e) => { 
            e.cancelBubble = true; 
            onPinClick(comp.id, p.id); 
          }}
        >
          <Circle radius={6} fill={pinFill(p.kind)} stroke="#64748b" />
          <Text 
            text={p.label} 
            x={p.x < 70 ? 12 : -60} 
            y={-6} 
            fill="#94a3b8" 
            fontSize={10} 
          />
        </Group>
      ))}
    </Group>
  );
};

function pinFill(kind: PinKind) {
  switch(kind) {
    case 'power':  return '#f59e0b'; // amber
    case 'ground': return '#6b7280'; // gray
    case 'analog': return '#10b981'; // teal
    case 'pwm':    return '#8b5cf6'; // violet
    default:       return '#334155'; // slate
  }
}
