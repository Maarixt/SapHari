/**
 * Arduino-style API for ESP32 Circuit Simulation
 * Provides familiar Arduino functions for users to write sketches
 */

import { 
  ArduinoAPI, 
  GpioMode, 
  PinLevel, 
  InterruptHandler,
  PWMMode,
  ADCMode
} from './types';
import { getRNG } from './rng';

export class ArduinoSandbox {
  private gpioStates: Map<number, { mode: GpioMode; level: PinLevel; pull: 'UP' | 'DOWN' | 'NONE' }> = new Map();
  private interruptHandlers: Map<number, InterruptHandler> = new Map();
  private pwmChannels: Map<number, PWMMode> = new Map();
  private adcPins: Map<number, ADCMode> = new Map();
  private startTime: number = 0;
  private rng = getRNG();
  
  // I2C simulation
  private i2cDevices: Map<number, any> = new Map();
  private i2cBuffer: number[] = [];
  private i2cAddress: number = 0;
  
  // SPI simulation
  private spiBuffer: number[] = [];
  
  // Serial simulation
  private serialBuffer: string[] = [];
  
  constructor() {
    this.startTime = performance.now();
    this.initializeGPIO();
  }
  
  /**
   * Initialize GPIO pins
   */
  private initializeGPIO(): void {
    for (let pin = 0; pin < 40; pin++) {
      this.gpioStates.set(pin, {
        mode: 'INPUT',
        level: 0,
        pull: 'NONE'
      });
    }
  }
  
  /**
   * Set pin mode
   */
  pinMode(pin: number, mode: GpioMode): void {
    const state = this.gpioStates.get(pin);
    if (state) {
      state.mode = mode;
      
      // Set pull resistors based on mode
      if (mode === 'INPUT_PULLUP') {
        state.pull = 'UP';
        state.level = 1;
      } else if (mode === 'INPUT_PULLDOWN') {
        state.pull = 'DOWN';
        state.level = 0;
      } else {
        state.pull = 'NONE';
      }
    }
  }
  
  /**
   * Write digital value to pin
   */
  digitalWrite(pin: number, value: PinLevel): void {
    const state = this.gpioStates.get(pin);
    if (state && state.mode === 'OUTPUT') {
      state.level = value;
      
      // Dispatch event for simulation
      this.dispatchPinChange(pin, value);
    }
  }
  
  /**
   * Read digital value from pin
   */
  digitalRead(pin: number): PinLevel {
    const state = this.gpioStates.get(pin);
    if (state) {
      // Add some noise for realism
      const noise = this.rng.nextGaussianScaled(0, 0.1);
      const threshold = 1.65 + noise;
      return state.level > threshold ? 1 : 0;
    }
    return 0;
  }
  
  /**
   * Read analog value from pin (0-4095)
   */
  analogRead(pin: number): number {
    const state = this.gpioStates.get(pin);
    if (state) {
      // Convert voltage to 12-bit ADC value
      const voltage = state.level ? 3.3 : 0;
      const counts = Math.round((voltage / 3.3) * 4095);
      
      // Add ADC noise (±2 LSB)
      const noise = this.rng.nextGaussianScaled(0, 2);
      return Math.max(0, Math.min(4095, counts + noise));
    }
    return 0;
  }
  
  /**
   * Setup PWM channel
   */
  ledcSetup(channel: number, frequency: number, resolution: number): void {
    this.pwmChannels.set(channel, {
      channel,
      frequency,
      resolution,
      duty: 0
    });
  }
  
  /**
   * Attach pin to PWM channel
   */
  ledcAttachPin(pin: number, channel: number): void {
    const pwm = this.pwmChannels.get(channel);
    if (pwm) {
      pwm.attachedPin = pin;
    }
  }
  
  /**
   * Write PWM duty cycle
   */
  ledcWrite(channel: number, duty: number): void {
    const pwm = this.pwmChannels.get(channel);
    if (pwm) {
      pwm.duty = Math.max(0, Math.min(1, duty));
      
      // Update attached pin
      if (pwm.attachedPin !== undefined) {
        const state = this.gpioStates.get(pwm.attachedPin);
        if (state) {
          state.level = duty > 0.5 ? 1 : 0;
          this.dispatchPinChange(pwm.attachedPin, state.level);
        }
      }
    }
  }
  
  /**
   * Attach interrupt handler
   */
  attachInterrupt(pin: number, edge: 'RISING' | 'FALLING' | 'CHANGE', callback: () => void): void {
    this.interruptHandlers.set(pin, {
      pin,
      edge,
      callback,
      enabled: true
    });
  }
  
  /**
   * Detach interrupt handler
   */
  detachInterrupt(pin: number): void {
    this.interruptHandlers.delete(pin);
  }
  
  /**
   * Delay execution
   */
  async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Get milliseconds since start
   */
  millis(): number {
    return Math.floor(performance.now() - this.startTime);
  }
  
  /**
   * Get microseconds since start
   */
  micros(): number {
    return Math.floor((performance.now() - this.startTime) * 1000);
  }
  
