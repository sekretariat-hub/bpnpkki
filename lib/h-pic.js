// Isi data PIC lewat link: koordinator/Admin menekan "Kirim WA" di jabatan yang kosong, penerima mengisi formulir (tanpa login),
// lalu PIC baru otomatis dikirimi WhatsApp undangan. Dipanggil dari api/pejabat.js (tidak menambah file di api/).
// MODE UJI: aktif kecuali env UJI_PIC=0. Saat uji, semua WA dialihkan ke UJI_WA (default nomor Timmy) dan pengisian TIDAK disimpan.
const { fetchAll, update, create, listByIds } = require('./airtable');
const { sign, verify, getSession } = require('./auth');
const A = require('./access');
const { waDigits } = require('./phone');
const { kirimWa } = require('./wa');
const { PERSON, PF, personByWa } = require('./person');

const PEJ = 'tblGR9a8J4UOyJGep', PJ = { bpk: 'fldrGASVYBRTS7v8o', orang: 'fldCYWlWFYtnkjv6Z', jab: 'fldAsSxbg8bZRkrru', mulai: 'fldg6fcg234kY4yCT', selesai: 'fldg9BWVX7AmO3Iw7', status: 'fldyWZFFnXeN8CMlk' };
const BPK = 'tblgj0UYB9w7UWWnv', JAB = 'tbldxeUpwRdy3ghib', REC = /^rec[A-Za-z0-9]{14}$/, TTL = 14 * 24 * 3600e3;
const uji = () => process.env.UJI_PIC !== '0';
const ujiWa = () => waDigits(process.env.UJI_WA || '628157005842');
const nm = (v) => (v && v.name) || v || '';
const aktifRow = (r) => /aktif/i.test(nm(r.fields[PJ.status])) && !/tidak/i.test(nm(r.fields[PJ.status]));
const hariIni = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
const bad = (res, m, c = 400) => res.status(c).json({ error: m });
const body = (req) => (typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } })() : req.body || {});

async function nama2(bpkId, jabId) {
  const [b] = await fetchAll(BPK, ['fldxvUJvguk6J81mP'], { filterByFormula: `RECORD_ID()='${bpkId}'`, maxRecords: '1' });
  const [j] = await fetchAll(JAB, ['fld1D1ejz3qnx7A8h'], { filterByFormula: `RECORD_ID()='${jabId}'`, maxRecords: '1' });
  return { bpk: b ? String(b.fields.fldxvUJvguk6J81mP || '').trim() : '', jabatan: j ? String(j.fields.fld1D1ejz3qnx7A8h || '').trim() : '' };
}
// Kirim WA; saat mode uji dialihkan ke nomor uji dengan label asal tujuan.
async function kirim(tujuan, teks, labelTujuan) {
  if (!uji()) { await kirimWa(tujuan, teks); return { terkirim: true, uji: false }; }
  await kirimWa(ujiWa(), `[UJI: seharusnya ke ${labelTujuan || tujuan}]\n\n${teks}`); return { terkirim: true, uji: true };
}
const galat = (e) => (e.code === 'NOKEY' ? 'Pengiriman WhatsApp belum diaktifkan di server (BABLAST_API_KEY)' : String(e.message).slice(0, 200));

// POST pic_kirim (login, hak pendataan): kirim link formulir ke koordinator BPK.
async function kirimLink(req, res) {
  const s = getSession(req), acc = s && (await A.getAccess(s).catch(() => null));
  if (!acc) return bad(res, 'Belum login', 401);
  if ((acc.perm.pendataan || 0) < 2) return bad(res, 'Anda tidak punya hak mendata', 403);
  const b = body(req), bpkId = String(b.bpkId || ''), jabId = String(b.jabatanId || '');
  if (!REC.test(bpkId) || !REC.test(jabId)) return bad(res, 'BPK atau jabatan tidak valid');
  if (acc.bpkIds && !acc.bpkIds.includes(bpkId)) return bad(res, 'Anda hanya boleh mendata BPK Anda sendiri', 403);
  const { bpk, jabatan } = await nama2(bpkId, jabId);
  if (!bpk || !jabatan) return bad(res, 'BPK atau jabatan tidak ditemukan', 404);
  const rows = (await fetchAll(PEJ, Object.values(PJ))).filter((r) => (r.fields[PJ.bpk] || []).includes(bpkId) && aktifRow(r));
  if (rows.some((r) => (r.fields[PJ.jab] || []).includes(jabId))) return bad(res, 'Jabatan ini sudah terisi', 409);
  const orang = await listByIds(PERSON, [...new Set(rows.flatMap((r) => r.fields[PJ.orang] || []))], [PF.nama, PF.wa]);
  const byId = Object.fromEntries(orang.map((o) => [o.id, o]));
  const jabNama = (r) => String((r.fields[PJ.jab] || [])[0] || '');
  const jabAll = await fetchAll(JAB, ['fld1D1ejz3qnx7A8h']), jn = Object.fromEntries(jabAll.map((r) => [r.id, String(r.fields.fld1D1ejz3qnx7A8h || '')]));
  const cand = rows.flatMap((r) => (r.fields[PJ.orang] || []).map((id) => ({ o: byId[id], jab: jn[jabNama(r)] || '' }))).filter((x) => x.o && waDigits(x.o.fields[PF.wa]));
  const pilih = cand.find((x) => /koord/i.test(x.jab) && !/wakil/i.test(x.jab)) || cand[0];
  const tok = sign({ k: 'pic', b: bpkId, j: jabId, by: pilih ? String(pilih.o.fields[PF.nama] || '').trim() : acc.nama, byJab: pilih ? pilih.jab : '', exp: Date.now() + TTL });
  const link = `https://${req.headers.host}/?pic=${tok}`;
  if (b.tanpaKirim) return res.json({ ok: true, terkirim: false, link, disalin: true });
  if (!pilih) return res.json({ ok: true, terkirim: false, link, galat: 'Belum ada pejabat aktif dengan nomor WA di BPK ini. Salin link di bawah dan kirim manual.' });
  const wa = waDigits(pilih.o.fields[PF.wa]), nama = String(pilih.o.fields[PF.nama] || '').trim();
  const teks = `Shalom ${nama.split(' ')[0]},\n\nJabatan *${jabatan}* di BPK ${bpk} belum terisi di *Sistem Informasi BPN PKK Indonesia*. Mohon isi nama dan nomor WhatsApp orangnya lewat formulir berikut:\n${link}\n\nTautan berlaku 14 hari. Orang yang Anda daftarkan akan otomatis dikirimi WhatsApp undangan untuk melengkapi profil dan membuat password.\n\nTerima kasih. Jika Anda tidak merasa terkait, abaikan pesan ini.`;
  let k; try { k = await kirim(wa, teks, `${nama} (${wa})`); } catch (e) { k = { terkirim: false, galat: galat(e) }; }
  console.log('pic_kirim', acc.email, bpk, jabatan, 'uji', uji(), 'wa', k.terkirim);
  return res.json({ ok: true, link, penerima: nama, ...k });
}

