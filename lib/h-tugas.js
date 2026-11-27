// Proyek & Tugas Seksi: project milik seksi, to-do di dalam project, tag orang, dan komentar per tugas.
// Dipanggil dari api/proker.js (tidak menambah file di api/). Data: tabel Project Seksi, Task, Komentar Tugas.
const { fetchAll, listByIds, create, update, remove } = require('./airtable');

const TASK = 'tblpFsvyTnpzL3ghc', PRJ = 'tblWsD2Ve9llum2jD', KOM = 'tblnxHT3tqQOcBRZy', PERS = 'tbl21zOSogH7Anlu2';
const TF = { nama: 'fldry0ymZWhzbsvN7', status: 'fldFTszJpZtVvuBRs', prio: 'fldPliH590gA6RsPc', mulai: 'fldvuvrrDo3U1vSgX', tenggat: 'fldXsegGJCM9Rk065', seksi: 'fldQ62QG6uFvzHHBx', pj: 'fldNwimQQb6Ms1Rhv', proker: 'fld8x3KThExTGDr7G', projek: 'fldYwQ4Wh7xJEMy42', oleh: 'fldkJAjy7MPZdVmPe' };
const PF = { nama: 'fldEPTTfq3VGessth', seksi: 'fld3pPhXkIt8o4Pda', proker: 'flduiLSYqlTQlej8f', desk: 'fldGJy2WEfXJ6G6vm', catatan: 'fldkyyXruX5fuc4Eu', status: 'fldNmb3t0L8bWlLaX', target: 'fldsm5Kk5VESPKG9n', pj: 'fldFzY2bVgxkTLRzh', oleh: 'fldBhAn82ql1luCyV' };
const KF = { isi: 'fldTtMYKx7a4g2zks', tugas: 'fldaOCo9KXnXXRsuY', penulis: 'fldhNTuhaqkpocI71', pid: 'fldKXscjKYoGBPtHa', dibuat: 'fld98FdMqMzW9sodW' };

const STATUS = ['Belum dimulai', 'Dalam proses', 'Selesai'];
const PRIO = ['Penting & Mendesak', 'Penting & Tidak Mendesak', 'Kurang Penting & Mendesak', 'Kurang Penting & Tidak Mendesak'];
const PSTATUS = ['Direncanakan', 'Berjalan', 'Selesai', 'Ditunda'];
const REC = /^rec[A-Za-z0-9]{14}$/, DATE = /^\d{4}-\d{2}-\d{2}$/;
const nm = (v) => (v && typeof v === 'object' ? v.name || '' : v || '');
const txt = (v, n) => String(v ?? '').replace(/\r/g, '').trim().slice(0, n);
const bad = (res, m, c = 400) => res.status(c).json({ error: m });
const ids = (v, max = 12) => (Array.isArray(v) ? [...new Set(v.filter((x) => REC.test(x)))].slice(0, max) : []);
const lc = (a) => (a || []).map((x) => String(x).toLowerCase());

// Konteks hak: seksi apa yang boleh dilihat, dibuat tugasnya, dan dikelola (koordinator).
async function konteks(acc) {
  const { timScope, fresh } = require('../api/data');
  const d = await fresh(), sc = timScope(acc, d);
  const admin = sc.semua || !!(acc.imp && acc.imp.edit);
  const sl = d.seksiList || [];
  const idOf = Object.fromEntries(sl.map((x) => [x.nama.toLowerCase(), x.id])), namaOf = Object.fromEntries(sl.map((x) => [x.id, x.nama]));
  const lihat = new Set(admin ? sl.map((x) => x.id) : sc.seksi.map((n) => idOf[n.toLowerCase()]).filter(Boolean));
  const kelola = new Set(admin ? sl.map((x) => x.id) : sc.seksiEdit.map((n) => idOf[n.toLowerCase()]).filter(Boolean));
  return { d, sc, admin, lihat, kelola, namaOf, sl };
}
const aktor = (acc) => acc.nama || acc.email || ''; // saat Login sebagai: nama Super Admin yang asli

