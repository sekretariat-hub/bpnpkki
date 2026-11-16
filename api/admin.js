// Administrasi pengguna (hanya Admin).
const crypto = require('crypto');
const { fetchAll, update, create } = require('../lib/airtable');
const { getSession, hashPassword } = require('../lib/auth');
const { T, F } = require('../lib/users');
const A = require('../lib/access');
const { waDigits, mask } = require('../lib/phone');
const { kirimWa } = require('../lib/wa');
const { newToken, hashToken, TTL } = require('../lib/invite');
const pesanUndangan = (nama, peran, link) => `Shalom ${String(nama).split(' ')[0]},\n\nAnda diundang ke *Sistem Informasi BPN PKKI* sebagai ${peran}.\n\nBuka tautan ini untuk masuk (berlaku 14 hari, sekali pakai):\n${link}\n\nSetelah masuk, Anda diminta membuat password. Berikutnya Anda masuk dengan nomor WhatsApp ini + password tersebut di ${link.split('/?')[0]}\n\nJangan bagikan tautan ini kepada orang lain.`;
async function kirimUndangan(wa, nama, peran, link) {
  try { await kirimWa(wa, pesanUndangan(nama, peran, link)); return { terkirim: true }; }
  catch (e) { return { terkirim: false, galat: e.code === 'NOKEY' ? 'Pengiriman WhatsApp belum diaktifkan di server (BABLAST_API_KEY)' : String(e.message).slice(0, 200) }; }
}
const inv = (req) => { const t = newToken(); return { t, link: `https://${req.headers.host}/?invite=${t}`, f: { [F.tokenHash]: hashToken(t), [F.tokenExp]: Date.now() + TTL, [F.mustChange]: true } }; };

