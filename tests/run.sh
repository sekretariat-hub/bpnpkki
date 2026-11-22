#!/bin/sh
# Jalankan semua uji. Butuh: npm i --no-save jsdom   (dijalankan dari akar repo: sh tests/run.sh)
cd "$(dirname "$0")/.." || exit 1
gagal=0
for f in api/*.js lib/*.js public/app.js; do node --check "$f" || { echo "SINTAKS RUSAK: $f"; gagal=1; }; done
n=$(ls api | wc -l); [ "$n" -le 12 ] || { echo "Terlalu banyak fungsi di api/: $n (batas Vercel Hobby 12)"; gagal=1; }
for f in tests/server_*.js tests/client_*.js; do
  out=$(node "$f" 2>&1); k=$(echo "$out" | grep -c "FAIL\|window errors: \[ ")
  echo "$f: $([ "$k" = 0 ] && echo lolos || echo "GAGAL ($k)")"; [ "$k" = 0 ] || { echo "$out" | grep "FAIL"; gagal=1; }
done
exit $gagal
