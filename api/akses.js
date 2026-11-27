// Alur akun lewat WhatsApp: cek nomor -> kirim OTP -> verifikasi -> buat/reset password.
const { fetchAll, update, create } = require('../lib/airtable');
const { hashPassword, setSession, sign, verify } = require('../lib/auth');
const { T, F } = require('../lib/users');
const { waDigits, mask } = require('../lib/phone');
const otp = require('../lib/otp');
const A = require('../lib/access');
const PX = require('../lib/person');

const PERSON = 'tbl21zOSogH7Anlu2';
const PF = { nama: 'fldVU2gofcKEhWHmB', wa: 'fldGsFt4GflTXoTa0', pan: 'fldstVCm8Oa3tyxNA', jk: 'fld3A1rRGfWxbuase', email: 'fldhjOTrQfLGC6hWj', dom: 'fldwJ7RnXW1nLaOcv', tgl: 'fld6yev36uF0pzxcu', bln: 'fldmCKGMF57RMV3tE', thn: 'fldmTqYBcGuYVkkgM', alamat: 'fldZC8crJW8pETX6J' };
const BPK = 'tblgj0UYB9w7UWWnv';
const body = (req) => (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {});
const bad = (res, m, s = 400) => res.status(s).json({ error: m });
const hits = new Map();
const tooMany = (ip) => { const n = Date.now(), l = (hits.get(ip) || []).filter((t) => n - t < 15 * 60 * 1000); l.push(n); hits.set(ip, l); return l.length > 25; };

