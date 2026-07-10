#!/bin/bash
set -e
echo "=== Building TypeScript ==="
npm run build
echo "=== Running migrations ==="
npx prisma migrate deploy
echo "=== Starting server ==="
npm run start
