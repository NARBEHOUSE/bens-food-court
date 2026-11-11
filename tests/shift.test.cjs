/** Shifts: who comes in, where gross-outs fall, the tutorial, saving mid-order, bot shifts across
 *  every setting (the Burger Bar, frozen), then the Food Court's ladder (spec 4): levels, Order
 *  Size, combos, visitors, ridiculous orders, the five-star event, drawn customers, results and
 *  counting a shift once. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { golden: pack, GOLDEN_DRAWN, testPizza, merge, S, L, O, W, J, R, SC, goldenScript, right, play, random } = require('./bot.cjs');
const ladder = merge(require('./fixtures/ladder-pizza.js'));

/* ── the Burger Bar (frozen), off the ladder ───────────────────────────── */
const DRAWN = GOLDEN_DRAWN;
const make = (opts) => S.create(pack, Object.assign({ drawn: DRAWN }, opts));

test('only drawn customers come in, never the same one twice in a row, everyone once before anyone twice', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const s = make({ seed, settings: { shiftLength: 8 } });
    s.queue.forEach((id, i) => {
      assert.ok(DRAWN.includes(id), id + ' is not drawn');
      if (i) assert.notStrictEqual(id, s.queue[i - 1], 'seed ' + seed + ': ' + id + ' twice in a row');
    });
    assert.strictEqual(new Set(s.queue.slice(0, DRAWN.length)).size, DRAWN.length);
  }
  const few = make({ seed: 3, drawn: ['gus', 'bev'], settings: { shiftLength: 8 } });
  assert.ok(few.queue.every(id => ['gus', 'bev'].includes(id)));
});

test('gross-outs: at most two a shift, never the first order, never two on one order, only on wanted ingredients', () => {
  let total = 0, shifts = 0, withOne = 0;
  for (let seed = 1; seed <= 600; seed++) {
    const s = make({ seed, settings: { shiftLength: 8, orders: ['simple', 'usual', 'fancy'][seed % 3] } });
    shifts += 1;
    let here = 0;
    while (!s.done) {
      const n = s.n, o = S.next(pack, s);
      if (o.pending) {
        here += 1;
        assert.ok(n > 0, 'not on the first order');
        const spec = o.items[o.pending.item].spec;
        assert.ok(spec.parts.some(p => p.ing === o.pending.ing), 'the ticket wants ' + o.pending.ing);
        assert.ok(pack.gross.find(g => g.id === o.pending.event).on.includes(o.pending.ing));
      }
      play(pack, s, (q, ord) => right(pack, ord, q));
    }
    assert.ok(here <= pack.grossMax, 'seed ' + seed + ' had ' + here);
    total += here;
    if (here) withOne += 1;
  }
  assert.ok(total / shifts > 0.5 && total / shifts < 2, 'about one a shift on average, got ' + (total / shifts).toFixed(2));
  assert.ok(withOne < shifts, 'some shifts have none');
});

test('the tutorial: one order, exactly as written, with the green cheese', () => {
  const s = make({ seed: 99, tutorial: true });
  const o = S.next(pack, s);
  assert.strictEqual(s.length, 1);
  assert.strictEqual(o.ticket.customer.id, 'marge');
  assert.strictEqual(W.said(pack, o.ticket), 'Bacon Cheeseburger, medium, no onions.');
  assert.strictEqual(W.ticket(pack, o.ticket), 'Bacon Cheeseburger: one patty, medium, with cheese, bacon, lettuce, tomato and ketchup.');
  assert.deepStrictEqual(o.pending, { item: 0, ing: 'cheese', event: 'mouldy' });
  assert.ok(o.tutorial);
  const r = play(pack, s, (q, ord) => right(pack, ord, q));
  assert.strictEqual(r.result.stars, 3);
  assert.strictEqual(r.result.swaps, 1);
  assert.deepStrictEqual(S.results(s), Object.assign(S.results(s), { tutorial: true, orders: 1 }));
});

