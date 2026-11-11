'use strict';
/* Ben's Food Court - whole shifts played through the real page, headless, by switch presses.
 *
 * Loads index.html in jsdom (a Node DOM: no browser, no rendering, no GPU - safe on this PC)
 * with the hub's real shared scanner, voice manager and input guard. Only speech, media,
 * canvas and three.js's WebGL renderer are faked. A driver presses Space and Enter
 * (keydown/keyup, like a switch interface), or waits for Auto Scan and presses Enter, and
 * plays the whole chain: the main menu over the out-of-focus court, Play pulling it into
 * focus, the storefront scan on the court picture, a storefront, the first-visit card, the
 * tutorial, shifts to the results board, Pause, Settings, Food Court and back (the shift
 * resumes), the five-star event, the 5 s Enter hold, the Timed hold across a stage boundary;
 * and on the court: How to Play, its Pause, the moments (a Grand Opening, a gold sign, the
 * grand celebration), the parts of the U, pointer clicks on the storefronts.
 * Any script error fails the run; every card and the court must open at -1. The first run ('the page boots')
 * checks that every script index.html names loads with no console error or warning, and that every restaurant whose
 * pack, script or food module is on disk is on the page.
 *
 * jsdom is not a hub dependency. Install it anywhere and point at it:
 *   npm i jsdom@24 --prefix <dir>   then   JSDOM=<dir>/node_modules/jsdom node tests/dom-play.cjs [run words]
 * Options (docs/api/page.md): --pack <id> plays every run that names no restaurant of its own at <id> (and the runs
 * that name <id>); a run's `court: { here: {...} }` seeds whichever restaurant it plays. Runs that name a restaurant
 * (`pack`: the pizza's, the pointer's real click into the Burger Bar, the chain) keep it.
 */
const path = require('path'), fs = require('fs');
const jsdom = require(process.env.JSDOM || 'jsdom');
const { JSDOM, VirtualConsole } = jsdom;
const GAME = path.join(__dirname, '..');
const HUB = path.join(GAME, '..', '..', '..');
const ORIGIN = 'http://hub.local/';
const L = require(path.join(GAME, 'js/core/line.js'));
const CAST = require(path.join(GAME, 'packs/cast/cast.js'));
const CASTM = require(path.join(GAME, 'js/core/cast.js'));
const COURT = require(path.join(GAME, 'packs/court/court.js'));
const RULES = require(path.join(GAME, 'js/core/court.js'));
const SHIFT = require(path.join(GAME, 'js/core/shift.js'));
const SAVEFMT = require(path.join(GAME, 'js/core/savefmt.js'));
/** A shift in progress at a restaurant, as bb-shift:<pack> keeps it (one customer on the line). */
function savedShift(id) {
  const pack = packOf(id), s = SHIFT.create(pack, { seed: 77, level: 1, settings: { cooking: 'simple', speed: 'verySlow', orders: 'stars', shiftLength: 3 } });
  SHIFT.next(pack, s);
  return JSON.stringify(SAVEFMT.wrap('shift', pack, s));
}
const packOf = id => CASTM.merge(CAST, require(path.join(GAME, 'packs/' + id + '/pack.js')));
const FOOD = require(path.join(GAME, 'js/food/kit.js'));
/** The Settings card's rows, in order (spec 6.4); Cooking Speed is off (unscanned) with Simple cooking. */
const SETTINGS_ROWS = ['tts', 'voice', 'cooking', 'speed', 'shiftLength', 'orders', 'manager', 'characterVoices', 'theme', 'motion', 'textSize',
  'graphics-quality', 'autoScan', 'scanSpeed', 'sfx', 'reset', 'back'];
/** The main menu (spec 6.1): its items in order and what it says on open. */
const MENU_ITEMS = ['play', 'howto', 'settings', 'exit'];
const MENU_LINE = "Ben's Food Court. Play, How to Play, Settings, or Exit Game.";
/** How to Play's words, exactly as spec 6.1 has them (the blockquote after "The text says the point of the game:"). */
const HOWTO = (() => {
  const md = fs.readFileSync(path.join(GAME, 'docs/FOODCOURT-BUILD.md'), 'utf8').split(/\r?\n/);
  const out = [];
  for (let k = md.findIndex(l => l.includes('The text says the point of the game:')) + 1; k > 0 && k < md.length; k++) {
    const l = md[k].trim();
    if (!l) { if (out.length) break; continue; }
    if (!l.startsWith('>')) break;
    out.push(l.replace(/^>\s?/, ''));
  }
  return out.join(' ');
})();
/** Every restaurant at five stars with its gold sign already up: the grand celebration is due. */
const ALL_GOLD = Object.fromEntries(COURT.restaurants.map(r => [r.pack, { opened: true, grandOpeningSeen: true, popularity: 10, stars: 5, gold: true, goldSeen: true, tutorialDone: true }]));
const OTHERS = COURT.restaurants.map(r => r.pack).filter(id => id !== 'diner');
/** Every restaurant open, its Grand Opening seen (the four shut at the start seeded open: the all-seven chain, the crowd). */
const ALL_OPEN = Object.fromEntries(COURT.unlocks.map(u => [u.pack, { opened: true, grandOpeningSeen: true }]));

class HubFiles extends jsdom.ResourceLoader {
  fetch(url, options) {
    if (!url.startsWith(ORIGIN)) return super.fetch(url, options);
    const file = path.join(HUB, decodeURIComponent(url.slice(ORIGIN.length).split('?')[0]));
    const p = new Promise((resolve, reject) => fs.readFile(file, (err, buf) => (err ? reject(err) : resolve(buf))));
    p.abort = () => {};
    return p;
  }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
/** A line answer by its value, at any depth of More… rows; and the ids to choose to reach an answer: each row entered
 *  on the way, then the answer ([id] when it is on the screen). content-icecream, 2026-11-10 (pilot.md 5.5). */
function leafOf(options, value) {
  for (const x of options) { if (x.row) { const y = leafOf(x.row, value); if (y) return y; } else if (x.value === value) return x; }
  return null;
}
function pathOf(options, id) {
  for (const x of options) {
    if (x.id === id && !x.row) return [id];
    if (x.row) { const p = pathOf(x.row, id); if (p.length) return [x.id].concat(p); }
  }
  return [];
}

function fakeContext() {
  const grad = { addColorStop() {} };
  const target = { canvas: null, createLinearGradient: () => grad, createRadialGradient: () => grad, measureText: t => ({ width: String(t).length * 8 }),
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }) };
  return new Proxy(target, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
}

/** The page's timers as a browser's: never early by Date.now(). jsdom's setTimeout is Node's, which counts from
 *  libuv's cached loop time; after a long callback (a busy machine) that lags Date.now(), so a timer fires "early" by
 *  the wall clock. The hub's choice scanner arms its Auto Scan step with `due = Date.now() + interval` and drops a
 *  timer that fires before `due` without arming another, so the one-switch scan stopped for good under CPU load
 *  (the flake). A timer that wakes before its due time here sleeps the rest. */
function browserTimers(w) {
  const set = w.setTimeout.bind(w), clear = w.clearTimeout.bind(w), live = new Map();
  let next = 1;
  w.setTimeout = function (fn, ms, ...args) {
    const id = next++, due = Date.now() + Math.max(0, +ms || 0);
    const wake = () => {
      const left = due - Date.now();
      if (left > 0) { live.set(id, set(wake, left)); return; }
      live.delete(id);
      if (typeof fn === 'function') fn(...args); else w.eval(String(fn));
    };
    live.set(id, set(wake, Math.max(0, +ms || 0)));
    return id;
  };
  w.clearTimeout = id => { if (live.has(id)) { clear(live.get(id)); live.delete(id); } };
}

function stub(w, errors, renders, slow, spoken) {
  w.addEventListener('error', e => errors.push('window error: ' + (e.error && e.error.stack || e.message)));
  w.addEventListener('unhandledrejection', e => errors.push('unhandled rejection: ' + (e.reason && e.reason.stack || e.reason)));
  browserTimers(w);
  let current = null;
  w.SpeechSynthesisUtterance = function (text) { this.text = text; };
  w.speechSynthesis = {
    speaking: false, pending: false,
    getVoices: () => [{ name: 'Fake English', lang: 'en-US', default: true }],
    speak(u) {
      spoken.push(String(u.text));
      this.speaking = true; current = u;
      setTimeout(() => { if (current === u && u.onstart) u.onstart(); }, 2);
      // slow: true (9 ms a character, as long as a voice would take), or the ms a character (speechMsPerChar).
      setTimeout(() => { if (current !== u) return; current = null; this.speaking = false; if (u.onend) u.onend(); }, slow ? 40 + String(u.text).length * (slow === true ? 9 : slow) : 6 + String(u.text).length / 4);
    },
    cancel() { const u = current; current = null; this.speaking = false; if (u && u.onerror) u.onerror({ error: 'interrupted' }); },
    addEventListener() {}, removeEventListener() {},
  };
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  // A recording "plays" and ends a moment later.
  w.HTMLMediaElement.prototype.play = function () { setTimeout(() => { if (this.onended) this.onended(); }, 20); return Promise.resolve(); };
  w.HTMLMediaElement.prototype.pause = function () {};
  w.HTMLMediaElement.prototype.load = function () {};
  w.Element.prototype.animate = function () { return { finished: Promise.resolve(), cancel() {}, finish() {} }; };
  w.HTMLCanvasElement.prototype.getContext = function () { const c = fakeContext(); c.canvas = this; return c; };
  // three.js arrives as window.THREE (an empty object it then fills in): its WebGLRenderer slot is
  // taken first by a renderer that only records what it would draw, so three.js's own is never used.
  class FakeRenderer {
    constructor() { this.domElement = w.document.createElement('canvas'); this.outputColorSpace = ''; }
    setPixelRatio() {} setSize() {} setClearColor() {}
    render(scene, camera) { renders.n += 1; renders.last = { scene, camera }; }
  }
  let T;
  Object.defineProperty(w, 'THREE', { configurable: true, get: () => T, set: v => {
    T = v;
    if (v && typeof v === 'object') Object.defineProperty(v, 'WebGLRenderer', { configurable: true, enumerable: true, get: () => FakeRenderer, set: () => {} });
  } });
}

/** The bb-court record to seed: a new court, with opts.court's fields laid over each restaurant's entry
 *  ({ diner: { popularity: 7, stars: 4 } }). The run's own restaurant has had its first visit unless the run
 *  tests the offer (opts.offer). */
function courtRecord(opts) {
  const state = RULES.create(COURT);
  const seed = opts.court || {};
  Object.keys(seed).forEach(k => { const id = k === 'here' ? opts.pack : k; if (state.restaurants[id]) Object.assign(state.restaurants[id], seed[k]); });
  if (!opts.offer) [opts.pack].concat(opts.chain || []).forEach(id => { if (state.restaurants[id]) state.restaurants[id].tutorialDone = true; });
  // A run played at a restaurant that is shut at the start (--pack smoothie, burrito, sushi, icecream) seeds it open, its
  // Grand Opening seen, with every restaurant that opens before it; court-only runs (but one that walks up to the
  // first-visit card) and runs that play a court moment seed their own (content-smoothie, 2026-11-09).
  const shut = id => state.restaurants[id] && !state.restaurants[id].opened;
  if (opts.pack && (!opts.courtOnly || opts.offer) && !opts.moments && shut(opts.pack)) {
    const k = COURT.unlocks.findIndex(u => u.pack === opts.pack);
    COURT.unlocks.slice(0, k + 1).forEach(u => { if (shut(u.pack)) Object.assign(state.restaurants[u.pack], { opened: true, grandOpeningSeen: true }); });
  }
  // A court-only run never goes in, so a restaurant shut at the start has not had its first visit unless the run seeds
  // it (its Grand Opening banner stays up until then: --pack smoothie's Grand Opening run).
  if (opts.courtOnly && shut(opts.pack) && !COURT.restaurants.some(r => r.pack === opts.pack && r.start) && seedOf(opts, opts.pack).tutorialDone === undefined) state.restaurants[opts.pack].tutorialDone = false;
  if (opts.celebrationSeen) Object.assign(state, { celebrated: true, celebrationSeen: true });
  return RULES.record(RULES.normalize(COURT, state));
}
/** What a run seeded for this restaurant (`here` is the run's own). */
const seedOf = (opts, id) => (opts.court && (opts.court[id] || (id === opts.pack && opts.court.here))) || {};

/** The page boots clean (spec 9, integrate 2026-11-09): every script and stylesheet index.html names loads (jsdom
 *  reports one that does not: in a browser that is a console error), nothing calls console.error, the only warning
 *  is three.js's own notice, and every restaurant on disk is on the page: a packs/<id>/pack.js, its script.js and a
 *  js/food/<id>.js each loaded (BBPacks, BBScripts, BB.food), with its art manifest. */
function bootChecks(w, loadErrors, warns, errors) {
  loadErrors.forEach(m => errors.push('the page did not load cleanly: ' + m));
  warns.filter(x => !/build\/three(\.min)?\.js" are deprecated/.test(x)).forEach(x => errors.push('a warning at boot: ' + x));
  const html = fs.readFileSync(path.join(GAME, 'index.html'), 'utf8');
  for (const m of html.matchAll(/<(?:script|link)[^>]*(?:src|href)="([^"]+)"/g)) {
    if (/favicon/.test(m[1])) continue;   // the hub's site icons, as every hub game names them (the website has them)
    if (!fs.existsSync(path.join(GAME, m[1]))) errors.push('index.html names ' + m[1] + ', which is not there');
  }
  for (const id of fs.readdirSync(path.join(GAME, 'packs')).filter(d => fs.existsSync(path.join(GAME, 'packs', d, 'pack.js')))) {
    if (!w.BBPacks || !w.BBPacks[id]) { errors.push('packs/' + id + '/pack.js is on disk but not on the page (docs/api/pilot.md: the index.html lines)'); continue; }
    if (fs.existsSync(path.join(GAME, 'packs', id, 'script.js')) && !(w.BBScripts && w.BBScripts[id])) errors.push('packs/' + id + '/script.js is not on the page');
    if (!(w.BBArt && w.BBArt[id])) errors.push('packs/' + id + '/art/manifest.js is not on the page');
    if (!w.BB.packs.get(id) || w.BB.packs.get(id).problems.length) errors.push(id + ': the page\'s merged pack has problems: ' + JSON.stringify(w.BB.packs.get(id) && w.BB.packs.get(id).problems));
  }
  for (const f of fs.readdirSync(path.join(GAME, 'js', 'food')).filter(f => /\.js$/.test(f) && f !== 'kit.js')) {
    if (!w.BB.food.has(f.replace(/\.js$/, ''))) errors.push('js/food/' + f + ' is on disk but not on the page');
  }
}

