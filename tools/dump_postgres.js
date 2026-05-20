// One-shot Postgres → JSON dump.
// Reads the Prisma-shaped Postgres DB (admin's original production data)
// and writes a fresh db_backup_<timestamp>.json that the SQLite seed
// (db/seed.js) can restore from.
//
// Usage:
//   PG_URL='postgres://...' node tools/dump_postgres.js
//
// Not committed to package.json — `pg` is installed with `--no-save` for
// this one-off. Delete it (or rotate credentials) after you're done.

import pg from "pg";
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PG_URL = process.env.PG_URL || process.env.DATABASE_URL || process.argv[2];
if (!PG_URL) {
  console.error("Set PG_URL env var or pass the connection string as argv[2].");
  process.exit(1);
}

const TABLES = [
  "admin_users",
  "destinations",
  "packages",
  "blogs",
  "testimonials",
  "activities",
  "cab_vehicles",
  "cab_routes",
  "inquiries",
  "site_settings",
  "internal_pages",
];

// Prisma implicit M2M join tables use this naming convention:
// _<RelationName> with columns A and B holding the two FK ids.
const JOIN_TABLES = ["_InternalPagePackages", "_InternalPageDestinations"];

async function dump() {
  const client = new pg.Client({
    connectionString: PG_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log("✅ connected to Postgres");

  const out = {};

  for (const t of TABLES) {
    try {
      const { rows } = await client.query(`SELECT * FROM "${t}"`);
      out[t] = rows;
      console.log(`📥 ${t.padEnd(22)} ${rows.length} rows`);
    } catch (e) {
      console.warn(`⚠️  ${t}: ${e.message}`);
      out[t] = [];
    }
  }

  for (const t of JOIN_TABLES) {
    try {
      const { rows } = await client.query(`SELECT * FROM "${t}"`);
      out[t] = rows;
      console.log(`📥 ${t.padEnd(22)} ${rows.length} rows`);
    } catch (e) {
      console.warn(`⚠️  ${t}: ${e.message}`);
      out[t] = [];
    }
  }

  await client.end();

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = resolve(__dirname, "..", "db", `db_backup_${stamp}.json`);
  writeFileSync(target, JSON.stringify(out, null, 2));
  console.log(`💾 wrote ${target} (${Object.values(out).reduce((s, a) => s + a.length, 0)} total rows)`);
  // Also overwrite a stable "latest" copy so seed.js can find it.
  const latest = resolve(__dirname, "..", "db", "db_backup_latest.json");
  writeFileSync(latest, JSON.stringify(out, null, 2));
  console.log(`💾 wrote ${latest}`);
}

dump().catch((e) => {
  console.error("❌ dump failed:", e.message);
  process.exit(1);
});
