const express = require('express');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const sharp = require('sharp');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const db = require('../db');
const content = require('../content');
const mail = require('../lib/mail');
const sec = require('../lib/security');
const { cleanText, cleanHtml, audit, esc, stripTags, todayEt, fmtDate } = require('../lib/util');
const crud = require('./admin-crud');

const router = express.Router();
const g = content.get;
const prod = process.env.NODE_ENV === 'production';
const IDLE = 30 * 60 * 1000, ABSOLUTE = 12 * 60 * 60 * 1000;

router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); res.set('X-Robots-Tag', 'noindex, nofollow'); next(); });

// ---------- rendering ----------
const NAV = [
  ['Overview', [['Dashboard', '/admin', 'dash', ['owner', 'editor', 'staff']]]],
  ['Content', [
    ['Blog posts', '/admin/posts', 'posts', ['owner', 'editor']], ['Pages', '/admin/pages', 'pages', ['owner', 'editor']],
    ['Services', '/admin/services', 'services', ['owner', 'editor']], ['FAQs', '/admin/faqs', 'faqs', ['owner', 'editor']],
    ['Testimonials', '/admin/testimonials', 'testimonials', ['owner', 'editor']],
    ['Site content', '/admin/content/home', 'content', ['owner', 'editor']],
    ['Categories', '/admin/categories', 'categories', ['owner', 'editor']], ['Tags', '/admin/tags', 'tags', ['owner', 'editor']],
    ['Navigation', '/admin/navigation', 'navigation', ['owner', 'editor']], ['Media', '/admin/media', 'media', ['owner', 'editor']],
  ]],
  ['Inbox', [['Appointments', '/admin/appointments', 'appointments', ['owner', 'staff', 'editor']], ['Messages', '/admin/messages', 'messages', ['owner', 'staff', 'editor']], ['Closed dates', '/admin/closed-dates', 'closed-dates', ['owner', 'staff']]]],
  ['Search', [['SEO center', '/admin/seo', 'seo', ['owner', 'editor']], ['Redirects', '/admin/redirects', 'redirects', ['owner', 'editor']]]],
  ['System', [['Business settings', '/admin/content/business', 'settings', ['owner']], ['Users', '/admin/users', 'users', ['owner']], ['Audit log', '/admin/audit', 'audit', ['owner']], ['Email outbox', '/admin/outbox', 'outbox', ['owner']], ['Backups', '/admin/backups', 'backups', ['owner']]]],
];
function render(req, res, view, data = {}) {
  const flash = req.session && req.session.flash, flash2 = req.session && req.session.flash2;
  if (req.session) { delete req.session.flash; delete req.session.flash2; }
  const nav = NAV.map(([h, items]) => [h, items.filter((i) => req.user && (req.user.role === 'owner' || i[3].includes(req.user.role)))]).filter((x) => x[1].length);
  const counts = { appts: db.prepare("SELECT COUNT(*) n FROM appointments WHERE status='requested'").get().n, msgs: db.prepare("SELECT COUNT(*) n FROM messages WHERE status='new' AND deleted=0").get().n };
  res.render('admin/' + view, { ...data, section: data.section || '' }, (err, body) => {
    if (err) return req.next(err);
    res.render('admin/layout', { body, title: data.title || 'Admin', section: data.section || '', nav, flash, flash2, counts, fmtDate }, (e2, html) => { if (e2) return req.next(e2); res.send(html); });
  });
}
const adminCtx = { render };

const guard = (...roles) => (req, res, next) => {
  if (!req.user) return res.redirect('/admin/login?next=' + encodeURIComponent(req.originalUrl));
  if (req.user.role !== 'owner' && !roles.includes(req.user.role)) {
    res.status(403);
    return render(req, res, 'error', { code: 403, message: 'Your role does not have access to this page.', title: 'Not allowed' });
  }
  next();
};

// ---------- auth (public part of admin) ----------
const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => { res.status(429).type('html').send('<p style="font-family:sans-serif;padding:2rem">Too many attempts. Please wait 15 minutes and try again.</p>'); },
});
const authPage = (res, view, data = {}) => res.render('admin/' + view, data);
const safeNext = (n) => (typeof n === 'string' && /^\/admin(\/[\w\-\/?=&.%]*)?$/.test(n) && !n.includes('//') ? n : '/admin');

router.get('/login', (req, res) => {
  if (req.user) return res.redirect('/admin');
  authPage(res, 'login', { error: null, next: safeNext(req.query.next), email: '', info: req.query.reset ? 'Password updated. Please sign in.' : '' });
});

function finishLogin(req, res, user, next) {
  req.session.regenerate((err) => {
    if (err) throw err;
    req.session.uid = user.id;
    req.session.loginAt = Date.now();
    db.prepare('UPDATE users SET failed=0, locked_until=0 WHERE id=?').run(user.id);
    req.user = user;
    audit(req, 'login', 'users', user.email);
    res.redirect(user.must_change ? '/admin/account/password' : safeNext(next));
  });
}

