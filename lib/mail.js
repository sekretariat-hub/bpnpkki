// Email notifikasi ke Sekretariat/Admin (hanya dipanggil dari server). Memakai Resend bila RESEND_API_KEY diisi.
// Penerima: ADMIN_EMAIL (pisahkan koma) + semua akun berperan Admin yang aktif dan beralamat email.
const { fetchAll } = require('./airtable');
const { T, F } = require('./users');

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
async function penerima() {
  const set = new Set(String(process.env.ADMIN_EMAIL || '').split(',').map((x) => x.trim().toLowerCase()).filter((x) => EMAIL.test(x)));
  try {
    const rows = await fetchAll(T, [F.email, 'fldsTal4cl44WawC3', F.aktif], { filterByFormula: "AND({Aktif}, {Peran}='Admin')" });
    rows.forEach((r) => { const e = String(r.fields[F.email] || '').trim().toLowerCase(); if (EMAIL.test(e)) set.add(e); });
  } catch (e) { console.error('mail penerima', e.message); }
  return [...set];
}
async function kirimAdmin(subjek, teks) {
  const key = process.env.RESEND_API_KEY;
  const to = await penerima();
  if (!key || !to.length) { console.log('mail dilewati', !key ? 'RESEND_API_KEY kosong' : 'tanpa penerima'); return false; }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.MAIL_FROM || 'BPN PKKI <onboarding@resend.dev>', to, subject: subjek, text: teks }),
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) { console.error('mail gagal', r.status, (await r.text().catch(() => '')).split(key).join('***').slice(0, 160)); return false; }
    return true;
  } catch (e) { console.error('mail error', e.message); return false; }
}
module.exports = { kirimAdmin, penerima };
