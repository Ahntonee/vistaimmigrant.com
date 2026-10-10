const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dir, { recursive: true });
const file = process.env.DB_FILE || path.join(dir, 'vista.db');

const db = new Database(file);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const migrations = [
  `
  CREATE TABLE users(
    id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff', active INTEGER NOT NULL DEFAULT 1, must_change INTEGER NOT NULL DEFAULT 0,
    totp_secret TEXT, totp_enabled INTEGER NOT NULL DEFAULT 0, failed INTEGER NOT NULL DEFAULT 0, locked_until INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE sessions(sid TEXT PRIMARY KEY, sess TEXT NOT NULL, expires INTEGER NOT NULL);
  CREATE INDEX idx_sessions_exp ON sessions(expires);
  CREATE TABLE settings(key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '');
  CREATE TABLE pages(
    id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, template TEXT NOT NULL DEFAULT 'default',
    eyebrow TEXT DEFAULT '', body TEXT DEFAULT '', excerpt TEXT DEFAULT '',
    meta_title TEXT DEFAULT '', meta_description TEXT DEFAULT '', canonical TEXT DEFAULT '', og_image TEXT DEFAULT '',
    noindex INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'draft', deleted INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE categories(id INTEGER PRIMARY KEY, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL);
  CREATE TABLE tags(id INTEGER PRIMARY KEY, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL);
  CREATE TABLE posts(
    id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, body TEXT DEFAULT '', excerpt TEXT DEFAULT '',
    featured_image TEXT DEFAULT '', featured_alt TEXT DEFAULT '', category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    author TEXT DEFAULT 'Vista Immigrant Support', status TEXT NOT NULL DEFAULT 'draft', publish_at TEXT DEFAULT '',
    meta_title TEXT DEFAULT '', meta_description TEXT DEFAULT '', canonical TEXT DEFAULT '', og_image TEXT DEFAULT '',
    noindex INTEGER NOT NULL DEFAULT 0, deleted INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE post_tags(post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE, tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE, PRIMARY KEY(post_id, tag_id));
  CREATE TABLE services(
    id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'legal',
    summary TEXT DEFAULT '', body TEXT DEFAULT '', who_for TEXT DEFAULT '', what_to_expect TEXT DEFAULT '', what_to_bring TEXT DEFAULT '',
    meta_title TEXT DEFAULT '', meta_description TEXT DEFAULT '', og_image TEXT DEFAULT '', noindex INTEGER NOT NULL DEFAULT 0,
    sort INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE faqs(
    id INTEGER PRIMARY KEY, question TEXT NOT NULL, answer TEXT NOT NULL, service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
    show_home INTEGER NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE testimonials(id INTEGER PRIMARY KEY, name TEXT NOT NULL, detail TEXT DEFAULT '', quote TEXT NOT NULL, approved INTEGER NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE nav_items(id INTEGER PRIMARY KEY, area TEXT NOT NULL DEFAULT 'header', label TEXT NOT NULL, label_es TEXT DEFAULT '', url TEXT NOT NULL, sort INTEGER NOT NULL DEFAULT 0, external INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE media(id INTEGER PRIMARY KEY, filename TEXT NOT NULL, url TEXT NOT NULL, alt TEXT NOT NULL DEFAULT '', width INTEGER, height INTEGER, size INTEGER, created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE appointments(
    id INTEGER PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT DEFAULT '', language TEXT DEFAULT 'English', service TEXT DEFAULT '',
    date TEXT NOT NULL, time TEXT NOT NULL, note TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'requested', admin_note TEXT DEFAULT '',
    consent_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX idx_appt_date ON appointments(date, time);
  CREATE TABLE closed_dates(id INTEGER PRIMARY KEY, date TEXT UNIQUE NOT NULL, reason TEXT DEFAULT '');
  CREATE TABLE messages(
    id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT DEFAULT '', language TEXT DEFAULT 'English', subject TEXT DEFAULT '', message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new', starred INTEGER NOT NULL DEFAULT 0, note TEXT DEFAULT '', consent_at TEXT, deleted INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE redirects(id INTEGER PRIMARY KEY, from_path TEXT UNIQUE NOT NULL, to_path TEXT NOT NULL, code INTEGER NOT NULL DEFAULT 301, hits INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE audit_log(id INTEGER PRIMARY KEY, user_email TEXT, action TEXT NOT NULL, entity TEXT DEFAULT '', detail TEXT DEFAULT '', ip_hash TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE pageviews_daily(day TEXT NOT NULL, path TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(day, path));
  CREATE TABLE password_resets(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE revisions(id INTEGER PRIMARY KEY, kind TEXT NOT NULL, ref_id INTEGER NOT NULL, data TEXT NOT NULL, user_email TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE INDEX idx_rev ON revisions(kind, ref_id);
  CREATE TABLE outbox(id INTEGER PRIMARY KEY, to_addr TEXT, subject TEXT, html TEXT, text TEXT, sent INTEGER NOT NULL DEFAULT 0, error TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE INDEX idx_posts_status ON posts(status, publish_at);
  CREATE INDEX idx_pages_status ON pages(status);
  `,
  `ALTER TABLE users ADD COLUMN recovery TEXT NOT NULL DEFAULT '[]';`,
];

function migrate() {
  let v = db.pragma('user_version', { simple: true });
  while (v < migrations.length) {
    db.exec('BEGIN');
    try {
      db.exec(migrations[v]);
      v += 1;
      db.pragma(`user_version = ${v}`);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
}
migrate();

module.exports = db;
