// End-to-end smoke + security checks against a throwaway database. Run: npm test
const path = require('path');
const os = require('os');
const fs = require('fs');
const { execFileSync } = require('child_process');

const dbFile = path.join(os.tmpdir(), `vista-test-${process.pid}.db`);
for (const s of ['', '-wal', '-shm']) try { fs.unlinkSync(dbFile + s); } catch { /* none */ }
const PW = 'Test-Passw0rd-xyz1';
const env = { ...process.env, DB_FILE: dbFile, ADMIN_EMAIL: 'owner@test.local', ADMIN_PASSWORD: PW, NODE_ENV: 'test', SESSION_SECRET: 'x'.repeat(48) };
Object.assign(process.env, env);
execFileSync(process.execPath, [path.join(__dirname, 'seed.js')], { env, stdio: 'ignore' });

const app = require('../src/app');
const db = require('../src/db');
const sec = require('../src/lib/security');

let pass = 0, fail = 0;
const ok = (c, name, extra = '') => { c ? pass++ : fail++; console.log(`${c ? '  ✓' : '  ✗ FAIL'} ${name}${!c && extra ? ' — ' + extra : ''}`); };

class Client {
  constructor(base) { this.base = base; this.jar = {}; }
  async req(method, url, { form, headers = {}, raw } = {}) {
    const h = { ...headers };
    const ck = Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join('; ');
    if (ck) h.cookie = ck;
    let body;
    if (form) { body = new URLSearchParams(form).toString(); h['content-type'] = 'application/x-www-form-urlencoded'; }
    const r = await fetch(this.base + url, { method, headers: h, body: raw || body, redirect: 'manual' });
    for (const c of r.headers.getSetCookie ? r.headers.getSetCookie() : []) { const [kv] = c.split(';'); const i = kv.indexOf('='); this.jar[kv.slice(0, i)] = kv.slice(i + 1); }
    const text = await r.text();
    return { status: r.status, headers: r.headers, text, loc: r.headers.get('location') };
  }
  get(u, o) { return this.req('GET', u, o); }
  post(u, form, o = {}) { return this.req('POST', u, { form, ...o }); }
  async token(url) { const r = await this.get(url); const m = r.text.match(/name="_csrf" value="([a-f0-9]+)"/) || r.text.match(/data-csrf="([a-f0-9]+)"/); return m && m[1]; }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const c = new Client(base);

  console.log('Public pages');
  const DISC = 'is not a law firm. Non-attorney Vista staff do not provide legal advice.';
  for (const p of ['/', '/about', '/services', '/services/asylum-applications', '/attorney', '/contact', '/appointment', '/blog', '/privacy', '/terms', '/accessibility', '/immigration-help-delray-beach', '/ayuda-de-inmigracion-en-espanol']) {
    const r = await c.get(p);
    ok(r.status === 200, `GET ${p} → 200`, r.status);
    ok(r.text.includes(DISC), `  disclaimer in footer of ${p}`);
    ok(!/suite|206\s?B/i.test(r.text), `  no suite number on ${p}`);
    ok(r.text.includes('100 E Linton Blvd'), `  address on ${p}`);
  }
  const home = (await c.get('/')).text;
  ok(home.includes('561-567-7970') && home.includes('tel:+15615677970'), 'home has Call Now with tel: link');
  ok(/Schedule an Appointment/.test(home) && /Contact Us/.test(home), 'home has schedule + contact buttons');
  ok(/application\/ld\+json/.test(home) && home.includes('ProfessionalService'), 'JSON-LD organization present');
  ok(home.includes('<link rel="canonical"'), 'canonical present');
  ok((await c.get('/sitemap.xml')).text.includes('/services/asylum-applications'), 'sitemap lists services');
  ok((await c.get('/robots.txt')).text.includes('Disallow: /admin'), 'robots disallows /admin');
  ok((await c.get('/does-not-exist')).status === 404, '404 for unknown path');
  ok((await c.get('/SERVICES/')).status === 301, 'uppercase/trailing slash normalized with 301');
  const hdrs = (await c.get('/')).headers;
  ok(/default-src 'self'/.test(hdrs.get('content-security-policy') || '') && !/unsafe-inline.*script|script-src[^;]*unsafe/.test(hdrs.get('content-security-policy') || ''), 'CSP set, no inline scripts allowed');
  ok(!hdrs.get('x-powered-by'), 'x-powered-by removed');
  ok(hdrs.get('x-content-type-options') === 'nosniff', 'nosniff set');
  const plain = new Client(base); await plain.get('/'); await plain.get('/services'); ok(!('vista.sid' in plain.jar), 'no session cookie issued to plain visitors');

