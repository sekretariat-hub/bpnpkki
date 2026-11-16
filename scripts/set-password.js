#!/usr/bin/env node
// Membuat / mengganti password pengguna di tabel "Pengguna Report".
// Pakai: AIRTABLE_TOKEN=... node scripts/set-password.js email@contoh.org [Level] [password]
// Email harus terdaftar di tabel M-Person. Jika password dikosongkan, dibuatkan acak dan ditampilkan sekali.
const crypto = require('crypto');
const { fetchAll, update, create } = require('../lib/airtable');
const { hashPassword } = require('../lib/auth');
const { T, F } = require('../lib/users');

(async () => {
  const email = String(process.argv[2] || '').trim().toLowerCase();
  const level = process.argv[3] || 'Pengurus';
  if (!email) throw new Error('Pemakaian: node scripts/set-password.js email [Admin|Pengurus|Pengamat] [password]');
  const safe = email.replace(/'/g, "\\'");

  const persons = await fetchAll('tbl21zOSogH7Anlu2', ['fldVU2gofcKEhWHmB', 'fldhjOTrQfLGC6hWj'], { filterByFormula: `LOWER({Email})='${safe}'`, maxRecords: '1' });
  if (!persons.length) throw new Error(`Email ${email} tidak ditemukan di M-Person`);

  const password = process.argv[4] || crypto.randomBytes(9).toString('base64url');
  const fields = {
    [F.email]: email,
    [F.nama]: persons[0].fields.fldVU2gofcKEhWHmB || email,
    [F.level]: level,
    [F.aktif]: true,
    [F.hash]: hashPassword(password),
    [F.person]: persons[0].id,
  };
  const existing = await fetchAll(T, [F.email], { filterByFormula: `LOWER({Email})='${safe}'`, maxRecords: '1' });
  if (existing.length) await update(T, existing[0].id, fields);
  else await create(T, fields);

  console.log(`OK  user: ${email}  level: ${level}`);
  if (!process.argv[4]) console.log(`Password sementara: ${password}   (catat sekarang, tidak ditampilkan lagi)`);
})().catch((e) => { console.error('GAGAL:', e.message); process.exit(1); });
