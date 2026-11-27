'use strict';
/* ===== util ===== */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = new Intl.NumberFormat('id-ID');
const rp = (n) => (n ? 'Rp ' + nf.format(Math.round(n)) : '–');
const rpShort = (n) => (n >= 1e9 ? 'Rp ' + (n / 1e9).toFixed(2).replace('.', ',') + ' M' : n >= 1e6 ? 'Rp ' + (n / 1e6).toFixed(1).replace('.', ',').replace(',0', '') + ' jt' : rp(n));
const BLN = { Jan: 'Januari', Feb: 'Februari', Mar: 'Maret', Apr: 'April', Mei: 'Mei', Jun: 'Juni', Jul: 'Juli', Agust: 'Agustus', Sept: 'September', Okt: 'Oktober', Nov: 'November', Dec: 'Desember' };
const BLN3 = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const PAL = ['#3B82F6', '#14B8A6', '#F5A524', '#FF7A6B', '#8B7CF6', '#34C28A', '#38BDF8', '#F472B6'];
const initials = (n) => String(n || '?').replace(/\(.*?\)|Romo|Mgr|Pastor|Sr\.?|Br\.?/gi, '').trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || '?';
const hue = (s) => PAL[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % PAL.length];
const av = (n) => `<div class="av" style="background:${hue(n)}">${esc(initials(n))}</div>`;
const chip = (t, tone = 'gray') => `<span class="chip c-${tone}">${esc(t)}</span>`;
const fdate = (iso) => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${+d} ${BLN3[+m - 1]} ${y}`; };
const monthLabel = (ym) => { const [y, m] = ym.split('-'); return `${Object.values(BLN)[+m - 1]} ${y}`; };
const uniq = (a) => [...new Set(a)];
const by = (arr, fn) => arr.reduce((m, x) => { const k = fn(x); (m[k] = m[k] || []).push(x); return m; }, {});
const sum = (a, f) => a.reduce((s, x) => s + (f(x) || 0), 0);
const cmp = (a, b) => String(a).localeCompare(String(b), 'id');
let DR = [];
const reg = (fn) => { DR.push(fn); return DR.length - 1; };
const drillReg = (title, d) => (d ? reg((l) => openDrill(`${title} · ${l}`, matchRows(d.rows, d.get, l), d.cols)) : null);
const dat = (id, l) => (id === null ? '' : ` data-dr="${id}" data-l="${esc(l)}"`);

/* ===== state ===== */
let D = null, R = null, ADM = null; // data, laporan, admin
const S = { pf: { tahun: '', bulan: '', status: '', acc: '', metode: '', q: '', role: 'penerima', scope: 'resmi' }, sort: { k: 'waktu', d: 1 },
  pdf: { kus: '', jenis: '', q: '' }, pg: { g: 'harian', kus: '', jab: '', q: '' }, tf: { status: 'AKTIF', kat: '', bidang: '', q: '' }, showDone: false };

/* ===== menu ===== */
const I = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  clip: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9z"/><path d="M9 12h6M9 16h4"/>',
  star: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  pd: '<circle cx="9" cy="8" r="3.2"/><circle cx="17" cy="9" r="2.6"/><path d="M3 20c.6-3.5 3-5.5 6-5.5s5.400 2 6 5.500"/><path d="M15.500 14.800c2.700-.4 4.800 1.300 5.500 4.200"/>',
  team: '<rect x="9" y="3" width="6" height="5" rx="1.500"/><rect x="3" y="16" width="6" height="5" rx="1.500"/><rect x="15" y="16" width="6" height="5" rx="1.500"/><path d="M12 8v4M6 16v-4h12v4"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  book: '<path d="M4 5.500A2.500 2.500 0 016.500 3H20v15H6.500A2.500 2.500 0 004 20.500z"/><path d="M4 20.500V5.500M9 8h7M9 12h7"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>',
};
const MENU = [
  { id: 'dashboard', label: 'Dashboard', icon: I.home, sub: 'Ringkasan tugas, program, dan agenda untuk Anda', c: '#3B82F6' },
  { g: 'PROGRAM', id: 'proker', label: 'Program Kerja', icon: I.clip, sub: 'Program kerja BPN untuk Keuskupan', c: '#F5A524', tabs: [['keuskupan', 'Per Keuskupan', 'proker/keuskupan', 'proker/keuskupan', 0, 1], ['semua', 'Semua Program'], ['ringkasan', 'Ringkasan & Grafik'], ['acc', 'Syarat ACC'], ['tugas', 'Proyek & Tugas', 'proker/tugas', 'proker/tugas', 1]] },
  { g: 'PROGRAM', id: 'laporan', label: 'Laporan', icon: I.chart, sub: 'Ringkasan kegiatan', c: '#34C28A', tabs: [['pleno', 'Pleno & Golden Jubilee'], ['tc', 'TC SHDR'], ['kepemudaan', 'Kepemudaan']] },
  { id: 'profil', label: 'Profil Saya', icon: I.star, sub: 'Lihat dan lengkapi data diri Anda', c: '#E0661A', always: true, hide: true },
  { g: 'ORGANISASI', id: 'org', label: 'Organisasi', icon: I.team, sub: 'Tim, bagan, dan pengurus BPN', c: '#FF7A6B', tabs: [['saya', 'Tim Saya', 'tim/saya', 'tim/saya', 1], ['bagansaya', 'Bagan Tim Saya', 'tim/bagan', 'org/bagansaya', 1], ['bagan', 'Bagan Seluruh Tim', 'tim/bagan', 'tim/bagan'], ['pengurus', 'Daftar Pengurus BPN', 'pengurus', 'pengurus'], ['daftar', 'Daftar Anggota Tim', 'tim/daftar', 'tim/daftar']] },
  { g: 'DATA', id: 'umat', label: 'Data Umat', icon: I.pd, sub: 'Profil umat yang terdaftar di sistem BPN', c: '#0EA5A4', tabs: [['ringkasan', 'Infografis'], ['daftar', 'Daftar Umat']] },
  { g: 'DATA', id: 'pd', label: 'Koordinator PD', icon: I.pd, sub: 'Persekutuan Doa dan koordinatornya', c: '#14B8A6', tabs: [['daftar', 'Daftar PD'], ['ringkasan', 'Ringkasan']] },
  { g: 'DATA', id: 'pendataan', label: 'Pendataan PIC', icon: I.pd, sub: 'Pejabat dan PIC di setiap BPK, lengkap dengan riwayatnya', c: '#E0661A' },
  { g: 'BELAJAR', id: 'ls', label: 'Belajar', icon: I.book, sub: 'Learning System (TC, learning path, penilaian pengajar) dan Modul Berjenjang', c: '#6D28D9', tabs: [['peserta', 'Belajar'], ['diskusi', 'Diskusi'], ['daftar', 'Daftar TC'], ['dasbor', 'Dasbor'], ['pendaftar', 'Pendaftar'], ['laporan', 'Laporan BPK'], ['tc', 'Kelola TC'], ['pengajar', 'Pengajar'], ['m-ringkasan', 'Modul: Ringkasan', 'modul/ringkasan', 'modul/ringkasan'], ['m-daftar', 'Daftar Modul', 'modul/permodul', 'modul/daftar'], ['m-permodul', 'Modul: Per Modul', 'modul/permodul', 'modul/permodul'], ['m-peserta', 'Modul: Peserta Lulus', 'modul/peserta', 'modul/peserta'], ['m-pengajar', 'Modul: Pengajar', 'modul/pengajar', 'modul/pengajar']] },
  { id: 'admin', hide: true, label: 'Administrasi', icon: I.key, sub: 'Kelola pengguna dan hak akses', c: '#6B7A99', tabs: [['pengguna', 'Pengguna'], ['role', 'Role & Hak Akses']] },
];

/* ===== komponen ===== */
function bars(title, list, { max = 10, colour, drill } = {}) {
  list = (list || []).slice(0, max);
  const dr = drillReg(title, drill);
  const mx = Math.max(1, ...list.map((x) => x.value));
  const body = list.length ? list.map((x, i) => `<div class="bar${dr === null ? '' : ' clk'}"${dat(dr, x.label)}><div class="l" title="${esc(x.label)}">${esc(x.label)}</div><div class="b"><i style="width:${(x.value / mx) * 100}%;background:${colour || PAL[i % PAL.length]}"></i></div><div class="v">${x.fmt || nf.format(x.value)}</div></div>`).join('') : '<div class="empty">Belum ada data</div>';
  return `<div class="card"><h3>${esc(title)}</h3>${body}</div>`;
}
function donut(title, list, drill) {
  const dr = drillReg(title, drill);
  const tot = sum(list, (x) => x.value);
  let acc = 0;
  const stops = list.map((x, i) => { const a = acc / (tot || 1) * 100; acc += x.value; return `${PAL[i % PAL.length]} ${a}% ${acc / (tot || 1) * 100}%`; }).join(',');
  return `<div class="card"><h3>${esc(title)}</h3>${tot ? `<div class="donut"><div class="ring" data-c="${nf.format(tot)}" style="background:conic-gradient(${stops})"></div><div class="lg">${list.map((x, i) => `<div class="${dr === null ? '' : 'clk'}"${dat(dr, x.label)}><i style="background:${PAL[i % PAL.length]}"></i>${esc(x.label)}<b>${nf.format(x.value)}</b></div>`).join('')}</div></div>` : '<div class="empty">Belum ada data</div>'}</div>`;
}
function columns(title, list, drill) {
  const dr = drillReg(title, drill);
  const mx = Math.max(1, ...list.map((x) => x.value));
  return `<div class="card"><h3>${esc(title)}</h3><div class="cols">${list.map((x, i) => `<div class="c${dr === null ? '' : ' clk'}"${dat(dr, x.label)}><b>${x.value || ''}</b><i style="height:${Math.max(4, (x.value / mx) * 120)}px;background:${PAL[i % PAL.length]}"></i><span>${esc(x.label)}</span></div>`).join('')}</div></div>`;
}
const count = (arr, fn, { split = false } = {}) => {
  const m = {}; arr.forEach((x) => { let v = fn(x); v = Array.isArray(v) ? v : [v]; (v.length ? v : ['(kosong)']).forEach((k) => { k = k || '(kosong)'; m[k] = (m[k] || 0) + 1; }); });
  return Object.entries(m).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
};
const kpi = (label, n, { c = 'var(--navy)', t = 'var(--blue-t)', delta, note, go } = {}) => {
  const gid = go ? reg(go) : null;
  let d = '';
  if (delta) { const diff = delta.now - delta.prev; d = diff > 0 ? `<div class="d up">▲ +${nf.format(diff)} dari bulan lalu</div>` : diff < 0 ? `<div class="d down">▼ ${nf.format(diff)} dari bulan lalu</div>` : '<div class="d flat">● Sama dengan bulan lalu</div>'; }
  return `<div class="card kpi${gid === null ? '' : ' clk'}"${dat(gid, '')} style="--c:${c};--t:${t}"><div class="l">${esc(label)}</div><div class="n">${nf.format(n)}</div>${d}${note ? `<div class="note">${esc(note)}</div>` : ''}</div>`;
};
const person = (p, jab, extra) => `<div class="card pc">${av(p.nama)}<div style="min-width:0"><div class="n">${esc(p.nama)}</div><div class="j">${esc(jab || '')}</div><div class="j">${esc(p.keuskupan)}</div><div class="acts">${p.adaWa ? `<a class="wa" target="_blank" rel="noopener" href="/api/wa?p=${esc(p.id)}">WhatsApp</a>` : ''}${p.email ? `<a class="wa em" href="mailto:${esc(p.email)}">Email</a>` : ''}${extra || ''}</div></div></div>`;

/* ===== Program Kerja: status ===== */
const TONE_STATUS = { 'BELUM DIMULAI': 'gray', 'ON PROGRESS': 'amber', SELESAI: 'green', DIBATALKAN: 'violet' };
const stChips = (p) => `<div class="chips">${chip(p.status || 'Belum diisi', TONE_STATUS[p.status] || 'gray')}${chip(p.acc ? 'ACC: ' + p.acc : 'Belum ACC', p.acc === 'DISETUJUI' ? 'green' : p.acc ? 'coral' : 'gray')}${p.deal ? chip('Deal ✓', 'teal') : chip('Belum deal', 'gray')}</div>`;
// Syarat ACC (dari filter Airtable): Pelaksana = BPK, Deal dicentang, ACC = DISETUJUI
const syarat = (p) => ({ pelaksana: p.pelaksanaTipe === 'BPK', deal: p.deal, acc: p.acc === 'DISETUJUI' });
const lolos = (p) => { const s = syarat(p); return s.pelaksana && s.deal && s.acc; };
const waktu = (p) => (p.bulan && p.tahun ? `${p.bulan} ${p.tahun}` : p.tahun || '–');
const sortKey = (p) => (p.tahun || '9999') + String(p.bulanIdx < 0 ? 99 : p.bulanIdx).padStart(2, '0');
function filtered() {
  const f = S.pf, q = f.q.toLowerCase();
  return D.proker.filter((p) => (f.scope !== 'resmi' || lolos(p)) && (!f.tahun || p.tahun === f.tahun) && (!f.bulan || p.bulan === f.bulan) && (!f.status || p.status === f.status) && (!f.acc || (f.acc === 'BELUM' ? !p.acc : p.acc === f.acc)) && (!f.metode || p.metode === f.metode)
    && (!q || [p.program, p.detil, p.catatan, p.penerima.join(' '), p.pelaksana.join(' '), p.seksi.join(' ')].join(' ').toLowerCase().includes(q)));
}
function pfBar(withRole) {
  const o = (arr) => arr.filter(Boolean).map((x) => `<option>${esc(x)}</option>`).join('');
  const sel = (k, label, opts) => `<div><label>${label}</label><select data-pf="${k}"><option value="">Semua</option>${opts}</select></div>`;
  const scope = `<div style="flex:none"><label>Tampilkan</label><div class="seg" id="scope"><button data-scope="resmi" class="${S.pf.scope === 'resmi' ? 'on' : ''}">Program resmi (syarat ACC lengkap)</button><button data-scope="semua" class="${S.pf.scope === 'semua' ? 'on' : ''}">Semua program</button></div></div>`;
  return `<div class="filters">${scope}${withRole ? `<div style="flex:none"><label>Lihat sebagai</label><div class="seg" id="role"><button data-role="penerima" class="${S.pf.role === 'penerima' ? 'on' : ''}">Keuskupan yang dilayani</button><button data-role="pelaksana" class="${S.pf.role === 'pelaksana' ? 'on' : ''}">Keuskupan yang melayani</button></div></div>` : ''}
    ${sel('tahun', 'Tahun', o(uniq(D.proker.map((p) => p.tahun)).sort()))}
    ${sel('bulan', 'Bulan', Object.keys(BLN).map((b) => `<option value="${b}">${BLN[b]}</option>`).join(''))}
    ${sel('status', 'Status', o(Object.keys(TONE_STATUS)))}
    ${sel('acc', 'ACC', '<option>DISETUJUI</option><option>DITUNDA</option><option value="BELUM">Belum ACC</option>')}
    ${sel('metode', 'Metode', o(uniq(D.proker.map((p) => p.metode))))}
    <div class="q"><label>Cari</label><input data-pf="q" placeholder="Program, keuskupan, seksi…" value="${esc(S.pf.q)}"></div></div>`;
}
function bindFilters(cb) {
  document.querySelectorAll('[data-pf]').forEach((el) => {
    el.value = S.pf[el.dataset.pf];
    el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => { S.pf[el.dataset.pf] = el.value; cb(); });
  });
  document.querySelectorAll('#scope button').forEach((b) => b.addEventListener('click', () => { S.pf.scope = b.dataset.scope; document.querySelectorAll('#scope button').forEach((x) => x.classList.toggle('on', x === b)); cb(); }));
  document.querySelectorAll('#role button').forEach((b) => b.addEventListener('click', () => { S.pf.role = b.dataset.role; document.querySelectorAll('#role button').forEach((x) => x.classList.toggle('on', x === b)); cb(); }));
}
function prokerKpis(rows) {
  const ok = rows.filter(lolos).length;
  return `<div class="grid g4" style="margin-bottom:16px">${kpi('Program kerja', rows.length, { c: 'var(--navy)', t: 'var(--blue-t)', go: () => openDrill('Program kerja', rows, C.proker) })}${kpi('Anggaran dari BPN', 0, { c: '#9A6200', t: 'var(--amber-t)', go: () => openDrill('Program kerja berdasarkan anggaran', rows.filter((p) => p.anggaran).sort((a, b) => b.anggaran - a.anggaran), C.proker) }).replace('>0<', `>${rpShort(sum(rows, (p) => p.anggaran))}<`)}${kpi('Keuskupan dilayani', uniq(rows.flatMap((p) => p.penerima)).length, { c: '#0B8277', t: 'var(--teal-t)', go: () => openDrill('Keuskupan yang dilayani', count(rows, (p) => p.penerima).map((x) => ({ nama: x.label, n: x.value })), [['Keuskupan', (x) => `<b>${esc(x.nama)}</b>`], ['Jumlah program', (x) => x.n]]) })}${kpi('Memenuhi syarat ACC', ok, { c: '#13805A', t: 'var(--green-t)', note: S.pf.scope === 'resmi' ? 'Pelaksana BPK · Deal · ACC disetujui' : `${nf.format(rows.length - ok)} belum memenuhi`, go: () => openDrill('Program yang memenuhi syarat ACC', rows.filter(lolos), C.proker) })}${kpi('Program sedang berjalan', rows.filter((p) => p.status === 'ON PROGRESS').length, { c: '#5B4CD1', t: 'var(--violet-t)', note: 'berstatus ON PROGRESS', go: () => openDrill('Program sedang berjalan', rows.filter((p) => p.status === 'ON PROGRESS'), C.proker) })}</div>`;
}

/* ===== PAGES ===== */
const PAGES = {};

PAGES.dashboard = () => {
  const t = D.today, ym = t.slice(0, 7), now = new Date(t + 'T00:00:00');
  const T0 = D.user.tim || {}, mine = !!(T0.ada && !T0.semua), P = mine ? D.proker.filter((p) => p.seksi.some((n) => T0.seksi.includes(n))) : D.proker, running = P.filter((p) => p.status === 'ON PROGRESS');
  const saya = (x) => (x.pj || []).includes(D.user.pid) || (!D.user.pid && x.penanggungjawab.includes(D.user.nama)), seksiku = (x) => mine && x.seksi.some((n) => T0.seksi.includes(n));
  const myOpen = D.tugas.filter((x) => saya(x) && x.status !== 'Selesai').sort((a, b) => (a.tenggat || '9999').localeCompare(b.tenggat || '9999')), seksiOpen = D.tugas.filter((x) => seksiku(x) && x.status !== 'Selesai');
  const nextYm = (n) => { const d = new Date(now.getFullYear(), now.getMonth() + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
  const win = [nextYm(0), nextYm(1), nextYm(2)];
  const pym = (p) => (p.tahun && p.bulanIdx >= 0 ? `${p.tahun}-${String(p.bulanIdx + 1).padStart(2, '0')}` : '');
  const up = P.filter((p) => win.includes(pym(p)) && p.acc === 'DISETUJUI' && !['SELESAI', 'DIBATALKAN'].includes(p.status));
  const byM = by(up, pym);
  const events = D.event.filter((e) => e.tanggal >= t && e.status !== 'Done').sort((a, b) => cmp(a.tanggal, b.tanggal));
  const lim = new Date(now.getTime() + 30 * 864e5).toISOString().slice(0, 10);
  const tasks = D.tugas.filter((x) => (!mine || saya(x) || seksiku(x)) && x.tenggat && x.tenggat >= t && x.tenggat <= lim && x.status !== 'Selesai').sort((a, b) => cmp(a.tenggat, b.tenggat));
  const dbox = (iso) => { const [, m, d] = iso.split('-'); return `<div class="date"><b>${+d}</b><span>${BLN3[+m - 1]}</span></div>`; };
  const fixed = [...events.map((e) => ({ d: e.tanggal, t: e.nama, s: 'Agenda BPN', tone: 'blue' })), ...tasks.map((x) => ({ d: x.tenggat, t: x.nama, s: `Tenggat tugas${x.seksi.length ? ' · ' + x.seksi[0] : ''}`, tone: 'coral' }))].sort((a, b) => cmp(a.d, b.d));
  const pLine = (p) => `<div class="tli prow" data-pid="${p.id}"><div style="flex:1;min-width:0"><div class="t">${esc(p.program || p.label)}${p.detil ? ` <span class="s">· ${esc(p.detil)}</span>` : ''}</div><div class="s">${p.penerima.length ? 'Dilayani: ' + esc(p.penerima.join(', ')) : 'Penerima belum diisi'}${p.pelaksana.length ? ' · Melayani: ' + esc(p.pelaksana.join(', ')) : ''}</div></div><div>${chip(p.metode || '—', 'blue')}</div></div>`;
  return `<div class="hero"><div><h2>Halo, ${esc((D.user.nama || '').split(' ')[0])} 👋</h2><p>${esc(fdate(t))} · Semoga pelayanan hari ini berbuah.${mine ? ` · Seksi Anda: ${esc(T0.seksi.map((n) => n.replace(/^Tim Kerja\s*/, '')).join(', '))}` : ''}</p></div></div>
  ${mine || myOpen.length ? `<div class="grid g3" style="margin-bottom:18px">${kpi('Tugas saya', myOpen.length, { c: '#E0661A', t: 'var(--amber-t)', note: myOpen.length ? `${myOpen.filter((x) => x.tenggat && x.tenggat < t).length} lewat tenggat` : 'tidak ada tugas terbuka' })}${mine ? kpi('Program kerja seksi saya', P.length, { c: '#5B4CD1', t: 'var(--violet-t)', note: `${running.length} sedang berjalan`, go: () => openDrill('Program kerja seksi saya', P, C.proker) }) : ''}${mine ? kpi('Tugas seksi belum selesai', seksiOpen.length, { c: '#0B8277', t: 'var(--teal-t)', note: 'dari semua anggota seksi' }) : ''}</div>
  ${myOpen.length ? `<div class="card" style="margin-bottom:18px"><h3>Tugas saya<small>belum selesai, urut tenggat</small></h3>${myOpen.slice(0, 8).map((x) => `<div class="tli"><div style="flex:1"><div class="t">${esc(x.nama)}</div><div class="s">${esc(x.seksi.join(', '))}${x.prioritas ? ' · ' + esc(x.prioritas) : ''}</div></div>${chip(x.status || 'Belum dimulai', x.status === 'Dalam proses' ? 'amber' : 'gray')}${x.tenggat ? chip(fdate(x.tenggat), x.tenggat < t ? 'coral' : 'blue') : ''}</div>`).join('')}</div>` : ''}` : ''}
  <div class="grid g2">
    <div class="card"><h3>Agenda terdekat<small>Tanggal pasti, 30 hari ke depan</small></h3>${fixed.length ? `<div class="tl">${fixed.map((x) => `<div class="tli">${dbox(x.d)}<div style="flex:1"><div class="t">${esc(x.t)}</div><div class="s">${esc(x.s)}</div></div>${chip(fdate(x.d), x.tone)}</div>`).join('')}</div>` : '<div class="empty">Belum ada agenda bertanggal dalam 30 hari ke depan.</div>'}
      <h3 style="margin-top:18px">Program kerja yang dijadwalkan<small>ACC disetujui, 3 bulan ke depan</small></h3>
      ${win.map((m) => `<div class="mh"><i></i>${monthLabel(m)} ${byM[m] ? chip(byM[m].length + ' program', 'blue') : ''}</div>${byM[m] ? byM[m].map(pLine).join('') : '<div class="empty" style="margin-bottom:6px">Tidak ada program terjadwal.</div>'}`).join('')}
    </div>
    <div class="card"><h3>Program kerja sedang berjalan</h3>${running.length ? running.map(pLine).join('') : `<div class="empty">Belum ada program berstatus ON PROGRESS.<br>Ubah status program di Airtable menjadi ON PROGRESS agar tampil di sini.</div>`}
      <h3 style="margin-top:18px">Ringkas<small>${mine ? 'program kerja seksi Anda' : 'seluruh program kerja'}</small></h3>
      <div class="chips">${chip(P.length + ' program', 'blue')}${chip(P.filter((p) => p.status === 'SELESAI').length + ' selesai', 'green')}${chip(P.filter((p) => p.status === 'BELUM DIMULAI').length + ' belum dimulai', 'gray')}${chip(P.filter(lolos).length + ' memenuhi syarat ACC', 'teal')}${chip(rpShort(sum(D.proker, (p) => p.anggaran)) + ' anggaran', 'amber')}</div>
      <p class="note" style="margin-top:12px">Angka naik/turun dihitung dari tanggal data masuk ke Airtable dibanding awal bulan ini.</p></div>
  </div>`;
};

/* --- Program Kerja --- */
function rowsFor(p, role) {
  const list = role === 'penerima' ? p.penerima : p.pelaksana;
  const arr = list.length ? list : ['(belum diisi)'];
  return arr.map((k) => ({ k, p, share: p.anggaran / arr.length }));
}
function tableRows(entries, role) {
  return `<div class="tw"><table><thead><tr><th>Waktu</th><th>Program</th><th>${role === 'penerima' ? 'Dilayani oleh' : 'Melayani'}</th><th>Metode</th><th>Sumber dana</th><th class="num">Anggaran</th><th>Status</th></tr></thead><tbody>${entries.map(({ p, share }) => `<tr class="prow" data-pid="${p.id}"><td class="sub" style="white-space:nowrap"><b style="color:var(--ink)">${esc(waktu(p))}</b></td><td><b>${esc(p.program || p.label)}</b>${p.detil ? `<div class="sub">${esc(p.detil)}</div>` : ''}${p.catatan ? `<div class="sub">📝 ${esc(p.catatan)}</div>` : ''}<div class="sub">${esc(p.seksi.join(', '))}</div></td><td>${bpkLinks(role === 'penerima' ? p.pelaksana : p.penerima) || (p.pelaksanaTipe === 'BPN' ? 'BPN' : '–')}</td><td>${esc(p.metode || '–')}</td><td class="sub">${esc(p.sumberDana || '–')}</td><td class="num">${rp(share)}</td><td>${stChips(p)}</td></tr>`).join('')}</tbody></table></div>`;
}
PAGES['proker/keuskupan'] = () => {
  const draw = () => {
    const rows = filtered(), role = S.pf.role;
    const g = by(rows.flatMap((p) => rowsFor(p, role)), (e) => e.k);
    const keys = Object.keys(g).sort(cmp);
    $('#res').innerHTML = prokerKpis(rows) + `<div class="filters" style="margin-bottom:10px"><button class="ghost" id="oa">Buka semua</button><button class="ghost" id="ca">Tutup semua</button><span class="note">${keys.length} keuskupan · anggaran program yang dilayani/dilaksanakan beberapa keuskupan dibagi rata.</span></div>` +
      (keys.length ? keys.map((k, i) => { const es = g[k].sort((a, b) => cmp(sortKey(a.p), sortKey(b.p))); const st = count(es, (e) => e.p.status || 'Belum diisi'); return `<details class="grp"${keys.length <= 3 || i === 0 ? ' open' : ''}><summary><span class="gname">${esc(k)}</span>${chip(es.length + ' program', 'blue')}<span class="gmeta">${st.map((s) => chip(s.value + ' ' + s.label.toLowerCase(), TONE_STATUS[s.label] || 'gray')).join('')}<b>${rp(sum(es, (e) => e.share))}</b></span></summary>${tableRows(es, role)}</details>`; }).join('') : '<div class="empty">Tidak ada program yang sesuai filter.</div>');
    $('#oa')?.addEventListener('click', () => document.querySelectorAll('details.grp').forEach((d) => (d.open = true)));
    $('#ca')?.addEventListener('click', () => document.querySelectorAll('details.grp').forEach((d) => (d.open = false)));
  };
  setTimeout(() => { bindFilters(draw); draw(); });
  return pfBar(true) + '<div id="res"></div>';
};
PAGES['proker/semua'] = () => {
  const cols = [['waktu', 'Waktu'], ['program', 'Program'], ['', 'Dilayani'], ['', 'Melayani'], ['', 'Metode'], ['anggaran', 'Anggaran'], ['', 'Status']];
  const draw = () => {
    const rows = filtered().sort((a, b) => { const k = S.sort.k; const v = k === 'anggaran' ? a.anggaran - b.anggaran : k === 'program' ? cmp(a.program, b.program) : cmp(sortKey(a), sortKey(b)); return v * S.sort.d; });
    $('#res').innerHTML = prokerKpis(rows) + `<div class="tw"><table><thead><tr>${cols.map(([k, l]) => `<th class="${k ? 's' : ''}" data-k="${k}">${l}${S.sort.k === k ? (S.sort.d > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr></thead><tbody>${rows.map((p) => `<tr class="prow" data-pid="${p.id}"><td style="white-space:nowrap"><b>${esc(waktu(p))}</b></td><td><b>${esc(p.program || p.label)}</b>${p.detil ? `<div class="sub">${esc(p.detil)}</div>` : ''}${p.catatan ? `<div class="sub">📝 ${esc(p.catatan)}</div>` : ''}</td><td>${bpkLinks(p.penerima) || '–'}</td><td>${bpkLinks(p.pelaksana) || (p.pelaksanaTipe === 'BPN' ? 'BPN' : '–')}</td><td>${esc(p.metode || '–')}</td><td class="num">${rp(p.anggaran)}</td><td>${stChips(p)}</td></tr>`).join('') || '<tr><td colspan="7"><div class="empty">Tidak ada program yang sesuai filter.</div></td></tr>'}</tbody></table></div>`;
    document.querySelectorAll('th.s').forEach((th) => th.addEventListener('click', () => { S.sort = { k: th.dataset.k, d: S.sort.k === th.dataset.k ? -S.sort.d : 1 }; draw(); }));
  };
  setTimeout(() => { bindFilters(draw); draw(); });
  return pfBar(false) + '<div id="res"></div>';
};
PAGES['proker/ringkasan'] = () => {
  const draw = () => {
    const rows = filtered();
    const dp = (get) => ({ rows, get, cols: C.proker });
    const perYm = Object.entries(by(rows.filter((p) => p.tahun && p.bulanIdx >= 0), (p) => `${p.tahun}-${String(p.bulanIdx + 1).padStart(2, '0')}`)).sort(([a], [b]) => cmp(a, b)).map(([k, v]) => ({ label: `${BLN3[+k.slice(5) - 1]} ${k.slice(2, 4)}`, value: v.length }));
    const ang = Object.entries(by(rows.flatMap((p) => rowsFor(p, 'penerima')), (e) => e.k)).map(([label, v]) => ({ label, value: sum(v, (e) => e.share), fmt: rpShort(sum(v, (e) => e.share)) })).sort((a, b) => b.value - a.value);
    $('#res').innerHTML = prokerKpis(rows) + `<div class="grid g2">${columns('Program per bulan', perYm, dp((p) => `${BLN3[p.bulanIdx]} ${String(p.tahun).slice(2)}`))}${donut('Status pelaksanaan', count(rows, (p) => p.status || 'Belum diisi'), dp((p) => p.status || 'Belum diisi'))}${donut('Status ACC', count(rows, (p) => p.acc || 'Belum ACC'), dp((p) => p.acc || 'Belum ACC'))}${donut('Metode pelaksanaan', count(rows, (p) => p.metode || 'Belum diisi'), dp((p) => p.metode || 'Belum diisi'))}${bars('Seksi penanggung jawab', count(rows, (p) => p.seksi), { drill: dp((p) => p.seksi) })}${bars('Jenis kegiatan', count(rows, (p) => p.jenis), { drill: dp((p) => p.jenis) })}${bars('Sumber dana', count(rows, (p) => p.sumberDana || 'Belum diisi'), { drill: dp((p) => p.sumberDana || 'Belum diisi') })}${bars('Anggaran per keuskupan yang dilayani', ang, { max: 12, drill: dp((p) => p.penerima) })}${bars('Keuskupan yang melayani', count(rows.filter((p) => p.pelaksana.length), (p) => p.pelaksana), { max: 12, drill: dp((p) => p.pelaksana) })}${bars('Program terkait modul berjenjang', count(rows.filter((p) => p.modul.length), (p) => p.modul), { max: 12, drill: dp((p) => p.modul) })}</div>`;
  };
  setTimeout(() => { bindFilters(draw); draw(); });
  return pfBar(false) + '<div id="res"></div>';
};
PAGES['proker/acc'] = () => {
  const ok = D.proker.filter(lolos), no = D.proker.filter((p) => !lolos(p) && p.status !== 'DIBATALKAN');
  const miss = (p) => { const s = syarat(p), m = []; if (!s.pelaksana) m.push(p.pelaksanaTipe ? `Pelaksana ${p.pelaksanaTipe}` : 'Pelaksana belum diisi'); if (!s.deal) m.push('Belum deal'); if (!s.acc) m.push(p.acc ? `ACC ${p.acc}` : 'Belum ACC'); return m; };
  const extra = (p) => { const m = []; if (!p.tahun || !p.bulan) m.push('Waktu belum lengkap'); if (!p.penerima.length) m.push('Penerima kosong'); if (!p.anggaran) m.push('Anggaran 0'); if (!p.sumberDana) m.push('Sumber dana kosong'); return m; };
  const inc = D.proker.filter((p) => extra(p).length);
  return `<div class="card" style="margin-bottom:16px"><h3>Syarat sebuah program kerja dinyatakan ACC</h3><div class="syarat">
    <div class="rule"><div class="ic">1</div><div><b>Pelaksana = BPK</b><div class="note">Program dijalankan oleh BPK.</div></div></div>
    <div class="rule"><div class="ic">2</div><div><b>Deal ✓</b><div class="note">Kesepakatan dengan BPK sudah dicentang.</div></div></div>
    <div class="rule"><div class="ic">3</div><div><b>ACC = DISETUJUI</b><div class="note">Disetujui oleh BPN.</div></div></div></div>
    <p class="note" style="margin:12px 0 0">Mengikuti filter yang dipakai di Airtable. Program yang dijalankan BPN sendiri otomatis tidak memenuhi syarat 1.</p></div>
  <div class="grid g4" style="margin-bottom:16px">${kpi('Memenuhi syarat', ok.length, { c: '#13805A', t: 'var(--green-t)' })}${kpi('Belum memenuhi', no.length, { c: '#C2362B', t: 'var(--coral-t)' })}${kpi('Data belum lengkap', inc.length, { c: '#9A6200', t: 'var(--amber-t)', note: 'waktu / penerima / anggaran / sumber dana' })}${kpi('Anggaran siap cair', 0, { c: '#13805A', t: 'var(--green-t)' }).replace('>0<', `>${rpShort(sum(ok, (p) => p.anggaran))}<`)}</div>
  <div class="card"><h3>Program yang belum memenuhi syarat<small>${no.length}</small></h3><div class="tw"><table><thead><tr><th>Waktu</th><th>Program</th><th>Keuskupan</th><th>Yang belum terpenuhi</th><th>Kelengkapan data</th></tr></thead><tbody>${no.sort((a, b) => cmp(sortKey(a), sortKey(b))).map((p) => `<tr><td style="white-space:nowrap"><b>${esc(waktu(p))}</b></td><td><b>${esc(p.program || p.label)}</b>${p.detil ? `<div class="sub">${esc(p.detil)}</div>` : ''}</td><td>${esc(p.penerima.join(', ') || '–')}</td><td><div class="chips">${miss(p).map((m) => chip(m, 'coral')).join('')}</div></td><td><div class="chips">${extra(p).map((m) => chip(m, 'amber')).join('') || chip('Lengkap', 'green')}</div></td></tr>`).join('') || '<tr><td colspan="5"><div class="empty">Semua program sudah memenuhi syarat 🎉</div></td></tr>'}</tbody></table></div></div>`;
};

