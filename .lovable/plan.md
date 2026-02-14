
# Plan: MQTT Reconnect Loop Fix and Post-Key-Reset Audit

## Root Cause Analysis

The console logs show a clear pattern: **connect -> subscribe -> connection closed -> reconnect** repeating every 1-2 seconds. The edge function (`mqtt-credentials`) is working correctly -- it successfully issues credentials each time. The problem is that **EMQX Cloud is rejecting the connection immediately after it's established**.

Two issues identified:

1. **MQTT dashboard credentials are likely stale on EMQX.** The secrets `MQTT_DASHBOARD_USERNAME` and `MQTT_DASHBOARD_PASSWORD` stored in Supabase are being sent to EMQX, but EMQX Cloud may have had its credentials changed or the account may be misconfigured. The browser connects (TCP handshake succeeds over WSS), EMQX briefly accepts, then closes the connection -- classic "bad credentials" behavior on EMQX Cloud Serverless.

2. **`verify_jwt = true` on two edge functions will break after JWT key reset.** `mqtt-credentials` and `device-command` both have `verify_jwt = true` in `config.toml`. After resetting JWT signing keys in Supabase, the old verification path may fail. The fix is to set `verify_jwt = false` and validate auth in code (which both functions already do via `getUser()`).

3. **`gen_random_bytes` error** (visible in screenshot 1) -- pgcrypto extension IS enabled, so this error is likely from a function/trigger that runs in a context where it's not available. Needs investigation but is separate from the MQTT loop.

## Changes

### 1. Fix `verify_jwt` in `supabase/config.toml`

Set both `mqtt-credentials` and `device-command` to `verify_jwt = false`. Both functions already authenticate users in code via `getUser()`, so the gateway-level JWT check is redundant and breaks after key rotation.

```toml
[functions.device-command]
verify_jwt = false

[functions.mqtt-credentials]
verify_jwt = false
```

### 2. Stop the reconnect loop on auth rejection

The core bug: when EMQX closes the connection (bad credentials), the `close` event fires, which calls `scheduleReconnect()`, which fetches new (identical) credentials, connects again, and loops forever.

In `src/services/mqttConnectionService.ts`:

- Track consecutive connection failures
- After 3 rapid failures (within 30 seconds), stop reconnecting and set status to `error`
- Surface a clear message: "MQTT broker rejected credentials. Check EMQX configuration."
- Only resume reconnect on explicit user action or auth state change

### 3. Add connection failure detection in the `close` handler

Currently the `close` handler blindly calls `scheduleReconnect()`. Fix:

```typescript
// Track rapid failures
let consecutiveFailures = 0;
let lastConnectAttempt = 0;
const MAX_CONSECUTIVE_FAILURES = 3;
const FAILURE_WINDOW_MS = 30000;

client.on('connect', () => {
  consecutiveFailures = 0; // Reset on successful sustained connection
  // ... existing code
});

client.on('close', () => {
  const timeSinceLastAttempt = Date.now() - lastConnectAttempt;
  if (timeSinceLastAttempt < FAILURE_WINDOW_MS) {
    consecutiveFailures++;
  }
  
  if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    console.error('MQTT: Too many rapid failures, stopping reconnect');
    setStatus('error');
    return; // Don't schedule reconnect
  }
  
  if (!isManualDisconnect) {
    scheduleReconnect();
  }
});
```

### 4. Update CORS headers in edge functions

Add the missing CORS headers that Supabase's client SDK sends:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};
```

This applies to both `mqtt-credentials/index.ts` and `device-command/index.ts`.

### 5. Use `getClaims()` instead of `getUser()` in edge functions

After JWT key reset, `getUser()` makes a network call to Supabase Auth which is slower. `getClaims()` validates the JWT locally and is the recommended approach. Update both edge functions.

## What You Need To Do (Cannot Be Done By Code)

**CRITICAL**: The MQTT credentials stored in Supabase secrets (`MQTT_DASHBOARD_USERNAME` / `MQTT_DASHBOARD_PASSWORD`) must match what's configured in your EMQX Cloud dashboard. After the key reset, you need to:

1. Log into EMQX Cloud console
2. Go to Authentication > Password-Based
3. Verify the dashboard username/password are still valid
4. If not, create new credentials and update the Supabase secrets

Without this step, the reconnect loop will continue even after the code fix (the code fix just stops the infinite loop and surfaces the error clearly).

## Files to Modify

- `supabase/config.toml` -- fix `verify_jwt` for 2 functions
- `src/services/mqttConnectionService.ts` -- add consecutive failure detection, stop infinite reconnect loop
- `supabase/functions/mqtt-credentials/index.ts` -- update CORS headers, use `getClaims()`
- `supabase/functions/device-command/index.ts` -- update CORS headers, use `getClaims()`

## Inventory Table

| Secret/Key | Where Used | Status |
|---|---|---|
| `SUPABASE_URL` | Edge functions (auto-injected) | OK |
| `SUPABASE_ANON_KEY` | Edge functions (auto-injected) | OK (updated) |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge functions (auto-injected) | OK (auto-rotated with project) |
| `MQTT_DASHBOARD_USERNAME` | mqtt-credentials edge fn | Set (needs EMQX verification) |
| `MQTT_DASHBOARD_PASSWORD` | mqtt-credentials edge fn | Set (needs EMQX verification) |
| `AUTH_COOKIE_SECRET` | master-login edge fn | Set |
| `MASTER_EMAIL` | master-login edge fn | Set |
| `MASTER_PASSWORD` | master-login edge fn | Set |
| `VITE_SUPABASE_URL` | Frontend .env | OK |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend .env + client.ts | OK (updated) |
| `VITE_SUPABASE_ANON_KEY` | Frontend .env alias | OK (updated) |

## How to Verify

1. Deploy changes, open browser console
2. Login -- should see "MQTT credentials cached for 1 devices"
3. If EMQX creds are valid: connection stays connected (no loop)
4. If EMQX creds are stale: connection fails 3 times then stops with clear error message
5. Fix EMQX creds in Supabase secrets if needed, then click reconnect
