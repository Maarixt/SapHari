// src/components/simulator/SimulationBehavior.ts
import { SimComponent } from './types';

export interface SimulationBehavior {
  componentType: string;
  updateVisuals: (component: SimComponent, voltage: number, netVoltages: Record<string, number>) => Partial<SimComponent>;
  getMQTTData: (component: SimComponent, netVoltages: Record<string, number>) => Record<string, any>;
  getArduinoCode: (component: SimComponent) => string;
}

// LED Behavior
export const LEDBehavior: SimulationBehavior = {
  componentType: 'led',
  updateVisuals: (component, voltage, netVoltages) => {
    const anodeVoltage = netVoltages[`${component.id}:anode`] || 0;
    const cathodeVoltage = netVoltages[`${component.id}:cathode`] || 0;
    const forwardVoltage = anodeVoltage - cathodeVoltage;
    const isOn = forwardVoltage > 1.8; // ~2V threshold
    
    return {
      props: {
        ...component.props,
        on: isOn,
        brightness: Math.min(forwardVoltage / 3.3, 1) // Normalize to 0-1
      }
    };
  },
  getMQTTData: (component, netVoltages) => ({
    [`saphari/sim-${component.id}/status/led`]: component.props?.on ? '1' : '0'
  }),
  getArduinoCode: (component) => {
    const anodePin = component.pins.find(p => p.id === 'anode')?.label || 'GPIO2';
    return `digitalWrite(${anodePin}, ${component.props?.on ? 'HIGH' : 'LOW'});`;
  }
};

// RGB LED Behavior
export const RGBLEDBehavior: SimulationBehavior = {
  componentType: 'rgb-led',
  updateVisuals: (component, voltage, netVoltages) => {
    const redVoltage = netVoltages[`${component.id}:red`] || 0;
    const greenVoltage = netVoltages[`${component.id}:green`] || 0;
    const blueVoltage = netVoltages[`${component.id}:blue`] || 0;
    
    const red = Math.round((redVoltage / 3.3) * 255);
    const green = Math.round((greenVoltage / 3.3) * 255);
    const blue = Math.round((blueVoltage / 3.3) * 255);
    
    return {
      props: {
        ...component.props,
        color: `rgb(${red}, ${green}, ${blue})`,
        on: red > 0 || green > 0 || blue > 0
      }
    };
  },
  getMQTTData: (component, netVoltages) => ({
    [`saphari/sim-${component.id}/status/rgb`]: component.props?.color || 'rgb(0,0,0)'
  }),
  getArduinoCode: (component) => {
    const redPin = component.pins.find(p => p.id === 'red')?.label || 'GPIO4';
    const greenPin = component.pins.find(p => p.id === 'green')?.label || 'GPIO5';
    const bluePin = component.pins.find(p => p.id === 'blue')?.label || 'GPIO18';
    return `analogWrite(${redPin}, ${component.props?.red || 0});
analogWrite(${greenPin}, ${component.props?.green || 0});
analogWrite(${bluePin}, ${component.props?.blue || 0});`;
  }
};

// Buzzer Behavior
export const BuzzerBehavior: SimulationBehavior = {
  componentType: 'buzzer',
  updateVisuals: (component, voltage, netVoltages) => {
    const posVoltage = netVoltages[`${component.id}:pos`] || 0;
    const negVoltage = netVoltages[`${component.id}:neg`] || 0;
    const isActive = (posVoltage - negVoltage) > 2.0;
    
    return {
      props: {
        ...component.props,
        active: isActive,
        frequency: isActive ? 1500 : 0
      }
    };
  },
  getMQTTData: (component, netVoltages) => ({
    [`saphari/sim-${component.id}/status/buzzer`]: component.props?.active ? '1' : '0'
  }),
  getArduinoCode: (component) => {
    const signalPin = component.pins.find(p => p.id === 'pos')?.label || 'GPIO13';
    return `tone(${signalPin}, ${component.props?.frequency || 1000});`;
  }
};

// Servo Behavior
export const ServoBehavior: SimulationBehavior = {
  componentType: 'servo',
  updateVisuals: (component, voltage, netVoltages) => {
    const signalVoltage = netVoltages[`${component.id}:signal`] || 0;
    // Convert PWM voltage to angle (0-3.3V maps to 0-180°)
    const angle = Math.round((signalVoltage / 3.3) * 180);
    
    return {
      props: {
        ...component.props,
        angle: Math.max(0, Math.min(180, angle))
      }
    };
  },
  getMQTTData: (component, netVoltages) => ({
    [`saphari/sim-${component.id}/status/servo`]: component.props?.angle?.toString() || '90'
  }),
  getArduinoCode: (component) => {
    const signalPin = component.pins.find(p => p.id === 'signal')?.label || 'GPIO14';
    return `servo.write(${component.props?.angle || 90});`;
  }
};