/* --- Proyek & Tugas Seksi (tab di Program Kerja) --- */
S.tg = { data: null, loading: false, view: 'kanban', seksi: '', projek: '', mine: false, err: '' };
const tgApi = async (body) => { const r = await fetch('/api/proker', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Gagal menyimpan'); return j; };
async function tgMuat(paksa) {
  if (S.tg.loading || (S.tg.data && !paksa)) return;
  S.tg.loading = true; S.tg.err = '';
  try { const r = await fetch('/api/proker?tugas=1', { credentials: 'same-origin' }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Gagal memuat'); S.tg.data = j; if (!S.tg.seksi || !j.seksi.some((x) => x.id === S.tg.seksi)) S.tg.seksi = (j.seksi[0] || {}).id || ''; }
  catch (e) { S.tg.err = e.message; }
  S.tg.loading = false; render();
}
const TG_PRIO = { 'Penting & Mendesak': ['Kerjakan sekarang', 'coral'], 'Penting & Tidak Mendesak': ['Jadwalkan', 'violet'], 'Kurang Penting & Mendesak': ['Delegasikan', 'amber'], 'Kurang Penting & Tidak Mendesak': ['Tunda', 'gray'] };
const TG_ST = { 'Belum dimulai': 'gray', 'Dalam proses': 'amber', Selesai: 'green' };
const tgSeksiNama = (id) => ((S.tg.data.seksi.find((x) => x.id === id) || {}).nama || '').replace(/^Tim Kerja\s*/, '');
const tgBisaUbah = (t) => { const d = S.tg.data, sk = d.seksi.filter((x) => t.seksi.includes(x.id)); return !!(D.user.tim && D.user.tim.semua) || sk.some((x) => x.kelola) || t.pj.some((p) => p.id === d.saya) || (t.oleh && t.oleh === D.user.nama); };
const tgAnggota = (sid) => { const nama = (S.tg.data.seksi.find((x) => x.id === sid) || {}).nama || '', m = new Map(); D.tim.filter((x) => x.orang && x.status === 'AKTIF' && x.seksi.includes(nama)).forEach((x) => m.set(x.orang.id, x.orang.nama)); return [...m].map(([id, n]) => ({ id, nama: n })).sort((a, b) => cmp(a.nama, b.nama)); };
const tgTugasSaring = () => { const d = S.tg.data; return d.tugas.filter((t) => (!S.tg.seksi || t.seksi.includes(S.tg.seksi)) && (!S.tg.projek || (S.tg.projek === '-' ? !t.projek.length : t.projek.includes(S.tg.projek))) && (!S.tg.mine || t.pj.some((p) => p.id === d.saya))); };
const tgKartu = (t, drag) => `<div class="kcard${t.status === 'Selesai' ? ' done' : ''}" data-tg="${esc(t.id)}"${drag && tgBisaUbah(t) ? ' draggable="true"' : ''}>
  <div class="kt">${esc(t.nama)}</div>
  <div class="km">${t.prio ? chip(TG_PRIO[t.prio] ? TG_PRIO[t.prio][0] : t.prio, TG_PRIO[t.prio] ? TG_PRIO[t.prio][1] : 'gray') : ''}${t.tenggat ? chip('⏰ ' + fdate(t.tenggat), t.status !== 'Selesai' && t.tenggat < D.today ? 'coral' : 'blue') : ''}${t.projek.length ? chip('📁 ' + esc(((S.tg.data.projek.find((p) => p.id === t.projek[0]) || {}).nama || '').slice(0, 24)), 'teal') : ''}</div>
  ${t.pj.length ? `<div class="kpj">${t.pj.slice(0, 4).map((p) => `<span title="${esc(p.nama)}">${esc(initials(p.nama))}</span>`).join('')}${t.pj.length > 4 ? `<span>+${t.pj.length - 4}</span>` : ''}</div>` : ''}</div>`;
function tgKanban(list) {
  return `<div class="kb">${S.tg.data.status.map((st) => { const c = list.filter((t) => t.status === st); return `<div class="kcol" data-st="${esc(st)}"><h4>${chip(st, TG_ST[st] || 'gray')} <span class="sub">${c.length}</span></h4>${c.map((t) => tgKartu(t, true)).join('') || '<div class="sub" style="padding:8px">Kosong</div>'}</div>`; }).join('')}</div>`;
}
function tgMatriks(list) {
  const q = Object.keys(TG_PRIO), buka = list.filter((t) => t.status !== 'Selesai');
  const kotak = (k) => `<div class="mxq"><h4>${esc(k)} ${chip(TG_PRIO[k][0], TG_PRIO[k][1])}</h4>${buka.filter((t) => t.prio === k).map((t) => tgKartu(t, false)).join('') || '<div class="sub">–</div>'}</div>`;
  const tanpa = buka.filter((t) => !t.prio);
  return `<div class="mxh"><span>Mendesak</span><span>Tidak mendesak</span></div><div class="mx">${[q[0], q[1], q[2], q[3]].map(kotak).join('')}</div>${tanpa.length ? `<h4 style="margin:14px 0 6px">Belum diberi prioritas <span class="sub">${tanpa.length}</span></h4><div class="kb">${tanpa.map((t) => tgKartu(t, false)).join('')}</div>` : ''}<p class="note" style="margin-top:10px">Hanya tugas yang belum selesai. Urutan kotak: Penting&Mendesak, Penting&Tidak Mendesak, Kurang Penting&Mendesak, Kurang Penting&Tidak Mendesak.</p>`;
}
function tgDaftar(list) {
  const d = S.tg.data, gr = {}; list.forEach((t) => { const k = t.projek[0] || ''; (gr[k] = gr[k] || []).push(t); });
  const ks = Object.keys(gr).sort((a, b) => (a ? ((d.projek.find((p) => p.id === a) || {}).nama || '') : '~').localeCompare(b ? ((d.projek.find((p) => p.id === b) || {}).nama || '') : '~', 'id'));
  return ks.map((k) => `<h4 style="margin:14px 0 6px">${k ? '📁 ' + esc((d.projek.find((p) => p.id === k) || {}).nama || 'Project') : 'Tanpa project'} <span class="sub">${gr[k].length} tugas</span></h4><div class="tw"><table><thead><tr><th>Tugas</th><th>Status</th><th>Prioritas</th><th>Tenggat</th><th>Ditugaskan</th></tr></thead><tbody>${gr[k].sort((a, b) => (a.tenggat || '9999').localeCompare(b.tenggat || '9999')).map((t) => `<tr class="clk" data-tg="${esc(t.id)}"><td><b>${esc(t.nama)}</b></td><td>${chip(t.status, TG_ST[t.status] || 'gray')}</td><td>${t.prio ? chip(TG_PRIO[t.prio] ? TG_PRIO[t.prio][0] : t.prio, TG_PRIO[t.prio] ? TG_PRIO[t.prio][1] : 'gray') : '–'}</td><td>${t.tenggat ? esc(fdate(t.tenggat)) : '–'}</td><td>${esc(t.pj.map((p) => p.nama).join(', ') || '–')}</td></tr>`).join('')}</tbody></table></div>`).join('') || '<div class="empty">Belum ada tugas.</div>';
}
PAGES['proker/tugas'] = () => {
  tgMuat();
  const d = S.tg.data;
  if (S.tg.err) return `<div class="empty">${esc(S.tg.err)}<br><button class="btn" id="tgretry" style="width:auto;margin-top:10px">Coba lagi</button></div>${setTimeout(() => $('#tgretry')?.addEventListener('click', () => { S.tg.err = ''; tgMuat(true); })) && ''}`;
  if (!d) return '<div class="load"><div class="sp"></div><div>Memuat proyek dan tugas…</div></div>';
  if (!d.seksi.length) return '<div class="empty">Anda belum tergabung di seksi mana pun, jadi belum ada proyek dan tugas untuk ditampilkan.</div>';
  const sk = d.seksi.find((x) => x.id === S.tg.seksi) || d.seksi[0], pj = d.projek.filter((p) => p.seksi.includes(sk.id)), list = tgTugasSaring();
  const prog = (p) => { const t = d.tugas.filter((x) => x.projek.includes(p.id)), s = t.filter((x) => x.status === 'Selesai').length; return { n: t.length, s, pct: t.length ? Math.round((s / t.length) * 100) : 0 }; };
  const stripe = pj.map((p) => { const g = prog(p); return `<div class="pcard${S.tg.projek === p.id ? ' on' : ''}" data-pj="${esc(p.id)}"><div class="pn">${esc(p.nama)}</div><div class="km">${chip(p.status, p.status === 'Selesai' ? 'green' : p.status === 'Berjalan' ? 'amber' : 'gray')}${p.target ? chip('🎯 ' + fdate(p.target), 'blue') : ''}${p.proker.length ? chip('🔗 proker', 'violet') : ''}</div><div class="pb"><i style="width:${g.pct}%"></i></div><div class="sub">${g.s}/${g.n} tugas selesai</div>${sk.kelola ? `<button type="button" class="ghost pe" data-pe="${esc(p.id)}">Ubah</button>` : ''}</div>`; }).join('');
  const body = S.tg.view === 'daftar' ? tgDaftar(list) : S.tg.view === 'matriks' ? tgMatriks(list) : tgKanban(list);
  setTimeout(tgPasang);
  return `<div class="filters"><div>${d.seksi.length > 1 ? `<label>Seksi</label><select id="tgsk">${d.seksi.map((x) => `<option value="${esc(x.id)}"${x.id === sk.id ? ' selected' : ''}>${esc(x.nama)}</option>`).join('')}</select>` : `<label>Seksi</label><div style="padding:9px 0;font-weight:700">${esc(sk.nama)}</div>`}</div>
    <div><label>Project</label><select id="tgpj"><option value="">Semua tugas</option><option value="-"${S.tg.projek === '-' ? ' selected' : ''}>Tanpa project</option>${pj.map((p) => `<option value="${esc(p.id)}"${S.tg.projek === p.id ? ' selected' : ''}>${esc(p.nama)}</option>`).join('')}</select></div>
    <div style="flex:none"><label>Tampilan</label><div class="seg" id="tgv">${[['kanban', 'Kanban'], ['daftar', 'Daftar'], ['matriks', 'Matriks prioritas']].map(([k, l]) => `<button data-v="${k}" class="${S.tg.view === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
    <label style="display:flex;gap:8px;align-items:center;margin:0;font-size:13px;flex:none"><input type="checkbox" id="tgmine" style="width:auto"${S.tg.mine ? ' checked' : ''}> Tugas saya saja</label>
    <div style="flex:none;display:flex;gap:8px"><button class="btn" id="tgnew" style="width:auto;margin:0">+ Tugas</button>${sk.kelola ? '<button class="ghost" id="tgnewp">+ Project</button>' : ''}</div></div>
  <h4 style="margin:6px 0 8px">Project seksi ${esc(sk.nama.replace(/^Tim Kerja\s*/, ''))}${sk.kelola ? '' : ' <span class="sub">(project dibuat oleh Koordinator Seksi/Bidang)</span>'}</h4>
  <div class="pstrip">${stripe || '<div class="sub">Belum ada project. Tugas tetap bisa dibuat tanpa project.</div>'}</div>
  <div style="margin-top:14px">${body}</div>`;
};
function tgPasang() {
  const d = S.tg.data; if (!d) return;
  $('#tgsk')?.addEventListener('change', (e) => { S.tg.seksi = e.target.value; S.tg.projek = ''; render(); });
  $('#tgpj')?.addEventListener('change', (e) => { S.tg.projek = e.target.value; render(); });
  $('#tgmine')?.addEventListener('change', (e) => { S.tg.mine = e.target.checked; render(); });
  document.querySelectorAll('#tgv button').forEach((b) => b.addEventListener('click', () => { S.tg.view = b.dataset.v; render(); }));
  document.querySelectorAll('[data-tg]').forEach((el) => el.addEventListener('click', () => tgBuka(el.dataset.tg)));
  document.querySelectorAll('[data-pj]').forEach((el) => el.addEventListener('click', (e) => { if (e.target.closest('.pe')) return; S.tg.projek = S.tg.projek === el.dataset.pj ? '' : el.dataset.pj; render(); }));
  document.querySelectorAll('[data-pe]').forEach((el) => el.addEventListener('click', () => tgFormProjek(el.dataset.pe)));
  $('#tgnew')?.addEventListener('click', () => tgFormTugas());
  $('#tgnewp')?.addEventListener('click', () => tgFormProjek());
  let seret = null;
  document.querySelectorAll('.kcard[draggable]').forEach((el) => { el.addEventListener('dragstart', (e) => { seret = el.dataset.tg; e.dataTransfer.setData('text/plain', seret); el.classList.add('drag'); }); el.addEventListener('dragend', () => el.classList.remove('drag')); });
  document.querySelectorAll('.kcol').forEach((col) => {
    col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('over'); }); col.addEventListener('dragleave', () => col.classList.remove('over'));
    col.addEventListener('drop', async (e) => { e.preventDefault(); col.classList.remove('over'); const id = seret || e.dataTransfer.getData('text/plain'), t = d.tugas.find((x) => x.id === id); seret = null; if (!t || t.status === col.dataset.st) return; const lama = t.status; t.status = col.dataset.st; render(); try { await tgApi({ op: 'tugas_ubah', id, fields: { status: col.dataset.st } }); } catch (x) { t.status = lama; alert(x.message); render(); } });
  });
}
const tgOpt = (arr, cur, kosong) => `${kosong ? `<option value="">${esc(kosong)}</option>` : ''}${arr.map((x) => `<option${x === cur ? ' selected' : ''}>${esc(x)}</option>`).join('')}`;
function tgPilihOrang(sid, pilih) {
  const ang = tgAnggota(sid), ada = new Set(ang.map((x) => x.id)), ekstra = [...pilih].filter((id) => !ada.has(id)).map((id) => ({ id, nama: ((S.tg.data.tugas.flatMap((t) => t.pj).find((p) => p.id === id)) || {}).nama || 'Orang lain' }));
  return `<div class="tgpick" id="tgpick">${[...ang, ...ekstra].map((o) => `<label><input type="checkbox" value="${esc(o.id)}"${pilih.has(o.id) ? ' checked' : ''}> ${esc(o.nama)}</label>`).join('') || '<span class="sub">Belum ada anggota aktif di seksi ini.</span>'}</div>`;
}
const tgOrangDipilih = () => [...document.querySelectorAll('#tgpick input:checked')].map((i) => i.value);
function tgFormTugas(t) {
  const d = S.tg.data, edit = !!t, sid = edit ? t.seksi[0] : S.tg.seksi, pilih = new Set(edit ? t.pj.map((p) => p.id) : []);
  const pjs = d.projek.filter((p) => p.seksi.includes(sid));
  modal(`<h2>${edit ? 'Ubah tugas' : 'Tugas baru'}</h2><p class="sub">${esc(tgSeksiNama(sid))}</p>
  <div class="eform" style="grid-template-columns:1fr 1fr"><div style="grid-column:1/-1"><label>Nama tugas</label><input id="tfn" maxlength="300" value="${esc(edit ? t.nama : '')}"></div>
  <div><label>Status</label><select id="tfs">${tgOpt(d.status, edit ? t.status : 'Belum dimulai')}</select></div>
  <div><label>Prioritas</label><select id="tfp">${tgOpt(d.prio, edit ? t.prio : '', '— belum diisi —')}</select></div>
  <div><label>Mulai</label><input type="date" id="tfm" value="${esc(edit ? t.mulai : '')}"></div><div><label>Tenggat</label><input type="date" id="tft" value="${esc(edit ? t.tenggat : '')}"></div>
  <div style="grid-column:1/-1"><label>Project</label><select id="tfj"><option value="">— tanpa project —</option>${pjs.map((p) => `<option value="${esc(p.id)}"${edit && t.projek[0] === p.id ? ' selected' : (!edit && S.tg.projek === p.id ? ' selected' : '')}>${esc(p.nama)}</option>`).join('')}</select></div>
  <div style="grid-column:1/-1"><label>Tag / ditugaskan ke</label>${tgPilihOrang(sid, pilih)}</div></div><div class="err" id="tfe"></div>
  <div class="acts"><button class="btn" id="tfok" style="width:auto">${edit ? 'Simpan' : 'Buat tugas'}</button>${edit ? '<button class="ghost" id="tfdel" style="color:#C0392B">Hapus tugas</button>' : ''}</div>`, true);
  $('#tfok').onclick = async (e) => {
    const f = { nama: $('#tfn').value, status: $('#tfs').value, prio: $('#tfp').value, mulai: $('#tfm').value, tenggat: $('#tft').value, pj: tgOrangDipilih() }; e.target.disabled = true;
    try { if (edit) await tgApi({ op: 'tugas_ubah', id: t.id, fields: { ...f, projekId: $('#tfj').value } }); else await tgApi({ op: 'tugas_baru', seksiId: sid, projekId: $('#tfj').value, ...f }); closeModal(); await tgMuat(true); }
    catch (x) { $('#tfe').textContent = x.message; e.target.disabled = false; }
  };
  $('#tfdel')?.addEventListener('click', async () => { if (!confirm('Hapus tugas ini beserta komentarnya? Tidak bisa dibatalkan.')) return; try { await tgApi({ op: 'tugas_hapus', id: t.id }); closeModal(); await tgMuat(true); } catch (x) { $('#tfe').textContent = x.message; } });
}
async function tgBuka(id) {
  const d = S.tg.data, t = d.tugas.find((x) => x.id === id); if (!t) return;
  const boleh = tgBisaUbah(t);
  modal(`<h2>${esc(t.nama)}</h2><div class="km" style="margin-bottom:8px">${chip(t.status, TG_ST[t.status] || 'gray')}${t.prio ? chip(TG_PRIO[t.prio] ? TG_PRIO[t.prio][0] : t.prio, TG_PRIO[t.prio] ? TG_PRIO[t.prio][1] : 'gray') : ''}${t.tenggat ? chip('⏰ ' + fdate(t.tenggat), 'blue') : ''}${t.projek.length ? chip('📁 ' + esc((d.projek.find((p) => p.id === t.projek[0]) || {}).nama || ''), 'teal') : ''}</div>
  <div class="note">Seksi ${esc(t.seksi.map(tgSeksiNama).join(', ') || '–')} · Ditugaskan ke: ${esc(t.pj.map((p) => p.nama).join(', ') || 'belum ada')}${t.oleh ? ' · Dibuat oleh ' + esc(t.oleh) : ''}</div>
  ${boleh ? '<div class="acts" style="margin:10px 0"><button class="ghost" id="tbe">✏️ Ubah tugas</button></div>' : '<p class="note">Anda bisa melihat dan berkomentar. Hanya yang ditugaskan, pembuat, atau Koordinator yang bisa mengubah.</p>'}
  <h3 style="margin:14px 0 6px">Komentar</h3><div id="kml" class="kml"><div class="sub">Memuat…</div></div>
  <div class="kmf"><textarea id="kmi" rows="2" maxlength="2000" placeholder="Tulis komentar…"></textarea><button class="btn" id="kmk" style="width:auto;margin:0">Kirim</button></div><div class="err" id="kme"></div>`, true);
  $('#tbe')?.addEventListener('click', () => tgFormTugas(t));
  const muat = async () => {
    try { const j = await fetch('/api/proker?komentar=' + encodeURIComponent(id), { credentials: 'same-origin' }).then((r) => r.json()); if (j.error) throw new Error(j.error);
      $('#kml').innerHTML = j.komentar.map((c) => `<div class="kmi"><div class="kmh"><b>${esc(c.penulis || '–')}</b><span class="sub">${c.waktu ? esc(new Date(c.waktu).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) : ''}</span>${c.milik || j.hapusSemua ? `<a href="#" data-kd="${esc(c.id)}" class="sub">hapus</a>` : ''}</div><div>${esc(c.isi).replace(/\n/g, '<br>')}</div></div>`).join('') || '<div class="sub">Belum ada komentar.</div>';
      document.querySelectorAll('[data-kd]').forEach((a) => a.addEventListener('click', async (e) => { e.preventDefault(); if (!confirm('Hapus komentar ini?')) return; try { await tgApi({ op: 'komentar_hapus', id: a.dataset.kd }); muat(); } catch (x) { $('#kme').textContent = x.message; } }));
    } catch (x) { $('#kml').innerHTML = `<div class="sub">${esc(x.message)}</div>`; }
  };
  muat();
  $('#kmk').onclick = async (e) => { const isi = $('#kmi').value.trim(); if (!isi) return; e.target.disabled = true; try { await tgApi({ op: 'komentar_tambah', tugasId: id, isi }); $('#kmi').value = ''; $('#kme').textContent = ''; await muat(); } catch (x) { $('#kme').textContent = x.message; } e.target.disabled = false; };
}
function tgFormProjek(id) {
  const d = S.tg.data, p = id ? d.projek.find((x) => x.id === id) : null, sid = p ? p.seksi[0] : S.tg.seksi, edit = !!p;
  const prl = [...D.proker].sort((a, b) => cmp(a.label, b.label)), lbl = (x) => `${x.label}${x.detil ? ' · ' + x.detil : ''}`.slice(0, 140);
  const cur = p && p.proker[0] ? D.proker.find((x) => x.id === p.proker[0]) : null;
  modal(`<h2>${edit ? 'Ubah project' : 'Project baru'}</h2><p class="sub">${esc(tgSeksiNama(sid))}</p>
  <div class="eform" style="grid-template-columns:1fr 1fr"><div style="grid-column:1/-1"><label>Nama project</label><input id="pfn" maxlength="300" value="${esc(edit ? p.nama : '')}"></div>
  <div style="grid-column:1/-1"><label>Deskripsi</label><textarea id="pfd" rows="2" maxlength="2000">${esc(edit ? p.desk : '')}</textarea></div>
  <div><label>Status</label><select id="pfs">${tgOpt(d.pstatus, edit ? p.status : 'Direncanakan')}</select></div><div><label>Target selesai</label><input type="date" id="pft" value="${esc(edit ? p.target : '')}"></div>
  <div style="grid-column:1/-1"><label>Dikaitkan ke program kerja BPN (opsional)</label><input id="pfk" list="pfkl" placeholder="Ketik untuk mencari program…" value="${esc(cur ? lbl(cur) : '')}"><datalist id="pfkl">${prl.map((x) => `<option value="${esc(lbl(x))}"></option>`).join('')}</datalist><div class="sub">Kosongkan bila project tidak terkait program kerja.</div></div>
  ${edit ? `<div style="grid-column:1/-1"><label>Catatan</label><textarea id="pfc" rows="3" maxlength="4000">${esc(p.catatan)}</textarea></div>` : ''}</div><div class="err" id="pfe"></div>
  <div class="acts"><button class="btn" id="pfok" style="width:auto">${edit ? 'Simpan' : 'Buat project'}</button></div>`, true);
  $('#pfok').onclick = async (e) => {
    const k = prl.find((x) => lbl(x) === $('#pfk').value), f = { nama: $('#pfn').value, desk: $('#pfd').value, status: $('#pfs').value, target: $('#pft').value, proker: k ? [k.id] : [] }; e.target.disabled = true;
    try { if (edit) await tgApi({ op: 'projek_ubah', id: p.id, fields: { ...f, catatan: $('#pfc').value } }); else await tgApi({ op: 'projek_baru', seksiId: sid, ...f }); closeModal(); await tgMuat(true); }
    catch (x) { $('#pfe').textContent = x.message; e.target.disabled = false; }
  };
}

/* --- Pengurus --- */
PAGES.pengurus = () => {
  // Satu orang bisa ada di beberapa kelompok (tumpang tindih diperbolehkan).
  const K = D.kelompok || { inti: [], tim: [] };
  const grp = {
    harian: D.pengurus.filter((x) => x.orang.length).flatMap((x) => x.orang.map((o) => ({ o, jab: x.jabatan, rank: x.rank, pid: x.id }))),
    inti: K.inti.map((x) => ({ o: x.orang, jab: x.jabatan.join(', '), rank: 0 })),
    tim: K.tim.map((x) => ({ o: x.orang, jab: x.jabatan, rank: 0 })),
  };
  const LBL = { harian: 'BPN Harian', inti: 'BPN Inti', tim: 'Tim Kerja' };
  const edit = (D.perm.pengurus || 0) >= 2;
  const uniqN = (g) => new Set(grp[g].map((x) => x.o.id)).size;
  const draw = () => {
    const f = S.pg, q = f.q.toLowerCase();
    const list = grp[f.g].filter((x) => (!f.kus || x.o.keuskupan === f.kus) && (!f.jab || x.jab.split(/, | · /).includes(f.jab)) && (!q || `${x.o.nama} ${x.o.panggilan || ''} ${x.jab} ${x.o.keuskupan}`.toLowerCase().includes(q)));
    const seen = new Set(), rows = list.filter((x) => (seen.has(x.o.id) ? false : seen.add(x.o.id)));
    $('#pgn').textContent = `${nf.format(rows.length)} orang${rows.length !== uniqN(f.g) ? ` dari ${nf.format(uniqN(f.g))}` : ''} · ${LBL[f.g]}`;
    const items = (x) => grp[f.g].filter((y) => y.o.id === x.o.id);
    const extra = (x) => (f.g !== 'harian' ? '' : items(x).map((y) => `${(D.riwayatPengurus || []).some((r) => r.jabatan === y.jab) ? `<a href="#" class="wa em" data-riw="${esc(y.jab)}">Riwayat</a>` : ''}${edit ? `<a href="#" class="wa em" data-gnt="${y.pid}|${y.o.id}">Ganti</a>` : ''}`).join(''));
    $('#pgr').innerHTML = rows.map((x) => person(x.o, items(x).map((y) => y.jab).filter(Boolean).join(' · '), extra(x))).join('') || '<div class="empty">Tidak ada yang sesuai filter.</div>';
    document.querySelectorAll('[data-g]').forEach((el) => el.classList.toggle('sel', el.dataset.g === f.g));
    const opts = (arr, cur) => `<option value="">Semua</option>${arr.map((v) => `<option${v === cur ? ' selected' : ''}>${esc(v)}</option>`).join('')}`;
    $('#pgk').innerHTML = opts(uniq(grp[f.g].map((x) => x.o.keuskupan).filter(Boolean)).sort(cmp), f.kus);
    $('#pgj').innerHTML = opts(uniq(grp[f.g].flatMap((x) => x.jab.split(/, | · /)).filter(Boolean)).sort(cmp), f.jab);
  };
  setTimeout(() => {
    document.querySelectorAll('[data-g]').forEach((el) => el.addEventListener('click', () => { S.pg = { g: el.dataset.g, kus: '', jab: '', q: S.pg.q }; $('#pgq').value = S.pg.q; draw(); }));
    $('#pgk').addEventListener('change', (e) => { S.pg.kus = e.target.value; draw(); });
    $('#pgj').addEventListener('change', (e) => { S.pg.jab = e.target.value; draw(); });
    $('#pgq').value = S.pg.q; $('#pgq').addEventListener('input', (e) => { S.pg.q = e.target.value; draw(); });
    $('#pgr').addEventListener('click', (e) => {
      const r = e.target.closest('[data-riw]'), g = e.target.closest('[data-gnt]');
      if (r) { e.preventDefault(); riwayatPengurus(r.dataset.riw); }
      if (g) { e.preventDefault(); const [pid, oid] = g.dataset.gnt.split('|'); gantiPengurus(pid, oid); }
    });
    $('#pgrw')?.addEventListener('click', () => riwayatPengurus(''));
    $('#pgpv')?.addEventListener('click', previewProfil);
    draw();
  });
  const card = (g, c, t) => `<div class="card kpi clk" data-g="${g}" style="--c:${c};--t:${t}"><div class="l">${LBL[g]}</div><div class="n">${nf.format(uniqN(g))}</div><div class="note">${g === 'harian' ? 'Susunan pengurus BPN' : g === 'inti' ? 'Koordinator BPK yang menjabat aktif' : 'Anggota tim kerja di bawah koordinator seksi'}</div></div>`;
  return `<div class="grid g3" style="margin-bottom:14px">${card('harian', '#5B4CD1', 'var(--violet-t)')}${card('inti', '#1F56C4', 'var(--blue-t)')}${card('tim', '#0B8277', 'var(--teal-t)')}</div>
  <div class="filters"><div class="q"><label>Cari</label><input id="pgq" placeholder="Nama / jabatan / keuskupan…"></div><div><label>Keuskupan</label><select id="pgk"></select></div><div><label>Jabatan</label><select id="pgj"></select></div></div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin:0 0 8px"><button class="ghost" id="pgrw">Riwayat jabatan</button><button class="ghost" id="pgpv">Lihat form profil pendaftaran</button></div>
  <div class="note" id="pgn" style="margin:2px 0 10px"></div><div class="people" id="pgr"></div>`;
};

function riwayatPengurus(jab) {
  const l = (D.riwayatPengurus || []).filter((r) => !jab || r.jabatan === jab);
  modal(`<h2>Riwayat jabatan${jab ? ': ' + esc(jab) : ' Pengurus BPN'}</h2>${l.length ? `<div class="tw"><table><thead><tr><th>Jabatan</th><th>Nama</th><th>Berakhir</th><th>Digantikan oleh</th></tr></thead><tbody>${l.map((r) => `<tr><td>${esc(r.jabatan)}</td><td><b>${esc(r.orang.nama)}</b></td><td>${esc(fmtTgl(r.selesai) || '–')}</td><td>${esc(r.pengganti || '–')}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Belum ada riwayat. Riwayat tercatat otomatis setiap kali pemegang jabatan diganti.</div>'}`, true);
}
function gantiPengurus(pid, oid) {
  const x = D.pengurus.find((p) => p.id === pid), o = x && x.orang.find((q) => q.id === oid);
  if (!x || !o) return;
  let pick = '';
  modal(`<h2>Ganti / akhiri jabatan</h2><p class="sub"><b>${esc(x.jabatan)}</b>: saat ini ${esc(o.nama)}. Datanya tidak dihapus, tetapi masuk ke riwayat jabatan.</p>
    <form id="gf" class="eform" style="grid-template-columns:1fr"><div class="q" style="position:relative"><label>Pengganti (cari nama di data umat; kosongkan bila hanya mengakhiri)</label><input id="gq" autocomplete="off" placeholder="Ketik minimal 2 huruf…"><div id="gr" class="sres"></div></div>
    <div><label>Berakhir pada tanggal</label><input type="date" name="tgl" value="${new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10)}"></div>
    <div class="err" id="ge"></div><div class="mact"><button class="btn" id="gs" type="submit">Simpan</button></div></form>`);
  const q = $('#gq'), box = $('#gr');
  q.addEventListener('input', () => { clearTimeout(q._t); pick = ''; if (q.value.trim().length < 2) { box.innerHTML = ''; return; } q._t = setTimeout(async () => { const j = await fetch('/api/pejabat?q=' + encodeURIComponent(q.value.trim()), { credentials: 'same-origin' }).then((r) => r.json()).catch(() => ({ orang: [] })); box.innerHTML = (j.orang || []).map((r) => `<button type="button" class="opt" data-i="${esc(r.id)}" data-n="${esc(r.nama)}"><b>${esc(r.nama)}</b></button>`).join('') || '<div class="sub">Tidak ada yang cocok.</div>'; box.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => { pick = b.dataset.i; q.value = b.dataset.n; box.innerHTML = ''; })); }, 300); });
  $('#gf').addEventListener('submit', async (ev) => {
    ev.preventDefault(); if (q.value.trim() && !pick) { $('#ge').textContent = 'Pilih nama pengganti dari daftar, atau kosongkan.'; return; }
    if (!confirm(pick ? `Ganti ${o.nama} dengan ${q.value}?` : `Akhiri jabatan ${o.nama}?`)) return;
    $('#gs').disabled = true;
    try { await post('/api/pejabat', { action: 'pengurus', id: pid, lamaId: oid, baruId: pick, tanggal: ev.target.tgl.value }); closeModal(); await load(true); } catch (e) { $('#ge').textContent = e.message; $('#gs').disabled = false; }
  });
}
async function previewProfil() {
  let kus = []; try { kus = (await (await fetch('/api/akses')).json()).keuskupan || []; } catch { /* kosong */ }
  modal(`<h2>Pratinjau form profil</h2><p class="sub">Inilah yang dilihat orang yang diundang setelah verifikasi WhatsApp: ia melengkapi profil lalu membuat password. Ini hanya pratinjau, tidak menyimpan apa pun.</p>
    <form id="pvf" class="pvform" onsubmit="return false">${profilFields(kus, {})}${pwFields}<button class="btn" type="button" disabled>Daftar (pratinjau)</button></form>`, true);
}
/* --- Pendataan PIC / pejabat BPK --- */
S.pdt = S.pdt || { bpk: '', q: '' };
PAGES.pendataan = () => {
  const edit = (D.perm.pendataan || 0) >= 2;
  const list = D.bpkList.filter((b) => b.aktif && (!D.user.scope || D.user.scope.includes(b.nama))).sort((a, b) => cmp(a.nama, b.nama));
  if (list.length === 1) S.pdt.bpk = list[0].id;
  setTimeout(() => {
    $('#pdb')?.addEventListener('change', (e) => { S.pdt.bpk = e.target.value; render(); });
    $('#pdq')?.addEventListener('input', (e) => { S.pdt.q = e.target.value; render(); $('#pdq').focus(); });
    document.querySelectorAll('[data-pbk]').forEach((el) => el.addEventListener('click', () => { S.pdt.bpk = el.dataset.pbk; render(); }));
    document.querySelectorAll('[data-tbh]').forEach((el) => el.addEventListener('click', () => formPejabat(el.dataset.tbh.split('|')[0], el.dataset.tbh.split('|')[1] || '')));
    document.querySelectorAll('[data-akh]').forEach((el) => el.addEventListener('click', async () => { if (!confirm('Akhiri jabatan ini? Data tetap tersimpan sebagai riwayat.')) return; try { await post('/api/pejabat', { action: 'akhiri', bpkId: S.pdt.bpk, id: el.dataset.akh }); await load(true); } catch (e) { alert(e.message); } }));
  });
  const head = `<div class="filters"><div><label>BPK</label><select id="pdb">${list.length > 1 ? '<option value="">Semua BPK</option>' : ''}${list.map((b) => `<option value="${b.id}"${b.id === S.pdt.bpk ? ' selected' : ''}>${esc(b.nama)}</option>`).join('')}</select></div></div>`;
  const prof = (id) => D.bpkProfil[id] || { pejabat: [], riwayat: [] };
  if (!S.pdt.bpk) {
    const q = S.pdt.q.toLowerCase();
    return `${head}<div class="tw"><table><thead><tr><th>BPK</th><th>Koordinator</th><th>Jabatan aktif</th></tr></thead><tbody>${list.filter((b) => !q || b.nama.toLowerCase().includes(q)).map((b) => { const pj = prof(b.id).pejabat; const k = pj.find((x) => x.koordinator && !/wakil/i.test(x.jabatan)); const c = {}; pj.forEach((x) => { c[x.jabatan] = (c[x.jabatan] || 0) + 1; }); return `<tr class="clk" data-pbk="${b.id}"><td><b>${esc(b.nama)}</b></td><td>${k ? esc(k.orang.nama) : '<span class="sub">belum ada</span>'}</td><td>${Object.entries(c).map(([j, n]) => chip(`${j} ${n}`, 'blue')).join(' ') || '<span class="sub">–</span>'}</td></tr>`; }).join('')}</tbody></table></div>`;
  }
  const b = list.find((x) => x.id === S.pdt.bpk) || { nama: '', id: S.pdt.bpk }, pr = prof(b.id);
  const g = {}; pr.pejabat.forEach((x) => { (g[x.jabatan] = g[x.jabatan] || []).push(x); });
  const jabs = (D.jabatanBpk || []).map((j) => j.nama);
  const aktifTbl = Object.keys(g).length ? Object.entries(g).map(([j, l]) => `<div class="card" style="margin-bottom:10px"><h3>${esc(j)}<small>${l.length} aktif</small></h3>${l.map((x) => `<div class="prow2"><div><b>${esc(x.orang.nama)}</b> <span class="sub">sejak ${esc(x.mulai ? fmtTgl(x.mulai) : 'tidak tercatat')}</span></div><div class="acts">${x.orang.adaWa ? `<a class="wa" target="_blank" rel="noopener" href="/api/wa?p=${esc(x.orang.id)}">WhatsApp</a>` : ''}${edit ? `<button class="ghost" data-akh="${x.pid}">Akhiri</button>` : ''}</div></div>`).join('')}${edit ? `<div style="margin-top:6px"><button class="ghost" data-tbh="${b.id}|${esc(l[0].jabatanId)}">+ Tambah ${esc(j)}</button></div>` : ''}</div>`).join('') : '<div class="empty">Belum ada pejabat/PIC aktif yang tercatat di BPK ini.</div>';
  return `${head}<div class="card" style="margin:12px 0"><h3>BPK ${esc(b.nama)}<small>${pr.pejabat.length} pejabat/PIC aktif</small></h3>${edit ? `<button class="btn" data-tbh="${b.id}|">+ Data PIC / pejabat baru</button>` : '<div class="sub">Anda hanya bisa melihat data ini.</div>'}</div>${aktifTbl}${riwayatHtml(pr)}`;
};
function formPejabat(bpkId, jabId) {
  const b = D.bpkList.find((x) => x.id === bpkId) || { nama: '' }, pr = D.bpkProfil[bpkId] || { pejabat: [] };
  modal(`<h2>Data PIC / pejabat baru</h2><p class="sub">BPK ${esc(b.nama)}. Setelah disimpan, orang ini masuk ke data umat BPN dan langsung dikirimi WhatsApp undangan.</p>
    <form id="pjf" class="eform" style="grid-template-columns:1fr"><div><label>Jabatan</label><select name="jab" required><option value="">Pilih jabatan…</option>${(D.jabatanBpk || []).map((j) => `<option value="${j.id}"${j.id === jabId ? ' selected' : ''}>${esc(j.nama)}</option>`).join('')}</select></div>
    <div id="pjak"></div><div><label>Nama</label><input name="nama" required autocomplete="off"></div><div><label>Nomor WhatsApp</label><input name="wa" type="tel" inputmode="tel" placeholder="0812 3456 7890" required></div>
    <div><label>Jenis kelamin</label><select name="jk" required><option value="">Pilih…</option><option>Pria</option><option>Wanita</option></select></div>
    <div class="err" id="pje"></div><div class="mact"><button class="btn" id="pjs" type="submit">Simpan &amp; kirim undangan WA</button></div></form>`);
  const f = $('#pjf'), box = $('#pjak');
  const hint = () => { const cur = pr.pejabat.filter((x) => x.jabatanId === f.elements.jab.value), pil = [...f.querySelectorAll('input[name=akh]:checked')].length, h = $('#akh_h'); if (!h) return; const nama = (f.elements.nama.value || 'Orang baru ini').trim() || 'Orang baru ini'; h.innerHTML = pil ? `✔ <b>${esc(nama)} menggantikan</b>: pemegang yang dicentang diakhiri hari ini dan masuk riwayat.${pil < cur.length ? ' Sisanya tetap aktif.' : ''}` : `➕ <b>${esc(nama)} ditambahkan</b>: semua pemegang yang sekarang tetap aktif, jadi jabatan ini dipegang ${cur.length + 1} orang.`; };
  const ak = () => { const cur = pr.pejabat.filter((x) => x.jabatanId === f.elements.jab.value); box.innerHTML = cur.length ? `<div class="warnbox"><b>Jabatan ini sudah ada pemegangnya.</b> Pilih salah satu:<ul style="margin:6px 0 8px 18px;padding:0"><li><b>Orang baru MENGGANTIKAN</b> (misalnya ganti koordinator): <b>centang</b> nama pemegang lama di bawah. Ia diakhiri hari ini dan masuk riwayat, datanya tidak dihapus.</li><li><b>Orang baru MENAMBAH</b> (jabatan boleh dipegang beberapa orang, misalnya beberapa PIC): <b>jangan centang</b> apa pun.</li></ul>${cur.map((x) => `<label class="chk"><input type="checkbox" name="akh" value="${x.pid}"> Ganti ${esc(x.orang.nama)} (diakhiri hari ini)</label>`).join('')}<div id="akh_h" class="note" style="margin-top:8px"></div></div>` : ''; box.querySelectorAll('input[name=akh]').forEach((c) => c.addEventListener('change', hint)); hint(); };
  f.elements.jab.addEventListener('change', ak); ak();
  f.elements.nama.addEventListener('input', hint);
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault(); $('#pje').textContent = ''; $('#pjs').disabled = true; $('#pjs').textContent = 'Menyimpan…';
    try {
      const j = await post('/api/pejabat', { action: 'tambah', bpkId, jabatanId: f.elements.jab.value, nama: f.elements.nama.value, wa: f.elements.wa.value, jk: f.elements.jk.value, akhiri: [...f.querySelectorAll('input[name=akh]:checked')].map((x) => x.value) });
      await load(true);
      modal(`<h2>Tersimpan ✓</h2><p>${esc(f.elements.nama.value)} sudah dicatat sebagai pejabat/PIC BPK ${esc(b.nama)}${j.orangBaru ? ' dan ditambahkan ke data umat BPN' : ' (datanya sudah ada di data umat BPN)'}. Keuskupan domisili di profilnya otomatis diisi ${esc(b.nama)}.</p>${j.terkirim ? '<p class="okmsg">✓ WhatsApp undangan sudah dikirim.</p>' : `<p class="errmsg">WhatsApp belum terkirim: ${esc(j.galat || 'gagal')}. Data tetap tersimpan.</p><div class="kvs"><div>Tautan undangan</div><input readonly value="${esc(j.link)}" onclick="this.select()" style="width:100%"></div>`}`);
    } catch (e) { $('#pje').textContent = e.message; $('#pjs').disabled = false; $('#pjs').textContent = 'Simpan & kirim undangan WA'; }
  });
}

/* --- Profil saya --- */
const fj = (u) => fetch(u, { credentials: 'same-origin' }).then((r) => r.json()).catch(() => ({}));
const PENGAJAR = /pewarta|pengajar/i;
async function ringkasPr() {
  try { const r = await fetch('/api/profil?act=ringkas', { credentials: 'same-origin' }); if (!r.ok || !D) return; const j = await r.json(); const was = JSON.stringify(D.pr || null); D.pr = j; if (JSON.stringify(j) !== was) render(); } catch { /* abaikan */ }
}
const bannerPr = () => (D && D.pr && D.pr.kurang && D.pr.kurang.length ? `<div class="warnbox" style="margin-bottom:16px"><b>Profil Anda belum lengkap.</b> Mohon lengkapi: ${D.pr.kurang.map((x) => esc(x)).join(', ')}. <a href="#/profil" style="font-weight:700">Lengkapi sekarang →</a></div>` : '');
const resizeImg = (file, max = 900) => new Promise((ok, no) => { const img = new Image(), u = URL.createObjectURL(file); img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); ok(c.toDataURL('image/jpeg', 0.85)); }; img.onerror = () => no(new Error('Foto tidak bisa dibaca')); img.src = u; });
const profUrl = (extra) => '/api/profil' + (S.prof && S.prof.pid ? '?id=' + S.prof.pid + (extra ? '&' + extra : '') : extra ? '?' + extra : '');
const nmOf = (list, id) => (list.find((x) => x.id === id) || {}).nama || '';

