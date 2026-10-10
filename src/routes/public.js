const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const content = require('../content');
const mail = require('../lib/mail');
const { cleanText, esc, stripTags, readingTime, excerptOf, todayEt, fmtDate, audit } = require('../lib/util');
const { hashIp } = require('../lib/security');

const router = express.Router();
const g = content.get;

// ---------- redirects + pageview counter ----------
router.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const r = db.prepare('SELECT * FROM redirects WHERE from_path=?').get(req.path);
  if (r) {
    db.prepare('UPDATE redirects SET hits=hits+1 WHERE id=?').run(r.id);
    return res.redirect(r.code === 302 ? 302 : 301, r.to_path);
  }
  res.on('finish', () => {
    if (res.statusCode !== 200 || /^\/(admin|healthz|sitemap|robots|feed|uploads)/.test(req.path)) return;
    if (!/text\/html/.test(res.getHeader('content-type') || '')) return;
    if (/bot|crawl|spider|slurp|preview|monitor/i.test(req.headers['user-agent'] || '')) return;
    try {
      db.prepare('INSERT INTO pageviews_daily(day,path,count) VALUES(date(\'now\'),?,1) ON CONFLICT(day,path) DO UPDATE SET count=count+1').run(req.path.slice(0, 200));
    } catch { /* never let analytics break a page */ }
  });
  next();
});

// ---------- helpers ----------
const LIVE_POST = `p.deleted=0 AND (p.status='published' OR (p.status='scheduled' AND p.publish_at<>'' AND p.publish_at<=datetime('now')))`;
const postDate = `COALESCE(NULLIF(p.publish_at,''), p.created_at)`;
const postSelect = `SELECT p.*, ${postDate} AS pub_date, c.name AS category_name, c.slug AS category_slug FROM posts p LEFT JOIN categories c ON c.id=p.category_id`;
const siteUrl = () => g('seo.site_url').replace(/\/$/, '');

function services() { return db.prepare('SELECT * FROM services WHERE published=1 ORDER BY sort,id').all(); }

// ---------- pages ----------
router.get('/', (req, res) => {
  const all = services();
  const posts = db.prepare(`${postSelect} WHERE ${LIVE_POST} ORDER BY pub_date DESC LIMIT 3`).all();
  const faqs = db.prepare('SELECT * FROM faqs WHERE published=1 AND show_home=1 ORDER BY sort,id').all();
  const testimonials = db.prepare('SELECT * FROM testimonials WHERE approved=1 ORDER BY sort,id').all();
  res.page('home', {
    services: all.slice(0, 6), totalServices: all.length, posts, faqs, testimonials,
    seo: { title: `${g('biz.name')} | The Immigrant Place`, raw: true,
      jsonld: faqs.length ? [faqLd(faqs)] : [] },
  });
});

router.get('/about', (req, res) => {
  res.page('about', { seo: { title: 'About Us', description: stripTags(g('about.lead')).slice(0, 160), breadcrumbs: [{ name: 'About Us', path: '/about' }] } });
});

router.get('/services', (req, res) => {
  const all = services();
  res.page('services', {
    legal: all.filter((s) => s.category === 'legal'), support: all.filter((s) => s.category !== 'legal'),
    seo: { title: 'Immigration Services in Delray Beach, FL',
      description: 'Asylum, work permits, green cards, court hearings, USCIS interviews, translation and interpreters in Delray Beach. Attorney representation for matters accepted.',
      breadcrumbs: [{ name: 'Immigration Services', path: '/services' }] },
  });
});

