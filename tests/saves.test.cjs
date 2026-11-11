/** Saves (spec 7): settings version 3 (Order Size, no Music, Graphics Quality handed to
 *  NarbeGraphics once), per-restaurant progress (coins) and shift records, what Reset Progress
 *  clears, and a shift's coins counted once. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { F, PR, S, merge, golden, right, play } = require('./bot.cjs');
const ladder = merge(require('./fixtures/ladder-pizza.js'));

const rec = (kind, v, data, extra) => JSON.stringify(Object.assign({ v, kind, data }, extra));

test('settings: version 3 is Order Size (stars or one), no Music and no Graphics Quality', () => {
  assert.strictEqual(F.VERSIONS.settings, 3);
  assert.deepStrictEqual(Object.keys(F.DEFAULT_SETTINGS), ['cooking', 'speed', 'shiftLength', 'orders', 'manager', 'characterVoices', 'theme', 'motion', 'textSize', 'sfx']);
  assert.strictEqual(F.DEFAULT_SETTINGS.orders, 'stars');
  assert.deepStrictEqual(F.SETTING_VALUES.orders, ['stars', 'one']);
  assert.strictEqual(F.key('settings'), 'bb-settings');
});

test('settings: a version 2 save becomes version 3; Simple orders become One Item; Graphics Quality is handed back once', () => {
  const v2 = d => F.read('settings', rec('settings', 2, Object.assign({ cooking: 'timed', speed: 'slow', shiftLength: 8, manager: 'hints', graphics: 'low', music: false }, d)));
  const a = v2({ orders: 'usual' });
  assert.ok(a.ok);
  assert.deepStrictEqual([a.data.orders, a.data.cooking, a.data.speed, a.data.shiftLength, a.data.manager], ['stars', 'timed', 'slow', 8, 'hints']);
  assert.ok(!('graphics' in a.data) && !('music' in a.data));
  assert.deepStrictEqual(a.handoff, { graphics: 'low' }, 'the page gives NarbeGraphics.setChoice this once');
  assert.strictEqual(v2({ orders: 'simple' }).data.orders, 'one');
  assert.strictEqual(v2({ orders: 'fancy' }).data.orders, 'stars');
  // Written back as version 3, it reads with no handoff.
  const again = F.read('settings', JSON.stringify(F.wrap('settings', null, a.data)));
  assert.ok(again.ok && again.handoff === undefined);
  assert.deepStrictEqual(again.data, a.data);
  // A version 1 save goes all the way.
  const v1 = F.read('settings', rec('settings', 1, { cooking: 'timed', mitch: 'off', star: true, customersAtOnce: 2, shiftLength: 8, orders: 'simple' }));
  assert.deepStrictEqual([v1.data.cooking, v1.data.manager, v1.data.shiftLength, v1.data.orders], ['timed', 'off', 8, 'one']);
});

test('settings: a value the game doesn\'t know reads as the default; a newer save is never written over', () => {
  const r = F.read('settings', rec('settings', 3, { orders: 'usual', shiftLength: '3', speed: 'warp', sfx: 'yes', motion: 'reduced' }));
  assert.deepStrictEqual([r.data.orders, r.data.shiftLength, r.data.speed, r.data.sfx, r.data.motion], ['stars', 3, 'verySlow', true, 'reduced']);
  const newer = rec('settings', 9, {});
  assert.deepStrictEqual(F.read('settings', newer), { ok: false, reason: 'newer', keep: true });
  assert.ok(!F.canWrite('settings', newer) && F.canWrite('settings', rec('settings', 3, {})) && F.canWrite('settings', null));
  assert.deepStrictEqual(F.read('settings', '{nope'), { ok: false, reason: 'corrupt', keep: false });
  assert.deepStrictEqual(F.read('settings', null), { ok: false, reason: 'missing', keep: false });
  assert.deepStrictEqual(F.read('settings', rec('shift', 3, {})), { ok: false, reason: 'kind', keep: true });
});

test('per restaurant: bb-progress:<pack> and bb-shift:<pack>; another restaurant\'s record or an old pack version is never read as this one', () => {
  assert.strictEqual(F.key('progress', ladder), 'bb-progress:ladderPizza');
  assert.strictEqual(F.key('shift', 'sushi'), 'bb-shift:sushi');
  const s = S.create(ladder, { seed: 3, level: 2 });
  const stored = JSON.stringify(F.wrap('shift', ladder, s));
  assert.deepStrictEqual(F.read('shift', stored, ladder).data, JSON.parse(JSON.stringify(s)));
  assert.deepStrictEqual(F.read('shift', stored, golden), { ok: false, reason: 'pack', keep: true });
  assert.strictEqual(F.read('shift', stored, Object.assign({}, ladder, { version: 9 })).reason, 'packVersion');
  const coins = JSON.stringify(F.wrap('progress', ladder, { v: 2, coins: 40, shifts: 2 }));
  const r = F.read('progress', coins, Object.assign({}, ladder, { version: 9 }));
  assert.ok(r.ok && r.upgraded && r.data.coins === 40, 'coins survive a pack change');
});

test('Reset Progress clears bb-court and every restaurant\'s progress and shift, and nothing else', () => {
  const keys = ['bb-settings', 'bb-court', 'bb-progress:diner', 'bb-shift:diner', 'bb-progress:sushi', 'bb-shift:pizza', 'narbe-scan-settings', 'bb-courtyard'];
  assert.deepStrictEqual(F.resetKeys(keys), ['bb-court', 'bb-progress:diner', 'bb-shift:diner', 'bb-progress:sushi', 'bb-shift:pizza']);
});

test('progress version 2: coins and shifts; the old shop goes; the tutorial flags stay for the court to read', () => {
  const old = rec('progress', 1, { v: 1, coins: 57, unlocked: ['hamburger'], order: ['hamburger'], decor: {}, decorOwned: [], best: {}, visitors: {}, regulars: [], shifts: 4, tutorialOffered: true },
    { pack: golden.id, packVersion: golden.version });
  const r = F.read('progress', old, golden);
  assert.ok(r.ok);
  assert.deepStrictEqual(r.data, { coins: 57, shifts: 4, tutorialOffered: true });
  assert.deepStrictEqual(PR.create(ladder), { v: 2, coins: 0, shifts: 0 });
});

test('a version 1 shift (before the ladder) reads as a shift off the ladder', () => {
  const s = S.create(golden, { seed: 4, settings: { orders: 'usual', shiftLength: 3 } });
  const v1 = Object.assign(JSON.parse(JSON.stringify(s)), { v: 1, settings: Object.assign({}, s.settings, { orders: 'simple' }) });
  delete v1.level; delete v1.event; delete v1.plan; delete v1.drawn; delete v1.counted;
  const r = F.read('shift', { v: 1, kind: 'shift', pack: golden.id, packVersion: golden.version, data: v1 }, golden);
  assert.ok(r.ok);
  assert.deepStrictEqual([r.data.level, r.data.event, r.data.drawn, r.data.counted, r.data.plan.length, r.data.settings.orders], [null, null, null, false, 3, 'one']);
  assert.ok(S.resumable(golden, r.data));
  while (!r.data.done) play(golden, r.data, (q, o) => right(golden, o, q));
  assert.strictEqual(S.results(r.data).orders, 3);
});

test('coins: a finished shift adds its coins once; a tutorial or an empty shift adds nothing', () => {
  const g = PR.create(ladder);
  const s = S.create(ladder, { seed: 6, level: 3, settings: { shiftLength: 3 } });
  while (!s.done) play(ladder, s, (q, o) => right(ladder, o, q));
  const res = S.claim(s);
  assert.deepStrictEqual(PR.addShift(ladder, g, res), { coins: s.coins });
  assert.deepStrictEqual([g.coins, g.shifts], [s.coins, 1]);
  assert.strictEqual(S.claim(s), null, 'claimed: nothing more to add');
  const t = S.create(ladder, { seed: 1, tutorial: true });
  while (!t.done) play(ladder, t, (q, o) => right(ladder, o, q));
  assert.deepStrictEqual(PR.addShift(ladder, g, S.claim(t)), { coins: 0 });
  assert.deepStrictEqual(PR.addShift(ladder, g, S.claim(S.create(ladder, { seed: 1, drawn: [] }))), { coins: 0 });
  assert.deepStrictEqual([g.coins, g.shifts], [s.coins, 1]);
});

test('the shift version is the same in shift.js and the save format', () => {
  assert.strictEqual(S.VERSION, F.VERSIONS.shift);
});
