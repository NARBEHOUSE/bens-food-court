/** BB.cast.merge (js/core/cast.js, spec 8): who someone is comes only from the cast; what they
 *  order here comes from the pack; Mitch wears the pack's uniform. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { C, CAST, load, restaurants, schema } = require('./bot.cjs');

const raw = {
  id: 'tiny', version: 1,
  manager: { id: 'mitch', art: 'mitch-tiny', name: 'Not Mitch', tts: { pitch: 2 } },
  regulars: [
    { id: 'gus', name: 'Augustus', art: 'somebody', tts: { pitch: 9 }, twin: false, likes: [['a', 2]], dislikes: ['x'] },
    { id: 'kai', likes: [['a', 1]] },
    { id: 'reginald', likes: [['a', 1]], visitor: { level: 5 } },
    { id: 'stranger', name: 'Stranger', art: 'stranger', likes: [['a', 1]] },
  ],
};

test('persona fields come only from the cast; the pack\'s fields win for the rest', () => {
  const before = JSON.stringify(raw);
  const m = C.merge(CAST, raw);
  const gus = m.regulars.find(c => c.id === 'gus');
  for (const k of ['name', 'art', 'role', 'tts', 'twin', 'tipScale', 'who', 'voice']) assert.deepStrictEqual(gus[k], CAST.people.gus[k], k);
  assert.deepStrictEqual([gus.likes, gus.dislikes], [[['a', 2]], ['x']]);
  assert.strictEqual(JSON.stringify(raw), before, 'the pack is never changed');
  assert.notStrictEqual(gus.tts, CAST.people.gus.tts, 'a copy, so nothing can change the cast through a pack');
  const stranger = m.regulars.find(c => c.id === 'stranger');
  assert.ok(!stranger.name && !stranger.art, 'someone the cast doesn\'t know has no name or pictures');
});

test('Mitch wears the pack\'s uniform; visitors come at level 4 unless the pack says; poses default to the Burger Bar\'s', () => {
  const m = C.merge(CAST, raw);
  assert.deepStrictEqual([m.manager.id, m.manager.name, m.manager.art, m.manager.role, m.manager.tts], ['mitch', 'Mitch', 'mitch-tiny', 'manager', CAST.people.mitch.tts]);
  assert.deepStrictEqual(m.regulars.find(c => c.id === 'kai').visitor, { level: 4 });
  assert.deepStrictEqual(m.regulars.find(c => c.id === 'reginald').visitor, { level: 5 });
  assert.strictEqual(m.regulars.find(c => c.id === 'gus').visitor, undefined);
  assert.deepStrictEqual(m.poses, C.POSES);
  for (const p of Object.values(C.POSES.customer)) assert.ok(CAST.poses.customer.includes(p), p);
  for (const p of Object.values(C.POSES.manager)) assert.ok(CAST.poses.manager.includes(p), p);
  assert.deepStrictEqual(C.merge(CAST, m), m, 'merging twice changes nothing');
  assert.strictEqual(C.person(m, 'mitch'), m.manager);
  assert.strictEqual(C.person(m, 'kai').name, 'Kai');
});

test('every restaurant pack and the live diner merge, and each regular is someone the cast knows', () => {
  for (const R0 of restaurants()) {
    if (R0.error) assert.fail(R0.id + ' does not load: ' + R0.error);
    for (const r of R0.pack.regulars) assert.ok(r.name && r.art && C.CUSTOMER_ROLES.includes(r.role), R0.id + ': ' + r.id);
    assert.deepStrictEqual(schema.validate(R0.pack).filter(e => /cast/.test(e)), []);
  }
  const live = C.merge(CAST, load('packs/diner/pack.js'));
  assert.strictEqual(live.regulars.find(c => c.id === 'dale').art, 'dale', 'the cast draws everyone; the page lets in only those drawn');
});
