// Seed the Yatras mega-menu with the client's reference structure.
// Each item becomes an `internal_pages` row with type="yatra" and a
// `menuCategory` that groups it into a column in the navbar mega-menu.
//
// Safe to re-run: every write is create-only, keyed on the unique slug.
// Run with:  node db/seed_yatras.js   (from the backend/ directory)

import "../src/db.js"; // initialise schema + migrations
import { run } from "../src/query.js";

// category → ordered list of yatra titles (mirrors the reference image)
const YATRA_MENU = [
  {
    category: "Major Pilgrimages",
    items: [
      "Manimahesh Yatra",
      "Shrikhand Mahadev",
      "Kinnaur Kailash",
      "Bijli Mahadev",
      "Trilokinath Temple",
      "Bhimakali Temple",
    ],
  },
  {
    category: "Temple Circuits",
    items: [
      "Complete Himachal Temple Tour",
      "Kangra Divine Circuit",
      "Shiva Temple Circuit",
      "Kullu Spiritual Tour",
    ],
  },
  {
    category: "Shakti Peeth Circuit",
    items: [
      "Himachal Shakti Peeth Darshan",
      "Panch Devi Darshan",
      "Char Devi Darshan",
      "Navratri Special Yatra",
    ],
  },
  {
    category: "Buddhist Circuit",
    items: [
      "Himachal Buddhist Circuit",
      "Spiti Monastery Tour",
      "Dharamshala Monastery Tour",
      "Rewalsar Spiritual Tour",
    ],
  },
  {
    category: "Festival Tours",
    items: [
      "Kullu Dussehra",
      "Mandi Shivratri",
      "Minjar Fair",
      "Renuka Fair",
      "Lavi Fair",
      "Losar Festival",
    ],
  },
];

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function seedYatras() {
  console.log("🛕 seeding yatra nav groups (create-only)...");
  let created = 0;
  let sortOrder = 0;

  for (const group of YATRA_MENU) {
    for (const title of group.items) {
      const slug = slugify(title);
      sortOrder += 1;

      const existing = await run("internalPage", "findFirst", {
        where: { slug },
      });
      if (existing) {
        console.log(`   • ${title} (preserved)`);
        continue;
      }

      await run("internalPage", "create", {
        data: {
          title,
          slug,
          type: "yatra",
          menuCategory: group.category,
          tagline: `${group.category} — guided pilgrimage yatra`,
          sortOrder,
          isActive: true,
        },
      });
      created += 1;
      console.log(`   • ${title}  [${group.category}] (new)`);
    }
  }

  console.log(`✅ yatra seed complete — ${created} new group(s).`);
}

seedYatras().catch((e) => {
  console.error("❌ yatra seed failed:", e);
  process.exit(1);
});
