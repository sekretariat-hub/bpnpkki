// Pencarian & pembuatan data umat (M-Person) berdasarkan nomor WhatsApp.
const { fetchAll } = require('./airtable');
const { waDigits } = require('./phone');

const PERSON = 'tbl21zOSogH7Anlu2';
const PF = { nama: 'fldVU2gofcKEhWHmB', wa: 'fldGsFt4GflTXoTa0', pan: 'fldstVCm8Oa3tyxNA', jk: 'fld3A1rRGfWxbuase', email: 'fldhjOTrQfLGC6hWj', dom: 'fldwJ7RnXW1nLaOcv', tgl: 'fld6yev36uF0pzxcu', bln: 'fldmCKGMF57RMV3tE', thn: 'fldmTqYBcGuYVkkgM', alamat: 'fldZC8crJW8pETX6J' };

async function personByWa(wa, fields = [PF.nama, PF.wa, PF.email]) {
  const f = `FIND('${wa.slice(2)}', SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE({Whatsapp},'+',''),' ',''),'-',''),'(',''))>0`;
  const rows = await fetchAll(PERSON, fields, { filterByFormula: f, maxRecords: '10' });
  return rows.find((r) => waDigits(r.fields[PF.wa]) === wa);
}
// Profil dianggap lengkap bila data wajib sudah terisi (dipakai untuk memaksa isi profil saat daftar).
const lengkap = (r) => { const f = r.fields; return !!(f[PF.email] && f[PF.pan] && f[PF.tgl] && f[PF.bln] && f[PF.thn] && (f[PF.dom] || []).length); };
module.exports = { PERSON, PF, personByWa, lengkap };
