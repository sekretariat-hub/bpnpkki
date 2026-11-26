// Hash password (scrypt) dan sesi bertanda tangan HMAC dalam cookie HttpOnly.
const crypto = require('crypto');

const COOKIE = 'bpn_session';
const MAX_AGE = 60 * 60 * 8; // 8 jam

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET belum diset (min 32 karakter)');
  return s;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

function verifyPassword(password, stored) {
  try {
    const [alg, saltB64, keyB64] = String(stored || '').split('$');
    if (alg !== 'scrypt') return false;
    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(keyB64, 'base64');
    const key = crypto.scryptSync(password, salt, expected.length, { N: 16384, r: 8, p: 1 });
    return crypto.timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${mac}`;
}

function verify(token) {
  const [body, mac] = String(token || '').split('.');
  if (!body || !mac) return null;
  const good = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(mac);
  const b = Buffer.from(good);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const p = JSON.parse(Buffer.from(body, 'base64url').toString());
  return p.exp > Date.now() ? p : null;
}

function readCookie(req, name) {
  const m = (req.headers.cookie || '').split(/;\s*/).find((c) => c.startsWith(name + '='));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : null;
}

function getSession(req) {
  try {
    const p = verify(readCookie(req, COOKIE));
    // Jejak audit: setiap aksi tulis saat Super Admin memakai "Login sebagai" dicatat di log Vercel.
    if (p && p.as && req.method && req.method !== 'GET') console.log('LOGIN-SEBAGAI aksi', p.email, '->', p.as, req.method, String(req.url || '').split('?')[0], p.edit ? 'edit' : 'baca');
    return p;
  } catch {
    return null;
  }
}

function setSession(res, user) {
  const token = sign({ rid: user.rid, email: user.email, nama: user.nama, level: user.level, exp: Date.now() + MAX_AGE * 1000 });
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE}`);
}

// Ubah sesi yang sudah ada menjadi mode "Login sebagai" (as = id pengguna yang dilihat; null = kembali). Masa berlaku tidak diperpanjang.
function reissueSession(res, s, as, edit) {
  const p = { rid: s.rid, email: s.email, nama: s.nama, level: s.level, exp: s.exp };
  if (as) { p.as = as; p.edit = !!edit; }
  const left = Math.max(1, Math.floor((s.exp - Date.now()) / 1000));
  res.setHeader('Set-Cookie', `${COOKIE}=${sign(p)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${left}`);
}

function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
}

module.exports = { hashPassword, verifyPassword, getSession, setSession, reissueSession, clearSession, sign, verify };
