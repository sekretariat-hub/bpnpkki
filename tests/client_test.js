const { JSDOM } = require('jsdom'); const fs = require('fs');
const root = require('path').resolve(__dirname,'../public')+'/';
const html = fs.readFileSync(root + 'index.html', 'utf8').replace(/<script src[^>]*><\/script>/, '');
const mk = (id, n) => ({ id, nama: n, wa: '+62811', email: '', keuskupan: 'Bandung', gender: 'Pria' });
const PERM = {}; for (const [m,t] of Object.entries({dashboard:[],proker:['keuskupan','semua','ringkasan','acc'],pengurus:[],pd:['daftar','ringkasan'],tim:['bagan','daftar'],laporan:['pleno','tc','kepemudaan'],admin:['pengguna','role'],pendataan:[]})) { PERM[m]=2; t.forEach(x=>PERM[m+'/'+x]=2); }
const data = { perm: PERM, opsi: { status:['ON PROGRESS'], acc:['DISETUJUI'], bulan:['Jan','Nov'], tahun:['2026','2027'], metode:['OFFLINE'], sumberDana:['BPK Pelaksana'] }, jabatanBpk: [{id:'recJ1',nama:'Pic Doa'},{id:'recJ2',nama:'Koordinator BPK'}], riwayatPengurus: [{id:'w1',jabatan:'Koordinator BPN',orang:{id:'old',nama:'Pak Lama'},selesai:'2026-10-01',pengganti:'Albertus'}], bpkProfil: { r1: { id:'r1', nama:'Surabaya', riwayat:[{pid:'rx',jabatan:'Koordinator BPK',jabatanId:'recJ2',orang:{id:'old2',nama:'Mantan Koor'},mulai:'2024-01-01',selesai:'2026-01-01'}], pejabat:[{jabatan:'Koordinator BPK', jabatanId:'recJ2', pid:'pj1', koordinator:true, orang:{id:'x1',nama:'Romo Budi',email:'b@x.id',adaWa:true,foto:''}}] } }, user: { nama: 'Timmy Theopelus', level: 'Admin' }, today: '2026-11-16', generatedAt: new Date().toISOString(),
  kpis: { bpk: { now: 36, prev: 36, total: 40 }, pdpkk: { now: 106, prev: 100 }, pewarta: { now: 120, prev: 125 } },
  proker: [
    { id: 'a', label: 'x', program: 'TC SEP/KEP', detil: 'Detil <b>', catatan: 'catatan', tahun: '2026', bulan: 'Nov', bulanIdx: 10, status: 'ON PROGRESS', acc: 'DISETUJUI', deal: true, pelaksanaTipe: 'BPK', penerima: ['Agats'], pelaksana: ['Surabaya'], metode: 'OFFLINE', sumberDana: 'BPK Pelaksana', anggaran: 12000000, seksi: ['Tim Kerja Misi'], jenis: ['TC'], modul: ['SHDR'] },
    { id: 'b', label: 'y', program: 'Retret', detil: '', catatan: '', tahun: '2027', bulan: 'Jan', bulanIdx: 0, status: 'BELUM DIMULAI', acc: '', deal: false, pelaksanaTipe: 'BPN', penerima: ['Ruteng', 'Medan'], pelaksana: [], metode: 'ONLINE', sumberDana: '', anggaran: 6000000, seksi: [], jenis: [], modul: [] },
    { id: 'c', label: 'z', program: 'Event', tahun: '2026', bulan: 'Des', bulanIdx: -1, status: 'SELESAI', acc: 'DITUNDA', deal: true, pelaksanaTipe: 'BPK', penerima: [], pelaksana: [], metode: '', sumberDana: '', anggaran: 0, seksi: [], jenis: [], modul: [] } ],
  kelompok: { inti: [{ orang: mk('3', 'Ani Koord'), jabatan: ['Koordinator BPK Surabaya'] }, { orang: mk('1', 'Albertus Budi'), jabatan: ['Koordinator BPK Semarang'] }], tim: [{ orang: mk('2', 'Olive'), jabatan: 'Seksi Media', seksi: ['Seksi Media'] }] },
  pengurus: [{ id: 'p', jabatan: 'Koordinator BPN', rank: 80, orang: [mk('1', 'Albertus Budi')] }, { id: 'q', jabatan: 'Koordinator Seksi', rank: 30, orang: [mk('2', 'Olive')] }],
  tim: [{ id: 't', orang: mk('1', 'Fransiska Lany'), seksi: ['Tim Kerja Kepemudaan'], bidang: ['Bidang 1'], kategori: 'BPN INTI', status: 'AKTIF', mulai: '2025-11-01', selesai: '2028-09-16', jabatanBpn: ['BPN Inti'], jabatanBpk: ['Koordinator BPK'] }, { id: 'u', orang: null, seksi: [], bidang: [], kategori: '', status: 'SELESAI', mulai: '', selesai: '', jabatanBpn: [], jabatanBpk: [] }],
  pdpkk: [{ id: 'd', nama: 'PD Anak', keuskupan: 'Bogor', jenis: 'PD OMK Anak', koordinator: [mk('3', 'Dave')], jumlahUmat: 5 }],
  bpkList: [{id:'r1',nama:'Surabaya',status:'BPK',aktif:true,lat:-7.2575,lng:112.7521},{id:'recB',nama:'Agats',status:'BPK',aktif:true,lat:-5.54,lng:138.12},{id:'recC',nama:'Labuan Bajo',status:'BPK Penghubung',aktif:true,lat:-8.4967,lng:119.8877}], event: [{ id: 'e', nama: 'Rapat', tanggal: '2026-11-20', status: 'Todo' }], tugas: [{ id: 'k', nama: 'Tugas', status: 'Belum dimulai', prioritas: '', tenggat: '2026-11-25', seksi: ['Seksi A'], penanggungjawab: [] }] };
