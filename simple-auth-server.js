const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Dev credentials
const MASTER_EMAIL = 'omarifrancis846@gmail.com';
const MASTER_PASS = 'dev-master-pass';

app.post('/api/master/login', (req, res) => {
  const { email, password, totp } = req.body ?? {};
  console.log('🔐 Login attempt:', { email, password: password ? '***' : 'missing', totp });

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }
  if (email !== MASTER_EMAIL || password !== MASTER_PASS) {
    console.log('❌ Login failed: Invalid credentials');
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  console.log('✅ Login successful');
  res.cookie('sap_master', 'dev-session', {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 1000 * 60 * 60 * 4,
  });

  return res.json({ ok: true });
});

app.get('/api/master/verify', (req, res) => {
  const token = req.cookies?.sap_master;
  console.log('🔍 Verify attempt:', { hasToken: !!token });
  
  if (!token) {
    return res.status(401).json({ error: 'No session' });
  }
  
  console.log('✅ Verify successful');
  return res.json({ ok: true, role: 'master' });
});

app.use((err, _req, res, _next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({ error: err?.message || 'Server error' });
});

const port = 3001;
app.listen(port, () => {
  console.log(`🚀 Simple Auth Server running on port ${port}`);
  console.log(`📧 Master Email: ${MASTER_EMAIL}`);
  console.log(`🔑 Master Password: ${MASTER_PASS}`);
});



