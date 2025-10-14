/**
 * ESP32 Development Kit Component
 * Pin-accurate simulation of ESP32-WROOM-32 module
 */

import { Component, SimCtx, PinState, GpioMode } from '../core/types';
import { getRNG } from '../core/rng';

export interface ESP32Props {
  model?: 'ESP32-WROOM-32' | 'ESP32-WROOM-32E' | 'ESP32-WROOM-32UE';
  flashSize?: '4MB' | '8MB' | '16MB';
  psramSize?: '0MB' | '2MB' | '4MB' | '8MB';
}

export class ESP32DevKit implements Component {
  id: string;
  label: string;
  pins: Record<string, string> = {};
  props: ESP32Props;
  powerDrawmA: number = 50; // Base power consumption

  // GPIO capabilities map
  private gpioCapabilities: Map<number, {
    input: boolean;
    output: boolean;
    pullup: boolean;
    pulldown: boolean;
    pwm: boolean;
    adc: boolean;
    i2c: boolean;
    spi: boolean;
  }> = new Map();

  // Internal state
  private gpioStates: Map<number, PinState> = new Map();
  private interruptHandlers: Map<number, () => void> = new Map();
  private pwmChannels: Map<number, { frequency: number; duty: number; attachedPin?: number }> = new Map();
  private adcPins: Map<number, { attenuation: string; resolution: number }> = new Map();
  private rng = getRNG();

  constructor(id: string, props: ESP32Props = {}) {
    this.id = id;
    this.label = 'ESP32 DevKit';
    this.props = {
      model: 'ESP32-WROOM-32',
      flashSize: '4MB',
      psramSize: '0MB',
      ...props
    };

    this.initializeGPIO();
    this.initializeCapabilities();
  }

  /**
   * Initialize GPIO pins with their capabilities
   */
  private initializeGPIO(): void {
    // Initialize all GPIO pins
    for (let pin = 0; pin < 40; pin++) {
      this.gpioStates.set(pin, {
        mode: 'INPUT',
        level: 0,
        pull: 'NONE'
      });
    }

    // Set up pin mappings
    this.pins = {
      '3V3': 'net_3v3',
      'GND': 'net_gnd',
      'GPIO0': 'net_gpio0',
      'GPIO1': 'net_gpio1',
      'GPIO2': 'net_gpio2',
      'GPIO3': 'net_gpio3',
      'GPIO4': 'net_gpio4',
      'GPIO5': 'net_gpio5',
      'GPIO6': 'net_gpio6',
      'GPIO7': 'net_gpio7',
      'GPIO8': 'net_gpio8',
      'GPIO9': 'net_gpio9',
      'GPIO10': 'net_gpio10',
      'GPIO11': 'net_gpio11',
      'GPIO12': 'net_gpio12',
      'GPIO13': 'net_gpio13',
      'GPIO14': 'net_gpio14',
      'GPIO15': 'net_gpio15',
      'GPIO16': 'net_gpio16',
      'GPIO17': 'net_gpio17',
      'GPIO18': 'net_gpio18',
      'GPIO19': 'net_gpio19',
      'GPIO21': 'net_gpio21',
      'GPIO22': 'net_gpio22',
      'GPIO23': 'net_gpio23',
      'GPIO25': 'net_gpio25',
      'GPIO26': 'net_gpio26',
      'GPIO27': 'net_gpio27',
      'GPIO32': 'net_gpio32',
      'GPIO33': 'net_gpio33',
      'GPIO34': 'net_gpio34',
      'GPIO35': 'net_gpio35',
      'GPIO36': 'net_gpio36',
      'GPIO39': 'net_gpio39'
    };
  }

