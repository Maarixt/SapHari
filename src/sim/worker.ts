/**
 * WebWorker for ESP32 Circuit Simulation
 * Handles the main simulation loop in a separate thread to keep UI responsive
 */

import { 
  SimulationMessage, 
  SimState, 
  SimCtx, 
  Component, 
  Net, 
  Warning,
  InterruptHandler,
  PWMMode,
  ADCMode,
  TimeControls
} from './core/types';
import { SeededRNG, initRNG } from './core/rng';
import { SimulationProfiler, initProfiler } from './core/profiler';

// Worker state
let simulationState: SimState | null = null;
let components: Map<string, Component> = new Map();
let nets: Map<string, Net> = new Map();
let rng: SeededRNG | null = null;
let profiler: SimulationProfiler | null = null;
let timeControls: TimeControls = {
  playing: false,
  timeScale: 1.0,
  singleStep: false,
  maxCatchUp: 20
};

// Simulation timing
let lastTime: number = 0;
let accumulator: number = 0;
let simulationTime: number = 0;
const FIXED_TIMESTEP = 1; // 1ms

// Interrupt system
let interruptHandlers: Map<number, InterruptHandler> = new Map();
let interruptQueue: Array<{ pin: number; edge: 'RISING' | 'FALLING' | 'CHANGE' }> = [];

// PWM system
let pwmChannels: Map<number, PWMMode> = new Map();

// ADC system
let adcPins: Map<number, ADCMode> = new Map();

// Event queue for scheduled events
let eventQueue: Array<{ time: number; callback: () => void }> = [];

// Warnings system
let warnings: Map<string, Warning> = new Map();

// Message handling
self.onmessage = (event: MessageEvent<SimulationMessage>) => {
  const message = event.data;
  
  try {
    switch (message.type) {
      case 'INIT':
        handleInit(message.payload);
        break;
      case 'PLAY':
        handlePlay();
        break;
      case 'PAUSE':
        handlePause();
        break;
      case 'STEP':
        handleStep();
        break;
      case 'SET_PROP':
        handleSetProp(message.payload);
        break;
      case 'CONNECT':
        handleConnect(message.payload);
        break;
      case 'DISCONNECT':
        handleDisconnect(message.payload);
        break;
      case 'REQUEST_STATE':
        handleRequestState();
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      payload: { error: error.message, stack: error.stack }
    });
  }
};

function handleInit(payload: any): void {
  const { state, seed, enableProfiler } = payload;
  
  simulationState = state;
  simulationTime = 0;
  lastTime = performance.now();
  accumulator = 0;
  
  // Initialize RNG
  initRNG(seed);
  rng = new SeededRNG(seed);
  
  // Initialize profiler
  initProfiler(enableProfiler || false);
  profiler = new SimulationProfiler(enableProfiler || false);
  
  // Initialize components
  components.clear();
  for (const comp of state.components) {
    const component = createComponentFromSimComponent(comp);
    components.set(comp.id, component);
  }
  
  // Build initial nets
  buildNets();
  
  // Initialize all components
  const ctx = createSimCtx();
  for (const component of components.values()) {
    if (component.init) {
      component.init(ctx);
    }
  }
  
  self.postMessage({
    type: 'STATE',
    payload: { state: simulationState, time: simulationTime }
  });
}

function handlePlay(): void {
  timeControls.playing = true;
  timeControls.singleStep = false;
  startSimulationLoop();
}

function handlePause(): void {
  timeControls.playing = false;
}

function handleStep(): void {
  timeControls.singleStep = true;
  timeControls.playing = true;
  // Single step will be handled in the simulation loop
}

function handleSetProp(payload: any): void {
  const { componentId, prop, value } = payload;
  const component = components.get(componentId);
  if (component) {
    if (!component.props) component.props = {};
    component.props[prop] = value;
  }
}

function handleConnect(payload: any): void {
  const { from, to } = payload;
  // Add wire to state
  if (simulationState) {
    const wire = {
      id: `wire_${Date.now()}_${Math.random()}`,
      from,
      to
    };
    simulationState.wires.push(wire);
    buildNets();
  }
}

function handleDisconnect(payload: any): void {
  const { wireId } = payload;
  if (simulationState) {
    simulationState.wires = simulationState.wires.filter(w => w.id !== wireId);
    buildNets();
  }
}

function handleRequestState(): void {
  if (simulationState) {
    self.postMessage({
      type: 'STATE',
      payload: { 
        state: simulationState, 
        time: simulationTime,
        warnings: Array.from(warnings.values())
      }
    });
  }
}

function startSimulationLoop(): void {
  if (!timeControls.playing) return;
  
  const now = performance.now();
  const deltaTime = now - lastTime;
  lastTime = now;
  
  // Apply time scale
  const scaledDelta = deltaTime * timeControls.timeScale;
  accumulator += scaledDelta;
  
  // Fixed timestep with catch-up cap
  let steps = 0;
  while (accumulator >= FIXED_TIMESTEP && steps < timeControls.maxCatchUp) {
    simulationStep();
    accumulator -= FIXED_TIMESTEP;
    simulationTime += FIXED_TIMESTEP;
    steps++;
    
    // Handle single step
    if (timeControls.singleStep) {
      timeControls.playing = false;
      timeControls.singleStep = false;
      break;
    }
  }
  
  // Process event queue
  processEventQueue();
  
  // Record profiler frame
  if (profiler) {
    profiler.recordFrame();
  }
  
  // Send state update (throttled to ~30-60 FPS)
  if (steps > 0) {
    self.postMessage({
      type: 'STATE',
      payload: { 
        state: simulationState, 
        time: simulationTime,
        warnings: Array.from(warnings.values())
      }
    });
  }
  
  // Continue loop if playing
  if (timeControls.playing) {
    setTimeout(startSimulationLoop, 0);
  }
}

