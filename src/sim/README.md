# 🚀 ESP32 Circuit Simulator - Enhanced Pin-Accurate Engine

A realistic, pin-level circuit simulator for ESP32 development with deterministic behavior, comprehensive component library, and Arduino-compatible API.

## ✨ Features

### 🎯 **Pin-Accurate Simulation**
- **Deterministic 1ms timestep** with fixed-step accumulator
- **Real voltage levels** (0-3.3V) with noise and tolerances
- **GPIO capabilities** mapping (ADC, PWM, I2C, SPI, interrupts)
- **Net-based connectivity** with automatic voltage assignment

### 🔧 **Arduino-Compatible API**
- **Familiar functions**: `pinMode`, `digitalWrite/Read`, `analogRead`
- **PWM support**: `ledcSetup`, `ledcAttachPin`, `ledcWrite`
- **Interrupts**: `attachInterrupt`, `detachInterrupt`
- **Timing**: `delay`, `millis`, `micros`
- **Communication**: `Wire` (I2C), `SPI`, `Serial`

### 🧩 **Realistic Components**
- **ESP32 DevKit** with full GPIO mapping
- **Input devices**: Push Button, Toggle Switch, Potentiometer, LDR, PIR, Ultrasonic
- **Output devices**: LED, RGB LED, Buzzer, Servo, Stepper, LCD, OLED
- **Power**: Battery, USB Power, Voltage Regulator
- **Sensors**: Temperature, Touch, Microphone, IR Receiver

### ⚡ **Performance & Architecture**
- **WebWorker-based** simulation loop for smooth UI
- **Deterministic RNG** with seedable randomness
- **Performance profiler** with per-component timing
- **Fixed-step accumulator** with catch-up protection
- **Centralized audio bus** for multiple buzzers

### 🛡️ **Safety & Warnings**
- **Real-time warnings**: Short circuits, brownout, floating inputs
- **Component protection**: Over-current, reverse bias detection
- **Educational hints**: Missing resistors, unpowered sensors
- **Schema versioning** for circuit compatibility

## 📁 Project Structure

```
src/sim/
├── core/                    # Core simulation engine
│   ├── types.ts            # Type definitions
│   ├── engine.ts           # Main simulation engine
│   ├── rng.ts              # Deterministic RNG
│   ├── profiler.ts         # Performance monitoring
│   ├── arduinoSandbox.ts   # Arduino API implementation
│   └── migrate.ts          # Schema versioning
├── components/             # Component implementations
│   ├── Esp32DevKit.ts     # ESP32 microcontroller
│   ├── PushButton.ts      # Push button with debouncing
│   ├── Led.ts             # LED with forward voltage
│   ├── Potentiometer.ts   # Pot with noise and tolerance
│   └── ...                # More components
├── ui/                     # UI components
│   └── WarningsPanel.tsx  # Real-time warnings display
├── audio/                  # Audio system
│   └── audioBus.ts        # Centralized audio management
├── worker.ts              # WebWorker implementation
├── tests/                 # Test suite
│   └── basic.spec.ts      # Core functionality tests
└── examples/              # Example circuits
    └── simpleCircuit.ts   # Button -> LED example
```

## 🚀 Quick Start

### 1. Create a Simple Circuit

```typescript
import { createSimpleCircuit, runSimpleSimulation } from './examples/simpleCircuit';

// Create a button -> LED circuit
const circuit = createSimpleCircuit();

// Run simulation
runSimpleSimulation();
```

### 2. Use Arduino API

```typescript
import { ArduinoAPI } from './core/arduinoSandbox';

// Set up pins
ArduinoAPI.pinMode(2, 'OUTPUT');
ArduinoAPI.pinMode(34, 'INPUT');

// Read analog value
const potValue = ArduinoAPI.analogRead(34);

// Control LED
ArduinoAPI.digitalWrite(2, potValue > 2048 ? 1 : 0);
```

### 3. Add Components

```typescript
import { createESP32DevKit, createPushButton, createLed } from './components';

// Create components
const esp32 = createESP32DevKit('esp32_1');
const button = createPushButton('btn1', { wiredTo: 'GND', bounceMs: 10 });
const led = createLed('led1', { color: 'red', forwardVoltage: 1.8 });

// Wire them together
// (Implementation depends on your UI system)
```

## 🔧 Component API

### ESP32 DevKit

```typescript
const esp32 = createESP32DevKit('esp32_1');

// GPIO operations
esp32.setGPIOMode(2, 'OUTPUT');
esp32.setGPIOLevel(2, 1);

// PWM setup
esp32.setupPWM(0, 1000, 8);
esp32.attachPWM(2, 0);
esp32.writePWM(0, 0.5);

// Interrupts
esp32.attachInterrupt(2, () => console.log('Button pressed!'));
```

