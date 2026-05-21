#!/bin/sh
set -e

# DB lives on Turso when TURSO_DATABASE_URL is set, otherwise in db/dev.db.
# The Node server itself runs autoSeedIfEmpty() on boot — when the
# destinations table is empty, it seeds automatically. So start.sh no
# longer needs to manage the seed.
echo "🚀 Starting API..."
exec node src/index.js
