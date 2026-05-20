#!/bin/sh
set -e

# DB lives in the project's prisma/ dir. Render's app filesystem is
# writable for the instance lifetime, which is enough for this app (admin
# edits persist until the next redeploy/restart). A persistent disk can
# be added later if needed.
export DATABASE_URL="file:./prisma/dev.db"
DB_DIR="./prisma"

echo "📦 DATABASE_URL = $DATABASE_URL"
echo "📂 CWD = $(pwd)"

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
