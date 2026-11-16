// Membuka tautan undangan: memverifikasi token sekali pakai lalu langsung memasukkan pengguna (login).
const { fetchAll, update } = require('../lib/airtable');
const { setSession } = require('../lib/auth');
const { T, F } = require('../lib/users');
const { hashToken } = require('../lib/invite');

const tries = new Map();
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now(), list = (tries.get(ip) || []).filter((t) => now - t < 15 * 60 * 1000);
  if (list.length >= 15) return res.status(429).json({ error: 'Terlalu banyak percobaan' });
  tries.set(ip, [...list, now]);
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const token = String(body.token || '');
  if (!/^[A-Za-z0-9_-]{30,80}$/.test(token)) return res.status(400).json({ error: 'Tautan undangan tidak valid' });
  try {
    const rows = await fetchAll(T, Object.values(F), { filterByFormula: `{Token Undangan Hash}='${hashToken(token)}'`, maxRecords: '1' });
    const rec = rows[0], f = rec ? rec.fields : null;
    if (!f || !f[F.aktif] || !(Number(f[F.tokenExp]) > now)) return res.status(410).json({ error: 'Tautan undangan sudah dipakai atau kedaluwarsa. Silakan masuk dengan email dan password bawaan.' });
    await update(T, rec.id, { [F.tokenHash]: null, [F.tokenExp]: null, [F.lastLogin]: new Date().toISOString() });
    setSession(res, { email: String(f[F.email]).toLowerCase(), nama: f[F.nama] || f[F.email], level: 'Pengurus' });
    return res.status(200).json({ ok: true, mustChange: !!f[F.mustChange] });
  } catch (e) {
    console.error('invite error', e.message);
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
};
