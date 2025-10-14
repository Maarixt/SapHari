/**
 * Enhanced LED Component - Works with Net Voltage
 * Calculates brightness based on actual voltage across pins
 */

import { Component, SimCtx, AnalogV } from '../core/types';

export interface EnhancedLedProps {
  color: string;
  forwardVoltage: number; // e.g., 2.0V for red LED
  maxCurrentmA: number;   // e.g., 20mA
  brightness: number;     // 0-1, calculated
  seriesResistor?: number; // ohms, if detected
}

export class EnhancedLed implements Component {
  id: string;
  label: string = 'Led';
  pins: Record<string, string>; // 'anode' -> netId, 'cathode' -> netId
  props: EnhancedLedProps;
  powerDrawmA: number = 0;

  constructor(id: string, label: string, pins: Record<string, string>, props: Record<string, any>) {
    this.id = id;
    this.label = label;
    this.pins = pins;
    this.props = {
      color: 'red',
      forwardVoltage: 2.0, // Default for red
      maxCurrentmA: 20,
      brightness: 0,
      seriesResistor: undefined,
      ...props
    };
  }

  init(ctx: SimCtx) {
    this.updateBrightness(ctx);
  }

  update(dt: number, ctx: SimCtx) {
    this.updateBrightness(ctx);
  }

  onPinChange(pin: string, ctx: SimCtx) {
    this.updateBrightness(ctx);
  }

  private updateBrightness(ctx: SimCtx) {
    const anodeV = ctx.getNetV(this.pins['anode']);
    const cathodeV = ctx.getNetV(this.pins['cathode']);

    const voltageDrop = anodeV - cathodeV;

    if (voltageDrop > this.props.forwardVoltage) {
      // Calculate current based on voltage and series resistance
      const excessVoltage = voltageDrop - this.props.forwardVoltage;
      let current = 0;
      
      if (this.props.seriesResistor && this.props.seriesResistor > 0) {
        // Proper series resistor
        current = excessVoltage / this.props.seriesResistor;
      } else {
        // No series resistor - this is dangerous!
        current = this.props.maxCurrentmA / 1000; // Cap at max current
        (ctx as any).warn('LED_NO_RESISTOR', `LED (${this.id}) has no series resistor! Current limited to ${this.props.maxCurrentmA}mA.`);
      }

      // Calculate brightness using tanh curve for smooth response
      const normalizedCurrent = current / (this.props.maxCurrentmA / 1000);
      this.props.brightness = Math.tanh(normalizedCurrent);
      
      // Update power draw
      this.powerDrawmA = current * 1000; // Convert to mA
    } else {
      this.props.brightness = 0;
      this.powerDrawmA = 0;
    }

    // Check for reverse bias
    if (voltageDrop < -0.7) {
      (ctx as any).warn('LED_REVERSE_BIAS', `LED (${this.id}) is reverse-biased.`);
    }

    // Check for excessive voltage
    if (voltageDrop > this.props.forwardVoltage + 5) {
      (ctx as any).warn('LED_EXCESSIVE_VOLTAGE', `LED (${this.id}) has excessive voltage (${voltageDrop.toFixed(2)}V).`);
    }
  }

  /**
   * Get current brightness (0-1)
   */
  getBrightness(): number {
    return this.props.brightness;
  }

  /**
   * Get current power draw in mA
   */
  getPowerDraw(): number {
    return this.powerDrawmA;
  }

  /**
   * Get component info
   */
  getInfo(): any {
    return {
      id: this.id,
      label: this.label,
      color: this.props.color,
      brightness: this.props.brightness,
      powerDrawmA: this.powerDrawmA,
      forwardVoltage: this.props.forwardVoltage,
      maxCurrentmA: this.props.maxCurrentmA,
      seriesResistor: this.props.seriesResistor
    };
  }
}

/**
 * Create Enhanced LED component
 */
export function createEnhancedLed(id: string, label: string, pins: Record<string, string>, props?: Partial<EnhancedLedProps>): EnhancedLed {
  return new EnhancedLed(id, label, pins, props);
}
