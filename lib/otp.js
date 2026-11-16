// OTP 4 digit via WhatsApp. Yang disimpan di Airtable hanya hash OTP; percobaan salah dibatasi 5 kali.
const crypto = require('crypto');
const { fetchAll, update, create } = require('./airtable');
const { kirimWa } = require('./wa');

const T = 'tblfcnCVbzFJPHq8y';
const F = { wa: 'fldrIwvZ1Hq5zgiFc', tujuan: 'fldskw6EyHbSkxVM4', hash: 'fldvkFGXV0EmhkrqP', exp: 'fldVqzXHThYPdy5kJ', tries: 'fld7apiVA6FsgF0n9', sent: 'fld0BkdKiZtOnIxCN' };
const TTL = 5 * 60 * 1000, GAP = 60 * 1000, MAX_TRIES = 5;
const secret = () => process.env.SESSION_SECRET || '';
const h = (wa, code) => crypto.createHmac('sha256', secret()).update(`${wa}:${code}`).digest('hex');
const row = async (wa) => (await fetchAll(T, Object.values(F), { filterByFormula: `{Whatsapp}='${wa}'`, maxRecords: '1' }))[0];

async function issue(wa, tujuan) {
  const rec = await row(wa), now = Date.now();
  if (rec && now - (Number(rec.fields[F.sent]) || 0) < GAP) { const e = new Error('Tunggu 1 menit sebelum meminta kode lagi'); e.status = 429; throw e; }
  const code = String(crypto.randomInt(0, 10000)).padStart(4, '0');
  const f = { [F.wa]: wa, [F.tujuan]: tujuan, [F.hash]: h(wa, code), [F.exp]: now + TTL, [F.tries]: 0, [F.sent]: now };
  const saved = rec ? await update(T, rec.id, f) : await create(T, f);
  try {
    await kirimWa(wa, `Kode verifikasi BPN PKKI Anda: *${code}*\nBerlaku 5 menit. Jangan bagikan kode ini kepada siapa pun.`);
  } catch (e) {
    await update(T, saved.id, { [F.exp]: 0 }).catch(() => {});
    throw e;
  }
}

// Mengembalikan tujuan ('daftar' | 'reset') bila kode benar.
async function check(wa, code) {
  const rec = await row(wa), now = Date.now();
  const fail = (m, s = 400) => { const e = new Error(m); e.status = s; throw e; };
  if (!rec || !(Number(rec.fields[F.exp]) > now)) fail('Kode sudah kedaluwarsa. Minta kode baru.');
  const tries = Number(rec.fields[F.tries]) || 0;
  if (tries >= MAX_TRIES) fail('Terlalu banyak salah. Minta kode baru.', 429);
  const a = Buffer.from(h(wa, String(code))), b = Buffer.from(String(rec.fields[F.hash] || ''));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) { await update(T, rec.id, { [F.tries]: tries + 1 }); fail(`Kode salah (sisa percobaan ${MAX_TRIES - tries - 1})`); }
  await update(T, rec.id, { [F.exp]: 0 });
  return rec.fields[F.tujuan];
}
module.exports = { issue, check };
