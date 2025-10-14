/**
 * Enhanced ESP32 Circuit Simulation Engine
 * Pin-accurate simulation with deterministic behavior
 */

import { 
  SimState, 
  SimComponent, 
  Wire, 
  Net, 
  SimCtx, 
  Component,
  PinState,
  GpioMode,
  InterruptHandler,
  PWMMode,
  ADCMode,
  Warning
} from './types';
import { SeededRNG, getRNG } from './rng';
import { SimulationProfiler, getProfiler } from './profiler';

// Net bridging API for temporary component connections
export interface NetBridge {
  id: string;            // component id
  pairs: Array<[string, string]>; // [netIdA, netIdB]
  resistanceOhm: number; // ~0.05–0.2Ω
}

const activeBridges = new Map<string, NetBridge>();

export function addBridge(bridge: NetBridge) {
  activeBridges.set(bridge.id, bridge);
  // Note: In a full implementation, this would trigger net recomputation
  console.log(`Bridge added: ${bridge.id} connecting ${bridge.pairs.length} pairs`);
}

export function removeBridge(id: string) {
  activeBridges.delete(id);
  // Note: In a full implementation, this would trigger net recomputation
  console.log(`Bridge removed: ${id}`);
}

export function getActiveBridges(): Map<string, NetBridge> {
  return new Map(activeBridges);
}

export class SimulationEngine {
  private state: SimState;
  private components: Map<string, Component> = new Map();
  private nets: Map<string, Net> = new Map();
  private rng: SeededRNG;
  private profiler: SimulationProfiler;
  
  // GPIO system
  private gpioStates: Map<number, PinState> = new Map();
  private interruptHandlers: Map<number, InterruptHandler> = new Map();
  private interruptQueue: Array<{ pin: number; edge: 'RISING' | 'FALLING' | 'CHANGE' }> = [];
  
  // PWM system
  private pwmChannels: Map<number, PWMMode> = new Map();
  
  // ADC system
  private adcPins: Map<number, ADCMode> = new Map();
  
  // Event system
  private eventQueue: Array<{ time: number; callback: () => void }> = [];
  
  // Warnings system
  private warnings: Map<string, Warning> = new Map();
  
  // Timing
  private simulationTime: number = 0;
  private lastUpdateTime: number = 0;
  
  constructor(state: SimState, seed: number = Date.now()) {
    this.state = { ...state };
    this.rng = new SeededRNG(seed);
    this.profiler = new SimulationProfiler();
    
    this.initializeGPIO();
    this.initializeComponents();
    this.buildNets();
  }
  
  /**
   * Initialize GPIO system
   */
  private initializeGPIO(): void {
    // Initialize all GPIO pins with default state
    for (let pin = 0; pin < 40; pin++) {
      this.gpioStates.set(pin, {
        mode: 'INPUT',
        level: 0,
        pull: 'NONE'
      });
    }
  }
  
  /**
   * Initialize components from state
   */
  private initializeComponents(): void {
    for (const simComp of this.state.components) {
      const component = this.createComponentFromSimComponent(simComp);
      this.components.set(simComp.id, component);
    }
  }
  
  /**
   * Build nets from wires
   */
  private buildNets(): void {
    this.nets.clear();
    let netCounter = 0;
    const pinToNet = new Map<string, string>();
    
    // Create nets from wires
    for (const wire of this.state.wires) {
      const fromKey = `${wire.from.componentId}:${wire.from.pinId}`;
      const toKey = `${wire.to.componentId}:${wire.to.pinId}`;
      
      let netId = pinToNet.get(fromKey) || pinToNet.get(toKey);
      if (!netId) {
        netId = `net_${netCounter++}`;
      }
      
      pinToNet.set(fromKey, netId);
      pinToNet.set(toKey, netId);
      
      if (!this.nets.has(netId)) {
        this.nets.set(netId, {
          id: netId,
          v: 0,
          pins: []
        });
      }
      
      const net = this.nets.get(netId)!;
      net.pins.push(
        { compId: wire.from.componentId, pinId: wire.from.pinId },
        { compId: wire.to.componentId, pinId: wire.to.pinId }
      );
    }
    
    // Assign voltages based on power/ground connections
    this.assignVoltages();
  }
  
