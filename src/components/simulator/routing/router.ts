/**
 * Manhattan (orthogonal) wire routing on a grid. Uses A* with 4-neighbor grid.
 * Returns flat points array [x0,y0, x1,y1, ...] from start to end.
 */

import type { ObstacleRect } from './obstacles';
import { rectContains } from './obstacles';
import { snapToWireGrid } from '../helpers';

const GRID = 10;

function key(x: number, y: number): string {
  return `${Math.round(x / GRID) * GRID},${Math.round(y / GRID) * GRID}`;
}

function neighbors(nx: number, ny: number): [number, number][] {
  return [
    [nx + GRID, ny],
    [nx - GRID, ny],
    [nx, ny + GRID],
    [nx, ny - GRID],
  ];
}

function blocked(obstacles: ObstacleRect[], x: number, y: number): boolean {
  return obstacles.some((r) => rectContains(r, x, y));
}

/**
 * Manhattan route from start to end, avoiding obstacles. Grid-aligned.
 * Returns flat array of points [x0,y0, x1,y1, ...] or simple L-path if no obstacles.
 */
export function routeManhattan(
  start: { x: number; y: number },
  end: { x: number; y: number },
  obstacles: ObstacleRect[],
  gridSize: number = GRID
): number[] {
  const sx = snapToWireGrid(start.x);
  const sy = snapToWireGrid(start.y);
  const ex = snapToWireGrid(end.x);
  const ey = snapToWireGrid(end.y);

  const simple = simpleOrthogonalPath(sx, sy, ex, ey);
  const hits = obstacles.some(
    (r) =>
      rectIntersectsSegment(r, simple[0]!, simple[1]!, simple[2]!, simple[3]!) ||
      (simple.length >= 6 && rectIntersectsSegment(r, simple[2]!, simple[3]!, simple[4]!, simple[5]!))
  );
  if (!hits) return simple;

  const grid = gridSize;
  const startKey = key(sx, sy);
  const endKey = key(ex, ey);
  const open: { k: string; x: number; y: number; g: number; h: number }[] = [
    { k: startKey, x: sx, y: sy, g: 0, h: Math.abs(sx - ex) + Math.abs(sy - ey) },
  ];
  const cameFrom = new Map<string, { x: number; y: number }>();
  const gScore = new Map<string, number>();
  gScore.set(startKey, 0);

  while (open.length > 0) {
    open.sort((a, b) => a.g + a.h - (b.g + b.h));
    const cur = open.shift()!;
    if (cur.k === endKey) {
      const path: number[] = [];
      let u: { x: number; y: number } | undefined = { x: cur.x, y: cur.y };
      while (u) {
        path.push(u.x, u.y);
        u = cameFrom.get(key(u.x, u.y));
      }
      path.reverse();
      return path;
    }
    for (const [nx, ny] of neighbors(cur.x, cur.y)) {
      if (blocked(obstacles, nx, ny)) continue;
      const nk = key(nx, ny);
      const tentative = cur.g + grid;
      if (tentative >= (gScore.get(nk) ?? Infinity)) continue;
      cameFrom.set(nk, { x: cur.x, y: cur.y });
      gScore.set(nk, tentative);
      open.push({
        k: nk,
        x: nx,
        y: ny,
        g: tentative,
        h: Math.abs(nx - ex) + Math.abs(ny - ey),
      });
    }
  }

  return simple;
}

function rectIntersectsSegment(
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
  for (let t = 0; t <= 1; t += 0.05) {
    const x = x1 + t * (x2 - x1);
    const y = y1 + t * (y2 - y1);
    if (x >= r.left && x <= rMaxX && y >= r.top && y <= rMaxY) return true;
  }
  return false;
}

function simpleOrthogonalPath(x1: number, y1: number, x2: number, y2: number): number[] {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return [x1, y1, x2, y1, x2, y2];
  }
  return [x1, y1, x1, y2, x2, y2];
}
