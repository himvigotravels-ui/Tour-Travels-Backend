// Seed the SQLite database. Designed to be safe to re-run (every write
// is an upsert keyed on a unique column). Order matters because
// nav-group → destination links depend on destinations existing first.

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import "../src/db.js"; // initialise schema
import { run } from "../src/query.js";
import { DESTINATIONS as ENRICHED_DESTINATIONS, PACKAGES as REGION_PACKAGES } from "./seed_content.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BACKUP_PATH = resolve(
  __dirname,
  "db_backup_2026-04-27T18-21-02-743Z.json"
);

function loadBackup() {
  if (!existsSync(BACKUP_PATH)) {
    console.warn(`⚠️  Backup not found at ${BACKUP_PATH} — skipping restore.`);
    return null;
  }
  return JSON.parse(readFileSync(BACKUP_PATH, "utf8"));
}

function toDateOrNull(v) {
  if (!v) return null;
  return new Date(v);
}

// ─── Trek package definitions (Himachal-themed) ────────────────────────

const IMG = {
  triund: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80",
  kheerganga: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
  hampta: "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=1200&q=80",
  bhrigu: "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1200&q=80",
  pinparvati: "https://images.unsplash.com/photo-1626621331169-5f34be280ed9?auto=format&fit=crop&w=1200&q=80",
  buran: "https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&w=1200&q=80",
  churdhar: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=1200&q=80",
  beaskund: "https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?auto=format&fit=crop&w=1200&q=80",
  indrahar: "https://images.unsplash.com/photo-1561361398-a8d3aaae9e6e?auto=format&fit=crop&w=1200&q=80",
  chandratal: "https://images.unsplash.com/photo-1473444330585-93a48b18ba79?auto=format&fit=crop&w=1200&q=80",
  camp: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1200&q=80",
  trek: "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=1200&q=80",
};

