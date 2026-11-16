// Token undangan sekali pakai: yang disimpan di Airtable hanya hash SHA-256-nya.
const crypto = require('crypto');
const newToken = () => crypto.randomBytes(32).toString('base64url');
const hashToken = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');
const TTL = 14 * 24 * 3600 * 1000; // 14 hari
module.exports = { newToken, hashToken, TTL };
