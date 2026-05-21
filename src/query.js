// Minimal Prisma-compatible query translator backed by libsql.
// Every operation is async because libsql is HTTP/WebSocket-backed.
// Supports the subset of Prisma client features the frontend uses:
// findMany / findUnique / findFirst / count / create / update / upsert /
// delete, with where / orderBy / take / skip / select / include /
// connect / set / disconnect on many-to-many relations.

import { db, newId, nowIso, toBool, fromBool } from "./db.js";
import { getModel, MODELS } from "./models.js";

// ─── Encode/decode rows ────────────────────────────────────────────────

function decodeRow(modelName, row) {
  if (!row) return row;
  const meta = getModel(modelName);
  const out = { ...row };
  for (const f of meta.json) {
    if (typeof out[f] === "string") {
      try { out[f] = JSON.parse(out[f]); } catch { /* leave as-is */ }
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
  if (!where || Object.keys(where).length === 0) return { sql: "", params: [] };
  const meta = getModel(modelName);
  const parts = [];
  const params = [];

  for (const [key, raw] of Object.entries(where)) {
    if (key === "AND" || key === "OR") {
      const arr = Array.isArray(raw) ? raw : [raw];
      const subs = arr.map((s) => buildWhere(modelName, s)).filter((s) => s.sql);
      if (subs.length === 0) continue;
      parts.push("(" + subs.map((s) => s.sql.replace(/^WHERE /, "")).join(` ${key} `) + ")");
      for (const s of subs) params.push(...s.params);
      continue;
    }
    if (meta.relations[key]) continue;
    if (raw === null) {
      parts.push(`${key} IS NULL`);
      continue;
    }
    if (typeof raw === "object" && !Array.isArray(raw) && !(raw instanceof Date)) {
      for (const [op, val] of Object.entries(raw)) {
        switch (op) {
          case "equals":
            parts.push(`${key} = ?`); params.push(encodeValue(modelName, key, val)); break;
          case "not":
            if (val === null) parts.push(`${key} IS NOT NULL`);
            else { parts.push(`${key} != ?`); params.push(encodeValue(modelName, key, val)); }
            break;
          case "in":
            if (!Array.isArray(val) || val.length === 0) parts.push("0");
            else {
              parts.push(`${key} IN (${val.map(() => "?").join(",")})`);
              params.push(...val.map((v) => encodeValue(modelName, key, v)));
            }
            break;
          case "notIn":
            if (!Array.isArray(val) || val.length === 0) parts.push("1");
            else {
              parts.push(`${key} NOT IN (${val.map(() => "?").join(",")})`);
              params.push(...val.map((v) => encodeValue(modelName, key, v)));
            }
            break;
          case "contains":   parts.push(`${key} LIKE ?`); params.push(`%${val}%`); break;
          case "startsWith": parts.push(`${key} LIKE ?`); params.push(`${val}%`); break;
          case "endsWith":   parts.push(`${key} LIKE ?`); params.push(`%${val}`); break;
          case "gte": parts.push(`${key} >= ?`); params.push(encodeValue(modelName, key, val)); break;
          case "lte": parts.push(`${key} <= ?`); params.push(encodeValue(modelName, key, val)); break;
          case "gt":  parts.push(`${key} > ?`);  params.push(encodeValue(modelName, key, val)); break;
          case "lt":  parts.push(`${key} < ?`);  params.push(encodeValue(modelName, key, val)); break;
          case "has":
            parts.push(`${key} LIKE ?`); params.push(`%"${val}"%`); break;
          default: break;
        }
      }
    } else {
      parts.push(`${key} = ?`); params.push(encodeValue(modelName, key, raw));
    }
  }

  if (parts.length === 0) return { sql: "", params: [] };
  return { sql: "WHERE " + parts.join(" AND "), params };
}

// ─── ORDER BY / SELECT ─────────────────────────────────────────────────

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

function buildSelect(select) {
  if (!select || typeof select !== "object") return "*";
  const cols = Object.entries(select).filter(([, v]) => v === true).map(([k]) => k);
  return cols.length ? cols.join(", ") : "*";
}

// ─── Relation includes (M2M) ───────────────────────────────────────────

async function attachIncludes(modelName, rows, include) {
  if (!include || !rows || rows.length === 0) return rows;
  const meta = getModel(modelName);
  for (const [relName, relSpec] of Object.entries(include)) {
    if (!relSpec) continue;
    const rel = meta.relations[relName];
    if (!rel || rel.kind !== "manyToMany") continue;

    const targetMeta = getModel(rel.target);
    const ids = rows.map((r) => r.id);
    const placeholders = ids.map(() => "?").join(",");

    const joinRows = await db
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
      const raw = await db
        .prepare(`SELECT ${projection} FROM ${targetMeta.table} WHERE id IN (${ph})`)
        .all(...targetIds);
      targetRows = raw.map((r) => decodeRow(rel.target, r));
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

// ─── Action implementations (all async) ────────────────────────────────

async function findMany(modelName, args = {}) {
  const meta = getModel(modelName);
  const where = buildWhere(modelName, args.where);
  const orderBy = buildOrderBy(args.orderBy);
  const limit = args.take ? `LIMIT ${parseInt(args.take, 10)}` : "";
  const offset = args.skip ? `OFFSET ${parseInt(args.skip, 10)}` : "";
  const select = buildSelect(args.select);
  const sql = `SELECT ${select} FROM ${meta.table} ${where.sql} ${orderBy} ${limit} ${offset}`.trim();
  const raw = await db.prepare(sql).all(...where.params);
  const rows = raw.map((r) => decodeRow(modelName, r));
  return attachIncludes(modelName, rows, args.include);
}

async function findFirst(modelName, args = {}) {
  const rows = await findMany(modelName, { ...args, take: 1 });
  return rows[0] || null;
}

async function findUnique(modelName, args = {}) {
  return findFirst(modelName, args);
}

async function count(modelName, args = {}) {
  const meta = getModel(modelName);
  const where = buildWhere(modelName, args.where);
  const sql = `SELECT COUNT(*) AS c FROM ${meta.table} ${where.sql}`.trim();
  const row = await db.prepare(sql).get(...where.params);
  return Number(row.c);
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

async function applyRelationOps(executor, modelName, ownerId, relOps) {
  if (!relOps) return;
  const meta = getModel(modelName);
  for (const [relName, ops] of Object.entries(relOps)) {
    const rel = meta.relations[relName];
    if (!rel || rel.kind !== "manyToMany" || !ops) continue;

    if (ops.set !== undefined) {
      await executor.prepare(
        `DELETE FROM ${rel.joinTable} WHERE ${rel.localKey} = ?`
      ).run(ownerId);
      for (const item of ops.set || []) {
        if (!item.id) continue;
        await executor.prepare(
          `INSERT OR IGNORE INTO ${rel.joinTable} (${rel.localKey}, ${rel.foreignKey}) VALUES (?, ?)`
        ).run(ownerId, item.id);
      }
    }
    if (ops.connect !== undefined) {
      const arr = Array.isArray(ops.connect) ? ops.connect : [ops.connect];
      for (const item of arr) {
        if (!item.id) continue;
        await executor.prepare(
          `INSERT OR IGNORE INTO ${rel.joinTable} (${rel.localKey}, ${rel.foreignKey}) VALUES (?, ?)`
        ).run(ownerId, item.id);
      }
    }
    if (ops.disconnect !== undefined) {
      const arr = Array.isArray(ops.disconnect) ? ops.disconnect : [ops.disconnect];
      for (const item of arr) {
        if (!item.id) continue;
        await executor.prepare(
          `DELETE FROM ${rel.joinTable} WHERE ${rel.localKey} = ? AND ${rel.foreignKey} = ?`
        ).run(ownerId, item.id);
      }
    }
  }
}

const _columnsCache = new Map();
async function pragmaColumns(table) {
  if (_columnsCache.has(table)) return _columnsCache.get(table);
  const rows = await db.prepare(`PRAGMA table_info(${table})`).all();
  const obj = {};
  for (const r of rows) obj[r.name] = r;
  _columnsCache.set(table, obj);
  return obj;
}

async function create(modelName, args = {}) {
  const meta = getModel(modelName);
  const { fields, relOps } = splitDataAndRelations(modelName, args.data || {});
  if (!fields.id) fields.id = newId();
  const cols = await pragmaColumns(meta.table);
  if (!fields.createdAt && "createdAt" in cols) fields.createdAt = nowIso();
  if (!fields.updatedAt && "updatedAt" in cols) fields.updatedAt = nowIso();
  const encoded = encodeData(modelName, fields);
  const colList = Object.keys(encoded);
  const placeholders = colList.map(() => "?").join(", ");

  await db.transaction(async (tx) => {
    await tx
      .prepare(`INSERT INTO ${meta.table} (${colList.join(", ")}) VALUES (${placeholders})`)
      .run(...colList.map((c) => encoded[c]));
    await applyRelationOps(tx, modelName, fields.id, relOps);
  })();

  return findUnique(modelName, { where: { id: fields.id }, include: args.include });
}

async function update(modelName, args = {}) {
  const meta = getModel(modelName);
  if (!args.where || Object.keys(args.where).length === 0) {
    throw new Error(`update ${modelName}: where is required`);
  }
  const existing = await findFirst(modelName, { where: args.where });
  if (!existing) {
    const e = new Error("Record to update not found.");
    e.code = "P2025";
    throw e;
  }
  const ownerId = existing.id;
  const { fields, relOps } = splitDataAndRelations(modelName, args.data || {});
  const cols = await pragmaColumns(meta.table);
  if ("updatedAt" in cols) fields.updatedAt = fields.updatedAt || nowIso();

  await db.transaction(async (tx) => {
    if (Object.keys(fields).length) {
      const encoded = encodeData(modelName, fields);
      const setClause = Object.keys(encoded).map((k) => `${k} = ?`).join(", ");
      await tx
        .prepare(`UPDATE ${meta.table} SET ${setClause} WHERE id = ?`)
        .run(...Object.values(encoded), ownerId);
    }
    await applyRelationOps(tx, modelName, ownerId, relOps);
  })();

  return findUnique(modelName, { where: { id: ownerId }, include: args.include });
}

async function upsert(modelName, args = {}) {
  const existing = await findFirst(modelName, { where: args.where });
  if (existing) {
    return update(modelName, { where: args.where, data: args.update, include: args.include });
  }
  const createData = { ...args.where, ...args.create };
  return create(modelName, { data: createData, include: args.include });
}

async function deleteOne(modelName, args = {}) {
  const meta = getModel(modelName);
  const existing = await findFirst(modelName, { where: args.where });
  if (!existing) {
    const e = new Error("Record to delete does not exist.");
    e.code = "P2025";
    throw e;
  }
  await db.prepare(`DELETE FROM ${meta.table} WHERE id = ?`).run(existing.id);
  return existing;
}

async function deleteMany(modelName, args = {}) {
  const meta = getModel(modelName);
  const where = buildWhere(modelName, args.where);
  const sql = `DELETE FROM ${meta.table} ${where.sql}`.trim();
  const info = await db.prepare(sql).run(...where.params);
  return { count: info.changes };
}

async function updateMany(modelName, args = {}) {
  const meta = getModel(modelName);
  const where = buildWhere(modelName, args.where);
  const data = encodeData(modelName, args.data || {});
  const cols = await pragmaColumns(meta.table);
  if ("updatedAt" in cols) data.updatedAt = nowIso();
  const setClause = Object.keys(data).map((k) => `${k} = ?`).join(", ");
  const sql = `UPDATE ${meta.table} SET ${setClause} ${where.sql}`.trim();
  const info = await db.prepare(sql).run(...Object.values(data), ...where.params);
  return { count: info.changes };
}

async function createMany(modelName, args = {}) {
  const rows = Array.isArray(args.data) ? args.data : [args.data];
  let n = 0;
  for (const r of rows) {
    await create(modelName, { data: r });
    n++;
  }
  return { count: n };
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

export async function run(model, action, args) {
  if (!MODELS[model]) throw new Error(`Unknown model: ${model}`);
  const fn = ACTIONS[action];
  if (!fn) throw new Error(`Unsupported action: ${action}`);
  const opts = Array.isArray(args) ? args[0] : args;
  return fn(model, opts || {});
}

export async function transaction(operations) {
  const results = [];
  for (const op of operations) {
    results.push(await run(op.model, op.action, op.args));
  }
  return results;
}
