/**
 * Deterministic Random Number Generator for Circuit Simulation
 * Uses mulberry32 algorithm for consistent, seedable randomness
 */

export class SeededRNG {
  private state: number;

  constructor(seed: number = Date.now()) {
    this.state = seed;
  }

  /**
   * Generate next random number (0-1)
   * Uses mulberry32 algorithm for good distribution
   */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generate random integer in range [min, max)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  /**
   * Generate random float in range [min, max)
   */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /**
   * Generate random boolean
   */
  nextBoolean(): boolean {
    return this.next() < 0.5;
  }

  /**
   * Generate gaussian noise (mean=0, std=1)
   * Uses Box-Muller transform
   */
  nextGaussian(): number {
    if (this._spare !== null) {
      const value = this._spare;
      this._spare = null;
      return value;
    }

    const u = this.next();
    const v = this.next();
    const mag = Math.sqrt(-2 * Math.log(u));
    this._spare = mag * Math.cos(2 * Math.PI * v);
    return mag * Math.sin(2 * Math.PI * v);
  }

  private _spare: number | null = null;

  /**
   * Generate gaussian noise with custom mean and standard deviation
   */
  nextGaussianScaled(mean: number, std: number): number {
    return mean + std * this.nextGaussian();
  }

  /**
   * Reset to initial seed
   */
  reset(seed?: number): void {
    if (seed !== undefined) {
      this.state = seed;
    }
  }

  /**
   * Get current seed
   */
  getSeed(): number {
    return this.state;
  }
}

// Global RNG instance for simulation
let globalRNG: SeededRNG | null = null;

/**
 * Initialize global RNG with seed
 */
export function initRNG(seed: number = Date.now()): void {
  globalRNG = new SeededRNG(seed);
}

/**
 * Get global RNG instance
 */
export function getRNG(): SeededRNG {
  if (!globalRNG) {
    initRNG();
  }
  return globalRNG!;
}

/**
 * Convenience functions using global RNG
 */
export const rng = {
  next: () => getRNG().next(),
  nextInt: (min: number, max: number) => getRNG().nextInt(min, max),
  nextFloat: (min: number, max: number) => getRNG().nextFloat(min, max),
  nextBoolean: () => getRNG().nextBoolean(),
  nextGaussian: () => getRNG().nextGaussian(),
  nextGaussianScaled: (mean: number, std: number) => getRNG().nextGaussianScaled(mean, std),
  reset: (seed?: number) => getRNG().reset(seed),
  getSeed: () => getRNG().getSeed()
};

/**
 * Create a new RNG instance with specific seed
 */
export function createRNG(seed: number): SeededRNG {
  return new SeededRNG(seed);
}
