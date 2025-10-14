// src/components/simulator/scriptRuntime.ts
// import { getSimulationBridge } from './integration/SimulationBridge';

let running = false;

export function runSimScript(code: string) {
  running = true;
  
  // Try to use enhanced Arduino API (commented out for now)
  // const bridge = getSimulationBridge();
  // if (bridge.isEnhancedModeActive()) {
  //   runEnhancedSimScript(code, bridge);
  // } else {
  //   runLegacySimScript(code);
  // }
  
  // Use legacy script for now
  runLegacySimScript(code);
}

function runEnhancedSimScript(code: string, bridge: any) {
  const HIGH = 1, LOW = 0;
  const arduinoAPI = bridge.getArduinoAPI();
  
  // Enhanced API with full Arduino compatibility
  const api = {
    HIGH, LOW,
    pinMode: arduinoAPI.pinMode.bind(arduinoAPI),
    digitalWrite: arduinoAPI.digitalWrite.bind(arduinoAPI),
    digitalRead: arduinoAPI.digitalRead.bind(arduinoAPI),
    analogRead: arduinoAPI.analogRead.bind(arduinoAPI),
    ledcSetup: arduinoAPI.ledcSetup.bind(arduinoAPI),
    ledcAttachPin: arduinoAPI.ledcAttachPin.bind(arduinoAPI),
    ledcWrite: arduinoAPI.ledcWrite.bind(arduinoAPI),
    attachInterrupt: arduinoAPI.attachInterrupt.bind(arduinoAPI),
    detachInterrupt: arduinoAPI.detachInterrupt.bind(arduinoAPI),
    delay: arduinoAPI.delay.bind(arduinoAPI),
    millis: arduinoAPI.millis.bind(arduinoAPI),
    micros: arduinoAPI.micros.bind(arduinoAPI),
    Wire: arduinoAPI.Wire,
    SPI: arduinoAPI.SPI,
    Serial: arduinoAPI.Serial,
    loop: async (fn: () => any) => {
      while (running) await fn();
    }
  };

  try {
    // eslint-disable-next-line no-new-func
    const f = new Function(...Object.keys(api), code);
    f(...Object.values(api));
  } catch (error) {
    console.error('Enhanced script execution error:', error);
    // Fall back to legacy
    runLegacySimScript(code);
  }
}

function runLegacySimScript(code: string) {
  const HIGH = 1, LOW = 0;
  const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

  // Legacy API for backward compatibility
  const api = {
    HIGH, LOW,
    delay: sleep,
    digitalWrite: (pin: number, value: 0 | 1) => {
      window.dispatchEvent(new CustomEvent('sim:setOutput', { detail: { pin, state: value } }));
    },
    loop: async (fn: () => any) => {
      while (running) await fn();
    }
  };

  try {
    // eslint-disable-next-line no-new-func
    const f = new Function(...Object.keys(api), code);
    f(...Object.values(api));
  } catch (error) {
    console.error('Script execution error:', error);
  }
}

export function stopSimScript() {
  running = false;
}
