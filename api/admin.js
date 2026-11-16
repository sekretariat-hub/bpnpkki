// Administrasi pengguna (hanya Admin).
const crypto = require('crypto');
const { fetchAll, update, create } = require('../lib/airtable');
const { getSession, hashPassword } = require('../lib/auth');
const { T, F } = require('../lib/users');
const A = require('../lib/access');
const { newToken, hashToken, TTL } = require('../lib/invite');
const inv = (req) => { const t = newToken(); return { t, link: `https://${req.headers.host}/?invite=${t}`, f: { [F.tokenHash]: hashToken(t), [F.tokenExp]: Date.now() + TTL, [F.mustChange]: true } }; };

const PERSON = 'tbl21zOSogH7Anlu2';
const PF = { nama: 'fldVU2gofcKEhWHmB', email: 'fldhjOTrQfLGC6hWj', dom: 'fldwJ7RnXW1nLaOcv' };
const nm = (v) => (v && v.name) || v || '';
const qs = (s) => String(s).replace(/\\/g, '').replace(/'/g, "\\'");
const temp = () => { const c = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from(crypto.randomBytes(10), (b) => c[b % c.length]).join(''); };

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const s = getSession(req);
  const acc = s && (await A.getAccess(s).catch(() => null));
  if (!acc) return res.status(401).json({ error: 'Belum login' });
  if (!A.can(acc, 'admin', 1)) return res.status(403).json({ error: 'Hanya Admin' });
  try {
    if (req.method === 'GET') {
      const q = String(req.query.q || '').trim();
      if (q) {
        const rows = await fetchAll(PERSON, [PF.nama, PF.email], { filterByFormula: `AND(LEN({Email})>0, OR(SEARCH('${qs(q.toLowerCase())}', LOWER({Nama Lengkap})), SEARCH('${qs(q.toLowerCase())}', LOWER({Email}))))`, maxRecords: '15' });
        return res.json({ orang: rows.map((r) => ({ id: r.id, nama: r.fields[PF.nama] || '', email: String(r.fields[PF.email] || '').toLowerCase() })) });
      }
      const rows = await fetchAll(T, [...Object.values(F), A.FX.peran, A.FX.khusus]);
      return res.json({
        tree: A.TREE, peran: A.PERAN,
        presets: Object.fromEntries(A.PERAN.map((p) => [p, A.resolve(p, {})])),
        users: rows.map((r) => { const f = r.fields; return { id: r.id, email: f[F.email] || '', nama: f[F.nama] || '', aktif: !!f[F.aktif], peran: nm(f[A.FX.peran]) || (nm(f[F.level]) === 'Admin' ? 'Admin' : 'Pengurus BPN Harian'), khusus: A.cleanKhusus(A.parseKhusus(f[A.FX.khusus])), lastLogin: f[F.lastLogin] || '' }; })
          .sort((a, b) => a.nama.localeCompare(b.nama, 'id')),
      });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' });
    if (!A.can(acc, 'admin', 2)) return res.status(403).json({ error: 'Tidak punya hak mengubah' });
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    if (b.action === 'create') {
      const email = String(b.email || '').trim().toLowerCase();
      if (!email || !A.PERAN.includes(b.peran)) return res.status(400).json({ error: 'Email dan peran wajib' });
      const ps = await fetchAll(PERSON, [PF.nama, PF.email], { filterByFormula: `LOWER({Email})='${qs(email)}'`, maxRecords: '1' });
      if (!ps[0]) return res.status(400).json({ error: 'Email belum terdaftar di M-Person' });
      const ex = await fetchAll(T, [F.email], { filterByFormula: `LOWER({Email})='${qs(email)}'`, maxRecords: '1' });
      if (ex[0]) return res.status(409).json({ error: 'Pengguna sudah ada' });
      const pw = temp(), iv = inv(req);
      await create(T, { ...iv.f, [F.email]: email, [F.nama]: ps[0].fields[PF.nama] || email, [F.level]: b.peran === 'Admin' ? 'Admin' : 'Pengurus', [A.FX.peran]: b.peran, [F.aktif]: true, [F.hash]: hashPassword(pw), [F.person]: ps[0].id, [A.FX.khusus]: '{}' });
      console.log('admin create', acc.email, email, b.peran);
      return res.json({ ok: true, email, password: pw, link: iv.link });
    }
    const id = String(b.id || '');
    if (!/^rec[A-Za-z0-9]{14}$/.test(id)) return res.status(400).json({ error: 'ID tidak valid' });
    const rows = await fetchAll(T, [F.email], { filterByFormula: `RECORD_ID()='${id}'`, maxRecords: '1' });
    if (!rows[0]) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    const email = String(rows[0].fields[F.email] || '').toLowerCase();
    const self = email === acc.email;
    if (b.action === 'update') {
      const f = {};
      if (b.peran !== undefined) { if (!A.PERAN.includes(b.peran)) return res.status(400).json({ error: 'Peran tidak valid' }); if (self && b.peran !== 'Admin') return res.status(400).json({ error: 'Anda tidak bisa menurunkan peran sendiri' }); f[A.FX.peran] = b.peran; f[F.level] = b.peran === 'Admin' ? 'Admin' : 'Pengurus'; }
      if (b.aktif !== undefined) { if (self && !b.aktif) return res.status(400).json({ error: 'Anda tidak bisa menonaktifkan diri sendiri' }); f[F.aktif] = !!b.aktif; }
      if (b.khusus !== undefined) f[A.FX.khusus] = JSON.stringify(A.cleanKhusus(b.khusus));
      await update(T, id, f); A.forget(email);
      console.log('admin update', acc.email, email, Object.keys(f).join(','));
      return res.json({ ok: true });
    }
    if (b.action === 'reset') {
      const pw = temp(), iv = inv(req);
      await update(T, id, { [F.hash]: hashPassword(pw), ...iv.f }); A.forget(email);
      console.log('admin reset', acc.email, email);
      return res.json({ ok: true, email, password: pw, link: iv.link });
    }
    return res.status(400).json({ error: 'Aksi tidak dikenal' });
  } catch (e) {
    console.error('admin error', e.message);
    return res.status(502).json({ error: 'Gagal memproses di Airtable' });
  }
};
