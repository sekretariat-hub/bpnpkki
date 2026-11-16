const { fetchAll, update } = require('../lib/airtable');
const { verifyPassword, setSession } = require('../lib/auth');
const { T, F } = require('../lib/users');

// Pembatas percobaan login sederhana (per instance; cukup untuk meredam tebak-tebakan).
const attempts = new Map();
const WINDOW = 15 * 60 * 1000;
const MAX = 8;

function limited(key) {
  const now = Date.now();
  const list = (attempts.get(key) || []).filter((t) => now - t < WINDOW);
  attempts.set(key, list);
  return list.length >= MAX;
}
function fail(key) {
  attempts.set(key, [...(attempts.get(key) || []), Date.now()]);
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!email || !password) return res.status(400).json({ error: 'Email dan password wajib diisi' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const key = `${ip}|${email}`;
  if (limited(key) || limited(ip)) {
    return res.status(429).json({ error: 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.' });
  }

  try {
    const safe = email.replace(/\\/g, '').replace(/'/g, "\\'");
    const rows = await fetchAll(T, Object.values(F), { filterByFormula: `LOWER({Email})='${safe}'`, maxRecords: '1' });
    const rec = rows[0];
    const f = rec ? rec.fields : {};
    // Selalu jalankan verifikasi agar waktu respons tidak membocorkan apakah email terdaftar.
    const ok = verifyPassword(password, f[F.hash] || 'scrypt$AAAA$AAAA') && rec && f[F.aktif];
    if (!ok) {
      fail(key);
      fail(ip);
      return res.status(401).json({ error: 'Email atau password salah' });
    }
    setSession(res, { email, nama: f[F.nama] || email, level: (f[F.level] && f[F.level].name) || f[F.level] || 'Pengurus' });
    update(T, rec.id, { [F.lastLogin]: new Date().toISOString() }).catch(() => {});
    return res.status(200).json({ ok: true, mustChange: !!f[F.mustChange] });
  } catch (e) {
    console.error('login error', e.message);
    const m = String(e.message);
    let hint = 'Terjadi kesalahan server';
    if (/AIRTABLE_TOKEN belum/.test(m)) hint = 'Konfigurasi server: AIRTABLE_TOKEN belum diisi di Vercel';
    else if (/SESSION_SECRET/.test(m)) hint = 'Konfigurasi server: SESSION_SECRET belum diisi (min 32 karakter) di Vercel';
    else if (/Airtable 401/.test(m)) hint = 'Konfigurasi server: AIRTABLE_TOKEN tidak valid';
    else if (/Airtable 403/.test(m)) hint = 'Konfigurasi server: token Airtable tidak punya akses ke base/tabel Pengguna Report atau scope kurang';
    else if (/Airtable 404/.test(m)) hint = 'Konfigurasi server: base atau tabel Airtable tidak ditemukan (cek AIRTABLE_BASE_ID)';
    return res.status(500).json({ error: hint });
  }
};
