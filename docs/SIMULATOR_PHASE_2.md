# Simulator Phase 2

Phase 2 adds an internal event bus, rubber-band wire preview, zoom/pan, real Save/Load (Supabase + localStorage), and an optional Worker-based simulation engine.

## Event bus

- **Module:** `src/components/simulator/events/simEvents.ts`
- **API:** `publish(eventType, payload?)`, `subscribe(eventType, handler) => unsubscribe`
- **Event types:** `SET_OUTPUT`, `SET_SERVO`, `SHORT_CIRCUIT`, `WARNING`, `SENSOR_UPDATE`
- **Usage:** runLoop subscribes to `SET_OUTPUT` / `SET_SERVO` to apply MQTT overrides. mqttBridge and engine publish instead of using `window.dispatchEvent`. SimulatorModal subscribes to `SHORT_CIRCUIT` for the toast.
- **Rule:** New code must not use window events for sim; use `simEvents` only.

## Zoom / pan

- **Viewport state:** In circuit store: `viewport: { scale, offsetX, offsetY }`. Default `{ scale: 1, offsetX: 0, offsetY: 0 }`.
- **Controls:**
  - **Mouse wheel:** Zoom in/out centered on the cursor (scale clamped 0.2–4).
  - **Middle mouse drag** or **Space + left drag:** Pan.
  - **Reset view** button in the toolbar: resets scale to 1 and offset to (0, 0).
- **Implementation:** CircuitScene wraps all content in a Konva Group with `x`, `y`, `scaleX`, `scaleY` from viewport. Grid is drawn in circuit space (large fixed range). Snapping stays in circuit coordinates.

## Rubber-band wire preview

- **Behavior:** Click a pin to start a wire; a dashed line follows the pointer until you click a second pin (commit) or press **Esc** (cancel).
- **Store:** `pointerPosition` (circuit coords) is updated on stage mouse move when `activeWireStart` is set; cleared on cancel/commit and on mouse leave.
- **Commit:** Wire is created only when the second pin is valid (`canCommitWire`); no commit on invalid pin (toast shown instead).

## Save / Load

- **Table:** `public.sim_circuits`
  - `id` uuid PK, `user_id` uuid NOT NULL references `auth.users`, `name` text, `json` jsonb, `created_at`, `updated_at`
  - RLS: users can SELECT/INSERT/UPDATE/DELETE only rows where `auth.uid() = user_id`
- **API (supabase.ts):** `saveCircuit(name, state, userId)`, `loadCircuits()`, `loadCircuit(id)`, `deleteCircuit(id)`
- **LocalStorage fallback:** Key `saphari:lastCircuit`. On Save we also write the circuit here. “Load last (local)” and fallback when Supabase fails use this key.

## Worker mode

- **Toggle:** In development only, toolbar shows “UI Loop” and “Worker” buttons. Choice is persisted in `saphari:simRuntimeMode`.
- **UI_LOOP:** Current behavior; `startLoop` from runLoop.ts runs on the main thread.
- **WORKER:** Worker is created from `src/sim/worker.ts`. Flow: `INIT` (payload: state from `toCoreState(circuitState)`), then `PLAY`. On stop we send `PAUSE` and terminate the worker on cleanup. Worker posts `STATE` and optionally `WARNING`; we call `replaceSimState(fromCoreState(payload.state))` and `publish('WARNING', payload)`.
- **Adapters:** `sim/adapters.ts` — `toCoreState(CircuitState)` → sim/core `SimState`, `fromCoreState(coreState)` → `{ components, wires }` for the UI store.
- **Known limitations:** Worker mode is experimental. Not all component types may be fully mapped; MQTT/audio and timing may differ from UI loop. If worker creation fails, runtime falls back to UI loop.
