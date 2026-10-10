// Config-driven CRUD used by posts, pages, services, FAQs, testimonials, categories, tags, navigation, redirects, closed dates.
const express = require('express');
const db = require('../db');
const { cleanHtml, cleanText, uniqueSlug, slug: slugify, audit, nowSql } = require('../lib/util');

const ET = 'America/New_York';
function etToUtc(local) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local || '')) return '';
  const guess = new Date(local + ':00Z');
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: ET, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(guess).map((p) => [p.type, p.value]));
  const asEt = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return new Date(guess.getTime() - (asEt - guess.getTime())).toISOString().slice(0, 19).replace('T', ' ');
}
function utcToEtInput(sql) {
  if (!sql) return '';
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: ET, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(sql.replace(' ', 'T') + 'Z')).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

const SEO_FIELDS = [
  { n: 'meta_title', l: 'Meta title', t: 'text', max: 120, seo: true, help: 'Shown in search results. Aim for 50–60 characters.' },
  { n: 'meta_description', l: 'Meta description', t: 'textarea', max: 320, seo: true, help: 'Aim for 120–160 characters.' },
  { n: 'og_image', l: 'Share image', t: 'image', seo: true, help: 'Shown when the page is shared. 1200×630 works best.' },
  { n: 'canonical', l: 'Canonical URL (optional)', t: 'text', max: 300, seo: true },
  { n: 'noindex', l: 'Hide from search engines (noindex)', t: 'check', seo: true },
];
const withoutCanonical = SEO_FIELDS.filter((f) => f.n !== 'canonical');

const STATUS = [['draft', 'Draft'], ['published', 'Published']];
const STATUS_SCHED = [['draft', 'Draft'], ['scheduled', 'Scheduled'], ['published', 'Published']];

