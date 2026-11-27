// Ubah isi program kerja (PROKER BPN). Hanya untuk pengguna dengan hak edit di menu Program Kerja.
const { update, listByIds } = require('../lib/airtable');
const { getSession } = require('../lib/auth');
const { getAccess, canEditProker, canEditSeksi } = require('../lib/access');

const T = 'tblJVp60qiZ4mz40v';
const FIELD = { status: 'fldaVg9ti2zI8wqF6', acc: 'fldgSos4roG4zcZsZ', deal: 'fldHv5JtZ4QiMuooY', bulan: 'fld3c0GcOXMa6gXgw', tahun: 'fldCLTSfeaWv6E1GF',
  metode: 'fld3Ni0MS2OH7KOvu', sumberDana: 'fldpi1SsOEeWSn3WF', anggaran: 'fldaBt1ZeguNcnlDE', catatan: 'fldZbkJcPgp130dxt', detil: 'fldhh9nS23lP4iPED' };
const SELECT = ['status', 'acc', 'bulan', 'tahun', 'metode', 'sumberDana'];

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'Metode tidak diizinkan' });
  const s = getSession(req);
  const acc = s && (await getAccess(s).catch(() => null));
  if (!acc) return res.status(401).json({ error: 'Belum login' });
  // Proyek & Tugas Seksi (lib/h-tugas.js): hak dihitung dari keanggotaan seksi, bukan hak edit Program Kerja.
  if (req.method === 'GET') return require('../lib/h-tugas').get(req, res, acc).catch((e) => { console.error('tugas get', e.message); res.status(502).json({ error: 'Gagal mengambil data dari Airtable' }); });
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  if (body.op) return require('../lib/h-tugas').post(req, res, acc, body);
  if (!canEditProker(acc)) return res.status(403).json({ error: 'Anda tidak punya hak mengedit program kerja' });
  const id = String(body.id || '');
  if (!/^rec[A-Za-z0-9]{14}$/.test(id)) return res.status(400).json({ error: 'ID program tidak valid' });
  const f = body.fields || {};
  const out = {};
  for (const [k, v] of Object.entries(f)) {
    if (!FIELD[k]) continue;
    if (SELECT.includes(k)) out[FIELD[k]] = v ? String(v) : null;
    else if (k === 'deal') out[FIELD[k]] = !!v;
    else if (k === 'anggaran') { const n = v === '' || v == null ? null : Number(v); if (n !== null && (!isFinite(n) || n < 0)) return res.status(400).json({ error: 'Anggaran harus angka ≥ 0' }); out[FIELD[k]] = n; }
    else out[FIELD[k]] = String(v || '').slice(0, 2000);
  }
  if (!Object.keys(out).length) return res.status(400).json({ error: 'Tidak ada perubahan' });
  try {
    if (acc.seksiEdit) {
      const [r] = await listByIds(T, [id], ['fldSo9KHoZeU6nelG']);
      const sk = r ? [].concat(r.fields.fldSo9KHoZeU6nelG || []).map((x) => (x && x.name) || x) : [];
      if (!canEditSeksi(acc, sk)) return res.status(403).json({ error: 'Anda hanya boleh mengedit program kerja seksi Anda sendiri' });
    }
    if (acc.bpkIds) {
      const [r] = await listByIds(T, [id], ['fld97u5BWt6vL112x', 'fld6R2dagcciDPbZh']);
      const ids = r ? [...(r.fields.fld97u5BWt6vL112x || []), ...(r.fields.fld6R2dagcciDPbZh || [])] : [];
      if (!ids.some((i) => acc.bpkIds.includes(i))) return res.status(403).json({ error: 'Program ini bukan milik keuskupan Anda' });
    }
    await update(T, id, out);
    console.log('proker edit', acc.email, id, Object.keys(f).join(','));
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('proker update error', e.message);
    const bad = /422|INVALID_MULTIPLE_CHOICE|INVALID_VALUE/.test(e.message);
    return res.status(bad ? 422 : 502).json({ error: bad ? 'Salah satu pilihan tidak valid di Airtable' : 'Gagal menyimpan ke Airtable' });
  }
};
