// Minimal Prisma-compatible query translator backed by better-sqlite3.
// Supports the subset of Prisma client features the Himvigo frontend
// actually uses: findMany / findUnique / findFirst / count / create /
// update / upsert / delete, with where / orderBy / take / skip / select /
// include / connect / set / disconnect on many-to-many relations.
//
// This module is intentionally a single file with explicit SQL — easier
// to reason about, no hidden behaviour, no schema generation step.

import { db, newId, nowIso, toBool, fromBool } from "./db.js";
import { getModel, MODELS } from "./models.js";

// ─── Encode/decode rows ────────────────────────────────────────────────

function decodeRow(modelName, row) {
  if (!row) return row;
  const meta = getModel(modelName);
  const out = { ...row };
  for (const f of meta.json) {
    if (typeof out[f] === "string") {
      try {
        out[f] = JSON.parse(out[f]);
      } catch {
        // leave as-is
      }
    }
  }
  for (const f of meta.bool) {
    if (out[f] !== undefined && out[f] !== null) {
      out[f] = fromBool(out[f]);
    }
  }
  return out;
}

function encodeValue(modelName, field, value) {
  const meta = getModel(modelName);
  // node:sqlite cannot bind `undefined` — coerce to null so optional
  // fields land as NULL rather than crashing the prepared statement.
  if (value === undefined) return null;
  if (value === null) return null;
  if (meta.json.includes(field)) {
    return typeof value === "string" ? value : JSON.stringify(value);
  }
  if (meta.bool.includes(field)) return toBool(value);
  if (value instanceof Date) return value.toISOString();
  return value;
}

function encodeData(modelName, data) {
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = encodeValue(modelName, k, v);
  }
  return out;
}

// ─── WHERE clause ──────────────────────────────────────────────────────

function buildWhere(modelName, where) {
  if (!where || Object.keys(where).length === 0) {
    return { sql: "", params: [] };
  }
  const meta = getModel(modelName);
  const parts = [];
  const params = [];

  for (const [key, raw] of Object.entries(where)) {
    if (key === "AND" || key === "OR") {
      const arr = Array.isArray(raw) ? raw : [raw];
      const subs = arr
        .map((sub) => buildWhere(modelName, sub))
        .filter((s) => s.sql);
      if (subs.length === 0) continue;
      parts.push(
        "(" + subs.map((s) => s.sql.replace(/^WHERE /, "")).join(` ${key} `) + ")"
      );
      for (const s of subs) params.push(...s.params);
      continue;
    }
    if (meta.relations[key]) {
      // Filter rows where a many-to-many relation contains items matching
      // a nested where. Not used by the current frontend, skipped quietly.
      continue;
    }
    if (raw === null) {
      parts.push(`${key} IS NULL`);
      continue;
    }
    if (typeof raw === "object" && !Array.isArray(raw) && !(raw instanceof Date)) {
      // Operator object: { equals, not, in, notIn, contains, startsWith, endsWith, gte, lte, gt, lt }
      for (const [op, val] of Object.entries(raw)) {
        switch (op) {
          case "equals":
            parts.push(`${key} = ?`);
            params.push(encodeValue(modelName, key, val));
            break;
          case "not":
            if (val === null) parts.push(`${key} IS NOT NULL`);
            else {
              parts.push(`${key} != ?`);
              params.push(encodeValue(modelName, key, val));
            }
            break;
          case "in":
            if (!Array.isArray(val) || val.length === 0) {
              parts.push("0");
            } else {
              parts.push(`${key} IN (${val.map(() => "?").join(",")})`);
              params.push(...val.map((v) => encodeValue(modelName, key, v)));
            }
            break;
          case "notIn":
            if (!Array.isArray(val) || val.length === 0) {
              parts.push("1");
            } else {
              parts.push(`${key} NOT IN (${val.map(() => "?").join(",")})`);
              params.push(...val.map((v) => encodeValue(modelName, key, v)));
            }
            break;
          case "contains":
            parts.push(`${key} LIKE ?`);
            params.push(`%${val}%`);
            break;
          case "startsWith":
            parts.push(`${key} LIKE ?`);
            params.push(`${val}%`);
            break;
          case "endsWith":
            parts.push(`${key} LIKE ?`);
            params.push(`%${val}`);
            break;
          case "gte":
            parts.push(`${key} >= ?`);
            params.push(encodeValue(modelName, key, val));
            break;
          case "lte":
            parts.push(`${key} <= ?`);
            params.push(encodeValue(modelName, key, val));
            break;
          case "gt":
            parts.push(`${key} > ?`);
            params.push(encodeValue(modelName, key, val));
            break;
          case "lt":
            parts.push(`${key} < ?`);
            params.push(encodeValue(modelName, key, val));
            break;
          case "has":
            // For JSON-array columns the frontend uses { categories: { has: 'X' } }.
            // SQLite has json_each but it's clearer to use LIKE on the serialized
            // form. This is a best-effort match and good enough for short tags.
            parts.push(`${key} LIKE ?`);
            params.push(`%"${val}"%`);
            break;
          default:
            // Unsupported operator — ignore quietly to keep callers working.
            break;
        }
      }
    } else {
      parts.push(`${key} = ?`);
      params.push(encodeValue(modelName, key, raw));
    }
  }

  if (parts.length === 0) return { sql: "", params: [] };
  return { sql: "WHERE " + parts.join(" AND "), params };
}

