import { SimComponent, PinDef } from '../types';
import { nanoid } from 'nanoid';

// LED Component
export function makeLED(x = 100, y = 100, color = 'red'): SimComponent {
  return {
    id: 'led-' + nanoid(6),
    type: 'led',
    x,
    y,
    pins: [
      { id: 'anode', label: '+', kind: 'digital', x: 0, y: 0 },
      { id: 'cathode', label: '-', kind: 'digital', x: 20, y: 0 }
    ],
    props: { color, voltage: 3.3 }
  };
}

// Button Component
export function makeButton(x = 100, y = 100): SimComponent {
  return {
    id: 'button-' + nanoid(6),
    type: 'button',
    x,
    y,
    pins: [
      { id: 'pin1', label: '1', kind: 'digital', x: 0, y: 0 },
      { id: 'pin2', label: '2', kind: 'digital', x: 20, y: 0 }
    ],
    props: { pullup: true }
  };
}

// Buzzer Component
export function makeBuzzer(x = 100, y = 100): SimComponent {
  return {
    id: 'buzzer-' + nanoid(6),
    type: 'buzzer',
    x,
    y,
    pins: [
      { id: 'P', label: '+', kind: 'digital', x: 18, y: 45 },
      { id: 'N', label: '−', kind: 'digital', x: 42, y: 45 },
    ],
    props: {
      active: false,
      mode: 'active',
      volume: 0.5,
      frequency: 2000,
      vMin: 2,
      rOn: 167,
      iMin: 0.001,
    },
  };
}

// Potentiometer Component
export function makePotentiometer(x = 100, y = 100, maxResistance = 10000): SimComponent {
  return {
    id: 'pot-' + nanoid(6),
    type: 'pot',
    x,
    y,
    pins: [
      { id: 'vcc', label: 'VCC', kind: 'power', x: 0, y: 0 },
      { id: 'signal', label: 'SIG', kind: 'analog', x: 10, y: 0 },
      { id: 'gnd', label: 'GND', kind: 'ground', x: 20, y: 0 }
    ],
    props: { maxResistance, voltage: 3.3 }
  };
}

// PIR Sensor Component
export function makePIRSensor(x = 100, y = 100): SimComponent {
  return {
    id: 'pir-' + nanoid(6),
    type: 'pir',
    x,
    y,
    pins: [
      { id: 'vcc', label: 'VCC', kind: 'power', x: 0, y: 0 },
      { id: 'signal', label: 'OUT', kind: 'digital', x: 10, y: 0 },
      { id: 'gnd', label: 'GND', kind: 'ground', x: 20, y: 0 }
    ],
    props: { sensitivity: 'medium', range: 5 }
  };
}

// Ultrasonic Sensor (HC-SR04)
export function makeUltrasonicSensor(x = 100, y = 100): SimComponent {
  return {
    id: 'ultrasonic-' + nanoid(6),
    type: 'ultrasonic',
    x,
    y,
    pins: [
      { id: 'vcc', label: 'VCC', kind: 'power', x: 0, y: 0 },
      { id: 'trig', label: 'TRIG', kind: 'digital', x: 10, y: 0 },
      { id: 'echo', label: 'ECHO', kind: 'digital', x: 20, y: 0 },
      { id: 'gnd', label: 'GND', kind: 'ground', x: 30, y: 0 }
    ],
    props: { range: 400, accuracy: 0.3 }
  };
}

// Temperature Sensor (DS18B20)
export function makeTemperatureSensor(x = 100, y = 100): SimComponent {
  return {
    id: 'ds18b20-' + nanoid(6),
    type: 'ds18b20',
    x,
    y,
    pins: [
      { id: 'vcc', label: 'VCC', kind: 'power', x: 0, y: 0 },
      { id: 'data', label: 'DATA', kind: 'onewire', x: 10, y: 0 },
      { id: 'gnd', label: 'GND', kind: 'ground', x: 20, y: 0 }
    ],
    props: { resolution: 12, range: [-55, 125] }
  };
}

// Servo Motor Component
export function makeServoMotor(x = 100, y = 100): SimComponent {
  return {
    id: 'servo-' + nanoid(6),
    type: 'servo',
    x,
    y,
    pins: [
      { id: 'vcc', label: 'VCC', kind: 'power', x: 0, y: 0 },
      { id: 'signal', label: 'SIG', kind: 'pwm', x: 10, y: 0 },
      { id: 'gnd', label: 'GND', kind: 'ground', x: 20, y: 0 }
    ],
    props: { range: 180, speed: 60 }
  };
}

// Resistor Component
export function makeResistor(x = 100, y = 100, ohms = 220): SimComponent {
  return {
    id: 'resistor-' + nanoid(6),
    type: 'resistor',
    x,
    y,
    pins: [
      { id: 'a', label: 'A', kind: 'digital', x: 10, y: 25 },
      { id: 'b', label: 'B', kind: 'digital', x: 80, y: 25 }
    ],
    props: { ohms, tolerance: 5 }
  };
}

// Power Rail Component (3.3V)
export function makePowerRail(x = 100, y = 100, voltage = 3.3): SimComponent {
  return {
    id: 'power-' + nanoid(6),
    type: 'power',
    x,
    y,
    pins: [
      { id: 'vcc', label: `${voltage}V`, kind: 'power', x: 0, y: 0 },
      { id: 'gnd', label: 'GND', kind: 'ground', x: 20, y: 0 }
    ],
    props: { voltage, current: 1.0 }
  };
}

// Ground Rail Component
export function makeGroundRail(x = 100, y = 100): SimComponent {
  return {
    id: 'ground-' + nanoid(6),
    type: 'ground',
    x,
    y,
    pins: [
      { id: 'gnd', label: 'GND', kind: 'ground', x: 0, y: 0 }
    ],
    props: { reference: 0 }
  };
}
