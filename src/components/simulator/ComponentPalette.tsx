import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Cpu, 
  Lightbulb, 
  Volume2, 
  Thermometer, 
  Gauge,
  Circle,
  Square,
  RectangleHorizontal,
  MousePointer,
  Zap,
  Eye,
  Waves
} from 'lucide-react';
import { COMPONENT_DEFINITIONS } from './types';
import { 
  makeLED, 
  makeButton, 
  makeBuzzer, 
  makePotentiometer, 
  makePIRSensor, 
  makeUltrasonicSensor, 
  makeTemperatureSensor, 
  makeServoMotor, 
  makeResistor 
} from './library';

export interface Component {
  id: string;
  type: string;
  name: string;
  icon: React.ReactNode;
  width: number;
  height: number;
  category: string;
}

const components: Component[] = [
  { id: 'esp32', type: 'esp32', name: 'ESP32', icon: <Cpu className="w-4 h-4" />, width: 80, height: 60, category: 'microcontroller' },
  { id: 'led', type: 'led', name: 'LED', icon: <Lightbulb className="w-4 h-4" />, width: 20, height: 20, category: 'output' },
  { id: 'buzzer', type: 'buzzer', name: 'Buzzer', icon: <Volume2 className="w-4 h-4" />, width: 30, height: 30, category: 'output' },
  { id: 'button', type: 'button', name: 'Button', icon: <MousePointer className="w-4 h-4" />, width: 20, height: 20, category: 'input' },
  { id: 'pot', type: 'pot', name: 'Potentiometer', icon: <Gauge className="w-4 h-4" />, width: 30, height: 30, category: 'input' },
  { id: 'pir', type: 'pir', name: 'PIR Sensor', icon: <Eye className="w-4 h-4" />, width: 25, height: 25, category: 'sensor' },
  { id: 'ultrasonic', type: 'ultrasonic', name: 'Ultrasonic', icon: <Waves className="w-4 h-4" />, width: 30, height: 25, category: 'sensor' },
  { id: 'ds18b20', type: 'ds18b20', name: 'Temperature', icon: <Thermometer className="w-4 h-4" />, width: 25, height: 25, category: 'sensor' },
  { id: 'servo', type: 'servo', name: 'Servo Motor', icon: <Zap className="w-4 h-4" />, width: 30, height: 25, category: 'actuator' },
  { id: 'resistor', type: 'resistor', name: 'Resistor', icon: <RectangleHorizontal className="w-4 h-4" />, width: 40, height: 15, category: 'passive' },
];

interface ComponentPaletteProps {
  onComponentSelect?: (component: Component) => void;
}

export const ComponentPalette = ({ onComponentSelect }: ComponentPaletteProps) => {
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null);

  const handleComponentClick = (component: Component) => {
    setSelectedComponent(component);
    onComponentSelect?.(component);
  };

  return (
    <div className="w-64 border-r bg-gray-50 p-4 overflow-y-auto">
      <h3 className="font-semibold mb-4">Components</h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-2">Microcontrollers</h4>
          <div className="grid grid-cols-2 gap-2">
            {components.filter(c => c.category === 'microcontroller').map((component) => (
              <Button
                key={component.id}
                variant={selectedComponent?.id === component.id ? "default" : "outline"}
                size="sm"
                className="flex flex-col items-center gap-1 h-auto py-2"
                onClick={() => handleComponentClick(component)}
              >
                {component.icon}
                <span className="text-xs">{component.name}</span>
              </Button>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-2">Sensors</h4>
          <div className="grid grid-cols-2 gap-2">
            {components.filter(c => c.category === 'sensor').map((component) => (
              <Button
                key={component.id}
                variant={selectedComponent?.id === component.id ? "default" : "outline"}
                size="sm"
                className="flex flex-col items-center gap-1 h-auto py-2"
                onClick={() => handleComponentClick(component)}
              >
                {component.icon}
                <span className="text-xs">{component.name}</span>
              </Button>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-2">Inputs</h4>
          <div className="grid grid-cols-2 gap-2">
            {components.filter(c => c.category === 'input').map((component) => (
              <Button
                key={component.id}
                variant={selectedComponent?.id === component.id ? "default" : "outline"}
                size="sm"
                className="flex flex-col items-center gap-1 h-auto py-2"
                onClick={() => handleComponentClick(component)}
              >
                {component.icon}
                <span className="text-xs">{component.name}</span>
              </Button>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-2">Outputs</h4>
          <div className="grid grid-cols-2 gap-2">
            {components.filter(c => c.category === 'output').map((component) => (
              <Button
                key={component.id}
                variant={selectedComponent?.id === component.id ? "default" : "outline"}
                size="sm"
                className="flex flex-col items-center gap-1 h-auto py-2"
                onClick={() => handleComponentClick(component)}
              >
                {component.icon}
                <span className="text-xs">{component.name}</span>
              </Button>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-2">Actuators</h4>
          <div className="grid grid-cols-2 gap-2">
            {components.filter(c => c.category === 'actuator').map((component) => (
              <Button
                key={component.id}
                variant={selectedComponent?.id === component.id ? "default" : "outline"}
                size="sm"
                className="flex flex-col items-center gap-1 h-auto py-2"
                onClick={() => handleComponentClick(component)}
              >
                {component.icon}
                <span className="text-xs">{component.name}</span>
              </Button>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-2">Passive Components</h4>
          <div className="grid grid-cols-2 gap-2">
            {components.filter(c => c.category === 'passive').map((component) => (
              <Button
                key={component.id}
                variant={selectedComponent?.id === component.id ? "default" : "outline"}
                size="sm"
                className="flex flex-col items-center gap-1 h-auto py-2"
                onClick={() => handleComponentClick(component)}
              >
                {component.icon}
                <span className="text-xs">{component.name}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