### Push Button

```typescript
const button = createPushButton('btn1', {
  wiredTo: 'GND',    // or 'VCC'
  bounceMs: 10       // debounce time
});

// Control button state
button.setPressed(true);
console.log(button.getPressed());
console.log(button.isBouncing());
```

### LED

```typescript
const led = createLed('led1', {
  color: 'red',
  forwardVoltage: 1.8,
  maxCurrent: 20
});

// Check status
console.log(led.isLedOn());
console.log(led.getBrightness());
console.log(led.getCurrentDraw());
```

### Potentiometer

```typescript
const pot = createPotentiometer('pot1', {
  value: 0.5,        // 0-1 position
  resistance: 10000, // ohms
  noiseLevel: 0.01   // 1% noise
});

// Read values
console.log(pot.getValue());
console.log(pot.getOutputVoltage());
console.log(pot.getADCReading());
```

## ⚡ Performance Features

### WebWorker Integration

```typescript
// Worker handles simulation loop
const worker = new Worker('./worker.ts');

// Send commands
worker.postMessage({ type: 'INIT', payload: { state, seed: 12345 } });
worker.postMessage({ type: 'PLAY' });

// Receive updates
worker.onmessage = (event) => {
  if (event.data.type === 'STATE') {
    updateUI(event.data.payload);
  }
};
```

### Performance Profiling

```typescript
import { getProfiler } from './core/profiler';

const profiler = getProfiler();
profiler.setEnabled(true);

// Get performance stats
const stats = profiler.getStats();
console.log(`FPS: ${stats.frameStats.fps}`);
console.log(`Heaviest component: ${stats.heaviestComponent?.componentType}`);
```

### Deterministic RNG

```typescript
import { initRNG, getRNG } from './core/rng';

// Initialize with seed
initRNG(12345);

// Use in components
const rng = getRNG();
const noise = rng.nextGaussianScaled(0, 0.1);
```

## 🛡️ Safety & Warnings

### Real-time Warnings

```typescript
import { WarningsPanel } from './ui/WarningsPanel';

// Display warnings
<WarningsPanel 
  warnings={warnings}
  onClearWarnings={() => clearWarnings()}
  onDismissWarning={(id) => dismissWarning(id)}
/>
```

### Warning Types

- **SHORT_CIRCUIT**: 3V3 connected to GND
- **BROWNOUT**: Supply voltage < 3.0V
- **FLOATING_INPUT**: Unconnected digital input
- **LED_REVERSE_BIAS**: LED connected backwards
- **LED_OVER_CURRENT**: LED current exceeds maximum
- **POT_UNPOWERED**: Potentiometer without power

## 🧪 Testing

```bash
# Run tests
npm test

# Run specific test
npm test -- basic.spec.ts
```

### Test Coverage

- **RNG determinism** and distribution
- **Component behaviors** (button debounce, LED forward voltage)
- **GPIO operations** and PWM
- **Warning generation** for circuit issues
- **Performance** and timing accuracy

## 📊 Schema Versioning

```typescript
import { getMigrator } from './core/migrate';

const migrator = getMigrator();

// Migrate old circuit
const migratedCircuit = migrator.migrate(oldCircuitData);

// Validate schema
const validation = migrator.validateSchema(circuitData);
if (!validation.valid) {
  console.error('Schema errors:', validation.errors);
}
```

## 🎯 Roadmap

### Milestone 1 ✅
- [x] Core engine with fixed timestep
- [x] ESP32 component with GPIO mapping
- [x] Button, LED, Potentiometer components
- [x] PWM, ADC, interrupt system
- [x] Basic warnings and safety checks

### Milestone 2 🚧
- [ ] Ultrasonic sensor with timing
- [ ] Servo motor with pulse control
- [ ] Buzzer with WebAudio integration
- [ ] Enhanced warnings panel
- [ ] Time controls (play/pause/step)

### Milestone 3 📋
- [ ] I2C OLED display
- [ ] Save/Load circuit compatibility
- [ ] Example circuits and tutorials
- [ ] Performance optimizations

### Milestone 4 🔮
- [ ] PIR motion sensor
- [ ] Relay and DC motor
- [ ] NeoPixel strip
- [ ] Stepper motor
- [ ] IR receiver
- [ ] 7-segment display
- [ ] MCP23017 I2C expander

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch
3. **Add** tests for new components
4. **Ensure** deterministic behavior
5. **Submit** a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ for the ESP32 community**

*Realistic simulation, deterministic results, educational value.*
