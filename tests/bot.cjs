/** Test helpers: the packs (merged with the cast, as the page uses them), the rules modules, and
 *  bots that play the line. core-b's (FOODCOURT-BUILD.md 10); docs/api/line.md says how the bots
 *  answer each kind of step, docs/api/shift.md how the packs are loaded.
 *
 *  restaurants()  every restaurant pack in packs/ (not court, cast or shared), or only those named
 *                 in BB_PACKS=<id,...>: [{ id, raw, pack (merged), script (merged), rawScript, error }]
 *  diner          the live diner, merged; golden: today's diner frozen (tests/packs/diner-golden),
 *                 merged: every diner-specific assertion runs on it
 *  testPizza      the test pizzeria on the new line model, merged with TEST_CAST (pizza is the same)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const G = path.join(__dirname, '..');
const load = p => require(path.join(G, p));
const exists = p => fs.existsSync(path.join(G, p));
const R = load('js/core/rng.js'), O = load('js/core/orders.js'), L = load('js/core/line.js');
const J = load('js/core/judge.js'), S = load('js/core/shift.js'), W = load('js/core/words.js');
const SC = load('js/core/script.js'), schema = load('js/core/schema.js'), F = load('js/core/savefmt.js');
const C = load('js/core/cast.js'), PR = load('js/core/progress.js');

/** The cast (packs/cast/cast.js). */
const CAST = load('packs/cast/cast.js');
/** The cast plus the test pizzeria's own customers, who live only in tests. */
const TEST_CAST = { people: Object.assign({}, CAST.people, {
  nonna: { name: 'Nonna', art: 'nonna', role: 'regular', tts: { pitch: 1.2, rate: 0.9 } },
  rocco: { name: 'Rocco', art: 'rocco', role: 'regular', tts: { pitch: 0.8, rate: 1.1 } },
  bruno: { name: 'Bruno', art: 'bruno', role: 'regular', tts: { pitch: 0.6, rate: 1 }, twin: true },
  gina: { name: 'Gina', art: 'gina', role: 'regular', tts: { pitch: 1.4, rate: 1.2 } },
}) };
const merge = (pack, cast) => C.merge(cast || CAST, pack);

/** The live diner: the every-pack checks only. */
const diner = merge(load('packs/diner/pack.js'));
/** Today's diner, frozen on 2026-11-08 (tests/packs/diner-golden), merged with the cast. Every
 *  diner-specific assertion (wording, press counts, the tutorial, Sal...) runs on it. */
const golden = merge(load('tests/packs/diner-golden/pack.js'));
const goldenScript = load('tests/packs/diner-golden/script.js');
/** Who the Burger Bar drew before the Food Court: pass as `drawn` for the old diner's cast. */
const GOLDEN_DRAWN = ['marge', 'gus', 'bev', 'vernon', 'sal'];
/** The test pizzeria on the new line model: slots, a repeat, when, auto steps, cook words, a
 *  gross-out on a pick, paging. */
const testPizza = merge(load('tests/packs/test-pizza/pack.js'), TEST_CAST);
const pizza = testPizza;

/* ── the restaurants ───────────────────────────────────────────────────── */
const NOT_RESTAURANTS = ['court', 'cast', 'shared'];
const ONLY = process.env.BB_PACKS ? process.env.BB_PACKS.split(',').map(x => x.trim()).filter(Boolean) : null;
/** Restaurant pack ids in packs/ (a folder with a pack.js), BB_PACKS-filtered. */
function packIds() {
  const dir = path.join(G, 'packs');
  return fs.readdirSync(dir).filter(id => !NOT_RESTAURANTS.includes(id) && fs.existsSync(path.join(dir, id, 'pack.js')))
    .filter(id => !ONLY || ONLY.includes(id)).sort();
}
const optional = rel => (exists(rel) ? load(rel) : null);
/** The cast script and the court script, when they exist. */
const castScript = () => optional('packs/cast/script.js');
const courtScript = () => optional('packs/court/script.js');
let cache = null;
/** Every restaurant: [{ id, raw, pack, rawScript, script, error }] (error: why it didn't load). */
function restaurants() {
  if (cache) return cache;
  cache = packIds().map(id => {
    const out = { id };
    try {
      out.raw = load('packs/' + id + '/pack.js');
      out.pack = merge(out.raw);
      out.rawScript = optional('packs/' + id + '/script.js') || { lines: [] };
      out.script = SC.merge(out.pack, out.rawScript, castScript());
    } catch (e) { out.error = e.message; }
    return out;
  });
  return cache;
}
/** Is a pack's script complete enough for the coverage checks (spec: format 3)? */
const scriptDone = pack => +pack.format >= 3;
/** Every level a pack's shifts run at. */
const LEVELS = [1, 2, 3, 4, 5];

