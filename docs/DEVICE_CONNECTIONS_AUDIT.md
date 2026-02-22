# SapHari Device Connections Audit

**ESP32 ↔ EMQX ↔ SapHari ↔ Dashboard — Current Architecture (Read/Explain Only)**

---

## A) Repo Map (Connection-Related Only)

### 1) Device creation and credential generation

- **supabase/migrations/20260214203410_16a7def0-bec7-4b9f-b37e-95ec76b3a837.sql** — `create_device(_device_id, _name, _user_id)` SECURITY DEFINER; generates `device_key` via `gen_random_bytes(16)` hex; inserts into `devices` (device_id, device_key, name, user_id). Does not set `org_id`.
- **src/components/devices/AddDeviceDialog.tsx** — UI for adding device; calls `supabase.rpc('create_device', { _device_id, _name, _user_id })`. Client generates display-only `deviceId` (`saph-${random}`) and `deviceKey`; server ignores client key and generates its own. Device ID is user-facing / client-generated for the form; server uses it as `device_id` in DB.
- **src/components/devices/DeviceCredentialsDialog.tsx** — Shows device key via `get_device_key_once(p_device_id)` (returns key only within 5 min of creation) and `rotate_device_key(p_device_id)`.
- **supabase/migrations/20251020152240_3f29082f-d86f-4883-93d8-2e16c1b1370c.sql** — `get_device_key_once`, `rotate_device_key` SECURITY DEFINER; read/rotate from `devices.device_key`.

### 2) EMQX user/permission provisioning

- **None in repo.** No code creates EMQX users or ACLs. Docs and UI assume manual setup in EMQX Cloud (e.g. [src/pages/docs/MQTTSetup.tsx](src/pages/docs/MQTTSetup.tsx) L225–303: "Configure these rules in your EMQX Cloud dashboard", "Create credentials in EMQX Cloud dashboard").
- **supabase/functions/mqtt-credentials/index.ts** — Returns **dashboard** credentials only (single shared username/password from Supabase secrets `MQTT_DASHBOARD_USERNAME`, `MQTT_DASHBOARD_PASSWORD`). Does not create per-device EMQX users.

### 3) MQTT topic construction

- **src/lib/mqttTopics.ts** — Defines `devices/${deviceId}/status`, `devices/${deviceId}/state`, `devices/${deviceId}/cmd`, `devices/${deviceId}/ack`, `devices/${deviceId}/event`. **Not used by live dashboard subscription flow** (dashboard uses `saphari/` prefix).
- **src/services/mqttGate.ts** — `buildAuthorizedSubscriptions()` returns `saphari/${deviceId}/status/online`, `saphari/${deviceId}/gpio/#`, `saphari/${deviceId}/sensor/#`, `saphari/${deviceId}/gauge/#`, `saphari/${deviceId}/state`, `saphari/${deviceId}/ack`, `saphari/${deviceId}/heartbeat`.
- **supabase/functions/mqtt-credentials/index.ts** — Same topic list (L114–122): `saphari/${deviceId}/status`, `saphari/${deviceId}/status/online`, `saphari/${deviceId}/gpio/#`, etc.
- **src/services/commandService.ts** — Publishes to `saphari/${deviceId}/cmd/toggle`.
- **supabase/functions/device-command/index.ts** — Returns `topic: saphari/${device.device_id}/cmd/${command}` (e.g. `cmd/toggle`); not invoked from frontend.
- **Firmware:** Multiple schemes: `main.cpp` uses `devices/DEVICE_ID/...`; `main_resilient.cpp` / `main_dns_safe.cpp` use `saphari/DEVICE_ID/...` (e.g. `saphari/DEVICE_ID/status`); `main_secure.cpp` uses `saphari/TENANT_ID/devices/DEVICE_ID/...`.

### 4) Command publish logic (dashboard → device)

- **src/services/commandService.ts** — `sendToggleCommand(publishFn, deviceId, addr, pin, state, override)` builds JSON payload, publishes to `saphari/${deviceId}/cmd/toggle` via `publishFn` (no retain). Waits for GPIO confirmation on `saphari/${deviceId}/gpio/${pin}`.
- **src/components/widgets/SwitchWidget.tsx** — Uses `sendToggleCommand(publishMessage, device.device_id, ...)` (working path).
- **src/state/commandTracker.ts** — `toggleGpio()` calls `sendCommand(deviceId, cmd)` from `@/services/mqtt`.
- **src/services/mqtt.ts** — `sendCommand()` and `sendReliableCommand()` are stubbed: always return failure ("temporarily disabled"). So any UI using CommandTracker (e.g. **GpioSwitch**) never sends commands successfully.
- **supabase/functions/device-command/index.ts** — Validates user, loads `device_key`, builds HMAC-signed payload, returns `{ ok, topic, payload, reqId }`. **Not called by frontend**; dashboard publishes raw JSON to MQTT instead.

