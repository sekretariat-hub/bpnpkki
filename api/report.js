const { fetchAll } = require('../lib/airtable');
const { getSession } = require('../lib/auth');
const { countBy, sum, labels } = require('../lib/aggregate');

// ID tabel & field (base BPN PKKI)
const TBL = {
  proker: 'tblJVp60qiZ4mz40v',
  event: 'tbl9RfPcMBuYSCZa3',
  tc: 'tblDJah3ES6b3X6iG',
  kelompok: 'tbloeICJz14QqnJG2',
  mentor: 'tblIuEMevKgSOojyr',
  bpk: 'tblgj0UYB9w7UWWnv',
  pemuda: 'tblDd2aV5wLuKFdhO',
  pdpkk: 'tblhmeuR1qFHxUIId',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agust', 'Sept', 'Okt', 'Nov', 'Dec'];
const byMonth = (a, b) => MONTHS.indexOf(a.label) - MONTHS.indexOf(b.label);

let cache = { at: 0, data: null };
const TTL = 5 * 60 * 1000;

async function build() {
  const [proker, event, tc, kelompok, mentor, bpk, pemuda, pdpkk] = await Promise.all([
    fetchAll(TBL.proker, ['fldaVg9ti2zI8wqF6', 'fld3c0GcOXMa6gXgw', 'fldCLTSfeaWv6E1GF', 'fld3Ni0MS2OH7KOvu', 'fldaBt1ZeguNcnlDE', 'fldiTnCZKfaRRXXps', 'fld41sfvkh6CT1ucp', 'fldSo9KHoZeU6nelG', 'fldblxbwUjhfYl8n7', 'fldpi1SsOEeWSn3WF', 'fldgSos4roG4zcZsZ', 'fldHv5JtZ4QiMuooY']),
    fetchAll(TBL.event, ['fldo4mQ2W838CMZ9C', 'fldYFx6E3I8weFvie', 'fldgkDLZAJDdSBqDV', 'fldpmPoGy1FH35VwF', 'fldQETc0mGRk4uHqD', 'fldbwRYyovcZ0GXsP', 'fldqDXV3idfYdI20K', 'fldPBXXxceF3aLtDI', 'fldwOyQgWaZORhUe1', 'fld6Lp6m2NO8GNPyk', 'fldqjgNVLGTaSk5SV', 'fldNu3Gld4K52h8B4', 'fldkUolYEFiZ75Hql', 'fldhVuIjaEgoLlYrN']),
    fetchAll(TBL.tc, ['fldSz8dfyQ3UkzfSL', 'fldAXOS8YqNZCZ1XU', 'fldLKptgKptgyEmE4', 'fld8Wd60wjIRNX46h', 'fld5A4HPyzSnX0JBo', 'fldWYXaTXo5RxmeeN', 'fldZk6aOCfgfFZxgQ', 'fld6GKxYr7n8WM6P8']),
    fetchAll(TBL.kelompok, ['fld73CbGmZylnZU53']),
    fetchAll(TBL.mentor, ['fldhNsYlVN6Md9BNW', 'fldvXr6DjltmCWC1j']),
    fetchAll(TBL.bpk, ['fldxvUJvguk6J81mP', 'fldcvLPHh5A9E3S0G', 'fldvPkDbxZn38WFrJ', 'fldewlRQqs9ahsZFw']),
    fetchAll(TBL.pemuda, ['fldoXknZlwQWWOGEN', 'fldu13b6USXhAHtdO']),
    fetchAll(TBL.pdpkk, ['fldq43MYnCIKg34ts', 'fldzIeY3YMiHMo4ky', 'fldWcO7mYhPFpFXlA']),
  ]);

  // Peta ID record BPK -> nama keuskupan (lookup Airtable sering mengembalikan ID, bukan nama)
  const kn = {};
  bpk.forEach((r) => { const n = String(r.fields.fldxvUJvguk6J81mP || '').trim(); if (n) kn[r.id] = n; });
  const res = (v) => labels(v).map((x) => (/^rec[A-Za-z0-9]{14}$/.test(x) ? kn[x] || '' : x)).filter(Boolean);
  const one = (v) => res(v)[0] || '';
  const countNames = (rows, f) => { const m = new Map(); rows.forEach((r) => { const ls = [...new Set(res(r.fields[f]))]; (ls.length ? ls : ['(kosong)']).forEach((l) => m.set(l, (m.get(l) || 0) + 1)); }); return [...m].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value); };

  // --- Program Kerja ---
  const penerima = new Set(), pelaksana = new Set();
  proker.forEach((r) => {
    labels(r.fields.fldiTnCZKfaRRXXps).flatMap((s) => s.split(/\s*,\s*/)).forEach((x) => x && penerima.add(x));
    labels(r.fields.fld41sfvkh6CT1ucp).flatMap((s) => s.split(/\s*,\s*/)).forEach((x) => x && pelaksana.add(x));
  });
  const programKerja = {
    total: proker.length,
    anggaran: sum(proker, 'fldaBt1ZeguNcnlDE'),
    bpkTerdampak: penerima.size,
    bpkTerlibat: pelaksana.size,
    deal: proker.filter((r) => r.fields.fldHv5JtZ4QiMuooY).length,
    perBulan: countBy(proker, 'fld3c0GcOXMa6gXgw', { withEmpty: false }).sort(byMonth),
    perStatus: countBy(proker, 'fldaVg9ti2zI8wqF6'),
    perSeksi: countBy(proker, 'fldSo9KHoZeU6nelG'),
    perMetode: countBy(proker, 'fld3Ni0MS2OH7KOvu'),
    perJenis: countBy(proker, 'fldblxbwUjhfYl8n7'),
    perSumberDana: countBy(proker, 'fldpi1SsOEeWSn3WF'),
  };

  // --- Pleno & Golden Jubilee ---
  const pleno = {
    total: event.length,
    pasangan: sum(event, 'fldwOyQgWaZORhUe1'),
    menginapSendiri: sum(event, 'fldPBXXxceF3aLtDI'),
    pastor: event.filter((r) => r.fields.fldNu3Gld4K52h8B4).length,
    undanganKhusus: event.filter((r) => r.fields.fldqjgNVLGTaSk5SV).length,
    kehadiran: countBy(event, 'fldo4mQ2W838CMZ9C'),
    kelengkapanFoto: countBy(event, 'fldYFx6E3I8weFvie'),
    kategori: countBy(event, 'fld6Lp6m2NO8GNPyk'),
    transportasi: countBy(event, 'fldgkDLZAJDdSBqDV', { withEmpty: false }),
    kedatangan: countBy(event, 'fldqDXV3idfYdI20K', { withEmpty: false }),
    bawaPasangan: countBy(event, 'fldbwRYyovcZ0GXsP', { withEmpty: false }),
    rows: event.map((r) => ({ nama: one(r.fields.fldkUolYEFiZ75Hql), keuskupan: res(r.fields.fldhVuIjaEgoLlYrN).join(', '), kehadiran: one(r.fields.fldo4mQ2W838CMZ9C), foto: one(r.fields.fldYFx6E3I8weFvie), kategori: one(r.fields.fld6Lp6m2NO8GNPyk), transport: one(r.fields.fldgkDLZAJDdSBqDV), kedatangan: one(r.fields.fldqDXV3idfYdI20K), pasangan: one(r.fields.fldbwRYyovcZ0GXsP), pastor: !!r.fields.fldNu3Gld4K52h8B4 })),
  };

  // --- TC SHDR ---
  const tcData = {
    pendaftar: tc.length,
    kelompok: kelompok.length,
    mentor: mentor.length,
    statusTC: countBy(tc, 'fldSz8dfyQ3UkzfSL'),
    statusSHDR: countBy(tc, 'fld5A4HPyzSnX0JBo'),
    verifikasi: countBy(tc, 'fldWYXaTXo5RxmeeN'),
    kelompokUsia: countBy(tc, 'fld8Wd60wjIRNX46h'),
    jenisKelamin: countBy(tc, 'fldZk6aOCfgfFZxgQ'),
    perKeuskupan: countNames(tc, 'fldLKptgKptgyEmE4').slice(0, 25),
    rows: tc.map((r) => ({ nama: one(r.fields.fld6GKxYr7n8WM6P8), keuskupan: res(r.fields.fldLKptgKptgyEmE4).join(', '), statusTC: one(r.fields.fldSz8dfyQ3UkzfSL), statusSHDR: one(r.fields.fld5A4HPyzSnX0JBo), verifikasi: one(r.fields.fldWYXaTXo5RxmeeN), usia: one(r.fields.fld8Wd60wjIRNX46h), gender: one(r.fields.fldZk6aOCfgfFZxgQ) })),
    mentorRows: mentor.map((r) => ({ nama: one(r.fields.fldvXr6DjltmCWC1j), kategori: one(r.fields.fldhNsYlVN6Md9BNW) })),
    kategoriMentor: countBy(mentor, 'fldhNsYlVN6Md9BNW'),
  };

  // --- Kepemudaan ---
  const bpkAktif = bpk.filter((r) => r.fields.fldvPkDbxZn38WFrJ);
  const punyaPIC = new Set();
  pemuda.forEach((r) => {
    if (labels(r.fields.fldu13b6USXhAHtdO).length || (r.fields.fldu13b6USXhAHtdO || []).length) {
      (r.fields.fldoXknZlwQWWOGEN || []).forEach((id) => punyaPIC.add(id));
    }
  });
  const kepemudaan = {
    bpkAktif: bpkAktif.length,
    bpkPunyaPIC: bpkAktif.filter((r) => punyaPIC.has(r.id)).length,
    bpkBelumPIC: bpkAktif.filter((r) => !punyaPIC.has(r.id)).length,
    pdpkkTotal: pdpkk.length,
    pdpkkJenis: countBy(pdpkk, 'fldq43MYnCIKg34ts'),
    statusPesertaTC: countBy(bpk, 'fldewlRQqs9ahsZFw'),
    bpkRows: bpk.map((r) => ({ nama: String(r.fields.fldxvUJvguk6J81mP || '').trim(), aktif: !!r.fields.fldvPkDbxZn38WFrJ, pic: punyaPIC.has(r.id), statusTC: one(r.fields.fldewlRQqs9ahsZFw) })),
    pdRows: pdpkk.map((r) => ({ nama: String(r.fields.fldzIeY3YMiHMo4ky || '').trim(), jenis: one(r.fields.fldq43MYnCIKg34ts), keuskupan: res(r.fields.fldWcO7mYhPFpFXlA).join(', ') })),
  };

  return { generatedAt: new Date().toISOString(), programKerja, pleno, tc: tcData, kepemudaan };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Belum login' });
  try {
    const acc = await require('../lib/access').getAccess(session);
    if (!acc || !require('../lib/access').can(acc, 'laporan')) return res.status(403).json({ error: 'Tidak punya akses ke Laporan' });
    if (!cache.data || Date.now() - cache.at > TTL || req.query.refresh === '1') {
      cache = { at: Date.now(), data: await build() };
    }
    res.status(200).json({ user: { nama: session.nama, email: session.email, level: session.level }, ...cache.data });
  } catch (e) {
    console.error('report error', e.message);
    res.status(502).json({ error: 'Gagal mengambil data dari Airtable' });
  }
};
