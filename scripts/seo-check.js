// Crawls a running site and reports on-page SEO problems.  Usage: BASE_URL=http://localhost:3000 npm run seo:check
const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const get = async (u) => { const r = await fetch(u.startsWith('http') ? u : BASE + u, { redirect: 'manual' }); return { status: r.status, text: r.status === 200 ? await r.text() : '', loc: r.headers.get('location') }; };

(async () => {
  const sm = await get('/sitemap.xml');
  if (sm.status !== 200) { console.error('Cannot read sitemap at', BASE); process.exit(1); }
  const urls = [...new Set([...sm.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/^https?:\/\/[^/]+/, '') || '/'))];
  const problems = [], titles = {}, linkedFrom = {}, checked = new Map();
  for (const p of urls) {
    const r = await get(p);
    if (r.status !== 200) { problems.push(`${p}: returned ${r.status} (listed in sitemap)`); continue; }
    const html = r.text;
    const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
    const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
    const h1s = (html.match(/<h1[\s>]/g) || []).length;
    if (!title) problems.push(`${p}: missing <title>`);
    if (title.length > 65) problems.push(`${p}: title is ${title.length} chars (aim ≤ 60)`);
    (titles[title] = titles[title] || []).push(p);
    if (!desc) problems.push(`${p}: missing meta description`);
    else if (desc.length < 70 || desc.length > 175) problems.push(`${p}: description is ${desc.length} chars (aim 70–160)`);
    if (h1s !== 1) problems.push(`${p}: ${h1s} <h1> elements (want exactly 1)`);
    if (!/<link rel="canonical" href="[^"]+"/.test(html)) problems.push(`${p}: missing canonical`);
    if (!/<html lang="/.test(html)) problems.push(`${p}: missing lang attribute`);
    for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\balt=/.test(m[0])) problems.push(`${p}: image without alt attribute: ${m[0].slice(0, 70)}`);
    for (const m of html.matchAll(/<a\b[^>]*href="(\/[^"#?]*)(?:[?#][^"]*)?"/g)) {
      const href = m[1].replace(/\/$/, '') || '/';
      (linkedFrom[href] = linkedFrom[href] || new Set()).add(p);
      if (!checked.has(href) && !/^\/(admin|uploads|img|css|js|fonts|flags|feed\.xml|sitemap\.xml|robots\.txt)/.test(href) && !/\.(ics|xml|pdf)$/.test(href)) {
        const lr = await get(href); checked.set(href, lr.status);
        if (lr.status >= 400) problems.push(`${p}: broken internal link ${href} → ${lr.status}`);
      }
    }
  }
  for (const [t, ps] of Object.entries(titles)) if (ps.length > 1) problems.push(`Duplicate title "${t}" on ${ps.join(', ')}`);
  for (const p of urls) if (p !== '/' && !linkedFrom[p]) problems.push(`${p}: orphan page (in sitemap but no internal links point to it)`);
  console.log(`Crawled ${urls.length} URLs and ${checked.size} internal links on ${BASE}`);
  if (problems.length) { console.log(`\n${problems.length} issue(s):`); problems.forEach((x) => console.log(' - ' + x)); process.exit(1); }
  console.log('No SEO issues found.');
})();
