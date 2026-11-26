// Administrasi pengguna (hanya Admin).
const crypto = require('crypto');
const { fetchAll, update, create } = require('../lib/airtable');
const { getSession, hashPassword, reissueSession } = require('../lib/auth');
const { T, F } = require('../lib/users');
const A = require('../lib/access');
const R = require('../lib/roles');
const { create: mk, update: up } = require('../lib/airtable');
const { waDigits, mask } = require('../lib/phone');
const { kirimWa } = require('../lib/wa');
const { newToken, hashToken, TTL } = require('../lib/invite');
const pesanUndangan = (nama, peran, link) => `Shalom ${String(nama).split(' ')[0]},\n\nAnda diundang ke *Sistem Informasi BPN PKKI* sebagai ${peran}.\n\nBuka tautan ini untuk masuk (berlaku 14 hari, sekali pakai):\n${link}\n\nSetelah masuk, Anda diminta membuat password. Berikutnya Anda masuk dengan nomor WhatsApp ini + password tersebut di ${link.split('/?')[0]}\n\nJangan bagikan tautan ini kepada orang lain.`;
async function kirimUndangan(wa, nama, peran, link) {
  try { await kirimWa(wa, pesanUndangan(nama, peran, link)); return { terkirim: true }; }
  catch (e) { return { terkirim: false, galat: e.code === 'NOKEY' ? 'Pengiriman WhatsApp belum diaktifkan di server (BABLAST_API_KEY)' : String(e.message).slice(0, 200) }; }
}
const inv = (req) => { const t = newToken(); return { t, link: `https://${req.headers.host}/?invite=${t}`, f: { [F.tokenHash]: hashToken(t), [F.tokenExp]: Date.now() + TTL, [F.mustChange]: true } }; };

