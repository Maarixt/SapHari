# 🔘 Interactive Push Button - User Guide

## Overview

The enhanced push button component provides realistic electrical behavior with proper debouncing, bounce simulation, and interactive controls.

## Features

### ✅ **Electrical Accuracy**
- **Proper Pin Configuration**: SIGNAL, VCC, GND pins
- **Configurable Wiring**: Can be wired to GND or VCC when pressed
- **Realistic Bounce**: Simulates mechanical switch bounce with configurable timing
- **Debouncing**: Software debounce with configurable duration

### ✅ **Interactive Controls**
- **Mouse/Touch**: Click and hold to press the button
- **Keyboard**: Spacebar when focused
- **Visual Feedback**: Color changes and slight movement when pressed
- **Bounce Indicator**: Shows "BOUNCING" during mechanical bounce

### ✅ **Educational Value**
- **Proper Wiring Examples**: Demonstrates correct pull-up resistor usage
- **Logic Inversion**: Shows why buttons wired to GND need logic inversion
- **Interrupt Handling**: Demonstrates immediate response to button presses

## How to Use

### 1. **Load the Button Test**
- Click the "🔘 Button Test" button in the simulator header
- This loads a complete test circuit with ESP32, button, and LED

### 2. **Test the Button**
- **Click and hold** the button to press it
- **Release** to unpress
- Watch the LED respond to button presses
- Check the console for button state messages

### 3. **Run the Test Sketch**
- Switch to the "Sketch" tab
- Click "Run Script" to start the Arduino code
- The LED should follow the button state

## Circuit Configuration

### **Proper Wiring for GND-Connected Buttons**
```
ESP32 GPIO15 ←→ Button SIGNAL
ESP32 GND    ←→ Button GND
Button VCC   ←→ (unconnected)
```

### **Arduino Code Pattern**
```cpp
const BUTTON_PIN = 15;

void setup() {
  // Use internal pull-up for GND-wired buttons
  pinMode(BUTTON_PIN, INPUT_PULLUP);
}

void loop() {
  // Read button (LOW when pressed due to pull-up)
  int buttonState = digitalRead(BUTTON_PIN);
  
  // Invert logic: button pressed = LOW, so invert for LED
  digitalWrite(LED_PIN, buttonState ? LOW : HIGH);
}
```

## Component Properties

### **wiredTo**
- **'GND'**: Button connects SIGNAL to GND when pressed (most common)
- **'VCC'**: Button connects SIGNAL to VCC when pressed

### **debounceMs**
- **Range**: 0-25ms
- **Default**: 12ms
- **Purpose**: Software debounce duration

### **bounceMs**
- **Range**: 0-15ms
- **Default**: 8ms
- **Purpose**: Physical bounce simulation duration

## Electrical Behavior

### **When Pressed (wiredTo: 'GND')**
- SIGNAL pin drives LOW (0V)
- GND pin connected to ground
- VCC pin unused

### **When Released (wiredTo: 'GND')**
- SIGNAL pin floats (relies on pull-up resistor)
- Pull-up resistor pulls SIGNAL to HIGH (3.3V)

### **Bounce Simulation**
- During press/release, button randomly flips state
- 30% chance of state flip during bounce window
- Settles to final state after bounce + debounce time

## Troubleshooting

### **Button Not Responding**
- Check wiring: SIGNAL → GPIO, GND → GND
- Verify `pinMode(pin, INPUT_PULLUP)` in sketch
- Ensure button `wiredTo` is set to 'GND'

### **LED Always On/Off**
- Check logic inversion in code
- For GND-wired buttons: `digitalWrite(LED, buttonState ? LOW : HIGH)`
- Verify LED wiring: anode → GPIO, cathode → GND

### **Erratic Behavior**
- Increase `debounceMs` to 20-25ms
- Check for loose connections
- Verify proper pull-up resistor usage

## Advanced Features

### **Interrupt Handling**
```cpp
void setup() {
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  attachInterrupt(BUTTON_PIN, buttonInterrupt, CHANGE);
}

void buttonInterrupt() {
  int buttonState = digitalRead(BUTTON_PIN);
  digitalWrite(LED_PIN, buttonState ? LOW : HIGH);
}
```

### **Multiple Buttons**
- Each button needs its own GPIO pin
- Use different pin numbers for each button
- Apply same wiring pattern to all buttons

## Educational Notes

### **Why Pull-Up Resistors?**
- Without pull-up, floating input reads random values
- Pull-up ensures clean HIGH when button not pressed
- Internal pull-up (INPUT_PULLUP) is convenient and sufficient

### **Why Logic Inversion?**
- Button pressed = SIGNAL connected to GND = LOW
- Button released = SIGNAL pulled to VCC = HIGH
- LED logic needs to be inverted to match button behavior

### **Bounce vs Debounce**
- **Bounce**: Physical switch contacts bouncing (mechanical)
- **Debounce**: Software filtering to ignore bounce (logical)
- Both are simulated for realistic behavior

---

**The interactive push button provides a complete, educational experience for learning proper button interfacing with microcontrollers!** 🎯
