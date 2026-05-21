import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import "./db.js"; // initialise SQLite + apply schema
import { run, transaction } from "./query.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// ─── Auth middleware (for writing / admin endpoints) ───────────────────

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

// ─── Tiny helpers ──────────────────────────────────────────────────────

const ok = (res, data) => res.json(data);
const fail = (res, err) => {
  console.error(err);
  res.status(500).json({ error: err.message || String(err) });
};

// ─── Health & root ─────────────────────────────────────────────────────

app.get("/", (_req, res) => res.send("Tour & Travels SQLite API Server is running."));
app.get("/health", (_req, res) =>
  res.json({ status: "healthy", database: "sqlite", timestamp: new Date() })
);

// =========================================================================
// PUBLIC ENDPOINTS
// =========================================================================

// Destinations
app.get("/api/destinations", (req, res) => {
  try {
    const { active } = req.query;
    const where = {};
    if (active === "true" || active === undefined) where.isActive = true;
    ok(res, run("destination", "findMany", { where, orderBy: { sortOrder: "asc" } }));
  } catch (e) { fail(res, e); }
});
app.get("/api/destinations/:slug", (req, res) => {
  try {
    const row = run("destination", "findFirst", {
      where: { slug: req.params.slug, isActive: true },
    });
    if (!row) return res.status(404).json({ error: "Destination not found" });
    ok(res, row);
  } catch (e) { fail(res, e); }
});

// Packages
app.get("/api/packages", (req, res) => {
  try {
    const { featured, active, category, limit } = req.query;
    const where = {};
    if (active === "true" || active === undefined) where.isActive = true;
    if (featured === "true") where.isFeatured = true;
    const opts = { where, orderBy: { createdAt: "desc" } };
    if (limit) opts.take = parseInt(limit, 10);
    let rows = run("package", "findMany", opts);
    if (category) {
      rows = rows.filter(
        (p) => Array.isArray(p.categories) && p.categories.includes(category)
      );
    }
    ok(res, rows);
  } catch (e) { fail(res, e); }
});
app.get("/api/packages/:slug", (req, res) => {
  try {
    const row = run("package", "findFirst", { where: { slug: req.params.slug } });
    if (!row) return res.status(404).json({ error: "Package not found" });
    ok(res, row);
  } catch (e) { fail(res, e); }
});

// Blogs
app.get("/api/blogs", (req, res) => {
  try {
    const { published, limit } = req.query;
    const where = {};
    if (published === "true" || published === undefined) where.isPublished = true;
    const opts = { where, orderBy: { publishedAt: "desc" } };
    if (limit) opts.take = parseInt(limit, 10);
    ok(res, run("blog", "findMany", opts));
  } catch (e) { fail(res, e); }
});
app.get("/api/blogs/:slug", (req, res) => {
  try {
    const row = run("blog", "findFirst", { where: { slug: req.params.slug } });
    if (!row) return res.status(404).json({ error: "Blog not found" });
    ok(res, row);
  } catch (e) { fail(res, e); }
});

// Cab
app.get("/api/cab/vehicles", (_req, res) => {
  try {
    ok(res, run("cabVehicle", "findMany", {
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
    }));
  } catch (e) { fail(res, e); }
});
app.get("/api/cab/routes", (_req, res) => {
  try {
    ok(res, run("cabRoute", "findMany", {
      where: { isActive: true },
      orderBy: { fromCity: "asc" },
    }));
  } catch (e) { fail(res, e); }
});

// Settings
app.get("/api/settings", (_req, res) => {
  try {
    const rows = run("siteSetting", "findMany", {});
    const obj = {};
    for (const s of rows) obj[s.key] = s.value;
    ok(res, obj);
  } catch (e) { fail(res, e); }
});
app.get("/api/settings/:key", (req, res) => {
  try {
    const row = run("siteSetting", "findFirst", { where: { key: req.params.key } });
    ok(res, { value: row?.value || "" });
  } catch (e) { fail(res, e); }
});

// Testimonials / Activities
app.get("/api/testimonials", (_req, res) => {
  try { ok(res, run("testimonial", "findMany", { orderBy: { createdAt: "desc" } })); }
  catch (e) { fail(res, e); }
});
app.get("/api/activities", (_req, res) => {
  try { ok(res, run("activity", "findMany", { orderBy: { sortOrder: "asc" } })); }
  catch (e) { fail(res, e); }
});

