/** The assembly line. First the Burger Bar's line on the frozen diner (tests/packs/diner-golden):
 *  steps, Add/Skip/Swap It, cooking, the review and redo, what was made. Then the Food Court's
 *  line model on the test pizzeria (docs/api/line.md): slots and repeats, `when`, auto steps,
 *  stage-set cooking, paging, gross-outs on picks, made()'s additions and the Timed hold. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { G, golden: pack, diner, testPizza: P, pizza: oldPizza, O, L, S, W, R, right, random, play, makeOrder, run, flat } = require('./bot.cjs');

const SIMPLE = { cooking: 'simple' };
function order(recipe, opts) {
  opts = opts || {};
  const s = { rng: R.seed(5) };
  const spec = O.resolve(pack, recipe, s, { change: 0, set: opts.set });
  if (opts.hold) O.hold(spec, opts.hold);
  return L.create(pack, { customer: { id: 'marge', name: 'Marge' }, items: [spec].concat(opts.more || []) },
    { gross: opts.gross, tutorial: opts.tutorial, settings: opts.settings || SIMPLE });
}
const q = (o, st) => L.question(pack, o, st || SIMPLE);
const say = (o, id, st) => L.answer(pack, o, id, st || SIMPLE);
/** Answer the board's nine steps: add the listed ingredients, skip the rest. */
function board(o, adds) {
  for (let k = 0; k < 9; k++) { const x = q(o); say(o, adds.includes(x.ing) ? 'add' : 'skip'); }
}

/* ── the Burger Bar's line (the frozen diner) ──────────────────────────── */
test('the grill offers patties one at a time, up to three', () => {
  const o = order('tower');
  let x = q(o);
  assert.deepStrictEqual([x.kind, x.station, x.ing, x.offer, x.fresh], ['add', 'grill', 'patty', 1, true]);
  say(o, 'add'); x = q(o);
  assert.deepStrictEqual([x.offer, x.have, x.fresh], [2, 1, false]);
  say(o, 'add'); say(o, 'add');
  x = q(o);
  assert.strictEqual(x.kind, 'cook', 'after the third patty the grill moves on by itself');
  assert.deepStrictEqual(x.options.map(z => z.id), ['cook:rare', 'cook:medium', 'cook:mediumWell', 'cook:well']);
  assert.strictEqual(x.count, 3);
});

test('Skip ends the patties early; no patty means nothing to cook', () => {
  const o = order('hamburger');
  const r = say(o, 'skip');
  assert.ok(r.events.some(e => e.type === 'nothingToCook'));
  const x = q(o);
  assert.deepStrictEqual([x.station, x.ing, x.fresh], ['board', 'cheese', true]);
});

test('Simple cooking takes only its offered stages; Timed only Take It Off', () => {
  const o = order('hamburger');
  say(o, 'add'); say(o, 'skip');
  assert.ok(say(o, 'cook:charred').refused);
  assert.ok(say(o, 'takeOff').refused);
  const r = say(o, 'cook:well');
  assert.ok(r.events.some(e => e.type === 'cooked' && e.stage === 'well'));
  assert.ok(r.events.some(e => e.type === 'phase' && e.station === 'board'));
});

test('Swap It is only offered on a bad ingredient, and brings a fresh one', () => {
  const o = order('cheeseburger', { gross: { item: 0, ing: 'cheese', event: 'mouldy' } });
  say(o, 'add'); say(o, 'skip'); say(o, 'cook:medium');
  let x = q(o);
  assert.strictEqual(x.ing, 'cheese');
  assert.deepStrictEqual(x.gross, { event: 'mouldy' });
  assert.deepStrictEqual(x.options.map(z => z.id), ['add', 'skip', 'swap']);
  const r = say(o, 'swap');
  assert.ok(r.events.some(e => e.type === 'swapped'));
  x = q(o);
  assert.deepStrictEqual([x.ing, x.gross, x.fresh], ['cheese', null, false]);
  assert.deepStrictEqual(x.options.map(z => z.id), ['add', 'skip']);
  assert.ok(say(o, 'swap').refused);
});

test('adding the bad one serves it', () => {
  const o = order('cheeseburger', { gross: { item: 0, ing: 'cheese', event: 'mouldy' } });
  say(o, 'add'); say(o, 'skip'); say(o, 'cook:medium');
  const r = say(o, 'add');
  assert.ok(r.events.some(e => e.type === 'grossServed' && e.event === 'mouldy'));
  assert.strictEqual(o.items[0].gross.length, 1);
  assert.strictEqual(L.made(pack, o, 0).parts.find(p => p.ing === 'cheese').gross, 'mouldy');
});

