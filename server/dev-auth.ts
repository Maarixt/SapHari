import * as express from 'express';
import * as cors from 'cors';
import * as cookieParser from 'cookie-parser';

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));

// quick logger so 500s aren't silent
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// pretend secure store
const MASTER_EMAIL = 'omarifrancis846@gmail.com';
const MASTER_PASS  = 'dev-master-pass';

app.post('/api/master/login', (req, res) => {
  const { email, password, totp } = req.body ?? {};
  console.log('login body:', req.body);

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }
  if (email !== MASTER_EMAIL || password !== MASTER_PASS) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Optional: treat TOTP as string; do NOT parseInt
  if (typeof totp !== 'undefined' && String(totp).length && String(totp).length !== 6) {
    return res.status(400).json({ error: 'Invalid OTP length' });
  }

  res.cookie('sap_master', 'dev-session', {
    httpOnly: true,
    sameSite: 'lax',
    secure: false, // set true in prod HTTPS
    path: '/',
    maxAge: 1000 * 60 * 60 * 4,
  });

  return res.json({ ok: true });
});

app.get('/api/master/verify', (req, res) => {
  const token = req.cookies?.sap_master;
  if (!token) return res.status(401).json({ error: 'No session' });
  return res.json({ ok: true, role: 'master' });
});

// final error handler - ALWAYS JSON
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('Unhandled:', err);
  res.status(500).json({ error: err?.message || 'Server error' });
});

const port = 3001;
app.listen(port, () => console.log('Dev Auth API on :'+port));


