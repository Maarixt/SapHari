# Simulator: Wiring UX, Select, Power Rails, Pull-ups

This document records the implemented wiring UX, select-all, placeable power rails, and pull-up/pull-down resistor behavior delivered after Phase 2.

**Related:** See [SIMULATOR_PHASE_2.md](SIMULATOR_PHASE_2.md) for event bus, zoom/pan, rubber-band wire preview, Save/Load, and Worker mode.

---

## A) Drag-to-wire and hover

**A2 (finished):** In `SimulatorModal`, overlay refs (`overlayLayerRef`, `pinRingRef`, `ghostDotRef`) are added and passed to `CircuitScene`. In `handleStageMouseMove` when the tool is wire, a single rAF now:

- Updates the rubber-band line when dragging.
- Uses `getNearestPin` and `getHitTarget` to drive the pin highlight ring and ghost junction dot on the overlay.
- Shows a red ring and `not-allowed` cursor when the hovered pin is invalid for commit; otherwise `crosshair`.
- Calls `overlayLayerRef.batchDraw()` (no React state on move). Overlay and cursor are cleared when the tool is not wire and on stage mouse leave.

---

## B) Select

**B2:** Ctrl/Cmd+A in the modal keydown handler: compute viewport bounds in circuit coords from stage size and viewport scale/offset, call `getComponentsAndWiresInBox`, then `selectBox(componentIds, wireIds, false)` (replace selection).

---

## C) Power rails

- **types.ts:** Added `power_rail` to the component type union and to `COMPONENT_DEFINITIONS` with `props: { kind: '3v3'|'vin'|'gnd' }` and one pin `out`.
- **library/parts.ts:** Added `makePowerRailByKind(kind, x, y)` returning a `power_rail` component.
- **library/categories.ts:** Under Wiring, added three palette entries: 3V3 Rail, VIN Rail, GND Rail.
- **EnhancedComponentPalette:** `createComponent` maps `power-3v3` / `power-vin` / `power-gnd` to `makePowerRailByKind('3v3'|'vin'|'gnd', x, y)`.
- **engine.ts assignVoltages:** For each net pin, if component is `power_rail`, set `has3v` / `hasVin` / `hasGnd` from `props.kind`; if `power`, use `props.voltage` (< 4 → 3V3, else VIN); if `ground`, set `hasGnd`.
- **footprints.ts:** Registered `power_rail` footprint (44×24, pin `out` at center).
- **SimComponentNode:** Rendered `power_rail` as a short strip (color by kind), label 3V3/VIN/GND, one pin and delete control.

---

## D) Pull-up/pull-down and floating

- **D1 – Resistor:** In `types.ts`, resistor `props` include `mode: 'series'|'pullup'|'pulldown'`. In `library/parts.ts`, `makeResistor` accepts `mode` and uses 10kΩ for pull-up/pull-down. In `EnhancedComponentPalette`, the resistor inspector has a Mode dropdown (Series / Pull-up to 3V3 / Pull-down to GND) and shows Ohms.
- **D2 – assignVoltages:** In the pin loop, set `hasPullup` / `hasPulldown` when a resistor has `mode === 'pullup'` / `'pulldown'`. After strong sources, if the net voltage is still unset, set it to 3.3 if `hasPullup`, else 0 if `hasPulldown`. Then a button-override pass: build `pinToNetId`; for each net (skip if already 0), if any pin is a button pin with `pressed === true` and the button’s other pin is on a net with voltage 0, set this net’s voltage to 0.
- **D3 – FLOATING_INPUT:** After `assignVoltages`, for nets with `voltage === undefined`, if the net has at least one ESP32 GPIO pin, emit `WARNING` with `code: 'FLOATING_INPUT'`. Pull-up/pull-down is connectivity-based; pressed buttons merge their pins in buildNets.

---

## Manual sanity checks

Quick tests to verify correctness:

1. **GPIO with pull-up to 3V3:** Open circuit reads HIGH; when button connects that net to GND, it reads LOW.
2. **Pull-up not tied to 3V3:** Resistor in pull-up mode but not wired to 3V3 does nothing; the signal net remains floating and (if it is a GPIO net) shows FLOATING_INPUT.
3. **Button between 3V3 and GPIO:** When pressed, GPIO net is shorted to 3V3 and reads HIGH (no special GND logic).
4. **Conflicting GPIO outputs:** Two GPIOs driving the same net still produce CONFLICT_GPIO.

---

## Build

`npm run build` completes successfully with these changes.
