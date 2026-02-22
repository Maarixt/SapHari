/**
 * Transform pin position by component rotation and flip.
 * Pins are in local coordinates; anchor is the rotation/flip center (e.g. footprint center).
 */

import type { RotationDeg } from '../types';

export function normalizeRotation(r: number | undefined): RotationDeg {
  if (r === undefined || r === null) return 0;
  const n = Math.round(Number(r)) % 360;
  if (n === 0 || n === 360) return 0;
  if (n === 90 || n === -270) return 90;
  if (n === 180 || n === -180) return 180;
  if (n === 270 || n === -90) return 270;
  return 0;
}

/**
 * Transform a pin offset in local component space:
 * center at anchor, apply flipX, flipY, then rotation.
 * Returns offset from anchor (caller: world = component.x + result.x, component.y + result.y).
 */
export function transformPinPosition(
  localX: number,
  localY: number,
  anchorX: number,
  anchorY: number,
  rotation: number | undefined,
  flipX: boolean | undefined,
  flipY: boolean | undefined
): { x: number; y: number } {
  let cx = localX - anchorX;
  let cy = localY - anchorY;
  if (flipX) cx = -cx;
  if (flipY) cy = -cy;
  const r = normalizeRotation(rotation);
  let dx: number, dy: number;
  switch (r) {
    case 90:
      dx = -cy;
      dy = cx;
      break;
    case 180:
      dx = -cx;
      dy = -cy;
      break;
    case 270:
      dx = cy;
      dy = -cx;
      break;
    default:
      dx = cx;
      dy = cy;
  }
  return { x: dx, y: dy };
}