const bentukTugas = (r, orang) => {
  const f = r.fields;
  return { id: r.id, nama: txt(f[TF.nama], 300), status: nm(f[TF.status]) || 'Belum dimulai', prio: nm(f[TF.prio]) || '', mulai: f[TF.mulai] || '', tenggat: f[TF.tenggat] || '', seksi: f[TF.seksi] || [], projek: f[TF.projek] || [], proker: f[TF.proker] || [], oleh: txt(f[TF.oleh], 100), pj: (f[TF.pj] || []).map((i) => ({ id: i, nama: orang[i] || '' })) };
};
const bentukProjek = (r, orang) => {
  const f = r.fields;
  return { id: r.id, nama: txt(f[PF.nama], 300), seksi: f[PF.seksi] || [], proker: f[PF.proker] || [], desk: txt(f[PF.desk], 2000), catatan: txt(f[PF.catatan], 4000), status: nm(f[PF.status]) || 'Direncanakan', target: f[PF.target] || '', oleh: txt(f[PF.oleh], 100), pj: (f[PF.pj] || []).map((i) => ({ id: i, nama: orang[i] || '' })) };
};
async function namaOrang(idList) {
  const out = {};
  if (!idList.length) return out;
  (await listByIds(PERS, idList, ['fldVU2gofcKEhWHmB'])).forEach((r) => { out[r.id] = txt(r.fields.fldVU2gofcKEhWHmB, 120); });
  return out;
}

async function get(req, res, acc) {
  const k = await konteks(acc);
  if (req.query.komentar) {
    const tid = String(req.query.komentar);
    if (!REC.test(tid)) return bad(res, 'ID tugas tidak valid');
    const [t] = await listByIds(TASK, [tid], [TF.seksi, TF.pj]);
    if (!t || !bolehLihat(k, acc, t)) return bad(res, 'Tidak diizinkan', 403);
    const rows = await fetchAll(KOM, [KF.isi, KF.tugas, KF.penulis, KF.pid, KF.dibuat]);
    const out = rows.filter((r) => (r.fields[KF.tugas] || []).includes(tid)).map((r) => ({ id: r.id, isi: txt(r.fields[KF.isi], 2000), penulis: txt(r.fields[KF.penulis], 100), milik: !!acc.pid && r.fields[KF.pid] === acc.pid && !acc.imp, waktu: r.fields[KF.dibuat] || '' })).sort((a, b) => String(a.waktu).localeCompare(String(b.waktu)));
    return res.json({ komentar: out, hapusSemua: k.admin });
  }
  const [prjAll, tskAll] = await Promise.all([fetchAll(PRJ, Object.values(PF)), fetchAll(TASK, Object.values(TF))]);
  const projekR = prjAll.filter((r) => (r.fields[PF.seksi] || []).some((i) => k.lihat.has(i)));
  const tugasR = tskAll.filter((r) => (r.fields[TF.seksi] || []).some((i) => k.lihat.has(i)) || (acc.pid && (r.fields[TF.pj] || []).includes(acc.pid)));
  const orang = await namaOrang([...new Set([...projekR.flatMap((r) => r.fields[PF.pj] || []), ...tugasR.flatMap((r) => r.fields[TF.pj] || [])])]);
  return res.json({
    seksi: [...new Set([...k.lihat, ...tugasR.flatMap((r) => r.fields[TF.seksi] || [])])].map((id) => ({ id, nama: k.namaOf[id] || '', kelola: k.kelola.has(id) })).filter((x) => x.nama).sort((a, b) => a.nama.localeCompare(b.nama, 'id')),
    projek: projekR.map((r) => bentukProjek(r, orang)), tugas: tugasR.map((r) => bentukTugas(r, orang)),
    status: STATUS, prio: PRIO, pstatus: PSTATUS, saya: acc.pid || '',
  });
}
function bolehLihat(k, acc, r) {
  return (r.fields[TF.seksi] || []).some((i) => k.lihat.has(i)) || !!(acc.pid && (r.fields[TF.pj] || []).includes(acc.pid));
}
const bolehUbah = (k, acc, r) => {
  const f = r.fields;
  return k.admin || (f[TF.seksi] || []).some((i) => k.kelola.has(i)) || !!(acc.pid && (f[TF.pj] || []).includes(acc.pid)) || (txt(f[TF.oleh], 100) !== '' && txt(f[TF.oleh], 100) === aktor(acc));
};