// GET ?pic=<token>: info untuk halaman formulir publik.
async function info(req, res) {
  const t = verify(String(req.query.pic || ''));
  if (!t || t.k !== 'pic') return bad(res, 'Tautan tidak valid atau sudah kedaluwarsa', 410);
  const { bpk, jabatan } = await nama2(t.b, t.j);
  return res.json({ bpk, jabatan, oleh: t.by, uji: uji() });
}

// POST pic_form (tanpa login): simpan PIC baru dan kirim WA undangan. Mode uji: tidak menyimpan apa pun.
async function form(req, res) {
  const b = body(req), t = verify(String(b.token || ''));
  if (!t || t.k !== 'pic') return bad(res, 'Tautan tidak valid atau sudah kedaluwarsa', 410);
  const nama = String(b.nama || '').trim().replace(/\s+/g, ' ').slice(0, 120), wa = waDigits(b.wa), jk = b.jk;
  if (nama.length < 2) return bad(res, 'Nama wajib diisi');
  if (!wa) return bad(res, 'Nomor WhatsApp tidak valid. Contoh: 0812 3456 7890');
  if (!['Pria', 'Wanita'].includes(jk)) return bad(res, 'Pilih jenis kelamin');
  try {
    const { bpk, jabatan } = await nama2(t.b, t.j);
    const link = `https://${req.headers.host}/?hp=${wa}`;
    const olehJab = t.byJab ? `${t.byJab}` : `Koordinator BPK ${bpk}`;
    const teks = `Shalom ${nama.split(' ')[0]},\n\nNama Anda telah didaftarkan sebagai *${jabatan}* BPK ${bpk} oleh ${t.by} (${olehJab}).\n\nIni adalah pesan dari *Sistem Informasi BPN PKK Indonesia* (Badan Pelayanan Nasional Pembaruan Karismatik Katolik Indonesia). Silakan buka tautan berikut untuk melengkapi data profil Anda dan membuat password. Setelah itu Anda dapat masuk ke sistem:\n${link}\n\nJika Anda merasa tidak mengenal hal ini, abaikan saja pesan ini.`;
    if (uji()) {
      const k = await kirim(wa, teks, `${nama} (${wa})`).catch((e) => ({ terkirim: false, galat: galat(e) }));
      console.log('pic_form UJI (tidak disimpan)', bpk, jabatan, 'wa', k.terkirim);
      return res.json({ ok: true, uji: true, disimpan: false, ...k });
    }
    const rows = (await fetchAll(PEJ, Object.values(PJ))).filter((r) => (r.fields[PJ.bpk] || []).includes(t.b) && aktifRow(r));
    if (rows.some((r) => (r.fields[PJ.jab] || []).includes(t.j))) return bad(res, 'Jabatan ini sudah terisi. Hubungi koordinator BPK Anda.', 409);
    let person = await personByWa(wa);
    if (!person) person = await create(PERSON, { [PF.nama]: nama, [PF.wa]: '+' + wa, [PF.jk]: jk, [PF.dom]: [t.b] });
    else await update(PERSON, person.id, { [PF.dom]: [t.b] });
    await create(PEJ, { [PJ.bpk]: [t.b], [PJ.orang]: [person.id], [PJ.jab]: [t.j], [PJ.mulai]: hariIni() });
    require('../api/data').invalidate(); require('./analitik').invalidate();
    let k; try { k = await kirim(wa, teks); } catch (e) { k = { terkirim: false, galat: galat(e) }; }
    console.log('pic_form disimpan', bpk, jabatan, wa, 'wa', k.terkirim);
    return res.json({ ok: true, uji: false, disimpan: true, ...k });
  } catch (e) { console.error('pic_form', e.message); return bad(res, 'Gagal menyimpan. Coba lagi.', 502); }
}
module.exports = { kirimLink, info, form };
