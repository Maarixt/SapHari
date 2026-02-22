/**
 * Resolve deviceId (MQTT) -> allowed user IDs (owner + device_permissions).
 * TTL cache 45s; in-flight de-dup so concurrent requests for same device share one query.
 */

import { getSupabaseAdmin } from '../auth/supabase';

const CACHE_TTL_MS = 45_000;
const cache = new Map<string, { userIds: Set<string>; expiresAt: number }>();
const inFlight = new Map<string, Promise<string[]>>();

export async function getAuthorizedUserIds(deviceId: string): Promise<string[]> {
  const cached = cache.get(deviceId);
  if (cached && Date.now() < cached.expiresAt) {
    return Array.from(cached.userIds);
  }

  const existing = inFlight.get(deviceId);
  if (existing) {
    const list = await existing;
    return list;
  }

  const promise = fetchDeviceUserIds(deviceId);
  inFlight.set(deviceId, promise);
  try {
    const list = await promise;
    return list;
  } finally {
    inFlight.delete(deviceId);
  }
}

async function fetchDeviceUserIds(deviceId: string): Promise<string[]> {
  const supabase = getSupabaseAdmin();

  const { data: device, error: devErr } = await supabase
    .from('devices')
    .select('id, user_id')
    .eq('device_id', deviceId)
    .single();

  const userIds = new Set<string>();

  if (devErr || !device) {
    cache.set(deviceId, { userIds, expiresAt: Date.now() + CACHE_TTL_MS });
    return [];
  }

  userIds.add(device.user_id);

  const { data: perms } = await supabase
    .from('device_permissions')
    .select('user_id')
    .eq('device_id', device.id);

  if (perms) {
    perms.forEach((p) => userIds.add(p.user_id));
  }

  const list = Array.from(userIds);
  cache.set(deviceId, { userIds, expiresAt: Date.now() + CACHE_TTL_MS });
  return list;
}

export async function canAccess(userId: string, deviceId: string): Promise<boolean> {
  const ids = await getAuthorizedUserIds(deviceId);
  return ids.includes(userId);
}

export function invalidateDeviceCache(deviceId: string): void {
  cache.delete(deviceId);
}