test('the review offers Serve and a redo of each station; a redo comes straight back', () => {
  const o = order('cheeseburger');
  say(o, 'add'); say(o, 'skip'); say(o, 'cook:rare');
  board(o, ['cheese', 'lettuce']);
  let x = q(o);
  assert.strictEqual(x.kind, 'review');
  assert.deepStrictEqual(x.options.map(z => z.id), ['serve', 'redo:0:grill', 'redo:0:board']);
  say(o, 'redo:0:grill');
  x = q(o);
  assert.deepStrictEqual([x.station, x.ing, x.offer, x.fresh], ['grill', 'patty', 1, true]);
  say(o, 'add'); say(o, 'add'); say(o, 'skip'); say(o, 'cook:well');
  x = q(o);
  assert.strictEqual(x.kind, 'review', 'after the grill, the review, not the board again');
  const m = L.made(pack, o, 0);
  assert.deepStrictEqual(m.parts.map(p => p.ing), ['bun', 'patty', 'cheese', 'patty', 'cheese', 'lettuce', 'bun']);
  assert.ok(m.parts.filter(p => p.ing === 'patty').every(p => p.done === 'well'));
  assert.ok(say(o, 'serve').events.some(e => e.type === 'served'));
  assert.strictEqual(o.phase, 'served');
});

test('what was made stacks in the line order: bun, patties with their cheese, toppings, bun', () => {
  const o = order('baconCheeseburger');
  say(o, 'add'); say(o, 'skip'); say(o, 'cook:medium');
  board(o, ['cheese', 'bacon', 'tomato', 'ketchup', 'mayo']);
  assert.deepStrictEqual(L.made(pack, o, 0).parts.map(p => p.ing), ['bun', 'patty', 'cheese', 'bacon', 'tomato', 'ketchup', 'mayo', 'bun']);
});

test('more than three redo choices go in a row of the items', () => {
  const two = O.resolve(pack, 'hamburger', { rng: R.seed(2) }, { change: 0 });
  const o = order('cheeseburger', { more: [two] });
  for (let k = 0; k < 2; k++) { say(o, 'add'); say(o, 'skip'); say(o, 'cook:medium'); board(o, []); }
  const x = q(o);
  assert.deepStrictEqual(x.options.map(z => z.id), ['serve', 'redo']);
  assert.deepStrictEqual(x.options[1].row.map(z => z.id), ['redo:0', 'redo:1']);
  assert.deepStrictEqual(x.options[1].row[1].row.map(z => z.id), ['redo:1:grill', 'redo:1:board']);
});

test('unknown answers are refused and change nothing', () => {
  const o = order('hamburger');
  const before = JSON.stringify(o);
  assert.ok(say(o, 'nonsense').refused);
  assert.ok(say(o, 'serve').refused);
  assert.ok(say(o, undefined).refused);
  assert.strictEqual(JSON.stringify(o), before);
});

test('Timed: the food moves through its stages, and the ticket\'s stage lasts twice as long', () => {
  const T = { cooking: 'timed', speed: 'normal' };          // 5 s a stage
  const o = order('hamburger', { set: { doneness: 'medium' }, settings: T });
  say(o, 'add', T);
  const r = say(o, 'skip', T);
  assert.ok(r.events.some(e => e.type === 'cooking' && e.stage === 'raw'));
  let x = q(o, T);
  assert.deepStrictEqual([x.timed, x.stage, x.options.map(z => z.id)], [true, 'raw', ['takeOff']]);
  const stages = [];
  const nearly = [];
  for (let t = 0; t < 60; t++) L.tick(pack, o, 1, T).forEach(e => (e.type === 'stage' ? stages.push([t + 1, e.stage]) : e.type === 'nearly' && nearly.push(t + 1)));
  // raw 5 s, rare 5 s, medium (wanted) 10 s, medium well 5 s, well done 5 s, then charred and stop.
  assert.deepStrictEqual(stages, [[5, 'rare'], [10, 'medium'], [20, 'mediumWell'], [25, 'well'], [30, 'charred']]);
  assert.deepStrictEqual(nearly, [5], 'a heads-up one stage before the ticket\'s');
  x = q(o, T);
  assert.strictEqual(x.stage, 'charred');
  const done = say(o, 'takeOff', T);
  assert.ok(done.events.some(e => e.type === 'cooked' && e.stage === 'charred'));
});

test('Timed: the clock only moves when ticked (it freezes on Pause, cards and blur)', () => {
  const T = { cooking: 'timed', speed: 'slow' };
  const o = order('hamburger', { settings: T });
  say(o, 'add', T); say(o, 'skip', T);
  const snap = JSON.stringify(o.timer);
  assert.strictEqual(JSON.stringify(o.timer), snap);
  L.tick(pack, o, 0, T);
  assert.strictEqual(JSON.stringify(o.timer), snap);
});

