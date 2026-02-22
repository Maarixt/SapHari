/**
 * MQTT client: connect to EMQX, subscribe to saphari/+/..., on message route to broadcast + presence.
 */

import mqtt, { MqttClient } from 'mqtt';
import { config } from '../config';
import { SUBSCRIPTION_TOPICS, getDeviceIdFromTopic } from './topics';
import { getAuthorizedUserIds } from '../authz/deviceAccess';
import { updatePresence } from '../presence/updater';

export type OnMessageFn = (deviceId: string, topic: string, payload: string, userIds: string[]) => void;

let client: MqttClient | null = null;
let onMessageCallback: OnMessageFn | null = null;

export function setMqttMessageHandler(fn: OnMessageFn): void {
  onMessageCallback = fn;
}

export function getMqttClient(): MqttClient | null {
  return client;
}

export function connectMqtt(): Promise<MqttClient> {
  if (client?.connected) {
    return Promise.resolve(client);
  }

  return new Promise((resolve, reject) => {
    const c = mqtt.connect(config.emqx.url, {
      username: config.emqx.username,
      password: config.emqx.password,
      clientId: 'saphari-bridge-1',
      clean: true,
      reconnectPeriod: 5000,
    });

    c.on('connect', () => {
      console.log('MQTT connected');
      SUBSCRIPTION_TOPICS.forEach((topic) => {
        c.subscribe(topic, (err) => {
          if (err) console.warn('Subscribe error', topic, err);
        });
      });
      client = c;
      resolve(c);
    });

    c.on('error', (err) => {
      console.error('MQTT error:', err);
      if (!client) reject(err);
    });

    c.on('message', async (topic: string, buf: Buffer) => {
      const payload = buf.toString();
      const deviceId = getDeviceIdFromTopic(topic);
      if (!deviceId) return;

      const userIds = await getAuthorizedUserIds(deviceId);
      if (userIds.length === 0) return;

      updatePresence(deviceId, topic, payload);

      if (onMessageCallback) {
        onMessageCallback(deviceId, topic, payload, userIds);
      }
    });
  });
}

export function publish(topic: string, payload: string): Promise<void> {
  if (!client?.connected) {
    return Promise.reject(new Error('MQTT not connected'));
  }
  return new Promise((resolve, reject) => {
    client!.publish(topic, payload, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function disconnectMqtt(): void {
  if (client) {
    client.end(true);
    client = null;
  }
}
