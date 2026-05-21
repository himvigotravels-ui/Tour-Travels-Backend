import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import "./db.js"; // initialise libsql + apply schema
import { run, transaction } from "./query.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// ─── Auth ──────────────────────────────────────────────────────────────

const EXPECTED_SECRET =
  process.env.API_SECRET_KEY || "himvigo-super-secret-key-2026";

function authenticate(req, res, next) {
  const secret =
    req.headers["x-api-key"] ||
    req.headers["authorization"]?.split(" ")[1];
  if (!secret || secret !== EXPECTED_SECRET) {
    return res.status(401).json({ error: "Unauthorized: Invalid or missing API key." });
  }
  next();
}

const ok = (res, data) => res.json(data);
const fail = (res, err) => {
  console.error(err);
  res.status(500).json({ error: err.message || String(err) });
};

// ─── Health & root ─────────────────────────────────────────────────────

app.get("/", (_req, res) => res.send("Tour & Travels libsql API Server is running."));
app.get("/health", (_req, res) =>
  res.json({ status: "healthy", database: process.env.TURSO_DATABASE_URL ? "turso" : "sqlite", timestamp: new Date() })
);

// =========================================================================
// PUBLIC ENDPOINTS
// =========================================================================

app.get("/api/destinations", async (req, res) => {
  try {
    const { active } = req.query;
    const where = {};
    if (active === "true" || active === undefined) where.isActive = true;
    ok(res, await run("destination", "findMany", { where, orderBy: { sortOrder: "asc" } }));
  } catch (e) { fail(res, e); }
});
app.get("/api/destinations/:slug", async (req, res) => {
  try {
    const row = await run("destination", "findFirst", {
      where: { slug: req.params.slug, isActive: true },
    });
    if (!row) return res.status(404).json({ error: "Destination not found" });
    ok(res, row);
  } catch (e) { fail(res, e); }
});

app.get("/api/packages", async (req, res) => {
  try {
    const { featured, active, category, limit } = req.query;
    const where = {};
    if (active === "true" || active === undefined) where.isActive = true;
    if (featured === "true") where.isFeatured = true;
    const opts = { where, orderBy: { createdAt: "desc" } };
    if (limit) opts.take = parseInt(limit, 10);
    let rows = await run("package", "findMany", opts);
    if (category) {
      rows = rows.filter((p) => Array.isArray(p.categories) && p.categories.includes(category));
    }
    ok(res, rows);
  } catch (e) { fail(res, e); }
});
app.get("/api/packages/:slug", async (req, res) => {
  try {
    const row = await run("package", "findFirst", { where: { slug: req.params.slug } });
    if (!row) return res.status(404).json({ error: "Package not found" });
    ok(res, row);
  } catch (e) { fail(res, e); }
});

app.get("/api/blogs", async (req, res) => {
  try {
    const { published, limit } = req.query;
    const where = {};
    if (published === "true" || published === undefined) where.isPublished = true;
    const opts = { where, orderBy: { publishedAt: "desc" } };
    if (limit) opts.take = parseInt(limit, 10);
    ok(res, await run("blog", "findMany", opts));
  } catch (e) { fail(res, e); }
});
app.get("/api/blogs/:slug", async (req, res) => {
  try {
    const row = await run("blog", "findFirst", { where: { slug: req.params.slug } });
    if (!row) return res.status(404).json({ error: "Blog not found" });
    ok(res, row);
  } catch (e) { fail(res, e); }
});

app.get("/api/cab/vehicles", async (_req, res) => {
  try {
    ok(res, await run("cabVehicle", "findMany", {
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
    }));
  } catch (e) { fail(res, e); }
});
app.get("/api/cab/routes", async (_req, res) => {
  try {
    ok(res, await run("cabRoute", "findMany", {
      where: { isActive: true },
      orderBy: { fromCity: "asc" },
    }));
  } catch (e) { fail(res, e); }
});

app.get("/api/settings", async (_req, res) => {
  try {
    const rows = await run("siteSetting", "findMany", {});
    const obj = {};
    for (const s of rows) obj[s.key] = s.value;
    ok(res, obj);
  } catch (e) { fail(res, e); }
});
app.get("/api/settings/:key", async (req, res) => {
  try {
    const row = await run("siteSetting", "findFirst", { where: { key: req.params.key } });
    ok(res, { value: row?.value || "" });
  } catch (e) { fail(res, e); }
});

app.get("/api/testimonials", async (_req, res) => {
  try { ok(res, await run("testimonial", "findMany", { orderBy: { createdAt: "desc" } })); }
  catch (e) { fail(res, e); }
});
app.get("/api/activities", async (_req, res) => {
  try { ok(res, await run("activity", "findMany", { orderBy: { sortOrder: "asc" } })); }
  catch (e) { fail(res, e); }
});

app.get("/api/internal-pages", async (_req, res) => {
  try {
    ok(res, await run("internalPage", "findMany", {
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        packages: { select: { id: true } },
        destinations: { select: { id: true } },
      },
    }));
  } catch (e) { fail(res, e); }
});
app.get("/api/internal-pages/:slug", async (req, res) => {
  try {
    const row = await run("internalPage", "findFirst", {
      where: { slug: req.params.slug },
      include: { packages: true, destinations: true },
    });
    if (!row) return res.status(404).json({ error: "Internal page not found" });
    ok(res, row);
  } catch (e) { fail(res, e); }
});

