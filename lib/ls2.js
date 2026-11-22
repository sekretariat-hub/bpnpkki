// Learning System Tahap 2: syarat TC, pendaftaran umat, persetujuan bertingkat (BPK → BPNH), penempatan kelompok,
// tab Peserta (belajar, tonton, upload tugas) dan Laporan BPK. Dipasang oleh lib/ls.js (fungsi pabrik, menerima konteks).
const AT = require('./airtable');
const A = require('./access');
const PRF = require('./profil');
const mail = require('./mail');

const PD = { t: 'tbl65eRLE2SFQA3T1', nama: 'fldZyycJSfRucpn0y', event: 'fldAEwH0Xl9UjErat', person: 'fldzofavS7RGbaMwG', email: 'fldRrdtv2gA5bAaNA', wa: 'fldfbOF7W0riMN2mj', keus: 'flddE3nGVbjm8D1fv', bpk: 'fld5U8gLL3rEcBmY9', status: 'fldfTkt8nj77R5GUk', catBpk: 'fldQhNCyWD2KA6Un4', catBnh: 'fldlnpku2CxEvUok6', olehBpk: 'fldySQvf4ZVXaNtgF', olehBnh: 'fldTs4pXR1D9idRAV', surat: 'fldowSkT0H2WXchRD', kel: 'fld9Xppl0lSwixsvX', head: 'fldPeoDNgjoQWcMtN', syarat: 'fldwg9bnIKN2GojeE', dibuat: 'fldTUJSlxRqW44m7r', hid: 'fldD03tp8UsbjgOzU' };
const PDF = Object.entries(PD).filter(([k]) => k !== 't').map(([, v]) => v); // t = ID tabel, bukan kolom
const S = { t: 'tbl8L2QXGo4JxNZoa', nama: 'fld8bWf2gsyalr3dL', wa: 'fldNw345rFOlxiDXJ', email: 'fldtkhpX9BXkrstuO', keus: 'fldL1c8FzDMnE4zp7', bpnId: 'fldvJ6ELYK9yPC7fS', peserta: 'fldso29fhkXXt1HUk' };
const PS = { t: 'tbl94oRZaOLQh6soM', nama: 'fldqFyN5uFWNZJ7UX', orang: 'fldVJdwv2PpippJWp', event: 'fldM9aKUoqkCPRN9k', kel: 'fldmU0gJ59ZioXJfc' };
const KL = { t: 'tblqTpioUtS9Zzqp6', id: 'fld2EtU9Ud508pnGh', mentor: 'fldd8ytgTAoieoEH0' };
const BPN = { person: 'tbl21zOSogH7Anlu2', modul: 'tblymcTBL1pjIMa4A', modulNama: 'fldocxJbZYt5nn9NS', pel: 'tblTzNOMyrh4iF8MA', pelNama: 'fldBHtlKeydYGUfPo', bpk: 'tblgj0UYB9w7UWWnv', bpkNama: 'fldxvUJvguk6J81mP', pej: 'tblGR9a8J4UOyJGep', pejBpk: 'fldrGASVYBRTS7v8o', pejOrang: 'fldCYWlWFYtnkjv6Z', pejJab: 'fldAsSxbg8bZRkrru', pejStatus: 'fldyWZFFnXeN8CMlk', jab: 'tbldxeUpwRdy3ghib', jabNama: 'fld1D1ejz3qnx7A8h' };
const RU = { dinilai: 'fldpGgN8hWjwx3qS1', boleh: 'fldHhejUuScbu6FOZ', damping: 'fldZnfwVe2R5CWm1q' };
const MAXB64 = 4_000_000; // Vercel membatasi isi permintaan ±4,5 MB, jadi berkas ±3 MB
const MIME = ['application/pdf', 'image/jpeg', 'image/png'];

