/** The Ticket's hint (the user, 2026-11-19): after the ticket is read, what is wrong so far and how to fix it, or,
 *  when it is going right, what it still needs. judge.soFar + line.ahead + words.check. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { golden, restaurants, L, J, W, makeOrder, run, right, flat } = require('./bot.cjs');

const ST = { cooking: 'simple' };
const say = (pack, o, settings) => W.check(pack, o, J.soFar(pack, o), L.ahead(pack, o, settings || ST));
/** Answer with the right answers until the step asking `ing` (or `slot`) comes up. */
function upTo(pack, o, stop, settings) {
  settings = settings || ST;
  for (let k = 0; k < 200 && o.phase === 'line'; k++) {
    const q = L.question(pack, o, settings);
    if (stop(q)) return q;
    const id = right(pack, o, q);
    if (id === null) { L.tick(pack, o, 1, settings); continue; }
    L.answer(pack, o, id, settings);
  }
  return null;
}

test('a fresh order: so far so good, and what it needs, in the ticket\'s words', () => {
  const o = makeOrder(golden, ['cheeseburger'], { set: { doneness: 'medium' } });
  const t = say(golden, o);
  assert.match(t, /^So far, so good! Still to go: /);
  assert.match(t, /Still to go: one patty, medium, cheese/, 'the patty is said once, with how done (' + t + ')');
  assert.match(t, /cheese/);
  assert.match(t, / more\.$/, 'more than four things: the rest is counted, not listed (' + t + ')');
});

test('a skipped topping the ticket wants: named, and Redo Order is how to fix it', () => {
  const o = makeOrder(golden, ['cheeseburger'], { set: { doneness: 'medium' } });
  const q = upTo(golden, o, x => x.kind === 'add' && x.ing === 'cheese');
  assert.ok(q, 'reached the cheese');
  L.answer(golden, o, 'skip', ST);
  const t = say(golden, o);
  assert.match(t, /^Uh oh\. You skipped the cheese, but the ticket has cheese\./);
  assert.match(t, /redo this order for a happy customer\. Choose Redo Order/);
});

test('an extra topping: "not on the ticket", or "the ticket says no" when it was held', () => {
  const o = makeOrder(golden, ['cheeseburger'], { set: { doneness: 'medium' } });
  upTo(golden, o, x => x.kind === 'add' && x.ing === 'onion');
  L.answer(golden, o, 'add', ST);
  assert.match(say(golden, o), /You added onion, but that is not on the ticket\./);
  const h = makeOrder(golden, ['cheeseburger'], { set: { doneness: 'medium' }, hold: ['pickles'] });
  upTo(golden, h, x => x.kind === 'add' && x.ing === 'pickles');
  L.answer(golden, h, 'add', ST);
  assert.match(say(golden, h), /The ticket says no pickles, but you added pickles\./);
});

test('the step being asked is not judged yet: one patty of two is not a mistake', () => {
  const o = makeOrder(golden, ['doubleCheeseburger'].filter(r => golden.recipes[r]).concat(golden.recipes.doubleCheeseburger ? [] : ['cheeseburger']),
    { set: { doneness: 'medium' } });
  const want = L.expected(golden, o.items[0], L.current(golden, o).sid, L.current(golden, o).n);
  L.answer(golden, o, 'add', ST);
  const t = say(golden, o);
  assert.match(t, /^So far, so good!/);
  if (want > 1) assert.match(t, /Still to go: one patty/);
});

test('no patty at all: "you added none"; a holder: "a waffle cone", not "in a waffle cone"', () => {
  const o = makeOrder(golden, ['cheeseburger'], { set: { doneness: 'medium' } });
  L.answer(golden, o, 'skip', ST);
  assert.match(say(golden, o), /The ticket says one patty, but you added none\./);
  const ic = restaurants().find(r => r.id === 'icecream').pack;
  const recipe = Object.keys(ic.recipes).find(r => /cone/i.test(r));
  const c = makeOrder(ic, [recipe]);
  const q = upTo(ic, c, x => x.kind === 'pick' && x.slot === 'holder');
  const want = L.expected(ic, c.items[0], q.station, q.step);
  L.answer(ic, c, flat(q.options).find(x => x.value !== undefined && x.value !== want).id, ST);
  assert.match(say(ic, c), /^Uh oh\. You picked a [a-z ]+, but the ticket says a cone\./);
});

test('the wrong doneness is named with both stages', () => {
  const o = makeOrder(golden, ['cheeseburger'], { set: { doneness: 'medium' } });
  const q = upTo(golden, o, x => x.kind === 'cook');
  const other = flat(q.options).find(x => x.id !== 'cook:medium').id;
  L.answer(golden, o, other, ST);
  const got = W.lower(W.stage(golden, other.slice(5)));
  assert.match(say(golden, o), new RegExp('came out ' + got + ', but the ticket says medium\\.'));
});

