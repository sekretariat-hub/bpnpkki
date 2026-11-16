// Hak akses: peran (preset) + pengecualian per menu/tab. Selalu dibaca segar dari Airtable (cache 60 dtk)
// supaya perubahan hak akses/penonaktifan langsung berlaku.
const { fetchAll } = require('./airtable');
const { T, F } = require('./users');

const FX = { peran: 'fldsTal4cl44WawC3', khusus: 'fldtNLbtQfnf1arY0' };
const PEJABAT = { t: 'tblGR9a8J4UOyJGep', bpk: 'fldrGASVYBRTS7v8o', orang: 'fldCYWlWFYtnkjv6Z', status: 'fldyWZFFnXeN8CMlk' };
const PERSON = { t: 'tbl21zOSogH7Anlu2', email: 'fldhjOTrQfLGC6hWj', dom: 'fldwJ7RnXW1nLaOcv' };

const TREE = {
  dashboard: [], proker: ['keuskupan', 'semua', 'ringkasan', 'acc'], pengurus: [], pd: ['daftar', 'ringkasan'],
  tim: ['bagan', 'daftar'], pendataan: [], laporan: ['pleno', 'tc', 'kepemudaan'], admin: ['pengguna'],
};
const PERAN = ['Admin', 'Editor BPN', 'Pengurus BPN Harian', 'Koordinator BPK', 'PIC BPK', 'Pengamat'];
const BPK_ROLES = ['Koordinator BPK', 'PIC BPK']; // hanya melihat data keuskupannya sendiri
const RANK = { none: 0, view: 1, edit: 2 };
const NAME = ['none', 'view', 'edit'];

// Level dasar per menu untuk tiap peran.
function preset(peran, menu) {
  switch (peran) {
    case 'Admin': return 'edit';
    case 'Editor BPN': return menu === 'admin' ? 'none' : 'edit';
    case 'Koordinator BPK': return menu === 'pendataan' ? 'edit' : ['dashboard', 'proker', 'pengurus', 'pd'].includes(menu) ? 'view' : 'none';
    case 'PIC BPK': return ['dashboard', 'proker', 'pengurus', 'pd', 'pendataan'].includes(menu) ? 'view' : 'none';
    default: return menu === 'admin' ? 'none' : 'view'; // Pengurus BPN Harian, Pengamat
  }
}
const keysOf = () => Object.entries(TREE).flatMap(([m, tabs]) => [m, ...tabs.map((t) => `${m}/${t}`)]);

// Hitung peta hak akses: { 'proker': 1, 'proker/semua': 2, ... } dengan nilai 0/1/2.
function resolve(peran, khusus = {}) {
  const out = {};
  for (const [m, tabs] of Object.entries(TREE)) {
    const base = RANK[khusus[m]] ?? RANK[preset(peran, m)];
    out[m] = base;
    tabs.forEach((t) => { out[`${m}/${t}`] = RANK[khusus[`${m}/${t}`]] ?? base; });
  }
  // Menu admin hanya dapat dibuka Admin (tidak bisa dibuka lewat pengecualian untuk peran lain).
  if (peran !== 'Admin') Object.keys(out).filter((k) => k === 'admin' || k.startsWith('admin/')).forEach((k) => (out[k] = 0));
  return out;
}

const nm = (v) => (v && v.name) || v || '';
const parseKhusus = (s) => {
  try { const o = JSON.parse(s || '{}'); return o && typeof o === 'object' ? o : {}; } catch { return {}; }
};
const cleanKhusus = (o) => {
  const ok = new Set(keysOf()); const out = {};
  Object.entries(o || {}).forEach(([k, v]) => { if (ok.has(k) && k !== 'admin' && !k.startsWith('admin/') && NAME.includes(v)) out[k] = v; });
  return out;
};

const cache = new Map();
const TTL = 60 * 1000;
const esc = (s) => String(s).replace(/\\/g, '').replace(/'/g, "\\'");

async function loadUser(key) {
  const formula = /^rec[A-Za-z0-9]{14}$/.test(key) ? `RECORD_ID()='${key}'` : `LOWER({Email})='${esc(String(key).toLowerCase())}'`;
  const rows = await fetchAll(T, [...Object.values(F), FX.peran, FX.khusus], { filterByFormula: formula, maxRecords: '1' });
  const rec = rows[0];
  if (!rec || !rec.fields[F.aktif]) return null;
  const f = rec.fields;
  const legacy = nm(f[F.level]);
  const peran = nm(f[FX.peran]) || (legacy === 'Admin' ? 'Admin' : 'Pengurus BPN Harian');
  const khusus = cleanKhusus(parseKhusus(f[FX.khusus]));
  const must = !!f[F.mustChange], pending = !f[F.disetujui], blocked = must || pending;
  const mail = String(f[F.email] || '').toLowerCase();
  const a = { id: rec.id, email: mail, nama: f[F.nama] || mail, peran, khusus, mustChange: must, pending, perm: blocked ? Object.fromEntries(keysOf().map((k) => [k, 0])) : resolve(peran, khusus), bpkIds: null };
  if (BPK_ROLES.includes(peran) && !blocked) a.bpkIds = await scopeBpk(f[F.person], mail);
  return a;
}

// BPK milik seorang koordinator: dari M-Pejabat BPK (aktif); cadangan: Keuskupan Domisili di M-Person.
async function scopeBpk(personId, email) {
  const ps = /^rec/.test(personId || '') ? await fetchAll(PERSON.t, [PERSON.dom], { filterByFormula: `RECORD_ID()='${personId}'`, maxRecords: '1' }) : await fetchAll(PERSON.t, [PERSON.dom], { filterByFormula: `LOWER({Email})='${esc(email)}'`, maxRecords: '1' });
  const p = ps[0];
  if (!p) return [];
  const pej = await fetchAll(PEJABAT.t, [PEJABAT.bpk, PEJABAT.orang, PEJABAT.status]);
  const mine = pej.filter((r) => (r.fields[PEJABAT.orang] || []).includes(p.id) && /aktif/i.test(nm(r.fields[PEJABAT.status])) && !/tidak/i.test(nm(r.fields[PEJABAT.status])));
  const ids = new Set(mine.flatMap((r) => r.fields[PEJABAT.bpk] || []));
  if (!ids.size) (p.fields[PERSON.dom] || []).forEach((i) => ids.add(i));
  return [...ids];
}

async function getAccess(session) {
  if (!session || !(session.rid || session.email)) return null;
  const k = session.rid || session.email.toLowerCase();
  const hit = cache.get(k);
  if (hit && Date.now() - hit.at < TTL) return hit.a;
  const a = await loadUser(k);
  cache.set(k, { at: Date.now(), a });
  return a;
}
const forget = (k) => { cache.delete(String(k).toLowerCase()); cache.delete(String(k)); };
const can = (a, key, min = 1) => !!a && (a.perm[key] || 0) >= min;
const canEditProker = (a) => !!a && TREE.proker.some((t) => (a.perm[`proker/${t}`] || 0) >= 2);

module.exports = { TREE, PERAN, FX, preset, resolve, cleanKhusus, parseKhusus, getAccess, forget, can, canEditProker, RANK, NAME };
