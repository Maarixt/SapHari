/**
 * 4-Leg Tactile Switch Component
 * Realistic tactile switch with proper internal shorts and net bridging
 */

import { Component, SimCtx } from '../core/types';
import { addBridge, removeBridge } from '../core/engine';

export interface TactSwitchProps {
  label?: string;
  bounceMs: number;          // 5–12 ms
  contactResistance: number; // 0.05–0.2 Ω
  orientation: 0 | 90 | 180 | 270;
}

export default class TactSwitch4 implements Component {
  id: string;
  label: string;
  pins: Record<string,string>; // A1,A2,B1,B2 -> netIds
  props: TactSwitchProps;
  powerDrawmA: number = 0;

  private pressed = false;
  private bouncing = false;
  private lastToggleAt = 0;

  constructor(id: string, pins: Record<string,string>, props?: Partial<TactSwitchProps>) {
    this.id = id;
    this.pins = pins;
    this.props = {
      label: 'PUSH-BTN',
      bounceMs: 10,
      contactResistance: 0.08,
      orientation: 0,
      ...props
    };
    this.label = this.props.label!;
  }

  init(ctx: SimCtx) {
    // Always short the pair on each side regardless of press
    this.applySideShorts(true);
  }

  /** UI calls on pointer down/up */
  setPressed(next: boolean, ctx: SimCtx, nowMs: number) {
    if (this.pressed === next) return;
    this.pressed = next;
    this.bouncing = true;
    this.lastToggleAt = nowMs;

    // During bounce, we can jitter bridges quickly; simplest is a delayed settle.
    ctx.schedule(() => {
      this.bouncing = false;
      this.applyBridges();
    }, this.props.bounceMs);

    this.applyBridges(); // immediate (noisy) effect
  }

  update(_dt: number, _ctx: SimCtx) {
    // nothing per tick; bridges are event-driven
  }

  onPinChange(pin: string, ctx: SimCtx): void {
    // Switch doesn't respond to external pin changes
  }

  /** Maintain internal constant pair shorts + pressed bridge. */
  private applyBridges() {
    this.applySideShorts(false);
    if (this.pressed) {
      // Bridge A side to B side
      const a = [this.pins.A1, this.pins.A2].filter(Boolean)[0];
      const b = [this.pins.B1, this.pins.B2].filter(Boolean)[0];
      if (a && b) {
        addBridge({
          id: this.id + ':press',
          resistanceOhm: this.props.contactResistance,
          pairs: [[a, b]]
        });
      }
    } else {
      removeBridge(this.id + ':press');
    }
  }

  /** A1<->A2 and B1<->B2 are always shorted internally. */
  private applySideShorts(initial: boolean) {
    const A1 = this.pins.A1, A2 = this.pins.A2;
    const B1 = this.pins.B1, B2 = this.pins.B2;
    const aId = this.id + ':A';
    const bId = this.id + ':B';
    if (A1 && A2) addBridge({ id: aId, resistanceOhm: 0.02, pairs: [[A1, A2]] });
    if (B1 && B2) addBridge({ id: bId, resistanceOhm: 0.02, pairs: [[B1, B2]] });
    if (!initial) return;
  }

  getPressed(): boolean {
    return this.pressed;
  }

  isBouncing(): boolean {
    return this.bouncing;
  }

  getInfo(): any {
    return {
      id: this.id,
      label: this.label,
      pressed: this.pressed,
      bouncing: this.bouncing,
      orientation: this.props.orientation,
      contactResistance: this.props.contactResistance
    };
  }
}

/**
 * Create Tactile Switch component
 */
export function createTactSwitch4(id: string, pins: Record<string, string>, props?: Partial<TactSwitchProps>): TactSwitch4 {
  return new TactSwitch4(id, pins, props);
}