router.post('/login', loginLimit, (req, res) => {
  const email = cleanText(req.body.email, 160).toLowerCase(), pw = String(req.body.password || '').slice(0, 200);
  const u = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  const locked = u && u.locked_until > Date.now();
  const pwOk = sec.verifyPassword(pw, u ? u.password_hash : sec.DUMMY);
  if (!u || !u.active || locked || !pwOk) {
    if (u && !locked) {
      const failed = u.failed + 1;
      db.prepare('UPDATE users SET failed=?, locked_until=? WHERE id=?').run(failed >= 5 ? 0 : failed, failed >= 5 ? Date.now() + 15 * 60 * 1000 : 0, u.id);
    }
    audit(req, 'login-failed', 'users', email.slice(0, 80));
    res.status(401);
    return authPage(res, 'login', { error: 'That email or password is not right, or the account is temporarily locked.', next: safeNext(req.body.next), email, info: '' });
  }
  if (u.totp_enabled) {
    return req.session.regenerate(() => {
      req.session.pending = { uid: u.id, at: Date.now(), next: safeNext(req.body.next) };
      res.redirect('/admin/login/2fa');
    });
  }
  finishLogin(req, res, u, req.body.next);
});

router.get('/login/2fa', (req, res) => {
  if (!req.session.pending) return res.redirect('/admin/login');
  authPage(res, 'login-2fa', { error: null });
});
router.post('/login/2fa', loginLimit, (req, res) => {
  const p = req.session.pending;
  if (!p || Date.now() - p.at > 5 * 60 * 1000) return res.redirect('/admin/login');
  const u = db.prepare('SELECT * FROM users WHERE id=? AND active=1').get(p.uid);
  const code = String(req.body.code || '').replace(/\s/g, '');
  let ok = u && sec.totpVerify(u.totp_secret, code);
  if (u && !ok && code.length > 6) { // recovery code
    const list = JSON.parse(u.recovery || '[]'), h = sec.sha256(code.toLowerCase());
    if (list.includes(h)) { ok = true; db.prepare('UPDATE users SET recovery=? WHERE id=?').run(JSON.stringify(list.filter((x) => x !== h)), u.id); }
  }
  if (!ok) { audit(req, 'login-2fa-failed', 'users', u ? u.email : ''); res.status(401); return authPage(res, 'login-2fa', { error: 'That code is not valid. Try the newest code from your app.' }); }
  finishLogin(req, res, u, p.next);
});

router.post('/logout', (req, res) => {
  audit(req, 'logout', 'users', req.user ? req.user.email : '');
  req.session.destroy(() => { res.clearCookie('vista.sid'); res.redirect('/admin/login'); });
});

router.get('/forgot', (req, res) => authPage(res, 'forgot', { done: false }));
router.post('/forgot', loginLimit, (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE email=? AND active=1').get(cleanText(req.body.email, 160).toLowerCase());
  if (u) {
    const token = sec.randomToken();
    db.prepare('INSERT INTO password_resets(token_hash,user_id,expires) VALUES(?,?,?)').run(sec.sha256(token), u.id, Date.now() + 3600e3);
    const link = `${g('seo.site_url').replace(/\/$/, '')}/admin/reset/${token}`;
    if (!prod && !mail.smtpConfigured()) console.log('Password reset link (dev only):', link);
    mail.send({ to: u.email, subject: 'Reset your Vista admin password', title: 'Reset your password', html: `<p>Use this link within one hour to choose a new password:</p><p><a href="${link}">${esc(link)}</a></p><p>If you did not ask for this, you can ignore this email.</p>` });
    audit(req, 'password-reset-requested', 'users', u.email);
  }
  authPage(res, 'forgot', { done: true });
});
const resetRow = (t) => db.prepare('SELECT * FROM password_resets WHERE token_hash=? AND used=0 AND expires>?').get(sec.sha256(String(t)), Date.now());
router.get('/reset/:token', (req, res) => authPage(res, 'reset', { valid: !!resetRow(req.params.token), error: null, token: req.params.token }));
router.post('/reset/:token', loginLimit, (req, res) => {
  const r = resetRow(req.params.token);
  if (!r) return authPage(res, 'reset', { valid: false, error: null, token: '' });
  const pw = String(req.body.password || ''), problem = sec.passwordProblem(pw);
  if (problem || pw !== req.body.confirm) return res.status(422), authPage(res, 'reset', { valid: true, error: problem || 'The two passwords do not match.', token: req.params.token });
  db.transaction(() => {
    db.prepare('UPDATE users SET password_hash=?, must_change=0, failed=0, locked_until=0 WHERE id=?').run(sec.hashPassword(pw), r.user_id);
    db.prepare('UPDATE password_resets SET used=1 WHERE token_hash=?').run(r.token_hash);
  })();
  audit({ ip: req.ip, user: null }, 'password-reset', 'users', String(r.user_id));
  res.redirect('/admin/login?reset=1');
});

// ---------- everything below needs a signed-in user ----------
router.use((req, res, next) => {
  if (!req.user) return res.redirect('/admin/login?next=' + encodeURIComponent(req.originalUrl));
  if (Date.now() - (req.session.loginAt || 0) > ABSOLUTE) return req.session.destroy(() => res.redirect('/admin/login'));
  if (req.user.must_change && !req.path.startsWith('/account/password')) return res.redirect('/admin/account/password');
  if (process.env.REQUIRE_OWNER_2FA === 'true' && req.user.role === 'owner' && !req.user.totp_enabled && !req.path.startsWith('/account')) return res.redirect('/admin/account/2fa');
  next();
});

