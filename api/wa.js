// Tombol WhatsApp: mengarahkan ke wa.me tanpa menampilkan nomor di antarmuka.
const { listByIds } = require('../lib/airtable');
const { getSession } = require('../lib/auth');
const { getAccess, can } = require('../lib/access');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  const s = getSession(req);
  const acc = s && (await getAccess(s).catch(() => null));
  if (!acc || !['proker', 'pengurus', 'pd'].some((m) => can(acc, m))) return res.status(401).send('Tidak diizinkan');
  const id = String(req.query.p || '');
  if (!/^rec[A-Za-z0-9]{14}$/.test(id)) return res.status(400).send('ID tidak valid');
  try {
    const [r] = await listByIds('tbl21zOSogH7Anlu2', [id], ['fldGsFt4GflTXoTa0']);
    let n = String((r && r.fields.fldGsFt4GflTXoTa0) || '').replace(/\D/g, '');
    if (n.startsWith('0')) n = '62' + n.slice(1);
    if (!n) return res.status(404).send('Nomor WhatsApp belum tersedia');
    res.setHeader('Location', `https://wa.me/${n}`);
    return res.status(302).end();
  } catch (e) {
    console.error('wa error', e.message);
    return res.status(502).send('Gagal mengambil data');
  }
};
