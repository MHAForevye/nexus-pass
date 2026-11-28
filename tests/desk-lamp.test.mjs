import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

function bootLamp(initialStorage = null) {
  const listeners = {};
  const attrs = {};
  const head = {
    style: {},
    addEventListener(name, fn) { listeners[name] = fn; },
    setAttribute(name, value) { attrs[name] = String(value); },
    setPointerCapture(id) { this.captured = id; }
  };
  const light = { attrs: {}, setAttribute(name, value) { this.attrs[name] = String(value); } };
  const svg = {
    createSVGPoint() {
      return { x: 0, y: 0, matrixTransform() { return this; } };
    },
    getScreenCTM() { return { inverse() { return {}; } }; }
  };
  const value = { textContent: '' };
  const elements = { lampHead: head, lampLight: light, lampSvg: svg, lampAngleValue: value };
  const storage = new Map();
  if (initialStorage !== null) storage.set('nexus-pass-lamp-angle', String(initialStorage));
  const context = {
    document: { getElementById(id) { return elements[id] || null; } },
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, val) { storage.set(key, String(val)); }
    },
    Number, Math
  };
  vm.runInNewContext(read('assets/desk-lamp.js'), context, { filename: 'desk-lamp.js' });
  return { listeners, attrs, head, light, value, storage };
}

test('lamp head and beam stay in sync at the fixed arm-end hinge', () => {
  const lamp = bootLamp();
  assert.equal(lamp.attrs.transform, 'rotate(-18 145 190)');
  assert.equal(lamp.light.attrs.transform, lamp.attrs.transform);

  lamp.listeners.pointerdown({ button: 0, pointerId: 7, clientX: 145, clientY: 100, preventDefault() {} });
  lamp.listeners.pointermove({ pointerId: 7, clientX: 180, clientY: 100 });
  assert.notEqual(lamp.attrs.transform, 'rotate(-18 145 190)');
  assert.equal(lamp.light.attrs.transform, lamp.attrs.transform);
  assert.equal(lamp.head.captured, 7);
  assert.ok(Math.abs(Number(lamp.storage.get('nexus-pass-lamp-angle')) - Number(lamp.attrs['aria-valuenow'])) < 0.5);
  lamp.listeners.pointerup({ pointerId: 7 });
});

test('lamp angle can be restored and controlled from keyboard', () => {
  const lamp = bootLamp(24);
  assert.equal(lamp.attrs.transform, 'rotate(24 145 190)');
  lamp.listeners.keydown({ key: 'ArrowLeft', preventDefault() {} });
  assert.equal(lamp.attrs.transform, 'rotate(22 145 190)');
  lamp.listeners.keydown({ key: 'Home', preventDefault() {} });
  assert.equal(lamp.attrs.transform, 'rotate(-18 145 190)');
  assert.equal(lamp.value.textContent, '−18°');
});

test('lamp has no lower slider/control rail and shade is mechanically tied to its hinge', () => {
  const html = read('index.html');
  const js = read('assets/desk-lamp.js');
  assert.doesNotMatch(html, /lamp-controls|lampReset|type="range"/);
  assert.match(html, /id="lampHead"[^>]+aria-valuemin="-48"/);
  assert.match(html, /M145 166 L145 190/);
  assert.match(js, /var pivot = \{ x: 145, y: 190 \}/);
});

test('Kristal UI uses the custom faceted gem asset instead of a generic diamond glyph', () => {
  const icon = read('assets/crystal.svg');
  const app = read('assets/app.js');
  const ui = read('assets/kr-ui.js');
  assert.match(icon, /linearGradient/);
  assert.match(icon, /<path/);
  assert.match(app, /assets\/crystal\.svg/);
  assert.match(ui, /assets\/crystal\.svg/);
  assert.doesNotMatch(ui, /◆/);
});

test('Kristal amounts render the gem image in shopping and account views', () => {
  const document = { addEventListener() {}, querySelector() { return null; } };
  const window = { KR: {
    S() { return { bal: 72, id: '8414706', last: '', passes: [], zpasses: [], rpasses: [], reqs: [], pending: null }; },
    mantarCfg() { return { days: 7, tiers: [{ id: 'pro', name: 'Pro', cost: 20 }] }; },
    zamanCfg() { return { tiers: [], plans: [], save7: {} }; },
    retroCfg() { return { tiers: [], plans: [], save7: {} }; },
    cfg() { return { packs: [] }; }, app: 'Astrophoto Cam', offline() { return false; }, today() { return 'today'; },
    zTier() { return null; }, rTier() { return null; }, zSave() { return 0; }, rSave() { return 0; }
  } };
  const IC = new Proxy({}, { get: (_, n) => `<svg class="ic"><use href="#i-${String(n)}"/></svg>` });
  vm.runInNewContext(read('assets/kr-ui.js'), { document, window, IC, console, Promise, setTimeout, clearTimeout });
  const shop = window.KRUI.shop();
  const account = window.KRUI.homeCard();
  assert.match(shop, /<img src="assets\/crystal\.svg" alt="">/);
  assert.doesNotMatch(shop, /&lt;img/);
  assert.match(account, /<img src="assets\/crystal\.svg" alt="">/);
});
