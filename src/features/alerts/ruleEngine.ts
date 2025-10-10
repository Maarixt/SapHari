import { AlertRule, AlertEntry } from './types';
import { AlertsStore } from './alertsStore';

// Device state tracking
const deviceStates: Record<string, Record<string, any>> = {};

// Update device state from MQTT message
export function updateDeviceState(deviceId: string, key: string, value: any) {
  if (!deviceStates[deviceId]) {
    deviceStates[deviceId] = {};
  }
  deviceStates[deviceId][key] = value;
  
  // Evaluate all rules after state update
  evaluateRules();
}

// Evaluate all active rules
function evaluateRules() {
  const rules = AlertsStore.listRules();
  
  for (const rule of rules) {
    if (!rule.isActive) continue;
    
    if (shouldTrigger(rule)) {
      triggerRule(rule);
    }
  }
}

// Check if a rule should trigger
function shouldTrigger(rule: AlertRule): boolean {
  const deviceState = deviceStates[rule.deviceId];
  if (!deviceState) return false;
  
  const now = Date.now();
  const lastFire = AlertsStore._getLastFire(rule.id);
  const debounceMs = rule.debounceMs || 1000;
  
  // Check debounce
  if (now - lastFire < debounceMs) return false;
  
  // Check "once" rule
  if (rule.once && lastFire > 0) return false;
  
  let currentValue: any;
  
  switch (rule.source) {
    case 'GPIO':
      if (rule.pin !== undefined) {
        currentValue = deviceState[`GPIO_${rule.pin}`] || deviceState[`pin_${rule.pin}`] || 0;
      } else {
        return false;
      }
      break;
      
    case 'SENSOR':
      if (rule.key) {
        currentValue = deviceState[rule.key] || 0;
      } else if (rule.pin !== undefined) {
        currentValue = deviceState[`sensor_${rule.pin}`] || 0;
      } else {
        return false;
      }
      break;
      
    case 'LOGIC':
      // For logic rules, we'd need to implement more complex evaluation
      // For now, just return false
      return false;
      
    default:
      return false;
  }
  
  // Apply hysteresis if configured
  if (rule.hysteresis && rule.value !== undefined) {
    const armedSide = AlertsStore._getArmed(rule.id);
    const threshold = Number(rule.value);
    
    if (armedSide === 'above') {
      // Only trigger if we go below threshold - hysteresis
      if (Number(currentValue) < threshold - rule.hysteresis) {
        AlertsStore._setArmed(rule.id, 'below');
        return true;
      }
    } else if (armedSide === 'below') {
      // Only trigger if we go above threshold - hysteresis
      if (Number(currentValue) > threshold + rule.hysteresis) {
        AlertsStore._setArmed(rule.id, 'above');
        return true;
      }
    } else {
      // First time - arm based on current value
      if (Number(currentValue) > threshold) {
        AlertsStore._setArmed(rule.id, 'above');
      } else {
        AlertsStore._setArmed(rule.id, 'below');
      }
      return false;
    }
  }
  
  // Standard comparison
  if (rule.whenPinEquals !== undefined) {
    // For GPIO pin equals comparison
    return Number(currentValue) === rule.whenPinEquals;
  }
  
  if (rule.op && rule.value !== undefined) {
    const numValue = Number(currentValue);
    const numThreshold = Number(rule.value);
    
    switch (rule.op) {
      case '>': return numValue > numThreshold;
      case '>=': return numValue >= numThreshold;
      case '<': return numValue < numThreshold;
      case '<=': return numValue <= numThreshold;
      case '==': return numValue === numThreshold;
      case '!=': return numValue !== numThreshold;
      default: return false;
    }
  }
  
  return false;
}

// Trigger a rule
function triggerRule(rule: AlertRule) {
  const now = Date.now();
  
  // Update last fire time
  AlertsStore._setLastFire(rule.id, now);
  
  // Create alert entry
  const entry: AlertEntry = {
    id: `alert_${rule.id}_${now}`,
    ruleId: rule.id,
    ruleName: rule.name,
    deviceId: rule.deviceId,
    value: getCurrentValue(rule),
    ts: now,
    seen: false,
    ack: false
  };
  
  // Add to history
  AlertsStore._push(entry);
}

// Get current value for a rule
function getCurrentValue(rule: AlertRule): number | string | null {
  const deviceState = deviceStates[rule.deviceId];
  if (!deviceState) return null;
  
  switch (rule.source) {
    case 'GPIO':
      if (rule.pin !== undefined) {
        return deviceState[`GPIO_${rule.pin}`] || deviceState[`pin_${rule.pin}`] || 0;
      }
      break;
      
    case 'SENSOR':
      if (rule.key) {
        return deviceState[rule.key] || 0;
      } else if (rule.pin !== undefined) {
        return deviceState[`sensor_${rule.pin}`] || 0;
      }
      break;
  }
  
  return null;
}

// Process MQTT message for rule evaluation
export function processMQTTMessage(topic: string, message: string) {
  try {
    // Parse topic: saphari/{device_id}/{type}/{key}
    const parts = topic.split('/');
    if (parts.length >= 4 && parts[0] === 'saphari') {
      const deviceId = parts[1];
      const type = parts[2]; // 'sensor', 'switch', etc.
      const key = parts[3];
      
      // Convert message to appropriate type
      let value: any = message;
      if (!isNaN(Number(message))) {
        value = Number(message);
      }
      
      // Update device state
      updateDeviceState(deviceId, key, value);
      
      // Also update with type prefix for compatibility
      updateDeviceState(deviceId, `${type}_${key}`, value);
      
      // For GPIO pins, also update with pin prefix
      if (type === 'switch' || type === 'sensor') {
        const pinMatch = key.match(/(\d+)/);
        if (pinMatch) {
          const pin = pinMatch[1];
          updateDeviceState(deviceId, `GPIO_${pin}`, value);
          updateDeviceState(deviceId, `pin_${pin}`, value);
        }
      }
    }
  } catch (error) {
    console.error('Error processing MQTT message for rules:', error);
  }
}
