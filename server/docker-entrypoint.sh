#!/bin/sh
set -e

npx prisma migrate deploy

USER_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.count()
  .then((count) => { process.stdout.write(String(count)); return prisma.\$disconnect(); })
  .catch((err) => { console.error(err); process.exit(1); });
")

if [ "$USER_COUNT" = "0" ]; then
  echo "No users found — seeding database..."
  node dist/seed.js
else
  echo "Database already has $USER_COUNT user(s) — skipping seed."
fi

exec node dist/index.js
