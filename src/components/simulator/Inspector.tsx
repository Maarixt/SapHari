import { useEffect, useState } from 'react';
import { SimComponent } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { COLORS } from './library/parts';
import { SWITCH_VARIANTS, getSwitchVariantId, type SwitchVariantId } from './registry';
import type { SolveResult } from './engine2';

/** Non-blocking wiring suggestions by component type. */
const WIRING_HINTS: Record<string, string[]> = {
  dc_supply: ['Connect + to your circuit; − to ground. Add series resistor for LEDs.'],
  button: ['Legacy push-button; auto-migrates to Push Button with NO/Momentary defaults.'],
  push_button: ['Set Contact to NO/NC and Mechanism to Momentary/Latch. Use pull-up/down where needed.'],
  push_button_momentary: ['Legacy type; auto-migrates to Push Button (NO, Momentary).'],
  push_button_latch: ['Legacy type; auto-migrates to Push Button (NO, Latch).'],
  switch: ['Add pull-up or pull-down resistor for stable logic level when open.'],
  led: ['Add series resistor (e.g. 220Ω–1kΩ) to limit current.'],
  voltmeter: ['Connect + and − in parallel across the points to measure. High impedance; does not load the circuit.'],
  ds18b20: ['Use 4.7kΩ pull-up on DQ (data) pin.'],
  servo: ['Connect VCC to 5V and GND to common ground with ESP32.'],
  pot: ['Connect VCC to 3V3 or 5V, GND to ground; wiper (SIG) to ADC pin.'],
  potentiometer: ['IN = high side (e.g. VCC), GND = low side, OUT = wiper. Use as voltage divider or rheostat.'],
  transistor: ['NPN: base ~0.7V above emitter to turn on. PNP: base ~0.7V below emitter.'],
  motor_dc: ['Connect M+ and M− in a closed loop with a supply. Polarity sets direction; no current = no spin.'],
  motor_ac: ['DC placeholder: wire L and N in a closed loop. Real AC model (RMS/phasor) coming later.'],
  pir: ['Connect VCC to 3V3/5V, GND to ground; OUT to GPIO input.'],
  ultrasonic: ['Connect VCC and GND; TRIG and ECHO to GPIO. Use common ground with ESP32.'],
  buzzer: ['Connect positive to GPIO or driver; negative to GND. Add series resistor if driving from GPIO.'],
  capacitor: ['In DC, no steady current; voltage can exist across it. Connect in series or parallel as needed.'],
  capacitor_polarized: ['In DC, no steady current; voltage can exist across it. Respect polarity: + to higher potential, − to lower.'],
  rgb_led: ['CC: R, G, B = anodes, COM = cathode (to GND). CA: COM = anode (to +), R, G, B = cathodes. Use series resistor per channel.'],
  diode: ['Anode (A) to higher potential, cathode (K) to lower. Current flows A → K when forward biased.'],
  inductor: ['Two terminals (A, B). Use with flyback diode when switching inductive loads (e.g. relay, motor).'],
};

function getWiringHints(componentType: string): string[] {
  return WIRING_HINTS[componentType] ?? [];
}

interface InspectorProps {
  selectedComponent?: SimComponent;
  onUpdateComponent: (updates: Partial<SimComponent>) => void;
  onRotate90?: (componentId: string) => void;
  onFlipX?: (componentId: string) => void;
  onFlipY?: (componentId: string) => void;
  onSetVariant?: (componentId: string, variantId: string) => void;
  /** When present, show Net Inspector section (from engine2 solve result). */
  solveResult?: SolveResult | null;
}

