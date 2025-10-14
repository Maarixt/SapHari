/**
 * Tactile Switch Test Example
 * Demonstrates 4-leg tactile switch with net bridging behavior
 */

export const tactSwitchTestSketch = `
// Tactile Switch Test Sketch
// Demonstrates proper 4-leg switch wiring and net bridging

const BUTTON_PIN = 15;  // GPIO15 - connect to button B1 or B2
const LED_PIN = 2;      // GPIO2 - built-in LED

void setup() {
  // Configure button pin with internal pull-up
  // Connect A1/A2 to GND, B1/B2 to GPIO15
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  
  // Configure LED pin
  pinMode(LED_PIN, OUTPUT);
  
  // Optional: attach interrupt for immediate response
  attachInterrupt(BUTTON_PIN, buttonInterrupt, CHANGE);
  
  Serial.begin(115200);
  Serial.println("Tactile Switch Test Started");
  Serial.println("Press the 4-leg switch to toggle LED");
  Serial.println("A1/A2 are internally shorted");
  Serial.println("B1/B2 are internally shorted");
  Serial.println("Pressing bridges A-side to B-side");
}

void loop() {
  // Read button state (LOW when pressed due to pull-up)
  int buttonState = digitalRead(BUTTON_PIN);
  
  // Invert logic: button pressed = LOW, so we invert for LED
  digitalWrite(LED_PIN, buttonState ? LOW : HIGH);
  
  // Optional: print button state
  if (buttonState == LOW) {
    Serial.println("Switch PRESSED - A-side bridged to B-side");
  }
  
  delay(10); // Small delay for stability
}

// Interrupt handler for immediate response
void buttonInterrupt() {
  int buttonState = digitalRead(BUTTON_PIN);
  digitalWrite(LED_PIN, buttonState ? LOW : HIGH);
  
  if (buttonState == LOW) {
    Serial.println("Switch interrupt: PRESSED - Net bridge active");
  } else {
    Serial.println("Switch interrupt: RELEASED - Net bridge removed");
  }
}
`;

export const tactSwitchTestCircuit = {
  components: [
    {
      id: 'esp32-test',
      type: 'esp32',
      x: 100,
      y: 100,
      rotation: 0,
      props: {},
      pins: [
        { id: '3v3', label: '3V3', kind: 'power', x: 0, y: 0 },
        { id: 'gnd', label: 'GND', kind: 'ground', x: 0, y: 10 },
        { id: 'gpio2', label: 'GPIO2', kind: 'digital', gpio: 2, x: 20, y: 0 },
        { id: 'gpio15', label: 'GPIO15', kind: 'digital', gpio: 15, x: 20, y: 10 },
      ]
    },
    {
      id: 'tact-switch-test',
      type: 'button',
      x: 200,
      y: 100,
      rotation: 0,
      props: { 
        bounceMs: 10, 
        contactResistance: 0.08, 
        orientation: 0,
        label: 'TACT-SW'
      },
      pins: [
        { id: 'A1', label: 'A1', kind: 'digital', x: 0, y: 0 },
        { id: 'A2', label: 'A2', kind: 'digital', x: 10, y: 0 },
        { id: 'B1', label: 'B1', kind: 'digital', x: 0, y: 10 },
        { id: 'B2', label: 'B2', kind: 'digital', x: 10, y: 10 },
      ]
    },
    {
      id: 'led-test',
      type: 'led',
      x: 300,
      y: 100,
      rotation: 0,
      props: { color: 'red', forwardVoltage: 1.8 },
      pins: [
        { id: 'anode', label: '+', kind: 'digital', x: 0, y: 0 },
        { id: 'cathode', label: '-', kind: 'digital', x: 10, y: 0 }
      ]
    }
  ],
  wires: [
    // A-side to GND (either A1 or A2)
    {
      id: 'wire-switch-a1-gnd',
      from: { componentId: 'tact-switch-test', pinId: 'A1' },
      to: { componentId: 'esp32-test', pinId: 'gnd' },
      color: 'black'
    },
    // B-side to GPIO15 (either B1 or B2)
    {
      id: 'wire-switch-b1-gpio',
      from: { componentId: 'tact-switch-test', pinId: 'B1' },
      to: { componentId: 'esp32-test', pinId: 'gpio15' },
      color: 'blue'
    },
    // LED connections
    {
      id: 'wire-led-anode',
      from: { componentId: 'esp32-test', pinId: 'gpio2' },
      to: { componentId: 'led-test', pinId: 'anode' },
      color: 'red'
    },
    {
      id: 'wire-led-cathode',
      from: { componentId: 'led-test', pinId: 'cathode' },
      to: { componentId: 'esp32-test', pinId: 'gnd' },
      color: 'black'
    }
  ]
};

