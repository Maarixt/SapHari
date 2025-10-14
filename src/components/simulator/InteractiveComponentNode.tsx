/**
 * Interactive Component Node
 * Renders components with interactive capabilities
 */

import React, { useState, useCallback } from 'react';
import { Group, Rect, Text, Circle } from 'react-konva';
import { SimComponent } from './types';
import PushButtonView from '../../sim/ui/parts/PushButtonView';
import TactSwitch4View from '../../sim/ui/parts/TactSwitch4View';

interface InteractiveComponentNodeProps {
  comp: SimComponent;
  onPinClick?: (compId: string, pinId: string) => void;
  onSelect?: (compId: string) => void;
  onDelete?: (compId: string) => void;
  onDragEnd?: (compId: string, x: number, y: number) => void;
  onPressChange?: (compId: string, pressed: boolean) => void;
}

export const InteractiveComponentNode: React.FC<InteractiveComponentNodeProps> = ({
  comp,
  onPinClick,
  onSelect,
  onDelete,
  onDragEnd,
  onPressChange
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);

  const handlePressChange = useCallback((pressed: boolean) => {
    setIsPressed(pressed);
    onPressChange?.(comp.id, pressed);
  }, [comp.id, onPressChange]);

  const renderInteractiveComponent = () => {
    switch (comp.type) {
      case 'button':
        return (
          <Group>
            {/* Component background - 4-leg tactile switch */}
            <Rect
              x={0}
              y={0}
              width={80}
              height={40}
              fill={isPressed ? '#10b981' : '#374151'}
              stroke={comp.selected ? '#3b82f6' : '#6b7280'}
              strokeWidth={comp.selected ? 2 : 1}
              cornerRadius={8}
              shadowColor="black"
              shadowBlur={4}
              shadowOffset={{ x: 2, y: 2 }}
              shadowOpacity={0.3}
            />
            
            {/* Button text */}
            <Text
              x={10}
              y={12}
              text="PUSH-BTN"
              fontSize={10}
              fill="white"
              fontFamily="monospace"
              fontStyle="bold"
            />
            
            {/* Bounce indicator */}
            {isBouncing && (
              <Text
                x={10}
                y={26}
                text="BOUNCING"
                fontSize={8}
                fill="#fbbf24"
                fontFamily="monospace"
              />
            )}
            
            {/* 4-leg tactile switch pins */}
            {comp.pins.map((pin, index) => (
              <Circle
                key={pin.id}
                x={pin.x}
                y={pin.y}
                radius={4}
                fill={getPinColor(pin.kind)}
                stroke="white"
                strokeWidth={1}
                onClick={() => onPinClick?.(comp.id, pin.id)}
                onTap={() => onPinClick?.(comp.id, pin.id)}
              />
            ))}
            
            {/* Pin labels for 4-leg switch */}
            {comp.pins.map((pin) => (
              <Text
                key={`label-${pin.id}`}
                x={pin.x - 8}
                y={pin.y - 12}
                text={pin.label}
                fontSize={8}
                fill="white"
                fontFamily="monospace"
              />
            ))}
            
            {/* Visual indication of internal shorts */}
            <Text
              x={5}
              y={35}
              text="A1↔A2  B1↔B2"
              fontSize={6}
              fill="#9ca3af"
              fontFamily="monospace"
            />
          </Group>
        );
      
      default:
        // Fallback to basic rendering
        return (
          <Group>
            <Rect
              x={0}
              y={0}
              width={60}
              height={30}
              fill="#374151"
              stroke={comp.selected ? '#3b82f6' : '#6b7280'}
              strokeWidth={comp.selected ? 2 : 1}
              cornerRadius={4}
            />
            <Text
              x={5}
              y={10}
              text={comp.type.toUpperCase()}
              fontSize={8}
              fill="white"
              fontFamily="monospace"
            />
          </Group>
        );
    }
  };

  const getPinColor = (kind: string): string => {
    switch (kind) {
      case 'power': return '#ef4444';
      case 'ground': return '#6b7280';
      case 'digital': return '#3b82f6';
      case 'analog': return '#8b5cf6';
      case 'pwm': return '#f59e0b';
      case 'i2c': return '#10b981';
      case 'spi': return '#f97316';
      default: return '#6b7280';
    }
  };

  return (
    <Group
      x={comp.x}
      y={comp.y}
      draggable
      onClick={() => onSelect?.(comp.id)}
      onTap={() => onSelect?.(comp.id)}
      onDragEnd={(e) => {
        const newX = Math.round(e.target.x() / 10) * 10;
        const newY = Math.round(e.target.y() / 10) * 10;
        e.target.x(newX);
        e.target.y(newY);
        onDragEnd?.(comp.id, newX, newY);
      }}
    >
      {renderInteractiveComponent()}
    </Group>
  );
};

export default InteractiveComponentNode;
