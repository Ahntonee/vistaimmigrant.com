const db = require('../db');
const content = require('../content');

const HOURS_SPEC = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => ({
  '@type': 'OpeningHoursSpecification', dayOfWeek: d, opens: '09:00', closes: '17:00',
}));

function orgJsonLd(siteUrl) {
  const g = content.get;
  const same = [g('biz.facebook'), g('biz.instagram')].filter(Boolean);
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': siteUrl + '/#org',
    name: g('biz.name'),
    slogan: g('biz.tagline'),
    url: siteUrl + '/',
    logo: siteUrl + '/img/logo.png',
    image: siteUrl + g('seo.default_og'),
    telephone: '+1-' + g('biz.phone'),
    email: g('biz.email'),
    address: { '@type': 'PostalAddress', streetAddress: g('biz.street'), addressLocality: g('biz.city'), addressRegion: g('biz.state'), postalCode: g('biz.zip'), addressCountry: 'US' },
    areaServed: [{ '@type': 'City', name: 'Delray Beach' }, { '@type': 'AdministrativeArea', name: 'Palm Beach County, Florida' }],
    openingHoursSpecification: HOURS_SPEC,
    ...(same.length ? { sameAs: same } : {}),
  };
}

module.exports = (req, res, next) => {
  res.page = (view, data = {}) => {
    const g = content.get;
    const siteUrl = g('seo.site_url').replace(/\/$/, '');
    const seo = { ...(data.seo || {}) };
    seo.title = seo.title
      ? (seo.raw ? seo.title : g('seo.title_template').replace('%s', seo.title))
      : `${g('biz.name')} | ${g('biz.tagline')}`;
    seo.description = seo.description || g('seo.default_description');
    seo.canonical = seo.canonical || siteUrl + (seo.canonicalPath || req.path);
    const og = seo.image || g('seo.default_og');
    seo.image = /^https?:/.test(og) ? og : siteUrl + og;
    const ld = [orgJsonLd(siteUrl), ...(seo.jsonld || [])];
    if (seo.breadcrumbs && seo.breadcrumbs.length) {
      ld.push({
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: [{ name: 'Home', path: '/' }, ...seo.breadcrumbs].map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: b.name, item: siteUrl + b.path })),
      });
    }
    seo.jsonld = ld;
    const header = db.prepare("SELECT * FROM nav_items WHERE area='header' ORDER BY sort,id").all();
    const footer = db.prepare("SELECT * FROM nav_items WHERE area='footer' ORDER BY sort,id").all();
    res.render('public/' + view, { ...data, seo, flagsRow: FLAGS }, (err, body) => {
      if (err) return next(err);
      res.render('public/layout', { body, seo, headerNav: header, footerNav: footer, siteUrl, pageScript: view === 'appointment' ? '/js/appointment.js?v=1' : undefined }, (e2, html) => {
        if (e2) return next(e2);
        res.type('html').send(html);
      });
    });
  };
  next();
};

// Communities shown in the flag strip. Names are used as accessible labels.
const FLAGS = [
  ['us', 'United States'], ['mx', 'Mexico'], ['ht', 'Haiti'], ['jm', 'Jamaica'], ['br', 'Brazil'], ['es', 'Spain'],
  ['co', 'Colombia'], ['ve', 'Venezuela'], ['ar', 'Argentina'], ['do', 'Dominican Republic'], ['sv', 'El Salvador'],
  ['hn', 'Honduras'], ['gt', 'Guatemala'], ['cu', 'Cuba'], ['ni', 'Nicaragua'], ['pe', 'Peru'], ['ec', 'Ecuador'],
  ['bs', 'Bahamas'], ['ca', 'Canada'], ['ph', 'Philippines'], ['in', 'India'], ['ng', 'Nigeria'], ['gh', 'Ghana'],
  ['cn', 'China'], ['vn', 'Vietnam'], ['ua', 'Ukraine'], ['kr', 'South Korea'], ['pk', 'Pakistan'],
];
module.exports.FLAGS = FLAGS;
