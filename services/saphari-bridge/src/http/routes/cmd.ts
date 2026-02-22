import { Request, Response } from 'express';
import { getUserFromToken } from '../../auth/supabase';
import { canAccess } from '../../authz/deviceAccess';
import { publish } from '../../mqtt/client';
import { cmdTopic } from '../../mqtt/topics';
import { randomUUID } from 'crypto';

const toggleSchema = {
  deviceId: (v: unknown) => typeof v === 'string' && v.length > 0,
  addr: (v: unknown) => typeof v === 'string',
  pin: (v: unknown) => typeof v === 'number' && v >= 0 && v <= 39,
  state: (v: unknown) => v === 0 || v === 1,
  override: (v: unknown) => v === undefined || typeof v === 'boolean',
};

export async function postToggle(req: Request, res: Response): Promise<void> {
  const rawToken = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim();
  const user = await getUserFromToken(rawToken);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const deviceId = body.deviceId;
  const addr = body.addr ?? '';
  const pin = body.pin;
  const state = body.state;
  const override = body.override ?? false;

  if (
    !toggleSchema.deviceId(deviceId) ||
    !toggleSchema.addr(addr) ||
    !toggleSchema.pin(pin) ||
    !toggleSchema.state(state) ||
    !toggleSchema.override(override)
  ) {
    res.status(400).json({ error: 'Invalid body: deviceId, addr, pin (0-39), state (0|1) required' });
    return;
  }

  const allowed = await canAccess(user.id, deviceId as string);
  if (!allowed) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const reqId = randomUUID();
  const topic = cmdTopic(deviceId as string, 'toggle');
  const payload = JSON.stringify({ addr, pin, state, override, reqId });

  try {
    await publish(topic, payload);
    res.status(200).json({ ok: true, reqId });
  } catch (err) {
    console.error('Publish error:', err);
    res.status(503).json({ error: 'Publish failed' });
  }
}

const servoSchema = {
  deviceId: (v: unknown) => typeof v === 'string' && v.length > 0,
  addr: (v: unknown) => typeof v === 'string',
  pin: (v: unknown) => typeof v === 'number' && v >= 0 && v <= 39,
  angle: (v: unknown) => typeof v === 'number' && v >= 0 && v <= 180,
};

export async function postServo(req: Request, res: Response): Promise<void> {
  const rawToken = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim();
  const user = await getUserFromToken(rawToken);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const deviceId = body.deviceId;
  const addr = body.addr ?? '';
  const pin = body.pin;
  const angle = body.angle;

  if (
    !servoSchema.deviceId(deviceId) ||
    !servoSchema.addr(addr) ||
    !servoSchema.pin(pin) ||
    !servoSchema.angle(angle)
  ) {
    res.status(400).json({ error: 'Invalid body: deviceId, addr, pin (0-39), angle (0-180) required' });
    return;
  }

  const allowed = await canAccess(user.id, deviceId as string);
  if (!allowed) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const topic = cmdTopic(deviceId as string, 'servo');
  const payload = JSON.stringify({ addr, pin, angle });

  try {
    await publish(topic, payload);
    res.status(200).json({ ok: true, reqId: randomUUID() });
  } catch (err) {
    console.error('Publish error:', err);
    res.status(503).json({ error: 'Publish failed' });
  }
}
