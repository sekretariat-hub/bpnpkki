// Ganti / tambah / akhiri pemegang jabatan Pengurus BPN. Yang diganti dicatat di tabel Riwayat Pengurus (tidak dihapus).
const { fetchAll, update, create } = require('./airtable');
const { getSession } = require('./auth');
const A = require('./access');
const { PERSON, PF } = require('./person');
const data = require('../api/data');

const PGR = 'tblRzqA9mzvDBWgSZ', RW = 'tblNNm7hwT7q9hxAV';
const REC = /^rec[A-Za-z0-9]{14}$/;
const hariIni = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' });
  const s = getSession(req);
  const acc = s && (await A.getAccess(s).catch(() => null));
  if (!acc) return res.status(401).json({ error: 'Belum login' });
  if ((acc.perm.pengurus || 0) < 2) return res.status(403).json({ error: 'Anda tidak punya hak mengubah pengurus' });
  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const id = String(b.id || ''), lama = String(b.lamaId || ''), baru = String(b.baruId || '');
  if (!REC.test(id) || (lama && !REC.test(lama)) || (baru && !REC.test(baru))) return res.status(400).json({ error: 'Data tidak valid' });
  if (!lama && !baru) return res.status(400).json({ error: 'Pilih orang yang diganti atau pengganti' });
  const tgl = /^\d{4}-\d{2}-\d{2}$/.test(String(b.tanggal || '')) ? b.tanggal : hariIni();
  try {
    const rows = await fetchAll(PGR, ['fldAZEb1CWjIEoEGB', 'fldJgxaz4f5MmEbnS'], { filterByFormula: `RECORD_ID()='${id}'`, maxRecords: '1' });
    const rec = rows[0]; if (!rec) return res.status(404).json({ error: 'Jabatan tidak ditemukan' });
    const jab = rec.fields.fldAZEb1CWjIEoEGB || '', cur = rec.fields.fldJgxaz4f5MmEbnS || [];
    if (lama && !cur.includes(lama)) return res.status(400).json({ error: 'Orang yang diganti bukan pemegang jabatan ini' });
    if (baru && cur.includes(baru) && baru !== lama) return res.status(409).json({ error: 'Orang ini sudah memegang jabatan tersebut' });
    let namaBaru = '';
    if (baru) { const p = await fetchAll(PERSON, [PF.nama], { filterByFormula: `RECORD_ID()='${baru}'`, maxRecords: '1' }); if (!p[0]) return res.status(404).json({ error: 'Pengganti tidak ditemukan' }); namaBaru = p[0].fields[PF.nama] || ''; }
    const next = [...cur.filter((x) => x !== lama), ...(baru && !cur.includes(baru) ? [baru] : [])];
    if (lama) await create(RW, { fldV7IAegtyjm2lV4: jab, fldPCsNiSY7fO0LU2: [lama], fldfPGyXH4MGPLa8x: tgl, ...(namaBaru ? { fldJ9VuWtPiEceSe6: namaBaru } : {}), fldbWxohzKOsMnaqd: acc.nama });
    await update(PGR, id, { fldJgxaz4f5MmEbnS: next });
    data.invalidate();
    console.log('pengurus ganti', acc.email, jab, lama, '->', baru);
    return res.json({ ok: true });
  } catch (e) { console.error('pengurus error', e.message); return res.status(502).json({ error: 'Gagal menyimpan ke Airtable' }); }
};
