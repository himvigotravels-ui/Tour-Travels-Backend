import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Connection routing:
//   • TURSO_DATABASE_URL set → use Turso (libsql://...) with auth token
//   • otherwise               → local SQLite file (libsql embedded mode)
const url =
  process.env.TURSO_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "file:./db/dev.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });

console.log(`📦 SQLite via libsql @ ${url.replace(/authToken=[^&]+/, "authToken=***")}`);

// Apply schema on every boot. libsql's execute() runs one statement per
// call, so strip `-- comments` and split on `;`. We strip line-comments
// BEFORE splitting, otherwise the very first chunk (which starts with
// the file's leading comment block) gets discarded along with the
// CREATE TABLE that follows it.
const SCHEMA_PATH = resolve(__dirname, "..", "db", "schema.sql");
const schemaSql = readFileSync(SCHEMA_PATH, "utf8");
const cleaned = schemaSql
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n");
const statements = cleaned
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

// ─── Lightweight, idempotent column migrations ─────────────────────────
// schema.sql uses CREATE TABLE IF NOT EXISTS, so new columns added to an
// existing table are never applied to a pre-existing dev.db / Turso DB.
// These run BEFORE schema apply so that any new index in schema.sql that
// references a freshly-added column can be created without erroring.
// Tables that don't exist yet are skipped — the fresh CREATE TABLE below
// already includes the column.
const COLUMN_MIGRATIONS = [
  ["packages", "isYatra", "INTEGER NOT NULL DEFAULT 0"],
  ["internal_pages", "menuCategory", "TEXT"],
];
for (const [table, column, definition] of COLUMN_MIGRATIONS) {
  try {
    const info = await client.execute(`PRAGMA table_info(${table})`);
    if (info.rows.length === 0) continue; // table not created yet → fresh DB
    const exists = info.rows.some((r) => r.name === column);
    if (!exists) {
      await client.execute(
        `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`
      );
      console.log(`🛠️  migration: added ${table}.${column}`);
    }
  } catch (e) {
    console.error(`⚠️  migration failed for ${table}.${column}:`, e.message);
  }
}

for (const stmt of statements) {
  await client.execute(stmt);
}
console.log(`📋 schema applied (${statements.length} statements)`);

// ─── better-sqlite3-shaped async API ───────────────────────────────────
// query.js / seed.js / index.js call db.prepare(sql).{all,get,run}(...args)
// and db.transaction(fn)(). We mirror that shape, but every method is
// async because libsql is HTTP/WS-backed.

function rowToObject(row) {
  // libsql returns rows as objects already; clone to drop the prototype.
  return row ? { ...row } : row;
}

export const db = {
  async exec(sql) {
    const stmts = sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const s of stmts) await client.execute(s);
  },

  prepare(sql) {
    return {
      async all(...args) {
        const r = await client.execute({ sql, args });
        return r.rows.map(rowToObject);
      },
      async get(...args) {
        const r = await client.execute({ sql, args });
        return rowToObject(r.rows[0]);
      },
      async run(...args) {
        const r = await client.execute({ sql, args });
        return {
          changes: Number(r.rowsAffected ?? 0),
          lastInsertRowid: r.lastInsertRowid,
        };
      },
    };
  },

  // Run `fn` inside a libsql write transaction. `fn` receives a tx
  // handle that has the same .prepare(...) shape, so call sites can do:
  //   await db.transaction(async (tx) => { await tx.prepare(...).run(...) })()
  transaction(fn) {
    return async (...args) => {
      const tx = await client.transaction("write");
      const txHandle = {
        prepare(sql) {
          return {
            async all(...a) {
              const r = await tx.execute({ sql, args: a });
              return r.rows.map(rowToObject);
            },
            async get(...a) {
              const r = await tx.execute({ sql, args: a });
              return rowToObject(r.rows[0]);
            },
            async run(...a) {
              const r = await tx.execute({ sql, args: a });
              return {
                changes: Number(r.rowsAffected ?? 0),
                lastInsertRowid: r.lastInsertRowid,
              };
            },
          };
        },
      };
      try {
        const result = await fn(txHandle, ...args);
        await tx.commit();
        return result;
      } catch (e) {
        try { await tx.rollback(); } catch { /* noop */ }
        throw e;
      }
    };
  },
};

// ─── Helpers (unchanged) ───────────────────────────────────────────────

export function newId() {
  const t = Date.now().toString(36);
  const r =
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10);
  return (t + r).slice(0, 24);
}

export function nowIso() {
  return new Date().toISOString();
}

export function toBool(v) {
  if (v === null || v === undefined) return v;
  return v ? 1 : 0;
}
export function fromBool(v) {
  if (v === null || v === undefined) return v;
  return v === 1 || v === true || v === 1n;
}
