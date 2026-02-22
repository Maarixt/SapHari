// src/components/simulator/library/categories.ts
export interface ComponentCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  components: ComponentDefinition[];
}

export interface ComponentDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  behavior: 'input' | 'output' | 'analog' | 'digital' | 'comms' | 'power' | 'sensor';
  pins: PinDefinition[];
  props?: Record<string, any>;
}

export interface PinDefinition {
  id: string;
  label: string;
  kind: 'power' | 'ground' | 'digital' | 'analog' | 'pwm' | 'i2c' | 'spi' | 'uart';
  role?: string; // VCC, GND, OUT, WIPER, TRIG, ECHO, DQ, Anode, Cathode, A, B, etc.
  x: number;
  y: number;
}

export const COMPONENT_CATEGORIES: ComponentCategory[] = [
  {
    id: 'wiring',
    name: 'Wiring',
    description: 'Junction points and power rails',
    icon: '⚡',
    components: [
      {
        id: 'junction',
        name: 'Junction',
        description: 'Wire connection point (dot); connect multiple wires',
        icon: '•',
        behavior: 'power',
        pins: [{ id: 'J', label: '', kind: 'digital', x: 0, y: 0 }],
      },
      {
        id: 'power-3v3',
        name: '3V3 Rail',
        description: '3.3V power rail',
        icon: '🔋',
        behavior: 'power',
        pins: [{ id: 'out', label: '3V3', kind: 'power', x: 0, y: 0 }],
      },
      {
        id: 'power-vin',
        name: 'VIN Rail',
        description: '5V (VIN) power rail',
        icon: '🔌',
        behavior: 'power',
        pins: [{ id: 'out', label: 'VIN', kind: 'power', x: 0, y: 0 }],
      },
      {
        id: 'power-gnd',
        name: 'GND Rail',
        description: 'Ground rail',
        icon: '⏚',
        behavior: 'power',
        pins: [{ id: 'out', label: 'GND', kind: 'ground', x: 0, y: 0 }],
      },
      {
        id: 'dc-supply',
        name: 'DC Supply',
        description: 'Battery / DC voltage source with + and − terminals',
        icon: '🔋',
        behavior: 'power',
        props: { voltage: 5, rInternal: 50 },
        pins: [
          { id: 'pos', label: '+', kind: 'power', role: 'VCC', x: 10, y: 25 },
          { id: 'neg', label: '−', kind: 'ground', role: 'GND', x: 80, y: 25 },
        ],
      },
      {
        id: 'resistor',
        name: 'Resistor',
        description: 'Limits current; use in series with LEDs',
        icon: '〓',
        behavior: 'power',
        props: { resistanceOhms: 1000, ohms: 1000, tolerance: 5, powerW: 0.25 },
        pins: [
          { id: 'a', label: 'A', kind: 'digital', role: 'A', x: 10, y: 25 },
          { id: 'b', label: 'B', kind: 'digital', role: 'B', x: 80, y: 25 },
        ],
      },
      {
        id: 'capacitor',
        name: 'Capacitor',
        description: 'Stores charge; open circuit in DC. Two equal plates, no polarity.',
        icon: '⊏⊐',
        behavior: 'power',
        props: { capacitance: 1e-5, rLeak: 1e8 },
        pins: [
          { id: 'a', label: 'A', kind: 'digital', role: 'A', x: 10, y: 25 },
          { id: 'b', label: 'B', kind: 'digital', role: 'B', x: 80, y: 25 },
        ],
      },
      {
        id: 'diode',
        name: 'Diode',
        description: 'Two-terminal; current flows A → K when forward biased. Silicon Vf ≈ 0.7V.',
        icon: '▷|',
        behavior: 'power',
        props: { vf: 0.7, rOn: 1, vbr: 50, rbr: 10 },
        pins: [
          { id: 'A', label: 'A', kind: 'digital', role: 'Anode', x: 10, y: 25 },
          { id: 'K', label: 'K', kind: 'digital', role: 'Cathode', x: 80, y: 25 },
        ],
      },
      {
        id: 'inductor',
        name: 'Inductor',
        description: 'Stores energy in magnetic field; L (H). Use with flyback diode when switching.',
        icon: '⌒⌒',
        behavior: 'power',
        props: { inductance: 0.001 },
        pins: [
          { id: 'a', label: 'A', kind: 'digital', role: 'A', x: 10, y: 25 },
          { id: 'b', label: 'B', kind: 'digital', role: 'B', x: 80, y: 25 },
        ],
      },
      {
        id: 'capacitor-polarized',
        name: 'Electrolytic Capacitor',
        description: 'Polarized; + must be at higher potential. Reverse voltage damages.',
        icon: '⊏+⊐',
        behavior: 'power',
        props: { capacitance: 1e-5, ratedVoltage: 16, rLeak: 1e8 },
        pins: [
          { id: 'P', label: '+', kind: 'digital', role: 'V+', x: 10, y: 25 },
          { id: 'N', label: '−', kind: 'digital', role: 'V-', x: 80, y: 25 },
        ],
      },
      {
        id: 'transistor',
        name: 'Transistor (BJT)',
        description: 'NPN/PNP transistor with B, C, E pins',
        icon: '⎍',
        behavior: 'power',
        props: { polarity: 'NPN', beta: 100, vbeOn: 0.7, vceSat: 0.2, rBeOn: 1000, rOff: 1e9 },
        pins: [
          { id: 'C', label: 'C', kind: 'digital', role: 'C', x: 10, y: 8 },
          { id: 'B', label: 'B', kind: 'digital', role: 'B', x: 45, y: 42 },
          { id: 'E', label: 'E', kind: 'digital', role: 'E', x: 80, y: 8 },
        ],
      },
      {
        id: 'voltmeter',
        name: 'Voltmeter',
        description: 'Measures voltage between + and − (high impedance, no circuit loading)',
        icon: 'V',
        behavior: 'power',
        props: { range: 'auto' },
        pins: [
          { id: 'pos', label: '+', kind: 'digital', role: 'V+', x: 10, y: 25 },
          { id: 'neg', label: '−', kind: 'digital', role: 'V-', x: 80, y: 25 },
        ],
      },
    ],
  },
  {
    id: 'input',
    name: 'Input Devices',
    description: 'Components that send signals to ESP32 for interaction',
    icon: 'input',
    components: [
      {
        id: 'push-button',
        name: 'Push Button',
        description: 'Configurable NO/NC pushbutton: momentary or latch',
        icon: 'push-button',
        behavior: 'input',
        props: { contact: 'NO', mechanism: 'momentary', latched: false, pressed: false, isClosed: false, rOnOhms: 0.01 },
        pins: [
          { id: 'P1', label: 'P1', kind: 'digital', role: 'A', x: 10, y: 25 },
          { id: 'P2', label: 'P2', kind: 'digital', role: 'B', x: 80, y: 25 }
        ]
      },
      {
        id: 'toggle-switch',
        name: 'Toggle Switch',
        description: 'Maintains ON/OFF state for simple digital input',
        icon: '🔀',
        behavior: 'input',
        pins: [
          { id: 'pin1', label: '1', kind: 'digital', role: 'A', x: 10, y: 25 },
          { id: 'pin2', label: '2', kind: 'digital', role: 'B', x: 30, y: 25 }
        ]
      },
      {
        id: 'potentiometer',
        name: 'Potentiometer',
        description: '3-terminal voltage divider; IN (CW), OUT (wiper), GND (CCW). Drag knob or use [ ] keys.',
        icon: '🎚️',
        behavior: 'analog',
        props: { rTotalOhms: 10000, alpha: 0.5, taper: 'linear' },
        pins: [
          { id: 'IN', label: 'IN', kind: 'power', role: 'IN', x: 10, y: 25 },
          { id: 'OUT', label: 'OUT', kind: 'analog', role: 'OUT', x: 45, y: 8 },
          { id: 'GND', label: 'GND', kind: 'ground', role: 'GND', x: 80, y: 25 }
        ]
      },
      {
        id: 'ldr',
        name: 'LDR (Light Sensor)',
        description: 'Measures light intensity; analog input',
        icon: '☀️',
        behavior: 'analog',
        pins: [
          { id: 'vcc', label: 'VCC', kind: 'power', x: 10, y: 10 },
          { id: 'gnd', label: 'GND', kind: 'ground', x: 10, y: 40 },
          { id: 'out', label: 'OUT', kind: 'analog', x: 30, y: 25 }
        ]
      },
      {
        id: 'pir-sensor',
        name: 'PIR Motion Sensor',
        description: 'Detects human motion using infrared',
        icon: '👁️',
        behavior: 'digital',
        pins: [
          { id: 'vcc', label: 'VCC', kind: 'power', role: 'VCC', x: 10, y: 10 },
          { id: 'gnd', label: 'GND', kind: 'ground', role: 'GND', x: 10, y: 40 },
          { id: 'out', label: 'OUT', kind: 'digital', role: 'OUT', x: 30, y: 25 }
        ]
      },
      {
        id: 'ultrasonic',
        name: 'Ultrasonic Sensor',
        description: 'Measures distance via echo time (HC-SR04)',
        icon: '📡',
        behavior: 'digital',
        pins: [
          { id: 'vcc', label: 'VCC', kind: 'power', role: 'VCC', x: 10, y: 10 },
          { id: 'gnd', label: 'GND', kind: 'ground', role: 'GND', x: 10, y: 40 },
          { id: 'trig', label: 'TRIG', kind: 'digital', role: 'TRIG', x: 30, y: 15 },
          { id: 'echo', label: 'ECHO', kind: 'digital', role: 'ECHO', x: 30, y: 35 }
        ]
      },
      {
        id: 'touch-sensor',
        name: 'Touch Sensor',
        description: 'Capacitive input for touch-based activation',
        icon: '👆',
        behavior: 'digital',
        pins: [
          { id: 'vcc', label: 'VCC', kind: 'power', x: 10, y: 10 },
          { id: 'gnd', label: 'GND', kind: 'ground', x: 10, y: 40 },
          { id: 'out', label: 'OUT', kind: 'digital', x: 30, y: 25 }
        ]
      },
      {
        id: 'ir-receiver',
        name: 'IR Receiver',
        description: 'Reads signals from remote controls',
        icon: '📺',
        behavior: 'digital',
        pins: [
          { id: 'vcc', label: 'VCC', kind: 'power', x: 10, y: 10 },
          { id: 'gnd', label: 'GND', kind: 'ground', x: 10, y: 40 },
          { id: 'out', label: 'OUT', kind: 'digital', x: 30, y: 25 }
        ]
      },
      {
        id: 'microphone',
        name: 'Microphone Sensor',
        description: 'Detects sound levels or claps',
        icon: '🎤',
        behavior: 'analog',
        pins: [
          { id: 'vcc', label: 'VCC', kind: 'power', x: 10, y: 10 },
          { id: 'gnd', label: 'GND', kind: 'ground', x: 10, y: 40 },
          { id: 'out', label: 'OUT', kind: 'analog', x: 30, y: 25 }
        ]
      },
      {
        id: 'joystick',
        name: 'Joystick Module',
        description: 'Analog X/Y control with push button press',
        icon: '🕹️',
        behavior: 'analog',
        pins: [
          { id: 'vcc', label: 'VCC', kind: 'power', x: 10, y: 10 },
          { id: 'gnd', label: 'GND', kind: 'ground', x: 10, y: 50 },
          { id: 'x', label: 'X', kind: 'analog', x: 30, y: 15 },
          { id: 'y', label: 'Y', kind: 'analog', x: 30, y: 35 },
          { id: 'sw', label: 'SW', kind: 'digital', x: 30, y: 50 }
        ]
      }
    ]
  },
  {
    id: 'output',
    name: 'Output Devices',
    description: 'Components that react to ESP32 signals',
    icon: 'output',
    components: [
      {
        id: 'led',
        name: 'LED (Single)',
        description: 'Shows digital state (ON/OFF)',
        icon: '💡',
        behavior: 'output',
        pins: [
          { id: 'anode', label: '+', kind: 'digital', role: 'Anode', x: 10, y: 20 },
          { id: 'cathode', label: '-', kind: 'ground', role: 'Cathode', x: 30, y: 20 }
        ]
      },
      {
        id: 'rgb-led',
        name: 'RGB LED',
        description: 'Common Cathode or Anode; R, G, B channels with series resistor per channel',
        icon: '🌈',
        behavior: 'output',
        pins: [
          { id: 'R', label: 'R', kind: 'digital', role: 'A', x: 10, y: 15 },
          { id: 'G', label: 'G', kind: 'digital', role: 'A', x: 20, y: 15 },
          { id: 'B', label: 'B', kind: 'digital', role: 'A', x: 30, y: 15 },
          { id: 'COM', label: '−', kind: 'ground', role: 'Cathode', x: 20, y: 35 }
        ],
        props: { variantId: 'CC', vfR: 2, vfG: 3, vfB: 3, rdynR: 20, rdynG: 20, rdynB: 20, iref: 0.02 }
      },
      {
        id: 'buzzer',
        name: 'Buzzer / Piezo',
        description: 'Plays tones or alarms',
        icon: '🔊',
        behavior: 'output',
        pins: [
          { id: 'pos', label: '+', kind: 'digital', role: 'SIGNAL', x: 10, y: 20 },
          { id: 'neg', label: '-', kind: 'ground', role: 'GND', x: 30, y: 20 }
        ]
      },
      {
        id: 'relay',
        name: 'Relay Module',
        description: 'Switches high-voltage devices (1-4 channel)',
        icon: '⚡',
        behavior: 'output',
        pins: [
          { id: 'vcc', label: 'VCC', kind: 'power', x: 10, y: 10 },
          { id: 'gnd', label: 'GND', kind: 'ground', x: 10, y: 40 },
          { id: 'in1', label: 'IN1', kind: 'digital', x: 30, y: 15 },
          { id: 'in2', label: 'IN2', kind: 'digital', x: 30, y: 25 },
          { id: 'in3', label: 'IN3', kind: 'digital', x: 30, y: 35 }
        ]
      },
      {
        id: 'dc-motor',
        name: 'DC Motor',
        description: 'Current-driven; spins only in closed loop. M+ / M− polarity sets direction.',
        icon: '⚙️',
        behavior: 'output',
        pins: [
          { id: 'a', label: 'M+', kind: 'digital', x: 10, y: 25 },
          { id: 'b', label: 'M−', kind: 'digital', x: 80, y: 25 }
        ]
      },
      {
        id: 'ac-motor',
        name: 'AC Motor',
        description: 'DC placeholder until AC solver. Spins when current flows.',
        icon: '🔄',
        behavior: 'output',
        pins: [
          { id: 'a', label: 'L', kind: 'digital', x: 10, y: 25 },
          { id: 'b', label: 'N', kind: 'digital', x: 80, y: 25 }
        ]
      },
      {
        id: 'servo',
        name: 'Servo Motor',
        description: 'Rotates to specific angles (0-180°)',
        icon: '🎯',
        behavior: 'output',
        pins: [
          { id: 'vcc', label: 'VCC', kind: 'power', role: 'VCC', x: 10, y: 10 },
          { id: 'gnd', label: 'GND', kind: 'ground', role: 'GND', x: 10, y: 40 },
          { id: 'signal', label: 'SIG', kind: 'pwm', role: 'PWM', x: 30, y: 25 }
        ]
      },
      {
        id: 'stepper',
        name: 'Stepper Motor',
        description: 'Precise rotation control',
        icon: '🔄',
        behavior: 'output',
        pins: [
          { id: 'vcc', label: 'VCC', kind: 'power', x: 10, y: 10 },
          { id: 'gnd', label: 'GND', kind: 'ground', x: 10, y: 50 },
          { id: 'in1', label: 'IN1', kind: 'digital', x: 30, y: 15 },
          { id: 'in2', label: 'IN2', kind: 'digital', x: 30, y: 25 },
          { id: 'in3', label: 'IN3', kind: 'digital', x: 30, y: 35 },
          { id: 'in4', label: 'IN4', kind: 'digital', x: 30, y: 45 }
        ]
      },
      {
        id: 'lcd-display',
        name: 'LCD Display',
        description: 'Text output from ESP32 (16x2 / I2C)',
        icon: '📺',
        behavior: 'output',
        pins: [
          { id: 'vcc', label: 'VCC', kind: 'power', x: 10, y: 10 },
          { id: 'gnd', label: 'GND', kind: 'ground', x: 10, y: 50 },
          { id: 'sda', label: 'SDA', kind: 'i2c', x: 30, y: 20 },
          { id: 'scl', label: 'SCL', kind: 'i2c', x: 30, y: 30 }
        ]
      },
      {
        id: 'oled-display',
        name: 'OLED Display',
        description: 'Compact graphical output (SSD1306)',
        icon: '📱',
        behavior: 'output',
        pins: [
          { id: 'vcc', label: 'VCC', kind: 'power', x: 10, y: 10 },
          { id: 'gnd', label: 'GND', kind: 'ground', x: 10, y: 40 },
          { id: 'sda', label: 'SDA', kind: 'i2c', x: 30, y: 20 },
          { id: 'scl', label: 'SCL', kind: 'i2c', x: 30, y: 30 }
        ]
      },
      {
        id: 'seven-segment',
        name: '7-Segment Display',
        description: 'Shows digits (counter or timer)',
        icon: '🔢',
        behavior: 'output',
        pins: [
          { id: 'vcc', label: 'VCC', kind: 'power', x: 10, y: 10 },
          { id: 'gnd', label: 'GND', kind: 'ground', x: 10, y: 50 },
          { id: 'a', label: 'A', kind: 'digital', x: 30, y: 10 },
          { id: 'b', label: 'B', kind: 'digital', x: 30, y: 20 },
          { id: 'c', label: 'C', kind: 'digital', x: 30, y: 30 },
          { id: 'd', label: 'D', kind: 'digital', x: 30, y: 40 },
          { id: 'e', label: 'E', kind: 'digital', x: 30, y: 50 }
        ]
      },
      {
        id: 'neopixel',
        name: 'NeoPixel Strip',
        description: 'Addressable RGB LEDs for lighting effects',
        icon: '✨',
        behavior: 'output',
        pins: [
          { id: 'vcc', label: 'VCC', kind: 'power', x: 10, y: 10 },
          { id: 'gnd', label: 'GND', kind: 'ground', x: 10, y: 40 },
          { id: 'din', label: 'DIN', kind: 'digital', x: 30, y: 25 }
        ]
      }
    ]
  },
  {
    id: 'power',
    name: 'Power Supply',
    description: 'Provides simulated voltage and current',
    icon: '🔋',
    components: [
      {
        id: 'battery-pack',
        name: 'Battery Pack',
        description: 'Portable power sources (3.7V / 9V)',
        icon: '🔋',
        behavior: 'power',
        pins: [
          { id: 'pos', label: '+', kind: 'power', x: 20, y: 10 },
          { id: 'neg', label: '-', kind: 'ground', x: 20, y: 40 }
        ]
      },
      {
        id: 'usb-power',
        name: 'USB Power Input',
        description: 'Powers ESP32 from simulated USB',
        icon: '🔌',
        behavior: 'power',
        pins: [
          { id: 'vcc', label: 'VCC', kind: 'power', x: 20, y: 10 },
          { id: 'gnd', label: 'GND', kind: 'ground', x: 20, y: 40 }
        ]
      },
      {
        id: 'breadboard-power',
        name: 'Breadboard Power',
        description: 'Gives 5V or 3.3V rails on breadboard',
        icon: '⚡',
        behavior: 'power',
        pins: [
          { id: 'vcc', label: 'VCC', kind: 'power', x: 20, y: 10 },
          { id: 'gnd', label: 'GND', kind: 'ground', x: 20, y: 40 }
        ]
      },
      {
        id: 'voltage-regulator',
        name: 'Voltage Regulator',
        description: 'Drops or stabilizes voltage (LM7805/AMS1117)',
        icon: '🔧',
        behavior: 'power',
        pins: [
          { id: 'vin', label: 'VIN', kind: 'power', x: 10, y: 10 },
          { id: 'gnd', label: 'GND', kind: 'ground', x: 20, y: 25 },
          { id: 'vout', label: 'VOUT', kind: 'power', x: 30, y: 10 }
        ]
      },
      {
        id: 'jumper-wires',
        name: 'Jumper Wires',
        description: 'Visual wire connections between components',
        icon: '🔗',
        behavior: 'power',
        pins: [
          { id: 'end1', label: '1', kind: 'digital', x: 10, y: 25 },
          { id: 'end2', label: '2', kind: 'digital', x: 30, y: 25 }
        ]
      }
    ]
  },
  {
    id: 'connection',
    name: 'Connection & Interface',
    description: 'Connect and expand ESP32 I/O capabilities',
    icon: '🔌',
    components: [
      {
        id: 'breadboard',
        name: 'Breadboard',
        description: 'Base for wiring circuits (Full/Half size)',
        icon: '🔲',
        behavior: 'power',
        pins: [
          { id: 'rail1', label: '+', kind: 'power', x: 20, y: 10 },
          { id: 'rail2', label: '-', kind: 'ground', x: 20, y: 40 }
        ]
      },
      {
        id: 'esp32-board',
        name: 'ESP32 Board',
        description: 'Main microcontroller for the simulator',
        icon: '🖥️',
        behavior: 'digital',
        pins: [
          { id: 'gpio2', label: 'GPIO2', kind: 'digital', x: 10, y: 20 },
          { id: 'gpio4', label: 'GPIO4', kind: 'digital', x: 10, y: 30 },
          { id: 'gpio5', label: 'GPIO5', kind: 'digital', x: 10, y: 40 },
          { id: 'gpio12', label: 'GPIO12', kind: 'digital', x: 10, y: 50 },
          { id: 'gpio13', label: 'GPIO13', kind: 'digital', x: 10, y: 60 },
          { id: 'gpio14', label: 'GPIO14', kind: 'digital', x: 10, y: 70 },
          { id: 'gpio15', label: 'GPIO15', kind: 'digital', x: 10, y: 80 },
          { id: 'gpio16', label: 'GPIO16', kind: 'digital', x: 10, y: 90 },
          { id: 'gpio17', label: 'GPIO17', kind: 'digital', x: 10, y: 100 },
          { id: 'gpio18', label: 'GPIO18', kind: 'digital', x: 10, y: 110 },
          { id: 'gpio19', label: 'GPIO19', kind: 'digital', x: 10, y: 120 },
          { id: 'gpio21', label: 'GPIO21', kind: 'digital', x: 10, y: 130 },
          { id: 'gpio22', label: 'GPIO22', kind: 'digital', x: 10, y: 140 },
          { id: 'gpio23', label: 'GPIO23', kind: 'digital', x: 10, y: 150 },
          { id: 'gpio25', label: 'GPIO25', kind: 'digital', x: 10, y: 160 },
          { id: 'gpio26', label: 'GPIO26', kind: 'digital', x: 10, y: 170 },
          { id: 'gpio27', label: 'GPIO27', kind: 'digital', x: 10, y: 180 },
          { id: 'gpio32', label: 'GPIO32', kind: 'digital', x: 10, y: 190 },
          { id: 'gpio33', label: 'GPIO33', kind: 'digital', x: 10, y: 200 },
          { id: 'gpio35', label: 'GPIO35', kind: 'analog', x: 10, y: 210 },
          { id: 'gpio34', label: 'GPIO34', kind: 'analog', x: 10, y: 220 },
          { id: 'gpio36', label: 'GPIO36', kind: 'analog', x: 10, y: 230 },
          { id: 'gpio39', label: 'GPIO39', kind: 'analog', x: 10, y: 240 },
          { id: '3v3', label: '3V3', kind: 'power', x: 30, y: 20 },
          { id: 'gnd', label: 'GND', kind: 'ground', x: 30, y: 40 }
        ]
      },
      {
        id: 'i2c-expander',
        name: 'I2C Expander',
        description: 'Adds extra I/O pins (PCF8574)',
        icon: '🔀',
        behavior: 'digital',
        pins: [
          { id: 'vcc', label: 'VCC', kind: 'power', x: 10, y: 10 },
          { id: 'gnd', label: 'GND', kind: 'ground', x: 10, y: 50 },
          { id: 'sda', label: 'SDA', kind: 'i2c', x: 30, y: 20 },
          { id: 'scl', label: 'SCL', kind: 'i2c', x: 30, y: 30 }
        ]
      },
      {
        id: 'spi-interface',
        name: 'SPI Interface',
        description: 'Supports SPI-based devices (SD cards)',
        icon: '💾',
        behavior: 'digital',
        pins: [
          { id: 'vcc', label: 'VCC', kind: 'power', x: 10, y: 10 },
          { id: 'gnd', label: 'GND', kind: 'ground', x: 10, y: 50 },
          { id: 'mosi', label: 'MOSI', kind: 'spi', x: 30, y: 15 },
          { id: 'miso', label: 'MISO', kind: 'spi', x: 30, y: 25 },
          { id: 'sck', label: 'SCK', kind: 'spi', x: 30, y: 35 },
          { id: 'cs', label: 'CS', kind: 'spi', x: 30, y: 45 }
        ]
      },
      {
        id: 'bluetooth',
        name: 'Bluetooth Module',
        description: 'Simulates Bluetooth communication (HC-05)',
        icon: '📶',
        behavior: 'comms',
        pins: [
          { id: 'vcc', label: 'VCC', kind: 'power', x: 10, y: 10 },
          { id: 'gnd', label: 'GND', kind: 'ground', x: 10, y: 40 },
          { id: 'tx', label: 'TX', kind: 'uart', x: 30, y: 20 },
          { id: 'rx', label: 'RX', kind: 'uart', x: 30, y: 30 }
        ]
      },
      {
        id: 'wifi-indicator',
        name: 'Wi-Fi Indicator',
        description: 'Visual LED for network connection status',
        icon: '📡',
        behavior: 'output',
        pins: [
          { id: 'vcc', label: 'VCC', kind: 'power', x: 10, y: 10 },
          { id: 'gnd', label: 'GND', kind: 'ground', x: 10, y: 40 },
          { id: 'led', label: 'LED', kind: 'digital', x: 30, y: 25 }
        ]
      },
      {
        id: 'usb-serial',
        name: 'USB-Serial Converter',
        description: 'Allows data communication & upload simulation',
        icon: '🔌',
        behavior: 'comms',
        pins: [
          { id: 'vcc', label: 'VCC', kind: 'power', x: 10, y: 10 },
          { id: 'gnd', label: 'GND', kind: 'ground', x: 10, y: 40 },
          { id: 'tx', label: 'TX', kind: 'uart', x: 30, y: 20 },
          { id: 'rx', label: 'RX', kind: 'uart', x: 30, y: 30 }
        ]
      }
    ]
  }
];
