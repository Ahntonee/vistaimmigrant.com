require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const session = require('express-session');
const crypto = require('crypto');

const db = require('./db');
const content = require('./content');
const i18n = require('./lib/i18n');
const { SqliteStore, csrf } = require('./lib/security');
const util = require('./lib/util');

const prod = process.env.NODE_ENV === 'production';
let secret = process.env.SESSION_SECRET;
if (!secret || secret.length < 32) {
  if (prod) { console.error('SESSION_SECRET must be set (32+ chars) in production.'); process.exit(1); }
  secret = crypto.randomBytes(32).toString('hex');
  console.warn('! SESSION_SECRET not set — using a temporary one (sessions reset on restart).');
}
process.env.SESSION_SECRET = secret;

content.seedDefaults();

const app = express();
app.disable('x-powered-by');
const tp = process.env.TRUST_PROXY;
if (tp && tp !== 'false') app.set('trust proxy', tp === 'true' ? 1 : /^\d+$/.test(tp) ? Number(tp) : tp);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      styleSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      fontSrc: ["'self'"],
      connectSrc: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      ...(prod ? { upgradeInsecureRequests: [] } : {}),
    },
  },
  strictTransportSecurity: prod ? { maxAge: 31536000, includeSubDomains: true } : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: false,
}));
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  next();
});
app.use(compression());
if (process.env.NODE_ENV !== 'test') app.use(morgan(prod ? ':method :url :status :response-time ms' : 'dev'));

// canonical host / www handling + lowercase paths, no trailing slash
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const p = req.path;
  if (p.startsWith('/admin') || p.startsWith('/uploads') || p.startsWith('/css') || p.startsWith('/js') || p.startsWith('/img')) return next();
  const norm = (p.length > 1 ? p.replace(/\/+$/, '') : p).toLowerCase();
  if (norm !== p) {
    const q = req.url.slice(req.path.length);
    return res.redirect(301, norm + q);
  }
  next();
});

const assetOpts = { maxAge: prod ? '30d' : 0, etag: true };
app.use(express.static(path.join(__dirname, '..', 'public'), { ...assetOpts, index: false, setHeaders: (res, f) => {
  if (/\.(php|html?|js\.map)$/i.test(f)) res.setHeader('X-Content-Type-Options', 'nosniff');
} }));
app.use(express.urlencoded({ extended: false, limit: '200kb' }));
app.use(express.json({ limit: '100kb' }));

app.use(session({
  name: 'vista.sid',
  secret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  store: new SqliteStore(),
  cookie: { httpOnly: true, sameSite: 'lax', secure: prod, maxAge: 30 * 60 * 1000 },
}));
app.use(csrf);

// cookie parsing (tiny, only for lang)
app.use((req, res, next) => {
  const c = Object.fromEntries((req.headers.cookie || '').split(';').map((s) => s.trim().split('=')).filter((a) => a[0]));
  let lang = c.lang === 'es' ? 'es' : 'en';
  if (req.query.lang === 'es' || req.query.lang === 'en') {
    lang = req.query.lang;
    res.cookie('lang', lang, { maxAge: 365 * 864e5, sameSite: 'lax', secure: prod, httpOnly: false });
  }
  req.lang = lang;
  res.locals.lang = lang;
  res.locals.t = i18n.make(lang);
  res.locals.g = content.get;
  res.locals.u = util;
  res.locals.fmtDate = util.fmtDate;
  res.locals.reqPath = req.path;
  res.locals.nonce = '';
  next();
});

// attach admin user (if any) to every request so templates can show an "Edit" bar
app.use((req, res, next) => {
  const id = req.session && req.session.uid;
  req.user = id ? db.prepare('SELECT id,email,name,role,active,must_change,totp_enabled FROM users WHERE id=? AND active=1').get(id) : null;
  res.locals.user = req.user;
  next();
});

app.use(require('./lib/render'));
app.use('/admin', require('./routes/admin'));

app.use((req, res, next) => {
  if (content.get('sys.maintenance') === '1' && !req.user && !req.path.startsWith('/healthz')) {
    res.status(503).set('Retry-After', '3600');
    return res.page('maintenance', { seo: { title: 'We will be right back', noindex: true } });
  }
  next();
});

const adminRender = require('./routes/admin').render;
app.use(require('./routes/public'));

// ---- errors ----
app.use((req, res) => {
  res.status(404);
  if (req.path.startsWith('/admin')) return adminRender(req, res, 'error', { code: 404, message: 'Page not found.', title: 'Not found' });
  res.page('404', { seo: { title: 'Page not found', noindex: true } });
});
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  if (status >= 500) console.error(err);
  const message = status >= 500 ? 'Something went wrong on our side. Please try again in a moment, or call us.' : err.message;
  res.status(status);
  if (req.path.startsWith('/admin')) return adminRender(req, res, 'error', { code: status, message, title: 'Error' });
  if (res.page) return res.page('500', { seo: { title: 'Something went wrong', noindex: true }, code: status, message });
  res.type('text').send(message);
});

// retention purge (opt-in via settings)
function purge() {
  const m = parseInt(content.get('sys.retention_months'), 10);
  if (!m || m < 1) return;
  db.prepare(`DELETE FROM messages WHERE created_at < datetime('now', ?)`).run(`-${m} months`);
  db.prepare(`DELETE FROM appointments WHERE created_at < datetime('now', ?)`).run(`-${m} months`);
}
setInterval(purge, 6 * 3600 * 1000).unref();
purge();

module.exports = app;

if (require.main === module) {
  const port = process.env.PORT || 3000;
  const server = app.listen(port, () => console.log(`Vista site running on http://localhost:${port}  (admin: /admin)`));
  const stop = () => server.close(() => { db.close(); process.exit(0); });
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}
