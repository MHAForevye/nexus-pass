import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const H = createRequire(import.meta.url)('../assets/hesap.js');
const ID = '12345678', TK = 'abcDEF0123456789_-xyz';

test('parseHash: #hesap=ID.ANAHTAR okunur, başka hash ve bozuk değer reddedilir', () => {
  assert.deepEqual(H.parseHash('#hesap=' + ID + '.' + TK), { id: ID, token: TK });
  assert.deepEqual(H.parseHash('#x=1&hesap=' + ID + '.' + TK), { id: ID, token: TK });
  assert.equal(H.parseHash(''), null); assert.equal(H.parseHash('#baska=1'), null);
  assert.equal(H.parseHash('#hesap=123.' + TK), null);          // kısa ID
  assert.equal(H.parseHash('#hesap=' + ID + '.kisa'), null);    // kısa anahtar
  assert.equal(H.parseHash('#hesap=%E0%A4%A'), null);           // bozuk kodlama çökmez
});
test('parseBackup: hava uygulaması yedeği, Mağaza yedeği ve düz ID.ANAHTAR', () => {
  const weather = JSON.stringify({ mk: 1, locs: [], prefs: {}, theme: 'light', kr: { id: ID, token: TK } });
  assert.deepEqual(H.parseBackup(weather), { id: ID, token: TK });
  assert.deepEqual(H.parseBackup(H.makeBackup({ id: ID, token: TK })), { id: ID, token: TK });
  assert.deepEqual(H.parseBackup('  ' + ID + '.' + TK + '\n'), { id: ID, token: TK });
});
test('parseBackup: kristalsız yedek, bozuk JSON, boş metin → null', () => {
  assert.equal(H.parseBackup(JSON.stringify({ mk: 1, locs: [] })), null);
  assert.equal(H.parseBackup('{bozuk'), null); assert.equal(H.parseBackup(''), null); assert.equal(H.parseBackup(null), null);
  assert.equal(H.parseBackup(JSON.stringify({ kr: { id: 'abc', token: TK } })), null);
});
test('makeBackup: hesap yoksa boş metin', () => assert.equal(H.makeBackup(null), ''));