/** Every answer on a screen and in its More… rows (rows inside rows), without the rows. */
const flat = options => options.flatMap(x => (x.row ? flat(x.row) : [x]));
/** The ids to press to reach an answer: [] if it is not there; ['more', 'pick:x'] through a row. */
function pathTo(options, id) {
  for (const x of options) {
    if (x.id === id) return [id];
    if (x.row) { const p = pathTo(x.row, id); if (p.length) return [x.id].concat(p); }
  }
  return [];
}

/** The answer the ticket wants, for every kind of step:
 *    add      a bad one is swapped first; then Add until the ticket's count, then Skip (Done)
 *    cook     Simple: cook:<the ticket's stage>; Timed: takeOff at the ticket's stage, or null
 *             ("let it cook another second"); a step the ticket says nothing about takes the first
 *    pick     a bad value is swapped first; the ticket's value, searched through every More… row;
 *             a repeat picks the ticket's values one by one (any order is right), then Done
 *    review   serve
 *  Steps passed by `when`, flourishes and Simple's automatic cooking never ask. */
function right(pack, o, q) {
  if (q.kind === 'review') return 'serve';
  const want = L.expected(pack, o.items[q.item], q.station, q.step);
  if (q.kind === 'add') { if (q.gross) return 'swap'; return q.have < want ? 'add' : 'skip'; }
  if (q.kind === 'cook') {
    if (q.timed) return want === null || q.stage === want ? 'takeOff' : null;
    return want === null ? q.options[0].id : 'cook:' + want;
  }
  if (q.kind === 'pick') {
    if (q.gross) return 'swap';
    const leaves = flat(q.options);
    if (q.repeat) {
      const left = L.remaining(want || [], q.picked);
      if (!left.length) return q.have ? 'done' : leaves.find(x => x.value !== undefined).id;
      return leaves.find(x => x.value === left[0]).id;
    }
    if (want === null) return leaves.find(x => x.value !== undefined).id;
    return leaves.find(x => x.value === want).id;
  }
  return null;
}

/** A random but legal answer, for bot shifts: any answer on the screen or in its rows (Done and
 *  Swap It included); Timed food comes off at a 20% chance a second; the review serves at 70%,
 *  otherwise redoes a station. */
function random(s) {
  return (q) => {
    const rnd = () => R.next(s.botRng || (s.botRng = { rng: R.seed(s.seed * 7 + 3) }));
    if (q.kind === 'cook' && q.timed) return rnd() < 0.2 ? 'takeOff' : null;
    const leaves = flat(q.options);
    if (q.kind === 'review') {
      const redos = leaves.filter(x => x.id.startsWith('redo:') && x.station);
      return rnd() < 0.7 || !redos.length ? 'serve' : redos[Math.floor(rnd() * redos.length)].id;
    }
    return leaves[Math.floor(rnd() * leaves.length)].id;
  };
}

/** Play the current order to its serve. choose(q, o) -> an answer id, or null to let Timed
 *  food cook another second. Returns { presses, warnings, result }; presses count every More…
 *  row entered. */
function play(pack, s, choose, opts) {
  opts = opts || {};
  const o = S.next(pack, s);
  let presses = 0, guard = 0;
  const warnings = [];
  while (o.phase !== 'served') {
    if (++guard > 2000) throw new Error('order never finished');
    const q = S.question(pack, s);
    const id = choose(q, o);
    if (id === null || id === undefined) { S.tick(pack, s, 1); continue; }
    const r = S.answer(pack, s, id);
    if (r.refused) throw new Error('refused ' + id + ' at ' + JSON.stringify(q));
    if (r.warn) { warnings.push(r.warn); if (opts.onWarn) opts.onWarn(r.warn, q); continue; }
    presses += pathTo(q.options, id).length || 1;
  }
  return { presses, warnings, result: S.serve(pack, s) };
}

