/**
 * Material system: shared Konva styling so PCB, plastic, metal, pins, and LEDs
 * stay consistent across ESP32, LED, button, etc. Components reference these
 * instead of hardcoded colors; Phase 4 realistic renderers use the same set.
 */

/** Konva-friendly props that can be spread onto Rect, Circle, etc. */
export interface MaterialProps {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffset?: { x: number; y: number };
  shadowOpacity?: number;
  opacity?: number;
  listening?: boolean;
}

export const materials = {
  /** PCB substrate (green). */
  pcb: {
    fill: '#2d5016',
    stroke: '#1a3009',
    strokeWidth: 1,
    shadowColor: '#000',
    shadowBlur: 4,
    shadowOffset: { x: 1, y: 1 },
    shadowOpacity: 0.3,
  } satisfies MaterialProps,

  /** Dark PCB (e.g. ESP32 DevKit). */
  pcbDark: {
    fill: '#0f172a',
    stroke: '#1e293b',
    strokeWidth: 1,
    shadowColor: '#000',
    shadowBlur: 8,
    shadowOffset: { x: 2, y: 2 },
    shadowOpacity: 0.35,
  } satisfies MaterialProps,

  /** Plastic housing. */
  plastic: {
    fill: '#374151',
    stroke: '#4b5563',
    strokeWidth: 1,
    shadowColor: '#000',
    shadowBlur: 4,
    shadowOffset: { x: 2, y: 2 },
    shadowOpacity: 0.25,
  } satisfies MaterialProps,

  /** Metal shields, connectors. */
  metal: {
    fill: '#6b7280',
    stroke: '#9ca3af',
    strokeWidth: 1,
    shadowColor: '#000',
    shadowBlur: 6,
    shadowOffset: { x: 1, y: 1 },
    shadowOpacity: 0.35,
  } satisfies MaterialProps,

  /** Silkscreen label ink. */
  silkscreen: {
    fill: '#e5e7eb',
    stroke: undefined,
    strokeWidth: 0,
    opacity: 0.9,
  } satisfies MaterialProps,

  /** LED body when on (with glow). */
  ledOn: {
    fill: '#22c55e',
    stroke: '#16a34a',
    strokeWidth: 1,
    shadowColor: '#22c55e',
    shadowBlur: 12,
    shadowOffset: { x: 0, y: 0 },
    shadowOpacity: 0.6,
  } satisfies MaterialProps,

  /** LED body when off. */
  ledOff: {
    fill: '#334155',
    stroke: '#475569',
    strokeWidth: 1,
    shadowColor: '#000',
    shadowBlur: 2,
    shadowOffset: { x: 1, y: 1 },
    shadowOpacity: 0.2,
  } satisfies MaterialProps,

  /** Pin pad / leg (gold-ish). */
  goldPin: {
    fill: '#eab308',
    stroke: '#a16207',
    strokeWidth: 1,
    shadowColor: '#000',
    shadowBlur: 2,
    shadowOffset: { x: 0, y: 0 },
    shadowOpacity: 0.2,
  } satisfies MaterialProps,
} as const;

export type MaterialKey = keyof typeof materials;
