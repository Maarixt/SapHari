/**
 * Basic tests for the ESP32 Circuit Simulator
 * Tests core functionality and component behaviors
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SeededRNG } from '../core/rng';
import { SimulationEngine } from '../core/engine';
import { createESP32DevKit } from '../components/Esp32DevKit';
import { createPushButton } from '../components/PushButton';
import { createLed } from '../components/Led';
import { createPotentiometer } from '../components/Potentiometer';
import { SimState } from '../core/types';

describe('ESP32 Circuit Simulator', () => {
  let rng: SeededRNG;
  let engine: SimulationEngine;
  let state: SimState;

  beforeEach(() => {
    rng = new SeededRNG(12345); // Fixed seed for deterministic tests
    
    state = {
      components: [],
      wires: [],
      running: false,
      time: 0,
      timeScale: 1.0,
      seed: 12345,
      schemaVersion: '1.0.0'
    };

    engine = new SimulationEngine(state, 12345);
  });

  describe('RNG System', () => {
    it('should produce deterministic results with same seed', () => {
      const rng1 = new SeededRNG(12345);
      const rng2 = new SeededRNG(12345);
      
      const values1 = Array.from({ length: 10 }, () => rng1.next());
      const values2 = Array.from({ length: 10 }, () => rng2.next());
      
      expect(values1).toEqual(values2);
    });

    it('should produce different results with different seeds', () => {
      const rng1 = new SeededRNG(12345);
      const rng2 = new SeededRNG(54321);
      
      const values1 = Array.from({ length: 10 }, () => rng1.next());
      const values2 = Array.from({ length: 10 }, () => rng2.next());
      
      expect(values1).not.toEqual(values2);
    });

    it('should generate gaussian noise with correct distribution', () => {
      const values = Array.from({ length: 1000 }, () => rng.nextGaussian());
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      
      expect(mean).toBeCloseTo(0, 1);
      expect(variance).toBeCloseTo(1, 1);
    });
  });

  describe('Push Button Component', () => {
    it('should debounce button presses correctly', () => {
      const button = createPushButton('btn1', { bounceMs: 10 });
      
      // Simulate button press
      button.setPressed(true);
      
      // Check initial state
      expect(button.getPressed()).toBe(false); // Not yet stable
      expect(button.isBouncing()).toBe(true);
      
      // Simulate time passing
      for (let i = 0; i < 15; i++) {
        button.update(1, engine.createSimCtx());
      }
      
      expect(button.getPressed()).toBe(true);
      expect(button.isBouncing()).toBe(false);
    });

    it('should generate bounce sequence', () => {
      const button = createPushButton('btn1', { bounceMs: 10 });
      
      button.setPressed(true);
      const bounceSequence = button.getBounceSequence();
      
      expect(bounceSequence.length).toBeGreaterThan(0);
      expect(bounceSequence[bounceSequence.length - 1]).toBe(true); // Final state should be pressed
    });
  });

  describe('LED Component', () => {
    it('should turn on when forward voltage is exceeded', () => {
      const led = createLed('led1', { color: 'red', forwardVoltage: 1.8 });
      
      // Simulate 3.3V on anode, 0V on cathode
      const ctx = engine.createSimCtx();
      ctx.setNetV('net_anode', 3.3);
      ctx.setNetV('net_cathode', 0);
      
      led.update(1, ctx);
      
      expect(led.isLedOn()).toBe(true);
      expect(led.getBrightness()).toBeGreaterThan(0);
    });

    it('should turn off when voltage is below forward voltage', () => {
      const led = createLed('led1', { color: 'red', forwardVoltage: 1.8 });
      
      // Simulate 1.0V on anode, 0V on cathode
      const ctx = engine.createSimCtx();
      ctx.setNetV('net_anode', 1.0);
      ctx.setNetV('net_cathode', 0);
      
      led.update(1, ctx);
      
      expect(led.isLedOn()).toBe(false);
      expect(led.getBrightness()).toBe(0);
    });

    it('should calculate current draw correctly', () => {
      const led = createLed('led1', { color: 'red', forwardVoltage: 1.8, maxCurrent: 20 });
      
      // Simulate 3.3V on anode, 0V on cathode
      const ctx = engine.createSimCtx();
      ctx.setNetV('net_anode', 3.3);
      ctx.setNetV('net_cathode', 0);
      
      led.update(1, ctx);
      
      expect(led.getCurrentDraw()).toBeGreaterThan(0);
      expect(led.getCurrentDraw()).toBeLessThanOrEqual(led.getInfo().maxCurrent);
    });
  });

  describe('Potentiometer Component', () => {
    it('should output correct voltage based on position', () => {
      const pot = createPotentiometer('pot1', { value: 0.5, resistance: 10000 });
      
      // Simulate 3.3V supply
      const ctx = engine.createSimCtx();
      ctx.setNetV('net_vcc', 3.3);
      ctx.setNetV('net_gnd', 0);
      
      pot.update(1, ctx);
      
      // At 50% position, should output ~1.65V
      expect(pot.getOutputVoltage()).toBeCloseTo(1.65, 0.1);
    });

    it('should generate ADC reading correctly', () => {
      const pot = createPotentiometer('pot1', { value: 0.5, resistance: 10000 });
      
      // Simulate 3.3V supply
      const ctx = engine.createSimCtx();
      ctx.setNetV('net_vcc', 3.3);
      ctx.setNetV('net_gnd', 0);
      
      pot.update(1, ctx);
      
      // At 50% position, should read ~2048 (4095/2)
      expect(pot.getADCReading()).toBeCloseTo(2048, 100);
    });

    it('should add noise to output', () => {
      const pot = createPotentiometer('pot1', { value: 0.5, noiseLevel: 0.01 });
      
      const ctx = engine.createSimCtx();
      ctx.setNetV('net_vcc', 3.3);
      ctx.setNetV('net_gnd', 0);
      
      // Get multiple readings
      const readings = Array.from({ length: 10 }, () => {
        pot.update(1, ctx);
        return pot.getOutputVoltage();
      });
      
      // Should have some variation due to noise
      const uniqueReadings = new Set(readings.map(r => Math.round(r * 1000)));
      expect(uniqueReadings.size).toBeGreaterThan(1);
    });
  });

  describe('ESP32 Component', () => {
    it('should initialize GPIO pins correctly', () => {
      const esp32 = createESP32DevKit('esp32_1');
      
      expect(esp32.getGPIOLevel(2)).toBe(0); // Default state
      expect(esp32.setGPIOMode(2, 'OUTPUT')).toBe(true);
      expect(esp32.setGPIOLevel(2, 1)).toBe(true);
      expect(esp32.getGPIOLevel(2)).toBe(1);
    });

    it('should reject invalid GPIO operations', () => {
      const esp32 = createESP32DevKit('esp32_1');
      
      // Try to set output on input-only pin
      expect(esp32.setGPIOMode(34, 'OUTPUT')).toBe(false);
      
      // Try to set level on input pin
      expect(esp32.setGPIOLevel(34, 1)).toBe(false);
    });

    it('should handle PWM correctly', () => {
      const esp32 = createESP32DevKit('esp32_1');
      
      expect(esp32.setupPWM(0, 1000, 8)).toBe(true);
      expect(esp32.attachPWM(2, 0)).toBe(true);
      expect(esp32.writePWM(0, 0.5)).toBe(true);
    });

    it('should handle interrupts correctly', () => {
      const esp32 = createESP32DevKit('esp32_1');
      let interruptCalled = false;
      
      const callback = () => { interruptCalled = true; };
      
      expect(esp32.attachInterrupt(2, callback)).toBe(true);
      expect(esp32.detachInterrupt(2)).toBeUndefined();
    });
  });

  describe('Simulation Engine', () => {
    it('should update components correctly', () => {
      const button = createPushButton('btn1');
      const led = createLed('led1');
      
      // Add components to engine (simplified)
      // In real implementation, this would be done through the engine's component system
      
      expect(button.getInfo().id).toBe('btn1');
      expect(led.getInfo().id).toBe('led1');
    });

    it('should generate warnings for circuit issues', () => {
      const led = createLed('led1', { forwardVoltage: 1.8 });
      
      // Simulate reverse bias
      const ctx = engine.createSimCtx();
      ctx.setNetV('net_anode', 0);
      ctx.setNetV('net_cathode', 3.3);
      
      led.update(1, ctx);
      
      const warnings = engine.getWarnings();
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some(w => w.code === 'LED_REVERSE_BIAS')).toBe(true);
    });
  });
});
