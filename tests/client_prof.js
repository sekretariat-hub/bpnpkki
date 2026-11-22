const { JSDOM } = require('jsdom'); const fs = require('fs');
const root = require('path').resolve(__dirname,'../public')+'/';
const html = fs.readFileSync(root + 'index.html', 'utf8').replace(/<script src[^>]*><\/script>/, '');
const PERM = { dashboard: 1, pengurus: 1 };
const data = { today: '2026-11-16', tugas: [], agenda: [], event: [], perm: PERM, user: { nama: 'Budi', level: 'Koordinator BPK' }, opsi: {}, kpis: { bpk: {}, pdpkk: {}, pewarta: {} }, proker: [], kelompok: { inti: [], tim: [] }, pengurus: [], tim: [], pdpkk: [], bpkList: [], event: [], jabatanBpk: [], bpkProfil: {}, riwayatPengurus: [] };
const OP = { jk: ['Pria', 'Wanita'], kategori: ['Awam', 'Imam'], size: ['M', 'L'], sakramen: ['Sudah', 'Belum'], bab: ['Bab 0 - Pendahuluan', 'Bab 1 - Cinta Kasih Allah'], jenisPd: ['PD Umum'], keuskupan: [{ id: 'recK1', nama: 'Surabaya' }], pelayanan: [{ id: 'recP1', nama: 'Doa', ids: ['recP1'] }, { id: 'recP2', nama: 'Pewarta', ids: ['recP2'] }], modul: [{ id: 'recM1', nama: 'SHDR' }, { id: 'recM2', nama: 'Pertumbuhan' }] };
let prof = { id: 'recME', nama: 'Budi Santoso', pan: '', jk: '', tgl: '', bln: '', thn: '', email: 'b@x.id', wa: '+6281', alamat: '', kus: 'recK1', kota: null, paroki: null, pd: null, pelayanan: [], modulIkut: [], modulAjar: [], bab: [], kategori: '', baptis: '', krisma: '', size: '', foto: '' };
let kurang = ['Nama panggilan', 'Foto'];
const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://x.test/' }); const w = dom.window; const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
const posts = [];
w.fetch = async (u, o = {}) => {
  const J = (x, ok = true) => ({ status: ok ? 200 : 400, ok, json: async () => x });
  if (u.startsWith('/api/profil')) {
    if (o.method === 'POST') { const b = JSON.parse(o.body); posts.push(b); if (b.act === 'simpan') { Object.assign(prof, b.data, { pelayanan: b.data.pelayanan }); kurang = ['Foto']; return J({ ok: true, profil: prof, kurang }); } if (b.act === 'pdbaru') return J({ ok: true, digabung: true, pd: { id: 'recPD', nama: 'PD Yosef' } }); }
    if (u.includes('act=ringkas')) return J({ kurang, lengkap: !kurang.length });
    if (u.includes('act=paroki')) return J({ paroki: [{ id: 'recPAR', nama: 'St. Yosef' }] });
    if (u.includes('act=pd')) return J({ pd: [{ id: 'recPD', nama: 'PD Yosef', koord: 'Joko' }] });
    if (u.includes('act=kota')) return J({ kota: [{ id: 'recKOT', nama: 'Kota Surabaya', prov: 'Jawa Timur' }] });
    return J({ profil: prof, kurang, milik: true, opsi: OP });
  }
  return J(data);
};
w.alert = () => {};
w.eval(fs.readFileSync(root + 'peta.js', 'utf8')); w.eval(fs.readFileSync(root + 'app.js', 'utf8'));
const wait = (ms = 60) => new Promise((r) => setTimeout(r, ms)); const $ = (s) => w.document.querySelector(s); const ok = (c, m) => console.log((c ? 'OK   ' : 'FAIL ') + m);
(async () => {
  await wait(100);
  ok(/Profil Anda belum lengkap/.test($('#page').innerHTML) && /Nama panggilan, Foto/.test($('#page').innerHTML), 'banner kelengkapan di dashboard');
  ok(!/Profil Saya/.test($('#nav').innerHTML), 'Profil Saya tidak lagi di menu utama');
  w.location.hash = '#/profil'; w.dispatchEvent(new w.HashChangeEvent('hashchange')); await wait(100);
  ok(/Budi Santoso/.test($('#page').innerHTML) && /belum lengkap/.test($('#page').innerHTML) && !/Profil Anda belum lengkap\.<\/b> Mohon/.test($('#page').innerHTML), 'tampilan profil + kotak peringatan');
  $('#pred').click(); await wait(150);
  ok(!!$('#pf_nama') && !!$('#pf_file') && !$('#pf_pd_q').disabled && !$('#pf_par_q').disabled, 'form edit tampil, kolom paroki & PD aktif');
  const q = $('#pf_pd_q'); q.value = 'yos'; q.dispatchEvent(new w.Event('input')); const opts = [...w.document.querySelectorAll('#pf_pd_r .opt')]; ok(opts.length === 1 && /Joko/.test(opts[0].textContent), 'PD bisa dicari dengan mengetik: ' + opts.length);
  q.value = 'zzz'; q.dispatchEvent(new w.Event('input')); ok(/Tidak ditemukan/.test($('#pf_pd_r').innerHTML) && $('#pf_pd').value === '', 'tak ada hasil -> pesan, nilai kosong');
  q.value = 'jok'; q.dispatchEvent(new w.Event('input')); w.document.querySelector('#pf_pd_r .opt').dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true, cancelable: true })); ok($('#pf_pd').value === 'recPD' && q.value === 'PD Yosef', 'pilih hasil pencarian (cari lewat nama koordinator)');
  const qp = $('#pf_par_q'); qp.value = 'xx'; qp.dispatchEvent(new w.Event('input')); ok(w.document.querySelectorAll('#pf_par_r .opt').length === 1, 'paroki: opsi "tidak ada di daftar" selalu tampil');
  ok($('#pf_ajar').style.display === 'none', 'bagian modul/bab tersembunyi');
  const c = [...w.document.querySelectorAll('input[name=pel]')].find((x) => x.dataset.n === 'Pewarta'); c.checked = true; c.dispatchEvent(new w.Event('change'));
  ok($('#pf_ajar').style.display === '', 'pilih Pewarta -> pertanyaan modul & bab muncul');
  ok(w.document.querySelectorAll('input[name=maj]').length === 2 && !w.document.querySelector('input[name=bab]'), 'daftar modul tampil, bab tersembunyi');
  c.checked = false; c.dispatchEvent(new w.Event('change')); ok($('#pf_ajar').style.display === 'none', 'batal pilih -> tersembunyi lagi');
  c.checked = true; c.dispatchEvent(new w.Event('change'));
  $('#pf_pan').value = 'Budi'; w.document.querySelector('input[name=maj]').checked = true; 
  $('#pf_kota').value = 'Surab'; $('#pf_kota').dispatchEvent(new w.Event('input')); await wait(400); $('#pf_kotar .opt').click();
  qp.value = 'yos'; qp.dispatchEvent(new w.Event('input')); w.document.querySelector('#pf_par_r .opt').dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  $('#pff').dispatchEvent(new w.Event('submit', { cancelable: true })); await wait(150);
  const sv = posts.find((p) => p.act === 'simpan');
  ok(sv && sv.data.pan === 'Budi' && sv.data.kota === 'recKOT' && sv.data.paroki === 'recPAR' && sv.data.pd === 'recPD' && sv.data.pelayanan.includes('recP2') && sv.data.modulAjar.length === 1, 'data terkirim lengkap: ' + JSON.stringify(sv && sv.data).slice(0, 160));
  ok(!$('#pff') && /Pewarta \/ Pengajar/.test($('#page').innerHTML), 'kembali ke tampilan, label Pewarta/Pengajar');
  w.location.hash = '#/dashboard'; w.dispatchEvent(new w.HashChangeEvent('hashchange')); await wait(60);
  ok(/Mohon lengkapi: Foto/.test($('#page').innerHTML), 'banner dashboard terbarui (tinggal Foto)');
  console.log('errors:', errs.length ? errs : 'none');
})();
