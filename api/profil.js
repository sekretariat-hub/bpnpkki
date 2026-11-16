// Profil umat: lihat & ubah data diri (M-Person), foto, asal PD (termasuk PD baru dengan pengecekan duplikat), paroki baru.
// Pemilik akun mengubah profilnya sendiri; Admin dan Editor BPN boleh mengubah profil siapa pun (?id= / body.id).
const { fetchAll, listByIds, update, create, BASE } = require('../lib/airtable');
const { getSession } = require('../lib/auth');
const A = require('../lib/access');
const { waDigits } = require('../lib/phone');
const { personByWa, PERSON } = require('../lib/person');
const { kirimAdmin } = require('../lib/mail');
const { analitik, invalidate: ulangAnalitik } = require('../lib/analitik');
const { P, OPSI, nm, pengajar, kurang, TAMPIL_BAB } = require('../lib/profil');

const BPK = 'tblgj0UYB9w7UWWnv', PD = 'tblhmeuR1qFHxUIId', PAR = 'tblqKpvfwGtLEHnip', KOTA = 'tblSaXvGJJ7G1P9my', PEL = 'tblTzNOMyrh4iF8MA', MOD = 'tblymcTBL1pjIMa4A', ANT = 'tblRarr3Rk6PQ1C8j';
const PDF = { nama: 'fldzIeY3YMiHMo4ky', kus: 'fldWcO7mYhPFpFXlA', jenis: 'fldq43MYnCIKg34ts', koord: 'fldxlRQG4ikb8coP2', koordNama: 'fldTkyK4Y7dGMpAXn' };
const PARF = { nama: 'fldU7KKCH19jGvG6T', kus: 'fldD3brFiEGKFVgzT' };
const KF = { nama: 'fldzDMmFzXQUgTC8g', prov: 'fldmjgXiXurcORn1B' };
const REC = /^rec[A-Za-z0-9]{14}$/;
const FULL = Object.values(P);
const qs = (s) => String(s).replace(/\\/g, '').replace(/'/g, "\\'");
const s = (v, n = 200) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const bad = (res, m, c = 400) => res.status(c).json({ error: m });

/* ---- daftar pilihan (cache 5 menit) ---- */
let OC = { at: 0 };
async function opsi() {
  if (Date.now() - OC.at < 5 * 60 * 1000 && OC.v) return OC.v;
  const [kus, pel, mod] = await Promise.all([
    fetchAll(BPK, ['fldxvUJvguk6J81mP']),
    fetchAll(PEL, ['fldBHtlKeydYGUfPo']),
    fetchAll(MOD, ['fldocxJbZYt5nn9NS', 'fld04TLxwRqpdkS1V']),
  ]);
  const groups = new Map(); // pelayanan bernama sama digabung satu pilihan
  pel.forEach((r) => { const n = s(r.fields.fldBHtlKeydYGUfPo); if (!n) return; const k = n.toLowerCase(); if (!groups.has(k)) groups.set(k, { id: r.id, nama: n, ids: [] }); groups.get(k).ids.push(r.id); });
  const v = {
    keuskupan: kus.map((r) => ({ id: r.id, nama: s(r.fields.fldxvUJvguk6J81mP) })).filter((x) => x.nama).sort((a, b) => a.nama.localeCompare(b.nama, 'id')),
    pelayanan: [...groups.values()].sort((a, b) => a.nama.localeCompare(b.nama, 'id')),
    modul: mod.map((r) => ({ id: r.id, nama: s(r.fields.fldocxJbZYt5nn9NS), tahap: nm(r.fields.fld04TLxwRqpdkS1V) })).filter((x) => x.nama).sort((a, b) => (a.tahap + a.nama).localeCompare(b.tahap + b.nama, 'id')),
  };
  OC = { at: Date.now(), v }; return v;
}

/* ---- siapa yang dimaksud ---- */
async function ownPerson(acc) {
  if (REC.test(acc.personId || '')) return acc.personId;
  const wa = waDigits(acc.wa);
  if (wa) { const p = await personByWa(wa, [P.nama, P.wa]); if (p) return p.id; }
  if (/@/.test(acc.email || '')) { const r = await fetchAll(PERSON, [P.nama], { filterByFormula: `LOWER({Email})='${qs(acc.email.toLowerCase())}'`, maxRecords: '1' }); if (r[0]) return r[0].id; }
  return null;
}
const canOthers = (acc) => ['Admin', 'Editor BPN'].includes(acc.peran);
const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/persekutuan\s*doa|\bpdpkk\b|\bpkk\b|\bpd\b|karismatik|katolik|paroki|santo|santa|\bsta?\b\.?|[^a-z0-9]/g, '');
const mirip = (a, b) => { const x = norm(a), y = norm(b); if (!x || !y) return false; if (x === y) return true; const [k, l] = x.length <= y.length ? [x, y] : [y, x]; return k.length >= 6 && l.includes(k); };