test('warnings happen in the tutorial and nowhere else', () => {
  const wrong = (q) => (q.kind === 'review' ? 'serve' : q.options[q.options.length - 1].id);
  const t = make({ seed: 4, tutorial: true });
  let warned = 0;
  play(pack, t, (q, o) => (warned < 3 ? wrong(q) : right(pack, o, q)), { onWarn: () => { warned += 1; } });
  assert.ok(warned >= 1);
  for (let seed = 1; seed <= 30; seed++) {
    for (const level of [null, 3, 5]) {
      const s = level ? S.create(pack, { seed, level, drawn: DRAWN, settings: { shiftLength: 3 } }) : make({ seed, settings: { shiftLength: 3 } });
      while (!s.done) assert.deepStrictEqual(play(pack, s, wrong).warnings, []);
    }
  }
});

test('a shift saved in the middle of an order continues exactly', () => {
  for (const [p, opts] of [[pack, { drawn: DRAWN }], [testPizza, {}], [ladder, { level: 5 }], [ladder, { level: 4, event: 'five' }]]) {
    for (const cooking of ['simple', 'timed']) {
      const go = (cut) => {
        let s = S.create(p, Object.assign({ seed: 21, settings: { shiftLength: 4, cooking, speed: 'normal' } }, opts));
        const log = [];
        let steps = 0;
        while (!s.done) {
          S.next(p, s);
          while (s.order.phase !== 'served') {
            if (steps++ === cut) s = JSON.parse(JSON.stringify(s));    // save and load
            const q = S.question(p, s), id = right(p, s.order, q);
            if (id === null) { S.tick(p, s, 1); continue; }
            S.answer(p, s, id);
          }
          log.push(JSON.stringify(S.serve(p, s)));
        }
        return log.join('\n') + JSON.stringify(S.results(s));
      };
      assert.strictEqual(go(17), go(-1), p.id + ' ' + cooking);
    }
  }
});

test('600 bot shifts across every setting: every order rated 1 to 3 stars, nothing stuck', () => {
  const styles = ['simple', 'usual', 'fancy', 'one'], cookings = ['simple', 'timed'], lengths = [3, 5, 8];
  let orders = 0;
  for (let seed = 1; seed <= 600; seed++) {
    const settings = { orders: styles[seed % 4], cooking: cookings[(seed >> 2) % 2], shiftLength: lengths[(seed >> 3) % 3], speed: 'normal' };
    const s = make({ seed, settings });
    const bot = seed % 2 ? random(s) : (q, o) => right(pack, o, q);
    while (!s.done) {
      const r = play(pack, s, bot).result;
      assert.ok(r.stars >= 1 && r.stars <= 3);
      assert.ok(r.tip >= 1);
      orders += 1;
      if (!(seed % 2)) assert.strictEqual(r.stars, 3, 'the right answers always earn 3 stars');
    }
    assert.strictEqual(S.results(s).orders, settings.shiftLength);
  }
  assert.ok(orders > 2500);
});

test('off the ladder, the old Orders styles still size orders; Order Size One Item is one item', () => {
  let items = 0, two = 0, n = 0;
  for (let seed = 1; seed <= 300; seed++) {
    for (const orders of ['simple', 'one']) {
      const s = make({ seed, settings: { orders, shiftLength: 4 } });
      while (!s.done) {
        const o = S.next(pack, s);
        assert.strictEqual(o.items.length, 1, orders);
        if (orders === 'simple') assert.ok((o.items[0].spec.with || []).length <= pack.orderStyles.simple.maxOptional);
        play(pack, s, (q, ord) => right(pack, ord, q));
      }
    }
    const usual = make({ seed, settings: { orders: 'usual', shiftLength: 4 } });
    while (!usual.done) {
      const o = S.next(pack, usual);
      n += 1; items += o.items.length; if (o.items.length > 1) two += 1;
      play(pack, usual, (q, ord) => right(pack, ord, q));
    }
  }
  assert.ok(two / n < 0.45, 'Usual two-item orders: ' + (two / n).toFixed(2));
});

