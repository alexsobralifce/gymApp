#!/bin/bash
set -e
echo "=== Building TypeScript ==="
npm run build
echo "=== Ensuring upload directories ==="
mkdir -p public/uploads/avatars public/uploads/feed
echo "=== Running migrations ==="
npx prisma migrate deploy
echo "=== Syncing exercise library ==="
npx tsx prisma/sync-gifdotreino.ts
echo "=== Starting server ==="
npm run start