/** An order of recipes as written (change 0), without a shift. opts: { set, hold, settings,
 *  gross, tutorial, customer, seed }. */
function makeOrder(pack, recipes, opts) {
  opts = opts || {};
  const s = { rng: R.seed(opts.seed || 5) };
  const items = [].concat(recipes).map(r => O.hold(O.resolve(pack, r, s, { change: 0, set: opts.set }), opts.hold));
  return L.create(pack, { customer: opts.customer || { id: 'x', name: 'X' }, items },
    { gross: opts.gross, tutorial: opts.tutorial, settings: opts.settings || { cooking: 'simple' } });
}
/** Answer an order to its serve with choose(q, o) (right answers by default), ticking Timed food
 *  a second at a time. Every More… row entered costs a press too. -> { seen, presses, warnings,
 *  events }. */
function run(pack, o, settings, choose, opts) {
  settings = settings || { cooking: 'simple' };
  choose = choose || ((q, ord) => right(pack, ord, q));
  opts = opts || {};
  const seen = [], warnings = [], events = [];
  let presses = 0, guard = 0;
  while (o.phase !== 'served') {
    if (++guard > 3000) throw new Error('order never finished');
    const q = L.question(pack, o, settings);
    seen.push(q);
    const id = choose(q, o);
    if (id === null || id === undefined) { events.push(...L.tick(pack, o, 1, settings)); continue; }
    const r = L.answer(pack, o, id, settings);
    if (r.refused) throw new Error('refused ' + id + ' at ' + JSON.stringify(q));
    if (r.warn) { warnings.push(r.warn); if (opts.onWarn) opts.onWarn(r.warn, q); continue; }
    presses += pathTo(q.options, id).length || 1;
    events.push(...r.events);
  }
  return { seen, presses, warnings, events };
}
/** The presses the right answers take for these items (specs), Serve included. */
function pressesFor(pack, items, cooking) {
  const settings = { cooking: cooking || 'simple', speed: 'normal' };
  const o = L.create(pack, { customer: { id: 'x', name: 'X' }, items: JSON.parse(JSON.stringify(items)) }, { settings });
  return run(pack, o, settings).presses;
}

/** A recipe at a level, made concrete: the level's style, drawn like any order (seeded). */
function itemAt(pack, recipe, level, seed, ctx) {
  const style = S.styleFor(pack, { level, settings: {} });
  return O.resolve(pack, recipe, { rng: R.seed(seed) }, Object.assign({ style }, ctx));
}
/** The recipes an item can be at a level: the normal ones on offer; the event's at level 'event'. */
const recipesAt = (pack, level) => (level === 'event' ? Object.keys(pack.recipes).filter(r => S.recipeLevel(pack.recipes[r]) === 'event') : S.recipesFor(pack, level));
/** Presses per recipe per level with the right answers, Serve included (spec 4.3 says every
 *  content agent reports these): [{ recipe, level, simple: [min, max], timed: [min, max] }]. Run it:
 *  node -e "console.table(require('./tests/bot.cjs').pressReport('pizza'))" */
function pressReport(packOrId, seeds) {
  const pack = typeof packOrId === 'string' ? merge(load('packs/' + packOrId + '/pack.js')) : packOrId;
  const out = [];
  for (const level of LEVELS) {
    for (const recipe of recipesAt(pack, level)) {
      const row = { recipe, level };
      for (const cooking of ['simple', 'timed']) {
        let lo = Infinity, hi = 0;
        for (let seed = 1; seed <= (seeds || 40); seed++) {
          const n = pressesFor(pack, [itemAt(pack, recipe, level, seed)], cooking);
          lo = Math.min(lo, n); hi = Math.max(hi, n);
        }
        row[cooking] = [lo, hi];
      }
      out.push(row);
    }
  }
  return out;
}

module.exports = { G, load, exists, CAST, TEST_CAST, merge, diner, golden, goldenScript, GOLDEN_DRAWN, pizza, testPizza,
  R, O, L, J, S, W, SC, schema, F, C, PR, packIds, restaurants, castScript, courtScript, scriptDone, LEVELS,
  flat, pathTo, right, random, play, makeOrder, run, pressesFor, itemAt, recipesAt, pressReport };