test('Gus orders two of one thing when the setting allows it, and one with One Item', () => {
  for (let seed = 1; seed <= 100; seed++) {
    for (const orders of ['usual', 'one']) {
      const s = make({ seed, settings: { orders, shiftLength: 8 } });
      while (!s.done) {
        const o = S.next(pack, s);
        if (o.ticket.customer.id === 'gus') {
          assert.strictEqual(o.items.length, orders === 'one' ? 1 : 2);
          if (orders !== 'one') {
            assert.deepStrictEqual(o.items[0].spec, o.items[1].spec);
            assert.match(W.ticket(pack, o.ticket), /^Two /);
          }
        }
        play(pack, s, (q, ord) => right(pack, ord, q));
      }
    }
  }
});

test('Sal never gets lettuce: every item with lettuce holds it, the ticket never lists it, and he has lines about it', () => {
  assert.ok(SC.candidates(goldenScript, 'sal', 'order.dislike', null).length >= 2);
  let seen = 0;
  for (let seed = 1; seed <= 120; seed++) {
    for (const opts of [{ settings: { orders: ['simple', 'usual', 'fancy'][seed % 3], shiftLength: 8 } }, { level: 1 + (seed % 5), settings: { shiftLength: 8 } }]) {
      const s = make(Object.assign({ seed }, opts));
      while (!s.done) {
        const o = S.next(pack, s);
        if (o.ticket.customer.id === 'sal') {
          seen += 1;
          for (const it of o.items) {
            const has = pack.recipes[it.spec.recipe].item.parts.some(p => p.ing === 'lettuce');
            if (has) assert.ok(it.spec.holds.includes('lettuce'), 'seed ' + seed + ': ' + JSON.stringify(it.spec));
            assert.ok(!it.spec.parts.some(p => p.ing === 'lettuce'));
          }
          assert.doesNotMatch(W.ticket(pack, o.ticket), /lettuce/i, 'the ticket lists only what goes on');
        }
        play(pack, s, (q, ord) => right(pack, ord, q));
      }
    }
  }
  assert.ok(seen > 150, 'Sal came in ' + seen + ' times');
});

test('Timed answers take the food off at the stage it has reached; a held switch stops the clock', () => {
  const s = make({ seed: 8, settings: { cooking: 'timed', speed: 'normal', shiftLength: 1 } });
  let took = null;
  play(pack, s, (q, o) => {
    if (q.kind === 'cook') { if (q.stage === 'well') { took = q.stage; return 'takeOff'; } return null; }
    return right(pack, o, q);
  });
  assert.strictEqual(took, 'well');
  assert.strictEqual(s.last.order.items[0].answers['grill.1'], 'well');
  // Held: S.tick passes the switch state on, so the stage on show at the press is the one taken.
  const h = make({ seed: 8, settings: { cooking: 'timed', speed: 'normal', shiftLength: 1 } });
  S.next(pack, h);
  for (let q = S.question(pack, h); q.kind !== 'cook'; q = S.question(pack, h)) S.answer(pack, h, right(pack, h.order, q));
  const before = S.question(pack, h).stage;
  assert.deepStrictEqual(S.tick(pack, h, 60, true), []);
  assert.strictEqual(S.question(pack, h).stage, before);
  assert.ok(S.tick(pack, h, 60, false).length > 0);
});

/* ── the ladder (spec 4.3) ─────────────────────────────────────────────── */
/** Every order of shifts at a level: [{ s, o, i }]. */
function orders(p, opts, seeds, fn) {
  for (let seed = 1; seed <= seeds; seed++) {
    const s = S.create(p, Object.assign({ seed }, opts, { settings: Object.assign({ shiftLength: 8 }, opts.settings) }));
    while (!s.done) {
      const i = s.n, o = S.next(p, s);
      fn({ s, o, i, seed });
      play(p, s, (q, ord) => right(p, ord, q));
    }
  }
}

test('the ladder: recipes come by their level; event recipes never come in a normal shift', () => {
  const offered = level => S.create(ladder, { seed: 1, level }).recipes;
  assert.deepStrictEqual(offered(1), ['margherita', 'pepperoni']);
  for (const level of [2, 3, 4, 5]) assert.deepStrictEqual(offered(level), ['margherita', 'pepperoni', 'chicago', 'knots']);
  assert.deepStrictEqual(S.recipesFor(ladder), ['margherita', 'pepperoni', 'chicago', 'knots'], 'off the ladder: all but the event\'s');
  assert.strictEqual(S.recipeLevel(ladder.recipes.party), 'event');
  for (const level of [1, 2, 3, 4, 5]) orders(ladder, { level }, 40, ({ o }) => {
    for (const it of o.items) {
      assert.ok(S.create(ladder, { seed: 1, level }).recipes.includes(it.spec.recipe), level + ': ' + it.spec.recipe);
    }
  });
});

