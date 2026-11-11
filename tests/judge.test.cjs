/** The rating: mistakes counted per step, stars from the count, tips, favourites. The Burger
 *  Bar's on the frozen diner, then every new kind of step on the test pizzeria: slot picks,
 *  repeats, steps passed by `when`, flourishes, cook steps with `want`, bad picked values. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { golden: pack, testPizza: P, O, L, J, R, makeOrder, run, right } = require('./bot.cjs');

const ST = { cooking: 'simple' };
function made(recipe, play, opts) {
  opts = opts || {};
  const spec = O.resolve(pack, recipe, { rng: R.seed(1) }, { change: 0, set: { doneness: 'medium' } });
  const customer = Object.assign({ id: 'x', name: 'X' }, opts.customer);
  const o = L.create(pack, { customer, items: [spec] }, { settings: ST, gross: opts.gross });
  const { patties = 1, done = 'medium', adds } = play;
  for (let k = 0; k < patties; k++) L.answer(pack, o, 'add', ST);
  if (patties < 3) L.answer(pack, o, 'skip', ST);
  if (patties) L.answer(pack, o, 'cook:' + done, ST);
  for (let k = 0; k < 9; k++) {
    const q = L.question(pack, o, ST);
    L.answer(pack, o, adds.includes(q.ing) ? 'add' : 'skip', ST);
  }
  L.answer(pack, o, 'serve', ST);
  return J.score(pack, o);
}
// Cheeseburger as written: cheese, lettuce, tomato, pickles, ketchup.
const AS_WRITTEN = ['cheese', 'lettuce', 'tomato', 'pickles', 'ketchup'];

test('everything right: 3 stars, no mistakes', () => {
  const r = made('cheeseburger', { adds: AS_WRITTEN });
  assert.deepStrictEqual([r.stars, r.count, r.mistakes], [3, 0, []]);
});

test('one or two mistakes: 2 stars; three or more: 1 star; never zero', () => {
  assert.strictEqual(made('cheeseburger', { adds: AS_WRITTEN.concat('onion') }).stars, 2);
  assert.strictEqual(made('cheeseburger', { adds: ['lettuce', 'tomato', 'pickles', 'ketchup', 'mayo'] }).stars, 2);
  const bad = made('cheeseburger', { adds: ['onion', 'mustard', 'mayo'] });
  assert.strictEqual(bad.stars, 1);
  assert.ok(bad.count >= 3);
  const worst = made('cheeseburger', { patties: 0, adds: ['bacon', 'onion', 'mustard', 'mayo'] });
  assert.strictEqual(worst.stars, 1);
});

test('each kind of mistake is named', () => {
  const r = made('cheeseburger', { patties: 2, done: 'well', adds: ['lettuce', 'tomato', 'pickles', 'ketchup', 'onion'] });
  const kinds = r.mistakes.map(m => m.kind + (m.ing ? ':' + m.ing : '')).sort();
  assert.deepStrictEqual(kinds, ['count:patty', 'done:patty', 'extra:onion', 'missing:cheese']);
  assert.strictEqual(r.count, 4);
  const done = r.mistakes.find(m => m.kind === 'done');
  assert.deepStrictEqual([done.want, done.got], ['medium', 'well']);
  // Onion was never on a cheeseburger's ticket: "I didn't ask for", not "I said no".
  assert.strictEqual(r.mistakes.find(m => m.kind === 'extra').held, false);
});

test('no patty at all is one mistake, not a doneness mistake too', () => {
  const r = made('cheeseburger', { patties: 0, adds: AS_WRITTEN });
  assert.deepStrictEqual(r.mistakes.map(m => m.kind), ['count']);
  assert.strictEqual(r.stars, 2);
});

test('a bad ingredient served is a mistake; swapped, it is not', () => {
  const g = { item: 0, ing: 'cheese', event: 'mouldy' };
  const served = made('cheeseburger', { adds: AS_WRITTEN }, { gross: g });
  assert.deepStrictEqual(served.mistakes.map(m => m.kind), ['gross']);
  assert.strictEqual(served.stars, 2);
});

test('tips follow the stars; a favourite adds to the tip, never to the stars', () => {
  const price = pack.recipes.cheeseburger.price;
  const plain = made('cheeseburger', { adds: AS_WRITTEN });
  assert.strictEqual(plain.tip, Math.round(price * (0.6 + 0.2 * 3)));
  const fav = made('cheeseburger', { adds: AS_WRITTEN.concat('onion') }, { customer: { favourite: { recipe: 'cheeseburger', bonus: 2 } } });
  assert.strictEqual(fav.stars, 2);
  assert.ok(fav.favourite);
  assert.strictEqual(fav.tip, Math.round(price * (0.6 + 0.2 * 2)) + 2);
  assert.ok(J.starsFor(0) === 3 && J.starsFor(2) === 2 && J.starsFor(3) === 1 && J.starsFor(99) === 1);
});

/* ── the Food Court's steps (the test pizzeria) ────────────────────────── */
/** Make an order with right answers, except where swap(q) gives another answer. */
function score(recipes, opts, swap, settings) {
  const st = settings || ST;
  const o = makeOrder(P, recipes, Object.assign({ settings: st }, opts));
  run(P, o, st, (q, ord) => (swap && swap(q, ord)) || right(P, ord, q));
  return J.score(P, o);
}