async function run(label, opts) {
  opts = Object.assign({ pack: 'diner' }, opts);
  // The restaurant being played (`here`) and its merged pack: a chain moves on to the next one.
  let here = opts.pack, pack = packOf(here), starsBase = 0;
  const errors = [], warns = [], renders = { n: 0 }, trace = [], spoken = [], loadErrors = [];
  const start = Date.now();
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!/Not implemented/.test(e.message)) loadErrors.push(e.message); if (!/Not implemented: (navigation|window\.scrollTo|HTMLMediaElement)|Could not load img|Could not load script: "[^"]*(voice\/manifest|\/script)\.js"/.test(e.message)) errors.push('jsdom: ' + e.message); });
  vc.on('error', (...a) => errors.push('console.error: ' + a.map(String).join(' ')));
  vc.on('warn', (...a) => warns.push(a.map(String).join(' ')));
  const dom = new JSDOM(fs.readFileSync(path.join(GAME, 'index.html'), 'utf8'), {
    url: ORIGIN + 'apps/games/BENSFOODCOURT/index.html', runScripts: 'dangerously', resources: new HubFiles(), pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      // A window of this size (the counter's layout follows the window's shape); jsdom's own is 1024 x 768.
      if (opts.size) {
        Object.defineProperty(w, 'innerWidth', { configurable: true, get: () => opts.size[0] });
        Object.defineProperty(w, 'innerHeight', { configurable: true, get: () => opts.size[1] });
      }
      w.localStorage.setItem('bb-settings', JSON.stringify({ v: 3, kind: 'settings', pack: null, packVersion: null,
        data: Object.assign({ motion: 'reduced', shiftLength: 3 }, opts.settings) }));
      w.localStorage.setItem('bb-court', JSON.stringify(courtRecord(opts)));
      w.localStorage.setItem('narbe-scan-settings', JSON.stringify(opts.scan || {}));
      if (opts.storage) Object.keys(opts.storage).forEach(k => w.localStorage.setItem(k, opts.storage[k]));
      // keepShift: a real shift is waiting at this restaurant; a tutorial must never touch it (spec 4.2).
      if (opts.keepShift) w.localStorage.setItem('bb-shift:' + opts.pack, savedShift(opts.pack));
      // slowSpeech: lines take as long as a real voice would (a playout lasts long enough to hold a key in).
      stub(w, errors, renders, opts.speechMsPerChar || !!opts.slowSpeech, spoken);
    },
  });
  const w = dom.window;
  for (let i = 0; i < 200 && !(w.BB && w.BB.ui && w.BB.ui.__dbg && w.BB.ui.__dbg().card === 'title'); i++) await sleep(50);
  if (!w.BB || !w.BB.ui || w.BB.ui.__dbg().card !== 'title') { dom.window.close(); throw new Error(label + ': never reached the title. ' + errors.join('\n')); }
  // builtAs: stand-ins for restaurants whose pack is not on the page yet (a copy of the diner under their id), so the
  // court has them to scan; they are only scanned (or clicked with BB.game.enter held back), never played.
  (opts.builtAs || []).forEach(id => { if (!w.BBPacks[id]) w.BBPacks[id] = Object.assign({}, w.BBPacks.diner, { id }); });
  if (opts.builtAs) w.BB.court.refresh();
  if (opts.bootCheck) bootChecks(w, loadErrors, warns, errors);
  const auto = !!(opts.scan && opts.scan.autoScan);
  const timed = !!(opts.settings && opts.settings.cooking === 'timed');
  const stats = { presses: 0, orders: 0, stars: [], mistakesMade: 0, pauses: 0, redos: 0, gross: 0, warns: 0, resumed: 0, cards: 0 };
  const once = new Set();
  const err = m => { if (!once.has(m)) { once.add(m); errors.push(m); } };
  // Every card must open at -1 (spec 0.8). Checked on two-switch runs: a one-switch scan moves by itself. On the
  // court, every level offers at most 5 stops, and never a closed restaurant or one whose pack is not loaded.
  const seen = { card: '', cards: [] };
  const dbg = () => {
    const d = w.BB.ui.__dbg();
    if (d.card !== seen.card) {
      seen.card = d.card;
      if (d.card) {
        stats.cards += 1; seen.cards.push(d.card);
        if (!auto && d.index !== -1) errors.push('card ' + d.card + ' opened with item ' + d.index + ' (' + d.id + ') highlighted, not -1');
      }
    }
    if (d.ctx === 'court' && d.active) {
      if (d.items.length > 5) err('a court level offers ' + d.items.length + ' stops: at most 5 (' + d.items.join(',') + ')');
      const st = w.BB.save.court();
      d.items.filter(id => /^shop:/.test(id)).forEach(id => {
        const p = id.slice(5);
        if (!RULES.isOpen(COURT, st, p)) err('the closed restaurant ' + p + ' is a scan stop');
        else if (!w.BBPacks[p]) err(p + ' is a scan stop but its pack is not loaded');
      });
    }
    trace.push([Date.now(), d.ctx, d.card, d.id, w.BB.game.screen, w.BB.game.busy, w.BB.court.mode]);
    if (trace.length > 60) trace.shift();
    return d;
  };
  async function press(code, hold) {
    const ev = type => new w.KeyboardEvent(type, { code, key: code === 'Space' ? ' ' : 'Enter', bubbles: true, cancelable: true });
    w.document.body.dispatchEvent(ev('keydown'));
    await sleep(hold || 30);
    w.document.body.dispatchEvent(ev('keyup'));
    // Longer than the hub's input-sensitivity quiet window: a faster tap is (rightly) rejected.
    await sleep(320);
  }
  /** Two switches: Space steps to `id`, Enter chooses. One switch: wait for the scan, then Enter. The waits are
   *  timed, not counted, so a slow machine only makes a run slower: while a playout runs (the scan suspended, its
   *  last context still listed) nothing is judged; once the scan is live, an id it does not offer fails. */
  async function choose(id) {
    const until = Date.now() + (auto ? 90000 : 40000);
    let spaces = 0;
    while (Date.now() < until) {
      const d = dbg();
      if (!d.active) { await sleep(20); continue; }
      if (d.id === id) { await press('Enter'); stats.presses += 1; return true; }
      if (!d.items.includes(id) && id !== 'narbe:row-back') {
        await sleep(30);
        const e = dbg();
        if (e.active && !e.items.includes(id)) return false;
        continue;
      }
      if (auto) await sleep(20);
      else { if (++spaces > 60) return false; await press('Space'); stats.presses += 1; }
    }
    return false;
  }
  /** Wait for the page: no playout running and the scan live (a minute at most: a slow machine is not a failure). */
  const settle = async () => { const until = Date.now() + 60000; while (Date.now() < until && (w.BB.game.busy || !dbg().active)) await sleep(20); };
  const fail = (what, more) => { throw new Error(label + ': ' + what + ' ' + JSON.stringify(more || dbg()) + '\n  trace: ' + JSON.stringify(trace.slice(-12))); };
  /** Choose `id`; with `card`, that card must open (a scene change with Motion Full takes a moment to fade). */
  const must = async (id, card) => {
    await settle();
    if (!(await choose(id))) fail('could not reach ' + id + ' on');
    await sleep(80);
    for (let until = Date.now() + 5000; card && dbg().card !== card && Date.now() < until;) await sleep(25);
    if (card && dbg().card !== card) fail(id + ' led to ' + dbg().card + ', not ' + card);
  };
  /** The Settings card has the 17 rows in order, the hub rows among them (spec 6.4). */
  function checkSettings() {
    const have = dbg().items, want = SETTINGS_ROWS.filter(id => id !== 'speed' || timed);
    if (have.join(',') !== want.join(',')) errors.push('Settings rows are ' + have.join(',') + ', expected ' + want.join(','));
  }
  const soft = () => w.document.getElementById('court').classList.contains('soft');
  /** The storefront scan is live on the court picture; it opened at -1 (two switches). */
  async function courtLive(why) {
    const until = Date.now() + 120000;
    while (Date.now() < until && !(dbg().ctx === 'court' && dbg().active && w.BB.court.mode === 'scan')) await sleep(15);
    const d = dbg();
    if (d.ctx !== 'court' || w.BB.court.mode !== 'scan') fail('the court scan never opened (' + why + ')');
    if (!auto && d.index !== -1) errors.push('the court opened with ' + d.id + ' highlighted, not -1 (' + why + ')');
    if (soft()) errors.push('the court is still out of focus with its scan open (' + why + ')');
    if (w.document.body.dataset.place !== 'court') errors.push('the court scan is open but the court is not on show (' + why + ')');
    return d;
  }
  /** A storefront on the court: at the root, or inside its part of the U (five or more open). */
  async function toShop(id) {
    await settle();
    if (dbg().items.includes('shop:' + id)) return must('shop:' + id, null);
    const part = w.BB.court.stops().find(s => s.kind === 'part' && s.stops.some(x => x.pack === id));
    if (!part) fail('the court offers no way to ' + id);
    await must(part.id, null);
    return must('shop:' + id, null);
  }
  /** From the main menu into the restaurant: Play, the storefront on the court, then the first-visit card or the event
   *  card. */
  async function enter() {
    if (w.BB.court.mode !== 'scan') { await must('play', null); await courtLive('Play'); }
    await toShop(opts.pack);
    // The hold run must catch the first customer walking up: no waiting for the playout to end.
    if (opts.holdPause && !opts.offer && !opts.event) return;
    await settle();
    if (dbg().card === 'tutorialOffer') { if (!opts.offer) errors.push('the first-visit card came back after tutorialDone'); await must(opts.tutorial === 'offer' ? 'tutorial' : 'skip', null); }
    else if (opts.offer) errors.push('no first-visit card on a first visit');
    await settle();
    if (dbg().card === 'event') { if (!opts.event) errors.push('the event card came up with the event not due'); await must(opts.event ? 'event' : 'shift', null); }
    else if (opts.event) errors.push('no event card with the event due');
  }
  // watchWheel: count the squirts (a sauce's Add with its bottle on the line) and the moments the ticket
  // wheel is turned away from the front, and pick Ticket once in the kitchen and once at the counter.
  const watch = { squirts: 0, flourishes: 0, turning: 0, ticketKitchen: 0, ticketCounter: 0 };
  const sauces = () => Object.keys(pack.ingredients).some(id => pack.ingredients[id].sauce);
  const flourishes = () => Object.keys(pack.stations).some(sid => pack.stations[sid].steps.some(st => st.kind === 'auto'));
  let watcher = null;
  if (opts.watchWheel) {
    const outcome = w.BB.world.outcome;
    w.BB.world.outcome = (e, made, o) => {
      const sc = w.BB.world.__scene().scene, inc = sc && sc.getObjectByName('incoming');
      if (e && e.type === 'added' && inc && pack.ingredients[e.ing] && pack.ingredients[e.ing].sauce && inc.userData.bottle) watch.squirts += 1;
      if (e && e.type === 'auto') watch.flourishes += 1;
      return outcome(e, made, o);
    };
    watcher = setInterval(() => { if (Math.abs(w.BB.stage.wheelTheta) > 0.01) watch.turning += 1; }, 15);
  }
  // Who came in, and the lines said when an order leaves off something a customer never takes (Sal: lettuce); every
  // character line (the court's moments), every sound effect.
  const heardFrom = { customers: new Set(), dislikes: 0, dislikers: 0, moments: new Set() };
  const said = [], sounds = [];
  const say = w.BB.audio.say;
  w.BB.audio.say = o => {
    if (o && o.who && o.who !== pack.manager.id && w.BB.game.pack()) heardFrom.customers.add(o.who);
    if (o && o.clip && /(^|[/:.])dislike\.\d+(\.\w+)?$/.test(o.clip)) heardFrom.dislikes += 1;
    if (o) said.push({ who: o.who, clip: o.clip || '', text: o.text, t: Date.now(), mitch: (w.document.getElementById('mitch').getAttribute('src') || '') });
    return say(o);
  };
  const sfx = w.BB.audio.sfx;
  w.BB.audio.sfx = (n, v) => { sounds.push({ name: n, t: Date.now() }); return sfx(n, v); };
  let rnd = opts.seed || 1;
  const rand = () => { rnd = (rnd * 16807) % 2147483647; return rnd / 2147483647; };
  // These customers come in first, in this order (a wrap of BB.shift.next), when they visit this restaurant.
  if (opts.queue) {
    const next = w.BB.shift.next;
    w.BB.shift.next = (p, s) => {
      if (s && !s.order && !s.done && opts.queue[s.n] && p.regulars.some(c => c.id === opts.queue[s.n])) s.queue[s.n] = opts.queue[s.n];
      return next(p, s);
    };
  }
  const bubbleOn = () => w.document.getElementById('bubble').classList.contains('on');

  /** The counter at this window's shape (spec 5.2), at a review: the 3D counter's back edge on the picture's line
   *  (80%; on a window wider than 16:9 the counter picture is anchored lower, so the line stays where 16:9 has it),
   *  the served customer's eyes on the picture's own horizon and the head on screen, a child showing head and
   *  shoulders, and the order on the counter top, fully on screen, left of the picture's own painted queue and clear of
   *  a child's face. Nothing the page draws covers the painted queue's box (BBArt.<pack>.counter: queue, heads, feet)
   *  but the customer: the answer column, the register and the corner count here, and (counterWatch) Mitch, the
   *  receipt, the bell, the bubbles whenever they are up. At Extra Large text a covering is a note, not an error
   *  (legibility first, docs/api/page.md 7). */
  const counterChecks = { reviews: 0, child: 0, seen: {}, notes: [] };
  /** The counter picture on this window: its anchor, the picture <-> screen maps and its painted queue's box (px). */
  function counterGeom() {
    const W = w.innerWidth, H = w.innerHeight, a = W / H, r = a > 1.5 ? a / 1.5 : 1;
    const anchor = a > 1.5 ? w.BB.world.anchor('counter') : 0.5;
    const toPicY = y => (y / H + anchor * (r - 1)) / r, toScrY = fy => (fy * r - anchor * (r - 1)) * H;
    const toScrX = fx => (a < 1.5 ? 0.5 + (fx - 0.5) * 1.5 / a : fx) * W;
    const C = (w.BBArt[here] || {}).counter;
    const q = C ? { x0: toScrX(C.queue[0]), y0: toScrY(C.heads), x1: Math.min(W, toScrX(C.queue[1])), y1: toScrY(C.feet) } : null;
    return { W, H, a, r, anchor, toPicY, toScrY, toScrX, C, q };
  }
  const hit = (b, q) => !!(b && q && Math.min(b.x1, q.x1) - Math.max(b.x0, q.x0) > 0.5 && Math.min(b.y1, q.y1) - Math.max(b.y0, q.y0) > 0.5);
  const xl = () => (opts.settings || {}).textSize === 'xlarge';
  /** Something the page draws covers the painted queue: an error, or a note at Extra Large text. */
  function covers(what, b, G) {
    const msg = 'at ' + G.W + 'x' + G.H + ': ' + what + ' covers the painted queue ' + JSON.stringify({ it: b, queue: G.q }, (k, v) => (typeof v === 'number' ? Math.round(v) : v));
    if (xl()) { if (!counterChecks.notes.some(n => n.startsWith(what))) counterChecks.notes.push(what + ': ' + msg); } else err(msg);
  }
  function checkCounter(s) {
    const G = counterGeom(), { W, H, a, toPicY, toScrX, C } = G;
    const where = 'at ' + W + 'x' + H + ': ';
    if (!C) { errors.push(where + 'BBArt.' + here + '.counter is missing: the counter picture has no measured layout'); return; }
    // The line: 80% of the picture. A window wider than 16:9 anchors the counter picture lower (world.js anchor()): the
    // line where 16:9 has it, as long as the painted queue's heads stay 31% down the window (room for the answer row).
    const keep = FOOD.lineOnScreen(0.80, 16 / 9), wide = a > 16 / 9 + 1e-6;
    const expect = wide ? Math.max(0.5, Math.min(1, (0.80 * G.r - keep) / (G.r - 1), (C.heads * G.r - 0.31) / (G.r - 1))) : 0.5;
    if (Math.abs(G.anchor - expect) > 1e-6) errors.push(where + 'the counter picture is anchored at ' + G.anchor + ', not ' + expect);
    const want = a > 1.5 ? 0.80 * G.r - G.anchor * (G.r - 1) : 0.80;
    const L = w.BB.world.counterLine();
    if (!L || Math.abs(L.y - want) > 1e-6) { errors.push(where + 'the counter line is ' + JSON.stringify(L) + ', not ' + want); return; }
    const bgY = w.document.body.style.getPropertyValue('--counter-bg-y');
    if (Math.abs(parseFloat(bgY) - G.anchor * 100) > 0.06) errors.push(where + 'the counter backdrop is drawn at ' + bgY + ', not the world\'s anchor ' + (G.anchor * 100).toFixed(1) + '%');
    if (wide) counterChecks.wide = { anchor: Math.round(G.anchor * 1000) / 1000, line: Math.round(want * 1000) / 10 + '%', counterTop: Math.round((1 - want) * H) + 'px' };
    const P = w.BB.stage.placed;
    if (!P || Math.abs(P.line - L.px) > 0.5) { errors.push(where + 'the page placed the counter from ' + (P && P.line) + ', not ' + L.px); return; }
    // The scale the page draws the served customer at: the cast's, but a child no smaller than stage.js's CHILD_MIN at
    // the counter (Little Lulu stands on a step; integrate-2b).
    const who = s.order.ticket.customer.id, Cs = (CAST.people[who] || {}), cs = Cs.scale ? Math.max(Cs.scale, P.childScale || 0) : 1;
    if (Cs.scale && Math.abs((P.childScale || 1) - Math.max(Cs.scale, 0.71)) > 0.01) errors.push(where + who + ' is drawn at scale ' + P.childScale + ', not ' + Math.max(Cs.scale, 0.71));
    const eyes = toPicY(P.top + 0.18 * P.h), hips = toPicY(P.top + 0.56 * P.h), horizon = Math.max(0.45, Math.min(0.48, C.horizon));
    if (eyes < 0.44 || eyes > 0.49 || Math.abs(eyes - horizon) > 0.003) errors.push(where + 'the customer\'s eyes are at ' + (eyes * 100).toFixed(1) + '% of the picture, not on its horizon (' + (horizon * 100).toFixed(1) + '%, in 45-48%)');
    if (Math.abs(hips - 0.80) > 0.005) errors.push(where + 'the customer\'s hips are at ' + (hips * 100).toFixed(1) + '% of the picture, not at the counter (80%)');
    const headTop = P.top + P.h * (1 - cs) + 0.02 * P.h * cs;
    if (headTop < 0) errors.push(where + 'the customer\'s head is cut off at the top');
    if (cs < 1 && (headTop + 0.34 * P.h * cs > L.px)) errors.push(where + 'a child\'s shoulders are hidden by the counter');
    // The order on the counter, projected with the counter's own camera.
    const { scene, camera } = w.BB.world.__scene();
    const T = w.THREE, set = scene && scene.getObjectByName('set:counter'), food = set && set.getObjectByName('food');
    if (!food || !food.children.length) { errors.push(where + 'nothing on the counter at the review'); return; }
    // The fake renderer never updates the scene's matrices (a real one does as it draws): bring them up to date.
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(); camera.updateProjectionMatrix();
    // Each mesh's box on screen (parts), and the whole order's (box).
    const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }, v = new T.Vector3(), parts = [];
    food.traverse(o => {
      if (!o.isMesh || o.userData.hull || !o.geometry) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const g = o.geometry.boundingBox, b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
      const add = (x, y) => { b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x); b.y0 = Math.min(b.y0, y); b.y1 = Math.max(b.y1, y); };
      const list = o.isInstancedMesh ? Array.from({ length: o.count }, (_, i) => { const m = new T.Matrix4(); o.getMatrixAt(i, m); return m.premultiply(o.matrixWorld); }) : [o.matrixWorld];
      for (const M of list) for (let i = 0; i < 8; i++) {
        v.set(i & 1 ? g.max.x : g.min.x, i & 2 ? g.max.y : g.min.y, i & 4 ? g.max.z : g.min.z).applyMatrix4(M).project(camera);
        add((v.x + 1) / 2 * W, (1 - v.y) / 2 * H);
      }
      parts.push(b);
      box.x0 = Math.min(box.x0, b.x0); box.x1 = Math.max(box.x1, b.x1); box.y0 = Math.min(box.y0, b.y0); box.y1 = Math.max(box.y1, b.y1);
    });
    if (box.x0 < 0 || box.y0 < 0 || box.x1 > W || box.y1 > H) errors.push(where + 'the order on the counter is not fully on screen: ' + JSON.stringify(box));
    if (box.y1 <= L.px) errors.push(where + 'the order does not stand on the counter top (below the line)');
    if (box.x1 > toScrX(C.queue[0])) errors.push(where + 'the order reaches the painted queue (its right edge at ' + (box.x1 / W * 100).toFixed(1) + '%, the queue from ' + (toScrX(C.queue[0]) / W * 100).toFixed(1) + '%)');
    // The page's own things at the review, against the picture's painted queue: the answer column (in the mode
    // stage.js chose: the DOM says the same), the register, the corner count, the Back in 5 sign.
    const q = G.q, col = P.column, el = w.document.getElementById('controls');
    if (Math.abs(P.queue.x0 - q.x0) > 1 || Math.abs(P.queue.y0 - q.y0) > 1 || Math.abs(P.queue.x1 - q.x1) > 1) errors.push(where + 'the page keeps clear of ' + JSON.stringify(P.queue) + ', not the picture\'s queue ' + JSON.stringify(q));
    if (!col) errors.push(where + 'the answer column was never placed');
    else {
      const mode = el.classList.contains('cols2') ? 'two' : el.classList.contains('row') ? 'row' : 'one';
      if (mode !== col.mode) errors.push(where + 'the column is drawn as ' + mode + ' but placed as ' + col.mode);
      if (hit(col, q)) covers('the answer column (' + col.mode + ')', col, G);
      if (hit(col, P.head)) covers('the answer column over the served customer\'s head', col, G);
      (counterChecks.seen.column = counterChecks.seen.column || new Set()).add(col.mode);
    }
    if (hit(P.register, q)) covers('the register', P.register, G);
    if (P.register && P.register.w < 64) errors.push(where + 'the register is ' + Math.round(P.register.w) + ' px wide, under the 64 px target');
    if (hit(P.hud, q)) covers('the corner count', P.hud, G);
    if (hit(P.back5, q)) covers('the Back in 5 sign', P.back5, G);
    if (cs < 1) {
      // The child's face: the head of the canvas drawn at the cast's scale from the bottom centre.
      const hk = P.h * cs, ck = hk * 768 / 1152, top = P.top + P.h * (1 - cs), left = P.cx - ck / 2;
      const face = { x0: left + 0.3 * ck, x1: left + 0.66 * ck, y0: top + 0.05 * hk, y1: top + 0.31 * hk };
      const over = parts.filter(b => b.x0 < face.x1 && b.x1 > face.x0 && b.y0 < face.y1 && b.y1 > face.y0);
      if (over.length) {
        const A = w.BB.world.counterAnchors() || {}, at = food.children.map(c => [c.position.x, c.position.z, c.scale.x].map(n => Math.round(n * 1000) / 1000));
        errors.push(where + 'the order covers the face of ' + who + ': ' + JSON.stringify({ face, part: over[0], order: s.order.items.map(it => it.spec.recipe),
          at, aspect: camera.aspect, minX: A.minX, maxX: A.maxX, front: A.front, box: food.children.map(c => { const b = w.BB.world.__kit.boxOf(c); return [b.min.x, b.max.x, b.min.z, b.max.z].map(n => Math.round(n * 1000) / 1000); }),
          maxXAt: A.maxXAt ? food.children.map(c => { const b = w.BB.world.__kit.boxOf(c); return Math.round(A.maxXAt(c.position.z + b.max.z * c.scale.x) * 1000) / 1000; }) : null }));
      }
      counterChecks.child += 1;
    }
    counterChecks.reviews += 1;
  }
  /** While a counter run plays: whenever Mitch, the receipt, the bell or a bubble is up at the counter, it keeps off the
   *  picture's painted queue (and Mitch off the served customer); a bubble's foot stays above the queue's heads. */
  const counterWatch = !opts.counter ? null : setInterval(() => {
    try {
      const doc = w.document, on = id => doc.getElementById(id).classList.contains('on');
      if (doc.body.dataset.place !== 'counter' || !w.BB.stage.placed || !(w.BBArt[here] || {}).counter) return;
      const G = counterGeom(), P = w.BB.stage.placed, seen = counterChecks.seen;
      if (on('mitch') && P.mitch) {
        seen['mitch:' + P.mitch.at] = (seen['mitch:' + P.mitch.at] || 0) + 1;
        const custOn = on('customer');
        if (custOn && P.mitch.at === 'customer') err('at ' + G.W + 'x' + G.H + ': Mitch stands at the customer\'s spot with a customer there');
        // Mitch is always whole on screen (the user, 2026-11-11); with a customer there he may stand in front of a
        // queue that reaches far right, so only his spot without a customer must keep off the queue.
        if (P.mitch.fig && (P.mitch.fig.x0 < -1 || P.mitch.fig.x1 > G.W + 1)) err('at ' + G.W + 'x' + G.H + ': Mitch is cut off by the window\'s edge (' + P.mitch.at + ')');
        if (!custOn && P.mitch.fig && hit(P.mitch.fig, G.q)) covers('Mitch (' + P.mitch.at + ', ' + P.mitch.pose + ')', P.mitch.fig, G);
        if (custOn && P.mitch.fig && hit(P.mitch.fig, P.customer)) err('at ' + G.W + 'x' + G.H + ': Mitch covers the served customer');
      }
      if (on('receipt') && P.receipt) { seen.receipt = (seen.receipt || 0) + 1; if (hit(P.receipt, G.q)) covers('the receipt', P.receipt, G); }
      if (on('bell') && P.bell) { seen.bell = (seen.bell || 0) + 1; if (hit(P.bell, G.q)) covers('the bell', P.bell, G); }
      const b = doc.getElementById('bubble');
      if (b.classList.contains('on') && !b.classList.contains('child') && !b.classList.contains('pa')) {
        seen.bubble = (seen.bubble || 0) + 1;
        if (G.H - P.sayB > G.q.y0 + 0.5) covers('a bubble\'s foot', { x0: 0, y0: G.H - P.sayB, x1: G.W, y1: G.H - P.sayB }, G);
        // Its box as stage.js sized it (fitBubble: wider where the room above the queue is short, or hanging from the top).
        if (P.bubble && hit(P.bubble, G.q)) covers('a bubble (' + b.querySelector('b').textContent + ', ' + (P.bubble.tall ? 'too tall' : 'wide') + ')', P.bubble, G);
        if (P.bubble && P.bubble.tall) seen.tallBubble = (seen.tallBubble || 0) + 1;
      }
      if (b.classList.contains('child') && b.classList.contains('on') && P.kidSayX + P.kidSayW > G.q.x0 + 0.5) covers('a child\'s bubble', { x0: P.kidSayX, y0: 0, x1: P.kidSayX + P.kidSayW, y1: G.H - P.kidSayB }, G);
    } catch (e) { err('the counter watch failed: ' + e.message); }
  }, 40);
  if (counterWatch && counterWatch.unref) counterWatch.unref();      // a run that fails part-way never keeps Node up

  /* ── long words on a card under Auto Scan (2b-seams, 2026-11-09) ────────────────────────────────────────────── */
  // Every utterance the platform hands the speech engine: its words, when it started, ended, or was cut off.
  const utter = [];
  if (opts.heard) {
    const ss = w.speechSynthesis, sp = ss.speak.bind(ss);
    ss.speak = u => {
      const rec = { text: String(u.text), at: Date.now(), end: 0, cut: 0 };
      utter.push(rec);
      const end = u.onend, error = u.onerror;
      u.onend = function () { rec.end = Date.now(); return end ? end.apply(this, arguments) : undefined; };
      u.onerror = function () { rec.cut = Date.now(); return error ? error.apply(this, arguments) : undefined; };
      return sp(u);
    };
  }
  /** How to Play's words (or the court Pause's Help) are heard in full under one switch: the card's automatic scan waits
   *  until they end (Wait for Speech off, and on past the voice manager's 10 s cap), then a full interval; with Text to
   *  Speech off it moves after one interval; a press during the words acts at once (and may cut them). */
  async function heardChecks() {
    const H = opts.heard, iv = w.NarbeScanManager.getScanInterval(), tts = w.NarbeVoiceManager.getSettings().ttsEnabled;
    let words, n0, t0;
    if (H.what === 'help') {
      if (w.BB.court.mode !== 'scan') { await must('play', null); await courtLive('Play'); }
      await must('pause', 'courtPause');
      n0 = utter.length; t0 = Date.now();
      await must('help', null);
      words = w.BB.court.help();
    } else if (H.what === 'offer') {
      // The first-visit card at the run's restaurant (opts.offer: its tutorial not done).
      if (w.BB.court.mode !== 'scan') { await must('play', null); await courtLive('Play'); }
      n0 = utter.length; t0 = Date.now();
      await toShop(opts.pack);
      for (let k = 0; k < 400 && dbg().card !== 'tutorialOffer'; k++) await sleep(25);
      if (dbg().card !== 'tutorialOffer') fail('no first-visit card');
      words = w.BB.game.pack().name + '. First time here? Mitch can walk you through one order.';
    } else {
      n0 = utter.length; t0 = Date.now();
      await must('howto', 'howto');
      words = 'How to Play. ' + HOWTO;
    }
    const from = dbg().id, opened = Date.now();
    let moved = 0, pressed = 0, landed = 0, rec = null;
    for (const until = Date.now() + 90000; Date.now() < until;) {
      rec = rec || utter.slice(n0).find(u => u.text === words) || null;
      const d = dbg();
      if (!moved && d.id !== from) moved = Date.now();
      if (H.press && !pressed && rec && Date.now() - rec.at > 1500) {
        if (moved) { errors.push('the scan moved by itself under the words before the press'); break; }
        const k0 = Date.now();
        await press('Space');
        pressed = k0;
        landed = dbg().id !== from ? Date.now() : 0;
        moved = 0;
        continue;
      }
      if (moved && (!tts || (rec && (rec.end || rec.cut)))) break;
      await sleep(15);
    }
    const ms = v => (v ? v - t0 : null);
    stats.heard = { tts, wait: !!w.NarbeScanManager.getSettings().waitForSpeech, interval: iv, chars: words.length, said: rec ? ms(rec.at) : null,
      ended: rec ? ms(rec.end) : null, cut: rec ? ms(rec.cut) : null, opened: ms(opened), moved: ms(moved), pressed: ms(pressed) };
    if (!tts) {
      // (an empty utterance is the page waking the speech engine on a first press, not speech)
      const heard = utter.slice(n0).filter(u => u.text.trim());
      if (heard.length) errors.push('Text to Speech is off, but ' + heard.length + ' utterance(s) were spoken: ' + JSON.stringify(heard.map(u => u.text.slice(0, 60))));
      if (!moved || moved - opened > iv + 1600) errors.push('with Text to Speech off the scan should move after one interval; it moved ' + (moved ? moved - opened : '?') + ' ms after the card opened');
    } else if (!rec) errors.push('the words were never spoken: ' + JSON.stringify(utter.slice(n0).map(u => u.text.slice(0, 40))));
    else if (H.press) {
      if (!landed) errors.push('a Space press during the words did not move the scan at once');
      if (!moved) errors.push('after the press the automatic scan never moved again');
    } else {
      if (rec.cut) errors.push('the words were cut off ' + (rec.cut - rec.at) + ' ms in (of ' + Math.round(words.length * (opts.speechMsPerChar || 9)) + ')');
      if (!rec.end) errors.push('the words never ended');
      if (moved && rec.end && moved < rec.end) errors.push('the scan moved ' + (rec.end - moved) + ' ms before the words ended');
      if (moved && rec.end && moved - rec.end > iv + 1600) errors.push('the scan waited ' + (moved - rec.end) + ' ms after the words, more than an interval');
      const over = utter.slice(n0).filter(u => u !== rec && u.at > rec.at && u.at < (rec.end || rec.cut || Infinity));
      if (over.length) errors.push('something else was said over the words: ' + JSON.stringify(over.map(u => u.text.slice(0, 40))));
    }
    // Back out: How to Play's Back, the Pause's Continue, or the first-visit card's Food Court.
    if (H.what === 'help') await must('continue', null);
    else if (H.what === 'offer') { await must('court', null); await courtLive('Food Court'); }
    else await must('back', 'title');
  }

  /* ── the court's own checks (spec 6.1, 6.2) ─────────────────────────────────────────────────────────────── */
  const linesOf = (moment, from) => said.slice(from || 0).filter(l => l.clip.includes('/court:' + moment.replace(/^court\./, '').replace(/^announce\./, '') + '.'));
  /** The main menu over the out-of-focus court: its four items in order and its words; How to Play (at -1, the whole
   *  of spec 6.1's text shown and spoken, Back to the main menu, still out of focus); Settings and back. No tutorial
   *  picker anywhere. */
  async function menuChecks() {
    const d = dbg();
    if (d.items.join(',') !== MENU_ITEMS.join(',')) errors.push('the main menu offers ' + d.items.join(',') + ', not ' + MENU_ITEMS.join(','));
    // The platform starts speech 50 ms after it is asked (the cancel-to-speak gap).
    for (let k = 0; k < 80 && !spoken.includes(MENU_LINE); k++) await sleep(25);
    if (!spoken.includes(MENU_LINE)) errors.push('the main menu did not say "' + MENU_LINE + '" (said: ' + JSON.stringify(spoken.slice(0, 4)) + ')');
    if (!soft()) errors.push('the court behind the main menu is not out of focus');
    if (w.BB.court.picker) errors.push('BB.court.picker (the tutorial picker) is still there');
    if (!HOWTO || HOWTO.length < 200) errors.push('could not read How to Play\'s words from spec 6.1');
    const n0 = spoken.length;
    await must('howto', 'howto');
    if (dbg().items.join(',') !== 'back') errors.push('How to Play offers ' + dbg().items.join(',') + ', not Back');
    for (let k = 0; k < 40 && !spoken.slice(n0).includes('How to Play. ' + HOWTO); k++) await sleep(25);
    if (!spoken.slice(n0).includes('How to Play. ' + HOWTO)) errors.push('How to Play did not say the whole of spec 6.1\'s text: ' + JSON.stringify(spoken.slice(n0)).slice(0, 300));
    const body = w.document.querySelector('#overlay .howto');
    if (!body || body.textContent !== HOWTO) errors.push('How to Play does not show spec 6.1\'s text');
    if (!soft()) errors.push('the court is in focus behind How to Play');
    await must('back', 'title');
    if (!soft()) errors.push('Back from How to Play left the court in focus');
    await must('settings', 'settings');
    checkSettings();
    if (!soft()) errors.push('the court is in focus behind Settings from the main menu');
    await must('back', 'title');
    if (!soft()) errors.push('Back from Settings left the court in focus');
    stats.menu = 'checked';
  }
  /** The court's Pause: the Back in 5 sign, Help, Settings and back, Exit Game's confirm (Cancel first, the consequence
   *  said), Continue (at -1), the 5 s Enter hold once the scan is live, Main Menu: the card over the blurred court. */
  async function pauseChecks() {
    await must('pause', 'courtPause');
    if (dbg().items.join(',') !== 'continue,help,settings,menu,exit') errors.push('the court Pause offers ' + dbg().items.join(','));
    const n0 = spoken.length;
    await must('help', 'courtPause');
    const words = RULES.help(COURT, w.BB.save.court(), { saved: w.BB.save.shift.savedIds() });
    for (let k = 0; k < 40 && !spoken.slice(n0).some(t => t.includes(words)); k++) await sleep(25);
    if (!spoken.slice(n0).some(t => t.includes(words))) errors.push('the court\'s Help did not say "' + words + '"');
    await must('settings', 'settings');
    checkSettings();
    await must('back', 'courtPause');
    const n1 = spoken.length;
    await must('exit', 'confirm');
    if (dbg().items[0] !== 'cancel') errors.push('Exit Game\'s confirm does not offer Cancel first');
    for (let k = 0; k < 40 && !spoken.slice(n1).some(t => t.includes('Exit the game? You will go back to the hub.')); k++) await sleep(25);
    if (!spoken.slice(n1).some(t => t.includes('Exit the game? You will go back to the hub.'))) errors.push('Exit Game\'s confirm did not say "You will go back to the hub."');
    await must('cancel', 'courtPause');
    await must('continue', null);
    await courtLive('Continue');
    // Holding Enter 5 s on the live court opens its Pause (the release is swallowed).
    const ev = type => new w.KeyboardEvent(type, { code: 'Enter', key: 'Enter', bubbles: true, cancelable: true });
    w.document.body.dispatchEvent(ev('keydown'));
    for (let t = 0; t < 6000 && dbg().card !== 'courtPause'; t += 50) await sleep(50);
    const opened = dbg().card === 'courtPause';
    w.document.body.dispatchEvent(ev('keyup'));
    await sleep(400);
    if (!opened) errors.push('holding Enter 5 s on the court did not open its Pause');
    if (dbg().card !== 'courtPause') errors.push('the court Pause did not stay open after the hold');
    await must('menu', 'title');
    if (!soft()) errors.push('Main Menu from the court\'s Pause left the court in focus');
    if (dbg().items.join(',') !== MENU_ITEMS.join(',')) errors.push('Main Menu from the court\'s Pause opened ' + dbg().items.join(','));
    await must('play', null);
    await courtLive('Play after Main Menu');
    stats.courtPause = 'checked';
  }
  /** Play's focus pull: about 0.6 s with Motion Full, a cut under Reduced (Mitch is off: nothing else waits). */
  async function focusChecks(kind) {
    await settle();
    if (!(await choose('play'))) fail('could not reach play');
    // choose() pressed Enter: the release was 320 ms ago.
    const t0 = Date.now() - 320;
    let focused = soft() ? 0 : Date.now();
    for (let k = 0; k < 400 && !(dbg().ctx === 'court' && w.BB.court.mode === 'scan'); k++) { if (!focused && !soft()) focused = Date.now(); await sleep(10); }
    const opened = Date.now() - t0;
    stats.focus = { kind, inFocusMs: focused ? focused - t0 : null, scanMs: opened };
    if (kind === 'reduced' && opened > 600) errors.push('under Reduced the court took ' + opened + ' ms to open after Play: the focus pull is not a cut');
    if (kind === 'full' && opened < 600) errors.push('with Motion Full the scan opened ' + opened + ' ms after Play, before the 0.6 s focus pull');
    await courtLive('Play');
  }
  /** Back to the main menu (the court's Pause, Main Menu) and Play again: the moments that played do not come back. */
  async function again() {
    await must('pause', 'courtPause');
    await must('menu', 'title');
    if (!soft()) errors.push('Main Menu left the court in focus');
    await must('play', null);
    await courtLive('Play again');
  }
  /** A Grand Opening (seeded: every open restaurant at 3 stars, so the Smoothie Shack has opened): the shutter, then the
   *  chime, then the PA's bing-bong, pa, then Mitch; the storefront un-greys and keeps its banner; once only.
   *  The restaurant checked is the one the seed opens: the first in unlock order whose Grand Opening the seeded record
   *  has not seen (the Smoothie Shack, or the run's own at --pack sushi / icecream; integrate-2b, 2026-11-10). */
  async function unlockChecks() {
    const seeded = courtRecord(opts).data.restaurants;
    const gid = (COURT.unlocks.map(u => u.pack).find(id => seeded[id] && !seeded[id].grandOpeningSeen)) || 'smoothie';
    const gname = COURT.restaurants.find(r => r.pack === gid).short;
    await must('play', null);
    await courtLive('Play after a Grand Opening');
    const order = ['court:shutter', 'court:chime', 'court:paChime'].map(n => (sounds.find(s => s.name === n) || {}).t);
    const pa = linesOf('court.announce.open')[0], mitch = linesOf('court.unlock')[0];
    if (order.some(t => !t)) errors.push('the Grand Opening\'s sounds were ' + JSON.stringify(sounds.map(s => s.name)));
    else if (!(order[0] <= order[1] && order[1] <= order[2])) errors.push('the Grand Opening\'s sounds came out of order');
    if (!pa || pa.who !== 'pa') errors.push('the announcer did not announce the Grand Opening');
    if (!mitch) errors.push('Mitch did not say court.unlock');
    if (pa && order[2] && pa.t < order[2]) errors.push('the announcer spoke before the bing-bong');
    if (pa && mitch && mitch.t < pa.t) errors.push('Mitch spoke before the announcer');
    const st = w.BB.save.court().restaurants[gid], sc = w.BB.court.scene().stores.find(s => s.pack === gid);
    if (!st.opened || !st.grandOpeningSeen) errors.push(gname + ' did not open, or its Grand Opening was not marked seen');
    if (!sc || sc.greyed || sc.shutter) errors.push(gname + ' is still greyed out or shuttered after its Grand Opening: ' + JSON.stringify(sc && { greyed: sc.greyed, shutter: sc.shutter }));
    if (!sc || !sc.banner) errors.push('the Grand Opening banner is not up after the Grand Opening');
    if (!w.BB.court.stops().some(s => s.pack === gid || (s.stops && s.stops.some(x => x.pack === gid)))) errors.push(gname + ' is not a scan stop after opening');
    const n = sounds.length, m = said.length;
    await again();
    if (sounds.slice(n).some(s => s.name === 'court:shutter') || linesOf('court.announce.open', m).length) errors.push('the Grand Opening played twice');
    const sc2 = w.BB.court.scene().stores.find(s => s.pack === gid);
    if (!sc2 || !sc2.banner) errors.push('the banner came down before the first visit');
    // The banner stays until the first visit: the first-visit card answered (Skip It) takes it down.
    const st2 = JSON.parse(JSON.stringify(w.BB.save.court()));
    RULES.setTutorialDone(COURT, st2, gid);
    if (RULES.storefront(COURT, st2, gid).banner) errors.push('the banner stays after the first visit');
    stats.unlock = { id: gid, sounds: sounds.filter(s => /^court:/.test(s.name)).map(s => s.name.slice(6)).join(' '), pa: pa && pa.clip, mitch: mitch && mitch.clip };
  }
  /** An unlock earned by the shift just played (seeded so that a good shift brings every open restaurant to the next
   *  star level): the results card named the opening; back on the court, the Grand Opening played (the shutter, the
   *  chime, the bing-bong, pa, then Mitch) before the scan, and the storefront is open, bannered and a scan stop. */
  async function unlockAfterChecks(id) {
    const name = COURT.restaurants.find(r => r.pack === id).short;
    if (!(stats.resultNews || '').includes(name)) errors.push('the results card did not say that ' + name + ' opened: ' + JSON.stringify(stats.resultNews));
    const order = ['court:shutter', 'court:chime', 'court:paChime'].map(n => (sounds.find(x => x.name === n) || {}).t);
    const pa = linesOf('court.announce.open')[0], mitch = linesOf('court.unlock')[0];
    if (order.some(t => !t) || !(order[0] <= order[1] && order[1] <= order[2])) errors.push('the Grand Opening\'s sounds were ' + JSON.stringify(sounds.map(x => x.name)));
    if (!pa || pa.who !== 'pa') errors.push('the announcer did not announce ' + name);
    if (!mitch) errors.push('Mitch did not say court.unlock');
    if (pa && mitch && mitch.t < pa.t) errors.push('Mitch spoke before the announcer');
    const st = w.BB.save.court().restaurants[id], sc = w.BB.court.scene().stores.find(x => x.pack === id);
    if (!st.opened || !st.grandOpeningSeen) errors.push(name + ' did not open, or its Grand Opening was not marked seen: ' + JSON.stringify(st));
    if (!sc || sc.greyed || sc.shutter || !sc.banner) errors.push(name + ' after its Grand Opening: ' + JSON.stringify(sc && { greyed: sc.greyed, shutter: sc.shutter, banner: sc.banner }));
    const stops = w.BB.court.stops();
    if (!stops.some(x => x.pack === id || (x.stops && x.stops.some(y => y.pack === id)))) errors.push(name + ' is not a scan stop after opening');
    stats.unlocked = { id, pa: pa && pa.clip, mitch: mitch && mitch.clip };
  }
  /** A gold sign (seeded: the Burger Bar won its event): it drops onto the sign board with sparkles, the bing-bong,
   *  pa, then Mitch; once only. */
  async function goldChecks() {
    await must('play', null);
    await courtLive('Play after a gold sign');
    const order = ['court:signDrop', 'court:sparkle', 'court:paChime'].map(n => (sounds.find(s => s.name === n) || {}).t);
    const pa = linesOf('court.announce.gold')[0], mitch = linesOf('court.goldSign')[0];
    if (order.some(t => !t) || !(order[0] <= order[1] && order[1] <= order[2])) errors.push('the gold sign\'s sounds were ' + JSON.stringify(sounds.map(s => s.name)));
    if (!pa || pa.who !== 'pa') errors.push('the announcer did not announce the gold sign');
    if (!mitch) errors.push('Mitch did not say court.goldSign');
    if (pa && mitch && mitch.t < pa.t) errors.push('Mitch spoke before the announcer');
    const st = w.BB.save.court().restaurants.diner, sc = w.BB.court.scene().stores.find(s => s.pack === 'diner');
    if (!st.goldSeen) errors.push('the gold sign was not marked seen');
    if (!sc || !sc.gold) errors.push('the Burger Bar shows no gold sign');
    const n = sounds.length;
    await again();
    if (sounds.slice(n).some(s => s.name === 'court:signDrop')) errors.push('the gold sign dropped twice');
    stats.gold = { sounds: sounds.filter(s => /^court:/.test(s.name)).map(s => s.name.slice(6)).join(' '), pa: pa && pa.clip, mitch: mitch && mitch.clip };
  }
  /** The grand celebration (seeded: all seven at five stars): every drawn customer cheers once, Mitch says
   *  court.celebrate, then court.promoted in the 'promoted' pose; pops at most 3 a second; the board then reads "All
   *  seven at five stars"; exactly once. */
  async function celebrateChecks() {
    await must('play', null);
    await courtLive('Play after the celebration');
    const drawn = CAST.drawn(require(path.join(GAME, 'packs/cast/art/manifest.js')));
    const cheers = linesOf('court.cheer'), who = new Set(cheers.map(l => l.who));
    if (cheers.length !== drawn.length || drawn.some(id => !who.has(id))) errors.push('the celebration\'s cheers: ' + cheers.length + ' from ' + [...who].join(' ') + ', expected one from each of ' + drawn.join(' '));
    const cel = linesOf('court.celebrate')[0], pro = linesOf('court.promoted')[0];
    if (!cel || !pro || pro.t < cel.t) errors.push('Mitch did not say court.celebrate then court.promoted');
    if (pro && !/\/mitch\/promoted\.webp$/.test(pro.mitch)) errors.push('Mitch was not in his promoted pose for court.promoted: ' + pro.mitch);
    const pops = sounds.filter(s => /^court:pop[123]$/.test(s.name)).map(s => s.t);
    const most = pops.reduce((m, t) => Math.max(m, pops.filter(u => u >= t && u < t + 1000).length), 0);
    if (!pops.length) errors.push('no fireworks popped');
    if (most > 3) errors.push(most + ' pops in one second (at most 3)');
    const st = w.BB.save.court();
    if (!st.celebrationSeen) errors.push('the celebration was not marked seen');
    const board = w.BB.court.scene().board.lines;
    if (board[0] !== 'All seven at five stars') errors.push('the board reads ' + JSON.stringify(board) + ' after the celebration');
    const m = said.length;
    await again();
    if (linesOf('court.cheer', m).length) errors.push('the celebration played twice');
    stats.celebration = { cheers: cheers.length, pops: pops.length, mostPopsInASecond: most };
  }
  /** Five or more open: the root is the parts of the U and Pause; a part is a row (it lands on its first storefront and
   *  loops through a spoken Back stop, ACCESSIBILITY.md §4); Back comes home to the part. */
  async function partsChecks() {
    const stops = w.BB.court.stops(), d = dbg();
    const want = stops.map(s => s.id).concat(['pause']);
    if (d.items.join(',') !== want.join(',')) errors.push('the court root offers ' + d.items.join(',') + ', not ' + want.join(','));
    // A part with one open storefront is that storefront (js/core/court.js stops(): six open leaves the right arm with
    // one), so the root holds parts and, at most, such single storefronts (integrate-2b, 2026-11-10).
    const armOf = id => (COURT.restaurants.find(r => r.pack === id) || {}).arm;
    const lone = s => s.kind === 'shop' && !stops.some(p => p.kind === 'part' && p.arm === armOf(s.pack));
    if (!stops.some(s => s.kind === 'part') || !stops.every(s => s.kind === 'part' || lone(s))) errors.push('five or more open but the root is not the parts: ' + want.join(','));
    const part = stops.find(s => s.kind === 'part' && s.arm === 'left');
    if (part && part.stops.map(x => x.pack).sort().join(',') === 'burrito,smoothie' && part.label !== 'Left. Burritos, Smoothie Shack.') errors.push('the left part says "' + part.label + '"');
    for (const s of stops.filter(x => x.kind === 'part')) {
      await must(s.id, null);
      const e = dbg();
      if (e.depth !== 1 || e.items.join(',') !== s.stops.map(x => x.id).join(',')) errors.push(s.id + ' opened ' + e.items.join(',') + ' at depth ' + e.depth);
      if (e.index !== 0 && !auto) errors.push(s.id + ' did not land on its first storefront (the hub row): ' + e.id);
      if (!w.document.querySelector('.store.litMember') && s.stops.length > 1) { /* the members light while the part is lit, not inside it */ }
      // Round the row to its Back stop, and Back.
      for (let k = 0; k < s.stops.length && !dbg().backStop; k++) { await press('Space'); stats.presses += 1; }
      if (!dbg().backStop) errors.push(s.id + ' has no Back stop after its last storefront');
      await press('Enter'); stats.presses += 1;
      await sleep(60);
      const b = dbg();
      if (b.depth !== 0 || b.id !== s.id) errors.push('Back from ' + s.id + ' came to ' + b.id + ' at depth ' + b.depth);
      // Away from the part again, so the next choose() starts from the root.
    }
    stats.parts = want.join(' ');
  }
  /** The crowd (the user, 2026-11-10): at popularity 0, 3, 7 and 10 with every restaurant open, each storefront's line
   *  and diners within what its tier allows, everyone a drawn customer of the game (never a shopper), each character at
   *  most once on the court, standing in the line's poses (the front one neutral, the rest waiting) or seated eating with
   *  a dish of that restaurant's on the table; nobody walks; nobody left out for covering a sign or the board; someone
   *  at every counter; and the crowd never shrinks as popularity grows (it stops growing once all 22 are out). */
  async function crowdChecks() {
    const st = w.BB.save.court(), counts = {}, drawn = new Set(w.BBCast.drawn(w.BBArt.cast));
    let prev = 0;
    for (const p of [0, 3, 7, 10]) {
      Object.values(st.restaurants).forEach(r => { r.popularity = p; });
      w.BB.court.refresh();
      await sleep(300);
      const sc = w.BB.court.scene(), people = sc.people, dishes = sc.dishes || [];
      let total = 0;
      const ids = people.map(x => x.id);
      if (new Set(ids).size !== ids.length) errors.push('popularity ' + p + ': someone is on the floor twice: ' + ids.filter((x, k) => ids.indexOf(x) !== k).join(', '));
      for (const x of people) {
        if (!drawn.has(x.id)) errors.push('popularity ' + p + ': ' + x.id + ' on the floor is not a drawn customer');
        if (x.dx || x.dy) errors.push('popularity ' + p + ': ' + x.key + ' moves');
        const want = x.seated ? ((w.BBArt.cast.people[x.id] || []).includes('eating') ? 'eating' : 'happy') : /:q0:/.test(x.key) ? 'neutral' : 'waiting';
        if (x.pose !== want || !String(x.src).endsWith('/' + want + '.webp')) errors.push('popularity ' + p + ': ' + x.key + ' is ' + x.pose + ' (' + x.src + '), not ' + want);
        if (x.seated && Object.keys(w.BBArt.court.food || {}).some(n => n.startsWith(x.pack + '-'))) {
          const d = dishes.find(f => f.who === x.id);
          if (!d) errors.push('popularity ' + p + ': ' + x.id + ' sits at ' + x.pack + ' with nothing on the table');
          else if (!d.name.startsWith(x.pack + '-')) errors.push('popularity ' + p + ': ' + x.id + ' at ' + x.pack + ' eats ' + d.name);
        }
      }
      if ((sc.dropped || []).length) errors.push('popularity ' + p + ': left out for covering a sign or the board: ' + sc.dropped.join(', '));
      for (const r of COURT.restaurants) {
        const c = RULES.crowd(COURT, st, r.pack), mine = people.filter(x => x.pack === r.pack);
        const n = k => mine.filter(x => new RegExp(':' + k + '\\d+:').test(x.key)).length;
        if (n('q') > c.queue || n('s') > c.seated) errors.push('popularity ' + p + ': ' + r.pack + ' draws ' + n('q') + ' in line, ' + n('s') + ' seated; its tier (' + c.tier + ') allows ' + c.queue + ', ' + c.seated);
        if (!n('q')) errors.push('popularity ' + p + ': nobody at the ' + r.pack + ' counter (' + c.tier + ')');
        total += mine.length;
      }
      if (total < prev || (p === 3 && total <= prev)) errors.push('the crowd shrank (or did not grow at popularity 3): ' + prev + ' then ' + total + ' at popularity ' + p);
      prev = total;
      counts['p' + p] = total + (dishes.length ? ' (' + people.filter(x => x.seated).length + ' eating)' : '');
    }
    stats.crowd = counts;
  }
  /** A click or tap on the court picture: on a storefront's outline it enters that one; where two storefronts' boxes
   *  overlap, the one drawn in front (its box reaching lower); from any level of the scan. */
  async function pointerChecks() {
    const box = w.BB.court.scene().box;
    const click = (x, y) => w.document.getElementById('court').dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true,
      clientX: box.left + x / 100 * box.w, clientY: box.top + y / 100 * box.h }));
    const real = w.BB.game.enter, went = [];
    w.BB.game.enter = id => { went.push(id); };
    const cases = [[16, 30, 'smoothie', 'on the Smoothie Shack, in front of the Pizza Parlor'], [23.5, 34.8, 'smoothie', 'in the overlap of both boxes, on neither outline'],
      [20, 22, 'pizza', 'on the Pizza Parlor\'s oven, inside the Smoothie Shack\'s box'], [50, 20, 'diner', 'on the Burger Bar']];
    for (const [x, y, want, where] of cases) {
      if (w.BB.court.hit(x, y) !== want) errors.push('a hit ' + where + ' (' + x + ', ' + y + ') goes to ' + w.BB.court.hit(x, y) + ', not ' + want);
      await sleep(450);
      went.length = 0;
      click(x, y);
      for (let k = 0; k < 80 && !went.length; k++) await sleep(20);
      if (went[0] !== want) errors.push('a click ' + where + ' entered ' + went[0] + ', not ' + want);
      w.BB.court.resume();
      await courtLive('back after a click');
    }
    // From inside a part of the U, a click on another part's storefront.
    const left = w.BB.court.stops().find(s => s.kind === 'part' && s.arm === 'left');
    if (left) {
      await must(left.id, null);
      await sleep(450);
      went.length = 0;
      click(50, 20);
      for (let k = 0; k < 80 && !went.length; k++) await sleep(20);
      if (went[0] !== 'diner') errors.push('a click on the Burger Bar from inside ' + left.id + ' entered ' + went[0]);
      w.BB.court.resume();
      await courtLive('back after a click from a part');
    }
    w.BB.game.enter = real;
    // And a real one: the Burger Bar.
    await sleep(450);
    click(50, 20);
    for (let k = 0; k < 200 && !w.BB.game.pack(); k++) await sleep(20);
    if (!w.BB.game.pack() || w.BB.game.pack().id !== 'diner') errors.push('a click on the Burger Bar did not enter it');
    stats.pointer = 'checked';
  }

  const shiftRun = !opts.courtOnly;
  if (opts.tour) {
    await must('settings', 'settings');
    checkSettings();
    for (const id of ['cooking', 'cooking', 'orders', 'orders', 'manager', 'manager', 'manager', 'characterVoices', 'characterVoices', 'characterVoices', 'textSize', 'textSize', 'textSize', 'theme', 'theme']) await must(id, 'settings');
    await must('back', 'title');
  }
  if (opts.menu) await menuChecks();
  if (opts.heard) await heardChecks();
  if (opts.focusCheck) await focusChecks(opts.focusCheck);
  if (opts.moments === 'unlock') await unlockChecks();
  if (opts.moments === 'gold') await goldChecks();
  if (opts.moments === 'celebrate') await celebrateChecks();
  if (opts.courtPause) { if (w.BB.court.mode !== 'scan') { await must('play', null); await courtLive('Play'); } await pauseChecks(); }
  if (opts.parts) { if (w.BB.court.mode !== 'scan') { await must('play', null); await courtLive('Play'); } await partsChecks(); }
  if (opts.crowd) { if (w.BB.court.mode !== 'scan') { await must('play', null); await courtLive('Play'); } await crowdChecks(); }
  if (opts.pointer) { if (w.BB.court.mode !== 'scan') { await must('play', null); await courtLive('Play'); } await pointerChecks(); }
  if (shiftRun && !opts.pointer) await enter();
  else if (shiftRun && opts.pointer) {
    await settle();
    if (dbg().card === 'tutorialOffer') await must('skip', null);
    await settle();
    if (dbg().card === 'event') await must('shift', null);
  }
  let resumed = false, held = false, holdTaken = false, clockRan = false, restarted = false, lagged = false, backAtCourt = false;
  const timing = new Map();   // a cook step's planned timing mistake (Timed)
  const loopStart = Date.now();
  while (shiftRun && Date.now() - loopStart < (opts.timeout || 240000)) {
    // A 5 s Enter hold that starts during an arrival (the customer walking up and ordering: a playout, the scan
    // suspended) opens Pause, even though the arrival ends under the hold and the line opens; Pause stays until
    // Continue, and the Timed clock runs afterwards (spec 6.3, 9).
    if (opts.holdPause && !held) {
      const arriving = () => { const sh = w.BB.game.shift(); return w.BB.game.screen === 'arrive' && w.BB.game.busy && !!(sh && sh.order && sh.order.phase === 'line' && !sh.order.items.some(it => it.answers.length)); };
      for (let k = 0; k < 2000 && !arriving(); k++) await sleep(5);
      held = true;
      if (!arriving()) { errors.push('never caught an arrival to hold Enter in'); continue; }
      const ev = type => new w.KeyboardEvent(type, { code: 'Enter', key: 'Enter', bubbles: true, cancelable: true });
      w.document.body.dispatchEvent(ev('keydown'));
      let sawLine = false;
      for (let t = 0; t < 5400; t += 50) { await sleep(50); if (w.BB.game.screen === 'line' && !w.BB.game.busy) sawLine = true; if (dbg().card === 'pause') break; }
      const opened = dbg().card === 'pause';
      w.document.body.dispatchEvent(ev('keyup'));
      await sleep(400);
      if (!opened) { fail('a 5 s Enter hold that began in an arrival did not open Pause'); }
      stats.holdCrossedArrival = sawLine;
      await sleep(1500);
      if (dbg().card !== 'pause' || !w.BB.game.paused) fail('Pause did not stay open after the hold');
      stats.pauses += 1;
      await must('continue', null);
      continue;
    }
    await settle();
    const d = dbg();
    if (d.ctx === 'court') { await toShop(here); stats.resumed += 1; continue; }
    if (d.ctx === 'card') {
      if (d.card === 'results') {
        const news = w.document.querySelector('.card .news');
        stats.resultNews = ((stats.resultNews ? stats.resultNews + ' | ' : '') + (news ? news.textContent : '')).trim();
        if (!opts.backToCourt || backAtCourt) break;
        // Food Court from the results: the court zooms back out, its scan opens at -1.
        await must('court', null);
        await courtLive('Food Court from the results');
        stats.backToCourt = w.BB.court.state().scan.join(' ');
        if (opts.unlockAfter) await unlockAfterChecks(opts.unlockAfter);
        // A chain: on to the next restaurant on the court for a shift there too, then back to the court again.
        const chain = opts.chain || [], at = chain.indexOf(here);
        if (at >= 0 && at < chain.length - 1) {
          here = chain[at + 1]; pack = packOf(here); starsBase = stats.stars.length;
          (stats.chain = stats.chain || [chain[0]]).push(here);
          await toShop(here);
          await settle();
          if (dbg().card === 'tutorialOffer') { errors.push('the first-visit card came back at ' + here + ' after tutorialDone'); await must('skip', null); }
          await settle();
          if (dbg().card === 'event') await must('shift', null);
          if (!w.BB.game.pack() || w.BB.game.pack().id !== here) fail('the chain did not go into ' + here);
          continue;
        }
        backAtCourt = true;
        break;
      }
      if (d.card === 'pause') { await must('continue', null); continue; }
      if (d.card === 'event') { await must('shift', null); continue; }
      fail('stuck on card ' + d.card);
    }
    const s = w.BB.game.shift();
    if (!s) { await sleep(50); continue; }
    const screen = w.BB.game.screen;
    // Keyed by the order's place in the shift: a shift restored from its save is the same order, said once.
    if (s.order && !(heardFrom.orders = heardFrom.orders || new Set()).has(here + ':' + s.n + ':' + s.order.ticket.customer.id)) {
      heardFrom.orders.add(here + ':' + s.n + ':' + s.order.ticket.customer.id);
      const C = pack.regulars.find(c => c.id === s.order.ticket.customer.id);
      // As game.js says it: a ridiculous order is said its own way, and "the usual" is said as the usual; only an
      // order said in full says why a dislike was left off.
      const script = w.BB.packs.get(here).script, o = s.order;
      const odd = !!(o.ticket.odd && w.BB.script.candidates(script, C && C.id, 'order.odd.' + o.ticket.odd, 'customer').length);
      const usual = !!(C && C.usual && o.items.length === C.usual.length && o.items.every((it, i) => it.spec.recipe === C.usual[i].recipe) &&
        w.BB.script.candidates(script, C.id, 'order.usual', null).length);
      if (C && !odd && !usual && w.BB.script.candidates(script, C.id, 'order.dislike', null).length &&
        (C.dislikes || []).some(x => o.items.some(it => (it.spec.holds || []).includes(x)))) heardFrom.dislikers += 1;
    }
    if (screen === 'receipt') {
      const r = s.results[s.results.length - 1];
      if (r && stats.stars.length - starsBase < s.results.length) { stats.stars.push(r.stars); stats.orders += 1; if (r.grossServed) stats.gross += 1; }
      if (opts.pauses && !resumed && s.n === 1) {
        // Pause, Settings (the 17 rows), back, Food Court (confirm), the court, the storefront: the shift resumes.
        resumed = true;
        const seed = s.seed, n = s.n;
        await must('pause', 'pause');
        stats.pauses += 1;
        await must('settings', 'settings');
        checkSettings();
        await must('back', 'pause');
        await must('court', 'confirm');
        await must('yes', null);
        await courtLive('Food Court mid-shift');
        if (w.BB.game.shift()) errors.push('the shift was still in hand on the court');
        const label = RULES.label(COURT, w.BB.save.court(), here, { saved: w.BB.save.shift.savedIds() });
        if (!/shift in progress/.test(label)) errors.push('the storefront does not say "shift in progress": ' + label);
        await toShop(here);
        await settle();
        const back = w.BB.game.shift();
        if (!back || back.seed !== seed || back.n !== n) errors.push('the saved shift did not resume where it was: ' + JSON.stringify(back && { seed: back.seed, n: back.n }));
        stats.resumed += 1;
        continue;
      }
      if (opts.leave && !resumed && s.n === 1) {
        // Pause > Main Menu (a confirm, Cancel first): the shift is saved; the main menu comes back over the court, out
        // of focus; Play and the storefront bring the shift back where it was (spec 4.2).
        resumed = true;
        const seed = s.seed, n = s.n;
        await must('pause', 'pause');
        await must('menu', 'confirm');
        if (dbg().items[0] !== 'cancel') errors.push('the Main Menu confirm does not offer Cancel first');
        await must('yes', 'title');
        if (w.BB.game.shift()) errors.push('the shift was still in hand on the main menu');
        if (!soft()) errors.push('Main Menu from a restaurant\'s Pause: the court behind the card is not out of focus');
        if (w.document.body.dataset.place !== 'court') errors.push('Main Menu from a restaurant\'s Pause: the court is not behind the card');
        if (dbg().items.join(',') !== MENU_ITEMS.join(',')) errors.push('Main Menu from a restaurant opened ' + dbg().items.join(','));
        await must('play', null);
        await courtLive('Play after Main Menu');
        await toShop(here);
        await settle();
        const back = w.BB.game.shift();
        if (!back || back.seed !== seed || back.n !== n) errors.push('Main Menu lost the shift: ' + JSON.stringify(back && { seed: back.seed, n: back.n }));
        stats.resumed += 1;
        continue;
      }
      if (opts.leave && !restarted && s.n === 2) {
        // Pause > Restart Shift (a confirm): the only route that throws a shift away; it starts again.
        restarted = true;
        await must('pause', 'pause');
        await must('restart', 'confirm');
        await must('yes', null);
        await settle();
        const again = w.BB.game.shift();
        if (!again || again.n !== 0 || again.results.length) errors.push('Restart Shift did not start the shift again: ' + JSON.stringify(again && { n: again.n, results: again.results.length }));
        stats.restarted = true;
        continue;
      }
      if (rand() < 0.15) await must('again', null);
      await must('next', null);
      continue;
    }
    if (screen === 'review') {
      if (opts.counter && !(heardFrom.checked = heardFrom.checked || new Set()).has(s.n)) { heardFrom.checked.add(s.n); checkCounter(s); }
      if (opts.watchWheel && !watch.ticketCounter) { await must('ticket', null); watch.ticketCounter += 1; continue; }
      const q = w.BB.shift.question(pack, s);
      if (opts.redo && rand() < 0.2 && stats.redos < 3) {
        const redo = q.options.find(x => x.id.startsWith('redo:'));
        if (redo) { stats.redos += 1; await must(redo.id, null); continue; }
      }
      await must('serve', null);
      continue;
    }
    if (screen === 'line') {
      // clockLag: the page's clock falls behind its timers (a long callback on a busy machine does that to Node's
      // loop time): the hub scanner's armed step is dropped, and the page's guard must start the scan again.
      if (opts.clockLag && !lagged) { lagged = true; const real = w.Date.now.bind(w.Date); w.Date.now = () => real() - opts.clockLag; }
      const q = w.BB.shift.question(pack, s);
      if (!q || q.kind === 'review') { await sleep(30); continue; }
      if (opts.midOrder && !stats.midOrder && s.n === 1 && s.order && Object.keys(s.order.items[0].answers).length >= 2) {
        // Leave half way through an order (Pause > Food Court), come back: the shift is the same, but that order
        // starts over: the same customer walks up and says it again, and the line opens at its first step with nothing
        // made (the user, 2026-11-11).
        const seed = s.seed, n = s.n, who = s.order.ticket.customer.id, before = JSON.stringify(s.order.ticket);
        await must('pause', 'pause');
        await must('court', 'confirm');
        await must('yes', null);
        await courtLive('Food Court half way through an order');
        const mark = said.length;
        await toShop(here);
        for (let k = 0; k < 400 && !(w.BB.game.screen === 'line' && !w.BB.game.busy); k++) await sleep(50);
        const back = w.BB.game.shift(), o2 = back && back.order;
        if (!back || back.seed !== seed || back.n !== n) errors.push('half way through an order: the shift did not come back where it was');
        else if (!o2 || o2.ticket.customer.id !== who || JSON.stringify(o2.ticket) !== before) errors.push('half way through an order: a different order came back');
        else if (o2.at.item !== 0 || o2.at.st !== 0 || o2.items.some(it => Object.keys(it.answers).length > 1)) errors.push('half way through an order: the order did not start over: ' + JSON.stringify(o2.at));
        if (!said.slice(mark).some(x => x.who === who)) errors.push('half way through an order: ' + who + ' did not say the order again');
        stats.midOrder = { who, saidAgain: said.slice(mark).filter(x => x.who === who).length };
        stats.resumed += 1;
        continue;
      }
      if (opts.watchWheel && !watch.ticketKitchen) { await must('ticket', null); watch.ticketKitchen += 1; await sleep(1800); continue; }
      const o = s.order, want = L.expected(pack, o.items[q.item], q.station, q.step);
      let id;
      if (q.gross && (opts.mistakes === 0 || rand() < 0.75)) id = 'swap';
      else if (q.kind === 'add') id = q.have < want ? 'add' : 'skip';
      else if (q.kind === 'cook' && q.timed) {
        const set = pack.stageSets[q.set], dur = L.stageSeconds(pack, set, s.settings) * (q.stage === want ? L.wantedScaleOf(pack, set) : 1);
        if (opts.holdTakeOff && !holdTaken) {
          // Hold Take It Off 3 s across a stage boundary: the clock stands still while the switch is down, so the
          // stage on show at keydown is the one taken on release (spec 0.7, 9).
          holdTaken = true;
          for (let k = 0; k < 12 && dbg().id !== 'takeOff'; k++) { await press('Space'); stats.presses += 1; }
          if (dbg().id !== 'takeOff') fail('could not highlight takeOff');
          const list = set.stages, wi = list.indexOf(want);
          const left = () => (o.timer ? L.stageSeconds(pack, set, s.settings) * (o.timer.s === wi ? L.wantedScaleOf(pack, set) : 1) - o.timer.t : Infinity);
          for (let k = 0; k < 3000 && !(o.timer && o.timer.s < list.length - 1 && left() < 1.6 && left() > 0.5); k++) await sleep(10);
          if (!o.timer) fail('the Timed clock was not running');
          const s0 = o.timer.s, t0 = o.timer.t, l0 = left();
          const ev = type => new w.KeyboardEvent(type, { code: 'Enter', key: 'Enter', bubbles: true, cancelable: true });
          w.document.body.dispatchEvent(ev('keydown'));
          await sleep(3000);
          const still = o.timer && o.timer.s === s0 && o.timer.t === t0;
          w.document.body.dispatchEvent(ev('keyup'));
          stats.presses += 1;
          await sleep(400);
          await settle();
          const took = o.items[q.item].answers[q.key];
          stats.heldTakeOff = { at: list[s0], secondsLeft: +l0.toFixed(2), took };
          if (!still) errors.push('the Timed clock moved while Take It Off was held');
          if (took !== list[s0]) errors.push('holding Take It Off across a stage boundary took ' + took + ', not ' + list[s0] + ' (the stage at keydown)');
          continue;
        }
        if (!clockRan && o.timer) { const t0 = o.timer.t; await sleep(600); if (o.timer && o.timer.t > t0) clockRan = true; }
        const cookKey = here + ':' + s.n + ':' + q.item + ':' + q.station + ':' + q.step;
        if (!timing.has(cookKey)) timing.set(cookKey, rand() < (opts.mistakes ?? 0.08));
        if (q.stage !== want && !timing.get(cookKey)) { await sleep(60); continue; }
        if (q.stage !== want) stats.mistakesMade += 1;
        id = 'takeOff';
      }
      else if (q.kind === 'cook') id = 'cook:' + want;
      // A repeat pick (the ice cream's scoops) picks the ticket's values still to go, one by one, then Done; a value
      // behind More… is found inside its row (pathOf, below, enters the row first). content-icecream, 2026-11-10.
      else if (q.repeat) { const left = L.remaining(want || [], q.picked || []); id = left.length ? leafOf(q.options, left[0]).id : 'done'; }
      else id = leafOf(q.options, want).id;
      // Sometimes a mistake, like a real player (the tutorial warns instead of applying it).
      if (rand() < (opts.mistakes ?? 0.08) && q.options.length > 1) { id = q.options.map(x => x.id).find(x => x !== id && !x.startsWith('more')) || id; stats.mistakesMade += 1; }
      // watchWheel: the first sauce down the line is added even when the order holds it (a 1-star order keeps at
      // most two optional toppings, so whether a sauce is on the ticket is luck): the squirt is what is checked.
      if (opts.watchWheel && !watch.squirts && q.kind === 'add' && !q.gross && pack.ingredients[q.ing] && pack.ingredients[q.ing].sauce) id = 'add';
      const before = JSON.stringify(o.items.map(it => it.answers));
      // A value inside a More… row (or a row inside it): enter each row on the way, then choose it.
      for (const row of pathOf(q.options, id).slice(0, -1)) { if (!(await choose(row))) fail('could not enter the row ' + row + ' for ' + id + ' at', { q: q.kind, d: dbg() }); stats.rowsEntered = (stats.rowsEntered || 0) + 1; await sleep(30); }
      if (!(await choose(id))) fail('could not choose ' + id + ' at', { q: q.kind, ing: q.ing, d: dbg() });
      await sleep(30);
      await settle();
      if (s.tutorial && JSON.stringify(o.items.map(it => it.answers)) === before && !['swap'].includes(id)) stats.warns += 1;
      continue;
    }
    await sleep(40);
  }
  if (opts.keepShift) {
    const kept = w.localStorage.getItem('bb-shift:' + opts.pack);
    if (kept !== savedShift(opts.pack)) errors.push('the tutorial changed the saved shift at ' + opts.pack + ': ' + String(kept).slice(0, 80));
  }
  const final = dbg(), done = shiftRun ? final.card === 'results' || backAtCourt : true;
  Object.assign(stats, { customers: [...heardFrom.customers].sort().join(' '), cardsSeen: [...new Set(seen.cards)].join(' ') });
  if (seen.cards.includes('tutorials')) errors.push('a tutorial picker card opened');
  // voicecut (2026-11-10): a customer's complaint names no food and Mitch reads the mistake (mistake.*); no line is
  // said with a blank left in it.
  const voiced = said.filter(l => l.clip);
  stats.complaints = voiced.filter(l => /\/(\w+:)?(customer\.)?complain\.(c?\d+)$/.test(l.clip)).length;
  stats.readouts = voiced.filter(l => /\/(\w+:)?mistake\./.test(l.clip)).length;
  const blank = said.filter(l => /[{}]/.test(l.text || ''));
  if (blank.length) errors.push('a line was said with a blank left in it: ' + JSON.stringify(blank.slice(0, 3).map(l => l.clip + ': ' + l.text)));
  if (heardFrom.dislikers) {
    stats.dislikeLines = heardFrom.dislikes;
    if (heardFrom.dislikes < heardFrom.dislikers) errors.push(heardFrom.dislikers + ' orders left off a dislike, but only ' + heardFrom.dislikes + ' dislike lines were said');
  }
  if (opts.holdPause) { if (!held) errors.push('never held Enter during an arrival'); if (timed && !clockRan) errors.push('the Timed clock never ran after Pause'); }
  if (opts.holdTakeOff && !holdTaken) errors.push('never held Take It Off');
  if (opts.leave && !(resumed && restarted)) errors.push('never left by Main Menu and restarted the shift');
  if (opts.backToCourt && !backAtCourt) errors.push('never came back to the court from the results');
  if (opts.counter) {
    if (counterWatch) clearInterval(counterWatch);
    const seen = Object.assign({}, counterChecks.seen, counterChecks.seen.column ? { column: [...counterChecks.seen.column].join('+') } : {});
    Object.assign(stats, { counterReviews: counterChecks.reviews, childReviews: counterChecks.child, counterSeen: seen }, counterChecks.wide ? { wide: counterChecks.wide } : {});
    if (counterChecks.notes.length) stats.legibilityFirst = counterChecks.notes;
    if (counterChecks.reviews < 2) errors.push('the counter was checked at only ' + counterChecks.reviews + ' reviews');
    if (opts.queue && opts.queue.includes('kai') && !counterChecks.child) errors.push('no child came to the counter');
    if (!seen.receipt) errors.push('the receipt was never checked against the painted queue');
  }
  if (opts.pauses && !resumed) errors.push('never left the shift mid-way');
  if (watcher) {
    clearInterval(watcher);
    Object.assign(stats, { squirts: watch.squirts, wheelTurning: watch.turning });
    Object.assign(stats, { flourishes: watch.flourishes });
    if (sauces() && !watch.squirts) errors.push('no sauce was squirted on');
    if (flourishes() && !watch.flourishes) errors.push('no flourish (an auto step) played');
    if (!watch.turning) errors.push('the ticket wheel never turned');
    if (Math.abs(w.BB.stage.wheelTheta) > 1e-9) errors.push('the ticket wheel stopped off the front: ' + w.BB.stage.wheelTheta);
  }
  // The court after the shift: counted once, and never down (each restaurant of a chain).
  const court = w.BB.save.court().restaurants[opts.pack];
  if (opts.chain && (stats.chain || [opts.pack]).join(',') !== opts.chain.join(',')) errors.push('the chain went ' + (stats.chain || [opts.pack]).join(', ') + ', not ' + opts.chain.join(', '));
  if (shiftRun && done) {
    for (const id of opts.chain || [opts.pack]) {
      const c = w.BB.save.court().restaurants[id], before = seedOf(opts, id), at = id === opts.pack ? '' : ' at ' + id;
      const tutorial = !!opts.tutorial;
      if (!tutorial && c.shifts !== 1) errors.push('the shift' + at + ' counted ' + c.shifts + ' times, not once');
      if (tutorial && c.shifts !== 0) errors.push('a tutorial counted as a shift');
      if (c.stars < (before.stars || 1) || c.popularity < (before.popularity || 0)) errors.push('stars or popularity went down' + at);
      if (!c.tutorialDone) errors.push('tutorialDone is not set after the visit' + at);
    }
    // No mistakes asked for (and none planned): every order is right, Timed included.
    if (opts.mistakes === 0 && !opts.holdTakeOff && !opts.tutorial && stats.stars.some(n => n !== 3)) errors.push('mistakes: 0 but the stars were ' + stats.stars.join(' '));
    if (opts.event && opts.expectGold) {
      if (!court.gold || court.stars !== 5) errors.push('a good event shift did not give the fifth star and the gold sign: ' + JSON.stringify(court));
      const words = w.document.querySelector('.card .news');
      if (!backAtCourt && (!words || !/gold sign/.test(words.textContent))) errors.push('the results card did not say the gold sign');
    }
    if (!backAtCourt) {
      const title = w.document.querySelector('.card h1');
      stats.result = (title ? title.textContent : '') + ' | ' + final.items.join(' ');
      const expectItems = 'again,court,exit';
      if (final.items.join(',') !== expectItems) errors.push('the results card offers ' + final.items.join(',') + ', expected ' + expectItems);
    }
  }
  Object.assign(stats, { court: { stars: court.stars, popularity: court.popularity, shifts: court.shifts, gold: court.gold } });
  if (opts.chain) stats.courts = Object.fromEntries(opts.chain.map(id => { const c = w.BB.save.court().restaurants[id]; return [id, { stars: c.stars, popularity: c.popularity, shifts: c.shifts }]; }));
  // Every scene drew the 3D food at least once.
  if (shiftRun && renders.n < 10) errors.push('the 3D food barely rendered (' + renders.n + ' frames)');
  if (opts.verbose) console.log('   trace:', JSON.stringify(trace.slice(-20)));
  dom.window.close();
  return { label, done, errors, warns, stats, final, secs: ((Date.now() - start) / 1000).toFixed(1) };
}

