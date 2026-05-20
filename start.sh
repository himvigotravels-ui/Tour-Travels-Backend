#!/bin/sh
set -e

# SQLite file lives in db/dev.db inside the project. Render's app
# filesystem is writable for the instance lifetime, which is enough —
# the .seeded marker below prevents re-seeding on every restart.
DB_DIR="./db"
mkdir -p "$DB_DIR"
echo "📂 DB dir: $DB_DIR"

# Seed marker — re-seed only when the DB has just been created (or when
# FORCE_RESEED=true is set in the Render dashboard).
SEED_MARKER="$DB_DIR/.seeded"

if [ "$FORCE_RESEED" = "true" ]; then
  echo "🔄 FORCE_RESEED=true — clearing seed marker."
  rm -f "$SEED_MARKER"
fi

if [ ! -f "$SEED_MARKER" ]; then
  echo "🌱 Seeding SQLite database..."
  node db/seed.js
  touch "$SEED_MARKER"
  echo "✅ seed complete."
else
  echo "ℹ️  Database already seeded; skipping. (Set FORCE_RESEED=true to override.)"
fi

echo "🚀 Starting API..."
node src/index.js
