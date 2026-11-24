'use strict';
/* The lamp stays illuminated. The shade and beam rotate together around the fixed arm-end hinge. */
(function () {
  var head = document.getElementById('lampHead');
  var light = document.getElementById('lampLight');
  var svg = document.getElementById('lampSvg');
  var value = document.getElementById('lampAngleValue');
  if (!head || !svg) return;

  var DEFAULT_ANGLE = -18;
  var MIN_ANGLE = -48;
  var MAX_ANGLE = 48;
  var angle = DEFAULT_ANGLE;
  var dragging = false;
  var pointerId = null;
  var dragStartPointer = 0;
  var dragStartHead = DEFAULT_ANGLE;
  var pivot = { x: 145, y: 190 };

  function clamp(n) { return Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, n)); }
  function format(n) { return (n < 0 ? '−' : '+') + Math.abs(Math.round(n)) + '°'; }

  function paint(next) {
    angle = clamp(Number(next) || 0);
    var transform = 'rotate(' + angle + ' ' + pivot.x + ' ' + pivot.y + ')';
    head.setAttribute('transform', transform);
    if (light) light.setAttribute('transform', transform);
    head.setAttribute('aria-valuenow', String(Math.round(angle)));
    head.setAttribute('aria-valuetext', format(angle));
    if (value) value.textContent = format(angle);
    try { localStorage.setItem('nexus-pass-lamp-angle', String(angle)); } catch (e) {}
  }

  function pointerAngle(ev) {
    var point = svg.createSVGPoint();
    point.x = ev.clientX;
    point.y = ev.clientY;
    var matrix = svg.getScreenCTM();
    if (!matrix) return 0;
    point = point.matrixTransform(matrix.inverse());
    return Math.atan2(point.y - pivot.y, point.x - pivot.x) * 180 / Math.PI;
  }

  head.style.cursor = 'grab';
  head.style.touchAction = 'none';
  head.addEventListener('pointerdown', function (ev) {
    if (ev.button !== undefined && ev.button !== 0) return;
    dragging = true;
    pointerId = ev.pointerId;
    dragStartPointer = pointerAngle(ev);
    dragStartHead = angle;
    if (head.setPointerCapture) head.setPointerCapture(pointerId);
    head.style.cursor = 'grabbing';
    ev.preventDefault();
  });
  head.addEventListener('pointermove', function (ev) {
    if (!dragging || ev.pointerId !== pointerId) return;
    var delta = pointerAngle(ev) - dragStartPointer;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    paint(dragStartHead + delta);
  });

  function stop(ev) {
    if (!dragging || (ev && ev.pointerId !== pointerId)) return;
    dragging = false;
    pointerId = null;
    head.style.cursor = 'grab';
  }
  head.addEventListener('pointerup', stop);
  head.addEventListener('pointercancel', stop);
  head.addEventListener('lostpointercapture', stop);
  head.addEventListener('dblclick', function () { paint(DEFAULT_ANGLE); });
  head.addEventListener('keydown', function (ev) {
    if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') { paint(angle - 2); ev.preventDefault(); }
    else if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') { paint(angle + 2); ev.preventDefault(); }
    else if (ev.key === 'Home') { paint(DEFAULT_ANGLE); ev.preventDefault(); }
  });

  var initial = DEFAULT_ANGLE;
  try {
    var saved = localStorage.getItem('nexus-pass-lamp-angle');
    if (saved !== null && saved !== '' && Number.isFinite(Number(saved))) initial = clamp(Number(saved));
  } catch (e) {}
  paint(initial);
})();
