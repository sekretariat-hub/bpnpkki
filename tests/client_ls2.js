const { JSDOM } = require('jsdom'); const fs = require('fs');
const root = require('path').resolve(__dirname,'../public')+'/';
const html = fs.readFileSync(root + 'index.html', 'utf8').replace(/<script src[^>]*><\/script>/, '');
const PERM = {dashboard:1,ls:2,'ls/tc':2,'ls/pengajar':2,'ls/peserta':2,'ls/daftar':2,'ls/pendaftar':2,'ls/laporan':1};
const data = { today: '2026-11-16', tugas: [], agenda: [], event: [], perm: PERM, user: { nama: 'Budi', level: 'Admin', peran: 'Admin' }, opsi: {}, kpis: { bpk: {}, pdpkk: {}, pewarta: {} }, proker: [], kelompok: { inti: [], tim: [] }, pengurus: [], tim: [], pdpkk: [], bpkList: [], jabatanBpk: [], bpkProfil: {}, riwayatPengurus: [] };
const posts = [];
const EV = 'recTC000000000001';
const R = {
  daftarlist: { tc: [{ id: EV, nama: 'TC SHDR 2027', mulai: '2027-01-10', selesai: '', daftar: 'Dibuka', syarat: { surat: true }, cek: { ok: true, items: [{ label: 'Data profil lengkap', ok: true }, { label: 'Sudah mengikuti SHDR', ok: false, info: 'Isi modul' }] }, mine: null }, { id: 'recTC000000000002', nama: 'TC Lain', daftar: 'Dibuka', syarat: {}, cek: { ok: false, items: [{ label: 'Usia 18–60 tahun', ok: false }] }, mine: null }] },
  pendaftar: { bnh: true, kelompok: [{ id: 'recKEL00000000001', nama: 'Kel 1' }], rows: [{ id: 'recPD000000000001', nama: 'Maria', eventNama: 'TC SHDR 2027', keus: 'KAJ', status: 'Disetujui BPK', email: 'm@x.id', wa: '62', suratUrl: 'https://f/x.pdf', suratNama: 'x.pdf', catBpk: 'ok', bisaBpk: false, bisaBnh: true }] },
  belajar: { kelas: [{ id: 'recH0000000000001', event: 'TC SHDR 2027', kelompok: 'Kel 1', status: 'Peserta Aktif', pengajar: 'Pak Guru', ket: '', bab: [{ id: 'recD0000000000001', judul: 'Bab 1', yt: 'https://youtu.be/x', tautan: [], selesai: false, tugas: [], izin: '', cat: '' }], komentar: [{ penulis: 'Pak Guru', isi: 'Bagus sekali', tgl: '2027-01-12' }] }] },
  laporan: { rows: [{ id: 'r1', nama: 'Maria', event: 'TC SHDR 2027', keus: 'KAJ', daftar: 'Disetujui BPNH', status: 'Lulus', ket: '', catBpk: 'Siap melayani', bab: [{ bab: 'Bab 1', izin: 'Boleh mengajar', cat: '' }], komentar: [{ penulis: 'Pak Guru', isi: 'Bagus' }] }] },
  opsi: { modul: ['SHDR', 'Kursus Alkitab'], bpk: [{ id: 'recBPK0000000001', nama: 'KAJ' }] },
  tclist: { edit: true, list: [{ id: EV, nama: 'TC SHDR 2027', mulai: '', selesai: '', daftar: 'Dibuka', status: '', oleh: 'Budi', link: 'x', syarat: { usiaMin: 18 }, materi: [] }] },
};
const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://x.test/' }); const w = dom.window; const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
w.fetch = async (u, o) => { const J = (x) => ({ status: 200, ok: true, json: async () => x }); if (u.includes('/api/report?ls=')) { const a = u.split('ls=')[1]; if (o && o.method === 'POST') { posts.push({ a, ...JSON.parse(o.body) }); return J({ ok: true }); } return J(R[a] || {}); } return J(data); };
w.eval(fs.readFileSync(root + 'peta.js', 'utf8')); w.eval(fs.readFileSync(root + 'app.js', 'utf8'));
const wait = (ms = 80) => new Promise((r) => setTimeout(r, ms)); const $ = (s) => w.document.querySelector(s); const ok = (c, m) => console.log((c ? 'OK   ' : 'FAIL ') + m);
const go = async (h) => { w.location.hash = '#/' + h; w.dispatchEvent(new w.HashChangeEvent('hashchange')); await wait(200); };
(async () => {
  await wait(100);
  await go('ls/daftar/' + EV); let t = $('#page').innerHTML;
  ok(/TC SHDR 2027/.test(t) && /Sudah mengikuti SHDR/.test(t) && /belum memenuhi syarat/.test(t), 'Daftar TC: syarat dan status kelayakan tampil');
  ok(t.indexOf('TC SHDR 2027') < t.indexOf('TC Lain'), 'TC dari tautan tampil paling atas');
  ok(!!$('#sr-' + EV) && !!$('[data-ls="daftar|' + EV + '"]'), 'kolom surat rekomendasi dan tombol daftar muncul');
  w.document.querySelector('[data-ls="daftar|' + EV + '"]').click(); await wait(40);
  ok(/Pilih berkas/.test($('#dfe-' + EV).textContent) && !posts.length, 'tanpa surat: tidak dikirim, ada pesan');
  await go('ls/pendaftar'); t = $('#page').innerHTML;
  ok(/Maria/.test(t) && /Setujui/.test(t) && /x\.pdf/.test(t), 'Pendaftar: baris, surat, tombol setujui');
  w.document.querySelector('[data-ls="putus|recPD000000000001"][data-aksi="setuju"]').click(); await wait(30);
  ok(!!$('[data-f="kelompok"]'), 'tahap BPNH meminta kelompok');
  $('[data-f="kelompok"]').value = 'recKEL00000000001'; $('#lsok').click(); await wait(40);
  const p = posts.at(-1); ok(p.a === 'putus' && p.aksi === 'setuju' && p.kelompok === 'recKEL00000000001', 'persetujuan + kelompok terkirim');
  await go('ls/peserta'); t = $('#page').innerHTML;
  ok(/Bab 1/.test(t) && /Bagus sekali/.test(t) && /0\/1 bab ditonton/.test(t), 'Belajar: bab, progres, komentar pengajar');
  w.document.querySelector('[data-ls="tonton|recD0000000000001"]').click(); await wait(40);
  ok(posts.at(-1).a === 'tonton' && posts.at(-1).selesai === true, 'tandai selesai terkirim');
  w.document.querySelector('[data-ls="tugas|recD0000000000001"]').click(); await wait(40);
  ok(/Pilih berkas/.test($('#tge-recD0000000000001').textContent), 'unggah tugas tanpa berkas ditolak di klien');
  await go('ls/laporan'); t = $('#page').innerHTML;
  ok(/Siap melayani/.test(t) && /Bab 1: Boleh mengajar/.test(t) && /Lulus/.test(t), 'Laporan BPK: lulus, bab, catatan akhir');
  await go('ls/tc');
  w.document.querySelector('[data-ls="syarat|' + EV + '"]').click(); await wait(60);
  ok(!!$('#sy-min') && $('#sy-min').value === '18', 'editor syarat TC tampil dengan nilai tersimpan');
  w.document.querySelector('#ov [data-mod="SHDR"]').checked = true; $('#lsok').click(); await wait(40);
  const s = posts.at(-1); ok(s.a === 'syaratsave' && s.syarat.modul.includes('SHDR') && s.syarat.usiaMin === '18', 'syarat terkirim');
  ok(!errs.length, 'tanpa error skrip ' + errs.join('|'));
})();
