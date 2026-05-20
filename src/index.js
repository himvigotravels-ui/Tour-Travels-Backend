import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

// Ensure DATABASE_URL is always set — falls back to local prisma dir
// start.sh will override this to /var/data/tour-travels.db when a persistent disk is available
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./prisma/dev.db";
}

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Prisma Client with SQLite
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// SQLite Array/JSON Serialization fields mapping
const JSON_FIELDS = {
  package: ["imageUrls", "itinerary", "inclusions", "exclusions", "categories"],
  blog: ["tags"],
  destination: ["highlights", "categories"],
  cabVehicle: ["features"]
};

// Convert arrays/objects in arguments to JSON strings for SQLite
const serializeObj = (model, obj) => {
  if (!model || !obj || typeof obj !== "object") return obj;
  const fields = JSON_FIELDS[model];
  if (!fields) return obj;

  const newObj = Array.isArray(obj) ? [...obj] : { ...obj };
  
  for (const key in newObj) {
    if (fields.includes(key)) {
      const val = newObj[key];
      if (val !== undefined && val !== null) {
        if (typeof val === "object" && !Array.isArray(val)) {
          const opObj = { ...val };
          for (const opKey in opObj) {
            if (opKey === "set" || opKey === "push") {
              opObj[opKey] = JSON.stringify(opObj[opKey]);
            }
          }
          newObj[key] = opObj;
        } else {
          newObj[key] = JSON.stringify(val);
        }
      }
    } else if (newObj[key] && typeof newObj[key] === "object") {
      newObj[key] = serializeObj(model, newObj[key]);
    }
  }
  return newObj;
};

// Convert JSON strings in database result back to arrays/objects for Next.js frontend
const deserializeObj = (model, obj) => {
  if (!model || !obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => deserializeObj(model, item));
  }

  const fields = JSON_FIELDS[model];
  const newObj = { ...obj };

  if (fields) {
    for (const key of fields) {
      if (typeof newObj[key] === "string") {
        try {
          newObj[key] = JSON.parse(newObj[key]);
        } catch (e) {
          // Keep as string if it fails to parse
        }
      }
    }
  }

  // Recursively deserialize nested models/relations
  for (const key in newObj) {
    if (newObj[key] && typeof newObj[key] === "object") {
      // Guess model type based on relation key name
      let nestedModel = null;
      if (key === "packages") nestedModel = "package";
      else if (key === "destinations") nestedModel = "destination";
      else if (key === "blogs") nestedModel = "blog";
      else if (key === "cabVehicles") nestedModel = "cabVehicle";
      
      newObj[key] = deserializeObj(nestedModel || key, newObj[key]);
    }
  }

  return newObj;
};

// Security middleware: verify client authentication secret (for all writing / admin endpoints)
const authenticate = (req, res, next) => {
  const secretKey = req.headers["x-api-key"] || req.headers["authorization"]?.split(" ")[1];
  const expectedSecret = process.env.API_SECRET_KEY || "himvigo-super-secret-key-2026";
  
  if (!secretKey || secretKey !== expectedSecret) {
    return res.status(401).json({ error: "Unauthorized: Invalid or missing API key." });
  }
  next();
};

// Health Check
app.get("/health", (req, res) => {
  res.json({ status: "healthy", database: "sqlite", timestamp: new Date() });
});

app.get("/", (req, res) => {
  res.send("Tour & Travels SQLite API Server is running.");
});

// ==========================================
// 📍 PUBLIC CLIENT REST ENDPOINTS
// ==========================================

