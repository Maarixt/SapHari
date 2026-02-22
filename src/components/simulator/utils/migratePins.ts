/**
 * Migrate wire endpoints when a component's variant changes (e.g. switch SPST -> SPDT).
 * Returns updated wires and list of wire ids that had to be detached (for console warning).
 */

import type { Wire } from '../types';
import { migrateSwitchPin, getSwitchVariantId } from '../registry';

export interface MigrateResult {
  wires: Wire[];
  detachedWireIds: string[];
  unmappedEndpoints: { wireId: string; end: 'from' | 'to'; pinId: string }[];
}

/**
 * Migrate wires attached to componentId when its variant changes from oldVariantId to newVariantId.
 * Only supports switch for now; other types no-op (wires unchanged).
 */
export function migrateWiresOnVariantChange(
  componentId: string,
  oldVariantId: string,
  newVariantId: string,
  componentType: string,
  wires: Wire[]
): MigrateResult {
  const detachedWireIds: string[] = [];
  const unmappedEndpoints: { wireId: string; end: 'from' | 'to'; pinId: string }[] = [];
  const oldV = oldVariantId || getSwitchVariantId(undefined);
  const newV = newVariantId;

  if (componentType !== 'switch' && (componentType as string) !== 'toggle-switch') {
    return { wires: [...wires], detachedWireIds, unmappedEndpoints };
  }

  const mapPin = (pinId: string): string | undefined => migrateSwitchPin(oldV, newV, pinId);

  const newWires = wires.map((w) => {
    let from = w.from;
    let to = w.to;
    let fromDetach = false;
    let toDetach = false;

    if (w.from.componentId === componentId) {
      const mapped = mapPin(w.from.pinId);
      if (mapped === undefined) {
        unmappedEndpoints.push({ wireId: w.id, end: 'from', pinId: w.from.pinId });
        fromDetach = true;
      } else {
        from = { componentId: w.from.componentId, pinId: mapped };
      }
    }
    if (w.to.componentId === componentId) {
      const mapped = mapPin(w.to.pinId);
      if (mapped === undefined) {
        unmappedEndpoints.push({ wireId: w.id, end: 'to', pinId: w.to.pinId });
        toDetach = true;
      } else {
        to = { componentId: w.to.componentId, pinId: mapped };
      }
    }

    if (fromDetach || toDetach) {
      detachedWireIds.push(w.id);
      return null; // remove wire
    }
    if (from.componentId === w.from.componentId && from.pinId === w.from.pinId && to.componentId === w.to.componentId && to.pinId === w.to.pinId) {
      return w;
    }
    return { ...w, from, to, points: undefined };
  });

  const filtered = newWires.filter((w): w is Wire => w !== null);
  return { wires: filtered, detachedWireIds, unmappedEndpoints };
}
