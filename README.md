# Sistem Informasi BPN PKKI

Aplikasi web Badan Pelayanan Nasional Pembaruan Karismatik Katolik Indonesia di atas Airtable (base **BPN PKKI**), hosting Vercel, login nomor WhatsApp + password, hak akses berbasis role.

**Mulai dari sini:** `docs/00-PANDUAN-PROYEK.md` → `docs/01-SETUP.md`.

| Dokumen | Isi |
|---|---|
| `docs/00-PANDUAN-PROYEK.md` | Ringkasan, batas, cara kerja |
| `docs/01-SETUP.md` | Setup dari nol, environment variable, deploy, admin pertama, uji |
| `docs/02-SKEMA-AIRTABLE.md` | ID tabel dan field |
| `docs/03-AKSES-ROLE.md` | Role dan hak akses |
| `docs/04-FITUR-DAN-API.md` | Menu, endpoint, file kode |
| `docs/05-STATUS-DAN-TODO.md` | Status dan langkah berikutnya |

## Struktur
`public/` antarmuka · `api/` fungsi serverless (maks. 12) · `lib/` modul bersama · `scripts/` skrip admin · `tests/` uji (`sh tests/run.sh`) · `docs/` dokumentasi.

## Environment variable
`AIRTABLE_TOKEN`, `AIRTABLE_BASE_ID`, `SESSION_SECRET` (wajib); `BABLAST_API_KEY`, `RESEND_API_KEY`, `MAIL_FROM`, `ADMIN_EMAIL` (opsional). Rincian di `docs/01-SETUP.md`.