// ─── ORDER BY ──────────────────────────────────────────────────────────

function buildOrderBy(orderBy) {
  if (!orderBy) return "";
  const arr = Array.isArray(orderBy) ? orderBy : [orderBy];
  const parts = [];
  for (const o of arr) {
    for (const [field, dir] of Object.entries(o)) {
      const d = String(dir).toUpperCase();
      if (d !== "ASC" && d !== "DESC") continue;
      parts.push(`${field} ${d}`);
    }
  }
  return parts.length ? "ORDER BY " + parts.join(", ") : "";
}

// ─── SELECT clause (column projection) ─────────────────────────────────

function buildSelect(select) {
  if (!select || typeof select !== "object") return "*";
  const cols = Object.entries(select)
    .filter(([, v]) => v === true)
    .map(([k]) => k);
  return cols.length ? cols.join(", ") : "*";
}

// ─── Relation includes ────────────────────────────────────────────────

function attachIncludes(modelName, rows, include) {
  if (!include || !rows || rows.length === 0) return rows;
  const meta = getModel(modelName);
  for (const [relName, relSpec] of Object.entries(include)) {
    if (!relSpec) continue;
    const rel = meta.relations[relName];
    if (!rel || rel.kind !== "manyToMany") continue;

    const targetMeta = getModel(rel.target);
    const ids = rows.map((r) => r.id);
    const placeholders = ids.map(() => "?").join(",");

    const joinRows = db
      .prepare(
        `SELECT ${rel.localKey} AS owner, ${rel.foreignKey} AS targetId FROM ${rel.joinTable} WHERE ${rel.localKey} IN (${placeholders})`
      )
      .all(...ids);

    const targetIds = [...new Set(joinRows.map((j) => j.targetId))];
    let targetRows = [];
    if (targetIds.length) {
      const ph = targetIds.map(() => "?").join(",");
      const projection =
        typeof relSpec === "object" && relSpec.select
          ? buildSelect({ id: true, ...relSpec.select })
          : "*";
      targetRows = db
        .prepare(`SELECT ${projection} FROM ${targetMeta.table} WHERE id IN (${ph})`)
        .all(...targetIds)
        .map((r) => decodeRow(rel.target, r));
    }
    const byId = new Map(targetRows.map((r) => [r.id, r]));

    const ownerToItems = new Map();
    for (const j of joinRows) {
      if (!ownerToItems.has(j.owner)) ownerToItems.set(j.owner, []);
      const item = byId.get(j.targetId);
      if (item) ownerToItems.get(j.owner).push(item);
    }
    for (const row of rows) {
      row[relName] = ownerToItems.get(row.id) || [];
    }
  }
  return rows;
}

// ─── Action implementations ────────────────────────────────────────────

