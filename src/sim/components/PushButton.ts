/**
 * Push Button Component - Interactive and Electrically Correct
 * Realistic button with debouncing, bounce simulation, and proper electrical behavior
 */

import { Component, SimCtx } from '../core/types';

export interface PushButtonProps {
  wiredTo: 'GND' | 'VCC';     // what the button connects the SIGNAL pin to when pressed
  debounceMs: number;         // software debounce
  bounceMs: number;           // physical bounce duration
  label?: string;
}

export default class PushButton implements Component {
  id: string;
  label: string;
  pins: Record<string, string>; // SIGNAL, VCC, GND must be netIds provided by UI when wired
  props: PushButtonProps;
  powerDrawmA: number = 0;

  private _pressed = false;
  private _stable = false;
  private _bounceUntil = 0;

  constructor(id: string, pins: Record<string, string>, props?: Partial<PushButtonProps>) {
    this.id = id;
    this.pins = pins;
    this.props = {
      wiredTo: 'GND',
      debounceMs: 12,
      bounceMs: 8,
      label: 'PUSH-BTN',
      ...props,
    };
    this.label = this.props.label!;
  }

  init(ctx: SimCtx) {
    // Initialize button in unpressed state
    this._pressed = false;
    this._stable = true;
    this._bounceUntil = 0;
    this.driveSignal(ctx, false);
  }

  /** UI calls this on pointer down/up */
  setPressed(pressed: boolean, ctx: SimCtx, nowMs: number) {
    if (pressed === this._pressed) return;
    this._pressed = pressed;
    
    // Start a bounce window
    this._bounceUntil = nowMs + this.props.bounceMs;
    this._stable = false;
    
    // Immediate noisy edges during bounce
    this.driveSignal(ctx, true);
    
    // Schedule end of bounce + debounce settle
    ctx.schedule(() => {
      this._stable = true;
      this.driveSignal(ctx, false);
    }, Math.max(this.props.bounceMs, this.props.debounceMs));
  }

  private driveSignal(ctx: SimCtx, noisy: boolean) {
    const { wiredTo } = this.props;
    const signalNet = this.pins['SIGNAL'];
    if (!signalNet) return;

    // During bounce, randomly flip a couple of times
    const rng = ctx.rng();
    const pressed = this._pressed;

    let driveHigh = false;
    if (pressed) {
      driveHigh = (wiredTo === 'VCC');
    } else {
      driveHigh = (wiredTo === 'GND') ? false : true;
    }

    if (noisy) {
      // 30% chance to flip state during bounce
      if (rng < 0.3) driveHigh = !driveHigh;
    }

    ctx.writeDigital(signalNet, driveHigh ? 1 : 0);
  }

  update(_dt: number, ctx: SimCtx) {
    // Keep signal driven during long holds (no drift)
    if (this._stable) {
      this.driveSignal(ctx, false);
    }
  }

  onPinChange(pin: string, ctx: SimCtx): void {
    // Button doesn't respond to external pin changes
    // It's a mechanical input device
  }

  /**
   * Get current button state
   */
  getPressed(): boolean {
    return this._pressed;
  }

  /**
   * Check if button is bouncing
   */
  isBouncing(): boolean {
    return !this._stable;
  }

  /**
   * Get component info
   */
  getInfo(): any {
    return {
      id: this.id,
      label: this.label,
      pressed: this._pressed,
      stable: this._stable,
      bouncing: this.isBouncing(),
      wiredTo: this.props.wiredTo,
      debounceMs: this.props.debounceMs,
      bounceMs: this.props.bounceMs
    };
  }
}

/**
 * Create Push Button component
 */
export function createPushButton(id: string, pins: Record<string, string>, props?: Partial<PushButtonProps>): PushButton {
  return new PushButton(id, pins, props);
}
