import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// File path: relative to the backend project root (db/dev.db). Set
// DATABASE_FILE env var to override. The Render app filesystem is
// writable for the lifetime of the instance, which is enough — the
// .seeded marker in start.sh prevents re-seeding on every restart.
const DEFAULT_DB_PATH = resolve(__dirname, "..", "db", "dev.db");
const DB_PATH = process.env.DATABASE_FILE || DEFAULT_DB_PATH;

mkdirSync(dirname(DB_PATH), { recursive: true });

// node:sqlite is built into Node (stable from v22.5 with the
// --experimental-sqlite flag; default-on in v24+). Zero native deps to
// build on Render — just works.
const _raw = new DatabaseSync(DB_PATH);

// Sensible defaults for a small read-heavy API.
_raw.exec("PRAGMA journal_mode = WAL");
_raw.exec("PRAGMA foreign_keys = ON");
_raw.exec("PRAGMA synchronous = NORMAL");

// Run DDL on every boot (idempotent — all statements are CREATE ... IF NOT EXISTS).
const SCHEMA_PATH = resolve(__dirname, "..", "db", "schema.sql");
_raw.exec(readFileSync(SCHEMA_PATH, "utf8"));

console.log(`📦 SQLite ready at ${DB_PATH}`);

// ─── Thin wrapper exposing a better-sqlite3-shaped API ─────────────────
// The rest of the codebase calls db.prepare(sql).{all,get,run}(...params)
// and db.transaction(fn)(). node:sqlite is very close but not identical;
// this shim flattens the difference so query.js stays simple.

export const db = {
  exec: (sql) => _raw.exec(sql),
  prepare(sql) {
    const stmt = _raw.prepare(sql);
    return {
      all: (...params) => stmt.all(...params),
      get: (...params) => stmt.get(...params),
      run: (...params) => {
        const info = stmt.run(...params);
        return { changes: Number(info?.changes ?? 0), lastInsertRowid: info?.lastInsertRowid };
      },
    };
  },
  // Run `fn` inside a transaction. Returns a function (matching
  // better-sqlite3) so callers do `db.transaction(fn)()`. Supports
  // nesting via SAVEPOINTs so create/update wrapped inside an outer
  // RPC $transaction don't trip "cannot start a transaction within a
  // transaction".
  transaction(fn) {
    return (...args) => {
      const isNested = _txDepth > 0;
      const sp = isNested ? `sp_${_txDepth}` : null;
      if (isNested) _raw.exec(`SAVEPOINT ${sp}`);
      else _raw.exec("BEGIN");
      _txDepth++;
      try {
        const result = fn(...args);
        if (isNested) _raw.exec(`RELEASE SAVEPOINT ${sp}`);
        else _raw.exec("COMMIT");
        return result;
      } catch (e) {
        try {
          if (isNested) _raw.exec(`ROLLBACK TO SAVEPOINT ${sp}; RELEASE SAVEPOINT ${sp}`);
          else _raw.exec("ROLLBACK");
        } catch { /* ignore */ }
        throw e;
      } finally {
        _txDepth--;
      }
    };
  },
};

let _txDepth = 0;

// ─── Helpers ───────────────────────────────────────────────────────────

/**
 * Generate a short, opaque, URL-safe ID. Replaces Prisma's cuid().
 * Format: 24 chars, lowercase alphanum.
 */
export function newId() {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
  return (t + r).slice(0, 24);
}

export function nowIso() {
  return new Date().toISOString();
}

/**
 * Convert a JS boolean to SQLite INTEGER (0/1) and vice versa.
 */
export function toBool(v) {
  if (v === null || v === undefined) return v;
  return v ? 1 : 0;
}
export function fromBool(v) {
  if (v === null || v === undefined) return v;
  return v === 1 || v === true;
}
