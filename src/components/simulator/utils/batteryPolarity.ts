/**
 * Battery polarity by rotation: which side is + and which is −.
 * Terminal positions (left/right/top/bottom) are relative to the component footprint.
 * Solver always uses pin "pos" = high, "neg" = low; footprint pin positions + rotation
 * determine where those pins appear on screen.
 */

export type Rot = 0 | 90 | 180 | 270;

export type TerminalSide = 'left' | 'right' | 'top' | 'bottom';

export function getBatteryPolarity(rotation: Rot): { pos: TerminalSide; neg: TerminalSide } {
  switch (rotation) {
    case 0:
      return { pos: 'left', neg: 'right' } as const;
    case 180:
      return { pos: 'right', neg: 'left' } as const;
    case 90:
      return { pos: 'top', neg: 'bottom' } as const;
    case 270:
      return { pos: 'bottom', neg: 'top' } as const;
  }
}

/** Terminal positions in local footprint coords (origin top-left). Use for workbench 90x120. */
export function getBatteryTerminalPositions(
  width: number,
  height: number
): Record<TerminalSide, { x: number; y: number }> {
  const w = width;
  const h = height;
  return {
    left: { x: 0, y: h / 2 },
    right: { x: w, y: h / 2 },
    top: { x: w / 2, y: 0 },
    bottom: { x: w / 2, y: h },
  };
}