  /**
   * I2C Wire object
   */
  Wire = {
    begin: () => {
      // Initialize I2C
    },
    
    beginTransmission: (address: number) => {
      this.i2cAddress = address;
      this.i2cBuffer = [];
    },
    
    write: (data: number) => {
      this.i2cBuffer.push(data);
    },
    
    endTransmission: () => {
      // Simulate I2C transmission
      const device = this.i2cDevices.get(this.i2cAddress);
      if (device) {
        device.receive(this.i2cBuffer);
      }
      return 0; // Success
    },
    
    requestFrom: (address: number, quantity: number) => {
      const device = this.i2cDevices.get(address);
      if (device) {
        this.i2cBuffer = device.transmit(quantity);
      }
    },
    
    available: () => {
      return this.i2cBuffer.length;
    },
    
    read: () => {
      return this.i2cBuffer.shift() || 0;
    }
  };
  
  /**
   * SPI object
   */
  SPI = {
    begin: () => {
      // Initialize SPI
    },
    
    transfer: (data: number) => {
      // Simulate SPI transfer
      return data; // Simple echo for now
    },
    
    end: () => {
      // End SPI
    }
  };
  
  /**
   * Serial object
   */
  Serial = {
    print: (data: any) => {
      this.serialBuffer.push(String(data));
      console.log('Serial:', data);
    },
    
    println: (data: any) => {
      this.serialBuffer.push(String(data) + '\n');
      console.log('Serial:', data);
    },
    
    available: () => {
      return this.serialBuffer.length;
    },
    
    read: () => {
      const line = this.serialBuffer.shift();
      return line ? line.charCodeAt(0) : -1;
    }
  };
  
  /**
   * Dispatch pin change event
   */
  private dispatchPinChange(pin: number, value: PinLevel): void {
    // Check for interrupt triggers
    const handler = this.interruptHandlers.get(pin);
    if (handler && handler.enabled) {
      const currentLevel = this.gpioStates.get(pin)?.level || 0;
      const previousLevel = value === 1 ? 0 : 1; // Simplified
      
      let shouldTrigger = false;
      switch (handler.edge) {
        case 'RISING':
          shouldTrigger = previousLevel === 0 && currentLevel === 1;
          break;
        case 'FALLING':
          shouldTrigger = previousLevel === 1 && currentLevel === 0;
          break;
        case 'CHANGE':
          shouldTrigger = previousLevel !== currentLevel;
          break;
      }
      
      if (shouldTrigger) {
        // Add small delay to simulate interrupt latency
        setTimeout(() => {
          handler.callback();
        }, 0.1); // 100µs latency
      }
    }
  }
  
  /**
   * Get current GPIO state
   */
  getGPIOState(pin: number): { mode: GpioMode; level: PinLevel; pull: 'UP' | 'DOWN' | 'NONE' } | undefined {
    return this.gpioStates.get(pin);
  }
  
  /**
   * Get all GPIO states
   */
  getAllGPIOStates(): Map<number, { mode: GpioMode; level: PinLevel; pull: 'UP' | 'DOWN' | 'NONE' }> {
    return new Map(this.gpioStates);
  }
  
  /**
   * Get PWM channel info
   */
  getPWMChannel(channel: number): PWMMode | undefined {
    return this.pwmChannels.get(channel);
  }
  
  /**
   * Get all PWM channels
   */
  getAllPWMChannels(): Map<number, PWMMode> {
    return new Map(this.pwmChannels);
  }
  
  /**
   * Reset sandbox
   */
  reset(): void {
    this.initializeGPIO();
    this.interruptHandlers.clear();
    this.pwmChannels.clear();
    this.adcPins.clear();
    this.i2cDevices.clear();
    this.i2cBuffer = [];
    this.spiBuffer = [];
    this.serialBuffer = [];
    this.startTime = performance.now();
  }
}

// Create global Arduino API instance
let arduinoAPI: ArduinoSandbox | null = null;

/**
 * Get global Arduino API instance
 */
export function getArduinoAPI(): ArduinoSandbox {
  if (!arduinoAPI) {
    arduinoAPI = new ArduinoSandbox();
  }
  return arduinoAPI;
}

/**
 * Create new Arduino API instance
 */
export function createArduinoAPI(): ArduinoSandbox {
  return new ArduinoSandbox();
}

/**
 * Export Arduino API object for user sketches
 */
export const ArduinoAPI: ArduinoAPI = {
  pinMode: (pin: number, mode: GpioMode) => getArduinoAPI().pinMode(pin, mode),
  digitalWrite: (pin: number, value: PinLevel) => getArduinoAPI().digitalWrite(pin, value),
  digitalRead: (pin: number) => getArduinoAPI().digitalRead(pin),
  analogRead: (pin: number) => getArduinoAPI().analogRead(pin),
  ledcSetup: (channel: number, frequency: number, resolution: number) => getArduinoAPI().ledcSetup(channel, frequency, resolution),
  ledcAttachPin: (pin: number, channel: number) => getArduinoAPI().ledcAttachPin(pin, channel),
  ledcWrite: (channel: number, duty: number) => getArduinoAPI().ledcWrite(channel, duty),
  attachInterrupt: (pin: number, edge: 'RISING' | 'FALLING' | 'CHANGE', callback: () => void) => getArduinoAPI().attachInterrupt(pin, edge, callback),
  detachInterrupt: (pin: number) => getArduinoAPI().detachInterrupt(pin),
  delay: (ms: number) => getArduinoAPI().delay(ms),
  millis: () => getArduinoAPI().millis(),
  micros: () => getArduinoAPI().micros(),
  Wire: getArduinoAPI().Wire,
  SPI: getArduinoAPI().SPI,
  Serial: getArduinoAPI().Serial
};
