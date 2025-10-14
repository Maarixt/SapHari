/**
 * Simulation Bridge - Integrates new enhanced simulation with existing UI
 * Provides compatibility layer between old and new systems
 */

import { SimState as OldSimState, SimComponent as OldSimComponent, Wire as OldWire } from '../types';
import { 
  SimState as NewSimState, 
  SimComponent as NewSimComponent, 
  Wire as NewWire,
  Warning 
} from '../../../sim/core/types';
import { SimulationEngine } from '../../../sim/core/engine';
import { getArduinoAPI } from '../../../sim/core/arduinoSandbox';
import { getAudioBus } from '../../../sim/audio/audioBus';
import { getProfiler } from '../../../sim/core/profiler';

export class SimulationBridge {
  private engine: SimulationEngine | null = null;
  private worker: Worker | null = null;
  private isEnhancedMode: boolean = false;
  private warnings: Warning[] = [];
  private onWarningsChange?: (warnings: Warning[]) => void;

  constructor() {
    this.initializeAudio();
  }

  /**
   * Initialize audio system
   */
  private initializeAudio(): void {
    const audioBus = getAudioBus();
    // Audio will be initialized on first user gesture
  }

  /**
   * Convert old SimState to new SimState
   */
  private convertOldToNewState(oldState: OldSimState): NewSimState {
    const newComponents: NewSimComponent[] = oldState.components.map(comp => ({
      id: comp.id,
      type: comp.type,
      x: comp.x,
      y: comp.y,
      rotation: comp.rotation || 0,
      pins: comp.pins.map(pin => ({
        id: pin.id,
        label: pin.label,
        kind: pin.kind as any,
        gpio: pin.gpio,
        x: pin.x,
        y: pin.y,
        capabilities: this.getPinCapabilities(pin.kind, pin.gpio)
      })),
      props: comp.props || {},
      state: {}
    }));

    const newWires: NewWire[] = oldState.wires.map(wire => ({
      id: wire.id,
      from: wire.from,
      to: wire.to,
      color: wire.color
    }));

    return {
      components: newComponents,
      wires: newWires,
      running: oldState.running,
      time: 0,
      timeScale: 1.0,
      seed: Date.now(),
      schemaVersion: '1.0.0'
    };
  }

  /**
   * Convert new SimState back to old SimState
   */
  private convertNewToOldState(newState: NewSimState): OldSimState {
    const oldComponents: OldSimComponent[] = newState.components.map(comp => ({
      id: comp.id,
      type: comp.type as any,
      x: comp.x,
      y: comp.y,
      rotation: comp.rotation,
      pins: comp.pins.map(pin => ({
        id: pin.id,
        label: pin.label,
        kind: pin.kind as any,
        gpio: pin.gpio,
        x: pin.x,
        y: pin.y
      })),
      props: comp.props,
      selected: false
    }));

    const oldWires: OldWire[] = newState.wires.map(wire => ({
      id: wire.id,
      from: wire.from,
      to: wire.to,
      color: wire.color || '#000000',
      selected: false
    }));

    return {
      components: oldComponents,
      wires: oldWires,
      running: newState.running,
      selectedId: undefined
    };
  }

  /**
   * Get pin capabilities based on pin kind and GPIO
   */
  private getPinCapabilities(kind: string, gpio?: number): any {
    const baseCapabilities = {
      input: kind === 'digital' || kind === 'analog',
      output: kind === 'digital' || kind === 'pwm',
      pullup: kind === 'digital',
      pulldown: kind === 'digital',
      pwm: kind === 'pwm' || (gpio !== undefined && gpio >= 0 && gpio <= 39),
      adc: kind === 'analog' || (gpio !== undefined && [32, 33, 34, 35, 36, 39].includes(gpio)),
      i2c: gpio === 21 || gpio === 22,
      spi: gpio === 18 || gpio === 19 || gpio === 23
    };

    return baseCapabilities;
  }

  /**
   * Initialize enhanced simulation
   */
  initializeEnhancedSimulation(state: OldSimState, enableProfiler: boolean = false): void {
    try {
      const newState = this.convertOldToNewState(state);
      
      // Initialize profiler
      const profiler = getProfiler();
      profiler.setEnabled(enableProfiler);
      
      // Create simulation engine
      this.engine = new SimulationEngine(newState, newState.seed);
      
      // Initialize Arduino API
      const arduinoAPI = getArduinoAPI();
      
      this.isEnhancedMode = true;
      console.log('🚀 Enhanced simulation initialized');
    } catch (error) {
      console.error('Failed to initialize enhanced simulation:', error);
      this.isEnhancedMode = false;
    }
  }

