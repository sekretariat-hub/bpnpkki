# Pengujian
Uji memakai data tiruan Airtable (tidak menyentuh data asli).

```
npm i --no-save jsdom
sh tests/run.sh
```
- `server_*.js` — akses/role, cakupan data umat, API profil, admin, pejabat.
- `client_*.js` — antarmuka (jsdom): menu, profil, Modul Berjenjang, Data Umat, Role.
- Catatan: ID record Airtable palsu di uji harus 14 karakter setelah `rec`.
