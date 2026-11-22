# Sistem Informasi BPN PKKI — Panduan Proyek

Aplikasi web untuk Badan Pelayanan Nasional Pembaruan Karismatik Katolik Indonesia (BPN PKKI): program kerja, pengurus, PD/paroki, tim kerja, laporan, modul berjenjang (retret), data umat, profil, dan hak akses berbasis role.

## Ringkasan teknis
- **Frontend:** SPA JavaScript murni (tanpa framework) di `public/` (`index.html`, `app.js`, `app.css`, `peta.js`). Routing berbasis hash (`#/menu/tab`).
- **Backend:** fungsi serverless Vercel di `api/` (Node ≥ 20) dan modul bersama di `lib/`.
- **Data:** Airtable, base **BPN PKKI** (`appG76IeTvWetH0FJ`). Token Airtable hanya ada di server.
- **Repo:** GitHub `sekretariat-hub/bpnpkki`, cabang `main`. Setiap push ke `main` otomatis dideploy Vercel.
- **Situs:** https://bpnpkki.vercel.app
- **Login:** nomor WhatsApp + password; OTP 4 digit lewat WhatsApp (BaBlast) untuk buat/reset password.

## Batas penting
- **Vercel Hobby maksimal 12 serverless function.** Folder `api/` sekarang berisi tepat 12 file. Jangan menambah file baru di `api/`; tambahkan endpoint baru ke file yang ada (pakai parameter `act`/`action`) atau taruh logikanya di `lib/`. Periksa dengan `ls api | wc -l`.
- Shell lingkungan kerja Claude tidak bisa membuka vercel.app. Verifikasi deploy lewat tangkapan layar Vercel → Deployments (harus **Ready**).

## Bahasa dan preferensi pemilik
- Pemilik proyek menulis dalam Bahasa Indonesia; balasan juga Bahasa Indonesia, ringkas, tanpa basa-basi.
- Untuk permintaan besar, tanyakan dulu pertanyaan klarifikasi (preferensi tetap pemilik: "tanya dulu sebelum menjawab").
- Fitur selesai = diuji, di-commit, di-push ke `main`, lalu dilaporkan dengan daftar langkah manual yang tersisa.

## Cara kerja yang disarankan untuk Claude di proyek ini
1. Baca dokumen di proyek ini lebih dulu (`01-SETUP`, `02-SKEMA-AIRTABLE`, `03-AKSES-ROLE`, `04-FITUR-DAN-API`, `05-STATUS-DAN-TODO`).
2. Clone repo (`sekretariat-hub/bpnpkki`), kerjakan di sana, jalankan uji (lihat `01-SETUP`, bagian Pengujian).
3. Pakai ID field Airtable (bukan nama field) di kode; ID ada di `02-SKEMA-AIRTABLE`.
4. Struktur Airtable (tabel/field baru) boleh dibuat lewat konektor Airtable bila diminta pemilik; jangan mengubah data pengguna asli tanpa izin.
5. Jangan pernah menulis token, password, atau kunci API ke repo atau dokumen proyek.
6. Commit pesan singkat Bahasa Indonesia; push `git push origin HEAD:main`.

## Peta dokumen
| Dokumen | Isi |
|---|---|
| 01-SETUP | Cara memasang dari nol, environment variable, deploy, admin pertama, WhatsApp/email, pengujian |
| 02-SKEMA-AIRTABLE | ID tabel dan field yang dipakai kode |
| 03-AKSES-ROLE | Model hak akses, role, cakupan data, cara mengatur |
| 04-FITUR-DAN-API | Menu, endpoint, file kode per fitur |
| 05-STATUS-DAN-TODO | Yang sudah jadi, yang belum, langkah manual pemilik |