PAGES.profil = () => {
  const hid = location.hash.replace(/^#\/?/, '').split('/')[1] || '', pid = /^rec[A-Za-z0-9]{14}$/.test(hid) ? hid : '';
  if (!S.prof || S.prof.pid !== pid) {
    S.prof = { pid, loading: true };
    fetch('/api/profil' + (pid ? '?id=' + pid : ''), { credentials: 'same-origin' }).then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Gagal memuat profil'); S.prof = { pid, ...j }; if (S.wantEdit && j.milik) S.prof.edit = true; S.wantEdit = false; render(); })
      .catch((e) => { S.prof = { pid, err: e.message }; render(); });
  }
  if (S.prof.loading) return '<div class="load"><div class="sp"></div><div>Memuat profil…</div></div>';
  if (S.prof.err) return `<div class="empty">${esc(S.prof.err)}</div>`;
  return S.prof.edit ? profilForm() : profilView();
};


// "Login sebagai" (khusus Super Admin): dibuka dari menu nama di sidebar. Daftar pengguna dimuat sekali.
function bukaImp() {
  modal(`<h2 style="margin:0 0 6px">Login sebagai</h2><p class="note" style="margin:0 0 14px">Lihat sistem seperti pengguna lain. Perubahan yang Anda buat tersimpan atas nama Anda, bukan nama mereka.</p><div class="q"><label>Pilih pengguna</label><select id="impsel"><option>Memuat…</option></select></div><button class="btn" id="impgo" type="button" style="margin-top:14px" disabled>Lihat sebagai</button>`);
  (async () => {
    const sel = $('#impsel');
    try {
      if (!ADM) { const j = await fetch('/api/admin', { credentials: 'same-origin' }).then((r) => r.json()); if (j.error) throw new Error(j.error); ADM = j; }
      sel.innerHTML = '<option value="">— pilih pengguna —</option>' + ADM.users.filter((u) => u.aktif && !u.roles.includes('Super Admin')).map((u) => `<option value="${esc(u.id)}">${esc(u.nama)}</option>`).join('');
      $('#impgo').disabled = false;
    } catch (e) { sel.innerHTML = `<option>${esc(e.message)}</option>`; }
    $('#impgo').onclick = async (e) => { if (!$('#impsel').value) return; e.target.disabled = true; try { await loginSebagai($('#impsel').value); closeModal(); } catch (x) { alert(x.message); e.target.disabled = false; } };
  })();
}
// Menu nama di sidebar: Profil Saya, Ubah profil, Login sebagai (Super Admin), Keluar.
function meMenu() {
  const m = $('#memenu'), u = D.user, imp = u.superAdmin && !u.imp;
  m.innerHTML = `<button type="button" data-a="profil" role="menuitem">Profil Saya</button><button type="button" data-a="ubah" role="menuitem">✏️ Ubah profil</button>${imp ? '<button type="button" data-a="imp" role="menuitem">👁 Login sebagai…</button>' : ''}${(D.perm.admin || 0) >= 1 ? '<button type="button" data-a="admin" role="menuitem">⚙ Administrasi</button>' : ''}<hr><button type="button" class="out" data-a="keluar" role="menuitem">Keluar</button>`;
}
const meTutup = () => { $('#memenu')?.classList.add('hide'); $('#me')?.setAttribute('aria-expanded', 'false'); };
function meToggle(e) {
  if (e) e.stopPropagation();
  const m = $('#memenu'), buka = m.classList.contains('hide');
  meTutup(); if (!buka) return;
  meMenu(); m.classList.remove('hide'); $('#me').setAttribute('aria-expanded', 'true');
}
async function keluar() { await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }); showLogin(); }
$('#page').addEventListener('click', (e) => { const g = e.target.closest('[data-go]'); if (g) location.hash = g.dataset.go; });
$('#me').addEventListener('click', meToggle);
$('#me').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); meToggle(); } if (e.key === 'Escape') meTutup(); });
document.addEventListener('click', (e) => { if (!e.target.closest('#memenu')) meTutup(); });
$('#memenu').addEventListener('click', async (e) => {
  const a = e.target.closest('button')?.dataset.a; if (!a) return; meTutup();
  if (a === 'keluar') return keluar();
  if (a === 'imp') return bukaImp();
  if (a === 'admin') { location.hash = '#/admin/pengguna'; $('#side').classList.remove('open'); return; }
  if (a === 'profil') { location.hash = '#/profil'; $('#side').classList.remove('open'); return; }
  if (a === 'ubah') {
    $('#side').classList.remove('open');
    if (/^#\/profil(\/|$)/.test(location.hash) && S.prof && S.prof.milik && !S.prof.loading) { S.prof.edit = true; render(); return; }
    S.wantEdit = true; if (/^#\/profil(\/|$)/.test(location.hash)) { S.prof = null; render(); } else location.hash = '#/profil';
  }
});
function profilView() {
  const P = S.prof, p = P.profil, o = P.opsi;
  const pel = p.pelayanan.map((id) => nmOf(o.pelayanan, id)), ajar = pel.some((n) => PENGAJAR.test(n));
  const lahir = p.tgl && p.bln && p.thn ? `${p.tgl} ${Object.values(BLN)[p.bln - 1]} ${p.thn}` : '';
  const list = (a) => (a.length ? `<div class="chips">${a.map((x) => chip(x, 'blue')).join('')}</div>` : '');
  return `${P.milik ? '' : `<div class="warnbox" style="margin-bottom:16px">Anda melihat profil <b>${esc(p.nama)}</b> sebagai Admin/Editor.</div>`}
  ${P.kurang.length ? `<div class="warnbox" style="margin-bottom:16px"><b>${P.milik ? 'Profil Anda' : 'Profil ini'} belum lengkap.</b> Yang masih perlu diisi:<ul>${P.kurang.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><button class="btn" id="prled" style="width:auto;margin:0">Lengkapi sekarang</button></div>` : '<div class="okmsg" style="margin-bottom:16px">✓ Data profil sudah lengkap.</div>'}
  <div class="card"><div class="phead">${p.foto ? `<img class="pfoto" src="${esc(p.foto)}" alt="Foto ${esc(p.nama)}">` : `<div class="pfoto" style="display:grid;place-items:center;background:${hue(p.nama)};color:#fff;font-size:32px;font-weight:700">${esc(initials(p.nama))}</div>`}
    <div style="flex:1;min-width:200px"><h2 style="margin:0">${esc(p.nama)}</h2><div class="sub">${esc(p.pan ? 'Dipanggil ' + p.pan : '')}</div><div class="chips" style="margin-top:8px">${p.kategori ? chip(p.kategori, 'violet') : ''}${ajar ? chip('Pewarta / Pengajar', 'teal') : ''}</div></div>
    <button class="ghost" id="pred">✏️ Ubah profil</button></div></div>
  <div class="grid g2" style="margin-top:16px">
    <div class="card"><h3>Data diri</h3><div class="kvs">${row('Jenis kelamin', esc(p.jk))}${row('Tanggal lahir', esc(lahir))}${row('WhatsApp', esc(p.wa))}${row('Email', esc(p.email))}${row('Kategori', esc(p.kategori))}${row('Sakramen Baptis', esc(p.baptis))}${row('Sakramen Krisma', esc(p.krisma))}${row('Ukuran baju', esc(p.size))}</div></div>
    <div class="card"><h3>Domisili</h3><div class="kvs">${row('Keuskupan', esc(nmOf(o.keuskupan, p.kus)))}${row('Kota / Kabupaten', esc(p.kota ? p.kota.nama + (p.kota.prov ? ', ' + p.kota.prov : '') : ''))}${row('Paroki', esc(p.paroki ? p.paroki.nama : ''))}${row('Alamat surat', esc(p.alamat))}</div></div>
    <div class="card"><h3>Persekutuan Doa &amp; pelayanan</h3><div class="kvs">${row('Asal PD', esc(p.pd ? p.pd.nama : ''))}${row('Pelayanan', list(pel))}${ajar ? `${row('Modul yang diajar', list(p.modulAjar.map((id) => nmOf(o.modul, id))))}` : ''}</div></div>
    <div class="card"><h3>Modul yang pernah diikuti</h3>${p.modulIkut.length ? list(p.modulIkut.map((id) => nmOf(o.modul, id))) : '<p class="sub">Belum ada yang dipilih.</p>'}</div>
  </div>${setTimeout(() => { const go = () => { S.prof.edit = true; render(); }; $('#prled')?.addEventListener('click', go); $('#pred')?.addEventListener('click', go); }) && ''}`;
}

function profilForm() {
  const P = S.prof, p = P.profil, o = P.opsi, yr = new Date().getFullYear();
  const sel = (id, list, cur, ph = 'Pilih…') => `<select id="pf_${id}"><option value="">${ph}</option>${list.map((x) => `<option${x === cur ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
  const cks = (name, list, cur, lab = (x) => x.nama, val = (x) => x.id) => `<div class="ckg">${list.map((x) => `<label><input type="checkbox" name="${name}" value="${esc(val(x))}"${cur.includes(val(x)) ? ' checked' : ''}> <span>${esc(lab(x))}</span></label>`).join('')}</div>`;
  setTimeout(() => bindProfil(), 0);
  return `<form id="pff" class="pform" autocomplete="off">
  ${P.kurang.length ? `<div class="warnbox" style="margin-bottom:16px"><b>Belum lengkap:</b> ${P.kurang.map((x) => esc(x)).join(', ')}.</div>` : ''}
  <div class="card"><h3>Foto</h3><div class="phead">${p.foto ? `<img class="pfoto" id="pf_img" src="${esc(p.foto)}" alt="">` : `<div class="pfoto" id="pf_img" style="display:grid;place-items:center;background:${hue(p.nama)};color:#fff;font-size:32px;font-weight:700">${esc(initials(p.nama))}</div>`}
    <div><input type="file" id="pf_file" accept="image/jpeg,image/png,image/webp" style="max-width:280px"><p class="note" style="margin:6px 0 0">Foto wajah yang jelas. Tersimpan otomatis begitu dipilih.</p><div class="err" id="pf_fe"></div></div></div></div>
  <div class="card" style="margin-top:16px"><h3>Data diri</h3><div class="eform">
    <div><label>Nama lengkap</label><input id="pf_nama" value="${esc(p.nama)}"></div><div><label>Nama panggilan</label><input id="pf_pan" value="${esc(p.pan)}"></div>
    <div><label>Jenis kelamin</label>${sel('jk', o.jk, p.jk)}</div><div><label>Nomor WhatsApp (untuk masuk, tidak bisa diubah di sini)</label><input value="${esc(p.wa)}" disabled></div>
    <div><label>Tanggal lahir</label><div class="dob"><select id="pf_tgl"><option value="">Tgl</option>${Array.from({ length: 31 }, (_, i) => `<option${+p.tgl === i + 1 ? ' selected' : ''}>${i + 1}</option>`).join('')}</select><select id="pf_bln"><option value="">Bulan</option>${BLN3.map((b, i) => `<option value="${i + 1}"${+p.bln === i + 1 ? ' selected' : ''}>${b}</option>`).join('')}</select><select id="pf_thn"><option value="">Tahun</option>${Array.from({ length: yr - 1919 }, (_, i) => `<option${+p.thn === yr - i ? ' selected' : ''}>${yr - i}</option>`).join('')}</select></div></div>
    <div><label>Email</label><input id="pf_email" type="email" value="${esc(p.email)}"></div>
    <div><label>Kategori</label>${sel('kategori', o.kategori, p.kategori)}</div><div><label>Ukuran baju</label>${sel('size', o.size, p.size)}</div>
    <div><label>Sakramen Baptis</label>${sel('baptis', o.sakramen, p.baptis)}</div><div><label>Sakramen Krisma</label>${sel('krisma', o.sakramen, p.krisma)}</div></div></div>
  <div class="card" style="margin-top:16px"><h3>Domisili</h3><div class="eform">
    <div><label>Keuskupan domisili</label><select id="pf_kus"><option value="">Pilih…</option>${o.keuskupan.map((k) => `<option value="${k.id}"${k.id === p.kus ? ' selected' : ''}>${esc(k.nama)}</option>`).join('')}</select></div>
    <div style="position:relative"><label>Kota / Kabupaten</label><input id="pf_kota" placeholder="Ketik nama kota/kabupaten…" value="${esc(p.kota ? p.kota.nama + (p.kota.prov ? ', ' + p.kota.prov : '') : '')}"><div id="pf_kotar" class="sres"></div></div>
    <div><label>Paroki</label>${cbHtml('par', 'Ketik untuk mencari paroki…')}<input id="pf_parb" placeholder="Ketik nama paroki Anda" style="display:none;margin-top:6px"></div>
    <div><label>Alamat surat</label><input id="pf_alamat" value="${esc(p.alamat)}"></div></div></div>
  <div class="card" style="margin-top:16px"><h3>Persekutuan Doa (PD)</h3><div class="eform"><div class="full"><label>Asal PD</label>${cbHtml('pd', 'Ketik untuk mencari PD…')}<p class="note" style="margin:6px 0 0">PD Anda tidak ada di daftar? <a href="#" id="pf_pdb" style="font-weight:700">Tambah PD baru</a> (sistem mengecek dulu supaya tidak dobel).</p></div></div></div>
  <div class="card" style="margin-top:16px"><h3>Pelayanan</h3><p class="note">Pilih pelayanan yang Anda jalani. Memilih <b>Pewarta</b> atau <b>Pengajar</b> memunculkan pertanyaan modul dan bab.</p>
    <div class="ckg">${o.pelayanan.map((g) => `<label><input type="checkbox" name="pel" value="${esc(g.id)}" data-n="${esc(g.nama)}"${p.pelayanan.includes(g.id) ? ' checked' : ''}> <span>${esc(g.nama)}</span></label>`).join('')}</div>
    <div id="pf_ajar" style="${o.pelayanan.some((g) => p.pelayanan.includes(g.id) && PENGAJAR.test(g.nama)) ? '' : 'display:none'};margin-top:14px;padding-top:12px;border-top:1px solid #EEF2FA">
      <label style="font-weight:700">Modul apa yang Anda ajar?</label>${cks('maj', o.modul, p.modulAjar)}</div></div>
  <div class="card" style="margin-top:16px"><h3>Modul yang pernah diikuti</h3>${cks('mik', o.modul, p.modulIkut)}</div>
  <div class="err" id="pf_e"></div><div class="mact" style="margin-top:12px"><button class="ghost" type="button" id="pf_batal">Batal</button><button class="btn" id="pf_s" type="submit" style="width:auto;margin:0">Simpan profil</button></div></form>`;
}

const cbHtml = (key, ph) => `<div style="position:relative"><input id="pf_${key}_q" placeholder="${esc(ph)}" autocomplete="off" disabled><input type="hidden" id="pf_${key}"><div id="pf_${key}_r" class="sres" style="display:none;max-height:260px;overflow:auto"></div></div>`;
// Kolom pilihan yang bisa diketik untuk mencari (daftar panjang seperti PD dan paroki).
function combo(key, onPick) {
  const q = $('#pf_' + key + '_q'), h = $('#pf_' + key), box = $('#pf_' + key + '_r'), st = { items: [] };
  const pick = (id) => { const x = st.items.find((i) => i.id === id); if (!x) return; h.value = id; q.value = x.nama; box.style.display = 'none'; onPick && onPick(id); };
  const show = () => {
    const t = q.value.trim().toLowerCase(), list = st.items.filter((x) => x.fixed || !t || x.cari.includes(t)).slice(0, 80);
    box.innerHTML = list.map((x) => `<button type="button" class="opt" data-i="${esc(x.id)}">${esc(x.label)}</button>`).join('') || '<div class="sub" style="padding:8px 12px">Tidak ditemukan.</div>';
    box.style.display = ''; box.querySelectorAll('.opt').forEach((b) => b.addEventListener('mousedown', (ev) => { ev.preventDefault(); pick(b.dataset.i); }));
  };
  q.addEventListener('input', () => { h.value = ''; onPick && onPick(''); show(); });
  q.addEventListener('focus', show);
  q.addEventListener('blur', () => setTimeout(() => { box.style.display = 'none'; }, 150));
  st.set = (items, cur) => { st.items = items; h.value = ''; q.value = ''; if (cur) pick(cur); };
  st.enable = (on, ph) => { q.disabled = !on; q.placeholder = ph; };
  st.pick = pick;
  return st;
}
function bindProfil() {
  const f = $('#pff'); if (!f || f._b) return; f._b = true;
  const P = S.prof, p = P.profil, v = (id) => $('#pf_' + id).value;
  let kota = p.kota ? p.kota.id : '';
  const cbPar = combo('par', (id) => { $('#pf_parb').style.display = id === '__baru' ? '' : 'none'; }), cbPd = combo('pd');
  const fillPilihan = async (kus, curPar, curPd) => {
    if (!kus) { cbPar.set([], ''); cbPd.set([], ''); cbPar.enable(false, 'Pilih keuskupan dulu'); cbPd.enable(false, 'Pilih keuskupan dulu'); return; }
    cbPar.enable(false, 'Memuat…'); cbPd.enable(false, 'Memuat…');
    const [a, b] = await Promise.all([fj('/api/profil?act=paroki&kus=' + kus), fj('/api/profil?act=pd&kus=' + kus)]);
    const par = (a.paroki || []).map((x) => ({ id: x.id, nama: x.nama, label: x.nama, cari: x.nama.toLowerCase() }));
    if (curPar && p.paroki && !par.some((x) => x.id === curPar)) par.unshift({ id: p.paroki.id, nama: p.paroki.nama, label: p.paroki.nama, cari: p.paroki.nama.toLowerCase() });
    par.push({ id: '__baru', nama: '— Paroki saya tidak ada di daftar —', label: '— Paroki saya tidak ada di daftar —', cari: '', fixed: true });
    const pd = (b.pd || []).map((x) => ({ id: x.id, nama: x.nama, label: x.nama + (x.koord ? ' · Koord: ' + x.koord : ''), cari: (x.nama + ' ' + x.koord).toLowerCase() }));
    if (curPd && p.pd && !pd.some((x) => x.id === curPd)) pd.unshift({ id: p.pd.id, nama: p.pd.nama, label: p.pd.nama, cari: p.pd.nama.toLowerCase() });
    cbPar.set(par, curPar); cbPd.set(pd, curPd); cbPar.enable(true, 'Ketik untuk mencari paroki…'); cbPd.enable(true, 'Ketik untuk mencari PD…');
  };
  fillPilihan(p.kus, p.paroki && p.paroki.id, p.pd && p.pd.id);
  $('#pf_kus').addEventListener('change', () => fillPilihan(v('kus'), '', ''));
  const kq = $('#pf_kota'), kb = $('#pf_kotar');
  kq.addEventListener('input', () => { clearTimeout(kq._t); kota = ''; if (kq.value.trim().length < 2) { kb.innerHTML = ''; return; } kq._t = setTimeout(async () => { const j = await fj('/api/profil?act=kota&q=' + encodeURIComponent(kq.value.trim())); kb.innerHTML = (j.kota || []).map((x) => `<button type="button" class="opt" data-i="${esc(x.id)}" data-n="${esc(x.nama + (x.prov ? ', ' + x.prov : ''))}"><b>${esc(x.nama)}</b> <span class="sub">${esc(x.prov)}</span></button>`).join('') || '<div class="sub" style="padding:8px 12px">Tidak ditemukan.</div>'; kb.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => { kota = b.dataset.i; kq.value = b.dataset.n; kb.innerHTML = ''; })); }, 300); });
  f.querySelectorAll('input[name=pel]').forEach((c) => c.addEventListener('change', () => { $('#pf_ajar').style.display = [...f.querySelectorAll('input[name=pel]:checked')].some((x) => PENGAJAR.test(x.dataset.n)) ? '' : 'none'; }));
  $('#pf_batal').onclick = () => { S.prof.edit = false; render(); };
  $('#pf_file').addEventListener('change', async (ev) => {
    const file = ev.target.files[0]; if (!file) return; $('#pf_fe').textContent = 'Mengunggah…';
    try { const j = await post('/api/profil', { act: 'foto', id: P.pid || undefined, file: await resizeImg(file) }); AN = null; Object.assign(S.prof, { profil: j.profil, kurang: j.kurang }); if (P.milik && D) D.pr = { kurang: j.kurang, lengkap: !j.kurang.length }; $('#pf_img').outerHTML = `<img class="pfoto" id="pf_img" src="${esc(j.profil.foto)}" alt="">`; $('#pf_fe').textContent = '✓ Foto tersimpan'; }
    catch (e) { $('#pf_fe').textContent = e.message; }
  });
  $('#pf_pdb').addEventListener('click', (ev) => { ev.preventDefault(); formPdBaru(v('kus'), (j) => { if (!cbPd.items.some((x) => x.id === j.pd.id)) cbPd.items.unshift({ id: j.pd.id, nama: j.pd.nama, label: j.pd.nama, cari: j.pd.nama.toLowerCase() }); cbPd.enable(true, 'Ketik untuk mencari PD…'); cbPd.pick(j.pd.id); }); });
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault(); const e = $('#pf_e'), s = $('#pf_s'); e.textContent = ''; s.disabled = true; s.textContent = 'Menyimpan…';
    try {
      if (v('kota') && !kota) throw new Error('Pilih kota/kabupaten dari daftar yang muncul');
      if ($('#pf_par_q').value.trim() && !v('par')) throw new Error('Pilih paroki dari daftar yang muncul');
      if ($('#pf_pd_q').value.trim() && !v('pd')) throw new Error('Pilih PD dari daftar yang muncul (atau pilih "Tambah PD baru")');
      let paroki = v('par');
      if (paroki === '__baru') { if (!v('parb').trim()) throw new Error('Ketik nama paroki Anda'); if (!v('kus')) throw new Error('Pilih keuskupan dulu'); paroki = (await post('/api/profil', { act: 'parokibaru', id: P.pid || undefined, data: { nama: v('parb'), kus: v('kus') } })).paroki.id; }
      const chk = (n) => [...f.querySelectorAll(`input[name=${n}]:checked`)].map((x) => x.value);
      const data = { nama: v('nama'), pan: v('pan'), jk: v('jk'), email: v('email'), tgl: v('tgl'), bln: v('bln'), thn: v('thn'), alamat: v('alamat'), kus: v('kus'), kota, paroki: paroki === '__baru' ? '' : paroki, pd: v('pd'), kategori: v('kategori'), baptis: v('baptis'), krisma: v('krisma'), size: v('size'), pelayanan: chk('pel'), modulAjar: chk('maj'), modulIkut: chk('mik') };
      const j = await post('/api/profil', { act: 'simpan', id: P.pid || undefined, data });
      AN = null;
      S.prof = { ...S.prof, profil: j.profil, kurang: j.kurang, edit: false }; if (P.milik && D) D.pr = { kurang: j.kurang, lengkap: !j.kurang.length };
      render(); window.scrollTo(0, 0);
    } catch (er) { e.textContent = er.message; s.disabled = false; s.textContent = 'Simpan profil'; }
  });
}