const R = {
  posts: {
    table: 'posts', label: 'Blog posts', one: 'post', roles: ['owner', 'editor'], soft: true, revisions: true, seo: true, bulk: true,
    url: (s) => '/blog/' + s, redirectBase: '/blog/', previewBase: '/blog/',
    order: 'updated_at DESC', search: ['title', 'excerpt'], filters: [{ n: 'status', opts: STATUS_SCHED }],
    cols: [['title', 'Title', 'link'], ['status', 'Status', 'badge'], ['updated_at', 'Updated', 'date']],
    fields: [
      { n: 'title', l: 'Title', t: 'text', req: true, max: 200 },
      { n: 'slug', l: 'URL slug', t: 'slug', help: 'Leave blank to generate from the title.' },
      { n: 'excerpt', l: 'Excerpt', t: 'textarea', max: 400, help: 'Shown in lists. Leave blank to use the first sentences.' },
      { n: 'body', l: 'Body', t: 'rich' },
      { n: 'status', l: 'Status', t: 'select', opts: STATUS_SCHED, side: true },
      { n: 'publish_at', l: 'Publish date/time (Eastern)', t: 'datetime', side: true, help: 'For scheduled posts, goes live automatically at this time.' },
      { n: 'category_id', l: 'Category', t: 'ref', ref: 'categories', side: true },
      { n: 'tags', l: 'Tags (comma separated)', t: 'tags', side: true, virtual: true },
      { n: 'author', l: 'Author label', t: 'text', max: 80, side: true },
      { n: 'featured_image', l: 'Featured image', t: 'image', side: true },
      { n: 'featured_alt', l: 'Featured image alt text', t: 'text', max: 200, side: true, help: 'Required when a featured image is set.' },
      ...SEO_FIELDS,
    ],
    validate: (v, errs) => { if (v.featured_image && !v.featured_alt) errs.featured_alt = 'Add alt text for the featured image.'; if (v.status === 'scheduled' && !v.publish_at) errs.publish_at = 'Choose when this should be published.'; },
    before: (v, row, req) => { if (!v.author) v.author = 'Vista Immigrant Support'; if (v.status === 'published' && !v.publish_at) v.publish_at = nowSql(); },
    after: (id, raw) => {
      const names = String(raw.tags || '').split(',').map((s) => cleanText(s, 40)).filter(Boolean).slice(0, 12);
      db.prepare('DELETE FROM post_tags WHERE post_id=?').run(id);
      for (const n of names) {
        const s = slugify(n); if (!s) continue;
        let t = db.prepare('SELECT id FROM tags WHERE slug=?').get(s);
        if (!t) t = { id: db.prepare('INSERT INTO tags(name,slug) VALUES(?,?)').run(n, s).lastInsertRowid };
        db.prepare('INSERT OR IGNORE INTO post_tags(post_id,tag_id) VALUES(?,?)').run(id, t.id);
      }
    },
    load: (row) => { row.tags = db.prepare('SELECT t.name FROM tags t JOIN post_tags pt ON pt.tag_id=t.id WHERE pt.post_id=?').all(row.id).map((t) => t.name).join(', '); },
  },
  pages: {
    table: 'pages', label: 'Pages', one: 'page', roles: ['owner', 'editor'], soft: true, revisions: true, seo: true, bulk: true,
    url: (s) => '/' + s, redirectBase: '/', previewBase: '/',
    order: 'updated_at DESC', search: ['title', 'slug'], filters: [{ n: 'status', opts: STATUS }, { n: 'template', opts: [['default', 'Default'], ['landing', 'Landing'], ['service-area', 'Service area']] }],
    cols: [['title', 'Title', 'link'], ['slug', 'URL', 'slug'], ['template', 'Template'], ['status', 'Status', 'badge'], ['updated_at', 'Updated', 'date']],
    fields: [
      { n: 'title', l: 'Title', t: 'text', req: true, max: 200 },
      { n: 'slug', l: 'URL path', t: 'slug', nested: true, help: 'e.g. immigration-help-delray-beach (nested paths with / are allowed). Avoid reserved paths: admin, blog, services.' },
      { n: 'eyebrow', l: 'Small label above the title', t: 'text', max: 80 },
      { n: 'excerpt', l: 'Intro paragraph', t: 'textarea', max: 400 },
      { n: 'body', l: 'Content', t: 'rich' },
      { n: 'status', l: 'Status', t: 'select', opts: STATUS, side: true },
      { n: 'template', l: 'Template', t: 'select', opts: [['default', 'Default (text page)'], ['landing', 'Landing (with contact sidebar)'], ['service-area', 'Service area (with sidebar + flags)']], side: true },
      ...SEO_FIELDS,
    ],
    validate: (v, errs) => { if (/^(admin|blog|services|api|uploads|css|js|img|fonts|flags)(\/|$)/.test(v.slug || '')) errs.slug = 'That path is reserved.'; },
  },
  services: {
    table: 'services', label: 'Services', one: 'service', roles: ['owner', 'editor'], seo: true, sortable: true, revisions: true,
    url: (s) => '/services/' + s, redirectBase: '/services/', previewBase: '/services/',
    order: 'sort ASC, id ASC', search: ['title', 'summary'], filters: [{ n: 'category', opts: [['legal', 'Legal representation'], ['support', 'Support service']] }],
    cols: [['title', 'Service', 'link'], ['category', 'Type'], ['published', 'Live', 'bool']],
    fields: [
      { n: 'title', l: 'Title', t: 'text', req: true, max: 120 },
      { n: 'slug', l: 'URL slug', t: 'slug' },
      { n: 'summary', l: 'Short summary (list view + meta)', t: 'textarea', max: 260, req: true },
      { n: 'body', l: 'Description', t: 'rich' },
      { n: 'who_for', l: 'Who this is for', t: 'rich' },
      { n: 'what_to_expect', l: 'What to expect', t: 'rich' },
      { n: 'what_to_bring', l: 'What to bring', t: 'rich' },
      { n: 'category', l: 'Type', t: 'select', opts: [['legal', 'Legal representation (attorney, matters accepted)'], ['support', 'Support service (Vista)']], side: true },
      { n: 'published', l: 'Published', t: 'check', side: true, def: 1 },
      ...withoutCanonical,
    ],
  },
  faqs: {
    table: 'faqs', label: 'FAQs', one: 'FAQ', roles: ['owner', 'editor'], sortable: true,
    order: 'sort ASC, id ASC', search: ['question', 'answer'], filters: [],
    cols: [['question', 'Question', 'link'], ['show_home', 'On home', 'bool'], ['published', 'Live', 'bool']],
    fields: [
      { n: 'question', l: 'Question', t: 'text', req: true, max: 250 },
      { n: 'answer', l: 'Answer', t: 'rich', req: true },
      { n: 'service_id', l: 'Attach to service (optional)', t: 'ref', ref: 'services', side: true },
      { n: 'show_home', l: 'Show on home page', t: 'check', side: true },
      { n: 'published', l: 'Published', t: 'check', side: true, def: 1 },
    ],
  },
  testimonials: {
    table: 'testimonials', label: 'Testimonials', one: 'testimonial', roles: ['owner', 'editor'], sortable: true,
    order: 'sort ASC, id ASC', search: ['name', 'quote'], filters: [],
    cols: [['name', 'Name', 'link'], ['approved', 'Approved', 'bool']],
    fields: [
      { n: 'name', l: 'Name (first name or initials is fine)', t: 'text', req: true, max: 80 },
      { n: 'detail', l: 'Detail (e.g. “Delray Beach”)', t: 'text', max: 100 },
      { n: 'quote', l: 'Quote', t: 'textarea', req: true, max: 800, help: 'Only add feedback you have permission to publish.' },
      { n: 'approved', l: 'Approved to show on the site', t: 'check', side: true },
    ],
  },
  categories: {
    table: 'categories', label: 'Blog categories', one: 'category', roles: ['owner', 'editor'], order: 'name ASC', search: ['name'], filters: [],
    cols: [['name', 'Name', 'link'], ['slug', 'Slug', 'slug']],
    fields: [{ n: 'name', l: 'Name', t: 'text', req: true, max: 60 }, { n: 'slug', l: 'URL slug', t: 'slug' }],
  },
  tags: {
    table: 'tags', label: 'Blog tags', one: 'tag', roles: ['owner', 'editor'], order: 'name ASC', search: ['name'], filters: [],
    cols: [['name', 'Name', 'link'], ['slug', 'Slug', 'slug']],
    fields: [{ n: 'name', l: 'Name', t: 'text', req: true, max: 60 }, { n: 'slug', l: 'URL slug', t: 'slug' }],
  },
  navigation: {
    table: 'nav_items', label: 'Navigation', one: 'menu item', roles: ['owner', 'editor'], sortable: true, sortGroup: 'area',
    order: "area ASC, sort ASC, id ASC", search: ['label', 'url'], filters: [{ n: 'area', opts: [['header', 'Header'], ['footer', 'Footer']] }],
    cols: [['label', 'Label', 'link'], ['url', 'Link'], ['area', 'Area']],
    fields: [
      { n: 'label', l: 'Label', t: 'text', req: true, max: 60 },
      { n: 'label_es', l: 'Label (Spanish)', t: 'text', max: 60 },
      { n: 'url', l: 'Link', t: 'text', req: true, max: 300, help: 'Internal (/about) or full https:// link.' },
      { n: 'area', l: 'Area', t: 'select', opts: [['header', 'Header menu'], ['footer', 'Footer links']], side: true },
      { n: 'external', l: 'Opens a different website', t: 'check', side: true },
    ],
    validate: (v, errs) => { if (!/^(\/|https?:\/\/|mailto:|tel:)/.test(v.url || '')) errs.url = 'Start with / or https://'; },
  },
  redirects: {
    table: 'redirects', label: 'Redirects', one: 'redirect', roles: ['owner', 'editor'], order: 'id DESC', search: ['from_path', 'to_path'], filters: [],
    cols: [['from_path', 'From', 'link'], ['to_path', 'To'], ['code', 'Type'], ['hits', 'Hits']],
    fields: [
      { n: 'from_path', l: 'From path', t: 'text', req: true, max: 300, help: 'e.g. /old-page' },
      { n: 'to_path', l: 'To', t: 'text', req: true, max: 300, help: 'e.g. /services or https://…' },
      { n: 'code', l: 'Type', t: 'select', opts: [['301', '301 Permanent'], ['302', '302 Temporary']], side: true },
    ],
    validate: (v, errs) => { if (!v.from_path.startsWith('/')) errs.from_path = 'Must start with /'; if (v.from_path === v.to_path) errs.to_path = 'Cannot redirect to itself.'; if (/^\/admin/.test(v.from_path)) errs.from_path = 'Cannot redirect admin paths.'; if (!/^(\/|https?:\/\/)/.test(v.to_path)) errs.to_path = 'Start with / or https://'; },
  },
  'closed-dates': {
    table: 'closed_dates', label: 'Closed dates', one: 'closed date', roles: ['owner', 'staff'], order: 'date DESC', search: ['reason'], filters: [],
    cols: [['date', 'Date', 'link'], ['reason', 'Reason']],
    fields: [{ n: 'date', l: 'Date', t: 'date', req: true }, { n: 'reason', l: 'Reason (internal)', t: 'text', max: 120 }],
  },
};

