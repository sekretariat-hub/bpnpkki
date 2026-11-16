// Normalisasi nomor WhatsApp ke format 62xxxxxxxxxx ("" bila tidak valid).
function waDigits(v) {
  let d = String(v ?? '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (d.startsWith('8')) d = '62' + d;
  return /^62\d{8,13}$/.test(d) ? d : '';
}
const mask = (wa) => (wa.length > 7 ? wa.slice(0, 4) + '****' + wa.slice(-3) : '****');
module.exports = { waDigits, mask };