function findMany(modelName, args = {}) {
  const meta = getModel(modelName);
  const where = buildWhere(modelName, args.where);
  const orderBy = buildOrderBy(args.orderBy);
  const limit = args.take ? `LIMIT ${parseInt(args.take, 10)}` : "";
  const offset = args.skip ? `OFFSET ${parseInt(args.skip, 10)}` : "";
  const select = buildSelect(args.select);
  const sql = `SELECT ${select} FROM ${meta.table} ${where.sql} ${orderBy} ${limit} ${offset}`.trim();
  const rows = db.prepare(sql).all(...where.params).map((r) => decodeRow(modelName, r));
  return attachIncludes(modelName, rows, args.include);
}

function findFirst(modelName, args = {}) {
  const rows = findMany(modelName, { ...args, take: 1 });
  return rows[0] || null;
}

function findUnique(modelName, args = {}) {
  // Prisma's where for findUnique uses a single unique field — same SQL.
  return findFirst(modelName, args);
}

function count(modelName, args = {}) {
  const meta = getModel(modelName);
  const where = buildWhere(modelName, args.where);
  const sql = `SELECT COUNT(*) AS c FROM ${meta.table} ${where.sql}`.trim();
  return db.prepare(sql).get(...where.params).c;
}

function splitDataAndRelations(modelName, data) {
  const meta = getModel(modelName);
  const fields = {};
  const relOps = {};
  for (const [k, v] of Object.entries(data)) {
    if (meta.relations[k]) relOps[k] = v;
    else fields[k] = v;
  }
  return { fields, relOps };
}

function applyRelationOps(modelName, ownerId, relOps) {
  if (!relOps) return;
  const meta = getModel(modelName);
  for (const [relName, ops] of Object.entries(relOps)) {
    const rel = meta.relations[relName];
    if (!rel || rel.kind !== "manyToMany" || !ops) continue;

    if (ops.set !== undefined) {
      db.prepare(`DELETE FROM ${rel.joinTable} WHERE ${rel.localKey} = ?`).run(ownerId);
      for (const item of ops.set || []) {
        const targetId = item.id;
        if (!targetId) continue;
        db.prepare(
          `INSERT OR IGNORE INTO ${rel.joinTable} (${rel.localKey}, ${rel.foreignKey}) VALUES (?, ?)`
        ).run(ownerId, targetId);
      }
    }
    if (ops.connect !== undefined) {
      const arr = Array.isArray(ops.connect) ? ops.connect : [ops.connect];
      for (const item of arr) {
        const targetId = item.id;
        if (!targetId) continue;
        db.prepare(
          `INSERT OR IGNORE INTO ${rel.joinTable} (${rel.localKey}, ${rel.foreignKey}) VALUES (?, ?)`
        ).run(ownerId, targetId);
      }
    }
    if (ops.disconnect !== undefined) {
      const arr = Array.isArray(ops.disconnect) ? ops.disconnect : [ops.disconnect];
      for (const item of arr) {
        const targetId = item.id;
        if (!targetId) continue;
        db.prepare(
          `DELETE FROM ${rel.joinTable} WHERE ${rel.localKey} = ? AND ${rel.foreignKey} = ?`
        ).run(ownerId, targetId);
      }
    }
  }
}

function create(modelName, args = {}) {
  const meta = getModel(modelName);
  const { fields, relOps } = splitDataAndRelations(modelName, args.data || {});
  if (!fields.id) fields.id = newId();
  if (!fields.createdAt && "createdAt" in pragmaColumns(meta.table)) fields.createdAt = nowIso();
  if (!fields.updatedAt && "updatedAt" in pragmaColumns(meta.table)) fields.updatedAt = nowIso();
  const encoded = encodeData(modelName, fields);
  const cols = Object.keys(encoded);
  const placeholders = cols.map(() => "?").join(", ");

  // Atomic: if any relation op fails (e.g. FK violation on a connect),
  // the parent INSERT is rolled back too.
  db.transaction(() => {
    db.prepare(
      `INSERT INTO ${meta.table} (${cols.join(", ")}) VALUES (${placeholders})`
    ).run(...cols.map((c) => encoded[c]));
    applyRelationOps(modelName, fields.id, relOps);
  })();

  return findUnique(modelName, { where: { id: fields.id }, include: args.include });
}

