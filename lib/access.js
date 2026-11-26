// Hak akses: peran (preset) + pengecualian per menu/tab. Selalu dibaca segar dari Airtable (cache 60 dtk)
// supaya perubahan hak akses/penonaktifan langsung berlaku.
const { fetchAll } = require('./airtable');
const { T, F } = require('./users');
const R = require('./roles');

const FX = { peran: 'fldsTal4cl44WawC3', khusus: 'fldtNLbtQfnf1arY0', manual: 'fld7LeP24BReQjdFA' };
const PEJABAT = { t: 'tblGR9a8J4UOyJGep', bpk: 'fldrGASVYBRTS7v8o', orang: 'fldCYWlWFYtnkjv6Z', status: 'fldyWZFFnXeN8CMlk' };
const PERSON = { t: 'tbl21zOSogH7Anlu2', email: 'fldhjOTrQfLGC6hWj', dom: 'fldwJ7RnXW1nLaOcv' };

const TREE = {
  dashboard: [], proker: ['keuskupan', 'semua', 'ringkasan', 'acc'], pengurus: [], pd: ['daftar', 'ringkasan'],
  tim: ['saya', 'bagan', 'daftar'], pendataan: [], modul: ['ringkasan', 'permodul', 'peserta', 'pengajar'], umat: ['ringkasan', 'daftar'], laporan: ['pleno', 'tc', 'kepemudaan'], ls: ['tc', 'pengajar', 'peserta', 'diskusi', 'dasbor', 'daftar', 'pendaftar', 'laporan'], admin: ['pengguna', 'role'],
};
const PERAN = R.SISTEM;
const NASIONAL = ['Admin', 'Editor BPN', 'Pengurus BPN Harian', 'Pengamat']; // melihat data umat se-Indonesia
const BPK_ROLES = ['Koordinator BPK', 'PIC BPK']; // hanya melihat data keuskupannya sendiri
const RANK = { none: 0, view: 1, edit: 2 };
const NAME = ['none', 'view', 'edit'];

