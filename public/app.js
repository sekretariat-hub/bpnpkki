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

/* ===== state ===== */
let D = null, R = null; // data, laporan
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
};
const MENU = [
  { id: 'dashboard', label: 'Dashboard', icon: I.home, sub: 'Agenda terdekat dan angka kunci', c: '#3B82F6' },
  { id: 'proker', label: 'Program Kerja', icon: I.clip, sub: 'Program kerja BPN untuk Keuskupan', c: '#F5A524', tabs: [['keuskupan', 'Per Keuskupan'], ['semua', 'Semua Program'], ['ringkasan', 'Ringkasan & Grafik'], ['acc', 'Syarat ACC']] },
  { id: 'pengurus', label: 'Pengurus BPN', icon: I.star, sub: 'Susunan pengurus BPN', c: '#8B7CF6' },
  { id: 'pd', label: 'Koordinator PD', icon: I.pd, sub: 'Persekutuan Doa dan koordinatornya', c: '#14B8A6', tabs: [['daftar', 'Daftar PD'], ['ringkasan', 'Ringkasan']] },
  { id: 'tim', label: 'Tim Kerja BPN', icon: I.team, sub: 'Siapa saja yang bertugas di BPN', c: '#FF7A6B', tabs: [['bagan', 'Bagan Tim Aktif'], ['daftar', 'Daftar Tim Kerja']] },
  { id: 'laporan', label: 'Laporan', icon: I.chart, sub: 'Ringkasan kegiatan', c: '#34C28A', tabs: [['pleno', 'Pleno & Golden Jubilee'], ['tc', 'TC SHDR'], ['kepemudaan', 'Kepemudaan']] },
];

