/**
 * Adapters between UI circuit store (components/simulator) and sim/core state.
 * Used when running simulation in Worker mode.
 */

import type { CircuitState } from '../store/circuitStore';
import type { SimComponent as UIComponent, Wire as UIWire } from '../types';
import type { SimState as CoreState, SimComponent as CoreComponent, Wire as CoreWire, PinDefinition } from '../../../sim/core/types';

const CORE_PIN_KINDS = ['digital', 'analog', 'power', 'ground', 'i2c', 'spi', 'pwm', 'adc'] as const;

function toCorePinKind(uiKind: string): PinDefinition['kind'] {
  if (CORE_PIN_KINDS.includes(uiKind as PinDefinition['kind'])) return uiKind as PinDefinition['kind'];
  return 'digital';
}

/** Convert UI circuit state to sim/core state for worker INIT. */
export function toCoreState(circuitState: CircuitState): CoreState {
  const components: CoreComponent[] = circuitState.components.map((c: UIComponent) => ({
    id: c.id,
    type: c.type,
    x: c.x,
    y: c.y,
    rotation: c.rotation ?? 0,
    pins: c.pins.map((p) => ({
      id: p.id,
      label: p.label,
      kind: toCorePinKind(p.kind),
      gpio: p.gpio,
      x: p.x,
      y: p.y,
    })),
    props: c.props ?? {},
  }));

  const wires: CoreWire[] = circuitState.wires.map((w: UIWire) => ({
    id: w.id,
    from: w.from,
    to: w.to,
    color: w.color,
  }));

  return {
    components,
    wires,
    running: circuitState.running,
    time: 0,
    timeScale: 1,
    seed: 0,
    schemaVersion: '1',
  };
}

/** Extract components and wires from core state for replaceSimState. */
export function fromCoreState(core: CoreState): { components: UIComponent[]; wires: UIWire[] } {
  const components: UIComponent[] = core.components.map((c: CoreComponent) => ({
    id: c.id,
    type: c.type as UIComponent['type'],
    x: c.x,
    y: c.y,
    rotation: c.rotation,
    pins: c.pins.map((p) => ({
      id: p.id,
      label: p.label,
      kind: p.kind as UIComponent['pins'][0]['kind'],
      gpio: p.gpio,
      x: p.x,
      y: p.y,
    })),
    props: c.props ?? {},
  }));

  const wires: UIWire[] = core.wires.map((w: CoreWire) => ({
    id: w.id,
    from: w.from,
    to: w.to,
    color: w.color ?? 'red',
  }));

  return { components, wires };
}
