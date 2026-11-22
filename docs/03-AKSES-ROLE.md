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