const TREK_PACKAGES = [
  {
    slug: "triund-trek",
    title: "Triund Trek — Sunrise over the Dhauladhars",
    location: "Dharamshala",
    pricePerPerson: 3499, durationDays: 2, durationNights: 1,
    imageUrls: [IMG.triund, IMG.indrahar, IMG.camp],
    vehicleType: "SUV", maxOccupancy: 12,
    description: "A short, beginner-friendly Himachali trek from McLeod Ganj that ends with a meadow-top sunrise over the entire Dhauladhar range.",
    itinerary: [
      { day: 1, title: "McLeod Ganj → Triund Top", activities: "9km uphill via Galu Devi temple. Reach Triund by afternoon, set up camp, sunset views." },
      { day: 2, title: "Sunrise & Descent", activities: "Sunrise over Dhauladhars, breakfast at camp, descend to McLeod Ganj." },
    ],
    inclusions: ["Camping at Triund (twin sharing)", "Trek guide", "Dinner & breakfast at camp", "Forest entry permits"],
    exclusions: ["Travel to McLeod Ganj", "Personal trek gear", "Lunches"],
    categories: ["adventure"], isFeatured: true,
  },
  {
    slug: "kheerganga-trek",
    title: "Kheerganga Trek — Hot Springs in Parvati Valley",
    location: "Kasol",
    pricePerPerson: 4499, durationDays: 3, durationNights: 2,
    imageUrls: [IMG.kheerganga, IMG.camp, IMG.trek],
    vehicleType: "Tempo Traveller", maxOccupancy: 14,
    description: "A 12km trek through pine forests to the legendary Kheerganga hot springs — one of Himachal's most loved short treks.",
    itinerary: [
      { day: 1, title: "Kasol → Barshaini → Kheerganga", activities: "Drive to Barshaini, start trek, reach camp by evening, hot spring dip." },
      { day: 2, title: "Kheerganga & Tosh", activities: "Sunrise meditation, descend to Barshaini, drive to Tosh village." },
      { day: 3, title: "Departure", activities: "Breakfast at Tosh, drive back to Kasol." },
    ],
    inclusions: ["Camp at Kheerganga (twin sharing)", "Stay at Tosh village", "Trek leader & support staff", "Meals during trek"],
    exclusions: ["Travel to Kasol", "Personal expenses", "Mule charges"],
    categories: ["adventure"], isFeatured: true,
  },
  {
    slug: "hampta-pass-trek",
    title: "Hampta Pass Trek — Lush Valleys to Cold Desert",
    location: "Manali",
    pricePerPerson: 12999, durationDays: 5, durationNights: 4,
    imageUrls: [IMG.hampta, IMG.chandratal, IMG.camp],
    vehicleType: "Tempo Traveller", maxOccupancy: 12,
    description: "A dramatic crossover trek that takes you from the green Kullu Valley to the moonscape of Lahaul-Spiti in just 4 days.",
    itinerary: [
      { day: 1, title: "Manali → Jobra → Chika", activities: "Short drive, gentle 2km trek to Chika camp." },
      { day: 2, title: "Chika → Balu Ka Ghera", activities: "7km along the Rani Nallah, river crossings." },
      { day: 3, title: "Balu Ka Ghera → Hampta Pass → Siagoru", activities: "Summit day. Pass at 14,100 ft." },
      { day: 4, title: "Siagoru → Chatru → Chandratal", activities: "Descend, drive to Chandratal Lake camp." },
      { day: 5, title: "Chandratal → Manali", activities: "Cross Atal Tunnel, end in Manali." },
    ],
    inclusions: ["All camping & meals on trek", "Trek leader, cook, support staff", "Tempo from Manali", "Forest & camping permits"],
    exclusions: ["Travel to Manali", "Backpack offload (extra)", "Insurance"],
    categories: ["adventure", "offbeat"], isFeatured: true,
  },
  {
    slug: "bhrigu-lake-trek",
    title: "Bhrigu Lake Trek — Alpine Meadows above Manali",
    location: "Manali",
    pricePerPerson: 8499, durationDays: 4, durationNights: 3,
    imageUrls: [IMG.bhrigu, IMG.beaskund, IMG.camp],
    vehicleType: "SUV", maxOccupancy: 8,
    description: "Walk through endless meadows to a sacred high-altitude lake. The fastest route to a 14,000 ft summit from Manali.",
    itinerary: [
      { day: 1, title: "Manali → Gulaba → Jonker Thatch", activities: "Drive to Gulaba, trek 4km to camp." },
      { day: 2, title: "Jonker Thatch → Roli Kholi", activities: "Acclimatisation walk, ridge views." },
      { day: 3, title: "Summit Bhrigu Lake & return", activities: "Lake at 14,100 ft, descend to Jonker." },
      { day: 4, title: "Descent to Manali", activities: "Trek down, drive back." },
    ],
    inclusions: ["Camping & meals", "Trek leader & support", "Manali transfers", "Permits"],
    exclusions: ["Travel to Manali", "Personal gear"],
    categories: ["adventure"],
  },
  {
    slug: "pin-parvati-pass-trek",
    title: "Pin Parvati Pass Trek — The Crossover Classic",
    location: "Spiti Valley",
    pricePerPerson: 28999, durationDays: 11, durationNights: 10,
    imageUrls: [IMG.pinparvati, IMG.hampta, IMG.camp],
    vehicleType: "Tempo Traveller", maxOccupancy: 10,
    description: "An expedition-grade Himalayan crossover from green Parvati Valley to the cold desert of Pin Valley over a 17,400 ft pass.",
    itinerary: [
      { day: 1, title: "Manikaran → Barshaini → Kheerganga", activities: "Trek up to Kheerganga." },
      { day: 2, title: "Kheerganga → Tunda Bhuj", activities: "8km along the Parvati river." },
      { day: 3, title: "Tunda Bhuj → Thakur Kuan", activities: "River crossing on a pulley." },
      { day: 4, title: "Thakur Kuan → Odi Thatch", activities: "Cross 12,000 ft mark." },
      { day: 5, title: "Odi Thatch → Mantalai Lake", activities: "Source of the Parvati." },
      { day: 6, title: "Acclimatisation at Mantalai", activities: "Rest, short walks." },
      { day: 7, title: "Mantalai → Base Camp", activities: "Move to Pin Parvati base." },
      { day: 8, title: "Summit Pin Parvati Pass → Pin side", activities: "Long summit day, glacier walk." },
      { day: 9, title: "Pin valley descent", activities: "Drop into Mud village." },
      { day: 10, title: "Mud → Kaza", activities: "Drive into Kaza, hot showers." },
      { day: 11, title: "Kaza → Manali", activities: "Long drive across Kunzum & Atal Tunnel." },
    ],
    inclusions: ["Full expedition support (cook, porters, leader)", "All meals & camps", "Manali → Manikaran → Kaza → Manali transfers", "All permits"],
    exclusions: ["Travel to Manali", "Insurance", "Evac costs"],
    categories: ["adventure", "offbeat"], isFeatured: true,
  },
  {
    slug: "buran-ghati-trek",
    title: "Buran Ghati Trek — The Hidden Pass of Shimla",
    location: "Shimla",
    pricePerPerson: 11499, durationDays: 7, durationNights: 6,
    imageUrls: [IMG.buran, IMG.churdhar, IMG.camp],
    vehicleType: "Tempo Traveller", maxOccupancy: 12,
    description: "A wild trek through the Pabbar Valley with apple orchards, thick forests and a heart-thumping rappel down Buran Pass.",
    itinerary: [
      { day: 1, title: "Shimla → Janglik", activities: "Long drive into the Pabbar Valley." },
      { day: 2, title: "Janglik → Dayara Thatch", activities: "Climb through deodar forest." },
      { day: 3, title: "Dayara → Litham", activities: "Ridge walk to alpine meadow." },
      { day: 4, title: "Litham → Dhunda", activities: "Move to summit base." },
      { day: 5, title: "Summit & rappel down", activities: "Cross Buran Ghati at 15,000 ft." },
      { day: 6, title: "Barua → Sangla", activities: "Reach Sangla Valley by evening." },
      { day: 7, title: "Sangla → Shimla", activities: "Long drive back." },
    ],
    inclusions: ["All camping & meals", "Trek leader, technical staff", "Rappelling gear", "Permits"],
    exclusions: ["Travel to Shimla", "Personal gear"],
    categories: ["adventure", "offbeat"],
  },
  {
    slug: "churdhar-trek",
    title: "Churdhar Peak Trek — The Highest Peak of Outer Himalayas",
    location: "Shimla",
    pricePerPerson: 5999, durationDays: 3, durationNights: 2,
    imageUrls: [IMG.churdhar, IMG.trek, IMG.camp],
    vehicleType: "SUV", maxOccupancy: 8,
    description: "A weekend-friendly summit trek to Churdhar Peak (11,965 ft) from Nohradhar — closest high-altitude trek to Shimla and Chandigarh.",
    itinerary: [
      { day: 1, title: "Shimla → Nohradhar", activities: "Drive to base village, evening briefing." },
      { day: 2, title: "Nohradhar → Teesari → Summit", activities: "Long summit day, descend to Teesari." },
      { day: 3, title: "Teesari → Nohradhar → Shimla", activities: "Trek down, drive back." },
    ],
    inclusions: ["Camping & meals", "Trek leader", "Shimla transfers", "Permits"],
    exclusions: ["Travel to Shimla", "Personal gear"],
    categories: ["adventure"],
  },
  {
    slug: "beas-kund-trek",
    title: "Beas Kund Trek — Source of the Beas River",
    location: "Manali",
    pricePerPerson: 6499, durationDays: 3, durationNights: 2,
    imageUrls: [IMG.beaskund, IMG.bhrigu, IMG.camp],
    vehicleType: "SUV", maxOccupancy: 10,
    description: "A glacial-lake trek from Solang Valley with up-close views of Hanuman Tibba, Friendship Peak and Shitidhar.",
    itinerary: [
      { day: 1, title: "Manali → Dhundi → Bakarthach", activities: "Drive to Dhundi, trek 6km to camp." },
      { day: 2, title: "Bakarthach → Beas Kund & back", activities: "Day trip to glacial lake, return to camp." },
      { day: 3, title: "Bakarthach → Manali", activities: "Trek down, drive back." },
    ],
    inclusions: ["Camping & meals", "Trek leader", "Manali transfers", "Permits"],
    exclusions: ["Travel to Manali", "Personal gear"],
    categories: ["adventure"],
  },
  {
    slug: "indrahar-pass-trek",
    title: "Indrahar Pass Trek — Beyond Triund",
    location: "Dharamshala",
    pricePerPerson: 7999, durationDays: 4, durationNights: 3,
    imageUrls: [IMG.indrahar, IMG.triund, IMG.camp],
    vehicleType: "SUV", maxOccupancy: 10,
    description: "Continue past Triund to the technical Indrahar Pass at 14,245 ft — the natural border crossing into Chamba Valley.",
    itinerary: [
      { day: 1, title: "McLeod Ganj → Triund", activities: "9km to Triund camp." },
      { day: 2, title: "Triund → Lahesh Cave", activities: "Acclimatise & summit base." },
      { day: 3, title: "Summit Indrahar Pass & return", activities: "Long summit day." },
      { day: 4, title: "Descent to McLeod Ganj", activities: "Trek down." },
    ],
    inclusions: ["Camping & meals", "Trek leader, technical staff", "Permits"],
    exclusions: ["Travel to McLeod Ganj", "Personal gear"],
    categories: ["adventure", "offbeat"],
  },
  {
    slug: "chandratal-lake-trek",
    title: "Chandratal Lake Trek — Moon Lake of Spiti",
    location: "Spiti Valley",
    pricePerPerson: 9999, durationDays: 4, durationNights: 3,
    imageUrls: [IMG.chandratal, IMG.pinparvati, IMG.camp],
    vehicleType: "SUV", maxOccupancy: 8,
    description: "A short high-altitude trek + drive that ends at Chandratal — the crescent-shaped lake that appears nowhere on maps.",
    itinerary: [
      { day: 1, title: "Manali → Chatru", activities: "Cross Atal Tunnel, camp at Chatru." },
      { day: 2, title: "Chatru → Chandratal", activities: "Drive + 1.5km walk to lake." },
      { day: 3, title: "Chandratal stay & shoot", activities: "Sunrise & milky-way photography." },
      { day: 4, title: "Chandratal → Manali", activities: "Long drive back." },
    ],
    inclusions: ["Camping & meals", "Trek + driver", "Permits"],
    exclusions: ["Travel to Manali", "Personal gear"],
    categories: ["adventure", "offbeat"], isFeatured: true,
  },
];