app.post("/api/inquiries", async (req, res) => {
  try {
    const d = req.body || {};
    const row = await run("inquiry", "create", {
      data: {
        name: d.name,
        phone: d.phone,
        fromCity: d.fromCity,
        toCity: d.toCity,
        travelDate: d.travelDate,
        passengers: d.passengers,
        duration: d.duration,
        message: d.message,
        status: d.status || "new",
        adults: parseInt(d.adults || 1, 10),
        children: parseInt(d.children || 0, 10),
        email: d.email,
        pickupLocation: d.pickupLocation,
        pickupDate: d.pickupDate ? new Date(d.pickupDate) : null,
        dropLocation: d.dropLocation,
        dropDate: d.dropDate ? new Date(d.dropDate) : null,
      },
    });
    ok(res, row);
  } catch (e) { fail(res, e); }
});

// =========================================================================
// ADMIN ENDPOINTS
// =========================================================================

app.post("/api/admin/login", authenticate, async (req, res) => {
  try {
    ok(res, await run("adminUser", "findFirst", { where: { email: req.body?.email } }));
  } catch (e) { fail(res, e); }
});

function crud(prefix, model, opts = {}) {
  const listOrder = opts.orderBy || { createdAt: "desc" };

  app.get(`/api/admin/${prefix}`, authenticate, async (_req, res) => {
    try { ok(res, await run(model, "findMany", { orderBy: listOrder })); }
    catch (e) { fail(res, e); }
  });
  app.post(`/api/admin/${prefix}`, authenticate, async (req, res) => {
    try { ok(res, await run(model, "create", { data: req.body })); }
    catch (e) { fail(res, e); }
  });
  app.put(`/api/admin/${prefix}/:id`, authenticate, async (req, res) => {
    try { ok(res, await run(model, "update", { where: { id: req.params.id }, data: req.body })); }
    catch (e) { fail(res, e); }
  });
  app.delete(`/api/admin/${prefix}/:id`, authenticate, async (req, res) => {
    try {
      await run(model, "delete", { where: { id: req.params.id } });
      ok(res, { success: true });
    } catch (e) { fail(res, e); }
  });
}

crud("inquiries",     "inquiry",     { orderBy: { createdAt: "desc" } });
crud("packages",      "package",     { orderBy: { createdAt: "desc" } });
crud("destinations",  "destination", { orderBy: { sortOrder: "asc" } });
crud("blogs",         "blog",        { orderBy: { createdAt: "desc" } });
crud("testimonials",  "testimonial", { orderBy: { createdAt: "desc" } });
crud("activities",    "activity",    { orderBy: { sortOrder: "asc" } });
crud("cab/vehicles",  "cabVehicle",  { orderBy: { createdAt: "desc" } });
crud("cab/routes",    "cabRoute",    { orderBy: { createdAt: "desc" } });
crud("internal-pages","internalPage",{ orderBy: { sortOrder: "asc" } });

app.post("/api/admin/settings", authenticate, async (req, res) => {
  try {
    const data = req.body || {};
    const ops = Object.entries(data).map(([key, value]) => ({
      model: "siteSetting",
      action: "upsert",
      args: {
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      },
    }));
    await transaction(ops);
    ok(res, { success: true });
  } catch (e) { fail(res, e); }
});

app.post("/api/admin/reseed", authenticate, async (_req, res) => {
  try {
    const before = await run("destination", "count", {});
    const mod = await import("../db/seed.js?ts=" + Date.now());
    if (mod.seed) await mod.seed();
    const after = {
      destinations: await run("destination", "count", {}),
      packages: await run("package", "count", {}),
      packagesTrek: await run("package", "count", { where: { isTrek: true } }),
      blogs: await run("blog", "count", {}),
      siteSettings: await run("siteSetting", "count", {}),
      internalPages: await run("internalPage", "count", {}),
    };
    ok(res, { reseeded: true, destinationsBefore: before, after });
  } catch (e) {
    console.error("Reseed failed:", e);
    res.status(500).json({ error: e.message || String(e), stack: e.stack });
  }
});

// =========================================================================
// UNIVERSAL PRISMA-STYLE RPC (frontend's lib/prisma.ts proxy)
// =========================================================================

app.post("/api/prisma", authenticate, async (req, res) => {
  const { model, action, args = [] } = req.body || {};
  try {
    const result = await run(model, action, args);
    ok(res, { data: result });
  } catch (e) { fail(res, e); }
});

app.post("/api/prisma/transaction", authenticate, async (req, res) => {
  const { operations = [] } = req.body || {};
  try {
    const data = await transaction(
      operations.map((op) => ({
        model: op.model,
        action: op.action,
        args: Array.isArray(op.args) ? op.args[0] : op.args,
      }))
    );
    ok(res, { data });
  } catch (e) { fail(res, e); }
});

// ─── Auto-seed on empty DB ─────────────────────────────────────────────

async function autoSeedIfEmpty() {
  try {
    const c = await run("destination", "count", {});
    if (c === 0) {
      console.log("🌱 destinations empty — running seed...");
      const mod = await import("../db/seed.js?ts=" + Date.now());
      if (mod.seed) await mod.seed();
      console.log("✅ auto-seed complete.");
    } else {
      console.log(`📦 DB already populated (${c} destinations).`);
    }
  } catch (e) {
    console.error("❌ auto-seed check failed:", e.message);
  }
}

app.listen(PORT, async () => {
  console.log(`🚀 libsql REST backend live on :${PORT}`);
  await autoSeedIfEmpty();
});
