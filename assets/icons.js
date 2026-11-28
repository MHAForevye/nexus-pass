'use strict';
/* Simgeler index.html içindeki SVG sprite'ından gelir: IC.check → <svg class="ic"><use href="#i-check"/></svg> */
window.IC = new Proxy({}, { get: function (_, n) { return typeof n === 'string' ? '<svg class="ic" aria-hidden="true"><use href="#i-' + n + '"/></svg>' : ''; } });