/* ===== komponen ===== */
function bars(title, list, { max = 10, colour } = {}) {
  list = (list || []).slice(0, max);
  const mx = Math.max(1, ...list.map((x) => x.value));
  const body = list.length ? list.map((x, i) => `<div class="bar"><div class="l" title="${esc(x.label)}">${esc(x.label)}</div><div class="b"><i style="width:${(x.value / mx) * 100}%;background:${colour || PAL[i % PAL.length]}"></i></div><div class="v">${x.fmt || nf.format(x.value)}</div></div>`).join('') : '<div class="empty">Belum ada data</div>';
  return `<div class="card"><h3>${esc(title)}</h3>${body}</div>`;
}
function donut(title, list) {
  const tot = sum(list, (x) => x.value);
  let acc = 0;
  const stops = list.map((x, i) => { const a = acc / (tot || 1) * 100; acc += x.value; return `${PAL[i % PAL.length]} ${a}% ${acc / (tot || 1) * 100}%`; }).join(',');
  return `<div class="card"><h3>${esc(title)}</h3>${tot ? `<div class="donut"><div class="ring" data-c="${nf.format(tot)}" style="background:conic-gradient(${stops})"></div><div class="lg">${list.map((x, i) => `<div><i style="background:${PAL[i % PAL.length]}"></i>${esc(x.label)}<b>${nf.format(x.value)}</b></div>`).join('')}</div></div>` : '<div class="empty">Belum ada data</div>'}</div>`;
}
function columns(title, list) {
  const mx = Math.max(1, ...list.map((x) => x.value));
  return `<div class="card"><h3>${esc(title)}</h3><div class="cols">${list.map((x, i) => `<div class="c"><b>${x.value || ''}</b><i style="height:${Math.max(4, (x.value / mx) * 120)}px;background:${PAL[i % PAL.length]}"></i><span>${esc(x.label)}</span></div>`).join('')}</div></div>`;
}
const count = (arr, fn, { split = false } = {}) => {
  const m = {}; arr.forEach((x) => { let v = fn(x); v = Array.isArray(v) ? v : [v]; (v.length ? v : ['(kosong)']).forEach((k) => { k = k || '(kosong)'; m[k] = (m[k] || 0) + 1; }); });
  return Object.entries(m).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
};
const kpi = (label, n, { c = 'var(--navy)', t = 'var(--blue-t)', delta, note } = {}) => {
  let d = '';
  if (delta) { const diff = delta.now - delta.prev; d = diff > 0 ? `<div class="d up">▲ +${nf.format(diff)} dari bulan lalu</div>` : diff < 0 ? `<div class="d down">▼ ${nf.format(diff)} dari bulan lalu</div>` : '<div class="d flat">● Sama dengan bulan lalu</div>'; }
  return `<div class="card kpi" style="--c:${c};--t:${t}"><div class="l">${esc(label)}</div><div class="n">${nf.format(n)}</div>${d}${note ? `<div class="note">${esc(note)}</div>` : ''}</div>`;
};
const person = (p, jab) => `<div class="card pc">${av(p.nama)}<div style="min-width:0"><div class="n">${esc(p.nama)}</div><div class="j">${esc(jab || '')}</div><div class="j">${esc(p.keuskupan)}</div>${p.wa ? `<a class="wa" target="_blank" rel="noopener" href="https://wa.me/${esc(p.wa.replace(/\D/g, ''))}">WhatsApp</a>` : ''}</div></div>`;

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
  return `<div class="grid g4" style="margin-bottom:16px">${kpi('Program kerja', rows.length, { c: 'var(--navy)', t: 'var(--blue-t)' })}${kpi('Anggaran dari BPN', 0, { c: '#9A6200', t: 'var(--amber-t)' }).replace('>0<', `>${rpShort(sum(rows, (p) => p.anggaran))}<`)}${kpi('Keuskupan dilayani', uniq(rows.flatMap((p) => p.penerima)).length, { c: '#0B8277', t: 'var(--teal-t)' })}${kpi('Memenuhi syarat ACC', ok, { c: '#13805A', t: 'var(--green-t)', note: S.pf.scope === 'resmi' ? 'Pelaksana BPK · Deal · ACC disetujui' : `${nf.format(rows.length - ok)} belum memenuhi` })}</div>`;
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
  const pLine = (p) => `<div class="tli"><div style="flex:1;min-width:0"><div class="t">${esc(p.program || p.label)}${p.detil ? ` <span class="s">· ${esc(p.detil)}</span>` : ''}</div><div class="s">${p.penerima.length ? 'Dilayani: ' + esc(p.penerima.join(', ')) : 'Penerima belum diisi'}${p.pelaksana.length ? ' · Melayani: ' + esc(p.pelaksana.join(', ')) : ''}</div></div><div>${chip(p.metode || '—', 'blue')}</div></div>`;
  return `<div class="hero"><div><h2>Halo, ${esc((D.user.nama || '').split(' ')[0])} 👋</h2><p>${esc(fdate(t))} · Semoga pelayanan hari ini berbuah.</p></div></div>
  <div class="grid g4" style="margin-bottom:18px">
    ${kpi('BPK di Indonesia', k.bpk.now, { c: '#1F56C4', t: 'var(--blue-t)', delta: k.bpk, note: `dari ${k.bpk.total} keuskupan terdata` })}
    ${kpi('PDPKK terdaftar', k.pdpkk.now, { c: '#0B8277', t: 'var(--teal-t)', delta: k.pdpkk })}
    ${kpi('Pewarta pengajar terdaftar', k.pewarta ? k.pewarta.now : 0, { c: '#9A6200', t: 'var(--amber-t)', delta: k.pewarta || { now: 0, prev: 0 } })}
    ${kpi('Program sedang berjalan', running.length, { c: '#5B4CD1', t: 'var(--violet-t)', note: 'berstatus ON PROGRESS' })}
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
  return `<div class="tw"><table><thead><tr><th>Waktu</th><th>Program</th><th>${role === 'penerima' ? 'Dilayani oleh' : 'Melayani'}</th><th>Metode</th><th>Sumber dana</th><th class="num">Anggaran</th><th>Status</th></tr></thead><tbody>${entries.map(({ p, share }) => `<tr><td class="sub" style="white-space:nowrap"><b style="color:var(--ink)">${esc(waktu(p))}</b></td><td><b>${esc(p.program || p.label)}</b>${p.detil ? `<div class="sub">${esc(p.detil)}</div>` : ''}${p.catatan ? `<div class="sub">📝 ${esc(p.catatan)}</div>` : ''}<div class="sub">${esc(p.seksi.join(', '))}</div></td><td>${esc((role === 'penerima' ? p.pelaksana : p.penerima).join(', ') || (p.pelaksanaTipe === 'BPN' ? 'BPN' : '–'))}</td><td>${esc(p.metode || '–')}</td><td class="sub">${esc(p.sumberDana || '–')}</td><td class="num">${rp(share)}</td><td>${stChips(p)}</td></tr>`).join('')}</tbody></table></div>`;
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
    $('#res').innerHTML = prokerKpis(rows) + `<div class="tw"><table><thead><tr>${cols.map(([k, l]) => `<th class="${k ? 's' : ''}" data-k="${k}">${l}${S.sort.k === k ? (S.sort.d > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr></thead><tbody>${rows.map((p) => `<tr><td style="white-space:nowrap"><b>${esc(waktu(p))}</b></td><td><b>${esc(p.program || p.label)}</b>${p.detil ? `<div class="sub">${esc(p.detil)}</div>` : ''}${p.catatan ? `<div class="sub">📝 ${esc(p.catatan)}</div>` : ''}</td><td>${esc(p.penerima.join(', ') || '–')}</td><td>${esc(p.pelaksana.join(', ') || (p.pelaksanaTipe === 'BPN' ? 'BPN' : '–'))}</td><td>${esc(p.metode || '–')}</td><td class="num">${rp(p.anggaran)}</td><td>${stChips(p)}</td></tr>`).join('') || '<tr><td colspan="7"><div class="empty">Tidak ada program yang sesuai filter.</div></td></tr>'}</tbody></table></div>`;
    document.querySelectorAll('th.s').forEach((th) => th.addEventListener('click', () => { S.sort = { k: th.dataset.k, d: S.sort.k === th.dataset.k ? -S.sort.d : 1 }; draw(); }));
  };
  setTimeout(() => { bindFilters(draw); draw(); });
  return pfBar(false) + '<div id="res"></div>';
};
PAGES['proker/ringkasan'] = () => {
  const draw = () => {
    const rows = filtered();
    const perYm = Object.entries(by(rows.filter((p) => p.tahun && p.bulanIdx >= 0), (p) => `${p.tahun}-${String(p.bulanIdx + 1).padStart(2, '0')}`)).sort(([a], [b]) => cmp(a, b)).map(([k, v]) => ({ label: `${BLN3[+k.slice(5) - 1]} ${k.slice(2, 4)}`, value: v.length }));
    const ang = Object.entries(by(rows.flatMap((p) => rowsFor(p, 'penerima')), (e) => e.k)).map(([label, v]) => ({ label, value: sum(v, (e) => e.share), fmt: rpShort(sum(v, (e) => e.share)) })).sort((a, b) => b.value - a.value);
    $('#res').innerHTML = prokerKpis(rows) + `<div class="grid g2">${columns('Program per bulan', perYm)}${donut('Status pelaksanaan', count(rows, (p) => p.status || 'Belum diisi'))}${donut('Status ACC', count(rows, (p) => p.acc || 'Belum ACC'))}${donut('Metode pelaksanaan', count(rows, (p) => p.metode || 'Belum diisi'))}${bars('Seksi penanggung jawab', count(rows, (p) => p.seksi))}${bars('Jenis kegiatan', count(rows, (p) => p.jenis))}${bars('Sumber dana', count(rows, (p) => p.sumberDana || 'Belum diisi'))}${bars('Anggaran per keuskupan yang dilayani', ang, { max: 12 })}${bars('Keuskupan yang melayani', count(rows.filter((p) => p.pelaksana.length), (p) => p.pelaksana), { max: 12 })}${bars('Program terkait modul berjenjang', count(rows.filter((p) => p.modul.length), (p) => p.modul), { max: 12 })}</div>`;
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
  <div class="people">${rows.flatMap((x) => x.orang.map((o) => person(o, x.jabatan))).join('') || '<div class="empty">Belum ada data pengurus.</div>'}</div>${D.user.level !== 'Admin' ? '<p class="note" style="margin-top:14px">Nomor WhatsApp hanya tampil untuk Admin.</p>' : ''}`;
};

/* --- Koordinator PD --- */
const pdRows = () => { const f = S.pdf, q = f.q.toLowerCase(); return D.pdpkk.filter((x) => (!f.kus || x.keuskupan === f.kus) && (!f.jenis || x.jenis === f.jenis) && (!q || (x.nama + ' ' + x.koordinator.map((k) => k.nama).join(' ') + ' ' + x.keuskupan).toLowerCase().includes(q))); };
PAGES['pd/daftar'] = () => {
  const draw = () => {
    const rows = pdRows().sort((a, b) => cmp(a.keuskupan, b.keuskupan) || cmp(a.nama, b.nama));
    $('#res').innerHTML = `<div class="note" style="margin-bottom:8px">${rows.length} PD</div><div class="tw"><table><thead><tr><th>Nama PD</th><th>Keuskupan</th><th>Jenis</th><th>Koordinator</th><th class="num">Umat</th></tr></thead><tbody>${rows.map((x) => `<tr><td><b>${esc(x.nama)}</b></td><td>${esc(x.keuskupan || '–')}</td><td>${chip(x.jenis || '–', x.jenis?.includes('Anak') ? 'amber' : x.jenis?.includes('Muda') ? 'teal' : 'blue')}</td><td>${x.koordinator.map((k) => `<div>${esc(k.nama)} ${k.wa ? `<a class="wa" target="_blank" rel="noopener" href="https://wa.me/${esc(k.wa.replace(/\D/g, ''))}">WA</a>` : ''}</div>`).join('') || '<span class="sub">–</span>'}</td><td class="num">${x.jumlahUmat || '–'}</td></tr>`).join('') || '<tr><td colspan="5"><div class="empty">Tidak ada PD yang sesuai.</div></td></tr>'}</tbody></table></div>`;
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
  return `<div class="grid g4" style="margin-bottom:16px">${kpi('PDPKK terdaftar', r.length, { c: '#0B8277', t: 'var(--teal-t)', delta: D.kpis.pdpkk })}${kpi('Keuskupan memiliki PD', uniq(r.map((x) => x.keuskupan).filter(Boolean)).length, { c: '#1F56C4', t: 'var(--blue-t)' })}${kpi('Koordinator', uniq(r.flatMap((x) => x.koordinator.map((k) => k.id))).length, { c: '#9A6200', t: 'var(--amber-t)' })}${kpi('PD tanpa koordinator', r.filter((x) => !x.koordinator.length).length, { c: '#C2362B', t: 'var(--coral-t)' })}</div>
  <div class="grid g2">${donut('Jenis PD', count(r, (x) => x.jenis || 'Belum diisi'))}${bars('PD per keuskupan', count(r, (x) => x.keuskupan || '(kosong)'), { max: 15 })}</div>`;
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
PAGES['laporan/pleno'] = lap((r) => { const e = r.pleno; return `<div class="grid g4" style="margin-bottom:16px">${kpi('Data masuk', e.total, { c: '#1F56C4', t: 'var(--blue-t)' })}${kpi('Hadir', find(e.kehadiran, /^HADIR$/i), { c: '#13805A', t: 'var(--green-t)' })}${kpi('Tidak hadir', find(e.kehadiran, /TIDAK/i), { c: '#C2362B', t: 'var(--coral-t)' })}${kpi('Belum mengisi', find(e.kehadiran, /BELUM/i), { c: '#9A6200', t: 'var(--amber-t)' })}${kpi('Pasangan butuh kamar', e.pasangan, { c: '#5B4CD1', t: 'var(--violet-t)' })}${kpi('Pastor', e.pastor, { c: '#0B8277', t: 'var(--teal-t)' })}</div><div class="grid g2">${donut('Status kehadiran', e.kehadiran)}${donut('Kelengkapan foto', e.kelengkapanFoto)}${bars('Kategori penugasan BPN', e.kategori)}${bars('Dukungan transportasi', e.transportasi)}${bars('Jadwal kedatangan', e.kedatangan)}${bars('Membawa pasangan', e.bawaPasangan)}</div>`; });
PAGES['laporan/tc'] = lap((r) => { const t = r.tc; return `<div class="grid g4" style="margin-bottom:16px">${kpi('Pendaftar', t.pendaftar, { c: '#1F56C4', t: 'var(--blue-t)' })}${kpi('Kelompok', t.kelompok, { c: '#0B8277', t: 'var(--teal-t)' })}${kpi('Mentor', t.mentor, { c: '#9A6200', t: 'var(--amber-t)' })}</div><div class="grid g2">${donut('Status pendaftaran', t.statusTC)}${donut('Status SHDR', t.statusSHDR)}${donut('Verifikasi data', t.verifikasi)}${donut('Kelompok usia', t.kelompokUsia)}${donut('Jenis kelamin', t.jenisKelamin)}${bars('Kategori mentor', t.kategoriMentor)}${bars('Pendaftar per keuskupan', t.perKeuskupan, { max: 25 })}</div>`; });
PAGES['laporan/kepemudaan'] = lap((r) => { const k = r.kepemudaan; return `<div class="grid g4" style="margin-bottom:16px">${kpi('BPK aktif', k.bpkAktif, { c: '#1F56C4', t: 'var(--blue-t)' })}${kpi('Sudah punya PIC', k.bpkPunyaPIC, { c: '#13805A', t: 'var(--green-t)' })}${kpi('Belum punya PIC', k.bpkBelumPIC, { c: '#C2362B', t: 'var(--coral-t)' })}${kpi('PDPKK terdata', k.pdpkkTotal, { c: '#0B8277', t: 'var(--teal-t)' })}</div><div class="grid g2">${donut('Jenis PDPKK', k.pdpkkJenis)}${bars('Status peserta TC per BPK', k.statusPesertaTC)}</div>`; });

/* ===== router ===== */
function route() { const [m = 'dashboard', t] = location.hash.replace(/^#\/?/, '').split('/'); const menu = MENU.find((x) => x.id === m) || MENU[0]; return { menu, tab: menu.tabs ? (menu.tabs.find((x) => x[0] === t) || menu.tabs[0])[0] : null }; }
function render() {
  if (!D) return;
  const { menu, tab } = route();
  $('#nav').innerHTML = MENU.map((m) => `<a href="#/${m.id}" class="${m.id === menu.id ? 'on' : ''}"><svg viewBox="0 0 24 24">${m.icon}</svg>${esc(m.label)}${m.id === menu.id ? '' : `<span class="dot" style="background:${m.c}"></span>`}</a>`).join('');
  $('#ptitle').textContent = menu.label; $('#psub').textContent = menu.sub;
  $('#tabs').innerHTML = menu.tabs ? menu.tabs.map(([id, l]) => `<a href="#/${menu.id}/${id}" class="${id === tab ? 'on' : ''}">${esc(l)}</a>`).join('') : '';
  const fn = PAGES[tab ? `${menu.id}/${tab}` : menu.id];
  $('#page').innerHTML = fn ? fn() : '<div class="empty">Halaman tidak ditemukan.</div>';
  $('#done')?.addEventListener('change', (e) => { S.showDone = e.target.checked; render(); });
  $('#side').classList.remove('open');
  document.title = `${menu.label} · BPN PKKI`;
}
async function load(refresh) {
  const r = await fetch('/api/data' + (refresh ? '?refresh=1' : ''), { credentials: 'same-origin' });
  if (r.status === 401) return showLogin();
  if (!r.ok) { $('#login').classList.add('hide'); $('#app').classList.remove('hide'); $('#page').innerHTML = '<div class="empty">Gagal memuat data. Coba muat ulang.</div>'; return; }
  D = await r.json(); if (refresh) R = null;
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
$('#burger').onclick = () => $('#side').classList.toggle('open');
load();
