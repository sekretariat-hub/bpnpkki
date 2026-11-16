// Pengirim WhatsApp via BaBlast (hanya dipanggil dari server). Kunci API tidak pernah keluar dari environment variable.
const { waDigits } = require('./phone');

async function kirimWa(nomor, pesan) {
  const key = process.env.BABLAST_API_KEY;
  if (!key) { const e = new Error('BABLAST_API_KEY belum diisi'); e.code = 'NOKEY'; throw e; }
  const phone = waDigits(nomor);
  if (!phone) throw new Error('Nomor WA tidak valid');
  const body = { phone, message: pesan };
  if (process.env.BABLAST_SENDER_CODE) body.sender_code = process.env.BABLAST_SENDER_CODE;
  const r = await fetch(process.env.BABLAST_API_URL || 'https://api.bablast.id/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) {
    const txt = (await r.text().catch(() => '')).split(key).join('***');
    throw new Error(`Gagal mengirim WA (${r.status}): ${txt.slice(0, 160)}`);
  }
}
module.exports = { kirimWa };
