import { useEffect, useRef } from 'react';
import { useMQTT } from '@/hooks/useMQTT';
import { SimState } from './types';

export function useSimulatorMQTT(state: SimState, setState: (f: any) => void, simId: string) {
  const { publishMessage, onMessage } = useMQTT();

  // Online heartbeat
  useEffect(() => {
    if (!state.running) return;
    const t = setInterval(() => {
      publishMessage(`saphari/${simId}/status/online`, '1', true);
    }, 2000);
    return () => clearInterval(t);
  }, [state.running, publishMessage, simId]);

  // Commands in
  useEffect(() => {
    if (!onMessage) return;
    
    return onMessage((topic, payload) => {
      try {
        const msg = payload.toString();
        const parts = topic.split('/');
        if (parts[0] !== 'saphari' || parts[1] !== simId) return;
        const kind = parts[2]; // cmd|sensor|status
        if (kind !== 'cmd') return;

        const cmd = parts[3]; // toggle|servo|read
        const data = JSON.parse(msg);
        
        if (cmd === 'toggle') {
          // data: { addr, pin, state, override, key }
          console.log(`MQTT Toggle: GPIO${data.pin} = ${data.state ? 'HIGH' : 'LOW'}`);
          window.dispatchEvent(new CustomEvent('sim:setOutput', { detail: data }));
        } else if (cmd === 'servo') {
          // data: { addr, angle }
          console.log(`MQTT Servo: ${data.addr} = ${data.angle}°`);
          window.dispatchEvent(new CustomEvent('sim:setServo', { detail: data }));
        } else if (cmd === 'read') {
          // data: { addr }
          const sensorValue = readSensorValue(state, data.addr);
          publishMessage(`saphari/${simId}/sensor/${data.addr}`, String(sensorValue), true);
        }
      } catch (e) {
        console.warn('Failed to process MQTT command:', e);
      }
    });
  }, [state, onMessage, publishMessage, simId]);

  function readSensorValue(state: SimState, addr: string): number {
    // Map your component props → values. For now, return 0/1 or slider values you store in props.
    // Find component by address and return its current value
    const component = state.components.find(c => c.id === addr);
    if (!component) return 0;

    switch (component.type) {
      case 'pot':
        return component.props?.value || 0;
      case 'pir':
        return component.props?.motion ? 1 : 0;
      case 'ultrasonic':
        return component.props?.distance || 0;
      case 'ds18b20':
        return component.props?.temperature || 25;
      case 'servo':
        return component.props?.angle || 90;
      default:
        return 0;
    }
  }

  // Publish sensor readings periodically
  useEffect(() => {
    if (!state.running) return;
    
    const interval = setInterval(() => {
      state.components.forEach(comp => {
        if (comp.type === 'pot' || comp.type === 'pir' || comp.type === 'ultrasonic' || 
            comp.type === 'ds18b20' || comp.type === 'servo') {
          const value = readSensorValue(state, comp.id);
          publishMessage(`saphari/${simId}/sensor/${comp.id}`, String(value), true);
        }
      });
    }, 1000); // Publish sensor readings every second

    return () => clearInterval(interval);
  }, [state.running, state.components, publishMessage, simId]);

  return {
    readSensorValue
  };
}