test('levels 1 and 2: one item, no gross-outs, no visitors, no ridiculous orders; level 1 keeps tickets short', () => {
  for (const level of [1, 2]) orders(ladder, { level }, 120, ({ o }) => {
    assert.strictEqual(o.items.length, 1);
    assert.strictEqual(o.pending, null);
    assert.ok(!o.ticket.visitor && !o.ticket.odd);
    if (level === 1) assert.ok(!o.items[0].spec.with || o.items[0].spec.with.length <= 2);
  });
  // The engine's level 1 never strays far: no repeat past its lowest count.
  const lv1 = S.levelOf(ladder, 1);
  assert.deepStrictEqual([lv1.items, lv1.repeat, lv1.grossMax, lv1.odd], [[1, 1], 0, 0, 0]);
});

test('level 3 and up: one or two items, two of different courses (a main and a side), main first; gross-outs at most 2 a shift, never first', () => {
  let two = 0, n = 0;
  for (const level of [3, 4, 5]) {
    const perShift = new Map();
    orders(ladder, { level }, 150, ({ o, i, seed }) => {
      n += 1;
      assert.ok(o.items.length <= 2);
      if (o.items.length === 2) {
        two += 1;
        const [a, b] = o.items.map(it => it.spec.recipe);
        if (JSON.stringify(o.items[0].spec) !== JSON.stringify(o.items[1].spec)) {
          assert.notStrictEqual(ladder.recipes[a].course, ladder.recipes[b].course, a + ' + ' + b + ' is not a combo');
          assert.strictEqual(ladder.recipes[a].course, 'main', 'the main comes first');
        } else assert.strictEqual(o.ticket.customer.id, 'gus', 'only the twin orders two of one thing');
      }
      if (o.pending) {
        assert.ok(i > 0, 'never the first order');
        perShift.set(seed, (perShift.get(seed) || 0) + 1);
      }
    });
    for (const k of perShift.values()) assert.ok(k <= 2);
    assert.ok(perShift.size > 30, 'level ' + level + ' has gross-outs');
  }
  assert.ok(two / n > 0.15 && two / n < 0.8, 'two-item orders: ' + (two / n).toFixed(2));
});

test('levels 4 and 5: exactly one visitor a shift, never first, when one is drawn; none below', () => {
  for (const level of [1, 2, 3, 4, 5]) {
    for (let seed = 1; seed <= 150; seed++) {
      const s = S.create(ladder, { seed, level, settings: { shiftLength: [3, 5, 8][seed % 3] } });
      const at = s.queue.map((id, i) => (ladder.regulars.find(c => c.id === id).visitor ? i : -1)).filter(i => i >= 0);
      assert.strictEqual(at.length, level >= 4 ? 1 : 0, 'level ' + level + ' seed ' + seed + ': ' + s.queue);
      if (at.length) {
        assert.ok(at[0] > 0, 'never first');
        assert.ok(s.plan[at[0]].visitor);
        const who = s.queue[at[0]];
        assert.ok(level === 5 || who === 'reginald', 'Kai visits from level 5');
      }
    }
  }
  // A visitor who isn't drawn never comes; with none drawn there is no visitor.
  const none = S.create(ladder, { seed: 2, level: 5, drawn: ['marge', 'gus', 'bev'] });
  assert.ok(none.queue.every(id => ['marge', 'gus', 'bev'].includes(id)));
  const just = S.create(ladder, { seed: 2, level: 5, drawn: ['marge', 'gus', 'kai'] });
  assert.deepStrictEqual(just.queue.filter(id => id === 'kai').length, 1);
  // The ticket says so (the page plays visitor.arrive).
  const s = S.create(ladder, { seed: 9, level: 4, settings: { shiftLength: 5 } });
  let saw = 0;
  while (!s.done) { const o = S.next(ladder, s); if (o.ticket.visitor) saw += 1; play(ladder, s, (q, ord) => right(ladder, ord, q)); }
  assert.strictEqual(saw, 1);
  assert.strictEqual(S.results(s).stars.length, 5);
});