  /**
   * Assign voltages to nets based on power/ground connections
   */
  private assignVoltages(): void {
    for (const net of this.nets.values()) {
      let hasPower = false;
      let hasGround = false;
      let gpioOverride: number | undefined;
      
      for (const pin of net.pins) {
        const component = this.components.get(pin.compId);
        if (component) {
          // Check for power/ground pins
          const pinDef = this.getPinDefinition(component, pin.pinId);
          if (pinDef) {
            if (pinDef.kind === 'power') hasPower = true;
            if (pinDef.kind === 'ground') hasGround = true;
            
            // Check for GPIO overrides
            if (pinDef.gpio !== undefined) {
              const gpioState = this.gpioStates.get(pinDef.gpio);
              if (gpioState && gpioState.mode === 'OUTPUT') {
                gpioOverride = gpioState.level ? 3.3 : 0;
              }
            }
          }
        }
      }
      
      // Apply voltage assignment
      if (gpioOverride !== undefined) {
        net.v = gpioOverride;
      } else if (hasPower && !hasGround) {
        net.v = 3.3;
      } else if (hasGround && !hasPower) {
        net.v = 0;
      } else if (hasPower && hasGround) {
        net.v = 0; // Short circuit
        this.addWarning('SHORT_CIRCUIT', `Short circuit detected on net ${net.id}`, 'error', net.id);
      }
    }
  }
  
  /**
   * Get pin definition for a component
   */
  private getPinDefinition(component: Component, pinId: string): any {
    // This would need to be implemented based on component definitions
    // For now, return a basic structure
    return {
      kind: 'digital',
      gpio: undefined
    };
  }
  
  /**
   * Add a warning
   */
  private addWarning(code: string, message: string, severity: 'info' | 'warning' | 'error', componentId?: string, netId?: string): void {
    const warning: Warning = {
      id: `warning_${Date.now()}_${Math.random()}`,
      code,
      message,
      severity,
      componentId,
      netId,
      timestamp: this.simulationTime
    };
    this.warnings.set(warning.id, warning);
  }
  
  /**
   * Create component from SimComponent
   */
  private createComponentFromSimComponent(simComp: SimComponent): Component {
    return {
      id: simComp.id,
      label: simComp.type,
      pins: {},
      props: simComp.props || {},
      update: (dt: number, ctx: SimCtx) => {
        // Default update function - would be overridden by specific components
      }
    };
  }
  
  /**
   * Create simulation context
   */
  private createSimCtx(): SimCtx {
    return {
      getNetV: (netId: string) => {
        const net = this.nets.get(netId);
        return net ? net.v : 0;
      },
      
      setNetV: (netId: string, v: number) => {
        const net = this.nets.get(netId);
        if (net) {
          net.v = Math.max(0, Math.min(3.3, v));
        }
      },
      
      readDigital: (netId: string) => {
        const net = this.nets.get(netId);
        return net && net.v > 1.65 ? 1 : 0;
      },
      
      writeDigital: (netId: string, lvl: 0 | 1) => {
        const net = this.nets.get(netId);
        if (net) {
          net.v = lvl ? 3.3 : 0;
        }
      },
      
      readAnalog: (netId: string) => {
        const net = this.nets.get(netId);
        return net ? net.v : 0;
      },
      
      writeAnalog: (netId: string, v: number) => {
        const net = this.nets.get(netId);
        if (net) {
          net.v = Math.max(0, Math.min(3.3, v));
        }
      },
      
      schedule: (fn: () => void, delayMs: number) => {
        this.eventQueue.push({
          time: this.simulationTime + delayMs,
          callback: fn
        });
      },
      
      raiseInterrupt: (pin: number, edge: 'RISING' | 'FALLING' | 'CHANGE') => {
        this.interruptQueue.push({ pin, edge });
      },
      
      rng: () => this.rng.next(),
      
      warn: (code: string, msg: string) => {
        this.addWarning(code, msg, 'warning');
      },
      
      getTime: () => this.simulationTime,
      getTimeScale: () => this.state.timeScale
    };
  }
  
  /**
   * Update simulation by one timestep
   */
  public update(dt: number): void {
    const ctx = this.createSimCtx();
    
    // Update all components
    for (const component of this.components.values()) {
      const endProfiling = this.profiler.startComponentUpdate({
        id: component.id,
        type: component.label,
        x: 0, y: 0, rotation: 0,
        pins: [],
        props: component.props || {}
      });
      
      component.update(dt, ctx);
      endProfiling();
    }
    
    // Process interrupts
    this.processInterrupts();
    
    // Update nets
    this.assignVoltages();
    
    // Process event queue
    this.processEventQueue();
    
    // Check for warnings
    this.checkWarnings();
    
    this.simulationTime += dt;
  }
  
  /**
   * Process interrupt queue
   */
  private processInterrupts(): void {
    for (const interrupt of this.interruptQueue) {
      const handler = this.interruptHandlers.get(interrupt.pin);
      if (handler && handler.enabled) {
        handler.callback();
      }
    }
    this.interruptQueue = [];
  }
  