const userByWa = async (wa) => (await fetchAll(T, Object.values(F), { filterByFormula: `{Whatsapp}='${wa}'`, maxRecords: '1' }))[0];
const ALLP = Object.values(PF);
const personByWa = (wa) => PX.personByWa(wa, ALLP);
const passRule = (p, u) => (p !== u ? 'Kedua password harus sama' : p.length < 8 ? 'Password minimal 8 karakter' : !/[A-Za-z]/.test(p) || !/\d/.test(p) ? 'Password harus berisi huruf dan angka' : '');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  try {
    if (req.method === 'GET') { // daftar keuskupan untuk formulir pendaftaran (hanya nama)
      const rows = await fetchAll(BPK, ['fldxvUJvguk6J81mP']);
      return res.json({ keuskupan: rows.map((r) => ({ id: r.id, nama: String(r.fields.fldxvUJvguk6J81mP || '').trim() })).filter((x) => x.nama).sort((a, b) => a.nama.localeCompare(b.nama, 'id')) });
    }
    if (req.method !== 'POST') return bad(res, 'Metode tidak diizinkan', 405);
    if (tooMany(ip)) return bad(res, 'Terlalu banyak percobaan. Coba lagi nanti.', 429);
    const b = body(req);
    if (b.action === 'cek') {
      const wa = waDigits(b.phone); if (!wa) return bad(res, 'Nomor WhatsApp tidak valid. Contoh: 0812 3456 7890');
      const u = await userByWa(wa);
      return res.json({ wa, ada: !!u, aktif: u ? !!u.fields[F.aktif] : true });
    }
    if (b.action === 'kirim') {
      const wa = waDigits(b.phone); if (!wa) return bad(res, 'Nomor WhatsApp tidak valid');
      const u = await userByWa(wa);
      if (u && !u.fields[F.aktif]) return bad(res, 'Akun ini dinonaktifkan. Hubungi Admin BPN.', 403);
      try { await otp.issue(wa, u ? 'reset' : 'daftar'); }
      catch (e) {
        if (e.code === 'NOKEY') return bad(res, 'Pengiriman kode WhatsApp belum diaktifkan di server', 503);
        if (e.status) return bad(res, e.message, e.status);
        console.error('otp kirim', e.message); return bad(res, 'Gagal mengirim kode WhatsApp. Coba lagi.', 502);
      }
      return res.json({ ok: true, tujuan: u ? 'reset' : 'daftar', tujuanNomor: mask(wa) });
    }
    if (b.action === 'verifikasi') {
      const wa = waDigits(b.phone), code = String(b.code || '');
      if (!wa || !/^\d{4}$/.test(code)) return bad(res, 'Masukkan 4 digit kode');
      let tujuan;
      try { tujuan = await otp.check(wa, code); } catch (e) { return bad(res, e.message, e.status || 400); }
      const person = tujuan === 'daftar' ? await personByWa(wa) : null;
      const grant = sign({ k: 'grant', wa, tujuan, exp: Date.now() + 15 * 60 * 1000 });
      const jk = person && person.fields[PF.jk] && (person.fields[PF.jk].name || person.fields[PF.jk]);
      return res.json({ ok: true, tujuan, grant, orang: person ? { nama: person.fields[PF.nama] || '', jk: jk || '' } : null, perluProfil: tujuan === 'daftar' && (!person || !PX.lengkap(person)) });
    }
    if (b.action === 'simpan') {
      let g; try { g = verify(b.grant); } catch { g = null; }
      if (!g || g.k !== 'grant') return bad(res, 'Sesi verifikasi berakhir. Ulangi dari awal.', 401);
      const msg = passRule(String(b.password || ''), String(b.ulang || '')); if (msg) return bad(res, msg);
      const hash = hashPassword(String(b.password));
      const existing = await userByWa(g.wa);
      if (g.tujuan === 'reset') {
        if (!existing || !existing.fields[F.aktif]) return bad(res, 'Akun tidak ditemukan', 404);
        await update(T, existing.id, { [F.hash]: hash, [F.mustChange]: false, [F.tokenHash]: null, [F.tokenExp]: null, [F.lastLogin]: new Date().toISOString() });
        A.forget(existing.id);
        setSession(res, { rid: existing.id, email: String(existing.fields[F.email] || '').toLowerCase(), nama: existing.fields[F.nama] || g.wa, level: 'Pengurus' });
        return res.json({ ok: true, pending: !existing.fields[F.disetujui] });
      }
      if (existing) return bad(res, 'Nomor ini sudah punya akun. Silakan masuk atau pakai Lupa password.', 409);
      let person = await personByWa(g.wa), nama, email;
      if (!person || !PX.lengkap(person)) {
        const p = b.profil || {}, s = (v, n = 200) => String(v || '').trim().slice(0, n);
        const tgl = +p.tgl, bln = +p.bln, thn = +p.thn;
        const err = !s(p.nama) ? 'Nama lengkap wajib diisi' : !s(p.panggilan) ? 'Nama panggilan wajib diisi' : !['Pria', 'Wanita'].includes(p.jk) ? 'Pilih jenis kelamin'
          : !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s(p.email)) ? 'Email tidak valid' : !/^rec[A-Za-z0-9]{14}$/.test(s(p.keuskupan)) ? 'Pilih keuskupan domisili'
          : !(tgl >= 1 && tgl <= 31 && bln >= 1 && bln <= 12 && thn >= 1920 && thn <= new Date().getFullYear()) ? 'Tanggal lahir tidak valid' : '';
        if (err) return bad(res, err);
        const flds = { [PF.nama]: s(p.nama), [PF.pan]: s(p.panggilan, 60), [PF.wa]: '+' + g.wa, [PF.jk]: p.jk, [PF.email]: s(p.email), [PF.dom]: [s(p.keuskupan)], [PF.tgl]: tgl, [PF.bln]: bln, [PF.thn]: thn, ...(s(p.alamat, 300) ? { [PF.alamat]: s(p.alamat, 300) } : {}) };
        if (person) { delete flds[PF.wa]; await update(PERSON, person.id, flds); } else person = await create(PERSON, flds);
        person = person; nama = s(p.nama); email = s(p.email).toLowerCase();
      } else { nama = person.fields[PF.nama] || g.wa; email = String(person.fields[PF.email] || '').toLowerCase(); }
      // Pejabat/PIC BPK yang aktif (didaftarkan koordinator) langsung disetujui, tidak perlu menunggu Admin.
      let setuju = false;
      try { const pj = await require('../lib/airtable').fetchAll('tblGR9a8J4UOyJGep', ['fldCYWlWFYtnkjv6Z', 'fldyWZFFnXeN8CMlk']); setuju = pj.some((r) => (r.fields.fldCYWlWFYtnkjv6Z || []).includes(person.id) && /aktif/i.test(JSON.stringify(r.fields.fldyWZFFnXeN8CMlk || '')) && !/tidak/i.test(JSON.stringify(r.fields.fldyWZFFnXeN8CMlk || ''))); } catch { setuju = false; }
      const rec = await create(T, { [F.email]: email || g.wa, [F.nama]: nama, [F.wa]: g.wa, [F.aktif]: true, [F.disetujui]: setuju, [F.hash]: hash, [F.person]: person.id, [A.FX.khusus]: '{}', [F.lastLogin]: new Date().toISOString() });
      setSession(res, { rid: rec.id, email, nama, level: 'Pengurus' });
      return res.json({ ok: true, pending: !setuju });
    }
    return bad(res, 'Aksi tidak dikenal');
  } catch (e) {
    console.error('akses error', e.message);
    return bad(res, 'Terjadi kesalahan server', 500);
  }
};