test('Timed: the clock stands still while a switch is held, so Take It Off takes the stage shown when the press began', () => {
  const T = { cooking: 'timed', speed: 'normal' };          // raw lasts 5 s
  const o = order('hamburger', { set: { doneness: 'medium' }, settings: T });
  say(o, 'add', T); say(o, 'skip', T);
  L.tick(pack, o, 4.5, T);                                  // half a second before Rare
  assert.strictEqual(q(o, T).stage, 'raw');
  const before = L.timerProgress(pack, o, T);
  // Keydown on Take It Off: three seconds pass with the switch held, across where Rare would start.
  for (let k = 0; k < 12; k++) assert.deepStrictEqual(L.tick(pack, o, 0.25, T, true), []);
  assert.strictEqual(q(o, T).stage, 'raw', 'nothing moved while it was held');
  assert.strictEqual(L.timerProgress(pack, o, T), before, 'the gauge holds still too');
  const r = say(o, 'takeOff', T);                           // the release: the stage shown at keydown
  assert.ok(r.events.some(e => e.type === 'cooked' && e.stage === 'raw'));
  // The same three seconds without a held switch would have reached Rare.
  const free = order('hamburger', { set: { doneness: 'medium' }, settings: T });
  say(free, 'add', T); say(free, 'skip', T);
  L.tick(pack, free, 4.5, T);
  for (let k = 0; k < 12; k++) L.tick(pack, free, 0.25, T, false);
  assert.strictEqual(q(free, T).stage, 'rare');
});

test('the tutorial warns before a mistake lands, and applies nothing', () => {
  const o = order('baconCheeseburger', { set: { doneness: 'medium' }, hold: ['onion'], tutorial: true, gross: { item: 0, ing: 'cheese', event: 'mouldy' } });
  assert.deepStrictEqual(say(o, 'skip').warn.kind, 'tooFew');
  say(o, 'add');
  assert.deepStrictEqual(say(o, 'add').warn.kind, 'tooMany');
  say(o, 'skip');
  const w = say(o, 'cook:well').warn;
  assert.deepStrictEqual([w.kind, w.want, w.got], ['done', 'medium', 'well']);
  say(o, 'cook:medium');
  assert.strictEqual(say(o, 'add').warn.kind, 'gross');
  assert.strictEqual(say(o, 'skip').warn.kind, 'grossSkip');
  say(o, 'swap'); say(o, 'add');                       // fresh cheese
  say(o, 'add');                                       // bacon
  say(o, 'add'); say(o, 'add');                        // lettuce, tomato
  say(o, 'skip');                                      // pickles (not on it)
  const onion = say(o, 'add').warn;
  assert.deepStrictEqual([onion.kind, onion.ing, onion.held], ['extra', 'onion', true]);   // she said "no onions"
  say(o, 'skip');
  assert.strictEqual(say(o, 'skip').warn.kind, 'missing');   // ketchup is wanted
  say(o, 'add');                                       // ketchup
  const mustard = say(o, 'add').warn;                  // never mentioned: simply not on the ticket
  assert.deepStrictEqual([mustard.kind, mustard.ing, mustard.held], ['extra', 'mustard', false]);
});

test('the tutorial always cooks Simple, even with Timed set', () => {
  const T = { cooking: 'timed' };
  const o = order('hamburger', { tutorial: true, settings: T, set: { doneness: 'rare' } });
  say(o, 'add', T); say(o, 'skip', T);
  const x = q(o, T);
  assert.ok(!x.timed);
  assert.ok(x.options.some(z => z.id === 'cook:rare'));
});

test('made() keeps every field it had, and only adds picks, counts and auto', () => {
  const o = order('doubleCheeseburger', { set: { doneness: 'rare' } });
  run(pack, o, SIMPLE);
  const m = L.made(pack, o, 0);
  assert.deepStrictEqual(Object.keys(m), ['recipe', 'ing', 'parts', 'gross', 'picks', 'counts', 'auto']);
  assert.deepStrictEqual([m.recipe, m.ing], ['doubleCheeseburger', 'plate'], 'builds.on still names the item');
  assert.deepStrictEqual([m.picks, m.counts, m.auto], [{}, { patty: 2 }, []], 'an Add with a max above 1 is counted');
  const s = { rng: R.seed(3) };
  const fries = O.resolve(pack, 'onionRings', s, { change: 0 }), drink = O.resolve(pack, 'fountain', s, { change: 0, set: { cupSize: 'large', soda: 'cola' } });
  const two = L.create(pack, { customer: { id: 'x', name: 'X' }, items: [fries, drink] }, { settings: SIMPLE });
  run(pack, two, SIMPLE);
  const r = L.made(pack, two, 0), d = L.made(pack, two, 1);
  assert.deepStrictEqual([r.ing, r.done], ['rings', 'golden'], 'a from pick still names the item, and done is still the item\'s');
  assert.deepStrictEqual([d.ing, d.size, d.parts.find(p => p.flavour).ing], ['cup', 'large', 'cola']);
});

