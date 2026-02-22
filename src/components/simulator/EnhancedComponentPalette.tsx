// src/components/simulator/EnhancedComponentPalette.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { COMPONENT_CATEGORIES, ComponentDefinition } from './library/categories';
import { SimComponent, PinRole } from './types';
import { nanoid } from 'nanoid';
import { SWITCH_VARIANTS } from './registry';
import { makeJunction } from './library/junction';
import { makePowerRailByKind, makePotentiometerDC } from './library/parts';

export interface LedDebugInfo {
  vA: number | undefined;
  vK: number | undefined;
  forwardBiased: boolean;
  sourceConnected: boolean;
  groundConnected: boolean;
  on: boolean;
}

interface EnhancedComponentPaletteProps {
  onAddComponent: (component: SimComponent) => void;
  /** Return world coords for new component (viewport center + slight offset). When provided, components spawn there instead of random grid. */
  getSpawnPosition?: () => { x: number; y: number };
  wireColor: string;
  onWireColorChange: (color: string) => void;
  onRunToggle: () => void;
  running: boolean;
  selectedComponent?: SimComponent;
  onUpdateComponent: (updates: Partial<SimComponent>) => void;
  /** When selecting an LED: VA, VK, forwardBiased, sourceConnected, groundConnected. Remove after validation. */
  ledDebugInfo?: LedDebugInfo | null;
}