// Level dasar per menu untuk tiap peran.
function preset(peran, menu) {
  switch (peran) {
    case 'Admin': return 'edit';
    case 'Editor BPN': return menu === 'admin' ? 'none' : 'edit';
    case 'Koordinator BPK': return menu === 'pendataan' ? 'edit' : ['dashboard', 'proker', 'pengurus', 'pd', 'modul', 'umat'].includes(menu) ? 'view' : 'none';
    case 'PIC BPK': return ['dashboard', 'proker', 'pengurus', 'pd', 'pendataan', 'modul', 'umat'].includes(menu) ? 'view' : 'none';
    case 'Pengajar TC': case 'Peserta TC': return 'none'; // hanya menu Learning System (lihat lsTab)
    case 'Koordinator PD': return ['modul', 'umat'].includes(menu) ? 'view' : 'none'; // hanya umat PD yang ia koordinatori
    default: return menu === 'admin' ? 'none' : 'view'; // Pengurus BPN Harian, Pengamat
  }
}
// Hak per tab Learning System untuk peran sistem (menu 'ls' berbeda per tab).
function lsTab(peran, tab) {
  if (tab === 'peserta' || tab === 'daftar' || tab === 'diskusi') return 'edit'; // semua akun boleh mendaftar & belajar (data dibatasi menurut email sendiri)
  switch (peran) {
    case 'Admin': case 'Editor BPN': return 'edit';
    case 'Pengurus BPN Harian': return tab === 'tc' || tab === 'pendaftar' || tab === 'dasbor' ? 'edit' : 'view';
    case 'Pengamat': return 'view';
    case 'Koordinator BPK': case 'PIC BPK': return tab === 'laporan' || tab === 'dasbor' ? 'view' : tab === 'pendaftar' ? 'edit' : 'none';
    case 'Pengajar TC': return tab === 'pengajar' || tab === 'dasbor' ? 'edit' : 'none';
    default: return 'none';
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
  // Learning System: hak per tab, menu induk = tab tertinggi.
  for (const t of TREE.ls) out[`ls/${t}`] = RANK[khusus[`ls/${t}`]] ?? RANK[lsTab(peran, t)];
  out.ls = Math.max(0, ...TREE.ls.map((t) => out[`ls/${t}`]));
  if (out.ls > 0 && RANK[khusus.ls] !== undefined) out.ls = RANK[khusus.ls];
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

// Peta hak satu role: hak buatan Admin (tabel Role Akses) bila ada, kalau tidak, bawaan kode untuk role sistem.
function mapOf(name, roles) {
  const r = roles.find((x) => x.nama === name);
  const out = {};
  const hak = r && Object.keys(r.hak).length ? r.hak : null;
  if (hak) {
    for (const [m, tabs] of Object.entries(TREE)) { const base = RANK[hak[m]] ?? 0; out[m] = base; tabs.forEach((t) => { out[`${m}/${t}`] = RANK[hak[`${m}/${t}`]] ?? base; }); }
  } else if (R.SISTEM.includes(name)) return resolve(name === 'Super Admin' ? 'Admin' : name, {});
  else keysOf().forEach((k) => (out[k] = 0));
  if (!R.ADMIN_ROLES.includes(name)) Object.keys(out).filter((k) => k === 'admin' || k.startsWith('admin/')).forEach((k) => (out[k] = 0));
  return out;
}
// Gabung beberapa role: nilai tertinggi per menu/tab yang menang.
const merge = (maps) => { const out = {}; keysOf().forEach((k) => (out[k] = Math.max(0, ...maps.map((m) => m[k] || 0)))); return out; };
const listOf = (s) => { try { const a = JSON.parse(s || '[]'); return Array.isArray(a) ? a.filter((x) => typeof x === 'string') : []; } catch { return []; } };

async function loadUser(key, ign = false) {
  const formula = /^rec[A-Za-z0-9]{14}$/.test(key) ? `RECORD_ID()='${key}'` : `LOWER({Email})='${esc(String(key).toLowerCase())}'`;
  const rows = await fetchAll(T, [...Object.values(F), FX.peran, FX.khusus, FX.manual], { filterByFormula: formula, maxRecords: '1' });
  const rec = rows[0];
  if (!rec || !rec.fields[F.aktif]) return null;
  const f = rec.fields;
  const legacy = nm(f[F.level]);
  const own = nm(f[FX.peran]);
  const must = !!f[F.mustChange], pending = !f[F.disetujui], blocked = !ign && (must || pending); // ign: dipakai "Login sebagai" agar akun yang belum aktivasi tetap bisa dilihat
  const mail = String(f[F.email] || '').toLowerCase();
  const [roles, tim, pid] = await Promise.all([R.loadRoles().catch(() => []), R.loadTim().catch(() => []), blocked ? '' : personIdOf(f[F.person], mail)]);
  const names = [...new Set([own, ...listOf(f[FX.manual]), ...R.autoRoles(roles, tim, pid)].filter(Boolean))];
  if (!names.length) names.push(legacy === 'Admin' ? 'Admin' : 'Pengurus BPN Harian');
  if (!blocked) { try { if (await require('./ls').isMentor({ email: mail, personId: pid })) names.push('Pengajar TC'); } catch (e) { console.error('ls mentor', e.message); } }
  const has = (n) => names.includes(n);
  const peran = names.some((n) => R.ADMIN_ROLES.includes(n)) ? 'Admin' : R.SISTEM.find(has) || names[0];
  const cust = (n) => roles.find((r) => r.nama === n);
  const a = { id: rec.id, pid: pid || '', personId: f[F.person] || '', wa: f[F.wa] || '', email: mail, nama: f[F.nama] || mail, peran, roles: names, khusus: {}, mustChange: ign ? false : must, pending: ign ? false : pending, superAdmin: names.includes('Super Admin'), perm: blocked ? Object.fromEntries(keysOf().map((k) => [k, 0])) : merge(names.map((n) => mapOf(n, roles))), bpkIds: null, pdIds: null, seksiEdit: null, nasional: names.some((n) => NASIONAL.includes(n) || (cust(n) && cust(n).cakupan === 'Nasional')) };
  if (!blocked) {
    if (names.some((n) => BPK_ROLES.includes(n))) a.bpkIds = await scopeBpk(f[F.person], mail);
    // Siapa pun yang tercatat di tabel Pengurus BPN (harian) boleh melihat data umat nasional.
    if (pid && (await inPengurus(pid))) a.nasional = true;
    // Edit Program Kerja dibatasi ke seksi sendiri, kecuali Admin, Editor BPN, dan Koordinator Bidang.
    if (pid && !['Super Admin', 'Admin', 'Editor BPN', 'Koordinator Bidang'].some(has)) a.seksiEdit = R.seksiOf(tim, pid, await R.daftarSeksi().catch(() => []));
    if (has('Koordinator PD') && !a.nasional) a.pdIds = pid ? await pdsOf(pid) : [];
  }
  return a;
}

async function personIdOf(personId, email) {
  if (/^rec[A-Za-z0-9]{14}$/.test(personId || '')) return personId;
  if (!/@/.test(email || '')) return '';
  const r = await fetchAll(PERSON.t, [PERSON.email], { filterByFormula: `LOWER({Email})='${esc(email)}'`, maxRecords: '1' });
  return r[0] ? r[0].id : '';
}
const PENGURUS = { t: 'tblRzqA9mzvDBWgSZ', orang: 'fldJgxaz4f5MmEbnS' };
const PDT = { t: 'tblhmeuR1qFHxUIId', koord: 'fldxlRQG4ikb8coP2' };
const inPengurus = async (pid) => (await fetchAll(PENGURUS.t, [PENGURUS.orang])).some((r) => (r.fields[PENGURUS.orang] || []).includes(pid));
const pdsOf = async (pid) => (await fetchAll(PDT.t, [PDT.koord])).filter((r) => (r.fields[PDT.koord] || []).includes(pid)).map((r) => r.id);

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

// "Login sebagai" (khusus Super Admin): lihat sistem seperti pengguna lain. Data dan menu mengikuti pengguna itu;
// nama (untuk pencatatan siapa yang mengubah) tetap milik Super Admin. Menu Administrasi tertutup selama mode ini.
async function getAs(session, k) {
  const real = await getAccess({ rid: session.rid, email: session.email });
  if (!real || !real.superAdmin || real.pending || real.mustChange) return real; // bukan Super Admin: abaikan penyamaran
  const ck = `${k}>${session.as}${session.edit ? '+e' : ''}`;
  const hit = cache.get(ck);
  if (hit && Date.now() - hit.at < TTL) return hit.a;
  const t = await loadUser(session.as, true);
  if (!t || t.superAdmin) return real;
  const perm = { ...t.perm };
  Object.keys(perm).forEach((x) => { if (x === 'admin' || x.startsWith('admin/')) perm[x] = 0; else if (session.edit && perm[x] >= 1) perm[x] = 2; else if (!session.edit) perm[x] = Math.min(perm[x], 1); }); // mode lihat saja: semua tombol edit tertutup
  const a = { ...t, perm, nama: real.nama, tampil: t.nama, seksiEdit: session.edit ? null : t.seksiEdit, imp: { oleh: real.nama, sebagai: t.nama, sebagaiId: t.id, edit: !!session.edit } };
  cache.set(ck, { at: Date.now(), a });
  return a;
}

async function getAccess(session) {
  if (!session || !(session.rid || session.email)) return null;
  const k = session.rid || session.email.toLowerCase();
  if (session.as) return getAs(session, k);
  const hit = cache.get(k);
  if (hit && Date.now() - hit.at < TTL) return hit.a;
  const a = await loadUser(k);
  cache.set(k, { at: Date.now(), a });
  return a;
}
const forgetAll = () => cache.clear();
const forget = (k) => { cache.delete(String(k).toLowerCase()); cache.delete(String(k)); };
const can = (a, key, min = 1) => !!a && (a.perm[key] || 0) >= min;
const canEditProker = (a) => !!a && TREE.proker.some((t) => (a.perm[`proker/${t}`] || 0) >= 2);
// Boleh mengedit program dengan daftar seksi penanggung jawab tertentu? (seksiEdit null = tanpa batas)
const canEditSeksi = (a, seksi) => !a.seksiEdit || (seksi || []).some((n) => a.seksiEdit.map((x) => x.toLowerCase()).includes(String(n).toLowerCase()));

module.exports = { TREE, PERAN, FX, mapOf, merge, listOf, forgetAll, NASIONAL, preset, resolve, cleanKhusus, parseKhusus, getAccess, forget, can, canEditProker, canEditSeksi, RANK, NAME };