/* ── the Food Court's line model (the test pizzeria) ───────────────────── */
const pq = (o, st) => L.question(P, o, st || SIMPLE);
const pa = (o, id, st) => L.answer(P, o, id, st || SIMPLE);
/** Right answers until the question matches test(q). */
function until(o, testQ, st) {
  for (let k = 0; k < 60; k++) {
    const x = pq(o, st);
    if (!x || testQ(x)) return x;
    const id = right(P, o, x);
    if (id === null) L.tick(P, o, 1, st); else pa(o, id, st);
  }
  throw new Error('never got there');
}

test('a slot pick offers the slot\'s values and takes one; made() records it in picks and leaves the item alone', () => {
  const o = makeOrder(P, ['pepperoni'], { set: { crust: 'thin', sauce: 'white', bake: 'crispy', cut: 'c6' } });
  let x = pq(o);
  assert.deepStrictEqual([x.kind, x.of, x.slot, x.station, x.fresh], ['pick', 'slot', 'crust', 'prep', true]);
  assert.deepStrictEqual(x.options.map(z => z.id), ['pick:thin', 'pick:regular', 'pick:deepDish']);
  assert.strictEqual(L.expected(P, o.items[0], 'prep', 0), 'thin');
  assert.ok(pa(o, 'pick:nonsense').refused);
  assert.ok(pa(o, 'done').refused, 'Done belongs to repeats');
  assert.deepStrictEqual(pa(o, 'pick:thin').events, [{ type: 'picked', item: 0, of: 'slot', slot: 'crust', value: 'thin' }]);
  x = pq(o);
  assert.deepStrictEqual([x.slot, x.fresh], ['sauce', false], 'the next pick keeps the highlight');
  run(P, o, SIMPLE);
  const m = L.made(P, o, 0);
  assert.deepStrictEqual(m.picks, { crust: 'thin', sauce: 'white', cut: 'c6' });
  assert.deepStrictEqual([m.ing, m.done], ['pizza', 'crispy'], 'a slot never renames the item; the oven is still its done');
  assert.deepStrictEqual(m.parts.map(p => p.ing), ['dough', 'mozzarella', 'pepperoni']);
});

test('a repeat pick: no Done before the first, Done after it, and the step ends by itself at its max', () => {
  const o = makeOrder(P, ['knots'], { set: { dip: 'honey', heat: 'hot' } });
  let x = until(o, z => z.kind === 'pick');
  assert.deepStrictEqual([x.slot, x.repeat, x.have, x.offer, x.picked], ['dips', { max: 3 }, 0, 1, []]);
  assert.ok(!x.options.some(z => z.id === 'done'), 'nothing picked yet, so no Done');
  assert.ok(pa(o, 'done').refused);
  let r = pa(o, 'pick:honey');
  assert.deepStrictEqual(r.events, [{ type: 'picked', item: 0, of: 'slot', slot: 'dips', value: 'honey', n: 1 }]);
  x = pq(o);
  assert.deepStrictEqual([x.slot, x.have, x.offer, x.picked, x.fresh], ['dips', 1, 2, ['honey'], false]);
  assert.strictEqual(x.options[x.options.length - 1].id, 'done');
  pa(o, 'pick:tahini');
  r = pa(o, 'pick:honey');
  assert.ok(r.events.some(e => e.type === 'review'), 'the third dip is the last one');
  assert.deepStrictEqual(L.made(P, o, 0).picks.dips, ['honey', 'tahini', 'honey'], 'in the order they were picked');
  const early = makeOrder(P, ['knots'], { set: { dip: 'honey' } });
  until(early, z => z.kind === 'pick');
  pa(early, 'pick:ranch');
  r = pa(early, 'done');
  assert.deepStrictEqual(r.events[0], { type: 'pickDone', item: 0, slot: 'dips', values: ['ranch'], n: 1 });
  assert.strictEqual(early.phase, 'review');
});

test('when: a step the ticket does not use passes by with a null answer, by recipe or by slot', () => {
  const o = makeOrder(P, ['pepperoni'], { set: { crust: 'thin' } });
  const res = run(P, o, SIMPLE);
  const asked = res.seen.filter(z => z.kind !== 'review').map(z => z.slot || z.ing);
  assert.deepStrictEqual(asked, ['crust', 'sauce', 'mozzarella', 'pepperoni', 'peppers', 'pizza', 'cut'], 'no basil, no garlic');
  assert.deepStrictEqual(res.events.filter(e => e.type === 'passed').map(e => e.key), ['prep.5', 'prep.6']);
  assert.deepStrictEqual([o.items[0].answers['prep.5'], o.items[0].answers['prep.6']], [null, null]);
  assert.strictEqual(L.expected(P, o.items[0], 'prep', 5), null);
  // The same pizza on a deep dish crust is asked about the garlic; a Margherita about the basil.
  const deep = run(P, makeOrder(P, ['pepperoni'], { set: { crust: 'deepDish' } }), SIMPLE).seen.map(z => z.ing);
  assert.ok(deep.includes('garlic') && !deep.includes('basil'));
  const marg = run(P, makeOrder(P, ['margherita'], { set: { crust: 'regular' } }), SIMPLE).seen.map(z => z.ing);
  assert.ok(marg.includes('basil') && !marg.includes('garlic'));
  const step = { kind: 'add', ing: 'x', when: { slot: 'crust', in: ['thin', 'regular'] } };
  assert.ok(L.applies(step, { recipe: 'r', picks: { crust: 'thin' } }));
  assert.ok(!L.applies(step, { recipe: 'r', picks: { crust: 'deepDish' } }));
  assert.ok(!L.applies(step, { recipe: 'r' }), 'no value for the slot: not this ticket');
  assert.ok(L.applies({ kind: 'add', ing: 'x', when: { slot: 'dips', in: ['pesto'] } }, { recipe: 'r', picks: { dips: ['ranch', 'pesto'] } }), 'any one of a repeat');
  assert.ok(L.applies({ kind: 'add', ing: 'x', when: { recipes: ['r'], slot: 'crust', in: ['thin'] } }, { recipe: 'r', picks: { crust: 'thin' } }));
  assert.ok(!L.applies({ kind: 'add', ing: 'x', when: { recipes: ['q'] } }, { recipe: 'r' }));
});