// ---------- dashboard ----------
function lastNDays(n) { const out = []; for (let i = n - 1; i >= 0; i--) out.push(new Date(Date.now() - i * 864e5).toLocaleDateString('en-CA', { timeZone: 'America/New_York' })); return out; }
router.get('/', guard('owner', 'editor', 'staff'), (req, res) => {
  const one = (sql, ...p) => db.prepare(sql).get(...p).n;
  const days = lastNDays(30);
  const pv = Object.fromEntries(db.prepare("SELECT day, SUM(count) n FROM pageviews_daily WHERE day>=? GROUP BY day").all(days[0]).map((r) => [r.day, r.n]));
  const sub = Object.fromEntries(db.prepare("SELECT d, SUM(n) n FROM (SELECT date(created_at) d, COUNT(*) n FROM messages WHERE created_at>=? AND status<>'spam' GROUP BY d UNION ALL SELECT date(created_at) d, COUNT(*) n FROM appointments WHERE created_at>=? GROUP BY d) GROUP BY d").all(days[0], days[0]).map((r) => [r.d, r.n]));
  const bk = path.join(__dirname, '..', '..', 'data', 'backups');
  const backups = fs.existsSync(bk) ? fs.readdirSync(bk).filter((f) => f.endsWith('.db')).sort() : [];
  let dbSize = 0; try { dbSize = fs.statSync(path.join(__dirname, '..', '..', 'data', 'vista.db')).size; } catch { /* custom DB_FILE */ }
  render(req, res, 'dashboard', {
    title: 'Dashboard', section: 'dash', days, pv: days.map((d) => pv[d] || 0), sub: days.map((d) => sub[d] || 0),
    stats: {
      newAppts: one("SELECT COUNT(*) n FROM appointments WHERE status='requested'"), newMsgs: one("SELECT COUNT(*) n FROM messages WHERE status='new' AND deleted=0"),
      published: one("SELECT COUNT(*) n FROM posts WHERE status='published' AND deleted=0"), drafts: one("SELECT COUNT(*) n FROM posts WHERE status IN ('draft','scheduled') AND deleted=0"),
    },
    upcoming: db.prepare("SELECT * FROM appointments WHERE date>=? AND status IN ('requested','confirmed') ORDER BY date,time LIMIT 8").all(todayEt()),
    latestMsgs: db.prepare("SELECT * FROM messages WHERE deleted=0 AND status IN ('new','read') ORDER BY id DESC LIMIT 5").all(),
    activity: db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 8').all(),
    health: { dbSize, lastBackup: backups.length ? backups[backups.length - 1].replace(/^vista-|\.db$/g, '') : null, smtp: mail.smtpConfigured(), needs2fa: req.user.role === 'owner' && !req.user.totp_enabled },
  });
});

// ---------- generic CRUD modules ----------
router.use(crud.build(adminCtx, guard));

// ---------- appointments ----------
const A_STATUS = ['requested', 'confirmed', 'completed', 'cancelled', 'no-show'];
const SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
const slotLabel = (t) => { const h = +t.split(':')[0]; return `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`; };
const apptGuard = guard('owner', 'staff', 'editor');

