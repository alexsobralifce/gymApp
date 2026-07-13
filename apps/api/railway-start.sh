#!/bin/bash
set -e
echo "=== Building TypeScript ==="
npm run build
echo "=== Running migrations ==="
npx prisma migrate deploy
echo "=== Syncing exercise library ==="
npx tsx prisma/sync-exercises-v2.ts
echo "=== Starting server ==="
npm run start
