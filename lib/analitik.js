// Data umat & modul berjenjang untuk menu "Modul Berjenjang" dan "Data Umat".
// Satu sumber (M-Person) dihitung sekali (cache 3 menit), lalu disaring menurut cakupan pengguna:
// nasional (Admin/Editor/Pengurus Harian/Pengamat atau tercatat di tabel Pengurus BPN), keuskupan (Koordinator BPK/PIC), atau PD (Koordinator PD).
const { fetchAll } = require('./airtable');
const { waDigits } = require('./phone');
const { PERSON } = require('./person');
const { P, nm, kurang } = require('./profil');

const BPK = 'tblgj0UYB9w7UWWnv', PD = 'tblhmeuR1qFHxUIId', PEL = 'tblTzNOMyrh4iF8MA', MOD = 'tblymcTBL1pjIMa4A';
const USIA = 'fldpIbuKfSaL6uJY2', PROV = 'fld74efY9G9hb6nIG';
const FIELDS = [...Object.values(P), USIA, PROV];
const TTL = 3 * 60 * 1000;
let C = { at: 0, v: null, p: null };

async function hitung() {
  const [orang, kus, pd, pel, mod] = await Promise.all([
    fetchAll(PERSON, FIELDS), fetchAll(BPK, ['fldxvUJvguk6J81mP', 'fldvPkDbxZn38WFrJ']), fetchAll(PD, ['fldzIeY3YMiHMo4ky', 'fldWcO7mYhPFpFXlA']),
    fetchAll(PEL, ['fldBHtlKeydYGUfPo', 'flduRyaRVWOYFqT9n']), fetchAll(MOD, ['fldocxJbZYt5nn9NS', 'fld04TLxwRqpdkS1V']),
  ]);
  const grup = new Map(), gid = new Map(); // pelayanan bernama sama digabung
  pel.forEach((r) => { const n = String(r.fields.fldBHtlKeydYGUfPo || '').trim(); if (!n || r.fields.flduRyaRVWOYFqT9n) return; const k = n.toLowerCase(); if (!grup.has(k)) grup.set(k, { id: r.id, nama: n }); gid.set(r.id, grup.get(k).id); });
  const nmPel = new Map([...grup.values()].map((g) => [g.id, g.nama]));
  const rows = orang.map((r) => {
    const f = r.fields, pl = [...new Set((f[P.pel] || []).map((i) => gid.get(i)).filter(Boolean))];
    const k = kurang(f, pl.map((i) => nmPel.get(i)));
    const u = f[USIA];
    const sak = (v) => (nm(v) === 'Sudah' ? 1 : nm(v) === 'Belum' ? 0 : -1);
    return {
      id: r.id, n: String(f[P.nama] || '').trim() || '(tanpa nama)', jk: nm(f[P.jk]) === 'Pria' ? 'P' : nm(f[P.jk]) === 'Wanita' ? 'W' : '', u: typeof u === 'number' ? u : null,
      kat: nm(f[P.kategori]), bp: sak(f[P.baptis]), kr: sak(f[P.krisma]), sz: nm(f[P.size]), kus: (f[P.dom] || [])[0] || '', prov: String((f[PROV] || [])[0] || ''),
      pd: (f[P.pd] || [])[0] || '', pl, mi: f[P.modIkut] || [], ma: f[P.modAjar] || [], wa: waDigits(f[P.wa]) ? 1 : 0, l: k.length ? 0 : 1, k: k.length,
    };
  });
  return {
    rows,
    kus: kus.map((r) => ({ id: r.id, nama: String(r.fields.fldxvUJvguk6J81mP || '').trim() })).filter((x) => x.nama).sort((a, b) => a.nama.localeCompare(b.nama, 'id')),
    pd: pd.map((r) => ({ id: r.id, nama: String(r.fields.fldzIeY3YMiHMo4ky || '').trim(), kus: (r.fields.fldWcO7mYhPFpFXlA || [])[0] || '' })).filter((x) => x.nama),
    pel: [...grup.values()].sort((a, b) => a.nama.localeCompare(b.nama, 'id')),
    modul: mod.map((r) => ({ id: r.id, nama: String(r.fields.fldocxJbZYt5nn9NS || '').trim(), tahap: nm(r.fields.fld04TLxwRqpdkS1V).trim() })).filter((x) => x.nama).sort((a, b) => (a.tahap + a.nama).localeCompare(b.tahap + b.nama, 'id')),
  };
}
async function dasar() {
  if (C.v && Date.now() - C.at < TTL) return C.v;
  if (!C.p) C.p = hitung().then((v) => { C = { at: Date.now(), v, p: null }; return v; }).catch((e) => { C.p = null; throw e; });
  return C.p;
}

// Saring menurut cakupan akses pengguna.
function cakupan(acc, d) {
  if (acc.nasional) return { tipe: 'nasional', label: 'Seluruh Indonesia', rows: d.rows };
  if (acc.pdIds) {
    const set = new Set(acc.pdIds), nama = d.pd.filter((x) => set.has(x.id)).map((x) => x.nama);
    return { tipe: 'pd', label: nama.length ? 'Umat PD: ' + nama.join(', ') : 'Anda belum tercatat sebagai koordinator PD mana pun', rows: d.rows.filter((o) => set.has(o.pd)) };
  }
  if (acc.bpkIds) {
    const set = new Set(acc.bpkIds), nama = d.kus.filter((x) => set.has(x.id)).map((x) => x.nama);
    return { tipe: 'bpk', label: nama.length ? 'Keuskupan ' + nama.join(', ') : 'Keuskupan Anda belum terdata', rows: d.rows.filter((o) => set.has(o.kus)) };
  }
  return { tipe: 'kosong', label: 'Tidak ada data', rows: [] };
}

async function analitik(acc) {
  const d = await dasar(), sc = cakupan(acc, d);
  return { scope: { tipe: sc.tipe, label: sc.label }, kus: d.kus, pd: d.pd, pel: d.pel, modul: d.modul, orang: sc.rows, at: new Date(C.at).toISOString() };
}
const invalidate = () => { C = { at: 0, v: null, p: null }; };
module.exports = { analitik, invalidate, cakupan };
