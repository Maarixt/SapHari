/**
 * Supabase admin client and JWT verification for bridge auth.
 * Uses token cache to avoid excessive Supabase calls.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import * as tokenCache from './tokenCache';

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: { persistSession: false },
    });
  }
  return adminClient;
}

export interface AuthUser {
  id: string;
  email?: string;
}

function getExpFromToken(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

/**
 * Verify Supabase JWT and return user id.
 * Checks token cache first; on miss calls Supabase and caches result.
 */
export async function getUserFromToken(token: string | undefined): Promise<AuthUser | null> {
  if (!token?.trim()) return null;
  const trimmed = token.trim();
  const cached = tokenCache.get(trimmed);
  if (cached) return { id: cached };
  const supabase = getSupabaseAdmin();
  const { data: { user }, error } = await supabase.auth.getUser(trimmed);
  if (error || !user) return null;
  const exp = getExpFromToken(trimmed) ?? Math.floor(Date.now() / 1000) + 3600;
  tokenCache.set(trimmed, user.id, exp);
  return { id: user.id, email: user.email };
}
