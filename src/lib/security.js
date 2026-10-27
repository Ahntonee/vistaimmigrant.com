const crypto = require('crypto');
const session = require('express-session');
const db = require('../db');

// ---------- passwords (scrypt, built in; no native build needed) ----------
const N = 2 ** 15, R = 8, P = 1, KEYLEN = 64;
function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pw, salt, KEYLEN, { N, r: R, p: P, maxmem: 128 * N * R * 2 });
  return `scrypt$${N}$${salt.toString('base64')}$${hash.toString('base64')}`;
}
function verifyPassword(pw, stored) {
  try {
    const [, n, salt, hash] = stored.split('$');
    const want = Buffer.from(hash, 'base64');
    const got = crypto.scryptSync(pw, Buffer.from(salt, 'base64'), want.length, { N: +n, r: R, p: P, maxmem: 128 * +n * R * 2 });
    return crypto.timingSafeEqual(want, got);
  } catch {
    return false;
  }
}
// dummy hash so unknown-email logins cost the same as real ones
const DUMMY = hashPassword('not-a-real-password');

function passwordProblem(pw) {
  if (!pw || pw.length < 12) return 'Use at least 12 characters.';
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/\d/.test(pw)) return 'Include upper and lower case letters and a number.';
  if (/(password|123456|qwerty|vista)/i.test(pw)) return 'That password is too easy to guess.';
  return null;
}

// ---------- TOTP (RFC 6238) ----------
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function b32encode(buf) {
  let bits = '', out = '';
  for (const b of buf) bits += b.toString(2).padStart(8, '0');
  for (let i = 0; i < bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)];
  return out;
}
function b32decode(s) {
  let bits = '';
  for (const c of s.replace(/=+$/, '').toUpperCase()) bits += B32.indexOf(c).toString(2).padStart(5, '0');
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}
function hotp(secret, counter) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', b32decode(secret)).update(buf).digest();
  const o = h[h.length - 1] & 0xf;
  const code = (h.readUInt32BE(o) & 0x7fffffff) % 1e6;
  return String(code).padStart(6, '0');
}
function totpVerify(secret, token) {
  const t = Math.floor(Date.now() / 30000);
  token = String(token || '').replace(/\s/g, '');
  for (const d of [-1, 0, 1]) {
    const a = Buffer.from(hotp(secret, t + d)), b = Buffer.from(token);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
  }
  return false;
}
const newTotpSecret = () => b32encode(crypto.randomBytes(20));

// ---------- session store on SQLite ----------
class SqliteStore extends session.Store {
  constructor() {
    super();
    this.get_ = db.prepare('SELECT sess FROM sessions WHERE sid=? AND expires>?');
    this.set_ = db.prepare('INSERT INTO sessions(sid,sess,expires) VALUES(?,?,?) ON CONFLICT(sid) DO UPDATE SET sess=excluded.sess, expires=excluded.expires');
    this.del_ = db.prepare('DELETE FROM sessions WHERE sid=?');
    setInterval(() => db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now()), 10 * 60 * 1000).unref();
  }
  get(sid, cb) {
    try { const r = this.get_.get(sid, Date.now()); cb(null, r ? JSON.parse(r.sess) : null); } catch (e) { cb(e); }
  }
  set(sid, sess, cb) {
    try {
      const exp = sess.cookie && sess.cookie.expires ? new Date(sess.cookie.expires).getTime() : Date.now() + 3600e3;
      this.set_.run(sid, JSON.stringify(sess), exp); cb && cb(null);
    } catch (e) { cb && cb(e); }
  }
  destroy(sid, cb) { try { this.del_.run(sid); cb && cb(null); } catch (e) { cb && cb(e); } }
  touch(sid, sess, cb) { this.set(sid, sess, cb); }
}

// ---------- CSRF (synchronizer token kept in the server-side session) ----------
function csrf(req, res, next) {
  if (!req.session) return next(new Error('Session unavailable'));
  // Lazy: a session (and cookie) is only created when a page actually renders a form.
  res.locals.csrfToken = () => {
    if (!req.session.csrf) req.session.csrf = crypto.randomBytes(24).toString('hex');
    return req.session.csrf;
  };
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const sent = (req.body && req.body._csrf) || req.headers['x-csrf-token'] || req.query._csrf || '';
  const a = Buffer.from(String(sent)), b = Buffer.from(req.session.csrf || 'x');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    const err = new Error('Your sign-in page expired, or your browser is blocking cookies. Please reload the page and try again.');
    err.status = 403;
    return next(err);
  }
  next();
}

// ---------- privacy helpers ----------
const rotatingSalt = () => `${process.env.SESSION_SECRET || 'dev'}:${new Date().toISOString().slice(0, 10)}`;
const hashIp = (ip) => crypto.createHash('sha256').update(rotatingSalt() + (ip || '')).digest('hex').slice(0, 16);
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const randomToken = () => crypto.randomBytes(32).toString('hex');

module.exports = {
  hashPassword, verifyPassword, DUMMY, passwordProblem,
  totpVerify, newTotpSecret, SqliteStore, csrf, hashIp, sha256, randomToken,
};