/** The runs. Seeded progress: a restaurant's bb-court entry ({ popularity, stars } -> its level). */
const RUNS = [
  // The page: every script loads, no console error, every restaurant on disk is on the page.
  ['the page boots: every script loads, no console error or warning, every restaurant on disk is on the page', { seed: 2, bootCheck: true, courtOnly: true }],
  ['the first visit: the offer card, then the tutorial, two switches', { offer: true, tutorial: 'offer', seed: 3, mistakes: 0.35 }],
  ['the first visit\'s tutorial with a saved shift waiting, two switches: the tutorial leaves it alone', { offer: true, tutorial: 'offer', seed: 4, mistakes: 0.2, keepShift: true }],
  ['a 3-customer shift, two switches, settings tour, pause, Food Court mid-shift and resume', { seed: 5, tour: true, pauses: true, redo: true }],
  ['leaving: Pause, Main Menu keeps the shift, Restart Shift starts it again, counted once', { seed: 27, leave: true }],
  ['leaving half way through an order: back in, the customer orders again and the order starts over', { seed: 28, midOrder: true }],
  ['a 3-customer shift, Timed cooking, two switches, a 5 s Enter hold during the arrival', { seed: 9, settings: { cooking: 'timed', speed: 'normal' }, holdPause: true, slowSpeech: true, mistakes: 0 }],
  ['a 3-customer shift, Timed, holding Take It Off across a stage boundary', { seed: 10, settings: { cooking: 'timed', speed: 'normal' }, holdTakeOff: true, mistakes: 0 }],
  ['a 3-customer shift, one switch (Auto Scan 1 s)', { seed: 11, scan: { autoScan: true, scanSpeedIndex: 0 } }],
  ['one switch, the page clock falling behind its timers: the Auto Scan picks itself up', { seed: 12, scan: { autoScan: true, scanSpeedIndex: 0 }, clockLag: 400 }],
  ['level 5 orders, five customers, captions only, Mitch off', { seed: 13, court: { here: { popularity: 10, stars: 5, gold: true, goldSeen: true } }, settings: { shiftLength: 5, characterVoices: 'captions', manager: 'off' } }],
  // Eight customers at level 4: everyone once before anyone twice, a visitor, a ridiculous order now and then.
  ['eight customers at level 4, the whole cast, two switches', { seed: 17, court: { here: { popularity: 5, stars: 4 } }, settings: { shiftLength: 8 }, timeout: 600000 }],
  ['the five-star event with seeded progress (popularity 7, four stars): the gold sign', { seed: 19, event: true, expectGold: true, mistakes: 0, court: { here: { popularity: 7, stars: 4 } } }],
  // Full motion: the ticket wheel turns, the bottles squirt, everything slides (the others run Reduced, for speed).
  ['a 3-customer shift with Motion Full (the wheel turns, the sauces are squirted)', { seed: 7, settings: { motion: 'full' }, watchWheel: true }],
  // The counter (spec 5.2): its line, the served customer, a child (Kai) and the order on the counter, at every
  // window shape the spec names.
  ['the counter at 16:9: the line, the customer, Kai, the order on screen', { seed: 23, size: [1280, 720], queue: ['gus', 'kai'], counter: true, mistakes: 0 }],
  ['the counter at 16:10: the line, the customer, Kai, the order on screen', { seed: 24, size: [1280, 800], queue: ['bev', 'kai'], counter: true, mistakes: 0 }],
  ['the counter at 4:3: the line, the customer, Kai, the order on screen', { seed: 25, size: [1024, 768], queue: ['vernon', 'kai'], counter: true, mistakes: 0 }],
  ['the counter at 21:9: the line, the customer, Kai, the order on screen', { seed: 26, size: [1680, 720], queue: ['sal', 'kai'], counter: true, mistakes: 0 }],
  // Extra Large text at 4:3, the tightest: whatever must cover the painted queue for legibility is listed (2b-seams).
  ['the counter at 4:3 with Extra Large text: the line, the customer, the order; legibility first', { seed: 28, size: [1024, 768], queue: ['gus', 'kai'], counter: true, mistakes: 0, settings: { textSize: 'xlarge' } }],
  // The court (spec 6.1, 6.2): the main menu over it, out of focus, and the whole chain back to it; its Pause; Play's
  // focus pull; the moments with seeded progress; the parts of the U; pointer clicks.
  ['the whole chain: the main menu over the out-of-focus court, How to Play, Settings, Play, the Burger Bar and the Pizza Parlor, a shift each, back to the court', { pack: 'diner', chain: ['diner', 'pizza'], seed: 31, menu: true, backToCourt: true, size: [1280, 720] }],
  ['the court Pause: the Back in 5 sign and the 5 s hold, Help, Settings, Exit Game\'s confirm, Main Menu over the blurred court', { seed: 32, courtPause: true, courtOnly: true }],
  ['Play\'s focus pull is a cut under Reduced', { seed: 33, focusCheck: 'reduced', courtOnly: true, settings: { manager: 'off' } }],
  ['Play\'s focus pull takes about 0.6 s with Motion Full', { seed: 34, focusCheck: 'full', courtOnly: true, settings: { motion: 'full', manager: 'off' } }],
  ['a Grand Opening with seeded progress: it plays once, the storefront un-greys, the banner stays', { seed: 35, moments: 'unlock', builtAs: ['smoothie'], courtOnly: true,
    court: { pizza: { popularity: 3, stars: 3 }, diner: { popularity: 3, stars: 3 }, cafe: { popularity: 3, stars: 3 } } }],
  ['a gold sign with seeded progress: it drops once', { seed: 36, moments: 'gold', courtOnly: true, court: { diner: { popularity: 8, stars: 5, gold: true, goldSeen: false } } }],
  ['the grand celebration plays exactly once; then the parts of the U with all seven open', { seed: 37, moments: 'celebrate', parts: true, builtAs: OTHERS, courtOnly: true, court: ALL_GOLD }],
  ['five open: the parts of the U, two switches, then into the Burger Bar through the top for a shift', { seed: 38, parts: true, builtAs: ['smoothie', 'burrito', 'pizza', 'cafe'],
    court: { pizza: { popularity: 5, stars: 4 }, diner: { popularity: 5, stars: 4 }, cafe: { popularity: 5, stars: 4 }, smoothie: { opened: true, grandOpeningSeen: true, popularity: 5, stars: 4 },
      burrito: { opened: true, grandOpeningSeen: true } } }],
  ['the parts of the U with one switch (Auto Scan 1 s), into the Burger Bar', { seed: 40, scan: { autoScan: true, scanSpeedIndex: 0 }, builtAs: OTHERS, court: ALL_GOLD, celebrationSeen: true }],
  ['a pointer click enters a storefront; in an overlap, the one drawn in front; from any level', { pack: 'diner', seed: 39, pointer: true, builtAs: ['smoothie', 'pizza', 'burrito'],
    court: { smoothie: { opened: true, grandOpeningSeen: true }, burrito: { opened: true, grandOpeningSeen: true } } }],
  // All seven (integrate-2b): the whole chain through every restaurant, seeded open, and the crowd at every tier.
  ['the whole chain, all seven open: the main menu, Play, every restaurant for a shift in turn, back to the court', { pack: 'diner', chain: ['diner', 'pizza', 'cafe', 'smoothie', 'burrito', 'sushi', 'icecream'], seed: 91, menu: true, backToCourt: true, size: [1280, 720],
    court: ALL_OPEN, timeout: 1500000 }],
  ['the court with all seven open at every crowd tier (popularity 0, 3, 7, 10): each storefront\'s own customers, never more than its tier, nobody twice', { seed: 92, courtOnly: true, crowd: true, court: ALL_OPEN }],
  // Long words on a card, heard in full under one switch (2b-seams): the card's automatic scan waits for them.
  ['How to Play heard in full, one switch, Wait for Speech off', { seed: 81, courtOnly: true, heard: { what: 'howto' }, speechMsPerChar: 12, scan: { autoScan: true, scanSpeedIndex: 0, waitForSpeech: false } }],
  ['How to Play heard in full, one switch, Wait for Speech on, longer than its 10 s cap', { seed: 82, courtOnly: true, heard: { what: 'howto' }, speechMsPerChar: 20, scan: { autoScan: true, scanSpeedIndex: 0, waitForSpeech: true } }],
  ['How to Play heard in full, one switch, Text to Speech off: the scan moves after one interval', { seed: 83, courtOnly: true, heard: { what: 'howto' }, scan: { autoScan: true, scanSpeedIndex: 1, waitForSpeech: true },
    storage: { 'narbe-voice-settings': JSON.stringify({ ttsEnabled: false }) } }],
  // (With the Space brake on, the hub's default, Space on the blank is consumed and Enter there does nothing, on every
  // card: the words go on. With it off, Space steps at once.)
  ['How to Play heard in full, one switch: a Space press during the words acts at once', { seed: 84, courtOnly: true, heard: { what: 'howto', press: true }, speechMsPerChar: 12, scan: { autoScan: true, scanSpeedIndex: 0, spaceBrake: false } }],
  ['Long words heard in full, one switch: the court Pause\'s Help, Wait for Speech off', { seed: 85, courtOnly: true, heard: { what: 'help' }, speechMsPerChar: 30, scan: { autoScan: true, scanSpeedIndex: 0, waitForSpeech: false } }],
  ['Long words heard in full, one switch: the first-visit card, Wait for Speech off', { seed: 86, courtOnly: true, offer: true, heard: { what: 'offer' }, speechMsPerChar: 40, scan: { autoScan: true, scanSpeedIndex: 0, waitForSpeech: false } }],
  // The Pizza Parlor (phase 2a's pilot), played through the page like the Burger Bar: the first visit's tutorial, Timed
  // with the peel (Pull It Out held across a stage boundary), one switch, level 4, the event, Motion Full (the dough
  // toss), the counter at every window shape, and an unlock earned by its shift.
  ['the Pizza Parlor: the first visit, the offer card, then the tutorial, two switches', { pack: 'pizza', offer: true, tutorial: 'offer', seed: 41, mistakes: 0.35 }],
  ['the Pizza Parlor: a 3-customer shift, Timed (the peel), no mistakes: every order three stars', { pack: 'pizza', seed: 42, settings: { cooking: 'timed', speed: 'normal' }, mistakes: 0 }],
  ['the Pizza Parlor: Timed, holding Pull It Out across a stage boundary', { pack: 'pizza', seed: 43, settings: { cooking: 'timed', speed: 'normal' }, holdTakeOff: true, mistakes: 0 }],
  ['the Pizza Parlor: a 3-customer shift, one switch (Auto Scan 1 s)', { pack: 'pizza', seed: 44, scan: { autoScan: true, scanSpeedIndex: 0 } }],
  ['the Pizza Parlor: eight customers at level 4, the whole cast, two switches', { pack: 'pizza', seed: 45, court: { here: { popularity: 5, stars: 4 } }, settings: { shiftLength: 8 }, timeout: 600000 }],
  ['the Pizza Parlor: the five-star event with seeded progress (popularity 7, four stars): the gold sign', { pack: 'pizza', seed: 46, event: true, expectGold: true, mistakes: 0, court: { here: { popularity: 7, stars: 4 } } }],
  ['the Pizza Parlor: Motion Full (the wheel turns, the dough is tossed)', { pack: 'pizza', seed: 47, settings: { motion: 'full' }, watchWheel: true }],
  ['the Pizza Parlor: the counter at 16:9: the line, the customer, Kai, the order on screen', { pack: 'pizza', seed: 48, size: [1280, 720], queue: ['gus', 'kai'], counter: true, mistakes: 0 }],
  ['the Pizza Parlor: the counter at 16:10: the line, the customer, Kai, the order on screen', { pack: 'pizza', seed: 49, size: [1280, 800], queue: ['bev', 'kai'], counter: true, mistakes: 0 }],
  ['the Pizza Parlor: the counter at 4:3: the line, the customer, Kai, the order on screen', { pack: 'pizza', seed: 50, size: [1024, 768], queue: ['tony', 'kai'], counter: true, mistakes: 0 }],
  ['the Pizza Parlor: the counter at 21:9: the line, the customer, Kai, the order on screen', { pack: 'pizza', seed: 51, size: [1680, 720], queue: ['pam', 'kai'], counter: true, mistakes: 0 }],
  ['an unlock with seeded progress: a good Pizza Parlor shift brings all three to three stars, the results say so, the Smoothie Shack has its Grand Opening', { pack: 'pizza', seed: 52,
    mistakes: 0, backToCourt: true, unlockAfter: 'smoothie', builtAs: ['smoothie'],
    court: { here: { popularity: 2, stars: 2 }, diner: { popularity: 3, stars: 3 }, cafe: { popularity: 3, stars: 3 } } }],
  // Ben's Smoothie Shack (phase 2b, content-smoothie). Shut at the start, so each run seeds it open (courtRecord) except
  // its Grand Opening, which earns it: the first visit's tutorial, Timed with the blender switch (Stop the Blender held
  // across a stage boundary), one switch, level 4, the event (Brock's trophy finale), Motion Full (the pour, the fill).
  ['the Smoothie Shack: the first visit, the offer card, then the tutorial, two switches', { pack: 'smoothie', offer: true, tutorial: 'offer', seed: 61, mistakes: 0.35 }],
  ['the Smoothie Shack: a 3-customer shift, Timed (the blender switch), no mistakes: every order three stars', { pack: 'smoothie', seed: 62, settings: { cooking: 'timed', speed: 'normal' }, mistakes: 0 }],
  ['the Smoothie Shack: Timed, holding Stop the Blender across a stage boundary', { pack: 'smoothie', seed: 63, settings: { cooking: 'timed', speed: 'normal' }, holdTakeOff: true, mistakes: 0 }],
  ['the Smoothie Shack: a 3-customer shift, one switch (Auto Scan 1 s)', { pack: 'smoothie', seed: 64, scan: { autoScan: true, scanSpeedIndex: 0 } }],
  ['the Smoothie Shack: eight customers at level 4, the whole cast, two switches', { pack: 'smoothie', seed: 65, court: { here: { popularity: 5, stars: 4 } }, settings: { shiftLength: 8 }, timeout: 600000 }],
  ['the Smoothie Shack: the five-star event with seeded progress (popularity 7, four stars): the gold sign', { pack: 'smoothie', seed: 66, event: true, expectGold: true, mistakes: 0, court: { here: { popularity: 7, stars: 4 } } }],
  ['the Smoothie Shack: Motion Full (the wheel turns, the base pours, the cup fills)', { pack: 'smoothie', seed: 67, settings: { motion: 'full' }, watchWheel: true }],
  ['the Smoothie Shack: its Grand Opening, earned with seeded progress (all three at three stars), then its first visit: Skip It and a shift', { pack: 'smoothie', seed: 68, moments: 'unlock', offer: true,
    court: { pizza: { popularity: 3, stars: 3 }, diner: { popularity: 3, stars: 3 }, cafe: { popularity: 3, stars: 3 } } }],
  // Ben's Cafe (phase 2b, content-cafe). Open at the start: the first visit's tutorial (Jitters; the spoiled milk is
  // swapped on a pick), Timed with the espresso lever and the fryer basket (Stop the Pour or Lift the Basket held across
  // a stage boundary), one switch, level 4 (Reginald, Kai or Walt), the event (Jitters's giant donut for the office),
  // Motion Full (the latte art, the glaze dunk), the counter at every window shape, and the whole chain with it.
  ['the Cafe: the first visit, the offer card, then the tutorial, two switches', { pack: 'cafe', offer: true, tutorial: 'offer', seed: 71, mistakes: 0.35 }],
  ['the Cafe: a 3-customer shift, Timed (the espresso lever, the fryer basket), no mistakes: every order three stars', { pack: 'cafe', seed: 72, settings: { cooking: 'timed', speed: 'normal' }, mistakes: 0 }],
  ['the Cafe: Timed, holding Stop the Pour or Lift the Basket across a stage boundary', { pack: 'cafe', seed: 73, settings: { cooking: 'timed', speed: 'normal' }, holdTakeOff: true, mistakes: 0 }],
  ['the Cafe: a 3-customer shift, one switch (Auto Scan 1 s)', { pack: 'cafe', seed: 74, scan: { autoScan: true, scanSpeedIndex: 0 } }],
  ['the Cafe: eight customers at level 4, the whole cast, two switches', { pack: 'cafe', seed: 75, court: { here: { popularity: 5, stars: 4 } }, settings: { shiftLength: 8 }, timeout: 600000 }],
  ['the Cafe: the five-star event with seeded progress (popularity 7, four stars): the gold sign', { pack: 'cafe', seed: 76, event: true, expectGold: true, mistakes: 0, court: { here: { popularity: 7, stars: 4 } } }],
  ['the Cafe: Motion Full (the wheel turns, the latte art, the glaze dunk)', { pack: 'cafe', seed: 77, settings: { motion: 'full' }, watchWheel: true }],
  ['the Cafe: the counter at 16:9: the line, the customer, Kai, the order on screen', { pack: 'cafe', seed: 78, size: [1280, 720], queue: ['jitters', 'kai'], counter: true, mistakes: 0 }],
  ['the Cafe: the counter at 16:10: the line, the customer, Kai, the order on screen', { pack: 'cafe', seed: 79, size: [1280, 800], queue: ['priya', 'kai'], counter: true, mistakes: 0 }],
  ['the Cafe: the counter at 4:3: the line, the customer, Kai, the order on screen', { pack: 'cafe', seed: 80, size: [1024, 768], queue: ['walt', 'kai'], counter: true, mistakes: 0 }],
  ['the Cafe: the counter at 21:9: the line, the customer, Kai, the order on screen', { pack: 'cafe', seed: 81, size: [1680, 720], queue: ['marge', 'kai'], counter: true, mistakes: 0 }],
  ['the Cafe: the whole chain from the main menu: the Burger Bar, the Pizza Parlor and the Cafe, a shift each, back to the court', { pack: 'diner', chain: ['diner', 'pizza', 'cafe'], seed: 82, menu: true, backToCourt: true, size: [1280, 720] }],
  // Ben's Burritos (phase 2b, content-burrito). Shut at the start (the 2nd to open), so each run seeds it open
  // (courtRecord) except its Grand Opening, which a good Smoothie Shack shift earns: the first visit's tutorial (Rita;
  // the brown guacamole swapped), Timed with the grill press (Lift the Press held across a stage boundary), one switch,
  // level 4 (Reginald, Kai or Chef Hiro), the event (Inferno's Challenge Burrito), Motion Full (the wrap, the fold, the
  // bowl settling). Filter them with "Burritos:".
  ['Ben\'s Burritos: the first visit, the offer card, then the tutorial, two switches', { pack: 'burrito', offer: true, tutorial: 'offer', seed: 101, mistakes: 0.35 }],
  ['Ben\'s Burritos: a 3-customer shift, Timed (the grill press), no mistakes: every order three stars', { pack: 'burrito', seed: 102, settings: { cooking: 'timed', speed: 'normal' }, mistakes: 0 }],
  ['Ben\'s Burritos: Timed, holding Lift the Press across a stage boundary', { pack: 'burrito', seed: 103, settings: { cooking: 'timed', speed: 'normal' }, holdTakeOff: true, mistakes: 0 }],
  ['Ben\'s Burritos: a 3-customer shift, one switch (Auto Scan 1 s)', { pack: 'burrito', seed: 104, scan: { autoScan: true, scanSpeedIndex: 0 } }],
  ['Ben\'s Burritos: eight customers at level 4, the whole cast, two switches', { pack: 'burrito', seed: 105, court: { here: { popularity: 5, stars: 4 } }, settings: { shiftLength: 8 }, timeout: 600000 }],
  ['Ben\'s Burritos: the five-star event with seeded progress (popularity 7, four stars): the gold sign', { pack: 'burrito', seed: 106, event: true, expectGold: true, mistakes: 0, court: { here: { popularity: 7, stars: 4 } } }],
  ['Ben\'s Burritos: Motion Full (the wheel turns, the burrito wraps, the tacos fold, the bowl settles)', { pack: 'burrito', seed: 107, settings: { motion: 'full' }, watchWheel: true }],
  ['Ben\'s Burritos: its Grand Opening, earned by a good Smoothie Shack shift that brings all four open restaurants to four stars: the results say so, then the Grand Opening on the court', { pack: 'smoothie', seed: 108,
    mistakes: 0, backToCourt: true, unlockAfter: 'burrito',
    court: { here: { opened: true, grandOpeningSeen: true, popularity: 4, stars: 3 }, pizza: { popularity: 5, stars: 4 }, diner: { popularity: 5, stars: 4 }, cafe: { popularity: 5, stars: 4 } } }],
  // The whole chain with the Burritos seeded open (and the Smoothie Shack, which opens before it): five open, so the
  // court scans the parts of the U and the Burritos are reached through the left arm (pilot.md 4).
  ['Ben\'s Burritos: the whole chain from the main menu: the Burger Bar, the Pizza Parlor and Ben\'s Burritos (seeded open), a shift each, back to the court', { pack: 'diner', chain: ['diner', 'pizza', 'burrito'], seed: 109, menu: true, backToCourt: true, size: [1280, 720],
    court: { smoothie: { opened: true, grandOpeningSeen: true }, burrito: { opened: true, grandOpeningSeen: true } } }],
  // Ben's Sushi (phase 2b, content-sushi). Shut at the start (the 3rd to open, when every open restaurant has five
  // stars), so each run seeds it open (courtRecord) except its Grand Opening: the first visit's tutorial (Dennis; the
  // hair in the rice swapped on a pick; the mat rolls by itself in Simple), Timed with the drawn Stop Rolling button
  // (held across a stage boundary), one switch, level 4 (Reginald, Kai or Inferno), the event (Chef Hiro's Sushi Boat),
  // Motion Full (the slice, the ladle, the sauce bottles), the Grand Opening, the whole chain. Filter with "Sushi:".
  ['Ben\'s Sushi: the first visit, the offer card, then the tutorial, two switches', { pack: 'sushi', offer: true, tutorial: 'offer', seed: 121, mistakes: 0.35 }],
  ['Ben\'s Sushi: a 3-customer shift, Timed (the drawn Stop Rolling button), no mistakes: every order three stars', { pack: 'sushi', seed: 122, settings: { cooking: 'timed', speed: 'normal' }, mistakes: 0 }],
  ['Ben\'s Sushi: Timed, holding Stop Rolling across a stage boundary', { pack: 'sushi', seed: 123, settings: { cooking: 'timed', speed: 'normal' }, holdTakeOff: true, mistakes: 0 }],
  ['Ben\'s Sushi: a 3-customer shift, one switch (Auto Scan 1 s)', { pack: 'sushi', seed: 124, scan: { autoScan: true, scanSpeedIndex: 0 } }],
  ['Ben\'s Sushi: eight customers at level 4, the whole cast, two switches', { pack: 'sushi', seed: 125, court: { here: { popularity: 5, stars: 4 } }, settings: { shiftLength: 8 }, timeout: 600000 }],
  ['Ben\'s Sushi: the five-star event with seeded progress (popularity 7, four stars): Chef Hiro\'s Sushi Boat, the gold sign', { pack: 'sushi', seed: 126, event: true, expectGold: true, mistakes: 0, court: { here: { popularity: 7, stars: 4 } } }],
  ['Ben\'s Sushi: Motion Full (the wheel turns, the knife slices, the ladle pours, the sauces squirt)', { pack: 'sushi', seed: 127, settings: { motion: 'full' }, watchWheel: true }],
  // Its Grand Opening, earned with seeded progress: the five restaurants open before it all at five stars, their gold
  // signs already seen (the 5th star only comes from an event, whose own gold sign would play first), so the court
  // plays the Grand Opening on arrival; then its first visit: Skip It and a shift.
  ['Ben\'s Sushi: its Grand Opening, earned with seeded progress (all five open restaurants at five stars), then its first visit: Skip It and a shift', { pack: 'sushi', seed: 128, moments: 'unlock', offer: true,
    court: Object.fromEntries(['pizza', 'diner', 'cafe', 'smoothie', 'burrito'].map(id => [id, { opened: true, grandOpeningSeen: true, popularity: 7, stars: 5, gold: true, goldSeen: true }])) }],
  // The whole chain with Ben's Sushi seeded open (and the two that open before it): six open, so the court scans the
  // parts of the U and the sushi bar is reached through the right arm.
  ['Ben\'s Sushi: the whole chain from the main menu: the Burger Bar, the Pizza Parlor and Ben\'s Sushi (seeded open), a shift each, back to the court', { pack: 'diner', chain: ['diner', 'pizza', 'sushi'], seed: 129, menu: true, backToCourt: true, size: [1280, 720],
    court: { smoothie: { opened: true, grandOpeningSeen: true }, burrito: { opened: true, grandOpeningSeen: true }, sushi: { opened: true, grandOpeningSeen: true } } }],
  // Ben's Ice Cream Emporium (phase 2b, content-icecream). Shut at the start (the 4th and last to open, when every open
  // restaurant has five stars), so each run seeds it open (courtRecord) except its Grand Opening. The first pack with
  // a repeat pick and a More… row (the scoops: Vanilla, Chocolate, More…, Done), which the driver now plays
  // (leafOf/pathOf). The first visit's tutorial (Grandpa Walt; the cherry that is a tomato swapped), Timed with the
  // scoop and the mixer switch (held across a stage boundary), one switch, level 4 (Reginald, Kai or Brock), the event
  // (Coach Bev's Kitchen Sink), Motion Full (the scoop dips, the milk pours), the Grand Opening, the whole chain.
  // Filter with "Ice Cream Emporium:".
  ['the Ice Cream Emporium: the first visit, the offer card, then the tutorial, two switches', { pack: 'icecream', offer: true, tutorial: 'offer', seed: 141, mistakes: 0.35 }],
  ['the Ice Cream Emporium: a 3-customer shift, Timed (the scoop, the mixer switch), no mistakes: every order three stars', { pack: 'icecream', seed: 142, settings: { cooking: 'timed', speed: 'normal' }, mistakes: 0 }],
  ['the Ice Cream Emporium: Timed, holding Stop the Scoop or Stop the Mixer across a stage boundary', { pack: 'icecream', seed: 143, settings: { cooking: 'timed', speed: 'normal' }, holdTakeOff: true, mistakes: 0 }],
  ['the Ice Cream Emporium: a 3-customer shift, one switch (Auto Scan 1 s)', { pack: 'icecream', seed: 144, scan: { autoScan: true, scanSpeedIndex: 0 } }],
  ['the Ice Cream Emporium: eight customers at level 4, the whole cast, two switches', { pack: 'icecream', seed: 145, court: { here: { popularity: 5, stars: 4 } }, settings: { shiftLength: 8 }, timeout: 600000 }],
  ['the Ice Cream Emporium: the five-star event with seeded progress (popularity 7, four stars): Coach Bev\'s Kitchen Sink, the gold sign', { pack: 'icecream', seed: 146, event: true, expectGold: true, mistakes: 0, court: { here: { popularity: 7, stars: 4 } } }],
  ['the Ice Cream Emporium: Motion Full (the wheel turns, the scoop dips, the milk pours, the shake pours)', { pack: 'icecream', seed: 147, settings: { motion: 'full' }, watchWheel: true }],
  // Its Grand Opening, earned with seeded progress: the six restaurants open before it all at five stars, their gold
  // signs already seen, so the court plays the Grand Opening on arrival; then its first visit: Skip It and a shift.
  ['the Ice Cream Emporium: its Grand Opening, earned with seeded progress (all six open restaurants at five stars), then its first visit: Skip It and a shift', { pack: 'icecream', seed: 148, moments: 'unlock', offer: true,
    court: Object.fromEntries(['pizza', 'diner', 'cafe', 'smoothie', 'burrito', 'sushi'].map(id => [id, { opened: true, grandOpeningSeen: true, popularity: 7, stars: 5, gold: true, goldSeen: true }])) }],
  // The whole chain with the Emporium seeded open (and the three that open before it): all seven open, so the court
  // scans the parts of the U and the Emporium is reached through the right arm.
  ['the Ice Cream Emporium: the whole chain from the main menu: the Burger Bar, the Pizza Parlor and the Ice Cream Emporium (seeded open), a shift each, back to the court', { pack: 'diner', chain: ['diner', 'pizza', 'icecream'], seed: 149, menu: true, backToCourt: true, size: [1280, 720],
    court: { smoothie: { opened: true, grandOpeningSeen: true }, burrito: { opened: true, grandOpeningSeen: true }, sushi: { opened: true, grandOpeningSeen: true }, icecream: { opened: true, grandOpeningSeen: true } } }],
  // Little Lulu (cast scale 0.66) served first at the counter, at the two shapes where her shoulders fell under the
  // counter line: stage.js draws a child no smaller than 0.71 there (integrate-2b, content-icecream's request).
  ['the Ice Cream Emporium: Little Lulu at the counter at 16:10: her head and shoulders above the counter', { pack: 'icecream', seed: 150, size: [1280, 800], queue: ['lulu', 'kai'], counter: true, mistakes: 0 }],
  ['the Ice Cream Emporium: Little Lulu at the counter at 21:9: her head and shoulders above the counter', { pack: 'icecream', seed: 151, size: [1680, 720], queue: ['lulu', 'kai'], counter: true, mistakes: 0 }],
];