router.get('/appointments', apptGuard, (req, res) => {
  const q = cleanText(req.query.q, 60), st = A_STATUS.includes(req.query.status) ? req.query.status : '', when = ['upcoming', 'past', 'all'].includes(req.query.when) ? req.query.when : 'upcoming';
  const where = [], params = [];
  if (q) { where.push('(name LIKE ? OR phone LIKE ? OR email LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (st) { where.push('status=?'); params.push(st); }
  if (when === 'upcoming') { where.push('date>=?'); params.push(todayEt()); } else if (when === 'past') { where.push('date<?'); params.push(todayEt()); }
  const rows = db.prepare(`SELECT * FROM appointments ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY date ${when === 'past' ? 'DESC' : 'ASC'}, time LIMIT 300`).all(...params);
  render(req, res, 'appointments', { title: 'Appointments', section: 'appointments', rows, q, st, when, A_STATUS, slotLabel });
});
router.get('/appointments/export.csv', apptGuard, (req, res) => {
  const rows = db.prepare('SELECT id,name,phone,email,language,service,date,time,status,note,admin_note,created_at FROM appointments ORDER BY date DESC, time').all();
  audit(req, 'export', 'appointments', `${rows.length} rows`);
  sendCsv(res, 'appointments.csv', rows);
});
router.get('/appointments/:id(\\d+)', apptGuard, (req, res, next) => {
  const a = db.prepare('SELECT * FROM appointments WHERE id=?').get(req.params.id);
  if (!a) return next();
  render(req, res, 'appointment', { title: 'Appointment', section: 'appointments', a, A_STATUS, SLOTS, slotLabel, errors: {} });
});
router.post('/appointments/:id(\\d+)', apptGuard, (req, res, next) => {
  const a = db.prepare('SELECT * FROM appointments WHERE id=?').get(req.params.id);
  if (!a) return next();
  const status = A_STATUS.includes(req.body.status) ? req.body.status : a.status;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(req.body.date || '') ? req.body.date : a.date;
  const time = SLOTS.includes(req.body.time) ? req.body.time : a.time;
  const note = cleanText(req.body.admin_note, 1500);
  db.prepare('UPDATE appointments SET status=?, date=?, time=?, admin_note=? WHERE id=?').run(status, date, time, note, a.id);
  audit(req, 'update', 'appointments', `#${a.id} ${a.status}→${status}`);
  if (req.body.email_client && a.email) {
    const when = `${fmtDate(date)} at ${slotLabel(time)}`;
    const verb = { confirmed: 'is confirmed', cancelled: 'has been cancelled', requested: 'has been updated' }[status] || 'has been updated';
    mail.send({ to: a.email, subject: `Your appointment ${verb}`, title: `Your appointment ${verb}`, html: `<p>Hello ${esc(a.name)},</p><p>Your appointment at Vista Immigrant Support Inc. on <strong>${esc(when)}</strong> ${verb}.</p><p>Address: ${esc(g('biz.street'))}, ${esc(g('biz.city'))}, ${esc(g('biz.state'))} ${esc(g('biz.zip'))}. Questions? Call ${esc(g('biz.phone'))}.</p>` });
    audit(req, 'email', 'appointments', `#${a.id} ${status}`);
  }
  req.session.flash = 'Appointment updated.';
  res.redirect('/admin/appointments/' + a.id);
});
router.post('/appointments/:id(\\d+)/delete', guard('owner', 'staff'), (req, res) => {
  db.prepare('DELETE FROM appointments WHERE id=?').run(req.params.id);
  audit(req, 'delete', 'appointments', '#' + req.params.id);
  req.session.flash = 'Appointment and its personal data were deleted.';
  res.redirect('/admin/appointments');
});

// ---------- messages ----------
function sendCsv(res, name, rows) {
  const cols = rows.length ? Object.keys(rows[0]) : [];
  const cell = (v) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
  res.type('text/csv').set('Content-Disposition', `attachment; filename="${name}"`).send([cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\r\n'));
}
const mGuard = guard('owner', 'staff', 'editor');
router.get('/messages', mGuard, (req, res) => {
  const tab = ['inbox', 'starred', 'archived', 'spam'].includes(req.query.tab) ? req.query.tab : 'inbox', q = cleanText(req.query.q, 60);
  const cond = { inbox: "status IN ('new','read')", starred: 'starred=1', archived: "status='archived'", spam: "status='spam'" }[tab];
  const params = []; let extra = '';
  if (q) { extra = ' AND (name LIKE ? OR email LIKE ? OR subject LIKE ? OR message LIKE ?)'; params.push(...Array(4).fill(`%${q}%`)); }
  const rows = db.prepare(`SELECT * FROM messages WHERE deleted=0 AND ${cond}${extra} ORDER BY id DESC LIMIT 200`).all(...params);
  render(req, res, 'messages', { title: 'Messages', section: 'messages', rows, tab, q });
});
router.get('/messages/export.csv', guard('owner', 'staff'), (req, res) => {
  const rows = db.prepare("SELECT id,name,email,phone,language,subject,message,status,created_at FROM messages WHERE deleted=0 ORDER BY id DESC").all();
  audit(req, 'export', 'messages', `${rows.length} rows`);
  sendCsv(res, 'messages.csv', rows);
});
router.get('/messages/:id(\\d+)', mGuard, (req, res, next) => {
  const m = db.prepare('SELECT * FROM messages WHERE id=? AND deleted=0').get(req.params.id);
  if (!m) return next();
  if (m.status === 'new') db.prepare("UPDATE messages SET status='read' WHERE id=?").run(m.id);
  render(req, res, 'message', { title: 'Message', section: 'messages', m });
});
router.post('/messages/:id(\\d+)', mGuard, (req, res) => {
  const id = req.params.id, a = req.body.action;
  if (a === 'star') db.prepare('UPDATE messages SET starred=1-starred WHERE id=?').run(id);
  else if (a === 'archive') db.prepare("UPDATE messages SET status='archived' WHERE id=?").run(id);
  else if (a === 'unarchive') db.prepare("UPDATE messages SET status='read' WHERE id=?").run(id);
  else if (a === 'spam') db.prepare("UPDATE messages SET status='spam' WHERE id=?").run(id);
  else if (a === 'notspam') db.prepare("UPDATE messages SET status='read' WHERE id=?").run(id);
  else if (a === 'unread') db.prepare("UPDATE messages SET status='new' WHERE id=?").run(id);
  else if (a === 'note') db.prepare('UPDATE messages SET note=? WHERE id=?').run(cleanText(req.body.note, 1500), id);
  else if (a === 'delete') { db.prepare('UPDATE messages SET deleted=1, message=\'\', phone=\'\', email=\'\' WHERE id=?').run(id); audit(req, 'delete', 'messages', '#' + id); req.session.flash = 'Message deleted.'; return res.redirect('/admin/messages'); }
  audit(req, 'message-' + a, 'messages', '#' + id);
  res.redirect(a === 'archive' || a === 'spam' || a === 'unread' ? '/admin/messages' : '/admin/messages/' + id);
});

// ---------- media ----------
const UP = path.join(__dirname, '..', '..', 'public', 'uploads');
fs.mkdirSync(UP, { recursive: true });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 10 } });
const mediaGuard = guard('owner', 'editor');
router.get('/media', mediaGuard, (req, res) => {
  const q = cleanText(req.query.q, 60);
  const rows = q ? db.prepare('SELECT * FROM media WHERE filename LIKE ? OR alt LIKE ? ORDER BY id DESC').all(`%${q}%`, `%${q}%`) : db.prepare('SELECT * FROM media ORDER BY id DESC LIMIT 300').all();
  render(req, res, 'media', { title: 'Media library', section: 'media', rows, q });
});
router.get('/media.json', mediaGuard, (req, res) => res.json(db.prepare("SELECT id,url,alt,filename FROM media ORDER BY id DESC LIMIT 300").all()));
router.post('/media/upload', mediaGuard, upload.array('files', 10), async (req, res) => {
  const alt = cleanText(req.body.alt, 200);
  const done = [], bad = [];
  for (const f of req.files || []) {
    try {
      const name = crypto.randomBytes(10).toString('hex');
      if (f.buffer.slice(0, 5).toString() === '%PDF-') {
        if (!/\.pdf$/i.test(f.originalname)) throw new Error('not a pdf');
        fs.writeFileSync(path.join(UP, name + '.pdf'), f.buffer);
        db.prepare('INSERT INTO media(filename,url,alt,size) VALUES(?,?,?,?)').run(cleanText(f.originalname, 120), `/uploads/${name}.pdf`, alt, f.size);
        done.push(f.originalname); continue;
      }
      const meta = await sharp(f.buffer, { limitInputPixels: 60e6 }).metadata();
      if (!['jpeg', 'png', 'webp', 'gif'].includes(meta.format)) throw new Error('unsupported type');
      if (!alt) throw new Error('alt text required for images');
      const img = sharp(f.buffer, { limitInputPixels: 60e6 }).rotate().resize({ width: 2000, withoutEnlargement: true });
      const out = await img.webp({ quality: 84 }).toBuffer({ resolveWithObject: true });
      fs.writeFileSync(path.join(UP, name + '.webp'), out.data);
      db.prepare('INSERT INTO media(filename,url,alt,width,height,size) VALUES(?,?,?,?,?,?)').run(cleanText(f.originalname, 120), `/uploads/${name}.webp`, alt, out.info.width, out.info.height, out.data.length);
      done.push(f.originalname);
    } catch (e) { bad.push(`${f.originalname}: ${e.message}`); }
  }
  if (done.length) audit(req, 'upload', 'media', done.join(', ').slice(0, 200));
  req.session.flash = done.length ? `Uploaded ${done.length} file(s).` : undefined;
  req.session.flash2 = bad.length ? `Not uploaded — ${bad.join('; ')}` : undefined;
  res.redirect('/admin/media');
});
router.post('/media/:id(\\d+)', mediaGuard, (req, res) => {
  const alt = cleanText(req.body.alt, 200);
  if (alt) db.prepare('UPDATE media SET alt=? WHERE id=?').run(alt, req.params.id);
  res.redirect('/admin/media');
});
function mediaUsage(url) {
  const like = `%${url}%`, hits = [];
  for (const [t, cols] of [['posts', ['body', 'featured_image', 'og_image']], ['pages', ['body', 'og_image']], ['services', ['body', 'who_for', 'what_to_expect', 'what_to_bring', 'og_image']], ['faqs', ['answer']], ['settings', ['value']]]) {
    const n = db.prepare(`SELECT COUNT(*) n FROM ${t} WHERE ${cols.map((c) => `${c} LIKE ?`).join(' OR ')}`).get(...cols.map(() => like)).n;
    if (n) hits.push(`${t} (${n})`);
  }
  return hits;
}
router.post('/media/:id(\\d+)/delete', mediaGuard, (req, res) => {
  const m = db.prepare('SELECT * FROM media WHERE id=?').get(req.params.id);
  if (!m) return res.redirect('/admin/media');
  const used = mediaUsage(m.url);
  if (used.length) { req.session.flash2 = `Cannot delete — still used in: ${used.join(', ')}.`; return res.redirect('/admin/media'); }
  try { fs.unlinkSync(path.join(UP, path.basename(m.url))); } catch { /* already gone */ }
  db.prepare('DELETE FROM media WHERE id=?').run(m.id);
  audit(req, 'delete', 'media', m.url);
  req.session.flash = 'Deleted.';
  res.redirect('/admin/media');
});

// ---------- site content & business settings ----------
const GROUPS = { home: 'Home', about: 'About', attorney: 'Attorney', contact: 'Contact', seo: 'SEO', business: 'Business', appointments: 'Appointments', system: 'System' };
const OWNER_ONLY = ['business', 'appointments', 'system'];
const IMAGE_KEYS = ['home.hero_image', 'attorney.photo', 'seo.default_og'];
const contentGuard = (req, res, next) => {
  const grp = req.params.group;
  if (!GROUPS[grp]) return next('route');
  return guard(...(OWNER_ONLY.includes(grp) ? ['owner'] : ['owner', 'editor']))(req, res, next);
};
router.get('/content/:group', contentGuard, (req, res) => {
  const label = GROUPS[req.params.group];
  const fields = content.FIELDS.filter((f) => f[0] === label);
  render(req, res, 'content', { title: label, section: OWNER_ONLY.includes(req.params.group) ? 'settings' : 'content', group: req.params.group, GROUPS, OWNER_ONLY, fields, IMAGE_KEYS, errors: {}, values: Object.fromEntries(fields.map((f) => [f[1], content.get(f[1])])) });
});
router.post('/content/:group', contentGuard, (req, res) => {
  const label = GROUPS[req.params.group];
  const fields = content.FIELDS.filter((f) => f[0] === label);
  const errors = {}, vals = {};
  for (const [, key, lab, type] of fields) {
    let v = req.body[key] ?? '';
    v = type === 'richtext' ? cleanHtml(v) : cleanText(v, type === 'textarea' ? 4000 : 300);
    if (key === 'biz.phone' && !/^[0-9+()\-.\s]{7,20}$/.test(v)) errors[key] = 'Enter a valid phone number.';
    if (key === 'biz.email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errors[key] = 'Enter a valid email.';
    if (key === 'appt.notify_email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errors[key] = 'Enter a valid email.';
    if (key === 'seo.site_url' && !/^https?:\/\/[^\s/]+$/.test(v.replace(/\/$/, ''))) errors[key] = 'Use a full address like https://example.com';
    if (/^(biz\.(facebook|instagram))$/.test(key) && v && !/^https:\/\//.test(v)) errors[key] = 'Must start with https://';
    if (key === 'biz.disclaimer' && !v.includes('is not a law firm')) errors[key] = 'The disclaimer must keep the “not a law firm” statement.';
    if (key === 'home.hero_image' && v && !cleanText(req.body['home.hero_image_alt'], 300)) errors['home.hero_image_alt'] = 'Add alt text for the hero image.';
    if (['appt.slot_capacity', 'sys.retention_months'].includes(key) && !/^\d{1,3}$/.test(v)) errors[key] = 'Enter a whole number.';
    if (IMAGE_KEYS.includes(key) && v && !/^(\/uploads\/|\/img\/|https:\/\/)/.test(v)) errors[key] = 'Pick an image from the media library.';
    vals[key] = v;
  }
  if (Object.keys(errors).length) { res.status(422); return render(req, res, 'content', { title: label, section: OWNER_ONLY.includes(req.params.group) ? 'settings' : 'content', group: req.params.group, GROUPS, OWNER_ONLY, fields, IMAGE_KEYS, errors, values: { ...vals } }); }
  db.transaction(() => { for (const k of Object.keys(vals)) content.set(k, vals[k]); })();
  audit(req, 'settings', req.params.group, Object.keys(vals).filter((k) => k.startsWith('sys.')).join(','));
  req.session.flash = `${label} saved.`;
  res.redirect('/admin/content/' + req.params.group);
});

// ---------- SEO center ----------
router.get('/seo', guard('owner', 'editor'), (req, res) => {
  const items = [];
  const add = (type, edit, r, url) => items.push({ type, edit, url, title: r.title, meta_title: r.meta_title || '', meta_description: r.meta_description || r.summary || r.excerpt || '', own_desc: !!r.meta_description, noindex: !!r.noindex, body: [r.body, r.who_for, r.what_to_expect, r.what_to_bring].join(' '), feat: r.featured_image ? !!r.featured_alt : true });
  for (const r of db.prepare("SELECT * FROM pages WHERE deleted=0 AND status='published'").all()) add('Page', `/admin/pages/${r.id}/edit`, r, '/' + r.slug);
  for (const r of db.prepare("SELECT * FROM posts WHERE deleted=0 AND status<>'draft'").all()) add('Post', `/admin/posts/${r.id}/edit`, r, '/blog/' + r.slug);
  for (const r of db.prepare('SELECT * FROM services WHERE published=1').all()) add('Service', `/admin/services/${r.id}/edit`, r, '/services/' + r.slug);
  const titles = {}; for (const i of items) { const k = (i.meta_title || i.title).toLowerCase(); titles[k] = (titles[k] || 0) + 1; }
  for (const i of items) {
    i.issues = [];
    const t = i.meta_title || i.title, d = stripTags(i.meta_description);
    if (!i.own_desc) i.issues.push('No custom meta description');
    if (d && d.length > 160) i.issues.push('Description over 160 chars');
    if (d && d.length < 70) i.issues.push('Description under 70 chars');
    if (t.length > 60) i.issues.push('Title over 60 chars');
    if (titles[t.toLowerCase()] > 1) i.issues.push('Duplicate title');
    if (/<img(?![^>]*\balt="[^"]+")/i.test(i.body)) i.issues.push('Image without alt text');
    if (!i.feat) i.issues.push('Featured image without alt');
    if (i.noindex) i.issues.push('Hidden from search (noindex)');
  }
  render(req, res, 'seo', { title: 'SEO center', section: 'seo', items, redirects: db.prepare('SELECT COUNT(*) n FROM redirects').get().n });
});

// ---------- users ----------
const uGuard = guard('owner');
const tempPassword = () => crypto.randomBytes(9).toString('base64url') + 'aA1';
const ownerCount = () => db.prepare("SELECT COUNT(*) n FROM users WHERE role='owner' AND active=1").get().n;
router.get('/users', uGuard, (req, res) => render(req, res, 'users', { title: 'Users', section: 'users', rows: db.prepare('SELECT id,email,name,role,active,totp_enabled,created_at FROM users ORDER BY id').all() }));
router.get('/users/new', uGuard, (req, res) => render(req, res, 'user-form', { title: 'Invite user', section: 'users', u: { role: 'staff', active: 1 }, isNew: true, errors: {} }));
router.post('/users', uGuard, (req, res) => {
  const v = { name: cleanText(req.body.name, 80), email: cleanText(req.body.email, 160).toLowerCase(), role: ['owner', 'editor', 'staff'].includes(req.body.role) ? req.body.role : 'staff' };
  const errors = {};
  if (v.name.length < 2) errors.name = 'Enter a name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) errors.email = 'Enter a valid email.';
  else if (db.prepare('SELECT 1 FROM users WHERE email=?').get(v.email)) errors.email = 'A user with that email already exists.';
  if (Object.keys(errors).length) { res.status(422); return render(req, res, 'user-form', { title: 'Invite user', section: 'users', u: { ...v, active: 1 }, isNew: true, errors }); }
  const tmp = tempPassword();
  db.prepare('INSERT INTO users(email,name,password_hash,role,must_change) VALUES(?,?,?,?,1)').run(v.email, v.name, sec.hashPassword(tmp), v.role);
  audit(req, 'create', 'users', `${v.email} (${v.role})`);
  mail.send({ to: v.email, subject: 'Your Vista admin account', title: 'Welcome to the Vista dashboard', html: `<p>Hello ${esc(v.name)},</p><p>An account was created for you. Sign in at <a href="${g('seo.site_url')}/admin">${esc(g('seo.site_url'))}/admin</a> with your email and the temporary password shared with you separately. You will be asked to choose your own password.</p>` });
  req.session.flash = `User created. Temporary password (shown once): ${tmp}`;
  res.redirect('/admin/users');
});
router.get('/users/:id(\\d+)/edit', uGuard, (req, res, next) => {
  const u = db.prepare('SELECT id,email,name,role,active,totp_enabled FROM users WHERE id=?').get(req.params.id);
  if (!u) return next();
  render(req, res, 'user-form', { title: 'Edit user', section: 'users', u, isNew: false, errors: {} });
});
router.post('/users/:id(\\d+)', uGuard, (req, res, next) => {
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!u) return next();
  const role = ['owner', 'editor', 'staff'].includes(req.body.role) ? req.body.role : u.role, active = req.body.active ? 1 : 0, name = cleanText(req.body.name, 80) || u.name;
  if (u.id === req.user.id && (role !== 'owner' || !active)) { req.session.flash2 = 'You cannot demote or disable your own account.'; return res.redirect('/admin/users/' + u.id + '/edit'); }
  if (u.role === 'owner' && (role !== 'owner' || !active) && ownerCount() <= 1) { req.session.flash2 = 'There must be at least one active owner.'; return res.redirect('/admin/users/' + u.id + '/edit'); }
  db.prepare('UPDATE users SET name=?, role=?, active=? WHERE id=?').run(name, role, active, u.id);
  if (!active) db.prepare("DELETE FROM sessions WHERE sess LIKE ?").run(`%"uid":${u.id},%`);
  let msg = 'User saved.';
  if (req.body.reset_password) { const tmp = tempPassword(); db.prepare('UPDATE users SET password_hash=?, must_change=1, failed=0, locked_until=0 WHERE id=?').run(sec.hashPassword(tmp), u.id); msg += ` New temporary password (shown once): ${tmp}`; audit(req, 'password-reset-by-admin', 'users', u.email); }
  if (req.body.reset_2fa) { db.prepare("UPDATE users SET totp_enabled=0, totp_secret=NULL, recovery='[]' WHERE id=?").run(u.id); audit(req, '2fa-reset', 'users', u.email); }
  audit(req, 'update', 'users', `${u.email} role=${role} active=${active}`);
  req.session.flash = msg;
  res.redirect('/admin/users');
});

// ---------- audit / outbox / backups ----------
router.get('/audit', uGuard, (req, res) => {
  const q = cleanText(req.query.q, 60), p = Math.max(1, parseInt(req.query.page, 10) || 1), per = 50;
  const w = q ? 'WHERE action LIKE ? OR user_email LIKE ? OR entity LIKE ? OR detail LIKE ?' : '', params = q ? Array(4).fill(`%${q}%`) : [];
  const total = db.prepare(`SELECT COUNT(*) n FROM audit_log ${w}`).get(...params).n;
  render(req, res, 'audit', { title: 'Audit log', section: 'audit', rows: db.prepare(`SELECT * FROM audit_log ${w} ORDER BY id DESC LIMIT ${per} OFFSET ${(p - 1) * per}`).all(...params), q, p, pages: Math.ceil(total / per) });
});
router.get('/outbox', uGuard, (req, res) => render(req, res, 'outbox', { title: 'Email outbox', section: 'outbox', rows: db.prepare('SELECT * FROM outbox ORDER BY id DESC LIMIT 100').all(), smtp: mail.smtpConfigured(), stripTags }));

const BK = path.join(__dirname, '..', '..', 'data', 'backups');
router.get('/backups', uGuard, (req, res) => {
  fs.mkdirSync(BK, { recursive: true });
  const files = fs.readdirSync(BK).filter((f) => /^vista-[\w-]+\.db$/.test(f)).sort().reverse().map((f) => ({ name: f, size: fs.statSync(path.join(BK, f)).size }));
  render(req, res, 'backups', { title: 'Backups', section: 'backups', files });
});
router.post('/backups/create', uGuard, async (req, res) => {
  fs.mkdirSync(BK, { recursive: true });
  const name = `vista-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.db`;
  await db.backup(path.join(BK, name));
  const all = fs.readdirSync(BK).filter((f) => /^vista-[\w-]+\.db$/.test(f)).sort();
  all.slice(0, Math.max(0, all.length - 14)).forEach((f) => fs.unlinkSync(path.join(BK, f)));
  audit(req, 'backup', 'system', name);
  req.session.flash = 'Backup created.';
  res.redirect('/admin/backups');
});
router.get('/backups/download/:name', uGuard, (req, res, next) => {
  if (!/^vista-[\w-]+\.db$/.test(req.params.name)) return next();
  const f = path.join(BK, req.params.name);
  if (!fs.existsSync(f)) return next();
  audit(req, 'backup-download', 'system', req.params.name);
  res.download(f);
});

// ---------- account: password + 2FA ----------
router.get('/account/password', (req, res) => render(req, res, 'account', { title: 'Account', section: 'account', mode: 'password', error: null, qr: null }));
router.post('/account/password', (req, res) => {
  const full = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  const pw = String(req.body.password || '');
  const problem = !sec.verifyPassword(String(req.body.current || ''), full.password_hash) ? 'Your current password is not correct.' : sec.passwordProblem(pw) || (pw !== req.body.confirm ? 'The two passwords do not match.' : null);
  if (problem) { res.status(422); return render(req, res, 'account', { title: 'Account', section: 'account', mode: 'password', error: problem, qr: null }); }
  db.prepare('UPDATE users SET password_hash=?, must_change=0 WHERE id=?').run(sec.hashPassword(pw), full.id);
  audit(req, 'password-change', 'users', full.email);
  req.session.flash = 'Password changed.';
  res.redirect('/admin');
});
router.get('/account/2fa', async (req, res) => {
  const full = db.prepare('SELECT totp_enabled FROM users WHERE id=?').get(req.user.id);
  let qr = null, secret = null;
  if (!full.totp_enabled) {
    secret = req.session.totpPending || (req.session.totpPending = sec.newTotpSecret());
    const uri = `otpauth://totp/${encodeURIComponent('Vista Admin')}:${encodeURIComponent(req.user.email)}?secret=${secret}&issuer=${encodeURIComponent('Vista Admin')}`;
    qr = await QRCode.toDataURL(uri, { margin: 1, width: 220 });
  }
  render(req, res, 'account', { title: 'Two-step sign-in', section: 'account', mode: '2fa', enabled: !!full.totp_enabled, qr, secret, error: null, codes: req.session.newCodes });
  delete req.session.newCodes;
});
router.post('/account/2fa/enable', (req, res) => {
  const secret = req.session.totpPending;
  if (!secret || !sec.totpVerify(secret, req.body.code)) { req.session.flash2 = 'That code did not match. Try again with the newest code.'; return res.redirect('/admin/account/2fa'); }
  const codes = Array.from({ length: 8 }, () => crypto.randomBytes(5).toString('hex'));
  db.prepare('UPDATE users SET totp_secret=?, totp_enabled=1, recovery=? WHERE id=?').run(secret, JSON.stringify(codes.map((c) => sec.sha256(c))), req.user.id);
  delete req.session.totpPending;
  req.session.newCodes = codes;
  audit(req, '2fa-enabled', 'users', req.user.email);
  res.redirect('/admin/account/2fa');
});
router.post('/account/2fa/disable', (req, res) => {
  const full = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!sec.verifyPassword(String(req.body.password || ''), full.password_hash)) { req.session.flash2 = 'Password incorrect.'; return res.redirect('/admin/account/2fa'); }
  if (process.env.REQUIRE_OWNER_2FA === 'true' && full.role === 'owner') { req.session.flash2 = 'Two-step sign-in is required for owners.'; return res.redirect('/admin/account/2fa'); }
  db.prepare("UPDATE users SET totp_enabled=0, totp_secret=NULL, recovery='[]' WHERE id=?").run(full.id);
  audit(req, '2fa-disabled', 'users', full.email);
  req.session.flash = 'Two-step sign-in turned off.';
  res.redirect('/admin/account/2fa');
});

module.exports = router;
module.exports.render = render;
