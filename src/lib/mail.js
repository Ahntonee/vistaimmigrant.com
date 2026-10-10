const nodemailer = require('nodemailer');
const db = require('../db');
const content = require('../content');
const { esc } = require('./util');

let transport = null;
if (process.env.SMTP_HOST) {
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: +(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}
const smtpConfigured = () => !!transport;

function wrap(title, bodyHtml) {
  const g = content.get;
  const site = g('seo.site_url').replace(/\/$/, '');
  return `<!doctype html><html><body style="margin:0;background:#f4efe6;font-family:Arial,Helvetica,sans-serif;color:#13244a">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:8px;overflow:hidden">
<tr><td style="padding:24px 28px;border-bottom:3px solid #b68a2e"><img src="${site}/img/logo.png" alt="${esc(g('biz.name'))}" width="150" style="display:block"></td></tr>
<tr><td style="padding:28px;font-size:15px;line-height:1.6"><h1 style="font-size:20px;margin:0 0 16px">${esc(title)}</h1>${bodyHtml}</td></tr>
<tr><td style="padding:20px 28px;background:#f8f5ee;font-size:12px;line-height:1.5;color:#52607d">
<strong>${esc(g('biz.name'))}</strong><br>${esc(g('biz.street'))}, ${esc(g('biz.city'))}, ${esc(g('biz.state'))} ${esc(g('biz.zip'))}<br>${esc(g('biz.phone'))} · ${esc(g('biz.hours'))}, ${esc(g('biz.hours_note'))}<br><br>${esc(g('biz.disclaimer'))}</td></tr>
</table></td></tr></table></body></html>`;
}

async function send({ to, subject, title, html, text }) {
  if (!to) return;
  const full = wrap(title || subject, html);
  const row = db.prepare('INSERT INTO outbox(to_addr,subject,html,text) VALUES(?,?,?,?)').run(to, subject, full, text || '');
  if (!transport) return; // dev outbox only; visible in admin
  try {
    await transport.sendMail({ from: process.env.MAIL_FROM || `"${content.get('biz.name')}" <${process.env.SMTP_USER}>`, to, subject, html: full, text: text || undefined });
    db.prepare('UPDATE outbox SET sent=1 WHERE id=?').run(row.lastInsertRowid);
  } catch (e) {
    db.prepare('UPDATE outbox SET error=? WHERE id=?').run(String(e.message).slice(0, 300), row.lastInsertRowid);
  }
}

module.exports = { send, smtpConfigured };