async function main() {
  const args = process.argv.slice(2);
  const pi = args.indexOf('--pack');
  const packId = pi >= 0 ? args.splice(pi, 2)[1] : null;
  let failed = 0;
  // node tests/dom-play.cjs [words]: only the runs whose name has those words.
  const only = args.join(' ');
  for (const [label, opts] of RUNS.filter(([label, o]) => (!only || label.includes(only)) && (!packId || !o.pack || o.pack === packId))) {
    const o = Object.assign({}, opts, packId && !opts.pack ? { pack: packId } : {});
    let r;
    try { r = await run(label, o); } catch (e) { failed++; console.log('FAIL', label, '\n ', e.message.slice(0, 2500)); continue; }
    const ok = r.done && !r.errors.length;
    if (!ok) failed++;
    console.log((ok ? 'ok  ' : 'FAIL') + ' ' + label + ' - ' + r.secs + 's, ' + JSON.stringify(r.stats) + (r.done ? '' : ', NOT FINISHED ' + JSON.stringify(r.final)));
    r.errors.slice(0, 8).forEach(e => console.log('   ' + e.split('\n').slice(0, 5).join('\n   ')));
    r.warns.filter(x => !/manifest|missing|no court script|no cast script|has problems/.test(x)).slice(0, 4).forEach(x => console.log('   warn: ' + x));
  }
  console.log(failed ? failed + ' run(s) failed' : 'every run reached its end with no script errors');
  process.exit(failed ? 1 : 0);
}

module.exports = { run, RUNS };
if (require.main === module) main();
