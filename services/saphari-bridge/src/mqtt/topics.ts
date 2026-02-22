/**
 * MQTT topic list and parsing for v1 saphari/<deviceId>/... topics.
 */

export const SAPHARI_TOPIC_PREFIX = 'saphari';

/** Subscription patterns (v1) */
export const SUBSCRIPTION_TOPICS = [
  'saphari/+/gpio/#',
  'saphari/+/sensor/#',
  'saphari/+/gauge/#',
  'saphari/+/status/#',
  'saphari/+/state',
  'saphari/+/ack',
  'saphari/+/heartbeat',
] as const;

/**
 * Parse deviceId from topic saphari/<deviceId>/...
 */
export function getDeviceIdFromTopic(topic: string): string | null {
  if (!topic.startsWith(`${SAPHARI_TOPIC_PREFIX}/`)) return null;
  const parts = topic.split('/');
  if (parts.length < 2) return null;
  return parts[1] || null;
}

/**
 * Build command topic for publishing.
 */
export function cmdTopic(deviceId: string, command: string): string {
  return `${SAPHARI_TOPIC_PREFIX}/${deviceId}/cmd/${command}`;
}