export const pureDCCircuit = {
  components: [
    {
      id: 'battery-9v',
      type: 'battery',
      x: 100,
      y: 100,
      rotation: 0,
      props: { voltage: 9, capacity: 500 },
      pins: [
        { id: 'positive', label: '+', kind: 'power', x: 0, y: 0 },
        { id: 'negative', label: '-', kind: 'ground', x: 0, y: 10 },
      ]
    },
    {
      id: 'tact-switch-dc',
      type: 'button',
      x: 200,
      y: 100,
      rotation: 0,
      props: { 
        bounceMs: 10, 
        contactResistance: 0.08, 
        orientation: 0,
        label: 'TACT-SW'
      },
      pins: [
        { id: 'A1', label: 'A1', kind: 'digital', x: 0, y: 0 },
        { id: 'A2', label: 'A2', kind: 'digital', x: 10, y: 0 },
        { id: 'B1', label: 'B1', kind: 'digital', x: 0, y: 10 },
        { id: 'B2', label: 'B2', kind: 'digital', x: 10, y: 10 },
      ]
    },
    {
      id: 'led-dc',
      type: 'led',
      x: 300,
      y: 100,
      rotation: 0,
      props: { color: 'red', forwardVoltage: 2.0, seriesResistor: 330 },
      pins: [
        { id: 'anode', label: '+', kind: 'digital', x: 0, y: 0 },
        { id: 'cathode', label: '-', kind: 'digital', x: 10, y: 0 }
      ]
    }
  ],
  wires: [
    // Battery+ → LED anode
    {
      id: 'wire-battery-led',
      from: { componentId: 'battery-9v', pinId: 'positive' },
      to: { componentId: 'led-dc', pinId: 'anode' },
      color: 'red'
    },
    // LED cathode → Switch A-side
    {
      id: 'wire-led-switch',
      from: { componentId: 'led-dc', pinId: 'cathode' },
      to: { componentId: 'tact-switch-dc', pinId: 'A1' },
      color: 'black'
    },
    // Switch B-side → Battery-
    {
      id: 'wire-switch-battery',
      from: { componentId: 'tact-switch-dc', pinId: 'B1' },
      to: { componentId: 'battery-9v', pinId: 'negative' },
      color: 'black'
    }
  ]
};

export const tactSwitchTestInstructions = `
## 4-Leg Tactile Switch Test Instructions

### Circuit Setup:
1. ESP32 DevKit with GPIO15 and GPIO2
2. 4-Leg Tactile Switch with A1, A2, B1, B2 pins
3. LED with anode and cathode pins

### Wiring (Pull-up Input):
- Switch A1 or A2 → ESP32 GND
- Switch B1 or B2 → ESP32 GPIO15
- LED anode → ESP32 GPIO2
- LED cathode → ESP32 GND

### Expected Behavior:
- LED should be OFF when switch is not pressed
- LED should be ON when switch is pressed
- Switch should have realistic bounce behavior
- Serial output should show switch state changes

### Key Features Demonstrated:
- **Internal Shorts**: A1↔A2 and B1↔B2 are always connected
- **Net Bridging**: Pressing connects A-side to B-side (all 4 pins become one net)
- **Proper Pull-up**: INPUT_PULLUP on GPIO15
- **Logic Inversion**: Switch pressed = LOW, so invert for LED
- **Realistic Bounce**: Configurable mechanical bounce simulation

### Pure DC Circuit (No MCU):
- Battery+ → LED(+) → LED(-) → Switch A1/A2
- Switch B1/B2 → Battery-
- Pressing completes the circuit and lights the LED

### Educational Value:
- Shows real tactile switch behavior
- Demonstrates net bridging concept
- Teaches proper breadboard wiring
- Explains internal switch shorts
`;

export default {
  sketch: tactSwitchTestSketch,
  circuit: tactSwitchTestCircuit,
  pureDC: pureDCCircuit,
  instructions: tactSwitchTestInstructions
};
