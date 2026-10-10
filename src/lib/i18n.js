// Small UI-string layer. English is complete; Spanish covers navigation, CTAs, forms and the footer.
// Anything missing in Spanish falls back to English. CMS-managed copy stays in the language it was written in.
const es = {
  'nav.home': 'Inicio', 'nav.about': 'Nosotros', 'nav.services': 'Servicios', 'nav.attorney': 'Nuestra abogada',
  'nav.contact': 'Contacto', 'nav.schedule': 'Pedir una cita', 'nav.blog': 'Blog',
  'cta.call': 'Llamar ahora', 'cta.book': 'Pedir cita', 'cta.schedule': 'Pedir una cita', 'cta.contact': 'Contáctenos', 'cta.services': 'Ver todos los servicios',
  'cta.send': 'Enviar mensaje', 'cta.request': 'Solicitar cita', 'cta.read': 'Leer más',
  'foot.visit': 'Visítenos', 'foot.hours': 'Horario', 'foot.explore': 'Explorar', 'foot.rights': 'Todos los derechos reservados.',
  'foot.privacy': 'Privacidad', 'foot.terms': 'Términos', 'foot.access': 'Accesibilidad',
  'form.name': 'Nombre completo', 'form.phone': 'Teléfono', 'form.email': 'Correo electrónico', 'form.language': 'Idioma preferido',
  'form.subject': 'Asunto', 'form.message': 'Mensaje', 'form.service': 'Servicio de interés', 'form.date': 'Fecha preferida',
  'form.time': 'Horario preferido', 'form.note': 'Nota breve (opcional)',
  'form.consent': 'Acepto que Vista Immigrant Support Inc. me contacte sobre esta solicitud.',
  'home.how': 'Cómo funciona', 'home.attorney': 'Conozca a nuestra abogada', 'home.latest': 'Del blog', 'home.faq': 'Preguntas frecuentes',
  'skip': 'Saltar al contenido', 'menu': 'Menú', 'by_appt': 'Solo con cita',
};
const T = { es };
function make(lang) {
  const l = lang === 'es' ? 'es' : 'en';
  const en = require('./en');
  return (k) => (l === 'es' && T.es[k]) || en[k] || k;
}
module.exports = { make };