test('a wrong slot value is one pick mistake, named by its slot', () => {
  const r = score(['pepperoni'], { set: { crust: 'thin', sauce: 'white' } }, q => (q.slot === 'sauce' ? 'pick:bare' : null));
  assert.deepStrictEqual(r.mistakes, [{ item: 0, kind: 'pick', of: 'slot', slot: 'sauce', want: 'white', got: 'bare', n: 1 }]);
  assert.strictEqual(r.stars, 2);
});

test('a repeat: one mistake for each pick over or under, one for each wrong value, and the order never matters', () => {
  const want = { set: { dip: ['pesto', 'ranch'], heat: 'warm' } };
  // At change 0 a repeat has its lowest count: one dip, pesto.
  assert.strictEqual(score(['knots'], want).stars, 3);
  const picks = list => {
    let k = 0;
    return q => (q.slot === 'dips' ? (k < list.length ? 'pick:' + list[k++] : 'done') : null);
  };
  const extra = score(['knots'], want, picks(['pesto', 'pesto', 'ranch']));
  assert.deepStrictEqual(extra.mistakes, [{ item: 0, kind: 'count', of: 'slot', slot: 'dips', want: 1, got: 3, n: 2 }]);
  const wrong = score(['knots'], want, picks(['honey']));
  assert.deepStrictEqual(wrong.mistakes, [{ item: 0, kind: 'pick', of: 'slot', slot: 'dips', want: 'pesto', got: 'honey', n: 1 }]);
  const both = score(['knots'], want, picks(['honey', 'tahini']));
  assert.deepStrictEqual(both.mistakes.map(m => [m.kind, m.n]), [['count', 1], ['pick', 1]]);
  assert.strictEqual(both.count, 2);
  // Three dips wanted, made in another order: right.
  const three = makeOrder(P, ['knots'], { set: { heat: 'warm' } });
  three.items[0].spec.picks.dips = ['pesto', 'pesto', 'ranch'];
  run(P, three, ST, (q, ord) => (q.slot === 'dips' ? ['pick:ranch', 'pick:pesto', 'pick:pesto'][q.have] : right(P, ord, q)));
  assert.deepStrictEqual(J.score(P, three).mistakes, []);
});

