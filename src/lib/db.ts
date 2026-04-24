/**
 * SQLite singleton + schema initialization + admin seeding.
 * Zero-config: data/app.db created automatically on first boot.
 */
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "app.db");

let _db: Database.Database | null = null;

function uuid() { return crypto.randomUUID(); }

function init(db: Database.Database) {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS charities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      image_url TEXT,
      website TEXT,
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      role TEXT NOT NULL DEFAULT 'subscriber' CHECK(role IN ('subscriber','admin')),
      charity_id TEXT REFERENCES charities(id) ON DELETE SET NULL,
      charity_pct REAL NOT NULL DEFAULT 10.0 CHECK(charity_pct >= 10 AND charity_pct <= 100),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      plan TEXT NOT NULL CHECK(plan IN ('monthly','yearly')),
      status TEXT NOT NULL DEFAULT 'none' CHECK(status IN ('active','cancelled','lapsed','none')),
      amount_cents INTEGER NOT NULL,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT UNIQUE,
      current_period_start TEXT,
      current_period_end TEXT,
      cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_sub_user ON subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sub_status ON subscriptions(status);

    CREATE TABLE IF NOT EXISTS scores (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 45),
      played_on TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, played_on)
    );
    CREATE INDEX IF NOT EXISTS idx_scores_user_date ON scores(user_id, played_on DESC);

    CREATE TABLE IF NOT EXISTS draws (
      id TEXT PRIMARY KEY,
      period TEXT UNIQUE NOT NULL,
      logic TEXT NOT NULL DEFAULT 'random' CHECK(logic IN ('random','algorithmic')),
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','simulated','published')),
      winning_numbers TEXT NOT NULL,
      pool_total_cents INTEGER NOT NULL DEFAULT 0,
      jackpot_carry_cents INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      published_at TEXT
    );

    CREATE TABLE IF NOT EXISTS winners (
      id TEXT PRIMARY KEY,
      draw_id TEXT NOT NULL REFERENCES draws(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      match_count INTEGER NOT NULL CHECK(match_count BETWEEN 3 AND 5),
      prize_cents INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','paid')),
      proof_url TEXT,
      reviewed_by TEXT REFERENCES profiles(id),
      reviewed_at TEXT,
      paid_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_winners_draw ON winners(draw_id);
    CREATE INDEX IF NOT EXISTS idx_winners_user ON winners(user_id);

    CREATE TABLE IF NOT EXISTS donations (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
      charity_id TEXT NOT NULL REFERENCES charities(id) ON DELETE RESTRICT,
      amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
      source TEXT NOT NULL DEFAULT 'subscription',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_donations_charity ON donations(charity_id);
  `);

  // Trigger: keep only latest 5 scores per user
  db.exec(`
    DROP TRIGGER IF EXISTS trg_trim_scores;
    CREATE TRIGGER trg_trim_scores AFTER INSERT ON scores
    BEGIN
      DELETE FROM scores
      WHERE id IN (
        SELECT id FROM scores
        WHERE user_id = NEW.user_id
        ORDER BY played_on DESC, created_at DESC
        LIMIT -1 OFFSET 5
      );
    END;
  `);

  // Seed charities (idempotent)
  const charityCount = db.prepare("SELECT COUNT(*) AS c FROM charities").get() as { c: number };
  if (charityCount.c === 0) {
    const seed = [
      { name: "Hearts for Kids", slug: "hearts-for-kids", description: "Funding paediatric care for under-served families.", image_url: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800", featured: 1 },
      { name: "Green Earth Trust", slug: "green-earth-trust", description: "Reforestation projects across three continents.", image_url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800", featured: 0 },
      { name: "Veterans Forward", slug: "veterans-forward", description: "Mental health support for returning service members.", image_url: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800", featured: 0 },
      { name: "Ocean Cleanup Initiative", slug: "ocean-cleanup", description: "Removing plastic from coastal waters worldwide.", image_url: "https://images.unsplash.com/photo-1505144808419-1957a94ca61e?w=800", featured: 0 }
    ];
    const ins = db.prepare(`INSERT INTO charities (id, name, slug, description, image_url, is_featured, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)`);
    for (const c of seed) ins.run(uuid(), c.name, c.slug, c.description, c.image_url, c.featured);
  }

  // Seed admin user (idempotent)
  const adminEmail = "admin@local.test";
  const existing = db.prepare("SELECT id FROM profiles WHERE email = ?").get(adminEmail);
  if (!existing) {
    const id = uuid();
    const hash = bcrypt.hashSync("Admin@12345", 10);
    db.prepare(`INSERT INTO profiles (id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, 'admin')`)
      .run(id, adminEmail, hash, "Platform Admin");
    // give admin a default active subscription so they can play immediately
    db.prepare(`INSERT INTO subscriptions (id, user_id, plan, status, amount_cents, current_period_end) VALUES (?, ?, 'monthly', 'active', 999, datetime('now', '+30 days'))`)
      .run(uuid(), id);
  }
}

export function getDb(): Database.Database {
  if (_db) return _db;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  _db = new Database(DB_PATH);
  init(_db);
  return _db;
}

export { uuid };
