// Hak akses: peran (preset) + pengecualian per menu/tab. Selalu dibaca segar dari Airtable (cache 60 dtk)
// supaya perubahan hak akses/penonaktifan langsung berlaku.
const { fetchAll } = require('./airtable');
const { T, F } = require('./users');

const FX = { peran: 'fldsTal4cl44WawC3', khusus: 'fldtNLbtQfnf1arY0' };
const PEJABAT = { t: 'tblGR9a8J4UOyJGep', bpk: 'fldrGASVYBRTS7v8o', orang: 'fldCYWlWFYtnkjv6Z', status: 'fldyWZFFnXeN8CMlk' };
const PERSON = { t: 'tbl21zOSogH7Anlu2', email: 'fldhjOTrQfLGC6hWj', dom: 'fldwJ7RnXW1nLaOcv' };

const TREE = {
  dashboard: [], proker: ['keuskupan', 'semua', 'ringkasan', 'acc'], pengurus: [], pd: ['daftar', 'ringkasan'],
  tim: ['bagan', 'daftar'], laporan: ['pleno', 'tc', 'kepemudaan'], admin: ['pengguna'],
};
const PERAN = ['Admin', 'Editor BPN', 'Pengurus BPN Harian', 'Koordinator BPK', 'Pengamat'];
const RANK = { none: 0, view: 1, edit: 2 };
const NAME = ['none', 'view', 'edit'];

// Level dasar per menu untuk tiap peran.
function preset(peran, menu) {
  switch (peran) {
    case 'Admin': return 'edit';
    case 'Editor BPN': return menu === 'admin' ? 'none' : 'edit';
    case 'Koordinator BPK': return ['dashboard', 'proker', 'pengurus', 'pd'].includes(menu) ? 'view' : 'none';
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

async function loadUser(email) {
  const rows = await fetchAll(T, [...Object.values(F), FX.peran, FX.khusus], { filterByFormula: `LOWER({Email})='${esc(String(email).toLowerCase())}'`, maxRecords: '1' });
  const rec = rows[0];
  if (!rec || !rec.fields[F.aktif]) return null;
  const f = rec.fields;
  const legacy = nm(f[F.level]);
  const peran = nm(f[FX.peran]) || (legacy === 'Admin' ? 'Admin' : 'Pengurus BPN Harian');
  const khusus = cleanKhusus(parseKhusus(f[FX.khusus]));
  const a = { id: rec.id, email: String(f[F.email] || email).toLowerCase(), nama: f[F.nama] || email, peran, khusus, perm: resolve(peran, khusus), bpkIds: null };
  if (peran === 'Koordinator BPK') a.bpkIds = await scopeBpk(a.email);
  return a;
}

// BPK milik seorang koordinator: dari M-Pejabat BPK (aktif); cadangan: Keuskupan Domisili di M-Person.
async function scopeBpk(email) {
  const ps = await fetchAll(PERSON.t, [PERSON.dom], { filterByFormula: `LOWER({Email})='${esc(email)}'`, maxRecords: '1' });
  const p = ps[0];
  if (!p) return [];
  const pej = await fetchAll(PEJABAT.t, [PEJABAT.bpk, PEJABAT.orang, PEJABAT.status]);
  const mine = pej.filter((r) => (r.fields[PEJABAT.orang] || []).includes(p.id) && /aktif/i.test(nm(r.fields[PEJABAT.status])) && !/tidak/i.test(nm(r.fields[PEJABAT.status])));
  const ids = new Set(mine.flatMap((r) => r.fields[PEJABAT.bpk] || []));
  if (!ids.size) (p.fields[PERSON.dom] || []).forEach((i) => ids.add(i));
  return [...ids];
}

async function getAccess(session) {
  if (!session || !session.email) return null;
  const k = session.email.toLowerCase();
  const hit = cache.get(k);
  if (hit && Date.now() - hit.at < TTL) return hit.a;
  const a = await loadUser(k);
  cache.set(k, { at: Date.now(), a });
  return a;
}
const forget = (email) => cache.delete(String(email).toLowerCase());
const can = (a, key, min = 1) => !!a && (a.perm[key] || 0) >= min;
const canEditProker = (a) => !!a && TREE.proker.some((t) => (a.perm[`proker/${t}`] || 0) >= 2);

module.exports = { TREE, PERAN, FX, preset, resolve, cleanKhusus, parseKhusus, getAccess, forget, can, canEditProker, RANK, NAME };
