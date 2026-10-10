# Vista Immigrant Support Inc. — Website, CMS & Dashboard

Public website + staff dashboard for **Vista Immigrant Support Inc.** (*The Immigrant Place — Everyone Is Welcome*), 100 E Linton Blvd, Delray Beach, FL 33483.

Node 20+ · Express · server-rendered EJS · SQLite (better-sqlite3). One process, one database file, no build step.

## Run it

```bash
npm install
cp .env.example .env        # then set SESSION_SECRET (required in production)
npm run seed                # creates the database, content, and the owner account
npm start                   # http://localhost:3000   (dashboard: /admin)
```

**Owner login.** The seed creates the owner from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`. In development, if `ADMIN_PASSWORD` is blank, a random one is generated and written to `.env` (variable `ADMIN_PASSWORD`); you must change it at first sign-in. In production the seed refuses to run without `ADMIN_PASSWORD`.

Other scripts: `npm test` (133 end-to-end + security checks on a throwaway DB), `npm run seo:check` (crawls the running site), `npm run backup`, `npm run logo` (rebuild logo/favicons from the source JPEG).

## What the client can edit (no code)

| Where in the dashboard | What it controls |
| --- | --- |
| **Site content** → Home / About / Attorney / Contact | All marketing text, buttons labels, steps, value words, attorney bio, portrait, practice areas |
| **Business settings** | Name, tagline, address, phone, email, hours, disclaimer, social links, appointment capacity, SEO defaults, maintenance mode, data retention |
| **Blog posts** | Rich text, categories, tags, featured image + alt, draft / scheduled / published, revisions, SEO fields with live search preview |
| **Pages** | Legal pages and SEO landing pages (templates: default, landing, service-area) |
| **Services** | The 14 services, their order, legal vs. support label, per-service FAQs and SEO |
| **FAQs / Testimonials** | Testimonials only appear once approved (none are seeded) |
| **Navigation** | Header and footer menus incl. Spanish labels |
| **Media** | Images are resized, converted to WebP and stripped of metadata; alt text required; delete is blocked while an image is in use |
| **Appointments** | Requests → Confirmed / Completed / Cancelled / No-show, reschedule, notes, email the client, CSV export, closed dates |
| **Messages** | Inbox, star, archive, spam, notes, CSV export, delete (erases personal details) |
| **SEO center / Redirects** | Page-by-page audit, sitemap/robots links, 301/302 rules (auto-created when a live slug changes) |
| **Users** | Owner / Editor / Staff roles, temporary passwords, disable, 2-step reset |
| **Audit log, Email outbox, Backups** | Owner only |

### Roles
- **Owner** — everything. **Editor** — content, media, SEO, redirects, appointments, messages. **Staff** — appointments, messages, closed dates only. Enforced on the server for every route.

## Backups & restore
- Dashboard → Backups → *Create backup now* (DB snapshot, last 14 kept), or cron `0 3 * * * cd /var/www/vista && node scripts/backup.js` (DB + uploads).
- Restore: stop the app, replace `data/vista.db` with the backup (delete `vista.db-wal` / `-shm`), restore `public/uploads` if needed, start the app.

## Email
Without `SMTP_HOST`, every email (appointment confirmations, office notifications, password resets) is recorded under *Email outbox* instead of being sent. Set `SMTP_*` in `.env` to send for real (Gmail users need an app password).

## Languages
English is complete. Spanish covers navigation, buttons, forms, footer (including a translation of the disclaimer) and one Spanish landing page. Switch with **EN / ES** in the top bar (stored in a cookie). Page copy edited in the CMS stays in the language it was written in.

## Project layout

```
src/app.js              server, middleware, error handling
src/db.js               schema + migrations (PRAGMA user_version)
src/content.js          every editable site fact/text + defaults
src/routes/public.js    public pages, forms, sitemap, robots, RSS
src/routes/admin*.js    auth, dashboard, generic CRUD engine, modules
src/lib/                security (scrypt, TOTP, CSRF, sessions), mail, util, i18n, render
src/views/{public,admin}/
public/                 css, js, fonts, flags (all self-hosted), img, uploads
scripts/                seed, backup, logo, seo-check, smoke-test
```

See `SECURITY.md` for the threat model and go-live checklist and `DECISIONS.md` for assumptions and items that need client or attorney review.
