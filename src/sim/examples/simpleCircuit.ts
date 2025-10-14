/**
 * Simple Circuit Example
 * Demonstrates how to use the ESP32 Circuit Simulator
 */

import { SimulationEngine } from '../core/engine';
import { createESP32DevKit } from '../components/Esp32DevKit';
import { createPushButton } from '../components/PushButton';
import { createLed } from '../components/Led';
import { createPotentiometer } from '../components/Potentiometer';
import { SimState } from '../core/types';

/**
 * Create a simple circuit: Button -> LED with potentiometer for brightness control
 */
export function createSimpleCircuit(): SimState {
  // Create components
  const esp32 = createESP32DevKit('esp32_1');
  const button = createPushButton('btn1', { 
    wiredTo: 'GND', 
    bounceMs: 10 
  });
  const led = createLed('led1', { 
    color: 'red', 
    forwardVoltage: 1.8,
    maxCurrent: 20 
  });
  const pot = createPotentiometer('pot1', { 
    value: 0.5, 
    resistance: 10000 
  });

  // Create circuit state
  const state: SimState = {
    components: [
      {
        id: 'esp32_1',
        type: 'esp32',
        x: 100,
        y: 100,
        rotation: 0,
        pins: [],
        props: {}
      },
      {
        id: 'btn1',
        type: 'button',
        x: 200,
        y: 100,
        rotation: 0,
        pins: [],
        props: { wiredTo: 'GND', bounceMs: 10 }
      },
      {
        id: 'led1',
        type: 'led',
        x: 300,
        y: 100,
        rotation: 0,
        pins: [],
        props: { color: 'red', forwardVoltage: 1.8 }
      },
      {
        id: 'pot1',
        type: 'potentiometer',
        x: 200,
        y: 200,
        rotation: 0,
        pins: [],
        props: { value: 0.5, resistance: 10000 }
      }
    ],
    wires: [
      {
        id: 'wire1',
        from: { componentId: 'esp32_1', pinId: '3V3' },
        to: { componentId: 'btn1', pinId: 'pin1' }
      },
      {
        id: 'wire2',
        from: { componentId: 'btn1', pinId: 'pin2' },
        to: { componentId: 'esp32_1', pinId: 'GND' }
      },
      {
        id: 'wire3',
        from: { componentId: 'esp32_1', pinId: 'GPIO2' },
        to: { componentId: 'led1', pinId: 'anode' }
      },
      {
        id: 'wire4',
        from: { componentId: 'led1', pinId: 'cathode' },
        to: { componentId: 'esp32_1', pinId: 'GND' }
      },
      {
        id: 'wire5',
        from: { componentId: 'esp32_1', pinId: '3V3' },
        to: { componentId: 'pot1', pinId: 'vcc' }
      },
      {
        id: 'wire6',
        from: { componentId: 'pot1', pinId: 'gnd' },
        to: { componentId: 'esp32_1', pinId: 'GND' }
      },
      {
        id: 'wire7',
        from: { componentId: 'pot1', pinId: 'out' },
        to: { componentId: 'esp32_1', pinId: 'GPIO34' }
      }
    ],
    running: false,
    time: 0,
    timeScale: 1.0,
    seed: 12345,
    schemaVersion: '1.0.0'
  };

  return state;
}

/**
 * Run a simple simulation
 */
export function runSimpleSimulation(): void {
  console.log('🚀 Starting ESP32 Circuit Simulator Demo');
  
  // Create circuit
  const state = createSimpleCircuit();
  
  // Create simulation engine
  const engine = new SimulationEngine(state, 12345);
  
  console.log('📋 Circuit created with components:');
  state.components.forEach(comp => {
    console.log(`  - ${comp.type} (${comp.id})`);
  });
  
  console.log('🔌 Wires created:');
  state.wires.forEach(wire => {
    console.log(`  - ${wire.from.componentId}:${wire.from.pinId} -> ${wire.to.componentId}:${wire.to.pinId}`);
  });
  
  // Simulate for 100ms
  console.log('⚡ Running simulation for 100ms...');
  
  for (let i = 0; i < 100; i++) {
    engine.update(1); // 1ms timestep
    
    // Simulate button press at 50ms
    if (i === 50) {
      console.log('🔘 Button pressed!');
      // In a real implementation, this would be handled by the UI
    }
  }
  
  // Get final state
  const finalState = engine.getState();
  const warnings = engine.getWarnings();
  const stats = engine.getPerformanceStats();
  
  console.log('📊 Simulation Results:');
  console.log(`  - Final time: ${finalState.time}ms`);
  console.log(`  - Warnings: ${warnings.length}`);
  console.log(`  - Performance: ${stats.totalUpdateTime.toFixed(2)}ms total`);
  
  if (warnings.length > 0) {
    console.log('⚠️  Warnings:');
    warnings.forEach(warning => {
      console.log(`  - ${warning.code}: ${warning.message}`);
    });
  }
  
  console.log('✅ Simulation completed!');
}

/**
 * Arduino sketch example for the circuit
 */
export const arduinoSketch = `
// Simple Button -> LED with Potentiometer brightness control
// ESP32 Circuit Simulator Example

const int BUTTON_PIN = 2;
const int LED_PIN = 2;  // Same pin for simplicity
const int POT_PIN = 34;

void setup() {
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  
  Serial.begin(115200);
  Serial.println("ESP32 Circuit Simulator Demo");
}

void loop() {
  // Read button state
  bool buttonPressed = !digitalRead(BUTTON_PIN);
  
  // Read potentiometer for brightness control
  int potValue = analogRead(POT_PIN);
  int brightness = map(potValue, 0, 4095, 0, 255);
  
  // Control LED
  if (buttonPressed) {
    analogWrite(LED_PIN, brightness);
    Serial.print("LED ON - Brightness: ");
    Serial.println(brightness);
  } else {
    digitalWrite(LED_PIN, LOW);
    Serial.println("LED OFF");
  }
  
  delay(100);
}
`;

// Export for use in other modules
export default {
  createSimpleCircuit,
  runSimpleSimulation,
  arduinoSketch
};