function formPdBaru(kus, cb) {
  const o = S.prof.opsi;
  modal(`<h2>Tambah PD baru</h2><p class="sub">Sistem mengecek dulu: kalau PD ini sudah terdaftar di keuskupan tersebut, Anda otomatis dihubungkan ke PD yang sudah ada (tidak dobel). Kalau benar-benar baru, Sekretariat/Admin diberi tahu lewat email untuk dicek.</p>
    <form id="pdf" class="eform" style="grid-template-columns:1fr"><div><label>Nama PD</label><input name="nama" required></div>
    <div><label>Keuskupan PD</label><select name="kus" required><option value="">Pilih…</option>${o.keuskupan.map((k) => `<option value="${k.id}"${k.id === kus ? ' selected' : ''}>${esc(k.nama)}</option>`).join('')}</select></div>
    <div><label>Jenis PD</label><select name="jenis" required><option value="">Pilih…</option>${o.jenisPd.map((x) => `<option>${esc(x)}</option>`).join('')}</select></div>
    <div><label>Nama koordinator PD</label><input name="kn" required></div><div><label>Nomor WhatsApp koordinator</label><input name="kw" type="tel" inputmode="tel" placeholder="0812 3456 7890" required></div>
    <div class="err" id="pde"></div><div class="mact"><button class="btn" id="pds" type="submit">Simpan PD</button></div></form>`);
  $('#pdf').addEventListener('submit', async (ev) => {
    ev.preventDefault(); const f = ev.target; $('#pde').textContent = ''; $('#pds').disabled = true; $('#pds').textContent = 'Memeriksa…';
    try {
      const j = await post('/api/profil', { act: 'pdbaru', id: S.prof.pid || undefined, data: { nama: f.elements.nama.value, kus: f.elements.kus.value, jenis: f.elements.jenis.value, koordNama: f.elements.kn.value, koordWa: f.elements.kw.value } });
      closeModal(); cb(j);
      alert(j.digabung ? `PD ini sudah terdaftar sebagai "${j.pd.nama}". Anda dihubungkan ke PD tersebut.` : `PD "${j.pd.nama}" ditambahkan. Sekretariat/Admin sudah diberi tahu untuk mengecek.`);
    } catch (er) { $('#pde').textContent = er.message; $('#pds').disabled = false; $('#pds').textContent = 'Simpan PD'; }
  });
}

/* --- Koordinator PD --- */
const pdRows = () => { const f = S.pdf, q = f.q.toLowerCase(); return D.pdpkk.filter((x) => (!f.kus || x.keuskupan === f.kus) && (!f.jenis || x.jenis === f.jenis) && (!q || (x.nama + ' ' + x.koordinator.map((k) => k.nama).join(' ') + ' ' + x.keuskupan).toLowerCase().includes(q))); };
PAGES['pd/daftar'] = () => {
  const draw = () => {
    const rows = pdRows().sort((a, b) => cmp(a.keuskupan, b.keuskupan) || cmp(a.nama, b.nama));
    $('#res').innerHTML = `<div class="note" style="margin-bottom:8px">${rows.length} PD</div><div class="tw"><table><thead><tr><th>Nama PD</th><th>Keuskupan</th><th>Jenis</th><th>Koordinator</th><th class="num">Umat</th></tr></thead><tbody>${rows.map((x) => `<tr><td><b>${esc(x.nama)}</b></td><td>${esc(x.keuskupan || '–')}</td><td>${chip(x.jenis || '–', x.jenis?.includes('Anak') ? 'amber' : x.jenis?.includes('Muda') ? 'teal' : 'blue')}</td><td>${x.koordinator.map((k) => `<div>${esc(k.nama)} ${k.adaWa ? `<a class="wa" target="_blank" rel="noopener" href="/api/wa?p=${esc(k.id)}">WA</a>` : ''}</div>`).join('') || '<span class="sub">–</span>'}</td><td class="num">${x.jumlahUmat || '–'}</td></tr>`).join('') || '<tr><td colspan="5"><div class="empty">Tidak ada PD yang sesuai.</div></td></tr>'}</tbody></table></div>`;
  };
  setTimeout(() => {
    document.querySelectorAll('[data-pd]').forEach((el) => { el.value = S.pdf[el.dataset.pd]; el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => { S.pdf[el.dataset.pd] = el.value; draw(); }); });
    draw();
  });
  const o = (a) => a.filter(Boolean).sort(cmp).map((x) => `<option>${esc(x)}</option>`).join('');
  return `<div class="filters"><div><label>Keuskupan</label><select data-pd="kus"><option value="">Semua</option>${o(uniq(D.pdpkk.map((x) => x.keuskupan)))}</select></div><div><label>Jenis PD</label><select data-pd="jenis"><option value="">Semua</option>${o(uniq(D.pdpkk.map((x) => x.jenis)))}</select></div><div class="q"><label>Cari</label><input data-pd="q" placeholder="Nama PD / koordinator…"></div></div><div id="res"></div>`;
};
PAGES['pd/ringkasan'] = () => {
  const r = D.pdpkk;
  return `<div class="grid g4" style="margin-bottom:16px">${D.kpis && D.kpis.bpk ? kpi('BPK di Indonesia', D.kpis.bpk.now, { c: '#1F56C4', t: 'var(--blue-t)', delta: D.kpis.bpk, note: `dari ${D.kpis.bpk.total} keuskupan terdata`, go: () => openPeta() }) : ''}${kpi('PDPKK terdaftar', r.length, { c: '#0B8277', t: 'var(--teal-t)', delta: D.kpis.pdpkk, go: () => openDrill('PDPKK terdaftar', r, C.pd) })}${kpi('Keuskupan memiliki PD', uniq(r.map((x) => x.keuskupan).filter(Boolean)).length, { c: '#1F56C4', t: 'var(--blue-t)', go: () => openDrill('Keuskupan memiliki PD', count(r, (x) => x.keuskupan || '(kosong)').map((x) => ({ nama: x.label, n: x.value })), [['Keuskupan', (x) => `<b>${esc(x.nama)}</b>`], ['Jumlah PD', (x) => x.n]]) })}${kpi('Koordinator', uniq(r.flatMap((x) => x.koordinator.map((k) => k.id))).length, { c: '#9A6200', t: 'var(--amber-t)', go: () => openDrill('Koordinator PD', uniq(r.flatMap((x) => x.koordinator.map((k) => k.id))).map((id) => { const k = r.flatMap((x) => x.koordinator).find((z) => z.id === id); return { ...k, keuskupan: k.keuskupan || '' }; }), C.orang) })}${kpi('PD tanpa koordinator', r.filter((x) => !x.koordinator.length).length, { c: '#C2362B', t: 'var(--coral-t)', go: () => openDrill('PD tanpa koordinator', r.filter((x) => !x.koordinator.length), C.pd) })}</div>
  <div class="grid g2">${donut('Jenis PD', count(r, (x) => x.jenis || 'Belum diisi'), { rows: r, get: (x) => x.jenis || 'Belum diisi', cols: C.pd })}${bars('PD per keuskupan', count(r, (x) => x.keuskupan || '(kosong)'), { max: 15, drill: { rows: r, get: (x) => x.keuskupan || '(kosong)', cols: C.pd } })}</div>`;
};

/* --- Tim Kerja --- */
const timRows = () => { const f = S.tf, q = f.q.toLowerCase(); return D.tim.filter((x) => (!f.status || x.status === f.status) && (!f.kat || x.kategori === f.kat) && (!f.bidang || x.bidang.includes(f.bidang)) && (!q || ((x.orang?.nama || '') + ' ' + x.seksi.join(' ')).toLowerCase().includes(q))); };
const katTone = { 'BPN INTI': 'violet', 'BPN HARIAN': 'blue', 'TIM KERJA': 'teal' };

/* --- Tim Saya (tab di Tim Kerja BPN): tim bidang, tim kerja (seksi), dan program kerja terkait --- */
const timApi = async (body) => { const r = await fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ action: 'tim', ...body }) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Gagal'); return j; };
const nzs = (t) => String(t || '').toLowerCase().replace(/^tim kerja\s*/, '').replace(/[^a-z0-9]/g, '');
PAGES['tim/saya'] = () => {
  const T0 = D.user.tim, boleh = (n) => T0.seksiEdit.includes(n);
  const seksiDari = (g) => T0.bidangSeksi[g] || [];
  const anggota = (nama) => D.tim.filter((x) => x.orang && x.seksi.includes(nama)).sort((a, b) => (a.status === b.status ? cmp(a.orang.nama, b.orang.nama) : a.status === 'AKTIF' ? -1 : 1));
  const pemimpin = (nama) => D.pengurus.filter((x) => /koordinator\s*seksi/i.test(x.jabatan) && nzs(x.jabatan.replace(/.*koordinator\s*seksi\s*/i, '')) === nzs(nama)).flatMap((x) => x.orang.map((o) => o.nama));
  const baris = (x, edit) => `<tr><td><b>${esc(x.orang.nama)}</b><div class="sub">${esc(x.orang.keuskupan || '')}</div></td><td>${esc(x.jabatanBpn.join(', ') || '–')}</td><td class="sub">${esc(x.mulai ? fdate(x.mulai) : '–')}${x.selesai ? ' → ' + esc(fdate(x.selesai)) : ''}</td><td>${chip(x.status || '–', x.status === 'AKTIF' ? 'green' : 'gray')}</td>${edit ? `<td style="white-space:nowrap">${x.status === 'AKTIF' ? `<button class="ghost" data-tkak="${esc(x.id)}">Akhiri</button>` : `<button class="ghost" data-tkon="${esc(x.id)}">Aktifkan lagi</button>`} <button class="ghost" data-tktg="${esc(x.id)}">Ubah tanggal</button></td>` : ''}</tr>`;
  const blokSeksi = (nama) => {
    const rows = anggota(nama), edit = boleh(nama), aktif = rows.filter((x) => x.status === 'AKTIF').length, ld = pemimpin(nama);
    return `<div class="card" style="margin-bottom:16px"><h3>${esc(nama)}<small>${aktif} aktif${rows.length > aktif ? ' · ' + (rows.length - aktif) + ' selesai' : ''}${ld.length ? ' · Koordinator: ' + esc(ld.join(', ')) : ''}</small></h3>
      ${edit ? `<div class="acts" style="margin-bottom:10px"><button class="btn" data-tkadd="${esc(nama)}" style="width:auto;margin:0">+ Tambah anggota</button></div>` : '<p class="note">Anda anggota seksi ini (hanya lihat).</p>'}
      <div class="tw"><table><thead><tr><th>Nama</th><th>Jabatan di BPN</th><th>Periode</th><th>Status</th>${edit ? '<th></th>' : ''}</tr></thead><tbody>${rows.map((x) => baris(x, edit)).join('') || `<tr><td colspan="${edit ? 5 : 4}" class="sub">Belum ada anggota.</td></tr>`}</tbody></table></div></div>`;
  };
  const peran = [...T0.bidang.map((b) => chip('Koordinator ' + b, 'violet')), ...T0.seksiKoord.map((n) => chip('Koordinator ' + n.replace(/^Tim Kerja\s*/, ''), 'blue')), ...T0.seksiAnggota.map((n) => chip('Anggota ' + n.replace(/^Tim Kerja\s*/, ''), 'teal'))].join('');
  const bidangHtml = Object.keys(T0.bidangSeksi).filter((g) => T0.semua || T0.bidang.includes(g)).sort(cmp).map((g) => {
    const sk = seksiDari(g), all = sk.flatMap((n) => anggota(n)), aktif = all.filter((x) => x.status === 'AKTIF');
    const lead = D.pengurus.filter((x) => new RegExp('wakil\\s*koordinator.*' + g.replace(' ', '\\s*'), 'i').test(x.jabatan)).flatMap((x) => x.orang.map((o) => o.nama));
    return `<div class="card" style="margin-bottom:16px"><h3>Tim ${esc(g)}<small>${sk.length} seksi · ${aktif.length} anggota aktif${lead.length ? ' · Koordinator Bidang: ' + esc(lead.join(', ')) : ''}</small></h3>
      <div class="tw"><table><thead><tr><th>Seksi</th><th>Koordinator Seksi</th><th>Anggota aktif</th></tr></thead><tbody>${sk.map((n) => `<tr><td><b>${esc(n)}</b></td><td>${esc(pemimpin(n).join(', ') || '–')}</td><td>${anggota(n).filter((x) => x.status === 'AKTIF').length}</td></tr>`).join('')}</tbody></table></div></div>`;
  }).join('');
  const rel = D.proker.filter((p) => p.seksi.some((n) => T0.seksi.includes(n))).sort((a, b) => String(b.tahun).localeCompare(String(a.tahun)) || (a.bulanIdx - b.bulanIdx));
  const prog = `<div class="card"><h3>Program Kerja terkait<small>${rel.length} program yang penanggung jawabnya seksi Anda</small></h3><div class="tw"><table><thead><tr><th>Program</th><th>Seksi</th><th>Waktu</th><th>Status</th><th>ACC</th></tr></thead><tbody>${rel.map((p) => `<tr><td><b>${esc(p.program || p.label)}</b>${p.detil ? `<div class="sub">${esc(p.detil)}</div>` : ''}<div class="sub">${esc(p.penerima.join(', '))}</div></td><td>${esc(p.seksi.filter((n) => T0.seksi.includes(n)).join(', '))}</td><td>${esc([p.bulan, p.tahun].filter(Boolean).join(' '))}</td><td>${chip(p.status || '–', 'blue')}</td><td>${esc(p.acc || '–')}</td></tr>`).join('') || '<tr><td colspan="5" class="sub">Belum ada program yang tertaut ke seksi Anda.</td></tr>'}</tbody></table></div><p class="note" style="margin-top:10px">Untuk mengubah program, buka menu <b>Program Kerja</b>.</p></div>`;
  setTimeout(() => {
    const run = async (btn, body) => { btn.disabled = true; try { await timApi(body); await load(true); } catch (e) { alert(e.message); btn.disabled = false; } };
    document.querySelectorAll('[data-tkak]').forEach((el) => el.addEventListener('click', () => { if (confirm('Akhiri keanggotaan ini mulai hari ini?')) run(el, { op: 'akhiri', id: el.dataset.tkak }); }));
    document.querySelectorAll('[data-tkon]').forEach((el) => el.addEventListener('click', () => { if (confirm('Aktifkan kembali keanggotaan ini (tanggal selesai dikosongkan)?')) run(el, { op: 'aktifkan', id: el.dataset.tkon }); }));
    document.querySelectorAll('[data-tktg]').forEach((el) => el.addEventListener('click', () => { const x = D.tim.find((t) => t.id === el.dataset.tktg); if (x) timTanggal(x); }));
    document.querySelectorAll('[data-tkadd]').forEach((el) => el.addEventListener('click', () => timTambah(el.dataset.tkadd)));
  });
  return `<div class="note" style="margin-bottom:12px">Peran Anda: <span class="chips" style="display:inline-flex">${peran || chip('Administrator', 'violet')}</span><br>Koordinator Bidang dan Koordinator Seksi dapat menambah anggota, mengakhiri/mengaktifkan keanggotaan, dan mengubah tanggal di seksi yang dipimpinnya. Anggota biasa hanya melihat.</div>
  ${bidangHtml ? `<h3 style="margin:18px 0 8px">Tim Bidang</h3>${bidangHtml}` : ''}<h3 style="margin:18px 0 8px">Tim Kerja (Seksi)</h3>${T0.seksi.map(blokSeksi).join('')}${prog}`;
};
function timTanggal(x) {
  modal(`<h2>Ubah tanggal: ${esc(x.orang.nama)}</h2><p class="sub">${esc(x.seksi.join(', '))}</p><div class="eform" style="grid-template-columns:1fr 1fr"><div><label>Tanggal mulai</label><input type="date" id="tgm" value="${esc(x.mulai || '')}"></div><div><label>Tanggal selesai</label><input type="date" id="tgs" value="${esc(x.selesai || '')}"><div class="sub">Kosongkan bila masih aktif.</div></div></div><div class="err" id="tge"></div><div class="mact"><button class="btn" id="tgo" type="button">Simpan</button></div>`);
  $('#tgo').onclick = async (e) => { e.target.disabled = true; try { await timApi({ op: 'tanggal', id: x.id, mulai: $('#tgm').value, selesai: $('#tgs').value }); closeModal(); await load(true); } catch (err) { $('#tge').textContent = err.message; e.target.disabled = false; } };
}
function timTambah(seksi) {
  let pilih = null;
  modal(`<h2>Tambah anggota</h2><p class="sub">${esc(seksi)}</p><div class="eform" style="grid-template-columns:1fr 1fr"><div style="grid-column:1/-1;position:relative"><label>Cari nama (harus sudah ada di data umat)</label><input id="tcq" autocomplete="off" placeholder="Ketik minimal 2 huruf…"><div id="tcr"></div></div><div><label>Tanggal mulai</label><input type="date" id="tcm" value="${esc(D.today || '')}"></div><div><label>Terpilih</label><div id="tcp" class="sub">Belum ada</div></div></div><div class="err" id="tce"></div><div class="mact"><button class="btn" id="tco" type="button" disabled>Tambahkan</button></div>`);
  const q = $('#tcq');
  q.addEventListener('input', () => { clearTimeout(q._t); pilih = null; $('#tco').disabled = true; $('#tcp').textContent = 'Belum ada'; if (q.value.trim().length < 2) { $('#tcr').innerHTML = ''; return; }
    q._t = setTimeout(async () => { const j = await fetch('/api/data?cari=' + encodeURIComponent(q.value.trim()), { credentials: 'same-origin' }).then((r) => r.json()).catch(() => ({ orang: [] }));
      $('#tcr').innerHTML = (j.orang || []).map((o) => `<button type="button" class="ghost" style="display:block;width:100%;text-align:left;margin-top:4px" data-pid="${esc(o.id)}" data-nm="${esc(o.nama)}">${esc(o.nama)}<span class="sub"> ${esc(o.keuskupan)}</span></button>`).join('') || '<div class="sub">Tidak ditemukan.</div>';
      document.querySelectorAll('#tcr [data-pid]').forEach((b) => b.addEventListener('click', () => { pilih = b.dataset.pid; $('#tcp').textContent = b.dataset.nm; $('#tcr').innerHTML = ''; $('#tco').disabled = false; })); }, 300); });
  $('#tco').onclick = async (e) => { e.target.disabled = true; try { await timApi({ op: 'tambah', seksi, personId: pilih, mulai: $('#tcm').value }); closeModal(); await load(true); } catch (err) { $('#tce').textContent = err.message; e.target.disabled = false; } };
}
PAGES['tim/daftar'] = () => {
  const draw = () => {
    const rows = timRows().sort((a, b) => cmp(a.orang?.nama, b.orang?.nama));
    $('#res').innerHTML = `<div class="note" style="margin-bottom:8px">${rows.length} penugasan</div><div class="tw"><table><thead><tr><th>Nama</th><th>Keuskupan</th><th>Seksi</th><th>Bidang</th><th>Kategori</th><th>Jabatan</th><th>Periode</th><th>Status</th></tr></thead><tbody>${rows.map((x) => `<tr><td><b>${esc(x.orang?.nama || '–')}</b></td><td>${esc(x.orang?.keuskupan || '–')}</td><td>${esc(x.seksi.join(', ') || '–')}</td><td>${esc(x.bidang.join(', ') || '–')}</td><td>${chip(x.kategori || '–', katTone[x.kategori] || 'gray')}</td><td class="sub">${esc(uniq([...x.jabatanBpn, ...x.jabatanBpk]).join(', '))}</td><td class="sub" style="white-space:nowrap">${esc(fdate(x.mulai))}${x.selesai ? ' → ' + esc(fdate(x.selesai)) : ''}</td><td>${chip(x.status || '–', x.status === 'AKTIF' ? 'green' : 'gray')}</td></tr>`).join('') || '<tr><td colspan="8"><div class="empty">Tidak ada data.</div></td></tr>'}</tbody></table></div>`;
  };
  setTimeout(() => {
    document.querySelectorAll('[data-tf]').forEach((el) => { el.value = S.tf[el.dataset.tf]; el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => { S.tf[el.dataset.tf] = el.value; draw(); }); });
    draw();
  });
  const o = (a) => a.filter(Boolean).sort(cmp).map((x) => `<option>${esc(x)}</option>`).join('');
  return `<div class="filters"><div><label>Status</label><select data-tf="status"><option value="">Semua</option>${o(uniq(D.tim.map((x) => x.status)))}</select></div><div><label>Kategori</label><select data-tf="kat"><option value="">Semua</option>${o(uniq(D.tim.map((x) => x.kategori)))}</select></div><div><label>Bidang</label><select data-tf="bidang"><option value="">Semua</option>${o(uniq(D.tim.flatMap((x) => x.bidang)))}</select></div><div class="q"><label>Cari</label><input data-tf="q" placeholder="Nama / seksi…"></div></div><div id="res"></div>`;
};
const baganView = (saya) => {
  const T0 = D.user.tim || { seksi: [] };
  const aktif = D.tim.filter((x) => (S.showDone || x.status === 'AKTIF') && x.orang && (!saya || x.seksi.some((n) => T0.seksi.includes(n))));
  const top = saya ? [] : D.pengurus.filter((x) => x.rank >= 70 && x.orang.length);
  const bd = by(aktif, (x) => x.bidang[0] || 'Seksi / Tim lain');
  const keys = Object.keys(bd).sort(cmp);
  const colours = ['#3B82F6', '#14B8A6', '#8B7CF6', '#F59E0B', '#EC6F8E', '#34C28A', '#38BDF8'];
  return `<div class="filters" style="justify-content:space-between"><div class="note"><b>${aktif.length}</b> orang aktif di tim BPN · ${keys.length} bidang</div><label style="display:flex;gap:8px;align-items:center;margin:0;font-size:13px"><input type="checkbox" id="done" style="width:auto" ${S.showDone ? 'checked' : ''}> Tampilkan yang sudah selesai</label></div>
  <div class="org"><div class="node"><img src="/logo.png" alt="">BPN PKKI</div><div class="vl"></div>
    <div class="rail">${top.flatMap((x) => x.orang.map((o) => `<div class="lead" data-go="#/org/pengurus" title="Lihat daftar pengurus" style="cursor:pointer">${av(o.nama)}<div><small>${esc(x.jabatan)}</small><b>${esc(o.nama)}</b><small>${esc(o.keuskupan)}</small></div></div>`)).join('')}</div><div class="vl"></div>
    <div class="bidangs">${keys.map((b, i) => { const sk = by(bd[b], (x) => x.seksi[0] || 'Anggota'); return `<div class="bd"><header style="background:${colours[i % colours.length]}">${esc(b)}<small>${bd[b].length} orang</small></header>${Object.keys(sk).sort(cmp).map((s) => `<div class="sk"><h4>${esc(s)}</h4>${sk[s].sort((a, b) => cmp(a.orang.nama, b.orang.nama)).map((x) => `<div class="mem">${av(x.orang.nama)}<div style="min-width:0"><b>${esc(x.orang.nama)}</b><small>${esc(uniq([...x.jabatanBpn, ...x.jabatanBpk]).filter(Boolean).join(' · ') || x.kategori)} · ${esc(x.orang.keuskupan)}</small></div><span style="margin-left:auto">${chip(x.kategori, katTone[x.kategori] || 'gray')}</span></div>`).join('')}</div>`).join('')}</div>`; }).join('')}</div></div>`;
};
PAGES['tim/bagan'] = () => baganView(false);
PAGES['org/bagansaya'] = () => baganView(true);

