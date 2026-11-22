// Uji Learning System Tahap 2: syarat, pendaftaran, persetujuan bertingkat, tugas, laporan BPK.
process.env.AIRTABLE_TOKEN = 't';
const root = require('path').resolve(__dirname, '..') + '/';
const PRF = require(root + 'lib/profil.js'), P = PRF.P;
const calls = [], mails = [];
const EV = 'recEVENT000000001', PER = 'recPERSON00000001', BPK1 = 'recBPK0000000001', BPK2 = 'recBPK0000000002', MOD = 'recMOD0000000001', PEL = 'recPEL0000000001', PDX = 'recPDX0000000001';
const person = { id: PER, fields: { [P.nama]: 'Maria', [P.pan]: 'Mia', [P.jk]: { name: 'Wanita' }, [P.tgl]: 5, [P.bln]: 1, [P.thn]: 1990, [P.email]: 'maria@x.id', [P.wa]: '62811', [P.dom]: [BPK1], [P.kota]: ['k'], [P.alamat]: 'a', [P.paroki]: ['p'], [P.kategori]: { name: 'Awam' }, [P.baptis]: { name: 'Sudah' }, [P.krisma]: { name: 'Sudah' }, [P.size]: { name: 'M' }, [P.pd]: ['pd'], [P.foto]: [{}], [P.modIkut]: [MOD], [P.pel]: [PEL] } };
const db = {
  tbl21zOSogH7Anlu2: [person],
  tblymcTBL1pjIMa4A: [{ id: MOD, fields: { fldocxJbZYt5nn9NS: 'SHDR' } }],
  tblTzNOMyrh4iF8MA: [{ id: PEL, fields: { fldBHtlKeydYGUfPo: 'Lektor' } }],
  tblgj0UYB9w7UWWnv: [{ id: BPK1, fields: { fldxvUJvguk6J81mP: 'KAJ' } }, { id: BPK2, fields: { fldxvUJvguk6J81mP: 'KAS' } }],
  tbl0za6Jpd54jM4z0: [{ id: EV, fields: { fldeIzGCfTUgmiSKx: 'TC SHDR', fld1CxvRThUNkqpyF: { name: 'Dibuka' }, fldEXvmXr3NASHVHS: JSON.stringify({ usiaMin: 18, surat: true, jk: 'Wanita' }) } }],
  tbl65eRLE2SFQA3T1: [],
};
const base = {
  fetchAll: async (t, f, ex = {}) => {
    const fm = (ex && ex.filterByFormula) || '', rows = db[t] || [], m = /\{Email Peserta\}='([^']*)'/.exec(fm);
    if (t === 'tblZhieD2iLA6xSxa' && m) return rows.filter((r) => r.fields.fldWYrEa3TbJ7IxTd === m[1] || r.fields.fldl95vg3BSSkSue2 === m[1]);
    return rows;
  },
  listByIds: async (t, ids) => (db[t] || []).filter((r) => ids.includes(r.id)),
  update: async (t, id, f) => { calls.push(['update', t, id, f]); const r = (db[t] || []).find((x) => x.id === id); if (r) Object.assign(r.fields, f); return {}; },
  create: async (t, f) => { calls.push(['create', t, f]); const r = { id: 'recNEW' + String(calls.length).padStart(11, '0'), fields: f }; (db[t] = db[t] || []).push(r); return r; },
  createMany: async (t, l) => { calls.push(['many', t, l.length]); return l.map(() => ({})); },
  upload: async (t, id, fld, name, type) => { calls.push(['upload', t, id, name, type]); },
};
require.cache[require.resolve(root + 'lib/airtable.js')] = { id: 'a', filename: 'a', loaded: true, exports: { ...base, forBase: () => base } };
const can = (a, k, min = 1) => !!a && (a.perm[k] || 0) >= min;
require.cache[require.resolve(root + 'lib/access.js')] = { id: 'b', filename: 'b', loaded: true, exports: { can, getAccess: async (s) => s.acc } };
require.cache[require.resolve(root + 'lib/mail.js')] = { id: 'm', filename: 'm', loaded: true, exports: { kirim: async (to, s) => { mails.push([to, s]); return true; }, kirimAdmin: async () => {}, penerima: () => [] } };
const LS = require(root + 'lib/ls.js');
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FAIL', m); } };
const run = async (acc, act, body, method = 'POST', query = {}) => {
  const out = { code: 200 }; const res = { status: (c) => { out.code = c; return res; }, json: (j) => { out.j = j; return res; } };
  await LS.handle({ method, query: { ls: act, ...query }, body }, res, { acc });
  return out;
};
const umat = { email: 'maria@x.id', nama: 'Maria', personId: PER, perm: { ls: 2, 'ls/peserta': 2 } };
const koord1 = { email: 'k@x.id', nama: 'Koord', perm: { ls: 2, 'ls/pendaftar': 2 }, bpkIds: [BPK1] };
const koord2 = { ...koord1, bpkIds: [BPK2] };
const bnh = { email: 'b@x.id', nama: 'BNH', perm: { ls: 2, 'ls/tc': 2, 'ls/pendaftar': 2 }, bpkIds: null };
const pdf = { name: 's.pdf', type: 'application/pdf', data: 'QUJD' };
(async () => {
  let r = await run(umat, 'daftarlist', {}, 'GET'); ok(r.code === 200 && r.j.tc.length === 1 && r.j.tc[0].cek.ok, 'daftarlist memenuhi syarat: ' + JSON.stringify(r.j).slice(0, 200));
  r = await run(umat, 'daftar', { event: EV }); ok(r.code === 400 && /surat/i.test(r.j.error), 'surat wajib');
  r = await run(umat, 'daftar', { event: EV, surat: { ...pdf, type: 'text/html' } }); ok(r.code === 400, 'tipe surat ditolak');
  r = await run(umat, 'daftar', { event: EV, surat: { ...pdf, data: 'A'.repeat(4_000_001) } }); ok(r.code === 400, 'surat terlalu besar');
  person.fields[P.krisma] = null;
  r = await run(umat, 'daftar', { event: EV, surat: pdf }); ok(r.code === 400 && /Krisma/.test(r.j.error), 'tanpa Krisma ditolak');
  person.fields[P.krisma] = { name: 'Sudah' };
  const lama = person.fields[P.thn]; person.fields[P.thn] = 2015;
  r = await run(umat, 'daftar', { event: EV, surat: pdf }); ok(r.code === 400 && /Usia/.test(r.j.error), 'usia di bawah minimal ditolak');
  person.fields[P.thn] = lama;
  r = await run(umat, 'daftar', { event: EV, surat: pdf }); ok(r.code === 200 && calls.some((c) => c[0] === 'upload' && c[4] === 'application/pdf'), 'pendaftaran berhasil + surat diunggah');
  const reg = db.tbl65eRLE2SFQA3T1[0]; ok(reg.fields.fldfTkt8nj77R5GUk === 'Menunggu BPK', 'status awal Menunggu BPK');
  r = await run(umat, 'daftar', { event: EV, surat: pdf }); ok(r.code === 400 && /sudah/i.test(r.j.error), 'tidak boleh daftar dua kali');
  r = await run(umat, 'pendaftar', {}, 'GET'); ok(r.code === 403, 'umat tidak boleh membuka daftar pendaftar');
  r = await run(koord2, 'pendaftar', {}, 'GET'); ok(r.code === 200 && r.j.rows.length === 0, 'koordinator BPK lain tidak melihat pendaftar');
  r = await run(koord1, 'pendaftar', {}, 'GET'); ok(r.j.rows.length === 1 && r.j.rows[0].bisaBpk && !r.j.rows[0].bisaBnh, 'koordinator BPK melihat & boleh memutuskan');
  r = await run(koord2, 'putus', { id: reg.id, aksi: 'setuju' }); ok(r.code === 403, 'BPK lain tidak boleh memutuskan');
  r = await run(koord1, 'putus', { id: reg.id, aksi: 'tolak' }); ok(r.code === 400, 'tolak wajib alasan');
  r = await run(bnh, 'putus', { id: reg.id, aksi: 'setuju', kelompok: 'recKEL00000000001' }); ok(r.code === 403, 'BNH tidak melompati tahap BPK');
  ok(reg.fields.fldfTkt8nj77R5GUk === 'Menunggu BPK', 'status tetap menunggu BPK setelah percobaan BNH');
  r = await run(koord1, 'putus', { id: reg.id, aksi: 'setuju', catatan: 'ok' }); ok(r.code === 200 && reg.fields.fldfTkt8nj77R5GUk === 'Disetujui BPK', 'BPK menyetujui');
  r = await run(koord1, 'putus', { id: reg.id, aksi: 'setuju', kelompok: 'recKEL00000000001' }); ok(r.code === 403, 'koordinator BPK tidak boleh menyetujui tahap BNH');
  r = await run(bnh, 'putus', { id: reg.id, aksi: 'setuju' }); ok(r.code === 400 && /kelompok/i.test(r.j.error), 'BNH wajib pilih kelompok');
  r = await run(bnh, 'putus', { id: reg.id, aksi: 'setuju', kelompok: 'recKEL00000000001' }); ok(r.code === 200 && reg.fields.fldfTkt8nj77R5GUk === 'Disetujui BPNH', 'BNH menyetujui ' + JSON.stringify(r.j));
  ok(calls.some((c) => c[0] === 'create' && c[1] === 'tblZhieD2iLA6xSxa'), 'LMSHeader dibuat');
  ok(mails.some((m) => m[0] === 'maria@x.id'), 'peserta menerima email');
  r = await run(umat, 'tugas', { detail: 'recDET00000000001', file: pdf }); ok(r.code === 403, 'tugas bab yang bukan milik sendiri ditolak');
  r = await run(umat, 'tonton', { detail: 'xx' }); ok(r.code === 403, 'id bab tidak valid ditolak');
  r = await run(umat, 'syaratsave', { id: EV, syarat: {} }); ok(r.code === 403, 'umat tidak boleh mengubah syarat');
  r = await run(bnh, 'syaratsave', { id: EV, syarat: { usiaMin: 20, usiaMax: '', jk: 'Ngawur', modul: ['SHDR'], surat: 1 } }); ok(r.code === 200 && JSON.parse(calls.at(-1)[3].fldEXvmXr3NASHVHS).jk === '' && JSON.parse(calls.at(-1)[3].fldEXvmXr3NASHVHS).usiaMax === null, 'syarat dibersihkan');
  r = await run(umat, 'laporan', {}, 'GET'); ok(r.code === 403, 'umat tidak boleh membuka laporan');
  // ---- Tahap 3: pesan dan diskusi ----
  const HD = 'recHEAD0000000009';
  db.tblZhieD2iLA6xSxa = [{ id: HD, fields: { fldWYrEa3TbJ7IxTd: 'maria@x.id', fldl95vg3BSSkSue2: 'guru@x.id', fldPK70LzNQzsKnw1: [EV], fldGcKUaAeeoPZgxu: 'TC SHDR', fld8TfBelMkpt3byj: ['Kel 1'] } }];
  const guru = { email: 'guru@x.id', nama: 'Guru', perm: { ls: 2, 'ls/peserta': 2, 'ls/pengajar': 2 } };
  const lain = { email: 'lain@x.id', nama: 'Lain', perm: { ls: 2, 'ls/peserta': 2 } };
  r = await run(umat, 'pesan', { head: HD, isi: '  ' }); ok(r.code === 400, 'pesan kosong ditolak');
  r = await run(lain, 'pesan', { head: HD, isi: 'halo' }); ok(r.code === 403, 'orang lain tidak boleh menulis di kelas ini');
  r = await run(umat, 'pesan', { head: HD, isi: 'Pak, tugas bab 1?' }); ok(r.code === 200 && calls.at(-1)[2].fldIVfMOWuozs5FMy === 'Pesan' && calls.at(-1)[2].fldnqgxK9gevs098h === 'Peserta', 'peserta mengirim pesan');
  ok(mails.some((m) => m[0] === 'guru@x.id'), 'pengajar diberi tahu lewat email');
  r = await run(guru, 'pesan', { head: HD, isi: 'Silakan unggah' }); ok(r.code === 200 && calls.at(-1)[2].fldnqgxK9gevs098h === 'Pengajar' && mails.some((m) => m[0] === 'maria@x.id' && /Pesan baru/.test(m[1])), 'pengajar membalas, peserta diberi tahu');
  r = await run(lain, 'diskusikirim', { event: EV, isi: 'hai' }); ok(r.code === 403, 'bukan anggota TC tidak boleh ikut diskusi');
  r = await run(umat, 'diskusikirim', { event: EV, isi: 'Salam semua' }); ok(r.code === 200 && calls.at(-1)[2].fldIVfMOWuozs5FMy === 'Grup' && calls.at(-1)[2].fldAOIttv6xHX12ot === EV, 'peserta menulis di diskusi TC');
  r = await run(umat, 'diskusi', {}, 'GET'); ok(r.code === 200 && r.j.tc.length === 1, 'daftar TC diskusi peserta');
  console.log(bad ? 'FAIL' : 'ok');
  process.exit(bad ? 1 : 0);
})();
