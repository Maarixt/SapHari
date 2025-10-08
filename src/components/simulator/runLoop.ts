import { buildNets, assignVoltages, simulateComponents } from './engine';
import { SimState } from './types';
import { buzzerStart, buzzerStop } from './audio';

// Helper function to get voltage at a specific pin
function voltageOfPin(nets: any[], compId: string, pinId: string) {
  const net = nets.find(n => n.pins.some((p: any) => p.compId === compId && p.pinId === pinId));
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
      
      const nets = buildNets(s);
      
      // Apply MQTT command overrides (from toggle events)
      const overriddenState = applyMQTTOverrides(s);
      
      // Assign voltages with GPIO overrides
      assignVoltages(nets, overriddenState.components, mqttOverrides);

      // Update LED and Buzzer states based on voltage differences
      let dirty = false;
      const updatedComponents = overriddenState.components.map(c => {
        if (c.type === 'led') {
          const anodeVoltage = voltageOfPin(nets, c.id, 'anode') ?? 0;
          const cathodeVoltage = voltageOfPin(nets, c.id, 'cathode') ?? 0;
          const forward = anodeVoltage - cathodeVoltage; // crude model
          const on = forward > 1.8; // ~2V threshold
          
          if (c.props?.on !== on) {
            dirty = true;
            return { ...c, props: { ...c.props, on } };
          }
        }
        
        if (c.type === 'buzzer') {
          const posVoltage = voltageOfPin(nets, c.id, '+') ?? 0;
          const negVoltage = voltageOfPin(nets, c.id, '-') ?? 0;
          const on = (posVoltage - negVoltage) > 2.0; // ~2V threshold
          
          // Control buzzer audio
          if (on && !c.props?.active) {
            buzzerStart(c.id, 1500); // Start buzzer sound
          }
          if (!on && c.props?.active) {
            buzzerStop(c.id); // Stop buzzer sound
          }
          
          if (c.props?.active !== on) {
            dirty = true;
            return { ...c, props: { ...c.props, active: on } };
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

// Listen for MQTT command events
if (typeof window !== 'undefined') {
  window.addEventListener('sim:setOutput', (event: any) => {
    const { pin, state } = event.detail;
    mqttOverrides.set(`gpio${pin}`, state ? 3.3 : 0);
  });

  window.addEventListener('sim:setServo', (event: any) => {
    const { addr, angle } = event.detail;
    mqttOverrides.set(`servo_${addr}`, angle);
  });
}

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
