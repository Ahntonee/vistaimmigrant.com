(function () {
  var date = document.getElementById('f-date');
  var slots = document.getElementById('slots');
  var help = document.getElementById('slot-help');
  if (!date || !slots) return;
  date.addEventListener('change', function () {
    if (!date.value) return;
    fetch(date.dataset.slots + '?date=' + encodeURIComponent(date.value), { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var inputs = slots.querySelectorAll('input');
        inputs.forEach(function (i) {
          var s = (d.slots || []).find(function (x) { return x.value === i.value; });
          i.disabled = !!d.closed || !s || s.taken;
          if (i.disabled && i.checked) i.checked = false;
        });
        help.textContent = d.closed ? 'We are closed on that date. Please choose Monday through Saturday.' : 'Struck-through times are already taken.';
      }).catch(function () { /* server re-validates anyway */ });
  });
  if (date.value) date.dispatchEvent(new Event('change'));
})();
