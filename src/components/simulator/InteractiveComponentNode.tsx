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
  /** When provided, overrides comp.selected for stable props. */
  selected?: boolean;
  tool?: 'select' | 'wire' | 'pan';
  onPinClick?: (compId: string, pinId: string, shift?: boolean) => void;
  onPinPointerDown?: (compId: string, pinId: string) => void;
  onPinPointerUp?: (compId: string, pinId: string) => void;
  onSelect?: (compId: string, shift?: boolean) => void;
  onDelete?: (compId: string) => void;
  onDragEnd?: (compId: string, x: number, y: number) => void;
  onPressChange?: (compId: string, pressed: boolean) => void;
}

export const InteractiveComponentNode: React.FC<InteractiveComponentNodeProps> = ({
  comp,
  selected: selectedProp,
  tool,
  onPinClick,
  onPinPointerDown,
  onPinPointerUp,
  onSelect,
  onDelete,
  onDragEnd,
  onPressChange
}) => {
  const isSelected = selectedProp !== undefined ? selectedProp : comp.selected;
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
              stroke={isSelected ? '#3b82f6' : '#6b7280'}
              strokeWidth={isSelected ? 2 : 1}
              cornerRadius={8}
              shadowColor="black"
              shadowBlur={4}
              shadowOffset={{ x: 2, y: 2 }}
              shadowOpacity={0.3}
              strokeScaleEnabled={false}
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
                strokeScaleEnabled={false}
                onClick={(e) => onPinClick?.(comp.id, pin.id, e.evt.shiftKey)}
                onTap={(e) => onPinClick?.(comp.id, pin.id, e.evt.shiftKey)}
                onPointerDown={(e) => {
                  if (tool === 'wire' && onPinPointerDown) {
                    e.cancelBubble = true;
                    onPinPointerDown(comp.id, pin.id);
                  }
                }}
                onPointerUp={(e) => {
                  if (tool === 'wire' && onPinPointerUp) {
                    e.cancelBubble = true;
                    onPinPointerUp(comp.id, pin.id);
                  }
                }}
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
              stroke={isSelected ? '#3b82f6' : '#6b7280'}
              strokeWidth={isSelected ? 2 : 1}
              cornerRadius={4}
              strokeScaleEnabled={false}
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
      onClick={(e) => onSelect?.(comp.id, e.evt.shiftKey)}
      onTap={(e) => onSelect?.(comp.id, e.evt.shiftKey)}
      onDragEnd={(e) => {
        const alt = (e.evt as MouseEvent).altKey;
        const x = alt ? e.target.x() : Math.round(e.target.x() / 10) * 10;
        const y = alt ? e.target.y() : Math.round(e.target.y() / 10) * 10;
        if (!alt) {
          e.target.x(x);
          e.target.y(y);
        }
        onDragEnd?.(comp.id, x, y, e.evt as MouseEvent);
      }}
    >
      {renderInteractiveComponent()}
    </Group>
  );
};

export default InteractiveComponentNode;
