import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const backupPath = path.resolve(__dirname, "../../backups/db_backup_2026-04-27T18-21-02-743Z.json");

async function seed() {
  console.log(`📂 Reading backup file from: ${backupPath}`);
  
  if (!fs.existsSync(backupPath)) {
    console.error("❌ Backup file not found at backups/db_backup_2026-04-27T18-21-02-743Z.json!");
    process.exit(1);
  }

  const backupData = JSON.parse(fs.readFileSync(backupPath, "utf-8"));
  console.log("🌱 Starting SQLite database seeding...");

  // 1. Seed Admin Users
  if (backupData.admin_users) {
    console.log(`👤 Seeding admin users (${backupData.admin_users.length})...`);
    for (const admin of backupData.admin_users) {
      await prisma.adminUser.upsert({
        where: { email: admin.email },
        update: { password: admin.password },
        create: {
          id: admin.id,
          email: admin.email,
          password: admin.password,
          createdAt: admin.createdAt ? new Date(admin.createdAt) : undefined,
        },
      });
    }
  }

  // 2. Seed Destinations
  if (backupData.destinations) {
    console.log(`📍 Seeding destinations (${backupData.destinations.length})...`);
    for (const d of backupData.destinations) {
      const payload = {
        name: d.name,
        tagline: d.tagline,
        description: d.description,
        bestTime: d.bestTime,
        altitude: d.altitude,
        vibe: d.vibe,
        image: d.image,
        highlights: JSON.stringify(d.highlights || []),
        categories: JSON.stringify(d.categories || []),
        isActive: d.isActive,
        sortOrder: d.sortOrder,
        metaTitle: d.metaTitle,
        metaDescription: d.metaDescription,
        metaKeywords: d.metaKeywords,
      };

      await prisma.destination.upsert({
        where: { slug: d.slug },
        update: payload,
        create: {
          id: d.id,
          slug: d.slug,
          ...payload,
          createdAt: d.createdAt ? new Date(d.createdAt) : undefined,
          updatedAt: d.updatedAt ? new Date(d.updatedAt) : undefined,
        },
      });
    }
  }

  // 3. Seed Packages
  if (backupData.packages) {
    console.log(`📦 Seeding packages (${backupData.packages.length})...`);
    for (const p of backupData.packages) {
      const payload = {
        title: p.title,
        location: p.location,
        pricePerPerson: p.pricePerPerson,
        durationDays: p.durationDays,
        durationNights: p.durationNights,
        imageUrls: JSON.stringify(p.imageUrls || []),
        vehicleType: p.vehicleType,
        maxOccupancy: p.maxOccupancy,
        description: p.description,
        itinerary: JSON.stringify(p.itinerary || []),
        inclusions: JSON.stringify(p.inclusions || []),
        exclusions: JSON.stringify(p.exclusions || []),
        categories: JSON.stringify(p.categories || []),
        isFeatured: p.isFeatured,
        isActive: p.isActive,
        metaTitle: p.metaTitle,
        metaDescription: p.metaDescription,
        metaKeywords: p.metaKeywords,
      };

      await prisma.package.upsert({
        where: { slug: p.slug },
        update: payload,
        create: {
          id: p.id,
          slug: p.slug,
          ...payload,
          createdAt: p.createdAt ? new Date(p.createdAt) : undefined,
          updatedAt: p.updatedAt ? new Date(p.updatedAt) : undefined,
        },
      });
    }
  }

  // 4. Seed Blogs
  if (backupData.blogs) {
    console.log(`✍️ Seeding blogs (${backupData.blogs.length})...`);
    for (const b of backupData.blogs) {
      const payload = {
        title: b.title,
        excerpt: b.excerpt,
        content: b.content,
        author: b.author,
        coverImage: b.coverImage,
        category: b.category,
        tags: JSON.stringify(b.tags || []),
        isPublished: b.isPublished,
        publishedAt: b.publishedAt ? new Date(b.publishedAt) : null,
        metaTitle: b.metaTitle,
        metaDescription: b.metaDescription,
        metaKeywords: b.metaKeywords,
      };

      await prisma.blog.upsert({
        where: { slug: b.slug },
        update: payload,
        create: {
          id: b.id,
          slug: b.slug,
          ...payload,
          createdAt: b.createdAt ? new Date(b.createdAt) : undefined,
          updatedAt: b.updatedAt ? new Date(b.updatedAt) : undefined,
        },
      });
    }
  }

  // 5. Seed Testimonials
  if (backupData.testimonials) {
    console.log(`💬 Seeding testimonials (${backupData.testimonials.length})...`);
    for (const t of backupData.testimonials) {
      const exists = await prisma.testimonial.findFirst({ where: { name: t.name, packageName: t.packageName } });
      const payload = {
        name: t.name,
        text: t.text,
        packageName: t.packageName,
        rating: t.rating,
        isActive: t.isActive,
      };
      if (exists) {
        await prisma.testimonial.update({ where: { id: exists.id }, data: payload });
      } else {
        await prisma.testimonial.create({
          data: {
            id: t.id,
            ...payload,
            createdAt: t.createdAt ? new Date(t.createdAt) : undefined,
            updatedAt: t.updatedAt ? new Date(t.updatedAt) : undefined,
          },
        });
      }
    }
  }

  // 6. Seed Activities
  if (backupData.activities) {
    console.log(`🧗 Seeding activities (${backupData.activities.length})...`);
    for (const a of backupData.activities) {
      const exists = await prisma.activity.findFirst({ where: { title: a.title } });
      const payload = {
        title: a.title,
        description: a.description,
        image: a.image,
        location: a.location,
        icon: a.icon,
        isActive: a.isActive,
        sortOrder: a.sortOrder,
      };
      if (exists) {
        await prisma.activity.update({ where: { id: exists.id }, data: payload });
      } else {
        await prisma.activity.create({
          data: {
            id: a.id,
            ...payload,
            createdAt: a.createdAt ? new Date(a.createdAt) : undefined,
            updatedAt: a.updatedAt ? new Date(a.updatedAt) : undefined,
          },
        });
      }
    }
  }

  // 7. Seed Cab Vehicles
  if (backupData.cab_vehicles) {
    console.log(`🚗 Seeding cab vehicles (${backupData.cab_vehicles.length})...`);
    for (const v of backupData.cab_vehicles) {
      const exists = await prisma.cabVehicle.findFirst({ where: { name: v.name } });
      const payload = {
        name: v.name,
        model: v.model,
        capacity: v.capacity,
        ideal: v.ideal,
        features: JSON.stringify(v.features || []),
        image: v.image,
        isActive: v.isActive,
      };
      if (exists) {
        await prisma.cabVehicle.update({ where: { id: exists.id }, data: payload });
      } else {
        await prisma.cabVehicle.create({
          data: {
            id: v.id,
            ...payload,
            createdAt: v.createdAt ? new Date(v.createdAt) : undefined,
            updatedAt: v.updatedAt ? new Date(v.updatedAt) : undefined,
          },
        });
      }
    }
  }

  // 8. Seed Cab Routes
  if (backupData.cab_routes) {
    console.log(`🗺️ Seeding cab routes (${backupData.cab_routes.length})...`);
    for (const r of backupData.cab_routes) {
      const exists = await prisma.cabRoute.findFirst({ where: { fromCity: r.fromCity, toCity: r.toCity } });
      const payload = {
        fromCity: r.fromCity,
        toCity: r.toCity,
        price: r.price,
        duration: r.duration,
        isActive: r.isActive,
      };
      if (exists) {
        await prisma.cabRoute.update({ where: { id: exists.id }, data: payload });
      } else {
        await prisma.cabRoute.create({
          data: {
            id: r.id,
            ...payload,
            createdAt: r.createdAt ? new Date(r.createdAt) : undefined,
            updatedAt: r.updatedAt ? new Date(r.updatedAt) : undefined,
          },
        });
      }
    }
  }

  // 9. Seed Site Settings
  if (backupData.site_settings) {
    console.log(`⚙️ Seeding site settings (${backupData.site_settings.length})...`);
    for (const s of backupData.site_settings) {
      await prisma.siteSetting.upsert({
        where: { key: s.key },
        update: { value: s.value },
        create: {
          id: s.id,
          key: s.key,
          value: s.value,
        },
      });
    }
  }

  // 10. Seed Inquiries
  if (backupData.inquiries) {
    console.log(`📩 Seeding inquiries (${backupData.inquiries.length})...`);
    for (const i of backupData.inquiries) {
      const exists = await prisma.inquiry.findUnique({ where: { id: i.id } });
      if (!exists) {
        await prisma.inquiry.create({
          data: {
            id: i.id,
            name: i.name,
            phone: i.phone,
            fromCity: i.fromCity,
            toCity: i.toCity,
            travelDate: i.travelDate,
            passengers: i.passengers,
            duration: i.duration,
            message: i.message,
            status: i.status,
            adults: i.adults,
            children: i.children,
            email: i.email,
            pickupLocation: i.pickupLocation,
            pickupDate: i.pickupDate ? new Date(i.pickupDate) : null,
            dropLocation: i.dropLocation,
            dropDate: i.dropDate ? new Date(i.dropDate) : null,
            createdAt: i.createdAt ? new Date(i.createdAt) : undefined,
            updatedAt: i.updatedAt ? new Date(i.updatedAt) : undefined,
          },
        });
      }
    }
  }

  // 11. Seed Internal pages / nav groups (ensure the default navigation works perfectly)
  console.log("📑 Seeding internal pages default groups...");
  const internalPages = [
    { title: "Honeymoon Packages", slug: "honeymoon", type: "package", sortOrder: 1, tagline: "Romantic Himalayan escapes" },
    { title: "Family Packages", slug: "family", type: "package", sortOrder: 2, tagline: "Trips that work for every age" },
    { title: "Adventure Tours", slug: "adventure", type: "package", sortOrder: 3, tagline: "Trek, raft, ride and ski" },
    { title: "Offbeat Himachal", slug: "offbeat", type: "package", sortOrder: 4, tagline: "The Himachal most travellers miss" },
    { title: "Spiritual Journeys", slug: "spiritual", type: "package", sortOrder: 5, tagline: "Monasteries, meditations, mountains" },
  ];
  for (const page of internalPages) {
    await prisma.internalPage.upsert({
      where: { slug: page.slug },
      update: {},
      create: page,
    });
  }

  console.log("✅ Seeding complete and database is fully populated!");
}

seed()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
