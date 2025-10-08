import { SimState, SimComponent, Wire } from './types';

type NetId = string;

interface Net {
  id: NetId;
  pins: { compId: string; pinId: string; }[];
  voltage?: number; // 0..3.3 (digital: 0 or 3.3)
}

export function buildNets(state: SimState): Net[] {
  const nets: Net[] = [];
  let counter = 0;

  // Start each pin in its own net
  const pinToNet = new Map<string, Net>();
  for (const c of state.components) {
    if (c && c.pins && Array.isArray(c.pins)) {
      for (const p of c.pins) {
        if (p && p.id) {
          const id = `n${counter++}`;
          const net: Net = { id, pins: [{ compId: c.id, pinId: p.id }] };
          nets.push(net);
          pinToNet.set(`${c.id}:${p.id}`, net);
        }
      }
    }
  }

  // Union on wires
  const find = (key: string) => pinToNet.get(key)!;
  const union = (a: Net, b: Net) => {
    if (a === b) return a;
    // Merge b into a
    if (b.pins && Array.isArray(b.pins)) {
      for (const pin of b.pins) {
        a.pins.push(pin);
        pinToNet.set(`${pin.compId}:${pin.pinId}`, a);
      }
    }
    b.pins = []; // Emptied
    return a;
  };

  for (const w of state.wires) {
    if (w && w.from && w.to) {
      const a = find(`${w.from.componentId}:${w.from.pinId}`);
      const b = find(`${w.to.componentId}:${w.to.pinId}`);
      if (a && b) {
        union(a, b);
      }
    }
  }

  // Compact: remove empty merged nets
  return nets.filter(n => n.pins.length > 0);
}

export function assignVoltages(nets: Net[], components: SimComponent[], gpioOverrides?: Map<string, number>) {
  // Default unknown; mark power & ground
  for (const n of nets) {
    let has3v = false, hasGnd = false;
    let gpioOverride: number | undefined;
    
    for (const pin of n.pins) {
      const c = components.find(c => c.id === pin.compId)!;
      const p = c.pins.find(pp => pp.id === pin.pinId)!;
      
      if (p.kind === 'power') has3v = true;
      if (p.kind === 'ground') hasGnd = true;
      
      // Check for GPIO overrides
      if (gpioOverrides && p.gpio !== undefined) {
        const override = gpioOverrides.get(`gpio${p.gpio}`);
        if (override !== undefined) {
          gpioOverride = override;
        }
      }
    }
    
    // Apply voltage assignment with GPIO overrides taking precedence
    if (gpioOverride !== undefined) {
      n.voltage = gpioOverride;
    } else if (has3v && !hasGnd) {
      n.voltage = 3.3;
    } else if (hasGnd && !has3v) {
      n.voltage = 0;
    } else if (has3v && hasGnd) {
      n.voltage = 0; // Short circuit protection
      console.warn('Short circuit detected on net', n.id);
      // Dispatch event for toast notification
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sim:shortCircuit', { 
          detail: { netId: n.id, pins: n.pins } 
        }));
      }
    }
  }
}

// Get voltage at a specific pin
export function getPinVoltage(nets: Net[], compId: string, pinId: string): number | undefined {
  const net = nets.find(n => 
    n.pins.some(p => p.compId === compId && p.pinId === pinId)
  );
  return net?.voltage;
}

// Simulate component behavior based on net voltages
export function simulateComponents(state: SimState, nets: Net[]): SimState {
  const updatedComponents = state.components.map(comp => {
    const updatedComp = { ...comp };
    
    switch (comp.type) {
      case 'led':
        // LED simulation is handled in runLoop for better control
        break;
        
      case 'button':
        // Button state is controlled by user interaction, not simulation
        // The pressed state is managed by the UI
        break;
        
      case 'buzzer':
        const posVoltage = getPinVoltage(nets, comp.id, '+');
        const negVoltage = getPinVoltage(nets, comp.id, '-');
        
        if (posVoltage !== undefined && negVoltage !== undefined) {
          const voltageDiff = posVoltage - negVoltage;
          // Buzzer is active if voltage difference > 2V
          updatedComp.props = {
            ...comp.props,
            active: voltageDiff > 2.0
          };
        }
        break;
        
      case 'pot':
        // Potentiometer value is controlled by user interaction
        // The value is managed by the UI slider
        break;
        
      case 'pir':
        // PIR sensor motion detection is controlled by user interaction
        // The motion state is managed by the UI
        break;
        
      case 'ultrasonic':
        // Ultrasonic sensor distance is controlled by user interaction
        // The distance value is managed by the UI
        break;
        
      case 'ds18b20':
        // Temperature sensor value is controlled by user interaction
        // The temperature is managed by the UI
        break;
        
      case 'servo':
        // Servo angle is controlled by user interaction
        // The angle is managed by the UI
        break;
        
      default:
        // No simulation for other component types
        break;
    }
    
    return updatedComp;
  });
  
  return {
    ...state,
    components: updatedComponents
  };
}

// Main simulation step
export function simulateStep(state: SimState): SimState {
  // Build nets from current state
  const nets = buildNets(state);
  
  // Assign voltages based on power and ground connections
  assignVoltages(nets, state.components);
  
  // Apply MQTT command overrides
  const overriddenState = applyMQTTOverrides(state);
  
  // Simulate component behavior
  const updatedState = simulateComponents(overriddenState, nets);
  
  return updatedState;
}

// Apply MQTT command overrides to component states
function applyMQTTOverrides(state: SimState): SimState {
  // This will be enhanced to handle MQTT commands
  // For now, return the state as-is
  return state;
}

// Get net information for debugging
export function getNetInfo(nets: Net[]): string[] {
  return nets.map(net => {
    const voltage = net.voltage !== undefined ? `${net.voltage}V` : 'unknown';
    const pinCount = net.pins.length;
    return `Net ${net.id}: ${voltage} (${pinCount} pins)`;
  });
}