### 5) Telemetry/state ingest (device → dashboard)

- **src/hooks/useMQTT.tsx** — `handleIncomingMessage(topic, message)`: parses `saphari/` topics; `parts[1]` = deviceId, `parts[2]` = channel. Handles `status/online` → presence, `gpio` → DeviceStore.upsertState + handleGpioConfirmation, `state`/`sensor` → DeviceStore.upsertState, `heartbeat` → recordDeviceActivity.
- **src/services/presenceService.ts** — `handlePresenceUpdate(deviceId, status)`, `recordDeviceActivity(deviceId)`; updates DeviceStore and DB (`devices.online`, `devices.last_seen`, `device_presence_events`).
- **src/services/mqttConnectionService.ts** — Subscribes to topics from `buildAuthorizedSubscriptions()`; forwards all messages to registered callbacks (useMQTT registers handleIncomingMessage).
- **src/state/deviceStore.ts** — In-memory device snapshots (online, gpio, sensors, lastSeen); `upsertState`, `setOnline`; cleared on logout.
- **src/stores/deviceStateStore.ts** — Alternative store used by DeviceMQTTService / device-authoritative types; listens for `devices/+/status` etc. (topic shape does not match actual `saphari/` subscriptions), so effectively unused for current saphari/* flow.
- **src/services/deviceMQTT.ts** — Subscribes to `devices/+/status`, `devices/+/state`, `devices/+/ack`, `devices/+/event` and uses `parseTopic()` from mqttTopics (expects `devices` prefix). **Mismatch:** real subscriptions are `saphari/<id>/...`, so this service never sees messages.

### 6) Online/offline presence (LWT, heartbeat, retained)

- **src/services/presenceService.ts** — Expects topic `saphari/<deviceId>/status/online` with payload "online" or "offline". TTL fallback: 45s no activity → mark offline; writes to `devices.online` and `device_presence_events`.
- **src/hooks/useMQTT.tsx** — Presence: `channel === 'status' && parts[3] === 'online'` → handlePresenceUpdate. Heartbeat: `channel === 'heartbeat'` → recordDeviceActivity.
- **Firmware:** `main_resilient.cpp` — LWT on `buildTopic("status")` = `saphari/DEVICE_ID/status`, payload "offline" (retained). Publishes "online" retained to same topic. **Mismatch:** dashboard subscribes to `saphari/<id>/status/online` (four segments), not `saphari/<id>/status` (three). So presence from main_resilient would not be seen by dashboard. `main_dns_safe.cpp` uses `topic("status")` = `saphari/DEVICE_ID/status` (same issue). SnippetGenerator/CodeSnippetDialog use `saphari/DEVICE_ID/status/online` (correct for dashboard).
- **docs and snippets:** LWT and retained usage documented; firmware variants inconsistent (status vs status/online).

### 7) Frontend realtime subscriptions and UI state

- **src/services/mqttConnectionService.ts** — Connects with credentials from mqtt-credentials edge function; on connect subscribes to `buildAuthorizedSubscriptions()` (saphari/<deviceId>/...). Message handler notifies callbacks; no direct state update here.
- **src/hooks/useMQTT.tsx** — MQTTProvider: fetches authorized devices, connects, registers handleIncomingMessage; passes `publishMessage`, `subscribeToTopic`, `onMessage` to children. Status/credentials in state.
- **src/services/mqttGate.ts** — Ensures MQTT only connects when authenticated and `devices_safe` fetch has run; subscription list is per-user device list only (no wildcards across users).
- **src/state/deviceStore.ts** — DeviceSnapshot per deviceId; subscribed by GpioSwitch, SwitchWidget, DevicePresence, etc.; cleared on logout.
- **src/hooks/useDevicePresence.tsx** — Reads from DeviceStore for online state.
- **src/components/widgets/DevicePresence.tsx** — Displays online/offline from DeviceStore.
- **src/components/widgets/SwitchWidget.tsx** — Sends toggle via commandService; subscribes to DeviceStore for state.
- **src/components/widgets/GpioSwitch.tsx** — Uses CommandTracker.toggleGpio → mqtt.sendCommand (disabled); always fails.

---

## B) Current Flow Diagram (Text)

```
User creates org (optional) → Onboarding create_organization_with_owner
    ↓
User adds device: AddDeviceDialog → create_device(_device_id, _name, _user_id)
    → Server: gen_random_bytes(16) → device_key, INSERT devices (device_id, device_key, name, user_id)
    → device_id from client (e.g. saph-xxxxxx); org_id NOT set
    ↓
User flashes ESP32 with DEVICE_ID (+ optionally device_key for auth). Firmware topic choice:
    - main.cpp: devices/DEVICE_ID/status, state, cmd, ack  (dashboard does NOT subscribe)
    - main_resilient / main_dns_safe: saphari/DEVICE_ID/status, state, gpio/N, cmd/#  (status topic missing /online)
    - SnippetGenerator/CodeSnippetDialog: saphari/DEVICE_ID/status/online, gpio/N, cmd/toggle  (matches dashboard)
    ↓
Dashboard: Auth → fetchAuthorizedDevices (devices_safe by user_id) → mqtt-credentials Edge Function
    → Returns: wss_url, username/password from Supabase secrets (shared dashboard creds), allowed_topics = [ saphari/<deviceId>/status/online, gpio/#, ... ] per user's devices
    → mqttConnectionService connects, subscribes to those topics only
    ↓
Device connects to EMQX (broker from platform_broker_config or env). No per-device user in SapHari code; EMQX users assumed manual or shared.
    ↓
Device publishes (e.g. retained):
    - saphari/DEVICE_ID/status/online = "online" (and LWT "offline")  → if firmware uses status/online
    - saphari/DEVICE_ID/gpio/<pin> = "0"|"1"
    - saphari/DEVICE_ID/state or sensor/... = JSON
    - saphari/DEVICE_ID/heartbeat = JSON (optional)
    ↓
Dashboard onMessage: handleIncomingMessage → deviceId = parts[1], channel = parts[2]
    - status/online → handlePresenceUpdate → DeviceStore.setOnline, update devices table, device_presence_events
    - gpio → DeviceStore.upsertState, handleGpioConfirmation (commandService)
    - state/sensor → DeviceStore.upsertState
    - heartbeat → recordDeviceActivity
    ↓
User toggles switch: SwitchWidget → sendToggleCommand(publishMessage, deviceId, ...)
    → Publish saphari/<deviceId>/cmd/toggle with JSON { addr, pin, state, override }
    → Device (if subscribed to cmd/#) receives, sets GPIO, publishes to saphari/<deviceId>/gpio/<pin>
    → Dashboard receives gpio message → handleGpioConfirmation, DeviceStore update → UI
```

**Actual topic strings (from code):**

- Presence: `saphari/<deviceId>/status/online` — payload `"online"` or `"offline"` (retained + LWT in docs).
- GPIO: `saphari/<deviceId>/gpio/<pin>` — payload `"0"` or `"1"` (retained in snippets).
- Commands: `saphari/<deviceId>/cmd/toggle` (and cmd/servo, etc.) — JSON.
- State: `saphari/<deviceId>/state` — JSON.
- Ack: `saphari/<deviceId>/ack` — JSON.
- Heartbeat: `saphari/<deviceId>/heartbeat`.

---

## C) Credential Handling Audit

- **DEVICE_ID generated:** Client-side in [AddDeviceDialog.tsx](src/components/devices/AddDeviceDialog.tsx) L24: `generateDeviceId()` = `saph-${Math.random().toString(36).slice(2, 8)}`. Sent to `create_device`; stored as `devices.device_id`. No server-side generation of device_id.
- **DEVICE_KEY generated:** Server-side only in [20260214203410](supabase/migrations/20260214203410_16a7def0-bec7-4b9f-b37e-95ec76b3a837.sql): `encode(extensions.gen_random_bytes(16), 'hex')` inside `create_device`. Stored in `devices.device_key` (plaintext column). Not exposed in `devices_safe` view; exposed once via `get_device_key_once` within 5 minutes of creation, or via `rotate_device_key`.
- **Storage:** `device_key` is plaintext in `devices` table. RLS and SECURITY DEFINER restrict who can read it. Dashboard uses `devices_safe` (no key). Edge function `device-command` reads `device_key` with service role to sign commands (but no frontend calls it).
- **EMQX:** No SapHari code creates EMQX users. [mqtt-credentials](supabase/functions/mqtt-credentials/index.ts) returns a single dashboard username/password from Supabase secrets (`MQTT_DASHBOARD_USERNAME`, `MQTT_DASHBOARD_PASSWORD`). Device-side auth (if any) is manual in EMQX Cloud or firmware config.
- **Hard-coded / env:** [mqtt.ts](src/services/mqtt.ts) L86: `wss://broker.emqx.io:8084/mqtt` and placeholder JWT (legacy path; main connection uses mqttConnectionService + edge function). Broker URL for production comes from `platform_broker_config` (DB) via mqtt-credentials. Migrations [20251213110715](supabase/migrations/20251213110715_f8470fd3-56af-4c2b-871d-a999933ef611.sql) set `tcp_host` to `z110b082.ala.us-east-1.emqxsl.com` (EMQX Cloud). Dashboard credentials in Supabase secrets, not in DB (per migration 20251214193908 comment).

---

## D) MQTT Semantics Audit

- **Retained:** Docs and SnippetGenerator use retained for status/online and gpio state. Firmware `main_resilient` publishes status and state with retain. Dashboard does not require retained for parsing.
- **LWT:** Firmware variants set LWT topic to `saphari/DEVICE_ID/status` or `saphari/DEVICE_ID/status/online` and payload "offline". main_resilient uses `buildTopic("status")` = `saphari/DEVICE_ID/status` (three segments); dashboard expects `status/online` (four segments) — **mismatch** for that firmware.
- **Reconnect:** mqttConnectionService has exponential backoff; firmware has reconnect logic (e.g. main_resilient).
- **Wildcards:** Dashboard does not use wildcards across devices; it subscribes to explicit `saphari/<deviceId>/...` per authorized device. mqttGate.buildAuthorizedSubscriptions() builds exact list.
- **Topic naming:** In use: `saphari/<deviceId>/<channel>/...` (e.g. status/online, gpio/2, cmd/toggle). No org or tenant in topic. mqttTopics.ts uses `devices/<id>/...` — legacy/unused for current path.
- **Problems:** (1) Topic inconsistency: mqttTopics + deviceMQTT use `devices/`; live path uses `saphari/`. (2) Firmware status topic: some firmware uses `saphari/ID/status`, dashboard expects `saphari/ID/status/online`. (3) No org scoping: any device_id globally unique per broker; no org in topic. (4) Shared dashboard credentials: all dashboards share one EMQX user; ACL must be enforced by topic list (edge function returns allowed_topics per user). (5) device-command (HMAC) unused: commands sent as plain JSON from dashboard.

---

## E) Multi-Tenant Model (Organizations)

- **Tables:** `organizations` (id, name, type, owner_user_id), `organization_members` (org_id, user_id, role). `devices` has `org_id` (nullable) and `user_id`. [create_device](supabase/migrations/20260214203410_16a7def0-bec7-4b9f-b37e-95ec76b3a837.sql) does not set `org_id`; new devices have `org_id = NULL`.
- **Scoping:** Devices are tied to `user_id`. RLS and mqttGate use `user_id` (devices_safe by user_id). Org membership used for device_permissions, widget_permissions, get_device_access (when device has org_id). Devices without org_id are user-owned only.
- **Topic structure:** No org in MQTT topics; structure is `saphari/<deviceId>/...`. Isolation is by “authorized device list” (user’s devices), not by org or site in the topic.
- **Missing for multi-site:** No `sites` or `locations` table; no topic hierarchy like `saphari/<org>/<site>/<device>/...`. Org exists for membership and permissions but not for MQTT namespace.

---

## F) What’s Broken / Risky (Ranked)

1. **GpioSwitch / CommandTracker path broken** — CommandTracker calls [mqtt.sendCommand](src/services/mqtt.ts) which is stubbed and always returns failure. Any UI using GpioSwitch never sends commands. (SwitchWidget uses commandService.sendToggleCommand and works.)
2. **Firmware status topic mismatch** — main_resilient and main_dns_safe publish to `saphari/DEVICE_ID/status`; dashboard subscribes to `saphari/DEVICE_ID/status/online`. Presence from those firmware builds never reaches dashboard.
3. **device-command edge function unused** — HMAC-signed commands are implemented but no client calls the function; dashboard publishes plain JSON. Device-side verification of signature not leveraged.
4. **Legacy mqtt.ts and deviceMQTT topic mismatch** — mqtt.ts uses tenant and `saphari/${tenantId}/devices/+/...`; deviceMQTT subscribes to `devices/+/...`. Real subscriptions are saphari/<deviceId>/... from mqttConnectionService. Dead or conflicting code paths.
5. **No per-device EMQX auth** — Devices likely share broker auth or manual EMQX users. Device_key in DB is for HMAC (unused); no automatic EMQX user/ACL provisioning. Risk: device credentials or topic ACLs misconfigured manually.
6. **Shared dashboard credentials** — One dashboard user/password for all users; scope is enforced by topic list from edge function. If broker ACL is per-connection and not enforced, a compromised dashboard credential could subscribe to all topics.
7. **Org not in device creation** — create_device does not set org_id; devices are user-only. Org-based device grouping and permissions exist in RLS but new devices don’t get org_id.
8. **presenceService updates devices table** — Browser updates `devices.online` and `last_seen`; RLS must allow update by user. [20251213163051](supabase/migrations/20251213163051_08f7a20b-0b69-4a1b-be42-3e0b5821f0ae.sql) and similar policies apply; confirm update policy allows owner (and optionally org members) to update these columns.
9. **device_presence_events insert** — presenceService inserts with device_id (text). Policy device_presence_events_insert_own requires EXISTS on devices by device_id and user_id; device_presence_events_insert_service allows INSERT with CHECK (true). Dashboard runs as user so uses “own”; service role could be used by edge function — clarify which context writes.
10. **Duplicate/confusing device key in AddDeviceDialog** — Form shows and requires deviceKey; RPC ignores it. Confusing; key is only available after create via get_device_key_once or DeviceCredentialsDialog.

---

## G) Improvement Options (No Implementation)

**1) Minimal (fix presence + command path)**  
- Align firmware with dashboard: use `saphari/<id>/status/online` for LWT and online, retained.  
- Replace or fix CommandTracker path: either use sendToggleCommand (like SwitchWidget) or re-enable sendCommand in mqtt.ts and have it publish to saphari/<id>/cmd/toggle.  
- Unify topic helpers: deprecate `devices/` in mqttTopics and deviceMQTT or map them to saphari/<id>/... so one topic contract exists.  
- Impact: Presence works for all firmware variants; GpioSwitch (or equivalent) works; less confusion.

**2) Better (SapHari-managed device secrets + optional EMQX auth)**  
- Keep device_key in DB; use it for HMAC in device-command and have dashboard call device-command for sensitive commands (or for all commands), then publish the signed payload.  
- Optionally: edge function or backend job that creates/updates EMQX users or ACL per device (e.g. username = device_id, password = hash(device_key)); document or automate EMQX Cloud API if available.  
- Impact: Stronger device-side verification; clearer path to per-device broker auth.

**3) Best (org/site/device hierarchy + provisioning)**  
- Add org_id (and optionally site_id) to create_device; topic pattern e.g. `saphari/<org_id>/<device_id>/...` or `saphari/<org_id>/<site>/<device_id>/...` for future multi-tenant isolation.  
- Provision EMQX users/ACL when device is created (or on first connect) so device credentials are managed by SapHari.  
- Rotate device_key and update broker auth on rotation.  
- Impact: Scalable multi-org/site; consistent credential and topic model.

---

## Next Fix Candidates (Top 10)

1. **Fix GpioSwitch/CommandTracker** — Use sendToggleCommand(publishMessage, ...) from commandService (like SwitchWidget) or re-enable and wire sendCommand in mqtt.ts to publish to `saphari/<deviceId>/cmd/toggle`.
2. **Unify firmware status topic** — Ensure all firmware and docs use `saphari/<DEVICE_ID>/status/online` for LWT and online (retained); update main_resilient and main_dns_safe to publish to status/online.
3. **Remove or align deviceMQTT / mqttTopics** — Either switch deviceMQTT to subscribe to saphari/ topics and parse accordingly, or remove its subscription logic and rely on useMQTT + handleIncomingMessage only.
4. **Document EMQX setup** — Single source of truth: dashboard credentials in secrets; device credentials (if any) manual or future API; required ACL rules for saphari/<device_id>/# per client.
5. **Optional: Wire device-command for signed commands** — Have dashboard call device-command for toggle (or all commands), then publish returned topic + payload; firmware verify HMAC.
6. **Set org_id on create_device** — If current org context exists, pass org_id into create_device and set it so new devices are org-scoped where applicable.
7. **Add device update RLS** — Confirm authenticated user (owner or org member with permission) can update devices.online and last_seen; presenceService runs as user.
8. **Clarify device_presence_events insert** — Ensure dashboard (user) can insert for own devices; policy device_presence_events_insert_own uses EXISTS (devices d WHERE d.device_id = ... AND d.user_id = auth.uid()).
9. **AddDeviceDialog** — Remove or relabel client-generated deviceKey field (server generates key); show “Key available in Device credentials after creation” and link to DeviceCredentialsDialog.
10. **Retire legacy mqtt.ts connect path** — App uses mqttConnectionService + mqtt-credentials; mqtt.ts connectMqtt() uses hardcoded broker and placeholder JWT. Remove or gate so only mqttConnectionService is used in production.

---

*Audit complete. No code changes were made; all findings are from reading the repository.*