/* --- Laporan (agregat) --- */
const lap = (fn) => () => {
  if (!R) { fetch('/api/report', { credentials: 'same-origin' }).then((r) => r.json()).then((j) => { R = j; render(); }).catch(() => { $('#page').innerHTML = '<div class="empty">Gagal memuat laporan.</div>'; }); return '<div class="load"><div class="sp"></div><div>Memuat laporan…</div></div>'; }
  return fn(R);
};
const find = (list, re) => ((list || []).find((x) => re.test(x.label)) || { value: 0 }).value;
PAGES['laporan/pleno'] = lap((r) => {
  const e = r.pleno, rw = e.rows || [], D2 = (get, rows = rw) => ({ rows, get, cols: C.pleno }), all = (t, rows) => () => openDrill(t, rows, C.pleno);
  return `<div class="grid g4" style="margin-bottom:16px">${kpi('Data masuk', e.total, { c: '#1F56C4', t: 'var(--blue-t)', go: all('Semua data pleno', rw) })}${kpi('Hadir', find(e.kehadiran, /^HADIR$/i), { c: '#13805A', t: 'var(--green-t)', go: all('Hadir', rw.filter((x) => /^HADIR$/i.test(x.kehadiran))) })}${kpi('Tidak hadir', find(e.kehadiran, /TIDAK/i), { c: '#C2362B', t: 'var(--coral-t)', go: all('Tidak hadir', rw.filter((x) => /TIDAK/i.test(x.kehadiran))) })}${kpi('Belum mengisi', find(e.kehadiran, /BELUM/i), { c: '#9A6200', t: 'var(--amber-t)', go: all('Belum mengisi', rw.filter((x) => /BELUM/i.test(x.kehadiran))) })}${kpi('Pasangan butuh kamar', e.pasangan, { c: '#5B4CD1', t: 'var(--violet-t)', go: all('Peserta dengan pasangan', rw.filter((x) => x.pasangan)) })}${kpi('Pastor', e.pastor, { c: '#0B8277', t: 'var(--teal-t)', go: all('Pastor', rw.filter((x) => x.pastor)) })}</div><div class="grid g2">${donut('Status kehadiran', e.kehadiran, D2((x) => x.kehadiran))}${donut('Kelengkapan foto', e.kelengkapanFoto, D2((x) => x.foto))}${bars('Kategori penugasan BPN', e.kategori, { drill: D2((x) => split(x.kategori)) })}${bars('Dukungan transportasi', e.transportasi, { drill: D2((x) => x.transport) })}${bars('Jadwal kedatangan', e.kedatangan, { drill: D2((x) => x.kedatangan) })}${bars('Membawa pasangan', e.bawaPasangan, { drill: D2((x) => x.pasangan) })}</div>`;
});
PAGES['laporan/tc'] = lap((r) => {
  const t = r.tc, rw = t.rows || [], mr = t.mentorRows || [], D2 = (get) => ({ rows: rw, get, cols: C.tc });
  return `<div class="grid g4" style="margin-bottom:16px">${kpi('Pendaftar', t.pendaftar, { c: '#1F56C4', t: 'var(--blue-t)', go: () => openDrill('Pendaftar TC SHDR', rw, C.tc) })}${kpi('Kelompok', t.kelompok, { c: '#0B8277', t: 'var(--teal-t)' })}${kpi('Mentor', t.mentor, { c: '#9A6200', t: 'var(--amber-t)', go: () => openDrill('Mentor TC SHDR', mr, C.mentor) })}</div><div class="grid g2">${donut('Status pendaftaran', t.statusTC, D2((x) => x.statusTC))}${donut('Status SHDR', t.statusSHDR, D2((x) => x.statusSHDR))}${donut('Verifikasi data', t.verifikasi, D2((x) => x.verifikasi))}${donut('Kelompok usia', t.kelompokUsia, D2((x) => x.usia))}${donut('Jenis kelamin', t.jenisKelamin, D2((x) => x.gender))}${bars('Kategori mentor', t.kategoriMentor, { drill: { rows: mr, get: (x) => x.kategori, cols: C.mentor } })}${bars('Pendaftar per keuskupan', t.perKeuskupan, { max: 25, drill: D2((x) => split(x.keuskupan)) })}</div>`;
});
PAGES['laporan/kepemudaan'] = lap((r) => {
  const k = r.kepemudaan, br = k.bpkRows || [], pr = k.pdRows || [], act = br.filter((x) => x.aktif);
  return `<div class="grid g4" style="margin-bottom:16px">${kpi('BPK aktif', k.bpkAktif, { c: '#1F56C4', t: 'var(--blue-t)', go: () => openDrill('BPK aktif', act, C.bpk) })}${kpi('Sudah punya PIC', k.bpkPunyaPIC, { c: '#13805A', t: 'var(--green-t)', go: () => openDrill('BPK yang sudah punya PIC Kepemudaan', act.filter((x) => x.pic), C.bpk) })}${kpi('Belum punya PIC', k.bpkBelumPIC, { c: '#C2362B', t: 'var(--coral-t)', go: () => openDrill('BPK yang belum punya PIC Kepemudaan', act.filter((x) => !x.pic), C.bpk) })}${kpi('PDPKK terdata', k.pdpkkTotal, { c: '#0B8277', t: 'var(--teal-t)', go: () => openDrill('PDPKK terdata', pr, C.pdr) })}</div><div class="grid g2">${donut('Jenis PDPKK', k.pdpkkJenis, { rows: pr, get: (x) => x.jenis, cols: C.pdr })}${bars('Status peserta TC per BPK', k.statusPesertaTC, { drill: { rows: br, get: (x) => x.statusTC, cols: C.bpk } })}</div>`;
});

