// Pendataan pejabat/PIC BPK: tambah (nama, WA, jenis kelamin) atau akhiri jabatan. Riwayat tersimpan (Selesai diisi, tidak dihapus).
const { fetchAll, update, create, listByIds } = require('../lib/airtable');
const { getSession } = require('../lib/auth');
const A = require('../lib/access');
const { waDigits } = require('../lib/phone');
const { kirimWa } = require('../lib/wa');
const { PERSON, PF, personByWa } = require('../lib/person');
const data = require('./data');

const PEJ = 'tblGR9a8J4UOyJGep', PJ = { bpk: 'fldrGASVYBRTS7v8o', orang: 'fldCYWlWFYtnkjv6Z', jab: 'fldAsSxbg8bZRkrru', mulai: 'fldg6fcg234kY4yCT', selesai: 'fldg9BWVX7AmO3Iw7', status: 'fldyWZFFnXeN8CMlk' };
const BPK = 'tblgj0UYB9w7UWWnv', JAB = 'tbldxeUpwRdy3ghib';
const REC = /^rec[A-Za-z0-9]{14}$/;
const hariIni = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
const nm = (v) => (v && v.name) || v || '';
const aktifRow = (r) => /aktif/i.test(nm(r.fields[PJ.status])) && !/tidak/i.test(nm(r.fields[PJ.status]));

const pesan = ({ nama, jabatan, bpk, oleh, olehJab, link }) => `Shalom ${String(nama).split(' ')[0]},\n\nNama Anda telah didata sebagai *${jabatan}* BPK ${bpk} oleh ${oleh}${olehJab ? ` (${olehJab})` : ''}.\n\nIni adalah pesan dari *Sistem Informasi BPN PKK Indonesia* (Badan Pelayanan Nasional Pembaruan Karismatik Katolik Indonesia). Kami mengundang Anda untuk bisa masuk ke sistem informasi BPN lewat tautan berikut:\n${link}\n\nSetelah tautan dibuka, Anda diminta membuat akun dan melengkapi profil terlebih dahulu.\n\nJika Anda merasa tidak mengenal hal ini, abaikan saja pesan ini.`;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' });
  const s = getSession(req);
  const acc = s && (await A.getAccess(s).catch(() => null));
  if (!acc) return res.status(401).json({ error: 'Belum login' });
  if ((acc.perm.pendataan || 0) < 2) return res.status(403).json({ error: 'Anda tidak punya hak mendata' });
  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const bpkId = String(b.bpkId || '');
  if (!REC.test(bpkId)) return res.status(400).json({ error: 'Pilih BPK' });
  if (acc.bpkIds && !acc.bpkIds.includes(bpkId)) return res.status(403).json({ error: 'Anda hanya boleh mendata BPK Anda sendiri' });
  try {
    const bpkRows = await fetchAll(BPK, ['fldxvUJvguk6J81mP'], { filterByFormula: `RECORD_ID()='${bpkId}'`, maxRecords: '1' });
    if (!bpkRows[0]) return res.status(404).json({ error: 'BPK tidak ditemukan' });
    const bpkNama = String(bpkRows[0].fields.fldxvUJvguk6J81mP || '').trim();

    if (b.action === 'akhiri') {
      const id = String(b.id || ''); if (!REC.test(id)) return res.status(400).json({ error: 'ID tidak valid' });
      const [r] = await listByIds(PEJ, [id], Object.values(PJ));
      if (!r || !(r.fields[PJ.bpk] || []).includes(bpkId)) return res.status(404).json({ error: 'Data tidak ditemukan di BPK ini' });
      if (!aktifRow(r)) return res.status(400).json({ error: 'Jabatan ini sudah berakhir' });
      await update(PEJ, id, { [PJ.selesai]: hariIni() }); data.invalidate();
      console.log('pejabat akhiri', acc.email, id);
      return res.json({ ok: true });
    }

    if (b.action !== 'tambah') return res.status(400).json({ error: 'Aksi tidak dikenal' });
    const nama = String(b.nama || '').trim().replace(/\s+/g, ' ').slice(0, 120), wa = waDigits(b.wa), jk = b.jk;
    if (nama.length < 2) return res.status(400).json({ error: 'Nama wajib diisi' });
    if (!wa) return res.status(400).json({ error: 'Nomor WhatsApp tidak valid. Contoh: 0812 3456 7890' });
    if (!['Pria', 'Wanita'].includes(jk)) return res.status(400).json({ error: 'Pilih jenis kelamin' });
    const jabId = String(b.jabatanId || ''); if (!REC.test(jabId)) return res.status(400).json({ error: 'Pilih jabatan' });
    const jabRows = await fetchAll(JAB, ['fld1D1ejz3qnx7A8h'], { filterByFormula: `RECORD_ID()='${jabId}'`, maxRecords: '1' });
    if (!jabRows[0]) return res.status(400).json({ error: 'Jabatan tidak ditemukan' });
    const jabatan = String(jabRows[0].fields.fld1D1ejz3qnx7A8h || '').trim();

    let person = await personByWa(wa), baru = false;
    if (!person) {
      person = await create(PERSON, { [PF.nama]: nama, [PF.wa]: '+' + wa, [PF.jk]: jk, [PF.dom]: [bpkId] });
      baru = true;
    }
    const pej = await fetchAll(PEJ, Object.values(PJ));
    const mine = pej.filter((r) => (r.fields[PJ.bpk] || []).includes(bpkId));
    if (mine.some((r) => aktifRow(r) && (r.fields[PJ.orang] || []).includes(person.id) && (r.fields[PJ.jab] || []).includes(jabId))) return res.status(409).json({ error: `${nama} sudah tercatat aktif sebagai ${jabatan} di BPK ${bpkNama}` });

    const akhiri = (Array.isArray(b.akhiri) ? b.akhiri : []).filter((x) => REC.test(x));
    for (const id of akhiri) { const r = mine.find((x) => x.id === id); if (r && aktifRow(r)) await update(PEJ, id, { [PJ.selesai]: hariIni() }); }
    await create(PEJ, { [PJ.bpk]: [bpkId], [PJ.orang]: [person.id], [PJ.jab]: [jabId], [PJ.mulai]: hariIni() });
    data.invalidate();

    const oleh = acc.nama, olehJab = /Koordinator BPK/.test(acc.peran) ? `Koordinator BPK ${bpkNama}` : acc.peran === 'Admin' ? 'Admin sistem BPN PKKI' : acc.peran;
    const link = `https://${req.headers.host}/?hp=${wa}`;
    let kirim;
    try { await kirimWa(wa, pesan({ nama, jabatan, bpk: bpkNama, oleh, olehJab, link })); kirim = { terkirim: true }; }
    catch (e) { kirim = { terkirim: false, galat: e.code === 'NOKEY' ? 'Pengiriman WhatsApp belum diaktifkan di server (BABLAST_API_KEY)' : String(e.message).slice(0, 200) }; }
    console.log('pejabat tambah', acc.email, bpkNama, jabatan, wa, 'orangBaru', baru, 'wa', kirim.terkirim);
    return res.json({ ok: true, orangBaru: baru, link, ...kirim });
  } catch (e) {
    console.error('pejabat error', e.message);
    return res.status(502).json({ error: 'Gagal menyimpan ke Airtable' });
  }
};
