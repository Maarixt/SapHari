/**
 * Performance profiler for circuit simulation
 * Tracks per-component update times and overall performance metrics
 */

import { ProfilerEntry, SimComponent } from './types';

export class SimulationProfiler {
  private entries: Map<string, ProfilerEntry> = new Map();
  private frameTimes: number[] = [];
  private lastFrameTime: number = 0;
  private maxFrameHistory: number = 1000; // Keep last 1000 frames
  private isEnabled: boolean = false;

  constructor(enabled: boolean = false) {
    this.isEnabled = enabled;
  }

  /**
   * Enable or disable profiling
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.clear();
    }
  }

  /**
   * Start profiling a component update
   */
  startComponentUpdate(component: SimComponent): () => void {
    if (!this.isEnabled) return () => {};

    const startTime = performance.now();
    const componentId = component.id;
    const componentType = component.type;

    return () => {
      const endTime = performance.now();
      const updateTime = endTime - startTime;
      this.recordComponentUpdate(componentId, componentType, updateTime);
    };
  }

  /**
   * Record a component update time
   */
  private recordComponentUpdate(componentId: string, componentType: string, updateTime: number): void {
    if (!this.isEnabled) return;

    let entry = this.entries.get(componentId);
    if (!entry) {
      entry = {
        componentId,
        componentType,
        updateTime: 0,
        maxTime: 0,
        avgTime: 0,
        callCount: 0,
        lastUpdate: 0
      };
      this.entries.set(componentId, entry);
    }

    entry.updateTime = updateTime;
    entry.maxTime = Math.max(entry.maxTime, updateTime);
    entry.callCount++;
    entry.lastUpdate = performance.now();

    // Calculate rolling average (last 100 updates)
    const historyKey = `${componentId}_history`;
    let history = this.entries.get(historyKey);
    if (!history) {
      history = {
        componentId: historyKey,
        componentType: 'history',
        updateTime: 0,
        maxTime: 0,
        avgTime: 0,
        callCount: 0,
        lastUpdate: 0
      };
      this.entries.set(historyKey, history);
    }

    // Simple rolling average
    const alpha = 0.1; // Smoothing factor
    entry.avgTime = entry.avgTime === 0 ? updateTime : (alpha * updateTime + (1 - alpha) * entry.avgTime);
  }

  /**
   * Record frame timing
   */
  recordFrame(): void {
    if (!this.isEnabled) return;

    const now = performance.now();
    if (this.lastFrameTime > 0) {
      const frameTime = now - this.lastFrameTime;
      this.frameTimes.push(frameTime);
      
      // Keep only last N frames
      if (this.frameTimes.length > this.maxFrameHistory) {
        this.frameTimes.shift();
      }
    }
    this.lastFrameTime = now;
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    components: ProfilerEntry[];
    frameStats: {
      avgFrameTime: number;
      maxFrameTime: number;
      minFrameTime: number;
      fps: number;
      frameCount: number;
    };
    totalUpdateTime: number;
    heaviestComponent: ProfilerEntry | null;
  } {
    const components = Array.from(this.entries.values())
      .filter(entry => !entry.componentId.endsWith('_history'))
      .sort((a, b) => b.avgTime - a.avgTime);

    const frameStats = this.getFrameStats();
    const totalUpdateTime = components.reduce((sum, entry) => sum + entry.avgTime, 0);
    const heaviestComponent = components.length > 0 ? components[0] : null;

    return {
      components,
      frameStats,
      totalUpdateTime,
      heaviestComponent
    };
  }

