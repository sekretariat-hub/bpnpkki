# Learning System (TC, learning path, penilaian pengajar)

Menu **Learning System** memakai data base **Schole** (`appnbezea6uZzlSeS`, env `SCHOLE_BASE_ID` bila berbeda). Token Airtable yang sama (`AIRTABLE_TOKEN`) harus punya akses baca/tulis ke base itu. Kode: `lib/ls.js`, dipanggil dari `api/report.js` lewat `?ls=<aksi>` (batas 12 fungsi Vercel).

## Tahap
1. **Tahap 1 (jadi):** Kelola TC + learning path + tautan pendaftaran; tampilan Pengajar (progres kelompok, nilai bab "boleh mengajar", komentar, kelulusan, catatan akhir untuk BPK).
2. **Tahap 2 (belum):** pendaftaran umat (tautan `#/ls/daftar/<EventTC>`), alur persetujuan, tab Peserta (modul, learning path, upload tugas, progres), tab Laporan BPK, email.
3. **Tahap 3 (belum):** pesan peserta ke pengajar dan grup diskusi per kelompok (tabel Komentar LS sudah disiapkan; notifikasi lewat WhatsApp BaBlast).

## Alur persetujuan pendaftar (disepakati, dikerjakan di Tahap 2)
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
Menu `ls` dengan tab `tc` (Kelola TC), `pengajar`, `peserta`, `laporan` (dua terakhir menyusul). Bawaan: Admin/Editor penuh; Pengurus BPN Harian edit `tc`, lihat lainnya; Koordinator/PIC BPK hanya `laporan`; Pengajar TC edit `pengajar`; Peserta TC edit `peserta`. Paket role "Koordinator Bidang/Seksi" mendapat edit `ls/tc`.

## Aturan penilaian
- Boleh mengajar / Boleh mengajar, didampingi (catatan **wajib** bila didampingi).
- Lulus hanya jika minimal satu bab sudah dinilai.
- Pengajar hanya dapat menilai peserta di kelompoknya (cek email mentor di server); pengurus dengan hak edit `ls/tc` dapat menilai siapa pun.

## Env
`SCHOLE_BASE_ID` (opsional), `PUBLIC_URL` (opsional, untuk tautan pendaftaran; bawaan https://bpnpkki.vercel.app).