  console.log('Admin access control');
  const a = new Client(base);
  let r = await a.get('/admin');
  ok(r.status === 302 && r.loc.startsWith('/admin/login'), '/admin redirects to login when signed out');
  r = await a.post('/admin/login', { email: 'owner@test.local', password: PW });
  ok(r.status === 403, 'login POST without CSRF token rejected', r.status);
  let t = await a.token('/admin/login');
  r = await a.post('/admin/login', { _csrf: t, email: 'owner@test.local', password: 'wrong-password-123' });
  ok(r.status === 401 && /not right/.test(r.text), 'wrong password → generic 401');
  t = await a.token('/admin/login');
  r = await a.post('/admin/login', { _csrf: t, email: 'nobody@test.local', password: 'wrong-password-123' });
  ok(r.status === 401 && /not right/.test(r.text), 'unknown email → same generic 401');
  t = await a.token('/admin/login');
  r = await a.post('/admin/login', { _csrf: t, email: 'owner@test.local', password: PW });
  ok(r.status === 302 && r.loc === '/admin', 'owner login succeeds', `${r.status} ${r.loc}`);
  r = await a.get('/admin');
  ok(r.status === 200 && /Dashboard/.test(r.text), 'dashboard loads');
  ok(/HttpOnly/i.test('HttpOnly') && a.jar['vista.sid'], 'session cookie set after login');
  ok((await a.get('/admin/login')).status === 302, 'signed-in user bounced from login page');
  for (const p of ['/admin/posts', '/admin/pages', '/admin/services', '/admin/faqs', '/admin/testimonials', '/admin/categories', '/admin/tags', '/admin/navigation', '/admin/redirects', '/admin/closed-dates', '/admin/appointments', '/admin/messages', '/admin/media', '/admin/seo', '/admin/users', '/admin/audit', '/admin/outbox', '/admin/backups', '/admin/content/home', '/admin/content/business', '/admin/account/2fa', '/admin/posts/new', '/admin/services/1/edit', '/admin/pages/1/edit']) {
    const x = await a.get(p); ok(x.status === 200, `owner GET ${p}`, x.status);
  }

  console.log('Content CRUD');
  t = await a.token('/admin/posts/new');
  r = await a.post('/admin/posts', { _csrf: t, title: 'Test post <script>alert(1)</script>', slug: '', excerpt: 'x', body: '<p>Hello</p><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">bad</a>', status: 'published', category_id: '', tags: 'alpha, beta', author: '' });
  ok(r.status === 303 || r.status === 302, 'create post', r.status + ' ' + r.text.slice(0, 200));
  const post = db.prepare("SELECT * FROM posts WHERE title LIKE 'Test post%'").get();
  ok(post && !/<script|onerror|javascript:/i.test(post.body), 'post body sanitized (no script/onerror/javascript:)', post && post.body);
  ok(post && !/<script/i.test(post.slug), 'slug is clean', post && post.slug);
  ok(db.prepare('SELECT COUNT(*) n FROM post_tags WHERE post_id=?').get(post.id).n === 2, 'tags saved');
  const pub = await c.get('/blog/' + post.slug);
  ok(pub.status === 200 && /Hello/.test(pub.text) && !/<script>alert/.test(pub.text), 'post live on public blog and escaped');
  t = await a.token(`/admin/posts/${post.id}/edit`);
  r = await a.post(`/admin/posts/${post.id}`, { _csrf: t, title: 'Test post renamed', slug: 'renamed-slug', excerpt: 'x', body: '<p>Hello 2</p>', status: 'published', tags: 'alpha', author: '' });
  ok(r.status === 302 || r.status === 303, 'update post (slug change)');
  ok((await c.get('/blog/' + post.slug)).status === 301, 'old slug 301-redirects automatically');
  ok(db.prepare('SELECT COUNT(*) n FROM revisions WHERE kind=\'posts\' AND ref_id=?').get(post.id).n === 1, 'revision saved on edit');
  t = await a.token(`/admin/posts/${post.id}/edit`);
  r = await a.post(`/admin/posts/${post.id}`, { _csrf: t, title: 'Future post', slug: 'future-post', body: '<p>x</p>', status: 'scheduled', publish_at: '2999-01-01T09:00', tags: '', author: '' });
  ok((await c.get('/blog/future-post')).status === 404, 'scheduled future post is not public');
  db.prepare("UPDATE posts SET publish_at='2000-01-01 00:00:00' WHERE id=?").run(post.id);
  ok((await c.get('/blog/future-post')).status === 200, 'scheduled post goes live once its time passes');
  r = await a.post(`/admin/posts/${post.id}/delete`, { _csrf: await a.token(`/admin/posts/${post.id}/edit`) });
  ok((await c.get('/blog/future-post')).status === 404, 'trashed post disappears from site');

