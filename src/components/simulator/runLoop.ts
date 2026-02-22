import { buildNets, assignVoltages, simulateComponents, type Net } from './engine';
import { solveCircuit as solveCircuitEngine2, type SolveResult } from './engine2';
import { SimState } from './types';
import { buzzerStart, buzzerStop } from './audio';
import { subscribe, publish as publishSimEvent } from './events/simEvents';

const USE_ENGINE2 = true;
let engine2SolveResultRef: SolveResult | null = null;

export function getEngine2SolveResult(): SolveResult | null {
  return engine2SolveResultRef;
}

export function setEngine2SolveResultRef(result: SolveResult | null): void {
  engine2SolveResultRef = result;
}

// Helper function to get voltage at a specific pin
function voltageOfPin(nets: Net[], compId: string, pinId: string) {
  const net = nets.find(n => n.pins.some((p: { compId: string; pinId: string }) => p.compId === compId && p.pinId === pinId));
  return net?.voltage ?? undefined;
}

export function startLoop(
  getState: () => SimState, 
  setState: (f: any) => void, 
  publish: (t: string, m: string, o?: any) => void, 
  simId: string
) {
  const t = setInterval(() => {
    try {
      const s = getState();
      if (!s || !s.components || !Array.isArray(s.components)) {
        return; // Skip if state is invalid
      }
      const overriddenState = applyMQTTOverrides(s);

      if (USE_ENGINE2) {
        const solveResult = solveCircuitEngine2(overriddenState);
        engine2SolveResultRef = solveResult;

        const updatedComponents = overriddenState.components.map((c) => {
          if (c.type === 'led') {
            const out = solveResult.outputsByComponentId[c.id] as {
              on?: boolean;
              brightness?: number;
              status?: string;
              damageAccumTicks?: number;
            } | undefined;
            if (!out) return c;
            const burned = out.status === 'burned';
            return {
              ...c,
              props: {
                ...c.props,
                on: out.on,
                brightness: out.brightness,
                ledStatus: out.status,
                ledDamageAccumTicks: out.damageAccumTicks ?? 0,
                ledBurned: burned,
              },
            };
          }
          if (c.type === 'rgb_led') {
            const out = solveResult.outputsByComponentId[c.id] as {
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
            if (!out) return c;
            return {
              ...c,
              props: {
                ...c.props,
                brightnessR: out.brightnessR ?? 0,
                brightnessG: out.brightnessG ?? 0,
                brightnessB: out.brightnessB ?? 0,
                rgbCurrentR: out.currentR,
                rgbCurrentG: out.currentG,
                rgbCurrentB: out.currentB,
                rgbVoltageDropR: out.voltageDropR,
                rgbVoltageDropG: out.voltageDropG,
                rgbVoltageDropB: out.voltageDropB,
                mixedColor: out.mixedColor,
              },
            };
          }
          if ((c.type as string) === 'diode') {
            const out = solveResult.outputsByComponentId[c.id] as { state?: 'OFF' | 'ON' | 'BREAKDOWN'; vd?: number; id?: number } | undefined;
            if (out) return { ...c, props: { ...c.props, diodeState: out.state ?? 'OFF' } };
          }
          if ((c.type as string) === 'motor_dc' || (c.type as string) === 'motor_ac') {
            const out = solveResult.outputsByComponentId[c.id] as { spinning?: boolean; speed?: number; direction?: number; current?: number; voltage?: number; power?: number } | undefined;
            if (out) return { ...c, props: { ...c.props, spinning: out.spinning, speed: out.speed, direction: out.direction, motorCurrent: out.current, motorVoltage: out.voltage, motorPower: out.power } };
          }
          if (c.type === 'buzzer') {
            const out = solveResult.outputsByComponentId[c.id] as { audible?: boolean } | undefined;
            const on = !!out?.audible;
            const freq = Math.max(100, Math.min(10000, (c.props?.frequency as number) ?? 2000));
            const volume = Math.max(0, Math.min(1, (c.props?.volume as number) ?? 0.5));
            if (on) buzzerStart(c.id, freq, volume);
            if (!on && c.props?.active) buzzerStop(c.id);
            if (c.props?.active !== on) return { ...c, props: { ...c.props, active: on } };
          }
          if (c.type === 'voltmeter') {
            const out = solveResult.outputsByComponentId[c.id] as {
              type: 'Voltmeter';
              volts: number | null;
              connected: boolean;
              floating: boolean;
              netPlus: string | null;
              netMinus: string | null;
              vPlus: number | null;
              vMinus: number | null;
            } | undefined;
            if (out?.type === 'Voltmeter') {
              return {
                ...c,
                props: {
                  ...c.props,
                  voltmeterVolts: out.volts,
                  voltmeterConnected: out.connected,
                  voltmeterFloating: out.floating,
                  voltmeterNetPlus: out.netPlus,
                  voltmeterNetMinus: out.netMinus,
                  voltmeterVPlus: out.vPlus,
                  voltmeterVMinus: out.vMinus,
                },
              };
            }
          }
          if ((c.type as string) === 'transistor') {
            const out = solveResult.outputsByComponentId[c.id] as {
              region: 'cutoff' | 'active' | 'saturation' | 'floating';
              vb: number | null;
              vc: number | null;
              ve: number | null;
              vbe: number | null;
              vce: number | null;
              ib: number;
              ic: number;
            } | undefined;
            if (out) {
              const on = out.region === 'active' || out.region === 'saturation';
              return {
                ...c,
                props: {
                  ...c.props,
                  transistorRegion: out.region,
                  transistorOn: on,
                  vb: out.vb,
                  vc: out.vc,
                  ve: out.ve,
                  vbe: out.vbe,
                  vce: out.vce,
                  ib: out.ib,
                  ic: out.ic,
                },
              };
            }
          }
          return c;
        });

        const updatedState = simulateComponents({ ...overriddenState, components: updatedComponents }, []);
        publishSensorReadings(updatedState, publish, simId);
        setState(updatedState);
        return;
      }

      const nets = buildNets(s);
      assignVoltages(nets, overriddenState.components, mqttOverrides);

      // Legacy path: LED on must not be set from voltage alone (spec: branch current only).
      // Legacy engine does not expose branch current, so keep LEDs OFF here; use engine2 for correct behavior.
      let dirty = false;
      const updatedComponents = overriddenState.components.map(c => {
        if (c.type === 'led') {
          const on = false;
          if (c.props?.on !== on) {
            dirty = true;
            return { ...c, props: { ...c.props, on, brightness: 0 } };
          }
        }
        
        if (c.type === 'buzzer') {
          // Legacy path: no solver → no branch current. Do not drive buzzer from voltage alone.
          if (c.props?.active) {
            buzzerStop(c.id);
            dirty = true;
            return { ...c, props: { ...c.props, active: false } };
          }
        }

        return c;
      });

      // Update component visuals (LED glow, buzzer active)
      const updatedState = simulateComponents({ ...overriddenState, components: updatedComponents }, nets);

      // Publish simulated sensors to MQTT
      publishSensorReadings(updatedState, publish, simId);

      // Update state with simulation results
      setState(updatedState);
    } catch (error) {
      console.warn('Simulation loop error:', error);
    }
  }, 50); // 20 FPS

  return () => clearInterval(t);
}

// Store for MQTT command overrides
let mqttOverrides: Map<string, any> = new Map();

// Clean up buzzer audio when components are deleted
export function cleanupBuzzerAudio(componentIds: string[]) {
  componentIds.forEach(id => {
    buzzerStop(id);
  });
}

// Subscribe to MQTT command events via internal event bus
subscribe('SET_OUTPUT', (payload) => {
  const { pin, state } = payload as { pin: number; state: boolean };
  mqttOverrides.set(`gpio${pin}`, state ? 3.3 : 0);
});
subscribe('SET_SERVO', (payload) => {
  const { addr, angle } = payload as { addr: string | number; angle: number };
  mqttOverrides.set(`servo_${addr}`, angle);
});

// Apply MQTT command overrides to component states
function applyMQTTOverrides(state: SimState): SimState {
  if (mqttOverrides.size === 0) return state;

  const updatedComponents = state.components.map(comp => {
    // Apply servo overrides
    if (comp.type === 'servo' && comp.props?.addr) {
      const overrideAngle = mqttOverrides.get(`servo_${comp.props.addr}`);
      if (overrideAngle !== undefined) {
        return {
          ...comp,
          props: { ...comp.props, angle: overrideAngle }
        };
      }
    }

    return comp;
  });

  return {
    ...state,
    components: updatedComponents
  };
}

// Publish sensor readings to MQTT
function publishSensorReadings(state: SimState, publish: (t: string, m: string, o?: any) => void, simId: string) {
  for (const comp of state.components) {
    if (!comp.props?.addr) continue; // Skip components without address

    switch (comp.type) {
      case 'pir':
        const motionValue = comp.props?.motion ? '1' : '0';
        publish(`saphari/${simId}/sensor/${comp.props.addr}`, motionValue, { retain: true });
        break;
        
      case 'ultrasonic':
        const distanceValue = String(comp.props?.distance || 0);
        publish(`saphari/${simId}/sensor/${comp.props.addr}`, distanceValue, { retain: true });
        break;
        
      case 'ds18b20':
        const tempValue = String(comp.props?.temperature || 25);
        publish(`saphari/${simId}/sensor/${comp.props.addr}`, tempValue, { retain: true });
        break;
        
      case 'pot':
        const potValue = String(comp.props?.value || 0);
        publish(`saphari/${simId}/sensor/${comp.props.addr}`, potValue, { retain: true });
        break;
        
      case 'servo':
        const servoValue = String(comp.props?.angle || 90);
        publish(`saphari/${simId}/sensor/${comp.props.addr}`, servoValue, { retain: true });
        break;
    }
  }
}
