# Setup dari nol

## 1. Prasyarat
Akun GitHub (`sekretariat-hub`), akun Vercel (paket Hobby cukup), base Airtable **BPN PKKI**, Node ≥ 20.

## 2. Airtable
1. Buka https://airtable.com/create/tokens → buat **Personal access token**.
2. Scope: `data.records:read`, `data.records:write`, `schema.bases:read`. Akses: hanya base BPN PKKI.
3. Catat token (jangan dibagikan) dan Base ID `appG76IeTvWetH0FJ`.
4. Tabel yang harus ada: lihat `02-SKEMA-AIRTABLE`. Tabel buatan aplikasi: **Antrian Verifikasi**, **Role Akses**; kolom **Role Tambahan** di Pengguna Report.

## 3. Deploy di Vercel
1. Vercel → *Add New Project* → impor repo `sekretariat-hub/bpnpkki`. Framework: *Other*. Tanpa build command.
2. Settings → Environment Variables (Production), lalu **Redeploy** setelah mengubahnya:

| Nama | Wajib | Isi |
|---|---|---|
| `AIRTABLE_TOKEN` | ya | token dari langkah 2 |
| `AIRTABLE_BASE_ID` | ya | `appG76IeTvWetH0FJ` |
| `SESSION_SECRET` | ya | string acak ≥ 32 karakter (`openssl rand -base64 48`) |
| `BABLAST_API_KEY` | untuk WhatsApp | kunci API BaBlast (OTP, undangan, notifikasi) |
| `BABLAST_SENDER_CODE`, `BABLAST_API_URL` | opsional | bila berbeda dari bawaan |
| `RESEND_API_KEY` | untuk email | kunci Resend (email notifikasi ke Admin) |
| `MAIL_FROM` | untuk email | pengirim terverifikasi di Resend, mis. `BPN PKKI <no-reply@domain>` |
| `ADMIN_EMAIL` | opsional | email tambahan penerima notifikasi (Admin aktif juga menerima) |

Tanpa `RESEND_API_KEY`, catatan tetap dibuat di tabel Antrian Verifikasi, hanya emailnya tidak terkirim. Tanpa `BABLAST_API_KEY`, OTP/undangan WhatsApp tidak terkirim (tautan masuk bisa disalin manual dari halaman admin).

3. Pastikan Deployments berstatus **Ready**. Bila Error "more than 12 Serverless Functions", ada file baru di `api/` yang harus digabung.

## 4. Admin pertama
Orang harus sudah ada di tabel **M-Person** dengan nomor WhatsApp. Buat akun Admin:
```
AIRTABLE_TOKEN=... AIRTABLE_BASE_ID=appG76IeTvWetH0FJ node scripts/set-password.js nama@email.org Admin
```
Atau tambahkan baris di tabel **Pengguna Report** (centang Aktif dan Disetujui, isi role Admin). Selanjutnya Admin menambah pengguna lain dari menu **Administrasi → Pengguna** dan mengatur role di **Administrasi → Role & Hak Akses**.

## 5. Pengembangan lokal
```
git clone https://github.com/sekretariat-hub/bpnpkki && cd bpnpkki
npm i -g vercel && vercel dev      # butuh env var di atas (vercel env pull)
```

## 6. Pengujian
Pengujian dijalankan dengan Node dan jsdom memakai data tiruan Airtable (tidak menyentuh data asli). Skrip uji ada di `tests/` pada repo (lihat `tests/README.md`). Sebelum push: semua `node --check`, uji server, uji klien lolos, dan `ls api | wc -l` = 12.

## 7. Pencadangan
Data ada di Airtable (gunakan Snapshot/backup Airtable). Kode ada di GitHub. Tidak ada data lain yang disimpan di server.
