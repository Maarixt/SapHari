# Simulator UX + Physics Consistency — Write-Path Report & Verification

## 1) Write-path report

### Deletion via keyboard
- **SimulatorModal.tsx**  
  - `useEffect` with `onKey` (keydown): **only** `e.key === 'Delete'` calls `deleteSelected()`.  
  - `e.key === 'Backspace'` calls `e.preventDefault()` and returns (no state change).  
  - Guard: if `target` is INPUT, TEXTAREA, or contentEditable, handler returns without doing anything.

### GND net unioning
- **engine2/nets.ts** — `buildNets()`  
  - Collects all GND-like pin keys:  
    - `ground` component pins  
    - `dc_supply` neg  
    - `power_rail` with `props.kind === 'gnd'` (pin `out`)  
    - `esp32` pins with canonical id `gnd`  
  - Unions all of them with `uf.union(gndKeys[0], gndKeys[i])`.  
  - Reference node / netlist ground is that single global ground net.

### Current flow animation decisions
- **engine2/solve.ts** — `buildDebugAndOutputs()`  
  - Builds `activeNetIds: Set<string>` from **branch currents only**:  
    - `nodeIdxToNetId` from `netlist.nodeIndexByNetId`  
    - For each netlist component with `|branchCurrentsByComponentId[c.id]| > I_MIN_VIS` (1e-6 A), adds the two nets of that component to `activeNetIds`.  
  - Returned in `SolveResult.activeNetIds`.
- **SimulatorModal.tsx** — `useMemo` that derives `wireVoltages`, `wireEnergized`, etc.  
  - When engine2 result exists: `energized[w.id] = netId != null && (eng2.activeNetIds?.has(netId) ?? false)`.  
  - When engine2 result is absent (legacy path): `energized[w.id] = false` (no flow animation).
- **EnhancedWireNode.tsx** — `getWireStyle()`  
  - Uses `isEnergized` to show animated dash and voltage-based stroke.  
  - No voltage-only or loopClosed heuristic; only the `isEnergized` prop (driven by `activeNetIds` above).

### Panel layout rendering
- **SimulatorModal.tsx**  
  - State: `leftPanelWidth` (260–520, default 320), `leftSidebarOpen` (collapse), `resizingLeftPanel`, `resizeStartRef`.  
  - Persist: `localStorage` keys `saphari-sim-leftPanelWidth`, `saphari-sim-leftPanelCollapsed`.  
  - Left panel:  
    - Container width = `leftSidebarOpen ? leftPanelWidth : COLLAPSED_RAIL_PX` (40px when collapsed).  
    - When open: header “Parts” + collapse (ChevronLeft), `EnhancedComponentPalette`, 6px resize handle (drag updates `leftPanelWidth` with delta, clamped).  
    - When collapsed: thin rail with expand (ChevronRight).  
  - Canvas width uses `leftSidebarOpen ? leftPanelWidth : COLLAPSED_RAIL_PX` (replacing former 192/0).  
  - Styling: `border-r border-border bg-card shadow-sm`, header `bg-muted/30`.

---

## 2) Patch summary (files + behavior)

| Part | File | Change |
|------|------|--------|
| A | **SimulatorModal.tsx** | Keydown: guard input/textarea/contentEditable. Backspace → preventDefault only. Delete → preventDefault + deleteSelected(). |
| B | **engine2/nets.ts** | Collect all GND-like pins (ground, dc_supply neg, power_rail gnd, esp32 gnd); union all; single ground net. |
| C | **engine2/solve.ts** | Add `I_MIN_VIS`, `activeNetIds` in SolveResult; compute from branch currents in buildDebugAndOutputs; return activeNetIds. |
| C | **SimulatorModal.tsx** | Engine2 path: wireEnergized from activeNetIds only. Legacy path: wireEnergized = false for all. |
| D | **SimulatorModal.tsx** | leftPanelWidth state + localStorage; resize handle + delta resize; collapse/expand; COLLAPSED_RAIL_PX; canvas width from leftPanelWidth/rail. |
| Doc | **README.md** | Delete only (Backspace does nothing). |

---

## 3) Verification checklist

- [ ] **Backspace does nothing**  
  Select a component or wire, press Backspace → selection and items unchanged. No browser back navigation.

- [ ] **Delete deletes**  
  Select a component or wire, press Delete → selection and item removed.

- [ ] **GND common net closes circuit**  
  - Two GND symbols; battery neg → GND1; LED cathode → GND2; battery pos → LED anode.  
  - Expected: circuit closed, LED can light.  
  - Without any GND: battery neg as reference still solves (no regression).

- [ ] **Switch OFF → no current animation**  
  Battery+ → switch → LED → GND, battery- → GND; switch OFF.  
  Expected: no dashed current animation on any wire.

- [ ] **Switch ON → current animation on closed loop**  
  Same circuit, switch ON.  
  Expected: current animation only on the closed path (from engine2 activeNetIds).

- [ ] **Open circuit (e.g. LED cathode floating)**  
  Expected: no current animation, LED off.

- [ ] **Panel visible and readable**  
  Default width 320px; contrast and headers readable.

- [ ] **Panel resizable**  
  Drag 6px handle at right edge; width clamps 260–520; persists after refresh.

- [ ] **Panel collapsible**  
  Collapse hides content and shows thin rail; expand restores width; state persists.

- [ ] **No overlap with canvas**  
  Canvas width = viewport − left panel (or rail) − right sidebar; no clipping of controls.