// 1. Get Destinations
app.get("/api/destinations", async (req, res) => {
  try {
    const { active } = req.query;
    const where = {};
    if (active === "true" || active === undefined) where.isActive = true;

    const result = await prisma.destination.findMany({
      where,
      orderBy: { sortOrder: "asc" }
    });

    res.json(deserializeObj("destination", result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Get Destination by Slug
app.get("/api/destinations/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await prisma.destination.findFirst({
      where: { slug, isActive: true }
    });
    if (!result) return res.status(404).json({ error: "Destination not found" });
    res.json(deserializeObj("destination", result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Get Packages
app.get("/api/packages", async (req, res) => {
  try {
    const { featured, active, category, limit } = req.query;
    const where = {};
    if (active === "true" || active === undefined) where.isActive = true;
    if (featured === "true") where.isFeatured = true;

    const findOptions = {
      where,
      orderBy: { createdAt: "desc" }
    };

    if (limit) findOptions.take = parseInt(limit);

    let result = await prisma.package.findMany(findOptions);
    let deserialized = deserializeObj("package", result);

    // Filter by category in JS since SQLite does not support array query natively
    if (category) {
      deserialized = deserialized.filter(p => p.categories && p.categories.includes(category));
    }

    res.json(deserialized);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Get Package by Slug
app.get("/api/packages/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await prisma.package.findUnique({
      where: { slug }
    });
    if (!result) return res.status(404).json({ error: "Package not found" });
    res.json(deserializeObj("package", result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Get Blogs
app.get("/api/blogs", async (req, res) => {
  try {
    const { published, limit } = req.query;
    const where = {};
    if (published === "true" || published === undefined) where.isPublished = true;

    const findOptions = {
      where,
      orderBy: { publishedAt: "desc" }
    };

    if (limit) findOptions.take = parseInt(limit);

    const result = await prisma.blog.findMany(findOptions);
    res.json(deserializeObj("blog", result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Get Blog by Slug
app.get("/api/blogs/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await prisma.blog.findUnique({
      where: { slug }
    });
    if (!result) return res.status(404).json({ error: "Blog not found" });
    res.json(deserializeObj("blog", result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Get Cab Vehicles
app.get("/api/cab/vehicles", async (req, res) => {
  try {
    const result = await prisma.cabVehicle.findMany({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" }
    });
    res.json(deserializeObj("cabVehicle", result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Get Cab Routes
app.get("/api/cab/routes", async (req, res) => {
  try {
    const result = await prisma.cabRoute.findMany({
      where: { isActive: true },
      orderBy: { fromCity: "asc" }
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 9. Get Site Settings
app.get("/api/settings", async (req, res) => {
  try {
    const settings = await prisma.siteSetting.findMany();
    const obj = {};
    settings.forEach((s) => (obj[s.key] = s.value));
    res.json(obj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 10. Get Single Setting Key
app.get("/api/settings/:key", async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await prisma.siteSetting.findUnique({ where: { key } });
    res.json({ value: setting?.value || "" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 11. Get Testimonials
app.get("/api/testimonials", async (req, res) => {
  try {
    const result = await prisma.testimonial.findMany({
      orderBy: { createdAt: "desc" }
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 12. Get Activities
app.get("/api/activities", async (req, res) => {
  try {
    const result = await prisma.activity.findMany({
      orderBy: { sortOrder: "asc" }
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 13. Get Internal Pages
app.get("/api/internal-pages", async (req, res) => {
  try {
    const pages = await prisma.internalPage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        packages: { select: { id: true } },
        destinations: { select: { id: true } },
      },
    });
    res.json(deserializeObj("internalPage", pages));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 14. Get Internal Page by Slug
app.get("/api/internal-pages/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const page = await prisma.internalPage.findUnique({
      where: { slug },
      include: {
        packages: true,
        destinations: true,
      },
    });
    if (!page) return res.status(404).json({ error: "Internal page not found" });
    res.json(deserializeObj("internalPage", page));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 15. Create Customer Inquiry (Public Form Submission)
app.post("/api/inquiries", async (req, res) => {
  try {
    const data = req.body;
    const result = await prisma.inquiry.create({
      data: {
        name: data.name,
        phone: data.phone,
        fromCity: data.fromCity,
        toCity: data.toCity,
        travelDate: data.travelDate,
        passengers: data.passengers,
        duration: data.duration,
        message: data.message,
        status: data.status || "new",
        adults: parseInt(data.adults || 1),
        children: parseInt(data.children || 0),
        email: data.email,
        pickupLocation: data.pickupLocation,
        pickupDate: data.pickupDate ? new Date(data.pickupDate) : null,
        dropLocation: data.dropLocation,
        dropDate: data.dropDate ? new Date(data.dropDate) : null,
      }
    });
    res.json(result);
  } catch (error) {
    console.error("Error creating customer inquiry:", error);
    res.status(500).json({ error: error.message });
  }
});


// ==========================================
// 🔑 ADMIN REST ENDPOINTS (AUTHENTICATED)
// ==========================================

// 1. Admin Login Verification
app.post("/api/admin/login", authenticate, async (req, res) => {
  try {
    const { email } = req.body;
    const admin = await prisma.adminUser.findUnique({ where: { email } });
    res.json(admin);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Admin Inquiries Management
app.get("/api/admin/inquiries", authenticate, async (req, res) => {
  try {
    const result = await prisma.inquiry.findMany({ orderBy: { createdAt: "desc" } });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/admin/inquiries", authenticate, async (req, res) => {
  try {
    const result = await prisma.inquiry.create({ data: req.body });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/admin/inquiries/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    if (data.pickupDate) data.pickupDate = new Date(data.pickupDate);
    if (data.dropDate) data.dropDate = new Date(data.dropDate);
    
    const result = await prisma.inquiry.update({ where: { id }, data });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/admin/inquiries/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.inquiry.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Admin Packages Management
app.get("/api/admin/packages", authenticate, async (req, res) => {
  try {
    const result = await prisma.package.findMany({ orderBy: { createdAt: "desc" } });
    res.json(deserializeObj("package", result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/admin/packages", authenticate, async (req, res) => {
  try {
    const data = serializeObj("package", req.body);
    const result = await prisma.package.create({ data });
    res.json(deserializeObj("package", result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/admin/packages/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const data = serializeObj("package", req.body);
    const result = await prisma.package.update({ where: { id }, data });
    res.json(deserializeObj("package", result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/admin/packages/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.package.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Admin Destinations Management
app.get("/api/admin/destinations", authenticate, async (req, res) => {
  try {
    const result = await prisma.destination.findMany({ orderBy: { sortOrder: "asc" } });
    res.json(deserializeObj("destination", result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/admin/destinations", authenticate, async (req, res) => {
  try {
    const data = serializeObj("destination", req.body);
    const result = await prisma.destination.create({ data });
    res.json(deserializeObj("destination", result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/admin/destinations/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const data = serializeObj("destination", req.body);
    const result = await prisma.destination.update({ where: { id }, data });
    res.json(deserializeObj("destination", result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/admin/destinations/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.destination.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Admin Blogs Management
app.get("/api/admin/blogs", authenticate, async (req, res) => {
  try {
    const result = await prisma.blog.findMany({ orderBy: { createdAt: "desc" } });
    res.json(deserializeObj("blog", result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/admin/blogs", authenticate, async (req, res) => {
  try {
    const data = serializeObj("blog", req.body);
    if (data.publishedAt) data.publishedAt = new Date(data.publishedAt);
    const result = await prisma.blog.create({ data });
    res.json(deserializeObj("blog", result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/admin/blogs/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const data = serializeObj("blog", req.body);
    if (data.publishedAt) data.publishedAt = new Date(data.publishedAt);
    const result = await prisma.blog.update({ where: { id }, data });
    res.json(deserializeObj("blog", result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/admin/blogs/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.blog.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Admin Testimonials Management
app.get("/api/admin/testimonials", authenticate, async (req, res) => {
  try {
    const result = await prisma.testimonial.findMany({ orderBy: { createdAt: "desc" } });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/admin/testimonials", authenticate, async (req, res) => {
  try {
    const result = await prisma.testimonial.create({ data: req.body });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/admin/testimonials/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await prisma.testimonial.update({ where: { id }, data: req.body });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/admin/testimonials/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.testimonial.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Admin Activities Management
app.get("/api/admin/activities", authenticate, async (req, res) => {
  try {
    const result = await prisma.activity.findMany({ orderBy: { sortOrder: "asc" } });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/admin/activities", authenticate, async (req, res) => {
  try {
    const result = await prisma.activity.create({ data: req.body });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/admin/activities/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await prisma.activity.update({ where: { id }, data: req.body });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/admin/activities/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.activity.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Admin Cab Management
app.get("/api/admin/cab/vehicles", authenticate, async (req, res) => {
  try {
    const result = await prisma.cabVehicle.findMany({ orderBy: { createdAt: "desc" } });
    res.json(deserializeObj("cabVehicle", result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/admin/cab/vehicles", authenticate, async (req, res) => {
  try {
    const data = serializeObj("cabVehicle", req.body);
    const result = await prisma.cabVehicle.create({ data });
    res.json(deserializeObj("cabVehicle", result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/admin/cab/vehicles/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const data = serializeObj("cabVehicle", req.body);
    const result = await prisma.cabVehicle.update({ where: { id }, data });
    res.json(deserializeObj("cabVehicle", result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/admin/cab/vehicles/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.cabVehicle.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/admin/cab/routes", authenticate, async (req, res) => {
  try {
    const result = await prisma.cabRoute.findMany({ orderBy: { createdAt: "desc" } });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/admin/cab/routes", authenticate, async (req, res) => {
  try {
    const result = await prisma.cabRoute.create({ data: req.body });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/admin/cab/routes/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await prisma.cabRoute.update({ where: { id }, data: req.body });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/admin/cab/routes/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.cabRoute.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 9. Admin Settings Management
app.post("/api/admin/settings", authenticate, async (req, res) => {
  try {
    const data = req.body;
    const ops = Object.entries(data).map(([key, value]) =>
      prisma.siteSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    );
    await prisma.$transaction(ops);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 10. Admin Internal Pages Management
app.get("/api/admin/internal-pages", authenticate, async (req, res) => {
  try {
    const result = await prisma.internalPage.findMany({ orderBy: { sortOrder: "asc" } });
    res.json(deserializeObj("internalPage", result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/admin/internal-pages", authenticate, async (req, res) => {
  try {
    const result = await prisma.internalPage.create({ data: req.body });
    res.json(deserializeObj("internalPage", result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/admin/internal-pages/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await prisma.internalPage.update({ where: { id }, data: req.body });
    res.json(deserializeObj("internalPage", result));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/admin/internal-pages/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.internalPage.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Universal Prisma RPC endpoint as fallback
app.post("/api/prisma", authenticate, async (req, res) => {
  const { model, action, args = [] } = req.body;
  try {
    const result = await prisma[model][action](...serializeObj(model, args));
    res.json({ data: deserializeObj(model, result) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/prisma/transaction", authenticate, async (req, res) => {
  const { operations = [] } = req.body;
  try {
    const result = await prisma.$transaction(
      operations.map((op) => prisma[op.model][op.action](...serializeObj(op.model, op.args)))
    );
    res.json({ data: result.map((item, index) => deserializeObj(operations[index].model, item)) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 SQLite REST Backend Server is live on port ${PORT}`);
  console.log(`📂 SQLite dev.db is managed inside server/prisma directory`);
});