router.get('/services/:slug', (req, res, next) => {
  const s = db.prepare('SELECT * FROM services WHERE slug=? AND published=1').get(req.params.slug);
  if (!s) return next();
  const faqs = db.prepare('SELECT * FROM faqs WHERE service_id=? AND published=1 ORDER BY sort,id').all(s.id);
  const others = services().filter((x) => x.id !== s.id && x.category === s.category).slice(0, 4);
  const jsonld = [{
    '@context': 'https://schema.org', '@type': 'Service', name: s.title, serviceType: s.title, description: s.meta_description || s.summary,
    provider: { '@id': siteUrl() + '/#org' }, areaServed: 'Palm Beach County, Florida',
  }];
  if (faqs.length) jsonld.push(faqLd(faqs));
  res.page('service', { s, faqs, others, seo: {
    title: s.meta_title || s.title, description: s.meta_description || s.summary, image: s.og_image || undefined, noindex: !!s.noindex,
    jsonld, breadcrumbs: [{ name: 'Immigration Services', path: '/services' }, { name: s.title, path: '/services/' + s.slug }] } });
});

router.get('/attorney', (req, res) => {
  const name = g('attorney.name');
  const ld = {
    '@context': 'https://schema.org', '@type': 'Person', name, jobTitle: 'Attorney', worksFor: { '@id': siteUrl() + '/#org' },
    ...(g('attorney.education') ? { alumniOf: g('attorney.education') } : {}),
    ...(g('attorney.languages') ? { knowsLanguage: g('attorney.languages').split(',').map((x) => x.trim()) } : {}),
    ...(g('attorney.photo') ? { image: siteUrl() + g('attorney.photo') } : {}),
  };
  res.page('attorney', { seo: { title: `Attorney ${name}`, description: `${name} provides legal representation in immigration matters for clients of Vista Immigrant Support Inc. in Delray Beach, FL.`, jsonld: [ld], breadcrumbs: [{ name: 'Meet Our Attorney', path: '/attorney' }] } });
});

