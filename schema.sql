-- Aineara D1 schema
-- Run once against the `aineara-waitlist` database in Cloudflare D1.
-- Dashboard: D1 → aineara-waitlist → Console, or via Wrangler:
--   npx wrangler d1 execute aineara-waitlist --file=schema.sql

CREATE TABLE IF NOT EXISTS subscribers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT    NOT NULL UNIQUE,
  source     TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers (email);
CREATE INDEX IF NOT EXISTS idx_subscribers_source ON subscribers (source);
