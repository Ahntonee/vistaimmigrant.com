# BUILD PROMPT — Vista Immigrant Support Inc. (Website + CMS)

You are a senior full-stack engineer and product designer. Build the complete website, admin CMS, and dashboard for **Vista Immigrant Support Inc.** from an empty folder to a running, secured, seeded app. Work in the phases below, in order. Finish and verify each phase (run the app, hit the routes) before starting the next. Do not ask me questions; where something is ambiguous, pick the sensible default, note it in `DECISIONS.md`, and keep going. Do not stop at scaffolding. The end state must be runnable with `npm install && npm run seed && npm start`.

---

## 0. CLIENT FACTS (use verbatim, single source of truth)

Store these in the database `settings` table (editable from the CMS) and seed them. Never hardcode them in templates.

- **Business name:** Vista Immigrant Support Inc.
- **Tagline:** The Immigrant Place — Everyone Is Welcome
- **Sub-tagline (Spanish, secondary):** Todos Son Bienvenidos Aquí
- **Welcome line:** We welcome everyone regardless of country, culture, language, or background.
- **Address (display exactly this, NO suite number):** 100 E Linton Blvd, Delray Beach, FL 33483
- **Phone:** 561-567-7970 (`tel:+15615677970`)
- **Email:** Vistaimmigrantsupport@gmail.com
- **Hours:** Monday–Saturday, 9:00 AM–5:00 PM — **By Appointment Only**
- **Attorney:** Latoya Renae Stephenson, Esq. (the logo artwork shows "Latoya Renae, Esq."; use the full name from the client's written copy and flag the discrepancy in `DECISIONS.md` for the client to confirm)
- **Attorney note:** Attorney services may include representation before Immigration Court and USCIS for matters accepted by the attorney.
- **Logo file:** `C:\Users\DELL\Downloads\the immigrant place logo.jpeg` — copy it into `/public/img/`, then derive: a web-optimized logo (WebP + PNG fallback), a favicon set (16/32/180/512, `site.webmanifest`), and an Open Graph share image (1200×630) using `sharp`. Use the logo in the header, footer, admin login, admin sidebar, emails, and favicon. Sample colors from the logo (navy, royal blue, gold, plus the multicolor figures) and use them as the design tokens. Do not invent a different palette.

**Footer disclaimer (verbatim, on every public page, in the footer, legible, not tiny gray-on-gray):**

> Vista Immigrant Support Inc. is not a law firm. Non-attorney Vista staff do not provide legal advice. Legal advice and legal representation are provided by licensed attorneys for matters they accept. Information provided on this website is general information and is not a substitute for legal advice regarding an individual's specific circumstances.

**Compliance guardrails for ALL copy you write:** never promise outcomes, never say "guaranteed", never imply Vista staff give legal advice, never state or imply Vista is a law firm. Services that involve legal work must be described as "provided by our licensed attorney for matters accepted by the attorney." Vista's own non-legal services (document assistance, translation, interpretation, guidance and resources, community assistance) are described as support services.

---

## 1. STACK (chosen for speed, SEO, and one-command deploy)

- **Node 20+ / Express 4**, **EJS** server-rendered templates (real HTML for crawlers, no SPA hydration), **SQLite via better-sqlite3** (file DB, WAL mode, foreign keys on). Include a clean data-access layer so swapping to Postgres later is easy.
- Vanilla CSS with custom properties (no Tailwind, no UI kit), small vanilla JS modules. Admin uses the same CSS tokens with an `admin.css` layer.
- **Security/infra packages:** `helmet`, `express-rate-limit`, `csurf`-equivalent (use `csrf-csrf` or equivalent double-submit token), `argon2`, `express-session` + SQLite session store (`better-sqlite3-session-store` or similar), `express-validator` or `zod`, `sanitize-html`, `multer`, `sharp`, `compression`, `morgan`, `dotenv`, `nodemailer`, `slugify`.
- Rich text editor in admin: **TipTap or Quill via local vendored files** (no third-party CDN calls at runtime). Output sanitized HTML.
- Project layout: `/src/{config,db,middleware,routes/public,routes/admin,services,views/public,views/admin,utils}`, `/public/{css,js,img,uploads}`, `/scripts/{seed.js,backup.js}`, `/data`, `.env.example`, `README.md`, `DECISIONS.md`.

---

## 2. DESIGN DIRECTION — clean, minimal, modern, and NOT "AI-generated looking"

This matters as much as the functionality. Follow it strictly.

**Feel:** a trustworthy, warm, professional immigration-services office. Think quiet confidence of a good law-adjacent nonprofit, not a startup landing page.

**Do:**
- Generous whitespace, a strict 8px spacing scale, a 12-column grid, max content width ~1160px, readable line length (60–75ch) for body copy.
- Type: one serif for headings (e.g., *Fraunces*, *Source Serif 4*, or *Newsreader*) + one clean sans for UI/body (e.g., *Inter* or *Public Sans*). **Self-host the fonts** (woff2, `font-display: swap`, preload the primary weights). Fluid type scale using `clamp()`.
- Color: navy as the anchor, royal blue for actions, gold used sparingly as an accent line/detail, warm off-white backgrounds (not pure white everywhere), and the logo's multicolor only inside the logo and tiny accents. Define everything as CSS variables. WCAG AA contrast minimum.
- Real structure: a calm header with logo left, nav, and a persistent **Call Now** button; a hero with a strong headline and 3 clear buttons; a restrained flag strip; service cards in a tidy grid; a simple 3-step "How it works"; a trust band (address, hours, appointment-only); a final CTA band.
- Flags: show a **tasteful, diverse flag row** representing communities served (US, Mexico, Haiti, Jamaica, Brazil, Spain, Colombia, Venezuela, Argentina, Dominican Republic, El Salvador, Honduras, Guatemala, Cuba, Nicaragua, Peru, Ecuador, Philippines, India, Nigeria, Ghana, Canada, Honduras, Bahamas, China, Vietnam, Ukraine, Haiti). Use **inline SVG or the `flag-icons` package vendored locally**, small rounded rectangles in a single row/marquee-free strip (static on mobile, gentle slow scroll on desktop only if `prefers-reduced-motion` is not set). Also a "We help families from many countries" section with a flag grid. Flags must have `aria-label`s and be decorative where appropriate.
- Subtle, purposeful motion only: 150–250ms hover/focus transitions, one fade-up on scroll for sections, nothing bouncing, no parallax, no gradients-everywhere.
- Photography: no stock-photo clichés. Until the client supplies photos, use typographic and flag/pattern-based sections and clearly marked image placeholders managed in the CMS (an image slot that renders gracefully when empty).

**Don't (these are the tells of generic AI sites):**
- No purple-to-blue gradient hero, no glassmorphism blobs, no floating emoji icons, no "Unlock the power of…" / "Seamless" / "Empower" / "Elevate" copy, no identical three-card rows repeated down the whole page, no centered-everything layouts, no giant drop shadows, no neon, no stock icon-in-circle overuse. Use a consistent line-icon set (e.g., Lucide, vendored as inline SVG) sparingly.
- Write copy like a real human at a community organization: short, warm, specific, plain English. Write it so it reads naturally; avoid filler.

**Responsive:** mobile-first. Test at 360, 390, 768, 1024, 1440. Mobile gets a sticky bottom bar with **Call Now** and **Book Appointment**. Header collapses to an accessible menu (real `<button>`, focus trap, `aria-expanded`, ESC to close). Tap targets ≥ 44px.

**Accessibility:** semantic landmarks, skip link, visible focus rings, alt text, form labels/errors tied via `aria-describedby`, `prefers-reduced-motion`, `lang` attribute, color-contrast AA, keyboard-operable everything. Target Lighthouse ≥ 95 on Accessibility, Best Practices, SEO and ≥ 90 Performance (mobile).

**Languages:** English primary. Build the template layer so the site can show English + Spanish for key UI strings and the brand sub-tagline (`i18n` JSON files, `?lang=es` or `/es/` prefix). Phase 1 delivers English fully and Spanish for header/nav, hero, CTAs, appointment form, contact form, and footer disclaimer (provide a faithful Spanish translation of the disclaimer and mark it "translation — have it reviewed by the attorney" in `DECISIONS.md`). Add `hreflang` tags. If time is short, ship English and leave the i18n scaffold working.

---

## 3. PUBLIC SITE — PAGES AND CONTENT

All routes server-rendered, each with unique `<title>`, meta description, canonical, OG/Twitter tags, and JSON-LD (see §6). Every page content block that is marketing copy must be editable from the CMS (seed with the defaults below).

1. **Home `/`**
   - Hero: eyebrow "THE IMMIGRANT PLACE", H1 "Everyone Is Welcome." Body: "At Vista Immigrant Support Inc., everyone is welcome. We provide a welcoming and professional environment where immigrants and their families can receive immigration support and connect with licensed attorneys for legal representation when needed." Line: "One Community. Many Cultures. Everyone Is Welcome."
   - Three prominent buttons: **CALL NOW — 561-567-7970**, **SCHEDULE AN APPOINTMENT**, **CONTACT US**.
   - Flag strip, services overview (top 6 + "View all services"), "How it works" (1. Call or book online → 2. Meet with our team → 3. Get connected with our licensed attorney for matters accepted), meet-the-attorney teaser, value words (Families · Opportunities · Protection · Brighter Futures · People · Cultures · Communities · Stronger Together), latest blog posts (3), FAQ preview, hours/address band, final CTA.
2. **About Us `/about`** — mission, who we serve, our promise (welcome for all languages/cultures/backgrounds), how we work with licensed attorneys, community/values, clear statement of what Vista does and does not do (non-law-firm clarity, written warmly).
3. **Immigration Services `/services`** — intro, then the full list as cards linking to detail pages `/services/:slug`. Services (seed all, each with a unique 250–400 word description, "Who this is for", "What to expect", "What to bring", and a small FAQ):
   Asylum Applications · Work Permits (EAD) · Green Card / Adjustment of Status · Family-Based Immigration Matters · Removal Proceedings · Master Calendar Hearings · Individual Hearings · Motions to Reopen · Immigration Appeals · USCIS Interviews · Requests for Evidence (RFE) · Immigration Document Assistance · Translation Services · Interpreter Services.
   Group them visually: *Legal representation (by our licensed attorney, for matters accepted)* vs *Support services (provided by Vista)*. Each service has a `category`, `is_legal` flag, icon, order, published flag, and its own SEO fields.
4. **Meet Our Attorney `/attorney`** — separate page for Latoya Renae Stephenson, Esq.: portrait slot (placeholder until supplied), short bio (seed with clearly marked editable placeholder text that makes NO invented credentials, bar numbers, schools, or years — the CMS has fields for bar admission, languages, practice areas, education, and they render only if filled), the line "Representation before Immigration Court and USCIS for matters accepted by the attorney.", practice areas, and a Schedule CTA. Include `Person`/`Attorney` JSON-LD only with real filled fields.
5. **Contact Us `/contact`** — form (name, email, phone, preferred language, subject, message, consent checkbox), address, phone, email, hours with "By Appointment Only", an embedded map **via a click-to-load static map/OSM link (no third-party scripts loaded until the user clicks)**, directions link.
6. **Schedule an Appointment `/appointment`** — multi-field form: full name, phone, email, preferred language, service of interest (from services table), preferred date, preferred time window (within Mon–Sat 9–5), short note, consent. Server validates date is Mon–Sat, in the future, within business hours; blocks dates the admin marked closed; prevents double-booking the same slot beyond the configured capacity. Confirmation page + confirmation email to client + notification email to the office. Appointment status workflow in admin (Requested → Confirmed → Completed / Cancelled / No-show). Include an `.ics` download on the confirmation page.
7. **Blog `/blog`, `/blog/:slug`, `/blog/category/:slug`, `/blog/tag/:slug`** — paginated list, post page with reading time, author, related posts, share links (plain links, no trackers), Article JSON-LD, breadcrumb.
8. **Utility pages:** `/privacy`, `/terms`, `/accessibility` (CMS-editable), custom **404** and **500** pages in brand style, `/sitemap.xml`, `/robots.txt`, `/feed.xml` (blog RSS), `/thank-you`.
9. **SEO landing pages (CRUD'd in CMS):** a generic `pages` content type with template choices (`default`, `landing`, `service-area`) so staff can add pages like "Immigration Help in Delray Beach", "Asylum Help in Palm Beach County", "Ayuda de Inmigración en Español" without code. Seed 3 as examples with unique, non-spammy copy.

Global components: header (logo, nav, Call Now), mobile sticky action bar, footer (logo, nav columns, contact block, hours, social links managed in CMS, **the disclaimer**), cookie notice only if any non-essential cookies are used (aim for none: no trackers by default; analytics ID is an optional CMS setting that, when set, loads after consent).

---

## 4. ADMIN CMS + DASHBOARD (`/admin`) — full control

Clean, minimal admin: left sidebar (logo, nav), top bar (search, user menu), responsive down to tablet, usable on phone. Same design tokens as the public site, no heavy admin framework.

**Dashboard `/admin`:** stat cards (new appointment requests, unread contact messages, published posts, drafts), upcoming appointments list, latest messages, recent activity log, quick actions (New post, New page, Add closed date), simple 30-day charts for form submissions and page views (own lightweight, privacy-friendly, cookieless, IP-hashed pageview counter — no third-party analytics), and a system health strip (DB size, last backup, SMTP configured yes/no).

**Modules (each with list view + search + filter + sort + pagination, create/edit/delete with confirmation, bulk actions where useful, validation errors inline, flash messages, autosave drafts where it makes sense):**

1. **Blog posts** — title, slug (auto, editable, unique), rich-text body, excerpt, featured image + alt text, categories, tags, author, status (draft / scheduled / published), publish date (scheduled posts go live automatically via an in-process scheduler), SEO fields (meta title, meta description, canonical, OG image, noindex toggle), live SERP preview, word count, revision history (last 20 revisions with restore).
2. **Blog categories & tags** — CRUD.
3. **Pages (SEO landing pages + legal pages)** — same editor and SEO fields; template select; sections; nested slug support; publish/draft; revisions.
4. **Services** — CRUD of the 14 services with all fields from §3; drag-or-arrow reorder; publish toggle.
5. **Attorney profile** — single editable profile (all fields in §3.4).
6. **Home & About content blocks** — structured, labeled fields (hero headline, body, buttons text/links, value words, how-it-works steps, FAQ items CRUD, CTA band) so the client can edit any text without touching code.
7. **FAQs** — CRUD, assignable to pages/services; emits FAQPage JSON-LD.
8. **Testimonials** — CRUD with approved flag (render only when at least one approved; never invent testimonials in seed data).
9. **Appointments** — list/calendar-ish agenda view, status changes, internal notes, reschedule, email the client from a template, export CSV, closed dates and weekly capacity settings.
10. **Messages (contact form inbox)** — read/unread, star, archive, reply-by-email link, notes, export CSV, spam folder.
11. **Media library** — upload (images/PDF), sharp processing (resize, WebP, strip EXIF), alt text required for images, usage tracking, delete protection if in use, search.
12. **Navigation & footer** — edit menu items, order, external/internal, footer columns, social links.
13. **Redirects** — CRUD of 301/302 rules (SEO safety when slugs change; auto-create a redirect when a slug is edited).
14. **SEO center** — global defaults (title template, default OG image, site name), per-page SEO audit table (missing meta, duplicate titles, too-long descriptions, missing alt text, noindex pages), edit `robots.txt` additions, sitemap regenerate/preview, verification meta tags (Google/Bing), organization schema data (name, logo, address, phone, hours, sameAs).
15. **Settings** — all §0 business facts, hours, SMTP (stored encrypted at rest or env-only), notification recipients, timezone (`America/New_York`), appointment slot length/capacity, maintenance mode toggle, analytics ID, social links.
16. **Users & roles** — roles: **Owner** (all), **Editor** (content, no settings/users), **Staff** (appointments + messages only). Invite/create user, reset password, disable user, force password change on first login, 2FA (TOTP via `otplib` + QR) optional-but-encouraged per user, enforce for Owner.
17. **Audit log** — who did what and when (login, failed login, content create/update/delete, settings changes, user changes), filterable, immutable from the UI.
18. **Backups & export** — one-click download of DB + uploads as a zip, plus `scripts/backup.js` for cron, retention of last 14, restore instructions in the README.

---

## 5. SECURITY (treat the client's visitors as vulnerable; this site collects immigration-related inquiries)

Implement all of the following and write tests/checks for the critical ones:

- **Auth:** argon2id password hashing, min 12 chars + strength check, login rate limit + progressive lockout, generic error messages, constant-time compare, session cookie `HttpOnly; Secure (prod); SameSite=Lax`, session rotation on login, idle (30 min) + absolute (12 h) timeout, logout invalidates server-side, optional TOTP 2FA with recovery codes, password reset by emailed single-use expiring token (hashed in DB), force-change default password. The seed creates the Owner from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` (refuse to start in production with the default/empty value).
- **Authorization:** role checks on every admin route server-side (not just hidden UI), object-level checks, deny by default.
- **CSRF** on all state-changing requests; **helmet** with a real CSP (self only; no inline scripts — use nonces; whitelist nothing third-party), HSTS, `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` minimal, frame-ancestors none.
- **Input/Output:** validate every input server-side, parameterized queries only, `sanitize-html` on rich text with a strict allowlist, escape all template output by default, safe-redirect handling (`next=` only to same-origin paths).
- **Uploads:** MIME + magic-byte check, extension allowlist, size caps, random filenames, stored outside the code path, served with `nosniff`, SVG disallowed (or sanitized), no executable types, image re-encoding with sharp.
- **Public forms:** honeypot field + time-to-submit check + per-IP rate limit + optional hCaptcha/Turnstile hook behind a setting (off by default to avoid third-party calls), server-side spam scoring, email header-injection protection, input length caps, consent checkbox stored with timestamp.
- **Privacy:** minimize PII, never log message bodies or full IPs (hash IPs with a rotating salt), data-retention setting (auto-purge messages/appointments older than N months, default off, configurable), "delete this person's data" admin action, no third-party trackers, privacy policy seeded plainly. Because the audience may be sensitive about immigration status, the forms must **never ask for immigration status, A-numbers, SSNs, passport numbers, or case details** — add visible helper text: "Please don't include sensitive details like your A-Number, SSN, or case information in this form. We'll discuss those in private."
- **Ops:** `.env` never committed (`.gitignore`), `.env.example` with every variable documented, `npm audit` clean or documented, structured error handling (no stack traces to clients), request-size limits, trust-proxy config for deployment behind nginx, graceful shutdown, health endpoint `/healthz`, DB file permissions note, security headers verified with a script.
- Add `SECURITY.md` with the threat model summary and a checklist for go-live.

---

## 6. SEO (technical + on-page, built in, not bolted on)

- Unique `<title>` (template `%s | Vista Immigrant Support Inc.`) and meta description on every page; canonical URLs; `robots` meta controlled per page; clean slugs; breadcrumbs with `BreadcrumbList` JSON-LD.
- **JSON-LD:** `Organization` + `LocalBusiness`/`ProfessionalService` (name, logo, address 100 E Linton Blvd, Delray Beach, FL 33483, phone, email, `openingHoursSpecification` Mon–Sat 9–17, `areaServed`, `sameAs`), `WebSite`, `Article`/`BlogPosting` on posts, `FAQPage` where FAQs exist, `Service` on service pages, `Person` on the attorney page (only populated fields). Valid per Google Rich Results rules; do not fake reviews/ratings.
- Open Graph + Twitter cards with a per-page image falling back to the generated default.
- `sitemap.xml` generated from the DB (published + indexable only, with `lastmod`, and `xhtml:link` alternates if Spanish exists), `robots.txt` (disallow `/admin`, link the sitemap), RSS feed, redirects table honored before 404, trailing-slash and lowercase normalization, 301 `www`/non-`www` per config.
- Performance as SEO: server-side gzip/brotli, long-cache fingerprinted assets, `loading="lazy"` + explicit `width`/`height` on images, responsive `srcset`, WebP, preload the LCP image/font, no layout shift, critical CSS inlined on the home page if simple, zero render-blocking third-party requests.
- Content SEO: seed copy targets real queries naturally ("immigration help Delray Beach", "asylum application assistance Palm Beach County", "work permit EAD help", "traducción de documentos de inmigración") without keyword stuffing. Seed 5 genuinely useful blog posts (400–700 words each, plain-language, no legal-outcome promises, each ending with a soft CTA and a "general information, not legal advice" note): e.g., "What happens at a master calendar hearing", "Work permits (EAD): the basics", "What to bring to a USCIS interview", "What is a Request for Evidence (RFE) and what to do next", "How interpreters and translators help at your appointment". Mark all seeded content as editable drafts-for-review in `DECISIONS.md`; flag that the attorney should review legal-topic copy before launch.
- Analytics-free SEO health check: an admin page and a `npm run seo:check` script that crawls the local site and reports missing titles/descriptions, duplicate titles, missing alt, broken internal links, missing canonicals, and orphan pages.

---

## 7. DATABASE (SQLite, migrations + seed)

Provide versioned migrations (`/src/db/migrations`) and an idempotent `npm run seed`. Tables at minimum: `users`, `sessions`, `roles`, `settings`, `pages`, `page_revisions`, `posts`, `post_revisions`, `categories`, `tags`, `post_tags`, `services`, `faqs`, `testimonials`, `attorney_profile`, `content_blocks`, `nav_items`, `media`, `appointments`, `closed_dates`, `messages`, `redirects`, `audit_log`, `pageviews_daily`, `password_resets`, `totp_secrets`. Add sensible indexes (slugs, status, dates), `created_at/updated_at`, soft-delete where recovery matters (posts, pages, messages).

---

## 8. EMAIL

Nodemailer with SMTP from `.env`; if SMTP isn't configured, log emails to a dev outbox visible in admin (so nothing silently fails). Templates (HTML + text, branded with the logo): appointment received, appointment confirmed/rescheduled/cancelled, contact notification to office, password reset, user invite. Include the footer disclaimer and office contact info in client-facing emails.

---

## 9. EXECUTION PLAN — follow in this order, verify at each checkpoint

1. **Foundation (≈5 min):** init project, install deps, folder layout, `.env.example`, DB + migrations, config, error handling, logging, base layout, design tokens, process the logo + favicons + OG image from the Downloads file.
2. **Security core (≈5 min):** helmet/CSP, sessions, CSRF, rate limits, auth (login/logout, argon2, roles), user seed. **Checkpoint:** log in, hit a protected route logged out → redirect.
3. **Public site shell (≈8 min):** header/footer/disclaimer/sticky mobile bar, Home, About, Services (+ detail), Attorney, Contact, 404/500, SEO partial with meta + JSON-LD. **Checkpoint:** every page returns 200, validates, looks right at 390px and 1440px.
4. **Forms + appointments (≈6 min):** contact + appointment flows, validation, anti-spam, emails/outbox, confirmation + `.ics`.
5. **Admin CMS (≈15 min):** layout, dashboard, then modules in this order: Services, Pages, Posts (+ categories/tags, editor, revisions, scheduling), Attorney, Content blocks, FAQs, Testimonials, Appointments, Messages, Media, Navigation, Redirects, SEO center, Settings, Users, Audit log, Backups.
6. **Blog + SEO outputs (≈5 min):** blog public pages, sitemap, robots, RSS, redirects, JSON-LD, hreflang/i18n scaffold.
7. **Seed content (≈4 min):** all settings, 14 services, attorney placeholder profile, 3 landing pages, 5 blog posts, FAQs, nav, content blocks, Owner account.
8. **QA + hardening (≈10 min):** run the checklist in §10, fix everything found, write README.

---

## 10. DEFINITION OF DONE — verify and report each line (pass/fail, with evidence)

- [ ] `npm install && npm run seed && npm start` works from a clean clone; admin reachable at `/admin`.
- [ ] All 6 requested pages exist and are linked: Home, About Us, Immigration Services, Meet Our Attorney, Contact Us, Schedule an Appointment.
- [ ] Logo appears in header, footer, admin, favicon, OG image; image derived from the Downloads file.
- [ ] Address shows as **100 E Linton Blvd, Delray Beach, FL 33483** everywhere, **no suite number anywhere** (grep the entire repo + DB seed to confirm).
- [ ] **CALL NOW — 561-567-7970**, **SCHEDULE AN APPOINTMENT**, **CONTACT US** are prominent on Home; Call Now is persistent in header and mobile bar and uses a `tel:` link.
- [ ] Footer disclaimer present, verbatim, on every public page and in client emails.
- [ ] Flags displayed in a diverse, tasteful strip + grid; accessible; no layout shift.
- [ ] All 14 services seeded with detail pages, correctly labeled legal vs support.
- [ ] Everything on the public site is editable from admin; no marketing text hardcoded in templates.
- [ ] Posts: create, edit, schedule, publish, unpublish, delete, restore from revision; categories/tags; SEO fields; sitemap updates automatically.
- [ ] Appointments: submit → validates hours/closed dates/capacity → emails/outbox → admin status workflow → CSV export.
- [ ] Roles enforced server-side (test as Staff trying to open `/admin/settings` → 403).
- [ ] CSRF, rate limiting, CSP, session timeouts, upload restrictions, and sanitization each verified with a quick script or manual test and listed in `SECURITY.md`.
- [ ] Lighthouse (mobile) on Home, Services, a blog post: Perf ≥ 90, A11y ≥ 95, BP ≥ 95, SEO ≥ 95 — report actual numbers.
- [ ] `npm run seo:check` passes; JSON-LD validated; sitemap + robots + RSS correct.
- [ ] No third-party requests on page load (verify in network tab); fonts/icons/flags self-hosted.
- [ ] Looks right at 360 / 768 / 1440; keyboard-only navigation works; no console errors.
- [ ] `README.md` (setup, env vars, deploy on a VPS with nginx + pm2, backups/restore, how the client edits content) and `DECISIONS.md` (assumptions, attorney-name discrepancy, items needing client/attorney review: portrait, bio, credentials, Spanish disclaimer translation, legal copy review, SMTP credentials, social links, domain).

## 11. FINAL REPORT FORMAT

When finished, reply with: (1) how to run it, (2) admin login method (do not print the password in chat — tell me which `.env` variable holds it), (3) the checklist above with pass/fail, (4) a short list of things the client must supply or review before launch, (5) anything you cut for time and how to add it. Be honest about anything not verified.
