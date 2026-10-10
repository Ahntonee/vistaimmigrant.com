# Security notes

## Threat model (short)
The public site collects names, phone numbers and short messages from people who may be anxious about immigration status. The main risks are: unauthorized access to the staff area (and the inquiries inside it), injection through forms and the rich-text editor, spam/abuse of the forms, and accidental over-collection of sensitive data.

## What is implemented (and how it is checked)

| Control | Implementation | Verified by |
| --- | --- | --- |
| Password storage | Node built-in **scrypt** (N=2^15, per-user salt, timing-safe compare). Policy: 12+ chars, mixed case + number. | code review; smoke test logs in with it |
| Login abuse | 12 attempts / 15 min per IP, **account lockout** after 5 failures (15 min), identical error for unknown email vs wrong password, dummy hash to equalize timing | smoke test (generic 401s) |
| Sessions | Server-side in SQLite; cookie `HttpOnly`, `SameSite=Lax`, `Secure` in production; regenerated on login; **30 min idle** and **12 h absolute** timeouts; destroyed on logout; no session cookie for ordinary visitors | smoke test (logout invalidates, plain visitors get no cookie) |
| 2-step sign-in | Optional TOTP (RFC 6238) with QR + 8 hashed recovery codes. `REQUIRE_OWNER_2FA=true` makes it mandatory for owners. | manual |
| Password reset | Single-use token, only the SHA-256 hash stored, 1-hour expiry, generic response | code review |
| Authorization | Role checks on every admin route on the server (deny by default); last-owner / self-demotion protection | smoke test (staff gets 403 on settings, users, posts, backups) |
| CSRF | Synchronizer token in the server session, required on **every** POST (admin and public) | smoke test (POSTs without token → 403) |
| Headers | Helmet with real CSP: `script-src 'self'` (no inline scripts), `frame-ancestors 'none'`, `object-src 'none'`, HSTS in prod, `nosniff`, strict referrer policy, minimal Permissions-Policy; admin responses `no-store` + `noindex` | smoke test |
| XSS | EJS escapes by default; rich text sanitized on save with a strict allowlist (scripts, event handlers, `javascript:` stripped); JSON-LD escapes `<` | smoke test (script/onerror payload removed) |
| SQL injection | Parameterized queries only; table/column names come from fixed server-side config, never from input | code review |
| Uploads | 8 MB cap, **magic-byte check** with sharp (extension and Content-Type are ignored), allowlist jpeg/png/webp/gif + PDF (`%PDF-` header), re-encoded to WebP with metadata stripped, random filenames, SVG not accepted | smoke test (PHP disguised as JPEG rejected) |
| Public forms | Honeypot field, minimum time-to-submit, link-count check, per-IP rate limit (8 successful submissions/hour), email-header-injection guard, length caps, consent stored with timestamp. Spam is filed in a Spam tab, not dropped silently. | smoke test |
| Privacy | IPs stored only as a daily-rotating hash; privacy-friendly page counter (no cookies, no IPs, bots excluded); no third-party scripts, fonts, maps or trackers; forms warn visitors **not** to enter A-Numbers/SSN/case details and never ask for them; optional auto-purge (`Business settings → System`); admin "delete" erases a person's data | code review |
| Open redirect | Post-login `next` is limited to `/admin…` paths | code review |
| Double booking | Capacity check re-run inside an immediate SQLite transaction | smoke test |
| Secrets | `.env` is git-ignored; production refuses to start without `SESSION_SECRET`; seed refuses to run in production without `ADMIN_PASSWORD` | startup checks |
| Auditability | Append-only audit log (logins, failures, content/settings/user changes, exports, backups); IPs hashed | dashboard |
| Dependencies | `npm audit --omit=dev` run at build time (see DECISIONS.md for the result) | — |

## Not done / known limits
- Rate limits are in memory (per process). With multiple instances, move them to Redis.
- No WAF, no malware scanning of PDFs, no IP allow-listing for `/admin`. Consider restricting `/admin` in nginx if staff work from fixed locations.
- Spanish and English legal text are not a substitute for attorney review.

## Go-live checklist
- [ ] `NODE_ENV=production`, `TRUST_PROXY=true` behind nginx, HTTPS working
- [ ] `SESSION_SECRET` set (48+ random bytes); `ADMIN_PASSWORD` strong and **changed** after first sign-in
- [ ] Owner has turned on 2-step sign-in; consider `REQUIRE_OWNER_2FA=true`
- [ ] SMTP configured; send a test appointment and check the outbox shows *sent*
- [ ] **Public site URL** set to the real https domain
- [ ] `data/` and `.env` are not web-accessible and have restrictive file permissions (`chmod 600 .env`, `chmod 700 data`)
- [ ] Backups scheduled and one restore rehearsed
- [ ] Default placeholder content replaced (attorney bio/portrait, privacy/terms reviewed by the attorney)
- [ ] `npm test` and `npm run seo:check` pass on the final build