function NetInspectorSection({ solveResult }: { solveResult: SolveResult }) {
  const [showAllNets, setShowAllNets] = useState(false);
  const [expandedNetIds, setExpandedNetIds] = useState<Set<string>>(new Set());

  const nets = solveResult.nets ?? [];
  const multiPinNets = nets.filter((n) => n.pins.length > 1);
  const displayNets = showAllNets ? nets : multiPinNets;
  const groundNetId = solveResult.groundNetId ?? null;
  const netVoltagesById = solveResult.netVoltagesById ?? {};
  const hasTopologyPath = solveResult.hasTopologyPath ?? true;
  const hasReturnPath = solveResult.hasReturnPath ?? true;

  const toggleNet = (netId: string) => {
    setExpandedNetIds((prev) => {
      const next = new Set(prev);
      if (next.has(netId)) next.delete(netId);
      else next.add(netId);
      return next;
    });
  };

  return (
    <div className="rounded border bg-muted/20 p-2 space-y-2">
      <div className="text-sm font-medium">Net Inspector</div>
      <div className="text-xs text-muted-foreground">
        {nets.length} net(s) · ground: {groundNetId ?? '—'}
      </div>
      {solveResult.singular && (
        <p className="text-xs text-amber-600 dark:text-amber-400">Solver singular (open/floating circuit)</p>
      )}
      {!hasTopologyPath && (
        <p className="text-xs text-amber-600 dark:text-amber-400">Circuit not connected (open loop).</p>
      )}
      {hasTopologyPath && !hasReturnPath && (
        <p className="text-xs text-amber-600 dark:text-amber-400">Connected but blocked: LED reverse-biased or insufficient voltage.</p>
      )}
      {solveResult.warnings?.length > 0 && (
        <ul className="text-xs text-amber-600 dark:text-amber-400 list-disc list-inside">
          {solveResult.warnings.slice(0, 5).map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={showAllNets}
          onChange={(e) => setShowAllNets(e.target.checked)}
        />
        Show single-pin nets
      </label>
      <div className="max-h-48 overflow-y-auto space-y-1">
        {displayNets.map((net) => {
          const isExpanded = expandedNetIds.has(net.id);
          const voltage = netVoltagesById[net.id];
          const isGround = net.id === groundNetId;
          return (
            <div key={net.id} className="border rounded text-xs">
              <button
                type="button"
                className="w-full flex items-center gap-1 p-1.5 text-left hover:bg-muted/50"
                onClick={() => toggleNet(net.id)}
              >
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <span className="font-mono">{net.id}</span>
                {isGround && <span className="text-amber-600">GND</span>}
                {voltage != null && <span className="text-muted-foreground">{voltage.toFixed(2)} V</span>}
                <span className="text-muted-foreground">({net.pins.length} pin(s))</span>
              </button>
              {isExpanded && (
                <div className="p-1.5 pt-0 pl-5 border-t space-y-0.5">
                  {net.pins.map((pk) => (
                    <div key={pk} className="font-mono text-muted-foreground truncate" title={pk}>
                      {pk}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const Inspector = ({
  selectedComponent,
  onUpdateComponent,
  onRotate90,
  onFlipX,
  onFlipY,
  onSetVariant,
  solveResult,
}: InspectorProps) => {
  if (!selectedComponent) {
    return (
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">Inspector</div>
        <p className="text-sm text-muted-foreground">Select a component to edit its properties</p>
        {solveResult != null && <NetInspectorSection solveResult={solveResult} />}
      </div>
    );
  }

  const selectedTypeNormalized = String(selectedComponent.type ?? '')
    .toLowerCase()
    .replace(/-/g, '_');

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('Selected type:', selectedComponent.type, selectedComponent);
    }
  }, [selectedComponent]);

  const handlePropUpdate = (key: string, value: any) => {
    onUpdateComponent({
      props: {
        ...selectedComponent.props,
        [key]: value
      }
    });
  };

  const renderComponentInspector = () => {
    switch (selectedTypeNormalized) {
      case 'dc_supply': {
        const vMax = Math.max(1, Number(selectedComponent.props?.vMax) ?? 12);
        const voltage = Math.max(0, Math.min(vMax, Number(selectedComponent.props?.voltage) ?? 5));
        const setVoltage = (v: number) => handlePropUpdate('voltage', Math.max(0, Math.min(vMax, v)));
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="battery-voltage">Voltage (V)</Label>
              <Input
                id="battery-voltage"
                type="number"
                step={0.1}
                min={0}
                max={vMax}
                value={voltage}
                onChange={(e) => setVoltage(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="battery-voltage-slider">Voltage slider (0 – {vMax} V)</Label>
              <Slider
                id="battery-voltage-slider"
                min={0}
                max={vMax}
                step={0.1}
                value={[voltage]}
                onValueChange={([v]) => setVoltage(v ?? 0)}
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="battery-vMax">Max voltage (V)</Label>
              <Input
                id="battery-vMax"
                type="number"
                step={1}
                min={1}
                value={vMax}
                onChange={(e) => handlePropUpdate('vMax', Math.max(1, parseFloat(e.target.value) || 12))}
              />
            </div>
            <div>
              <Label htmlFor="battery-rInternal">Internal resistance (Ω)</Label>
              <Input
                id="battery-rInternal"
                type="number"
                step={1}
                min={0}
                value={selectedComponent.props?.rInternal ?? 50}
                onChange={(e) => handlePropUpdate('rInternal', parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground mt-1">Stabilizes solver; extra voltage drops here (KVL). No resistor = damage risk.</p>
            </div>
            <div className="pt-2 border-t space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="battery-acEnabled">AC mode</Label>
                <Switch
                  id="battery-acEnabled"
                  checked={!!selectedComponent.props?.acEnabled}
                  onCheckedChange={(checked) => {
                    const amp = selectedComponent.props?.amplitude as number | undefined;
                    const freq = selectedComponent.props?.frequencyHz as number | undefined;
                    if (checked && (amp == null || amp === 0)) {
                      onUpdateComponent({
                        props: {
                          ...selectedComponent.props,
                          acEnabled: true,
                          amplitude: 12 * Math.SQRT2,
                          frequencyHz: 60,
                          voltageMode: 'rms',
                        },
                      });
                    } else {
                      handlePropUpdate('acEnabled', checked);
                    }
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">When on, Vs(t) = voltage + amplitude × sin(2πft + phase). Use with transient for rectifier.</p>
              {!!selectedComponent.props?.acEnabled && (
                <>
                  <p className="text-xs text-amber-600 dark:text-amber-400">AC requires transient simulation. Use Run Transient or scope to see AC behavior.</p>
                  <div>
                    <Label>Voltage (show as)</Label>
                    <Select
                      value={(selectedComponent.props?.voltageMode as string) ?? 'rms'}
                      onValueChange={(v) => handlePropUpdate('voltageMode', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rms">RMS (Vrms)</SelectItem>
                        <SelectItem value="peak">Peak (V)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(selectedComponent.props?.voltageMode as string) !== 'peak' ? (
                    <div>
                      <Label htmlFor="battery-vrms">Vrms (V)</Label>
                      <Input
                        id="battery-vrms"
                        type="number"
                        step={0.1}
                        min={0}
                        value={((selectedComponent.props?.amplitude as number) ?? 0) / Math.SQRT2}
                        onChange={(e) => handlePropUpdate('amplitude', Math.max(0, parseFloat(e.target.value) || 0) * Math.SQRT2)}
                      />
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="battery-amplitude">Peak (V)</Label>
                      <Input
                        id="battery-amplitude"
                        type="number"
                        step={0.1}
                        min={0}
                        value={selectedComponent.props?.amplitude ?? 0}
                        onChange={(e) => handlePropUpdate('amplitude', Math.max(0, parseFloat(e.target.value) || 0))}
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="battery-frequencyHz">Frequency (Hz)</Label>
                    <Input
                      id="battery-frequencyHz"
                      type="number"
                      step={0.1}
                      min={0.001}
                      value={selectedComponent.props?.frequencyHz ?? 1}
                      onChange={(e) => handlePropUpdate('frequencyHz', Math.max(0.001, parseFloat(e.target.value) || 1))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="battery-phaseDeg">Phase (deg)</Label>
                    <Input
                      id="battery-phaseDeg"
                      type="number"
                      step={1}
                      value={selectedComponent.props?.phaseDeg ?? 0}
                      onChange={(e) => handlePropUpdate('phaseDeg', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="rounded border bg-muted/30 p-2 space-y-1 text-xs">
                    <div className="font-medium">Readouts (DC solve)</div>
                    <div>Vrms = {(((selectedComponent.props?.amplitude as number) ?? 0) / Math.SQRT2).toFixed(2)} V</div>
                    <div>Peak = {(selectedComponent.props?.amplitude ?? 0).toFixed(2)} V</div>
                    <div>f = {(selectedComponent.props?.frequencyHz ?? 1).toFixed(1)} Hz</div>
                    {solveResult?.branchCurrentsByComponentId?.[selectedComponent.id] != null && (
                      <div>I = {(solveResult.branchCurrentsByComponentId[selectedComponent.id] as number).toFixed(4)} A</div>
                    )}
                    <p className="text-muted-foreground mt-1">Instantaneous V(t), I(t), P(t) require transient simulation.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      }

      case 'led':
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="led-color">Color</Label>
              <Select
                value={selectedComponent.props?.color || 'red'}
                onValueChange={(value) => handlePropUpdate('color', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLORS.map(color => (
                    <SelectItem key={color} value={color}>
                      {color.charAt(0).toUpperCase() + color.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="led-vf">Forward voltage (V)</Label>
              <Input
                id="led-vf"
                type="number"
                step={0.1}
                min={0}
                max={5}
                value={selectedComponent.props?.forwardVoltage ?? 2}
                onChange={(e) => handlePropUpdate('forwardVoltage', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        );

      case 'diode': {
        const out = solveResult?.outputsByComponentId?.[selectedComponent.id] as { vd?: number; state?: string; id?: number; power?: number; reasonIfNot?: string } | undefined;
        const vf = (selectedComponent.props?.vf as number) ?? 0.7;
        const rOn = (selectedComponent.props?.rOn as number) ?? 1;
        const vbr = (selectedComponent.props?.vbr as number) ?? 50;
        const rbr = (selectedComponent.props?.rbr as number) ?? 10;
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="diode-vf">Forward voltage Vf (V)</Label>
              <Input id="diode-vf" type="number" step={0.1} min={0} max={2} value={vf} onChange={(e) => handlePropUpdate('vf', parseFloat(e.target.value) ?? 0.7)} />
            </div>
            <div>
              <Label htmlFor="diode-ron">Dynamic resistance Ron (Ω)</Label>
              <Input id="diode-ron" type="number" step={0.1} min={0.1} max={100} value={rOn} onChange={(e) => handlePropUpdate('rOn', parseFloat(e.target.value) ?? 1)} />
            </div>
            <div>
              <Label htmlFor="diode-vbr">Breakdown voltage Vbr (V)</Label>
              <Input id="diode-vbr" type="number" step={1} min={0} max={500} value={vbr} onChange={(e) => handlePropUpdate('vbr', parseFloat(e.target.value) ?? 50)} />
            </div>
            <div>
              <Label htmlFor="diode-rbr">Breakdown slope Rbr (Ω)</Label>
              <Input id="diode-rbr" type="number" step={0.1} min={0.1} max={1000} value={rbr} onChange={(e) => handlePropUpdate('rbr', parseFloat(e.target.value) ?? 10)} />
            </div>
            {out != null && (
              <div className="pt-2 border-t text-xs space-y-1">
                <div><span className="text-muted-foreground">Vd (VA − VK):</span> {out.vd != null ? `${out.vd.toFixed(3)} V` : '—'}</div>
                <div><span className="text-muted-foreground">State:</span> {out.state ?? '—'}</div>
                <div><span className="text-muted-foreground">Id:</span> {out.id != null ? `${(out.id * 1000).toFixed(2)} mA` : '—'}</div>
                {out.power != null && <div><span className="text-muted-foreground">Power:</span> {(out.power * 1000).toFixed(2)} mW</div>}
                {out.reasonIfNot && <p className="text-amber-600 dark:text-amber-400">{out.reasonIfNot}</p>}
              </div>
            )}
          </div>
        );
      }

      case 'rgb_led': {
        const variantId = (selectedComponent.props?.variantId as 'CC' | 'CA') ?? 'CC';
        const vfR = selectedComponent.props?.vfR ?? 2;
        const vfG = selectedComponent.props?.vfG ?? 3;
        const vfB = selectedComponent.props?.vfB ?? 3;
        const rdynR = selectedComponent.props?.rdynR ?? 20;
        const rdynG = selectedComponent.props?.rdynG ?? 20;
        const rdynB = selectedComponent.props?.rdynB ?? 20;
        const iref = (selectedComponent.props?.iref as number) ?? 0.02;
        const out = solveResult?.outputsByComponentId?.[selectedComponent.id] as {
          brightnessR?: number;
          brightnessG?: number;
          brightnessB?: number;
          currentR?: number;
          currentG?: number;
          currentB?: number;
          voltageDropR?: number;
          voltageDropG?: number;
          voltageDropB?: number;
          mixedColor?: { r: number; g: number; b: number };
        } | undefined;
        const r = out?.mixedColor?.r ?? out?.brightnessR ?? 0;
        const g = out?.mixedColor?.g ?? out?.brightnessG ?? 0;
        const b = out?.mixedColor?.b ?? out?.brightnessB ?? 0;
        const swatchBg = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
        return (
          <div className="space-y-3">
            <div>
              <Label>Variant</Label>
              <Select value={variantId} onValueChange={(v) => handlePropUpdate('variantId', v as 'CC' | 'CA')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CC">Common Cathode</SelectItem>
                  <SelectItem value="CA">Common Anode</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Vf R (V)</Label>
                <Input type="number" step={0.1} min={0} max={5} value={vfR} onChange={(e) => handlePropUpdate('vfR', parseFloat(e.target.value) ?? 2)} />
              </div>
              <div>
                <Label className="text-xs">Vf G (V)</Label>
                <Input type="number" step={0.1} min={0} max={5} value={vfG} onChange={(e) => handlePropUpdate('vfG', parseFloat(e.target.value) ?? 3)} />
              </div>
              <div>
                <Label className="text-xs">Vf B (V)</Label>
                <Input type="number" step={0.1} min={0} max={5} value={vfB} onChange={(e) => handlePropUpdate('vfB', parseFloat(e.target.value) ?? 3)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Rdyn R (Ω)</Label>
                <Input type="number" min={1} max={1000} value={rdynR} onChange={(e) => handlePropUpdate('rdynR', parseFloat(e.target.value) ?? 20)} />
              </div>
              <div>
                <Label className="text-xs">Rdyn G (Ω)</Label>
                <Input type="number" min={1} max={1000} value={rdynG} onChange={(e) => handlePropUpdate('rdynG', parseFloat(e.target.value) ?? 20)} />
              </div>
              <div>
                <Label className="text-xs">Rdyn B (Ω)</Label>
                <Input type="number" min={1} max={1000} value={rdynB} onChange={(e) => handlePropUpdate('rdynB', parseFloat(e.target.value) ?? 20)} />
              </div>
            </div>
            <div>
              <Label htmlFor="rgb-iref">Iref (A) — 100% brightness</Label>
              <Input id="rgb-iref" type="number" step={0.001} min={0.001} value={iref} onChange={(e) => handlePropUpdate('iref', parseFloat(e.target.value) ?? 0.02)} />
            </div>
            <div className="rounded border bg-muted/30 p-2 space-y-1">
              <div className="text-sm font-medium">Live</div>
              <div className="text-xs grid grid-cols-3 gap-1">
                <span>R: V={out?.voltageDropR?.toFixed(2) ?? '—'}V I={((out?.currentR ?? 0) * 1000).toFixed(1)}mA</span>
                <span>G: V={out?.voltageDropG?.toFixed(2) ?? '—'}V I={((out?.currentG ?? 0) * 1000).toFixed(1)}mA</span>
                <span>B: V={out?.voltageDropB?.toFixed(2) ?? '—'}V I={((out?.currentB ?? 0) * 1000).toFixed(1)}mA</span>
              </div>
              <div className="mt-2 h-8 rounded border border-border" style={{ backgroundColor: swatchBg }} title={`RGB(${r.toFixed(2)},${g.toFixed(2)},${b.toFixed(2)})`} />
            </div>
          </div>
        );
      }

      case 'voltmeter': {
        const out = solveResult?.outputsByComponentId?.[selectedComponent.id] as {
          type: 'Voltmeter';
          volts: number | null;
          connected: boolean;
          floating: boolean;
          netPlus: string | null;
          netMinus: string | null;
          vPlus: number | null;
          vMinus: number | null;
        } | undefined;
        const volts = out?.volts ?? null;
        const connected = out?.connected ?? false;
        const floating = out?.floating ?? false;
        const readingText = !connected ? '—' : floating ? 'Floating' : volts == null ? '—' : `${volts.toFixed(2)} V`;
        return (
          <div className="space-y-3">
            <div className="rounded border bg-muted/30 p-2">
              <div className="text-sm font-medium">Reading</div>
              <div className="text-2xl font-mono mt-1">{readingText}</div>
              {!connected && <p className="text-xs text-muted-foreground mt-1">Wire + and − to two nodes to measure voltage.</p>}
              {connected && floating && <p className="text-xs text-amber-600 mt-1">Circuit floating/singular; probe voltages undefined.</p>}
            </div>
            <div className="rounded border bg-muted/20 p-2 text-xs space-y-1">
              <div>netPlus: {out?.netPlus ?? '—'}</div>
              <div>netMinus: {out?.netMinus ?? '—'}</div>
              <div>Vplus: {out?.vPlus == null ? '—' : `${out.vPlus.toFixed(3)} V`}</div>
              <div>Vminus: {out?.vMinus == null ? '—' : `${out.vMinus.toFixed(3)} V`}</div>
              <div>reading: {readingText}</div>
            </div>
          </div>
        );
      }

      case 'resistor': {
        const resistance = selectedComponent.props?.resistanceOhms ?? selectedComponent.props?.ohms ?? 220;
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="resistor-ohms">Resistance (Ω)</Label>
              <Input
                id="resistor-ohms"
                type="number"
                value={resistance}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10) || 220;
                  onUpdateComponent({ props: { ...selectedComponent.props, resistanceOhms: v, ohms: v } });
                }}
              />
            </div>
          </div>
        );
      }

      case 'motor_dc': {
        const rOhms = selectedComponent.props?.rOhms ?? 10;
        const iNom = selectedComponent.props?.iNom ?? 0.2;
        const iMinSpin = selectedComponent.props?.iMinSpin ?? 0.01;
        const inertiaEnabled = !!selectedComponent.props?.inertiaEnabled;
        const out = solveResult?.outputsByComponentId?.[selectedComponent.id] as { spinning?: boolean; speed?: number; direction?: number; current?: number; voltage?: number; power?: number; va?: number; vb?: number; reasonIfNot?: string } | undefined;
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="motor-dc-rohms">Armature resistance R (Ω)</Label>
              <Input id="motor-dc-rohms" type="number" min={0.1} step={0.1} value={rOhms} onChange={(e) => handlePropUpdate('rOhms', Math.max(0.1, parseFloat(e.target.value) || 10))} />
            </div>
            <div>
              <Label htmlFor="motor-dc-inom">Nominal current I_nom (A)</Label>
              <Input id="motor-dc-inom" type="number" min={0.01} step={0.01} value={iNom} onChange={(e) => handlePropUpdate('iNom', Math.max(0.01, parseFloat(e.target.value) || 0.2))} />
            </div>
            <div>
              <Label htmlFor="motor-dc-iminspin">Min spin current I_min (A)</Label>
              <Input id="motor-dc-iminspin" type="number" min={0} step={0.001} value={iMinSpin} onChange={(e) => handlePropUpdate('iMinSpin', Math.max(0, parseFloat(e.target.value) ?? 0.01))} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Inertia (smooth speed)</Label>
              <Switch checked={inertiaEnabled} onCheckedChange={(v) => handlePropUpdate('inertiaEnabled', v)} />
            </div>
            {out && (
              <>
                <div className="rounded border bg-muted/20 p-2 text-xs space-y-1">
                  <div>Spinning: {out.spinning ? 'Yes' : 'No'}</div>
                  <div>I = {out.current != null ? out.current.toFixed(4) : '—'} A · P = {out.power != null ? out.power.toFixed(2) : '—'} W</div>
                  <div>Speed: {out.speed != null ? `${Math.round(out.speed * 100)}%` : '—'} · Dir: {out.direction != null ? (out.direction > 0 ? 'CW' : out.direction < 0 ? 'CCW' : '—') : '—'}</div>
                </div>
                <div className="rounded border bg-muted/10 p-2 text-xs space-y-0.5 font-mono">
                  <div className="font-medium text-muted-foreground">Debug</div>
                  <div>Va = {out.va != null ? out.va.toFixed(3) : '—'} V · Vb = {out.vb != null ? out.vb.toFixed(3) : '—'} V</div>
                  <div>Vdrop = {out.voltage != null ? out.voltage.toFixed(3) : '—'} V</div>
                  <div>I (signed) = {out.current != null ? out.current.toFixed(4) : '—'} A</div>
                  <div>isSpinning = {String(out.spinning)} · speedNorm = {out.speed != null ? out.speed.toFixed(2) : '—'}</div>
                  {out.reasonIfNot && <div className="text-amber-600">Reason: {out.reasonIfNot}</div>}
                </div>
              </>
            )}
          </div>
        );
      }

      case 'motor_ac': {
        const rOhms = selectedComponent.props?.rOhms ?? 20;
        const iNom = selectedComponent.props?.iNom ?? 0.2;
        const iMinSpin = selectedComponent.props?.iMinSpin ?? 0.01;
        const out = solveResult?.outputsByComponentId?.[selectedComponent.id] as { spinning?: boolean; speed?: number; direction?: number; current?: number; power?: number; voltage?: number; va?: number; vb?: number; reasonIfNot?: string } | undefined;
        return (
          <div className="space-y-3">
            <div className="rounded border border-amber-500/60 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
              AC motor currently uses a DC placeholder resistive model until an AC/RMS solver is added.
            </div>
            <div>
              <Label htmlFor="motor-ac-rohms">Resistance R (Ω)</Label>
              <Input id="motor-ac-rohms" type="number" min={0.1} step={0.1} value={rOhms} onChange={(e) => handlePropUpdate('rOhms', Math.max(0.1, parseFloat(e.target.value) || 20))} />
            </div>
            <div>
              <Label htmlFor="motor-ac-inom">Nominal current I_nom (A)</Label>
              <Input id="motor-ac-inom" type="number" min={0.01} step={0.01} value={iNom} onChange={(e) => handlePropUpdate('iNom', Math.max(0.01, parseFloat(e.target.value) || 0.2))} />
            </div>
            <div>
              <Label htmlFor="motor-ac-iminspin">Min spin current I_min (A)</Label>
              <Input id="motor-ac-iminspin" type="number" min={0} step={0.001} value={iMinSpin} onChange={(e) => handlePropUpdate('iMinSpin', Math.max(0, parseFloat(e.target.value) ?? 0.01))} />
            </div>
            {out && (
              <>
                <div className="rounded border bg-muted/20 p-2 text-xs space-y-1">
                  <div>Spinning: {out.spinning ? 'Yes' : 'No'}</div>
                  <div>I = {out.current != null ? out.current.toFixed(4) : '—'} A · P = {out.power != null ? out.power.toFixed(2) : '—'} W</div>
                  <div>Speed: {out.speed != null ? `${Math.round(out.speed * 100)}%` : '—'} · Dir: {out.direction != null ? (out.direction > 0 ? 'CW' : out.direction < 0 ? 'CCW' : '—') : '—'}</div>
                </div>
                <div className="rounded border bg-muted/10 p-2 text-xs space-y-0.5 font-mono">
                  <div className="font-medium text-muted-foreground">Debug</div>
                  <div>Va = {out.va != null ? out.va.toFixed(3) : '—'} V · Vb = {out.vb != null ? out.vb.toFixed(3) : '—'} V</div>
                  <div>Vdrop = {out.voltage != null ? out.voltage.toFixed(3) : '—'} V · I = {out.current != null ? out.current.toFixed(4) : '—'} A</div>
                  {out.reasonIfNot && <div className="text-amber-600">Reason: {out.reasonIfNot}</div>}
                </div>
              </>
            )}
          </div>
        );
      }

      case 'transistor': {
        const out = solveResult?.outputsByComponentId?.[selectedComponent.id] as {
          polarity: 'NPN' | 'PNP';
          region: 'cutoff' | 'active' | 'saturation' | 'floating';
          vb: number | null;
          vc: number | null;
          ve: number | null;
          vbe: number | null;
          vce: number | null;
          ib: number;
          ic: number;
        } | undefined;
        return (
          <div className="space-y-3">
            <div>
              <Label>Type</Label>
              <Select
                value={(selectedComponent.props?.polarity as string) ?? 'NPN'}
                onValueChange={(v) => onUpdateComponent({ props: { ...selectedComponent.props, polarity: v } })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NPN">NPN</SelectItem>
                  <SelectItem value="PNP">PNP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="q-beta">β (hFE)</Label>
              <Input id="q-beta" type="number" value={selectedComponent.props?.beta ?? 100} onChange={(e) => handlePropUpdate('beta', Math.max(1, parseFloat(e.target.value) || 100))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="q-vbe">Vbe_on (V)</Label>
                <Input id="q-vbe" type="number" step={0.01} value={selectedComponent.props?.vbeOn ?? 0.7} onChange={(e) => handlePropUpdate('vbeOn', Math.max(0.4, parseFloat(e.target.value) || 0.7))} />
              </div>
              <div>
                <Label htmlFor="q-vcesat">Vce_sat (V)</Label>
                <Input id="q-vcesat" type="number" step={0.01} value={selectedComponent.props?.vceSat ?? 0.2} onChange={(e) => handlePropUpdate('vceSat', Math.max(0.05, parseFloat(e.target.value) || 0.2))} />
              </div>
            </div>
            <div>
              <Label htmlFor="q-rbe">Rbe_on (Ω)</Label>
              <Input id="q-rbe" type="number" value={selectedComponent.props?.rBeOn ?? 1000} onChange={(e) => handlePropUpdate('rBeOn', Math.max(10, parseFloat(e.target.value) || 1000))} />
            </div>
            {out && (
              <div className="rounded border bg-muted/20 p-2 text-xs space-y-1">
                <div>Region: <span className="font-medium">{out.region}</span></div>
                <div>Vb={out.vb == null ? '—' : out.vb.toFixed(3)}V Ve={out.ve == null ? '—' : out.ve.toFixed(3)}V Vc={out.vc == null ? '—' : out.vc.toFixed(3)}V</div>
                <div>Vbe={out.vbe == null ? '—' : out.vbe.toFixed(3)}V Vce={out.vce == null ? '—' : out.vce.toFixed(3)}V</div>
                <div>Ib={out.ib.toExponential(3)}A Ic={out.ic.toExponential(3)}A</div>
              </div>
            )}
          </div>
        );
      }

      case 'button':
      case 'push_button':
      case 'push_button_momentary':
      case 'push_button_latch': {
        const contact = selectedComponent.props?.contact === 'NC' ? 'NC' : 'NO';
        const mechanism = selectedComponent.props?.mechanism === 'latch' ? 'latch' : 'momentary';
        const actuated = mechanism === 'latch'
          ? !!selectedComponent.props?.latched
          : !!selectedComponent.props?.pressed;
        const isClosed = contact === 'NO' ? actuated : !actuated;
        return (
          <div className="space-y-3">
            <div>
              <Label>Contact</Label>
              <Select
                value={contact}
                onValueChange={(value) => {
                  if (value !== 'NO' && value !== 'NC') return;
                  onUpdateComponent({ props: { ...selectedComponent.props, contact: value } });
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NO">Normally Open (NO)</SelectItem>
                  <SelectItem value="NC">Normally Closed (NC)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mechanism</Label>
              <Select
                value={mechanism}
                onValueChange={(value) => {
                  if (value !== 'momentary' && value !== 'latch') return;
                  onUpdateComponent({ props: { ...selectedComponent.props, mechanism: value } });
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="momentary">Momentary (spring)</SelectItem>
                  <SelectItem value="latch">Latch (push-on/push-off)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {mechanism === 'latch' ? (
              <div className="flex items-center justify-between">
                <Label>Latched</Label>
                <Switch
                  checked={!!selectedComponent.props?.latched}
                  onCheckedChange={(checked) => onUpdateComponent({ props: { ...selectedComponent.props, latched: checked } })}
                />
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">Pressed (read-only): {String(!!selectedComponent.props?.pressed)}</div>
            )}
            <div>
              <Label htmlFor="pb-ron">rOn (Ω)</Label>
              <Input
                id="pb-ron"
                type="number"
                step={0.01}
                value={selectedComponent.props?.rOnOhms ?? 0.01}
                onChange={(e) => handlePropUpdate('rOnOhms', Math.max(0.0001, parseFloat(e.target.value) || 0.01))}
              />
            </div>
            <div className="rounded border bg-muted/20 p-2 text-xs space-y-1">
              <div>
                actuated: <span className="font-medium">{actuated ? 'true' : 'false'}</span> ({actuated ? 'ACTUATED' : 'REST'})
              </div>
              <div>
                isClosed: <span className="font-medium">{isClosed ? 'true' : 'false'}</span>
              </div>
            </div>
          </div>
        );
      }

      case 'switch':
      case 'toggle_switch': {
        const switchVariant = getSwitchVariantId(selectedComponent.variantId) as SwitchVariantId;
        const isSPDT = switchVariant === 'SPDT';
        const isDPST = switchVariant === 'DPST';
        const isDPDT = switchVariant === 'DPDT';
        const isPositionSwitch = isSPDT || isDPDT || selectedComponent.variantId === 'SPDT' || selectedComponent.variantId === 'DPDT';
        const position = (selectedComponent.props?.position as string) === 'B' ? 'B' : 'A';
        return (
          <div className="space-y-3">
            {onSetVariant && (
              <div>
                <Label>Variant</Label>
                <Select
                  value={switchVariant}
                  onValueChange={(value) => onSetVariant(selectedComponent.id, value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SWITCH_VARIANTS) as SwitchVariantId[]).map((v) => (
                      <SelectItem key={v} value={v}>
                        {SWITCH_VARIANTS[v].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {isPositionSwitch ? (
              <div>
                <Label>Position</Label>
                <Select
                  value={position}
                  onValueChange={(value) => {
                    if (value === 'A' || value === 'B') handlePropUpdate('position', value);
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A (COM→A throws)</SelectItem>
                    <SelectItem value="B">B (COM→B throws)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Not On/Off — selects which throw is connected to each common.</p>
              </div>
            ) : (
              <div>
                <Label>State</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={!!selectedComponent.props?.on}
                    onCheckedChange={(checked) => handlePropUpdate('on', checked)}
                  />
                  <span className="text-sm">{selectedComponent.props?.on ? 'On' : 'Off'}</span>
                </div>
              </div>
            )}
            {isDPST && (
              <div className="rounded border bg-muted/20 p-2 text-xs text-muted-foreground space-y-0.5">
                <div>Pole 1: P1–P2</div>
                <div>Pole 2: P3–P4</div>
              </div>
            )}
            {isDPDT && (
              <div className="rounded border bg-muted/20 p-2 text-xs text-muted-foreground space-y-0.5">
                <div>Pole 1: P2=COM1, P1=A1, P3=B1</div>
                <div>Pole 2: P5=COM2, P4=A2, P6=B2</div>
              </div>
            )}
          </div>
        );
      }

      case 'buzzer': {
        const buzzerOut = solveResult?.outputsByComponentId?.[selectedComponent.id] as { audible?: boolean; vPlus?: number; vMinus?: number; vBuz?: number; current?: number; reasonIfNot?: string } | undefined;
        const mode = (selectedComponent.props?.mode as string) ?? 'active';
        const volume = Math.max(0, Math.min(1, Number(selectedComponent.props?.volume) || 0.5));
        const frequency = Math.max(100, Math.min(10000, Number(selectedComponent.props?.frequency) || 2000));
        const vMin = Number(selectedComponent.props?.vMin) || 2;
        const rOn = Number(selectedComponent.props?.rOn) || Number(selectedComponent.props?.rOhms) || 167;
        return (
          <div className="space-y-3">
            <div>
              <Label>Mode</Label>
              <Select value={mode} onValueChange={(v) => handlePropUpdate('mode', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="passive">Passive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="buzzer-volume">Volume</Label>
              <Slider
                id="buzzer-volume"
                min={0}
                max={1}
                step={0.05}
                value={[volume]}
                onValueChange={([v]) => handlePropUpdate('volume', v)}
                className="w-full"
              />
            </div>
            {mode === 'active' && (
              <div>
                <Label htmlFor="buzzer-frequency">Frequency (Hz)</Label>
                <Input
                  id="buzzer-frequency"
                  type="number"
                  min={100}
                  max={10000}
                  value={frequency}
                  onChange={(e) => handlePropUpdate('frequency', Math.max(100, Math.min(10000, Number(e.target.value) || 2000)))}
                />
              </div>
            )}
            <div>
              <Label htmlFor="buzzer-vmin">Vmin (V)</Label>
              <Input
                id="buzzer-vmin"
                type="number"
                min={0}
                step={0.5}
                value={vMin}
                onChange={(e) => handlePropUpdate('vMin', Number(e.target.value) || 2)}
              />
            </div>
            <div>
              <Label htmlFor="buzzer-ron">R_on (Ω)</Label>
              <Input
                id="buzzer-ron"
                type="number"
                min={1}
                value={rOn}
                onChange={(e) => handlePropUpdate('rOn', Number(e.target.value) || 167)}
              />
            </div>
            {buzzerOut != null && (
              <div className="rounded border bg-muted/30 p-2 space-y-1 text-xs">
                <div className="font-medium">Live readings</div>
                <div>V+ = {buzzerOut.vPlus != null ? buzzerOut.vPlus.toFixed(2) : '—'} V</div>
                <div>V− = {buzzerOut.vMinus != null ? buzzerOut.vMinus.toFixed(2) : '—'} V</div>
                <div>Vbuz = {buzzerOut.vBuz != null ? buzzerOut.vBuz.toFixed(2) : '—'} V</div>
                <div>I = {buzzerOut.current != null ? (buzzerOut.current * 1000).toFixed(2) : '—'} mA</div>
                <div>
                  Audible: {buzzerOut.audible ? 'Yes' : 'No'}
                  {buzzerOut.reasonIfNot && <span className="text-muted-foreground"> — {buzzerOut.reasonIfNot}</span>}
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'capacitor': {
        const capOut = solveResult?.outputsByComponentId?.[selectedComponent.id] as { voltage?: number; current?: number; energy?: number } | undefined;
        const capacitance = Number(selectedComponent.props?.capacitance) || 1e-5;
        const rLeak = Number(selectedComponent.props?.rLeak) || 1e8;
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="cap-capacitance">Capacitance (F)</Label>
              <Input
                id="cap-capacitance"
                type="number"
                min={1e-12}
                step={1e-6}
                value={capacitance}
                onChange={(e) => handlePropUpdate('capacitance', Math.max(1e-12, Number(e.target.value) || 1e-6))}
              />
              <div className="text-xs text-muted-foreground">
                {capacitance >= 1e-6 ? `${(capacitance * 1e6).toFixed(2)} µF` : capacitance >= 1e-9 ? `${(capacitance * 1e9).toFixed(2)} nF` : `${(capacitance * 1e12).toFixed(0)} pF`}
              </div>
            </div>
            <div>
              <Label htmlFor="cap-rleak">Leakage resistance (Ω)</Label>
              <Input
                id="cap-rleak"
                type="number"
                min={1e6}
                value={rLeak}
                onChange={(e) => handlePropUpdate('rLeak', Math.max(1e6, Number(e.target.value) || 1e8))}
              />
              <div className="text-xs text-muted-foreground">Default 100 MΩ (DC open-circuit model)</div>
            </div>
            {capOut != null && (
              <div className="rounded border bg-muted/30 p-2 space-y-1 text-xs">
                <div className="font-medium">Live readings</div>
                <div>Voltage across = {capOut.voltage != null ? capOut.voltage.toFixed(3) : '—'} V</div>
                <div>Current (DC) ≈ {capOut.current != null ? (capOut.current * 1e9).toFixed(2) : '—'} nA</div>
                <div>Energy = {capOut.energy != null ? capOut.energy.toExponential(2) : '—'} J</div>
              </div>
            )}
          </div>
        );
      }

      case 'capacitor_polarized': {
        const capOut = solveResult?.outputsByComponentId?.[selectedComponent.id] as { voltage?: number; current?: number; energy?: number; reversed?: boolean; damaged?: boolean } | undefined;
        const capacitance = Number(selectedComponent.props?.capacitance) || 1e-5;
        const ratedVoltage = Number(selectedComponent.props?.ratedVoltage) || 16;
        const rLeak = Number(selectedComponent.props?.rLeak) || 1e8;
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="cap-pol-capacitance">Capacitance (F)</Label>
              <Input
                id="cap-pol-capacitance"
                type="number"
                min={1e-12}
                step={1e-6}
                value={capacitance}
                onChange={(e) => handlePropUpdate('capacitance', Math.max(1e-12, Number(e.target.value) || 1e-6))}
              />
              <div className="text-xs text-muted-foreground">
                {capacitance >= 1e-6 ? `${(capacitance * 1e6).toFixed(2)} µF` : capacitance >= 1e-9 ? `${(capacitance * 1e9).toFixed(2)} nF` : `${(capacitance * 1e12).toFixed(0)} pF`}
              </div>
            </div>
            <div>
              <Label htmlFor="cap-pol-rated">Rated voltage (V)</Label>
              <Input
                id="cap-pol-rated"
                type="number"
                min={1}
                value={ratedVoltage}
                onChange={(e) => handlePropUpdate('ratedVoltage', Math.max(1, Number(e.target.value) || 16))}
              />
            </div>
            <div>
              <Label htmlFor="cap-pol-rleak">Leakage resistance (Ω)</Label>
              <Input
                id="cap-pol-rleak"
                type="number"
                min={1e6}
                value={rLeak}
                onChange={(e) => handlePropUpdate('rLeak', Math.max(1e6, Number(e.target.value) || 1e8))}
              />
            </div>
            {capOut != null && (
              <div className="rounded border bg-muted/30 p-2 space-y-1 text-xs">
                <div className="font-medium">Live readings</div>
                <div>Voltage across = {capOut.voltage != null ? capOut.voltage.toFixed(3) : '—'} V</div>
                <div>Current (DC) ≈ {capOut.current != null ? (capOut.current * 1e9).toFixed(2) : '—'} nA</div>
                <div>Energy = {capOut.energy != null ? capOut.energy.toExponential(2) : '—'} J</div>
                {(capOut.reversed || capOut.damaged) && (
                  <div className="text-amber-600 dark:text-amber-400 font-medium mt-1">
                    {capOut.reversed && '⚠ Reversed polarity'}
                    {capOut.reversed && capOut.damaged && ' · '}
                    {capOut.damaged && 'Damage'}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }

      case 'inductor': {
        const inductance = Number(selectedComponent.props?.inductance) || 0.001;
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="inductor-L">Inductance (H)</Label>
              <Input
                id="inductor-L"
                type="number"
                min={1e-12}
                step={0.0001}
                value={inductance}
                onChange={(e) => handlePropUpdate('inductance', Math.max(1e-12, Number(e.target.value) || 0.001))}
              />
              <div className="text-xs text-muted-foreground">
                {inductance >= 1 ? `${inductance} H` : inductance >= 1e-3 ? `${(inductance * 1e3).toFixed(2)} mH` : inductance >= 1e-6 ? `${(inductance * 1e6).toFixed(0)} µH` : inductance.toExponential(1) + ' H'}
              </div>
            </div>
          </div>
        );
      }

      case 'pot':
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="pot-value">Value (0-4095)</Label>
              <Slider
                id="pot-value"
                min={0}
                max={4095}
                step={1}
                value={[selectedComponent.props?.value || 0]}
                onValueChange={([value]) => handlePropUpdate('value', value)}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">
                {selectedComponent.props?.value || 0} / 4095
              </div>
            </div>
            <div>
              <Label htmlFor="pot-max">Max Value</Label>
              <Input
                id="pot-max"
                type="number"
                value={selectedComponent.props?.max || 4095}
                onChange={(e) => handlePropUpdate('max', parseInt(e.target.value) || 4095)}
              />
            </div>
            <div>
              <Label htmlFor="pot-addr">Address</Label>
              <Input
                id="pot-addr"
                value={selectedComponent.props?.addr || ''}
                onChange={(e) => handlePropUpdate('addr', e.target.value)}
                placeholder="e.g., P1"
              />
            </div>
          </div>
        );

      case 'pir':
        return (
          <div className="space-y-3">
            <div>
              <Label>Motion Detected</Label>
              <Switch
                checked={selectedComponent.props?.motion || false}
                onCheckedChange={(checked) => handlePropUpdate('motion', checked)}
              />
            </div>
            <div>
              <Label htmlFor="pir-sensitivity">Sensitivity</Label>
              <Slider
                id="pir-sensitivity"
                min={0}
                max={1}
                step={0.1}
                value={[selectedComponent.props?.sensitivity || 0.5]}
                onValueChange={([value]) => handlePropUpdate('sensitivity', value)}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">
                {Math.round((selectedComponent.props?.sensitivity || 0.5) * 100)}%
              </div>
            </div>
            <div>
              <Label htmlFor="pir-addr">Address</Label>
              <Input
                id="pir-addr"
                value={selectedComponent.props?.addr || ''}
                onChange={(e) => handlePropUpdate('addr', e.target.value)}
                placeholder="e.g., G1"
              />
            </div>
          </div>
        );

      case 'ultrasonic':
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="ultrasonic-distance">Distance (cm)</Label>
              <Slider
                id="ultrasonic-distance"
                min={0}
                max={400}
                step={1}
                value={[selectedComponent.props?.distance || 0]}
                onValueChange={([value]) => handlePropUpdate('distance', value)}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">
                {selectedComponent.props?.distance || 0} cm
              </div>
            </div>
            <div>
              <Label htmlFor="ultrasonic-range">Max Range (cm)</Label>
              <Input
                id="ultrasonic-range"
                type="number"
                value={selectedComponent.props?.range || 400}
                onChange={(e) => handlePropUpdate('range', parseInt(e.target.value) || 400)}
              />
            </div>
            <div>
              <Label htmlFor="ultrasonic-addr">Address</Label>
              <Input
                id="ultrasonic-addr"
                value={selectedComponent.props?.addr || ''}
                onChange={(e) => handlePropUpdate('addr', e.target.value)}
                placeholder="e.g., A1"
              />
            </div>
          </div>
        );

      case 'ds18b20':
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="temp-value">Temperature (°C)</Label>
              <Slider
                id="temp-value"
                min={-40}
                max={85}
                step={0.1}
                value={[selectedComponent.props?.temperature || 25]}
                onValueChange={([value]) => handlePropUpdate('temperature', value)}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">
                {selectedComponent.props?.temperature || 25}°C
              </div>
            </div>
            <div>
              <Label htmlFor="temp-unit">Unit</Label>
              <Select
                value={selectedComponent.props?.unit || 'C'}
                onValueChange={(value) => handlePropUpdate('unit', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="C">Celsius</SelectItem>
                  <SelectItem value="F">Fahrenheit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="temp-addr">Address</Label>
              <Input
                id="temp-addr"
                value={selectedComponent.props?.addr || ''}
                onChange={(e) => handlePropUpdate('addr', e.target.value)}
                placeholder="e.g., T1"
              />
            </div>
          </div>
        );

      case 'servo':
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="servo-angle">Angle (0-180°)</Label>
              <Slider
                id="servo-angle"
                min={0}
                max={180}
                step={1}
                value={[selectedComponent.props?.angle || 90]}
                onValueChange={([value]) => handlePropUpdate('angle', value)}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">
                {selectedComponent.props?.angle || 90}°
              </div>
            </div>
            <div>
              <Label htmlFor="servo-min">Min Angle</Label>
              <Input
                id="servo-min"
                type="number"
                value={selectedComponent.props?.min || 0}
                onChange={(e) => handlePropUpdate('min', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="servo-max">Max Angle</Label>
              <Input
                id="servo-max"
                type="number"
                value={selectedComponent.props?.max || 180}
                onChange={(e) => handlePropUpdate('max', parseInt(e.target.value) || 180)}
              />
            </div>
            <div>
              <Label htmlFor="servo-addr">Address</Label>
              <Input
                id="servo-addr"
                value={selectedComponent.props?.addr || ''}
                onChange={(e) => handlePropUpdate('addr', e.target.value)}
                placeholder="e.g., S1"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              No editable properties for this component type.
            </p>
          </div>
        );
    }
  };

  const canTransform = ['dc_supply', 'led', 'rgb_led', 'diode', 'switch', 'toggle_switch', 'ground', 'voltmeter', 'push_button', 'push_button_momentary', 'push_button_latch'].includes(selectedTypeNormalized);

  const isSwitchLike = selectedTypeNormalized === 'switch' || selectedTypeNormalized === 'toggle_switch';
  const switchVariantLabel = isSwitchLike && selectedComponent.variantId ? ` (${selectedComponent.variantId})` : '';

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-medium">{selectedComponent.type.toUpperCase()}{switchVariantLabel}</div>
        <div className="text-xs text-muted-foreground">ID: {selectedComponent.id}</div>
      </div>

      {canTransform && (onRotate90 || onFlipX || onFlipY) && (
        <div className="flex flex-wrap items-center gap-2">
          {onRotate90 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRotate90(selectedComponent.id)}
              title="Rotate 90°"
            >
              Rotate 90°
            </Button>
          )}
          {(onFlipX || onUpdateComponent) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onFlipX ? onFlipX(selectedComponent.id) : onUpdateComponent({ flipX: !selectedComponent.flipX })}
              title="Mirror X (M)"
            >
              Mirror X
            </Button>
          )}
          {onFlipY && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onFlipY(selectedComponent.id)}
              title="Mirror Y"
            >
              Mirror Y
            </Button>
          )}
          <span className="text-xs text-muted-foreground">
            {selectedComponent.flipX && 'X '}{selectedComponent.flipY && 'Y '}
            {selectedComponent.rotation ? `@${selectedComponent.rotation}°` : ''}
          </span>
        </div>
      )}
      
      {renderComponentInspector()}

      {/* Wiring suggestions (non-blocking hints) */}
      {getWiringHints(selectedTypeNormalized).length > 0 && (
        <div className="pt-3 border-t">
          <div className="text-sm font-medium mb-2">Wiring</div>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            {getWiringHints(selectedTypeNormalized).map((hint, i) => (
              <li key={i}>{hint}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Quick editing for common components */}
      {selectedComponent.type === 'led' && (
        <div className="pt-3 border-t">
          <div className="text-sm font-medium mb-2">Quick LED Color</div>
          <div className="grid grid-cols-6 gap-1">
            {COLORS.map(c => (
              <button 
                key={c} 
                className={`h-6 border rounded ${selectedComponent.props?.color === c ? 'ring-2 ring-blue-500' : ''}`}
                style={{ background: c }}
                onClick={() => onUpdateComponent({ 
                  props: { ...selectedComponent.props, color: c } 
                })}
              />
            ))}
          </div>
        </div>
      )}

      {selectedComponent.type === 'resistor' && (
        <div className="pt-3 border-t">
          <div className="text-sm font-medium mb-2">Quick Resistance</div>
          <div className="grid grid-cols-3 gap-1">
            {[220, 330, 470, 1e3, 2.2e3, 4.7e3, 10e3, 22e3, 47e3, 100e3].map(ohms => (
              <button
                key={ohms}
                type="button"
                className={`h-6 min-w-0 text-xs font-medium border rounded px-1 ${(selectedComponent.props?.resistanceOhms ?? selectedComponent.props?.ohms) === ohms ? 'bg-blue-500 text-white border-blue-600' : 'bg-muted text-muted-foreground hover:bg-muted/80 border-border'}`}
                onClick={() => onUpdateComponent({
                  props: { ...selectedComponent.props, resistanceOhms: ohms, ohms },
                })}
              >
                {ohms >= 1000 ? `${ohms / 1000}k` : ohms}
              </button>
            ))}
          </div>
        </div>
      )}

      {(selectedComponent.type === 'potentiometer' || (selectedComponent.type as string) === 'potentiometer') && (
        <div className="pt-3 border-t space-y-3">
          <div className="text-sm font-medium">Potentiometer</div>
          <div>
            <Label className="text-xs">Value (Ω)</Label>
            <div className="grid grid-cols-4 gap-1 mt-1">
              {[1e3, 5e3, 10e3, 50e3, 100e3, 500e3, 1e6].map(ohms => (
                <button
                  key={ohms}
                  className={`h-7 text-xs border rounded ${(selectedComponent.props?.rTotalOhms ?? 10000) === ohms ? 'bg-blue-500 text-white' : 'bg-muted'}`}
                  onClick={() => onUpdateComponent({
                    props: { ...selectedComponent.props, rTotalOhms: ohms },
                  })}
                >
                  {ohms >= 1e6 ? `${ohms/1e6}M` : ohms >= 1000 ? `${ohms/1000}k` : ohms}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-1">
              <Input
                type="number"
                min={1}
                step={100}
                className="h-8 text-xs"
                value={selectedComponent.props?.rTotalOhms ?? 10000}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (Number.isFinite(v) && v > 0) onUpdateComponent({ props: { ...selectedComponent.props, rTotalOhms: v } });
                }}
              />
              <span className="text-xs self-center text-muted-foreground">Ω</span>
            </div>
          </div>
          <div>
            <Label className="text-xs">Taper</Label>
            <Select
              value={(selectedComponent.props?.taper as string) ?? 'linear'}
              onValueChange={(v) => onUpdateComponent({ props: { ...selectedComponent.props, taper: v } })}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="linear">Linear</SelectItem>
                <SelectItem value="log">Log (audio)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Position (α): {Math.round(((selectedComponent.props?.alpha as number) ?? 0.5) * 100)}%</Label>
            <Slider
              className="mt-1"
              min={0}
              max={100}
              step={1}
              value={[Math.round(((selectedComponent.props?.alpha as number) ?? 0.5) * 100)]}
              onValueChange={([v]) => onUpdateComponent({ props: { ...selectedComponent.props, alpha: v / 100 } })}
            />
          </div>
          {solveResult != null && (() => {
            const out = solveResult?.outputsByComponentId?.[selectedComponent.id] as { rTotal?: number; alpha?: number; rTop?: number; rBot?: number; vIn?: number; vOut?: number; vGnd?: number; iTop?: number; iBot?: number; pTop?: number; pBot?: number; pTotal?: number; floating?: boolean } | undefined;
            if (!out || out.floating) return <div className="text-xs text-amber-600">Floating or not solved</div>;
            return (
              <div className="text-xs space-y-1 rounded border p-2 bg-muted/30">
                <div>R_top: {out.rTop?.toFixed(1) ?? '—'} Ω · R_bot: {out.rBot?.toFixed(1) ?? '—'} Ω</div>
                <div>V<sub>IN</sub>: {(out.vIn ?? 0).toFixed(2)} V · V<sub>OUT</sub>: {(out.vOut ?? 0).toFixed(2)} V · V<sub>GND</sub>: {(out.vGnd ?? 0).toFixed(2)} V</div>
                <div>I_top: {(out.iTop ?? 0).toFixed(4)} A · I_bot: {(out.iBot ?? 0).toFixed(4)} A</div>
                <div>P_total: {(out.pTotal ?? 0).toFixed(4)} W</div>
              </div>
            );
          })()}
        </div>
      )}

      {selectedComponent.type === 'wire' && (
        <div className="pt-3 border-t">
          <div className="text-sm font-medium mb-2">Quick Wire Color</div>
          <div className="grid grid-cols-4 gap-1">
            {COLORS.map(c => (
              <button 
                key={c} 
                className={`h-6 border rounded ${selectedComponent.props?.color === c ? 'ring-2 ring-blue-500' : ''}`}
                style={{ background: c }}
                onClick={() => onUpdateComponent({ 
                  props: { ...selectedComponent.props, color: c } 
                })}
              />
            ))}
          </div>
        </div>
      )}

      <div className="pt-3 border-t">
        <div className="text-xs text-muted-foreground">
          Position: ({Math.round(selectedComponent.x)}, {Math.round(selectedComponent.y)})
        </div>
        <div className="text-xs text-muted-foreground">
          Pins: {selectedComponent.pins.length}
        </div>
      </div>

      {solveResult != null && (
        <div className="pt-3 border-t">
          <NetInspectorSection solveResult={solveResult} />
        </div>
      )}
    </div>
  );
};
