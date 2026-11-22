// Uji pembatasan edit Program Kerja per seksi.
const R = require('../lib/roles');
process.env.AIRTABLE_TOKEN = 'x';
const { canEditSeksi } = require('../lib/access');
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FAIL', m); } };
const tim = [{ orang: ['recAAAAAAAAAAAAAA'], seksi: ['Tim Kerja Media'], jab: 'Koordinator Seksi Media' }, { orang: ['recBBBBBBBBBBBBBB'], seksi: [], jab: 'Koordinator Seksi Misi & Evangelisasi | Koordinator Seksi Spiritualitas, Liturgi & Doa' }];
const semua = ['Tim Kerja Media', 'Tim Kerja Misi & Evangelisasi', 'Tim Kerja Spiritualitas, Liturgi & Doa', 'Tim Kerja Dana'];
ok(R.seksiOf(tim, 'recAAAAAAAAAAAAAA', semua).join() === 'Tim Kerja Media', 'seksi dari relasi');
ok(R.seksiOf(tim, 'recBBBBBBBBBBBBBB', semua).length === 2, 'dua jabatan = dua seksi');
const a = { seksiEdit: ['Tim Kerja Media'] };
ok(canEditSeksi(a, ['Tim Kerja Media']), 'seksi sendiri boleh');
ok(!canEditSeksi(a, ['Tim Kerja Dana']), 'seksi lain ditolak');
ok(!canEditSeksi(a, []), 'tanpa seksi ditolak');
ok(canEditSeksi({ seksiEdit: null }, ['Tim Kerja Dana']), 'tanpa batas');
console.log(bad ? 'FAIL' : 'ok');