test('the pizza: regular crust when the ticket says thin crust (the user\'s example)', () => {
  const pz = restaurants().find(r => r.id === 'pizza');
  assert.ok(pz && pz.pack, 'the Pizza Parlor loads');
  const pack = pz.pack;
  const recipe = Object.keys(pack.recipes).find(r => /cheese/i.test(r)) || Object.keys(pack.recipes)[0];
  const o = makeOrder(pack, [recipe], { set: { crust: 'thin' } });
  const q = upTo(pack, o, x => x.kind === 'pick' && x.slot === 'crust');
  assert.ok(q, 'reached the crust');
  assert.match(say(pack, o), /Still to go: thin crust/);
  const reg = flat(q.options).find(x => x.value === 'regular');
  L.answer(pack, o, reg.id, ST);
  assert.match(say(pack, o), /^Uh oh\. You picked regular crust, but the ticket says thin crust\. You will have to redo this order for a happy customer\. Choose Redo Order to start it again\.$/);
});

test('at the counter: all right says ring it up; a mistake says Redo', () => {
  const o = makeOrder(golden, ['cheeseburger'], { set: { doneness: 'medium' } });
  upTo(golden, o, x => x.kind === 'review');
  assert.strictEqual(o.phase, 'review');
  assert.strictEqual(say(golden, o), 'Everything matches the ticket. Ring it up!');
  const b = makeOrder(golden, ['cheeseburger'], { set: { doneness: 'medium' } });
  upTo(golden, b, x => x.kind === 'add' && x.ing === 'cheese');
  L.answer(golden, b, 'skip', ST);
  upTo(golden, b, x => x.kind === 'review');
  assert.match(say(golden, b), /Choose Redo to fix it before you ring it up\.$/);
  // Served: nothing more to say.
  L.answer(golden, b, 'serve', ST);
  assert.strictEqual(say(golden, b), '');
});

test('more than two mistakes: two are named, the rest counted', () => {
  const o = makeOrder(golden, ['cheeseburger'], { set: { doneness: 'medium' } });
  for (let k = 0; k < 40 && o.phase === 'line'; k++) {
    const q = L.question(golden, o, ST);
    if (q.kind === 'add' && q.max === 1) { L.answer(golden, o, right(golden, o, q) === 'add' ? 'skip' : 'add', ST); continue; }
    L.answer(golden, o, right(golden, o, q), ST);
  }
  const t = say(golden, o);
  assert.match(t, /^Uh oh\. /);
  assert.match(t, /And \w+ more things are wrong\./);
});

// Every recipe in every restaurant, Simple and Timed: played right, the hint never claims a mistake and always reads
// cleanly; with one wrong answer, it catches it on the very next Ticket.
const BAD = /undefined|null|NaN|\[object|  |\s[,.]/;
for (const r of restaurants()) {
  test(r.id + ': every recipe, the hint follows the order', () => {
    assert.ok(r.pack, r.id + ' loads: ' + r.error);
    const pack = r.pack;
    for (const recipe of Object.keys(pack.recipes)) {
      for (const cooking of ['simple', 'timed']) {
        const settings = { cooking, speed: 'normal' };
        const o = makeOrder(pack, [recipe, recipe], { settings });
        run(pack, o, settings, (q, ord) => {
          if (ord.phase !== 'served') {
            const t = say(pack, ord, settings);
            assert.doesNotMatch(t, BAD, r.id + '/' + recipe + ' reads badly: ' + t);
            assert.doesNotMatch(t, /^Uh oh/, r.id + '/' + recipe + ' (' + cooking + ') right so far, but: ' + t);
          }
          return right(pack, ord, q);
        });
        // One wrong answer on the first step that has another answer: caught on the next Ticket.
        const w = makeOrder(pack, [recipe], { settings: ST });
        let caught = null;
        run(pack, w, ST, (q, ord) => {
          if (caught === null && q.kind !== 'review' && !q.gross) {
            const good = right(pack, ord, q);
            const alt = flat(q.options).find(x => x.id !== good && x.id !== 'swap' && x.id !== 'done' && !x.row);
            if (alt && good !== null) {
              const r2 = L.answer(pack, ord, alt.id, ST);
              if (!r2.refused && !r2.warn) {
                const now = L.current(pack, ord);
                // An Add that offers another (max above 1) is still being asked: judged once it is finished.
                if (!now || now.key !== q.key || now.i !== q.item) caught = say(pack, ord);
                else caught = '';
              }
              return right(pack, ord, L.question(pack, ord, ST)) || undefined;
            }
          }
          return right(pack, ord, q);
        });
        if (caught) {
          // The serve's own judge decides whether that answer was a mistake; the hint must agree with it.
          const wrong = J.mistakes(pack, w).length > 0;
          assert.match(caught, wrong ? /^Uh oh\. / : /^So far, so good!/, r.id + '/' + recipe + ' disagrees with the judge: ' + caught);
          assert.doesNotMatch(caught, BAD, r.id + '/' + recipe + ' reads badly: ' + caught);
        }
      }
    }
  });
}