test('auto steps run by themselves with an event, are never asked or judged, and run again on a redo', () => {
  const o = makeOrder(P, ['margherita']);
  const res = run(P, o, SIMPLE);
  const autos = res.events.filter(e => e.type === 'auto');
  assert.deepStrictEqual(autos, [
    { type: 'auto', item: 0, station: 'prep', key: 'prep.7', id: 'spin', show: 'doughSpin' },
    { type: 'auto', item: 0, station: 'cutter', key: 'cutter.1', id: 'box', show: 'boxUp' }]);
  assert.ok(!res.seen.some(z => z.kind === 'auto'));
  assert.deepStrictEqual(L.made(P, o, 0).auto, ['spin', 'box']);
  assert.deepStrictEqual([o.items[0].answers['prep.7'], o.items[0].answers['cutter.1']], [true, true]);
});

test('a redo runs a station again, flourish and all', () => {
  const o = makeOrder(P, ['margherita']);
  until(o, z => z.kind === 'review');
  const r = pa(o, 'redo:0:cutter');
  assert.deepStrictEqual(r.events.map(e => e.type), ['redo']);
  const x = pq(o);
  assert.deepStrictEqual([x.slot, x.fresh], ['cut', true]);
  const done = pa(o, x.options[0].id);
  assert.deepStrictEqual(done.events.map(e => e.type), ['picked', 'auto', 'phaseDone', 'review']);
});

test('a cook step names its stage set and its words; Simple offers that set\'s choices', () => {
  const o = makeOrder(P, ['margherita'], { set: { bake: 'crispy' } });
  const x = until(o, z => z.kind === 'cook');
  assert.deepStrictEqual([x.set, x.ing, x.fresh, x.options.map(z => z.id)], ['bake', 'pizza', true, ['cook:light', 'cook:golden', 'cook:crispy']]);
  assert.strictEqual(L.expected(P, o.items[0], 'oven', 0), 'crispy');
  assert.ok(pa(o, 'cook:burnt').refused);
  assert.ok(pa(o, 'cook:crispy').events.some(e => e.type === 'cooked' && e.stage === 'crispy'));
});

test('simple: \'auto\' cooks by itself in Simple, to exactly the ticket\'s stage; Timed asks, with the set\'s stop words', () => {
  const o = makeOrder(P, ['knots'], { set: { heat: 'hot' } });
  const res = run(P, o, SIMPLE);
  assert.ok(!res.seen.some(z => z.kind === 'cook'), 'Simple never asks');
  assert.deepStrictEqual(res.events.find(e => e.type === 'cooked'), { type: 'cooked', item: 0, ing: 'knots', stage: 'hot', count: 1, auto: true, key: 'warmer.2' });
  assert.deepStrictEqual(L.made(P, o, 0).picks.heat, 'hot', 'a cook step with want records its stage under that slot');
  assert.strictEqual(L.made(P, o, 0).done, undefined);
  const T = { cooking: 'timed', speed: 'normal' };
  const t = makeOrder(P, ['knots'], { set: { heat: 'hot' }, settings: T });
  const x = until(t, z => z.kind === 'cook', T);
  assert.deepStrictEqual([x.set, x.timed, x.stage, x.options.map(z => z.id)], ['warm', true, 'cold', ['takeOff']]);
  assert.strictEqual(L.expected(P, t.items[0], 'warmer', 2), 'hot', 'want: the knots\' heat slot');
  const tut = makeOrder(P, ['knots'], { set: { heat: 'warm' }, settings: T, tutorial: true });
  assert.ok(!run(P, tut, T).seen.some(z => z.kind === 'cook'), 'the tutorial cooks Simple');
});