  /**
   * Initialize GPIO capabilities
   */
  private initializeCapabilities(): void {
    // GPIO 0-39 capabilities
    const capabilities = [
      // GPIO 0-15
      { input: true, output: true, pullup: true, pulldown: true, pwm: true, adc: false, i2c: false, spi: false },
      { input: true, output: true, pullup: true, pulldown: true, pwm: true, adc: false, i2c: false, spi: false },
      { input: true, output: true, pullup: true, pulldown: true, pwm: true, adc: false, i2c: false, spi: false },
      { input: true, output: true, pullup: true, pulldown: true, pwm: true, adc: false, i2c: false, spi: false },
      { input: true, output: true, pullup: true, pulldown: true, pwm: true, adc: false, i2c: false, spi: false },
      { input: true, output: true, pullup: true, pulldown: true, pwm: true, adc: false, i2c: false, spi: false },
      { input: true, output: true, pullup: true, pulldown: true, pwm: true, adc: false, i2c: false, spi: false },
      { input: true, output: true, pullup: true, pulldown: true, pwm: true, adc: false, i2c: false, spi: false },
      { input: true, output: true, pullup: true, pulldown: true, pwm: true, adc: false, i2c: false, spi: false },
      { input: true, output: true, pullup: true, pulldown: true, pwm: true, adc: false, i2c: false, spi: false },
      { input: true, output: true, pullup: true, pulldown: true, pwm: true, adc: false, i2c: false, spi: false },
      { input: true, output: true, pullup: true, pulldown: true, pwm: true, adc: false, i2c: false, spi: false },
      { input: true, output: true, pullup: true, pulldown: true, pwm: true, adc: false, i2c: false, spi: false },
      { input: true, output: true, pullup: true, pulldown: true, pwm: true, adc: false, i2c: false, spi: false },
      { input: true, output: true, pullup: true, pulldown: true, pwm: true, adc: false, i2c: false, spi: false },
      { input: true, output: true, pullup: true, pulldown: true, pwm: true, adc: false, i2c: false, spi: false },
      
      // GPIO 16-31
      { input: true, output: true, pullup: true, pulldown: true, pwm: true, adc: false, i2c: false, spi: false },
      { input: true, output: true, pullup: true, pulldown: true, pwm: true, adc: false, i2c: false, spi: false },
      { input: true, output: true, pullup: true, pulldown: true, pwm: true, adc: false, i2c: false, spi: false },
      { input: true, output: true, pullup: true, pulldown: true, pwm: true, adc: false, i2c: false, spi: false },
      { input: true, output: true, pullup: true, pulldown: true, pwm: true, adc: false, i2c: false, spi: false },
      { input: true, output: true, pullup: true, pulldown: true, pwm: true, adc: false, i2c: false, spi: false },
      { input: true, output: true, pullup: true, pulldown: true, pwm: true, adc: false, i2c: false, spi: false },
      { input: true, output: true, pullup: true, pulldown: true, pwm: true, adc: false, i2c: false, spi: false },
      { input: true, output: true, pullup: true, pulldown: true, pwm: true, adc: false, i2c: false, spi: false },
      { input: true, output: true, pullup: true, pulldown: true, pwm: true, adc: false, i2c: false, spi: false },
      { input: true, output: true, pullup: true, pulldown: true, pwm: true, adc: false, i2c: false, spi: false },
      { input: true, output: true, pullup: true, pulldown: true, pwm: true, adc: false, i2c: false, spi: false },
      { input: true, output: true, pullup: true, pulldown: true, pwm: true, adc: false, i2c: false, spi: false },
      { input: true, output: true, pullup: true, pulldown: true, pwm: true, adc: false, i2c: false, spi: false },
      { input: true, output: true, pullup: true, pulldown: true, pwm: true, adc: false, i2c: false, spi: false },
      { input: true, output: true, pullup: true, pulldown: true, pwm: true, adc: false, i2c: false, spi: false },
      
      // GPIO 32-39 (ADC pins)
      { input: true, output: true, pullup: true, pulldown: true, pwm: true, adc: true, i2c: false, spi: false },
      { input: true, output: true, pullup: true, pulldown: true, pwm: true, adc: true, i2c: false, spi: false },
      { input: true, output: false, pullup: true, pulldown: true, pwm: false, adc: true, i2c: false, spi: false }, // Input only
      { input: true, output: false, pullup: true, pulldown: true, pwm: false, adc: true, i2c: false, spi: false }, // Input only
      { input: true, output: false, pullup: true, pulldown: true, pwm: false, adc: true, i2c: false, spi: false }, // Input only
      { input: true, output: false, pullup: true, pulldown: true, pwm: false, adc: true, i2c: false, spi: false }, // Input only
      { input: true, output: false, pullup: true, pulldown: true, pwm: false, adc: true, i2c: false, spi: false }, // Input only
      { input: true, output: false, pullup: true, pulldown: true, pwm: false, adc: true, i2c: false, spi: false }  // Input only
    ];

    capabilities.forEach((cap, index) => {
      this.gpioCapabilities.set(index, cap);
    });

    // Special pins
    this.gpioCapabilities.set(21, { ...capabilities[21], i2c: true }); // SDA
    this.gpioCapabilities.set(22, { ...capabilities[22], i2c: true }); // SCL
  }