// ---------- value parsing ----------
function parse(cfg, body, id) {
  const v = {}, errs = {};
  for (const f of cfg.fields) {
    let x = body[f.n];
    if (f.t === 'slug') continue;
    if (f.t === 'check') { v[f.n] = x ? 1 : 0; continue; }
    if (f.t === 'rich') x = cleanHtml(x);
    else if (f.t === 'textarea') x = cleanText(x, f.max || 2000);
    else if (f.t === 'num') x = parseInt(x, 10) || 0;
    else if (f.t === 'datetime') x = etToUtc(x);
    else if (f.t === 'date') x = /^\d{4}-\d{2}-\d{2}$/.test(x || '') ? x : '';
    else if (f.t === 'select') { const ok = f.opts.map((o) => String(Array.isArray(o) ? o[0] : o)); x = ok.includes(String(x)) ? String(x) : ok[0]; if (f.n === 'code') x = parseInt(x, 10); }
    else if (f.t === 'ref') x = parseInt(x, 10) || null;
    else if (f.t === 'image') { x = cleanText(x, 400); if (x && !/^(\/uploads\/|\/img\/|https:\/\/)/.test(x)) x = ''; }
    else x = cleanText(x, f.max || 300);
    if (f.req && (x === '' || x === null)) errs[f.n] = `${f.l} is required.`;
    v[f.n] = f.t === 'tags' ? undefined : x;
    if (f.t === 'tags') delete v[f.n];
  }
  const sf = cfg.fields.find((f) => f.t === 'slug');
  if (sf) {
    let base = body.slug || v.title || v.name || '';
    const s = sf.nested ? String(base).split('/').map(slugify).filter(Boolean).join('/') : slugify(base);
    if (!s) errs.slug = 'A URL slug is required.';
    else if (db.prepare(`SELECT id FROM ${cfg.table} WHERE slug=? AND id<>?`).get(s, id || 0)) errs.slug = 'That URL is already used.';
    v.slug = s;
  }
  if (cfg.validate) cfg.validate(v, errs);
  return { v, errs };
}

