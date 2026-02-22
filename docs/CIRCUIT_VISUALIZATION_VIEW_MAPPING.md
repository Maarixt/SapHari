# Circuit Visualization and View-Mapping Upgrade

## 1) Files and functions responsible

### Wire flow rendering
- **src/components/simulator/EnhancedWireNode.tsx**
  - `EnhancedWireNodeInner`: props `wireState?: 'off' | 'feed' | 'current'`; `getWireStyle()` uses `wireState` (only `'current'` gets animated dash; `'feed'` dim style).
  - Dash animation `useEffect` runs only when `wireState === 'current'` (`showCurrentAnimation`).
- **src/components/simulator/scene/CircuitScene.tsx**
  - Props `wireStateById`, passed as `wireState={wireStateById[wire.id] ?? 'off'}` to `EnhancedWireNode`.
- **src/components/simulator/scene/CircuitSchematicScene.tsx**
  - Inline wire rendering uses `wireStateById[wire.id]` for stroke/dash/opacity (`'current'` strong, `'feed'` dim, `'off'` default).

### View switching
- **src/components/simulator/store/circuitStore.ts**
  - `SET_VIEW_MODE` reducer: sets `viewMode`, runs `repairDanglingEndpoints(simState, 12, newViewMode)` and replaces `wires` when repairs occur.
  - `setViewMode(viewMode)` dispatches `SET_VIEW_MODE`.

### Wire geometry storage
- **src/components/simulator/types.ts**
  - `Wire`: `points?`, `pointsWorkbench?`, `pointsSchematic?`.
- **src/components/simulator/store/circuitStore.ts**
  - `UPDATE_WIRE_POINTS`: payload `{ id, points, viewMode? }`; sets `points` and `pointsWorkbench` or `pointsSchematic` by view.
  - `updateWirePoints(wireId, points, viewMode?)` passes viewMode so store can write view-specific points.

### Pin snapping / endpoint resolution
- **src/components/simulator/helpers.ts**
  - `findPin(state, compId, pinId, viewMode)`: pin position from component + footprint (view-specific when viewMode set).
  - `getWirePoints(state, wire, viewMode)`: uses `pointsWorkbench` / `pointsSchematic` when set, else `points`, else `orthogonalPath(from, to)` from findPin.
  - `getWireEndpointPosition(state, wire, end, viewMode)`: returns findPin for wire from/to (anchored to pin).
  - `repairDanglingEndpoints(state, snapPx, viewMode)`: reattaches endpoints within snap of a pin; returns `{ wires, repairs }`.

### FEED vs CURRENT derivation
- **src/components/simulator/engine2/solve.ts**
  - `buildDebugAndOutputs`: builds `feedNetIds` (BFS from battery+ net over `buildConductiveAdjacency`, open switch blocks); `activeNetIds` from branch currents only.
  - `SolveResult`: `feedNetIds`, `activeNetIds`.
- **src/components/simulator/SimulatorModal.tsx**
  - useMemo: `wireStateById[w.id] = hasCurrent ? 'current' : hasFeed ? 'feed' : 'off'` from `eng2.activeNetIds` and `eng2.feedNetIds`.

---

## 2) Summary of changes

### Part 1 — FEED vs CURRENT
- **engine2/solve.ts**: Import `buildConductiveAdjacency`. Add `feedNetIds` (BFS from `netP` with conductive adjacency; open switches block). Add `feedNetIds` to `SolveResult`.
- **SimulatorModal.tsx**: Compute `wireStateById` from `feedNetIds` and `activeNetIds`; pass `wireStateById` to both scenes.
- **EnhancedWireNode.tsx**: Add prop `wireState`; only run dash animation when `wireState === 'current'`; style `'feed'` dim (dash [4,4], opacity 0.55); `'current'` keeps strong animated style.
- **CircuitScene.tsx**: Add `wireStateById` prop; pass `wireState` to `EnhancedWireNode`.
- **CircuitSchematicScene.tsx**: Add `wireStateById`; wire Line styling uses `wireState` (current strong, feed dim, off default).

### Part 2 — View mapping
- **types.ts**: Wire already has `pointsWorkbench?`, `pointsSchematic?`.
- **helpers.ts**: `mapPointWorkbenchToSchematic(x,y)`, `mapPointSchematicToWorkbench(x,y)` (grid snap). `getWirePoints` uses `pointsWorkbench` / `pointsSchematic` by viewMode, fallback `points` then orthogonal path.
- **circuitStore.ts**: `UPDATE_WIRE_POINTS` payload includes optional `viewMode`; reducer sets `pointsWorkbench` or `pointsSchematic` when viewMode provided. `updateWirePoints(wireId, points, viewMode?)`.
- **SimulatorModal.tsx**: `onWirePointsChange` calls `updateWirePoints(id, points, state.viewMode)`. `handleWireSegmentClick` calls `updateWirePoints(wireId, newPoints, s.viewMode)`.

### Part 3 — Auto-map connections
- **helpers.ts**: `getWireEndpointPosition(state, wire, end, viewMode)` returns findPin for that end. `repairDanglingEndpoints(state, snapPx, viewMode)` reattaches from/to when findPin is null using wire points + getNearestPin; returns `{ wires, repairs }`.
- **circuitStore.ts**: Import `repairDanglingEndpoints`. In `SET_VIEW_MODE`, run repair with new viewMode; if `repairs.length > 0` replace `wires` and log repairs to console.

---

## 3) Acceptance tests (manual)

- **Test A (Switch OFF feed-only):** Battery+ → wire → switch → wire → LED → battery-. Switch OFF: wire up to switch shows FEED (dim); no CURRENT anywhere; LED off. Switch ON: CURRENT along full loop only.
- **Test B (View conversion):** Build circuit in Workbench, switch to Schematic: same topology, similar wire paths, junction dots in same places. Switch back: connections unchanged.
- **Test C (Auto-map):** Multiple wires to same node; switch views 10 times; no broken endpoints, no missing junction dots; repairs (if any) logged to console.