test('ridiculous orders: level 4 and up, at most one a shift, never first or the visitor\'s, as written, for whom it allows', () => {
  let shifts = 0, withOdd = 0;
  const kinds = new Set();
  for (const level of [1, 2, 3, 4, 5]) {
    for (let seed = 1; seed <= 200; seed++) {
      const s = S.create(ladder, { seed, level, settings: { shiftLength: 5 } });
      const odd = s.plan.map((p, i) => (p.odd ? i : -1)).filter(i => i >= 0);
      assert.ok(odd.length <= (level >= 4 ? 1 : 0), level + '/' + seed);
      if (level >= 4) { shifts += 1; if (odd.length) withOdd += 1; }
      while (!s.done) {
        const i = s.n, o = S.next(ladder, s);
        if (o.ticket.odd) {
          const t = ladder.oddOrders.find(x => x.id === o.ticket.odd);
          kinds.add(t.id);
          assert.ok(i > 0 && !o.ticket.visitor);
          assert.ok(level >= (t.level || 4));
          assert.ok(!t.who || t.who.includes(o.ticket.customer.id));
          assert.strictEqual(o.items.length, 1);
          const spec = o.items[0].spec;
          assert.strictEqual(spec.recipe, t.recipe);
          for (const [slot, v] of Object.entries(t.picks || {})) assert.deepStrictEqual(spec.picks[slot], v);
          (t.holds || []).forEach(h => assert.ok(!spec.parts.some(p => p.ing === h)));
          (t.adds || []).forEach(a => assert.ok(spec.parts.some(p => p.ing === a) || (o.ticket.customer.id === 'sal' && a === 'peppers')));
        }
        assert.strictEqual(play(ladder, s, (q, ord) => right(ladder, ord, q)).result.stars, 3);
      }
    }
  }
  assert.ok(withOdd / shifts > 0.3, 'odd orders turn up: ' + withOdd + '/' + shifts);
  assert.deepStrictEqual([...kinds].sort(), ['deepEverything', 'justCrust', 'salKnots']);
});

test('Order Size One Item: every order is one item at every level, the event and its finale too', () => {
  for (const level of [1, 2, 3, 4, 5]) orders(ladder, { level, settings: { orders: 'one' } }, 60, ({ o }) => assert.strictEqual(o.items.length, 1));
  orders(ladder, { level: 4, event: 'five', settings: { orders: 'one' } }, 40, ({ o }) => assert.strictEqual(o.items.length, 1));
});

test('the five-star event: Shift Length orders from its customers, at most three items, the finale last', () => {
  for (const shiftLength of [3, 5, 8]) {
    for (let seed = 1; seed <= 60; seed++) {
      const s = S.create(ladder, { seed, level: 4, event: 'five', settings: { shiftLength } });
      assert.strictEqual(s.length, shiftLength);
      assert.strictEqual(s.event, 'five');
      s.queue.slice(0, -1).forEach(id => assert.ok(ladder.events.five.customers.includes(id), id));
      assert.strictEqual(s.queue[s.length - 1], 'pam');
      while (!s.done) {
        const i = s.n, o = S.next(ladder, s);
        assert.strictEqual(o.ticket.event, 'five');
        assert.ok(o.items.length >= 1 && o.items.length <= 3);
        if (i === s.length - 1) {
          assert.ok(o.ticket.finale);
          assert.deepStrictEqual(o.items.map(it => it.spec.recipe), ['party', 'knots']);
        } else {
          assert.ok(!o.ticket.finale && !o.ticket.odd && !o.ticket.visitor);
          o.items.forEach(it => assert.notStrictEqual(ladder.recipes[it.spec.recipe].level, 'event'));
        }
        assert.strictEqual(play(ladder, s, (q, ord) => right(ladder, ord, q)).result.stars, 3);
      }
      const r = S.results(s);
      assert.deepStrictEqual([r.event, r.level, r.orders, r.tutorial], ['five', 4, shiftLength, false]);
    }
  }
});

