# Hak akses berbasis role

## Konsep
- Hak akses diatur **per role**, bukan per orang. Hak khusus per orang yang lama tidak dibaca lagi.
- Satu orang boleh punya **banyak role**. Jika bentrok, **hak tertinggi per menu/tab** menang (Edit > Lihat > Tidak ada).
- Role datang dari tiga sumber: (1) peran lama di Pengguna Report, (2) **Role Tambahan** yang diberikan Admin manual, (3) **otomatis** dari keanggotaan AKTIF di tabel Tim BPN yang cocok dengan kriteria role (kategori tim, seksi, tingkat).
- Tingkat otomatis: jabatan mengandung kata "koordinator" = Koordinator; selain itu Anggota. Role bertingkat Anggota tidak diberikan kepada Koordinator.
- Hanya **Admin** dan **Super Admin** (setara) yang bisa membuka menu Administrasi (kelola pengguna dan role). Role lain tidak bisa, meskipun matriksnya dicentang.

## Level hak
`none` (tidak ada) · `view` (lihat) · `edit` (lihat + ubah). Hak Edit berlaku untuk Program Kerja dan Pengurus BPN.

## Menu dan tab (`TREE` di `lib/access.js`)
dashboard · proker (keuskupan, semua, ringkasan, acc) · pengurus · pd (daftar, ringkasan) · tim (bagan, daftar) · pendataan · modul (ringkasan, permodul, peserta, pengajar) · umat (ringkasan, daftar) · laporan (pleno, tc, kepemudaan) · admin (pengguna, role).
Profil Saya selalu tersedia untuk semua pengguna yang sudah disetujui.

## Role bawaan sistem (kode, `lib/roles.js` → `SISTEM`)
Super Admin, Admin, Editor BPN, Pengurus BPN Harian, Koordinator BPK, PIC BPK, Koordinator PD, Pengamat. Hak bawaannya ada di fungsi `preset()` di `lib/access.js`; Admin bisa menimpanya di halaman Role (disimpan sebagai baris Role Akses bertanda Sistem; tombol "Kembalikan ke bawaan" menghapus penimpaan).

## Cakupan data (umat/modul)
- Role Nasional (Admin, Editor, Pengurus Harian, Pengamat, atau role kustom bercakupan Nasional) → seluruh Indonesia.
- Siapa pun yang tercatat di tabel Pengurus BPN → nasional.
- Koordinator BPK / PIC BPK → hanya keuskupannya (dari M-Pejabat BPK aktif, cadangan: keuskupan domisili).
- Koordinator PD → hanya umat PD yang ia koordinatori (field Koord PD di M-PDPKK).

## Cara mengatur
1. **Administrasi → Role & Hak Akses**: *+ Role baru*, atau tombol "Buat role Koordinator & Anggota untuk tiap seksi" (20 role dari 10 seksi, hak awal bisa diubah). Isi matriks menu/tab; opsi "Salin dari role", "Semua: lihat saja/tidak ada".
2. Isi bagian "Diberikan otomatis" (kategori tim/seksi/tingkat) bila role mau mengikuti Tim BPN; kosongkan bila manual saja.
3. **Administrasi → Pengguna → Atur role** untuk memberi/mencabut role manual. Chip biru = manual, hijau = otomatis.
4. Perubahan berlaku ≤ 60 detik (cache akses); perubahan di halaman Role langsung membersihkan cache.

## Aturan keamanan
- Admin tidak bisa mencabut role Admin dari dirinya sendiri atau menonaktifkan dirinya.
- Nama role yang sudah dibuat tidak bisa diganti (dipakai sebagai kunci). Role yang masih dipakai pengguna tidak bisa dihapus.
- Akun yang belum disetujui atau wajib ganti password mendapat nol hak sampai selesai.

## Kode terkait
`lib/access.js` (resolusi hak, cakupan), `lib/roles.js` (muat role, Tim BPN, role otomatis), `api/admin.js` (CRUD role dan pengguna), `public/app.js` (halaman `admin/role`, `admin/pengguna`).

## Tambahan (22 Nov 2026)
- **Pembatasan seksi:** edit Program Kerja hanya untuk seksi penanggung jawab milik pengguna (dari Tim BPN aktif: relasi seksi atau nama seksi pada teks jabatan). Dikecualikan: Admin, Super Admin, Editor BPN, Koordinator Bidang. Penegakan di `api/proker.js`; `a.seksiEdit` (null = tanpa batas).
- **Paket role** (tombol di halaman Role): Koordinator Bidang (jabatan memuat "Bidang"), Koordinator Seksi (semua jabatan koordinator BPN Harian), Anggota BPN Inti, Anggota Tim Kerja.
- **Role baru sistem:** `Pengajar TC` (otomatis dari tabel Mentor & Petugas Schole) dan `Peserta TC`; menu `ls` (Learning System).
- Role otomatis memakai `/koord/i`, sehingga salah ketik "Koordiantor" tetap dikenali.

