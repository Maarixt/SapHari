/**
 * Coordinate validation: never pass NaN/undefined to Konva.
 * Use isFiniteNum / safePoint everywhere we compute x,y for rendering.
 */

export function isFiniteNum(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

/**
 * Returns { x, y } only if both are finite numbers; otherwise null.
 * Use before passing coords to Konva (Line points, Circle x/y, etc.).
 */
export function safePoint(x: unknown, y: unknown): { x: number; y: number } | null {
  if (!isFiniteNum(x) || !isFiniteNum(y)) return null;
  return { x, y };
}

/** Coerce to number, default 0 if not finite. Use for component.x/y when you must have a number. */
export function finiteNum(value: unknown, fallback: number = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Sanitize a points array [x0,y0, x1,y1, ...] for Konva Line.
 * Replaces any non-finite value with 0. Returns new array; never mutates.
 * If the result would be all zeros or invalid, returns null so caller can skip rendering.
 */
export function sanitizePoints(points: number[]): number[] | null {
  if (!Array.isArray(points) || points.length < 4) return null;
  const out: number[] = [];
  for (let i = 0; i < points.length; i++) {
    const v = points[i];
    out.push(isFiniteNum(v) ? v : 0);
  }
  return out;
}

/** True if every element of points is a finite number. */
export function allPointsFinite(points: number[]): boolean {
  if (!Array.isArray(points) || points.length < 4) return false;
  for (let i = 0; i < points.length; i++) {
    if (!isFiniteNum(points[i])) return false;
  }
  return true;
}
