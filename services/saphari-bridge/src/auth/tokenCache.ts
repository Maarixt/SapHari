/**
 * In-memory token verification cache. Key = sha256(token), never store raw token.
 * TTL = min(60s, exp - now - 5s). Reduces Supabase auth.getUser calls.
 */

import { createHash } from 'crypto';

const CACHE_TTL_CAP_MS = 60_000;
const EXP_BUFFER_MS = 5_000;

interface Entry {
  userId: string;
  exp: number;
  cachedAt: number;
}

const cache = new Map<string, Entry>();

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function getTtlMs(exp: number): number {
  const now = Date.now();
  const expMs = exp * 1000;
  const ttl = Math.min(CACHE_TTL_CAP_MS, expMs - now - EXP_BUFFER_MS);
  return Math.max(0, ttl);
}

export function get(token: string): string | null {
  if (!token?.trim()) return null;
  const key = hashToken(token.trim());
  const entry = cache.get(key);
  if (!entry) return null;
  const ttl = getTtlMs(entry.exp);
  if (Date.now() >= entry.cachedAt + ttl) {
    cache.delete(key);
    return null;
  }
  return entry.userId;
}

export function set(token: string, userId: string, exp: number): void {
  if (!token?.trim()) return;
  const key = hashToken(token.trim());
  cache.set(key, {
    userId,
    exp,
    cachedAt: Date.now(),
  });
}
