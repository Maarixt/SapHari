/**
 * Obstacle rectangles for wire routing (component bounding boxes + padding).
 */

import type { SimState } from '../types';
import { getComponentBbox } from '../helpers';
import type { ViewMode } from '../visual/footprints';

export interface ObstacleRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const PADDING = 12;

/**
 * Get obstacle rectangles for all components (for A* routing).
 * Excludes the component that owns the start or end pin when routing a single wire.
 */
export function getObstacles(
  state: SimState,
  viewMode?: ViewMode,
  excludeComponentIds?: Set<string>
): ObstacleRect[] {
  const rects: ObstacleRect[] = [];
  for (const c of state.components) {
    if (excludeComponentIds?.has(c.id)) continue;
    const bbox = getComponentBbox(state, c.id, viewMode);
    if (!bbox) continue;
    rects.push({
      left: bbox.left - PADDING,
      top: bbox.top - PADDING,
      width: bbox.width + PADDING * 2,
      height: bbox.height + PADDING * 2,
    });
  }
  return rects;
}

export function rectContains(rect: ObstacleRect, x: number, y: number): boolean {
  return (
    x >= rect.left &&
    x <= rect.left + rect.width &&
    y >= rect.top &&
    y <= rect.top + rect.height
  );
}

export function rectIntersectsSegment(
  rect: ObstacleRect,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): boolean {
  const r = rect;
  const rMaxX = r.left + r.width;
  const rMaxY = r.top + r.height;
  const segMinX = Math.min(x1, x2);
  const segMaxX = Math.max(x1, x2);
  const segMinY = Math.min(y1, y2);
  const segMaxY = Math.max(y1, y2);
  if (segMaxX < r.left || segMinX > rMaxX || segMaxY < r.top || segMinY > rMaxY) return false;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return rectContains(rect, x1, y1);
  for (let t = 0; t <= 1; t += 0.05) {
    const x = x1 + t * dx;
    const y = y1 + t * dy;
    if (rectContains(rect, x, y)) return true;
  }
  return false;
}
