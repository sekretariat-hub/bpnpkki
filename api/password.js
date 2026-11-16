// Ganti password. Wajib dua kali ketik. Pengguna yang masih memakai password bawaan tidak perlu password lama.
const { fetchAll, update } = require('../lib/airtable');
const { getSession, hashPassword, verifyPassword } = require('../lib/auth');
const { T, F } = require('../lib/users');
const { forget } = require('../lib/access');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' });
  const s = getSession(req);
  if (!s) return res.status(401).json({ error: 'Belum login' });
  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const baru = String(b.baru || ''), ulang = String(b.ulang || '');
  if (baru !== ulang) return res.status(400).json({ error: 'Kedua password harus sama' });
  if (baru.length < 8) return res.status(400).json({ error: 'Password minimal 8 karakter' });
  if (!/[A-Za-z]/.test(baru) || !/\d/.test(baru)) return res.status(400).json({ error: 'Password harus berisi huruf dan angka' });
  try {
    const rows = await fetchAll(T, Object.values(F), { filterByFormula: `RECORD_ID()='${String(s.rid || '').replace(/[^A-Za-z0-9]/g, '')}'`, maxRecords: '1' });
    const rec = rows[0];
    if (!rec || !rec.fields[F.aktif]) return res.status(401).json({ error: 'Akun tidak aktif' });
    const must = !!rec.fields[F.mustChange];
    if (!must && !verifyPassword(String(b.lama || ''), rec.fields[F.hash])) return res.status(400).json({ error: 'Password lama salah' });
    if (verifyPassword(baru, rec.fields[F.hash])) return res.status(400).json({ error: 'Password baru tidak boleh sama dengan yang lama' });
    await update(T, rec.id, { [F.hash]: hashPassword(baru), [F.mustChange]: false, [F.tokenHash]: null, [F.tokenExp]: null });
    forget(s.rid || s.email);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('password error', e.message);
    return res.status(500).json({ error: 'Gagal menyimpan password' });
  }
};
