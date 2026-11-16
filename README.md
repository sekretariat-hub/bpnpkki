# Report BPN PKKI

Dashboard ringkasan data Airtable (base **BPN PKKI**) dengan login email + password.
Token Airtable hanya ada di server (Vercel env var); browser hanya menerima angka agregat.

## Struktur
- `public/index.html` – halaman login + report (Program Kerja & Budget, Pleno & Golden Jubilee, TC SHDR, Kepemudaan)
- `api/login.js`, `api/logout.js`, `api/report.js` – serverless function Vercel
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
