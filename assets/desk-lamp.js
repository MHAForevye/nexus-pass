'use strict';
/* Warm studio desk lamp. Light output is intentionally fixed; only the head direction moves. */
(function () {
  var head = document.getElementById('lampHead');
  var light = document.getElementById('lampLight');
  var svg = document.getElementById('lampSvg');
  var range = document.getElementById('lampAngle');
  var value = document.getElementById('lampAngleValue');
  var reset = document.getElementById('lampReset');
  if (!head || !svg || !range) return;

  var angle = -20;
  var dragging = false;
  var pointerId = null;
  var dragStartPointer = 0;
  var dragStartHead = -20;
  var pivot = { x: 164, y: 202 };
  var clamp = function (n) { return Math.max(-55, Math.min(55, n)); };

  function paint(next) {
    angle = clamp(Number(next) || 0);
    var transform = 'rotate(' + angle + ' ' + pivot.x + ' ' + pivot.y + ')';
    head.setAttribute('transform', transform);
    if (light) light.setAttribute('transform', transform);
    range.value = String(Math.round(angle));
    if (value) value.textContent = (angle < 0 ? '−' : '+') + Math.abs(Math.round(angle)) + '°';
  }

  function pointerAngle(ev) {
    var p = svg.createSVGPoint();
    p.x = ev.clientX;
    p.y = ev.clientY;
    var ctm = svg.getScreenCTM();
    if (!ctm) return angle;
    p = p.matrixTransform(ctm.inverse());
    // Use the pointer's polar angle around the hinge; positive SVG rotation follows clockwise dragging.
    return Math.atan2(p.y - pivot.y, p.x - pivot.x) * 180 / Math.PI;
  }

  head.style.cursor = 'grab';
  head.style.touchAction = 'none';
  head.addEventListener('pointerdown', function (ev) {
    dragging = true;
    pointerId = ev.pointerId;
    head.setPointerCapture(pointerId);
    head.style.cursor = 'grabbing';
    dragStartPointer = pointerAngle(ev);
    dragStartHead = angle;
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
  range.addEventListener('input', function () { paint(range.value); });
  if (reset) reset.addEventListener('click', function () { paint(-20); });
  var savedAngle = -20;
  try {
    var raw = localStorage.getItem('nexus-pass-lamp-angle');
    if (raw !== null && raw !== '' && Number.isFinite(Number(raw))) savedAngle = clamp(Number(raw));
  } catch (e) {}
  var originalPaint = paint;
  paint = function (next) {
    originalPaint(next);
    try { localStorage.setItem('nexus-pass-lamp-angle', String(angle)); } catch (e) {}
  };
  paint(savedAngle);
})();
