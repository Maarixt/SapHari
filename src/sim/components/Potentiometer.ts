/**
 * Potentiometer Component
 * Realistic potentiometer with noise and smooth value changes
 */

import { Component, SimCtx } from '../core/types';
import { getRNG } from '../core/rng';

export interface PotentiometerProps {
  value: number; // 0-1
  resistance: number; // ohms
  tolerance: number; // percentage
  noiseLevel: number; // 0-1
}

export class Potentiometer implements Component {
  id: string;
  label: string;
  pins: Record<string, string> = {};
  props: PotentiometerProps;
  powerDrawmA: number = 0;

  private rng = getRNG();
  private currentValue: number = 0;
  private targetValue: number = 0;
  private outputVoltage: number = 0;
  private lastUpdateTime: number = 0;

  constructor(id: string, props: Partial<PotentiometerProps> = {}) {
    this.id = id;
    this.label = 'Potentiometer';
    this.props = {
      value: 0.5,
      resistance: 10000, // 10k ohms
      tolerance: 5, // 5%
      noiseLevel: 0.01, // 1%
      ...props
    };

    this.initializePins();
  }

  private initializePins(): void {
    this.pins = {
      'vcc': 'net_vcc',
      'out': 'net_out',
      'gnd': 'net_gnd'
    };
  }

  init(ctx: SimCtx): void {
    this.currentValue = this.props.value;
    this.targetValue = this.props.value;
    this.outputVoltage = 0;
    this.lastUpdateTime = ctx.getTime();
  }

  update(dt: number, ctx: SimCtx): void {
    const currentTime = ctx.getTime();
    
    // Smooth value changes
    if (Math.abs(this.targetValue - this.currentValue) > 0.001) {
      const changeRate = 2.0; // 2 units per second
      const change = Math.sign(this.targetValue - this.currentValue) * changeRate * dt;
      this.currentValue = Math.max(0, Math.min(1, this.currentValue + change));
    }

    // Calculate output voltage
    const vccVoltage = ctx.getNetV(this.pins.vcc);
    const gndVoltage = ctx.getNetV(this.pins.gnd);
    const supplyVoltage = vccVoltage - gndVoltage;

    if (supplyVoltage > 0) {
      // Calculate output voltage based on potentiometer position
      this.outputVoltage = gndVoltage + (supplyVoltage * this.currentValue);
      
      // Add noise
      const noise = this.rng.nextGaussianScaled(0, this.props.noiseLevel * supplyVoltage);
      this.outputVoltage += noise;
      
      // Clamp to supply range
      this.outputVoltage = Math.max(gndVoltage, Math.min(vccVoltage, this.outputVoltage));
    } else {
      this.outputVoltage = 0;
    }

    // Update output pin
    ctx.setNetV(this.pins.out, this.outputVoltage);

    // Check for warnings
    this.checkWarnings(ctx);
  }

  private checkWarnings(ctx: SimCtx): void {
    const vccVoltage = ctx.getNetV(this.pins.vcc);
    const gndVoltage = ctx.getNetV(this.pins.gnd);
    const supplyVoltage = vccVoltage - gndVoltage;

    // Check for unpowered potentiometer
    if (supplyVoltage < 0.1) {
      ctx.warn('POT_UNPOWERED', `Potentiometer ${this.id} is not powered (${supplyVoltage.toFixed(2)}V)`);
    }

    // Check for excessive supply voltage
    if (supplyVoltage > 5.0) {
      ctx.warn('POT_OVER_VOLTAGE', `Potentiometer ${this.id} supply voltage too high (${supplyVoltage.toFixed(2)}V > 5V)`);
    }
  }

  onPinChange(pin: string, ctx: SimCtx): void {
    // Potentiometer responds to supply voltage changes
    if (pin === 'vcc' || pin === 'gnd') {
      this.update(0, ctx);
    }
  }

  /**
   * Set potentiometer value (0-1)
   */
  setValue(value: number): void {
    this.targetValue = Math.max(0, Math.min(1, value));
  }

  /**
   * Get current value (0-1)
   */
  getValue(): number {
    return this.currentValue;
  }

  /**
   * Get output voltage
   */
  getOutputVoltage(): number {
    return this.outputVoltage;
  }

  /**
   * Get ADC reading (0-4095)
   */
  getADCReading(): number {
    // Convert voltage to 12-bit ADC value
    const vccVoltage = 3.3; // Assume 3.3V supply
    const adcValue = Math.round((this.outputVoltage / vccVoltage) * 4095);
    return Math.max(0, Math.min(4095, adcValue));
  }

  /**
   * Get resistance value
   */
  getResistance(): number {
    // Add tolerance variation
    const toleranceVariation = this.rng.nextGaussianScaled(0, this.props.tolerance / 100);
    return this.props.resistance * (1 + toleranceVariation);
  }

  /**
   * Get component info
   */
  getInfo(): any {
    return {
      id: this.id,
      label: this.label,
      value: this.currentValue,
      outputVoltage: this.outputVoltage,
      adcReading: this.getADCReading(),
      resistance: this.getResistance(),
      tolerance: this.props.tolerance
    };
  }
}

/**
 * Create Potentiometer component
 */
export function createPotentiometer(id: string, props?: Partial<PotentiometerProps>): Potentiometer {
  return new Potentiometer(id, props);
}
