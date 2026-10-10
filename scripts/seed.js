require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../src/db');
const content = require('../src/content');
const sec = require('../src/lib/security');
const D = require('./seed-data');
const { stripTags, excerptOf } = require('../src/lib/util');

content.seedDefaults();

db.transaction(() => {
  // services (insert-if-missing so re-running never overwrites edits)
  const svc = db.prepare('INSERT OR IGNORE INTO services(slug,title,category,summary,body,who_for,what_to_expect,what_to_bring,meta_title,meta_description,sort,published) VALUES(?,?,?,?,?,?,?,?,?,?,?,1)');
  const faq = db.prepare('INSERT INTO faqs(question,answer,service_id,show_home,sort) VALUES(?,?,?,0,?)');
  D.services.forEach((s, i) => {
    const r = svc.run(s.slug, s.title, s.category, s.summary, s.body, s.who_for, s.what_to_expect, s.what_to_bring, s.title.length <= 22 ? `${s.title} in Delray Beach, FL` : s.title, `${s.summary} Delray Beach, FL — Vista Immigrant Support Inc.`, i + 1);
    if (r.changes) (s.faqs || []).forEach((f, j) => faq.run(f[0], f[1], r.lastInsertRowid, j + 1));
  });

  if (!db.prepare('SELECT 1 FROM faqs WHERE show_home=1').get()) {
    D.homeFaqs.forEach((f, i) => db.prepare('INSERT INTO faqs(question,answer,show_home,sort) VALUES(?,?,1,?)').run(f[0], f[1], i + 1));
  }

  for (const [name, slug] of D.categories) db.prepare('INSERT OR IGNORE INTO categories(name,slug) VALUES(?,?)').run(name, slug);

  D.posts.forEach((p, i) => {
    if (db.prepare('SELECT 1 FROM posts WHERE slug=?').get(p.slug)) return;
    const cat = db.prepare('SELECT id FROM categories WHERE slug=?').get(p.cat);
    const when = new Date(Date.now() - (i * 6 + 2) * 864e5).toISOString().slice(0, 19).replace('T', ' ');
    const id = db.prepare("INSERT INTO posts(slug,title,body,excerpt,category_id,status,publish_at,meta_title,meta_description,created_at,updated_at) VALUES(?,?,?,?,?,'published',?,?,?,?,?)")
      .run(p.slug, p.title, p.body, p.excerpt, cat ? cat.id : null, when, p.meta_title || '', p.excerpt.length < 70 ? p.excerpt + ' From Vista Immigrant Support Inc.' : p.excerpt, when, when).lastInsertRowid;
    for (const t of p.tags) {
      const slug = t.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      db.prepare('INSERT OR IGNORE INTO tags(name,slug) VALUES(?,?)').run(t, slug);
      db.prepare('INSERT OR IGNORE INTO post_tags(post_id,tag_id) VALUES(?,(SELECT id FROM tags WHERE slug=?))').run(id, slug);
    }
  });

  for (const pg of D.pages) {
    db.prepare("INSERT OR IGNORE INTO pages(slug,title,template,eyebrow,body,excerpt,meta_title,meta_description,status) VALUES(?,?,?,?,?,?,?,?,'published')")
      .run(pg.slug, pg.title, pg.template, pg.eyebrow || '', pg.body, pg.excerpt || '', pg.meta_title || '', pg.meta_description || '');
  }

  if (!db.prepare('SELECT 1 FROM nav_items').get()) {
    for (const area of ['header', 'footer']) D.nav[area].forEach((n, i) => db.prepare('INSERT INTO nav_items(area,label,label_es,url,sort) VALUES(?,?,?,?,?)').run(area, n[0], n[1], n[2], i + 1));
  }
})();

// ---- owner account ----
const email = (process.env.ADMIN_EMAIL || 'Vistaimmigrantsupport@gmail.com').toLowerCase();
const prod = process.env.NODE_ENV === 'production';
if (!db.prepare("SELECT 1 FROM users WHERE role='owner'").get()) {
  let pw = process.env.ADMIN_PASSWORD;
  let generated = false;
  if (!pw) {
    if (prod) { console.error('Set ADMIN_PASSWORD in the environment before seeding in production.'); process.exit(1); }
    pw = crypto.randomBytes(12).toString('base64url') + 'aA1!';
    generated = true;
  }
  const problem = sec.passwordProblem(pw);
  if (problem) { console.error('ADMIN_PASSWORD rejected: ' + problem); process.exit(1); }
  db.prepare("INSERT INTO users(email,name,password_hash,role,must_change) VALUES(?,?,?, 'owner', ?)").run(email, 'Site Owner', sec.hashPassword(pw), generated ? 1 : 0);
  if (generated) {
    const envFile = path.join(__dirname, '..', '.env');
    const line = `\nADMIN_EMAIL=${email}\nADMIN_PASSWORD=${pw}\n`;
    fs.appendFileSync(envFile, line);
    console.log(`Created owner account ${email}. Temporary password saved in .env (ADMIN_PASSWORD). You will be asked to change it at first sign-in.`);
  } else console.log(`Created owner account ${email} (password from ADMIN_PASSWORD).`);
} else console.log('Owner account already exists — left unchanged.');

console.log(`Seed complete: ${db.prepare('SELECT COUNT(*) n FROM services').get().n} services, ${db.prepare('SELECT COUNT(*) n FROM posts').get().n} posts, ${db.prepare('SELECT COUNT(*) n FROM pages').get().n} pages.`);