test('Timed: a stage set\'s own speeds and wanted scale; the pack\'s when it has none', () => {
  const T = { cooking: 'timed', speed: 'normal' };
  const times = (recipe, set) => {
    const o = makeOrder(P, [recipe], { set, settings: T });
    until(o, z => z.kind === 'cook', T);
    const seen = [];
    for (let t = 1; t <= 60; t++) L.tick(P, o, 1, T).forEach(e => e.type === 'stage' && seen.push([t, e.stage]));
    return seen;
  };
  // warm: 6 s a stage, the ticket's stage three times as long.
  assert.deepStrictEqual(times('knots', { heat: 'hot' }), [[6, 'warm'], [12, 'hot'], [30, 'scorched']]);
  // bake: 5 s a stage, the ticket's twice.
  assert.deepStrictEqual(times('margherita', { bake: 'light' }), [[5, 'light'], [15, 'golden'], [20, 'crispy'], [25, 'burnt']]);
  const slow = { cooking: 'timed', speed: 'verySlow' };
  const o = makeOrder(P, ['knots'], { set: { heat: 'hot' }, settings: slow });
  until(o, z => z.kind === 'cook', slow);
  L.tick(P, o, 13, slow);
  assert.strictEqual(pq(o, slow).stage, 'cold', 'Very Slow: 14 s a stage');
  assert.ok(Math.abs(L.timerProgress(P, o, slow) - 13 / 14) < 1e-9);
});

test('paging: never more than four answers; six values are three and a More… row; nine page again, with Done kept in place', () => {
  const o = makeOrder(P, ['margherita'], { set: { cut: 'whole' } });
  const cut = until(o, z => z.slot === 'cut');
  assert.deepStrictEqual(cut.options.map(z => z.id), ['pick:c4', 'pick:c6', 'pick:c8', 'more']);
  assert.deepStrictEqual(cut.options[3].row.map(z => z.id), ['pick:c10', 'pick:c12', 'pick:whole']);
  assert.ok(pa(o, 'more').refused, 'More… is a row, not an answer');
  assert.ok(pa(o, 'pick:whole').events.some(e => e.type === 'picked' && e.value === 'whole'), 'a value in the row answers directly');
  const k = makeOrder(P, ['knots'], { set: { dip: 'tahini' } });
  let x = until(k, z => z.slot === 'dips');
  const ids = opts => opts.map(z => z.id);
  assert.deepStrictEqual(ids(x.options), ['pick:ranch', 'pick:garlicDip', 'more'], 'room is kept for Done');
  assert.deepStrictEqual(ids(x.options[2].row), ['pick:marinara', 'pick:honey', 'pick:bbq', 'pick:pesto', 'more:2']);
  assert.deepStrictEqual(ids(x.options[2].row[4].row), ['pick:buffalo', 'pick:chipotle', 'pick:tahini']);
  assert.ok(pa(k, 'more:2').refused);
  pa(k, 'pick:tahini');
  x = pq(k);
  assert.deepStrictEqual(ids(x.options), ['pick:ranch', 'pick:garlicDip', 'more', 'done'], 'the values stay where they were; Done joins');
  assert.deepStrictEqual(flat(x.options).map(z => z.id).length, 10);
});

test('the review pages its row of items past four, and never offers a station that asks nothing', () => {
  const s = { rng: R.seed(2) };
  const items = ['hamburger', 'fries', 'fountain', 'onionRings', 'tower', 'fries'].map(r => O.resolve(pack, r, s, { change: 0 }));
  const o2 = L.create(pack, { customer: { id: 'x', name: 'X' }, items }, { settings: SIMPLE });
  while (o2.phase === 'line') L.answer(pack, o2, right(pack, o2, L.question(pack, o2, SIMPLE)), SIMPLE);
  const x = L.question(pack, o2, SIMPLE);
  const row = x.options[1].row;
  assert.deepStrictEqual(row.map(z => z.id), ['redo:0', 'redo:1:fryer', 'redo:2:drinks', 'redo:3:fryer', 'more']);
  assert.deepStrictEqual(row[4].row.map(z => z.id), ['redo:4', 'redo:5:fryer']);
  assert.ok(L.answer(pack, o2, 'redo:5:fryer', SIMPLE).events.some(e => e.type === 'redo'));
  // A station whose every step the ticket passes by is left out of the review.
  const p2 = JSON.parse(JSON.stringify(P));
  p2.stations.extra = { name: 'Extra', backdrop: 'prep', steps: [{ kind: 'add', ing: 'basil', when: { recipes: ['margherita'] } }, { kind: 'auto', id: 'x', show: 'x' }] };
  p2.recipes.pepperoni.stations = ['prep', 'oven', 'cutter', 'extra'];
  const o3 = makeOrder(p2, ['pepperoni']);
  while (o3.phase === 'line') L.answer(p2, o3, right(p2, o3, L.question(p2, o3, SIMPLE)), SIMPLE);
  assert.deepStrictEqual(L.question(p2, o3, SIMPLE).options.map(z => z.id), ['serve', 'redo:0:prep', 'redo:0:oven', 'redo:0:cutter']);
});

