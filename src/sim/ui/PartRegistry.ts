/**
 * Part Registry - Manages component definitions and their UI representations
 */

import PushButton from '../components/PushButton';
import PushButtonView from './parts/PushButtonView';
import TactSwitch4 from '../components/TactSwitch4';
import TactSwitch4View from './parts/TactSwitch4View';

export interface PinDefinition {
  id: string;
  label: string;
  kind: 'digital' | 'analog' | 'power' | 'ground' | 'i2c' | 'spi' | 'pwm' | 'adc';
  gpio?: number;
  x: number;
  y: number;
}

export interface PartDefinition {
  name: string;
  pins: PinDefinition[];
  defaultProps: Record<string, any>;
  factory: (id: string, pins: Record<string, string>, props: any) => any;
  View: React.ComponentType<any>;
  propsUi: Array<{
    key: string;
    type: 'select' | 'slider' | 'checkbox' | 'text';
    options?: string[];
    min?: number;
    max?: number;
    step?: number;
    label: string;
  }>;
}

export const PARTS: Record<string, PartDefinition> = {
  'push-button': {
    name: 'Push Button',
    pins: [
      { id: 'A1', label: 'A1', kind: 'digital', x: 0, y: 0 },
      { id: 'A2', label: 'A2', kind: 'digital', x: 10, y: 0 },
      { id: 'B1', label: 'B1', kind: 'digital', x: 0, y: 10 },
      { id: 'B2', label: 'B2', kind: 'digital', x: 10, y: 10 },
    ],
    defaultProps: { 
      bounceMs: 10, 
      contactResistance: 0.08, 
      orientation: 0,
      label: 'PUSH-BTN'
    },
    factory: (id: string, pins: Record<string, string>, props: any) => 
      new TactSwitch4(id, pins, props),
    View: TactSwitch4View,
    propsUi: [
      { 
        key: 'bounceMs', 
        type: 'slider', 
        min: 0, 
        max: 20, 
        step: 1, 
        label: 'Bounce (ms)' 
      },
      { 
        key: 'orientation', 
        type: 'select', 
        options: ['0', '90', '180', '270'], 
        label: 'Orientation' 
      },
    ],
  },
  // Add more parts here as they're implemented
};

/**
 * Get part definition by type
 */
export function getPartDefinition(type: string): PartDefinition | undefined {
  return PARTS[type];
}

/**
 * Create a component instance
 */
export function createComponent(type: string, id: string, pins: Record<string, string>, props?: any): any {
  const partDef = getPartDefinition(type);
  if (!partDef) {
    throw new Error(`Unknown part type: ${type}`);
  }
  
  const mergedProps = { ...partDef.defaultProps, ...props };
  return partDef.factory(id, pins, mergedProps);
}

/**
 * Get all available part types
 */
export function getAvailableParts(): string[] {
  return Object.keys(PARTS);
}