function simulationStep(): void {
  if (!simulationState || !rng) return;
  
  const ctx = createSimCtx();
  
  // Update all components
  for (const component of components.values()) {
    if (profiler) {
      const endProfiling = profiler.startComponentUpdate({
        id: component.id,
        type: component.id, // This should be the actual component type
        x: 0, y: 0, rotation: 0,
        pins: [],
        props: component.props || {}
      });
      
      component.update(FIXED_TIMESTEP, ctx);
      endProfiling();
    } else {
      component.update(FIXED_TIMESTEP, ctx);
    }
  }
  
  // Process interrupts
  processInterrupts();
  
  // Update nets
  updateNets();
  
  // Check for warnings
  checkWarnings();
}

function createSimCtx(): SimCtx {
  return {
    getNetV: (netId: string) => {
      const net = nets.get(netId);
      return net ? net.v : 0;
    },
    
    setNetV: (netId: string, v: number) => {
      const net = nets.get(netId);
      if (net) {
        net.v = v;
      }
    },
    
    readDigital: (netId: string) => {
      const net = nets.get(netId);
      return net && net.v > 1.65 ? 1 : 0;
    },
    
    writeDigital: (netId: string, lvl: 0 | 1) => {
      const net = nets.get(netId);
      if (net) {
        net.v = lvl ? 3.3 : 0;
      }
    },
    
    readAnalog: (netId: string) => {
      const net = nets.get(netId);
      return net ? net.v : 0;
    },
    
    writeAnalog: (netId: string, v: number) => {
      const net = nets.get(netId);
      if (net) {
        net.v = Math.max(0, Math.min(3.3, v));
      }
    },
    
    schedule: (fn: () => void, delayMs: number) => {
      eventQueue.push({
        time: simulationTime + delayMs,
        callback: fn
      });
    },
    
    raiseInterrupt: (pin: number, edge: 'RISING' | 'FALLING' | 'CHANGE') => {
      interruptQueue.push({ pin, edge });
    },
    
    rng: () => rng ? rng.next() : Math.random(),
    
    warn: (code: string, msg: string) => {
      const warning: Warning = {
        id: `warning_${Date.now()}_${Math.random()}`,
        code,
        message: msg,
        severity: 'warning',
        timestamp: simulationTime
      };
      warnings.set(warning.id, warning);
    },
    
    getTime: () => simulationTime,
    getTimeScale: () => timeControls.timeScale
  };
}

function buildNets(): void {
  if (!simulationState) return;
  
  nets.clear();
  let netCounter = 0;
  
  // Create nets from wires
  const pinToNet = new Map<string, string>();
  
  for (const wire of simulationState.wires) {
    const fromKey = `${wire.from.componentId}:${wire.from.pinId}`;
    const toKey = `${wire.to.componentId}:${wire.to.pinId}`;
    
    let netId = pinToNet.get(fromKey) || pinToNet.get(toKey);
    if (!netId) {
      netId = `net_${netCounter++}`;
    }
    
    pinToNet.set(fromKey, netId);
    pinToNet.set(toKey, netId);
    
    if (!nets.has(netId)) {
      nets.set(netId, {
        id: netId,
        v: 0,
        pins: []
      });
    }
    
    const net = nets.get(netId)!;
    net.pins.push(
      { compId: wire.from.componentId, pinId: wire.from.pinId },
      { compId: wire.to.componentId, pinId: wire.to.pinId }
    );
  }
}

function updateNets(): void {
  // Update net voltages based on component states
  // This is a simplified version - real implementation would be more complex
  for (const net of nets.values()) {
    // Check for power/ground connections
    let hasPower = false;
    let hasGround = false;
    
    for (const pin of net.pins) {
      const component = components.get(pin.compId);
      if (component) {
        // Check if this is a power or ground pin
        // This would need to be implemented based on component definitions
      }
    }
    
    if (hasPower && !hasGround) {
      net.v = 3.3;
    } else if (hasGround && !hasPower) {
      net.v = 0;
    } else if (hasPower && hasGround) {
      net.v = 0; // Short circuit
      // Add warning
      if (rng) {
        const warning: Warning = {
          id: `short_${Date.now()}`,
          code: 'SHORT_CIRCUIT',
          message: `Short circuit detected on net ${net.id}`,
          severity: 'error',
          netId: net.id,
          timestamp: simulationTime
        };
        warnings.set(warning.id, warning);
      }
    }
  }
}

function processInterrupts(): void {
  for (const interrupt of interruptQueue) {
    const handler = interruptHandlers.get(interrupt.pin);
    if (handler && handler.enabled) {
      handler.callback();
    }
  }
  interruptQueue = [];
}

function processEventQueue(): void {
  const currentTime = simulationTime;
  const eventsToProcess = eventQueue.filter(event => event.time <= currentTime);
  
  for (const event of eventsToProcess) {
    event.callback();
  }
  
  eventQueue = eventQueue.filter(event => event.time > currentTime);
}

function checkWarnings(): void {
  // Check for various warning conditions
  // This would be implemented based on the specific warning types
}

function createComponentFromSimComponent(simComp: any): Component {
  // Convert SimComponent to Component
  // This is a simplified version
  return {
    id: simComp.id,
    label: simComp.type,
    pins: {},
    props: simComp.props || {},
    update: (dt: number, ctx: SimCtx) => {
      // Default update function
    }
  };
}

// Start the worker
console.log('ESP32 Circuit Simulator Worker started');
