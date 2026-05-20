#!/bin/sh
set -e

# SQLite file lives in db/dev.db inside the project. Render's app
# filesystem is writable for the instance lifetime.
mkdir -p ./db

# Run the seed on every boot. It's entirely upserts so it's idempotent
# and fast (<1s for the full dataset). This avoids "the .seeded marker
# said we're done but the DB is actually empty" situations on Render
# free tier, where the container is rebuilt between deploys but a
# stale marker can occasionally survive in a layer.
echo "🌱 Seeding SQLite database..."
node db/seed.js
echo "✅ seed complete."

echo "🚀 Starting API..."
node src/index.js