module.exports = (c) => {
  const { db, T, H, D, K, E, arr, nm, q, REC, origin, bad, emailOf } = c;
  const ACT = {}, POST = {};
  const list = (v) => [].concat(v || []).filter(Boolean);

  // ---- syarat ----
  const parseSyarat = (s) => { try { const o = JSON.parse(s || '{}'); return o && typeof o === 'object' ? o : {}; } catch { return {}; } };
  const cleanSyarat = (b = {}) => {
    const n = (v) => (v === '' || v == null || !isFinite(Number(v)) ? null : Math.max(0, Math.min(120, Math.round(Number(v)))));
    const o = { modul: list(b.modul).map((x) => String(x).slice(0, 120)).slice(0, 20), usiaMin: n(b.usiaMin), usiaMax: n(b.usiaMax), jk: ['Pria', 'Wanita'].includes(b.jk) ? b.jk : '', bpk: list(b.bpk).filter((x) => REC.test(x)).slice(0, 80), pewarta: !!b.pewarta, surat: !!b.surat };
    return o;
  };
  async function profilOf(acc) {
    const pid = acc.personId;
    if (!REC.test(pid || '')) return null;
    const [p] = await AT.listByIds(BPN.person, [pid], Object.values(PRF.P));
    if (!p) return null;
    const f = p.fields, P = PRF.P;
    const [mods, pels, bpks] = await Promise.all([
      AT.listByIds(BPN.modul, list(f[P.modIkut]), [BPN.modulNama]), AT.listByIds(BPN.pel, list(f[P.pel]), [BPN.pelNama]), AT.listByIds(BPN.bpk, list(f[P.dom]), [BPN.bpkNama]),
    ]);
    const y = Number(f[P.thn]), m = Number(f[P.bln]), d = Number(f[P.tgl]);
    let usia = null;
    if (y && m && d) { const t = new Date(); usia = t.getFullYear() - y - (t.getMonth() + 1 < m || (t.getMonth() + 1 === m && t.getDate() < d) ? 1 : 0); }
    return { id: p.id, f, nama: String(f[P.nama] || '').trim(), email: String(f[P.email] || '').trim().toLowerCase(), wa: String(f[P.wa] || ''), jk: nm(f[P.jk]), usia, modul: mods.map((r) => String(r.fields[BPN.modulNama] || '')), pel: pels.map((r) => String(r.fields[BPN.pelNama] || '')), bpkIds: list(f[P.dom]), bpkNama: bpks.map((r) => String(r.fields[BPN.bpkNama] || '').trim()).join(', ') };
  }
  // Hasil pemeriksaan syarat: wajib untuk semua TC + syarat tambahan dari pembuat TC.
  function cek(pf, sy = {}) {
    const items = [], add = (label, ok, info = '') => items.push({ label, ok: !!ok, info });
    const kurang = PRF.kurang(pf.f, pf.pel);
    add('Data profil lengkap', !kurang.length, kurang.length ? 'Belum diisi: ' + kurang.join(', ') : '');
    add('Sakramen Baptis dan Krisma terisi', nm(pf.f[PRF.P.baptis]) && nm(pf.f[PRF.P.krisma]), 'Lengkapi di Profil Saya');
    add('Sudah mengikuti SHDR', pf.modul.some((x) => /shdr/i.test(x)), 'Isi modul yang pernah diikuti di Profil Saya');
    (sy.modul || []).forEach((m) => add(`Sudah mengikuti modul ${m}`, pf.modul.some((x) => x.toLowerCase() === m.toLowerCase())));
    if (sy.usiaMin != null || sy.usiaMax != null) add(`Usia ${sy.usiaMin ?? 0}–${sy.usiaMax ?? '∞'} tahun`, pf.usia != null && (sy.usiaMin == null || pf.usia >= sy.usiaMin) && (sy.usiaMax == null || pf.usia <= sy.usiaMax), pf.usia == null ? 'Tanggal lahir belum diisi' : `Usia Anda ${pf.usia}`);
    if (sy.jk) add(`Jenis kelamin ${sy.jk}`, pf.jk === sy.jk);
    if ((sy.bpk || []).length) add('Berasal dari BPK yang ditentukan', pf.bpkIds.some((i) => sy.bpk.includes(i)), `Keuskupan Anda: ${pf.bpkNama || '–'}`);
    if (sy.pewarta) add('Melayani sebagai pewarta / pengajar', PRF.pengajar(pf.pel), 'Tambahkan pelayanan di Profil Saya');
    if (sy.surat) add('Surat rekomendasi Pastor Moderator / paroki', true, 'Diunggah saat mendaftar (PDF/JPG/PNG, maks ±3 MB)');
    return { items, ok: items.every((x) => x.ok) };
  }
  const evView = (r) => ({ id: r.id, nama: String(r.fields[E.nama] || '').trim(), mulai: r.fields[E.mulai] || '', selesai: r.fields[E.selesai] || '', daftar: nm(r.fields[E.daftar]) || 'Ditutup', syarat: parseSyarat(r.fields[E.syarat]) });
  const pdView = (r, evn) => { const f = r.fields; return { id: r.id, nama: f[PD.nama] || '', event: arr(f[PD.event])[0] || '', eventNama: evn[arr(f[PD.event])[0]] || '', email: f[PD.email] || '', wa: f[PD.wa] || '', keus: f[PD.keus] || '', bpk: f[PD.bpk] || '', status: nm(f[PD.status]), catBpk: f[PD.catBpk] || '', catBnh: f[PD.catBnh] || '', suratUrl: ((f[PD.surat] || [])[0] || {}).url || '', suratNama: ((f[PD.surat] || [])[0] || {}).filename || '', kelompok: arr(f[PD.kel])[0] || '', head: f[PD.hid] || '', syarat: parseSyarat(f[PD.syarat]), dibuat: f[PD.dibuat] || '' }; };
  const events = async () => Object.fromEntries((await db().fetchAll(T.event, Object.values(E))).map((r) => [r.id, r]));

  // ---- opsi pembuat TC (modul dan BPK untuk syarat) ----
  ACT.opsi = async (acc, req, res) => {
    if (!A.can(acc, 'ls/tc')) return bad(res, 403, 'Tidak punya akses');
    const [m, b] = await Promise.all([AT.fetchAll(BPN.modul, [BPN.modulNama]), AT.fetchAll(BPN.bpk, [BPN.bpkNama])]);
    res.status(200).json({ modul: m.map((r) => String(r.fields[BPN.modulNama] || '').trim()).filter(Boolean).sort((a, z) => a.localeCompare(z, 'id')), bpk: b.map((r) => ({ id: r.id, nama: String(r.fields[BPN.bpkNama] || '').trim() })).filter((x) => x.nama).sort((a, z) => a.nama.localeCompare(z.nama, 'id')) });
  };
  POST.syaratsave = async (acc, req, res, b) => {
    if (!A.can(acc, 'ls/tc', 2)) return bad(res, 403, 'Tidak punya akses');
    if (!REC.test(b.id || '')) return bad(res, 400, 'TC tidak valid');
    await db().update(T.event, b.id, { [E.syarat]: JSON.stringify(cleanSyarat(b.syarat)) });
    res.status(200).json({ ok: true });
  };

  // ---- pendaftaran umat ----
  ACT.daftarlist = async (acc, req, res) => {
    if (!A.can(acc, 'ls/peserta')) return bad(res, 403, 'Tidak punya akses');
    const pf = await profilOf(acc);
    if (!pf) return res.status(200).json({ tanpaProfil: true, tc: [], mine: [] });
    const ev = await events();
    const mine = (await db().fetchAll(T.pend || PD.t, PDF, { filterByFormula: `{Person BPN}='${q(pf.id)}'` })).map((r) => pdView(r, Object.fromEntries(Object.entries(ev).map(([i, r2]) => [i, String(r2.fields[E.nama] || '')]))));
    const tc = Object.values(ev).map(evView).filter((e) => e.daftar === 'Dibuka' || mine.some((m) => m.event === e.id)).map((e) => ({ ...e, cek: cek(pf, e.syarat), mine: mine.find((m) => m.event === e.id && !/^Ditolak/.test(m.status)) || mine.find((m) => m.event === e.id) || null }));
    res.status(200).json({ tc, focus: String(req.query.tc || ''), nama: pf.nama });
  };
  POST.daftar = async (acc, req, res, b) => {
    if (!A.can(acc, 'ls/peserta', 2)) return bad(res, 403, 'Tidak punya akses');
    if (!REC.test(b.event || '')) return bad(res, 400, 'TC tidak valid');
    const pf = await profilOf(acc);
    if (!pf) return bad(res, 400, 'Akun Anda belum terhubung ke data umat (M-Person)');
    const [e] = await db().listByIds(T.event, [b.event], Object.values(E));
    if (!e || nm(e.fields[E.daftar]) !== 'Dibuka') return bad(res, 400, 'Pendaftaran TC ini ditutup');
    const ev = evView(e), hasil = cek(pf, ev.syarat);
    if (!hasil.ok) return bad(res, 400, 'Syarat belum terpenuhi: ' + hasil.items.filter((x) => !x.ok).map((x) => x.label).join('; '));
    const ada = await db().fetchAll(PD.t, PDF, { filterByFormula: `{Person BPN}='${q(pf.id)}'` });
    if (ada.some((r) => arr(r.fields[PD.event])[0] === b.event && !/^Ditolak/.test(nm(r.fields[PD.status])))) return bad(res, 400, 'Anda sudah mendaftar TC ini');
    const sr = b.surat;
    if (ev.syarat.surat) {
      if (!sr || !sr.data) return bad(res, 400, 'Unggah surat rekomendasi Pastor Moderator / paroki');
      if (!MIME.includes(sr.type)) return bad(res, 400, 'Surat harus berformat PDF, JPG, atau PNG');
      if (String(sr.data).length > MAXB64) return bad(res, 400, 'Ukuran surat terlalu besar (maks ±3 MB)');
    }
    const r = await db().create(PD.t, { [PD.nama]: pf.nama, [PD.event]: [b.event], [PD.person]: pf.id, [PD.email]: pf.email, [PD.wa]: pf.wa, [PD.keus]: pf.bpkNama, [PD.bpk]: pf.bpkIds[0] || '', [PD.status]: 'Menunggu BPK', [PD.syarat]: JSON.stringify(hasil.items) });
    if (ev.syarat.surat) await db().upload(PD.t, r.id, PD.surat, String(sr.name || 'surat').slice(0, 80), sr.type, sr.data);
    mail.kirim(await koordEmails(pf.bpkIds[0]), `Pendaftar baru TC: ${ev.nama}`, `${pf.nama} (${pf.bpkNama}) mendaftar ${ev.nama} dan menunggu persetujuan Koordinator BPK / PIC Pewartaan.\n\nBuka ${origin()}/#/ls/pendaftar untuk menyetujui atau menolak.`).catch(() => {});
    res.status(200).json({ ok: true, id: r.id });
  };

  // ---- email Koordinator BPK / PIC (aktif) suatu BPK ----
  async function koordEmails(bpkId) {
    if (!REC.test(bpkId || '')) return [];
    const pej = (await AT.fetchAll(BPN.pej, [BPN.pejBpk, BPN.pejOrang, BPN.pejJab, BPN.pejStatus])).filter((r) => list(r.fields[BPN.pejBpk]).includes(bpkId) && /aktif/i.test(nm(r.fields[BPN.pejStatus])) && !/tidak/i.test(nm(r.fields[BPN.pejStatus])));
    const jab = await AT.listByIds(BPN.jab, pej.flatMap((r) => list(r.fields[BPN.pejJab])), [BPN.jabNama]);
    const jn = Object.fromEntries(jab.map((j) => [j.id, String(j.fields[BPN.jabNama] || '')]));
    const pakai = pej.filter((r) => { const names = list(r.fields[BPN.pejJab]).map((i) => jn[i]).join(' '); return !names || /koord|pic/i.test(names); });
    const ppl = await AT.listByIds(BPN.person, pakai.flatMap((r) => list(r.fields[BPN.pejOrang])), [PRF.P.email]);
    return ppl.map((p) => p.fields[PRF.P.email]).filter(Boolean);
  }

  // ---- persetujuan ----
  const bpkScope = (acc, bpk) => !acc.bpkIds || acc.bpkIds.includes(bpk);
  // Tahap BPK hanya oleh Koordinator/PIC BPK keuskupan itu (atau Admin sebagai cadangan); tim BPNH tidak melompati tahap ini.
  const bisaBpk = (acc, bpk) => A.can(acc, 'ls/pendaftar', 2) && (acc.bpkIds ? acc.bpkIds.includes(bpk) : A.can(acc, 'admin', 2));
  ACT.pendaftar = async (acc, req, res) => {
    if (!A.can(acc, 'ls/pendaftar')) return bad(res, 403, 'Tidak punya akses');
    const ev = await events(), evn = Object.fromEntries(Object.entries(ev).map(([i, r]) => [i, String(r.fields[E.nama] || '')]));
    const rows = (await db().fetchAll(PD.t, PDF)).map((r) => pdView(r, evn)).filter((x) => bpkScope(acc, x.bpk)).sort((a, z) => String(z.dibuat).localeCompare(String(a.dibuat)));
    const bnh = A.can(acc, 'ls/tc', 2), bpkOk = true;
    const out = { rows: rows.map((x) => ({ ...x, bisaBpk: bisaBpk(acc, x.bpk) && x.status === 'Menunggu BPK', bisaBnh: bnh && x.status === 'Disetujui BPK' })), bnh, kelompok: [] };
    if (bnh) out.kelompok = (await db().fetchAll(KL.t, [KL.id, KL.mentor])).map((r) => ({ id: r.id, nama: String(r.fields[KL.id] || '').trim(), mentor: arr(r.fields[KL.mentor]).join(', ') })).sort((a, z) => a.nama.localeCompare(z.nama, 'id', { numeric: true }));
    res.status(200).json(out);
  };
  POST.putus = async (acc, req, res, b) => {
    if (!REC.test(b.id || '')) return bad(res, 400, 'Pendaftar tidak valid');
    const [r] = await db().listByIds(PD.t, [b.id], PDF);
    if (!r) return bad(res, 404, 'Pendaftar tidak ditemukan');
    const st = nm(r.fields[PD.status]), setuju = b.aksi === 'setuju', cat = String(b.catatan || '').trim().slice(0, 1000), who = acc.nama || acc.email;
    if (!['setuju', 'tolak'].includes(b.aksi)) return bad(res, 400, 'Aksi tidak valid');
    if (!setuju && !cat) return bad(res, 400, 'Isi alasan penolakan');
    const evn = {}; const [e] = await db().listByIds(T.event, arr(r.fields[PD.event]), [E.nama]); if (e) evn[e.id] = String(e.fields[E.nama] || '');
    const v = pdView(r, evn);
    if (st === 'Menunggu BPK') {
      if (!bisaBpk(acc, v.bpk)) return bad(res, 403, 'Hanya Koordinator BPK / PIC Pewartaan keuskupan peserta yang boleh memutuskan');
      await db().update(PD.t, b.id, { [PD.status]: setuju ? 'Disetujui BPK' : 'Ditolak BPK', [PD.catBpk]: cat, [PD.olehBpk]: who });
      if (!setuju) mail.kirim(v.email, `Pendaftaran TC: ${v.eventNama}`, `Mohon maaf, pendaftaran Anda untuk ${v.eventNama} belum dapat disetujui oleh BPK keuskupan Anda.\nAlasan: ${cat}`).catch(() => {});
      return res.status(200).json({ ok: true });
    }
    if (st === 'Disetujui BPK') {
      if (!A.can(acc, 'ls/tc', 2)) return bad(res, 403, 'Hanya tim BPNH pembuat TC yang boleh memutuskan tahap ini');
      if (!setuju) { await db().update(PD.t, b.id, { [PD.status]: 'Ditolak BPNH', [PD.catBnh]: cat, [PD.olehBnh]: who }); mail.kirim(v.email, `Pendaftaran TC: ${v.eventNama}`, `Mohon maaf, pendaftaran Anda untuk ${v.eventNama} belum dapat disetujui oleh tim BPN.\nAlasan: ${cat}`).catch(() => {}); return res.status(200).json({ ok: true }); }
      if (!REC.test(b.kelompok || '')) return bad(res, 400, 'Pilih kelompok untuk peserta ini');
      const aktif = await aktifkan(r, v, b.kelompok);
      await db().update(PD.t, b.id, { [PD.status]: 'Disetujui BPNH', [PD.catBnh]: cat, [PD.olehBnh]: who, [PD.kel]: [b.kelompok], [PD.head]: [aktif.head], [PD.hid]: aktif.head });
      const kirim = await notifSetuju(v);
      return res.status(200).json({ ok: true, email: kirim });
    }
    return bad(res, 400, 'Pendaftar ini sudah diputuskan');
  };
  // Buat Peserta + LMSHeader + LMS Detail (satu per bab) di Schole.
  async function aktifkan(r, v, kelompok) {
    let [sp] = await db().fetchAll(S.t, [S.bpnId], { filterByFormula: `{RecordIDBPN}='${q(v.person || r.fields[PD.person])}'`, maxRecords: '1' });
    const pid = r.fields[PD.person];
    [sp] = sp ? [sp] : await db().fetchAll(S.t, [S.bpnId], { filterByFormula: `{RecordIDBPN}='${q(pid)}'`, maxRecords: '1' });
    if (!sp) sp = await db().create(S.t, { [S.nama]: v.nama, [S.email]: v.email, [S.keus]: v.keus, [S.bpnId]: pid });
    const pes = list(sp.fields && sp.fields[S.peserta]);
    const ada = pes.length ? (await db().listByIds(PS.t, pes, [PS.event])).find((x) => arr(x.fields[PS.event])[0] === v.event) : null;
    const peserta = ada || (await db().create(PS.t, { [PS.nama]: v.nama, [PS.orang]: [sp.id], [PS.event]: [v.event], [PS.kel]: [kelompok] }));
    if (ada) await db().update(PS.t, ada.id, { [PS.kel]: [kelompok] });
    const head = await db().create(T.head, { [H.peserta + '_link']: undefined, fldKKVN2nGgrtSgGh: [peserta.id], [H.event]: [v.event], [H.status]: 'Peserta Aktif' });
    // bab: semua Pengajaran dari Materi TC milik TC ini
    const mt = (await db().fetchAll(T.materi, ['fldoeYTjwnwDPrsum', 'fldgmrtbTVfI75ASg', 'fldkLJFiciCSuM7fP'])).filter((m) => arr(m.fields.fldkLJFiciCSuM7fP).includes(v.event) || list(m.fields.fldkLJFiciCSuM7fP).includes(v.event));
    const recs = mt.flatMap((m) => list(m.fields.fldgmrtbTVfI75ASg).map((a) => ({ [D.head]: [head.id], fldEkiMNNH2YDicRb: [a], fldz284YKI3O8tdpZ: [m.id] })));
    if (recs.length) await db().createMany(T.det, recs);
    return { head: head.id };
  }
  async function notifSetuju(v) {
    const base = `${origin()}/#/ls/peserta`;
    const p = await mail.kirim(v.email, `Pendaftaran TC disetujui: ${v.eventNama}`, `Selamat, pendaftaran Anda untuk ${v.eventNama} telah disetujui.\n\nMasuk ke ${base} untuk melihat modul dan learning path Anda.`);
    const lst = (await db().fetchAll(PD.t, PDF)).filter((x) => arr(x.fields[PD.event])[0] === v.event && x.fields[PD.bpk] === v.bpk && (nm(x.fields[PD.status]) === 'Disetujui BPNH' || x.id === v.id));
    const k = await mail.kirim(await koordEmails(v.bpk), `Peserta ${v.eventNama} dari keuskupan Anda`, `Daftar peserta ${v.eventNama} yang disetujui dari ${v.keus}:\n\n${lst.map((x) => `- ${x.fields[PD.nama]} <${x.fields[PD.email] || '-'}>`).join('\n')}`);
    return { peserta: p, koord: k };
  }

  // ---- tab Peserta: belajar ----
  ACT.belajar = async (acc, req, res) => {
    if (!A.can(acc, 'ls/peserta')) return bad(res, 403, 'Tidak punya akses');
    const email = await emailOf(acc);
    if (!email) return res.status(200).json({ kelas: [] });
    const heads = await db().fetchAll(T.head, Object.values(H), { filterByFormula: `{Email Peserta}='${q(email)}'` });
    const dets = await db().listByIds(T.det, heads.flatMap((h) => h.fields[H.det] || []), [...Object.values(D), 'fldEkiMNNH2YDicRb']);
    const ajar = await db().listByIds(T.ajar, dets.flatMap((d) => arr(d.fields.fldEkiMNNH2YDicRb)), ['fldaYBcTs6soilLJC', 'fldL8NWo3ImHsZ9sr', 'fldGYikQc0Cw5aIw6', 'fldyCkuTCggzDRksz']);
    const aj = Object.fromEntries(ajar.map((a) => [a.id, { judul: String(a.fields.fldaYBcTs6soilLJC || ''), yt: a.fields.fldL8NWo3ImHsZ9sr || '', tautan: String(a.fields.fldGYikQc0Cw5aIw6 || '').split('\n').filter(Boolean), urut: Number(a.fields.fldyCkuTCggzDRksz) || 0 }]));
    const kom = await db().fetchAll(T.kom, Object.values(K), { filterByFormula: heads.length ? `OR(${heads.map((h) => `{Header Id}='${h.id}'`).join(',')})` : 'FALSE()' }).catch(() => []);
    const kelas = heads.map((h) => {
      const bab = dets.filter((d) => arr(d.fields[D.head])[0] === h.id).map((d) => { const a = aj[arr(d.fields.fldEkiMNNH2YDicRb)[0]] || { judul: String(d.fields[D.bab] || ''), yt: '', tautan: [], urut: 0 }; return { id: d.id, ...a, selesai: !!nm(d.fields[D.status]), tugas: (d.fields[D.tugas] || []).map((t) => t.filename), izin: nm(d.fields[D.izin]), cat: d.fields[D.cat] || '' }; }).sort((a, z) => a.urut - z.urut || a.judul.localeCompare(z.judul, 'id', { numeric: true }));
      return { id: h.id, event: arr(h.fields[H.event])[0] ? String(h.fields[H.namaTC] || arr(h.fields[H.event])[0]) : '', kelompok: arr(h.fields[H.kel])[0] || '', status: nm(h.fields[H.status]), ket: h.fields[H.ket] || '', pengajar: String(h.fields[H.namaMentor] || ''), bab, komentar: kom.filter((k) => k.fields[K.hid] === h.id).map((k) => ({ tipe: nm(k.fields[K.tipe]) || 'Komentar', isi: k.fields[K.isi] || '', penulis: k.fields[K.penulis] || '', peran: nm(k.fields[K.peran]), tgl: k.fields[K.dibuat] || '', bab: arr(k.fields[K.det])[0] || '' })).sort((a, z) => String(a.tgl).localeCompare(String(z.tgl))) };
    });
    res.status(200).json({ kelas });
  };
  async function milikPeserta(acc, detId) {
    if (!REC.test(detId || '')) return null;
    const [d] = await db().listByIds(T.det, [detId], [D.head]);
    const hid = d && arr(d.fields[D.head])[0];
    if (!hid) return null;
    const [h] = await db().listByIds(T.head, [hid], [H.emailPeserta]);
    return h && String(h.fields[H.emailPeserta] || '').trim().toLowerCase() === (await emailOf(acc)) ? { d, h } : null;
  }
  POST.tonton = async (acc, req, res, b) => {
    if (!A.can(acc, 'ls/peserta', 2)) return bad(res, 403, 'Tidak punya akses');
    if (!(await milikPeserta(acc, b.detail))) return bad(res, 403, 'Bab ini bukan milik Anda');
    await db().update(T.det, b.detail, { [D.status]: b.selesai === false ? null : 'Selesai Menonton' });
    res.status(200).json({ ok: true });
  };
  POST.tugas = async (acc, req, res, b) => {
    if (!A.can(acc, 'ls/peserta', 2)) return bad(res, 403, 'Tidak punya akses');
    if (!(await milikPeserta(acc, b.detail))) return bad(res, 403, 'Bab ini bukan milik Anda');
    const f = b.file;
    if (!f || !f.data) return bad(res, 400, 'Pilih berkas tugas');
    if (!MIME.includes(f.type)) return bad(res, 400, 'Berkas harus PDF, JPG, atau PNG');
    if (String(f.data).length > MAXB64) return bad(res, 400, 'Ukuran berkas terlalu besar (maks ±3 MB)');
    await db().upload(T.det, b.detail, D.tugas, String(f.name || 'tugas').slice(0, 80), f.type, f.data);
    res.status(200).json({ ok: true });
  };


  // ---- Tahap 3: pesan peserta↔pengajar dan diskusi per TC ----
  const post = (o) => ({ id: o.id, isi: o.fields[K.isi] || '', penulis: o.fields[K.penulis] || '', peran: nm(o.fields[K.peran]), kelompok: o.fields[K.kel] || '', tgl: o.fields[K.dibuat] || '' });
  const isi2 = (b) => String(b.isi || '').trim().slice(0, 2000);
  // Hak atas kelas: peserta pemilik (email sama) atau pengajar kelompoknya / pengurus TC.
  async function kelasOf(acc, headId) {
    if (!REC.test(headId || '')) return null;
    const [h] = await db().listByIds(T.head, [headId], [H.emailPeserta, H.mentor, H.event, H.kel, H.peserta, H.namaTC]);
    if (!h) return null;
    const me = await emailOf(acc);
    const peserta = !!me && String(h.fields[H.emailPeserta] || '').trim().toLowerCase() === me;
    const pengajar = !!me && c.emails(h.fields[H.mentor]).includes(me);
    return peserta || pengajar || A.can(acc, 'ls/tc', 2) ? { h, peserta, pengajar, me } : null;
  }
  POST.pesan = async (acc, req, res, b) => {
    const isi = isi2(b); if (!isi) return bad(res, 400, 'Pesan kosong');
    const k = await kelasOf(acc, b.head); if (!k) return bad(res, 403, 'Bukan kelas Anda');
    const peran = k.peserta ? 'Peserta' : k.pengajar ? 'Pengajar' : 'Pengurus';
    await db().create(T.kom, { [K.isi]: isi, [K.tipe]: 'Pesan', [K.head]: [b.head], [K.hid]: b.head, [K.penulis]: acc.nama || acc.email, [K.email]: k.me, [K.peran]: peran });
    // pemberitahuan ke pihak lain lewat email
    const tujuan = k.peserta ? c.emails(k.h.fields[H.mentor]) : String(k.h.fields[H.emailPeserta] || '');
    const nmTC = String(k.h.fields[H.namaTC] || 'TC');
    await mail.kirim(tujuan, `Pesan baru di ${nmTC}`, `${acc.nama || acc.email} (${peran}) menulis:\n\n${isi}\n\nBalas di ${origin()}/#/ls/${k.peserta ? 'pengajar' : 'peserta'}`).catch(() => {});
    if (!k.peserta) {
      const [r] = await db().fetchAll(PD.t, [PD.wa], { filterByFormula: `{Header Id}='${q(b.head)}'`, maxRecords: '1' }).catch(() => []);
      if (r && r.fields[PD.wa]) require('./wa').kirimWa(r.fields[PD.wa], `Pesan baru dari pengajar ${nmTC}. Buka ${origin()}/#/ls/peserta`).catch(() => {});
    }
    res.status(200).json({ ok: true });
  };
  async function eventsOf(acc) {
    const me = await emailOf(acc), ids = new Set(), nama = {};
    if (me) {
      const hs = [...await db().fetchAll(T.head, [H.event, H.namaTC], { filterByFormula: `OR({Email Peserta}='${q(me)}',${c.mentorF(me)})` })];
      hs.forEach((h) => { const e = arr(h.fields[H.event])[0]; if (e) { ids.add(e); nama[e] = String(h.fields[H.namaTC] || e); } });
    }
    if (A.can(acc, 'ls/tc')) { const ev = await events(); Object.entries(ev).forEach(([i, r]) => { ids.add(i); nama[i] = String(r.fields[E.nama] || i); }); }
    return [...ids].map((id) => ({ id, nama: nama[id] }));
  }
  ACT.diskusi = async (acc, req, res) => {
    const tc = await eventsOf(acc), ev = String(req.query.event || (tc[0] && tc[0].id) || '');
    if (ev && !tc.some((x) => x.id === ev)) return bad(res, 403, 'Anda bukan bagian dari TC ini');
    const rows = ev ? await db().fetchAll(T.kom, Object.values(K), { filterByFormula: `AND({Event Id}='${q(ev)}')` }) : [];
    res.status(200).json({ tc, event: ev, posts: rows.filter((r) => nm(r.fields[K.tipe]) === 'Grup').map(post).sort((a, z) => String(a.tgl).localeCompare(String(z.tgl))) });
  };
  POST.diskusikirim = async (acc, req, res, b) => {
    const isi = isi2(b); if (!isi) return bad(res, 400, 'Tulisan kosong');
    const tc = await eventsOf(acc);
    if (!REC.test(b.event || '') || !tc.some((x) => x.id === b.event)) return bad(res, 403, 'Anda bukan bagian dari TC ini');
    const me = await emailOf(acc);
    const [h] = me ? await db().fetchAll(T.head, [H.kel, H.mentor, H.emailPeserta], { filterByFormula: `AND({Email Peserta}='${q(me)}')`, maxRecords: '1' }) : [];
    const mentor = me ? (await db().fetchAll(T.head, [H.mentor], { filterByFormula: c.mentorF(me), maxRecords: '1' }))[0] : null;
    const peran = mentor ? 'Pengajar' : h ? 'Peserta' : 'Pengurus';
    await db().create(T.kom, { [K.isi]: isi, [K.tipe]: 'Grup', [K.eid]: b.event, [K.penulis]: acc.nama || acc.email, [K.email]: me, [K.peran]: peran, [K.kel]: h ? String(arr(h.fields[H.kel])[0] || '') : '' });
    res.status(200).json({ ok: true });
  };

  // ---- Laporan untuk BPK ----
  ACT.laporan = async (acc, req, res) => {
    if (!A.can(acc, 'ls/laporan')) return bad(res, 403, 'Tidak punya akses');
    // Nama keuskupan yang boleh dilihat (null = semua). Nama di Schole sama dengan M-BPK.
    let boleh = null;
    if (acc.bpkIds) boleh = new Set((await AT.listByIds(BPN.bpk, acc.bpkIds, [BPN.bpkNama])).map((r) => String(r.fields[BPN.bpkNama] || '').trim().toLowerCase()));
    const f = [H.peserta, H.status, H.ket, H.catBpk, H.keus, H.namaTC, H.event, H.kel, H.namaMentor, RU.dinilai, RU.boleh, RU.damping];
    const ev = String(req.query.event || '');
    const heads = (await db().fetchAll(T.head, f)).filter((h) => (!boleh || boleh.has(String(h.fields[H.keus] || '').trim().toLowerCase())) && (!REC.test(ev) || arr(h.fields[H.event])[0] === ev));
    const rows = heads.map((h) => ({ id: h.id, nama: String(h.fields[H.peserta] || '').trim(), event: String(h.fields[H.namaTC] || ''), keus: String(h.fields[H.keus] || ''), kelompok: arr(h.fields[H.kel])[0] || '', pengajar: String(h.fields[H.namaMentor] || ''), status: nm(h.fields[H.status]), ket: h.fields[H.ket] || '', catBpk: h.fields[H.catBpk] || '', dinilai: Number(h.fields[RU.dinilai]) || 0, boleh: Number(h.fields[RU.boleh]) || 0, damping: Number(h.fields[RU.damping]) || 0 })).sort((a, z) => a.keus.localeCompare(z.keus, 'id') || a.nama.localeCompare(z.nama, 'id'));
    const hit = {}; rows.forEach((r) => { hit[r.status || '–'] = (hit[r.status || '–'] || 0) + 1; });
    res.status(200).json({ rows, ringkas: hit, semua: !boleh });
  };
  // Rincian satu peserta (bab yang boleh diajar + komentar) untuk laporan BPK.
  ACT.laporandetail = async (acc, req, res) => {
    if (!A.can(acc, 'ls/laporan')) return bad(res, 403, 'Tidak punya akses');
    const id = String(req.query.head || '');
    if (!REC.test(id)) return bad(res, 400, 'Peserta tidak valid');
    const [h] = await db().listByIds(T.head, [id], [H.keus, H.det]);
    if (!h) return bad(res, 404, 'Tidak ditemukan');
    if (acc.bpkIds) {
      const ok = new Set((await AT.listByIds(BPN.bpk, acc.bpkIds, [BPN.bpkNama])).map((r) => String(r.fields[BPN.bpkNama] || '').trim().toLowerCase()));
      if (!ok.has(String(h.fields[H.keus] || '').trim().toLowerCase())) return bad(res, 403, 'Peserta ini bukan dari keuskupan Anda');
    }
    const dets = (await db().listByIds(T.det, h.fields[H.det] || [], [D.bab, D.izin, D.cat, D.status])).map((r) => ({ bab: String(r.fields[D.bab] || ''), izin: nm(r.fields[D.izin]), cat: r.fields[D.cat] || '', nonton: !!nm(r.fields[D.status]) })).sort((a, z) => a.bab.localeCompare(z.bab, 'id', { numeric: true }));
    const kom = (await db().fetchAll(T.kom, Object.values(K), { filterByFormula: `{Header Id}='${q(id)}'` }).catch(() => [])).filter((k) => nm(k.fields[K.tipe]) !== 'Pesan').map((k) => ({ penulis: k.fields[K.penulis] || '', isi: k.fields[K.isi] || '', tgl: k.fields[K.dibuat] || '' }));
    res.status(200).json({ bab: dets, komentar: kom });
  };
  // Dipanggil saat pengajar meluluskan peserta: email peserta dan daftar lulus ke Koordinator BPK.
  async function notifLulus(headId) {
    const [r] = await db().fetchAll(PD.t, PDF, { filterByFormula: `{Header Id}='${q(headId)}'`, maxRecords: '1' });
    if (!r) return { peserta: false, koord: false };
    const ev = arr(r.fields[PD.event])[0], bpk = r.fields[PD.bpk];
    const [e] = await db().listByIds(T.event, [ev], [E.nama]); const en = e ? String(e.fields[E.nama] || '') : '';
    const sama = (await db().fetchAll(PD.t, PDF)).filter((x) => arr(x.fields[PD.event])[0] === ev && x.fields[PD.bpk] === bpk && REC.test(x.fields[PD.hid] || ''));
    const hs = await db().listByIds(T.head, sama.map((x) => x.fields[PD.hid]), [H.status]);
    const lulus = sama.filter((x) => nm((hs.find((h) => h.id === x.fields[PD.hid]) || { fields: {} }).fields[H.status]) === 'Lulus');
    const p = await mail.kirim(r.fields[PD.email], `Selamat, Anda lulus ${en}`, `Selamat, Anda dinyatakan lulus ${en}. Catatan pengajar dapat dilihat di ${origin()}/#/ls/peserta.`);
    const k = await mail.kirim(await koordEmails(bpk), `Peserta lulus ${en} dari keuskupan Anda`, `Peserta ${en} dari ${r.fields[PD.keus] || ''} yang lulus:\n\n${lulus.map((x) => `- ${x.fields[PD.nama]} <${x.fields[PD.email] || '-'}>`).join('\n')}\n\nCatatan dan bab yang boleh diajar: ${origin()}/#/ls/laporan`);
    return { peserta: p, koord: k };
  }
  return { ACT, POST, notifLulus, cek, cleanSyarat, parseSyarat };
};