test('a gross-out on a pick: the label names it, Swap It replaces it and asks again', () => {
  const o = makeOrder(P, ['pepperoni'], { set: { crust: 'thin', sauce: 'white' }, gross: { item: 0, slot: 'sauce', event: 'skin' } });
  pa(o, 'pick:thin');
  let x = pq(o);
  assert.deepStrictEqual(x.gross, { event: 'skin', value: 'white' }, 'the bad one is the value the ticket wants');
  assert.deepStrictEqual(x.options.map(z => z.id), ['pick:red', 'pick:white', 'pick:bare', 'swap']);
  assert.strictEqual(W.option(P, x, x.options[1], o).label, 'White sauce with a skin on it');
  const r = pa(o, 'swap');
  assert.deepStrictEqual(r.events, [{ type: 'swapped', item: 0, slot: 'sauce', value: 'white', event: 'skin' }]);
  x = pq(o);
  assert.deepStrictEqual([x.slot, x.gross, x.fresh, x.options.map(z => z.id)], ['sauce', null, false, ['pick:red', 'pick:white', 'pick:bare']]);
  assert.ok(pa(o, 'swap').refused);
  assert.strictEqual(o.items[0].swaps, 1);
});

test('choosing the bad value serves it; another value is a pick mistake, and the bad one goes back', () => {
  const served = makeOrder(P, ['pepperoni'], { set: { sauce: 'white' }, gross: { item: 0, slot: 'sauce', event: 'skin' } });
  pa(served, 'pick:regular');
  const r = pa(served, 'pick:white');
  assert.deepStrictEqual(r.events.slice(0, 2), [{ type: 'picked', item: 0, of: 'slot', slot: 'sauce', value: 'white' },
    { type: 'grossServed', item: 0, slot: 'sauce', value: 'white', event: 'skin' }]);
  assert.deepStrictEqual(served.items[0].gross, [{ slot: 'sauce', value: 'white', event: 'skin', key: 'prep.1' }]);
  assert.strictEqual(served.pending, null);
  run(P, served, SIMPLE);
  assert.deepStrictEqual(L.made(P, served, 0).gross, [{ slot: 'sauce', value: 'white', event: 'skin', key: 'prep.1' }]);
  const other = makeOrder(P, ['pepperoni'], { set: { sauce: 'white' }, gross: { item: 0, slot: 'sauce', event: 'skin' } });
  pa(other, 'pick:regular');
  assert.ok(!pa(other, 'pick:red').events.some(e => e.type === 'grossServed'));
  assert.strictEqual(other.pending, null);
  assert.deepStrictEqual(other.items[0].gross, []);
});

test('never a gross-out on a paged pick, a repeat, a cook step or an auto step', () => {
  for (const slot of ['cut', 'dips', 'heat']) {
    const o = makeOrder(P, [slot === 'cut' ? 'margherita' : 'knots'], { gross: { item: 0, slot, event: 'skin' } });
    for (const x of run(P, o, SIMPLE).seen) {
      assert.ok(!x.gross, slot + ': ' + JSON.stringify(x));
      assert.ok(!flat(x.options).some(z => z.id === 'swap'), slot);
    }
    assert.deepStrictEqual(o.items[0].gross, []);
  }
  const T = { cooking: 'timed', speed: 'normal' };
  const t = makeOrder(P, ['knots'], { settings: T, gross: { item: 0, slot: 'heat', event: 'skin' } });
  assert.ok(!run(P, t, T).seen.some(x => x.gross || flat(x.options).some(z => z.id === 'swap')));
});

test('the tutorial warns before a bad value lands, and before another value', () => {
  const o = makeOrder(P, ['pepperoni'], { set: { crust: 'thin', sauce: 'red' }, gross: { item: 0, slot: 'sauce', event: 'skin' }, tutorial: true });
  assert.deepStrictEqual(pa(o, 'pick:regular').warn, { kind: 'pick', of: 'slot', slot: 'crust', want: 'thin', got: 'regular' });
  pa(o, 'pick:thin');
  assert.deepStrictEqual(pa(o, 'pick:red').warn, { kind: 'gross', slot: 'sauce', value: 'red', event: 'skin' });
  assert.deepStrictEqual(pa(o, 'pick:white').warn, { kind: 'grossSkip', slot: 'sauce', want: 'red', got: 'white', event: 'skin' });
  assert.deepStrictEqual([o.items[0].answers['prep.1'], o.items[0].gross, o.pending], [undefined, [], { item: 0, slot: 'sauce', event: 'skin' }], 'nothing applied');
  pa(o, 'swap');
  assert.strictEqual(pa(o, 'pick:white').warn.kind, 'pick');
  assert.ok(!pa(o, 'pick:red').warn);
  const k = makeOrder(P, ['knots'], { set: { dip: ['pesto', 'ranch'] }, tutorial: true });
  until(k, z => z.slot === 'dips');
  assert.deepStrictEqual(pa(k, 'pick:honey').warn, { kind: 'pick', of: 'slot', slot: 'dips', want: 'pesto', got: 'honey' });
  pa(k, 'pick:pesto');
  assert.deepStrictEqual(pa(k, 'pick:pesto').warn, { kind: 'tooMany', of: 'slot', slot: 'dips', want: 1, have: 1 }, 'one dip at change 0');
  assert.ok(!pa(k, 'done').warn);
});

