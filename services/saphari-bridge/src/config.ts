/**
 * Bridge configuration from environment.
 * All credentials are server-side only.
 */

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required env: ${name}`);
  }
  return v;
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const config = {
  emqx: {
    url: requireEnv('EMQX_MQTT_URL'),
    username: requireEnv('EMQX_MQTT_USER'),
    password: requireEnv('EMQX_MQTT_PASS'),
  },
  supabase: {
    url: requireEnv('SUPABASE_URL'),
    serviceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  },
  server: {
    port: parseInt(optionalEnv('PORT', '3000'), 10),
    allowedOrigins: (optionalEnv('ALLOWED_ORIGINS', 'http://localhost:5173').split(',').map(o => o.trim())),
  },
} as const;
