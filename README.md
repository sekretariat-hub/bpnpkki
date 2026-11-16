# Sistem Informasi BPN PKKI

Sistem informasi Badan Pelayanan Nasional Pembaruan Karismatik Katolik Indonesia, dibangun di atas data Airtable (base **BPN PKKI**), login email + password.
Token Airtable hanya ada di server (Vercel env var); browser tidak pernah menerima token.

Menu (sidebar kiri, sub-menu berupa tab): Dashboard · Program Kerja (Per Keuskupan / Semua / Ringkasan / Syarat ACC) · Pengurus BPN · Koordinator PD · Tim Kerja BPN (Bagan Tim Aktif / Daftar) · Laporan (Pleno, TC SHDR, Kepemudaan).

Hak akses sementara: nomor WhatsApp/email hanya tampil untuk level **Admin**.

## Struktur
- `public/` – antarmuka (index.html, app.css, app.js, logo.png)
- `api/login.js`, `api/logout.js` – autentikasi
- `api/data.js` – data utama (proker, pengurus, tim kerja, PD, agenda, KPI)
- `api/report.js` – laporan agregat (Pleno, TC SHDR, Kepemudaan)
- `lib/` – klien Airtable, hash password (scrypt), sesi cookie bertanda tangan
- `scripts/set-password.js` – buat/ganti password pengguna

## Environment variable (Vercel → Settings → Environment Variables)
| Nama | Isi |
|---|---|
| `AIRTABLE_TOKEN` | Personal access token, scope `data.records:read` + `data.records:write` (untuk catat login terakhir), hanya base BPN PKKI |
| `AIRTABLE_BASE_ID` | `appG76IeTvWetH0FJ` |
| `SESSION_SECRET` | string acak ≥ 32 karakter (`openssl rand -base64 48`) |

## Menambah pengguna
Pengguna disimpan di tabel **Pengguna Report** (base BPN PKKI). User ID = email yang terdaftar di **M-Person**.
```
AIRTABLE_TOKEN=pat... node scripts/set-password.js nama@email.org Admin
```
Tanpa argumen ke-3, password acak dibuatkan dan ditampilkan sekali. Level: Admin / Pengurus / Pengamat
(hak akses per level akan ditentukan kemudian). Hilangkan centang **Aktif** di Airtable untuk memblokir akses.

## Pengembangan lokal
```
npm i -g vercel && vercel dev
```
