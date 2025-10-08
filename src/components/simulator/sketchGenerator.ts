// src/components/simulator/sketchGenerator.ts
import { SimState, SimComponent } from './types';

export function generateSketchFromState(state: SimState): string {
  const components = state.components;
  
  // Find ESP32 component
  const esp32 = components.find(c => c.type === 'esp32');
  if (!esp32) {
    return '// No ESP32 found in circuit';
  }

  // Find connected pins
  const connectedPins = new Set<number>();
  for (const wire of state.wires) {
    const fromComp = components.find(c => c.id === wire.from.componentId);
    const toComp = components.find(c => c.id === wire.to.componentId);
    
    if (fromComp?.type === 'esp32') {
      const pin = fromComp.pins.find(p => p.id === wire.from.pinId);
      if (pin?.gpio !== undefined) connectedPins.add(pin.gpio);
    }
    if (toComp?.type === 'esp32') {
      const pin = toComp.pins.find(p => p.id === wire.to.pinId);
      if (pin?.gpio !== undefined) connectedPins.add(pin.gpio);
    }
  }

  // Find output components (LEDs, Buzzers)
  const outputs = components.filter(c => c.type === 'led' || c.type === 'buzzer');
  
  // Find input components (Buttons, Sensors)
  const inputs = components.filter(c => c.type === 'button' || c.type === 'pir' || c.type === 'ultrasonic' || c.type === 'ds18b20');

  let sketch = `// Generated Arduino Sketch
// Circuit: ${components.length} components, ${state.wires.length} wires

void setup() {
  Serial.begin(115200);
  
  // Configure pins
`;

  // Add pin configurations
  for (const pin of connectedPins) {
    const isOutput = outputs.some(comp => {
      return state.wires.some(w => {
        const fromComp = components.find(c => c.id === w.from.componentId);
        const toComp = components.find(c => c.id === w.to.componentId);
        return (fromComp?.type === 'esp32' && fromComp.pins.find(p => p.id === w.from.pinId)?.gpio === pin) ||
               (toComp?.type === 'esp32' && toComp.pins.find(p => p.id === w.to.pinId)?.gpio === pin);
      });
    });
    
    if (isOutput) {
      sketch += `  pinMode(${pin}, OUTPUT);\n`;
    } else {
      sketch += `  pinMode(${pin}, INPUT);\n`;
    }
  }

  sketch += `}

void loop() {
  // Read inputs
`;

  // Add input reading
  for (const input of inputs) {
    if (input.type === 'button') {
      sketch += `  // Button reading\n`;
      sketch += `  // int buttonState = digitalRead(BUTTON_PIN);\n`;
    } else if (input.type === 'pir') {
      sketch += `  // PIR motion sensor\n`;
      sketch += `  // int motion = digitalRead(PIR_PIN);\n`;
    } else if (input.type === 'ultrasonic') {
      sketch += `  // Ultrasonic sensor\n`;
      sketch += `  // long duration = pulseIn(ECHO_PIN, HIGH);\n`;
    } else if (input.type === 'ds18b20') {
      sketch += `  // Temperature sensor\n`;
      sketch += `  // float temp = sensor.readTempC();\n`;
    }
  }

  sketch += `
  // Control outputs
`;

  // Add output control
  for (const output of outputs) {
    if (output.type === 'led') {
      sketch += `  // LED control\n`;
      sketch += `  // digitalWrite(LED_PIN, HIGH);\n`;
    } else if (output.type === 'buzzer') {
      sketch += `  // Buzzer control\n`;
      sketch += `  // digitalWrite(BUZZER_PIN, HIGH);\n`;
    }
  }

  sketch += `
  delay(100);
}`;

  return sketch;
}
