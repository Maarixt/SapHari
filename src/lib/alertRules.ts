// Alert Rules types and interfaces
export interface AlertCondition {
  id: string;
  type: 'gpio' | 'sensor' | 'logic';
  pin?: number;
  operator: '>' | '<' | '=' | '!=' | '>=' | '<=';
  value: number | string;
  deviceId: string;
  deviceName?: string;
}

export interface AlertAction {
  id: string;
  type: 'notification' | 'snippet' | 'email' | 'webhook';
  message?: string;
  enabled: boolean;
  config?: Record<string, any>;
}

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  conditions: AlertCondition[];
  actions: AlertAction[];
  createdAt: string;
  updatedAt: string;
  userId: string;
  lastTriggered?: string;
  triggerCount: number;
}

export interface AlertRuleTrigger {
  id: string;
  ruleId: string;
  ruleName: string;
  message: string;
  timestamp: string;
  conditions: AlertCondition[];
  actions: AlertAction[];
  acknowledged: boolean;
  userId: string;
}

// Alert rule evaluation logic
export class AlertRuleEngine {
  private rules: AlertRule[] = [];
  private deviceStates: Map<string, Map<string, any>> = new Map();

  // Update device state for rule evaluation
  updateDeviceState(deviceId: string, address: string, value: any) {
    if (!this.deviceStates.has(deviceId)) {
      this.deviceStates.set(deviceId, new Map());
    }
    this.deviceStates.get(deviceId)!.set(address, value);
  }

  // Evaluate a single condition
  private evaluateCondition(condition: AlertCondition): boolean {
    const deviceState = this.deviceStates.get(condition.deviceId);
    if (!deviceState) return false;

    let currentValue: any;
    
    if (condition.type === 'gpio') {
      // For GPIO conditions, we need to find the widget with the matching pin
      // This is a simplified implementation - in practice, you'd need to map pins to addresses
      currentValue = deviceState.get(`GPIO_${condition.pin}`) || 0;
    } else if (condition.type === 'sensor') {
      // For sensor conditions, use the address directly
      currentValue = deviceState.get(condition.address || `SENSOR_${condition.pin}`) || 0;
    } else {
      // Logic conditions - evaluate based on multiple device states
      currentValue = this.evaluateLogicCondition(condition);
    }

    return this.compareValues(currentValue, condition.operator, condition.value);
  }

  // Evaluate logic conditions (AND/OR combinations)
  private evaluateLogicCondition(condition: AlertCondition): boolean {
    // This is a placeholder for complex logic conditions
    // In a real implementation, you'd parse the condition.value as a logical expression
    return false;
  }

  // Compare values based on operator
  private compareValues(current: any, operator: string, expected: any): boolean {
    const numCurrent = Number(current);
    const numExpected = Number(expected);
    
    if (!isNaN(numCurrent) && !isNaN(numExpected)) {
      switch (operator) {
        case '>': return numCurrent > numExpected;
        case '<': return numCurrent < numExpected;
        case '=': return numCurrent === numExpected;
        case '!=': return numCurrent !== numExpected;
        case '>=': return numCurrent >= numExpected;
        case '<=': return numCurrent <= numExpected;
        default: return false;
      }
    }
    
    // String comparison
    switch (operator) {
      case '=': return String(current) === String(expected);
      case '!=': return String(current) !== String(expected);
      default: return false;
    }
  }

  // Evaluate all rules and return triggered rules
  evaluateRules(): AlertRuleTrigger[] {
    const triggers: AlertRuleTrigger[] = [];
    
    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      
      // Check if all conditions are met (AND logic)
      const allConditionsMet = rule.conditions.every(condition => 
        this.evaluateCondition(condition)
      );
      
      if (allConditionsMet) {
        // Create trigger
        const trigger: AlertRuleTrigger = {
          id: `trigger_${rule.id}_${Date.now()}`,
          ruleId: rule.id,
          ruleName: rule.name,
          message: this.generateTriggerMessage(rule),
          timestamp: new Date().toISOString(),
          conditions: rule.conditions,
          actions: rule.actions.filter(action => action.enabled),
          acknowledged: false,
          userId: rule.userId
        };
        
        triggers.push(trigger);
      }
    }
    
    return triggers;
  }

  // Generate trigger message
  private generateTriggerMessage(rule: AlertRule): string {
    const conditionDescriptions = rule.conditions.map(condition => {
      if (condition.type === 'gpio') {
        return `GPIO ${condition.pin} ${condition.operator} ${condition.value}`;
      } else if (condition.type === 'sensor') {
        return `Sensor ${condition.pin || 'unknown'} ${condition.operator} ${condition.value}`;
      } else {
        return `Logic condition: ${condition.operator} ${condition.value}`;
      }
    }).join(' AND ');
    
    return `Alert Rule "${rule.name}" triggered: ${conditionDescriptions}`;
  }

  // Set rules for evaluation
  setRules(rules: AlertRule[]) {
    this.rules = rules;
  }

  // Add a single rule
  addRule(rule: AlertRule) {
    this.rules.push(rule);
  }

  // Remove a rule
  removeRule(ruleId: string) {
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
  }

  // Update a rule
  updateRule(ruleId: string, updates: Partial<AlertRule>) {
    const index = this.rules.findIndex(rule => rule.id === ruleId);
    if (index !== -1) {
      this.rules[index] = { ...this.rules[index], ...updates };
    }
  }
}

// Export singleton instance
export const alertRuleEngine = new AlertRuleEngine();
