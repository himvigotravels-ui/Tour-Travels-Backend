#!/bin/sh
set -e

# Ensure persistent data directory exists
mkdir -p /var/data

# Set DATABASE_URL to the persistent disk location so Prisma always finds it
export DATABASE_URL="file:/var/data/tour-travels.db"

echo "📦 DATABASE_URL = $DATABASE_URL"

# 1. Generate Prisma Client (in case it was not generated during build)
echo "⚙️ Generating Prisma Client..."
npx prisma generate

# 2. Sync database schema
echo "🔄 Pushing Prisma schema to SQLite database..."
npx prisma db push --accept-data-loss

# 3. Seed database on first boot if persistent marker does not exist
if [ ! -f /var/data/.seeded ]; then
  echo "🌱 First boot: Seeding SQLite database from backup JSON..."
  node prisma/seed.js
  
  touch /var/data/.seeded
  echo "✅ SQLite database seeded and marker file created!"
else
  echo "ℹ️ Database already seeded. Skipping seed process."
fi

# 4. Start the Express server
echo "🚀 Starting Node.js SQLite API server..."
node src/index.js
