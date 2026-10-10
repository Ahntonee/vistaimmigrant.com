const sanitizeHtml = require('sanitize-html');
const slugify = require('slugify');
const db = require('../db');
const { hashIp } = require('./security');

const RICH = {
  allowedTags: ['h2', 'h3', 'h4', 'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
  allowedAttributes: { a: ['href', 'title', 'target', 'rel'], img: ['src', 'alt', 'width', 'height', 'loading'] },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  transformTags: {
    a: (tag, attribs) => ({ tagName: 'a', attribs: { ...attribs, rel: 'noopener noreferrer', ...(attribs.href && /^https?:/.test(attribs.href) ? { target: '_blank' } : {}) } }),
    img: (tag, attribs) => ({ tagName: 'img', attribs: { ...attribs, loading: 'lazy' } }),
  },
};
const cleanHtml = (s) => sanitizeHtml(s || '', RICH);
const cleanText = (s, max = 500) => String(s ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);

const slug = (s) => slugify(String(s || ''), { lower: true, strict: true, trim: true }).slice(0, 90);
function uniqueSlug(table, base, ignoreId = 0) {
  let s = slug(base) || 'item', n = 1, cur = s;
  while (db.prepare(`SELECT id FROM ${table} WHERE slug=? AND id<>?`).get(cur, ignoreId)) cur = `${s}-${++n}`;
  return cur;
}

function audit(req, action, entity = '', detail = '') {
  try {
    db.prepare('INSERT INTO audit_log(user_email,action,entity,detail,ip_hash) VALUES(?,?,?,?,?)')
      .run(req && req.user ? req.user.email : '', action, entity, String(detail).slice(0, 300), hashIp(req && req.ip));
  } catch (e) { console.error('audit failed', e.message); }
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const stripTags = (s) => sanitizeHtml(s || '', { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim();
const readingTime = (html) => Math.max(1, Math.round(stripTags(html).split(' ').length / 220));
const excerptOf = (html, n = 160) => { const t = stripTags(html); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t; };
const fmtDate = (d) => (d ? new Date(String(d).replace(' ', 'T') + (String(d).length <= 10 ? 'T12:00:00' : 'Z')).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/New_York' }) : '');
const nowSql = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const todayEt = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

module.exports = { cleanHtml, cleanText, slug, uniqueSlug, audit, esc, stripTags, readingTime, excerptOf, fmtDate, nowSql, todayEt };
