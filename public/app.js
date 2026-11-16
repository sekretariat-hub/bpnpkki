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
  pdf: { kus: '', jenis: '', q: '' }, tf: { status: 'AKTIF', kat: '', bidang: '', q: '' }, showDone: false };

/* ===== menu ===== */
const I = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  clip: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9z"/><path d="M9 12h6M9 16h4"/>',
  star: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  pd: '<circle cx="9" cy="8" r="3.2"/><circle cx="17" cy="9" r="2.6"/><path d="M3 20c.6-3.5 3-5.5 6-5.5s5.400 2 6 5.500"/><path d="M15.500 14.800c2.700-.4 4.800 1.300 5.500 4.200"/>',
  team: '<rect x="9" y="3" width="6" height="5" rx="1.500"/><rect x="3" y="16" width="6" height="5" rx="1.500"/><rect x="15" y="16" width="6" height="5" rx="1.500"/><path d="M12 8v4M6 16v-4h12v4"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>',
};
const MENU = [
  { id: 'dashboard', label: 'Dashboard', icon: I.home, sub: 'Agenda terdekat dan angka kunci', c: '#3B82F6' },
  { id: 'proker', label: 'Program Kerja', icon: I.clip, sub: 'Program kerja BPN untuk Keuskupan', c: '#F5A524', tabs: [['keuskupan', 'Per Keuskupan'], ['semua', 'Semua Program'], ['ringkasan', 'Ringkasan & Grafik'], ['acc', 'Syarat ACC']] },
  { id: 'pengurus', label: 'Pengurus BPN', icon: I.star, sub: 'Susunan pengurus BPN', c: '#8B7CF6' },
  { id: 'pd', label: 'Koordinator PD', icon: I.pd, sub: 'Persekutuan Doa dan koordinatornya', c: '#14B8A6', tabs: [['daftar', 'Daftar PD'], ['ringkasan', 'Ringkasan']] },
  { id: 'tim', label: 'Tim Kerja BPN', icon: I.team, sub: 'Siapa saja yang bertugas di BPN', c: '#FF7A6B', tabs: [['bagan', 'Bagan Tim Aktif'], ['daftar', 'Daftar Tim Kerja']] },
  { id: 'laporan', label: 'Laporan', icon: I.chart, sub: 'Ringkasan kegiatan', c: '#34C28A', tabs: [['pleno', 'Pleno & Golden Jubilee'], ['tc', 'TC SHDR'], ['kepemudaan', 'Kepemudaan']] },
  { id: 'admin', label: 'Administrasi', icon: I.key, sub: 'Kelola pengguna dan hak akses', c: '#6B7A99', tabs: [['pengguna', 'Pengguna & Hak Akses']] },
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
const person = (p, jab) => `<div class="card pc">${av(p.nama)}<div style="min-width:0"><div class="n">${esc(p.nama)}</div><div class="j">${esc(jab || '')}</div><div class="j">${esc(p.keuskupan)}</div><div class="acts">${p.adaWa ? `<a class="wa" target="_blank" rel="noopener" href="/api/wa?p=${esc(p.id)}">WhatsApp</a>` : ''}${p.email ? `<a class="wa em" href="mailto:${esc(p.email)}">Email</a>` : ''}</div></div></div>`;

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
  return `<div class="grid g4" style="margin-bottom:16px">${kpi('Program kerja', rows.length, { c: 'var(--navy)', t: 'var(--blue-t)', go: () => openDrill('Program kerja', rows, C.proker) })}${kpi('Anggaran dari BPN', 0, { c: '#9A6200', t: 'var(--amber-t)', go: () => openDrill('Program kerja berdasarkan anggaran', rows.filter((p) => p.anggaran).sort((a, b) => b.anggaran - a.anggaran), C.proker) }).replace('>0<', `>${rpShort(sum(rows, (p) => p.anggaran))}<`)}${kpi('Keuskupan dilayani', uniq(rows.flatMap((p) => p.penerima)).length, { c: '#0B8277', t: 'var(--teal-t)', go: () => openDrill('Keuskupan yang dilayani', count(rows, (p) => p.penerima).map((x) => ({ nama: x.label, n: x.value })), [['Keuskupan', (x) => `<b>${esc(x.nama)}</b>`], ['Jumlah program', (x) => x.n]]) })}${kpi('Memenuhi syarat ACC', ok, { c: '#13805A', t: 'var(--green-t)', note: S.pf.scope === 'resmi' ? 'Pelaksana BPK · Deal · ACC disetujui' : `${nf.format(rows.length - ok)} belum memenuhi`, go: () => openDrill('Program yang memenuhi syarat ACC', rows.filter(lolos), C.proker) })}</div>`;
}