export const EnhancedComponentPalette = ({
  onAddComponent,
  getSpawnPosition,
  wireColor,
  onWireColorChange,
  onRunToggle,
  running,
  selectedComponent,
  onUpdateComponent,
  ledDebugInfo,
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
    if (def.id === 'junction') {
      return makeJunction(x, y);
    }
    if (def.id === 'power-3v3') return makePowerRailByKind('3v3', x, y);
    if (def.id === 'power-vin') return makePowerRailByKind('vin', x, y);
    if (def.id === 'power-gnd') return makePowerRailByKind('gnd', x, y);
    if (def.id === 'potentiometer') {
      const rTotal = (def.props?.rTotalOhms as number) ?? 10000;
      const alpha = (def.props?.alpha as number) ?? 0.5;
      return makePotentiometerDC(x, y, rTotal, alpha);
    }
    if (def.id === 'dc-supply') {
      return {
        id: nanoid(8),
        type: 'dc_supply' as const,
        name: def.name,
        x, y,
        pins: [
          { id: 'pos', label: '+', kind: 'power' as const, role: 'VCC' as PinRole, x: 10, y: 25 },
          { id: 'neg', label: '−', kind: 'ground' as const, role: 'GND' as PinRole, x: 80, y: 25 },
        ],
        props: { voltage: (def.props?.voltage as number) ?? 5, rInternal: (def.props?.rInternal as number) ?? 50 },
      };
    }
    if (def.id === 'battery-pack') {
      return {
        id: nanoid(8),
        type: 'dc_supply' as const,
        name: def.name,
        x, y,
        pins: [
          { id: 'pos', label: '+', kind: 'power' as const, role: 'VCC' as PinRole, x: 10, y: 25 },
          { id: 'neg', label: '−', kind: 'ground' as const, role: 'GND' as PinRole, x: 80, y: 25 },
        ],
        props: { voltage: (def.props?.voltage as number) ?? 9, rInternal: (def.props?.rInternal as number) ?? 50 },
      };
    }
    if (def.id === 'toggle-switch') {
      const variantDef = SWITCH_VARIANTS.SPST;
      return {
        id: nanoid(8),
        type: 'switch',
        name: def.name,
        x,
        y,
        variantId: 'SPST',
        pins: variantDef.pins.map((p) => ({ id: p.id, label: p.label, kind: p.kind, x: p.x, y: p.y })),
        props: { on: false },
      };
    }
    if (def.id === 'push-button') {
      return {
        id: nanoid(8),
        type: 'push_button',
        name: def.name,
        x,
        y,
        pins: [
          { id: 'P1', label: 'P1', kind: 'digital', role: 'A', x: 10, y: 25 },
          { id: 'P2', label: 'P2', kind: 'digital', role: 'B', x: 80, y: 25 },
        ],
        props: { contact: 'NO', mechanism: 'momentary', latched: false, pressed: false, isClosed: false, rOnOhms: 0.01 },
      };
    }
    if (def.id === 'dc-motor') {
      return {
        id: nanoid(8),
        type: 'motor_dc',
        name: def.name,
        x,
        y,
        pins: [
          { id: 'a', label: 'M+', kind: 'digital', x: 10, y: 25 },
          { id: 'b', label: 'M−', kind: 'digital', x: 80, y: 25 },
        ],
        props: { rOhms: 10, iNom: 0.2, iMinSpin: 0.01, speed: 0, spinning: false },
      };
    }
    if (def.id === 'ac-motor') {
      return {
        id: nanoid(8),
        type: 'motor_ac',
        name: def.name,
        x,
        y,
        pins: [
          { id: 'a', label: 'L', kind: 'digital', x: 10, y: 25 },
          { id: 'b', label: 'N', kind: 'digital', x: 80, y: 25 },
        ],
        props: { rOhms: 20, iNom: 0.2, iMinSpin: 0.01, speed: 0, spinning: false, placeholderModel: true },
      };
    }
    if (def.id === 'capacitor') {
      return {
        id: nanoid(8),
        type: 'capacitor',
        name: def.name,
        x,
        y,
        pins: [
          { id: 'a', label: 'A', kind: 'digital', role: 'A' as PinRole, x: 10, y: 25 },
          { id: 'b', label: 'B', kind: 'digital', role: 'B' as PinRole, x: 80, y: 25 },
        ],
        props: {
          capacitance: (def.props?.capacitance as number) ?? 1e-5,
          rLeak: (def.props?.rLeak as number) ?? 1e8,
        },
      };
    }
    if (def.id === 'capacitor-polarized') {
      return {
        id: nanoid(8),
        type: 'capacitor_polarized',
        name: def.name,
        x,
        y,
        pins: [
          { id: 'P', label: '+', kind: 'digital', role: 'V+' as PinRole, x: 10, y: 25 },
          { id: 'N', label: '−', kind: 'digital', role: 'V-' as PinRole, x: 80, y: 25 },
        ],
        props: {
          capacitance: (def.props?.capacitance as number) ?? 1e-5,
          ratedVoltage: (def.props?.ratedVoltage as number) ?? 16,
          rLeak: (def.props?.rLeak as number) ?? 1e8,
        },
      };
    }
    if (def.id === 'inductor') {
      return {
        id: nanoid(8),
        type: 'inductor',
        name: def.name,
        x,
        y,
        pins: [
          { id: 'a', label: 'A', kind: 'digital', role: 'A' as PinRole, x: 10, y: 25 },
          { id: 'b', label: 'B', kind: 'digital', role: 'B' as PinRole, x: 80, y: 25 },
        ],
        props: {
          inductance: (def.props?.inductance as number) ?? 0.001,
        },
      };
    }
    if (def.id === 'rgb-led') {
      const props = def.props as Record<string, unknown> | undefined;
      return {
        id: nanoid(8),
        type: 'rgb_led',
        name: def.name,
        x,
        y,
        pins: [
          { id: 'R', label: 'R', kind: 'digital', role: 'A' as PinRole, x: 10, y: 15 },
          { id: 'G', label: 'G', kind: 'digital', role: 'A' as PinRole, x: 30, y: 15 },
          { id: 'B', label: 'B', kind: 'digital', role: 'A' as PinRole, x: 50, y: 15 },
          { id: 'COM', label: '−', kind: 'digital', role: 'Cathode' as PinRole, x: 30, y: 35 },
        ],
        props: {
          variantId: (props?.variantId as 'CC' | 'CA') ?? 'CC',
          vfR: (props?.vfR as number) ?? 2,
          vfG: (props?.vfG as number) ?? 3,
          vfB: (props?.vfB as number) ?? 3,
          rdynR: (props?.rdynR as number) ?? 20,
          rdynG: (props?.rdynG as number) ?? 20,
          rdynB: (props?.rdynB as number) ?? 20,
          iref: (props?.iref as number) ?? 0.02,
        },
      };
    }
    return {
      id: nanoid(8),
      type: def.id as 'esp32' | 'led' | 'resistor' | 'button' | 'switch' | 'buzzer' | 'pot' | 'pir' | 'ultrasonic' | 'ds18b20' | 'servo' | 'power' | 'ground' | 'power_rail' | 'wire' | 'potentiometer' | 'junction' | 'dc_supply' | 'motor_dc' | 'motor_ac' | 'voltmeter' | 'transistor' | 'push_button_momentary' | 'push_button_latch' | 'capacitor' | 'capacitor_polarized' | 'rgb_led' | 'diode',
      name: def.name,
      x,
      y,
      pins: def.pins.map(pin => ({
        id: pin.id,
        label: pin.label,
        kind: pin.kind,
        ...(pin.role && { role: pin.role as PinRole }),
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
    const pos = getSpawnPosition
      ? getSpawnPosition()
      : { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 };
    const component = createComponent(def, pos.x, pos.y);
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
    <div className="w-full min-w-0 flex flex-col h-full items-stretch border-r border-border bg-muted/20">
      {/* Single scroll area: Wire Colors, Run, and Parts list scroll together; content uses full width */}
      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 hover:scrollbar-thumb-gray-500 flex flex-col">
        <div className="p-3 space-y-3 w-full min-w-0 flex flex-col items-stretch">
          {/* Wire Color Picker — scrolls with content */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Wire Colors</div>
          <div className="grid grid-cols-4 gap-1 w-full min-w-0" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {wireColors.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => onWireColorChange(color)}
                className={`h-6 w-full min-w-0 rounded border-2 transition-all ${
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
          <div className="pt-2 border-t border-border/50">
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

          <div className="text-xs font-medium text-muted-foreground pt-2">Component Library</div>
        {COMPONENT_CATEGORIES.map(category => (
          <div key={category.id} className="space-y-1 w-full min-w-0">
            {/* Category Header */}
            <button
              type="button"
              onClick={() => toggleCategory(category.id)}
              className="w-full min-w-0 flex items-center justify-between p-2 text-sm font-medium bg-muted/30 rounded hover:bg-muted/50 transition-colors text-left"
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
              <div className="space-y-1 ml-2 w-full min-w-0">
                {category.components.map(component => (
                  <div
                    key={component.id}
                    className="relative w-full min-w-0"
                    onMouseEnter={() => setHoveredComponent(component.id)}
                    onMouseLeave={() => setHoveredComponent(null)}
                  >
                    <button
                      type="button"
                      onClick={() => handleAddComponent(component)}
                      className={`w-full min-w-0 flex items-center justify-between gap-2 p-2 text-xs rounded border transition-all hover:scale-[1.02] ${getBehaviorColor(component.behavior)}`}
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
        <div className="p-3 border-t bg-muted/30 w-full min-w-0">
          <div className="text-xs font-medium mb-2">Selected Component</div>
          <div className="space-y-2">
            <div className="text-sm font-medium">{selectedComponent.name}</div>
            <div className="text-xs text-muted-foreground">
              Type: {selectedComponent.type}
            </div>
            
            {/* Component-specific properties */}
            {selectedComponent.type === 'led' && (
              <div className="space-y-1">
                {ledDebugInfo && (
                  <div className="text-xs font-mono space-y-0.5 p-2 rounded bg-amber-950/30 border border-amber-800/50">
                    <div>VA: {ledDebugInfo.vA ?? '—'} V</div>
                    <div>VK: {ledDebugInfo.vK ?? '—'} V</div>
                    <div>forwardBiased: {String(ledDebugInfo.forwardBiased)}</div>
                    <div>sourceConnected: {String(ledDebugInfo.sourceConnected)}</div>
                    <div>groundConnected: {String(ledDebugInfo.groundConnected)}</div>
                    <div>LED on: {String(ledDebugInfo.on)}</div>
                  </div>
                )}
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

            {selectedComponent.type === 'resistor' && (
              <div className="space-y-1">
                <label className="text-xs">Mode:</label>
                <select
                  value={selectedComponent.props?.mode || 'series'}
                  onChange={(e) => onUpdateComponent({
                    props: {
                      ...selectedComponent.props,
                      mode: e.target.value as 'series' | 'pullup' | 'pulldown',
                      ohms: (e.target.value === 'pullup' || e.target.value === 'pulldown') ? 10000 : (selectedComponent.props?.ohms ?? 220),
                    }
                  })}
                  className="w-full text-xs rounded border bg-background"
                >
                  <option value="series">Series</option>
                  <option value="pullup">Pull-up to 3V3</option>
                  <option value="pulldown">Pull-down to GND</option>
                </select>
                <label className="text-xs">Ohms: {selectedComponent.props?.ohms ?? 220}</label>
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
