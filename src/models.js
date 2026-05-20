// Model registry. Lets the query translator look up the SQLite table name,
// JSON-encoded fields, boolean fields and many-to-many relations for any
// Prisma model name the frontend sends.

export const MODELS = {
  package: {
    table: "packages",
    json: ["imageUrls", "itinerary", "inclusions", "exclusions", "categories"],
    bool: ["isFeatured", "isActive", "isTrek"],
    unique: ["id", "slug"],
    relations: {
      internalPages: {
        kind: "manyToMany",
        joinTable: "internal_page_packages",
        localKey: "packageId",
        foreignKey: "internalPageId",
        target: "internalPage",
      },
    },
  },
  blog: {
    table: "blogs",
    json: ["tags"],
    bool: ["isPublished"],
    unique: ["id", "slug"],
    date: ["publishedAt", "createdAt", "updatedAt"],
    relations: {},
  },
  destination: {
    table: "destinations",
    json: ["highlights", "categories"],
    bool: ["isActive"],
    unique: ["id", "slug"],
    relations: {
      internalPages: {
        kind: "manyToMany",
        joinTable: "internal_page_destinations",
        localKey: "destinationId",
        foreignKey: "internalPageId",
        target: "internalPage",
      },
    },
  },
  testimonial: {
    table: "testimonials",
    json: [],
    bool: ["isActive"],
    unique: ["id"],
    relations: {},
  },
  activity: {
    table: "activities",
    json: [],
    bool: ["isActive"],
    unique: ["id"],
    relations: {},
  },
  cabVehicle: {
    table: "cab_vehicles",
    json: ["features"],
    bool: ["isActive"],
    unique: ["id"],
    relations: {},
  },
  cabRoute: {
    table: "cab_routes",
    json: [],
    bool: ["isActive"],
    unique: ["id"],
    relations: {},
  },
  inquiry: {
    table: "inquiries",
    json: [],
    bool: [],
    unique: ["id"],
    date: ["pickupDate", "dropDate", "createdAt", "updatedAt"],
    relations: {},
  },
  siteSetting: {
    table: "site_settings",
    json: [],
    bool: [],
    unique: ["id", "key"],
    relations: {},
  },
  adminUser: {
    table: "admin_users",
    json: [],
    bool: [],
    unique: ["id", "email"],
    relations: {},
  },
  internalPage: {
    table: "internal_pages",
    json: [],
    bool: ["isActive", "isFeatured"],
    unique: ["id", "slug"],
    relations: {
      packages: {
        kind: "manyToMany",
        joinTable: "internal_page_packages",
        localKey: "internalPageId",
        foreignKey: "packageId",
        target: "package",
      },
      destinations: {
        kind: "manyToMany",
        joinTable: "internal_page_destinations",
        localKey: "internalPageId",
        foreignKey: "destinationId",
        target: "destination",
      },
    },
  },
};

export function getModel(name) {
  const m = MODELS[name];
  if (!m) throw new Error(`Unknown model: ${name}`);
  return m;
}
