// Editable site content & business facts. Defaults here are seeded into the `settings` table;
// templates always read through settings.get(), so nothing marketing-related is hardcoded in views.
const db = require('./db');

const DISCLAIMER =
  "Vista Immigrant Support Inc. is not a law firm. Non-attorney Vista staff do not provide legal advice. Legal advice and legal representation are provided by licensed attorneys for matters they accept. Information provided on this website is general information and is not a substitute for legal advice regarding an individual's specific circumstances.";

const DISCLAIMER_ES =
  'Vista Immigrant Support Inc. no es un bufete de abogados. El personal de Vista que no son abogados no brinda asesoría legal. La asesoría y representación legal son proporcionadas por abogados con licencia en los casos que ellos aceptan. La información en este sitio web es información general y no sustituye la asesoría legal para las circunstancias específicas de cada persona.';

// group, key, label, type, default
const FIELDS = [
  ['Business', 'biz.name', 'Business name', 'text', 'Vista Immigrant Support Inc.'],
  ['Business', 'biz.tagline', 'Tagline', 'text', 'The Immigrant Place — Everyone Is Welcome'],
  ['Business', 'biz.tagline_es', 'Tagline (Spanish)', 'text', 'Todos Son Bienvenidos Aquí'],
  ['Business', 'biz.welcome', 'Welcome line', 'text', 'We welcome everyone regardless of country, culture, language, or background.'],
  ['Business', 'biz.street', 'Street address', 'text', '100 E Linton Blvd'],
  ['Business', 'biz.city', 'City', 'text', 'Delray Beach'],
  ['Business', 'biz.state', 'State', 'text', 'FL'],
  ['Business', 'biz.zip', 'ZIP', 'text', '33483'],
  ['Business', 'biz.phone', 'Phone (display)', 'text', '561-567-7970'],
  ['Business', 'biz.email', 'Email', 'text', 'Vistaimmigrantsupport@gmail.com'],
  ['Business', 'biz.hours', 'Hours (display)', 'text', 'Monday–Saturday, 9:00 AM–5:00 PM'],
  ['Business', 'biz.hours_note', 'Hours note', 'text', 'By Appointment Only'],
  ['Business', 'biz.disclaimer', 'Footer disclaimer (English)', 'textarea', DISCLAIMER],
  ['Business', 'biz.disclaimer_es', 'Footer disclaimer (Spanish — have the attorney review)', 'textarea', DISCLAIMER_ES],
  ['Business', 'biz.facebook', 'Facebook URL', 'text', ''],
  ['Business', 'biz.instagram', 'Instagram URL', 'text', ''],
  ['Business', 'biz.whatsapp', 'WhatsApp number (digits only, optional)', 'text', ''],

  ['Home', 'home.eyebrow', 'Hero eyebrow', 'text', 'THE IMMIGRANT PLACE'],
  ['Home', 'home.title', 'Hero headline', 'text', 'Everyone Is Welcome.'],
  ['Home', 'home.body', 'Hero paragraph', 'textarea', 'At Vista Immigrant Support Inc., everyone is welcome. We provide a welcoming and professional environment where immigrants and their families can receive immigration support and connect with licensed attorneys for legal representation when needed.'],
  ['Home', 'home.motto', 'Motto line', 'text', 'One Community. Many Cultures. Everyone Is Welcome.'],
  ['Home', 'home.hero_image', 'Hero portrait image (leave blank to use the attorney portrait, then the placeholder)', 'text', '/img/hero-handshake.webp'],
  ['Home', 'home.hero_image_alt', 'Hero portrait alt text', 'text', 'A handshake over legal documents, with the scales of justice in the background'],
  ['Home', 'home.btn_call', 'Call button label', 'text', 'Call Now'],
  ['Home', 'home.btn_schedule', 'Schedule button label', 'text', 'Schedule an Appointment'],
  ['Home', 'home.btn_contact', 'Contact button label', 'text', 'Contact Us'],
  ['Home', 'home.flags_title', 'Flags section heading', 'text', 'Families from every corner of the world'],
  ['Home', 'home.flags_body', 'Flags section text', 'textarea', 'Our neighbors come from dozens of countries and speak many languages. You do not need to explain why you are here to be welcome here.'],
  ['Home', 'home.services_title', 'Services heading', 'text', 'How we can help'],
  ['Home', 'home.services_body', 'Services intro', 'textarea', 'Support from our team, and representation from a licensed attorney for matters the attorney accepts.'],
  ['Home', 'home.step1_title', 'Step 1 title', 'text', 'Call or book online'],
  ['Home', 'home.step1_body', 'Step 1 text', 'textarea', 'Reach us by phone or send an appointment request. We are open Monday through Saturday, by appointment.'],
  ['Home', 'home.step2_title', 'Step 2 title', 'text', 'Meet our team'],
  ['Home', 'home.step2_body', 'Step 2 text', 'textarea', 'We listen, explain how our services work, and help you gather and organize your documents.'],
  ['Home', 'home.step3_title', 'Step 3 title', 'text', 'Get connected to an attorney'],
  ['Home', 'home.step3_body', 'Step 3 text', 'textarea', 'When you need legal advice or representation, our licensed attorney can help with matters she accepts.'],
  ['Home', 'home.values', 'Value words (comma separated)', 'text', 'Families, Opportunities, Protection, Brighter Futures, People, Cultures, Communities, Stronger Together'],
  ['Home', 'home.cta_title', 'Closing call-to-action headline', 'text', 'Ready to talk? We will make time for you.'],
  ['Home', 'home.cta_body', 'Closing call-to-action text', 'textarea', 'Call us or request an appointment. If you prefer another language, tell us when you reach out.'],

  ['About', 'about.title', 'About headline', 'text', 'A place where everyone belongs'],
  ['About', 'about.lead', 'About lead paragraph', 'textarea', 'Vista Immigrant Support Inc. is a community-centered office in Delray Beach, Florida. We are here for immigrants and their families, whatever country they come from and whatever language they speak.'],
  ['About', 'about.body', 'About body (HTML allowed)', 'richtext', '<h2>What we do</h2><p>We offer immigration support, help with documents, translation and interpreter services, and guidance and resources for families. When someone needs legal advice or representation, we connect them with a licensed attorney.</p><h2>Who we serve</h2><p>We welcome everyone regardless of country, culture, language, or background. Our community includes families from the Caribbean, Latin America, Africa, Asia, and Europe.</p><h2>How we work with attorneys</h2><p>Legal advice and legal representation are provided only by licensed attorneys, for the matters they accept. Our non-attorney staff do not give legal advice. We make that line clear from the first conversation so you always know who is helping you and how.</p><h2>Our promise</h2><p>You will be treated with dignity and respect. We will explain things in plain language, we will not pressure you, and we will be honest about what we can and cannot do.</p>'],

  ['Attorney', 'attorney.name', 'Attorney name', 'text', 'Latoya Renae Stephenson, Esq.'],
  ['Attorney', 'attorney.photo', 'Portrait (media URL)', 'text', ''],
  ['Attorney', 'attorney.photo_alt', 'Portrait alt text', 'text', 'Portrait of Attorney Latoya Renae Stephenson'],
  ['Attorney', 'attorney.title', 'Headline', 'text', 'Legal representation for immigration matters'],
  ['Attorney', 'attorney.note', 'Representation note', 'textarea', 'Attorney services may include representation before Immigration Court and USCIS for matters accepted by the attorney.'],
  ['Attorney', 'attorney.bio', 'Biography (HTML allowed)', 'richtext', '<p>Attorney Latoya Renae Stephenson provides legal representation in immigration matters for clients of Vista Immigrant Support Inc.</p><p><em>This biography is a placeholder. Please replace it with the attorney\'s own words from the admin dashboard (Site content → Attorney).</em></p>'],
  ['Attorney', 'attorney.areas', 'Practice areas (one per line)', 'textarea', 'Asylum\nWork permits (EAD)\nGreen card / adjustment of status\nFamily-based immigration\nRemoval proceedings\nMotions to reopen and appeals'],
  ['Attorney', 'attorney.bar', 'Bar admission (shown only if filled)', 'text', ''],
  ['Attorney', 'attorney.education', 'Education (shown only if filled)', 'text', ''],
  ['Attorney', 'attorney.languages', 'Languages (shown only if filled)', 'text', ''],

  ['Contact', 'contact.title', 'Contact headline', 'text', 'Talk to us'],
  ['Contact', 'contact.body', 'Contact intro', 'textarea', 'Call, email, or send a message. Our office is open by appointment, Monday through Saturday.'],
  ['Contact', 'contact.helper', 'Sensitive-info warning (shown on forms)', 'text', "Please don't include sensitive details like your A-Number, SSN, or case information in this form. We'll discuss those in private."],

  ['Appointments', 'appt.slot_capacity', 'People per time slot', 'text', '1'],
  ['Appointments', 'appt.notify_email', 'Notify this email on new requests/messages', 'text', 'Vistaimmigrantsupport@gmail.com'],
  ['Appointments', 'appt.intro', 'Appointment intro', 'textarea', 'Request a time and we will confirm by phone or email. Our office is open Monday through Saturday, 9:00 AM–5:00 PM, by appointment only.'],

  ['SEO', 'seo.title_template', 'Title template (%s = page title)', 'text', '%s | Vista Immigrant'],
  ['SEO', 'seo.default_description', 'Default meta description', 'textarea', 'Immigration support, document help, translation and interpreters in Delray Beach, FL, plus connections to a licensed attorney. Everyone is welcome.'],
  ['SEO', 'seo.default_og', 'Default share image', 'text', '/img/og-default.jpg'],
  ['SEO', 'seo.google_verify', 'Google Search Console verification code', 'text', ''],
  ['SEO', 'seo.bing_verify', 'Bing verification code', 'text', ''],
  ['SEO', 'seo.robots_extra', 'Extra robots.txt lines', 'textarea', ''],
  ['SEO', 'seo.site_url', 'Public site URL (https://...)', 'text', 'http://localhost:3000'],

  ['System', 'sys.maintenance', 'Maintenance mode (1 = on)', 'text', '0'],
  ['System', 'sys.retention_months', 'Auto-delete messages & appointments older than N months (0 = never)', 'text', '0'],
];

const cache = new Map();
function load() {
  cache.clear();
  for (const r of db.prepare('SELECT key, value FROM settings').all()) cache.set(r.key, r.value);
}
load();

const defaults = Object.fromEntries(FIELDS.map((f) => [f[1], f[4]]));

function get(key) {
  return cache.has(key) ? cache.get(key) : defaults[key] || '';
}
function set(key, value) {
  db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, String(value));
  cache.set(key, String(value));
}
function seedDefaults() {
  const ins = db.prepare('INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)');
  for (const f of FIELDS) ins.run(f[1], f[4]);
  load();
}

module.exports = { FIELDS, get, set, load, seedDefaults, DISCLAIMER, DISCLAIMER_ES };