// Button Behavior
export const ButtonBehavior: SimulationBehavior = {
  componentType: 'button',
  updateVisuals: (component, voltage, netVoltages) => {
    const pin1Voltage = netVoltages[`${component.id}:pin1`] || 0;
    const pin2Voltage = netVoltages[`${component.id}:pin2`] || 0;
    const isPressed = Math.abs(pin1Voltage - pin2Voltage) < 0.1; // Short circuit when pressed
    
    return {
      props: {
        ...component.props,
        pressed: isPressed
      }
    };
  },
  getMQTTData: (component, netVoltages) => ({
    [`saphari/sim-${component.id}/status/button`]: component.props?.pressed ? '1' : '0'
  }),
  getArduinoCode: (component) => {
    const inputPin = component.pins.find(p => p.id === 'pin1')?.label || 'GPIO2';
    return `int buttonState = digitalRead(${inputPin});`;
  }
};

// Potentiometer Behavior
export const PotentiometerBehavior: SimulationBehavior = {
  componentType: 'potentiometer',
  updateVisuals: (component, voltage, netVoltages) => {
    const outVoltage = netVoltages[`${component.id}:out`] || 0;
    // Convert voltage to ADC value (0-3.3V maps to 0-4095)
    const adcValue = Math.round((outVoltage / 3.3) * 4095);
    
    return {
      props: {
        ...component.props,
        value: adcValue,
        voltage: outVoltage
      }
    };
  },
  getMQTTData: (component, netVoltages) => ({
    [`saphari/sim-${component.id}/sensor/pot`]: component.props?.value?.toString() || '0'
  }),
  getArduinoCode: (component) => {
    const analogPin = component.pins.find(p => p.id === 'out')?.label || 'GPIO34';
    return `int potValue = analogRead(${analogPin});`;
  }
};

// PIR Sensor Behavior
export const PIRSensorBehavior: SimulationBehavior = {
  componentType: 'pir-sensor',
  updateVisuals: (component, voltage, netVoltages) => {
    const outVoltage = netVoltages[`${component.id}:out`] || 0;
    const motionDetected = outVoltage > 2.5; // High when motion detected
    
    return {
      props: {
        ...component.props,
        motion: motionDetected,
        on: motionDetected
      }
    };
  },
  getMQTTData: (component, netVoltages) => ({
    [`saphari/sim-${component.id}/sensor/motion`]: component.props?.motion ? '1' : '0'
  }),
  getArduinoCode: (component) => {
    const outputPin = component.pins.find(p => p.id === 'out')?.label || 'GPIO2';
    return `int motion = digitalRead(${outputPin});`;
  }
};

// Ultrasonic Sensor Behavior
export const UltrasonicBehavior: SimulationBehavior = {
  componentType: 'ultrasonic',
  updateVisuals: (component, voltage, netVoltages) => {
    // Simulate distance based on echo time (simplified)
    const distance = component.props?.distance || 50; // Default 50cm
    
    return {
      props: {
        ...component.props,
        distance: distance
      }
    };
  },
  getMQTTData: (component, netVoltages) => ({
    [`saphari/sim-${component.id}/sensor/distance`]: component.props?.distance?.toString() || '50'
  }),
  getArduinoCode: (component) => {
    const trigPin = component.pins.find(p => p.id === 'trig')?.label || 'GPIO2';
    const echoPin = component.pins.find(p => p.id === 'echo')?.label || 'GPIO4';
    return `digitalWrite(${trigPin}, LOW);
delayMicroseconds(2);
digitalWrite(${trigPin}, HIGH);
delayMicroseconds(10);
digitalWrite(${trigPin}, LOW);
long duration = pulseIn(${echoPin}, HIGH);
long distance = duration * 0.034 / 2;`;
  }
};

// Behavior Registry
export const BEHAVIOR_REGISTRY: SimulationBehavior[] = [
  LEDBehavior,
  RGBLEDBehavior,
  BuzzerBehavior,
  ServoBehavior,
  ButtonBehavior,
  PotentiometerBehavior,
  PIRSensorBehavior,
  UltrasonicBehavior
];

export const getBehaviorForComponent = (componentType: string): SimulationBehavior | null => {
  return BEHAVIOR_REGISTRY.find(behavior => behavior.componentType === componentType) || null;
};

// Generate Arduino sketch from circuit
export const generateArduinoSketch = (components: SimComponent[]): string => {
  const setupCode: string[] = [];
  const loopCode: string[] = [];
  
  components.forEach(component => {
    const behavior = getBehaviorForComponent(component.type);
    if (behavior) {
      const arduinoCode = behavior.getArduinoCode(component);
      if (component.type === 'led' || component.type === 'buzzer' || component.type === 'servo') {
        loopCode.push(arduinoCode);
      } else {
        setupCode.push(arduinoCode);
      }
    }
  });
  
  return `// Generated Arduino Sketch
void setup() {
  Serial.begin(115200);
  ${setupCode.join('\n  ')}
}

void loop() {
  ${loopCode.join('\n  ')}
  delay(100);
}`;
};