/* ── every pack: screens, three stars, shifts ──────────────────────────── */
for (const p of [pack, P]) {
  test(p.id + ': every screen has at most four answers, every row at most five, and every recipe makes 3 stars in Simple and Timed', () => {
    for (const recipe of Object.keys(p.recipes)) {
      for (const cooking of ['simple', 'timed']) {
        const st = { cooking, speed: 'normal' };
        const o = makeOrder(p, [recipe], { settings: st });
        const res = run(p, o, st);
        for (const x of res.seen) {
          assert.ok(x.options.length <= L.MAX_ANSWERS, recipe + ' ' + x.kind + ' offers ' + x.options.length);
          const rows = opts => opts.forEach(z => { if (z.row) { assert.ok(z.row.length <= L.MAX_ANSWERS + 1, 'a row is too long'); rows(z.row); } });
          rows(x.options);
        }
        assert.strictEqual(require('./bot.cjs').J.score(p, o).stars, 3, recipe + ' (' + cooking + ')');
      }
    }
  });
}

test('test pizzeria: 400 bot shifts across every setting; the right answers always earn 3 stars and nothing gets stuck', () => {
  const styles = ['simple', 'usual', 'fancy'], cookings = ['simple', 'timed'], lengths = [3, 5, 8];
  const kinds = new Set();
  for (let seed = 1; seed <= 400; seed++) {
    const settings = { orders: styles[seed % 3], cooking: cookings[(seed >> 2) % 2], shiftLength: lengths[(seed >> 3) % 3], speed: 'normal' };
    const s = S.create(P, { seed, settings });
    const bot = seed % 2 ? random(s) : (x, o) => right(P, o, x);
    while (!s.done) {
      const r = play(P, s, bot).result;
      assert.ok(r.stars >= 1 && r.stars <= 3 && r.tip >= 1);
      r.mistakes.forEach(m => kinds.add(m.kind + (m.slot ? ':slot' : '')));
      if (!(seed % 2)) assert.strictEqual(r.stars, 3, 'seed ' + seed + ': ' + JSON.stringify(r.mistakes));
    }
    assert.strictEqual(S.results(s).orders, settings.shiftLength);
  }
  for (const k of ['extra', 'missing', 'count', 'count:slot', 'done', 'pick:slot', 'gross']) assert.ok(kinds.has(k), 'random play makes ' + k);
});

test('test pizzeria: the tutorial plays to 3 stars, swapping the skin on the sauce', () => {
  const s = S.create(P, { seed: 99, tutorial: true });
  const o = S.next(P, s);
  assert.deepStrictEqual(o.pending, { item: 0, slot: 'sauce', event: 'skin' });
  const r = play(P, s, (x, ord) => right(P, ord, x));
  assert.deepStrictEqual([r.result.stars, r.result.swaps], [3, 1]);
});

test('test pizzeria: a shift saved in the middle of an order continues exactly', () => {
  for (const cooking of ['simple', 'timed']) {
    const go = (cut) => {
      let s = S.create(P, { seed: 21, settings: { shiftLength: 4, cooking, orders: 'fancy', speed: 'normal' } });
      const log = [];
      let steps = 0;
      while (!s.done) {
        S.next(P, s);
        while (s.order.phase !== 'served') {
          if (steps++ === cut) s = JSON.parse(JSON.stringify(s));
          const x = S.question(P, s), id = right(P, s.order, x);
          if (id === null) { S.tick(P, s, 1); continue; }
          S.answer(P, s, id);
        }
        log.push(JSON.stringify(S.serve(P, s)));
      }
      return log.join('\n');
    };
    assert.strictEqual(go(23), go(-1), cooking);
  }
});

/* ── the rules know no pack ────────────────────────────────────────────── */
test('no js/core file names an ingredient, station, recipe, slot, slot value or pack id', () => {
  const ids = new Set();
  for (const p of [diner, pack, P, oldPizza]) {
    ids.add(p.id);
    [p.ingredients, p.stations, p.recipes, p.slots || {}].forEach(m => Object.keys(m).forEach(k => ids.add(k)));
    Object.values(p.slots || {}).forEach(sl => sl.values.forEach(v => ids.add(v.id)));
  }
  const dir = path.join(G, 'js', 'core');
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const id of ids) for (const qt of ["'", '"', '`']) assert.ok(!src.includes(qt + id + qt), f + ' names ' + id);
  }
});