  init(ctx: SimCtx): void {
    // Initialize ESP32-specific settings
    this.powerDrawmA = 50; // Base power consumption
    
    // Set up default pin states
    this.gpioStates.set(0, { mode: 'INPUT', level: 0, pull: 'UP' }); // Boot mode
    this.gpioStates.set(2, { mode: 'OUTPUT', level: 1, pull: 'NONE' }); // Built-in LED
  }

  update(dt: number, ctx: SimCtx): void {
    // Update GPIO states based on net voltages
    for (const [pinName, netId] of Object.entries(this.pins)) {
      if (pinName.startsWith('GPIO')) {
        const gpioNum = parseInt(pinName.replace('GPIO', ''));
        const netVoltage = ctx.getNetV(netId);
        const currentState = this.gpioStates.get(gpioNum);
        
        if (currentState) {
          // Update pin level based on net voltage
          const newLevel = netVoltage > 1.65 ? 1 : 0;
          
          // Check for interrupt triggers
          if (currentState.level !== newLevel) {
            this.checkInterruptTrigger(gpioNum, currentState.level, newLevel, ctx);
            currentState.level = newLevel;
          }
        }
      }
    }

    // Update PWM outputs
    this.updatePWMOutputs(ctx);
    
    // Update ADC readings
    this.updateADCReadings(ctx);
  }

  onPinChange(pin: string, ctx: SimCtx): void {
    // Handle pin changes
    if (pin.startsWith('GPIO')) {
      const gpioNum = parseInt(pin.replace('GPIO', ''));
      const netId = this.pins[pin];
      const netVoltage = ctx.getNetV(netId);
      
      // Update GPIO state
      const state = this.gpioStates.get(gpioNum);
      if (state) {
        const newLevel = netVoltage > 1.65 ? 1 : 0;
        if (state.level !== newLevel) {
          this.checkInterruptTrigger(gpioNum, state.level, newLevel, ctx);
          state.level = newLevel;
        }
      }
    }
  }

  /**
   * Check for interrupt triggers
   */
  private checkInterruptTrigger(pin: number, oldLevel: number, newLevel: number, ctx: SimCtx): void {
    const handler = this.interruptHandlers.get(pin);
    if (handler) {
      // Add small delay to simulate interrupt latency (~100µs)
      ctx.schedule(() => {
        handler();
      }, 0.1);
    }
  }

  /**
   * Update PWM outputs
   */
  private updatePWMOutputs(ctx: SimCtx): void {
    for (const [channel, pwm] of this.pwmChannels) {
      if (pwm.attachedPin !== undefined) {
        const pinName = `GPIO${pwm.attachedPin}`;
        const netId = this.pins[pinName];
        if (netId) {
          // Convert duty cycle to voltage (0-3.3V)
          const voltage = pwm.duty * 3.3;
          ctx.setNetV(netId, voltage);
        }
      }
    }
  }

  /**
   * Update ADC readings
   */
  private updateADCReadings(ctx: SimCtx): void {
    for (const [pin, adc] of this.adcPins) {
      const pinName = `GPIO${pin}`;
      const netId = this.pins[pinName];
      if (netId) {
        const netVoltage = ctx.getNetV(netId);
        // ADC reading is handled by the Arduino API
        // This is just for internal tracking
      }
    }
  }

