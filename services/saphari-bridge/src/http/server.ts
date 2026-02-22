import express, { Express } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { healthRouter } from './routes/health';
import { postToggle, postServo } from './routes/cmd';

export function createApp(): Express {
  const app = express();

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (config.server.allowedOrigins.includes(origin)) return cb(null, true);
        cb(null, false);
      },
    })
  );
  app.use(express.json({ limit: '8kb' }));

  const cmdLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { error: 'Too many requests' },
    keyGenerator: (req) => {
      const auth = req.headers.authorization;
      return auth ?? req.ip ?? 'anonymous';
    },
  });

  app.get('/health', healthRouter);
  app.post('/api/cmd/toggle', cmdLimiter, (req, res) => postToggle(req, res));
  app.post('/api/cmd/servo', cmdLimiter, (req, res) => postServo(req, res));

  return app;
}
