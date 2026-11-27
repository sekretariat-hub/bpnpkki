# Fitur, menu, dan API

## Menu (sidebar berkelompok; sub-menu berupa tab)
| Kelompok | Menu | Tab | Isi |
|---|---|---|---|
| – | Dashboard | – | Pribadi: tugas saya, program dan tugas seksi saya, agenda. Admin/pengurus tanpa seksi melihat ringkasan umum |
| PROGRAM | Program Kerja | Per Keuskupan · Semua Program · Ringkasan & Grafik · Syarat ACC | Proker BPK/BPN, edit bagi yang berhak (kartu angka termasuk "Program sedang berjalan") |
| PROGRAM | Laporan | Pleno · TC SHDR · Kepemudaan | Laporan agregat |
| ORGANISASI | Organisasi | Tim Saya · Bagan Tim Saya · Bagan Seluruh Tim · Daftar Pengurus BPN · Daftar Anggota Tim | Gabungan Pengurus BPN dan Tim Kerja. Tab Tim Saya dan Bagan Tim Saya hanya untuk yang punya seksi. Pemimpin di bagan bisa diklik menuju Daftar Pengurus |
| DATA | Data Umat | Infografis · Daftar Umat | Infografis klik-lihat dan daftar dengan filter |
| DATA | Koordinator PD | Daftar PD · Ringkasan | PD per keuskupan (ringkasan memuat kartu "BPK di Indonesia") |
| DATA | Pendataan PIC | – | Formulir pejabat BPK/PIC per keuskupan |
| BELAJAR | Belajar | Belajar · Diskusi · Daftar TC · Dasbor · Pendaftar · Laporan BPK · Kelola TC · Pengajar · Modul: Ringkasan · Daftar Modul · Modul: Per Modul · Modul: Peserta Lulus · Modul: Pengajar | Learning System digabung Modul Berjenjang |
| (menu nama) | Profil Saya, Ubah profil, Login sebagai (Super Admin), Administrasi (Admin), Keluar | | Klik nama di kiri bawah. Administrasi (Pengguna · Role & Hak Akses) tidak lagi di sidebar |

Hak akses tetap memakai kunci lama (`pengurus`, `tim/*`, `modul/*`, `ls/*`, `admin/*`). Tab menu mendefinisikan `[id, label, kunciHak, kunciHalaman, hanyaUntukPunyaSeksi]` di `MENU` (`public/app.js`). Alamat lama (`#/pengurus`, `#/tim/...`, `#/modul/...`) dialihkan oleh `ALIAS` di `migrasiHash()`.

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