/* ===== PAGES ===== */
const PAGES = {};

PAGES.dashboard = () => {
  const t = D.today, ym = t.slice(0, 7), now = new Date(t + 'T00:00:00');
  const k = D.kpis, running = D.proker.filter((p) => p.status === 'ON PROGRESS');
  const nextYm = (n) => { const d = new Date(now.getFullYear(), now.getMonth() + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
  const win = [nextYm(0), nextYm(1), nextYm(2)];
  const pym = (p) => (p.tahun && p.bulanIdx >= 0 ? `${p.tahun}-${String(p.bulanIdx + 1).padStart(2, '0')}` : '');
  const up = D.proker.filter((p) => win.includes(pym(p)) && p.acc === 'DISETUJUI' && !['SELESAI', 'DIBATALKAN'].includes(p.status));
  const byM = by(up, pym);
  const events = D.event.filter((e) => e.tanggal >= t && e.status !== 'Done').sort((a, b) => cmp(a.tanggal, b.tanggal));
  const lim = new Date(now.getTime() + 30 * 864e5).toISOString().slice(0, 10);
  const tasks = D.tugas.filter((x) => x.tenggat && x.tenggat >= t && x.tenggat <= lim && x.status !== 'Selesai').sort((a, b) => cmp(a.tenggat, b.tenggat));
  const dbox = (iso) => { const [, m, d] = iso.split('-'); return `<div class="date"><b>${+d}</b><span>${BLN3[+m - 1]}</span></div>`; };
  const fixed = [...events.map((e) => ({ d: e.tanggal, t: e.nama, s: 'Agenda BPN', tone: 'blue' })), ...tasks.map((x) => ({ d: x.tenggat, t: x.nama, s: `Tenggat tugas${x.seksi.length ? ' · ' + x.seksi[0] : ''}`, tone: 'coral' }))].sort((a, b) => cmp(a.d, b.d));
  const pLine = (p) => `<div class="tli prow" data-pid="${p.id}"><div style="flex:1;min-width:0"><div class="t">${esc(p.program || p.label)}${p.detil ? ` <span class="s">· ${esc(p.detil)}</span>` : ''}</div><div class="s">${p.penerima.length ? 'Dilayani: ' + esc(p.penerima.join(', ')) : 'Penerima belum diisi'}${p.pelaksana.length ? ' · Melayani: ' + esc(p.pelaksana.join(', ')) : ''}</div></div><div>${chip(p.metode || '—', 'blue')}</div></div>`;
  return `<div class="hero"><div><h2>Halo, ${esc((D.user.nama || '').split(' ')[0])} 👋</h2><p>${esc(fdate(t))} · Semoga pelayanan hari ini berbuah.</p></div></div>
  <div class="grid g4" style="margin-bottom:18px">
    ${kpi('BPK di Indonesia', k.bpk.now, { c: '#1F56C4', t: 'var(--blue-t)', delta: k.bpk, note: `dari ${k.bpk.total} keuskupan terdata`, go: () => openDrill('BPK di Indonesia', D.bpkList.filter((b) => b.aktif).sort((a, b) => cmp(a.nama, b.nama)), [['Keuskupan', (b) => `<b>${esc(b.nama)}</b>`], ['Status', (b) => esc(b.status || '–')]]) })}
    ${kpi('PDPKK terdaftar', k.pdpkk.now, { c: '#0B8277', t: 'var(--teal-t)', delta: k.pdpkk, go: () => openDrill('PDPKK terdaftar', [...D.pdpkk].sort((a, b) => cmp(a.keuskupan, b.keuskupan) || cmp(a.nama, b.nama)), C.pd) })}
    ${kpi('Pewarta pengajar terdaftar', k.pewarta ? k.pewarta.now : 0, { c: '#9A6200', t: 'var(--amber-t)', delta: k.pewarta || { now: 0, prev: 0 }, go: () => openDrill('Pewarta pengajar terdaftar', D.pewartaList || [], C.orang) })}
    ${kpi('Program sedang berjalan', running.length, { c: '#5B4CD1', t: 'var(--violet-t)', note: 'berstatus ON PROGRESS', go: () => openDrill('Program sedang berjalan', running, C.proker) })}
  </div>
  <div class="grid g2">
    <div class="card"><h3>Agenda terdekat<small>Tanggal pasti, 30 hari ke depan</small></h3>${fixed.length ? `<div class="tl">${fixed.map((x) => `<div class="tli">${dbox(x.d)}<div style="flex:1"><div class="t">${esc(x.t)}</div><div class="s">${esc(x.s)}</div></div>${chip(fdate(x.d), x.tone)}</div>`).join('')}</div>` : '<div class="empty">Belum ada agenda bertanggal dalam 30 hari ke depan.</div>'}
      <h3 style="margin-top:18px">Program kerja yang dijadwalkan<small>ACC disetujui, 3 bulan ke depan</small></h3>
      ${win.map((m) => `<div class="mh"><i></i>${monthLabel(m)} ${byM[m] ? chip(byM[m].length + ' program', 'blue') : ''}</div>${byM[m] ? byM[m].map(pLine).join('') : '<div class="empty" style="margin-bottom:6px">Tidak ada program terjadwal.</div>'}`).join('')}
    </div>
    <div class="card"><h3>Program kerja sedang berjalan</h3>${running.length ? running.map(pLine).join('') : `<div class="empty">Belum ada program berstatus ON PROGRESS.<br>Ubah status program di Airtable menjadi ON PROGRESS agar tampil di sini.</div>`}
      <h3 style="margin-top:18px">Ringkas<small>seluruh program kerja</small></h3>
      <div class="chips">${chip(D.proker.length + ' program', 'blue')}${chip(D.proker.filter((p) => p.status === 'SELESAI').length + ' selesai', 'green')}${chip(D.proker.filter((p) => p.status === 'BELUM DIMULAI').length + ' belum dimulai', 'gray')}${chip(D.proker.filter(lolos).length + ' memenuhi syarat ACC', 'teal')}${chip(rpShort(sum(D.proker, (p) => p.anggaran)) + ' anggaran', 'amber')}</div>
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

/* --- Pengurus --- */
PAGES.pengurus = () => {
  const rows = D.pengurus.filter((x) => x.orang.length);
  return `<div class="grid g4" style="margin-bottom:18px">${kpi('Pengurus BPN', rows.length, { c: '#5B4CD1', t: 'var(--violet-t)' })}${kpi('Keuskupan asal', uniq(rows.flatMap((x) => x.orang.map((o) => o.keuskupan)).filter(Boolean)).length, { c: '#0B8277', t: 'var(--teal-t)' })}</div>
  <div class="people">${rows.flatMap((x) => x.orang.map((o) => person(o, x.jabatan))).join('') || '<div class="empty">Belum ada data pengurus.</div>'}</div>`;
};

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
  return `<div class="grid g4" style="margin-bottom:16px">${kpi('PDPKK terdaftar', r.length, { c: '#0B8277', t: 'var(--teal-t)', delta: D.kpis.pdpkk, go: () => openDrill('PDPKK terdaftar', r, C.pd) })}${kpi('Keuskupan memiliki PD', uniq(r.map((x) => x.keuskupan).filter(Boolean)).length, { c: '#1F56C4', t: 'var(--blue-t)', go: () => openDrill('Keuskupan memiliki PD', count(r, (x) => x.keuskupan || '(kosong)').map((x) => ({ nama: x.label, n: x.value })), [['Keuskupan', (x) => `<b>${esc(x.nama)}</b>`], ['Jumlah PD', (x) => x.n]]) })}${kpi('Koordinator', uniq(r.flatMap((x) => x.koordinator.map((k) => k.id))).length, { c: '#9A6200', t: 'var(--amber-t)', go: () => openDrill('Koordinator PD', uniq(r.flatMap((x) => x.koordinator.map((k) => k.id))).map((id) => { const k = r.flatMap((x) => x.koordinator).find((z) => z.id === id); return { ...k, keuskupan: k.keuskupan || '' }; }), C.orang) })}${kpi('PD tanpa koordinator', r.filter((x) => !x.koordinator.length).length, { c: '#C2362B', t: 'var(--coral-t)', go: () => openDrill('PD tanpa koordinator', r.filter((x) => !x.koordinator.length), C.pd) })}</div>
  <div class="grid g2">${donut('Jenis PD', count(r, (x) => x.jenis || 'Belum diisi'), { rows: r, get: (x) => x.jenis || 'Belum diisi', cols: C.pd })}${bars('PD per keuskupan', count(r, (x) => x.keuskupan || '(kosong)'), { max: 15, drill: { rows: r, get: (x) => x.keuskupan || '(kosong)', cols: C.pd } })}</div>`;
};

/* --- Tim Kerja --- */
const timRows = () => { const f = S.tf, q = f.q.toLowerCase(); return D.tim.filter((x) => (!f.status || x.status === f.status) && (!f.kat || x.kategori === f.kat) && (!f.bidang || x.bidang.includes(f.bidang)) && (!q || ((x.orang?.nama || '') + ' ' + x.seksi.join(' ')).toLowerCase().includes(q))); };
const katTone = { 'BPN INTI': 'violet', 'BPN HARIAN': 'blue', 'TIM KERJA': 'teal' };
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
PAGES['tim/bagan'] = () => {
  const aktif = D.tim.filter((x) => (S.showDone || x.status === 'AKTIF') && x.orang);
  const top = D.pengurus.filter((x) => x.rank >= 70 && x.orang.length);
  const bd = by(aktif, (x) => x.bidang[0] || 'Seksi / Tim lain');
  const keys = Object.keys(bd).sort(cmp);
  const colours = ['#3B82F6', '#14B8A6', '#8B7CF6', '#F59E0B', '#EC6F8E', '#34C28A', '#38BDF8'];
  return `<div class="filters" style="justify-content:space-between"><div class="note"><b>${aktif.length}</b> orang aktif di tim BPN · ${keys.length} bidang</div><label style="display:flex;gap:8px;align-items:center;margin:0;font-size:13px"><input type="checkbox" id="done" style="width:auto" ${S.showDone ? 'checked' : ''}> Tampilkan yang sudah selesai</label></div>
  <div class="org"><div class="node"><img src="/logo.png" alt="">BPN PKKI</div><div class="vl"></div>
    <div class="rail">${top.flatMap((x) => x.orang.map((o) => `<div class="lead">${av(o.nama)}<div><small>${esc(x.jabatan)}</small><b>${esc(o.nama)}</b><small>${esc(o.keuskupan)}</small></div></div>`)).join('')}</div><div class="vl"></div>
    <div class="bidangs">${keys.map((b, i) => { const sk = by(bd[b], (x) => x.seksi[0] || 'Anggota'); return `<div class="bd"><header style="background:${colours[i % colours.length]}">${esc(b)}<small>${bd[b].length} orang</small></header>${Object.keys(sk).sort(cmp).map((s) => `<div class="sk"><h4>${esc(s)}</h4>${sk[s].sort((a, b) => cmp(a.orang.nama, b.orang.nama)).map((x) => `<div class="mem">${av(x.orang.nama)}<div style="min-width:0"><b>${esc(x.orang.nama)}</b><small>${esc(uniq([...x.jabatanBpn, ...x.jabatanBpk]).filter(Boolean).join(' · ') || x.kategori)} · ${esc(x.orang.keuskupan)}</small></div><span style="margin-left:auto">${chip(x.kategori, katTone[x.kategori] || 'gray')}</span></div>`).join('')}</div>`).join('')}</div>`; }).join('')}</div></div>`;
};

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
const canEditP = () => ['keuskupan', 'semua', 'ringkasan', 'acc'].some((t) => (D.perm['proker/' + t] || 0) >= 2);
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
  m.innerHTML = `<button data-a="detail">🔍 Lihat detail</button>${canEditP() ? '<button data-a="edit">✏️ Edit program</button>' : ''}`;
  document.body.appendChild(m);
  const w = m.offsetWidth, h = m.offsetHeight;
  m.style.left = Math.min(ev.clientX, innerWidth - w - 8) + 'px'; m.style.top = Math.min(ev.clientY, innerHeight - h - 8) + 'px';
  m.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; closeMenu(); (b.dataset.a === 'edit' ? openEdit : openDetail)(id); });
}
document.addEventListener('click', (e) => {
  const dd = e.target.closest('[data-dr]');
  if (dd && DR[+dd.dataset.dr]) { closeMenu(); return DR[+dd.dataset.dr](dd.dataset.l); }
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
    ${canEditP() ? '<div class="mact"><button class="btn" id="goedit">✏️ Edit program</button></div>' : ''}`, true);
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
function pejCard(x, big) {
  const o = x.orang;
  const photo = o.foto ? `<img class="ph${big ? ' big' : ''}" src="${esc(o.foto)}" alt="${esc(o.nama)}" loading="lazy">` : `<div class="av${big ? ' bigav' : ''}" style="background:${hue(o.nama)}">${esc(initials(o.nama))}</div>`;
  return `<div class="pej${big ? ' main' : ''}">${photo}<div class="pi"><b>${esc(o.nama)}</b><span>${esc(x.jabatan || '')}</span><div class="acts">${o.adaWa ? `<a class="wa" target="_blank" rel="noopener" href="/api/wa?p=${esc(o.id)}">💬 WhatsApp</a>` : ''}${o.email ? `<a class="wa em" href="mailto:${esc(o.email)}">✉ Email</a>` : ''}</div></div></div>`;
}
function openBpk(nama) {
  const b = PBmap()[nama];
  const dil = D.proker.filter((p) => p.penerima.includes(nama)), mel = D.proker.filter((p) => p.pelaksana.includes(nama));
  const koor = (b ? b.pejabat : []).filter((x) => x.koordinator), lain = (b ? b.pejabat : []).filter((x) => !x.koordinator);
  modal(`<h2>BPK ${esc(nama)}</h2><div class="chips" style="margin-bottom:12px">${chip(dil.length + ' program dilayani', 'blue')}${chip(mel.length + ' program dilaksanakan', 'teal')}</div>
    <h4>Koordinator BPK</h4>${koor.length ? koor.map((x) => pejCard(x, true)).join('') : '<div class="empty">Data koordinator belum tersedia.</div>'}
    ${lain.length ? `<h4>Pengurus BPK lainnya</h4><div class="pejs">${lain.map((x) => pejCard(x, false)).join('')}</div>` : ''}`, true);
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
  modal(`<h2>${judul}</h2><p>Berikan password sementara ini kepada pengguna. <b>Password hanya tampil sekali</b>.</p><div class="kvs">${row('Email', esc(j.email))}${row('Password', `<code class="pw">${esc(j.password)}</code>`)}</div><div class="mact"><button class="btn" id="cp">Salin password</button></div>`);
  $('#cp').onclick = () => { navigator.clipboard?.writeText(j.password); $('#cp').textContent = 'Tersalin ✓'; };
}
function openAkses(u) {
  const pre = ADM.presets[u.peran];
  const labelOf = (k) => { const [m, t] = k.split('/'); const mm = MENU.find((x) => x.id === m); return t ? '   ↳ ' + (mm.tabs.find((x) => x[0] === t) || [, t])[1] : mm.label; };
  const keys = Object.keys(ADM.tree).filter((m) => m !== 'admin').flatMap((m) => [m, ...ADM.tree[m].map((t) => `${m}/${t}`)]);
  const cur = (k) => (u.khusus[k] !== undefined ? u.khusus[k] : NAMES[pre[k]]);
  modal(`<h2>Hak akses: ${esc(u.nama)}</h2><p class="sub">Peran <b>${esc(u.peran)}</b>. Pilihan di bawah mengubah bawaan peran. Hak <i>Edit</i> saat ini berlaku untuk Program Kerja (mengubah data program).${u.peran === 'Koordinator BPK' ? ' Koordinator BPK hanya melihat data keuskupannya sendiri.' : ''}</p>
    <div class="tw"><table><thead><tr><th>Menu / tab</th><th>Bawaan peran</th><th>Hak akses</th></tr></thead><tbody>${keys.map((k) => `<tr><td style="white-space:pre"><b>${esc(labelOf(k))}</b></td><td class="sub">${LVL[NAMES[pre[k]]]}</td><td><select data-k="${k}">${NAMES.map((n) => `<option value="${n}"${cur(k) === n ? ' selected' : ''}>${LVL[n]}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div>
    <div class="err" id="ae"></div><div class="mact"><button class="ghost" id="ar">Kembalikan ke bawaan</button><button class="btn" id="as">Simpan</button></div>`, true);
  $('#ar').onclick = async () => { try { await admApi({ action: 'update', id: u.id, khusus: {} }); closeModal(); admReload(); } catch (e) { $('#ae').textContent = e.message; } };
  $('#as').onclick = async () => {
    const khusus = {}; document.querySelectorAll('#ov select[data-k]').forEach((s2) => { if (s2.value !== NAMES[pre[s2.dataset.k]]) khusus[s2.dataset.k] = s2.value; });
    try { await admApi({ action: 'update', id: u.id, khusus }); closeModal(); admReload(); } catch (e) { $('#ae').textContent = e.message; }
  };
}
PAGES['admin/pengguna'] = () => {
  if (!ADM) { fetch('/api/admin', { credentials: 'same-origin' }).then((r) => r.json()).then((j) => { if (j.error) throw new Error(j.error); ADM = j; render(); }).catch((e) => { $('#page').innerHTML = `<div class="empty">${esc(e.message || 'Gagal memuat')}</div>`; }); return '<div class="load"><div class="sp"></div><div>Memuat pengguna…</div></div>'; }
  const edit = (D.perm['admin/pengguna'] || 0) >= 2;
  setTimeout(() => {
    document.querySelectorAll('select[data-peran]').forEach((el) => el.addEventListener('change', async () => { try { await admApi({ action: 'update', id: el.dataset.peran, peran: el.value }); admReload(); } catch (e) { alert(e.message); admReload(); } }));
    document.querySelectorAll('input[data-aktif]').forEach((el) => el.addEventListener('change', async () => { try { await admApi({ action: 'update', id: el.dataset.aktif, aktif: el.checked }); admReload(); } catch (e) { alert(e.message); admReload(); } }));
    document.querySelectorAll('button[data-akses]').forEach((el) => el.addEventListener('click', () => openAkses(ADM.users.find((u) => u.id === el.dataset.akses))));
    document.querySelectorAll('button[data-reset]').forEach((el) => el.addEventListener('click', async () => { if (!confirm('Buat password sementara baru untuk pengguna ini?')) return; try { showPw(await admApi({ action: 'reset', id: el.dataset.reset }), 'Password baru'); } catch (e) { alert(e.message); } }));
    let sel = null;
    const q = $('#adq'), box = $('#adr');
    q?.addEventListener('input', () => { clearTimeout(q._t); sel = null; $('#adadd').disabled = true; if (q.value.trim().length < 2) { box.innerHTML = ''; return; } q._t = setTimeout(async () => { const j = await fetch('/api/admin?q=' + encodeURIComponent(q.value.trim()), { credentials: 'same-origin' }).then((r) => r.json()).catch(() => ({ orang: [] })); box.innerHTML = (j.orang || []).map((o) => `<button type="button" class="opt" data-e="${esc(o.email)}" data-n="${esc(o.nama)}"><b>${esc(o.nama)}</b> <span class="sub">${esc(o.email)}</span></button>`).join('') || '<div class="sub">Tidak ada yang cocok (email harus terdaftar di M-Person).</div>'; box.querySelectorAll('.opt').forEach((b2) => b2.addEventListener('click', () => { sel = b2.dataset.e; q.value = `${b2.dataset.n} <${sel}>`; box.innerHTML = ''; $('#adadd').disabled = false; })); }, 300); });
    $('#adadd')?.addEventListener('click', async () => { if (!sel) return; $('#adadd').disabled = true; try { const j = await admApi({ action: 'create', email: sel, peran: $('#adp').value }); showPw(j, 'Pengguna ditambahkan'); admReload(); } catch (e) { $('#ade').textContent = e.message; $('#adadd').disabled = false; } });
  });
  const tgl = (u) => `${esc(u.nama)}<div class="sub">${esc(u.email)}</div>`;
  return `${edit ? `<div class="card" style="margin-bottom:16px"><h3>Tambah pengguna<small>pilih dari M-Person (email harus terdaftar)</small></h3><div class="filters" style="margin:0"><div class="q" style="position:relative"><label>Cari nama / email</label><input id="adq" autocomplete="off" placeholder="Ketik minimal 2 huruf…"><div id="adr" class="sres"></div></div><div><label>Peran</label><select id="adp">${ADM.peran.map((x) => `<option>${esc(x)}</option>`).join('')}</select></div><div style="flex:none;align-self:end"><button class="btn" id="adadd" disabled>Tambah</button></div></div><div class="err" id="ade"></div></div>` : ''}
  <div class="card"><h3>Pengguna<small>${ADM.users.length} akun</small></h3><div class="tw"><table><thead><tr><th>Pengguna</th><th>Peran</th><th>Aktif</th><th>Terakhir masuk</th><th></th></tr></thead><tbody>${ADM.users.map((u) => `<tr><td>${tgl(u)}</td><td>${edit ? `<select data-peran="${u.id}">${ADM.peran.map((x) => `<option${x === u.peran ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>` : esc(u.peran)}${Object.keys(u.khusus).length ? ` ${chip('akses khusus', 'amber')}` : ''}</td><td><input type="checkbox" data-aktif="${u.id}" ${u.aktif ? 'checked' : ''} ${edit ? '' : 'disabled'} style="width:auto"></td><td class="sub">${u.lastLogin ? esc(new Date(u.lastLogin).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })) : '–'}</td><td style="white-space:nowrap"><button class="ghost" data-akses="${u.id}">Hak akses</button> ${edit ? `<button class="ghost" data-reset="${u.id}">Reset password</button>` : ''}</td></tr>`).join('')}</tbody></table></div>
  <p class="note" style="margin-top:12px"><b>Peran:</b> Admin (semua + administrasi) · Editor BPN (semua menu, boleh edit) · Pengurus BPN Harian (semua menu, hanya lihat) · Koordinator BPK (hanya program, PD, dan data keuskupannya + data Pengurus BPN) · Pengamat (hanya lihat).</p></div>`;
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
const tabsOf = (m) => (m.tabs ? m.tabs.filter(([id]) => (D.perm[`${m.id}/${id}`] || 0) >= 1) : []);
const visible = () => MENU.filter((m) => (m.tabs ? tabsOf(m).length : (D.perm[m.id] || 0) >= 1));
function route() { const ms = visible(); const [m = 'dashboard', t] = location.hash.replace(/^#\/?/, '').split('/'); const menu = ms.find((x) => x.id === m) || ms[0]; if (!menu) return { menu: null, tab: null, tabs: [] }; const tabs = tabsOf(menu); return { menu, tabs, tab: menu.tabs ? (tabs.find((x) => x[0] === t) || tabs[0])[0] : null }; }
function render() {
  if (!D) return;
  DR = [];
  const { menu, tab, tabs } = route();
  if (!menu) { $('#nav').innerHTML = ''; $('#page').innerHTML = '<div class="empty">Akun Anda belum diberi akses ke menu apa pun. Hubungi Admin BPN.</div>'; return; }
  $('#nav').innerHTML = visible().map((m) => `<a href="#/${m.id}" class="${m.id === menu.id ? 'on' : ''}"><svg viewBox="0 0 24 24">${m.icon}</svg>${esc(m.label)}${m.id === menu.id ? '' : `<span class="dot" style="background:${m.c}"></span>`}</a>`).join('');
  $('#ptitle').textContent = menu.label; $('#psub').textContent = menu.sub;
  $('#tabs').innerHTML = menu.tabs ? tabs.map(([id, l]) => `<a href="#/${menu.id}/${id}" class="${id === tab ? 'on' : ''}">${esc(l)}</a>`).join('') : '';
  const fn = PAGES[tab ? `${menu.id}/${tab}` : menu.id];
  $('#page').innerHTML = fn ? fn() : '<div class="empty">Halaman tidak ditemukan.</div>';
  $('#done')?.addEventListener('change', (e) => { S.showDone = e.target.checked; render(); });
  $('#side').classList.remove('open');
  document.title = `${menu.label} · BPN PKKI`;
}
async function load(refresh) {
  const r = await fetch('/api/data' + (refresh ? '?refresh=1' : ''), { credentials: 'same-origin' });
  if (r.status === 401) return showLogin();
  if (r.status === 403) { const j = await r.clone().json().catch(() => ({})); if (j.mustChange) { $('#login').classList.add('hide'); $('#app').classList.add('hide'); return showChangePw(true); } }
  if (!r.ok) { $('#login').classList.add('hide'); $('#app').classList.remove('hide'); $('#page').innerHTML = '<div class="empty">Gagal memuat data. Coba muat ulang.</div>'; return; }
  D = await r.json(); if (refresh) { R = null; ADM = null; }
  $('#login').classList.add('hide'); $('#app').classList.remove('hide');
  $('#mename').textContent = D.user.nama; $('#melevel').textContent = D.user.level; $('#meav').style.background = hue(D.user.nama); $('#meav').textContent = initials(D.user.nama);
  render();
}
function showLogin() { $('#app').classList.add('hide'); $('#login').classList.remove('hide'); D = null; R = null; }
window.addEventListener('hashchange', render);
$('#lf').addEventListener('submit', async (ev) => {
  ev.preventDefault(); $('#le').textContent = ''; $('#lb').disabled = true;
  try {
    const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ email: $('#email').value, password: $('#pw').value }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) $('#le').textContent = j.error || 'Gagal masuk'; else { $('#pw').value = ''; await load(); }
  } catch { $('#le').textContent = 'Koneksi bermasalah'; }
  $('#lb').disabled = false;
});
$('#rf').onclick = async () => { $('#rf').disabled = true; $('#rf').textContent = 'Memuat…'; await load(true); $('#rf').disabled = false; $('#rf').textContent = 'Muat ulang'; };
$('#lo').onclick = async () => { await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }); showLogin(); };
$('#pwbtn')?.addEventListener('click', () => showChangePw(false));
$('#burger').onclick = () => $('#side').classList.toggle('open');
(async () => {
  const inv = new URLSearchParams(location.search).get('invite');
  if (inv) {
    history.replaceState(null, '', location.pathname + location.hash);
    try {
      const r = await fetch('/api/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ token: inv }) });
      if (!r.ok) { const j = await r.json().catch(() => ({})); showLogin(); $('#le').textContent = j.error || 'Tautan undangan tidak valid'; return; }
    } catch { /* lanjut ke login biasa */ }
  }
  load();
})();
