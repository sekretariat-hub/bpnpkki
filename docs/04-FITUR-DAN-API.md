# Fitur, menu, dan API

## Menu (sidebar; sub-menu berupa tab)
| Menu | Tab | Isi |
|---|---|---|
| Dashboard | – | Ringkasan program, agenda, tugas |
| Program Kerja | Per Keuskupan · Semua Program · Ringkasan & Grafik · Syarat ACC | Proker BPK/BPN, edit bagi yang berhak |
| Pengurus BPN | – | Jabatan, pemegang, ganti/akhiri jabatan, riwayat |
| Koordinator PD | Daftar PD · Ringkasan | PD per keuskupan, koordinator PD |
| Tim Kerja BPN | Bagan · Daftar | Anggota tim per seksi/bidang |
| Pendataan PIC | – | Formulir pejabat BPK/PIC per keuskupan (dengan penjelasan centang penggantian) |
| Modul Berjenjang | Ringkasan · Per Modul · Peserta Lulus · Pengajar | Retret berjenjang: peserta lulus ("pernah diikuti" = lulus), pengajar, sebaran per keuskupan, filter, klik untuk detail |
| Data Umat | Infografis · Daftar Umat | Infografis klik-lihat (JK, usia, kategori, sakramen, ukuran baju, keuskupan, provinsi, pelayanan, PD, kelengkapan profil) dan daftar dengan filter |
| Laporan | Pleno · TC SHDR · Kepemudaan | Laporan agregat |
| Administrasi | Pengguna · Role & Hak Akses | Kelola akun dan role (hanya Admin/Super Admin) |
| Profil Saya | – | Lihat/ubah profil, foto, PD (cari), paroki, pelayanan, modul diikuti/diajar; kotak peringatan jika data belum lengkap. Admin/Editor bisa membuka profil orang lain (`#/profil/<personId>`) |

## File kode
- `api/login.js`, `logout.js`, `password.js`, `akses.js`, `invite.js` — masuk, keluar, ganti password, alur OTP/pendaftaran, undangan.
- `api/data.js` — data utama (proker, pengurus, tim, PD, agenda, KPI), disaring menurut hak.
- `api/report.js` — laporan agregat. `api/proker.js` — ubah program kerja.
- `api/pejabat.js` — pejabat BPK/PIC; juga melayani daftar orang (`lib/h-orang.js`) dan ganti pengurus (`lib/h-pengurus.js`). Orang baru yang dijadikan PIC otomatis dipindah keuskupan domisilinya ke BPK itu.
- `api/profil.js` — profil (`act`: kota, paroki, pd, ringkas, analitik; POST: simpan, foto, pdbaru, parokibaru). PD/paroki baru dicek duplikat dan dicatat ke Antrian Verifikasi + email Admin.
- `api/admin.js` — pengguna dan role. `api/wa.js` — tombol WhatsApp (tautan).
- `lib/analitik.js` — hitung data umat/modul (cache 3 menit) dengan cakupan per pengguna.
- `lib/access.js`, `lib/roles.js` — hak akses. `lib/profil.js` — field profil, aturan kelengkapan. `lib/mail.js` — email Resend. `lib/wa.js` — BaBlast. `lib/otp.js` — OTP.
- `public/app.js` — seluruh UI; `MENU`, `PAGES['menu/tab']`, helper `bars`, `donut`, `columns`, `kpi`, `openDrill`, `modal`.

## Konvensi
- Routing: `#/menu/tab`. Tambah menu: entri di `MENU` + `PAGES['id/tab']` + kunci di `TREE` (`lib/access.js`) + preset bila perlu.
- Semua perubahan data lewat server; browser tidak memegang token.
- Batas 12 fungsi Vercel (lihat `00-PANDUAN-PROYEK`).
