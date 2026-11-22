// Learning System (data di base Schole). Dipanggil dari api/report.js lewat ?ls=<aksi>.
// Akses: menu 'ls' (tab tc, pengajar, peserta, laporan). Pengajar dikenali dari email di tabel Mentor & Petugas.
const AT = require('./airtable');
const A = require('./access');

const SCHOLE = process.env.SCHOLE_BASE_ID || 'appnbezea6uZzlSeS';
const db = () => AT.forBase(SCHOLE);
const REC = /^rec[A-Za-z0-9]{14}$/;
const T = { event: 'tbl0za6Jpd54jM4z0', materi: 'tblhWOXQqB9CKexci', ajar: 'tbluOHUoQjIjteK4V', head: 'tblZhieD2iLA6xSxa', det: 'tblHdbfsd6vT0pxp5', kom: 'tblzUHb9aEECdRTS0', mentor: 'tblmm50UE68U2eWgx' };
const E = { syarat: 'fldEXvmXr3NASHVHS', nama: 'fldeIzGCfTUgmiSKx', mulai: 'fldz0DCRxAKsIC3qz', selesai: 'flddNWXyw0CXPCv7X', materi: 'fld3Jom4Z3XGFxn3i', daftar: 'fld1CxvRThUNkqpyF', oleh: 'fldOQu7ElIO8UHlxG', status: 'fldqiwDGC93u9GE0C' };
const M = { nama: 'fldoeYTjwnwDPrsum', ajar: 'fldgmrtbTVfI75ASg', event: 'fldkLJFiciCSuM7fP' };
const P = { judul: 'fldaYBcTs6soilLJC', yt: 'fldL8NWo3ImHsZ9sr', materi: 'fldJGdVyPZaQQAeBK', tautan: 'fldGYikQc0Cw5aIw6', urut: 'fldyCkuTCggzDRksz' };
const H = { nama: 'fldAr7qWV6UqZ8rPt', status: 'flduH9BDju7FUNYjp', ket: 'fldj6YOewD5NFPGMK', event: 'fldPK70LzNQzsKnw1', peserta: 'fldl4SuNiiBEQLyo3', kel: 'fld8TfBelMkpt3byj', mentor: 'fldl95vg3BSSkSue2', namaMentor: 'fld2cse2eUl2w187O', keus: 'fldIMpXTWOpqZpVrR', catBpk: 'fldzXHgw3NeA8aO7m', lulusOleh: 'fldTHg4rNfufnw7nM', namaTC: 'fldGcKUaAeeoPZgxu', det: 'fldxME5Jftq8f07RC', emailPeserta: 'fldWYrEa3TbJ7IxTd' };
const D = { head: 'fldRkmZ12W4cP91mD', status: 'fldHE0iiUherGR6Y7', tugas: 'fldcolkXi4ceJ9bnv', izin: 'fldTAah7HCLKZnRfP', cat: 'fldOObWbyRktdb76x', oleh: 'fldaKsOuzJX8qioG6', tgl: 'fldx4LMEZ0BMpMEe9', bab: 'fld4X9x4KzYGOu2MQ', noUpload: 'fldyH6b2zem91Hsm7', mentor: 'fldiSoaLqTkmA30Ln' };
const K = { isi: 'fldPxe0YyCs9MThwS', tipe: 'fldIVfMOWuozs5FMy', head: 'fldMgwMinmgD626FN', det: 'fldZ94wusk3Ay7voX', penulis: 'fldvM8uXvGrF0nVWL', email: 'fldvvlHJltj44z7R3', peran: 'fldnqgxK9gevs098h', dibuat: 'fldiEWbimGDMALopp', hid: 'fldc2fDZiPBchtytW', eid: 'fldAOIttv6xHX12ot', kel: 'fld4huuFWy3OkJhJo' };
const IZIN = ['Boleh mengajar', 'Boleh mengajar, didampingi'];
const STATUS = ['Peserta Aktif', 'Lulus', 'Tidak Lulus', 'Mengundurkan diri'];
const nm = (v) => (v && v.name) || v || '';
const arr = (v) => [].concat(v || []).flat().map((x) => (x && x.name) || x).filter((s) => s !== '' && s != null);
const one = (v) => arr(v)[0] || '';
const q = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const origin = () => process.env.PUBLIC_URL || 'https://bpnpkki.vercel.app';
const bad = (res, c, m) => res.status(c).json({ error: m });

