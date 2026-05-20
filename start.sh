#!/bin/sh
set -e

# Determine database path — use persistent disk on Render, local dev.db otherwise
if [ -d "/var/data" ] || mkdir -p /var/data 2>/dev/null; then
  export DATABASE_URL="file:/var/data/tour-travels.db"
  DB_DIR="/var/data"
else
  export DATABASE_URL="file:./prisma/dev.db"
  DB_DIR="./prisma"
fi

echo "📦 DATABASE_URL = $DATABASE_URL"
echo "📂 DB_DIR = $DB_DIR"

# 1. Generate Prisma Client (in case it was not generated during build)
echo "⚙️ Generating Prisma Client..."
npx prisma generate

# 2. Sync database schema (creates the DB file if it doesn't exist)
echo "🔄 Pushing Prisma schema to SQLite database..."
npx prisma db push --accept-data-loss

# 3. Always re-seed if the marker is missing OR if the DB appears empty
#    This ensures data is populated even after a persistent disk wipe.
SEED_MARKER="$DB_DIR/.seeded"

if [ ! -f "$SEED_MARKER" ]; then
  echo "🌱 Seeding SQLite database from backup JSON..."
  node prisma/seed.js

  touch "$SEED_MARKER"
  echo "✅ SQLite database seeded and marker file created at $SEED_MARKER"
else
  echo "ℹ️ Database already seeded (marker found at $SEED_MARKER). Skipping."
  echo "   To force re-seed, delete $SEED_MARKER and restart."
fi

# 4. Start the Express server
echo "🚀 Starting Node.js SQLite API server..."
node src/index.js