/* ===== Drill-down: klik angka/grafik membuka daftar datanya ===== */
function matchRows(rows, get, label) {
  return rows.filter((r) => { let v = get(r); v = Array.isArray(v) ? v : [v]; v = v.filter(Boolean); return label === '' ? true : label === '(kosong)' ? !v.length : v.includes(label); });
}
function openPeta() {
  const P = window.PETA, list = D.bpkList.filter((b) => b.aktif).sort((a, b) => cmp(a.nama, b.nama));
  const xy = (b) => [P.x0 + (b.lng - 94.5) * P.k, P.y0 + (6.5 - b.lat) * P.k];
  const dots = list.filter((b) => b.lat != null && b.lng != null).map((b) => { const [x, y] = xy(b); const peng = /Penghubung/.test(b.status || ''); return `<g class="pt" data-bpk="${esc(b.nama)}" tabindex="0"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="11" fill="transparent"/><circle class="dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${peng ? '#9AA7C0' : '#1F56C4'}" stroke="#fff" stroke-width="1.5"/><title>${esc(b.nama)}</title></g>`; }).join('');
  const n = list.length, np = list.filter((b) => /Penghubung/.test(b.status || '')).length;
  modal(`<h2>BPK di Indonesia</h2><div class="note">${nf.format(n)} keuskupan · <span class="lg" style="background:#1F56C4"></span> BPK ${nf.format(n - np)} · <span class="lg" style="background:#9AA7C0"></span> BPK Penghubung ${nf.format(np)}. Klik titik atau nama untuk melihat detail.</div>
    <div class="mapbox"><svg viewBox="0 0 ${P.W} ${P.H}" role="img" aria-label="Peta sebaran BPK di Indonesia"><rect width="${P.W}" height="${P.H}" fill="#EEF3FA"/><path d="${P.d}" fill="#fff" stroke="#B8C4DA" stroke-width=".6"/>${dots}</svg><div class="maptip" id="mtip"></div></div>
    <input id="dq" placeholder="Cari keuskupan…" style="width:100%;box-sizing:border-box;margin:10px 0 6px"><div class="tw" id="dt" style="max-height:34vh;overflow:auto"></div>`, true);
  const draw = () => { const q = $('#dq').value.toLowerCase(), l = list.filter((b) => !q || b.nama.toLowerCase().includes(q)); $('#dt').innerHTML = `<table><thead><tr><th>Keuskupan</th><th>Status</th></tr></thead><tbody>${l.map((b) => `<tr><td><a href="#" class="bpk" data-bpk="${esc(b.nama)}"><b>${esc(b.nama)}</b></a></td><td>${esc(b.status || '–')}</td></tr>`).join('') || '<tr><td colspan="2"><div class="empty">Tidak ada data.</div></td></tr>'}</tbody></table>`; };
  $('#dq').addEventListener('input', draw); draw();
  const tip = $('#mtip'), svg = document.querySelector('.mapbox svg');
  svg.querySelectorAll('.pt').forEach((g) => {
    const nm = g.dataset.bpk;
    g.addEventListener('mouseenter', () => { tip.textContent = nm; tip.style.opacity = 1; });
    g.addEventListener('mousemove', (e) => { const r = svg.getBoundingClientRect(); tip.style.left = e.clientX - r.left + 10 + 'px'; tip.style.top = e.clientY - r.top - 28 + 'px'; });
    g.addEventListener('mouseleave', () => { tip.style.opacity = 0; });
    g.addEventListener('click', () => openBpk(nm));
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter') g.dispatchEvent(new Event('click')); });
  });
}
function openDrill(title, rows, cols) {
  const text = (r) => cols.map(([, f]) => String(f(r)).replace(/<[^>]*>/g, ' ')).join(' ').toLowerCase();
  modal(`<h2>${esc(title)}</h2><div class="note" id="dn"></div><input id="dq" placeholder="Cari di daftar ini…" style="width:100%;box-sizing:border-box;margin:8px 0"><div class="tw" id="dt" style="max-height:60vh;overflow:auto"></div>`, true);
  const draw = () => {
    const q = $('#dq').value.toLowerCase(), list = rows.filter((r) => !q || text(r).includes(q));
    $('#dn').textContent = `${nf.format(list.length)} data${list.length > 400 ? ' (menampilkan 400 pertama)' : ''}`;
    $('#dt').innerHTML = `<table><thead><tr>${cols.map(([h]) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${list.slice(0, 400).map((r) => `<tr${r.id && r.pelaksanaTipe !== undefined ? ` class="prow" data-pid="${r.id}"` : ''}>${cols.map(([, f]) => `<td>${f(r)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${cols.length}"><div class="empty">Tidak ada data.</div></td></tr>`}</tbody></table>`;
  };
  $('#dq').addEventListener('input', draw); draw();
}
const C = { // kolom siap pakai
  proker: [['Waktu', (p) => `<b>${esc(waktu(p))}</b>`], ['Program', (p) => `<b>${esc(p.program || p.label)}</b>${p.detil ? `<div class="sub">${esc(p.detil)}</div>` : ''}`], ['Dilayani', (p) => bpkLinks(p.penerima) || '–'], ['Melayani', (p) => bpkLinks(p.pelaksana) || (p.pelaksanaTipe === 'BPN' ? 'BPN' : '–')], ['Status', (p) => stChips(p)], ['Anggaran', (p) => rp(p.anggaran)]],
  pd: [['Nama PD', (x) => `<b>${esc(x.nama)}</b>`], ['Keuskupan', (x) => esc(x.keuskupan || '–')], ['Jenis', (x) => esc(x.jenis || '–')], ['Koordinator', (x) => esc((x.koordinator || []).map((k) => k.nama).join(', ') || '–')]],
  pdr: [['Nama PD', (x) => `<b>${esc(x.nama)}</b>`], ['Keuskupan', (x) => esc(x.keuskupan || '–')], ['Jenis', (x) => esc(x.jenis || '–')]],
  orang: [['Nama', (x) => `<b>${esc(x.nama || '–')}</b>`], ['Keuskupan', (x) => esc(x.keuskupan || '–')]],
  tc: [['Nama', (x) => `<b>${esc(x.nama || '–')}</b>`], ['Keuskupan', (x) => esc(x.keuskupan || '–')], ['Status TC', (x) => esc(x.statusTC || '–')], ['SHDR', (x) => esc(x.statusSHDR || '–')], ['Verifikasi', (x) => esc(x.verifikasi || '–')], ['Usia', (x) => esc(x.usia || '–')]],
  pleno: [['Nama', (x) => `<b>${esc(x.nama || '–')}</b>`], ['Keuskupan', (x) => esc(x.keuskupan || '–')], ['Kehadiran', (x) => esc(x.kehadiran || '–')], ['Foto', (x) => esc(x.foto || '–')], ['Kategori', (x) => esc(x.kategori || '–')], ['Pasangan', (x) => esc(x.pasangan || '–')]],
  mentor: [['Mentor', (x) => `<b>${esc(x.nama || '–')}</b>`], ['Kategori', (x) => esc(x.kategori || '–')]],
  bpk: [['Keuskupan', (x) => `<b>${esc(x.nama)}</b>`], ['Status BPK', (x) => (x.aktif ? 'Aktif' : 'Tidak aktif')], ['PIC Kepemudaan', (x) => (x.pic ? 'Ada' : 'Belum ada')], ['Status peserta TC', (x) => esc(x.statusTC || '–')]],
};
const split = (v) => String(v || '').split(', ').filter(Boolean);

/* ===== Modal, menu program, profil BPK ===== */
const PBmap = () => { if (!D._pb) { D._pb = {}; Object.values(D.bpkProfil || {}).forEach((b) => { D._pb[b.nama] = b; }); } return D._pb; };
const bpkLinks = (names) => (names || []).map((n) => (PBmap()[n] ? `<a href="#" class="bpk" data-bpk="${esc(n)}">${esc(n)}</a>` : esc(n))).join(', ');
const canEditP = (p) => ['keuskupan', 'semua', 'ringkasan', 'acc'].some((t) => (D.perm['proker/' + t] || 0) >= 2) && (!p || !D.user.seksiEdit || (p.seksi || []).some((n) => D.user.seksiEdit.map((x) => x.toLowerCase()).includes(String(n).toLowerCase())));
function modal(html, wide) {
  closeModal();
  const o = document.createElement('div'); o.className = 'ov'; o.id = 'ov';
  o.innerHTML = `<div class="md${wide ? ' wide' : ''}" role="dialog"><button class="x" aria-label="Tutup">✕</button>${html}</div>`;
  o.addEventListener('mousedown', (e) => { if (e.target === o) closeModal(); });
  o.querySelector('.x').onclick = closeModal;
  document.body.appendChild(o);
  return o;
}
function closeModal() { $('#ov')?.remove(); }
function closeMenu() { $('#pmenu')?.remove(); }
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); closeMenu(); } });

function showMenu(id, ev) {
  closeMenu();
  const m = document.createElement('div'); m.id = 'pmenu'; m.className = 'pmenu';
  m.innerHTML = `<button data-a="detail">🔍 Lihat detail</button>${canEditP(D.proker.find((x) => x.id === id)) ? '<button data-a="edit">✏️ Edit program</button>' : ''}`;
  document.body.appendChild(m);
  const w = m.offsetWidth, h = m.offsetHeight;
  m.style.left = Math.min(ev.clientX, innerWidth - w - 8) + 'px'; m.style.top = Math.min(ev.clientY, innerHeight - h - 8) + 'px';
  m.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; closeMenu(); (b.dataset.a === 'edit' ? openEdit : openDetail)(id); });
}
document.addEventListener('click', (e) => {
  const dd = e.target.closest('[data-dr]');
  if (dd && DR[+dd.dataset.dr]) { closeMenu(); return DR[+dd.dataset.dr](dd.dataset.l); }
  const pp = e.target.closest('a.ppl');
  if (pp && AN && AN.orang) { e.preventDefault(); e.stopPropagation(); closeMenu(); return openOrang(pp.dataset.ppl); }
  const a = e.target.closest('a.bpk');
  if (a) { e.preventDefault(); e.stopPropagation(); closeMenu(); return openBpk(a.dataset.bpk); }
  if (e.target.closest('#pmenu')) return;
  closeMenu();
  const tr = e.target.closest('.prow');
  if (tr && !e.target.closest('a,button,input,select,textarea,label')) showMenu(tr.dataset.pid, e);
});

const row = (l, v) => `<div class="kv"><span>${esc(l)}</span><div>${v || '<span class="sub">–</span>'}</div></div>`;
function openDetail(id) {
  const p = D.proker.find((x) => x.id === id); if (!p) return;
  const sy = syarat(p), tick = (ok, t) => `<div class="rule2 ${ok ? 'ok' : 'no'}">${ok ? '✓' : '✗'} ${esc(t)}</div>`;
  modal(`<h2>${esc(p.program || p.label)}</h2>${p.detil ? `<p class="sub">${esc(p.detil)}</p>` : ''}${stChips(p)}
    <div class="kvs">${row('Waktu', esc(waktu(p)))}${row('Dilayani (penerima)', bpkLinks(p.penerima))}${row('Melayani (pelaksana)', bpkLinks(p.pelaksana) || (p.pelaksanaTipe === 'BPN' ? 'BPN' : ''))}${row('Pelaksana', esc(p.pelaksanaTipe))}${row('Metode', esc(p.metode))}${row('Sumber dana', esc(p.sumberDana))}${row('Anggaran dari BPN', p.anggaran ? rp(p.anggaran) : '')}${row('Seksi penanggung jawab', esc(p.seksi.join(', ')))}${row('Jenis kegiatan', esc(p.jenis.join(', ')))}${row('Kaitan modul', esc(p.modul.join(', ')))}${row('Catatan', esc(p.catatan))}</div>
    <h4>Syarat ACC</h4><div class="rules2">${tick(sy.pelaksana, 'Pelaksana = BPK')}${tick(sy.deal, 'Deal')}${tick(sy.acc, 'ACC disetujui')}</div>
    ${canEditP(p) ? '<div class="mact"><button class="btn" id="goedit">✏️ Edit program</button></div>' : ''}`, true);
  $('#goedit')?.addEventListener('click', () => openEdit(id));
}
function openEdit(id) {
  const p = D.proker.find((x) => x.id === id); if (!p) return;
  const o = (arr, cur) => ['', ...new Set([...(arr || []), cur].filter(Boolean))].map((v) => `<option value="${esc(v)}"${v === (cur || '') ? ' selected' : ''}>${esc(v || '— kosong —')}</option>`).join('');
  const sel = (k, label, arr, cur) => `<div><label>${label}</label><select name="${k}">${o(arr, cur)}</select></div>`;
  modal(`<h2>Edit program</h2><p class="sub">${esc(p.program || p.label)} · ${esc(p.penerima.join(', ') || '–')}</p>
    <form id="ef" class="eform">
      ${sel('status', 'Status', D.opsi.status, p.status)}${sel('acc', 'ACC', D.opsi.acc, p.acc)}${sel('tahun', 'Tahun', D.opsi.tahun, p.tahun)}${sel('bulan', 'Bulan', D.opsi.bulan, p.bulan)}${sel('metode', 'Metode pelaksanaan', D.opsi.metode, p.metode)}${sel('sumberDana', 'Sumber dana', D.opsi.sumberDana, p.sumberDana)}
      <div><label>Anggaran dari BPN (Rp)</label><input name="anggaran" type="number" min="0" step="1" value="${p.anggaran || ''}"></div>
      <div class="chk"><label><input type="checkbox" name="deal"${p.deal ? ' checked' : ''}> Deal dengan BPK sudah disepakati</label></div>
      <div class="full"><label>Detil program</label><input name="detil" maxlength="500" value="${esc(p.detil)}"></div>
      <div class="full"><label>Catatan / label</label><textarea name="catatan" rows="3" maxlength="2000">${esc(p.catatan)}</textarea></div>
    </form>
    <p class="note">Penerima, pelaksana, dan program induk diubah di Airtable. Perubahan di sini langsung tersimpan ke Airtable.</p>
    <div class="err" id="ee"></div><div class="mact"><button class="ghost" id="ec">Batal</button><button class="btn" id="es">Simpan</button></div>`, true);
  $('#ec').onclick = closeModal;
  $('#es').onclick = async () => {
    const f = $('#ef'), v = (n) => f.elements[n].value;
    const fields = { status: v('status'), acc: v('acc'), tahun: v('tahun'), bulan: v('bulan'), metode: v('metode'), sumberDana: v('sumberDana'), anggaran: v('anggaran'), deal: f.elements.deal.checked, detil: v('detil'), catatan: v('catatan') };
    $('#es').disabled = true; $('#es').textContent = 'Menyimpan…'; $('#ee').textContent = '';
    try {
      const r = await fetch('/api/proker', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ id, fields }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Gagal menyimpan');
      Object.assign(p, { status: fields.status, acc: fields.acc, tahun: fields.tahun, bulan: fields.bulan, bulanIdx: BLN3 ? ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agust', 'Sept', 'Okt', 'Nov', 'Dec'].indexOf(fields.bulan) : -1, metode: fields.metode, sumberDana: fields.sumberDana, anggaran: Number(fields.anggaran) || 0, deal: fields.deal, detil: fields.detil.trim(), catatan: fields.catatan.trim() });
      closeModal(); render();
    } catch (e) { $('#ee').textContent = e.message; $('#es').disabled = false; $('#es').textContent = 'Simpan'; }
  };
}
const fmtTgl = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const masa = (x) => `${x.mulai ? fmtTgl(x.mulai) : 'awal tidak tercatat'} – ${x.selesai ? fmtTgl(x.selesai) : 'sekarang'}`;
function pejCard(x, big) {
  const o = x.orang;
  const photo = o.foto ? `<img class="ph${big ? ' big' : ''}" src="${esc(o.foto)}" alt="${esc(o.nama)}" loading="lazy">` : `<div class="av${big ? ' bigav' : ''}" style="background:${hue(o.nama)}">${esc(initials(o.nama))}</div>`;
  return `<div class="pej${big ? ' main' : ''}">${photo}<div class="pi"><b>${esc(o.nama)}</b><span>${esc(x.jabatan || '')}${x.mulai ? ` · sejak ${esc(fmtTgl(x.mulai))}` : ''}</span><div class="acts">${o.adaWa ? `<a class="wa" target="_blank" rel="noopener" href="/api/wa?p=${esc(o.id)}">💬 WhatsApp</a>` : ''}${o.email ? `<a class="wa em" href="mailto:${esc(o.email)}">✉ Email</a>` : ''}</div></div></div>`;
}
function openBpk(nama) {
  const b = PBmap()[nama];
  const dil = D.proker.filter((p) => p.penerima.includes(nama)), mel = D.proker.filter((p) => p.pelaksana.includes(nama));
  const koor = (b ? b.pejabat : []).filter((x) => x.koordinator), lain = (b ? b.pejabat : []).filter((x) => !x.koordinator);
  modal(`<h2>BPK ${esc(nama)}</h2><div class="chips" style="margin-bottom:12px">${chip(dil.length + ' program dilayani', 'blue')}${chip(mel.length + ' program dilaksanakan', 'teal')}</div>
    <h4>Koordinator BPK</h4>${koor.length ? koor.map((x) => pejCard(x, true)).join('') : '<div class="empty">Data koordinator belum tersedia.</div>'}
    ${lain.length ? `<h4>Pengurus BPK lainnya</h4><div class="pejs">${lain.map((x) => pejCard(x, false)).join('')}</div>` : ''}
    ${riwayatHtml(b)}`, true);
}
function riwayatHtml(b) {
  const r = (b && b.riwayat) || [];
  if (!r.length) return '';
  const g = {}; r.forEach((x) => { (g[x.jabatan || '–'] = g[x.jabatan || '–'] || []).push(x); });
  return `<h4>Riwayat jabatan (sudah tidak aktif)</h4>${Object.entries(g).map(([j, l]) => `<div class="riw"><b>${esc(j)}</b>${l.map((x) => `<div class="sub">${esc(x.orang.nama)} · ${esc(masa(x))}</div>`).join('')}</div>`).join('')}`;
}

/* ===== Administrasi pengguna ===== */
const LVL = { none: 'Tidak ada akses', view: 'Lihat saja', edit: 'Lihat + Edit' };
const NAMES = ['none', 'view', 'edit'];
async function admApi(body) {
  const r = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Gagal');
  return j;
}
const admReload = async () => { ADM = null; render(); };
function showPw(j, judul) {
  const wa = j.terkirim === true ? `<p class="okmsg">✓ Undangan dan tautan masuk sudah dikirim lewat WhatsApp ke ${esc(j.wa)}.</p>` : j.terkirim === false ? `<p class="errmsg">WhatsApp belum terkirim: ${esc(j.galat || 'gagal')}. Salin tautan di bawah dan kirim manual, atau coba tombol "Kirim WA" lagi nanti.</p>` : '';
  modal(`<h2>${judul}</h2>${wa}<p class="note" style="text-align:left">Pengguna masuk dengan nomor WhatsApp-nya. Tautan ini hanya tampil sekali dan sekali pakai; setelah masuk ia membuat password sendiri.</p><div class="kvs">${row('Nomor', esc(j.wa))}${j.password ? row('Password sementara', `<code class="pw">${esc(j.password)}</code>`) : ''}${row('Tautan masuk', `<input readonly value="${esc(j.link || '')}" onclick="this.select()" style="width:100%">`)}</div><div class="mact">${j.password ? '<button class="btn" id="cp">Salin password</button>' : ''}<button class="btn" id="cl">Salin tautan</button></div>`);
  if (j.password) $('#cp').onclick = () => { navigator.clipboard?.writeText(j.password); $('#cp').textContent = 'Tersalin ✓'; };
  $('#cl').onclick = () => { navigator.clipboard?.writeText(j.link); $('#cl').textContent = 'Tersalin ✓'; };
}
const labelOfKey = (k) => { const [m, t] = k.split('/'); const mm = MENU.find((x) => x.id === m); return t ? '   ↳ ' + ((mm.tabs.find((x) => x[0] === t) || [, t])[1]) : mm.label; };
const roleKeys = () => Object.keys(ADM.tree).filter((m) => m !== 'admin').flatMap((m) => [m, ...ADM.tree[m].map((t) => `${m}/${t}`)]);
const roleChip = (n, auto) => chip(n + (auto ? ' · otomatis' : ''), auto ? 'teal' : 'blue');
const pemicu = (r) => [r.kat, r.seksi && r.seksi.replace(/^Tim Kerja\s*/i, ''), r.tingkat].filter(Boolean).join(' · ') || '–';
function openRolesUser(u) {
  const cb = (r) => `<label class="chk" style="display:flex;gap:8px;align-items:flex-start;margin:4px 0"><input type="checkbox" value="${esc(r.nama)}" ${u.roles.includes(r.nama) ? 'checked' : ''} style="width:auto;margin-top:3px"><span><b>${esc(r.nama)}</b>${r.desk ? `<br><span class="sub">${esc(r.desk)}</span>` : ''}</span></label>`;
  const sis = ADM.roles.filter((r) => r.sistem), cus = ADM.roles.filter((r) => !r.sistem);
  modal(`<h2>Role: ${esc(u.nama)}</h2><p class="sub">Boleh lebih dari satu. Jika bentrok, hak yang <b>tertinggi</b> yang berlaku. Role bertanda "otomatis" diberikan sistem dari jabatan orang ini di Tim BPN dan tidak perlu dicentang.</p>${u.auto.length ? `<div class="chips" style="margin-bottom:8px">${u.auto.map((n) => roleChip(n, true)).join('')}</div>` : ''}
    <div style="max-height:46vh;overflow:auto;border:1px solid var(--line,#e3e8f2);border-radius:10px;padding:8px 12px"><h4 style="margin:4px 0">Role umum</h4>${sis.map(cb).join('')}${cus.length ? `<h4 style="margin:10px 0 4px">Role BPN (per seksi dan lainnya)</h4>${cus.map(cb).join('')}` : ''}</div>
    <div class="err" id="ae"></div><div class="mact"><button class="btn" id="as">Simpan</button></div>`, true);
  $('#as').onclick = async () => { const roles = [...document.querySelectorAll('#ov input[type=checkbox]:checked')].map((x) => x.value); try { await admApi({ action: 'update', id: u.id, roles }); closeModal(); admReload(); } catch (e) { $('#ae').textContent = e.message; } };
}
function openRole(r0) {
  const baru = !r0, r = r0 || { nama: '', sistem: false, terkunci: false, hak: {}, cakupan: 'Terbatas', seksi: '', tingkat: '', kat: '', desk: '' };
  const keys = roleKeys(), lock = r.terkunci;
  const opt = (arr, cur, blank) => `${blank ? `<option value="">${blank}</option>` : ''}${arr.map((x) => `<option${x === cur ? ' selected' : ''}>${esc(x)}</option>`).join('')}`;
  const copy = ADM.roles.filter((x) => x.nama !== r.nama);
  modal(`<h2>${baru ? 'Role baru' : 'Role: ' + esc(r.nama)}</h2>${lock ? '<p class="note">Admin dan Super Admin selalu memiliki akses penuh dan hanya mereka yang dapat membuka menu Administrasi.</p>' : ''}
    <div class="eform" style="grid-template-columns:1fr 1fr"><div><label>Nama role</label><input id="rn" value="${esc(r.nama)}" ${!baru ? 'readonly' : ''} placeholder="mis. Koordinator – Tim Kerja Dana"></div><div><label>Cakupan data umat</label><select id="rc" ${lock ? 'disabled' : ''}>${opt(['Nasional', 'Terbatas'], r.cakupan)}</select><div class="sub">Terbatas = hanya keuskupan/PD sesuai jabatannya.</div></div>
    <div style="grid-column:1/-1"><label>Keterangan</label><input id="rd" value="${esc(r.desk)}" placeholder="Untuk siapa role ini"></div></div>
    ${lock ? '' : `<h4 style="margin:12px 0 4px">Diberikan otomatis (opsional)</h4><p class="sub" style="margin:0 0 6px">Orang yang berstatus AKTIF di tabel Tim BPN dan cocok dengan kriteria ini langsung mendapat role ini. Kosongkan semua jika role hanya diberikan manual.</p>
    <div class="eform" style="grid-template-columns:1fr 1fr 1fr"><div><label>Kategori tim</label><select id="rk">${opt(['BPN INTI', 'BPN HARIAN', 'TIM KERJA'], r.kat, '(semua)')}</select></div><div><label>Seksi</label><select id="rs">${opt(ADM.seksi, r.seksi, '(semua)')}</select></div><div><label>Tingkat</label><select id="rt">${opt(['Koordinator', 'Anggota'], r.tingkat, '(semua)')}</select></div></div>
    <h4 style="margin:12px 0 4px">Hak akses menu</h4><div class="filters" style="margin:0 0 6px"><div><label>Salin dari role</label><select id="rcopy"><option value="">(pilih)</option>${copy.map((x) => `<option>${esc(x.nama)}</option>`).join('')}</select></div><div style="flex:none;align-self:end"><button type="button" class="ghost" id="rall">Semua: lihat saja</button> <button type="button" class="ghost" id="rno">Semua: tidak ada</button></div></div>`}
    <div class="tw" style="max-height:38vh;overflow:auto"><table><thead><tr><th>Menu / tab</th><th>Hak akses</th></tr></thead><tbody>${keys.map((k) => `<tr><td style="white-space:pre"><b>${esc(labelOfKey(k))}</b></td><td><select data-k="${k}" ${lock ? 'disabled' : ''}>${NAMES.map((n) => `<option value="${n}"${(lock ? 'edit' : r.hak[k] || 'none') === n ? ' selected' : ''}>${LVL[n]}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div>
    <p class="sub" style="margin-top:6px">Hak <i>Lihat + Edit</i> berlaku untuk Program Kerja dan Pengurus BPN (mengubah data).</p><div class="err" id="ae"></div>
    <div class="mact">${!baru && !lock ? `<button class="ghost" id="rdel">${r.sistem ? 'Kembalikan ke bawaan' : 'Hapus role'}</button>` : ''}${lock ? '' : '<button class="btn" id="rs2">Simpan</button>'}</div>`, true);
  if (lock) return;
  const setAll = (v) => document.querySelectorAll('#ov select[data-k]').forEach((s2) => { s2.value = v; });
  $('#rall').onclick = () => setAll('view'); $('#rno').onclick = () => setAll('none');
  $('#rcopy').onchange = (e) => { const src = ADM.roles.find((x) => x.nama === e.target.value); if (src) document.querySelectorAll('#ov select[data-k]').forEach((s2) => { s2.value = src.hak[s2.dataset.k] || 'none'; }); };
  $('#rs2').onclick = async () => {
    const hak = {}; document.querySelectorAll('#ov select[data-k]').forEach((s2) => { hak[s2.dataset.k] = s2.value; });
    try { await admApi({ action: 'role', id: r.id || undefined, nama: $('#rn').value, desk: $('#rd').value, cakupan: $('#rc').value, kat: $('#rk').value, seksi: $('#rs').value, tingkat: $('#rt').value, hak }); closeModal(); admReload(); } catch (e) { $('#ae').textContent = e.message; }
  };
  $('#rdel')?.addEventListener('click', async () => { if (!confirm(r.sistem ? 'Kembalikan hak role ini ke bawaan sistem?' : `Hapus role "${r.nama}"?`)) return; try { await admApi({ action: 'roledel', id: r.id }); closeModal(); admReload(); } catch (e) { $('#ae').textContent = e.message; } });
}
const HAK_KOORD = { dashboard: 'view', proker: 'edit', 'proker/keuskupan': 'edit', 'proker/semua': 'edit', 'proker/ringkasan': 'view', 'proker/acc': 'view', pengurus: 'view', pd: 'view', 'pd/daftar': 'view', 'pd/ringkasan': 'view', tim: 'view', 'tim/bagan': 'view', 'tim/daftar': 'view', modul: 'view', 'modul/ringkasan': 'view', 'modul/permodul': 'view', 'modul/peserta': 'view', 'modul/pengajar': 'view', umat: 'view', 'umat/ringkasan': 'view', 'umat/daftar': 'view', laporan: 'view', 'laporan/pleno': 'view', 'laporan/tc': 'view', 'laporan/kepemudaan': 'view', ls: 'edit', 'ls/tc': 'edit', 'ls/pengajar': 'view', 'ls/peserta': 'edit', 'ls/daftar': 'edit', 'ls/diskusi': 'edit', 'ls/pendaftar': 'view', 'ls/laporan': 'view', 'ls/dasbor': 'view' };
const HAK_ANGGOTA = { dashboard: 'view', proker: 'view', 'proker/keuskupan': 'view', 'proker/semua': 'view', 'proker/ringkasan': 'view', tim: 'view', 'tim/bagan': 'view', 'tim/daftar': 'view', modul: 'view', 'modul/ringkasan': 'view', 'modul/permodul': 'view', 'modul/peserta': 'view', 'modul/pengajar': 'view' };
async function buatRoleSeksi(btn) {
  const ada = new Set(ADM.roles.map((r) => r.nama.toLowerCase())); let n = 0;
  btn.disabled = true;
  try {
    for (const s2 of ADM.seksi) for (const [tg, hak] of [['Koordinator', HAK_KOORD], ['Anggota', HAK_ANGGOTA]]) {
      const nama = `${tg} – ${s2}`; if (ada.has(nama.toLowerCase())) continue;
      await admApi({ action: 'role', nama, desk: `${tg} ${s2} (otomatis dari Tim BPN)`, cakupan: 'Nasional', kat: '', seksi: s2, tingkat: tg, hak }); n++;
    }
    alert(n ? `${n} role dibuat. Periksa dan sesuaikan hak aksesnya per role.` : 'Semua role per seksi sudah ada.'); admReload();
  } catch (e) { alert(e.message); btn.disabled = false; }
}
const PAKET = [
  { nama: 'Koordinator Bidang', desk: 'Wakil Koordinator BPN Bidang 1/2/3 (otomatis dari jabatan yang memuat kata "Bidang" di Tim BPN)', kat: 'BPN HARIAN', seksi: 'Bidang', tingkat: 'Koordinator', hak: HAK_KOORD },
  { nama: 'Koordinator Seksi', desk: 'Semua yang berjabatan koordinator di Tim BPN (Koordinator Seksi, dst.)', kat: 'BPN HARIAN', seksi: '', tingkat: 'Koordinator', hak: HAK_KOORD },
  { nama: 'Anggota BPN Inti', desk: 'Anggota BPN Inti (otomatis dari Tim BPN)', kat: 'BPN INTI', seksi: '', tingkat: 'Anggota', hak: HAK_ANGGOTA },
  { nama: 'Anggota Tim Kerja', desk: 'Anggota Tim Kerja seksi (otomatis dari Tim BPN)', kat: 'TIM KERJA', seksi: '', tingkat: 'Anggota', hak: HAK_ANGGOTA },
];
async function pasangPaket(btn) {
  const ada = new Set(ADM.roles.map((r) => r.nama.toLowerCase())); let n = 0;
  if (!confirm('Pasang paket role yang disarankan (Koordinator Bidang, Koordinator Seksi, Anggota BPN Inti, Anggota Tim Kerja)? Role yang sudah ada tidak diubah.')) return;
  btn.disabled = true;
  try {
    for (const r of PAKET) { if (ada.has(r.nama.toLowerCase())) continue; await admApi({ action: 'role', nama: r.nama, desk: r.desk, cakupan: 'Nasional', kat: r.kat, seksi: r.seksi, tingkat: r.tingkat, hak: r.hak }); n++; }
    alert(n ? `${n} role dibuat. Hak aksesnya dapat disesuaikan lewat tombol Atur.` : 'Paket role sudah terpasang semua.'); admReload();
  } catch (e) { alert(e.message); btn.disabled = false; }
}
PAGES['admin/role'] = () => {
  if (!ADM) { fetch('/api/admin', { credentials: 'same-origin' }).then((r) => r.json()).then((j) => { if (j.error) throw new Error(j.error); ADM = j; render(); }).catch((e) => { $('#page').innerHTML = `<div class="empty">${esc(e.message || 'Gagal memuat')}</div>`; }); return '<div class="load"><div class="sp"></div><div>Memuat role…</div></div>'; }
  const edit = (D.perm['admin/role'] || 0) >= 2;
  setTimeout(() => {
    document.querySelectorAll('button[data-role]').forEach((el) => el.addEventListener('click', () => openRole(ADM.roles.find((r) => r.nama === el.dataset.role))));
    $('#rnew')?.addEventListener('click', () => openRole(null));
    $('#rseksi')?.addEventListener('click', (e) => buatRoleSeksi(e.target));
    $('#rpaket')?.addEventListener('click', (e) => pasangPaket(e.target));
  });
  const sis = ADM.roles.filter((r) => r.sistem), cus = ADM.roles.filter((r) => !r.sistem);
  const rows = (l) => l.map((r) => `<tr><td><b>${esc(r.nama)}</b>${r.diubah ? ' ' + chip('disesuaikan', 'amber') : ''}${r.desk ? `<div class="sub">${esc(r.desk)}</div>` : ''}</td><td class="sub">${esc(pemicu(r))}</td><td>${esc(r.cakupan)}</td><td>${nf.format(r.pakai)}</td><td><button class="ghost" data-role="${esc(r.nama)}">${edit && !r.terkunci ? 'Atur' : 'Lihat'}</button></td></tr>`).join('') || '<tr><td colspan="5"><div class="empty">Belum ada role.</div></td></tr>';
  const head = '<thead><tr><th>Role</th><th>Otomatis untuk</th><th>Cakupan data</th><th>Orang</th><th></th></tr></thead>';
  return `<div class="note" style="margin-bottom:12px">Hak akses diatur <b>per role</b>, bukan per orang. Satu orang boleh punya beberapa role (manual dari tab Pengguna atau otomatis dari jabatannya di Tim BPN); jika bentrok, hak <b>tertinggi</b> yang berlaku. Hanya Admin dan Super Admin yang dapat mengubah ini.</div>
  ${edit ? `<div class="acts" style="margin-bottom:12px"><button class="btn" id="rnew">+ Role baru</button> <button class="btn" id="rpaket">Pasang paket role yang disarankan</button> <button class="ghost" id="rseksi">Buat role Koordinator &amp; Anggota untuk tiap seksi</button></div>` : ''}
  <div class="card" style="margin-bottom:16px"><h3>Role BPN<small>per seksi / bidang: Koordinator dan Anggota</small></h3><div class="tw"><table>${head}<tbody>${rows(cus)}</tbody></table></div></div>
  <div class="card"><h3>Role umum<small>bawaan sistem; hak aksesnya boleh disesuaikan</small></h3><div class="tw"><table>${head}<tbody>${rows(sis)}</tbody></table></div></div>`;
};
PAGES['admin/pengguna'] = () => {
  if (!ADM) { fetch('/api/admin', { credentials: 'same-origin' }).then((r) => r.json()).then((j) => { if (j.error) throw new Error(j.error); ADM = j; render(); }).catch((e) => { $('#page').innerHTML = `<div class="empty">${esc(e.message || 'Gagal memuat')}</div>`; }); return '<div class="load"><div class="sp"></div><div>Memuat pengguna…</div></div>'; }
  const edit = (D.perm['admin/pengguna'] || 0) >= 2;
  setTimeout(() => {
    document.querySelectorAll('input[data-aktif]').forEach((el) => el.addEventListener('change', async () => { try { await admApi({ action: 'update', id: el.dataset.aktif, aktif: el.checked }); admReload(); } catch (e) { alert(e.message); admReload(); } }));
    document.querySelectorAll('button[data-akses]').forEach((el) => el.addEventListener('click', () => openRolesUser(ADM.users.find((u) => u.id === el.dataset.akses))));
    $('#bulktim')?.addEventListener('click', () => {
      modal(`<h2>Buat akun anggota Tim Kerja</h2><p class="sub">Akun dibuat untuk semua anggota Tim Kerja AKTIF yang belum punya akun. Pilih siapa yang langsung dikirimi undangan WhatsApp; yang lain tidak dikirimi apa pun (tautan masuknya ditampilkan agar bisa Anda bagikan nanti).</p><div class="eform" style="grid-template-columns:1fr"><div><label>Kirim undangan WhatsApp ke</label><select id="bkke"><option value="">Tidak ada (hanya buat akun)</option>${ADM.seksi.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join('')}<option value="*">Semua anggota Tim Kerja</option></select></div></div><div class="err" id="bke"></div><div class="mact"><button class="btn" id="bkgo" type="button">Buat akun</button></div>`);
      $('#bkgo').onclick = async (e) => {
        const kirimKe = $('#bkke').value; e.target.disabled = true; e.target.textContent = 'Memproses…'; let dibuat = 0, terkirim = 0, tautan = [], tanpa = [];
        try {
          for (let i = 0; i < 20; i++) { const j = await admApi({ action: 'bulktim', kirimKe }); dibuat += j.dibuat; terkirim += j.terkirim; tautan = tautan.concat(j.tautan); tanpa = j.tanpaWa; if (!j.sisa || !j.dibuat) break; }
          closeModal(); ADM = null;
          modal(`<h2>Akun Tim Kerja</h2><p>${dibuat} akun dibuat · ${terkirim} undangan WhatsApp terkirim.</p>${kirimKe && !terkirim && dibuat ? '<p class="note">Tidak ada WhatsApp yang terkirim. Pastikan <b>BABLAST_API_KEY</b> sudah diisi di Vercel (lalu Redeploy), kemudian pakai tombol "Kirim WA" di baris pengguna.</p>' : ''}${tanpa.length ? `<p class="note">Dilewati (tidak punya nomor WhatsApp valid atau nomor sudah dipakai): ${esc(tanpa.join(', '))}</p>` : ''}${tautan.length ? `<p class="note">Tautan masuk (sekali pakai, berlaku 14 hari) untuk yang belum dikirimi WhatsApp:</p><div class="tw" style="max-height:40vh;overflow:auto"><table><tbody>${tautan.map((t) => `<tr><td>${esc(t.nama)}<div class="sub">${esc(t.wa)}</div></td><td style="word-break:break-all">${esc(t.link)}</td></tr>`).join('')}</tbody></table></div>` : ''}`);
          render();
        } catch (x) { $('#bke').textContent = x.message + (dibuat ? ` (sudah ${dibuat} akun dibuat sebelum berhenti)` : ''); e.target.disabled = false; e.target.textContent = 'Coba lagi'; }
      };
    });
    document.querySelectorAll('button[data-prof]').forEach((el) => el.addEventListener('click', () => { location.hash = '#/profil/' + el.dataset.prof; }));
    document.querySelectorAll('button[data-kwa]').forEach((el) => el.addEventListener('click', async () => { if (!confirm('Kirim ulang tautan masuk lewat WhatsApp ke pengguna ini? Tautan lama tidak berlaku lagi.')) return; el.disabled = true; el.textContent = 'Mengirim…'; try { showPw(await admApi({ action: 'kirimwa', id: el.dataset.kwa }), 'Kirim ulang tautan'); } catch (e) { alert(e.message); } el.disabled = false; el.textContent = 'Kirim WA'; }));
    document.querySelectorAll('button[data-reset]').forEach((el) => el.addEventListener('click', async () => { if (!confirm('Buat password sementara baru untuk pengguna ini?')) return; try { showPw(await admApi({ action: 'reset', id: el.dataset.reset }), 'Password baru'); } catch (e) { alert(e.message); } }));
    let sel = null;
    const q = $('#adq'), box = $('#adr');
    q?.addEventListener('input', () => { clearTimeout(q._t); sel = null; $('#adadd').disabled = true; if (q.value.trim().length < 2) { box.innerHTML = ''; return; } q._t = setTimeout(async () => { const j = await fetch('/api/admin?q=' + encodeURIComponent(q.value.trim()), { credentials: 'same-origin' }).then((r) => r.json()).catch(() => ({ orang: [] })); box.innerHTML = (j.orang || []).map((o) => `<button type="button" class="opt" data-e="${esc(o.id)}" data-n="${esc(o.nama)}"><b>${esc(o.nama)}</b> <span class="sub">WA ${esc(o.wa)}</span></button>`).join('') || '<div class="sub">Tidak ada yang cocok (harus ada di M-Person dengan nomor WhatsApp).</div>'; box.querySelectorAll('.opt').forEach((b2) => b2.addEventListener('click', () => { sel = b2.dataset.e; q.value = b2.dataset.n; box.innerHTML = ''; $('#adadd').disabled = false; })); }, 300); });
    $('#adadd')?.addEventListener('click', async () => { if (!sel) return; $('#adadd').disabled = true; try { const j = await admApi({ action: 'create', personId: sel, roles: [$('#adp').value] }); showPw(j, 'Pengguna ditambahkan'); admReload(); } catch (e) { $('#ade').textContent = e.message; $('#adadd').disabled = false; } });
  });
  const impCard = '';
  const tgl = (u) => `${esc(u.nama)}${u.pending ? ' ' + chip('menunggu persetujuan', 'amber') : ''}<div class="sub">WA ${esc(u.wa || '–')}${u.email && !/^\d+$/.test(u.email) ? ' · ' + esc(u.email) : ''}</div>`;
  const bulkCard = edit ? `<div class="card" style="margin-bottom:16px"><h3>Akun Tim Kerja<small>buat akun sekaligus untuk semua anggota Tim Kerja yang AKTIF dan belum punya akun. Role mengikuti seksi mereka secara otomatis.</small></h3><button class="btn" id="bulktim" type="button">Buat akun anggota Tim Kerja</button></div>` : '';
  return `${impCard}${bulkCard}${edit ? `<div class="card" style="margin-bottom:16px"><h3>Tambah pengguna<small>pilih dari M-Person (harus punya nomor WhatsApp). Role lain bisa ditambah setelahnya. Orang juga bisa mendaftar sendiri dari halaman login.</small></h3><div class="filters" style="margin:0"><div class="q" style="position:relative"><label>Cari nama</label><input id="adq" autocomplete="off" placeholder="Ketik minimal 2 huruf…"><div id="adr" class="sres"></div></div><div><label>Role awal</label><select id="adp">${ADM.roles.map((x) => `<option>${esc(x.nama)}</option>`).join('')}</select></div><div style="flex:none;align-self:end"><button class="btn" id="adadd" disabled>Tambah</button></div></div><div class="err" id="ade"></div></div>` : ''}
  <div class="card"><h3>Pengguna<small>${ADM.users.length} akun</small></h3><div class="tw"><table><thead><tr><th>Pengguna</th><th>Role</th><th>Aktif</th><th>Terakhir masuk</th><th></th></tr></thead><tbody>${ADM.users.map((u) => `<tr><td>${tgl(u)}</td><td><div class="chips">${u.roles.map((n) => roleChip(n)).join('')}${u.auto.map((n) => roleChip(n, true)).join('')}${!u.roles.length && !u.auto.length ? chip('belum ada role', 'amber') : ''}</div></td><td><input type="checkbox" data-aktif="${u.id}" ${u.aktif ? 'checked' : ''} ${edit ? '' : 'disabled'} style="width:auto"></td><td class="sub">${u.lastLogin ? esc(new Date(u.lastLogin).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })) : '–'}</td><td style="white-space:nowrap">${edit ? `<button class="ghost" data-akses="${u.id}">Atur role</button> ` : ''}${u.person ? `<button class="ghost" data-prof="${esc(u.person)}">Profil</button> ` : ''}${edit && (u.roles.length || u.auto.length) && !u.pending && u.aktif && u.wa && u.wa !== '****' ? `<button class="ghost" data-kwa="${u.id}">Kirim WA</button> ` : ''}${edit ? `<button class="ghost" data-reset="${u.id}">Reset password</button> ` : ''}</td></tr>`).join('')}</tbody></table></div>
  <p class="note" style="margin-top:12px">Hak akses menu diatur di tab <b>Role &amp; Hak Akses</b>, bukan per orang. Pengguna baru yang mendaftar sendiri menunggu sampai diberi minimal satu role.</p></div>`;
};

/* ===== Ganti password ===== */
function showChangePw(forced) {
  const o = modal(`<h2>${forced ? 'Buat password baru' : 'Ganti password'}</h2><p class="sub">${forced ? 'Demi keamanan, ganti password bawaan Anda sebelum melanjutkan.' : ''} Minimal 8 karakter, berisi huruf dan angka.</p>
    <form id="pf" class="eform" style="grid-template-columns:1fr">${forced ? '' : '<div><label>Password lama</label><input type="password" name="lama" autocomplete="current-password" required></div>'}<div><label>Password baru</label><input type="password" name="baru" autocomplete="new-password" minlength="8" required></div><div><label>Ketik ulang password baru</label><input type="password" name="ulang" autocomplete="new-password" minlength="8" required></div>
    <div class="err" id="pe"></div><div class="mact" style="margin-top:4px"><button class="btn" id="ps" type="submit">Simpan password</button></div></form>`);
  if (forced) { o.querySelector('.x').remove(); o.onmousedown = null; o.addEventListener('mousedown', (e) => e.stopPropagation(), true); }
  $('#pf').addEventListener('submit', async (ev) => {
    ev.preventDefault(); const f = ev.target; $('#pe').textContent = '';
    if (f.baru.value !== f.ulang.value) { $('#pe').textContent = 'Kedua password tidak sama'; return; }
    $('#ps').disabled = true; $('#ps').textContent = 'Menyimpan…';
    try {
      const r = await fetch('/api/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ lama: f.lama ? f.lama.value : '', baru: f.baru.value, ulang: f.ulang.value }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Gagal menyimpan');
      closeModal(); if (forced) { await load(); } else { modal('<h2>Password diperbarui ✓</h2><p>Gunakan password baru pada saat masuk berikutnya.</p>'); }
    } catch (e) { $('#pe').textContent = e.message; $('#ps').disabled = false; $('#ps').textContent = 'Simpan password'; }
  });
}

/* ===== router ===== */
/* ===== Modul Berjenjang & Data Umat ===== */
let AN = null, ANP = null;
S.af = { kus: '', modul: '', q: '', jk: '', kat: '', ug: '', pel: '', lengkap: '' };
const UG = ['<18 th', '18-35 th', '36-55 th', '56-70 th', '>70 th', 'Tidak ada data'], SZ = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', 'Belum diisi'];
function anLoad() {
  if (AN || ANP) return;
  ANP = fetch('/api/profil?act=analitik', { credentials: 'same-origin' }).then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Gagal memuat data'); AN = anPrep(j); })
    .catch((e) => { AN = { err: e.message }; }).finally(() => { ANP = null; render(); });
}
function anPrep(j) {
  j.kN = Object.fromEntries(j.kus.map((x) => [x.id, x.nama])); j.pN = Object.fromEntries(j.pd.map((x) => [x.id, x.nama])); j.plN = Object.fromEntries(j.pel.map((x) => [x.id, x.nama])); j.mN = Object.fromEntries(j.modul.map((x) => [x.id, x]));
  j.orang.forEach((o) => {
    o.keu = j.kN[o.kus] || ''; o.pdn = j.pN[o.pd] || ''; o.plN = o.pl.map((i) => j.plN[i]).filter(Boolean);
    o.miN = o.mi.map((i) => (j.mN[i] || {}).nama).filter(Boolean); o.maN = o.ma.map((i) => (j.mN[i] || {}).nama).filter(Boolean);
    o.ug = o.u == null ? 'Tidak ada data' : o.u < 18 ? '<18 th' : o.u <= 35 ? '18-35 th' : o.u <= 55 ? '36-55 th' : o.u <= 70 ? '56-70 th' : '>70 th';
    o.jkN = o.jk === 'P' ? 'Pria' : o.jk === 'W' ? 'Wanita' : 'Belum diisi'; o.png = o.ma.length > 0 || o.plN.some((n) => /pewarta|pengajar/i.test(n));
    o.cari = [o.n, o.keu, o.pdn, o.prov, o.plN.join(' '), o.miN.join(' ')].join(' ').toLowerCase();
  });
  return j;
}
const anGate = () => { if (!AN) { anLoad(); return '<div class="load"><div class="sp"></div><div>Memuat data umat…</div></div>'; } return AN.err ? `<div class="empty">${esc(AN.err)}</div>` : null; };
const anRows = (fn) => AN.orang.filter((o) => (!S.af.kus || o.kus === S.af.kus) && (!fn || fn(o)));
C.umat = [['Nama', (o) => `<a href="#" class="ppl" data-ppl="${esc(o.id)}"><b>${esc(o.n)}</b></a>`], ['Keuskupan', (o) => esc(o.keu || '–')], ['Asal PD', (o) => esc(o.pdn || '–')], ['Modul diikuti', (o) => nf.format(o.mi.length)], ['Pengajar', (o) => (o.ma.length ? 'Ya' : '–')], ['Profil', (o) => (o.l ? 'Lengkap' : `Belum (${o.k})`)]];
const miniChips = (a, n = 3, tone = 'blue') => (a.length ? `<div class="chips">${a.slice(0, n).map((x) => chip(x, tone)).join('')}${a.length > n ? chip('+' + (a.length - n), 'gray') : ''}</div>` : '<span class="sub">–</span>');
function anBar(extra = '') {
  const nas = AN.scope.tipe === 'nasional';
  return `<div class="note" style="margin-bottom:8px">📍 Data: <b>${esc(AN.scope.label)}</b> · ${nf.format(AN.orang.length)} umat terdata</div><div class="filters">${nas ? `<div><label>Keuskupan</label><select data-af="kus"><option value="">Semua keuskupan</option>${AN.kus.map((k) => `<option value="${k.id}"${S.af.kus === k.id ? ' selected' : ''}>${esc(k.nama)}</option>`).join('')}</select></div>` : ''}${extra}</div><div id="res"></div>`;
}
const afSel = (k, label, opts) => `<div><label>${label}</label><select data-af="${k}"><option value="">Semua</option>${opts.map((x) => (Array.isArray(x) ? `<option value="${esc(x[0])}"${S.af[k] === x[0] ? ' selected' : ''}>${esc(x[1])}</option>` : `<option${S.af[k] === x ? ' selected' : ''}>${esc(x)}</option>`)).join('')}</select></div>`;
const afQ = () => `<div style="flex:1;min-width:200px"><label>Cari</label><input data-af="q" placeholder="Nama, keuskupan, PD…" value="${esc(S.af.q)}"></div>`;
const afBind = (draw) => setTimeout(() => { document.querySelectorAll('[data-af]').forEach((el) => el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => { S.af[el.dataset.af] = el.value; draw(); })); draw(); });
const tableOrang = (rows, cols, vazio = 'Tidak ada data yang cocok.') => `<div class="note" style="margin-bottom:8px">${nf.format(rows.length)} orang${rows.length > 300 ? ' (menampilkan 300 pertama)' : ''}</div><div class="tw"><table><thead><tr>${cols.map(([h]) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.slice(0, 300).map((o) => `<tr>${cols.map(([, f]) => `<td>${f(o)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${cols.length}"><div class="empty">${vazio}</div></td></tr>`}</tbody></table></div>`;
const drl = (rows, get) => ({ rows, get, cols: C.umat });

function openOrang(id) {
  const o = AN.orang.find((x) => x.id === id); if (!o) return;
  const adm = ['Admin', 'Editor BPN'].includes(D.user.peran);
  modal(`<h2>${esc(o.n)}</h2><div class="chips" style="margin-bottom:10px">${o.kat ? chip(o.kat, 'violet') : ''}${o.png ? chip('Pewarta / Pengajar', 'teal') : ''}${chip(o.l ? 'Profil lengkap' : `Profil belum lengkap (${o.k})`, o.l ? 'green' : 'coral')}</div>
    <div class="kvs">${row('Keuskupan', esc(o.keu))}${row('Provinsi', esc(o.prov))}${row('Asal PD', esc(o.pdn))}${row('Jenis kelamin', esc(o.jk ? o.jkN : ''))}${row('Usia', o.u != null ? o.u + ' tahun' : '')}${row('Sakramen', [o.bp === 1 ? 'Baptis ✓' : o.bp === 0 ? 'Baptis: belum' : '', o.kr === 1 ? 'Krisma ✓' : o.kr === 0 ? 'Krisma: belum' : ''].filter(Boolean).join(' · '))}${row('Ukuran baju', esc(o.sz))}${row('Pelayanan', miniChips(o.plN, 20))}${row('Modul diikuti', miniChips(o.miN, 20))}${row('Modul diajar', miniChips(o.maN, 20, 'teal'))}</div>
    <div class="acts" style="margin-top:12px">${o.wa ? `<a class="wa" target="_blank" rel="noopener" href="/api/wa?p=${esc(o.id)}">WhatsApp</a>` : ''}${adm ? `<a class="wa em" href="#/profil/${esc(o.id)}" onclick="document.getElementById('ov')?.remove()">Buka profil lengkap</a>` : ''}</div>`);
}

/* --- Modul Berjenjang --- */
const mStats = (rows) => AN.modul.map((m) => ({ m, pes: rows.filter((o) => o.mi.includes(m.id)), aj: rows.filter((o) => o.ma.includes(m.id)) }));
PAGES['modul/ringkasan'] = () => {
  const g = anGate(); if (g) return g;
  const draw = () => {
    const r = anRows(), ms = mStats(r), pes = r.filter((o) => o.mi.length), aj = r.filter((o) => o.ma.length), tp = (i) => (AN.mN[i] || {}).tahap || 'Lainnya';
    const bucket = (o) => { const n = o.mi.length; return n === 0 ? '0 modul' : n <= 3 ? '1–3 modul' : n <= 7 ? '4–7 modul' : n <= 11 ? '8–11 modul' : '12+ modul'; };
    const BK = ['0 modul', '1–3 modul', '4–7 modul', '8–11 modul', '12+ modul'], cb = count(r, bucket);
    $('#res').innerHTML = `<div class="grid g4" style="margin-bottom:16px">${kpi('Modul berjenjang', AN.modul.length, { c: '#1F56C4', t: 'var(--blue-t)', note: 'dalam 4 tahap formatio' })}${kpi('Umat yang sudah lulus modul', pes.length, { c: '#0B8277', t: 'var(--teal-t)', note: nf.format(sum(r, (o) => o.mi.length)) + ' kelulusan modul secara total', go: () => openDrill('Umat yang sudah lulus modul', pes, C.umat) })}${kpi('Pengajar', aj.length, { c: '#7C5CE0', t: 'var(--violet-t, var(--blue-t))', go: () => openDrill('Pengajar', aj, C.umat) })}${kpi('Keuskupan memiliki pengajar', uniq(aj.map((o) => o.keu).filter(Boolean)).length, { c: '#E0661A', t: 'var(--amber-t, var(--blue-t))' })}</div>
    <div class="grid g2">${bars('Peserta lulus per modul', ms.map((x) => ({ label: x.m.nama, value: x.pes.length })).sort((a, b) => b.value - a.value), { max: 20, drill: drl(r, (o) => o.miN) })}${bars('Pengajar per modul', ms.map((x) => ({ label: x.m.nama, value: x.aj.length })).sort((a, b) => b.value - a.value), { max: 20, colour: '#14B8A6', drill: drl(r, (o) => o.maN) })}
    ${donut('Kelulusan per tahap formatio', count(pes, (o) => o.mi.map(tp)), drl(pes, (o) => o.mi.map(tp)))}${columns('Umat menurut jumlah modul yang diikuti', BK.map((l) => ({ label: l, value: (cb.find((x) => x.label === l) || { value: 0 }).value })), drl(r, bucket))}
    ${bars('Pengajar tersebar di keuskupan', count(aj, (o) => o.keu || '(kosong)'), { max: 15, colour: '#14B8A6', drill: drl(aj, (o) => o.keu || '(kosong)') })}${bars('Peserta lulus per keuskupan', count(pes, (o) => o.keu || '(kosong)'), { max: 15, drill: drl(pes, (o) => o.keu || '(kosong)') })}</div>`;
  };
  const h = anBar(); afBind(draw); return h;
};
PAGES['modul/permodul'] = () => {
  const g = anGate(); if (g) return g;
  const draw = () => {
    const r = anRows(), ms = mStats(r), mx = Math.max(1, ...ms.map((x) => x.pes.length)), gr = by(ms, (x) => x.m.tahap || 'Lainnya');
    $('#res').innerHTML = Object.keys(gr).sort(cmp).map((t) => `<h3 style="margin:18px 0 8px">${esc(t)}</h3><div class="grid g3">${gr[t].map((x) => `<div class="card mcard clk" data-modul="${esc(x.m.id)}" tabindex="0"><div class="mn">${esc(x.m.nama)}</div><div class="mrow"><span><b>${nf.format(x.pes.length)}</b> peserta lulus</span><span><b>${nf.format(x.aj.length)}</b> pengajar</span></div><div class="mbar"><i style="width:${(x.pes.length / mx) * 100}%"></i></div><div class="sub">${nf.format(uniq(x.pes.map((o) => o.keu).filter(Boolean)).length)} keuskupan · klik untuk detail</div></div>`).join('')}</div>`).join('') || '<div class="empty">Belum ada modul.</div>';
    document.querySelectorAll('[data-modul]').forEach((el) => { const go = () => openModul(el.dataset.modul); el.addEventListener('click', go); el.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); }); });
  };
  const h = anBar(); afBind(draw); return h;
};
PAGES['modul/daftar'] = () => {
  const g = anGate(); if (g) return g;
  const draw = () => {
    const ms = mStats(anRows()).sort((a, b) => cmp(a.m.tahap || '', b.m.tahap || '') || cmp(a.m.nama, b.m.nama));
    $('#res').innerHTML = `<div class="note" style="margin-bottom:8px">${nf.format(ms.length)} modul berjenjang</div><div class="tw"><table><thead><tr><th>Modul</th><th>Tahap formatio</th><th>Peserta lulus</th><th>Pengajar</th><th></th></tr></thead><tbody>${ms.map((x) => `<tr><td><b>${esc(x.m.nama)}</b></td><td>${esc(x.m.tahap || '–')}</td><td>${nf.format(x.pes.length)}</td><td>${nf.format(x.aj.length)}</td><td><button type="button" class="ghost" data-modul="${esc(x.m.id)}">Lihat detail</button></td></tr>`).join('')}</tbody></table></div>`;
    document.querySelectorAll('[data-modul]').forEach((el) => el.addEventListener('click', () => openModul(el.dataset.modul)));
  };
  const h = anBar(); afBind(draw); return h;
};
function openModul(id) {
  const m = AN.mN[id], r = anRows(), pes = r.filter((o) => o.mi.includes(id)), aj = r.filter((o) => o.ma.includes(id));
  modal(`<h2>${esc(m.nama)}</h2><div class="note">${esc(m.tahap)} · ${nf.format(pes.length)} peserta lulus · ${nf.format(aj.length)} pengajar${S.af.kus ? ' · ' + esc(AN.kN[S.af.kus]) : ''}</div>
    <div class="grid g2" style="margin:10px 0">${bars('Peserta per keuskupan', count(pes, (o) => o.keu || '(kosong)'), { max: 8 })}${bars('Pengajar per keuskupan', count(aj, (o) => o.keu || '(kosong)'), { max: 8, colour: '#14B8A6' })}</div>
    <div class="filters"><div><label>Tampilkan</label><select id="mm_t"><option value="p">Peserta lulus (${pes.length})</option><option value="a">Pengajar (${aj.length})</option></select></div><div style="flex:1"><label>Cari</label><input id="mm_q" placeholder="Nama, keuskupan, PD…"></div></div><div id="mm_l" style="max-height:40vh;overflow:auto"></div>`, true);
  const draw = () => { const q = $('#mm_q').value.toLowerCase(), l = ($('#mm_t').value === 'a' ? aj : pes).filter((o) => !q || o.cari.includes(q)); $('#mm_l').innerHTML = tableOrang(l, [C.umat[0], C.umat[1], C.umat[2], ['Modul diikuti', (o) => nf.format(o.mi.length)]]); };
  $('#mm_t').addEventListener('change', draw); $('#mm_q').addEventListener('input', draw); draw();
}
PAGES['modul/peserta'] = () => {
  const g = anGate(); if (g) return g;
  const draw = () => {
    const q = S.af.q.toLowerCase(), l = anRows((o) => o.mi.length && (!S.af.modul || o.mi.includes(S.af.modul)) && (!q || o.cari.includes(q))).sort((a, b) => b.mi.length - a.mi.length || cmp(a.n, b.n));
    $('#res').innerHTML = tableOrang(l, [C.umat[0], C.umat[1], C.umat[2], ['Modul yang sudah lulus', (o) => miniChips(o.miN, 3)], ['Jumlah', (o) => nf.format(o.mi.length)], C.umat[4]]);
  };
  const h = anBar(afSel('modul', 'Modul', AN.modul.map((m) => [m.id, m.nama])) + afQ()); afBind(draw); return h;
};
PAGES['modul/pengajar'] = () => {
  const g = anGate(); if (g) return g;
  const draw = () => {
    const q = S.af.q.toLowerCase(), all = anRows((o) => o.ma.length), l = all.filter((o) => (!S.af.modul || o.ma.includes(S.af.modul)) && (!q || o.cari.includes(q))).sort((a, b) => b.ma.length - a.ma.length || cmp(a.n, b.n));
    const ms = mStats(l);
    $('#res').innerHTML = `<div class="grid g3" style="margin-bottom:16px">${kpi('Pengajar', l.length, { c: '#7C5CE0', t: 'var(--blue-t)', go: () => openDrill('Pengajar', l, C.umat) })}${kpi('Tersebar di keuskupan', uniq(l.map((o) => o.keu).filter(Boolean)).length, { c: '#0B8277', t: 'var(--teal-t)' })}${kpi('Rata-rata modul diajar', Math.round((sum(l, (o) => o.ma.length) / Math.max(1, l.length)) * 10) / 10, { c: '#E0661A', t: 'var(--blue-t)' })}</div>
    <div class="grid g2" style="margin-bottom:16px">${bars('Sebaran pengajar per keuskupan', count(l, (o) => o.keu || '(kosong)'), { max: 12, colour: '#14B8A6', drill: drl(l, (o) => o.keu || '(kosong)') })}${bars('Pengajar per modul', ms.map((x) => ({ label: x.m.nama, value: x.aj.length })).sort((a, b) => b.value - a.value), { max: 12, drill: drl(l, (o) => o.maN) })}</div>
    ${tableOrang(l, [C.umat[0], C.umat[1], C.umat[2], ['Modul yang diajar', (o) => miniChips(o.maN, 4, 'teal')], ['WA', (o) => (o.wa ? `<a class="wa" target="_blank" rel="noopener" href="/api/wa?p=${esc(o.id)}">WhatsApp</a>` : '–')]])}`;
  };
  const h = anBar(afSel('modul', 'Modul yang diajar', AN.modul.map((m) => [m.id, m.nama])) + afQ()); afBind(draw); return h;
};

/* --- Data Umat --- */
PAGES['umat/ringkasan'] = () => {
  const g = anGate(); if (g) return g;
  const draw = () => {
    const r = anRows(), n = r.length, lk = r.filter((o) => o.l), png = r.filter((o) => o.png), pct = (x) => (n ? Math.round((x / n) * 100) : 0);
    const sak = (k) => (o) => (o[k] === 1 ? 'Sudah' : o[k] === 0 ? 'Belum' : 'Belum diisi');
    const szl = count(r, (o) => o.sz || 'Belum diisi'), szs = SZ.map((l) => ({ label: l, value: (szl.find((x) => x.label === l) || { value: 0 }).value })).filter((x) => x.value);
    const ugl = count(r, (o) => o.ug), ugs = UG.map((l) => ({ label: l, value: (ugl.find((x) => x.label === l) || { value: 0 }).value }));
    $('#res').innerHTML = `<div class="grid g4" style="margin-bottom:16px">${kpi('Umat terdata', n, { c: '#1F56C4', t: 'var(--blue-t)', go: () => openDrill('Umat terdata', r, C.umat) })}${kpi('Profil lengkap', lk.length, { c: '#0B8277', t: 'var(--teal-t)', note: pct(lk.length) + '% dari umat terdata', go: () => openDrill('Profil lengkap', lk, C.umat) })}${kpi('Profil belum lengkap', n - lk.length, { c: '#E0661A', t: 'var(--blue-t)', go: () => openDrill('Profil belum lengkap', r.filter((o) => !o.l), C.umat) })}${kpi('Pewarta / Pengajar', png.length, { c: '#7C5CE0', t: 'var(--blue-t)', go: () => openDrill('Pewarta / Pengajar', png, C.umat) })}</div>
    <div class="grid g2">${donut('Jenis kelamin', count(r, (o) => o.jkN), drl(r, (o) => o.jkN))}${columns('Kelompok usia', ugs, drl(r, (o) => o.ug))}
    ${donut('Kategori', count(r, (o) => o.kat || 'Belum diisi'), drl(r, (o) => o.kat || 'Belum diisi'))}${donut('Kelengkapan profil', count(r, (o) => (o.l ? 'Lengkap' : 'Belum lengkap')), drl(r, (o) => (o.l ? 'Lengkap' : 'Belum lengkap')))}
    ${donut('Sakramen Baptis', count(r, sak('bp')), drl(r, sak('bp')))}${donut('Sakramen Krisma', count(r, sak('kr')), drl(r, sak('kr')))}
    ${bars('Umat per keuskupan', count(r, (o) => o.keu || '(kosong)'), { max: 15, drill: drl(r, (o) => o.keu || '(kosong)') })}${bars('Umat per provinsi', count(r, (o) => o.prov || '(kosong)'), { max: 12, drill: drl(r, (o) => o.prov || '(kosong)') })}
    ${bars('Pelayanan yang dijalani', count(r.filter((o) => o.plN.length), (o) => o.plN), { max: 12, colour: '#14B8A6', drill: drl(r, (o) => o.plN) })}${bars('Asal PD terbanyak', count(r.filter((o) => o.pdn), (o) => o.pdn), { max: 10, drill: drl(r, (o) => o.pdn) })}
    ${bars('Ukuran baju (untuk pesanan kaos/seragam)', szs, { max: 10, colour: '#F5A524', drill: drl(r, (o) => o.sz || 'Belum diisi') })}</div>`;
  };
  const h = anBar(); afBind(draw); return h;
};
PAGES['umat/daftar'] = () => {
  const g = anGate(); if (g) return g;
  const draw = () => {
    const f = S.af, q = f.q.toLowerCase();
    const l = anRows((o) => (!f.jk || o.jkN === f.jk) && (!f.kat || o.kat === f.kat) && (!f.ug || o.ug === f.ug) && (!f.pel || o.pl.includes(f.pel)) && (!f.lengkap || (f.lengkap === 'ya' ? o.l : !o.l)) && (!q || o.cari.includes(q))).sort((a, b) => cmp(a.n, b.n));
    $('#res').innerHTML = tableOrang(l, [C.umat[0], ['Jenis kelamin / usia', (o) => esc((o.jk ? o.jkN : '–') + (o.u != null ? ' · ' + o.u + ' th' : ''))], C.umat[1], C.umat[2], ['Pelayanan', (o) => miniChips(o.plN, 2)], C.umat[5]]);
  };
  const h = anBar(afSel('jk', 'Jenis kelamin', ['Pria', 'Wanita', 'Belum diisi']) + afSel('kat', 'Kategori', ['Awam', 'Bruder', 'Suster', 'Frater', 'Imam']) + afSel('ug', 'Kelompok usia', UG) + afSel('pel', 'Pelayanan', AN.pel.map((p) => [p.id, p.nama])) + afSel('lengkap', 'Kelengkapan profil', [['ya', 'Lengkap'], ['tidak', 'Belum lengkap']]) + afQ()); afBind(draw); return h;
};

/* ===== Learning System ===== */
let LS = {};
async function lsApi(act, body) {
  const r = await fetch('/api/report?ls=' + act, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) } : { credentials: 'same-origin' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Gagal');
  return j;
}
function lsPage(key, act, view) {
  const s = LS[key];
  if (s === undefined) { LS[key] = 'load'; lsApi(act).then((j) => { LS[key] = j; render(); }).catch((e) => { LS[key] = { error: e.message }; render(); }); }
  if (s === undefined || s === 'load') return '<div class="load"><div class="sp"></div><div>Memuat…</div></div>';
  if (s.error) return `<div class="empty">${esc(s.error)} <button class="ghost" data-ls="reload">Coba lagi</button></div>`;
  return view(s);
}
const lsReload = (...k) => { (k.length ? k : Object.keys(LS)).forEach((x) => delete LS[x]); render(); };
const lsDate = (v) => (v ? new Date(v).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '–');
// Formulir sederhana dalam modal. fields: [{k, label, type: text|date|area|select, val, opts, full, ph}]
function lsForm(judul, fields, simpan, hint = '') {
  modal(`<h2>${esc(judul)}</h2>${hint ? `<p class="sub">${hint}</p>` : ''}<div class="eform">${fields.map((f) => `<div class="${f.full || f.type === 'area' ? 'full' : ''}"><label>${esc(f.label)}</label>${f.type === 'area' ? `<textarea data-f="${f.k}" rows="3" placeholder="${esc(f.ph || '')}">${esc(f.val || '')}</textarea>` : f.type === 'select' ? `<select data-f="${f.k}">${f.opts.map((o) => `<option value="${esc(o[0])}"${o[0] === f.val ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select>` : `<input data-f="${f.k}" type="${f.type === 'date' ? 'date' : f.type === 'num' ? 'number' : 'text'}" value="${esc(f.val ?? '')}" placeholder="${esc(f.ph || '')}">`}</div>`).join('')}</div><div class="err" id="lse"></div><div class="mact"><button class="btn" id="lsok">Simpan</button></div>`, true);
  $('#lsok').onclick = async () => {
    const v = {}; document.querySelectorAll('#ov [data-f]').forEach((e) => { v[e.dataset.f] = e.value; });
    $('#lsok').disabled = true;
    try { await simpan(v); closeModal(); } catch (e) { $('#lse').textContent = e.message; $('#lsok').disabled = false; }
  };
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-ls]'); if (!b) return;
  const [a, id, id2] = b.dataset.ls.split('|');
  const tc = (id) => (LS.tc && LS.tc.list || []).find((x) => x.id === id);
  if (a === 'reload') return lsReload();
  if (a === 'copy') { navigator.clipboard?.writeText(b.dataset.v); b.textContent = 'Tersalin ✓'; return; }
  if (a === 'tc') { const t = id ? tc(id) : {}; return lsForm(id ? 'Ubah TC' : 'TC baru', [{ k: 'nama', label: 'Nama TC', val: t.nama, full: true, ph: 'mis. TC SHDR BPN PKKI 2027' }, { k: 'mulai', label: 'Tanggal mulai', type: 'date', val: t.mulai }, { k: 'selesai', label: 'Tanggal selesai', type: 'date', val: t.selesai }, { k: 'daftar', label: 'Pendaftaran', type: 'select', val: t.daftar || 'Ditutup', opts: [['Dibuka', 'Dibuka (umat boleh mendaftar)'], ['Ditutup', 'Ditutup']] }], async (v) => { await lsApi('tcsave', { id: id || undefined, ...v }); lsReload('tc'); }, 'Setelah TC dibuat, tambahkan modul dan bab (learning path). Tautan pendaftaran muncul otomatis.'); }
  if (a === 'modul') { const m = id2 ? (tc(id).materi.find((x) => x.id === id2) || {}) : {}; return lsForm(id2 ? 'Ubah modul' : 'Modul baru', [{ k: 'nama', label: 'Nama modul', val: m.nama, full: true, ph: 'mis. SHDR' }], async (v) => { await lsApi('materisave', { id: id2 || undefined, event: id, nama: v.nama }); lsReload('tc'); }); }
  if (a === 'bab') {
    const mo = tc(id).materi.find((x) => x.id === id2), bb = b.dataset.bab ? mo.bab.find((x) => x.id === b.dataset.bab) : {};
    return lsForm(b.dataset.bab ? 'Ubah bab' : 'Bab baru', [{ k: 'judul', label: 'Judul bab', val: bb.judul, full: true }, { k: 'urut', label: 'Urutan', type: 'num', val: bb.urut ?? (mo.bab.length + 1) }, { k: 'yt', label: 'Tautan video (YouTube)', val: bb.yt, ph: 'https://youtu.be/…' }, { k: 'tautan', label: 'Tautan materi: PPT / dokumen (satu per baris)', type: 'area', val: bb.tautan, ph: 'https://drive.google.com/…' }], async (v) => { await lsApi('babsave', { id: b.dataset.bab || undefined, materi: id2, ...v }); lsReload('tc'); });
  }
  if (a === 'peserta') return lsPeserta(id);
  if (a === 'syarat') return lsSyarat(id);
  if (a === 'daftar') return lsDaftar(id, b);
  if (a === 'putus') return lsPutus(id, b.dataset.aksi);
  if (a === 'tonton') return lsTonton(id, b.dataset.on === '1');
  if (a === 'tugas') return lsTugas(id);
  if (a === 'pesan') return lsPesan(id);
  if (a === 'lapdetail') return lsLapDetail(id);
  if (a === 'ingatkan') return lsIngatkan(b);
  if (a === 'dbpilih') return document.querySelectorAll('[data-db]').forEach((x) => { x.checked = true; });
  if (a === 'diskusikirim') return lsDiskusi(id);
});
PAGES['ls/tc'] = () => lsPage('tc', 'tclist', (s) => {
  const hdr = `<div class="note" style="margin-bottom:12px">Buat TC, susun <b>learning path</b> (modul → bab, berisi video, PPT, dan dokumen), lalu bagikan tautan pendaftaran kepada umat.</div>${s.edit ? '<div class="acts" style="margin-bottom:12px"><button class="btn" data-ls="tc">+ TC baru</button></div>' : ''}`;
  if (!s.list.length) return hdr + '<div class="empty">Belum ada TC.</div>';
  return hdr + s.list.map((t) => `<div class="card" style="margin-bottom:16px"><h3>${esc(t.nama)}<small>${esc(lsDate(t.mulai))} – ${esc(lsDate(t.selesai))}${t.oleh ? ' · dibuat ' + esc(t.oleh) : ''}</small></h3>
    <div class="chips" style="margin-bottom:8px">${chip(t.daftar === 'Dibuka' ? 'Pendaftaran dibuka' : 'Pendaftaran ditutup', t.daftar === 'Dibuka' ? 'green' : 'gray')}${t.status ? chip(t.status.replace(/^\S+\s/, ''), 'blue') : ''}</div>
    <div class="kv"><span>Tautan pendaftaran</span><div><code style="word-break:break-all">${esc(t.link)}</code> <button class="ghost" data-ls="copy" data-v="${esc(t.link)}">Salin</button></div></div>
    ${t.materi.map((m) => `<h4 style="margin:12px 0 4px">${esc(m.nama)} ${s.edit ? `<button class="ghost" data-ls="modul|${t.id}|${m.id}">Ubah</button> <button class="ghost" data-ls="bab|${t.id}|${m.id}">+ Bab</button>` : ''}</h4>
      ${m.bab.length ? `<div class="tw"><table><thead><tr><th>#</th><th>Bab</th><th>Video</th><th>Materi</th><th></th></tr></thead><tbody>${m.bab.map((b) => `<tr><td>${b.urut || ''}</td><td>${esc(b.judul)}</td><td>${b.yt ? `<a href="${esc(b.yt)}" target="_blank" rel="noopener">Tonton</a>` : '<span class="sub">–</span>'}</td><td>${String(b.tautan || '').split('\n').filter(Boolean).map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener">Berkas ${i + 1}</a>`).join(' · ') || '<span class="sub">–</span>'}</td><td>${s.edit ? `<button class="ghost" data-ls="bab|${t.id}|${m.id}" data-bab="${b.id}">Ubah</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="sub">Belum ada bab.</p>'}`).join('') || '<p class="sub">Belum ada modul.</p>'}
    ${s.edit ? `<div class="acts" style="margin-top:10px"><button class="ghost" data-ls="tc|${t.id}">Ubah TC</button> <button class="ghost" data-ls="syarat|${t.id}">Syarat pendaftaran</button> <button class="ghost" data-ls="modul|${t.id}">+ Modul</button></div>` : ''}</div>`).join('');
});
const lsProg = (a, b) => `${a}/${b}`;
PAGES['ls/pengajar'] = () => lsPage('pengajar', 'pengajar', (s) => {
  if (!s.mentor) return '<div class="empty">Anda belum terdaftar sebagai pengajar/mentor di Schole. Hubungi Sekretariat BPN bila ini keliru.</div>';
  if (!s.heads.length) return '<div class="empty">Belum ada peserta di kelompok Anda.</div>';
  const g = {}; s.heads.forEach((h) => { ((g[h.event] = g[h.event] || {})[h.kelompok] = (g[h.event][h.kelompok] || [])).push(h); });
  return `<div class="note" style="margin-bottom:12px">Pantau progres kelompok Anda, nilai bab yang boleh diajar peserta, beri komentar, lalu tentukan kelulusan dan catatan akhir untuk BPK.</div>` + Object.entries(g).map(([ev, kel]) => `<div class="card" style="margin-bottom:16px"><h3>${esc(ev)}</h3>${Object.entries(kel).map(([k, l]) => `<h4 style="margin:10px 0 4px">Kelompok ${esc(k)} <span class="sub">${l.length} peserta</span></h4><div class="tw"><table><thead><tr><th>Peserta</th><th>Keuskupan</th><th>Menonton</th><th>Tugas</th><th>Dinilai</th><th>Status</th><th></th></tr></thead><tbody>${l.map((h) => `<tr><td><b>${esc(h.nama)}</b></td><td>${esc(h.keuskupan)}</td><td>${lsProg(h.progres.nonton, h.progres.total)}</td><td>${lsProg(h.progres.tugas, h.progres.total)}</td><td>${lsProg(h.progres.dinilai, h.progres.total)}</td><td>${chip(h.status || '–', h.status === 'Lulus' ? 'green' : h.status === 'Tidak Lulus' ? 'red' : 'gray')}</td><td><button class="ghost" data-ls="peserta|${h.id}">Buka</button></td></tr>`).join('')}</tbody></table></div>`).join('')}</div>`).join('');
});
function lsPeserta(id) {
  const s = LS.pengajar, h = s.heads.find((x) => x.id === id); if (!h) return;
  const ed = (D.perm['ls/pengajar'] || 0) >= 2, kom = (s.komentar[id] || []).filter((k) => k.tipe !== 'Pesan'), psn = (s.komentar[id] || []).filter((k) => k.tipe === 'Pesan');
  const opt = (l, cur, ph) => `<option value="">${esc(ph)}</option>` + l.map((x) => `<option${x === cur ? ' selected' : ''}>${esc(x)}</option>`).join('');
  modal(`<h2>${esc(h.nama)}</h2><p class="sub">${esc(h.event)} · Kelompok ${esc(h.kelompok)} · ${esc(h.keuskupan)}</p>
    <h4>Progres per bab</h4><div class="tw"><table><thead><tr><th>Bab</th><th>Tonton</th><th>Tugas</th><th>Boleh mengajar?</th><th>Catatan</th><th></th></tr></thead><tbody>${h.bab.map((b) => `<tr data-d="${b.id}"><td>${esc(b.bab)}</td><td>${b.selesai ? '✓' : '–'}</td><td>${b.tugas ? '✓' : b.noUpload ? 'tidak ada' : '–'}</td><td><select data-izin ${ed ? '' : 'disabled'}>${opt(s.izin, b.izin, '(belum dinilai)')}</select></td><td><input data-cat value="${esc(b.cat)}" ${ed ? '' : 'disabled'} placeholder="wajib jika didampingi"></td><td>${ed ? '<button class="ghost" data-save>Simpan</button>' : ''}</td></tr>`).join('') || '<tr><td colspan="6" class="sub">Belum ada bab.</td></tr>'}</tbody></table></div>
    <h4 style="margin-top:14px">Komentar</h4><div id="lsk">${kom.map((k) => `<div class="riw"><b>${esc(k.penulis)}</b> <span class="sub">${esc(k.peran)} · ${esc(lsDate(k.tgl))}</span><div>${esc(k.isi)}</div></div>`).join('') || '<p class="sub">Belum ada komentar.</p>'}</div>
    ${ed ? '<div class="eform"><div class="full"><textarea id="lskt" rows="2" placeholder="Tulis komentar untuk peserta ini…"></textarea></div></div><div class="acts"><button class="ghost" id="lskb">Kirim komentar</button></div>' : ''}
    <h4 style="margin-top:14px">Pesan dengan peserta</h4><div id="lspm">${psn.map((k) => `<div class="riw"><b>${esc(k.penulis)}</b> <span class="sub">${esc(k.peran)} · ${esc(lsDate(k.tgl))}</span><div>${esc(k.isi)}</div></div>`).join('') || '<p class="sub">Belum ada pesan.</p>'}</div>
    <div class="eform"><div class="full"><textarea id="lspt" rows="2" placeholder="Tulis pesan untuk peserta ini…"></textarea></div></div><div class="acts"><button class="ghost" id="lspb">Kirim pesan</button></div>
    <h4 style="margin-top:14px">Kelulusan dan catatan akhir TC</h4><div class="eform"><div><label>Status peserta</label><select id="lst" ${ed ? '' : 'disabled'}>${s.status.map((x) => `<option${x === h.status ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select></div><div></div>
    <div class="full"><label>Keterangan kelulusan</label><textarea id="lsk2" rows="2" ${ed ? '' : 'disabled'}>${esc(h.ket)}</textarea></div>
    <div class="full"><label>Catatan akhir TC untuk BPK keuskupan (dibaca Koordinator BPK dan PIC Pewartaan)</label><textarea id="lsb" rows="3" ${ed ? '' : 'disabled'}>${esc(h.catBpk)}</textarea></div></div>
    <div class="err" id="lse"></div>${ed ? '<div class="mact"><button class="btn" id="lsl">Simpan kelulusan &amp; catatan</button></div>' : ''}`, true);
  const run = async (btn, fn) => { btn.disabled = true; $('#lse').textContent = ''; try { await fn(); } catch (e) { $('#lse').textContent = e.message; } btn.disabled = false; };
  document.querySelectorAll('#ov tr[data-d] [data-save]').forEach((b) => b.addEventListener('click', () => run(b, async () => {
    const tr = b.closest('tr'); await lsApi('nilai', { detail: tr.dataset.d, izin: tr.querySelector('[data-izin]').value, catatan: tr.querySelector('[data-cat]').value });
    const x = h.bab.find((y) => y.id === tr.dataset.d); x.izin = tr.querySelector('[data-izin]').value; x.cat = tr.querySelector('[data-cat]').value; b.textContent = 'Tersimpan ✓';
    h.progres.dinilai = h.bab.filter((y) => y.izin).length;
  })));
  $('#lspb')?.addEventListener('click', (e) => run(e.target, async () => { const isi = $('#lspt').value; await lsApi('pesan', { head: id, isi }); (s.komentar[id] = s.komentar[id] || []).push({ isi, penulis: D.user.nama, peran: 'Pengajar', tipe: 'Pesan', tgl: new Date().toISOString() }); closeModal(); lsPeserta(id); }));
  $('#lskb')?.addEventListener('click', (e) => run(e.target, async () => { const isi = $('#lskt').value; await lsApi('komentar', { head: id, isi }); (s.komentar[id] = s.komentar[id] || []).push({ isi, penulis: D.user.nama, peran: 'Pengajar', tgl: new Date().toISOString() }); lsPeserta(id); }));
  $('#lsl')?.addEventListener('click', (e) => run(e.target, async () => { const v = { head: id, status: $('#lst').value, ket: $('#lsk2').value, catBpk: $('#lsb').value }; await lsApi('lulus', v); Object.assign(h, { status: v.status, ket: v.ket, catBpk: v.catBpk }); closeModal(); render(); }));
}

/* ---- Tahap 2: syarat, pendaftaran, persetujuan, belajar, laporan BPK ---- */
const lsBerkas = (file, maks = 3_000_000) => new Promise((ok, no) => {
  if (!file) return no(new Error('Pilih berkas dulu'));
  if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) return no(new Error('Berkas harus PDF, JPG, atau PNG'));
  if (file.size > maks) return no(new Error('Ukuran berkas maksimal 3 MB'));
  const r = new FileReader(); r.onerror = () => no(new Error('Gagal membaca berkas'));
  r.onload = () => ok({ name: file.name, type: file.type, data: String(r.result).split(',')[1] || '' }); r.readAsDataURL(file);
});
const lsStat = (t) => chip(t || '–', /Disetujui BPNH|Lulus/.test(t) ? 'green' : /Ditolak|Tidak/.test(t) ? 'red' : /Disetujui BPK/.test(t) ? 'blue' : 'amber');
async function lsSyarat(id) {
  const t = (LS.tc.list || []).find((x) => x.id === id), sy = t.syarat || {};
  let o = LS.opsi; if (!o) { try { o = LS.opsi = await lsApi('opsi'); } catch (e) { return alert(e.message); } }
  const cb = (n, v, on) => `<label class="ck"><input type="checkbox" data-${n}="${esc(v[0])}"${on ? ' checked' : ''}> ${esc(v[1])}</label>`;
  modal(`<h2>Syarat pendaftaran</h2><p class="sub">${esc(t.nama)}. Yang selalu diperiksa otomatis: Baptis &amp; Krisma terisi, sudah mengikuti SHDR, data profil lengkap. Tambahan di bawah bersifat opsional.</p>
    <div class="eform"><div class="full"><label>Wajib sudah mengikuti modul</label><div class="ckg">${o.modul.map((m) => cb('mod', [m, m], (sy.modul || []).includes(m))).join('')}</div></div>
    <div><label>Usia minimal</label><input id="sy-min" type="number" value="${esc(sy.usiaMin ?? '')}"></div><div><label>Usia maksimal</label><input id="sy-max" type="number" value="${esc(sy.usiaMax ?? '')}"></div>
    <div><label>Jenis kelamin</label><select id="sy-jk"><option value="">Semua</option><option${sy.jk === 'Pria' ? ' selected' : ''}>Pria</option><option${sy.jk === 'Wanita' ? ' selected' : ''}>Wanita</option></select></div>
    <div class="full"><label>Hanya dari BPK (kosong = semua)</label><div class="ckg">${o.bpk.map((b) => cb('bpk', [b.id, b.nama], (sy.bpk || []).includes(b.id))).join('')}</div></div>
    <div class="full"><label class="ck"><input type="checkbox" id="sy-pw"${sy.pewarta ? ' checked' : ''}> Harus melayani sebagai pewarta / pengajar</label></div>
    <div class="full"><label class="ck"><input type="checkbox" id="sy-sr"${sy.surat ? ' checked' : ''}> Wajib unggah surat rekomendasi Pastor Moderator / paroki</label></div></div>
    <div class="err" id="lse"></div><div class="mact"><button class="btn" id="lsok">Simpan syarat</button></div>`, true);
  $('#lsok').onclick = async () => {
    const body = { id, syarat: { modul: [...document.querySelectorAll('#ov [data-mod]:checked')].map((e) => e.dataset.mod), bpk: [...document.querySelectorAll('#ov [data-bpk]:checked')].map((e) => e.dataset.bpk), usiaMin: $('#sy-min').value, usiaMax: $('#sy-max').value, jk: $('#sy-jk').value, pewarta: $('#sy-pw').checked, surat: $('#sy-sr').checked } };
    $('#lsok').disabled = true;
    try { await lsApi('syaratsave', body); closeModal(); lsReload('tc', 'daftar'); } catch (e) { $('#lse').textContent = e.message; $('#lsok').disabled = false; }
  };
}
PAGES['ls/daftar'] = () => lsPage('daftar', 'daftarlist', (s) => {
  if (s.tanpaProfil) return '<div class="empty">Akun Anda belum terhubung ke data umat. Lengkapi dulu di Profil Saya.</div>';
  const fokus = location.hash.replace(/^#\/?/, '').split('/')[2] || '';
  const tc = [...s.tc].sort((a, b) => (b.id === fokus) - (a.id === fokus));
  if (!tc.length) return '<div class="empty">Belum ada TC yang membuka pendaftaran.</div>';
  return '<div class="note" style="margin-bottom:12px">Pendaftaran diperiksa otomatis. Setelah mendaftar, permohonan Anda disetujui oleh Koordinator BPK keuskupan Anda, lalu tim BPN penyelenggara TC. Anda akan menerima email.</div>' + tc.map((t) => {
    const m = t.mine, bisa = t.cek.ok && (!m || /^Ditolak/.test(m.status)) && t.daftar === 'Dibuka';
    return `<div class="card" style="margin-bottom:16px"><h3>${esc(t.nama)}<small>${esc(lsDate(t.mulai))} – ${esc(lsDate(t.selesai))}</small></h3>
      ${m ? `<div class="chips" style="margin-bottom:8px">${lsStat(m.status)}</div>${m.catBpk ? `<p class="sub">Catatan BPK: ${esc(m.catBpk)}</p>` : ''}${m.catBnh ? `<p class="sub">Catatan BPN: ${esc(m.catBnh)}</p>` : ''}` : ''}
      <h4>Syarat</h4><ul class="syr">${t.cek.items.map((x) => `<li>${x.ok ? '✅' : '❌'} ${esc(x.label)}${!x.ok && x.info ? ` <span class="sub">— ${esc(x.info)}</span>` : ''}</li>`).join('')}</ul>
      ${bisa ? `<div class="eform">${t.syarat.surat ? `<div class="full"><label>Surat rekomendasi (PDF/JPG/PNG, maks 3 MB)</label><input type="file" id="sr-${t.id}" accept="application/pdf,image/jpeg,image/png"></div>` : ''}</div><div class="err" id="dfe-${t.id}"></div><div class="acts"><button class="btn" data-ls="daftar|${t.id}">Daftar sekarang</button></div>` : !m && !t.cek.ok ? '<p class="sub">Anda belum memenuhi syarat, jadi belum dapat mendaftar.</p>' : ''}</div>`;
  }).join('');
});
async function lsDaftar(id, btn) {
  const t = LS.daftar.tc.find((x) => x.id === id), err = $('#dfe-' + id); err.textContent = ''; btn.disabled = true;
  try {
    const body = { event: id };
    if (t.syarat.surat) body.surat = await lsBerkas(document.getElementById('sr-' + id).files[0]);
    await lsApi('daftar', body); lsReload('daftar');
  } catch (e) { err.textContent = e.message; btn.disabled = false; }
}
PAGES['ls/pendaftar'] = () => lsPage('pendaftar', 'pendaftar', (s) => {
  if (!s.rows.length) return '<div class="empty">Belum ada pendaftar.</div>';
  return `<div class="note" style="margin-bottom:12px">Koordinator BPK / PIC Pewartaan menyetujui pendaftar dari keuskupannya lebih dulu; setelah itu tim BPN penyelenggara TC menyetujui dan menentukan kelompok.</div><div class="tw"><table><thead><tr><th>Nama</th><th>TC</th><th>Keuskupan</th><th>Status</th><th>Surat</th><th></th></tr></thead><tbody>${s.rows.map((r) => `<tr><td>${esc(r.nama)}<div class="sub">${esc(r.email)} ${esc(r.wa)}</div></td><td>${esc(r.eventNama)}</td><td>${esc(r.keus)}</td><td>${lsStat(r.status)}${r.catBpk ? `<div class="sub">BPK: ${esc(r.catBpk)}</div>` : ''}${r.catBnh ? `<div class="sub">BPN: ${esc(r.catBnh)}</div>` : ''}</td><td>${r.suratUrl ? `<a href="${esc(r.suratUrl)}" target="_blank" rel="noopener">${esc(r.suratNama || 'Lihat')}</a>` : '–'}</td><td>${r.bisaBpk || r.bisaBnh ? `<button class="btn" data-ls="putus|${r.id}" data-aksi="setuju">Setujui</button> <button class="ghost" data-ls="putus|${r.id}" data-aksi="tolak">Tolak</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
});
function lsPutus(id, aksi) {
  const r = LS.pendaftar.rows.find((x) => x.id === id), tahapBnh = r.status === 'Disetujui BPK';
  const f = [];
  if (aksi === 'setuju' && tahapBnh) f.push({ k: 'kelompok', label: 'Kelompok', type: 'select', val: '', opts: [['', '— pilih kelompok —'], ...LS.pendaftar.kelompok.map((k) => [k.id, k.nama])], full: true });
  f.push({ k: 'catatan', label: aksi === 'tolak' ? 'Alasan penolakan (wajib)' : 'Catatan (opsional)', type: 'area', full: true });
  lsForm(`${aksi === 'setuju' ? 'Setujui' : 'Tolak'} ${r.nama}`, f, async (v) => { await lsApi('putus', { id, aksi, catatan: v.catatan, kelompok: v.kelompok }); lsReload('pendaftar', 'laporan'); }, tahapBnh && aksi === 'setuju' ? 'Setelah disetujui, peserta langsung mendapat learning path dan email pemberitahuan.' : '');
}
PAGES['ls/peserta'] = () => lsPage('belajar', 'belajar', (s) => {
  if (!s.kelas.length) return '<div class="empty">Anda belum terdaftar di TC mana pun. Lihat tab <b>Daftar TC</b>.</div>';
  return s.kelas.map((k) => `<div class="card" style="margin-bottom:16px"><h3>${esc(k.event)}<small>Kelompok ${esc(k.kelompok || '–')} · Pengajar ${esc(k.pengajar || '–')}</small></h3>
    <div class="chips" style="margin-bottom:8px">${lsStat(k.status)}${chip(`${k.bab.filter((b) => b.selesai).length}/${k.bab.length} bab ditonton`, 'blue')}</div>${k.ket ? `<p class="sub">${esc(k.ket)}</p>` : ''}
    <div class="tw"><table><thead><tr><th>Bab</th><th>Materi</th><th>Tonton</th><th>Tugas (PDF/gambar, maks 3 MB)</th><th>Hasil</th></tr></thead><tbody>${k.bab.map((b) => `<tr><td>${esc(b.judul)}</td><td>${b.yt ? `<a href="${esc(b.yt)}" target="_blank" rel="noopener">Video</a> ` : ''}${b.tautan.map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener">Materi ${i + 1}</a>`).join(' ')}</td><td><button class="ghost" data-ls="tonton|${b.id}" data-on="${b.selesai ? 0 : 1}">${b.selesai ? '✓ Sudah' : 'Tandai selesai'}</button></td><td>${b.tugas.map((n) => `<div class="sub">📎 ${esc(n)}</div>`).join('')}<input type="file" id="tg-${b.id}" accept="application/pdf,image/jpeg,image/png"> <button class="ghost" data-ls="tugas|${b.id}">Unggah</button><div class="err" id="tge-${b.id}"></div></td><td>${b.izin ? chip(b.izin, 'green') : '–'}${b.cat ? `<div class="sub">${esc(b.cat)}</div>` : ''}</td></tr>`).join('')}</tbody></table></div>
    <h4 style="margin-top:12px">Komentar pengajar</h4>${k.komentar.filter((c) => c.tipe !== 'Pesan').map((c) => `<div class="riw"><b>${esc(c.penulis)}</b> <span class="sub">${esc(lsDate(c.tgl))}</span><div>${esc(c.isi)}</div></div>`).join('') || '<p class="sub">Belum ada komentar.</p>'}
    <h4 style="margin-top:12px">Pesan dengan pengajar</h4>${k.komentar.filter((c) => c.tipe === 'Pesan').map((c) => `<div class="riw"><b>${esc(c.penulis)}</b> <span class="sub">${esc(c.peran)} · ${esc(lsDate(c.tgl))}</span><div>${esc(c.isi)}</div></div>`).join('') || '<p class="sub">Belum ada pesan.</p>'}
    <div class="eform"><div class="full"><textarea id="ps-${k.id}" rows="2" placeholder="Tulis pesan untuk pengajar…"></textarea></div></div><div class="err" id="pse-${k.id}"></div><div class="acts"><button class="ghost" data-ls="pesan|${k.id}">Kirim pesan</button></div></div>`).join('');
});
async function lsPesan(id) { const e = $('#pse-' + id); e.textContent = ''; try { await lsApi('pesan', { head: id, isi: document.getElementById('ps-' + id).value }); lsReload('belajar'); } catch (x) { e.textContent = x.message; } }
PAGES['ls/diskusi'] = () => lsPage('diskusi', 'diskusi', (s) => {
  if (!s.tc.length) return '<div class="empty">Anda belum tergabung di TC mana pun.</div>';
  return `<div class="note" style="margin-bottom:12px">Ruang diskusi seluruh peserta dan pengajar satu TC, lintas kelompok. Tetap santun dan saling menguatkan.</div>
    <div class="eform"><div><label>TC</label><select id="dk-tc">${s.tc.map((t) => `<option value="${t.id}"${t.id === s.event ? ' selected' : ''}>${esc(t.nama)}</option>`).join('')}</select></div></div>
    <div class="card" style="margin:12px 0">${s.posts.map((c) => `<div class="riw"><b>${esc(c.penulis)}</b> <span class="sub">${esc(c.peran)}${c.kelompok ? ' · Kelompok ' + esc(c.kelompok) : ''} · ${esc(lsDate(c.tgl))}</span><div>${esc(c.isi)}</div></div>`).join('') || '<p class="sub">Belum ada tulisan. Jadilah yang pertama.</p>'}</div>
    <div class="eform"><div class="full"><textarea id="dk-t" rows="3" placeholder="Tulis di diskusi…"></textarea></div></div><div class="err" id="dk-e"></div><div class="acts"><button class="btn" data-ls="diskusikirim|${s.event}">Kirim</button></div>`;
});
document.addEventListener('change', (e) => { if (e.target.id === 'dk-tc') { delete LS.diskusi; LS.diskusi = undefined; lsApi('diskusi&event=' + e.target.value).then((j) => { LS.diskusi = j; render(); }).catch(() => {}); } });
async function lsDiskusi(ev) { const e = $('#dk-e'); e.textContent = ''; try { await lsApi('diskusikirim', { event: ev, isi: $('#dk-t').value }); const j = await lsApi('diskusi&event=' + ev); LS.diskusi = j; render(); } catch (x) { e.textContent = x.message; } }
async function lsTonton(id, on) { try { await lsApi('tonton', { detail: id, selesai: on }); lsReload('belajar'); } catch (e) { alert(e.message); } }
async function lsTugas(id) {
  const err = $('#tge-' + id); err.textContent = '';
  try { await lsApi('tugas', { detail: id, file: await lsBerkas(document.getElementById('tg-' + id).files[0]) }); lsReload('belajar'); } catch (e) { err.textContent = e.message; }
}
PAGES['ls/laporan'] = () => lsPage('laporan', 'laporan', (s) => {
  if (!s.rows.length) return '<div class="empty">Belum ada peserta dari keuskupan Anda.</div>';
  const q = (LS.lapq || '').toLowerCase(), st = LS.laps || '';
  const rows = s.rows.filter((r) => (!st || r.status === st) && (!q || (r.nama + ' ' + r.keus).toLowerCase().includes(q)));
  return `<div class="note" style="margin-bottom:12px">Peserta ${s.semua ? 'semua keuskupan' : 'dari keuskupan Anda'}: status kelulusan, bab yang boleh diajar, dan catatan akhir pengajar.</div>
    <div class="chips" style="margin-bottom:10px">${Object.entries(s.ringkas).map(([k, v]) => chip(`${k}: ${v}`, /Lulus/.test(k) ? 'green' : /Mundur|Mengundurkan|Tidak/.test(k) ? 'red' : 'blue')).join('')}</div>
    <div class="eform"><div><label>Cari</label><input id="lq" value="${esc(LS.lapq || '')}" placeholder="Nama atau keuskupan"></div><div><label>Status</label><select id="ls-st"><option value="">Semua</option>${Object.keys(s.ringkas).map((k) => `<option${k === st ? ' selected' : ''}>${esc(k)}</option>`).join('')}</select></div></div>
    <div class="tw"><table><thead><tr><th>Nama</th><th>Keuskupan</th><th>Kelompok / Pengajar</th><th>Status</th><th>Bab dinilai</th><th>Catatan akhir</th><th></th></tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(r.nama)}</td><td>${esc(r.keus)}</td><td>${esc(r.kelompok)}<div class="sub">${esc(r.pengajar)}</div></td><td>${lsStat(r.status)}${r.ket ? `<div class="sub">${esc(r.ket)}</div>` : ''}</td><td>${r.dinilai ? `${r.boleh} boleh, ${r.damping} didampingi (dari ${r.dinilai})` : '–'}</td><td>${esc(r.catBpk)}</td><td><button class="ghost" data-ls="lapdetail|${r.id}">Rincian</button></td></tr>`).join('') || '<tr><td colspan="7">Tidak ada yang cocok.</td></tr>'}</tbody></table></div>`;
});
document.addEventListener('input', (e) => { if (e.target.id === 'lq') { LS.lapq = e.target.value; const p = e.target.selectionStart; render(); const n = $('#lq'); if (n) { n.focus(); n.setSelectionRange(p, p); } } });
document.addEventListener('change', (e) => { if (e.target.id === 'ls-st') { LS.laps = e.target.value; render(); } });
async function lsLapDetail(id) {
  const r = LS.laporan.rows.find((x) => x.id === id);
  try {
    const j = await lsApi('laporandetail&head=' + id);
    modal(`<h2>${esc(r.nama)}</h2><p class="sub">${esc(r.event)} · ${esc(r.keus)} · ${esc(r.status)}</p><h4>Bab</h4><div class="tw"><table><thead><tr><th>Bab</th><th>Tonton</th><th>Boleh mengajar?</th><th>Catatan</th></tr></thead><tbody>${j.bab.map((b) => `<tr><td>${esc(b.bab)}</td><td>${b.nonton ? '✓' : '–'}</td><td>${esc(b.izin || '–')}</td><td>${esc(b.cat)}</td></tr>`).join('')}</tbody></table></div>${r.catBpk ? `<h4 style="margin-top:12px">Catatan akhir TC</h4><p>${esc(r.catBpk)}</p>` : ''}<h4 style="margin-top:12px">Komentar pengajar</h4>${j.komentar.map((k) => `<div class="riw"><b>${esc(k.penulis)}</b> <span class="sub">${esc(lsDate(k.tgl))}</span><div>${esc(k.isi)}</div></div>`).join('') || '<p class="sub">Belum ada komentar.</p>'}`, true);
  } catch (e) { alert(e.message); }
}

PAGES['ls/dasbor'] = () => lsPage('dasbor', 'dasbor', (s) => {
  if (!s.events.length) return '<div class="empty">Belum ada peserta TC.</div>';
  const k = s.kpi, mx = Math.max(1, k.aktif), bar = (n, tone, l) => `<div style="margin:6px 0"><div class="sub">${esc(l)}: <b>${n}</b></div><div style="background:#e5e7eb;border-radius:6px;height:10px"><div style="width:${Math.round((n / mx) * 100)}%;background:${tone};height:10px;border-radius:6px"></div></div></div>`;
  const sel = (LS.dbSel || {});
  return `<div class="eform"><div><label>TC</label><select id="db-ev">${s.events.map((e) => `<option value="${e.id}"${e.id === s.event ? ' selected' : ''}>${esc(e.nama)}</option>`).join('')}</select></div><div><label>Tertinggal bila progres di bawah (%)</label><input id="db-am" type="number" min="1" max="100" value="${s.ambang}"></div></div>
    <div class="chips" style="margin:12px 0">${chip('Peserta: ' + k.total, 'blue')}${chip('Aktif: ' + k.aktif, 'amber')}${chip('Lulus: ' + k.lulus, 'green')}${chip('Mundur: ' + k.mundur, 'red')}${chip('Rata-rata progres aktif: ' + k.rata + '%', 'blue')}</div>
    <div class="card" style="margin-bottom:16px"><h3>Sebaran progres peserta aktif</h3>${bar(s.bucket.nol, '#dc2626', 'Belum mulai (0%)')}${bar(s.bucket.rendah, '#f59e0b', '1–49%')}${bar(s.bucket.sedang, '#2563eb', '50–99%')}${bar(s.bucket.penuh, '#16a34a', '100%')}</div>
    <div class="card" style="margin-bottom:16px"><h3>Per keuskupan</h3><div class="tw"><table><thead><tr><th>Keuskupan</th><th>Peserta</th><th>Aktif</th><th>Lulus</th><th>Mundur</th><th>Rata-rata aktif</th><th>Tertinggal</th></tr></thead><tbody>${s.keus.map((g) => `<tr><td>${esc(g.nama)}</td><td>${g.total}</td><td>${g.aktif}</td><td>${g.lulus}</td><td>${g.mundur}</td><td>${g.rata}%</td><td>${g.tertinggal}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="card" style="margin-bottom:16px"><h3>Per kelompok</h3><div class="tw"><table><thead><tr><th>Kelompok</th><th>Pengajar</th><th>Peserta</th><th>Aktif</th><th>Lulus</th><th>Rata-rata aktif</th><th>Tertinggal</th></tr></thead><tbody>${s.kelompok.map((g) => `<tr><td>${esc(g.nama)}</td><td>${esc(g.pengajar)}</td><td>${g.total}</td><td>${g.aktif}</td><td>${g.lulus}</td><td>${g.rata}%</td><td>${g.tertinggal}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="card"><h3>Peserta tertinggal (${s.tertinggal.length})</h3>${s.bisaKirim ? '<div class="eform"><div class="full"><label>Pesan tambahan (opsional)</label><input id="db-ps" placeholder="mis. Batas tugas minggu ini"></div></div><div class="acts" style="margin-bottom:8px"><button class="btn" data-ls="ingatkan">Kirim pengingat ke yang dicentang</button> <button class="ghost" data-ls="dbpilih">Centang semua</button></div><div class="err" id="db-e"></div>' : ''}
    <div class="tw"><table><thead><tr>${s.bisaKirim ? '<th></th>' : ''}<th>Nama</th><th>Keuskupan</th><th>Kelompok</th><th>Progres</th><th>Kontak</th></tr></thead><tbody>${s.tertinggal.map((x) => `<tr>${s.bisaKirim ? `<td><input type="checkbox" data-db="${x.id}"></td>` : ''}<td>${esc(x.nama)}</td><td>${esc(x.keus)}</td><td>${esc(x.kel)}</td><td>${x.pct}%</td><td>${x.email ? '✉' : ''} ${x.wa ? 'WA' : ''}</td></tr>`).join('') || '<tr><td colspan="6">Tidak ada peserta tertinggal.</td></tr>'}</tbody></table></div></div>`;
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'db-ev' || e.target.id === 'db-am') {
    const ev = $('#db-ev').value, am = $('#db-am').value || 50; LS.dasbor = undefined;
    lsApi(`dasbor&event=${ev}&ambang=${am}`).then((j) => { LS.dasbor = j; render(); }).catch(() => { delete LS.dasbor; render(); });
  }
});
async function lsIngatkan(btn) {
  const ids = [...document.querySelectorAll('[data-db]:checked')].map((x) => x.dataset.db), er = $('#db-e'); er.textContent = '';
  if (!ids.length) { er.textContent = 'Centang peserta dulu'; return; }
  if (!confirm(`Kirim pengingat ke ${ids.length} peserta?`)) return;
  btn.disabled = true;
  try { const j = await lsApi('ingatkan', { ids, pesan: $('#db-ps').value }); er.textContent = `Terkirim: ${j.email} email, ${j.wa} WhatsApp (dari ${j.dipilih} peserta)`; } catch (x) { er.textContent = x.message; }
  btn.disabled = false;
}

const tabsOf = (m) => (m.tabs ? m.tabs.filter((s) => (D.perm[s[2] || `${m.id}/${s[0]}`] || 0) >= 1 && !(s[4] && !(D.user.tim && D.user.tim.ada)) && !(s[5] && !(D.user.bpk || D.user.superAdmin || (D.perm.admin || 0) >= 1))) : []);
const visible = () => MENU.filter((m) => m.always || (m.tabs ? tabsOf(m).length : (D.perm[m.id] || 0) >= 1));
// Alamat lama (sebelum menu digabung) dialihkan ke alamat baru supaya tautan dan bookmark tetap jalan.
const ALIAS = { pengurus: 'org/pengurus', tim: 'org/saya', 'tim/saya': 'org/saya', 'tim/bagan': 'org/bagan', 'tim/daftar': 'org/daftar', modul: 'ls/m-ringkasan', 'modul/ringkasan': 'ls/m-ringkasan', 'modul/permodul': 'ls/m-permodul', 'modul/peserta': 'ls/m-peserta', 'modul/pengajar': 'ls/m-pengajar' };
function migrasiHash() {
  const seg = location.hash.replace(/^#\/?/, '').split('/'), k2 = seg.slice(0, 2).join('/'), to = ALIAS[k2] || ALIAS[seg[0]];
  if (to && (ALIAS[k2] || seg.length === 1)) history.replaceState(null, '', location.pathname + location.search + '#/' + to + (seg.length > 2 ? '/' + seg.slice(2).join('/') : ''));
}
function route() { migrasiHash(); const ms = visible(); const [m = 'dashboard', t] = location.hash.replace(/^#\/?/, '').split('/'); const menu = ms.find((x) => x.id === m) || ms.find((x) => !x.hide) || ms[0]; if (!menu) return { menu: null, tab: null, tabs: [], spec: null }; const tabs = tabsOf(menu); const spec = menu.tabs ? (tabs.find((x) => x[0] === t) || tabs[0]) : null; return { menu, tabs, spec, tab: spec ? spec[0] : null }; }
function render() {
  if (!D) return;
  DR = [];
  const { menu, tab, tabs, spec } = route();
  if (!menu) { $('#nav').innerHTML = ''; $('#page').innerHTML = '<div class="empty">Akun Anda belum diberi akses ke menu apa pun. Hubungi Admin BPN.</div>'; return; }
  let lastG = ''; $('#nav').innerHTML = visible().filter((m) => !m.hide).map((m) => { const h = m.g && m.g !== lastG ? `<div class="ngrp">${esc(m.g)}</div>` : ''; if (m.g) lastG = m.g; return `${h}<a href="#/${m.id}" class="${m.id === menu.id ? 'on' : ''}"><svg viewBox="0 0 24 24">${m.icon}</svg>${esc(m.label)}${m.id === menu.id ? '' : `<span class="dot" style="background:${m.c}"></span>`}</a>`; }).join('');
  $('#ptitle').textContent = menu.label; $('#psub').textContent = menu.sub;
  $('#tabs').innerHTML = menu.tabs ? tabs.map(([id, l]) => `<a href="#/${menu.id}/${id}" class="${id === tab ? 'on' : ''}">${esc(l)}</a>`).join('') : '';
  const fn = PAGES[tab ? (spec[3] || `${menu.id}/${tab}`) : menu.id];
  $('#me')?.classList.toggle('on', menu.id === 'profil');
  if (menu.id !== 'profil') S.prof = null;
  $('#page').innerHTML = (menu.id === 'profil' ? '' : bannerPr()) + (fn ? fn() : '<div class="empty">Halaman tidak ditemukan.</div>');
  $('#done')?.addEventListener('change', (e) => { S.showDone = e.target.checked; render(); });
  $('#side').classList.remove('open');
  document.title = `${menu.label} · BPN PKKI`;
}
async function load(refresh) {
  const r = await fetch('/api/data' + (refresh ? '?refresh=1' : ''), { credentials: 'same-origin' });
  if (r.status === 401) return showLogin();
  if (r.status === 403) { const j = await r.clone().json().catch(() => ({})); if (j.pending) return stepPending(j.nama); if (j.mustChange) { $('#login').classList.add('hide'); $('#app').classList.add('hide'); return showChangePw(true); } }
  if (!r.ok) { $('#login').classList.add('hide'); $('#app').classList.remove('hide'); $('#page').innerHTML = '<div class="empty">Gagal memuat data. Coba muat ulang.</div>'; return; }
  D = await r.json(); if (refresh) { R = null; ADM = null; }
  $('#login').classList.add('hide'); $('#app').classList.remove('hide');
  $('#mename').textContent = D.user.nama; $('#melevel').textContent = D.user.level; $('#meav').style.background = hue(D.user.nama); $('#meav').textContent = initials(D.user.nama);
  impBar(); render(); ringkasPr();
}
// Banner mode "Login sebagai" (khusus Super Admin): tampil di semua halaman selama menyamar.
function impBar() {
  let b = $('#impbar'); const m = D && D.user && D.user.imp;
  if (!m) { if (b) b.remove(); return; }
  if (!b) { b = document.createElement('div'); b.id = 'impbar'; document.querySelector('.main').prepend(b); }
  b.innerHTML = `<span>👁 Anda melihat sebagai <b>${esc(m.sebagai)}</b>${m.edit ? ` · perubahan tersimpan atas nama <b>${esc(m.oleh)}</b>` : ' · mode lihat saja'}</span><label><input type="checkbox" id="impe"${m.edit ? ' checked' : ''}> Boleh edit</label><button class="btn" id="impx" type="button">Kembali ke akun saya</button>`;
  $('#impe').onchange = async (e) => { e.target.disabled = true; try { await admApi({ action: 'impedit', edit: e.target.checked }); await load(true); } catch (x) { alert(x.message); e.target.disabled = false; } };
  $('#impx').onclick = async (e) => { e.target.disabled = true; try { await admApi({ action: 'impstop' }); location.hash = '#/admin/pengguna'; await load(true); } catch (x) { alert(x.message); e.target.disabled = false; } };
}
async function loginSebagai(id) { await admApi({ action: 'imp', id }); location.hash = ''; await load(true); }
function showLogin() { $('#app').classList.add('hide'); $('#login').classList.remove('hide'); D = null; R = null; stepPhone(); }
window.addEventListener('hashchange', render);
/* ===== Login WhatsApp ===== */
const LG = { wa: '', phone: '', grant: '', tujuan: '', timer: null, pre: {} };
const post = async (url, body) => { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) }); const j = await r.json().catch(() => ({})); if (!r.ok) { const e = new Error(j.error || 'Terjadi kesalahan'); e.status = r.status; throw e; } return j; };
const lerr = (m) => { $('#le').textContent = m || ''; };
function lstep(html, bind) { clearInterval(LG.timer); lerr(''); $('#lstep').innerHTML = html; bind && bind(); $('#lstep input,#lstep select')?.focus(); }
function busy(btn, on, txt) { btn.disabled = on; if (txt) btn.textContent = txt; }
const back = '<button type="button" class="ghost lback" id="lbk">← Ganti nomor</button>';
function stepPhone() {
  lstep(`<label for="ph">Nomor WhatsApp</label><input id="ph" type="tel" inputmode="tel" autocomplete="tel" placeholder="0812 3456 7890" value="${esc(LG.phone)}"><button class="btn" id="lb" type="submit">Lanjut</button>`, () => {
    $('#lf').onsubmit = async (ev) => { ev.preventDefault(); busy($('#lb'), true); lerr('');
      try { LG.phone = $('#ph').value; const j = await post('/api/akses', { action: 'cek', phone: LG.phone }); LG.wa = j.wa; if (j.ada) { if (!j.aktif) throw new Error('Akun ini dinonaktifkan. Hubungi Admin BPN.'); stepPassword(); } else stepNew(); }
      catch (e) { lerr(e.message); busy($('#lb'), false); } };
  });
}
function stepPassword() {
  lstep(`<div class="who">+${esc(LG.wa)}</div><label for="pw">Password</label><input id="pw" type="password" autocomplete="current-password"><button class="btn" id="lb" type="submit">Masuk</button><button type="button" class="linkbtn" id="lf1">Lupa password? Kirim kode ke WhatsApp</button>${back}`, () => {
    $('#lbk').onclick = stepPhone; $('#lf1').onclick = () => sendOtp();
    $('#lf').onsubmit = async (ev) => { ev.preventDefault(); busy($('#lb'), true); lerr('');
      try { const j = await post('/api/login', { phone: LG.wa, password: $('#pw').value }); await afterAuth(j); }
      catch (e) { lerr(e.message); busy($('#lb'), false); } };
  });
}
function stepNew() {
  lstep(`<div class="who">+${esc(LG.wa)}</div><p class="note" style="text-align:left">Nomor ini belum terdaftar. Buat akun baru: kami kirim kode 4 digit ke WhatsApp nomor ini untuk memastikan nomor tersebut milik Anda.</p><button class="btn" id="lb" type="submit">Kirim kode ke WhatsApp</button>${back}`, () => {
    $('#lbk').onclick = stepPhone; $('#lf').onsubmit = (ev) => { ev.preventDefault(); sendOtp(); };
  });
}
async function sendOtp() {
  try { const j = await post('/api/akses', { action: 'kirim', phone: LG.wa }); LG.tujuan = j.tujuan; stepOtp(j.tujuanNomor); }
  catch (e) { lerr(e.message); }
}
function stepOtp(masked) {
  lstep(`<p class="note" style="text-align:left">Kode 4 digit sudah dikirim ke WhatsApp <b>${esc(masked)}</b>. Berlaku 5 menit.</p><label for="otp">Kode OTP</label><input id="otp" inputmode="numeric" maxlength="4" autocomplete="one-time-code" style="letter-spacing:.5em;font-size:22px;text-align:center"><button class="btn" id="lb" type="submit">Verifikasi</button><button type="button" class="linkbtn" id="rs" disabled>Kirim ulang kode (60)</button>${back}`, () => {
    $('#lbk').onclick = stepPhone;
    let t = 60; LG.timer = setInterval(() => { t--; const b = $('#rs'); if (!b) return clearInterval(LG.timer); if (t <= 0) { b.disabled = false; b.textContent = 'Kirim ulang kode'; clearInterval(LG.timer); } else b.textContent = `Kirim ulang kode (${t})`; }, 1000);
    $('#rs').onclick = () => sendOtp();
    $('#otp').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4); if (e.target.value.length === 4) $('#lf').requestSubmit(); });
    $('#lf').onsubmit = async (ev) => { ev.preventDefault(); if ($('#otp').value.length !== 4) return; busy($('#lb'), true); lerr('');
      try { const j = await post('/api/akses', { action: 'verifikasi', phone: LG.wa, code: $('#otp').value }); LG.grant = j.grant; LG.tujuan = j.tujuan; LG.pre = j.orang || {}; if (j.perluProfil) stepProfil(); else stepSetPw(j.orang && j.orang.nama); }
      catch (e) { lerr(e.message); busy($('#lb'), false); $('#otp').value = ''; } };
  });
}
const pwFields = '<label for="p1">Password baru</label><input id="p1" type="password" autocomplete="new-password"><label for="p2">Ketik ulang password</label><input id="p2" type="password" autocomplete="new-password"><p class="note" style="text-align:left;margin:6px 0 0">Minimal 8 karakter, berisi huruf dan angka.</p>';
function stepSetPw(nama) {
  const reset = LG.tujuan === 'reset';
  lstep(`<p class="note" style="text-align:left">${reset ? 'Nomor terverifikasi. Buat password baru Anda.' : `Nomor terverifikasi${nama ? ` dan cocok dengan data <b>${esc(nama)}</b>` : ''}. Buat password untuk akun Anda.`}</p>${pwFields}<button class="btn" id="lb" type="submit">Simpan &amp; masuk</button>`, () => {
    $('#lf').onsubmit = async (ev) => { ev.preventDefault(); busy($('#lb'), true); lerr('');
      try { const j = await post('/api/akses', { action: 'simpan', grant: LG.grant, password: $('#p1').value, ulang: $('#p2').value }); await afterAuth(j); }
      catch (e) { lerr(e.message); busy($('#lb'), false); } };
  });
}
function profilFields(kus, pre) {
  const yr = new Date().getFullYear();
  return `<label>Nama lengkap</label><input id="f_nama" autocomplete="name" value="${esc(pre.nama || '')}"><label>Nama panggilan</label><input id="f_pan"><label>Jenis kelamin</label><select id="f_jk"><option value="">Pilih…</option><option${pre.jk === 'Pria' ? ' selected' : ''}>Pria</option><option${pre.jk === 'Wanita' ? ' selected' : ''}>Wanita</option></select>
    <label>Email</label><input id="f_email" type="email" autocomplete="email"><label>Keuskupan domisili</label><select id="f_kus"><option value="">Pilih…</option>${kus.map((k) => `<option value="${k.id}">${esc(k.nama)}</option>`).join('')}</select>
    <label>Tanggal lahir</label><div class="dob"><select id="f_tgl"><option value="">Tgl</option>${Array.from({ length: 31 }, (_, i) => `<option>${i + 1}</option>`).join('')}</select><select id="f_bln"><option value="">Bulan</option>${BLN3.map((b, i) => `<option value="${i + 1}">${b}</option>`).join('')}</select><select id="f_thn"><option value="">Tahun</option>${Array.from({ length: yr - 1919 }, (_, i) => `<option>${yr - i}</option>`).join('')}</select></div>
    <label>Alamat surat (opsional)</label><input id="f_alamat">`;
}
async function stepProfil() {
  let kus = []; try { kus = (await (await fetch('/api/akses')).json()).keuskupan || []; } catch { /* kosong */ }
  const pre = LG.pre || {};
  lstep(`<p class="note" style="text-align:left">${pre.nama ? `Nomor terverifikasi. Anda sudah didata di BPN${pre.nama ? ` sebagai <b>${esc(pre.nama)}</b>` : ''}; lengkapi profil Anda dulu.` : 'Nomor terverifikasi, tetapi belum ada di data BPN. Lengkapi profil Anda.'}</p>${profilFields(kus, pre)}${pwFields}<button class="btn" id="lb" type="submit">Daftar</button>`, () => {
    $('#lf').onsubmit = async (ev) => { ev.preventDefault(); busy($('#lb'), true); lerr(''); const v = (id) => $('#' + id).value;
      try { const j = await post('/api/akses', { action: 'simpan', grant: LG.grant, password: v('p1'), ulang: v('p2'), profil: { nama: v('f_nama'), panggilan: v('f_pan'), jk: v('f_jk'), email: v('f_email'), keuskupan: v('f_kus'), tgl: v('f_tgl'), bln: v('f_bln'), thn: v('f_thn'), alamat: v('f_alamat') } }); await afterAuth(j); }
      catch (e) { lerr(e.message); busy($('#lb'), false); } };
  });
}
function stepPending(nama) {
  $('#app').classList.add('hide'); $('#login').classList.remove('hide');
  lstep(`<div class="okbox">✓</div><h2 style="text-align:center;margin:8px 0">Akun Anda sudah dibuat</h2><p class="note" style="text-align:center">${nama ? esc(nama) + ', ' : ''}akun menunggu persetujuan Admin BPN. Setelah disetujui, Anda bisa masuk dan melihat data sesuai hak akses.</p><button class="btn" id="lb" type="button">Keluar</button>`, () => { $('#lb').onclick = async () => { await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }); LG.phone = ''; stepPhone(); }; });
}
async function afterAuth(j) { if (j && j.pending) return stepPending(); await load(); }
$('#rf').onclick = async () => { $('#rf').disabled = true; $('#rf').textContent = 'Memuat…'; await load(true); $('#rf').disabled = false; $('#rf').textContent = 'Muat ulang'; };
$('#pwbtn')?.addEventListener('click', () => showChangePw(false));
$('#burger').onclick = () => $('#side').classList.toggle('open');
(async () => {
  const inv = new URLSearchParams(location.search).get('invite');
  const hp = (new URLSearchParams(location.search).get('hp') || '').replace(/\D/g, '');
  if (hp) { LG.phone = hp; history.replaceState(null, '', location.pathname + location.hash); }
  if (inv) {
    history.replaceState(null, '', location.pathname + location.hash);
    try {
      const r = await fetch('/api/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ token: inv }) });
      if (!r.ok) { const j = await r.json().catch(() => ({})); showLogin(); $('#le').textContent = j.error || 'Tautan undangan tidak valid'; return; }
    } catch { /* lanjut ke login biasa */ }
  }
  load();
})();
