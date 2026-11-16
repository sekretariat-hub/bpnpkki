// Cari orang di M-Person (hanya nama) untuk memilih pengganti jabatan.
const { fetchAll } = require('../lib/airtable');
const { getSession } = require('../lib/auth');
const A = require('../lib/access');
const { PERSON, PF } = require('../lib/person');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const s = getSession(req);
  const acc = s && (await A.getAccess(s).catch(() => null));
  if (!acc) return res.status(401).json({ error: 'Belum login' });
  if ((acc.perm.pengurus || 0) < 2 && (acc.perm.pendataan || 0) < 2) return res.status(403).json({ error: 'Tidak punya hak' });
  const q = String(req.query.q || '').trim().toLowerCase().replace(/\\/g, '').replace(/'/g, "\\'");
  if (q.length < 2) return res.json({ orang: [] });
  try {
    const rows = await fetchAll(PERSON, [PF.nama, PF.pan], { filterByFormula: `SEARCH('${q}', LOWER({Nama Lengkap}))`, maxRecords: '15' });
    return res.json({ orang: rows.map((r) => ({ id: r.id, nama: r.fields[PF.nama] || '', panggilan: r.fields[PF.pan] || '' })) });
  } catch (e) { console.error('orang error', e.message); return res.status(502).json({ error: 'Gagal mencari' }); }
};
