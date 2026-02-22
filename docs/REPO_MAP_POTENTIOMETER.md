# Repo Map: Potentiometer Integration

## Files to touch (exact paths)

| Area | File | Changes |
|------|------|---------|
| **Canonical pins** | `src/components/simulator/engine2/types.ts` | Add PIN_ALIAS (vcc→IN, signal/out→OUT, gnd→GND), CANONICAL_PINS['potentiometer'] = ['IN','OUT','GND'] |
| **Models** | `src/components/simulator/engine2/models.ts` | Add PotOutput; ComponentOutput union; R_MIN_POT constant |
| **Netlist** | `src/components/simulator/engine2/netlist.ts` | Handle type `potentiometer`: stamp R_pot_top (IN–OUT), R_pot_bot (OUT–GND); clamp R_top/R_bot to R_MIN |
| **Solve** | `src/components/simulator/engine2/solve.ts` | buildDebugAndOutputs: compute PotOutput (rTotal, alpha, rTop, rBot, vIn, vOut, vGnd, iTop, iBot, pTop, pBot); SolveResult.outputsByComponentId type |
| **Data / types** | `src/components/simulator/types.ts` | COMPONENT_DEFINITIONS.potentiometer (pins IN, OUT, GND; props rTotalOhms, alpha, taper, wiperOhms?) |
| **Factory** | `src/components/simulator/library/parts.ts` | makePotentiometer(): type `potentiometer`, pins IN/OUT/GND, props rTotalOhms, alpha, taper |
| **Footprints** | `src/components/simulator/visual/footprints.ts` | potentiometer workbench + schematic footprint (pin positions) |
| **Schematic** | `src/components/simulator/visual/SchematicPotentiometerRenderer.tsx` | New: resistor body IN–GND, wiper arrow to OUT, labels IN/OUT/GND |
| **Workbench** | `src/components/simulator/visual/WorkbenchPotentiometerRenderer.tsx` | New: pot body + knob; drag knob → alpha; tick; pin labels |
| **Scene workbench** | `src/components/simulator/scene/CircuitScene.tsx` | if comp.type === 'potentiometer' → WorkbenchPotentiometerRenderer |
| **Scene schematic** | `src/components/simulator/scene/CircuitSchematicScene.tsx` | renderSchematicSymbol: potentiometer → SchematicPotentiometerRenderer |
| **Inspector** | `src/components/simulator/Inspector.tsx` | Potentiometer section: value presets + custom, taper, alpha slider, R_top/R_bot readonly, PotOutput debug |
| **Keyboard** | `src/components/simulator/SimulatorModal.tsx` | Key handler: [ / ] (and Shift) when pot selected → update alpha |
| **Conductive path** | `src/components/simulator/engine2/conductivePath.ts` | Treat type `potentiometer` as conductive (like resistor) |
| **Palette** | `src/components/simulator/EnhancedComponentPalette.tsx` | createComponent for id `potentiometer`: pins IN, OUT, GND; props rTotalOhms, alpha, taper |
| **Library** | `src/components/simulator/library/categories.ts` | potentiometer definition: pins IN, OUT, GND; props rTotalOhms, alpha, taper |
| **RunLoop** | `src/components/simulator/runLoop.ts` | Optional: apply PotOutput to component display (e.g. alpha readout); or rely on inspector only |

## Functions

- **engine2/types.ts**: `canonPinId`, `getCanonicalPinIds`, `CANONICAL_PINS`, `PIN_ALIAS`
- **engine2/netlist.ts**: `buildNetlist` — add `c.type === 'potentiometer'` branch; `isComponentFloating` for 3-pin (all same net or any single-pin net → skip).
- **engine2/solve.ts**: `buildDebugAndOutputs` — after voltmeter loop, loop state.components for `potentiometer`, get net voltages at IN/OUT/GND, compute iTop/iBot from branchCurrentsByComponentId[`${c.id}:R_top`] etc., fill PotOutput.
- **Inspector**: `renderComponentInspector` — add `selectedComponent.type === 'potentiometer'` block.
- **SimulatorModal**: global keydown — if primarySelection?.type === 'potentiometer', `[` decrease alpha, `]` increase (step 0.01; Shift 0.05).

## New files

- `src/components/simulator/visual/SchematicPotentiometerRenderer.tsx`
- `src/components/simulator/visual/WorkbenchPotentiometerRenderer.tsx`

## Wire compatibility

- Existing wires to old `pot` (vcc/signal/gnd) unchanged. New `potentiometer` uses IN/OUT/GND; canonPinId maps vcc→IN, signal/out→OUT, gnd→GND so palette definitions using vcc/out/gnd still connect.

---

## Manual QA checklist

1. **Place & wire**
   - Add Potentiometer from palette (Input Devices). Place on canvas. Connect IN to battery+, GND to battery−, OUT to voltmeter+ (voltmeter− to GND).
   - Run simulation. Change position (slider in inspector or [ / ] keys). Vout should vary smoothly with α.

2. **Voltage divider**
   - Battery+ → IN, GND → battery−, OUT → voltmeter+. Sweep α 0→100%: Vout should go from ~0 to ~Vbat (monotonic).

3. **Rheostat**
   - Tie OUT to IN; connect IN to one end of a resistor and GND to the other; add LED in series. Vary α: brightness should change (resistance in path changes).

4. **Knob drag (workbench)**
   - Select pot, drag the knob: alpha updates in real time; tick marker and inspector position stay in sync.

5. **Keyboard**
   - Select pot. Press `]` to increase α, `[` to decrease. Shift+`]` / Shift+`[` for 5% steps.

6. **Inspector**
   - Value presets (1k, 5k, 10k, …), custom Ω, taper (linear/log), position slider. When running, R_top, R_bot, V_IN, V_OUT, V_GND, I_top, I_bot, P_total shown.

7. **View switch**
   - Build circuit in workbench, switch to schematic: pot symbol (resistor + wiper), pins IN/OUT/GND. Wires stay connected. Switch back: knob and pins preserved.

8. **Floating pot**
   - Leave one pin unconnected or all three on same net: no crash; PotOutput.floating or “Floating or not solved” in inspector.
