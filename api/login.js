const { fetchAll, update } = require('../lib/airtable');
const { verifyPassword, setSession } = require('../lib/auth');
const { T, F } = require('../lib/users');
const { waDigits } = require('../lib/phone');

// Pembatas percobaan login sederhana (per instance; cukup untuk meredam tebak-tebakan).
const attempts = new Map();
const WINDOW = 15 * 60 * 1000;
const MAX = 8;
const limited = (key) => { const now = Date.now(); const l = (attempts.get(key) || []).filter((t) => now - t < WINDOW); attempts.set(key, l); return l.length >= MAX; };
const fail = (key) => attempts.set(key, [...(attempts.get(key) || []), Date.now()]);

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' });
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const wa = waDigits(body.phone);
  const password = String(body.password || '');
  if (!wa || !password) return res.status(400).json({ error: 'Nomor WhatsApp dan password wajib diisi' });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const key = `${ip}|${wa}`;
  if (limited(key) || limited(ip)) return res.status(429).json({ error: 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.' });
  try {
    const rows = await fetchAll(T, Object.values(F), { filterByFormula: `{Whatsapp}='${wa}'`, maxRecords: '1' });
    const rec = rows[0], f = rec ? rec.fields : {};
    // Selalu jalankan verifikasi agar waktu respons tidak membocorkan apakah nomor terdaftar.
    const ok = verifyPassword(password, f[F.hash] || 'scrypt$AAAA$AAAA') && rec && f[F.aktif];
    if (!ok) { fail(key); fail(ip); return res.status(401).json({ error: 'Nomor atau password salah' }); }
    setSession(res, { rid: rec.id, email: String(f[F.email] || '').toLowerCase(), nama: f[F.nama] || wa, level: 'Pengurus' });
    update(T, rec.id, { [F.lastLogin]: new Date().toISOString() }).catch(() => {});
    return res.status(200).json({ ok: true, mustChange: !!f[F.mustChange], pending: !f[F.disetujui] });
  } catch (e) {
    console.error('login error', e.message);
    const m = String(e.message);
    let hint = 'Terjadi kesalahan server';
    if (/AIRTABLE_TOKEN belum/.test(m)) hint = 'Konfigurasi server: AIRTABLE_TOKEN belum diisi di Vercel';
    else if (/SESSION_SECRET/.test(m)) hint = 'Konfigurasi server: SESSION_SECRET belum diisi (min 32 karakter) di Vercel';
    else if (/Airtable 401/.test(m)) hint = 'Konfigurasi server: AIRTABLE_TOKEN tidak valid';
    else if (/Airtable 403/.test(m)) hint = 'Konfigurasi server: token Airtable tidak punya akses ke base/tabel (cek scope)';
    return res.status(500).json({ error: hint });
  }
};
