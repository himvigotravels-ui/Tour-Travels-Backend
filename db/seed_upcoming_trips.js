// Seed a few sample fixed-departure "Upcoming Trips" so the homepage
// section and /upcoming-trips page have live content out of the box.
// Upserted by slug (re-runnable). The client edits these in Admin →
// Upcoming Trips.
//
// Dual-mode:
//   • default            → local DB
//   • SEED_REMOTE_URL set → deployed backend RPC gateway (seed production)
//        SEED_REMOTE_URL=https://tour-travels-backend-l6e4.onrender.com \
//        node db/seed_upcoming_trips.js

const REMOTE = process.env.SEED_REMOTE_URL;
const API_KEY = process.env.SEED_API_KEY || "himvigo-super-secret-key-2026";

let run;
if (REMOTE) {
  run = async (model, action, opts) => {
    const res = await fetch(`${REMOTE.replace(/\/$/, "")}/api/prisma`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
      body: JSON.stringify({ model, action, args: [opts] }),
    });
    if (!res.ok) throw new Error(`${action} ${model}: ${res.status} ${await res.text()}`);
    return (await res.json()).data;
  };
  console.log(`🌐 remote mode → ${REMOTE}`);
} else {
  await import("../src/db.js");
  ({ run } = await import("../src/query.js"));
}

const u = (id) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=80`;

const TRIPS = [
  {
    slug: "spiti-valley-circuit-sep",
    title: "Spiti Valley Circuit — Group Departure",
    destination: "Spiti Valley",
    startDate: "2026-09-12",
    endDate: "2026-09-19",
    durationDays: 8, durationNights: 7,
    pricePerPerson: 24999,
    image: u("photo-1626621331169-5f34be280ed9"),
    totalSeats: 16, seatsLeft: 6, isFeatured: true, sortOrder: 1,
    description: "The complete Spiti loop — Kaza, Key Monastery, Chandratal and the highest villages in the world.",
    highlights: ["Key Monastery", "Chandratal Lake", "All permits included"],
  },
  {
    slug: "kinnaur-kailash-trek-sep",
    title: "Kinnaur Kailash Group Trek",
    destination: "Kinnaur",
    startDate: "2026-09-20",
    endDate: "2026-09-25",
    durationDays: 6, durationNights: 5,
    pricePerPerson: 15999,
    image: u("photo-1542401886-65d6c61db217"),
    totalSeats: 14, seatsLeft: 9, sortOrder: 2,
    description: "Trek to the sacred 79-ft Shivling of Kinnaur Kailash through apple country and snow peaks.",
    highlights: ["Kalpa stay", "Certified guide", "Small group"],
  },
  {
    slug: "chandratal-camping-oct",
    title: "Chandratal Lake Camping Weekend",
    destination: "Chandratal Lake",
    startDate: "2026-10-10",
    endDate: "2026-10-13",
    durationDays: 4, durationNights: 3,
    pricePerPerson: 11999,
    image: u("photo-1486870591958-9b9d0d1dda99"),
    totalSeats: 18, seatsLeft: 3, isFeatured: true, sortOrder: 3,
    description: "Camp under the stars beside the crescent-shaped moon lake, crossing the Atal Tunnel.",
    highlights: ["Lakeside camping", "Bonfire night", "Atal Tunnel drive"],
  },
  {
    slug: "manali-sissu-weekend-oct",
    title: "Manali – Sissu Weekend Escape",
    destination: "Manali",
    startDate: "2026-10-03",
    endDate: "2026-10-06",
    durationDays: 4, durationNights: 3,
    pricePerPerson: 8999,
    image: u("photo-1506197603052-3cc9c3a201bd"),
    totalSeats: 20, seatsLeft: 12, sortOrder: 4,
    description: "A relaxed long-weekend across the Atal Tunnel to Sissu waterfalls and Solang adventures.",
    highlights: ["Solang Valley", "Sissu waterfall", "Cafe hopping"],
  },
  {
    slug: "dharamshala-bir-escape-nov",
    title: "Dharamshala & Bir Billing Escape",
    destination: "Dharamshala",
    startDate: "2026-11-07",
    endDate: "2026-11-10",
    durationDays: 4, durationNights: 3,
    pricePerPerson: 9499,
    image: u("photo-1544735716-392fe2489ffa"),
    totalSeats: 16, seatsLeft: 10, sortOrder: 5,
    description: "McLeod Ganj monasteries, Triund views and the paragliding capital of India — Bir Billing.",
    highlights: ["Paragliding option", "Triund viewpoint", "Tibetan cuisine"],
  },
  {
    slug: "shimla-winter-special-dec",
    title: "Shimla & Kufri Winter Special",
    destination: "Shimla",
    startDate: "2026-12-20",
    endDate: "2026-12-24",
    durationDays: 5, durationNights: 4,
    pricePerPerson: 13499,
    image: u("photo-1605649487212-47bdab064df7"),
    totalSeats: 20, seatsLeft: 15, sortOrder: 6,
    description: "A cosy winter getaway to the colonial hill capital — Mall Road, Kufri snow and toy-train rides.",
    highlights: ["Toy train ride", "Kufri snow point", "Christmas week"],
  },
];

async function upsert(t) {
  const data = {
    ...t,
    isActive: true,
    isFeatured: !!t.isFeatured,
    metaTitle: `${t.title} | Himvigo Upcoming Trips`,
    metaDescription: t.description.slice(0, 155),
    metaKeywords: `${t.destination} group trip, ${t.title}, fixed departure himachal`,
  };
  const existing = await run("upcomingTrip", "findFirst", { where: { slug: t.slug } });
  if (existing) {
    await run("upcomingTrip", "update", { where: { slug: t.slug }, data });
    return "updated";
  }
  await run("upcomingTrip", "create", { data });
  return "created";
}

async function main() {
  console.log(`🗓️  seeding ${TRIPS.length} upcoming trips...`);
  let created = 0, updated = 0;
  for (const t of TRIPS) {
    const r = await upsert(t);
    r === "created" ? created++ : updated++;
    console.log(`  • ${t.title.padEnd(42)} ${r}`);
  }
  console.log(`\n✅ done — ${created} new / ${updated} updated.`);
}

main().catch((e) => {
  console.error("❌ upcoming-trips seed failed:", e);
  process.exit(1);
});
