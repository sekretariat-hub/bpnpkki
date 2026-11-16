// Peta field profil umat (M-Person) + aturan kelengkapan. Dipakai api/profil.js.
const P = {
  nama: 'fldVU2gofcKEhWHmB', wa: 'fldGsFt4GflTXoTa0', pan: 'fldstVCm8Oa3tyxNA', jk: 'fld3A1rRGfWxbuase', tgl: 'fld6yev36uF0pzxcu', bln: 'fldmCKGMF57RMV3tE', thn: 'fldmTqYBcGuYVkkgM',
  alamat: 'fldZC8crJW8pETX6J', kota: 'fld9IxSm1629bESxL', pd: 'fld3CxECAgWwecw77', pel: 'fldT8TCaA94MhNfri', foto: 'fldIuYdJWnN77zoaT', email: 'fldhjOTrQfLGC6hWj',
  paroki: 'fldUTfjEjaznMj8m0', size: 'fldmI7S44OZMRVYJL', modIkut: 'fldQaSUFxcYVFFKAX', modAjar: 'fldhP55DjyWd3Lpmb', kategori: 'fldkvwhgXy1CgJYr1',
  baptis: 'fldb4MKCMsEulvR7H', krisma: 'fldjg2iLicQIr7Vh3', bab: 'fldJJbI82Q4k6bVCg', dom: 'fldwJ7RnXW1nLaOcv',
};
const OPSI = {
  jk: ['Pria', 'Wanita'],
  kategori: ['Awam', 'Bruder', 'Suster', 'Frater', 'Imam'],
  size: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
  sakramen: ['Sudah', 'Belum'],
  bab: ['Bab 0 - Pendahuluan', 'Bab 1 - Cinta Kasih Allah', 'Bab 2 - Penyelamatan', 'Bab 3 - Hidup baru dalam Roh Kudus', 'Bab 4 - Persiapan menerima Karunia', 'Bab 5 - Pencurahan Roh Kudus', 'Bab 6 - Pertumbuhan', 'Bab 7 - Menjadi serupa dengan Yesus'],
  jenisPd: ['PD Umum', 'PD OMK Anak (6-12th)', 'PD OMK Remaja (13-18th)', 'PD OMK Muda Mudi (18-35th blm menikah)', 'PD Keluarga Muda', 'PD Lansia', 'PD Pengusaha'],
};
// Pertanyaan bab sementara disembunyikan; ubah ke true untuk mengaktifkan lagi.
const TAMPIL_BAB = false;
const nm = (v) => (v && v.name) || v || '';
// Pelayanan yang memunculkan pertanyaan modul & bab.
const pengajar = (namaPelayanan) => (namaPelayanan || []).some((n) => /pewarta|pengajar/i.test(n));

// Daftar yang belum lengkap. Pelayanan dan modul yang pernah diikuti sifatnya opsional.
function kurang(f, namaPelayanan) {
  const k = [], need = (ok, l) => { if (!ok) k.push(l); }, has = (v) => Array.isArray(v) && v.length > 0;
  need(f[P.nama], 'Nama lengkap'); need(f[P.pan], 'Nama panggilan'); need(nm(f[P.jk]), 'Jenis kelamin');
  need(f[P.tgl] && f[P.bln] && f[P.thn], 'Tanggal lahir'); need(f[P.email], 'Email');
  need(has(f[P.dom]), 'Keuskupan domisili'); need(has(f[P.kota]), 'Kota / Kabupaten'); need(f[P.alamat], 'Alamat surat'); need(has(f[P.paroki]), 'Paroki');
  need(nm(f[P.kategori]), 'Kategori (Awam/Bruder/Suster/Frater/Imam)'); need(nm(f[P.baptis]), 'Sakramen Baptis'); need(nm(f[P.krisma]), 'Sakramen Krisma');
  need(nm(f[P.size]), 'Ukuran baju'); need(has(f[P.pd]), 'Asal Persekutuan Doa (PD)'); need(has(f[P.foto]), 'Foto');
  if (pengajar(namaPelayanan)) { need(has(f[P.modAjar]), 'Modul yang Anda ajar'); if (TAMPIL_BAB) need(has(f[P.bab]), 'Bab yang Anda ajar'); }
  return k;
}
module.exports = { TAMPIL_BAB, P, OPSI, nm, pengajar, kurang };
