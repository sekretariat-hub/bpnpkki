# Learning System (TC, learning path, penilaian pengajar)

Menu **Learning System** memakai data base **Schole** (`appnbezea6uZzlSeS`, env `SCHOLE_BASE_ID` bila berbeda). Token Airtable yang sama (`AIRTABLE_TOKEN`) harus punya akses baca/tulis ke base itu. Kode: `lib/ls.js`, dipanggil dari `api/report.js` lewat `?ls=<aksi>` (batas 12 fungsi Vercel).

## Tahap
1. **Tahap 1 (jadi):** Kelola TC + learning path + tautan pendaftaran; tampilan Pengajar (progres kelompok, nilai bab "boleh mengajar", komentar, kelulusan, catatan akhir untuk BPK).
2. **Tahap 2 (jadi):** pendaftaran umat (tautan `#/ls/daftar/<EventTC>`), alur persetujuan, tab Peserta (modul, learning path, upload tugas, progres), tab Laporan BPK, email.
3. **Tahap 3 (jadi):** pesan peserta ke pengajar dan grup diskusi per kelompok (tabel Komentar LS sudah disiapkan; notifikasi lewat WhatsApp BaBlast).

## Alur persetujuan pendaftar (Tahap 2, sudah berjalan)
Peserta mendaftar → **Koordinator BPK / PIC Pewartaan BPK** keuskupannya menyetujui atau menolak → bila setuju, menunggu persetujuan **tim BPN Harian yang membuat TC** → bila setuju, peserta dan Koordinator BPK mendapat email (peserta: email pribadi; Koordinator BPK: daftar email total). Hal yang sama saat peserta lulus.

## Peta tabel Schole
| Kebutuhan | Tabel | Catatan |
|---|---|---|
| TC | EventTC | kolom baru: Pendaftaran (Dibuka/Ditutup), Dibuat Oleh |
| Modul | Materi TC | tertaut ke EventTC |
| Bab (learning path) | Pengajaran | kolom baru: Tautan Materi (satu URL per baris), Urutan; Youtube Link sudah ada |
| Peserta per TC | LMSHeader | status kepesertaan, Keterangan Kelulusan, kolom baru **Catatan Akhir TC (untuk BPK)** |
| Per bab per peserta | LMS Detail | status tonton, tugas, **Izin Mengajar** + Catatan Mentor, Dinilai Oleh, Tanggal Dinilai |
| Komentar/pesan | Komentar LS (baru) | Isi, Tipe, LMSHeader, LMS Detail, Penulis, Email Penulis, Peran, Kelompok, Dibuat |

Pengajar dikenali dari email di tabel **Mentor & Petugas** (dicocokkan dengan email di M-Person BPN) dan otomatis diberi role **Pengajar TC**. Peserta dihubungkan lewat `LMSHeader.Email Mentor`/`Email Peserta`.

## Hak akses
Menu `ls` dengan tab `peserta` (Belajar), `diskusi`, `daftar` (Daftar TC), `pendaftar`, `laporan`, `tc` (Kelola TC), `pengajar`. Bawaan: Admin/Editor penuh; Pengurus BPN Harian edit `tc` dan `pendaftar`, lihat lainnya; Koordinator/PIC BPK edit `pendaftar` dan lihat `laporan` (dibatasi keuskupannya); Pengajar TC edit `pengajar`; **semua akun** dapat `peserta` dan `daftar` (data dibatasi menurut email sendiri). Paket role "Koordinator Bidang/Seksi" mendapat edit `ls/tc`.

## Aturan penilaian
- Boleh mengajar / Boleh mengajar, didampingi (catatan **wajib** bila didampingi).
- Lulus hanya jika minimal satu bab sudah dinilai.
- Pengajar hanya dapat menilai peserta di kelompoknya (cek email mentor di server); pengurus dengan hak edit `ls/tc` dapat menilai siapa pun.

## Env
`SCHOLE_BASE_ID` (opsional), `PUBLIC_URL` (opsional, untuk tautan pendaftaran; bawaan https://bpnpkki.vercel.app).

## Tahap 2: pendaftaran, persetujuan, belajar (kode di `lib/ls2.js`)
- **Syarat** disimpan sebagai JSON di kolom `Syarat` pada EventTC. Selalu diperiksa otomatis: data profil lengkap, Baptis & Krisma terisi, sudah mengikuti SHDR. Tambahan per TC (tombol "Syarat pendaftaran" di Kelola TC): modul wajib, usia min/maks, jenis kelamin, asal BPK, pelayan pewarta/pengajar, wajib surat rekomendasi. Yang belum memenuhi syarat tidak bisa mendaftar (dicek ulang di server).
- **Pendaftaran** lewat `#/ls/daftar/<id EventTC>` → tabel **Pendaftaran LS** (status: Menunggu BPK → Disetujui BPK → Disetujui BPNH, atau Ditolak BPK/BPNH). Surat rekomendasi diunggah ke kolom lampiran (PDF/JPG/PNG).
- **Tahap BPK** hanya oleh Koordinator BPK / PIC keuskupan peserta (Admin sebagai cadangan); tim BPNH tidak bisa melompatinya. **Tahap BPNH** oleh pemegang hak edit `ls/tc` (belum dibatasi ke pembuat TC yang sama), wajib memilih kelompok.
- Saat disetujui BPNH: dibuat/ditemukan M-Person Schole (cocok lewat RecordIDBPN) → Peserta → LMSHeader (Peserta Aktif) → LMS Detail satu per bab. Email: peserta ke emailnya sendiri, Koordinator BPK berisi daftar peserta. Hal sama saat pengajar meluluskan.
- **Tab Belajar**: bab, video/materi, tandai selesai, unggah tugas, hasil, komentar pengajar. **Laporan BPK**: pendaftar, lulus, bab yang boleh diajar, komentar, catatan akhir TC.
- **Batas berkas**: ±3 MB per berkas (Vercel membatasi isi permintaan ±4,5 MB; base64 menambah ±33%), bukan 5 MB.
- Email lewat Resend (`lib/mail.js` `kirim`); bila `RESEND_API_KEY` kosong, email dilewati.
- Belum diverifikasi di Airtable/Vercel sungguhan, hanya tes dengan data palsu.

## Tahap 3: pesan dan diskusi
- **Pesan** peserta↔pengajar per kelas (LMSHeader): Komentar LS bertipe `Pesan`, ditulis dari tab Belajar (peserta) dan modal peserta (pengajar). Pihak lain diberi tahu lewat email; peserta juga lewat WhatsApp (BaBlast) bila nomornya ada di Pendaftaran LS.
- **Diskusi**: tab `diskusi`, satu ruang per TC untuk semua kelompok dan pengajarnya (tipe `Grup`, kolom `Event Id`). Hanya anggota TC (atau pemegang hak `ls/tc`) yang bisa membaca/menulis.
- Pesan tidak realtime (muat ulang halaman); tidak ada hapus/edit pesan dan lampiran.