## Login sebagai (khusus Super Admin)
- Profil Saya: kartu "Login sebagai" di bagian atas (hanya muncul untuk Super Admin; role Super Admin harus ada di akun, mis. lewat Administrasi → Pengguna → Atur role). Tidak bisa melihat sebagai Super Admin lain atau diri sendiri.
- Selama mode aktif: menu, data, dan cakupan mengikuti pengguna yang dilihat (termasuk akun yang belum aktivasi). Menu Administrasi tertutup. Ganti password dinonaktifkan.
- Banner kuning di atas: kotak "Boleh edit" (default aktif; bila dimatikan = mode lihat saja, semua hak dibatasi ke Lihat dan penulisan ke Airtable ditolak) dan tombol "Kembali ke akun saya". Edit aktif = semua menu yang terlihat bisa diubah dan tanpa batas seksi; nama pengubah yang tercatat adalah nama Super Admin, bukan pengguna yang dilihat.
- Teknis: cookie sesi membawa `as` (id pengguna) dan `edit`; `lib/access.js → getAs` memeriksa ulang Super Admin di setiap permintaan. Aksi `imp`/`impedit`/`impstop` ada di `api/admin.js` (tanpa file api baru). Jejak: log Vercel berawalan `LOGIN-SEBAGAI` (mulai, selesai, tiap aksi tulis). Belum ada tabel audit di Airtable.
- Catatan: data milik pengguna yang dilihat (mis. profil sendiri, pendaftaran Learning System) tetap tersimpan pada pengguna itu; yang atas nama Super Admin adalah kolom "diubah oleh/penulis".

## Role seksi dan akun Tim Kerja
- 20 role (Koordinator dan Anggota × 10 seksi) dibuat di tabel Role Akses: lihat semua menu kecuali Administrasi, edit Program Kerja (tab Ringkasan dan ACC hanya lihat), Learning System peserta/daftar/diskusi bisa edit. Cakupan data: Nasional. Edit Proker tetap dibatasi ke seksi sendiri.
- Tombol "Buat akun anggota Tim Kerja" (Administrasi → Pengguna) membuat akun semua anggota Tim Kerja AKTIF yang belum punya akun (10 orang per putaran, otomatis diulang), dengan pilihan kirim undangan WhatsApp atau tampilkan tautan.

## Tim Saya (tab di menu Tim Kerja BPN)
- Tab "Tim Saya" hanya muncul bila pengguna punya seksi: sebagai Koordinator Bidang, Koordinator Seksi, atau anggota aktif. Admin, Super Admin, dan Editor BPN melihat semua seksi dan boleh mengelola semuanya.
- Koordinator Bidang = jabatan "Wakil Koordinator BPN Bidang N" di tabel Pengurus BPN → mengelola semua seksi di Bidang N (relasi M-Bidang pada M-Seksi). Koordinator Seksi = jabatan "Koordinator Seksi X" di Pengurus BPN (dicocokkan ke nama seksi tanpa awalan "Tim Kerja"). Cakupan dihitung di `timScope` (`api/data.js`) dan dikirim ke klien sebagai `user.tim`.
- Isi tab: Tim Bidang (seksi, koordinator seksi, jumlah anggota aktif), Tim Kerja per seksi (anggota, periode, status), dan Program Kerja yang penanggung jawabnya seksi tersebut (hanya baca; ubah di menu Program Kerja).
- Yang boleh diubah koordinator (hanya seksi di bawahnya): tambah anggota (cari dari M-Person), akhiri keanggotaan, aktifkan lagi, ubah tanggal mulai/selesai. Status AKTIF/SELESAI di Airtable adalah rumus dari **Tgl Selesai** (`fld5QO8ATqA0DA4c6`), jadi "akhiri" mengisi tanggal itu dan "aktifkan" mengosongkannya. Jabatan (Koordinator Seksi/Bidang) tetap diatur di tabel Pengurus BPN, bukan di tab ini.
- Endpoint: POST `/api/data` dengan `{action:'tim', op:'tambah|akhiri|aktifkan|tanggal'}`; GET `/api/data?cari=` untuk mencari orang (tanpa kontak). Semua ditolak saat mode Login sebagai lihat-saja.

## Anggota seksi biasa (27 Nov 2026)
Role Anggota – Tim Kerja X (10 seksi) dibatasi: Dashboard, Program Kerja (hanya Semua Program, Ringkasan, Proyek & Tugas; program difilter ke seksinya), Organisasi (Tim Saya, bagan), Pendataan PIC (lihat, untuk koordinasi). Tidak ada Data Umat, PD, Modul, Laporan, LMS. Tidak bisa mengubah program; hanya tugas sendiri (status, komentar). Koordinator seksi tetap melihat data nasional dan mengubah program seksinya. Istilah 'Pimpinan BPN' = BPN Harian (termasuk Koordinator Seksi).