  /**
   * Set GPIO mode
   */
  setGPIOMode(pin: number, mode: GpioMode): boolean {
    const capabilities = this.gpioCapabilities.get(pin);
    if (!capabilities) return false;

    const state = this.gpioStates.get(pin);
    if (!state) return false;

    // Check if mode is supported
    switch (mode) {
      case 'INPUT':
      case 'INPUT_PULLUP':
      case 'INPUT_PULLDOWN':
        if (!capabilities.input) return false;
        break;
      case 'OUTPUT':
        if (!capabilities.output) return false;
        break;
      case 'PWM':
        if (!capabilities.pwm) return false;
        break;
      case 'ANALOG':
        if (!capabilities.adc) return false;
        break;
    }

    state.mode = mode;
    
    // Set pull resistors
    if (mode === 'INPUT_PULLUP') {
      state.pull = 'UP';
      state.level = 1;
    } else if (mode === 'INPUT_PULLDOWN') {
      state.pull = 'DOWN';
      state.level = 0;
    } else {
      state.pull = 'NONE';
    }

    return true;
  }

  /**
   * Set GPIO level
   */
  setGPIOLevel(pin: number, level: 0 | 1): boolean {
    const state = this.gpioStates.get(pin);
    if (!state || state.mode !== 'OUTPUT') return false;

    state.level = level;
    return true;
  }

  /**
   * Get GPIO level
   */
  getGPIOLevel(pin: number): 0 | 1 {
    const state = this.gpioStates.get(pin);
    return state ? state.level : 0;
  }

  /**
   * Attach interrupt handler
   */
  attachInterrupt(pin: number, callback: () => void): boolean {
    const capabilities = this.gpioCapabilities.get(pin);
    if (!capabilities || !capabilities.input) return false;

    this.interruptHandlers.set(pin, callback);
    return true;
  }

  /**
   * Detach interrupt handler
   */
  detachInterrupt(pin: number): void {
    this.interruptHandlers.delete(pin);
  }

  /**
   * Setup PWM channel
   */
  setupPWM(channel: number, frequency: number, resolution: number): boolean {
    this.pwmChannels.set(channel, {
      frequency,
      duty: 0,
      resolution
    });
    return true;
  }

  /**
   * Attach pin to PWM channel
   */
  attachPWM(pin: number, channel: number): boolean {
    const capabilities = this.gpioCapabilities.get(pin);
    if (!capabilities || !capabilities.pwm) return false;

    const pwm = this.pwmChannels.get(channel);
    if (!pwm) return false;

    pwm.attachedPin = pin;
    return true;
  }

  /**
   * Write PWM duty cycle
   */
  writePWM(channel: number, duty: number): boolean {
    const pwm = this.pwmChannels.get(channel);
    if (!pwm) return false;

    pwm.duty = Math.max(0, Math.min(1, duty));
    return true;
  }

  /**
   * Read analog value
   */
  readAnalog(pin: number): number {
    const capabilities = this.gpioCapabilities.get(pin);
    if (!capabilities || !capabilities.adc) return 0;

    const pinName = `GPIO${pin}`;
    const netId = this.pins[pinName];
    if (!netId) return 0;

    // This would be called from the simulation context
    // For now, return a placeholder
    return 0;
  }

  /**
   * Get component info
   */
  getInfo(): any {
    return {
      id: this.id,
      label: this.label,
      model: this.props.model,
      flashSize: this.props.flashSize,
      psramSize: this.props.psramSize,
      powerDrawmA: this.powerDrawmA,
      gpioCount: this.gpioCapabilities.size,
      pwmChannels: this.pwmChannels.size,
      adcPins: this.adcPins.size
    };
  }
}

/**
 * Create ESP32 DevKit component
 */
export function createESP32DevKit(id: string, props?: ESP32Props): ESP32DevKit {
  return new ESP32DevKit(id, props);
}