// ---- identitas pengajar ----
let mCache = null;
async function mentorEmails() {
  if (mCache && Date.now() - mCache.at < 10 * 60 * 1000) return mCache.v;
  const rows = await db().fetchAll(T.mentor, ['fldVqIVmzzPUzb1Ms']);
  const v = new Set(rows.flatMap((r) => arr(r.fields.fldVqIVmzzPUzb1Ms)).map((e) => String(e).trim().toLowerCase()).filter(Boolean));
  mCache = { at: Date.now(), v };
  return v;
}
async function emailOf(acc) {
  if (/@/.test(acc.email || '')) return acc.email.toLowerCase();
  if (REC.test(acc.personId || '')) {
    const r = await AT.listByIds('tbl21zOSogH7Anlu2', [acc.personId], ['fldhjOTrQfLGC6hWj']);
    return String((r[0] && r[0].fields.fldhjOTrQfLGC6hWj) || '').trim().toLowerCase();
  }
  return '';
}
const isMentor = async (acc) => { const e = await emailOf(acc); return !!e && (await mentorEmails()).has(e); };

// ---- ringkasan ----
const detView = (r) => { const f = r.fields; return { id: r.id, head: arr(f[D.head])[0], bab: String(f[D.bab] || one(f[D.bab]) || '').trim(), selesai: !!nm(f[D.status]), tugas: (f[D.tugas] || []).length, noUpload: !!f[D.noUpload], izin: nm(f[D.izin]), cat: f[D.cat] || '', oleh: f[D.oleh] || '', tgl: f[D.tgl] || '' }; };
function headView(r, dets) {
  const f = r.fields, d = dets.filter((x) => x.head === r.id);
  const total = d.length, nonton = d.filter((x) => x.selesai).length, tugas = d.filter((x) => x.tugas > 0).length;
  const dinilai = d.filter((x) => x.izin).length;
  return { id: r.id, nama: String(f[H.peserta] || '').trim(), event: one(f[H.event]) || String(f[H.namaTC] || ''), kelompok: one(f[H.kel]) || '–', keuskupan: String(f[H.keus] || ''), status: nm(f[H.status]), ket: f[H.ket] || '', catBpk: f[H.catBpk] || '', mentor: String(f[H.namaMentor] || ''),
    progres: { total, nonton, tugas, dinilai, boleh: d.filter((x) => x.izin === IZIN[0]).length, didampingi: d.filter((x) => x.izin === IZIN[1]).length }, bab: d.sort((a, b) => a.bab.localeCompare(b.bab, 'id', { numeric: true })) };
}
async function loadHeads(formula) {
  const heads = await db().fetchAll(T.head, Object.values(H), { filterByFormula: formula });
  const ids = new Set(heads.map((h) => h.id));
  // Bab diambil lewat ID yang tertaut di tiap LMSHeader (rumus Airtable tidak bisa mencocokkan ID record tertaut).
  const dets = (await db().listByIds(T.det, heads.flatMap((h) => h.fields[H.det] || []), Object.values(D))).map(detView).filter((d) => ids.has(d.head));
  return heads.map((h) => headView(h, dets));
}
async function komentar(headIds) {
  if (!headIds.length) return {};
  const f = headIds.length > 40 ? 'TRUE()' : `OR(${headIds.map((i) => `{Header Id}='${i}'`).join(',')})`;
  const rows = await db().fetchAll(T.kom, Object.values(K), { filterByFormula: f }).catch(() => []);
  const out = {};
  rows.filter((r) => nm(r.fields[K.tipe]) !== 'Grup').forEach((r) => { const h = r.fields[K.hid] || arr(r.fields[K.head])[0]; if (!h) return; (out[h] = out[h] || []).push({ id: r.id, isi: r.fields[K.isi] || '', penulis: r.fields[K.penulis] || '', peran: nm(r.fields[K.peran]), tipe: nm(r.fields[K.tipe]) || 'Komentar', bab: arr(r.fields[K.det])[0] || '', tgl: r.fields[K.dibuat] || '' }); });
  Object.values(out).forEach((l) => l.sort((a, b) => String(a.tgl).localeCompare(String(b.tgl))));
  return out;
}

