// Uji Learning System (lib/ls.js) dengan Airtable palsu: otorisasi pengajar, validasi penilaian, pembuat TC.
process.env.AIRTABLE_TOKEN = 't';
const root = require('path').resolve(__dirname, '..') + '/';
const calls = [];
const H1 = 'recHEAD0000000001', H2 = 'recHEAD0000000002', D1 = 'recDET00000000001', D2 = 'recDET00000000002';
const db = {
  tblmm50UE68U2eWgx: [{ id: 'recM0000000000001', fields: { fldVqIVmzzPUzb1Ms: ['guru@x.id'] } }],
  tblZhieD2iLA6xSxa: [{ id: H1, fields: { fldl95vg3BSSkSue2: 'guru@x.id', fldl4SuNiiBEQLyo3: 'Peserta A', fldxME5Jftq8f07RC: [D1], flduH9BDju7FUNYjp: { name: 'Peserta Aktif' } } }, { id: H2, fields: { fldl95vg3BSSkSue2: 'lain@x.id', fldl4SuNiiBEQLyo3: 'Peserta B', fldxME5Jftq8f07RC: [D2] } }],
  tblHdbfsd6vT0pxp5: [{ id: D1, fields: { fldRkmZ12W4cP91mD: [H1], fld4X9x4KzYGOu2MQ: 'Bab 1', fldHE0iiUherGR6Y7: { name: 'Selesai Menonton' } } }, { id: D2, fields: { fldRkmZ12W4cP91mD: [H2], fld4X9x4KzYGOu2MQ: 'Bab 1' } }],
};
const base = {
  fetchAll: async (t, f, ex = {}) => {
    if ((f || []).some((x) => !/^fld/.test(x))) throw new Error('kolom tidak valid: ' + f.filter((x) => !/^fld/.test(x))); const m = /FIND\(',([^,]*),'/.exec((ex && ex.filterByFormula) || ''); return (db[t] || []).filter((r) => !m || r.fields.fldl95vg3BSSkSue2 === m[1]); },
  listByIds: async (t, ids, f) => (f || []).some((x) => !/^fld/.test(x)) ? (() => { throw new Error('kolom tidak valid'); })() : (db[t] || []).filter((r) => ids.includes(r.id)),
  update: async (t, id, f) => { calls.push(['update', t, id, f]); return {}; },
  create: async (t, f) => { calls.push(['create', t, f]); return { id: 'recNEW0000000001' }; },
};
require.cache[require.resolve(root + 'lib/airtable.js')] = { id: 'a', filename: 'a', loaded: true, exports: { ...base, forBase: () => base } };
const can = (a, k, min = 1) => !!a && (a.perm[k] || 0) >= min;
require.cache[require.resolve(root + 'lib/access.js')] = { id: 'b', filename: 'b', loaded: true, exports: { can, getAccess: async (s) => s.acc } };
const LS = require(root + 'lib/ls.js');
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FAIL', m); } };
const run = async (acc, act, body, method = 'POST', query = {}) => {
  let out = { code: 200 };
  const res = { status: (c) => { out.code = c; return res; }, json: (j) => { out.j = j; return res; } };
  await LS.handle({ method, query: { ls: act, ...query }, body }, res, { acc });
  return out;
};
const guru = { email: 'guru@x.id', nama: 'Guru', perm: { ls: 2, 'ls/pengajar': 2, 'ls/tc': 0 } };
const pengurus = { email: 'p@x.id', nama: 'Pengurus', perm: { ls: 2, 'ls/pengajar': 1, 'ls/tc': 2 } };
const pengamat = { email: 'q@x.id', nama: 'Q', perm: { ls: 1, 'ls/pengajar': 1, 'ls/tc': 1 } };
(async () => {
  let r = await run({ ...guru, perm: { ls: 0 } }, 'pengajar', {}, 'GET'); ok(r.code === 403, 'tanpa hak menu ls ditolak');
  r = await run(guru, 'pengajar', {}, 'GET'); ok(r.code === 200 && r.j.heads.length === 1 && r.j.heads[0].nama === 'Peserta A', 'pengajar hanya melihat kelompoknya');
  ok(r.j.heads[0].progres.total === 1 && r.j.heads[0].progres.nonton === 1, 'progres dihitung dari bab');
  r = await run(guru, 'nilai', { detail: D2, izin: 'Boleh mengajar' }); ok(r.code === 403, 'tidak boleh menilai peserta pengajar lain');
  r = await run(guru, 'nilai', { detail: D1, izin: 'Boleh mengajar, didampingi', catatan: '' }); ok(r.code === 400, 'didampingi wajib catatan');
  r = await run(guru, 'nilai', { detail: D1, izin: 'Ngawur' }); ok(r.code === 400, 'izin tidak valid ditolak');
  r = await run(guru, 'nilai', { detail: D1, izin: 'Boleh mengajar', catatan: 'bagus' }); ok(r.code === 200 && calls.at(-1)[3].fldTAah7HCLKZnRfP === 'Boleh mengajar', 'penilaian tersimpan');
  r = await run(guru, 'lulus', { head: H2, status: 'Lulus' }); ok(r.code === 403, 'tidak boleh meluluskan peserta lain');
  r = await run(guru, 'lulus', { head: H1, status: 'Lulus' }); ok(r.code === 400, 'lulus butuh minimal 1 bab dinilai (belum ada di data)');
  db.tblHdbfsd6vT0pxp5[0].fields.fldTAah7HCLKZnRfP = { name: 'Boleh mengajar' };
  r = await run(guru, 'lulus', { head: H1, status: 'Lulus', catBpk: 'Siap melayani' }); ok(r.code === 200 && calls.at(-1)[3].fldzXHgw3NeA8aO7m === 'Siap melayani', 'lulus + catatan untuk BPK tersimpan');
  r = await run(guru, 'komentar', { head: H1, isi: ' halo ' }); ok(r.code === 200 && calls.at(-1)[2].fldPxe0YyCs9MThwS === 'halo', 'komentar tersimpan');
  r = await run(pengamat, 'nilai', { detail: D1, izin: 'Boleh mengajar' }); ok(r.code === 403, 'hak lihat saja tidak boleh menilai');
  r = await run(guru, 'tcsave', { nama: 'TC' }); ok(r.code === 403, 'pengajar tidak boleh membuat TC');
  r = await run(pengurus, 'tcsave', { nama: 'TC SHDR 2027', mulai: '2027-01-10', daftar: 'Dibuka' }); ok(r.code === 200 && calls.at(-1)[2].fldeIzGCfTUgmiSKx === 'TC SHDR 2027' && calls.at(-1)[2].fld1CxvRThUNkqpyF === 'Dibuka', 'pengurus membuat TC');
  r = await run(pengurus, 'babsave', { materi: 'recMAT00000000001', judul: 'Bab 1', yt: 'javascript:x' }); ok(r.code === 400, 'tautan video non-http ditolak');
  r = await run(pengurus, 'babsave', { materi: 'recMAT00000000001', judul: 'Bab 1', yt: 'https://youtu.be/x', tautan: 'https://d.com/a\nhttps://d.com/b' }); ok(r.code === 200, 'bab dibuat ' + JSON.stringify(r));
  r = await run(pengurus, 'hapusSemua', {}); ok(r.code === 404, 'aksi tak dikenal 404');
  r = await run(pengurus, 'nilai', {}, 'GET'); ok(r.code === 405, 'aksi tulis lewat GET ditolak');
  console.log(bad ? 'FAIL' : 'ok');
})();