  /**
   * Process event queue
   */
  private processEventQueue(): void {
    const currentTime = this.simulationTime;
    const eventsToProcess = this.eventQueue.filter(event => event.time <= currentTime);
    
    for (const event of eventsToProcess) {
      event.callback();
    }
    
    this.eventQueue = this.eventQueue.filter(event => event.time > currentTime);
  }
  
  /**
   * Check for various warning conditions
   */
  private checkWarnings(): void {
    // Check for floating inputs
    this.checkFloatingInputs();
    
    // Check for brownout
    this.checkBrownout();
    
    // Check for pin conflicts
    this.checkPinConflicts();
    
    // Check for unpowered sensors
    this.checkUnpoweredSensors();
  }
  
  /**
   * Check for floating digital inputs
   */
  private checkFloatingInputs(): void {
    for (const net of this.nets.values()) {
      if (net.v > 0.5 && net.v < 2.8) { // Floating voltage range
        let hasInput = false;
        for (const pin of net.pins) {
          const component = this.components.get(pin.compId);
          if (component) {
            const pinDef = this.getPinDefinition(component, pin.pinId);
            if (pinDef && pinDef.kind === 'digital') {
              hasInput = true;
              break;
            }
          }
        }
        
        if (hasInput) {
          this.addWarning('FLOATING_INPUT', `Floating input detected on net ${net.id}`, 'warning', undefined, net.id);
        }
      }
    }
  }
  
  /**
   * Check for brownout condition
   */
  private checkBrownout(): void {
    for (const net of this.nets.values()) {
      if (net.v < 3.0 && net.v > 0) { // Brownout range
        this.addWarning('BROWNOUT', `Brownout detected: ${net.v.toFixed(2)}V on net ${net.id}`, 'error', undefined, net.id);
      }
    }
  }
  
  /**
   * Check for pin mode conflicts
   */
  private checkPinConflicts(): void {
    // This would check for multiple outputs driving the same net
    // Implementation depends on GPIO state tracking
  }
  
  /**
   * Check for unpowered sensors
   */
  private checkUnpoweredSensors(): void {
    // This would check if sensor components have proper power connections
    // Implementation depends on component definitions
  }
  
  /**
   * Get current state
   */
  public getState(): SimState {
    return { ...this.state };
  }
  
  /**
   * Get warnings
   */
  public getWarnings(): Warning[] {
    return Array.from(this.warnings.values());
  }
  
  /**
   * Get performance stats
   */
  public getPerformanceStats(): any {
    return this.profiler.getStats();
  }
  
  /**
   * Set GPIO mode
   */
  public setGPIOMode(pin: number, mode: GpioMode): void {
    const gpioState = this.gpioStates.get(pin);
    if (gpioState) {
      gpioState.mode = mode;
    }
  }
  
  /**
   * Set GPIO level
   */
  public setGPIOLevel(pin: number, level: 0 | 1): void {
    const gpioState = this.gpioStates.get(pin);
    if (gpioState) {
      gpioState.level = level;
    }
  }
  
  /**
   * Get GPIO level
   */
  public getGPIOLevel(pin: number): 0 | 1 {
    const gpioState = this.gpioStates.get(pin);
    return gpioState ? gpioState.level : 0;
  }
  
  /**
   * Attach interrupt handler
   */
  public attachInterrupt(pin: number, edge: 'RISING' | 'FALLING' | 'CHANGE', callback: () => void): void {
    this.interruptHandlers.set(pin, {
      pin,
      edge,
      callback,
      enabled: true
    });
  }
  
  /**
   * Detach interrupt handler
   */
  public detachInterrupt(pin: number): void {
    this.interruptHandlers.delete(pin);
  }
  
  /**
   * Setup PWM channel
   */
  public setupPWM(channel: number, frequency: number, resolution: number): void {
    this.pwmChannels.set(channel, {
      channel,
      frequency,
      resolution,
      duty: 0
    });
  }
  
  /**
   * Write PWM duty cycle
   */
  public writePWM(channel: number, duty: number): void {
    const pwm = this.pwmChannels.get(channel);
    if (pwm) {
      pwm.duty = Math.max(0, Math.min(1, duty));
    }
  }
  
  /**
   * Read analog value
   */
  public readAnalog(pin: number): number {
    // Convert voltage to 12-bit ADC value with noise
    const voltage = 3.3; // This would come from the actual net voltage
    const counts = Math.round((voltage / 3.3) * 4095);
    const noise = this.rng.nextGaussianScaled(0, 2); // ±2 LSB noise
    return Math.max(0, Math.min(4095, counts + noise));
  }
}

// Export convenience functions
export function createSimulationEngine(state: SimState, seed?: number): SimulationEngine {
  return new SimulationEngine(state, seed);
}
