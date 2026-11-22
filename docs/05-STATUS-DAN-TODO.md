# Status dan daftar tindak lanjut (per 22 Nov 2026)

## Sudah jadi dan di-push ke `main`
Login WhatsApp + OTP + undangan · Profil Saya lengkap (foto, PD pencarian, pelayanan, modul; bab disembunyikan) · PD/paroki baru dengan deteksi duplikat + email · Pendataan PIC (dengan keterangan centang + PIC otomatis pindah domisili) · Modul Berjenjang (4 tab) · Data Umat (infografis + daftar) · Koordinator PD · **Role & Hak Akses berbasis role** (multi-role, otomatis dari Tim BPN) · **edit Program Kerja dibatasi ke seksi sendiri** (kecuali Admin, Editor BPN, Koordinator Bidang) · **Learning System Tahap 1, 2, dan 3** (lihat `06-LEARNING-SYSTEM.md`) · 12 fungsi Vercel.

## Langkah manual untuk pemilik
1. Vercel → Deployments: pastikan commit terbaru **Ready**.
2. Vercel env: isi `BABLAST_API_KEY` (WhatsApp) dan `RESEND_API_KEY` + `MAIL_FROM` (+ `ADMIN_EMAIL`), lalu **Redeploy**.
3. Administrasi → Role & Hak Akses: klik "Buat role Koordinator & Anggota untuk tiap seksi", periksa hak tiap role (role seksi dibuat bercakupan **Nasional**; ubah bila perlu).
4. Administrasi → Pengguna: beri role ke pengguna lama (peran lama tetap berlaku sampai diganti).
5. Airtable: bila pemberian role "PIC BPK"/"Koordinator PD" lewat peran lama gagal, tambahkan pilihannya di field Peran (Pengguna Report); dengan sistem role baru ini tidak lagi perlu.
6. Orang yang akan diundang harus punya email/nomor WhatsApp di M-Person (mis. Nonik).

## Belum terverifikasi di lingkungan nyata
Pengiriman BaBlast, email Resend, tampilan di browser sesungguhnya, dan pemetaan jabatan→role otomatis dengan data Tim BPN produksi (diuji dengan data tiruan).

## Ide berikutnya
- **Uji Learning System** (Tahap 1-3) dengan data sungguhan: daftar → setujui BPK → setujui BPNH → belajar → lulus; cek email terkirim. Lihat `06-LEARNING-SYSTEM.md`.
- Klik "Pasang paket role yang disarankan" di Role & Hak Akses (Koordinator Bidang, Koordinator Seksi, Anggota BPN Inti, Anggota Tim Kerja); lalu klik Muat ulang.
- Hapus baris "BPNH" di tabel Bidang bila tidak dipakai.
- Role Pewarta dan Umat (akses terbatas ke profil/materi).
- Menu Laporan untuk Koordinator BPK.
- Jumlah program (62) vs tahun 2027 perlu dicek.
- Ekspor daftar umat/peserta (CSV).
- Log audit perubahan role.
