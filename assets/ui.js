'use strict';
/* Ortak arayüz parçaları: onay sayfası ve görünüm (sistem / açık / koyu) seçimi. */
(function () {
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  var lastFocus = null;
  /* UI.confirm({title, body, ok, danger}) → Promise<boolean> */
  function confirmSheet(o) {
    return new Promise(function (resolve) {
      var m = document.getElementById('confirmModal');
      if (!m) { m = document.createElement('div'); m.id = 'confirmModal'; m.className = 'overlay'; document.body.appendChild(m); }
      lastFocus = document.activeElement;
      m.hidden = false;
      m.innerHTML = '<div class="sheet" role="alertdialog" aria-modal="true" aria-labelledby="cfT"><h3 id="cfT">' + esc(o.title) + '</h3>' + (o.body ? '<p class="mut">' + esc(o.body) + '</p>' : '') +
        '<button class="btn primary" id="cfOk" type="button">' + esc(o.ok || 'Devam et') + '</button><button class="btn" id="cfNo" type="button">Vazgeç</button></div>';
      var done = function (v) { m.hidden = true; m.innerHTML = ''; document.removeEventListener('keydown', key); if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) {} resolve(v); };
      var key = function (e) { if (e.key === 'Escape') done(false); };
      document.addEventListener('keydown', key);
      m.onclick = function (e) { if (e.target === m) done(false); };
      document.getElementById('cfOk').onclick = function () { done(true); };
      document.getElementById('cfNo').onclick = function () { done(false); };
      document.getElementById('cfOk').focus();
    });
  }
  /* Görünüm */
  var KEY = 'np.theme', modes = ['system', 'light', 'dark'], names = { system: 'sistem', light: 'açık', dark: 'koyu' }, icons = { system: 'monitor', light: 'sun', dark: 'moon' };
  function get() { try { var v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : 'system'; } catch (e) { return 'system'; } }
  function paint(mode) {
    var r = document.documentElement; if (mode === 'system') delete r.dataset.theme; else r.dataset.theme = mode;
    var b = document.getElementById('themeBtn');
    if (b) { b.innerHTML = window.IC[icons[mode]]; b.setAttribute('aria-label', 'Görünüm: ' + names[mode] + '. Değiştirmek için dokun.'); b.title = 'Görünüm: ' + names[mode]; }
  }
  function cycle() { var n = modes[(modes.indexOf(get()) + 1) % 3]; try { if (n === 'system') localStorage.removeItem(KEY); else localStorage.setItem(KEY, n); } catch (e) {} paint(n); if (window.KR && KR.toast) KR.toast('Görünüm: ' + names[n]); }
  window.UI = { confirm: confirmSheet };
  document.addEventListener('DOMContentLoaded', function () { paint(get()); var b = document.getElementById('themeBtn'); if (b) b.onclick = cycle; });
})();
