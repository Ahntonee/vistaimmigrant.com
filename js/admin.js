(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // sidebar toggle on small screens
  var side = $('#side'), tog = $('#side-toggle');
  if (tog) tog.addEventListener('click', function () { var o = side.classList.toggle('open'); tog.setAttribute('aria-expanded', String(o)); });

  // confirm destructive actions (CSP forbids inline onclick)
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-confirm]');
    if (el && !window.confirm(el.getAttribute('data-confirm'))) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  $$('[data-autosubmit]').forEach(function (s) { s.addEventListener('change', function () { s.form.submit(); }); });
  var all = $('[data-checkall]');
  if (all) all.addEventListener('change', function () { $$('input[name=ids]').forEach(function (c) { c.checked = all.checked; }); });

  // ---------- rich text editor (no external deps; output is sanitized on the server) ----------
  var BTNS = [
    ['B', 'bold', 'Bold'], ['I', 'italic', 'Italic'], ['H2', 'h2', 'Heading'], ['H3', 'h3', 'Subheading'], ['¶', 'p', 'Paragraph'],
    ['• List', 'ul', 'Bulleted list'], ['1. List', 'ol', 'Numbered list'], ['“ ”', 'quote', 'Quote'], ['Link', 'link', 'Insert link'],
    ['Image', 'image', 'Insert image from media library'], ['Clear', 'clear', 'Clear formatting'],
  ];
  function initRte(box) {
    var ta = $('textarea', box), bar = document.createElement('div'), area = document.createElement('div');
    bar.className = 'rte-bar'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Text formatting');
    area.className = 'rte-area'; area.contentEditable = 'true'; area.setAttribute('role', 'textbox'); area.setAttribute('aria-multiline', 'true');
    area.setAttribute('aria-label', ($('label[for=' + ta.id + ']') || {}).textContent || 'Content');
    area.innerHTML = ta.value;
    BTNS.forEach(function (b) {
      var btn = document.createElement('button'); btn.type = 'button'; btn.textContent = b[0]; btn.title = b[2]; btn.setAttribute('aria-label', b[2]);
      btn.addEventListener('mousedown', function (e) { e.preventDefault(); });
      btn.addEventListener('click', function () { cmd(b[1]); area.focus(); });
      bar.appendChild(btn);
    });
    box.insertBefore(bar, ta); box.insertBefore(area, ta);
    function cmd(c) {
      if (c === 'bold' || c === 'italic') document.execCommand(c);
      else if (c === 'h2' || c === 'h3' || c === 'p') document.execCommand('formatBlock', false, c);
      else if (c === 'quote') document.execCommand('formatBlock', false, 'blockquote');
      else if (c === 'ul') document.execCommand('insertUnorderedList');
      else if (c === 'ol') document.execCommand('insertOrderedList');
      else if (c === 'clear') { document.execCommand('removeFormat'); document.execCommand('formatBlock', false, 'p'); }
      else if (c === 'link') { var u = window.prompt('Link address (https://…, tel:, or /page)'); if (u) document.execCommand('createLink', false, u); }
      else if (c === 'image') { openPicker(function (m) { area.focus(); document.execCommand('insertHTML', false, '<img src="' + m.url + '" alt="' + (m.alt || '').replace(/"/g, '&quot;') + '">'); }); }
    }
    area.addEventListener('paste', function (e) { // paste as plain text; keeps pasted junk out
      e.preventDefault(); var t = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, t);
    });
    var sync = function () { ta.value = area.innerHTML; };
    area.addEventListener('input', sync); area.addEventListener('blur', sync);
    ta.form.addEventListener('submit', sync);
  }
  $$('[data-rte]').forEach(initRte);

  // ---------- media picker ----------
  var dlg = $('#picker'), grid = $('#pgrid'), pickCb = null;
  function openPicker(cb) {
    if (!dlg) return;
    pickCb = cb; grid.textContent = 'Loading…';
    fetch('/admin/media.json', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (items) {
      grid.textContent = '';
      items.filter(function (m) { return !/\.pdf$/.test(m.url); }).forEach(function (m) {
        var b = document.createElement('button'); b.type = 'button'; b.title = m.alt || m.filename;
        var i = document.createElement('img'); i.src = m.url; i.alt = m.alt || m.filename; b.appendChild(i);
        b.addEventListener('click', function () { dlg.close(); if (pickCb) pickCb(m); });
        grid.appendChild(b);
      });
      if (!grid.children.length) grid.textContent = 'No images yet. Upload some in the media library.';
    });
    dlg.showModal();
  }
  var pc = $('#picker-close'); if (pc) pc.addEventListener('click', function () { dlg.close(); });
  $$('[data-pick]').forEach(function (b) {
    b.addEventListener('click', function () {
      var input = document.getElementById(b.getAttribute('data-pick'));
      openPicker(function (m) { input.value = m.url; input.dispatchEvent(new Event('input', { bubbles: true }));
        var alt = document.getElementById('f-featured_alt'); if (alt && !alt.value && m.alt) alt.value = m.alt; });
    });
  });

  // ---------- SEO preview + counters + slug helper ----------
  var form = $('#edit-form');
  if (form) {
    var meta = {}; try { meta = JSON.parse($('#site-meta').textContent); } catch (e) { /* ignore */ }
    var f = function (n) { return document.getElementById('f-' + n); };
    var title = f('title') || f('name'), slug = f('slug'), mt = f('meta_title'), md = f('meta_description');
    var slugTouched = !!(slug && slug.value);
    var slugify = function (s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80); };
    if (slug) slug.addEventListener('input', function () { slugTouched = true; });
    if (title && slug) title.addEventListener('input', function () { if (!slugTouched) slug.value = slugify(title.value); update(); });
    var cut = function (s, n) { return s.length > n ? s.slice(0, n - 1).trim() + '…' : s; };
    function update() {
      var u = $('#serp-u'), t = $('#serp-t'), d = $('#serp-d'); if (!u) return;
      var tt = (mt && mt.value) || (title && title.value) || '';
      var full = (meta.title || '%s').replace('%s', tt);
      u.textContent = (meta.site || '') + (meta.base || '/') + (slug ? slug.value : '');
      t.textContent = cut(full, 62); d.textContent = cut((md && md.value) || '', 160) || 'No custom description — a default is generated from the page text.';
      [['meta_title', 60], ['meta_description', 160]].forEach(function (p) {
        var el = f(p[0]), c = $('[data-count-for=f-' + p[0] + ']'); if (!el || !c) return;
        c.textContent = el.value.length + ' / ' + p[1]; c.className = 'cnt' + (el.value.length > p[1] ? ' bad' : '');
      });
    }
    ['title', 'name', 'slug', 'meta_title', 'meta_description'].forEach(function (n) { var el = f(n); if (el) el.addEventListener('input', update); });
    update();
  }

  // warn about unsaved changes
  var dirty = false;
  if (form) {
    form.addEventListener('input', function () { dirty = true; });
    form.addEventListener('submit', function () { dirty = false; });
    window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  }
})();