  console.log('Roles');
  db.prepare("INSERT INTO users(email,name,password_hash,role) VALUES('staff@test.local','Staff',?,'staff')").run(sec.hashPassword('Staff-Passw0rd-123'));
  const s = new Client(base);
  t = await s.token('/admin/login');
  r = await s.post('/admin/login', { _csrf: t, email: 'staff@test.local', password: 'Staff-Passw0rd-123' });
  ok(r.status === 302, 'staff login');
  ok((await s.get('/admin/appointments')).status === 200, 'staff can open appointments');
  ok((await s.get('/admin/content/business')).status === 403, 'staff blocked from business settings (403)');
  ok((await s.get('/admin/users')).status === 403, 'staff blocked from users (403)');
  ok((await s.get('/admin/posts')).status === 403, 'staff blocked from posts (403)');
  ok((await s.get('/admin/backups/download/vista-x.db')).status === 403, 'staff blocked from backups');

  console.log('Forms');
  let f = new Client(base);
  t = await f.token('/appointment');
  await sleep(2700);
  const nextDay = (dow) => { const d = new Date(Date.now() + 2 * 864e5); while (d.getUTCDay() !== dow) d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); };
  const base_ = { _csrf: t, name: 'Maria Test', phone: '561-555-0100', email: 'maria@example.com', language: 'English', service: '', time: '10:00', note: 'hi', consent: '1', website: '' };
  r = await f.post('/appointment', { ...base_, date: nextDay(0) });
  ok(r.status === 422 && /closed on Sundays/.test(r.text), 'Sunday appointment rejected');
  r = await f.post('/appointment', { ...base_, date: '2020-01-01' });
  ok(r.status === 422, 'past date rejected');
  r = await f.post('/appointment', { ...base_, date: nextDay(2), time: '08:00' });
  ok(r.status === 422, 'outside business hours rejected');
  r = await f.post('/appointment', { ...base_, date: nextDay(2), consent: '' });
  ok(r.status === 422, 'consent required');
  const tuesday = nextDay(2);
  await sleep(100);
  r = await f.post('/appointment', { ...base_, date: tuesday });
  ok(r.status === 303 && r.loc === '/appointment/received', 'valid appointment accepted', r.status + ' ' + r.text.slice(0, 120));
  ok((await f.get('/appointment/received')).text.includes('Request received'), 'confirmation page shows');
  ok((await f.get('/appointment/calendar.ics')).text.includes('BEGIN:VCALENDAR'), '.ics download works');
  ok(db.prepare("SELECT COUNT(*) n FROM outbox WHERE subject LIKE 'Appointment request%'").get().n === 1, 'office notification recorded');
  let f2 = new Client(base); t = await f2.token('/appointment'); await sleep(2700);
  r = await f2.post('/appointment', { ...base_, _csrf: t, date: tuesday });
  ok(r.status === 422 && /already taken/.test(r.text), 'double-booking the same slot rejected');
  const slots = JSON.parse((await c.get('/appointment/slots?date=' + tuesday)).text);
  ok(slots.slots.find((x) => x.value === '10:00').taken === true, 'slots API marks the booked time as taken');
  db.prepare('INSERT INTO closed_dates(date,reason) VALUES(?,?)').run(nextDay(3), 'test');
  r = await f2.post('/appointment', { ...base_, _csrf: t, date: nextDay(3), time: '11:00' });
  ok(r.status === 422 && /closed/.test(r.text), 'closed date rejected');

  let f3 = new Client(base); t = await f3.token('/contact'); await sleep(2700);
  r = await f3.post('/contact', { _csrf: t, name: 'Bot', email: 'bot@example.com', message: 'buy now', consent: '1', website: 'http://spam' });
  ok(r.status === 303 && db.prepare("SELECT status FROM messages WHERE name='Bot'").get().status === 'spam', 'honeypot message filed as spam');
  let f4 = new Client(base); t = await f4.token('/contact'); await sleep(2700);
  r = await f4.post('/contact', { _csrf: t, name: 'Ana Real', email: 'ana@example.com', message: 'Hello, I need help.', consent: '1', website: '' });
  ok(r.status === 303 && db.prepare("SELECT status FROM messages WHERE name='Ana Real'").get().status === 'new', 'real message saved as new');
  r = await new Client(base).post('/contact', { name: 'x', email: 'a@b.co', message: 'hello there', consent: '1' });
  ok(r.status === 403, 'public form POST without CSRF token rejected');
  let f5 = new Client(base); t = await f5.token('/contact');
  r = await f5.post('/contact', { _csrf: t, name: 'Fast Bot', email: 'f@example.com', message: 'instant submit', consent: '1', website: '' });
  ok(db.prepare("SELECT status FROM messages WHERE name='Fast Bot'").get().status === 'spam', 'instant (too-fast) submission filed as spam');

  console.log('Settings & uploads');
  t = await a.token('/admin/content/business');
  r = await a.post('/admin/content/business', { _csrf: t, 'biz.name': 'Vista Immigrant Support Inc.', 'biz.phone': 'abc', 'biz.email': 'x@y.co', 'biz.disclaimer': 'nothing' });
  ok(r.status === 422, 'settings validation rejects bad phone / stripped disclaimer');
  const hp = (extra) => ({ _csrf: null, 'home.title': 'Everyone Is Welcome.', ...extra });
  t = await a.token('/admin/content/home');
  r = await a.post('/admin/content/home', { ...hp({ _csrf: t }), 'home.hero_image': '/uploads/hero-test.webp', 'home.hero_image_alt': '' });
  ok(r.status === 422 && /alt text/.test(r.text), 'hero image without alt text is rejected');
  t = await a.token('/admin/content/home');
  r = await a.post('/admin/content/home', { ...hp({ _csrf: t }), 'home.hero_image': 'javascript:alert(1)', 'home.hero_image_alt': 'x' });
  ok(r.status === 422, 'hero image with an unsafe URL is rejected');
  t = await a.token('/admin/content/home');
  r = await a.post('/admin/content/home', { ...hp({ _csrf: t }), 'home.hero_image': '/uploads/hero-test.webp', 'home.hero_image_alt': 'Attorney at her desk' });
  ok(r.status === 302, 'hero image saved from the dashboard');
  ok((await c.get('/')).text.includes('/uploads/hero-test.webp'), 'home hero uses the image set in the dashboard');
  ok(!(await c.get('/')).text.includes('attorney-placeholder.svg'), 'placeholder is replaced once an image is set');
  const boundary = '----t' + Date.now();
  const up = (name, type, data, alt) => `--${boundary}\r\nContent-Disposition: form-data; name="alt"\r\n\r\n${alt}\r\n--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="${name}"\r\nContent-Type: ${type}\r\n\r\n${data}\r\n--${boundary}--\r\n`;
  const tok = await a.token('/admin/media');
  r = await a.req('POST', `/admin/media/upload?_csrf=${tok}`, { raw: up('evil.php', 'image/jpeg', '<?php echo 1; ?>', 'x'), headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } });
  ok(r.status === 302 && db.prepare('SELECT COUNT(*) n FROM media').get().n === 0, 'non-image disguised as jpeg rejected (magic-byte check)');
  r = await a.req('POST', '/admin/media/upload', { raw: up('a.jpg', 'image/jpeg', 'x', 'x'), headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } });
  ok(r.status === 403, 'upload without CSRF token rejected');

  console.log('Logout');
  r = await a.post('/admin/logout', { _csrf: await a.token('/admin') });
  ok(r.status === 302, 'logout');
  ok((await a.get('/admin')).status === 302, 'session invalid after logout');

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  for (const sfx of ['', '-wal', '-shm']) try { fs.unlinkSync(dbFile + sfx); } catch { /* ignore */ }
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
