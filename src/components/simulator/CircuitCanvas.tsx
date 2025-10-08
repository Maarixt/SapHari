import { useState, useRef, useCallback, useEffect } from 'react';
import { Stage, Layer, Rect, Circle, Line, Text } from 'react-konva';
import { Component } from './ComponentPalette';
import { SimComponent, SimState, createComponent, Wire, createWire } from './types';
import { 
  makeESP32, 
  makeLED, 
  makeResistor, 
  makeButton, 
  makeBuzzer, 
  makePotentiometer,
  makePIRSensor,
  makeUltrasonicSensor,
  makeTemperatureSensor,
  makeServoMotor,
  makePowerRail,
  makeGroundRail
} from './library';

interface CircuitCanvasProps {
  onComponentAdd?: (component: SimComponent) => void;
}

// Helper function to get pin colors based on pin kind
const getPinColor = (kind: string): string => {
  switch (kind) {
    case 'power': return '#ff6b6b';      // Red for power
    case 'ground': return '#4a5568';      // Dark gray for ground
    case 'digital': return '#48bb78';     // Green for digital
    case 'analog': return '#ed8936';     // Orange for analog
    case 'pwm': return '#9f7aea';        // Purple for PWM
    case 'onewire': return '#38b2ac';    // Teal for OneWire
    case 'serial': return '#e53e3e';      // Red for serial
    default: return '#a0aec0';           // Gray for unknown
  }
};