// ---- aksi ----
const ACT = {
  // Daftar TC + learning path (pembuat TC)
  async tclist(acc, req, res) {
    if (!A.can(acc, 'ls/tc')) return bad(res, 403, 'Tidak punya akses');
    const [ev, mt, aj] = await Promise.all([db().fetchAll(T.event, Object.values(E)), db().fetchAll(T.materi, Object.values(M)), db().fetchAll(T.ajar, Object.values(P))]);
    const ajm = new Map(aj.map((r) => [r.id, { id: r.id, judul: String(r.fields[P.judul] || '').trim(), yt: r.fields[P.yt] || '', tautan: r.fields[P.tautan] || '', urut: Number(r.fields[P.urut]) || 0 }]));
    const mtm = new Map(mt.map((r) => [r.id, { id: r.id, nama: String(r.fields[M.nama] || '').trim(), bab: (r.fields[M.ajar] || []).map((i) => ajm.get(i)).filter(Boolean).sort((a, b) => a.urut - b.urut || a.judul.localeCompare(b.judul, 'id', { numeric: true })) }]));
    const list = ev.map((r) => ({ id: r.id, nama: String(r.fields[E.nama] || '').trim(), mulai: r.fields[E.mulai] || '', selesai: r.fields[E.selesai] || '', daftar: nm(r.fields[E.daftar]) || 'Ditutup', status: String(r.fields[E.status] || ''), oleh: r.fields[E.oleh] || '', link: `${origin()}/#/ls/daftar/${r.id}`, syarat: X.parseSyarat(r.fields[E.syarat]), materi: (r.fields[E.materi] || []).map((i) => mtm.get(i)).filter(Boolean) })).sort((a, b) => String(b.mulai).localeCompare(String(a.mulai)));
    res.status(200).json({ list, edit: A.can(acc, 'ls/tc', 2) });
  },
  async tcsave(acc, req, res, b) {
    if (!A.can(acc, 'ls/tc', 2)) return bad(res, 403, 'Anda tidak boleh membuat/mengubah TC');
    const nama = String(b.nama || '').trim().slice(0, 120);
    if (!nama) return bad(res, 400, 'Nama TC wajib diisi');
    const date = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : null);
    const f = { [E.nama]: nama, [E.mulai]: date(b.mulai), [E.selesai]: date(b.selesai), [E.daftar]: b.daftar === 'Dibuka' ? 'Dibuka' : 'Ditutup' };
    if (b.id) { if (!REC.test(b.id)) return bad(res, 400, 'ID tidak valid'); await db().update(T.event, b.id, f); return res.status(200).json({ ok: true, id: b.id }); }
    f[E.oleh] = acc.nama || acc.email;
    const r = await db().create(T.event, f);
    res.status(200).json({ ok: true, id: r.id });
  },
  async materisave(acc, req, res, b) {
    if (!A.can(acc, 'ls/tc', 2)) return bad(res, 403, 'Tidak punya akses');
    const nama = String(b.nama || '').trim().slice(0, 120);
    if (!nama) return bad(res, 400, 'Nama modul wajib diisi');
    if (b.id) { if (!REC.test(b.id)) return bad(res, 400, 'ID tidak valid'); await db().update(T.materi, b.id, { [M.nama]: nama }); return res.status(200).json({ ok: true }); }
    if (!REC.test(b.event || '')) return bad(res, 400, 'TC tidak valid');
    const r = await db().create(T.materi, { [M.nama]: nama, [M.event]: [b.event] });
    res.status(200).json({ ok: true, id: r.id });
  },
  async babsave(acc, req, res, b) {
    if (!A.can(acc, 'ls/tc', 2)) return bad(res, 403, 'Tidak punya akses');
    const judul = String(b.judul || '').trim().slice(0, 160);
    if (!judul) return bad(res, 400, 'Judul bab wajib diisi');
    const yt = String(b.yt || '').trim();
    if (yt && !/^https?:\/\//i.test(yt)) return bad(res, 400, 'Tautan video harus diawali http(s)://');
    const tautan = String(b.tautan || '').split('\n').map((x) => x.trim()).filter(Boolean);
    if (tautan.some((x) => !/^https?:\/\//i.test(x))) return bad(res, 400, 'Tautan materi harus diawali http(s)://');
    const f = { [P.judul]: judul, [P.yt]: yt || null, [P.tautan]: tautan.join('\n'), [P.urut]: Number.isFinite(Number(b.urut)) ? Number(b.urut) : 0 };
    if (b.id) { if (!REC.test(b.id)) return bad(res, 400, 'ID tidak valid'); await db().update(T.ajar, b.id, f); return res.status(200).json({ ok: true }); }
    if (!REC.test(b.materi || '')) return bad(res, 400, 'Modul tidak valid');
    f[P.materi] = [b.materi];
    const r = await db().create(T.ajar, f);
    res.status(200).json({ ok: true, id: r.id });
  },

  // Tampilan pengajar: kelompok dan peserta yang ia ajar
  async pengajar(acc, req, res) {
    if (!A.can(acc, 'ls/pengajar')) return bad(res, 403, 'Tidak punya akses');
    const email = await emailOf(acc);
    const semua = req.query.semua === '1' && A.can(acc, 'ls/tc');
    if (!semua && !(email && (await mentorEmails()).has(email))) return res.status(200).json({ mentor: false, heads: [], komentar: {}, izin: IZIN, status: STATUS });
    const f = semua ? (req.query.tc ? `SEARCH('${q(req.query.tc)}', {Nama TC})` : 'TRUE()') : `{Email Mentor}='${q(email)}'`;
    const heads = await loadHeads(f);
    res.status(200).json({ mentor: true, semua, heads, komentar: await komentar(heads.map((h) => h.id)), izin: IZIN, status: STATUS });
  },
};
// Aksi tulis pengajar: pastikan peserta memang di kelompok pengajar itu (atau pengurus dengan hak edit TC).
async function milikku(acc, headId) {
  const [h] = await AT.forBase(SCHOLE).listByIds(T.head, [headId], [H.mentor, H.status, H.det]);
  if (!h) return null;
  if (A.can(acc, 'ls/tc', 2)) return h;
  return String(h.fields[H.mentor] || '').trim().toLowerCase() === (await emailOf(acc)) ? h : null;
}
const POST = {
  async nilai(acc, req, res, b) {
    if (!A.can(acc, 'ls/pengajar', 2)) return bad(res, 403, 'Tidak punya akses');
    if (!REC.test(b.detail || '')) return bad(res, 400, 'Bab tidak valid');
    const [d] = await db().listByIds(T.det, [b.detail], [D.head]);
    const hid = d && arr(d.fields[D.head])[0];
    if (!hid || !(await milikku(acc, hid))) return bad(res, 403, 'Peserta ini bukan di kelompok Anda');
    const izin = b.izin ? String(b.izin) : null, cat = String(b.catatan || '').trim().slice(0, 2000);
    if (izin && !IZIN.includes(izin)) return bad(res, 400, 'Pilihan izin mengajar tidak valid');
    if (izin === IZIN[1] && !cat) return bad(res, 400, 'Catatan wajib diisi jika peserta boleh mengajar tapi didampingi');
    await db().update(T.det, b.detail, { [D.izin]: izin, [D.cat]: cat, [D.oleh]: await emailOf(acc) || acc.nama, [D.tgl]: new Date().toISOString() });
    res.status(200).json({ ok: true });
  },
  async lulus(acc, req, res, b) {
    if (!A.can(acc, 'ls/pengajar', 2)) return bad(res, 403, 'Tidak punya akses');
    const hd = REC.test(b.head || '') ? await milikku(acc, b.head) : null;
    if (!hd) return bad(res, 403, 'Peserta ini bukan di kelompok Anda');
    const f = {};
    if (b.status !== undefined) { if (!STATUS.includes(b.status)) return bad(res, 400, 'Status tidak valid'); f[H.status] = b.status; }
    if (b.ket !== undefined) f[H.ket] = String(b.ket).slice(0, 3000);
    if (b.catBpk !== undefined) f[H.catBpk] = String(b.catBpk).slice(0, 3000);
    if (f[H.status] === 'Lulus') {
      const dets = await db().listByIds(T.det, hd.fields[H.det] || [], [D.izin]);
      if (!dets.some((r) => nm(r.fields[D.izin]))) return bad(res, 400, 'Nilai minimal satu bab dulu sebelum meluluskan peserta');
      f[H.lulusOleh] = (await emailOf(acc)) || undefined;
    }
    if (!Object.keys(f).length) return bad(res, 400, 'Tidak ada perubahan');
    await db().update(T.head, b.head, f);
    const email = f[H.status] === 'Lulus' ? await X.notifLulus(b.head).catch((e) => { console.error('notif lulus', e.message); return null; }) : null;
    res.status(200).json({ ok: true, email });
  },
  async komentar(acc, req, res, b) {
    if (!A.can(acc, 'ls/pengajar', 2)) return bad(res, 403, 'Tidak punya akses');
    const isi = String(b.isi || '').trim().slice(0, 2000);
    if (!isi) return bad(res, 400, 'Komentar kosong');
    if (!REC.test(b.head || '') || !(await milikku(acc, b.head))) return bad(res, 403, 'Peserta ini bukan di kelompok Anda');
    const f = { [K.isi]: isi, [K.tipe]: 'Komentar', [K.head]: [b.head], [K.hid]: b.head, [K.penulis]: acc.nama || acc.email, [K.email]: await emailOf(acc), [K.peran]: 'Pengajar' };
    if (REC.test(b.detail || '')) f[K.det] = [b.detail];
    await db().create(T.kom, f);
    res.status(200).json({ ok: true });
  },
};
const X = require('./ls2')({ db, T, H, D, K, E, arr, nm, q, REC, origin, bad, emailOf: async (a) => String((await emailOf(a)) || '').toLowerCase() });
Object.assign(POST, X.POST);
Object.assign(ACT, X.ACT, POST);
const POSTX = new Set(['tcsave', 'materisave', 'babsave']);

async function handle(req, res, session) {
  const acc = await A.getAccess(session).catch(() => null);
  if (!acc) return bad(res, 401, 'Belum login');
  if (!A.can(acc, 'ls')) return bad(res, 403, 'Tidak punya akses ke Learning System');
  const act = String(req.query.ls || '');
  const fn = Object.prototype.hasOwnProperty.call(ACT, act) ? ACT[act] : null;
  if (!fn) return bad(res, 404, 'Aksi tidak dikenal');
  const isPost = Object.prototype.hasOwnProperty.call(POST, act) || POSTX.has(act);
  if (isPost && req.method !== 'POST') return bad(res, 405, 'Metode tidak diizinkan');
  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  try { await fn(acc, req, res, b); } catch (e) {
    console.error('ls error', act, e.message);
    bad(res, /Airtable 4(03|04)/.test(e.message) ? 502 : 502, /Airtable 403|Airtable 404/.test(e.message) ? 'Token Airtable belum punya akses ke base Schole' : 'Gagal memproses di Airtable');
  }
}
module.exports = { handle, isMentor, emailOf, IZIN, STATUS };