const report = { pleno: { total: 5, kehadiran: [{ label: 'HADIR', value: 3 }], kelengkapanFoto: [], kategori: [], transportasi: [], kedatangan: [], bawaPasangan: [], pasangan: 1, pastor: 1 }, tc: { pendaftar: 4, kelompok: 2, mentor: 2, statusTC: [], statusSHDR: [], verifikasi: [], kelompokUsia: [], jenisKelamin: [], perKeuskupan: [], kategoriMentor: [] }, kepemudaan: { bpkAktif: 3, bpkPunyaPIC: 1, bpkBelumPIC: 2, pdpkkTotal: 5, pdpkkJenis: [], statusPesertaTC: [] } };
const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://x.test/' });
const w = dom.window; const errs = [];
w.addEventListener('error', (e) => errs.push(e.message));
const adm = { tree:{dashboard:[],proker:['keuskupan','semua','ringkasan','acc'],admin:['pengguna','role']}, seksi:['Tim Kerja Dana'], roles:[{id:'',nama:'Admin',sistem:true,terkunci:true,hak:{},cakupan:'Nasional',seksi:'',tingkat:'',kat:'',desk:'',pakai:1,diubah:false},{id:'recR1',nama:'Koordinator – Tim Kerja Dana',sistem:false,terkunci:false,hak:{dashboard:'view'},cakupan:'Nasional',seksi:'Tim Kerja Dana',tingkat:'Koordinator',kat:'',desk:'',pakai:2,diubah:true}], users:[{id:'u1',email:'a@b.c',nama:'Ani',aktif:true,pending:false,roles:['Admin'],auto:['Koordinator – Tim Kerja Dana'],lastLogin:'',person:''}] };
w.fetch = async (u) => ({ status: 200, ok: true, json: async () => (u.includes('/api/report') ? report : u.includes('/api/admin') ? adm : data) });
w.eval(fs.readFileSync(root + 'peta.js', 'utf8')); w.eval(fs.readFileSync(root + 'app.js', 'utf8'));
w.document.getElementById('lstep'); const routes = ['pendataan', 'dashboard', 'proker/keuskupan', 'proker/semua', 'proker/ringkasan', 'proker/acc', 'pengurus', 'pd/daftar', 'pd/ringkasan', 'tim/bagan', 'tim/daftar', 'laporan/pleno', 'laporan/tc', 'laporan/kepemudaan', 'admin/pengguna', 'admin/role'];
(async () => {
  await new Promise((r) => setTimeout(r, 50));
  for (const r of routes) {
    try { w.location.hash = '#/' + r; w.dispatchEvent(new w.HashChangeEvent('hashchange')); await new Promise((x) => setTimeout(x, 80)); const len = w.document.getElementById('page').innerHTML.length; console.log((len > 200 ? 'OK  ' : 'THIN') + ' ' + r + ' ' + len); } catch (e) { console.log('ERR ' + r + ' ' + e.message); }
  }
  w.location.hash = '#/proker/semua'; w.dispatchEvent(new w.HashChangeEvent('hashchange')); await new Promise((x) => setTimeout(x, 80));
  const tr = w.document.querySelector('tr.prow'); tr.dispatchEvent(new w.MouseEvent('click', { bubbles: true, clientX: 50, clientY: 50 }));
  console.log('menu', !!w.document.getElementById('pmenu'));
  w.document.querySelector('#pmenu button[data-a=edit]').click(); console.log('edit modal', !!w.document.getElementById('ef'));
  w.document.querySelector('#ec').click();
  w.document.querySelector('tr.prow a.bpk')?.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); console.log('bpk modal', /Koordinator BPK/.test(w.document.getElementById('ov')?.textContent || ''), /api\/wa\?p=x1/.test(w.document.getElementById('ov')?.innerHTML || ''));
  w.location.hash = '#/dashboard'; w.dispatchEvent(new w.HashChangeEvent('hashchange')); await new Promise((x) => setTimeout(x, 80));
  w.document.querySelectorAll('.kpi.clk').forEach((k) => k.dispatchEvent(new w.MouseEvent('click', { bubbles: true })));
  console.log('drill', w.document.querySelector('#ov table') ? 'ok' : 'none');
  w.location.hash = '#/laporan/pleno'; w.dispatchEvent(new w.HashChangeEvent('hashchange')); await new Promise((x) => setTimeout(x, 80));
  w.document.querySelector('.lg .clk')?.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); console.log('lap drill', !!w.document.querySelector('#ov table'));
  console.log('window errors:', errs);
  console.log(w.document.querySelector('#page').textContent.slice(0, 0));
})();