const PACKAGE_NAV_GROUPS = [
  { title: "Honeymoon Packages", slug: "honeymoon", sortOrder: 1, tagline: "Romantic Himalayan escapes" },
  { title: "Family Packages",    slug: "family",    sortOrder: 2, tagline: "Trips that work for every age" },
  { title: "Adventure Tours",    slug: "adventure", sortOrder: 3, tagline: "Trek, raft, ride and ski" },
  { title: "Offbeat Himachal",   slug: "offbeat",   sortOrder: 4, tagline: "The Himachal most travellers miss" },
  { title: "Spiritual Journeys", slug: "spiritual", sortOrder: 5, tagline: "Monasteries, meditations, mountains" },
];

const TREK_NAV_GROUPS = [
  { title: "Treks in Shimla",       slug: "treks-in-shimla",       sortOrder: 11, tagline: "High-altitude trails out of the Queen of Hills",   destinationSlugs: ["shimla"] },
  { title: "Treks in Manali",       slug: "treks-in-manali",       sortOrder: 12, tagline: "Cross passes, glacial lakes & alpine meadows",     destinationSlugs: ["manali"] },
  { title: "Treks in Spiti Valley", slug: "treks-in-spiti-valley", sortOrder: 13, tagline: "Cold-desert expeditions in the Middle Land",       destinationSlugs: ["spiti-valley"] },
  { title: "Treks in Dharamshala",  slug: "treks-in-dharamshala",  sortOrder: 14, tagline: "Trails in the Dhauladhar range",                   destinationSlugs: ["dharamshala"] },
  { title: "Treks in Kasol",        slug: "treks-in-kasol",        sortOrder: 15, tagline: "Parvati Valley classics",                          destinationSlugs: ["kasol"] },
];

