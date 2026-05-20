#!/bin/sh
set -e

# Ensure persistent data directory exists
mkdir -p /var/data

# Set DATABASE_URL to the persistent disk location so Prisma always finds it
export DATABASE_URL="file:/var/data/tour-travels.db"

# 1. Sync database schema
echo "🔄 Pushing Prisma schema to SQLite database at $DATABASE_URL..."
npx prisma db push

# 2. Seed database on first boot if persistent marker does not exist
if [ ! -f /var/data/.seeded ]; then
  echo "🌱 First boot: Seeding SQLite database from backup JSON..."
  npm run db:seed
  
  touch /var/data/.seeded
  echo "✅ SQLite database seeded and marker file created!"
else
  echo "ℹ️ Database already seeded. Skipping seed process."
fi

# 3. Start the Express server
echo "🚀 Starting Node.js SQLite API server..."
npm start
