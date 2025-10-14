/**
 * Push Button Test Example
 * Demonstrates interactive push button with proper electrical behavior
 */

export const buttonTestSketch = `
// Push Button Test Sketch
// Demonstrates proper button wiring and debouncing

const BUTTON_PIN = 15;  // GPIO15 - connect to button SIGNAL pin
const LED_PIN = 2;      // GPIO2 - built-in LED

void setup() {
  // Configure button pin with internal pull-up
  // This is correct for buttons wired to GND when pressed
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  
  // Configure LED pin
  pinMode(LED_PIN, OUTPUT);
  
  // Optional: attach interrupt for immediate response
  attachInterrupt(BUTTON_PIN, buttonInterrupt, CHANGE);
  
  Serial.begin(115200);
  Serial.println("Push Button Test Started");
  Serial.println("Press the button to toggle LED");
}

void loop() {
  // Read button state (LOW when pressed due to pull-up)
  int buttonState = digitalRead(BUTTON_PIN);
  
  // Invert logic: button pressed = LOW, so we invert for LED
  digitalWrite(LED_PIN, buttonState ? LOW : HIGH);
  
  // Optional: print button state
  if (buttonState == LOW) {
    Serial.println("Button PRESSED");
  }
  
  delay(10); // Small delay for stability
}

// Interrupt handler for immediate response
void buttonInterrupt() {
  int buttonState = digitalRead(BUTTON_PIN);
  digitalWrite(LED_PIN, buttonState ? LOW : HIGH);
  
  if (buttonState == LOW) {
    Serial.println("Button interrupt: PRESSED");
  } else {
    Serial.println("Button interrupt: RELEASED");
  }
}
`;

export const buttonTestCircuit = {
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
      id: 'button-test',
      type: 'button',
      x: 200,
      y: 100,
      rotation: 0,
      props: { 
        wiredTo: 'GND', 
        debounceMs: 12, 
        bounceMs: 8,
        label: 'TEST-BTN'
      },
      pins: [
        { id: 'SIGNAL', label: 'SIG', kind: 'digital', x: 0, y: 0 },
        { id: 'VCC', label: 'VCC', kind: 'power', x: 10, y: 0 },
        { id: 'GND', label: 'GND', kind: 'ground', x: 20, y: 0 },
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
    {
      id: 'wire-button-signal',
      from: { componentId: 'button-test', pinId: 'SIGNAL' },
      to: { componentId: 'esp32-test', pinId: 'gpio15' },
      color: 'blue'
    },
    {
      id: 'wire-button-gnd',
      from: { componentId: 'button-test', pinId: 'GND' },
      to: { componentId: 'esp32-test', pinId: 'gnd' },
      color: 'black'
    },
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

export const buttonTestInstructions = `
## Push Button Test Instructions

### Circuit Setup:
1. ESP32 DevKit with GPIO15 and GPIO2
2. Push Button with SIGNAL, VCC, GND pins
3. LED with anode and cathode pins

### Wiring:
- Button SIGNAL → ESP32 GPIO15
- Button GND → ESP32 GND
- Button VCC → (leave unconnected for GND wiring)
- LED anode → ESP32 GPIO2
- LED cathode → ESP32 GND

### Expected Behavior:
- LED should be OFF when button is not pressed
- LED should be ON when button is pressed
- Button should have realistic bounce behavior
- Serial output should show button state changes

### Key Features Demonstrated:
- Proper pull-up resistor usage (INPUT_PULLUP)
- Correct logic inversion for GND-wired buttons
- Interrupt handling for immediate response
- Debouncing through software
- Realistic button bounce simulation
`;

export default {
  sketch: buttonTestSketch,
  circuit: buttonTestCircuit,
  instructions: buttonTestInstructions
};
