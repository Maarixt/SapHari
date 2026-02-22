/**
 * Bridge WebSocket client: connect to /ws with NO token in URL.
 * First message after open MUST be { type: 'auth', token: '<supabase_access_token>' }.
 * Handles auth_ok / auth_error; surfaces status.
 */

export type BridgeStatus = 'connecting' | 'authenticating' | 'connected' | 'disconnected';

export interface BridgeMessage {
  topic: string;
  payload: string;
  ts: number;
}

type MessageCallback = (topic: string, payload: string, ts: number) => void;

export interface RealtimeBridgeClient {
  connect(wsUrl: string, httpUrl: string, getToken: () => Promise<string | null>): void;
  disconnect(): void;
  onMessage(cb: MessageCallback): () => void;
  onStatusChange(cb: (status: BridgeStatus) => void): () => void;
  getStatus(): BridgeStatus;
  sendToggleCommand(deviceId: string, addr: string, pin: number, state: 0 | 1, override?: boolean): Promise<{ ok: boolean; reqId?: string }>;
  sendServoCommand(deviceId: string, addr: string, pin: number, angle: number): Promise<{ ok: boolean; reqId?: string }>;
}

const WS_PATH = '/ws';

export function createRealtimeBridgeClient(): RealtimeBridgeClient {
  let ws: WebSocket | null = null;
  let httpBase = '';
  let getToken: () => Promise<string | null> = async () => null;
  let status: BridgeStatus = 'disconnected';
  let statusListeners: ((s: BridgeStatus) => void)[] = [];
  const messageCallbacks: MessageCallback[] = [];
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 10;
  const baseDelay = 1000;

  function setStatus(s: BridgeStatus): void {
    if (s === status) return;
    status = s;
    statusListeners.forEach((cb) => cb(s));
  }

  function notifyMessage(topic: string, payload: string, ts: number): void {
    messageCallbacks.forEach((cb) => {
      try {
        cb(topic, payload, ts);
      } catch (e) {
        console.error('Bridge message callback error:', e);
      }
    });
  }

  function connect(wsUrl: string, httpUrl: string, tokenGetter: () => Promise<string | null>): void {
    if (ws?.readyState === WebSocket.OPEN) return;
    getToken = tokenGetter;
    httpBase = httpUrl.replace(/\/$/, '');
    const url = wsUrl.replace(/\/$/, '') + WS_PATH;
    setStatus('connecting');
    ws = new WebSocket(url);

    ws.onopen = async () => {
      setStatus('authenticating');
      try {
        const token = await getToken();
        if (!token || ws?.readyState !== WebSocket.OPEN) {
          ws?.close(4401, 'No token');
          return;
        }
        ws!.send(JSON.stringify({ type: 'auth', token }));
      } catch (e) {
        console.error('Bridge auth token error:', e);
        ws?.close(4401, 'Auth error');
      }
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string);
        if (data.type === 'auth_ok') {
          setStatus('connected');
          reconnectAttempts = 0;
          return;
        }
        if (data.type === 'auth_error') {
          setStatus('disconnected');
          ws?.close(4401, 'Unauthorized');
          return;
        }
        if (data.topic != null && data.payload != null) {
          notifyMessage(data.topic, data.payload, data.ts ?? Date.now());
        }
      } catch {
        // ignore non-JSON or malformed
      }
    };

    ws.onclose = (event: CloseEvent) => {
      ws = null;
      setStatus('disconnected');
      if (event.code !== 4401 && event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
        const delay = Math.min(baseDelay * 2 ** reconnectAttempts, 30000);
        reconnectAttempts++;
        setTimeout(() => connect(wsUrl, httpUrl, getToken), delay);
      }
    };

    ws.onerror = () => {
      setStatus('disconnected');
    };
  }

  function disconnect(): void {
    reconnectAttempts = maxReconnectAttempts;
    if (ws) {
      ws.close(1000);
      ws = null;
    }
    setStatus('disconnected');
  }

  function onMessage(cb: MessageCallback): () => void {
    messageCallbacks.push(cb);
    return () => {
      const i = messageCallbacks.indexOf(cb);
      if (i !== -1) messageCallbacks.splice(i, 1);
    };
  }

  function getStatusValue(): BridgeStatus {
    return status;
  }

  function onStatusChange(cb: (status: BridgeStatus) => void): () => void {
    statusListeners.push(cb);
    return () => {
      const i = statusListeners.indexOf(cb);
      if (i !== -1) statusListeners.splice(i, 1);
    };
  }

  async function sendToggleCommand(
    deviceId: string,
    addr: string,
    pin: number,
    state: 0 | 1,
    override = false
  ): Promise<{ ok: boolean; reqId?: string }> {
    const token = await getToken();
    if (!token) return { ok: false };
    const res = await fetch(`${httpBase}/api/cmd/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ deviceId, addr, pin, state, override }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; reqId?: string; error?: string };
    return { ok: res.ok && !!data.ok, reqId: data.reqId };
  }

  async function sendServoCommand(
    deviceId: string,
    addr: string,
    pin: number,
    angle: number
  ): Promise<{ ok: boolean; reqId?: string }> {
    const token = await getToken();
    if (!token) return { ok: false };
    const res = await fetch(`${httpBase}/api/cmd/servo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ deviceId, addr, pin, angle }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; reqId?: string };
    return { ok: res.ok && !!data.ok, reqId: data.reqId };
  }

  return {
    connect,
    disconnect,
    onMessage,
    onStatusChange,
    getStatus: getStatusValue,
    sendToggleCommand,
    sendServoCommand,
  };
}

let defaultClient: RealtimeBridgeClient | null = null;

export function getDefaultBridgeClient(): RealtimeBridgeClient {
  if (!defaultClient) defaultClient = createRealtimeBridgeClient();
  return defaultClient;
}
