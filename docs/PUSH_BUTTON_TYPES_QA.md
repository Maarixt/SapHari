# Push Button Types QA

## Components

- `push_button_momentary` (SPST-NO spring return)
- `push_button_latch` (SPST-NO push-on/push-off)

## Expected behavior

- **Momentary**
  - default `OPEN`
  - pointer down on cap => `CLOSED`
  - pointer up/leave => `OPEN`
- **Latch**
  - default `OPEN`
  - press => toggles `CLOSED`
  - press again => toggles `OPEN`

## Acceptance tests

1. **Momentary LED pulse**
   - Wire `battery+ -> momentary -> resistor/LED -> battery-`.
   - Not pressed: LED off, no current past button.
   - Hold press: LED on and current flow appears.
   - Release: LED off immediately.

2. **Latch hold**
   - Same circuit with latch button.
   - First press: LED stays on.
   - Second press: LED turns off.

3. **Feed vs current**
   - With switch open, feed may appear up to button input side.
   - Current must not appear on output side until closed.

4. **Inspector conversion**
   - Convert momentary <-> latch in inspector.
   - Existing wires remain attached (same `P1/P2` pins).

5. **Schematic/Workbench parity**
   - Toggle in workbench and schematic.
   - `isClosed` state is consistent in both views.

