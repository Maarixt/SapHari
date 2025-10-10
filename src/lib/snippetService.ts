// Snippet service for emitting code snippets
export interface SnippetEvent {
  type: 'alert_rule' | 'device_config' | 'custom';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

type SnippetListener = (event: SnippetEvent) => void;

class SnippetService {
  private listeners: SnippetListener[] = [];

  // Subscribe to snippet events
  subscribe(listener: SnippetListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Emit a snippet event
  emitSnippet(type: SnippetEvent['type'], content: string, metadata?: Record<string, any>): void {
    const event: SnippetEvent = {
      type,
      content,
      timestamp: new Date(),
      metadata
    };

    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in snippet listener:', error);
      }
    });
  }

  // Generate alert rule snippet
  generateAlertRuleSnippet(rule: {
    name: string;
    conditions: Array<{
      type: 'gpio' | 'sensor' | 'logic';
      pin?: number;
      operator: '>' | '<' | '=' | '!=' | '>=' | '<=';
      value: number | string;
      deviceId: string;
    }>;
    actions: Array<{
      type: 'notification' | 'snippet';
      message?: string;
    }>;
  }): string {
    const conditions = rule.conditions.map(condition => {
      if (condition.type === 'gpio') {
        return `  // GPIO ${condition.pin} ${condition.operator} ${condition.value}`;
      } else if (condition.type === 'sensor') {
        return `  // Sensor ${condition.pin} ${condition.operator} ${condition.value}`;
      } else {
        return `  // Logic condition: ${condition.operator} ${condition.value}`;
      }
    }).join('\n');

    const actions = rule.actions.map(action => {
      if (action.type === 'notification') {
        return `  // Send notification: ${action.message}`;
      } else {
        return `  // Emit code snippet`;
      }
    }).join('\n');

    return `// Alert Rule: ${rule.name}
// Generated: ${new Date().toISOString()}

void checkAlertRule_${rule.name.replace(/[^a-zA-Z0-9]/g, '_')}() {
${conditions}
  
  if (condition_met) {
${actions}
  }
}`;
  }
}

// Export singleton instance
export const snippetService = new SnippetService();