async function post(req, res, acc, b) {
  if (acc.pending || acc.mustChange) return bad(res, 'Akun belum aktif', 403);
  if (acc.imp && !acc.imp.edit) return bad(res, 'Mode Login sebagai sedang lihat saja. Aktifkan "Boleh edit" di banner.', 403);
  const k = await konteks(acc), op = String(b.op || '');
  const done = () => { try { require('../api/data').invalidate(); } catch { /* abaikan */ } };
  try {
    if (op === 'projek_baru') {
      const sid = String(b.seksiId || ''), nama = txt(b.nama, 300);
      if (!nama) return bad(res, 'Nama project wajib diisi');
      if (!k.kelola.has(sid)) return bad(res, 'Hanya Koordinator Seksi/Bidang (atau Admin) yang boleh membuat project untuk seksi ini', 403);
      const f = { [PF.nama]: nama, [PF.seksi]: [sid], [PF.desk]: txt(b.desk, 2000), [PF.status]: PSTATUS.includes(b.status) ? b.status : 'Direncanakan', [PF.oleh]: aktor(acc) };
      if (DATE.test(b.target || '')) f[PF.target] = b.target;
      const pr = ids(b.proker, 3); if (pr.length) f[PF.proker] = pr;
      const pj = ids(b.pj); if (pj.length) f[PF.pj] = pj;
      const r = await create(PRJ, f); done(); console.log('projek baru', aktor(acc), r.id);
      return res.json({ ok: true, id: r.id });
    }
    if (op === 'projek_ubah') {
      const [p] = await listByIds(PRJ, [String(b.id || '')], [PF.seksi]);
      if (!p) return bad(res, 'Project tidak ditemukan', 404);
      if (!(p.fields[PF.seksi] || []).some((i) => k.kelola.has(i))) return bad(res, 'Tidak diizinkan', 403);
      const f = {}, v = b.fields || {};
      if ('nama' in v) { const n = txt(v.nama, 300); if (!n) return bad(res, 'Nama project wajib diisi'); f[PF.nama] = n; }
      if ('desk' in v) f[PF.desk] = txt(v.desk, 2000);
      if ('catatan' in v) f[PF.catatan] = txt(v.catatan, 4000);
      if ('status' in v) { if (!PSTATUS.includes(v.status)) return bad(res, 'Status tidak valid'); f[PF.status] = v.status; }
      if ('target' in v) f[PF.target] = DATE.test(v.target || '') ? v.target : null;
      if ('proker' in v) f[PF.proker] = ids(v.proker, 3);
      if ('pj' in v) f[PF.pj] = ids(v.pj);
      if (!Object.keys(f).length) return bad(res, 'Tidak ada perubahan');
      await update(PRJ, p.id, f); done(); return res.json({ ok: true });
    }
    if (op === 'tugas_baru') {
      const sid = String(b.seksiId || ''), nama = txt(b.nama, 300);
      if (!nama) return bad(res, 'Nama tugas wajib diisi');
      if (!k.lihat.has(sid)) return bad(res, 'Anda bukan anggota seksi ini', 403);
      const f = { [TF.nama]: nama, [TF.seksi]: [sid], [TF.status]: STATUS.includes(b.status) ? b.status : 'Belum dimulai', [TF.oleh]: aktor(acc) };
      if (PRIO.includes(b.prio)) f[TF.prio] = b.prio;
      if (DATE.test(b.mulai || '')) f[TF.mulai] = b.mulai;
      if (DATE.test(b.tenggat || '')) f[TF.tenggat] = b.tenggat;
      const pj = ids(b.pj); if (pj.length) f[TF.pj] = pj;
      if (b.projekId) {
        if (!REC.test(b.projekId)) return bad(res, 'Project tidak valid');
        const [p] = await listByIds(PRJ, [b.projekId], [PF.seksi, PF.proker]);
        if (!p || !(p.fields[PF.seksi] || []).includes(sid)) return bad(res, 'Project bukan milik seksi ini', 403);
        f[TF.projek] = [p.id]; if ((p.fields[PF.proker] || []).length) f[TF.proker] = p.fields[PF.proker];
      }
      const r = await create(TASK, f); done(); console.log('tugas baru', aktor(acc), r.id);
      return res.json({ ok: true, id: r.id });
    }
    if (op === 'tugas_ubah' || op === 'tugas_hapus') {
      const [t] = await listByIds(TASK, [String(b.id || '')], Object.values(TF));
      if (!t) return bad(res, 'Tugas tidak ditemukan', 404);
      if (!bolehUbah(k, acc, t)) return bad(res, 'Anda hanya boleh mengubah tugas milik Anda, yang Anda buat, atau di-tag ke Anda (Koordinator: semua tugas di seksinya)', 403);
      if (op === 'tugas_hapus') { await remove(TASK, t.id); done(); return res.json({ ok: true }); }
      const f = {}, v = b.fields || {};
      if ('nama' in v) { const n = txt(v.nama, 300); if (!n) return bad(res, 'Nama tugas wajib diisi'); f[TF.nama] = n; }
      if ('status' in v) { if (!STATUS.includes(v.status)) return bad(res, 'Status tidak valid'); f[TF.status] = v.status; }
      if ('prio' in v) { if (v.prio && !PRIO.includes(v.prio)) return bad(res, 'Prioritas tidak valid'); f[TF.prio] = v.prio || null; }
      if ('mulai' in v) f[TF.mulai] = DATE.test(v.mulai || '') ? v.mulai : null;
      if ('tenggat' in v) f[TF.tenggat] = DATE.test(v.tenggat || '') ? v.tenggat : null;
      if ('pj' in v) f[TF.pj] = ids(v.pj);
      if ('projekId' in v) {
        if (!v.projekId) f[TF.projek] = [];
        else { if (!REC.test(v.projekId)) return bad(res, 'Project tidak valid'); const [p] = await listByIds(PRJ, [v.projekId], [PF.seksi]); if (!p || !(p.fields[PF.seksi] || []).some((i) => (t.fields[TF.seksi] || []).includes(i))) return bad(res, 'Project bukan milik seksi tugas ini', 403); f[TF.projek] = [p.id]; }
      }
      if (!Object.keys(f).length) return bad(res, 'Tidak ada perubahan');
      await update(TASK, t.id, f); done(); return res.json({ ok: true });
    }
    if (op === 'komentar_tambah') {
      const isi = txt(b.isi, 2000);
      if (!isi) return bad(res, 'Komentar tidak boleh kosong');
      const [t] = await listByIds(TASK, [String(b.tugasId || '')], [TF.seksi, TF.pj]);
      if (!t || !bolehLihat(k, acc, t)) return bad(res, 'Tidak diizinkan', 403);
      const r = await create(KOM, { [KF.isi]: isi, [KF.tugas]: [t.id], [KF.penulis]: aktor(acc), [KF.pid]: acc.imp ? '' : acc.pid || '' });
      return res.json({ ok: true, id: r.id });
    }
    if (op === 'komentar_hapus') {
      const [c] = await listByIds(KOM, [String(b.id || '')], [KF.pid, KF.penulis]);
      if (!c) return bad(res, 'Komentar tidak ditemukan', 404);
      const milik = !acc.imp && !!acc.pid && c.fields[KF.pid] === acc.pid;
      if (!(k.admin || milik)) return bad(res, 'Hanya penulis atau Admin yang boleh menghapus komentar', 403);
      await remove(KOM, c.id); return res.json({ ok: true });
    }
    return bad(res, 'Aksi tidak dikenal');
  } catch (e) {
    console.error('tugas error', op, e.message);
    return bad(res, 'Gagal menyimpan ke Airtable', 502);
  }
}
module.exports = { get, post };
