/**
 * MQTT validation utilities for topics and messages
 */

export interface MQTTValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates MQTT topic format
 */
export const validateMQTTTopic = (topic: string): MQTTValidationResult => {
  if (!topic || typeof topic !== 'string') {
    return { isValid: false, error: 'Topic must be a non-empty string' };
  }

  if (topic.length > 65535) {
    return { isValid: false, error: 'Topic length exceeds maximum (65535 characters)' };
  }

  // Spaces are never allowed
  if (/\s/.test(topic)) {
    return { isValid: false, error: 'Topic cannot contain spaces' };
  }

  // Validate wildcard usage for subscriptions
  // - '#' allowed at the end only ("#" or "/#") and only once
  if (topic.includes('#')) {
    if (!(topic === '#') && !topic.endsWith('/#')) {
      return { isValid: false, error: 'Multi-level wildcard (#) can only appear at the end' };
    }
    if (topic.indexOf('#') !== topic.lastIndexOf('#')) {
      return { isValid: false, error: 'Only one # wildcard is allowed in a topic' };
    }
  }

  // - '+' must occupy an entire level (segment equals "+")
  if (topic.includes('+')) {
    const segments = topic.split('/');
    const invalidPlus = segments.some(seg => seg.includes('+') && seg !== '+');
    if (invalidPlus) {
      return { isValid: false, error: 'Single-level wildcard (+) must be its own path segment' };
    }
  }

  return { isValid: true };
};

/**
 * Validates MQTT message content
 */
export const validateMQTTMessage = (message: string): MQTTValidationResult => {
  if (typeof message !== 'string') {
    return { isValid: false, error: 'Message must be a string' };
  }

  if (message.length > 268435456) { // 256MB limit
    return { isValid: false, error: 'Message size exceeds maximum (256MB)' };
  }

  return { isValid: true };
};

/**
 * Sanitizes MQTT topic by removing invalid characters
 */
export const sanitizeMQTTTopic = (topic: string): string => {
  return topic
    .replace(/[#+\s]/g, '') // Remove invalid characters
    .replace(/\/+/g, '/') // Replace multiple slashes with single slash
    .replace(/^\/|\/$/g, ''); // Remove leading/trailing slashes
};

/**
 * Validates SapHari-specific topic format
 */
export const validateSapHariTopic = (topic: string): MQTTValidationResult => {
  const baseValidation = validateMQTTTopic(topic);
  if (!baseValidation.isValid) {
    return baseValidation;
  }

  // SapHari topics should follow pattern: saphari/{device_id}/{category}/{address}
  const saphariPattern = /^saphari\/[^\/]+\/(sensor|status|cmd)\/[^\/]+$/;
  
  if (!saphariPattern.test(topic)) {
    return { 
      isValid: false, 
      error: 'Topic must follow SapHari format: saphari/{device_id}/{category}/{address}' 
    };
  }

  return { isValid: true };
};

/**
 * Validates JSON message format
 */
export const validateJSONMessage = (message: string): MQTTValidationResult => {
  try {
    JSON.parse(message);
    return { isValid: true };
  } catch (error) {
    return { 
      isValid: false, 
      error: 'Message must be valid JSON format' 
    };
  }
};

/**
 * Validates numeric message format
 */
export const validateNumericMessage = (message: string): MQTTValidationResult => {
  const num = Number(message);
  if (isNaN(num)) {
    return { 
      isValid: false, 
      error: 'Message must be a valid number' 
    };
  }
  return { isValid: true };
};