test('steps passed by when are never judged, and flourishes never are', () => {
  // Garlic on the ticket of a thin-crust pizza: the garlic step is not this ticket's, so it is never a mistake.
  const o = makeOrder(P, ['pepperoni'], { set: { crust: 'thin' } });
  o.items[0].spec.parts.push({ ing: 'garlic' }, { ing: 'garlic' });
  run(P, o, ST);
  assert.deepStrictEqual(J.score(P, o).mistakes, []);
  assert.strictEqual(o.items[0].answers['prep.6'], null);
  assert.strictEqual(o.items[0].answers['prep.7'], true, 'the spin ran, and is not judged');
});

test('a cook step with want is judged on its slot, and Simple\'s automatic cooking is always right', () => {
  assert.deepStrictEqual(score(['knots'], { set: { heat: 'hot' } }).mistakes, []);
  const T = { cooking: 'timed', speed: 'normal' };
  const r = score(['knots'], { set: { heat: 'hot' } }, q => (q.kind === 'cook' && q.timed ? (q.stage === 'warm' ? 'takeOff' : null) : null), T);
  assert.deepStrictEqual(r.mistakes, [{ item: 0, kind: 'done', ing: 'knots', want: 'hot', got: 'warm', n: 1 }]);
  const oven = score(['margherita'], { set: { bake: 'golden' } }, q => (q.kind === 'cook' ? 'cook:crispy' : null));
  assert.deepStrictEqual(oven.mistakes, [{ item: 0, kind: 'done', ing: 'pizza', want: 'golden', got: 'crispy', n: 1 }]);
});

test('a bad value served on a pick is a gross mistake; swapped, there is none', () => {
  const g = { gross: { item: 0, slot: 'sauce', event: 'skin' }, set: { sauce: 'red' } };
  assert.deepStrictEqual(score(['pepperoni'], g).mistakes, [], 'right answers swap it');
  const served = score(['pepperoni'], g, q => (q.gross && q.slot ? 'pick:red' : null));
  assert.deepStrictEqual(served.mistakes, [{ item: 0, kind: 'gross', slot: 'sauce', value: 'red', event: 'skin', n: 1 }]);
  const dodged = score(['pepperoni'], g, q => (q.gross && q.slot ? 'pick:white' : null));
  assert.deepStrictEqual(dodged.mistakes, [{ item: 0, kind: 'pick', of: 'slot', slot: 'sauce', want: 'red', got: 'white', n: 1 }]);
});

test('the judge counts every kind of mistake, each with its n', () => {
  // A Chicago Deep Dish (two garlic cloves) and Garlic Knots, made with one of everything wrong.
  const o = makeOrder(P, ['chicago', 'knots'], { set: { sauce: 'red', bake: 'golden', heat: 'warm', dip: 'pesto' }, gross: { item: 0, ing: 'mozzarella', event: 'hair' } });
  const wrong = { sauce: 'pick:white', mozzarella: 'add', pepperoni: 'skip', peppers: 'add', butter: 'skip' };
  run(P, o, ST, (q, ord) => {
    if (q.kind === 'pick' && q.slot && wrong[q.slot]) return wrong[q.slot];
    if (q.kind === 'add' && wrong[q.ing]) return wrong[q.ing];
    if (q.kind === 'add' && q.ing === 'garlic') return q.have < 3 ? 'add' : 'skip';
    if (q.kind === 'cook') return 'cook:crispy';
    if (q.slot === 'dips') return q.have < 2 ? 'pick:honey' : 'done';
    return right(P, ord, q);
  });
  const r = J.score(P, o);
  const kinds = r.mistakes.map(m => m.kind + ':' + (m.ing || m.slot) + ':' + m.n).sort();
  assert.deepStrictEqual(kinds, ['count:dips:1', 'count:garlic:1', 'done:pizza:1', 'extra:peppers:1', 'gross:mozzarella:1', 'missing:butter:1',
    'missing:pepperoni:1', 'pick:dips:1', 'pick:sauce:1']);
  assert.deepStrictEqual([r.count, r.stars], [9, 1]);
});
