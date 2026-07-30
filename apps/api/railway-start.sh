#!/bin/bash
set -e

echo "=== Ensuring upload directories ==="
mkdir -p public/uploads/avatars public/uploads/feed

echo "=== Applying database migrations ==="
npx prisma migrate deploy

echo "=== Syncing exercises (async - não bloqueia o start) ==="
nohup bash -c '
  sleep 5
  echo "[Sync] Sincronizando exercicios do GifDoTreino..."
  npx tsx prisma/sync-gifdotreino.ts >> /tmp/sync-exercises.log 2>&1
  echo "[Sync] Traduzindo descricoes..."
  npx tsx prisma/translate-exercises.ts >> /tmp/sync-exercises.log 2>&1
  echo "[Sync] Populando biblioteca de planos..."
  npx tsx prisma/seed-planos.ts >> /tmp/sync-exercises.log 2>&1
  echo "[Sync] Concluido!"
' > /dev/null 2>&1 &

echo "=== Starting server ==="
npm run start
