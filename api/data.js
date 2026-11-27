// Data utama Sistem Informasi BPN PKKI (hanya untuk pengguna yang sudah login).
// Token Airtable tidak pernah dikirim ke browser. Kontak (WA/email) hanya untuk level Admin.
const { fetchAll, listByIds, create, update } = require('../lib/airtable');
const { getSession } = require('../lib/auth');
const { labels } = require('../lib/aggregate');
const { getAccess } = require('../lib/access');

const T = {
  proker: 'tblJVp60qiZ4mz40v', program: 'tblqlr84XesZvbEJi', bpk: 'tblgj0UYB9w7UWWnv', seksi: 'tblyGzVk36H6eGrFt',
  bidang: 'tblOkJcrqWIqc7kQz', jabBpk: 'tbldxeUpwRdy3ghib', pengurus: 'tblRzqA9mzvDBWgSZ', riwayat: 'tblNNm7hwT7q9hxAV', tim: 'tblDpFOHsHMntZwWk',
  pdpkk: 'tblhmeuR1qFHxUIId', pejabat: 'tblGR9a8J4UOyJGep', person: 'tbl21zOSogH7Anlu2', event: 'tblXXCoICRKHWKxV4', task: 'tblpFsvyTnpzL3ghc',
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agust', 'Sept', 'Okt', 'Nov', 'Dec'];
const ID_RE = /^rec[A-Za-z0-9]{14}$/;

let cache = { at: 0, data: null };
const TTL = 5 * 60 * 1000;

const wita = () => new Date(Date.now() + 8 * 3600 * 1000);
const iso = (d) => d.toISOString().slice(0, 10);

async function build() {
  // Gelombang 1: tabel referensi kecil + data utama
  const [bpk, seksi, bidang, program, jabBpk, pengurus, proker, tim, pdpkk, event, task, pejabat, riwayat] = await Promise.all([
    fetchAll(T.bpk, ['fldxvUJvguk6J81mP', 'fldcvLPHh5A9E3S0G', 'fldvPkDbxZn38WFrJ', 'fldphfJk5nqDLTGB6', 'flde1x6UBt0lZ9oc6']),
    fetchAll(T.seksi, ['fldlNoAUIJ9jKfZll', 'fldHR7n95OKVB50jx']),
    fetchAll(T.bidang, ['fld92od5eBugVo19p']),
    fetchAll(T.program, ['fldnPNRUurh3VQbJG']),
    fetchAll(T.jabBpk, ['fld1D1ejz3qnx7A8h']),
    fetchAll(T.pengurus, ['fldAZEb1CWjIEoEGB', 'fldJgxaz4f5MmEbnS', 'fld3O21aDCbkTCin8']),
    fetchAll(T.proker, ['fld9rFmBpRTej2cku', 'fldaVg9ti2zI8wqF6', 'fldjdb3nsGvNEYzEz', 'fld97u5BWt6vL112x', 'fld6R2dagcciDPbZh', 'fldtnySgUhRtkCNY7', 'fldgSos4roG4zcZsZ', 'fldHv5JtZ4QiMuooY', 'fld3c0GcOXMa6gXgw', 'fldCLTSfeaWv6E1GF', 'fld3Ni0MS2OH7KOvu', 'fldaBt1ZeguNcnlDE', 'fldhh9nS23lP4iPED', 'fldZbkJcPgp130dxt', 'fldpi1SsOEeWSn3WF', 'fldSo9KHoZeU6nelG', 'fldblxbwUjhfYl8n7', 'fld8pPvWVRn9QZ4ux']),
    fetchAll(T.tim, ['fldomDq2DVSouEZRg', 'fldPcVBoJjOxvmm60', 'fldo7LnqytWDz29ph', 'fldgjTuIVKqIjqxws', 'fldt3z2Ne2c4V9WYC', 'flddq43aR0XsimTjg', 'fldIxbYPMVzW1vrr0', 'fld5QO8ATqA0DA4c6', 'fldaX4soGLmUr08th', 'fldgJmeTbLhJmzvcG', 'fldXQjbXYwlQGFkXH', 'fldc19IS7qf3hUFdP']),
    fetchAll(T.pdpkk, ['fldzIeY3YMiHMo4ky', 'fldWcO7mYhPFpFXlA', 'fldq43MYnCIKg34ts', 'fldxlRQG4ikb8coP2', 'fldYgMqtmX7AbHfU3']),
    fetchAll(T.event, ['flduBRbHd5qS10GGC', 'fldqLzgGmTFR7CkMV', 'fld4fFsOg9vwjxzYw']),
    fetchAll(T.task, ['fldry0ymZWhzbsvN7', 'fldFTszJpZtVvuBRs', 'fldPliH590gA6RsPc', 'fldXsegGJCM9Rk065', 'fldQ62QG6uFvzHHBx', 'fldNwimQQb6Ms1Rhv']),
    fetchAll(T.pejabat, ['fldrGASVYBRTS7v8o', 'fldCYWlWFYtnkjv6Z', 'fldAsSxbg8bZRkrru', 'fldyWZFFnXeN8CMlk', 'fldg6fcg234kY4yCT', 'fldg9BWVX7AmO3Iw7']),
    fetchAll(T.riwayat, ['fldV7IAegtyjm2lV4', 'fldPCsNiSY7fO0LU2', 'fldfPGyXH4MGPLa8x', 'fldJ9VuWtPiEceSe6']),
  ]);

  // Peta ID -> nama
  const names = {};
  const put = (rows, f) => rows.forEach((r) => { const v = r.fields[f]; if (v) names[r.id] = String(v).trim(); });
  put(bpk, 'fldxvUJvguk6J81mP'); put(seksi, 'fldlNoAUIJ9jKfZll'); put(bidang, 'fld92od5eBugVo19p');
  put(program, 'fldnPNRUurh3VQbJG'); put(jabBpk, 'fld1D1ejz3qnx7A8h'); put(pengurus, 'fldAZEb1CWjIEoEGB');
  const L = (v) => labels(v).map((x) => (ID_RE.test(x) ? names[x] || '' : x)).filter(Boolean);
  const first = (v) => L(v)[0] || '';

  // Gelombang 2: orang yang direferensikan + pewarta pengajar
  const pid = new Set();
  pengurus.forEach((r) => (r.fields.fldJgxaz4f5MmEbnS || []).forEach((i) => pid.add(i)));
  tim.forEach((r) => (r.fields.fldomDq2DVSouEZRg || []).forEach((i) => pid.add(i)));
  pdpkk.forEach((r) => (r.fields.fldxlRQG4ikb8coP2 || []).forEach((i) => pid.add(i)));
  task.forEach((r) => (r.fields.fldNwimQQb6Ms1Rhv || []).forEach((i) => pid.add(i)));
  riwayat.forEach((r) => (r.fields.fldPCsNiSY7fO0LU2 || []).forEach((i) => pid.add(i)));
  pejabat.forEach((r) => (r.fields.fldCYWlWFYtnkjv6Z || []).forEach((i) => pid.add(i)));
  const [persons, pewarta] = await Promise.all([
    listByIds(T.person, [...pid], ['fldVU2gofcKEhWHmB', 'fldstVCm8Oa3tyxNA', 'fldGsFt4GflTXoTa0', 'fldhjOTrQfLGC6hWj', 'fldwJ7RnXW1nLaOcv', 'fld3A1rRGfWxbuase', 'fldIuYdJWnN77zoaT']),
    fetchAll(T.person, ['fldVU2gofcKEhWHmB', 'fldwJ7RnXW1nLaOcv'], { filterByFormula: "OR(LEN({Pengajar Modul}&'')>0, LEN({Spesialiasi Pengajar SHDR}&'')>0)" }).catch(() => null),
  ]);
  const P = {};
  persons.forEach((r) => {
    const f = r.fields;
    P[r.id] = { id: r.id, nama: String(f.fldVU2gofcKEhWHmB || '').trim(), panggilan: f.fldstVCm8Oa3tyxNA || '', wa: f.fldGsFt4GflTXoTa0 || '', email: f.fldhjOTrQfLGC6hWj || '', keuskupan: L(f.fldwJ7RnXW1nLaOcv)[0] || '', gender: first(f.fld3A1rRGfWxbuase), adaWa: !!String(f.fldGsFt4GflTXoTa0 || '').replace(/\D/g, ''), foto: ((f.fldIuYdJWnN77zoaT || [])[0] || {}).thumbnails ? f.fldIuYdJWnN77zoaT[0].thumbnails.large.url : '' };
  });
  const person = (ids) => (ids || []).map((i) => P[i]).filter(Boolean);

  // --- KPI naik/turun vs bulan lalu (berdasarkan tanggal data masuk ke Airtable) ---
  const now = wita();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const kpi = (rows) => ({ now: rows.length, prev: rows.filter((r) => r.createdTime < monthStart).length });
  const bpkAktif = bpk.filter((r) => r.fields.fldvPkDbxZn38WFrJ);
  const kpis = {
    bpk: { ...kpi(bpkAktif), total: bpk.length },
    pdpkk: kpi(pdpkk),
    pewarta: pewarta ? kpi(pewarta) : null,
  };

  // Profil BPK: koordinator & pejabat aktif per keuskupan
  const profil = {};
  pejabat.forEach((r) => {
    const f = r.fields; const st = L(f.fldyWZFFnXeN8CMlk)[0] || '';
    const aktif = /aktif/i.test(st) && !/tidak/i.test(st), selesai = /selesai/i.test(st);
    if (!aktif && !selesai) return;
    const jab = L(f.fldAsSxbg8bZRkrru)[0] || '', jid = (f.fldAsSxbg8bZRkrru || [])[0] || '';
    (f.fldrGASVYBRTS7v8o || []).forEach((bid) => {
      const key = bid; profil[key] = profil[key] || { id: bid, nama: names[bid] || '', pejabat: [], riwayat: [] };
      person(f.fldCYWlWFYtnkjv6Z).forEach((o) => {
        const row = { pid: r.id, jabatan: jab, jabatanId: jid, koordinator: /koord/i.test(jab), orang: o, mulai: f.fldg6fcg234kY4yCT || '', selesai: f.fldg9BWVX7AmO3Iw7 || '' };
        (aktif ? profil[key].pejabat : profil[key].riwayat).push(row);
      });
    });
  });
  Object.values(profil).forEach((b) => { b.pejabat.sort((x, y) => Number(y.koordinator) - Number(x.koordinator)); b.riwayat.sort((x, y) => String(y.selesai).localeCompare(String(x.selesai))); });

  // BPN Inti = koordinator BPK yang menjabat aktif (bukan wakil)
  const inti = {};
  Object.values(profil).forEach((b) => b.pejabat.filter((x) => x.koordinator && !/wakil/i.test(x.jabatan)).forEach((x) => {
    const k = (inti[x.orang.id] = inti[x.orang.id] || { orang: x.orang, jabatan: [] }); k.jabatan.push(`Koordinator BPK ${b.nama}`.trim());
  }));

  const out = {
    bpkProfil: profil,
    generatedAt: new Date().toISOString(),
    today: iso(now),
    kpis,
    pewartaList: (pewarta || []).map((r) => ({ nama: String(r.fields.fldVU2gofcKEhWHmB || '').trim(), keuskupan: L(r.fields.fldwJ7RnXW1nLaOcv).join(', ') })).sort((a, b) => a.nama.localeCompare(b.nama, 'id')),
    proker: proker.map((r) => {
      const f = r.fields;
      return {
        id: r.id, label: f.fld9rFmBpRTej2cku || '',
        program: L(f.fldtnySgUhRtkCNY7).join(', '), detil: (f.fldhh9nS23lP4iPED || '').trim(), catatan: (f.fldZbkJcPgp130dxt || '').trim(),
        tahun: first(f.fldCLTSfeaWv6E1GF), bulan: first(f.fld3c0GcOXMa6gXgw), bulanIdx: MONTHS.indexOf(first(f.fld3c0GcOXMa6gXgw)),
        status: first(f.fldaVg9ti2zI8wqF6), acc: first(f.fldgSos4roG4zcZsZ), deal: !!f.fldHv5JtZ4QiMuooY, pelaksanaTipe: first(f.fldjdb3nsGvNEYzEz),
        penerima: L(f.fld97u5BWt6vL112x), pelaksana: L(f.fld6R2dagcciDPbZh), metode: first(f.fld3Ni0MS2OH7KOvu), sumberDana: first(f.fldpi1SsOEeWSn3WF),
        anggaran: Number(f.fldaBt1ZeguNcnlDE) || 0, seksi: L(f.fldSo9KHoZeU6nelG), jenis: L(f.fldblxbwUjhfYl8n7), modul: L(f.fld8pPvWVRn9QZ4ux),
      };
    }),
    pengurus: pengurus.map((r) => ({ id: r.id, jabatan: r.fields.fldAZEb1CWjIEoEGB || '', rank: Number(r.fields.fld3O21aDCbkTCin8) || 0, orang: person(r.fields.fldJgxaz4f5MmEbnS) }))
      .sort((a, b) => b.rank - a.rank || a.jabatan.localeCompare(b.jabatan)),
    tim: tim.map((r) => {
      const f = r.fields;
      return {
        id: r.id, orang: person(f.fldomDq2DVSouEZRg)[0] || null,
        seksi: L(f.fldPcVBoJjOxvmm60).length ? L(f.fldPcVBoJjOxvmm60) : L(f.fldo7LnqytWDz29ph), bidang: L(f.fldgjTuIVKqIjqxws),
        kategori: first(f.fldt3z2Ne2c4V9WYC), status: first(f.flddq43aR0XsimTjg), mulai: f.fldIxbYPMVzW1vrr0 || f.fldaX4soGLmUr08th || '', selesai: f.fld5QO8ATqA0DA4c6 || f.fldgJmeTbLhJmzvcG || '',
        jabatanBpn: L(f.fldXQjbXYwlQGFkXH), jabatanBpk: L(f.fldc19IS7qf3hUFdP),
      };
    }),
    seksiList: seksi.map((r) => ({ id: r.id, nama: names[r.id] || '', bidang: L(r.fields.fldHR7n95OKVB50jx)[0] || '' })).filter((x) => x.nama),
    kelompok: { inti: Object.values(inti) },
    jabatanBpk: jabBpk.map((r) => ({ id: r.id, nama: String(r.fields.fld1D1ejz3qnx7A8h || '').trim() })).filter((x) => x.nama).sort((a, b) => a.nama.localeCompare(b.nama, 'id')),
    riwayatPengurus: riwayat.map((r) => ({ id: r.id, jabatan: r.fields.fldV7IAegtyjm2lV4 || '', orang: person(r.fields.fldPCsNiSY7fO0LU2)[0] || null, selesai: r.fields.fldfPGyXH4MGPLa8x || '', pengganti: r.fields.fldJ9VuWtPiEceSe6 || '' })).filter((x) => x.orang).sort((a, b) => String(b.selesai).localeCompare(String(a.selesai))),
    pdpkk: pdpkk.map((r) => ({
      id: r.id, nama: String(r.fields.fldzIeY3YMiHMo4ky || '').trim(), keuskupan: first(r.fields.fldWcO7mYhPFpFXlA), jenis: first(r.fields.fldq43MYnCIKg34ts),
      koordinator: person(r.fields.fldxlRQG4ikb8coP2), jumlahUmat: (r.fields.fldYgMqtmX7AbHfU3 || []).length,
    })),
    bpkList: bpk.map((r) => ({ id: r.id, nama: String(r.fields.fldxvUJvguk6J81mP || '').trim(), status: first(r.fields.fldcvLPHh5A9E3S0G), aktif: !!r.fields.fldvPkDbxZn38WFrJ, lat: r.fields.fldphfJk5nqDLTGB6 ?? null, lng: r.fields.flde1x6UBt0lZ9oc6 ?? null })),
    event: event.filter((r) => r.fields.fldqLzgGmTFR7CkMV).map((r) => ({ id: r.id, nama: r.fields.flduBRbHd5qS10GGC || '', tanggal: r.fields.fldqLzgGmTFR7CkMV, status: first(r.fields.fld4fFsOg9vwjxzYw) })),
    tugas: task.map((r) => ({ id: r.id, nama: String(r.fields.fldry0ymZWhzbsvN7 || '').trim(), status: first(r.fields.fldFTszJpZtVvuBRs), prioritas: first(r.fields.fldPliH590gA6RsPc), tenggat: r.fields.fldXsegGJCM9Rk065 || '', seksi: L(r.fields.fldQ62QG6uFvzHHBx), penanggungjawab: person(r.fields.fldNwimQQb6Ms1Rhv).map((p) => p.nama), pj: person(r.fields.fldNwimQQb6Ms1Rhv).map((p) => p.id) })),
  };
  return out;
}

const OPSI = (rows) => ({
  status: uniqSorted(rows.map((p) => p.status)), acc: uniqSorted(rows.map((p) => p.acc)), bulan: MONTHS.slice(),
  tahun: uniqSorted(rows.map((p) => p.tahun)), metode: uniqSorted(rows.map((p) => p.metode)), sumberDana: uniqSorted(rows.map((p) => p.sumberDana)),
});
const uniqSorted = (a) => [...new Set(a.filter(Boolean))].sort();


// ---- Tim Saya: siapa memimpin/ikut apa. Koordinator Bidang = jabatan "Wakil Koordinator BPN Bidang N" di Pengurus BPN;
// Koordinator Seksi = jabatan "Koordinator Seksi X". Mereka boleh mengelola keanggotaan seksi di bawahnya.
const L2 = (v, d) => ((v || [])[0] && (d.bpkList.find((b) => b.id === v[0]) || {}).nama) || '';
const nz = (t) => String(t || '').toLowerCase().replace(/^tim kerja\s*/, '').replace(/[^a-z0-9]/g, '');
function timScope(acc, d) {
  const out = { ada: false, bidang: [], seksiKoord: [], seksiAnggota: [], seksiEdit: [], seksi: [], semua: false, bidangSeksi: {} };
  const adm = (acc.roles || []).some((r) => ['Admin', 'Super Admin', 'Editor BPN'].includes(r));
  const sl = d.seksiList || [];
  if (adm) { out.semua = true; out.seksi = out.seksiEdit = sl.map((x) => x.nama); out.ada = out.seksi.length > 0; sl.forEach((x) => { (out.bidangSeksi[x.bidang || 'Lainnya'] = out.bidangSeksi[x.bidang || 'Lainnya'] || []).push(x.nama); }); return out; }
  const pid = acc.pid; if (!pid) return out;
  for (const r of d.pengurus.filter((x) => x.orang.some((o) => o.id === pid))) {
    let m = /wakil\s*koordinator.*bidang\s*(\d+)/i.exec(r.jabatan); if (m) out.bidang.push('Bidang ' + m[1]);
    m = /koordinator\s*seksi\s+(.+)/i.exec(r.jabatan);
    if (m) { const k = nz(m[1]); const ex = sl.filter((x) => nz(x.nama) === k); (ex.length ? ex : sl.filter((x) => k && (nz(x.nama).includes(k) || k.includes(nz(x.nama))))).forEach((x) => out.seksiKoord.push(x.nama)); }
  }
  out.bidang = [...new Set(out.bidang)]; out.seksiKoord = [...new Set(out.seksiKoord)];
  out.bidang.forEach((b) => { out.bidangSeksi[b] = sl.filter((x) => x.bidang === b).map((x) => x.nama); });
  const diBidang = out.bidang.flatMap((b) => out.bidangSeksi[b]);
  out.seksiEdit = [...new Set([...out.seksiKoord, ...diBidang])];
  out.seksiAnggota = [...new Set(d.tim.filter((t) => t.orang && t.orang.id === pid && t.status === 'AKTIF').flatMap((t) => t.seksi))].filter((n) => !out.seksiEdit.includes(n));
  out.seksi = [...out.seksiEdit, ...out.seksiAnggota];
  out.ada = out.seksi.length > 0;
  return out;
}
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIMF = { orang: 'fldomDq2DVSouEZRg', seksi: 'fldPcVBoJjOxvmm60', mulai: 'fldIxbYPMVzW1vrr0', selesai: 'fld5QO8ATqA0DA4c6' };
const PERS = 'tbl21zOSogH7Anlu2';
async function fresh() { if (!cache.data || Date.now() - cache.at > TTL) cache = { at: Date.now(), data: await build() }; return cache.data; }

// Ubah keanggotaan tim (tabel Tim BPN). Hanya Koordinator Bidang/Seksi untuk seksi di bawahnya (dan Admin/Editor BPN).
async function timEdit(req, res, acc) {
  if (acc.pending || acc.mustChange) return res.status(403).json({ error: 'Akun belum aktif' });
  if (acc.imp && !acc.imp.edit) return res.status(403).json({ error: 'Mode Login sebagai sedang lihat saja. Aktifkan "Boleh edit" di banner.' });
  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const d = await fresh(), sc = timScope(acc, d);
  const boleh = (nama) => sc.seksiEdit.includes(nama);
  if (b.op === 'tambah') {
    const seksi = d.seksiList.find((x) => x.nama === b.seksi);
    if (!seksi || !boleh(seksi.nama)) return res.status(403).json({ error: 'Anda tidak mengelola seksi ini' });
    if (!ID_RE.test(String(b.personId || ''))) return res.status(400).json({ error: 'Pilih orang dari daftar' });
    const mulai = b.mulai ? String(b.mulai) : iso(wita()); if (!DATE_RE.test(mulai)) return res.status(400).json({ error: 'Tanggal mulai tidak valid' });
    if (d.tim.some((t) => t.orang && t.orang.id === b.personId && t.status === 'AKTIF' && t.seksi.includes(seksi.nama))) return res.status(409).json({ error: 'Orang ini sudah aktif di seksi tersebut' });
    await create(T.tim, { [TIMF.orang]: [b.personId], [TIMF.seksi]: [seksi.id], [TIMF.mulai]: mulai });
    console.log('tim tambah', acc.email, acc.imp ? 'LOGIN-SEBAGAI ' + acc.imp.sebagai : '', seksi.nama, b.personId);
  } else if (['akhiri', 'aktifkan', 'tanggal'].includes(b.op)) {
    if (!ID_RE.test(String(b.id || ''))) return res.status(400).json({ error: 'ID tidak valid' });
    const rec = (await listByIds(T.tim, [b.id], [TIMF.seksi]))[0]; if (!rec) return res.status(404).json({ error: 'Penugasan tidak ditemukan' });
    const nm = (rec.fields[TIMF.seksi] || []).map((i) => (d.seksiList.find((x) => x.id === i) || {}).nama).filter(Boolean);
    if (!nm.some(boleh)) return res.status(403).json({ error: 'Anda tidak mengelola seksi penugasan ini' });
    const f = {};
    if (b.op === 'akhiri') { const t = b.selesai ? String(b.selesai) : iso(wita()); if (!DATE_RE.test(t)) return res.status(400).json({ error: 'Tanggal tidak valid' }); f[TIMF.selesai] = t; }
    if (b.op === 'aktifkan') f[TIMF.selesai] = null;
    if (b.op === 'tanggal') {
      if (b.mulai !== undefined) { if (b.mulai && !DATE_RE.test(String(b.mulai))) return res.status(400).json({ error: 'Tanggal mulai tidak valid' }); f[TIMF.mulai] = b.mulai || null; }
      if (b.selesai !== undefined) { if (b.selesai && !DATE_RE.test(String(b.selesai))) return res.status(400).json({ error: 'Tanggal selesai tidak valid' }); f[TIMF.selesai] = b.selesai || null; }
      if (!Object.keys(f).length) return res.status(400).json({ error: 'Tidak ada yang diubah' });
    }
    await update(T.tim, b.id, f);
    console.log('tim', b.op, acc.email, acc.imp ? 'LOGIN-SEBAGAI ' + acc.imp.sebagai : '', b.id);
  } else return res.status(400).json({ error: 'Aksi tidak dikenal' });
  cache = { at: 0, data: null };
  return res.json({ ok: true });
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  const s = getSession(req);
  if (!s) return res.status(401).json({ error: 'Belum login' });
  try {
    const acc = await getAccess(s);
    if (!acc) return res.status(401).json({ error: 'Akun tidak aktif' });
    if (acc.pending) return res.status(403).json({ pending: true, nama: acc.nama, error: 'Menunggu persetujuan Admin' });
    if (acc.mustChange) return res.status(403).json({ mustChange: true, error: 'Ganti password terlebih dahulu' });
    if (req.method === 'POST') return await timEdit(req, res, acc);
    if (req.query.cari) { // cari orang untuk ditambahkan ke tim (tanpa kontak)
      const dd = await fresh(), sc0 = timScope(acc, dd);
      if (!sc0.seksiEdit.length) return res.status(403).json({ error: 'Tidak diizinkan' });
      const t = String(req.query.cari).toLowerCase().replace(/\\/g, '').replace(/'/g, "\\'").slice(0, 60); if (t.length < 2) return res.json({ orang: [] });
      const rows = await fetchAll(T.person, ['fldVU2gofcKEhWHmB', 'fldwJ7RnXW1nLaOcv'], { filterByFormula: `SEARCH('${t}', LOWER({Nama Lengkap}))`, maxRecords: '12' });
      return res.json({ orang: rows.map((r) => ({ id: r.id, nama: String(r.fields.fldVU2gofcKEhWHmB || '').trim(), keuskupan: L2(r.fields.fldwJ7RnXW1nLaOcv, dd) })).filter((x) => x.nama) });
    }
    if (!cache.data || Date.now() - cache.at > TTL || (req.query.refresh === '1' && Date.now() - cache.at > 10000)) cache = { at: Date.now(), data: await build() };
    const d = cache.data, P = acc.perm, ok = (k) => (P[k] || 0) >= 1;
    const anyOf = (m) => Object.keys(P).some((k) => (k === m || k.startsWith(m + '/')) && P[k] >= 1);
    let scopeNames = null;
    if (acc.bpkIds) scopeNames = new Set(d.bpkList.filter((b) => acc.bpkIds.includes(b.id)).map((b) => b.nama));
    const inScope = (arr) => !scopeNames || arr.some((n) => scopeNames.has(n));
    const body = {
      user: { nama: acc.tampil || acc.nama, pid: acc.pid || '', email: acc.email, superAdmin: !!acc.superAdmin, imp: acc.imp || null, tim: timScope(acc, d), level: acc.peran, peran: acc.peran, scope: scopeNames ? [...scopeNames] : null, seksiEdit: acc.seksiEdit },
      perm: P, opsi: OPSI(d.proker), generatedAt: d.generatedAt, today: d.today,
      pewartaList: ok('dashboard') && !scopeNames ? d.pewartaList : [],
      kpis: ok('dashboard') ? d.kpis : { bpk: { now: 0, prev: 0, total: 0 }, pdpkk: { now: 0, prev: 0 }, pewarta: null },
      proker: anyOf('proker') || ok('dashboard') ? d.proker.filter((p) => inScope([...p.penerima, ...p.pelaksana])) : [],
      pengurus: anyOf('pengurus') ? d.pengurus : [],
      tim: anyOf('tim') ? d.tim : [],
      kelompok: anyOf('pengurus') ? { inti: d.kelompok.inti, tim: d.tim.filter((t) => t.orang && /^aktif$/i.test(t.status || '')).map((t) => ({ orang: t.orang, jabatan: [...t.jabatanBpn, ...t.seksi].filter(Boolean).join(' · '), seksi: t.seksi })) } : { inti: [], tim: [] },
      pdpkk: anyOf('pd') ? d.pdpkk.filter((x) => !scopeNames || scopeNames.has(x.keuskupan)) : [],
      bpkList: d.bpkList, event: ok('dashboard') && !scopeNames ? d.event : [], tugas: ok('dashboard') && !scopeNames ? d.tugas : [],
      jabatanBpk: ok('pendataan') ? d.jabatanBpk : [], riwayatPengurus: anyOf('pengurus') ? d.riwayatPengurus : [],
      bpkProfil: anyOf('proker') || anyOf('pd') || ok('pendataan') ? Object.fromEntries(Object.entries(d.bpkProfil).filter(([id]) => !acc.bpkIds || acc.bpkIds.includes(id))) : {},
    };
    // Nomor WA tidak pernah dikirim ke browser (tombol WA memakai /api/wa). Email disembunyikan untuk Pengamat.
    const out = JSON.stringify(body, (k, v) => (k === 'wa' ? '' : acc.peran === 'Pengamat' && k === 'email' && typeof v === 'string' && k !== 'user' ? '' : v));
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).send(out);
  } catch (e) {
    console.error('data error', e.message);
    res.status(502).json({ error: 'Gagal mengambil data dari Airtable' });
  }
};
module.exports.getCache = () => cache;
module.exports.invalidate = () => { cache = { at: 0, data: null }; };
