#!/bin/bash
set -e

echo "=== Ensuring upload directories ==="
mkdir -p public/uploads/avatars public/uploads/feed

echo "=== Generating Prisma Client ==="
npx prisma generate

echo "=== Applying database migrations ==="
npx prisma migrate deploy

echo "=== Checking if exercise sync is needed ==="
EXERCISE_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.exercicio.count().then(n => { console.log(n); p.\$disconnect(); }).catch(() => { console.log(0); });
" 2>/dev/null || echo "0")

if [ "$EXERCISE_COUNT" -lt "100" ]; then
  echo "=== Syncing exercises & data (async - running in background) ==="
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
else
  echo "=== Exercises already synced ($EXERCISE_COUNT found), skipping sync ==="
  # Apenas popula planos se nao existir (rapido)
  nohup bash -c '
    sleep 3
    npx tsx prisma/seed-planos.ts >> /tmp/sync-exercises.log 2>&1
  ' > /dev/null 2>&1 &
fi

echo "=== Setting up ROOT user ==="
npx tsx prisma/set-root-user.ts || true

echo "=== Backfill do Mural (posts de treinos concluidos hoje) ==="
nohup bash -c '
  sleep 10
  npx tsx prisma/backfill-mural.ts >> /tmp/backfill-mural.log 2>&1
' > /dev/null 2>&1 &

echo "=== Starting server ==="
npm run start