const PERSON = 'tbl21zOSogH7Anlu2';
const PF = { nama: 'fldVU2gofcKEhWHmB', email: 'fldhjOTrQfLGC6hWj', dom: 'fldwJ7RnXW1nLaOcv', wa: 'fldGsFt4GflTXoTa0' };
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
        const rows = await fetchAll(PERSON, [PF.nama, PF.email, PF.wa], { filterByFormula: `AND(LEN({Whatsapp})>0, SEARCH('${qs(q.toLowerCase())}', LOWER({Nama Lengkap})))`, maxRecords: '15' });
        return res.json({ orang: rows.map((r) => ({ id: r.id, nama: r.fields[PF.nama] || '', email: String(r.fields[PF.email] || '').toLowerCase(), wa: mask(waDigits(r.fields[PF.wa])) })).filter((o) => o.wa !== '****') });
      }
      const rows = await fetchAll(T, [...Object.values(F), A.FX.peran, A.FX.khusus]);
      return res.json({
        tree: A.TREE, peran: A.PERAN,
        presets: Object.fromEntries(A.PERAN.map((p) => [p, A.resolve(p, {})])),
        users: rows.map((r) => { const f = r.fields; return { id: r.id, email: f[F.email] || '', wa: mask(waDigits(f[F.wa])), nama: f[F.nama] || '', aktif: !!f[F.aktif], pending: !f[F.disetujui], peran: nm(f[A.FX.peran]) || (nm(f[F.level]) === 'Admin' ? 'Admin' : ''), khusus: A.cleanKhusus(A.parseKhusus(f[A.FX.khusus])), lastLogin: f[F.lastLogin] || '' }; })
          .sort((a, b) => a.nama.localeCompare(b.nama, 'id')),
      });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' });
    if (!A.can(acc, 'admin', 2)) return res.status(403).json({ error: 'Tidak punya hak mengubah' });
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    if (b.action === 'create') {
      const pid = String(b.personId || '');
      if (!/^rec[A-Za-z0-9]{14}$/.test(pid) || !A.PERAN.includes(b.peran)) return res.status(400).json({ error: 'Pilih orang dan peran' });
      const ps = await fetchAll(PERSON, [PF.nama, PF.email, PF.wa], { filterByFormula: `RECORD_ID()='${pid}'`, maxRecords: '1' });
      const p = ps[0], wa = p ? waDigits(p.fields[PF.wa]) : '';
      if (!wa) return res.status(400).json({ error: 'Orang ini belum punya nomor WhatsApp yang valid di M-Person' });
      const ex = await fetchAll(T, [F.wa], { filterByFormula: `{Whatsapp}='${wa}'`, maxRecords: '1' });
      if (ex[0]) return res.status(409).json({ error: 'Pengguna dengan nomor ini sudah ada' });
      const pw = temp(), iv = inv(req), email = String(p.fields[PF.email] || '').toLowerCase();
      await create(T, { ...iv.f, [F.email]: email || wa, [F.nama]: p.fields[PF.nama] || wa, [F.wa]: wa, [F.level]: b.peran === 'Admin' ? 'Admin' : 'Pengurus', [A.FX.peran]: b.peran, [F.aktif]: true, [F.disetujui]: true, [F.hash]: hashPassword(pw), [F.person]: pid, [A.FX.khusus]: '{}' });
      console.log('admin create', acc.email, wa, b.peran);
      const kirim = await kirimUndangan(wa, p.fields[PF.nama] || '', b.peran, iv.link);
      return res.json({ ok: true, wa: mask(wa), password: pw, link: iv.link, ...kirim });
    }
    const id = String(b.id || '');
    if (!/^rec[A-Za-z0-9]{14}$/.test(id)) return res.status(400).json({ error: 'ID tidak valid' });
    const rows = await fetchAll(T, [F.email, F.wa, F.nama, F.disetujui, F.aktif, A.FX.peran], { filterByFormula: `RECORD_ID()='${id}'`, maxRecords: '1' });
    if (!rows[0]) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    const email = String(rows[0].fields[F.email] || '').toLowerCase();
    const self = id === acc.id;
    if (b.action === 'update') {
      const f = {};
      if (b.peran !== undefined) { if (!A.PERAN.includes(b.peran)) return res.status(400).json({ error: 'Peran tidak valid' }); if (self && b.peran !== 'Admin') return res.status(400).json({ error: 'Anda tidak bisa menurunkan peran sendiri' }); f[A.FX.peran] = b.peran; f[F.level] = b.peran === 'Admin' ? 'Admin' : 'Pengurus'; f[F.disetujui] = true; }
      if (b.aktif !== undefined) { if (self && !b.aktif) return res.status(400).json({ error: 'Anda tidak bisa menonaktifkan diri sendiri' }); f[F.aktif] = !!b.aktif; }
      if (b.khusus !== undefined) f[A.FX.khusus] = JSON.stringify(A.cleanKhusus(b.khusus));
      await update(T, id, f); A.forget(id); A.forget(email);
      console.log('admin update', acc.email, email, Object.keys(f).join(','));
      return res.json({ ok: true });
    }
    if (b.action === 'reset') {
      const pw = temp(), iv = inv(req);
      await update(T, id, { [F.hash]: hashPassword(pw), ...iv.f }); A.forget(id); A.forget(email);
      console.log('admin reset', acc.email, email);
      return res.json({ ok: true, wa: 'nomor WhatsApp pengguna', password: pw, link: iv.link });
    }
    if (b.action === 'kirimwa') {
      const f = rows[0].fields, wa = waDigits(f[F.wa]);
      if (!wa) return res.status(400).json({ error: 'Pengguna ini belum punya nomor WhatsApp' });
      if (!f[F.aktif] || !f[F.disetujui] || !nm(f[A.FX.peran])) return res.status(400).json({ error: 'Setujui akun dan pilih peran dulu' });
      const iv = inv(req);
      await update(T, id, iv.f); A.forget(id); A.forget(email);
      const kirim = await kirimUndangan(wa, f[F.nama] || '', nm(f[A.FX.peran]), iv.link);
      console.log('admin kirimwa', acc.email, email, kirim.terkirim);
      return res.json({ ok: true, wa: mask(wa), link: iv.link, ...kirim });
    }
    return res.status(400).json({ error: 'Aksi tidak dikenal' });
  } catch (e) {
    console.error('admin error', e.message);
    return res.status(502).json({ error: 'Gagal memproses di Airtable' });
  }
};
