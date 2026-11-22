# Skema Airtable (base BPN PKKI `appG76IeTvWetH0FJ`)

Kode memakai **ID field**, bukan nama field. Jangan menghapus atau mengganti tipe field di bawah tanpa memperbarui kode.

## Tabel dan ID
| Tabel | ID | Dipakai untuk |
|---|---|---|
| M-Person | `tbl21zOSogH7Anlu2` | Data orang/umat dan profil |
| M-BPK (keuskupan) | `tblgj0UYB9w7UWWnv` | Daftar keuskupan |
| M-PDPKK | `tblhmeuR1qFHxUIId` | PD (kelompok doa) |
| M-Paroki | `tblqKpvfwGtLEHnip` | Paroki |
| Kota | `tblSaXvGJJ7G1P9my` | Kota |
| M-Pelayanan | `tblTzNOMyrh4iF8MA` | Jenis pelayanan (Pewarta, Pengajar, Koordinator PD, dll.) |
| M-Modul Berjenjang | `tblymcTBL1pjIMa4A` | Modul retret berjenjang (Tahap 1–4) |
| Pengguna Report | `tbl25Nl4B7Hht9Xs8` | Akun login |
| Pengurus BPN | `tblRzqA9mzvDBWgSZ` | Jabatan pengurus harian |
| Riwayat Pengurus | `tblNNm7hwT7q9hxAV` | Riwayat pergantian pengurus |
| Tim BPN | `tblDpFOHsHMntZwWk` | Keanggotaan tim kerja/bidang |
| Seksi (Tim Kerja) | `tblyGzVk36H6eGrFt` | 10 seksi/tim kerja dan bidangnya |
| Bidang | `tblOkJcrqWIqc7kQz` | Bidang 1–3 |
| Jabatan BPK | `tbldxeUpwRdy3ghib` | Jabatan di BPK |
| M-Pejabat BPK | `tblGR9a8J4UOyJGep` | Pejabat/koordinator per keuskupan |
| Proker, Program, Event, Tugas | `tblJVp60qiZ4mz40v`, `tblqlr84XesZvbEJi` (lihat `api/data.js`) | Program kerja dan agenda |
| **Antrian Verifikasi** (dibuat aplikasi) | `tblRarr3Rk6PQ1C8j` | PD/paroki baru yang perlu dicek sekretariat |
| **Role Akses** (dibuat aplikasi) | `tblCgJf2Xwi3Jcp5f` | Role dan hak akses |

## M-Person (field)
nama `fldVU2gofcKEhWHmB` · WhatsApp `fldGsFt4GflTXoTa0` · panggilan `fldstVCm8Oa3tyxNA` · jenis kelamin `fld3A1rRGfWxbuase` · tgl/bln/thn lahir `fld6yev36uF0pzxcu`/`fldmCKGMF57RMV3tE`/`fldmTqYBcGuYVkkgM` · alamat `fldZC8crJW8pETX6J` · kota `fld9IxSm1629bESxL` · PD `fld3CxECAgWwecw77` · pelayanan `fldT8TCaA94MhNfri` · foto `fldIuYdJWnN77zoaT` · email `fldhjOTrQfLGC6hWj` · paroki `fldUTfjEjaznMj8m0` · ukuran baju `fldmI7S44OZMRVYJL` · modul diikuti `fldQaSUFxcYVFFKAX` · modul diajar `fldhP55DjyWd3Lpmb` · kategori `fldkvwhgXy1CgJYr1` · baptis `fldb4MKCMsEulvR7H` · krisma `fldjg2iLicQIr7Vh3` · bab `fldJJbI82Q4k6bVCg` (disembunyikan, `TAMPIL_BAB=false` di `lib/profil.js`) · keuskupan domisili `fldwJ7RnXW1nLaOcv` · usia `fldpIbuKfSaL6uJY2` · provinsi `fld74efY9G9hb6nIG`.

## M-PDPKK
nama `fldzIeY3YMiHMo4ky` · keuskupan `fldWcO7mYhPFpFXlA` · jenis `fldq43MYnCIKg34ts` · umat `fldYgMqtmX7AbHfU3` · koordinator PD (tautan ke M-Person) `fldxlRQG4ikb8coP2` · nama koordinator (lookup) `fldTkyK4Y7dGMpAXn`.

## Pengguna Report
email `fldFTzT6UpjetrEsM` · nama `fldrc7wiuxwASQHc6` · level lama `fldEiSHYYjOytjq2g` · aktif `flddxhVbe1s20Lg1r` · hash password `fldDJrnuSA1hltYgz` · person (tautan) `fld3EFXzjVXjs3GIU` · login terakhir `fldKvJZdPtuxOUx3D` · WhatsApp `fldrIWQ1Z06n0R4GH` · disetujui `fldgHpmz2FtoMnPal` · token undangan `fldLVyWXOXRk7g0Xo` / kedaluwarsa `fldTguyLL1decgWYw` · wajib ganti password `fldP1tM0aSuxMc2tj` · peran lama (select) `fldsTal4cl44WawC3` · hak khusus lama (JSON, **tidak dibaca lagi**) `fldtNLbtQfnf1arY0` · **Role Tambahan** (JSON daftar nama role) `fld7LeP24BReQjdFA`.

## Role Akses
Nama Role `fldv3ixU7W0MJDwL9` · Hak (JSON `{menu_atau_menu/tab: none|view|edit}`) `fldXrXNjoRx4XcogQ` · Cakupan (Nasional/Terbatas) `fldQ4xmT6BiN3yzNo` · Seksi `fldscwsjgQ631moCe` · Tingkat (Koordinator/Anggota) `fldFRTbalaC7GBVjj` · Kategori Tim (BPN INTI/BPN HARIAN/TIM KERJA) `fld9P7IXzmF8JvtWV` · Sistem `fld8HSo7LgwAvki5a` · Deskripsi `fldkpO6o7kK43XDUS`.

## Tim BPN (dipakai untuk role otomatis)
orang `fldomDq2DVSouEZRg` · seksi `fldPcVBoJjOxvmm60` / lookup `fldo7LnqytWDz29ph` · bidang `fldgjTuIVKqIjqxws` · kategori `fldt3z2Ne2c4V9WYC` (BPN INTI / BPN HARIAN / TIM KERJA) · status `flddq43aR0XsimTjg` (AKTIF/SELESAI) · jabatan BPN `fldXQjbXYwlQGFkXH`.

## Antrian Verifikasi
Jenis `fldtshIUwxtOZb6iZ` · Keterangan `fldeWR6AslvMqxJnI` · Dibuat oleh `fldKUnqfi9Z7Qi4Fx` · Sudah dicek `fldwqdWK1upwV8y5X`.

## Tabel Pengurus BPN
jabatan `fldAZEb1CWjIEoEGB` · orang `fldJgxaz4f5MmEbnS` · urutan `fld3O21aDCbkTCin8`. Siapa pun yang tercatat di sini dianggap pengurus harian dan melihat data umat nasional.