// ─── Seed orchestration ────────────────────────────────────────────────

export async function seed() {
  console.log("🌱 Seeding SQLite database...");
  const backup = loadBackup();

  if (backup?.admin_users) {
    console.log(`👤 admin users (${backup.admin_users.length})...`);
    for (const a of backup.admin_users) {
      run("adminUser", "upsert", {
        where: { email: a.email },
        update: { password: a.password },
        create: {
          id: a.id, email: a.email, password: a.password,
          createdAt: toDateOrNull(a.createdAt) || new Date(),
        },
      });
    }
  }

  if (backup?.destinations) {
    console.log(`📍 destinations (${backup.destinations.length})...`);
    for (const d of backup.destinations) {
      const data = {
        name: d.name, tagline: d.tagline, description: d.description,
        bestTime: d.bestTime, altitude: d.altitude, vibe: d.vibe, image: d.image,
        highlights: d.highlights || [], categories: d.categories || [],
        isActive: !!d.isActive, sortOrder: d.sortOrder ?? 0,
        metaTitle: d.metaTitle, metaDescription: d.metaDescription, metaKeywords: d.metaKeywords,
      };
      run("destination", "upsert", {
        where: { slug: d.slug },
        update: data,
        create: {
          id: d.id, slug: d.slug, ...data,
          createdAt: toDateOrNull(d.createdAt) || new Date(),
          updatedAt: toDateOrNull(d.updatedAt) || new Date(),
        },
      });
    }
  }

  if (backup?.packages) {
    console.log(`📦 packages (${backup.packages.length})...`);
    for (const p of backup.packages) {
      const data = {
        title: p.title, location: p.location,
        pricePerPerson: p.pricePerPerson, durationDays: p.durationDays, durationNights: p.durationNights,
        imageUrls: p.imageUrls || [], vehicleType: p.vehicleType, maxOccupancy: p.maxOccupancy,
        description: p.description, itinerary: p.itinerary || [],
        inclusions: p.inclusions || [], exclusions: p.exclusions || [], categories: p.categories || [],
        isFeatured: !!p.isFeatured, isActive: !!p.isActive, isTrek: !!p.isTrek,
        metaTitle: p.metaTitle, metaDescription: p.metaDescription, metaKeywords: p.metaKeywords,
      };
      run("package", "upsert", {
        where: { slug: p.slug },
        update: data,
        create: {
          id: p.id, slug: p.slug, ...data,
          createdAt: toDateOrNull(p.createdAt) || new Date(),
          updatedAt: toDateOrNull(p.updatedAt) || new Date(),
        },
      });
    }
  }

  console.log(`🥾 trek packages (${TREK_PACKAGES.length})...`);
  for (const t of TREK_PACKAGES) {
    const data = { ...t, isFeatured: !!t.isFeatured, isActive: true, isTrek: true };
    run("package", "upsert", { where: { slug: t.slug }, update: data, create: data });
  }

  if (backup?.blogs) {
    console.log(`✍️  blogs (${backup.blogs.length})...`);
    for (const b of backup.blogs) {
      const data = {
        title: b.title, excerpt: b.excerpt, content: b.content, author: b.author,
        coverImage: b.coverImage, category: b.category, tags: b.tags || [],
        isPublished: !!b.isPublished,
        publishedAt: toDateOrNull(b.publishedAt),
        metaTitle: b.metaTitle, metaDescription: b.metaDescription, metaKeywords: b.metaKeywords,
      };
      run("blog", "upsert", {
        where: { slug: b.slug },
        update: data,
        create: {
          id: b.id, slug: b.slug, ...data,
          createdAt: toDateOrNull(b.createdAt) || new Date(),
          updatedAt: toDateOrNull(b.updatedAt) || new Date(),
        },
      });
    }
  }

  if (backup?.testimonials) {
    console.log(`💬 testimonials (${backup.testimonials.length})...`);
    for (const t of backup.testimonials) {
      const existing = run("testimonial", "findFirst", {
        where: { name: t.name, packageName: t.packageName },
      });
      const data = {
        name: t.name, text: t.text, packageName: t.packageName,
        rating: t.rating, isActive: !!t.isActive,
      };
      if (existing) run("testimonial", "update", { where: { id: existing.id }, data });
      else run("testimonial", "create", {
        data: {
          id: t.id, ...data,
          createdAt: toDateOrNull(t.createdAt) || new Date(),
          updatedAt: toDateOrNull(t.updatedAt) || new Date(),
        },
      });
    }
  }

  if (backup?.activities) {
    console.log(`🧗 activities (${backup.activities.length})...`);
    for (const a of backup.activities) {
      const existing = run("activity", "findFirst", { where: { title: a.title } });
      const data = {
        title: a.title, description: a.description, image: a.image, location: a.location,
        icon: a.icon, isActive: !!a.isActive, sortOrder: a.sortOrder ?? 0,
      };
      if (existing) run("activity", "update", { where: { id: existing.id }, data });
      else run("activity", "create", {
        data: {
          id: a.id, ...data,
          createdAt: toDateOrNull(a.createdAt) || new Date(),
          updatedAt: toDateOrNull(a.updatedAt) || new Date(),
        },
      });
    }
  }

  if (backup?.cab_vehicles) {
    console.log(`🚗 cab vehicles (${backup.cab_vehicles.length})...`);
    for (const v of backup.cab_vehicles) {
      const existing = run("cabVehicle", "findFirst", { where: { name: v.name } });
      const data = {
        name: v.name, model: v.model, capacity: v.capacity, ideal: v.ideal,
        features: v.features || [], image: v.image, isActive: !!v.isActive,
      };
      if (existing) run("cabVehicle", "update", { where: { id: existing.id }, data });
      else run("cabVehicle", "create", {
        data: {
          id: v.id, ...data,
          createdAt: toDateOrNull(v.createdAt) || new Date(),
          updatedAt: toDateOrNull(v.updatedAt) || new Date(),
        },
      });
    }
  }

  if (backup?.cab_routes) {
    console.log(`🗺️  cab routes (${backup.cab_routes.length})...`);
    for (const r of backup.cab_routes) {
      const existing = run("cabRoute", "findFirst", {
        where: { fromCity: r.fromCity, toCity: r.toCity },
      });
      const data = {
        fromCity: r.fromCity, toCity: r.toCity, price: r.price,
        duration: r.duration, isActive: !!r.isActive,
      };
      if (existing) run("cabRoute", "update", { where: { id: existing.id }, data });
      else run("cabRoute", "create", {
        data: {
          id: r.id, ...data,
          createdAt: toDateOrNull(r.createdAt) || new Date(),
          updatedAt: toDateOrNull(r.updatedAt) || new Date(),
        },
      });
    }
  }

  if (backup?.site_settings) {
    console.log(`⚙️  site settings (${backup.site_settings.length})...`);
    for (const s of backup.site_settings) {
      run("siteSetting", "upsert", {
        where: { key: s.key },
        update: { value: String(s.value) },
        create: { id: s.id, key: s.key, value: String(s.value) },
      });
    }
  }

  if (backup?.inquiries) {
    console.log(`📩 inquiries (${backup.inquiries.length})...`);
    for (const i of backup.inquiries) {
      const existing = run("inquiry", "findFirst", { where: { id: i.id } });
      if (existing) continue;
      run("inquiry", "create", {
        data: {
          id: i.id, name: i.name, phone: i.phone,
          fromCity: i.fromCity, toCity: i.toCity,
          travelDate: i.travelDate, passengers: i.passengers, duration: i.duration,
          message: i.message, status: i.status,
          adults: i.adults ?? 1, children: i.children ?? 0,
          email: i.email, pickupLocation: i.pickupLocation,
          pickupDate: toDateOrNull(i.pickupDate),
          dropLocation: i.dropLocation, dropDate: toDateOrNull(i.dropDate),
          createdAt: toDateOrNull(i.createdAt) || new Date(),
          updatedAt: toDateOrNull(i.updatedAt) || new Date(),
        },
      });
    }
  }

  // Enrichment pass: layer Himachal-region content on top of the
  // backup-restored rows. Slugs match what's already indexed by search
  // engines, so we overwrite content but never change the slug.
  console.log(`🏔️  enriching ${ENRICHED_DESTINATIONS.length} destinations with Himachal content...`);
  for (const d of ENRICHED_DESTINATIONS) {
    run("destination", "upsert", {
      where: { slug: d.slug },
      update: d,
      create: d,
    });
  }

  console.log(`🎒 seeding ${REGION_PACKAGES.length} region-anchored packages...`);
  for (const p of REGION_PACKAGES) {
    run("package", "upsert", {
      where: { slug: p.slug },
      update: p,
      create: p,
    });
  }

  console.log("📑 nav groups (package + trek types)...");
  for (const g of PACKAGE_NAV_GROUPS) {
    const data = { title: g.title, slug: g.slug, type: "package", sortOrder: g.sortOrder, tagline: g.tagline, isActive: true };
    run("internalPage", "upsert", { where: { slug: g.slug }, update: data, create: data });
  }
  for (const g of TREK_NAV_GROUPS) {
    const dests = g.destinationSlugs
      .map((slug) => run("destination", "findFirst", { where: { slug } }))
      .filter(Boolean);

    const baseData = {
      title: g.title, slug: g.slug, type: "trek",
      sortOrder: g.sortOrder, tagline: g.tagline, isActive: true,
    };
    run("internalPage", "upsert", {
      where: { slug: g.slug },
      update: { ...baseData, destinations: { set: dests.map((d) => ({ id: d.id })) } },
      create: { ...baseData, destinations: { connect: dests.map((d) => ({ id: d.id })) } },
    });
    console.log(`   • ${g.title} (${dests.length} dest)`);
  }

  console.log("✅ seed complete.");
}

// When invoked directly via `node db/seed.js` (as start.sh does), run
// the seed immediately. When imported by the API for /admin/reseed,
// just expose the function and let the caller invoke it.
const isMain = import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` ||
  process.argv[1]?.endsWith("seed.js");
if (isMain) {
  seed().catch((e) => {
    console.error("❌ seed failed:", e);
    process.exit(1);
  });
}
