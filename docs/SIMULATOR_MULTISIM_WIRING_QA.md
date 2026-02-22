# Simulator: Multisim-style wiring — QA & dev test checklist

This checklist covers the upgrade to **polyline wires**, **explicit junction nodes**, and **parallel-circuit** behavior. Use it for manual QA and when adding automated tests.

---

## 1. Polyline wires

- [ ] **Start from pin:** Wire tool → click component pin → drag → release on another pin. Wire commits with a single segment (or with corners if you added any).
- [ ] **Add corners:** Wire tool → start from pin → click on **empty** canvas (no pin/junction/wire). A corner is added; rubber band continues from that corner. Add several corners, then release on a pin or junction. Wire stores all corners.
- [ ] **Cancel wire:** While drawing (wire started): press **Enter** → wire is cancelled. Or **double-click** on canvas → wire is cancelled. No stray wire is committed.
- [ ] **Snap threshold:** Pin/junction snap feels consistent at ~8–12 px (constant `SNAP_THRESHOLD_PX = 10` in SimulatorModal). Same behavior in Workbench and Schematic views.

---

## 2. Junction tool

- [ ] **Toolbar:** "Junction" button is visible next to Select/Wire. Clicking it sets tool to `junction` (button shows secondary style).
- [ ] **Place on canvas:** Junction tool → click on empty canvas → a junction (solid dot) appears at that point. It can be selected, moved, deleted.
- [ ] **Tap wire to create junction:** Junction tool → click on an **existing wire segment** (within snap threshold) → a junction is created at the closest point on the segment, and the wire is **split** into two wires both connected to the new junction. No “almost connected” visuals; both segments share the node.
- [ ] **Wire tool + wire tap:** Wire tool → start from a pin → release on an existing wire (tap) → wire commits to a new junction created at tap point (junction + split). Same as above from wire tool.

---

## 3. Node degree (junctions with ≥3 connections)

- [ ] **Visual:** A junction with **3 or more** wires attached is drawn slightly **larger** and with an **outer ring** (workbench and schematic). Junctions with 1–2 connections remain a single small dot.
- [ ] **Stable:** Moving components or wires doesn’t drop the ring; re-render correctly shows degree from current wire attachments.

---

## 4. Acceptance tests (parallel & crossing)

### Test A — Simple parallel (reference style)

1. Place a battery (or DC supply) and a top horizontal wire from `+`.
2. Insert **junctions** on the top wire at positions above where R1 and R2 will sit.
3. Place R1 and R2; connect each from a top junction down to a **bottom rail** (one wire).
4. Insert junctions on the bottom rail for the return connections.

**Expected:** R1 and R2 share the same top node and same bottom node (parallel). Same voltage across both; currents split. Netlist/nets treat junctions as normal nodes.

### Test B — Branch from mid-wire

1. Draw a wire from battery `+` to a resistor.
2. **Tap** the middle of that wire (Junction tool or Wire tool release on wire) to insert a junction.
3. Draw another resistor branch from that junction to ground (or another node).

**Expected:** The new branch shares the same node as the first segment. No “almost connected” appearance; one electrical node.

### Test C — Crossing wires (no connection without junction)

1. Draw two wires that **cross** on the canvas (no junction at the cross point).

**Expected:** **No** electrical connection at the crossing. If you want them connected, place a junction at the crossing and connect both wires to it.

---

## 5. View switching (workbench ↔ schematic)

- [ ] Create junctions and polyline wires in **Workbench**. Switch to **Schematic**. Junctions and wires keep correct connectivity; wire shape uses schematic points where set.
- [ ] Create junctions and polyline wires in **Schematic**. Switch to **Workbench**. Same: connections and junctions preserved; no duplicate or missing wires.

---

## 6. Developer / debug

- [ ] **Dev logs (DEV only):** In browser console (dev build), when placing a junction on canvas you see something like: `[Simulator] Junction placed at canvas: <id>`. When creating a junction by wire tap: `[Simulator] Junction created by wire tap: <id>`.
- [ ] **Snap constant:** `SNAP_THRESHOLD_PX` is defined once (e.g. 10) and used for pin, junction, and wire-segment hit testing in both views.
- [ ] **Netlist:** `buildNets` (or equivalent) includes junction pins (`"J"`) in pinKey / union; junction pins can have multiple wires; parallel branches end up in the same net.

---

## Quick dev test checklist (minimal pass)

1. Wire tool → pin to pin → commit.
2. Wire tool → pin → click empty (add corner) → pin → commit; inspect wire `points`.
3. Wire tool → start → Enter (cancel).
4. Junction tool → click canvas → junction appears; move/delete.
5. Junction tool → click existing wire → junction + split; two wires, one node.
6. Create 3 wires to one junction → junction shows ring/larger.
7. Two crossing wires, no junction → nets not shared.
8. Switch Workbench ↔ Schematic → junctions and wires still correct.