  /**
   * Get frame timing statistics
   */
  private getFrameStats(): {
    avgFrameTime: number;
    maxFrameTime: number;
    minFrameTime: number;
    fps: number;
    frameCount: number;
  } {
    if (this.frameTimes.length === 0) {
      return {
        avgFrameTime: 0,
        maxFrameTime: 0,
        minFrameTime: 0,
        fps: 0,
        frameCount: 0
      };
    }

    const avgFrameTime = this.frameTimes.reduce((sum, time) => sum + time, 0) / this.frameTimes.length;
    const maxFrameTime = Math.max(...this.frameTimes);
    const minFrameTime = Math.min(...this.frameTimes);
    const fps = 1000 / avgFrameTime;

    return {
      avgFrameTime,
      maxFrameTime,
      minFrameTime,
      fps,
      frameCount: this.frameTimes.length
    };
  }

  /**
   * Get component performance by type
   */
  getComponentTypeStats(): Map<string, {
    count: number;
    totalTime: number;
    avgTime: number;
    maxTime: number;
  }> {
    const typeStats = new Map<string, {
      count: number;
      totalTime: number;
      avgTime: number;
      maxTime: number;
    }>();

    for (const entry of this.entries.values()) {
      if (entry.componentId.endsWith('_history')) continue;

      let stats = typeStats.get(entry.componentType);
      if (!stats) {
        stats = {
          count: 0,
          totalTime: 0,
          avgTime: 0,
          maxTime: 0
        };
        typeStats.set(entry.componentType, stats);
      }

      stats.count++;
      stats.totalTime += entry.avgTime;
      stats.avgTime = stats.totalTime / stats.count;
      stats.maxTime = Math.max(stats.maxTime, entry.maxTime);
    }

    return typeStats;
  }

  /**
   * Clear all profiling data
   */
  clear(): void {
    this.entries.clear();
    this.frameTimes = [];
    this.lastFrameTime = 0;
  }

  /**
   * Get a summary string for debugging
   */
  getSummary(): string {
    const stats = this.getStats();
    const typeStats = this.getComponentTypeStats();
    
    let summary = `=== Simulation Profiler Summary ===\n`;
    summary += `Frame Stats: ${stats.frameStats.fps.toFixed(1)} FPS (avg: ${stats.frameStats.avgFrameTime.toFixed(2)}ms)\n`;
    summary += `Total Update Time: ${stats.totalUpdateTime.toFixed(2)}ms\n`;
    
    if (stats.heaviestComponent) {
      summary += `Heaviest Component: ${stats.heaviestComponent.componentType} (${stats.heaviestComponent.avgTime.toFixed(2)}ms avg)\n`;
    }
    
    summary += `\nComponent Types:\n`;
    for (const [type, typeStat] of typeStats) {
      summary += `  ${type}: ${typeStat.count} components, ${typeStat.avgTime.toFixed(2)}ms avg, ${typeStat.maxTime.toFixed(2)}ms max\n`;
    }
    
    return summary;
  }

  /**
   * Export profiling data as JSON
   */
  exportData(): any {
    return {
      timestamp: Date.now(),
      enabled: this.isEnabled,
      stats: this.getStats(),
      typeStats: Object.fromEntries(this.getComponentTypeStats()),
      frameHistory: this.frameTimes.slice(-100) // Last 100 frames
    };
  }
}

// Global profiler instance
let globalProfiler: SimulationProfiler | null = null;

/**
 * Get global profiler instance
 */
export function getProfiler(): SimulationProfiler {
  if (!globalProfiler) {
    globalProfiler = new SimulationProfiler();
  }
  return globalProfiler;
}

/**
 * Initialize profiler with settings
 */
export function initProfiler(enabled: boolean = false): void {
  globalProfiler = new SimulationProfiler(enabled);
}

/**
 * Convenience functions
 */
export const profiler = {
  startComponentUpdate: (component: SimComponent) => getProfiler().startComponentUpdate(component),
  recordFrame: () => getProfiler().recordFrame(),
  getStats: () => getProfiler().getStats(),
  getSummary: () => getProfiler().getSummary(),
  clear: () => getProfiler().clear(),
  setEnabled: (enabled: boolean) => getProfiler().setEnabled(enabled),
  exportData: () => getProfiler().exportData()
};
