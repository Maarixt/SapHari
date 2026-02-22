import { Request, Response } from 'express';
import { getMqttClient } from '../../mqtt/client';
import { getWsClientsCount } from '../../ws/server';

export function healthRouter(_req: Request, res: Response): void {
  const mqttConnected = getMqttClient()?.connected ?? false;
  res.status(200).json({
    ok: true,
    mqttConnected,
    wsClientsCount: getWsClientsCount(),
    ts: Date.now(),
  });
}