test('drawn: a tutorial customer or event orderer who isn\'t drawn is replaced by the first drawn regular; nobody drawn is an empty, finished shift', () => {
  const t = S.create(ladder, { seed: 1, tutorial: true, drawn: ['gus', 'bev'] });
  assert.deepStrictEqual(t.queue, ['gus']);
  assert.strictEqual(S.next(ladder, t).ticket.customer.id, 'gus');
  const e = S.create(ladder, { seed: 1, level: 4, event: 'five', drawn: ['bev', 'sal'], settings: { shiftLength: 5 } });
  assert.strictEqual(e.queue[4], 'bev', 'Pam is not drawn: the first drawn regular orders the finale');
  assert.ok(e.queue.slice(0, 4).every(id => ['bev', 'sal'].includes(id)));
  for (const opts of [{ level: 3 }, { level: 5 }, { tutorial: true }, { level: 4, event: 'five' }, {}]) {
    const s = S.create(ladder, Object.assign({ seed: 4, drawn: [] }, opts));
    assert.ok(s.done && s.length === 0 && s.queue.length === 0, JSON.stringify(opts));
    assert.strictEqual(S.next(ladder, s), null);
    assert.deepStrictEqual([S.results(s).orders, S.results(s).avgStars, S.results(s).stars], [0, 0, []]);
  }
  // Only visitors drawn: no one orders normally, so the shift is empty too.
  assert.ok(S.create(ladder, { seed: 4, level: 5, drawn: ['reginald', 'kai'] }).done);
});

test('results (spec 4.1) and counting a shift once (spec 4.2)', () => {
  const s = S.create(ladder, { seed: 12, level: 3, settings: { shiftLength: 3 } });
  assert.strictEqual(S.claim(s), null, 'not finished: nothing to count');
  let k = 0;
  while (!s.done) play(ladder, s, (q, o) => (k++ % 7 === 3 && q.kind === 'add' ? (q.have ? 'skip' : 'add') : right(ladder, o, q)));
  const r = S.results(s);
  assert.deepStrictEqual(Object.keys(r).slice(0, 8), ['pack', 'level', 'event', 'tutorial', 'orders', 'stars', 'avgStars', 'coins']);
  assert.deepStrictEqual([r.pack, r.level, r.event, r.tutorial, r.orders], ['ladderPizza', 3, null, false, 3]);
  assert.ok(r.stars.every(x => x >= 1 && x <= 3));
  assert.ok(Math.abs(r.avgStars - r.stars.reduce((a, b) => a + b, 0) / 3) < 1e-9);
  assert.strictEqual(r.coins, s.results.reduce((a, x) => a + x.tip, 0));
  const saved = JSON.parse(JSON.stringify(s));
  assert.deepStrictEqual(S.claim(s), r);
  assert.strictEqual(S.claim(s), null, 'counts once');
  assert.strictEqual(S.claim(JSON.parse(JSON.stringify(s))), null, 'and once after a save');
  assert.deepStrictEqual(S.claim(saved), r, 'a finished shift saved before it was counted still counts, once');
  assert.ok(!S.resumable(ladder, s), 'a finished shift is not carried on');
});

test('a saved shift carries on until it finishes; Restart starts the same kind of shift again', () => {
  const s = S.create(ladder, { seed: 5, level: 4, drawn: ['marge', 'gus', 'bev', 'reginald'], settings: { shiftLength: 5, orders: 'one' } });
  play(ladder, s, (q, o) => right(ladder, o, q));
  const saved = JSON.parse(JSON.stringify(s));
  assert.ok(S.resumable(ladder, saved));
  assert.ok(!S.resumable(Object.assign({}, ladder, { version: ladder.version + 1 }), saved), 'a new pack version drops it');
  assert.ok(!S.resumable(testPizza, saved), 'another restaurant\'s shift');
  while (!saved.done) play(ladder, saved, (q, o) => right(ladder, o, q));
  assert.strictEqual(S.results(saved).orders, 5);
  const again = S.restart(ladder, s);
  assert.deepStrictEqual([again.level, again.event, again.drawn, again.settings, again.n, again.done], [4, null, s.drawn, s.settings, 0, false]);
  assert.notStrictEqual(again.seed, s.seed);
  const ev = S.restart(ladder, S.create(ladder, { seed: 2, level: 4, event: 'five' }));
  assert.strictEqual(ev.event, 'five');
  assert.ok(!S.resumable(ladder, S.create(ladder, { seed: 2, tutorial: true })), 'a tutorial is never saved');
});

