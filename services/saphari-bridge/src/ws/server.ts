/**
 * WebSocket server: auth via first message only (no token in URL).
 * First message MUST be { "type": "auth", "token": "<supabase_access_token>" }.
 * 5s auth timeout; then close with 4401. On success send { type: "auth_ok", userId }.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { getUserFromToken } from '../auth/supabase';

const ROOM_PREFIX = 'user:';
const AUTH_TIMEOUT_MS = 5000;
const MAX_MESSAGE_SIZE = 8192;

const rooms = new Map<string, Set<WebSocket>>();

export interface AuthenticatedWs extends WebSocket {
  userId?: string;
}

function getRoomName(userId: string): string {
  return `${ROOM_PREFIX}${userId}`;
}

function join(ws: WebSocket, userId: string): void {
  const room = getRoomName(userId);
  if (!rooms.has(room)) rooms.set(room, new Set());
  rooms.get(room)!.add(ws);
  (ws as AuthenticatedWs).userId = userId;
}

function leave(ws: WebSocket): void {
  const a = ws as AuthenticatedWs;
  if (a.userId) {
    const room = getRoomName(a.userId);
    const set = rooms.get(room);
    if (set) {
      set.delete(ws);
      if (set.size === 0) rooms.delete(room);
    }
  }
}

export function getWsClientsCount(): number {
  let n = 0;
  for (const set of rooms.values()) n += set.size;
  return n;
}

export function broadcastToUsers(
  userIds: string[],
  data: { topic: string; payload: string; ts: number }
): void {
  const payload = JSON.stringify(data);
  const sent = new Set<WebSocket>();
  for (const userId of userIds) {
    const set = rooms.get(getRoomName(userId));
    if (set) {
      set.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN && !sent.has(ws)) {
          sent.add(ws);
          ws.send(payload);
        }
      });
    }
  }
}

export function attachWsServer(server: import('http').Server): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const path = request.url?.split('?')[0];
    if (path !== '/ws' && path !== '/ws/') {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
    let authenticated = false;
    let authTimeout: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      authTimeout = null;
      if (authenticated) return;
      ws.close(4401, 'Auth required');
    }, AUTH_TIMEOUT_MS);

    const clearAuthTimeout = (): void => {
      if (authTimeout) {
        clearTimeout(authTimeout);
        authTimeout = null;
      }
    };

    const tryAuth = async (token: string | undefined): Promise<void> => {
      if (authenticated) return;
      const user = await getUserFromToken(token);
      if (user) {
        authenticated = true;
        clearAuthTimeout();
        join(ws, user.id);
        ws.send(JSON.stringify({ type: 'auth_ok', userId: user.id }));
      } else {
        ws.send(JSON.stringify({ type: 'auth_error' }));
        ws.close(4401, 'Unauthorized');
      }
    };

    ws.on('message', (data: Buffer) => {
      if (data.length > MAX_MESSAGE_SIZE) {
        ws.close(4400, 'Message too large');
        return;
      }
      if (authenticated) return;
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'auth' && typeof msg.token === 'string') {
          tryAuth(msg.token);
        }
      } catch {
        // ignore non-JSON or invalid
      }
    });

    ws.on('close', () => {
      clearAuthTimeout();
      leave(ws);
    });
  });
}
