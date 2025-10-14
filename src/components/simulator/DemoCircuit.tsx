/**
 * Demo Circuit Component
 * Shows how to create a simple circuit with the enhanced simulation
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createSimpleCircuit } from '../../sim/examples/simpleCircuit';

interface DemoCircuitProps {
  onLoadCircuit: (circuit: any) => void;
}

export const DemoCircuit: React.FC<DemoCircuitProps> = ({ onLoadCircuit }) => {
  const loadDemoCircuit = () => {
    const demoCircuit = createSimpleCircuit();
    onLoadCircuit(demoCircuit);
  };

  const demoCode = `// Enhanced Arduino Sketch Example
const int BUTTON_PIN = 2;
const int LED_PIN = 2;
const int POT_PIN = 34;

void setup() {
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  
  Serial.begin(115200);
  Serial.println("Enhanced ESP32 Simulator Demo");
}

void loop() {
  // Read button with debouncing
  bool buttonPressed = !digitalRead(BUTTON_PIN);
  
  // Read potentiometer for brightness
  int potValue = analogRead(POT_PIN);
  int brightness = map(potValue, 0, 4095, 0, 255);
  
  // Control LED with PWM
  if (buttonPressed) {
    analogWrite(LED_PIN, brightness);
    Serial.print("LED ON - Brightness: ");
    Serial.println(brightness);
  } else {
    digitalWrite(LED_PIN, LOW);
    Serial.println("LED OFF");
  }
  
  delay(100);
}`;

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🚀 Enhanced Simulation Demo
          <Badge variant="secondary">New</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          This demo showcases the new pin-accurate simulation with realistic component behaviors:
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium">✨ Enhanced Features</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Realistic button debouncing</li>
              <li>• LED forward voltage simulation</li>
              <li>• Potentiometer with noise</li>
              <li>• Real-time circuit warnings</li>
              <li>• Arduino-compatible API</li>
              <li>• Deterministic simulation</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">🔧 Components</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• ESP32 DevKit (GPIO mapping)</li>
              <li>• Push Button (debounced)</li>
              <li>• LED (forward voltage)</li>
              <li>• Potentiometer (noise)</li>
              <li>• Power connections</li>
            </ul>
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-medium">📝 Example Arduino Code</h4>
          <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
            {demoCode}
          </pre>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={loadDemoCircuit} className="flex-1">
            Load Demo Circuit
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground">
          <strong>Note:</strong> The enhanced simulation provides realistic component behaviors, 
          real-time warnings for circuit issues, and full Arduino API compatibility. 
          Check the Warnings tab for circuit safety information.
        </div>
      </CardContent>
    </Card>
  );
};

export default DemoCircuit;