setTimeout(async () => { try {
  const doc = w.document; w.location.hash = '#/dashboard'; w.dispatchEvent(new w.HashChangeEvent('hashchange')); await new Promise((x) => setTimeout(x, 100)); const card = [...doc.querySelectorAll('.kpi.clk')].find((e) => /BPK di Indonesia/.test(e.textContent)); console.log('kartu', !!card, [...doc.querySelectorAll('.kpi')].map((k) => k.className + ':' + k.textContent.slice(0, 25)).join(' | ')); card.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const dots = doc.querySelectorAll('.mapbox .pt'); console.log('peta titik', dots.length, 'daftar', doc.querySelectorAll('#dt a.bpk').length, 'path', !!doc.querySelector('.mapbox path'));
  const c = dots[0].querySelector('.dot'); console.log('xy', c.getAttribute('cx'), c.getAttribute('cy'));
  dots[0].dispatchEvent(new w.MouseEvent('click', { bubbles: true })); console.log('profil', /Surabaya|Agats/.test(doc.querySelector('#ov')?.textContent || ''));
} catch (e) { console.log('PETA ERR', e.message); } }, 4000);

setTimeout(async () => { try {
  const doc = w.document; w.location.hash = '#/pengurus'; w.dispatchEvent(new w.HashChangeEvent('hashchange')); await new Promise((x) => setTimeout(x, 150));
  const n = () => doc.querySelectorAll('#pgr .pc').length;
  console.log('PG harian', n(), doc.querySelector('#pgn').textContent);
  doc.querySelector('[data-g=inti]').dispatchEvent(new w.MouseEvent('click', { bubbles: true })); console.log('PG inti', n());
  doc.querySelector('[data-g=tim]').dispatchEvent(new w.MouseEvent('click', { bubbles: true })); console.log('PG tim', n());
  doc.querySelector('[data-g=inti]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const q = doc.querySelector('#pgq'); q.value = 'ani'; q.dispatchEvent(new w.Event('input', { bubbles: true })); console.log('PG cari ani', n());
  q.value = ''; q.dispatchEvent(new w.Event('input', { bubbles: true }));
  const k = doc.querySelector('#pgj'); k.value = 'Koordinator BPK Semarang'; k.dispatchEvent(new w.Event('change', { bubbles: true })); console.log('PG filter jab', n(), 'opsi', k.options.length);
} catch (e) { console.log('PG ERR', e.message); } }, 6000);

setTimeout(async () => { try {
  const doc = w.document; w.location.hash = '#/pendataan'; w.dispatchEvent(new w.HashChangeEvent('hashchange')); await new Promise((x) => setTimeout(x, 150));
  console.log('PD overview', doc.querySelectorAll('tr[data-pbk]').length);
  [...doc.querySelectorAll('tr[data-pbk]')].find((t) => t.dataset.pbk === 'r1').dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await new Promise((x) => setTimeout(x, 100));
  console.log('PD detail', /Surabaya/.test(doc.getElementById('page').textContent), 'riwayat', /Mantan Koor/.test(doc.getElementById('page').textContent), 'tambah', !!doc.querySelector('[data-tbh]'));
  doc.querySelector('[data-tbh]').dispatchEvent(new w.MouseEvent('click', { bubbles: true })); console.log('PD form', !!doc.getElementById('pjf'));
  const f = doc.getElementById('pjf'); f.elements.jab.value = 'recJ2'; f.elements.jab.dispatchEvent(new w.Event('change')); console.log('PD akhiri box', !!doc.querySelector('.warnbox'));
  w.document.querySelector('#ov .x').click();
  w.location.hash = '#/pengurus'; w.dispatchEvent(new w.HashChangeEvent('hashchange')); await new Promise((x) => setTimeout(x, 150));
  doc.querySelector('[data-g=harian]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  console.log('PG ganti', !!doc.querySelector('[data-gnt]'), 'riw', !!doc.querySelector('[data-riw]'));
  doc.querySelector('[data-gnt]').dispatchEvent(new w.MouseEvent('click', { bubbles: true })); console.log('PG ganti modal', !!doc.getElementById('gf'));
  w.document.querySelector('#ov .x').click();
  doc.querySelector('#pgpv').click(); await new Promise((x) => setTimeout(x, 100)); console.log('PG preview', !!doc.getElementById('pvf'), doc.querySelectorAll('#pvf input,#pvf select').length);
  doc.getElementById('ov')?.remove(); w.location.hash = '#/pengurus'; w.dispatchEvent(new w.HashChangeEvent('hashchange')); await new Promise((x) => setTimeout(x, 150)); console.log('pgrw', !!doc.querySelector('#pgrw'), !!doc.querySelector('#pgpv'), doc.getElementById('page').innerHTML.slice(0,80)); doc.querySelector('#pgrw').click(); console.log('PG riwayat', /Pak Lama/.test(doc.getElementById('ov').textContent));
} catch (e) { console.log('NEW ERR', e.stack.split('\n').slice(0,3).join(' | ')); } }, 9000);