const PERSON = 'tbl21zOSogH7Anlu2';
const PF = { nama: 'fldVU2gofcKEhWHmB', email: 'fldhjOTrQfLGC6hWj', dom: 'fldwJ7RnXW1nLaOcv', wa: 'fldGsFt4GflTXoTa0' };
const nm = (v) => (v && v.name) || v || '';
const qs = (s) => String(s).replace(/\\/g, '').replace(/'/g, "\\'");
const temp = () => { const c = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from(crypto.randomBytes(10), (b) => c[b % c.length]).join(''); };

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const s = getSession(req);
  // "Login sebagai" (khusus Super Admin). Ditangani sebelum pemeriksaan hak karena saat mode aktif, hak sesi = hak pengguna yang dilihat.
  if (s && req.method === 'POST') {
    const b0 = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } })() : req.body || {};
    if (['imp', 'impedit', 'impstop'].includes(b0.action)) {
      try {
        const real = await A.getAccess({ rid: s.rid, email: s.email });
        if (!real || !real.superAdmin) return res.status(403).json({ error: 'Hanya Super Admin' });
        if (b0.action === 'impstop') { reissueSession(res, s, null); console.log('LOGIN-SEBAGAI selesai', real.email); return res.json({ ok: true }); }
        if (b0.action === 'impedit') { if (!s.as) return res.status(400).json({ error: 'Mode Login sebagai tidak aktif' }); reissueSession(res, s, s.as, !!b0.edit); return res.json({ ok: true }); }
        const id = String(b0.id || '');
        if (!/^rec[A-Za-z0-9]{14}$/.test(id) || id === real.id) return res.status(400).json({ error: 'Pengguna tidak valid' });
        const t = await A.getAccess({ rid: id, email: '' }).catch(() => null);
        if (!t) return res.status(404).json({ error: 'Pengguna tidak ditemukan atau tidak aktif' });
        if (t.superAdmin) return res.status(400).json({ error: 'Tidak bisa melihat sebagai Super Admin lain' });
        reissueSession(res, s, id, true);
        console.log('LOGIN-SEBAGAI mulai', real.email, '->', t.email || t.nama, id);
        return res.json({ ok: true, nama: t.nama });
      } catch (e) { console.error('imp error', e.message); return res.status(502).json({ error: 'Gagal memproses' }); }
    }
  }
  const acc = s && (await A.getAccess(s).catch(() => null));
  if (!acc) return res.status(401).json({ error: 'Belum login' });
  if (!A.can(acc, 'admin', 1)) return res.status(403).json({ error: 'Hanya Admin' });
  try {
    if (req.method === 'GET') {
      const q = String(req.query.q || '').trim();
      if (q) {
        const rows = await fetchAll(PERSON, [PF.nama, PF.email, PF.wa], { filterByFormula: `AND(LEN({Whatsapp})>0, SEARCH('${qs(q.toLowerCase())}', LOWER({Nama Lengkap})))`, maxRecords: '15' });
        return res.json({ orang: rows.map((r) => ({ id: r.id, nama: r.fields[PF.nama] || '', email: String(r.fields[PF.email] || '').toLowerCase(), wa: mask(waDigits(r.fields[PF.wa])) })).filter((o) => o.wa !== '****') });
      }
      R.invalidate();
      const [rows, roles, tim, seksi] = await Promise.all([fetchAll(T, [...Object.values(F), A.FX.peran, A.FX.manual]), R.loadRoles(), R.loadTim(), R.daftarSeksi().catch(() => [])]);
      const custom = roles.filter((r) => !R.SISTEM.includes(r.nama));
      const names = [...R.SISTEM, ...custom.map((r) => r.nama)];
      const users = rows.map((r) => {
        const f = r.fields, person = /^rec/.test(f[F.person] || '') ? f[F.person] : '';
        const own = nm(f[A.FX.peran]) || (nm(f[F.level]) === 'Admin' ? 'Admin' : '');
        const manual = [...new Set([own, ...A.listOf(f[A.FX.manual])].filter((x) => names.includes(x)))];
        const auto = R.autoRoles(roles, tim, person).filter((x) => !manual.includes(x));
        return { id: r.id, email: f[F.email] || '', wa: mask(waDigits(f[F.wa])), nama: f[F.nama] || '', aktif: !!f[F.aktif], pending: !f[F.disetujui], roles: manual, auto, lastLogin: f[F.lastLogin] || '', person };
      }).sort((x, y) => x.nama.localeCompare(y.nama, 'id'));
      const list = names.map((n) => { const r = roles.find((x) => x.nama === n) || {}; const m = A.mapOf(n, roles); return { id: r.id || '', nama: n, sistem: R.SISTEM.includes(n), terkunci: R.ADMIN_ROLES.includes(n), hak: Object.fromEntries(Object.entries(m).map(([k, v]) => [k, A.NAME[v]])), cakupan: r.cakupan || (A.NASIONAL.includes(n) ? 'Nasional' : 'Terbatas'), seksi: r.seksi || '', tingkat: r.tingkat || '', kat: r.kat || '', desk: r.desk || '', pakai: users.filter((u) => u.roles.includes(n) || u.auto.includes(n)).length, diubah: !!(r.hak && Object.keys(r.hak).length) }; });
      return res.json({ tree: A.TREE, roles: list, seksi, users, superAdmin: !!acc.superAdmin });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' });
    if (!A.can(acc, 'admin', 2)) return res.status(403).json({ error: 'Tidak punya hak mengubah' });
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    if (b.action === 'create') {
      const pid = String(b.personId || '');
      const rl = (Array.isArray(b.roles) ? b.roles : [b.peran]).filter(Boolean);
      const known = new Set([...R.SISTEM, ...(await R.loadRoles()).map((r) => r.nama)]);
      if (!/^rec[A-Za-z0-9]{14}$/.test(pid) || !rl.length || !rl.every((x) => known.has(x))) return res.status(400).json({ error: 'Pilih orang dan minimal satu role' });
      const ps = await fetchAll(PERSON, [PF.nama, PF.email, PF.wa], { filterByFormula: `RECORD_ID()='${pid}'`, maxRecords: '1' });
      const p = ps[0], wa = p ? waDigits(p.fields[PF.wa]) : '';
      if (!wa) return res.status(400).json({ error: 'Orang ini belum punya nomor WhatsApp yang valid di M-Person' });
      const ex = await fetchAll(T, [F.wa], { filterByFormula: `{Whatsapp}='${wa}'`, maxRecords: '1' });
      if (ex[0]) return res.status(409).json({ error: 'Pengguna dengan nomor ini sudah ada' });
      const pw = temp(), iv = inv(req), email = String(p.fields[PF.email] || '').toLowerCase();
      await create(T, { ...iv.f, [F.email]: email || wa, [F.nama]: p.fields[PF.nama] || wa, [F.wa]: wa, [F.level]: rl.some((x) => R.ADMIN_ROLES.includes(x)) ? 'Admin' : 'Pengurus', [A.FX.manual]: JSON.stringify(rl), [F.aktif]: true, [F.disetujui]: true, [F.hash]: hashPassword(pw), [F.person]: pid, [A.FX.khusus]: '{}' });
      console.log('admin create', acc.email, wa, rl.join(','));
      const kirim = await kirimUndangan(wa, p.fields[PF.nama] || '', rl.join(', '), iv.link);
      return res.json({ ok: true, wa: mask(wa), password: pw, link: iv.link, ...kirim });
    }
    if (b.action === 'bulktim') { // Buat akun untuk anggota Tim Kerja (AKTIF) yang belum punya akun. Per panggilan maks 10 orang; ulangi sampai sisa 0.
      const kirimWaFlag = !!b.kirim;
      const tim = (await R.loadTim()).filter((t) => t.kat === 'TIM KERJA');
      const pids = [...new Set(tim.flatMap((t) => t.orang))].filter((x) => /^rec[A-Za-z0-9]{14}$/.test(x));
      const users = await fetchAll(T, [F.person, F.wa]);
      const adaP = new Set(users.map((u) => u.fields[F.person]).filter(Boolean)), adaW = new Set(users.map((u) => waDigits(u.fields[F.wa])).filter(Boolean));
      const todo = pids.filter((x) => !adaP.has(x));
      const persons = todo.length ? await fetchAll(PERSON, [PF.nama, PF.email, PF.wa], { filterByFormula: `OR(${todo.map((x) => `RECORD_ID()='${x}'`).join(',')})` }) : [];
      const calon = persons.map((p) => ({ p, wa: waDigits(p.fields[PF.wa]) })), tanpaWa = calon.filter((c) => !c.wa || adaW.has(c.wa)).map((c) => c.p.fields[PF.nama] || c.p.id);
      const antre = calon.filter((c) => c.wa && !adaW.has(c.wa));
      const out = { dibuat: 0, terkirim: 0, tautan: [], tanpaWa };
      for (const c of antre.slice(0, 10)) {
        const iv = inv(req), email = String(c.p.fields[PF.email] || '').toLowerCase(), nama = c.p.fields[PF.nama] || c.wa;
        await create(T, { ...iv.f, [F.email]: email || c.wa, [F.nama]: nama, [F.wa]: c.wa, [F.level]: 'Pengurus', [A.FX.manual]: '[]', [F.aktif]: true, [F.disetujui]: true, [F.hash]: hashPassword(temp()), [F.person]: c.p.id, [A.FX.khusus]: '{}' });
        out.dibuat++;
        if (kirimWaFlag) { const k = await kirimUndangan(c.wa, nama, 'anggota Tim Kerja', iv.link); if (k.terkirim) { out.terkirim++; continue; } }
        out.tautan.push({ nama, wa: mask(c.wa), link: iv.link });
      }
      out.sisa = Math.max(0, antre.length - out.dibuat);
      A.forgetAll();
      console.log('admin bulktim', acc.email, 'dibuat', out.dibuat, 'kirimwa', kirimWaFlag, 'terkirim', out.terkirim, 'sisa', out.sisa);
      return res.json({ ok: true, ...out });
    }
    if (b.action === 'role') {
      const nama = String(b.nama || '').trim().slice(0, 60);
      if (nama.length < 2) return res.status(400).json({ error: 'Nama role minimal 2 huruf' });
      const roles = await R.loadRoles();
      const ex = b.id ? roles.find((r) => r.id === b.id) : roles.find((r) => r.nama.toLowerCase() === nama.toLowerCase());
      if (!b.id && ex) return res.status(409).json({ error: 'Nama role sudah dipakai' });
      if (b.id && !ex && !R.SISTEM.includes(nama)) return res.status(404).json({ error: 'Role tidak ditemukan' });
      const sistem = R.SISTEM.includes(nama) || !!(ex && ex.sistem);
      if (!sistem && roles.some((r) => r.id !== (ex && ex.id) && r.nama.toLowerCase() === nama.toLowerCase())) return res.status(409).json({ error: 'Nama role sudah dipakai' });
      if (R.ADMIN_ROLES.includes(nama)) return res.status(400).json({ error: 'Role Admin dan Super Admin selalu punya akses penuh' });
      const keys = new Set(Object.entries(A.TREE).flatMap(([m, t]) => [m, ...t.map((x) => `${m}/${x}`)]));
      const hak = {}; Object.entries(b.hak || {}).forEach(([k, v]) => { if (keys.has(k) && k !== 'admin' && !k.startsWith('admin/') && A.NAME.includes(v)) hak[k] = v; });
      const sel = (v, ok) => (ok.includes(v) ? v : null);
      const f = { [R.RT.nama]: nama, [R.RT.hak]: JSON.stringify(hak), [R.RT.cak]: sel(b.cakupan, ['Nasional', 'Terbatas']), [R.RT.seksi]: String(b.seksi || '').slice(0, 80), [R.RT.tingkat]: sel(b.tingkat, ['Koordinator', 'Anggota']), [R.RT.kat]: sel(b.kat, ['BPN INTI', 'BPN HARIAN', 'TIM KERJA']), [R.RT.sistem]: sistem, [R.RT.desk]: String(b.desk || '').slice(0, 500) };
      if (ex) await up(R.RT.t, ex.id, f); else await mk(R.RT.t, f);
      R.invalidate(); A.forgetAll();
      console.log('admin role', acc.email, nama);
      return res.json({ ok: true });
    }
    if (b.action === 'roledel') {
      const roles = await R.loadRoles(); const r = roles.find((x) => x.id === b.id);
      if (!r) return res.status(404).json({ error: 'Role tidak ditemukan' });
      if (R.SISTEM.includes(r.nama)) { await up(R.RT.t, r.id, { [R.RT.hak]: '{}' }); R.invalidate(); A.forgetAll(); return res.json({ ok: true, kembali: true }); }
      const users = await fetchAll(T, [A.FX.manual, A.FX.peran]);
      if (users.some((u) => A.listOf(u.fields[A.FX.manual]).includes(r.nama))) return res.status(409).json({ error: 'Role masih dipakai pengguna. Lepaskan dulu dari pengguna.' });
      await require('../lib/airtable').remove(R.RT.t, r.id);
      R.invalidate(); A.forgetAll();
      return res.json({ ok: true });
    }
    const id = String(b.id || '');
    if (!/^rec[A-Za-z0-9]{14}$/.test(id)) return res.status(400).json({ error: 'ID tidak valid' });
    const rows = await fetchAll(T, [F.email, F.wa, F.nama, F.disetujui, F.aktif, A.FX.peran, A.FX.manual], { filterByFormula: `RECORD_ID()='${id}'`, maxRecords: '1' });
    if (!rows[0]) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    const email = String(rows[0].fields[F.email] || '').toLowerCase();
    const self = id === acc.id;
    if (b.action === 'update') {
      const f = {};
      if (b.roles !== undefined) {
        const known = new Set([...R.SISTEM, ...(await R.loadRoles()).map((r) => r.nama)]);
        const rl = [...new Set((Array.isArray(b.roles) ? b.roles : []).filter((x) => known.has(x)))];
        if (self && acc.peran === 'Admin' && !rl.some((x) => R.ADMIN_ROLES.includes(x))) return res.status(400).json({ error: 'Anda tidak bisa mencabut role Admin dari diri sendiri' });
        if (!rl.length) { const t2 = await fetchAll(T, [F.person], { filterByFormula: `RECORD_ID()='${id}'`, maxRecords: '1' }); const pid = t2[0] && t2[0].fields[F.person]; const tm = await R.loadTim(); if (!pid || !R.autoRoles(await R.loadRoles(), tm, pid).length) return res.status(400).json({ error: 'Pilih minimal satu role' }); }
        f[A.FX.manual] = JSON.stringify(rl); f[A.FX.peran] = null; f[F.level] = rl.some((x) => R.ADMIN_ROLES.includes(x)) ? 'Admin' : 'Pengurus'; f[F.disetujui] = true;
      }
      if (b.peran !== undefined) { if (!A.PERAN.includes(b.peran)) return res.status(400).json({ error: 'Peran tidak valid' }); if (self && b.peran !== 'Admin') return res.status(400).json({ error: 'Anda tidak bisa menurunkan peran sendiri' }); f[A.FX.peran] = b.peran; f[F.level] = b.peran === 'Admin' ? 'Admin' : 'Pengurus'; f[F.disetujui] = true; }
      if (b.aktif !== undefined) { if (self && !b.aktif) return res.status(400).json({ error: 'Anda tidak bisa menonaktifkan diri sendiri' }); f[F.aktif] = !!b.aktif; }
            await update(T, id, f); A.forget(id); A.forget(email);
      console.log('admin update', acc.email, email, Object.keys(f).join(','));
      return res.json({ ok: true });
    }
    if (b.action === 'reset') {
      const pw = temp(), iv = inv(req);
      await update(T, id, { [F.hash]: hashPassword(pw), ...iv.f }); A.forget(id); A.forget(email);
      console.log('admin reset', acc.email, email);
      return res.json({ ok: true, wa: 'nomor WhatsApp pengguna', password: pw, link: iv.link });
    }
    if (b.action === 'kirimwa') {
      const f = rows[0].fields, wa = waDigits(f[F.wa]);
      if (!wa) return res.status(400).json({ error: 'Pengguna ini belum punya nomor WhatsApp' });
      if (!f[F.aktif] || !f[F.disetujui]) return res.status(400).json({ error: 'Setujui akun dan pilih role dulu' });
      const iv = inv(req);
      await update(T, id, iv.f); A.forget(id); A.forget(email);
      const kirim = await kirimUndangan(wa, f[F.nama] || '', (A.listOf(f[A.FX.manual]).join(', ') || nm(f[A.FX.peran]) || 'pengguna'), iv.link);
      console.log('admin kirimwa', acc.email, email, kirim.terkirim);
      return res.json({ ok: true, wa: mask(wa), link: iv.link, ...kirim });
    }
    return res.status(400).json({ error: 'Aksi tidak dikenal' });
  } catch (e) {
    console.error('admin error', e.message);
    return res.status(502).json({ error: 'Gagal memproses di Airtable' });
  }
};
