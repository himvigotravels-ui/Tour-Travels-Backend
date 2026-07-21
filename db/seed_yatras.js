// Seed the Yatras navbar dropdown = 5 CATEGORY nav-groups (internal_pages,
// type="yatra"), each linked to the yatra-tagged packages that belong to it.
// The navbar shows these 5 as a flat dropdown (like Treks); each one is a
// filtered landing page listing its packages.
//
// Run the package seed FIRST (db/seed_yatra_content.js) so the packages
// exist to link. Then:  node db/seed_yatras.js
//
// Dual-mode:
//   • default            → local DB
//   • SEED_REMOTE_URL set → deployed backend RPC gateway (seed production)
//        SEED_REMOTE_URL=https://tour-travels-backend-l6e4.onrender.com \
//        node db/seed_yatras.js

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

// The 5 dropdown categories → the package slugs each one lists.
const CATEGORIES = [
  {
    slug: "major-pilgrimages",
    title: "Major Pilgrimages",
    tagline: "Sacred high-altitude Kailash & Shiva yatras",
    cover: u("photo-1486870591958-9b9d0d1dda99"),
    description:
      "The great high-altitude pilgrimages of Himachal — Manimahesh, Shrikhand Mahadev, Kinnaur Kailash and more — guided yatras to the Himalayas' most revered shrines.",
    packageSlugs: ["manimahesh-yatra", "shrikhand-mahadev", "kinnaur-kailash", "bijli-mahadev", "trilokinath-temple", "bhimakali-temple"],
  },
  {
    slug: "temple-circuits",
    title: "Temple Circuits",
    tagline: "Guided temple trails across Himachal",
    cover: u("photo-1485470733090-0aae1788d5af"),
    description:
      "Curated multi-temple circuits across Himachal Pradesh — from the complete state temple tour to the Kangra, Shiva and Kullu spiritual trails.",
    packageSlugs: ["complete-himachal-temple-tour", "kangra-divine-circuit", "shiva-temple-circuit", "kullu-spiritual-tour"],
  },
  {
    slug: "shakti-peeth-circuit",
    title: "Shakti Peeth Circuit",
    tagline: "The great goddess temples of the hills",
    cover: u("photo-1605649487212-47bdab064df7"),
    description:
      "Darshan of Himachal's revered Shakti Peeths and Devi temples — Naina Devi, Chintpurni, Jwalamukhi, Brajeshwari, Chamunda and more.",
    packageSlugs: ["himachal-shakti-peeth-darshan", "panch-devi-darshan", "char-devi-darshan", "navratri-special-yatra"],
  },
  {
    slug: "buddhist-circuit",
    title: "Buddhist Circuit",
    tagline: "Monasteries of Dharamshala & Spiti",
    cover: u("photo-1473625247510-8ceb1760943f"),
    description:
      "Buddhist pilgrimages through the monasteries of Dharamshala, Spiti and Lahaul — Namgyal, Key, Tabo, Dhankar and the sacred lake of Rewalsar.",
    packageSlugs: ["himachal-buddhist-circuit", "spiti-monastery-tour", "dharamshala-monastery-tour", "rewalsar-spiritual-tour"],
  },
  {
    slug: "festival-tours",
    title: "Festival Tours",
    tagline: "Himachal's living festivals & fairs",
    cover: u("photo-1506197603052-3cc9c3a201bd"),
    description:
      "Experience Himachal's vibrant living traditions — Kullu Dussehra, Mandi Shivratri, Minjar, Renuka, Lavi and the Tibetan New Year, Losar.",
    packageSlugs: ["kullu-dussehra", "mandi-shivratri", "minjar-fair", "renuka-fair", "lavi-fair", "losar-festival"],
  },
];

async function main() {
  // Reset: remove any existing yatra nav-groups so only the 5 categories remain.
  const del = await run("internalPage", "deleteMany", { where: { type: "yatra" } });
  console.log(`🧹 removed ${del?.count ?? 0} existing yatra nav-group(s).`);

  console.log("🛕 creating 5 yatra category nav-groups...");
  let sortOrder = 0;
  for (const c of CATEGORIES) {
    sortOrder += 1;

    // Resolve package ids for this category (only yatra-tagged ones).
    const ids = [];
    for (const slug of c.packageSlugs) {
      const pkg = await run("package", "findFirst", { where: { slug, isYatra: true } });
      if (pkg) ids.push(pkg.id);
    }

    await run("internalPage", "create", {
      data: {
        title: c.title,
        slug: c.slug,
        type: "yatra",
        tagline: c.tagline,
        description: `<p>${c.description}</p>`,
        coverImage: c.cover,
        sortOrder,
        isActive: true,
        metaTitle: `${c.title} | Himvigo Yatras`,
        metaDescription: c.description.slice(0, 155),
        packages: { connect: ids.map((id) => ({ id })) },
      },
    });
    console.log(`  • ${c.title.padEnd(22)} → ${ids.length} package(s) linked`);
  }
  console.log("✅ yatra menu seed complete — 5 categories.");
}

main().catch((e) => {
  console.error("❌ yatra menu seed failed:", e);
  process.exit(1);
});
