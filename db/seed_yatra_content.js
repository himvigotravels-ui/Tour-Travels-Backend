// Seed the 24 yatra pilgrimage packages (isYatra=true) with full content:
// itineraries, images, pricing, inclusions. These are the tour detail pages;
// db/seed_yatras.js then groups them under the 5 dropdown categories.
//
// Re-runnable: each package is upserted (update if slug exists, else create).
// Run from the backend/ directory:  node db/seed_yatra_content.js
//
// It talks to whatever DB backend/src/db.js connects to (local dev.db, or
// Turso in production when TURSO_DATABASE_URL is set).

// Dual-mode data access:
//   • default            → local DB (backend/src/query.js against dev.db / Turso)
//   • SEED_REMOTE_URL set → the deployed backend's RPC gateway (/api/prisma),
//                           so production can be seeded without DB credentials:
//        SEED_REMOTE_URL=https://tour-travels-backend-l6e4.onrender.com \
//        node db/seed_yatra_content.js
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
  await import("../src/db.js"); // initialise schema + migrations
  ({ run } = await import("../src/query.js"));
}

const u = (id) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=80`;

const IMG = {
  spiti: u("photo-1626621331169-5f34be280ed9"),
  monastery: u("photo-1473625247510-8ceb1760943f"),
  range: u("photo-1485470733090-0aae1788d5af"),
  sunset: u("photo-1565182999561-18d7dc61c393"),
  snowy: u("photo-1455156218388-5e61b526818b"),
  cloud: u("photo-1500534314209-a25ddb2bd429"),
  dusk: u("photo-1493514789931-586cb221d7a7"),
  kinner: u("photo-1542401886-65d6c61db217"),
  orchard: u("photo-1568702846914-96b305d2aaeb"),
  river: u("photo-1464822759023-fed622ff2c3b"),
  pine: u("photo-1593115057322-e94b77572f20"),
  beas: u("photo-1506197603052-3cc9c3a201bd"),
  colonial: u("photo-1605649487212-47bdab064df7"),
  desert: u("photo-1518602164578-cd0074062767"),
  lake: u("photo-1486870591958-9b9d0d1dda99"),
  ridge: u("photo-1614977645540-7abd88ba8e56"),
  meadow: u("photo-1544735716-392fe2489ffa"),
  alpine: u("photo-1502082553048-f009c37129b9"),
  starry: u("photo-1480497490787-505ec076689f"),
  forest: u("photo-1502943693086-33b5b1cfdf2f"),
  road: u("photo-1454496522488-7a8e488e8606"),
};

// Every entry becomes BOTH a yatra package (rich detail page) and enriches
// its same-slug nav-group. tagline/description/coverImage are shared.
const YATRAS = [
  // ─── Major Pilgrimages ───────────────────────────────────────────────
  {
    slug: "manimahesh-yatra",
    title: "Manimahesh Yatra — Kailash of Chamba",
    location: "Bharmour, Chamba",
    tagline: "Sacred lake at the foot of Manimahesh Kailash",
    price: 8999, days: 4, nights: 3, featured: true,
    images: [IMG.lake, IMG.range, IMG.snowy],
    vehicle: "Tempo Traveller", occ: 14, cat: ["spiritual"],
    description:
      "A revered high-altitude yatra to the holy Manimahesh Lake (4,080 m) at the base of the Manimahesh Kailash peak, believed to be an abode of Lord Shiva. The pilgrimage begins from the ancient temple town of Bharmour.",
    itinerary: [
      { day: 1, title: "Arrival at Bharmour", activities: "Drive to Bharmour, darshan at the 84-temple Chaurasi complex, overnight stay." },
      { day: 2, title: "Bharmour → Hadsar → Dhancho", activities: "Drive to Hadsar base, begin trek to Dhancho (waterfall) for the night halt." },
      { day: 3, title: "Dhancho → Manimahesh Lake → return", activities: "Early trek to the holy lake, holy dip and darshan of Kailash peak, descend to Hadsar." },
      { day: 4, title: "Departure", activities: "Morning temple visit, drive back with blessings." },
    ],
    inclusions: ["Accommodation on twin-sharing", "Vegetarian meals during yatra", "Local transport Bharmour–Hadsar", "Experienced yatra guide", "Tent stay at Dhancho"],
    exclusions: ["Travel to Bharmour/Chamba", "Pony or porter charges", "Personal expenses & tips"],
  },
  {
    slug: "shrikhand-mahadev",
    title: "Shrikhand Mahadev Yatra — The Toughest Kailash",
    location: "Nirmand, Kullu",
    tagline: "A demanding trek to the 75-ft Shivling at 18,570 ft",
    price: 13999, days: 6, nights: 5, featured: true,
    images: [IMG.snowy, IMG.range, IMG.cloud],
    vehicle: "SUV", occ: 8, cat: ["spiritual", "offbeat"],
    description:
      "One of the most challenging pilgrimages in India — a strenuous high-altitude trek to the towering 75-ft rock Shivling of Shrikhand Mahadev at 5,660 m. For fit, experienced devotees only.",
    itinerary: [
      { day: 1, title: "Arrival at Jaon village", activities: "Drive to Jaon via Nirmand, briefing and acclimatisation." },
      { day: 2, title: "Jaon → Thachru", activities: "Steep ascent through forest to Thachru camp." },
      { day: 3, title: "Thachru → Kunsha → Bhim Dwar", activities: "Cross meadows and boulder fields to Bhim Dwar." },
      { day: 4, title: "Bhim Dwar → Shrikhand Mahadev → return", activities: "Summit day for darshan of the Shivling, descend to Bhim Dwar." },
      { day: 5, title: "Bhim Dwar → Thachru", activities: "Long descent back to Thachru." },
      { day: 6, title: "Thachru → Jaon → departure", activities: "Final descent to Jaon and drive back." },
    ],
    inclusions: ["Tented accommodation on trek", "All vegetarian meals", "Trek guide & support staff", "First-aid & oxygen support", "Camping permits"],
    exclusions: ["Travel to Nirmand/Rampur", "Personal trekking gear", "Insurance & evacuation", "Porter/pony charges"],
  },
  {
    slug: "kinnaur-kailash",
    title: "Kinnaur Kailash Yatra — Shivling of the Kinner Range",
    location: "Kinnaur",
    tagline: "Darshan of the 79-ft natural Shivling above Kalpa",
    price: 10999, days: 5, nights: 4, featured: true,
    images: [IMG.kinner, IMG.orchard, IMG.range],
    vehicle: "SUV", occ: 8, cat: ["spiritual", "offbeat"],
    description:
      "A sacred yatra to the majestic Kinnaur Kailash (6,050 m) and its 79-ft vertical rock Shivling, revered by both Hindus and Buddhists. Set amid the apple orchards and snow peaks of Kalpa and Kinnaur.",
    itinerary: [
      { day: 1, title: "Arrival at Kalpa", activities: "Drive to Kalpa via Sangla, evening view of the Kinner Kailash range." },
      { day: 2, title: "Kalpa → Tangling → trek base", activities: "Drive to Tangling village, begin ascent to Ashi Khad camp." },
      { day: 3, title: "Trek to Kinnaur Kailash Shivling", activities: "Long summit walk for darshan of the Shivling, return to camp." },
      { day: 4, title: "Descend to Kalpa", activities: "Trek down, visit the Narayan-Nagini temple and Kalpa monastery." },
      { day: 5, title: "Departure", activities: "Sunrise over Kinner Kailash, drive back." },
    ],
    inclusions: ["Hotel & camp stay on twin-sharing", "Vegetarian meals", "SUV transport in Kinnaur", "Local yatra guide", "Inner-line assistance"],
    exclusions: ["Travel to Kinnaur", "Personal expenses", "Pony/porter charges"],
  },
  {
    slug: "bijli-mahadev",
    title: "Bijli Mahadev Darshan — The Lightning Temple",
    location: "Kullu",
    tagline: "The 60-ft staff struck by divine lightning",
    price: 2499, days: 2, nights: 1,
    images: [IMG.beas, IMG.meadow, IMG.pine],
    vehicle: "SUV", occ: 10, cat: ["spiritual", "family"],
    description:
      "A short, uplifting pilgrimage to the famous Bijli Mahadev temple above Kullu, where a 60-ft staff is said to be struck by lightning that miraculously shatters and reforms the Shivling. Panoramic views over the Kullu and Parvati valleys.",
    itinerary: [
      { day: 1, title: "Kullu → Chansari → temple trek", activities: "Drive to the base and trek 3 km through deodar forest to the temple, evening aarti." },
      { day: 2, title: "Sunrise darshan & return", activities: "Sunrise over the valleys, descend and drive back." },
    ],
    inclusions: ["Guesthouse stay", "Breakfast & dinner", "Local transport", "Guide for temple trek"],
    exclusions: ["Travel to Kullu", "Lunch", "Personal expenses"],
  },
  {
    slug: "trilokinath-temple",
    title: "Trilokinath Temple Yatra — Lahaul's Sacred Shrine",
    location: "Udaipur, Lahaul",
    tagline: "Where Shaivites and Buddhists worship as one",
    price: 7999, days: 3, nights: 2,
    images: [IMG.desert, IMG.road, IMG.snowy],
    vehicle: "SUV", occ: 8, cat: ["spiritual", "cultural"],
    description:
      "A journey to the unique Trilokinath temple in the Pattan valley of Lahaul, worshipped by both Hindus (as Shiva) and Buddhists (as Avalokiteshvara). A rare confluence of two faiths in a stark high-mountain landscape.",
    itinerary: [
      { day: 1, title: "Manali → Atal Tunnel → Udaipur", activities: "Scenic drive over the Atal Tunnel into Lahaul, reach Udaipur." },
      { day: 2, title: "Trilokinath darshan & Mrikula Devi", activities: "Morning puja at Trilokinath, visit the wooden Mrikula Devi temple." },
      { day: 3, title: "Return to Manali", activities: "Drive back through the Lahaul valley to Manali." },
    ],
    inclusions: ["Hotel stay in Udaipur/Keylong", "Vegetarian meals", "SUV with driver", "Temple guide"],
    exclusions: ["Travel to Manali", "Personal expenses", "Entry donations"],
  },
  {
    slug: "bhimakali-temple",
    title: "Bhimakali Temple Yatra — Sarahan's Shakti Peeth",
    location: "Sarahan, Shimla",
    tagline: "Tower temple of the goddess at the gateway to Kinnaur",
    price: 5999, days: 3, nights: 2,
    images: [IMG.colonial, IMG.kinner, IMG.orchard],
    vehicle: "Tempo Traveller", occ: 12, cat: ["spiritual", "cultural"],
    description:
      "A darshan of the striking Bhimakali temple at Sarahan — a Shakti Peeth built in a blend of Hindu and Buddhist tower architecture, set against the Srikhand peaks at the gateway to the Kinnaur valley.",
    itinerary: [
      { day: 1, title: "Shimla → Sarahan", activities: "Drive along the Sutlej to Sarahan, evening aarti at Bhimakali temple." },
      { day: 2, title: "Sarahan darshan & bird park", activities: "Morning puja, visit the pheasant breeding park and local village." },
      { day: 3, title: "Return to Shimla", activities: "Drive back through the apple country." },
    ],
    inclusions: ["Hotel/temple-guesthouse stay", "Vegetarian meals", "Transport from Shimla", "Local guide"],
    exclusions: ["Travel to Shimla", "Personal expenses", "Camera fees"],
  },

  // ─── Temple Circuits ─────────────────────────────────────────────────
  {
    slug: "complete-himachal-temple-tour",
    title: "Complete Himachal Temple Tour",
    location: "Himachal Pradesh",
    tagline: "The grand circuit of Himachal's most revered temples",
    price: 26999, days: 10, nights: 9, featured: true,
    images: [IMG.range, IMG.colonial, IMG.beas],
    vehicle: "Tempo Traveller", occ: 14, cat: ["spiritual", "cultural"],
    description:
      "A comprehensive 10-day pilgrimage covering the most important temples of Himachal Pradesh — from the Shakti Peeths of Kangra to the Shiva shrines of Kullu — with comfortable stays and experienced spiritual guides throughout.",
    itinerary: [
      { day: 1, title: "Arrival at Chandigarh → Naina Devi", activities: "Drive to Naina Devi Shakti Peeth for darshan, overnight nearby." },
      { day: 2, title: "Chintpurni & Jwalamukhi", activities: "Darshan at Chintpurni and the eternal-flame Jwalamukhi temple." },
      { day: 3, title: "Kangra: Brajeshwari & Chamunda", activities: "Visit Brajeshwari Devi and Chamunda Devi temples." },
      { day: 4, title: "Baijnath & Dharamshala", activities: "Ancient Baijnath Shiva temple, drive to Dharamshala." },
      { day: 5, title: "Dharamshala temples", activities: "Local shrines and monasteries of McLeod Ganj." },
      { day: 6, title: "Mandi — the Varanasi of the hills", activities: "Drive to Mandi, temple hopping along the Beas." },
      { day: 7, title: "Rewalsar (Tso Pema)", activities: "Sacred lake and temples of Rewalsar." },
      { day: 8, title: "Kullu: Bijli Mahadev & Raghunath", activities: "Darshan at Bijli Mahadev and Raghunath temple." },
      { day: 9, title: "Manali temples", activities: "Hidimba Devi and Manu temple at Manali." },
      { day: 10, title: "Departure", activities: "Drive back with blessings." },
    ],
    inclusions: ["9 nights hotel accommodation", "Daily breakfast & dinner", "AC Tempo Traveller for full tour", "Temple guide & assistance", "All darshan arrangements"],
    exclusions: ["Airfare/train to start point", "Lunches", "VIP darshan tickets", "Personal expenses"],
  },
  {
    slug: "kangra-divine-circuit",
    title: "Kangra Divine Circuit",
    location: "Kangra",
    tagline: "Jwalamukhi, Chintpurni, Brajeshwari, Chamunda & Baijnath",
    price: 14999, days: 5, nights: 4,
    images: [IMG.beas, IMG.range, IMG.forest],
    vehicle: "Tempo Traveller", occ: 12, cat: ["spiritual", "cultural"],
    description:
      "A focused circuit through the sacred temples of the Kangra valley — including the eternal flame of Jwalamukhi and the powerful Shakti shrines of Chintpurni, Brajeshwari and Chamunda Devi.",
    itinerary: [
      { day: 1, title: "Arrival → Chintpurni", activities: "Drive to Chintpurni for darshan, overnight." },
      { day: 2, title: "Jwalamukhi", activities: "The eternal-flame temple of Jwalamukhi Devi." },
      { day: 3, title: "Brajeshwari & Kangra Fort", activities: "Brajeshwari Devi temple and the historic Kangra Fort." },
      { day: 4, title: "Chamunda Devi & Baijnath", activities: "Chamunda Devi and the 13th-century Baijnath Shiva temple." },
      { day: 5, title: "Departure", activities: "Morning puja and drive back." },
    ],
    inclusions: ["4 nights hotel stay", "Breakfast & dinner", "AC transport", "Temple guide"],
    exclusions: ["Travel to Kangra", "Lunches", "Special darshan fees"],
  },
  {
    slug: "shiva-temple-circuit",
    title: "Shiva Temple Circuit of Himachal",
    location: "Himachal Pradesh",
    tagline: "Baijnath, Bijli Mahadev & the abodes of Mahadev",
    price: 13499, days: 5, nights: 4,
    images: [IMG.range, IMG.pine, IMG.snowy],
    vehicle: "Tempo Traveller", occ: 12, cat: ["spiritual"],
    description:
      "A pilgrimage dedicated to Lord Shiva across Himachal — from the ancient Baijnath temple to the lightning-blessed Bijli Mahadev and the Shivling shrines of the Kullu-Mandi belt.",
    itinerary: [
      { day: 1, title: "Arrival → Baijnath", activities: "Darshan at the sacred Baijnath Shiva temple." },
      { day: 2, title: "Mandi Shiva temples", activities: "Bhootnath and Triloknath temples of Mandi town." },
      { day: 3, title: "Bijli Mahadev, Kullu", activities: "Trek to the lightning temple of Bijli Mahadev." },
      { day: 4, title: "Manikaran", activities: "Hot-spring shrine of Manikaran in Parvati valley." },
      { day: 5, title: "Departure", activities: "Morning aarti and drive back." },
    ],
    inclusions: ["4 nights accommodation", "Breakfast & dinner", "AC transport", "Guide"],
    exclusions: ["Travel to start point", "Lunches", "Personal expenses"],
  },
  {
    slug: "kullu-spiritual-tour",
    title: "Kullu Spiritual Tour",
    location: "Kullu",
    tagline: "Raghunath, Bijli Mahadev, Bijleshwar & the valley of gods",
    price: 8999, days: 3, nights: 2,
    images: [IMG.beas, IMG.meadow, IMG.river],
    vehicle: "SUV", occ: 10, cat: ["spiritual", "family"],
    description:
      "The 'Valley of the Gods' is home to hundreds of deities. This short tour covers Kullu's most important shrines — the Raghunath temple, Bijli Mahadev and the riverside Vaishno Devi cave.",
    itinerary: [
      { day: 1, title: "Kullu: Raghunath temple", activities: "Darshan at the presiding Raghunath temple of Kullu." },
      { day: 2, title: "Bijli Mahadev & Vaishno Devi cave", activities: "Trek to Bijli Mahadev, visit the Vaishno Devi cave temple." },
      { day: 3, title: "Bijleshwar Mahadev & departure", activities: "Morning darshan and drive back." },
    ],
    inclusions: ["2 nights hotel stay", "Breakfast & dinner", "SUV transport", "Local guide"],
    exclusions: ["Travel to Kullu", "Lunches", "Personal expenses"],
  },

  // ─── Shakti Peeth Circuit ────────────────────────────────────────────
  {
    slug: "himachal-shakti-peeth-darshan",
    title: "Himachal Shakti Peeth Darshan",
    location: "Himachal Pradesh",
    tagline: "The great goddess temples of the Himalayas",
    price: 18999, days: 7, nights: 6, featured: true,
    images: [IMG.range, IMG.colonial, IMG.forest],
    vehicle: "Tempo Traveller", occ: 14, cat: ["spiritual", "cultural"],
    description:
      "A complete darshan of Himachal's revered Shakti Peeths and goddess temples — Naina Devi, Chintpurni, Jwalamukhi, Brajeshwari, Chamunda and Bhimakali — a soul-stirring 7-day journey for devotees of the Devi.",
    itinerary: [
      { day: 1, title: "Arrival → Naina Devi", activities: "Drive to Naina Devi Shakti Peeth for darshan." },
      { day: 2, title: "Chintpurni", activities: "Darshan at Chintpurni Devi." },
      { day: 3, title: "Jwalamukhi", activities: "The eternal flame of Jwalamukhi." },
      { day: 4, title: "Brajeshwari Devi", activities: "Kangra's Brajeshwari temple and fort." },
      { day: 5, title: "Chamunda Devi", activities: "Chamunda Nandikeshwar Dham." },
      { day: 6, title: "Bhimakali, Sarahan", activities: "Long drive to Sarahan for Bhimakali darshan." },
      { day: 7, title: "Departure", activities: "Morning puja and return." },
    ],
    inclusions: ["6 nights hotel accommodation", "Breakfast & dinner", "AC Tempo Traveller", "Temple guide & darshan help"],
    exclusions: ["Travel to start point", "Lunches", "VIP darshan tickets", "Personal expenses"],
  },
  {
    slug: "panch-devi-darshan",
    title: "Panch Devi Darshan",
    location: "Kangra",
    tagline: "The five goddess temples of Himachal",
    price: 12999, days: 4, nights: 3,
    images: [IMG.forest, IMG.range, IMG.beas],
    vehicle: "Tempo Traveller", occ: 12, cat: ["spiritual"],
    description:
      "A darshan of the five principal goddess temples — Naina Devi, Chintpurni, Jwalamukhi, Brajeshwari and Chamunda Devi — the classic Panch Devi pilgrimage of the Kangra and Bilaspur belt.",
    itinerary: [
      { day: 1, title: "Naina Devi & Chintpurni", activities: "Darshan at Naina Devi and Chintpurni." },
      { day: 2, title: "Jwalamukhi", activities: "The eternal flame temple." },
      { day: 3, title: "Brajeshwari & Chamunda", activities: "Brajeshwari Devi and Chamunda Devi." },
      { day: 4, title: "Departure", activities: "Morning puja and return journey." },
    ],
    inclusions: ["3 nights accommodation", "Breakfast & dinner", "AC transport", "Guide"],
    exclusions: ["Travel to Kangra", "Lunches", "Personal expenses"],
  },
  {
    slug: "char-devi-darshan",
    title: "Char Devi Darshan",
    location: "Kangra – Bilaspur",
    tagline: "Four sacred Devi temples in one journey",
    price: 9999, days: 3, nights: 2,
    images: [IMG.beas, IMG.forest, IMG.colonial],
    vehicle: "Tempo Traveller", occ: 12, cat: ["spiritual", "family"],
    description:
      "A compact three-day darshan of four beloved goddess temples — Chintpurni, Jwalamukhi, Brajeshwari and Chamunda Devi — ideal for devotees short on time.",
    itinerary: [
      { day: 1, title: "Chintpurni", activities: "Arrive and take darshan at Chintpurni Devi." },
      { day: 2, title: "Jwalamukhi & Brajeshwari", activities: "Jwalamukhi eternal flame and Brajeshwari Devi." },
      { day: 3, title: "Chamunda Devi & departure", activities: "Chamunda Devi darshan and return." },
    ],
    inclusions: ["2 nights accommodation", "Breakfast & dinner", "AC transport", "Guide"],
    exclusions: ["Travel to start point", "Lunches", "Personal expenses"],
  },
  {
    slug: "navratri-special-yatra",
    title: "Navratri Special Yatra",
    location: "Himachal Pradesh",
    tagline: "Nine nights of Devi darshan across Himachal",
    price: 15999, days: 6, nights: 5,
    images: [IMG.colonial, IMG.range, IMG.forest],
    vehicle: "Tempo Traveller", occ: 14, cat: ["spiritual", "cultural"],
    description:
      "A special seasonal yatra during the auspicious Navratri festival, covering the major Shakti Peeths of Himachal amid grand celebrations, decorated temples and special aartis. Book early — limited departures.",
    itinerary: [
      { day: 1, title: "Arrival → Naina Devi", activities: "Festive darshan at Naina Devi." },
      { day: 2, title: "Chintpurni", activities: "Navratri special aarti at Chintpurni." },
      { day: 3, title: "Jwalamukhi", activities: "Eternal flame darshan during Navratri." },
      { day: 4, title: "Brajeshwari Devi", activities: "Kangra Brajeshwari celebrations." },
      { day: 5, title: "Chamunda Devi", activities: "Chamunda Devi darshan and hawan." },
      { day: 6, title: "Departure", activities: "Final puja and return." },
    ],
    inclusions: ["5 nights hotel stay", "Breakfast & dinner", "AC transport", "Navratri darshan arrangements", "Guide"],
    exclusions: ["Travel to start point", "Lunches", "Special pooja materials", "Personal expenses"],
  },

  // ─── Buddhist Circuit ────────────────────────────────────────────────
  {
    slug: "himachal-buddhist-circuit",
    title: "Himachal Buddhist Circuit",
    location: "Dharamshala",
    tagline: "Monasteries of Dharamshala, Spiti & the Dalai Lama's home",
    price: 24999, days: 8, nights: 7, featured: true,
    images: [IMG.monastery, IMG.desert, IMG.spiti],
    vehicle: "Tempo Traveller", occ: 12, cat: ["spiritual", "cultural"],
    description:
      "An immersive Buddhist pilgrimage from the Tibetan seat of Dharamshala to the thousand-year-old monasteries of the Spiti valley — Namgyal, Key, Tabo, Dhankar and more.",
    itinerary: [
      { day: 1, title: "Arrival at Dharamshala", activities: "Namgyal Monastery and the Dalai Lama temple complex." },
      { day: 2, title: "McLeod Ganj & Norbulingka", activities: "Norbulingka Institute and local monasteries." },
      { day: 3, title: "Dharamshala → Mandi → Kaza (via Spiti)", activities: "Long scenic drive toward Spiti." },
      { day: 4, title: "Kaza & Key Monastery", activities: "Visit the iconic Key Monastery above Kaza." },
      { day: 5, title: "Tabo & Dhankar", activities: "The 1,000-year-old Tabo and cliff-top Dhankar monasteries." },
      { day: 6, title: "Pin Valley & Kungri", activities: "Kungri monastery in the Pin valley." },
      { day: 7, title: "Kaza → Chandratal", activities: "Drive to the sacred Chandratal lake." },
      { day: 8, title: "Return via Atal Tunnel", activities: "Drive back to Manali." },
    ],
    inclusions: ["7 nights accommodation", "Breakfast & dinner", "AC/SUV transport", "Monastery guide", "Inner-line permits"],
    exclusions: ["Travel to Dharamshala", "Lunches", "Monastery donations", "Personal expenses"],
  },
  {
    slug: "spiti-monastery-tour",
    title: "Spiti Monastery Tour",
    location: "Spiti Valley",
    tagline: "Key, Tabo, Dhankar & the roof-of-the-world gompas",
    price: 21999, days: 7, nights: 6, featured: true,
    images: [IMG.spiti, IMG.desert, IMG.monastery],
    vehicle: "SUV", occ: 7, cat: ["spiritual", "offbeat"],
    description:
      "A high-altitude spiritual journey through the cold desert of Spiti, visiting the ancient monasteries of Key, Tabo, Dhankar and Komic — some of the oldest continuously-inhabited gompas in the world.",
    itinerary: [
      { day: 1, title: "Shimla → Sarahan", activities: "Drive along the Sutlej, Bhimakali temple en route." },
      { day: 2, title: "Sarahan → Kalpa", activities: "Enter Kinnaur, overnight at Kalpa." },
      { day: 3, title: "Kalpa → Tabo", activities: "Cross into Spiti, visit Tabo monastery." },
      { day: 4, title: "Dhankar & Pin Valley", activities: "Cliff-top Dhankar and Kungri monasteries." },
      { day: 5, title: "Kaza: Key, Kibber, Komic", activities: "Key Monastery, Kibber and the high village of Komic." },
      { day: 6, title: "Kaza → Chandratal", activities: "Drive to the crescent-shaped Chandratal lake." },
      { day: 7, title: "Return to Manali", activities: "Cross Kunzum La and the Atal Tunnel to Manali." },
    ],
    inclusions: ["6 nights stay (hotels/homestays)", "Breakfast & dinner", "SUV with mountain driver", "Monastery guide", "Inner-line permits"],
    exclusions: ["Travel to Shimla", "Lunches", "Oxygen (if needed)", "Personal expenses"],
  },
  {
    slug: "dharamshala-monastery-tour",
    title: "Dharamshala Monastery Tour",
    location: "Dharamshala / McLeod Ganj",
    tagline: "The Tibetan heart of the Himalayas",
    price: 8999, days: 3, nights: 2,
    images: [IMG.monastery, IMG.meadow, IMG.forest],
    vehicle: "SUV", occ: 10, cat: ["spiritual", "cultural"],
    description:
      "A peaceful tour of Dharamshala and McLeod Ganj — home of His Holiness the Dalai Lama. Visit the Namgyal Monastery, Tsuglagkhang complex, Norbulingka Institute and the serene Bhagsu shrines.",
    itinerary: [
      { day: 1, title: "Tsuglagkhang & Namgyal Monastery", activities: "The main Dalai Lama temple complex and Tibet Museum." },
      { day: 2, title: "Norbulingka & Bhagsunag", activities: "Norbulingka Institute, Bhagsunag temple and waterfall." },
      { day: 3, title: "Dal Lake & departure", activities: "Dal Lake, Naddi viewpoint and drive back." },
    ],
    inclusions: ["2 nights hotel stay", "Breakfast & dinner", "SUV transport", "Local guide"],
    exclusions: ["Travel to Dharamshala", "Lunches", "Monastery donations"],
  },
  {
    slug: "rewalsar-spiritual-tour",
    title: "Rewalsar (Tso Pema) Spiritual Tour",
    location: "Mandi",
    tagline: "The sacred lake of Guru Padmasambhava",
    price: 6999, days: 2, nights: 1,
    images: [IMG.lake, IMG.pine, IMG.beas],
    vehicle: "SUV", occ: 10, cat: ["spiritual", "cultural"],
    description:
      "A tranquil pilgrimage to Rewalsar (Tso Pema) — a sacred lake holy to Hindus, Buddhists and Sikhs alike, associated with Guru Padmasambhava. Floating reed islands, a giant Guru Rinpoche statue and hillside gompas.",
    itinerary: [
      { day: 1, title: "Mandi → Rewalsar", activities: "Lakeside temples, gurudwara and Padmasambhava statue; evening aarti." },
      { day: 2, title: "Cave temples & return", activities: "Hilltop caves and monasteries, drive back." },
    ],
    inclusions: ["1 night accommodation", "Breakfast & dinner", "SUV transport", "Guide"],
    exclusions: ["Travel to Mandi", "Lunch", "Personal expenses"],
  },

  // ─── Festival Tours ──────────────────────────────────────────────────
  {
    slug: "kullu-dussehra",
    title: "Kullu Dussehra Festival Tour",
    location: "Kullu",
    tagline: "The week-long gathering of 300 gods",
    price: 11999, days: 4, nights: 3,
    images: [IMG.beas, IMG.meadow, IMG.river],
    vehicle: "Tempo Traveller", occ: 14, cat: ["cultural", "family"],
    description:
      "Experience the world-famous Kullu Dussehra, when over 300 village deities are carried to Dhalpur Maidan to honour Lord Raghunath. A vibrant week of processions, folk dance and mountain culture (held in October).",
    itinerary: [
      { day: 1, title: "Arrival at Kullu", activities: "Settle in, evening at the festival grounds." },
      { day: 2, title: "Rath Yatra procession", activities: "The grand chariot procession of Lord Raghunath." },
      { day: 3, title: "Deity gatherings & folk culture", activities: "Devta gatherings, folk performances and local crafts." },
      { day: 4, title: "Departure", activities: "Morning darshan and drive back." },
    ],
    inclusions: ["3 nights accommodation", "Breakfast & dinner", "Festival transfers", "Local guide"],
    exclusions: ["Travel to Kullu", "Lunches", "Personal expenses"],
  },
  {
    slug: "mandi-shivratri",
    title: "Mandi Shivratri Festival Tour",
    location: "Mandi",
    tagline: "The fair of gods in the little Kashi",
    price: 9999, days: 3, nights: 2,
    images: [IMG.beas, IMG.colonial, IMG.pine],
    vehicle: "Tempo Traveller", occ: 12, cat: ["cultural", "spiritual"],
    description:
      "Witness the grand Mandi Shivratri — a week-long international fair where village deities converge on Mandi, the 'Varanasi of the hills', to pay homage at the Bhootnath temple (held in Feb/March).",
    itinerary: [
      { day: 1, title: "Arrival at Mandi", activities: "Bhootnath temple darshan, evening fair." },
      { day: 2, title: "Jaleb procession & devta darbar", activities: "The royal Jaleb procession and gathering of deities." },
      { day: 3, title: "Temple town tour & departure", activities: "Explore Mandi's riverside temples and drive back." },
    ],
    inclusions: ["2 nights accommodation", "Breakfast & dinner", "Transport", "Guide"],
    exclusions: ["Travel to Mandi", "Lunches", "Personal expenses"],
  },
  {
    slug: "minjar-fair",
    title: "Minjar Fair Tour — Chamba",
    location: "Chamba",
    tagline: "The historic monsoon harvest fair of Chamba",
    price: 8999, days: 3, nights: 2,
    images: [IMG.range, IMG.meadow, IMG.forest],
    vehicle: "Tempo Traveller", occ: 12, cat: ["cultural", "family"],
    description:
      "Join the centuries-old Minjar Fair of Chamba, a colourful week-long festival marking the maize harvest with processions, folk music and the offering of silk 'minjar' tassels to the river Ravi (held in July/August).",
    itinerary: [
      { day: 1, title: "Arrival at Chamba", activities: "Chowgan grounds, Laxmi Narayan temple darshan." },
      { day: 2, title: "Minjar procession", activities: "Grand procession and folk cultural programmes." },
      { day: 3, title: "Bharmour excursion & departure", activities: "Optional Bharmour temples, drive back." },
    ],
    inclusions: ["2 nights accommodation", "Breakfast & dinner", "Transport", "Guide"],
    exclusions: ["Travel to Chamba", "Lunches", "Personal expenses"],
  },
  {
    slug: "renuka-fair",
    title: "Renuka Ji Fair Tour",
    location: "Renuka Ji, Sirmaur",
    tagline: "Himachal's largest lake and the Parashurama legend",
    price: 7999, days: 2, nights: 1,
    images: [IMG.lake, IMG.forest, IMG.pine],
    vehicle: "SUV", occ: 10, cat: ["cultural", "family"],
    description:
      "Attend the international Renuka Ji Fair at the shores of Himachal's largest natural lake, celebrating the reunion of Lord Parashurama with his mother Renuka. Boat rituals, a wildlife sanctuary and lakeside temples (held in November).",
    itinerary: [
      { day: 1, title: "Arrival at Renuka Ji", activities: "Lakeside temples, evening aarti and fair." },
      { day: 2, title: "Parashurama procession & return", activities: "The reunion procession, sanctuary visit and drive back." },
    ],
    inclusions: ["1 night accommodation", "Breakfast & dinner", "SUV transport", "Guide"],
    exclusions: ["Travel to Renuka/Nahan", "Lunch", "Boating charges"],
  },
  {
    slug: "lavi-fair",
    title: "Lavi Fair Tour — Rampur Bushahr",
    location: "Rampur",
    tagline: "The ancient trade fair of the Sutlej valley",
    price: 8499, days: 3, nights: 2,
    images: [IMG.kinner, IMG.colonial, IMG.river],
    vehicle: "Tempo Traveller", occ: 12, cat: ["cultural", "offbeat"],
    description:
      "Experience the historic Lavi Fair of Rampur Bushahr — a 300-year-old trade fair from the days of the Indo-Tibetan trade route, famed for dry fruits, wool, horses and Kinnauri culture (held in November).",
    itinerary: [
      { day: 1, title: "Shimla → Rampur", activities: "Drive along the Sutlej, Padam Palace and fair grounds." },
      { day: 2, title: "Lavi Fair", activities: "Trade stalls, cultural nights and Kinnauri folk performances." },
      { day: 3, title: "Sarahan & departure", activities: "Bhimakali temple en route back to Shimla." },
    ],
    inclusions: ["2 nights accommodation", "Breakfast & dinner", "Transport", "Guide"],
    exclusions: ["Travel to Shimla", "Lunches", "Personal shopping"],
  },
  {
    slug: "losar-festival",
    title: "Losar Festival Tour — Spiti & Lahaul",
    location: "Spiti Valley",
    tagline: "Tibetan New Year in the cold desert",
    price: 22999, days: 6, nights: 5,
    images: [IMG.spiti, IMG.monastery, IMG.desert],
    vehicle: "SUV", occ: 7, cat: ["cultural", "offbeat"],
    description:
      "Celebrate Losar, the Tibetan New Year, with the Buddhist communities of Spiti and Lahaul — masked Chham dances, monastery rituals and warm homestays amid the snow-clad cold desert (held in February).",
    itinerary: [
      { day: 1, title: "Manali → Sissu (Lahaul)", activities: "Cross the Atal Tunnel, Losar preparations at Sissu." },
      { day: 2, title: "Sissu → Kaza", activities: "Drive into winter Spiti, homestay at Kaza." },
      { day: 3, title: "Losar at Key Monastery", activities: "Masked Chham dances and rituals at Key." },
      { day: 4, title: "Village celebrations", activities: "Homestay festivities at Langza/Komic villages." },
      { day: 5, title: "Kaza → Sissu", activities: "Return drive, evening in Lahaul." },
      { day: 6, title: "Return to Manali", activities: "Drive back through the Atal Tunnel." },
    ],
    inclusions: ["5 nights stay (hotels/homestays)", "All meals", "4x4 SUV with winter driver", "Monastery & village guide", "Permits"],
    exclusions: ["Travel to Manali", "Winter gear", "Personal expenses", "Emergency evacuation"],
  },
];

async function upsertPackage(y) {
  const data = {
    slug: y.slug,
    title: y.title,
    location: y.location,
    pricePerPerson: y.price,
    durationDays: y.days,
    durationNights: y.nights,
    imageUrls: y.images,
    vehicleType: y.vehicle,
    maxOccupancy: y.occ,
    description: y.description,
    itinerary: y.itinerary,
    inclusions: y.inclusions,
    exclusions: y.exclusions,
    categories: y.cat,
    isFeatured: !!y.featured,
    isActive: true,
    isYatra: true,
    metaTitle: `${y.title} | Himvigo Yatras`,
    metaDescription: y.description.slice(0, 155),
    metaKeywords: `${y.title}, ${y.location}, himachal yatra, pilgrimage tour`,
  };
  const existing = await run("package", "findFirst", { where: { slug: y.slug } });
  if (existing) {
    await run("package", "update", { where: { slug: y.slug }, data });
    return "updated";
  }
  await run("package", "create", { data });
  return "created";
}

async function main() {
  console.log(`🛕 seeding ${YATRAS.length} yatra packages...`);
  let created = 0, updated = 0;
  for (const y of YATRAS) {
    const p = await upsertPackage(y);
    p === "created" ? created++ : updated++;
    console.log(`  • ${y.title.padEnd(48)} pkg:${p}`);
  }
  console.log(`\n✅ done — packages: ${created} new / ${updated} updated.`);
}

main().catch((e) => {
  console.error("❌ yatra content seed failed:", e);
  process.exit(1);
});
