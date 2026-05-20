#!/bin/sh
set -e

# Determine database path:
# 1. If /var/data exists and is writable (Render persistent disk), use it
# 2. Otherwise, use the local prisma directory
if mkdir -p /var/data 2>/dev/null && touch /var/data/.write_test 2>/dev/null; then
  rm -f /var/data/.write_test
  export DATABASE_URL="file:/var/data/tour-travels.db"
  DB_DIR="/var/data"
  echo "📂 Using Render persistent disk at /var/data"
else
  export DATABASE_URL="file:./prisma/dev.db"
  DB_DIR="./prisma"
  echo "📂 Using local prisma directory (no persistent disk)"
fi

echo "📦 DATABASE_URL = $DATABASE_URL"

# 1. Generate Prisma Client
echo "⚙️ Generating Prisma Client..."
npx prisma generate

# 2. Sync database schema (creates the DB file if it doesn't exist)
echo "🔄 Pushing Prisma schema to SQLite database..."
npx prisma db push --accept-data-loss

# 3. Seed logic
SEED_MARKER="$DB_DIR/.seeded"

# Allow force re-seed via environment variable (set FORCE_RESEED=true in Render dashboard)
if [ "$FORCE_RESEED" = "true" ]; then
  echo "🔄 FORCE_RESEED is set — removing seed marker to trigger fresh seed..."
  rm -f "$SEED_MARKER"
fi

if [ ! -f "$SEED_MARKER" ]; then
  echo "🌱 Seeding SQLite database from backup JSON..."
  node prisma/seed.js

  touch "$SEED_MARKER"
  echo "✅ Database seeded and marker created at $SEED_MARKER"
else
  echo "ℹ️ Database already seeded (marker: $SEED_MARKER). Skipping."
  echo "   To force re-seed: set FORCE_RESEED=true and restart."
fi

# 4. Start the Express server
echo "🚀 Starting Node.js SQLite API server..."
node src/index.js