function refOptions(ref) {
  if (ref === 'categories') return [['', '— none —'], ...db.prepare('SELECT id,name FROM categories ORDER BY name').all().map((r) => [String(r.id), r.name])];
  if (ref === 'services') return [['', '— none —'], ...db.prepare('SELECT id,title FROM services ORDER BY sort,id').all().map((r) => [String(r.id), r.title])];
  return [];
}

function snapshot(cfg, row) {
  const o = {};
  for (const f of cfg.fields) if (!f.virtual && f.n in row) o[f.n] = row[f.n];
  return JSON.stringify(o);
}
function saveRevision(cfg, kind, row, req) {
  db.prepare('INSERT INTO revisions(kind,ref_id,data,user_email) VALUES(?,?,?,?)').run(kind, row.id, snapshot(cfg, row), req.user.email);
  db.prepare('DELETE FROM revisions WHERE kind=? AND ref_id=? AND id NOT IN (SELECT id FROM revisions WHERE kind=? AND ref_id=? ORDER BY id DESC LIMIT 20)').run(kind, row.id, kind, row.id);
}

function build(admin, guard) {
  const router = express.Router();
  const page = (req, res, view, data) => admin.render(req, res, view, data);

  for (const [key, cfg] of Object.entries(R)) {
    const base = `/${key}`;
    const g = guard(...cfg.roles);
    const ctx = (extra = {}) => ({ key, cfg, section: key, utcToEtInput, refOptions, ...extra });

    router.get(base, g, (req, res) => {
      const q = cleanText(req.query.q, 80), trash = cfg.soft && req.query.trash === '1';
      const per = 25, p = Math.max(1, parseInt(req.query.page, 10) || 1);
      const where = [], params = [];
      if (cfg.soft) where.push(`deleted=${trash ? 1 : 0}`);
      if (q) { where.push('(' + cfg.search.map((c) => `${c} LIKE ?`).join(' OR ') + ')'); cfg.search.forEach(() => params.push(`%${q}%`)); }
      for (const f of cfg.filters) { const val = req.query[f.n]; if (val && f.opts.some((o) => String(o[0]) === val)) { where.push(`${f.n}=?`); params.push(val); } }
      const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
      const sortable = cfg.cols.map((c) => c[0]);
      let order = cfg.order;
      if (req.query.sort && sortable.includes(req.query.sort)) order = `${req.query.sort} ${req.query.dir === 'asc' ? 'ASC' : 'DESC'}`;
      const total = db.prepare(`SELECT COUNT(*) n FROM ${cfg.table} ${w}`).get(...params).n;
      const rows = db.prepare(`SELECT * FROM ${cfg.table} ${w} ORDER BY ${order} LIMIT ${per} OFFSET ${(p - 1) * per}`).all(...params);
      page(req, res, 'list', ctx({ title: cfg.label, rows, q, trash, total, p, pages: Math.ceil(total / per), query: req.query }));
    });

    router.get(`${base}/new`, g, (req, res) => {
      const row = {}; for (const f of cfg.fields) row[f.n] = f.def !== undefined ? f.def : (f.opts ? (Array.isArray(f.opts[0]) ? f.opts[0][0] : f.opts[0]) : '');
      page(req, res, 'form', ctx({ title: `New ${cfg.one}`, row, isNew: true, errors: {} }));
    });

    router.post(base, g, (req, res) => {
      const { v, errs } = parse(cfg, req.body, 0);
      if (Object.keys(errs).length) return res.status(422), page(req, res, 'form', ctx({ title: `New ${cfg.one}`, row: { ...req.body, ...v }, isNew: true, errors: errs }));
      if (cfg.before) cfg.before(v, null, req);
      const cols = Object.keys(v);
      const info = db.prepare(`INSERT INTO ${cfg.table}(${cols.join(',')}) VALUES(${cols.map(() => '?').join(',')})`).run(...cols.map((c) => v[c]));
      if (cfg.sortable) db.prepare(`UPDATE ${cfg.table} SET sort=? WHERE id=?`).run(info.lastInsertRowid, info.lastInsertRowid);
      if (cfg.after) cfg.after(info.lastInsertRowid, req.body);
      audit(req, 'create', cfg.table, `#${info.lastInsertRowid} ${v.title || v.name || v.label || v.question || v.from_path || v.date || ''}`);
      req.session.flash = `Created ${cfg.one}.`;
      res.redirect(`/admin${base}/${info.lastInsertRowid}/edit`);
    });

    router.get(`${base}/:id(\\d+)/edit`, g, (req, res, next) => {
      const row = db.prepare(`SELECT * FROM ${cfg.table} WHERE id=?`).get(req.params.id);
      if (!row) return next();
      if (cfg.load) cfg.load(row);
      const revs = cfg.revisions ? db.prepare('SELECT id,user_email,created_at FROM revisions WHERE kind=? AND ref_id=? ORDER BY id DESC LIMIT 20').all(cfg.table, row.id) : [];
      page(req, res, 'form', ctx({ title: `Edit ${cfg.one}`, row, isNew: false, errors: {}, revs }));
    });

    router.post(`${base}/:id(\\d+)`, g, (req, res, next) => {
      const old = db.prepare(`SELECT * FROM ${cfg.table} WHERE id=?`).get(req.params.id);
      if (!old) return next();
      const { v, errs } = parse(cfg, req.body, old.id);
      if (Object.keys(errs).length) { res.status(422); return page(req, res, 'form', ctx({ title: `Edit ${cfg.one}`, row: { ...old, ...req.body, ...v, id: old.id }, isNew: false, errors: errs, revs: [] })); }
      if (cfg.before) cfg.before(v, old, req);
      if (cfg.revisions) saveRevision(cfg, cfg.table, old, req);
      const cols = Object.keys(v);
      const extra = ['updated_at'].filter((c) => 'updated_at' in old);
      db.prepare(`UPDATE ${cfg.table} SET ${[...cols.map((c) => `${c}=?`), ...extra.map((c) => `${c}=datetime('now')`)].join(',')} WHERE id=?`).run(...cols.map((c) => v[c]), old.id);
      // slug change on a live URL -> automatic redirect so links/SEO never break
      if (cfg.url && old.slug && v.slug && old.slug !== v.slug && (old.status === 'published' || old.published === 1)) {
        db.prepare('INSERT INTO redirects(from_path,to_path,code) VALUES(?,?,301) ON CONFLICT(from_path) DO UPDATE SET to_path=excluded.to_path').run(cfg.url(old.slug), cfg.url(v.slug));
        req.session.flash2 = `Redirect created from ${cfg.url(old.slug)}.`;
      }
      if (cfg.after) cfg.after(old.id, req.body);
      audit(req, 'update', cfg.table, `#${old.id} ${v.title || v.name || v.label || v.question || ''}`);
      req.session.flash = `Saved ${cfg.one}.`;
      res.redirect(`/admin${base}/${old.id}/edit`);
    });

    router.post(`${base}/:id(\\d+)/delete`, g, (req, res) => {
      const row = db.prepare(`SELECT * FROM ${cfg.table} WHERE id=?`).get(req.params.id);
      if (!row) return res.redirect(`/admin${base}`);
      if (cfg.soft && !row.deleted) db.prepare(`UPDATE ${cfg.table} SET deleted=1, status='draft' WHERE id=?`).run(row.id);
      else db.prepare(`DELETE FROM ${cfg.table} WHERE id=?`).run(row.id);
      audit(req, row.deleted || !cfg.soft ? 'delete' : 'trash', cfg.table, `#${row.id} ${row.title || row.name || row.label || row.question || ''}`);
      req.session.flash = cfg.soft && !row.deleted ? `Moved to trash.` : `Deleted.`;
      res.redirect(`/admin${base}${cfg.soft && !row.deleted ? '' : cfg.soft ? '?trash=1' : ''}`);
    });

    if (cfg.soft) router.post(`${base}/:id(\\d+)/restore`, g, (req, res) => {
      db.prepare(`UPDATE ${cfg.table} SET deleted=0 WHERE id=?`).run(req.params.id);
      audit(req, 'restore', cfg.table, `#${req.params.id}`);
      req.session.flash = 'Restored as draft.';
      res.redirect(`/admin${base}/${req.params.id}/edit`);
    });

    if (cfg.sortable) router.post(`${base}/:id(\\d+)/move`, g, (req, res) => {
      const row = db.prepare(`SELECT * FROM ${cfg.table} WHERE id=?`).get(req.params.id);
      if (row) {
        const grp = cfg.sortGroup ? `WHERE ${cfg.sortGroup}=?` : '';
        const ids = db.prepare(`SELECT id FROM ${cfg.table} ${grp} ORDER BY sort,id`).all(...(cfg.sortGroup ? [row[cfg.sortGroup]] : [])).map((r) => r.id);
        const i = ids.indexOf(row.id), j = req.body.dir === 'up' ? i - 1 : i + 1;
        if (j >= 0 && j < ids.length) { [ids[i], ids[j]] = [ids[j], ids[i]]; db.transaction(() => ids.forEach((id, n) => db.prepare(`UPDATE ${cfg.table} SET sort=? WHERE id=?`).run(n + 1, id)))(); }
      }
      res.redirect(`/admin${base}`);
    });

    if (cfg.bulk) router.post(`${base}/bulk`, g, (req, res) => {
      const ids = [].concat(req.body.ids || []).map((x) => parseInt(x, 10)).filter(Boolean);
      const action = req.body.action;
      if (ids.length) {
        const ph = ids.map(() => '?').join(',');
        if (action === 'publish') db.prepare(`UPDATE ${cfg.table} SET status='published' WHERE id IN (${ph})`).run(...ids);
        else if (action === 'unpublish') db.prepare(`UPDATE ${cfg.table} SET status='draft' WHERE id IN (${ph})`).run(...ids);
        else if (action === 'trash') db.prepare(`UPDATE ${cfg.table} SET deleted=1, status='draft' WHERE id IN (${ph})`).run(...ids);
        audit(req, 'bulk-' + action, cfg.table, ids.join(','));
        req.session.flash = `Updated ${ids.length} item(s).`;
      }
      res.redirect(`/admin${base}`);
    });

    if (cfg.revisions) {
      router.post(`${base}/:id(\\d+)/restore-revision/:rev(\\d+)`, g, (req, res, next) => {
        const rev = db.prepare('SELECT * FROM revisions WHERE id=? AND kind=? AND ref_id=?').get(req.params.rev, cfg.table, req.params.id);
        const cur = db.prepare(`SELECT * FROM ${cfg.table} WHERE id=?`).get(req.params.id);
        if (!rev || !cur) return next();
        saveRevision(cfg, cfg.table, cur, req);
        const data = JSON.parse(rev.data);
        const allowed = new Set(cfg.fields.filter((f) => !f.virtual).map((f) => f.n));
        const cols = Object.keys(data).filter((c) => allowed.has(c) && c !== 'slug');
        if (cols.length) db.prepare(`UPDATE ${cfg.table} SET ${cols.map((c) => `${c}=?`).join(',')}, updated_at=datetime('now') WHERE id=?`).run(...cols.map((c) => data[c]), cur.id);
        audit(req, 'restore-revision', cfg.table, `#${cur.id} from rev ${rev.id}`);
        req.session.flash = `Restored revision from ${rev.created_at} UTC.`;
        res.redirect(`/admin${base}/${cur.id}/edit`);
      });
    }
  }
  return router;
}

module.exports = { build, R };