export const CircuitCanvas = ({ onComponentAdd }: CircuitCanvasProps) => {
  const [simState, setSimState] = useState<SimState>({
    components: [],
    wires: [],
    running: false,
    selectedId: undefined
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedPaletteComponent, setSelectedPaletteComponent] = useState<Component | null>(null);
  const stageRef = useRef<any>(null);

  const handleStageClick = useCallback((e: any) => {
    // Deselect component if clicking on empty space
    if (e.target === e.target.getStage()) {
      setSimState(prev => ({ ...prev, selectedId: undefined }));
    }
  }, []);

  const handleComponentClick = useCallback((component: SimComponent) => {
    setSimState(prev => ({ ...prev, selectedId: component.id }));
  }, []);

  const handleComponentDragStart = useCallback((component: SimComponent) => {
    setIsDragging(true);
    setSimState(prev => ({ ...prev, selectedId: component.id }));
  }, []);

  const handleComponentDragEnd = useCallback((component: SimComponent, e: any) => {
    setIsDragging(false);
    const newX = e.target.x();
    const newY = e.target.y();
    
    setSimState(prev => ({
      ...prev,
      components: prev.components.map(comp => 
        comp.id === component.id 
          ? { ...comp, x: newX, y: newY }
          : comp
      )
    }));
  }, []);

  const addComponent = useCallback((component: Component, x: number, y: number) => {
    let newSimComponent: SimComponent;
    
    // Use the streamlined parts library for common components
    switch (component.type) {
      case 'esp32':
        newSimComponent = makeESP32(x, y);
        break;
      case 'led':
        newSimComponent = makeLED('red', x, y);
        break;
      case 'resistor':
        newSimComponent = makeResistor(220, x, y);
        break;
      case 'button':
        newSimComponent = makeButton(x, y);
        break;
      case 'buzzer':
        newSimComponent = makeBuzzer(x, y);
        break;
      case 'pot':
        newSimComponent = makePotentiometer(x, y);
        break;
      case 'pir':
        newSimComponent = makePIRSensor(x, y);
        break;
      case 'ultrasonic':
        newSimComponent = makeUltrasonicSensor(x, y);
        break;
      case 'ds18b20':
        newSimComponent = makeTemperatureSensor(x, y);
        break;
      case 'servo':
        newSimComponent = makeServoMotor(x, y);
        break;
      default:
        newSimComponent = createComponent(component.type, x, y);
    }
    
    setSimState(prev => ({
      ...prev,
      components: [...prev.components, newSimComponent]
    }));
    onComponentAdd?.(newSimComponent);
  }, [onComponentAdd]);

  const handleStageMouseUp = useCallback((e: any) => {
    if (selectedPaletteComponent && !isDragging) {
      const pos = e.target.getStage().getPointerPosition();
      addComponent(selectedPaletteComponent, pos.x, pos.y);
    }
  }, [selectedPaletteComponent, isDragging, addComponent]);

  // Listen for component selection from palette
  useEffect(() => {
    const handleComponentSelect = (component: Component) => {
      setSelectedPaletteComponent(component);
    };

    // This would be connected to the ComponentPalette
    window.addEventListener('componentSelect', handleComponentSelect as any);
    return () => window.removeEventListener('componentSelect', handleComponentSelect as any);
  }, []);

  const renderComponent = (component: SimComponent) => {
    const isSelected = simState.selectedId === component.id;
    
    switch (component.type) {
      case 'esp32':
        return (
          <group key={component.id}>
            {/* ESP32 Body */}
            <Rect
              x={component.x + 20}
              y={component.y + 10}
              width={100}
              height={200}
              fill={isSelected ? '#3b82f6' : '#1f2937'}
              stroke={isSelected ? '#1d4ed8' : '#374151'}
              strokeWidth={isSelected ? 3 : 1}
              cornerRadius={8}
              draggable
              onDragStart={() => handleComponentDragStart(component)}
              onDragEnd={(e) => handleComponentDragEnd(component, e)}
              onClick={() => handleComponentClick(component)}
            />
            
            {/* ESP32 Label */}
            <Text
              x={component.x + 30}
              y={component.y + 220}
              text="ESP32"
              fontSize={14}
              fill="#ffffff"
              fontStyle="bold"
            />
            
            {/* Render Pins */}
            {component.pins.map((pin, index) => {
              const pinX = component.x + pin.x;
              const pinY = component.y + pin.y;
              const isLeftSide = pin.x === 0;
              
              return (
                <group key={`pin-${pin.id}`}>
                  {/* Pin Circle */}
                  <Circle
                    x={pinX}
                    y={pinY}
                    radius={3}
                    fill={getPinColor(pin.kind)}
                    stroke="#ffffff"
                    strokeWidth={1}
                  />
                  
                  {/* Pin Label */}
                  <Text
                    x={isLeftSide ? pinX - 25 : pinX + 8}
                    y={pinY - 6}
                    text={pin.label}
                    fontSize={10}
                    fill="#ffffff"
                    align={isLeftSide ? 'right' : 'left'}
                  />
                </group>
              );
            })}
          </group>
        );
      
      case 'led':
        const ledColor = component.props?.color || 'red';
        const ledColorMap: Record<string, string> = {
          red: '#ef4444',
          green: '#22c55e',
          blue: '#3b82f6',
          yellow: '#eab308',
          orange: '#f97316',
          purple: '#a855f7',
          black: '#374151',
          white: '#f3f4f6'
        };
        return (
          <group key={component.id}>
            <Circle
              x={component.x}
              y={component.y}
              radius={15}
              fill={isSelected ? ledColorMap[ledColor] : ledColorMap[ledColor] + '80'}
              stroke={isSelected ? '#1d4ed8' : '#374151'}
              strokeWidth={isSelected ? 3 : 1}
              draggable
              onDragStart={() => handleComponentDragStart(component)}
              onDragEnd={(e) => handleComponentDragEnd(component, e)}
              onClick={() => handleComponentClick(component)}
            />
            {/* LED Pins */}
            {component.pins.map((pin) => (
              <Circle
                key={`pin-${pin.id}`}
                x={component.x + pin.x}
                y={component.y + pin.y}
                radius={2}
                fill={getPinColor(pin.kind)}
                stroke="#ffffff"
                strokeWidth={1}
              />
            ))}
          </group>
        );
      
      case 'buzzer':
        const isActive = component.props?.active || false;
        return (
          <group key={component.id}>
            <Circle
              x={component.x}
              y={component.y}
              radius={15}
              fill={isActive ? '#f59e0b' : '#6b7280'}
              stroke={isSelected ? '#1d4ed8' : '#374151'}
              strokeWidth={isSelected ? 3 : 1}
              draggable
              onDragStart={() => handleComponentDragStart(component)}
              onDragEnd={(e) => handleComponentDragEnd(component, e)}
              onClick={() => handleComponentClick(component)}
            />
            {/* Buzzer Pins */}
            {component.pins.map((pin) => (
              <Circle
                key={`pin-${pin.id}`}
                x={component.x + pin.x}
                y={component.y + pin.y}
                radius={2}
                fill={getPinColor(pin.kind)}
                stroke="#ffffff"
                strokeWidth={1}
              />
            ))}
          </group>
        );
      
      case 'button':
        const isPressed = component.props?.pressed || false;
        return (
          <group key={component.id}>
            <Rect
              x={component.x - 10}
              y={component.y - 10}
              width={20}
              height={20}
              fill={isPressed ? '#22c55e' : '#6b7280'}
              stroke={isSelected ? '#1d4ed8' : '#374151'}
              strokeWidth={isSelected ? 3 : 1}
              cornerRadius={4}
              draggable
              onDragStart={() => handleComponentDragStart(component)}
              onDragEnd={(e) => handleComponentDragEnd(component, e)}
              onClick={() => handleComponentClick(component)}
            />
            {/* Button Pins */}
            {component.pins.map((pin) => (
              <Circle
                key={`pin-${pin.id}`}
                x={component.x + pin.x}
                y={component.y + pin.y}
                radius={2}
                fill={getPinColor(pin.kind)}
                stroke="#ffffff"
                strokeWidth={1}
              />
            ))}
          </group>
        );
      
      case 'resistor':
        return (
          <group key={component.id}>
            <Rect
              x={component.x - 20}
              y={component.y - 5}
              width={40}
              height={10}
              fill={isSelected ? '#f59e0b' : '#d97706'}
              stroke={isSelected ? '#1d4ed8' : '#374151'}
              strokeWidth={isSelected ? 3 : 1}
              cornerRadius={2}
              draggable
              onDragStart={() => handleComponentDragStart(component)}
              onDragEnd={(e) => handleComponentDragEnd(component, e)}
              onClick={() => handleComponentClick(component)}
            />
            {/* Resistor Pins */}
            {component.pins.map((pin) => (
              <Circle
                key={`pin-${pin.id}`}
                x={component.x + pin.x}
                y={component.y + pin.y}
                radius={2}
                fill={getPinColor(pin.kind)}
                stroke="#ffffff"
                strokeWidth={1}
              />
            ))}
            {/* Resistor Value */}
            <Text
              x={component.x}
              y={component.y - 15}
              text={`${component.props?.ohms || 220}Ω`}
              fontSize={10}
              fill="#374151"
              align="center"
            />
          </group>
        );
      
      default:
        return (
          <Rect
            key={component.id}
            x={component.x - 15}
            y={component.y - 10}
            width={30}
            height={20}
            fill={isSelected ? '#6b7280' : '#4b5563'}
            stroke={isSelected ? '#374151' : '#1f2937'}
            strokeWidth={isSelected ? 3 : 1}
            cornerRadius={2}
            draggable
            onDragStart={() => handleComponentDragStart(component)}
            onDragEnd={(e) => handleComponentDragEnd(component, e)}
            onClick={() => handleComponentClick(component)}
          />
        );
    }
  };

  return (
    <div className="flex-1 bg-gray-100 relative">
      <Stage
        ref={stageRef}
        width={window.innerWidth - 256} // Account for palette width
        height={window.innerHeight - 200} // Account for header and toolbar
        onClick={handleStageClick}
        onMouseUp={handleStageMouseUp}
        onMouseDown={(e) => {
          const pos = e.target.getStage().getPointerPosition();
          setDragStart({ x: pos.x, y: pos.y });
        }}
      >
        <Layer>
          {/* Grid background */}
          {Array.from({ length: Math.ceil((window.innerWidth - 256) / 20) }).map((_, i) => (
            <Line
              key={`v-${i}`}
              points={[i * 20, 0, i * 20, window.innerHeight - 200]}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
          ))}
          {Array.from({ length: Math.ceil((window.innerHeight - 200) / 20) }).map((_, i) => (
            <Line
              key={`h-${i}`}
              points={[0, i * 20, window.innerWidth - 256, i * 20]}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
          ))}
          
          {/* Render components */}
          {simState.components.map(renderComponent)}
          
          {/* Component labels */}
          {simState.components.map(component => (
            <Text
              key={`label-${component.id}`}
              x={component.x}
              y={component.y - 20}
              text={component.type}
              fontSize={12}
              fill="#374151"
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
};