/* ---- bentuk data ke klien ---- */
async function shape(rec) {
  const f = rec.fields, o = await opsi();
  const [kota, par, pd] = await Promise.all([
    (f[P.kota] || [])[0] ? listByIds(KOTA, [f[P.kota][0]], [KF.nama, KF.prov]) : [],
    (f[P.paroki] || [])[0] ? listByIds(PAR, [f[P.paroki][0]], [PARF.nama]) : [],
    (f[P.pd] || [])[0] ? listByIds(PD, [f[P.pd][0]], [PDF.nama]) : [],
  ]);
  const mine = new Set(f[P.pel] || []);
  const sel = o.pelayanan.filter((g) => g.ids.some((i) => mine.has(i)));
  const foto = (f[P.foto] || [])[0];
  const wa = waDigits(f[P.wa]);
  const profil = {
    id: rec.id, nama: f[P.nama] || '', pan: f[P.pan] || '', jk: nm(f[P.jk]), tgl: f[P.tgl] || '', bln: f[P.bln] || '', thn: f[P.thn] || '', email: f[P.email] || '', wa: wa ? '+' + wa : '', alamat: f[P.alamat] || '',
    kus: (f[P.dom] || [])[0] || '', kota: kota[0] ? { id: kota[0].id, nama: kota[0].fields[KF.nama] || '', prov: kota[0].fields[KF.prov] || '' } : null,
    paroki: par[0] ? { id: par[0].id, nama: par[0].fields[PARF.nama] || '' } : null, pd: pd[0] ? { id: pd[0].id, nama: pd[0].fields[PDF.nama] || '' } : null,
    pelayanan: sel.map((g) => g.id), modulIkut: f[P.modIkut] || [], modulAjar: f[P.modAjar] || [], bab: f[P.bab] || [],
    kategori: nm(f[P.kategori]), baptis: nm(f[P.baptis]), krisma: nm(f[P.krisma]), size: nm(f[P.size]),
    foto: foto ? ((foto.thumbnails && foto.thumbnails.large && foto.thumbnails.large.url) || foto.url) : '',
  };
  return { profil, kurang: kurang(f, sel.map((g) => g.nama)) };
}
const readPerson = async (id) => (await listByIds(PERSON, [id], FULL))[0];

/* ---- laporan ke Sekretariat/Admin ---- */
async function lapor(jenis, ket, oleh) {
  try { await create(ANT, { fldtshIUwxtOZb6iZ: jenis, fldeWR6AslvMqxJnI: ket, fldKUnqfi9Z7Qi4Fx: oleh }); } catch (e) { console.error('antrian', e.message); }
  await kirimAdmin(`[BPN PKKI] ${jenis}`, `${ket}\n\nDicatat oleh: ${oleh}\n\nData ini sudah masuk ke sistem. Mohon dicek oleh Sekretariat/Admin (tabel "Antrian Verifikasi" di Airtable).`);
}

