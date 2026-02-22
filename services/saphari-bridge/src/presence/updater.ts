/**
 * Presence: in-memory state per device; flush to DB on timer; device_presence_events only on change.
 * Normalize outbound topic to saphari/<id>/status/online. TTL 45s -> offline.
 */

import { getSupabaseAdmin } from '../auth/supabase';
import { getAuthorizedUserIds } from '../authz/deviceAccess';

const LAST_SEEN_TTL_MS = 45_000;
const CHECK_INTERVAL_MS = 10_000;
const FLUSH_INTERVAL_MS = 10_000;
const FLUSH_MIN_AGE_MS = 10_000;

interface DeviceState {
  lastSeenMs: number;
  online: boolean;
  lastDbFlushMs: number;
}

const stateByDevice = new Map<string, DeviceState>();

export type BroadcastFn = (userIds: string[], payload: { topic: string; payload: string; ts: number }) => void;

let broadcastFn: BroadcastFn | null = null;

export function setPresenceBroadcast(fn: BroadcastFn): void {
  broadcastFn = fn;
}

function isStatusTopic(topic: string): boolean {
  if (!topic.startsWith('saphari/')) return false;
  const parts = topic.split('/');
  return parts[2] === 'status';
}

function isOnlinePayload(payload: string): boolean {
  const p = payload.toLowerCase().trim();
  return p === 'online' || p === '1' || p === 'true';
}

/** Normalized topic for clients */
export function normalizedStatusTopic(deviceId: string): string {
  return `saphari/${deviceId}/status/online`;
}

/** For broadcast: normalize status topics to saphari/<id>/status/online and payload to online/offline */
export function normalizeTopicPayload(
  deviceId: string,
  topic: string,
  payload: string
): { topic: string; payload: string } {
  if (!isStatusTopic(topic)) return { topic, payload };
  return {
    topic: normalizedStatusTopic(deviceId),
    payload: isOnlinePayload(payload) ? 'online' : 'offline',
  };
}

/**
 * Update in-memory presence only (no DB write). Called on every MQTT message.
 */
export function updatePresence(deviceId: string, topic: string, payload: string): void {
  const now = Date.now();
  let state = stateByDevice.get(deviceId);
  if (!state) {
    state = { lastSeenMs: now, online: false, lastDbFlushMs: 0 };
    stateByDevice.set(deviceId, state);
  }
  state.lastSeenMs = now;

  if (isStatusTopic(topic)) {
    const online = isOnlinePayload(payload);
    if (state.online !== online) {
      state.online = online;
      void writePresenceEventAndBroadcast(deviceId, online ? 'online' : 'offline', now);
    } else {
      state.online = true;
    }
  } else {
    if (!state.online) {
      state.online = true;
      void writePresenceEventAndBroadcast(deviceId, 'online', now);
    }
  }
}

async function writePresenceEventAndBroadcast(
  deviceId: string,
  status: 'online' | 'offline',
  ts: number
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('device_presence_events').insert({
    device_id: deviceId,
    status,
    source: 'bridge',
  });
  if (error) console.warn('Presence event insert:', error.message);
  const userIds = await getAuthorizedUserIds(deviceId);
  if (broadcastFn && userIds.length > 0) {
    broadcastFn(userIds, {
      topic: normalizedStatusTopic(deviceId),
      payload: status,
      ts,
    });
  }
}

/**
 * Flush devices.last_seen and devices.online to DB for devices not flushed recently.
 */
export async function runFlush(): Promise<void> {
  const now = Date.now();
  const flushCutoff = now - FLUSH_MIN_AGE_MS;
  const supabase = getSupabaseAdmin();

  for (const [deviceId, state] of stateByDevice.entries()) {
    if (state.lastDbFlushMs >= flushCutoff) continue;
    state.lastDbFlushMs = now;
    const { error } = await supabase
      .from('devices')
      .update({
        last_seen: new Date(state.lastSeenMs).toISOString(),
        online: state.online,
      })
      .eq('device_id', deviceId);
    if (error) console.warn('Presence flush devices:', error.message);
  }
}

export async function runTtlChecker(): Promise<void> {
  const now = Date.now();
  const cutoff = now - LAST_SEEN_TTL_MS;
  const supabase = getSupabaseAdmin();

  for (const [deviceId, state] of stateByDevice.entries()) {
    if (state.online && state.lastSeenMs < cutoff) {
      state.online = false;
      state.lastDbFlushMs = now;
      const { error } = await supabase
        .from('devices')
        .update({ online: false, last_seen: new Date(state.lastSeenMs).toISOString() })
        .eq('device_id', deviceId);
      if (error) console.warn('TTL offline update:', error.message);
      await writePresenceEventAndBroadcast(deviceId, 'offline', now);
    }
  }
}

export function recordActivity(deviceId: string): void {
  const state = stateByDevice.get(deviceId);
  if (state) state.lastSeenMs = Date.now();
}

let flushIntervalId: ReturnType<typeof setInterval> | null = null;
let ttlIntervalId: ReturnType<typeof setInterval> | null = null;

export function startTtlChecker(): void {
  if (flushIntervalId) return;
  flushIntervalId = setInterval(() => {
    runFlush().catch((e) => console.error('Presence flush:', e));
  }, FLUSH_INTERVAL_MS);
  ttlIntervalId = setInterval(() => {
    runTtlChecker().catch((e) => console.error('TTL checker:', e));
  }, CHECK_INTERVAL_MS);
}

export function stopTtlChecker(): void {
  if (flushIntervalId) {
    clearInterval(flushIntervalId);
    flushIntervalId = null;
  }
  if (ttlIntervalId) {
    clearInterval(ttlIntervalId);
    ttlIntervalId = null;
  }
}