  /**
   * Initialize WebWorker simulation
   */
  initializeWorkerSimulation(state: OldSimState, enableProfiler: boolean = false): void {
    try {
      const newState = this.convertOldToNewState(state);
      
      // Create worker
      this.worker = new Worker(new URL('../../../sim/worker.ts', import.meta.url));
      
      // Set up message handling
      this.worker.onmessage = (event) => {
        const { type, payload } = event.data;
        
        switch (type) {
          case 'STATE':
            // Handle state updates
            break;
          case 'WARNING':
            this.warnings.push(payload);
            this.onWarningsChange?.(this.warnings);
            break;
          case 'ERROR':
            console.error('Worker error:', payload);
            break;
        }
      };
      
      // Initialize worker
      this.worker.postMessage({
        type: 'INIT',
        payload: {
          state: newState,
          seed: newState.seed,
          enableProfiler
        }
      });
      
      this.isEnhancedMode = true;
      console.log('🚀 Worker simulation initialized');
    } catch (error) {
      console.error('Failed to initialize worker simulation:', error);
      this.isEnhancedMode = false;
    }
  }

  /**
   * Update simulation with new state
   */
  updateSimulation(state: OldSimState): OldSimState {
    if (!this.isEnhancedMode || !this.engine) {
      return state; // Fall back to old system
    }

    try {
      const newState = this.convertOldToNewState(state);
      
      // Update engine state
      this.engine = new SimulationEngine(newState, newState.seed);
      
      // Get warnings
      this.warnings = this.engine.getWarnings();
      this.onWarningsChange?.(this.warnings);
      
      return this.convertNewToOldState(newState);
    } catch (error) {
      console.error('Failed to update simulation:', error);
      return state;
    }
  }

  /**
   * Run simulation step
   */
  runSimulationStep(state: OldSimState): OldSimState {
    if (!this.isEnhancedMode || !this.engine) {
      return state; // Fall back to old system
    }

    try {
      // Update engine
      this.engine.update(1); // 1ms timestep
      
      // Get updated state
      const newState = this.engine.getState();
      
      // Get warnings
      this.warnings = this.engine.getWarnings();
      this.onWarningsChange?.(this.warnings);
      
      return this.convertNewToOldState(newState);
    } catch (error) {
      console.error('Failed to run simulation step:', error);
      return state;
    }
  }

  /**
   * Handle component property updates
   */
  updateComponentProperty(componentId: string, property: string, value: any): void {
    if (!this.isEnhancedMode) return;

    // This would update the component in the engine
    // Implementation depends on how components are managed
  }

  /**
   * Handle pin connections
   */
  connectPins(fromComponentId: string, fromPinId: string, toComponentId: string, toPinId: string): void {
    if (!this.isEnhancedMode || !this.worker) return;

    this.worker.postMessage({
      type: 'CONNECT',
      payload: {
        from: { componentId: fromComponentId, pinId: fromPinId },
        to: { componentId: toComponentId, pinId: toPinId }
      }
    });
  }

  /**
   * Handle pin disconnections
   */
  disconnectPins(wireId: string): void {
    if (!this.isEnhancedMode || !this.worker) return;

    this.worker.postMessage({
      type: 'DISCONNECT',
      payload: { wireId }
    });
  }

  /**
   * Control simulation playback
   */
  playSimulation(): void {
    if (!this.isEnhancedMode || !this.worker) return;

    this.worker.postMessage({ type: 'PLAY' });
  }

  pauseSimulation(): void {
    if (!this.isEnhancedMode || !this.worker) return;

    this.worker.postMessage({ type: 'PAUSE' });
  }

  stepSimulation(): void {
    if (!this.isEnhancedMode || !this.worker) return;

    this.worker.postMessage({ type: 'STEP' });
  }

  /**
   * Get Arduino API for user sketches
   */
  getArduinoAPI() {
    return getArduinoAPI();
  }

  /**
   * Get audio bus for buzzer control
   */
  getAudioBus() {
    return getAudioBus();
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    if (!this.isEnhancedMode) return null;
    
    const profiler = getProfiler();
    return profiler.getStats();
  }

  /**
   * Get current warnings
   */
  getWarnings(): Warning[] {
    return this.warnings;
  }

  /**
   * Set warnings change callback
   */
  setWarningsCallback(callback: (warnings: Warning[]) => void): void {
    this.onWarningsChange = callback;
  }

  /**
   * Check if enhanced mode is active
   */
  isEnhancedModeActive(): boolean {
    return this.isEnhancedMode;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    if (this.engine) {
      this.engine = null;
    }
    
    this.isEnhancedMode = false;
    this.warnings = [];
  }
}

// Global bridge instance
let globalBridge: SimulationBridge | null = null;

/**
 * Get global simulation bridge
 */
export function getSimulationBridge(): SimulationBridge {
  if (!globalBridge) {
    globalBridge = new SimulationBridge();
  }
  return globalBridge;
}

/**
 * Initialize simulation bridge
 */
export function initSimulationBridge(): SimulationBridge {
  globalBridge = new SimulationBridge();
  return globalBridge;
}