const kusList = async (kus) => (REC.test(kus || '') ? kus : '');
async function pdByKus(kus) { return (await fetchAll(PD, [PDF.nama, PDF.kus, PDF.jenis, PDF.koord, PDF.koordNama])).filter((r) => (r.fields[PDF.kus] || []).includes(kus)); }

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const sess = getSession(req);
  const acc = sess && (await A.getAccess(sess).catch(() => null));
  if (!acc) return bad(res, 'Belum login', 401);
  if (acc.mustChange || acc.pending) return bad(res, 'Akun belum aktif', 403);
  try {
    const b = req.method === 'POST' ? (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}) : {};
    const q = req.query || {}, act = String(b.act || q.act || '');
    if (req.method === 'GET' && act === 'analitik') { // data untuk menu Modul Berjenjang & Data Umat
      if (!A.can(acc, 'modul') && !A.can(acc, 'umat')) return bad(res, 'Tidak diizinkan', 403);
      return res.json(await analitik(acc));
    }
    const own = await ownPerson(acc);
    const want = String(b.id || q.id || '');
    let pid = own;
    if (want && want !== own) { if (!canOthers(acc)) return bad(res, 'Anda hanya boleh melihat/mengubah profil Anda sendiri', 403); if (!REC.test(want)) return bad(res, 'ID tidak valid'); pid = want; }
    const milik = pid === own;

    /* ---- pilihan dinamis ---- */
    if (req.method === 'GET' && act === 'kota') {
      const t = s(q.q).toLowerCase(); if (t.length < 2) return res.json({ kota: [] });
      const rows = await fetchAll(KOTA, [KF.nama, KF.prov], { filterByFormula: `SEARCH('${qs(t)}', LOWER({Nama KotaKabupaten}))`, maxRecords: '15' });
      return res.json({ kota: rows.map((r) => ({ id: r.id, nama: r.fields[KF.nama] || '', prov: r.fields[KF.prov] || '' })) });
    }
    if (req.method === 'GET' && act === 'paroki') {
      const kus = await kusList(q.kus); if (!kus) return res.json({ paroki: [] });
      const rows = (await fetchAll(PAR, [PARF.nama, PARF.kus])).filter((r) => (r.fields[PARF.kus] || []).includes(kus));
      return res.json({ paroki: rows.map((r) => ({ id: r.id, nama: s(r.fields[PARF.nama]) })).filter((x) => x.nama).sort((a, c) => a.nama.localeCompare(c.nama, 'id')) });
    }
    if (req.method === 'GET' && act === 'pd') {
      const kus = await kusList(q.kus); if (!kus) return res.json({ pd: [] });
      const rows = await pdByKus(kus);
      return res.json({ pd: rows.map((r) => ({ id: r.id, nama: s(r.fields[PDF.nama]), jenis: nm(r.fields[PDF.jenis]), koord: [].concat(r.fields[PDF.koordNama] || []).join(', ') })).filter((x) => x.nama).sort((a, c) => a.nama.localeCompare(c.nama, 'id')) });
    }

    if (!pid) return bad(res, 'Akun Anda belum tertaut ke data umat. Hubungi Admin BPN.', 404);

    /* ---- baca ---- */
    if (req.method === 'GET') {
      const rec = await readPerson(pid); if (!rec) return bad(res, 'Data umat tidak ditemukan', 404);
      const sh = await shape(rec);
      if (act === 'ringkas') return res.json({ kurang: sh.kurang, lengkap: !sh.kurang.length });
      const o = await opsi();
      return res.json({ ...sh, milik, opsi: { ...OPSI, keuskupan: o.keuskupan, pelayanan: o.pelayanan, modul: o.modul } });
    }
    if (req.method !== 'POST') return bad(res, 'Metode tidak diizinkan', 405);

    /* ---- simpan data ---- */
    if (act === 'simpan') {
      const d = b.data || {}, fl = {}, has = (k) => Object.prototype.hasOwnProperty.call(d, k);
      const ids = (v) => (Array.isArray(v) ? v.filter((x) => REC.test(x)) : []);
      const one = (v) => (REC.test(v || '') ? [v] : []);
      const pick = (v, list, label) => { v = s(v); if (v && !list.includes(v)) throw Object.assign(new Error(label + ' tidak valid'), { status: 400 }); return v || null; };
      if (has('nama')) { const v = s(d.nama); if (v.length < 2) return bad(res, 'Nama lengkap wajib diisi'); fl[P.nama] = v; }
      if (has('pan')) fl[P.pan] = s(d.pan, 60) || null;
      if (has('jk')) fl[P.jk] = pick(d.jk, OPSI.jk, 'Jenis kelamin');
      if (has('email')) { const v = s(d.email).toLowerCase(); if (v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return bad(res, 'Email tidak valid'); fl[P.email] = v || null; }
      if (has('alamat')) fl[P.alamat] = s(d.alamat, 300) || null;
      if (has('tgl') || has('bln') || has('thn')) {
        const t = +d.tgl, bl = +d.bln, th = +d.thn;
        if (!t && !bl && !th) { fl[P.tgl] = null; fl[P.bln] = null; fl[P.thn] = null; }
        else { const dt = new Date(Date.UTC(th, bl - 1, t)); if (!(th >= 1900 && th <= new Date().getFullYear() && bl >= 1 && bl <= 12 && dt.getUTCDate() === t)) return bad(res, 'Tanggal lahir tidak valid'); fl[P.tgl] = t; fl[P.bln] = bl; fl[P.thn] = th; }
      }
      if (has('kus')) fl[P.dom] = one(d.kus);
      if (has('kota')) fl[P.kota] = one(d.kota);
      if (has('paroki')) fl[P.paroki] = one(d.paroki);
      if (has('pd')) fl[P.pd] = one(d.pd);
      if (has('kategori')) fl[P.kategori] = pick(d.kategori, OPSI.kategori, 'Kategori');
      if (has('baptis')) fl[P.baptis] = pick(d.baptis, OPSI.sakramen, 'Sakramen Baptis');
      if (has('krisma')) fl[P.krisma] = pick(d.krisma, OPSI.sakramen, 'Sakramen Krisma');
      if (has('size')) fl[P.size] = pick(d.size, OPSI.size, 'Ukuran baju');
      if (has('modulIkut')) fl[P.modIkut] = ids(d.modulIkut);
      if (has('pelayanan')) {
        const o = await opsi(), chosen = o.pelayanan.filter((g) => ids(d.pelayanan).includes(g.id));
        fl[P.pel] = chosen.flatMap((g) => [g.id]);
        if (!pengajar(chosen.map((g) => g.nama))) { fl[P.modAjar] = []; if (TAMPIL_BAB) fl[P.bab] = []; }
      }
      if (has('modulAjar') && fl[P.modAjar] === undefined) fl[P.modAjar] = ids(d.modulAjar);
      if (TAMPIL_BAB && has('bab') && fl[P.bab] === undefined) fl[P.bab] = (Array.isArray(d.bab) ? d.bab : []).filter((x) => OPSI.bab.includes(x));
      if (!Object.keys(fl).length) return bad(res, 'Tidak ada yang diubah');
      await update(PERSON, pid, fl); ulangAnalitik();
      console.log('profil simpan', acc.email, milik ? 'sendiri' : 'orang lain ' + pid, Object.keys(fl).length, 'field');
      const sh = await shape(await readPerson(pid));
      return res.json({ ok: true, ...sh });
    }

    /* ---- foto ---- */
    if (act === 'foto') {
      const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(b.file || ''));
      if (!m) return bad(res, 'Format foto harus JPG, PNG atau WebP');
      if (m[2].length > 3.6e6) return bad(res, 'Foto terlalu besar (maksimal sekitar 2,5 MB)');
      const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[m[1]];
      const r = await fetch(`https://content.airtable.com/v0/${BASE}/${pid}/${P.foto}/uploadAttachment`, {
        method: 'POST', headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: m[1], file: m[2], filename: `profil-${pid}.${ext}` }), signal: AbortSignal.timeout(20000),
      });
      if (!r.ok) { console.error('foto', r.status, (await r.text().catch(() => '')).slice(0, 160)); return bad(res, 'Gagal mengunggah foto', 502); }
      const j = await r.json(); const all = (j.fields && j.fields[P.foto]) || [];
      if (all.length > 1) await update(PERSON, pid, { [P.foto]: [{ id: all[all.length - 1].id }] }); // hanya simpan foto terbaru
      ulangAnalitik();
      const sh = await shape(await readPerson(pid));
      return res.json({ ok: true, ...sh });
    }

    /* ---- PD baru (cek duplikat, gabungkan bila sudah ada) ---- */
    if (act === 'pdbaru') {
      const d = b.data || {}, nama = s(d.nama, 120), kus = await kusList(d.kus), kn = s(d.koordNama, 120), kw = waDigits(d.koordWa), jenis = s(d.jenis);
      if (nama.length < 3) return bad(res, 'Nama PD wajib diisi'); if (!kus) return bad(res, 'Pilih keuskupan PD'); if (!OPSI.jenisPd.includes(jenis)) return bad(res, 'Pilih jenis PD');
      if (kn.length < 3) return bad(res, 'Nama koordinator PD wajib diisi'); if (!kw) return bad(res, 'Nomor WhatsApp koordinator tidak valid');
      const kusNama = ((await listByIds(BPK, [kus], ['fldxvUJvguk6J81mP']))[0] || { fields: {} }).fields.fldxvUJvguk6J81mP || '';
      const oleh = `${acc.nama} (${acc.peran})`;
      // koordinator: pakai yang sudah ada (cocok nomor WA), bila belum ada baru dibuat
      let koord = await personByWa(kw, [P.nama, P.wa]), koordBaru = false;
      if (!koord) { koord = await create(PERSON, { [P.nama]: kn, [P.wa]: '+' + kw, [P.dom]: [kus] }); koordBaru = true; }
      const ada = (await pdByKus(kus)).find((r) => mirip(r.fields[PDF.nama], nama));
      if (ada) {
        if (!(ada.fields[PDF.koord] || []).length) await update(PD, ada.id, { [PDF.koord]: [koord.id] });
        if (koordBaru) await lapor('Koordinator PD baru (PD sudah ada)', `Koordinator baru "${kn}" (WA +${kw}) ditautkan ke PD yang sudah ada: ${s(ada.fields[PDF.nama])} (${s(kusNama)}). Data koordinator baru dibuat di data umat.`, oleh);
        return res.json({ ok: true, digabung: true, pd: { id: ada.id, nama: s(ada.fields[PDF.nama]) } });
      }
      const baru = await create(PD, { [PDF.nama]: nama, [PDF.kus]: [kus], [PDF.jenis]: jenis, [PDF.koord]: [koord.id] });
      await lapor('PD baru didaftarkan', `PD baru: ${nama} (${s(kusNama)}), ${jenis}.\nKoordinator: ${kn}, WA +${kw}${koordBaru ? ' (orang baru di data umat)' : ' (sudah ada di data umat)'}.`, oleh);
      return res.json({ ok: true, digabung: false, pd: { id: baru.id, nama } });
    }

    /* ---- paroki baru ---- */
    if (act === 'parokibaru') {
      const d = b.data || {}, nama = s(d.nama, 120), kus = await kusList(d.kus);
      if (nama.length < 3) return bad(res, 'Nama paroki wajib diisi'); if (!kus) return bad(res, 'Pilih keuskupan');
      const ada = (await fetchAll(PAR, [PARF.nama, PARF.kus])).find((r) => (r.fields[PARF.kus] || []).includes(kus) && mirip(r.fields[PARF.nama], nama));
      if (ada) return res.json({ ok: true, digabung: true, paroki: { id: ada.id, nama: s(ada.fields[PARF.nama]) } });
      const kusNama = ((await listByIds(BPK, [kus], ['fldxvUJvguk6J81mP']))[0] || { fields: {} }).fields.fldxvUJvguk6J81mP || '';
      const baru = await create(PAR, { [PARF.nama]: nama, [PARF.kus]: [kus] });
      await lapor('Paroki baru didaftarkan', `Paroki baru: ${nama} (${s(kusNama)}).`, `${acc.nama} (${acc.peran})`);
      return res.json({ ok: true, digabung: false, paroki: { id: baru.id, nama } });
    }
    return bad(res, 'Aksi tidak dikenal');
  } catch (e) {
    if (e.status === 400) return bad(res, e.message);
    console.error('profil error', e.message);
    return bad(res, 'Terjadi kesalahan server', 500);
  }
};
