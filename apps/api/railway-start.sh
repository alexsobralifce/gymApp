#!/bin/bash
set -e
echo "=== Building TypeScript ==="
npm run build

echo "=== Ensuring upload directories ==="
mkdir -p public/uploads/avatars public/uploads/feed

echo "=== Running migrations ==="
npx prisma migrate deploy

echo "=== Syncing & seeding in background ==="
(npx tsx prisma/sync-gifdotreino.ts && npx tsx prisma/translate-exercises.ts && npx tsx prisma/seed-planos.ts) &

echo "=== Starting server ==="
npm run start