function update(modelName, args = {}) {
  const meta = getModel(modelName);
  const whereKeys = Object.keys(args.where || {});
  if (whereKeys.length === 0) throw new Error(`update ${modelName}: where is required`);

  // Resolve target row id (Prisma update uses unique where)
  const existing = findFirst(modelName, { where: args.where });
  if (!existing) {
    const e = new Error(`Record to update not found.`);
    e.code = "P2025";
    throw e;
  }
  const ownerId = existing.id;

  const { fields, relOps } = splitDataAndRelations(modelName, args.data || {});
  if ("updatedAt" in pragmaColumns(meta.table)) fields.updatedAt = fields.updatedAt || nowIso();

  db.transaction(() => {
    if (Object.keys(fields).length) {
      const encoded = encodeData(modelName, fields);
      const setClause = Object.keys(encoded).map((k) => `${k} = ?`).join(", ");
      db.prepare(`UPDATE ${meta.table} SET ${setClause} WHERE id = ?`).run(
        ...Object.values(encoded),
        ownerId
      );
    }
    applyRelationOps(modelName, ownerId, relOps);
  })();

  return findUnique(modelName, { where: { id: ownerId }, include: args.include });
}

function upsert(modelName, args = {}) {
  const existing = findFirst(modelName, { where: args.where });
  if (existing) {
    return update(modelName, { where: args.where, data: args.update, include: args.include });
  }
  // For create, merge the where (which contains unique field) into create data.
  const createData = { ...args.where, ...args.create };
  return create(modelName, { data: createData, include: args.include });
}

function deleteOne(modelName, args = {}) {
  const meta = getModel(modelName);
  const existing = findFirst(modelName, { where: args.where });
  if (!existing) {
    const e = new Error(`Record to delete does not exist.`);
    e.code = "P2025";
    throw e;
  }
  db.prepare(`DELETE FROM ${meta.table} WHERE id = ?`).run(existing.id);
  return existing;
}

function deleteMany(modelName, args = {}) {
  const meta = getModel(modelName);
  const where = buildWhere(modelName, args.where);
  const sql = `DELETE FROM ${meta.table} ${where.sql}`.trim();
  const info = db.prepare(sql).run(...where.params);
  return { count: info.changes };
}

function updateMany(modelName, args = {}) {
  const meta = getModel(modelName);
  const where = buildWhere(modelName, args.where);
  const data = encodeData(modelName, args.data || {});
  if ("updatedAt" in pragmaColumns(meta.table)) data.updatedAt = nowIso();
  const setClause = Object.keys(data).map((k) => `${k} = ?`).join(", ");
  const sql = `UPDATE ${meta.table} SET ${setClause} ${where.sql}`.trim();
  const info = db.prepare(sql).run(...Object.values(data), ...where.params);
  return { count: info.changes };
}

function createMany(modelName, args = {}) {
  const rows = Array.isArray(args.data) ? args.data : [args.data];
  let count = 0;
  const txn = db.transaction(() => {
    for (const r of rows) {
      create(modelName, { data: r });
      count++;
    }
  });
  txn();
  return { count };
}

// ─── Schema introspection cache (for createdAt/updatedAt detection) ────

const _columnsCache = new Map();
function pragmaColumns(table) {
  if (_columnsCache.has(table)) return _columnsCache.get(table);
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  const obj = {};
  for (const r of rows) obj[r.name] = r;
  _columnsCache.set(table, obj);
  return obj;
}

// ─── Public API ────────────────────────────────────────────────────────

export const ACTIONS = {
  findMany,
  findFirst,
  findUnique,
  count,
  create,
  update,
  upsert,
  delete: deleteOne,
  deleteMany,
  updateMany,
  createMany,
};

/**
 * Run a single Prisma-style operation. `args` is either Prisma's
 * options object (preferred) or, for legacy RPC calls, an array of
 * arguments where the first item is the options object.
 */
export function run(model, action, args) {
  if (!MODELS[model]) throw new Error(`Unknown model: ${model}`);
  const fn = ACTIONS[action];
  if (!fn) throw new Error(`Unsupported action: ${action}`);
  const opts = Array.isArray(args) ? args[0] : args;
  return fn(model, opts || {});
}

/**
 * Run multiple operations atomically. Matches Prisma's $transaction
 * semantics for an array of queries.
 */
export function transaction(operations) {
  const results = [];
  const txn = db.transaction(() => {
    for (const op of operations) {
      results.push(run(op.model, op.action, op.args));
    }
  });
  txn();
  return results;
}
