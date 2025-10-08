import { SimState, PinKind } from './types';

// Helper to check if a pin is already used by another wire
export function isPinUsed(state: SimState, compId: string, pinId: string): boolean {
  return state.wires.some(w => 
    (w.from.componentId === compId && w.from.pinId === pinId) ||
    (w.to.componentId === compId && w.to.pinId === pinId)
  );
}


// Helper to find pin coordinates
export function findPin(state: SimState, compId: string, pinId: string) {
  const c = state.components.find(c => c.id === compId);
  if (!c) return null;
  const p = c.pins.find(p => p.id === pinId);
  if (!p) return null;
  return { x: (c.x + p.x), y: (c.y + p.y) };
}

// Helper to check if a pin is a GPIO pin
export function isGPIOPin(state: SimState, compId: string, pinId: string): boolean {
  const component = state.components.find(c => c.id === compId);
  if (!component) return false;
  
  const pin = component.pins.find(p => p.id === pinId);
  if (!pin) return false;
  
  // GPIO pins are digital, analog, or pwm pins
  return pin.kind === 'digital' || pin.kind === 'analog' || pin.kind === 'pwm';
}

// Helper to validate wire connections with GPIO blocking
export function canConnectPin(state: SimState, compId: string, pinId: string): boolean {
  const component = state.components.find(c => c.id === compId);
  if (!component) return false;
  
  const pin = component.pins.find(p => p.id === pinId);
  if (!pin) return false;
  
  // Allow multiple connections to power and ground pins
  if (pin.kind === 'power' || pin.kind === 'ground') {
    return true;
  }
  
  // For GPIO pins (digital, analog, pwm), enforce single connection
  if (isGPIOPin(state, compId, pinId)) {
    if (isPinUsed(state, compId, pinId)) {
      return false; // GPIO pin already used
    }
  }
  
  return true;
}