// Internal pages (nav-groups)
app.get("/api/internal-pages", (_req, res) => {
  try {
    ok(res, run("internalPage", "findMany", {
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        packages: { select: { id: true } },
        destinations: { select: { id: true } },
      },
    }));
  } catch (e) { fail(res, e); }
});
app.get("/api/internal-pages/:slug", (req, res) => {
  try {
    const row = run("internalPage", "findFirst", {
      where: { slug: req.params.slug },
      include: { packages: true, destinations: true },
    });
    if (!row) return res.status(404).json({ error: "Internal page not found" });
    ok(res, row);
  } catch (e) { fail(res, e); }
});

// Inquiries (public form submission)
app.post("/api/inquiries", (req, res) => {
  try {
    const d = req.body || {};
    const row = run("inquiry", "create", {
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
// ADMIN ENDPOINTS (authenticated)
// =========================================================================

// Login
app.post("/api/admin/login", authenticate, (req, res) => {
  try {
    const row = run("adminUser", "findFirst", { where: { email: req.body?.email } });
    ok(res, row);
  } catch (e) { fail(res, e); }
});

// A small factory to wire CRUD endpoints for a model with consistent
// shape. Keeps the file short and the routes uniform.
function crud(prefix, model, opts = {}) {
  const listOrder = opts.orderBy || { createdAt: "desc" };

  app.get(`/api/admin/${prefix}`, authenticate, (_req, res) => {
    try { ok(res, run(model, "findMany", { orderBy: listOrder })); }
    catch (e) { fail(res, e); }
  });
  app.post(`/api/admin/${prefix}`, authenticate, (req, res) => {
    try { ok(res, run(model, "create", { data: req.body })); }
    catch (e) { fail(res, e); }
  });
  app.put(`/api/admin/${prefix}/:id`, authenticate, (req, res) => {
    try { ok(res, run(model, "update", { where: { id: req.params.id }, data: req.body })); }
    catch (e) { fail(res, e); }
  });
  app.delete(`/api/admin/${prefix}/:id`, authenticate, (req, res) => {
    try {
      run(model, "delete", { where: { id: req.params.id } });
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

// Settings (upsert each key/value)
app.post("/api/admin/settings", authenticate, (req, res) => {
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
    transaction(ops);
    ok(res, { success: true });
  } catch (e) { fail(res, e); }
});

// Manual reseed trigger. Useful when the on-boot seed got skipped or
// the DB lost data on a Render restart. Idempotent (the seed only does
// upserts) so it's safe to call as often as you like.
app.post("/api/admin/reseed", authenticate, async (_req, res) => {
  try {
    const before = run("destination", "count", {});
    const mod = await import("../db/seed.js?ts=" + Date.now());
    if (mod.seed) await mod.seed();
    const after = {
      destinations: run("destination", "count", {}),
      packages: run("package", "count", {}),
      packagesTrek: run("package", "count", { where: { isTrek: true } }),
      blogs: run("blog", "count", {}),
      siteSettings: run("siteSetting", "count", {}),
      internalPages: run("internalPage", "count", {}),
    };
    ok(res, { reseeded: true, destinationsBefore: before, after });
  } catch (e) {
    console.error("Reseed failed:", e);
    res.status(500).json({ error: e.message || String(e), stack: e.stack });
  }
});

// =========================================================================
// UNIVERSAL PRISMA-STYLE RPC (kept for the frontend's lib/prisma.ts proxy)
// =========================================================================

app.post("/api/prisma", authenticate, (req, res) => {
  const { model, action, args = [] } = req.body || {};
  try {
    const result = run(model, action, args);
    ok(res, { data: result });
  } catch (e) { fail(res, e); }
});

app.post("/api/prisma/transaction", authenticate, (req, res) => {
  const { operations = [] } = req.body || {};
  try {
    const data = transaction(
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
// Render free tier wipes the ephemeral filesystem between spin-downs and
// the start.sh seed sometimes doesn't run on re-spin. Belt-and-braces:
// check the destinations count at boot and run the seed if empty. Seed
// is fully idempotent (all upserts) so this is safe at any moment.
async function autoSeedIfEmpty() {
  try {
    const count = run("destination", "count", {});
    if (count === 0) {
      console.log("🌱 destinations table empty — running seed...");
      const mod = await import("../db/seed.js?ts=" + Date.now());
      if (mod.seed) await mod.seed();
      console.log("✅ auto-seed complete.");
    } else {
      console.log(`📦 DB already populated (${count} destinations).`);
    }
  } catch (e) {
    console.error("❌ auto-seed check failed:", e.message);
  }
}

// ─── Start ─────────────────────────────────────────────────────────────

app.listen(PORT, async () => {
  console.log(`🚀 SQLite REST backend live on :${PORT}`);
  await autoSeedIfEmpty();
});