// ---------- forms ----------
const formLimit = rateLimit({
  windowMs: 60 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false, skipFailedRequests: true,
  handler: (req, res) => res.status(429).page('form-error', { message: 'Too many submissions from this connection. Please call us at ' + g('biz.phone') + '.', seo: { title: 'Please call us', noindex: true } }),
});
const markForm = (req, name) => { req.session.formAt = { ...(req.session.formAt || {}), [name]: Date.now() }; };
function spammy(req, name) {
  if (req.body.website) return true; // honeypot
  const t = (req.session.formAt || {})[name];
  if (!t || Date.now() - t < 2500) return true; // too fast / no form render
  const text = `${req.body.message || ''} ${req.body.note || ''}`;
  if ((text.match(/https?:\/\//g) || []).length > 2) return true;
  return false;
}
const LANGS = ['English', 'Español', 'Kreyòl Ayisyen', 'Português', 'Français', 'Other'];
const validEmail = (e) => /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 160 && !/[\r\n]/.test(e);
const validPhone = (p) => /^[0-9+()\-.\s]{7,25}$/.test(p);

router.get('/contact', (req, res) => {
  markForm(req, 'contact');
  res.page('contact', { values: {}, errors: {}, LANGS, seo: { title: 'Contact Us', description: `Call ${g('biz.phone')} or visit ${g('biz.street')}, ${g('biz.city')}, ${g('biz.state')} ${g('biz.zip')}. Open Monday–Saturday, 9–5, by appointment only.`, breadcrumbs: [{ name: 'Contact Us', path: '/contact' }] } });
});

router.post('/contact', formLimit, (req, res) => {
  const b = req.body;
  const v = { name: cleanText(b.name, 100), email: cleanText(b.email, 160), phone: cleanText(b.phone, 25), language: LANGS.includes(b.language) ? b.language : 'English', subject: cleanText(b.subject, 120), message: cleanText(b.message, 3000) };
  const errors = {};
  if (v.name.length < 2) errors.name = 'Please enter your name.';
  if (!validEmail(v.email)) errors.email = 'Please enter a valid email address.';
  if (v.phone && !validPhone(v.phone)) errors.phone = 'Please enter a valid phone number.';
  if (v.message.length < 5) errors.message = 'Please write a short message.';
  if (!b.consent) errors.consent = 'Please confirm so we may contact you.';
  if (Object.keys(errors).length) { markForm(req, 'contact'); req.session.formAt.contact -= 3000; return res.status(422).page('contact', { values: v, errors, LANGS, seo: { title: 'Contact Us', noindex: true } }); }
  const spam = spammy(req, 'contact');
  const info = db.prepare('INSERT INTO messages(name,email,phone,language,subject,message,status,consent_at) VALUES(?,?,?,?,?,?,?,datetime(\'now\'))')
    .run(v.name, v.email, v.phone, v.language, v.subject, v.message, spam ? 'spam' : 'new');
  if (!spam) {
    mail.send({
      to: g('appt.notify_email'), subject: `New website message from ${v.name}`, title: 'New message',
      html: `<p><strong>${esc(v.name)}</strong> · ${esc(v.email)} · ${esc(v.phone || 'no phone')} · ${esc(v.language)}</p><p>${esc(v.subject)}</p><p style="white-space:pre-wrap">${esc(v.message)}</p><p>Open it in the <a href="${siteUrl()}/admin/messages/${info.lastInsertRowid}">admin dashboard</a>.</p>`,
    });
  }
  delete req.session.formAt.contact;
  res.redirect(303, '/thank-you');
});

router.get('/thank-you', (req, res) => res.page('thanks', { seo: { title: 'Thank you', noindex: true } }));

const SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
const slotLabel = (t) => { const [h] = t.split(':').map(Number); return `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`; };
const dow = (d) => new Date(d + 'T12:00:00Z').getUTCDay();
const cap = () => Math.max(1, parseInt(g('appt.slot_capacity'), 10) || 1);
function slotProblem(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return 'Please choose a date.';
  if (date < todayEt()) return 'Please choose a date that has not passed.';
  if (dow(date) === 0) return 'We are closed on Sundays. Please choose Monday through Saturday.';
  if (db.prepare('SELECT 1 FROM closed_dates WHERE date=?').get(date)) return 'The office is closed on that date. Please choose another day.';
  if (!SLOTS.includes(time)) return 'Please choose a time between 9:00 AM and 5:00 PM.';
  const taken = db.prepare("SELECT COUNT(*) n FROM appointments WHERE date=? AND time=? AND status<>'cancelled'").get(date, time).n;
  if (taken >= cap()) return 'That time is already taken. Please choose another.';
  return null;
}

router.get('/appointment/slots', (req, res) => {
  const date = String(req.query.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.json({ closed: true, slots: [] });
  const closed = date < todayEt() || dow(date) === 0 || !!db.prepare('SELECT 1 FROM closed_dates WHERE date=?').get(date);
  const rows = db.prepare("SELECT time, COUNT(*) n FROM appointments WHERE date=? AND status<>'cancelled' GROUP BY time").all(date);
  const taken = new Set(rows.filter((r) => r.n >= cap()).map((r) => r.time));
  res.json({ closed, slots: SLOTS.map((t) => ({ value: t, label: slotLabel(t), taken: taken.has(t) })) });
});

router.get('/appointment', (req, res) => {
  markForm(req, 'appt');
  res.page('appointment', { values: { service: req.query.service || '' }, errors: {}, LANGS, SLOTS, slotLabel, svc: services(), minDate: todayEt(),
    seo: { title: 'Schedule an Appointment', description: 'Request an appointment with Vista Immigrant Support Inc. in Delray Beach. Monday–Saturday, 9:00 AM–5:00 PM, by appointment only.', breadcrumbs: [{ name: 'Schedule an Appointment', path: '/appointment' }] } });
});

router.post('/appointment', formLimit, (req, res) => {
  const b = req.body;
  const v = { name: cleanText(b.name, 100), phone: cleanText(b.phone, 25), email: cleanText(b.email, 160), language: LANGS.includes(b.language) ? b.language : 'English', service: cleanText(b.service, 120), date: cleanText(b.date, 10), time: cleanText(b.time, 5), note: cleanText(b.note, 1000) };
  const errors = {};
  if (v.name.length < 2) errors.name = 'Please enter your name.';
  if (!validPhone(v.phone)) errors.phone = 'Please enter a phone number we can call.';
  if (v.email && !validEmail(v.email)) errors.email = 'That email address does not look right.';
  const sp = slotProblem(v.date, v.time);
  if (sp) errors.date = sp;
  if (!b.consent) errors.consent = 'Please confirm so we may contact you.';
  if (Object.keys(errors).length) { markForm(req, 'appt'); req.session.formAt.appt -= 3000; return res.status(422).page('appointment', { values: v, errors, LANGS, SLOTS, slotLabel, svc: services(), minDate: todayEt(), seo: { title: 'Schedule an Appointment', noindex: true } }); }
  if (spammy(req, 'appt')) { return res.redirect(303, '/thank-you'); }
  // capacity re-check + insert in one transaction (avoids double-booking races)
  let id;
  try {
    id = db.transaction(() => {
      const p = slotProblem(v.date, v.time);
      if (p) throw Object.assign(new Error(p), { slot: true });
      return db.prepare("INSERT INTO appointments(name,phone,email,language,service,date,time,note,consent_at) VALUES(?,?,?,?,?,?,?,?,datetime('now'))")
        .run(v.name, v.phone, v.email, v.language, v.service, v.date, v.time, v.note).lastInsertRowid;
    }).immediate();
  } catch (e) {
    if (!e.slot) throw e;
    markForm(req, 'appt'); req.session.formAt.appt -= 3000;
    return res.status(409).page('appointment', { values: v, errors: { date: e.message }, LANGS, SLOTS, slotLabel, svc: services(), minDate: todayEt(), seo: { title: 'Schedule an Appointment', noindex: true } });
  }
  req.session.lastAppt = id;
  const when = `${fmtDate(v.date)} at ${slotLabel(v.time)}`;
  mail.send({ to: g('appt.notify_email'), subject: `Appointment request: ${v.name}, ${when}`, title: 'New appointment request',
    html: `<p><strong>${esc(v.name)}</strong> · ${esc(v.phone)} · ${esc(v.email || 'no email')} · ${esc(v.language)}</p><p>${esc(when)} — ${esc(v.service || 'service not specified')}</p><p>${esc(v.note)}</p><p><a href="${siteUrl()}/admin/appointments">Open appointments</a></p>` });
  if (v.email) mail.send({ to: v.email, subject: 'We received your appointment request', title: 'Thank you, we received your request',
    html: `<p>Hello ${esc(v.name)},</p><p>We received your request for <strong>${esc(when)}</strong>. A member of our team will confirm by phone or email. If you need to change anything, call us at ${esc(g('biz.phone'))}.</p><p>Please do not reply with sensitive details such as your A-Number or case information. We will discuss those in private.</p>` });
  res.redirect(303, '/appointment/received');
});

router.get('/appointment/received', (req, res) => {
  const a = req.session.lastAppt && db.prepare('SELECT * FROM appointments WHERE id=?').get(req.session.lastAppt);
  if (!a) return res.redirect('/appointment');
  res.page('appointment-done', { a, slotLabel, seo: { title: 'Appointment requested', noindex: true } });
});

router.get('/appointment/calendar.ics', (req, res) => {
  const a = req.session.lastAppt && db.prepare('SELECT * FROM appointments WHERE id=?').get(req.session.lastAppt);
  if (!a) return res.status(404).end();
  const d = a.date.replace(/-/g, ''), [h] = a.time.split(':');
  const pad = (n) => String(n).padStart(2, '0');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Vista Immigrant Support//EN', 'BEGIN:VEVENT', `UID:appt-${a.id}@vista`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART;TZID=America/New_York:${d}T${pad(h)}0000`, `DTEND;TZID=America/New_York:${d}T${pad(+h + 1)}0000`,
    'SUMMARY:Appointment at Vista Immigrant Support Inc.', `LOCATION:${g('biz.street')}\\, ${g('biz.city')}\\, ${g('biz.state')} ${g('biz.zip')}`,
    `DESCRIPTION:Requested time. Call ${g('biz.phone')} to change. Status: ${a.status}.`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  res.type('text/calendar').set('Content-Disposition', 'attachment; filename="appointment.ics"').send(ics);
});

// ---------- blog ----------
const PER = 9;
function postList(req, res, where, params, ctx) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const total = db.prepare(`SELECT COUNT(*) n FROM posts p WHERE ${LIVE_POST} ${where}`).get(...params).n;
  const posts = db.prepare(`${postSelect} WHERE ${LIVE_POST} ${where} ORDER BY pub_date DESC LIMIT ${PER} OFFSET ${(page - 1) * PER}`).all(...params);
  const cats = db.prepare(`SELECT c.*, (SELECT COUNT(*) FROM posts p WHERE p.category_id=c.id AND ${LIVE_POST}) n FROM categories c ORDER BY name`).all().filter((c) => c.n);
  res.page('blog', { posts, page, pages: Math.ceil(total / PER), cats, ...ctx });
}
router.get('/blog', (req, res) => postList(req, res, '', [], { heading: 'Blog', base: '/blog', seo: { title: 'Blog', description: 'Plain-language immigration information, community news, and updates from Vista Immigrant Support Inc.', breadcrumbs: [{ name: 'Blog', path: '/blog' }], canonicalPath: '/blog' + (req.query.page > 1 ? `?page=${parseInt(req.query.page, 10)}` : '') } }));
router.get('/blog/category/:slug', (req, res, next) => {
  const c = db.prepare('SELECT * FROM categories WHERE slug=?').get(req.params.slug);
  if (!c) return next();
  postList(req, res, 'AND p.category_id=?', [c.id], { heading: c.name, base: '/blog/category/' + c.slug, seo: { title: `${c.name} articles`, description: `Plain-language ${c.name.toLowerCase()} articles from Vista Immigrant Support Inc. General information, not legal advice.`, breadcrumbs: [{ name: 'Blog', path: '/blog' }, { name: c.name, path: '/blog/category/' + c.slug }] } });
});
router.get('/blog/tag/:slug', (req, res, next) => {
  const t = db.prepare('SELECT * FROM tags WHERE slug=?').get(req.params.slug);
  if (!t) return next();
  postList(req, res, 'AND p.id IN (SELECT post_id FROM post_tags WHERE tag_id=?)', [t.id], { heading: `Tagged “${t.name}”`, base: '/blog/tag/' + t.slug, seo: { title: `Articles tagged ${t.name}`, noindex: true } });
});
router.get('/blog/:slug', (req, res, next) => {
  const p = db.prepare(`${postSelect} WHERE ${LIVE_POST} AND p.slug=?`).get(req.params.slug);
  if (!p) return next();
  const tags = db.prepare('SELECT t.* FROM tags t JOIN post_tags pt ON pt.tag_id=t.id WHERE pt.post_id=?').all(p.id);
  const related = db.prepare(`${postSelect} WHERE ${LIVE_POST} AND p.id<>? ORDER BY (p.category_id IS ?) DESC, pub_date DESC LIMIT 3`).all(p.id, p.category_id);
  const url = `${siteUrl()}/blog/${p.slug}`;
  const img = p.og_image || p.featured_image;
  res.page('post', { p, tags, related, rt: readingTime(p.body), seo: {
    title: p.meta_title || p.title, description: p.meta_description || p.excerpt || excerptOf(p.body), image: img || undefined, noindex: !!p.noindex, canonical: p.canonical || undefined,
    breadcrumbs: [{ name: 'Blog', path: '/blog' }, { name: p.title, path: '/blog/' + p.slug }],
    jsonld: [{ '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, datePublished: new Date(p.pub_date.replace(' ', 'T') + 'Z').toISOString(), dateModified: new Date(p.updated_at.replace(' ', 'T') + 'Z').toISOString(),
      author: { '@type': 'Organization', name: p.author || g('biz.name') }, publisher: { '@id': siteUrl() + '/#org' }, mainEntityOfPage: url, ...(img ? { image: /^http/.test(img) ? img : siteUrl() + img } : {}) }],
  } });
});

// ---------- machine-readable ----------
function faqLd(faqs) {
  return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: stripTags(f.answer) } })) };
}
router.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nDisallow: /admin\nDisallow: /appointment/received\nDisallow: /thank-you\nAllow: /\n${g('seo.robots_extra')}\nSitemap: ${siteUrl()}/sitemap.xml\n`);
});
router.get('/sitemap.xml', (req, res) => {
  const u = siteUrl();
  const urls = [['/', 1.0], ['/about', 0.7], ['/services', 0.9], ['/attorney', 0.7], ['/contact', 0.8], ['/appointment', 0.8], ['/blog', 0.6]].map(([p, pr]) => ({ loc: u + p, pr }));
  for (const s of db.prepare('SELECT slug, updated_at FROM services WHERE published=1 AND noindex=0').all()) urls.push({ loc: `${u}/services/${s.slug}`, pr: 0.8, last: s.updated_at });
  for (const p of db.prepare(`SELECT p.slug, p.updated_at FROM posts p WHERE ${LIVE_POST} AND p.noindex=0`).all()) urls.push({ loc: `${u}/blog/${p.slug}`, pr: 0.6, last: p.updated_at });
  for (const c of db.prepare(`SELECT c.slug FROM categories c WHERE EXISTS (SELECT 1 FROM posts p WHERE p.category_id=c.id AND ${LIVE_POST})`).all()) urls.push({ loc: `${u}/blog/category/${c.slug}`, pr: 0.4 });
  for (const p of db.prepare("SELECT slug, updated_at FROM pages WHERE status='published' AND deleted=0 AND noindex=0").all()) urls.push({ loc: `${u}/${p.slug}`, pr: 0.6, last: p.updated_at });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((x) => `<url><loc>${esc(x.loc)}</loc>${x.last ? `<lastmod>${x.last.slice(0, 10)}</lastmod>` : ''}<priority>${x.pr}</priority></url>`).join('\n')}\n</urlset>`;
  res.type('application/xml').send(xml);
});
router.get('/feed.xml', (req, res) => {
  const u = siteUrl();
  const posts = db.prepare(`${postSelect} WHERE ${LIVE_POST} ORDER BY pub_date DESC LIMIT 20`).all();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${esc(g('biz.name'))} Blog</title><link>${u}/blog</link><description>${esc(g('seo.default_description'))}</description>\n${posts.map((p) => `<item><title>${esc(p.title)}</title><link>${u}/blog/${p.slug}</link><guid>${u}/blog/${p.slug}</guid><pubDate>${new Date(p.pub_date.replace(' ', 'T') + 'Z').toUTCString()}</pubDate><description>${esc(p.excerpt || excerptOf(p.body))}</description></item>`).join('\n')}\n</channel></rss>`;
  res.type('application/rss+xml').send(xml);
});
router.get('/healthz', (req, res) => { db.prepare('SELECT 1').get(); res.json({ ok: true }); });

// ---------- CMS pages (legal pages + SEO landing pages) — must stay last ----------
router.get('/*', (req, res, next) => {
  const slugPath = req.path.replace(/^\//, '');
  const p = db.prepare("SELECT * FROM pages WHERE slug=? AND status='published' AND deleted=0").get(slugPath);
  if (!p) return next();
  const svc = p.template === 'landing' || p.template === 'service-area' ? services().slice(0, 6) : [];
  res.page('cms-page', { p, svc, seo: { title: p.meta_title || p.title, description: p.meta_description || p.excerpt || excerptOf(p.body), image: p.og_image || undefined, noindex: !!p.noindex, canonical: p.canonical || undefined, breadcrumbs: [{ name: p.title, path: '/' + p.slug }] } });
});

module.exports = router;
module.exports.SLOTS = SLOTS;