test('a pick gross-out lands only on a pick of three or fewer values whose wanted value it lists, never on a step the ticket skips', () => {
  // Every gross-out of the ladder pizzeria at level 5: the skin is only ever on red or white sauce.
  let picks = 0;
  for (let seed = 1; seed <= 400; seed++) {
    const s = S.create(ladder, { seed, level: 5, settings: { shiftLength: 8 } });
    while (!s.done) {
      const o = S.next(ladder, s);
      if (o.pending && o.pending.slot !== undefined) {
        picks += 1;
        const spec = o.items[o.pending.item].spec;
        assert.strictEqual(o.pending.slot, 'sauce');
        assert.ok(['red', 'white'].includes(spec.picks.sauce), spec.picks.sauce);
        assert.strictEqual(o.pending.event, 'skin');
      } else if (o.pending) assert.ok(o.items[o.pending.item].spec.parts.some(p => p.ing === o.pending.ing));
      assert.strictEqual(play(ladder, s, (q, ord) => right(ladder, ord, q)).result.stars, 3);
    }
  }
  assert.ok(picks > 20, 'pick gross-outs happen: ' + picks);
  // A step passed by `when` never carries one: basil only on a Margherita.
  const spots = [];
  for (let seed = 1; seed <= 300; seed++) {
    const g = S.placeGross(ladder, { rng: R.seed(seed) }, [O.resolve(ladder, 'pepperoni', { rng: R.seed(seed) }, { change: 0.5 })]);
    if (g) spots.push(g.ing || g.slot);
  }
  assert.ok(!spots.includes('basil') && spots.includes('mozzarella') && spots.includes('sauce'));
});

test('a customer never orders a recipe that always comes with something they never take', () => {
  orders(ladder, { level: 5 }, 120, ({ o }) => {
    if (o.ticket.customer.id === 'tony' && !o.ticket.odd) o.items.forEach(it => assert.notStrictEqual(it.spec.recipe, 'pepperoni'));
    if (o.ticket.customer.id === 'sal') o.items.forEach(it => assert.ok(!it.spec.parts.some(p => p.ing === 'peppers'), 'Sal never gets peppers'));
  });
  assert.deepStrictEqual(O.canOrder(ladder, ['margherita', 'pepperoni'], ['pepperoni']), ['margherita']);
  assert.deepStrictEqual(O.canOrder(ladder, ['pepperoni'], ['pepperoni']), ['pepperoni'], 'never nothing at all');
});

test('the newest recipe goes to whoever asks for the newest (Reginald)', () => {
  let asked = 0;
  orders(ladder, { level: 4 }, 200, ({ o }) => {
    if (o.ticket.customer.id === 'reginald' && !o.ticket.odd) { asked += 1; assert.ok(o.items.some(it => it.spec.recipe === 'chicago'), JSON.stringify(o.items.map(x => x.spec.recipe))); }
  });
  assert.ok(asked > 50);
});

test('the ticket and the score: an odd order\'s ticket is plain and complete; scores are the judge\'s', () => {
  const s = { rng: R.seed(3) };
  const spec = O.fixed(ladder, s, ladder.oddOrders[0]);
  assert.deepStrictEqual(spec.picks, { crust: 'regular', sauce: 'bare', cut: 'c4' });
  assert.ok(!spec.parts.some(p => ['mozzarella', 'basil'].includes(p.ing)));
  assert.strictEqual(W.ticket(ladder, { items: [spec] }), 'Margherita: regular crust, sauce: none, nothing else on it, golden, cut in 4.');
  const o = L.create(ladder, { customer: { id: 'x', name: 'X' }, items: [spec] }, { settings: {} });
  while (o.phase !== 'served') L.answer(ladder, o, right(ladder, o, L.question(ladder, o, {})), {});
  assert.strictEqual(J.score(ladder, o).stars, 3);
});
