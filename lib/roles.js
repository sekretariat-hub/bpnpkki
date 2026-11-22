// Role dinamis: disimpan di tabel "Role Akses". Role bawaan sistem (kode) dapat ditimpa hak aksesnya.
// Satu orang boleh punya banyak role; hak yang berlaku = tertinggi per menu/tab.
const { fetchAll } = require('./airtable');

const RT = { t: 'tblCgJf2Xwi3Jcp5f', nama: 'fldv3ixU7W0MJDwL9', hak: 'fldXrXNjoRx4XcogQ', cak: 'fldQ4xmT6BiN3yzNo', seksi: 'fldscwsjgQ631moCe', tingkat: 'fldFRTbalaC7GBVjj', kat: 'fld9P7IXzmF8JvtWV', sistem: 'fld8HSo7LgwAvki5a', desk: 'fldkpO6o7kK43XDUS' };
const TIM = { t: 'tblDpFOHsHMntZwWk', orang: 'fldomDq2DVSouEZRg', seksi: 'fldPcVBoJjOxvmm60', seksi2: 'fldo7LnqytWDz29ph', kat: 'fldt3z2Ne2c4V9WYC', status: 'flddq43aR0XsimTjg', jab: 'fldXQjbXYwlQGFkXH' };
const SEKSI_T = 'tblyGzVk36H6eGrFt', SEKSI_NAMA = 'fldlNoAUIJ9jKfZll';
const ADMIN_ROLES = ['Admin', 'Super Admin'];
const SISTEM = ['Super Admin', 'Admin', 'Editor BPN', 'Pengurus BPN Harian', 'Koordinator BPK', 'PIC BPK', 'Koordinator PD', 'Pengamat'];
const nm = (v) => (v && v.name) || v || '';
const flat = (v) => [].concat(v || []).flat().map((x) => (x && x.name) || x).filter((s) => typeof s === 'string' && !/^rec[A-Za-z0-9]{14}$/.test(s));
const parse = (s) => { try { const o = JSON.parse(s || '{}'); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; } catch { return {}; } };

let cache = null, timCache = null; const TTL = 60 * 1000;
const invalidate = () => { cache = null; timCache = null; };

async function loadRoles() {
  if (cache && Date.now() - cache.at < TTL) return cache.v;
  const rows = await fetchAll(RT.t, Object.values(RT).filter((x) => x !== RT.t));
  const v = rows.map((r) => { const f = r.fields; return { id: r.id, nama: String(f[RT.nama] || '').trim(), hak: parse(f[RT.hak]), cakupan: nm(f[RT.cak]) || '', seksi: String(f[RT.seksi] || '').trim(), tingkat: nm(f[RT.tingkat]) || '', kat: nm(f[RT.kat]) || '', sistem: !!f[RT.sistem], desk: f[RT.desk] || '' }; }).filter((r) => r.nama);
  cache = { at: Date.now(), v };
  return v;
}
async function loadTim() {
  if (timCache && Date.now() - timCache.at < TTL) return timCache.v;
  const rows = await fetchAll(TIM.t, [TIM.orang, TIM.seksi, TIM.seksi2, TIM.kat, TIM.status, TIM.jab]);
  const v = rows.filter((r) => /^aktif$/i.test(nm(r.fields[TIM.status]))).map((r) => { const f = r.fields; const sk = flat(f[TIM.seksi2]).concat(flat(f[TIM.seksi])); return { orang: f[TIM.orang] || [], seksi: [...new Set(sk)], kat: nm(f[TIM.kat]), jab: flat(f[TIM.jab]).join(' | ') }; });
  timCache = { at: Date.now(), v };
  return v;
}
async function daftarSeksi() { return (await fetchAll(SEKSI_T, [SEKSI_NAMA])).map((r) => String(r.fields[SEKSI_NAMA] || '').trim()).filter(Boolean).sort((a, b) => a.localeCompare(b, 'id')); }

// Role otomatis dari keanggotaan di tabel Tim BPN (hanya yang berstatus AKTIF).
function autoRoles(roles, tim, personId) {
  if (!personId) return [];
  const mine = tim.filter((t) => t.orang.includes(personId));
  if (!mine.length) return [];
  const out = new Set();
  for (const r of roles) {
    if (!r.kat && !r.seksi) continue;
    const key = r.seksi.replace(/^Tim Kerja\s*/i, '').toLowerCase();
    for (const t of mine) {
      const koord = /koord/i.test(t.jab); // juga menangkap salah ketik seperti "Koordiantor"
      const tingkat = koord ? 'Koordinator' : 'Anggota';
      const katOk = !r.kat || t.kat === r.kat;
      const sekOk = !r.seksi || t.seksi.includes(r.seksi) || (key && t.jab.toLowerCase().includes(key));
      const tgOk = !r.tingkat || r.tingkat === tingkat || (r.tingkat === 'Anggota' && !koord);
      if (katOk && sekOk && tgOk) out.add(r.nama);
    }
  }
  return [...out];
}
// Seksi tempat seseorang bertugas (dari Tim BPN aktif): relasi seksi atau nama seksi pada teks jabatan.
function seksiOf(tim, personId, semua) {
  const mine = tim.filter((t) => t.orang.includes(personId));
  const out = new Set();
  for (const t of mine) for (const n of semua) {
    const key = n.replace(/^Tim Kerja\s*/i, '').toLowerCase();
    if (t.seksi.includes(n) || (key && t.jab.toLowerCase().includes(key))) out.add(n);
  }
  return [...out];
}
module.exports = { seksiOf, RT, ADMIN_ROLES, SISTEM, loadRoles, loadTim, daftarSeksi, autoRoles, invalidate, parse, nm };
