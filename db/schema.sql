-- Raw SQLite DDL for the Tour-Travels backend.
-- Loaded by src/db.js on first boot. All boolean columns are INTEGER (0/1).
-- JSON columns (arrays/objects) are TEXT containing serialized JSON.

CREATE TABLE IF NOT EXISTS packages (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  location        TEXT NOT NULL,
  pricePerPerson  INTEGER NOT NULL,
  durationDays    INTEGER NOT NULL,
  durationNights  INTEGER NOT NULL,
  imageUrls       TEXT NOT NULL DEFAULT '[]',
  vehicleType     TEXT NOT NULL,
  maxOccupancy    INTEGER NOT NULL,
  description     TEXT NOT NULL,
  itinerary       TEXT NOT NULL DEFAULT '[]',
  inclusions      TEXT NOT NULL DEFAULT '[]',
  exclusions      TEXT NOT NULL DEFAULT '[]',
  categories      TEXT NOT NULL DEFAULT '[]',
  isFeatured      INTEGER NOT NULL DEFAULT 0,
  isActive        INTEGER NOT NULL DEFAULT 1,
  isTrek          INTEGER NOT NULL DEFAULT 0,
  isYatra         INTEGER NOT NULL DEFAULT 0,
  metaTitle       TEXT,
  metaDescription TEXT,
  metaKeywords    TEXT,
  createdAt       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updatedAt       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS blogs (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  excerpt         TEXT NOT NULL,
  content         TEXT NOT NULL,
  author          TEXT NOT NULL,
  coverImage      TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'Travel Guide',
  tags            TEXT NOT NULL DEFAULT '[]',
  isPublished     INTEGER NOT NULL DEFAULT 0,
  publishedAt     TEXT,
  metaTitle       TEXT,
  metaDescription TEXT,
  metaKeywords    TEXT,
  createdAt       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updatedAt       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS destinations (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  tagline         TEXT NOT NULL,
  description     TEXT NOT NULL,
  bestTime        TEXT NOT NULL,
  altitude        TEXT NOT NULL,
  vibe            TEXT NOT NULL,
  image           TEXT NOT NULL,
  highlights      TEXT NOT NULL DEFAULT '[]',
  categories      TEXT NOT NULL DEFAULT '[]',
  isActive        INTEGER NOT NULL DEFAULT 1,
  sortOrder       INTEGER NOT NULL DEFAULT 0,
  metaTitle       TEXT,
  metaDescription TEXT,
  metaKeywords    TEXT,
  createdAt       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updatedAt       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS testimonials (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  text        TEXT NOT NULL,
  packageName TEXT NOT NULL,
  rating      INTEGER NOT NULL DEFAULT 5,
  isActive    INTEGER NOT NULL DEFAULT 1,
  createdAt   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updatedAt   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS activities (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  image       TEXT NOT NULL,
  location    TEXT NOT NULL,
  icon        TEXT NOT NULL DEFAULT 'Compass',
  isActive    INTEGER NOT NULL DEFAULT 1,
  sortOrder   INTEGER NOT NULL DEFAULT 0,
  createdAt   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updatedAt   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS cab_vehicles (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  model     TEXT NOT NULL,
  capacity  TEXT NOT NULL,
  ideal     TEXT NOT NULL,
  features  TEXT NOT NULL DEFAULT '[]',
  image     TEXT NOT NULL,
  isActive  INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS cab_routes (
  id        TEXT PRIMARY KEY,
  fromCity  TEXT NOT NULL,
  toCity    TEXT NOT NULL,
  price     TEXT NOT NULL,
  duration  TEXT NOT NULL,
  isActive  INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS inquiries (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  phone          TEXT NOT NULL,
  fromCity       TEXT,
  toCity         TEXT,
  travelDate     TEXT,
  passengers     TEXT,
  duration       TEXT,
  message        TEXT,
  status         TEXT NOT NULL DEFAULT 'new',
  createdAt      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updatedAt      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  adults         INTEGER NOT NULL DEFAULT 1,
  children       INTEGER NOT NULL DEFAULT 0,
  dropDate       TEXT,
  dropLocation   TEXT,
  email          TEXT,
  pickupDate     TEXT,
  pickupLocation TEXT
);

CREATE TABLE IF NOT EXISTS site_settings (
  id        TEXT PRIMARY KEY,
  key       TEXT NOT NULL UNIQUE,
  value     TEXT NOT NULL,
  updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS admin_users (
  id        TEXT PRIMARY KEY,
  email     TEXT NOT NULL UNIQUE,
  password  TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS internal_pages (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  description     TEXT,
  tagline         TEXT,
  content         TEXT,
  coverImage      TEXT,
  type            TEXT NOT NULL,
  menuCategory    TEXT,
  isActive        INTEGER NOT NULL DEFAULT 1,
  isFeatured      INTEGER NOT NULL DEFAULT 0,
  sortOrder       INTEGER NOT NULL DEFAULT 0,
  metaTitle       TEXT,
  metaDescription TEXT,
  metaKeywords    TEXT,
  ogImage         TEXT,
  createdAt       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updatedAt       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Many-to-many join tables (explicit, plain naming)
CREATE TABLE IF NOT EXISTS internal_page_packages (
  internalPageId TEXT NOT NULL,
  packageId      TEXT NOT NULL,
  PRIMARY KEY (internalPageId, packageId),
  FOREIGN KEY (internalPageId) REFERENCES internal_pages(id) ON DELETE CASCADE,
  FOREIGN KEY (packageId)      REFERENCES packages(id)       ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS internal_page_destinations (
  internalPageId TEXT NOT NULL,
  destinationId  TEXT NOT NULL,
  PRIMARY KEY (internalPageId, destinationId),
  FOREIGN KEY (internalPageId) REFERENCES internal_pages(id)  ON DELETE CASCADE,
  FOREIGN KEY (destinationId)  REFERENCES destinations(id)    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_packages_active        ON packages (isActive);
CREATE INDEX IF NOT EXISTS idx_packages_featured      ON packages (isFeatured);
CREATE INDEX IF NOT EXISTS idx_packages_istrek        ON packages (isTrek);
CREATE INDEX IF NOT EXISTS idx_packages_isyatra       ON packages (isYatra);
CREATE INDEX IF NOT EXISTS idx_blogs_published        ON blogs (isPublished);
CREATE INDEX IF NOT EXISTS idx_destinations_active    ON destinations (isActive);
CREATE INDEX IF NOT EXISTS idx_internal_pages_active  ON internal_pages (isActive);
CREATE INDEX IF NOT EXISTS idx_internal_pages_type    ON internal_pages (type);
