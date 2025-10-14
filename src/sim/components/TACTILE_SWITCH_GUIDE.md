# 🔘 4-Leg Tactile Switch - Complete Implementation Guide

## 🎯 **Overview**

The 4-leg tactile switch implementation provides realistic electrical behavior with proper net bridging, matching the behavior users expect from Tinkercad and real breadboard circuits.

## ✅ **What's Been Implemented**

### **1. Net Bridging API**
- **Temporary Connections**: Components can create temporary net bridges
- **Resistance Modeling**: Configurable contact resistance (0.05-0.2Ω)
- **Dynamic Management**: Bridges can be added/removed during simulation
- **Net Recalculation**: Engine handles net topology changes

### **2. 4-Leg Tactile Switch Component**
- **Realistic Pin Layout**: A1, A2, B1, B2 pins with proper positioning
- **Internal Shorts**: A1↔A2 and B1↔B2 are always connected
- **Net Bridging**: Pressing connects A-side to B-side (all 4 pins become one net)
- **Bounce Simulation**: Configurable mechanical bounce with realistic timing
- **Contact Resistance**: Models real switch contact resistance

### **3. Interactive UI Controls**
- **Mouse/Touch Support**: Click and hold to press the switch
- **Keyboard Support**: Spacebar when focused
- **Visual Feedback**: Color changes and movement when pressed
- **Bounce Indicator**: Shows "BOUNCING" during mechanical bounce
- **Pin Visualization**: Clear A1, A2, B1, B2 pin labels

### **4. Enhanced LED Component**
- **Net Voltage Calculations**: Works with actual voltage across pins
- **Series Resistor Detection**: Warns about missing series resistors
- **Current Limiting**: Prevents LED damage from excessive current
- **Brightness Calculation**: Uses tanh curve for smooth response
- **Power Draw Tracking**: Monitors actual power consumption

## 🔧 **How It Works**

### **Internal Switch Behavior**
```
A1 ←→ A2  (always shorted)
B1 ←→ B2  (always shorted)

When NOT pressed:
  A-side and B-side are isolated

When PRESSED:
  A-side ←→ B-side (all 4 pins become one net)
```

### **Net Bridging Process**
1. **Component Initialization**: A1↔A2 and B1↔B2 bridges are created
2. **User Interaction**: UI calls `setPressed(true)`
3. **Bridge Creation**: A-side to B-side bridge is added
4. **Net Recalculation**: Engine merges all connected nets
5. **Voltage Propagation**: Power sources drive the merged net
6. **Component Updates**: LEDs, etc. respond to voltage changes

## 🎯 **Usage Examples**

### **Pull-up Input Circuit (MCU)**
```
ESP32 GPIO15 ←→ Switch B1 or B2
ESP32 GND    ←→ Switch A1 or A2
```

**Arduino Code:**
```cpp
pinMode(15, INPUT_PULLUP);
int state = digitalRead(15); // LOW when pressed
```

### **Pure DC Circuit (No MCU)**
```
Battery+ → LED(+) → LED(-) → Switch A1 or A2
Switch B1 or B2 → Battery-
```

**Result**: LED lights when switch is pressed (circuit completed)

### **Breadboard Wiring**
- **A1/A2**: Connect to one side of breadboard
- **B1/B2**: Connect to other side of breadboard
- **Pressing**: Bridges the two sides together

## 🎓 **Educational Value**

### **Real Switch Behavior**
- **Internal Shorts**: Shows why A1↔A2 and B1↔B2 are always connected
- **Net Bridging**: Demonstrates how pressing creates new connections
- **Contact Resistance**: Models real switch characteristics
- **Bounce Effects**: Shows mechanical switch limitations

### **Circuit Analysis**
- **Net Topology**: How components affect net connections
- **Voltage Propagation**: How power sources drive circuits
- **Current Flow**: How voltage differences create current
- **Component Interaction**: How switches affect other components

### **Proper Wiring**
- **Pull-up Resistors**: Why INPUT_PULLUP is needed
- **Logic Inversion**: Why GND-wired switches need inverted logic
- **Series Resistors**: Why LEDs need current limiting
- **Power Distribution**: How to properly distribute power

## 🔧 **Technical Implementation**

### **Component Structure**
```typescript
interface TactSwitchProps {
  label?: string;
  bounceMs: number;          // 5–12 ms
  contactResistance: number; // 0.05–0.2 Ω
  orientation: 0 | 90 | 180 | 270;
}
```

### **Net Bridge API**
```typescript
interface NetBridge {
  id: string;            // component id
  pairs: Array<[string, string]>; // [netIdA, netIdB]
  resistanceOhm: number; // ~0.05–0.2Ω
}
```

### **Bridge Management**
```typescript
addBridge(bridge: NetBridge)    // Create temporary connection
removeBridge(id: string)        // Remove temporary connection
getActiveBridges()              // Get all active bridges
```

## 🎯 **Test Circuit**

### **Load the Test**
1. Click "🔘 Tact Switch" button in simulator header
2. Circuit loads with ESP32, 4-leg switch, and LED
3. Test sketch loads automatically

### **Test the Switch**
1. **Click and hold** the switch to press it
2. **Release** to unpress
3. Watch the LED respond to switch state
4. Check console for switch state messages

### **Expected Behavior**
- LED OFF when switch not pressed
- LED ON when switch pressed
- Realistic bounce behavior
- Serial output shows switch state changes

## 🚀 **Advanced Features**

### **Configurable Properties**
- **Bounce Duration**: 0-20ms (default: 10ms)
- **Contact Resistance**: 0.05-0.2Ω (default: 0.08Ω)
- **Orientation**: 0°, 90°, 180°, 270° rotation
- **Label**: Custom component label

### **Visual Indicators**
- **Pin Labels**: Clear A1, A2, B1, B2 identification
- **Internal Shorts**: Shows "A1↔A2 B1↔B2" on component
- **Bounce Animation**: Pulsing effect during bounce
- **Press Feedback**: Color and movement changes

### **Integration Features**
- **Part Registry**: Properly registered in component system
- **Interactive Rendering**: Uses InteractiveComponentNode
- **Event Handling**: Mouse, touch, and keyboard support
- **State Management**: Integrates with simulation state

## 🎯 **Why This Feels Like Tinkercad**

### **Real Net Bridging**
- **Power-only circuits work** - no ESP32 required
- **Proper breadboard behavior** - 4 pins with correct internal shorts
- **Realistic bounce** - configurable mechanical bounce simulation
- **Contact resistance** - models real switch characteristics

### **Educational Accuracy**
- **Shows real switch behavior** - internal shorts and bridging
- **Demonstrates pull-up circuits** - proper INPUT_PULLUP usage
- **Pure DC examples** - battery + LED + switch circuits
- **Teaches proper wiring** - why 4 pins matter for breadboards

### **Interactive Experience**
- **Immediate feedback** - visual and electrical response
- **Realistic behavior** - matches real tactile switches
- **Educational value** - teaches proper circuit design
- **Professional quality** - matches commercial simulators

---

**The 4-leg tactile switch implementation provides a complete, realistic, and educational experience for learning proper switch interfacing and circuit design!** 🎯
