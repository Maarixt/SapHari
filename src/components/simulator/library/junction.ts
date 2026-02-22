import { nanoid } from 'nanoid';
import { createComponent } from '../types';
import type { SimComponent } from '../types';

/** Junction node (one pin "J" at center). Created when connecting to a wire midpoint; electrically a single node for net building. */
export function makeJunction(x: number, y: number, id?: string): SimComponent {
  return {
    ...createComponent('junction', x, y),
    id: id ?? 'junction-' + nanoid(6),
  };
}
