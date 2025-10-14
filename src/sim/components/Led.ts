/**
 * LED Component
 * Realistic LED with forward voltage, current limiting, and brightness control
 */

import { Component, SimCtx } from '../core/types';
import { getRNG } from '../core/rng';

export interface LedProps {
  color: 'red' | 'green' | 'blue' | 'yellow' | 'white' | 'rgb';
  forwardVoltage: number; // V
  maxCurrent: number; // mA
  brightness: number; // 0-1
}

export class Led implements Component {
  id: string;
  label: string;
  pins: Record<string, string> = {};
  props: LedProps;
  powerDrawmA: number = 0;

  private rng = getRNG();
  private currentBrightness: number = 0;
  private targetBrightness: number = 0;
  private isOn: boolean = false;
  private forwardVoltage: number = 0;
  private currentDraw: number = 0;

  constructor(id: string, props: Partial<LedProps> = {}) {
    this.id = id;
    this.label = 'LED';
    this.props = {
      color: 'red',
      forwardVoltage: 2.0,
      maxCurrent: 20,
      brightness: 1.0,
      ...props
    };

    this.initializePins();
    this.setForwardVoltage();
  }

  private initializePins(): void {
    this.pins = {
      'anode': 'net_anode',
      'cathode': 'net_cathode'
    };
  }

  private setForwardVoltage(): void {
    // Set forward voltage based on color
    switch (this.props.color) {
      case 'red':
        this.forwardVoltage = 1.8;
        break;
      case 'green':
        this.forwardVoltage = 2.1;
        break;
      case 'blue':
        this.forwardVoltage = 3.2;
        break;
      case 'yellow':
        this.forwardVoltage = 2.0;
        break;
      case 'white':
        this.forwardVoltage = 3.0;
        break;
      case 'rgb':
        this.forwardVoltage = 2.0; // Average for RGB
        break;
      default:
        this.forwardVoltage = this.props.forwardVoltage;
    }
  }

  init(ctx: SimCtx): void {
    this.currentBrightness = 0;
    this.targetBrightness = 0;
    this.isOn = false;
    this.currentDraw = 0;
  }

  update(dt: number, ctx: SimCtx): void {
    const anodeVoltage = ctx.getNetV(this.pins.anode);
    const cathodeVoltage = ctx.getNetV(this.pins.cathode);
    const voltageDiff = anodeVoltage - cathodeVoltage;

    // Check if LED should be on
    const shouldBeOn = voltageDiff > this.forwardVoltage;
    
    if (shouldBeOn !== this.isOn) {
      this.isOn = shouldBeOn;
      this.targetBrightness = shouldBeOn ? this.props.brightness : 0;
    }

    // Smooth brightness transition
    const brightnessChange = (this.targetBrightness - this.currentBrightness) * (dt / 10); // 10ms transition
    this.currentBrightness += brightnessChange;

    // Calculate current draw
    if (this.isOn && voltageDiff > this.forwardVoltage) {
      // Simple current calculation (would be more complex in reality)
      const excessVoltage = voltageDiff - this.forwardVoltage;
      this.currentDraw = Math.min(excessVoltage * 10, this.props.maxCurrent); // 10mA per volt
    } else {
      this.currentDraw = 0;
    }

    // Update power consumption
    this.powerDrawmA = this.currentDraw;

    // Add some flicker for realism
    if (this.isOn && this.currentBrightness > 0) {
      const flicker = this.rng.nextGaussianScaled(0, 0.02); // 2% flicker
      this.currentBrightness = Math.max(0, Math.min(1, this.currentBrightness + flicker));
    }

    // Check for warnings
    this.checkWarnings(voltageDiff, ctx);
  }

  private checkWarnings(voltageDiff: number, ctx: SimCtx): void {
    // Check for reverse bias
    if (voltageDiff < -0.5) {
      ctx.warn('LED_REVERSE_BIAS', `LED ${this.id} is reverse biased (${voltageDiff.toFixed(2)}V)`);
    }

    // Check for excessive current
    if (this.currentDraw > this.props.maxCurrent * 1.1) {
      ctx.warn('LED_OVER_CURRENT', `LED ${this.id} current exceeds maximum (${this.currentDraw.toFixed(1)}mA > ${this.props.maxCurrent}mA)`);
    }

    // Check for no current limiting resistor
    if (this.isOn && voltageDiff > this.forwardVoltage + 1.0) {
      ctx.warn('LED_NO_RESISTOR', `LED ${this.id} may need a current limiting resistor (${voltageDiff.toFixed(2)}V)`);
    }
  }

  onPinChange(pin: string, ctx: SimCtx): void {
    // LED responds to voltage changes
    this.update(0, ctx);
  }

  /**
   * Get current brightness (0-1)
   */
  getBrightness(): number {
    return this.currentBrightness;
  }

  /**
   * Get current draw in mA
   */
  getCurrentDraw(): number {
    return this.currentDraw;
  }

  /**
   * Check if LED is on
   */
  isLedOn(): boolean {
    return this.isOn;
  }

  /**
   * Get forward voltage
   */
  getForwardVoltage(): number {
    return this.forwardVoltage;
  }

  /**
   * Set brightness (0-1)
   */
  setBrightness(brightness: number): void {
    this.props.brightness = Math.max(0, Math.min(1, brightness));
    if (this.isOn) {
      this.targetBrightness = this.props.brightness;
    }
  }

  /**
   * Get component info
   */
  getInfo(): any {
    return {
      id: this.id,
      label: this.label,
      color: this.props.color,
      on: this.isOn,
      brightness: this.currentBrightness,
      currentDraw: this.currentDraw,
      forwardVoltage: this.forwardVoltage,
      maxCurrent: this.props.maxCurrent
    };
  }
}

/**
 * Create LED component
 */
export function createLed(id: string, props?: Partial<LedProps>): Led {
  return new Led(id, props);
}
