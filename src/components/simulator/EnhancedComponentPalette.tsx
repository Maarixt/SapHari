// src/components/simulator/EnhancedComponentPalette.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { COMPONENT_CATEGORIES, ComponentDefinition } from './library/categories';
import { SimComponent } from './types';
import { nanoid } from 'nanoid';

interface EnhancedComponentPaletteProps {
  onAddComponent: (component: SimComponent) => void;
  wireColor: string;
  onWireColorChange: (color: string) => void;
  onRunToggle: () => void;
  running: boolean;
  selectedComponent?: SimComponent;
  onUpdateComponent: (updates: Partial<SimComponent>) => void;
}

export const EnhancedComponentPalette = ({
  onAddComponent,
  wireColor,
  onWireColorChange,
  onRunToggle,
  running,
  selectedComponent,
  onUpdateComponent
}: EnhancedComponentPaletteProps) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['input', 'output', 'power']) // Start with key categories expanded
  );
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null);

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const createComponent = (def: ComponentDefinition, x: number, y: number): SimComponent => {
    return {
      id: nanoid(8),
      type: def.id as 'esp32' | 'led' | 'resistor' | 'button' | 'buzzer' | 'pot' | 'pir' | 'ultrasonic' | 'ds18b20' | 'servo' | 'power' | 'ground' | 'wire' | 'potentiometer',
      name: def.name,
      x,
      y,
      pins: def.pins.map(pin => ({
        id: pin.id,
        label: pin.label,
        kind: pin.kind,
        x: pin.x,
        y: pin.y
      })),
      props: {
        ...def.props,
        color: def.id === 'led' || def.id === 'rgb-led' ? 'red' : undefined,
        value: def.behavior === 'analog' ? 0 : undefined,
        on: false,
        active: false
      }
    };
  };

  const handleAddComponent = (def: ComponentDefinition) => {
    // Place components in a grid pattern
    const gridX = 100 + (Math.random() * 200);
    const gridY = 100 + (Math.random() * 200);
    const component = createComponent(def, gridX, gridY);
    onAddComponent(component);
  };

  const getBehaviorColor = (behavior: string) => {
    switch (behavior) {
      case 'input': return 'bg-blue-500/20 border-blue-500/50';
      case 'output': return 'bg-green-500/20 border-green-500/50';
      case 'analog': return 'bg-purple-500/20 border-purple-500/50';
      case 'digital': return 'bg-yellow-500/20 border-yellow-500/50';
      case 'comms': return 'bg-cyan-500/20 border-cyan-500/50';
      case 'power': return 'bg-orange-500/20 border-orange-500/50';
      case 'sensor': return 'bg-pink-500/20 border-pink-500/50';
      default: return 'bg-gray-500/20 border-gray-500/50';
    }
  };

  const wireColors = [
    'red', 'blue', 'green', 'yellow', 'purple', 'orange', 'cyan', 'pink',
    'lime', 'indigo', 'teal', 'amber', 'emerald', 'violet', 'rose', 'sky'
  ];

  return (
    <div className="w-64 border-r bg-muted/20 flex flex-col h-full">
      {/* Fixed Header Section */}
      <div className="p-3 space-y-3 border-b bg-muted/30">
        {/* Wire Color Picker */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Wire Colors</div>
          <div className="grid grid-cols-4 gap-1">
            {wireColors.map(color => (
              <button
                key={color}
                onClick={() => onWireColorChange(color)}
                className={`h-6 rounded border-2 transition-all ${
                  wireColor === color 
                    ? 'border-white shadow-lg scale-110' 
                    : 'border-gray-400 hover:border-gray-300'
                }`}
                style={{ backgroundColor: color }}
                title={`Select ${color} wire color`}
              />
            ))}
          </div>
        </div>

        {/* Run/Stop Button */}
        <div className="pt-2 border-t">
          <Button 
            size="sm" 
            onClick={onRunToggle}
            className={`w-full ${
              running 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {running ? '⏹️ Stop Simulation' : '▶️ Run Simulation'}
          </Button>
        </div>
      </div>

      {/* Scrollable Component Categories */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 hover:scrollbar-thumb-gray-500">
        <div className="p-3 space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Component Library</div>
        {COMPONENT_CATEGORIES.map(category => (
          <div key={category.id} className="space-y-1">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full flex items-center justify-between p-2 text-sm font-medium bg-muted/30 rounded hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{category.icon}</span>
                <span>{category.name}</span>
              </div>
              {expandedCategories.has(category.id) ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>

            {/* Category Description */}
            {expandedCategories.has(category.id) && (
              <div className="text-xs text-muted-foreground px-2 pb-2">
                {category.description}
              </div>
            )}

            {/* Components in Category */}
            {expandedCategories.has(category.id) && (
              <div className="space-y-1 ml-2">
                {category.components.map(component => (
                  <div
                    key={component.id}
                    className="relative"
                    onMouseEnter={() => setHoveredComponent(component.id)}
                    onMouseLeave={() => setHoveredComponent(null)}
                  >
                    <button
                      onClick={() => handleAddComponent(component)}
                      className={`w-full flex items-center gap-2 p-2 text-xs rounded border transition-all hover:scale-105 ${getBehaviorColor(component.behavior)}`}
                      title={component.description}
                    >
                      <span className="text-sm">{component.icon}</span>
                      <span className="flex-1 text-left truncate">{component.name}</span>
                      <span className="text-xs opacity-60">{component.pins.length}p</span>
                    </button>

                    {/* Tooltip */}
                    {hoveredComponent === component.id && (
                      <div className="absolute left-full top-0 ml-2 z-50 bg-popover border rounded-lg p-2 shadow-lg max-w-xs">
                        <div className="text-sm font-medium">{component.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {component.description}
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          <div>Type: {component.behavior}</div>
                          <div>Pins: {component.pins.map(p => p.label).join(', ')}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        </div>
      </div>

      {/* Selected Component Inspector - Fixed at Bottom */}
      {selectedComponent && (
        <div className="p-3 border-t bg-muted/30">
          <div className="text-xs font-medium mb-2">Selected Component</div>
          <div className="space-y-2">
            <div className="text-sm font-medium">{selectedComponent.name}</div>
            <div className="text-xs text-muted-foreground">
              Type: {selectedComponent.type}
            </div>
            
            {/* Component-specific properties */}
            {selectedComponent.type === 'led' && (
              <div className="space-y-1">
                <label className="text-xs">Color:</label>
                <div className="grid grid-cols-3 gap-1">
                  {['red', 'green', 'blue', 'yellow', 'purple', 'white'].map(color => (
                    <button
                      key={color}
                      onClick={() => onUpdateComponent({
                        props: { ...selectedComponent.props, color }
                      })}
                      className={`h-4 rounded border ${
                        selectedComponent.props?.color === color 
                          ? 'border-white' 
                          : 'border-gray-400'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}

            {selectedComponent.type === 'potentiometer' && (
              <div className="space-y-1">
                <label className="text-xs">Value: {selectedComponent.props?.value || 0}</label>
                <input
                  type="range"
                  min="0"
                  max="4095"
                  value={selectedComponent.props?.value || 0}
                  onChange={(e) => onUpdateComponent({
                    props: { ...selectedComponent.props, value: parseInt(e.target.value) }
                  })}
                  className="w-full"
                />
              </div>
            )}

            {selectedComponent.type === 'servo' && (
              <div className="space-y-1">
                <label className="text-xs">Angle: {selectedComponent.props?.angle || 90}°</label>
                <input
                  type="range"
                  min="0"
                  max="180"
                  value={selectedComponent.props?.angle || 90}
                  onChange={(e) => onUpdateComponent({
                    props: { ...selectedComponent.props, angle: parseInt(e.target.value) }
                  })}
                  className="w-full"
                />
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Pins: {selectedComponent.pins.map(p => `${p.label}(${p.kind})`).join(', ')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
