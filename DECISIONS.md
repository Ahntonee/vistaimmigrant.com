# Decisions, assumptions and open items

## Needs the client / attorney before launch
1. **Attorney name — resolved.** The written copy, *Latoya Renae Stephenson, Esq.*, is confirmed as correct and is what the site uses. (The logo artwork's shorter "Latoya Renae, Esq." is not used on the site.)
2. **Attorney portrait, bio, bar admission, education, languages.** None were supplied, so none are invented. The bio is a clearly marked placeholder; bar/education/languages stay hidden until filled in. `Person` structured data only includes fields that are filled.
3. **Legal copy review.** The 14 service pages, 5 blog posts, 3 landing pages, FAQs, privacy policy and terms are general-information drafts. They avoid outcome promises, do not state that Vista gives legal advice, and label legal services as "provided by our licensed attorney for matters accepted." The attorney should read them before launch.
4. **Immigration Document Assistance wording.** Written conservatively (organizing, copying, scanning; *no* choosing forms or advice). Have the attorney confirm this matches what staff may lawfully do in Florida.
5. **Spanish translation of the disclaimer** and the Spanish landing page are mine, not a certified translation. Please have a Spanish speaker / the attorney review.
6. **SMTP credentials**, **social links**, **domain**, and **Public site URL** setting.
7. **Testimonials.** None seeded. Add only feedback the client has permission to publish.
8. **Hours.** Monday–Saturday 9–5, appointment only, as supplied. Appointment slots are 1 hour (9:00–4:00 start times); capacity per slot is a setting (default 1).
9. **Address.** Shown as `100 E Linton Blvd, Delray Beach, FL 33483` everywhere — the suite number was removed per instructions (checked by the test suite).

## Technical decisions
- **Stack.** Express + EJS + SQLite instead of a SPA/Next.js: real HTML for search engines, a single process, and one file to back up. Cheap to host and easy to hand over.
- **Passwords use Node's built-in scrypt, not argon2.** The `argon2` package needs a native compiler toolchain that was not available on the build machine; scrypt (memory-hard, per-user salt) ships with Node and has no native build step. Hash strings are versioned (`scrypt$N$salt$hash`), so swapping algorithms later is straightforward.
- **better-sqlite3 pinned to v11** — the latest major had no prebuilt binary for Node 20 on Windows.
- **Rich-text editor.** A small built-in contenteditable editor (no third-party editor library, no CDN). Output is always sanitized on the server. Not as fancy as TipTap; swap in later if the client wants tables or embeds.
- **Language switch** is cookie-based (`?lang=es`), so there are no separate `/es/` URLs and no `hreflang` alternates yet. Add path-based Spanish routes if Spanish SEO becomes a priority.
- **Scheduled posts** go live at query time (no background job), so they appear exactly at the scheduled minute with no scheduler to fail.
- **Analytics.** Only a cookieless page counter in the dashboard. No third-party analytics script is loaded; the CSP would block one by design.
- **Map.** A link-out to OpenStreetMap / Google Maps instead of an embedded map, so no third-party content loads until a visitor clicks.
- **CAPTCHA** hook not included: honeypot + timing + rate limiting are on by default and require no third party. Add Turnstile/hCaptcha if spam appears.
- **Flags.** Self-hosted SVGs from `flag-icons` (MIT). The logo's own flag arch is also visible in the hero.
- **Logo.** The source file is a JPEG on a black background. `npm run logo` converts it to a transparent PNG/WebP, favicons and a 1200×630 share image. Edge fringing is minimal but a vector/transparent original from the designer would be better.
- **Dashboard charts** are server-rendered SVG (CSP-safe, no chart library).
- **Dependencies.** `npm audit` reported a moderate `sanitize-html` XSS advisory during the build. `npm audit fix` upgraded it to 2.18, whose `htmlparser2@12` is ESM-only and fails `require()` on Node 20.18, so `package.json` has an `overrides` entry pinning `htmlparser2` to `^10` (dual CJS/ESM). `npm audit` is clean and the XSS payload tests pass. If you deploy on Node ≥ 20.19 / 22 you can drop the override.

## Not built (and how to add it)
- Lighthouse numbers on the deployed site (measure on the real domain behind nginx + gzip/brotli).
- Path-based Spanish routes with `hreflang`.
- Per-field translation of CMS content.
- Redis-backed rate limiting for multi-instance deployments.
