/**
 * SapHari Bridge: MQTT client + HTTP server + WebSocket server.
 * Browser connects only to this bridge; bridge connects to EMQX with server-side credentials.
 */

import http from 'http';
import { config } from './config';
import { createApp } from './http/server';
import { attachWsServer } from './ws/server';
import { broadcastToUsers } from './ws/server';
import { connectMqtt, setMqttMessageHandler, getMqttClient, disconnectMqtt } from './mqtt/client';
import { getAuthorizedUserIds } from './authz/deviceAccess';
import {
  setPresenceBroadcast,
  startTtlChecker,
  stopTtlChecker,
  normalizeTopicPayload,
} from './presence/updater';

async function main(): Promise<void> {
  setPresenceBroadcast((userIds, data) => {
    broadcastToUsers(userIds, data);
  });

  setMqttMessageHandler((deviceId, topic, payload, userIds) => {
    const { topic: t, payload: p } = normalizeTopicPayload(deviceId, topic, payload);
    broadcastToUsers(userIds, { topic: t, payload: p, ts: Date.now() });
  });

  await connectMqtt();
  startTtlChecker();

  const app = createApp();
  const server = http.createServer(app);
  attachWsServer(server);

  server.listen(config.server.port, () => {
    console.log(`Bridge listening on port ${config.server.port}`);
  });

  const shutdown = (): void => {
    stopTtlChecker();
    disconnectMqtt();
    server.close();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('Bridge failed to start:', err);
  process.exit(1);
});
