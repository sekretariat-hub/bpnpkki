const { clearSession } = require('../lib/auth');
module.exports = (req, res) => {
  clearSession(res);
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ ok: true });
};
