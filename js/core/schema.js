/** Ben's Food Court - checks a pack before anything uses it (FOODCOURT-BUILD.md 8;
 *  docs/api/pack-format.md is the format).
 *
 *  validate(pack) -> list of problems (empty when the pack checks out). Give it a MERGED pack
 *  (BB.cast.merge(BBCast, pack)): the people are checked with their cast personas. Every id a
 *  pack refers to must exist and match /^\w+$/, every step must be one the line knows, every
 *  recipe part and slot must be something its stations can make and the ticket can name,
 *  every stage set is at least as slow as the Burger Bar (spec 5.3), and a gross-out sits only
 *  on an Add step or on a pick of three or fewer values (spec 4.6).
 *  Not checked: `look` beyond its shape, `sounds`, `help`, `world`.
 *  A pack that still has the Burger Bar's old `orderStyles` (the live diner until it moves to
 *  the ladder) skips the rules every finished restaurant must meet (STRICT: words on every
 *  stage set, a tutorial, odd orders and the five-star event).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./line.js'), require('./cast.js'));
  else (root.BB = root.BB || {}).schema = factory(root.BB.line, root.BB.cast);
})(typeof window === 'undefined' ? globalThis : window, function (L, CAST) {
  'use strict';

  const KINDS = ['add', 'cook', 'pick', 'auto'];
  const ID = /^\w+$/;
  /** Station ids that would clash with the tutorial's own moments, or with the counter scene. */
  const RESERVED_STATIONS = ['intro', 'ticket', 'review', 'serve', 'gross', 'warn', 'cook', 'counter'];
  /** The slowest the Burger Bar's grill goes, per Cooking Speed, in seconds a stage (spec 5.3). */
  const MIN_SPEED = { verySlow: 12, slow: 8, normal: 5 };
  const MIN_WANTED = 2;
  /** pack.theme's tokens (spec 5.6), as the spec lists them. (One string: a token like board is
   *  also a station id, and no file in js/core may quote a pack's id.) */
  const THEME = ('pageBg panelTop panelBottom panelLip plateTop plateBottom mark labelBg ticketAccent ticketNow perforation hudBg ' +
    'gaugeBg star boardGlow woodInset cardValue logoTop logoMain wheelInk wheelSteel wheelDark board wood').split(' ');
  const LEVEL_KEYS = ['items', 'more', 'change', 'repeat', 'maxOptional', 'fancy', 'grossRate', 'grossMax', 'odd'];
  const ODD_LEVELS = [4, 5];
  const EVENT_ITEMS = 3;

  const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const isPick = v => isObj(v) && !!v.pick;
  const isInt = v => Number.isInteger(v);
  const prob = v => typeof v === 'number' && v >= 0 && v <= 1;
  const list = v => (Array.isArray(v) ? v : v === undefined || v === null ? [] : [v]);

  function validate(pack) {
    const errs = [];
    const bad = (where, msg) => errs.push(where + ': ' + msg);
    const strict = !pack.orderStyles;
    const ings = pack.ingredients || {}, stations = pack.stations || {}, recipes = pack.recipes || {};
    const slots = pack.slots || {}, picks = pack.picks || {}, sets = pack.stageSets || {};
    const ingOk = (where, id) => { if (!ings[id]) { bad(where, 'unknown ingredient ' + id); return false; } return true; };
    const idOk = (where, id, what) => { if (typeof id !== 'string' || !ID.test(id)) bad(where, (what || 'id') + ' "' + id + '" must be letters, digits and _ only'); };
    const slotValues = slot => (slots[slot] && Array.isArray(slots[slot].values) ? slots[slot].values.map(v => v.id) : []);

    /* ── the pack ── */
    if (typeof pack.id !== 'string' || !/^[\w-]+$/.test(pack.id) || typeof pack.version !== 'number') bad('pack', 'needs an id and a numeric version');
    if (typeof pack.name !== 'string' || !pack.name) bad('pack', 'needs a name');
    if (pack.format !== undefined && typeof pack.format !== 'number') bad('pack', 'format is a number (3: the script is complete)');

    /* ── stage sets: words, and at least as slow as the Burger Bar ── */
    for (const [id, set] of Object.entries(sets)) {
      const w = 'stageSets.' + id;
      idOk(w, id);
      if (!Array.isArray(set.stages) || set.stages.length < 2) bad(w, 'needs at least two stages');
      (set.stages || []).forEach(st => { idOk(w, st, 'stage'); if (!(pack.stageNames || {})[st]) bad(w, 'no name for stage ' + st); });
      if (!Array.isArray(set.choose) || !set.choose.length) bad(w, 'needs the stages Simple cooking offers (choose)');
      else {
        set.choose.forEach(st => { if (!(set.stages || []).includes(st)) bad(w, 'choose has unknown stage ' + st); });
        if (set.choose.length > L.MAX_ANSWERS) bad(w, 'offers more than ' + L.MAX_ANSWERS + ' doneness choices');
      }
      ['ask', 'stop'].forEach(k => {
        if (set[k] !== undefined && (typeof set[k] !== 'string' || !set[k])) bad(w, k + ' is words');
        else if (strict && set[k] === undefined) bad(w, 'needs its words: ' + k + (k === 'ask' ? ' ("How crispy?")' : ' ("Pull It Out")'));
      });
      if (set.simple !== undefined && set.simple !== 'auto') bad(w, "simple is 'auto' or left out");
      const speed = Object.assign({}, pack.cookSpeeds, set.speed);
      for (const [k, min] of Object.entries(MIN_SPEED)) {
        if (!(typeof speed[k] === 'number' && speed[k] >= min)) bad(w, 'cooks faster than the Burger Bar: ' + k + ' needs at least ' + min + ' s a stage (got ' + speed[k] + ')');
      }
      const scale = set.wantedScale !== undefined ? set.wantedScale : pack.wantedScale;
      if (!(typeof scale === 'number' && scale >= MIN_WANTED)) bad(w, 'the ticket\'s stage must last at least ' + MIN_WANTED + ' times as long (wantedScale)');
    }
    const setOf = id => sets[id] || null;

    /* ── ingredients ── */
    for (const [id, I] of Object.entries(ings)) {
      const w = 'ingredients.' + id;
      idOk(w, id);
      if (!I.name) bad(w, 'no name');
      if (I.stages && !sets[I.stages]) bad(w, 'unknown stage set ' + I.stages);
      if (I.sizes && !(pack.sizeSets || {})[I.sizes]) bad(w, 'unknown size set ' + I.sizes);
      if (I.each) ingOk(w + '.each', I.each);
      if (!I.look || !I.look.shape) bad(w, 'no look (shape) for the 3D food');
    }

    /* ── slots: named picks ── */
    for (const [id, S] of Object.entries(slots)) {
      const w = 'slots.' + id;
      idOk(w, id);
      if (!isObj(S)) { bad(w, 'is { name, values }'); continue; }
      if (typeof S.name !== 'string' || !S.name) bad(w, 'needs a name (the line asks "<name>: ...?")');
      if (S.plural !== undefined && typeof S.plural !== 'string') bad(w, 'plural is words');
      if (S.say !== undefined && (typeof S.say !== 'string' || !S.say.includes('{value}'))) bad(w, 'say must have {value} in it ("{value} crust")');
      if (!Array.isArray(S.values) || !S.values.length) { bad(w, 'needs values'); continue; }
      const seen = new Set();
      S.values.forEach((v, i) => {
        const wv = w + '.values[' + i + ']';
        if (!isObj(v)) return bad(wv, 'is { id, name }');
        idOk(wv, v.id);
        if (seen.has(v.id)) bad(wv, 'id twice: ' + v.id);
        seen.add(v.id);
        if (typeof v.name !== 'string' || !v.name) bad(wv, 'needs a name');
        if (v.say !== undefined && typeof v.say !== 'string') bad(wv, 'say is words');
        if (v.look !== undefined && !(isObj(v.look) && v.look.shape)) bad(wv, 'a look needs a shape');
      });
    }

    /* ── stations: what each can make, and that every step is one the line knows ── */
    const makes = {};
    for (const [sid, S] of Object.entries(stations)) {
      const w = 'stations.' + sid, out = makes[sid] = new Set();
      idOk(w, sid, 'station id');
      if (RESERVED_STATIONS.includes(sid)) bad(w, 'the station id ' + sid + ' is taken (tutorial.' + sid + ' is another moment, or the counter scene)');
      if (!S.name) bad(w, 'no name');
      if (typeof S.backdrop !== 'string' || !ID.test(S.backdrop)) bad(w, 'needs its backdrop (a name like prep)');
      else if (S.backdrop === 'counter') bad(w, 'the counter is where customers stand, not a station');
      if (typeof S.redo !== 'string' || !S.redo) bad(w, 'needs its redo words ("Redo the Toppings")');
      if (S.tool !== undefined && typeof S.tool !== 'string') bad(w, 'tool is a name');
      if (!Array.isArray(S.steps) || !S.steps.length) { bad(w, 'no steps'); continue; }
      if (S.builds) {
        ['on', 'base', 'cap'].forEach(k => { if (S.builds[k] && ingOk(w + '.builds.' + k, S.builds[k]) && k !== 'on') out.add(S.builds[k]); });
      }
      const autoIds = new Set();
      S.steps.forEach((step, n) => {
        const ws = w + '.steps[' + n + ']';
        if (!isObj(step) || !KINDS.includes(step.kind)) return bad(ws, 'unknown kind ' + (step && step.kind));
        if (step.when !== undefined) {
          const W = step.when;
          if (!isObj(W) || (W.recipes === undefined && W.slot === undefined)) bad(ws, 'when is { recipes: [...] } and/or { slot, in: [...] }');
          else {
            if (W.recipes !== undefined) list(W.recipes).forEach(r => { if (!recipes[r]) bad(ws, 'when names unknown recipe ' + r); });
            if (W.slot !== undefined) {
              if (!slots[W.slot]) bad(ws, 'when names unknown slot ' + W.slot);
              else if (!Array.isArray(W.in) || !W.in.length) bad(ws, 'when { slot } needs in: [values]');
              else W.in.forEach(v => { if (!slotValues(W.slot).includes(v)) bad(ws, 'when: ' + v + ' is not a ' + W.slot); });
            }
          }
        }
        if (step.kind === 'add') {
          if (ingOk(ws, step.ing)) out.add(step.ing);
          if (step.max !== undefined && !(isInt(step.max) && step.max >= 1)) bad(ws, 'max must be a whole number, 1 or more');
          if (ings[step.ing] && ings[step.ing].stages && !S.steps.slice(n + 1).some(s => s.kind === 'cook' && s.ing === step.ing)) bad(ws, step.ing + ' cooks, so a cook step must follow it');
        } else if (step.kind === 'cook') {
          if (step.ing && ingOk(ws, step.ing) && !ings[step.ing].stages) bad(ws, step.ing + ' does not cook');
          if (step.stages !== undefined && !sets[step.stages]) bad(ws, 'unknown stage set ' + step.stages);
          if (step.want !== undefined) idOk(ws, step.want, 'want');
          if (!step.ing && !step.stages && !S.steps.slice(0, n).some(s => s.kind === 'pick' && s.from)) {
            // Cooks the item itself: fine when every recipe through here is a cookable item.
            Object.values(recipes).filter(X => (X.stations || []).includes(sid)).forEach(X => { if (!X.item || !ings[X.item.ing] || !ings[X.item.ing].stages) bad(ws, 'nothing to cook for ' + X.name + ' (give the step its stages)'); });
          }
        } else if (step.kind === 'pick') {
          if (step.slot !== undefined) {
            if (!slots[step.slot]) bad(ws, 'unknown slot ' + step.slot);
            else if (slotValues(step.slot).length < 2) bad(ws, 'a pick needs at least two values');
            if (step.repeat !== undefined && !(isObj(step.repeat) && isInt(step.repeat.max) && step.repeat.max >= 1)) bad(ws, 'repeat is { max: a whole number }');
            if (step.from || step.of) bad(ws, 'a slot pick has no from or of');
          } else {
            if (step.from) { step.from.forEach(x => { if (ingOk(ws, x)) out.add(x); }); if (step.from.length < 2) bad(ws, 'a pick needs at least two choices'); }
            else if (!['size', 'flavour'].includes(step.of)) bad(ws, 'a pick needs a slot, from: [...] or of: size | flavour');
            if (step.from) step.from.forEach(x => { if (S.steps.some(s => s.kind === 'cook' && !s.ing && !s.stages) && ings[x] && !ings[x].stages) bad(ws, x + ' is picked to cook but does not cook'); });
            if (step.repeat !== undefined) bad(ws, 'only a slot pick repeats');
          }
        } else if (step.kind === 'auto') {
          idOk(ws, step.id, 'auto id');
          if (autoIds.has(step.id)) bad(ws, 'auto id twice in a station: ' + step.id);
          autoIds.add(step.id);
          if (typeof step.show !== 'string' || !step.show) bad(ws, 'an auto step names its flourish (show)');
        }
      });
    }

    /* ── picks ── */
    for (const [id, P] of Object.entries(picks)) {
      idOk('picks.' + id, id);
      if (!P.values || !P.values.includes(P.normal)) bad('picks.' + id, 'normal is not one of its values');
      if (P.fancy !== undefined && !Array.isArray(P.fancy)) bad('picks.' + id, 'fancy is a list of values');
    }
    /** Every value a { pick } can take, or [v] for a fixed value; null for an unknown pick. */
    const valuesOf = v => {
      if (!isPick(v)) return list(v);
      if (picks[v.pick]) return [...new Set(picks[v.pick].values.concat(picks[v.pick].fancy || []))];
      if (slots[v.pick]) return slotValues(v.pick);
      return null;
    };

    /* ── recipes ── */
    const recipeSteps = X => (X.stations || []).filter(s => stations[s]).flatMap(s => (stations[s].steps || []).map((step, n) => ({ sid: s, n, step })));
    /** Can a step apply to a recipe? (`when` by recipe, and by a slot the recipe can have.) */
    const canApply = (rid, X, step) => {
      const W = step.when;
      if (!isObj(W)) return true;
      if (W.recipes !== undefined && !list(W.recipes).includes(rid)) return false;
      if (W.slot !== undefined) {
        const v = X.item && X.item.slots ? X.item.slots[W.slot] : undefined;
        if (v === undefined) return false;
        const can = isPick(v) ? valuesOf({ pick: v.pick }) || [] : list(v);
        return can.some(x => list(W.in).includes(x));
      }
      return true;
    };
    /** The stage set a cook step uses for a recipe (its own, its ingredient's, else the item's). */
    const cookSet = (X, sid, step) => {
      if (step.stages) return setOf(step.stages);
      if (step.ing) return ings[step.ing] && ings[step.ing].stages ? setOf(ings[step.ing].stages) : null;
      return X.item && ings[X.item.ing] && ings[X.item.ing].stages ? setOf(ings[X.item.ing].stages) : null;
    };
    const stageCheck = (where, set, values, auto) => {
      if (!set) return bad(where, 'nothing here cooks to a stage');
      values.forEach(x => {
        if (!(set.stages || []).includes(x)) bad(where, 'unknown stage ' + x);
        else if (!auto && !(set.choose || []).includes(x)) bad(where, x + ' is not one of Simple\'s choices, so Simple can\'t make it');
      });
    };
    for (const [rid, X] of Object.entries(recipes)) {
      const w = 'recipes.' + rid;
      idOk(w, rid);
      if (!(X.price > 0)) bad(w, 'needs a price');
      if (!X.name) bad(w, 'needs a name');
      if (X.level !== undefined && !(X.level === 'event' || (isInt(X.level) && X.level >= 1 && X.level <= 5))) bad(w, "level is 1 to 5, or 'event'");
      if (X.course !== undefined && (typeof X.course !== 'string' || !ID.test(X.course))) bad(w, 'course is a word (main, side, drink)');
      if (!Array.isArray(X.stations) || !X.stations.length) { bad(w, 'needs its stations'); continue; }
      X.stations.forEach(s => { if (!stations[s]) bad(w, 'unknown station ' + s); });
      if (new Set(X.stations).size !== X.stations.length) bad(w, 'a station twice');
      const T = X.item;
      if (!T) { bad(w, 'no item'); continue; }
      const can = new Set();
      X.stations.forEach(s => (makes[s] || []).forEach(x => can.add(x)));
      const steps = recipeSteps(X), applying = steps.filter(x => canApply(rid, X, x.step));
      const check = (where, v, test) => { const vals = valuesOf(v); if (!vals) return bad(where, 'unknown pick ' + v.pick); vals.forEach(x => test(x)); };
      // The item is what a `from` pick picks or a station builds on; otherwise it is just what the
      // item is (the food draws it), and its slots and parts say the rest.
      const picksItem = steps.some(x => x.step.kind === 'pick' && x.step.from);
      check(w + '.item.ing', T.ing, x => { if (!ingOk(w + '.item.ing', x)) return; if (picksItem && !can.has(x) && !X.stations.some(s => stations[s] && stations[s].builds && stations[s].builds.on === x)) bad(w, x + ' is not made by its stations'); });
      if (T.size) {
        if (!steps.some(x => x.step.kind === 'pick' && x.step.of === 'size')) bad(w, 'has a size but no station picks one');
        check(w + '.size', T.size, x => { const I = ings[T.ing]; if (!I || !I.sizes || !pack.sizeSets[I.sizes].some(z => z.id === x)) bad(w, 'unknown size ' + x); });
      }
      // The item's own stage: what a cook step that names no ingredient and no want cooks to.
      const itemCook = applying.find(x => x.step.kind === 'cook' && !x.step.ing && x.step.want === undefined);
      if (T.done) {
        const set = itemCook ? cookSet(X, itemCook.sid, itemCook.step) : (ings[T.ing] && ings[T.ing].stages ? setOf(ings[T.ing].stages) : null);
        const vals = valuesOf(T.done);
        if (!vals) bad(w + '.done', 'unknown pick ' + T.done.pick);
        else stageCheck(w + '.done', set, vals, set && set.simple === 'auto');
      }
      let flavours = 0;
      (T.parts || []).forEach((p, i) => {
        const wp = w + '.parts[' + i + ']';
        if (p.ing && typeof p.ing === 'object') flavours += 1;
        check(wp, p.ing, x => {
          if (!ingOk(wp, x)) return;
          if (!can.has(x) && !(typeof p.ing === 'object' && steps.some(s => s.step.kind === 'pick' && s.step.of === 'flavour'))) bad(wp, x + ' is not made by ' + X.stations.join(', '));
          if (p.done) {
            const set = ings[x].stages ? setOf(ings[x].stages) : null, vals = valuesOf(p.done);
            if (!vals) bad(wp + '.done', 'unknown pick ' + p.done.pick);
            else stageCheck(wp + '.done', set, vals, set && set.simple === 'auto');
          }
        });
        if (p.opt && p.opt !== 'in' && p.opt !== 'out') bad(wp, 'opt is in or out');
      });
      if (steps.some(x => x.step.kind === 'pick' && x.step.of === 'flavour') && flavours !== 1) bad(w, 'a flavour pick needs exactly one picked part');
      // No more of an ingredient than its Add step takes (the line can't make the rest). An `each`
      // ingredient is added once and goes on every one of its kind (a slice on each patty).
      steps.filter(x => x.step.kind === 'add' && !(ings[x.step.ing] || {}).each).forEach(x => {
        const n = (T.parts || []).filter(p => p.ing === x.step.ing).length, max = x.step.max || 1;
        if (n > max) bad(w, n + ' ' + x.step.ing + ' but its Add step takes at most ' + max);
      });
      // Slots: each names a pick or a cook step's want in its stations, with values those take.
      const named = T.slots || {};
      if (T.slots !== undefined && !isObj(T.slots)) bad(w, 'item.slots is { <slot>: value | { pick } | { pick, count } }');
      for (const [slot, v] of Object.entries(named)) {
        const ws = w + '.item.slots.' + slot;
        const pickSteps = steps.filter(x => x.step.kind === 'pick' && x.step.slot === slot);
        const wantSteps = steps.filter(x => x.step.kind === 'cook' && x.step.want === slot);
        if (!pickSteps.length && !wantSteps.length) { bad(ws, 'no station of this recipe picks ' + slot + ' or cooks to it'); continue; }
        const vals = valuesOf(v);
        if (!vals) { bad(ws, 'unknown pick ' + v.pick); continue; }
        if (pickSteps.length) {
          const repeat = pickSteps.find(x => x.step.repeat);
          vals.forEach(x => { if (!slotValues(slot).includes(x)) bad(ws, x + ' is not a ' + slot); });
          if (repeat) {
            const max = repeat.step.repeat.max;
            if (isPick(v)) {
              const c = v.count === undefined ? [1, 1] : Array.isArray(v.count) ? v.count : [v.count, v.count];
              if (!(isInt(c[0]) && isInt(c[1]) && c[0] >= 1 && c[0] <= c[1] && c[1] <= max)) bad(ws, 'count must be [lo, hi] within 1 to ' + max);
            } else if (Array.isArray(v) && (v.length < 1 || v.length > max)) bad(ws, 'a fixed repeat has 1 to ' + max + ' values');
          } else {
            if (isPick(v) && v.count !== undefined) bad(ws, 'count is for a repeat pick');
            if (Array.isArray(v)) bad(ws, 'only a repeat pick takes a list');
          }
        }
        wantSteps.forEach(x => { const set = cookSet(X, x.sid, x.step); stageCheck(ws, set, vals, set && set.simple === 'auto'); });
      }
      // The ticket must say every pick and every wanted stage this recipe's line asks.
      applying.forEach(x => {
        if (x.step.kind === 'pick' && x.step.slot !== undefined && named[x.step.slot] === undefined) bad(w, 'its line picks ' + x.step.slot + ' (' + x.sid + '), so item.slots must name it');
        if (x.step.kind === 'cook' && x.step.want !== undefined && named[x.step.want] === undefined) bad(w, 'its line cooks to ' + x.step.want + ' (' + x.sid + '), so item.slots must name it');
        if (x.step.kind === 'cook') {
          const set = cookSet(X, x.sid, x.step);
          const wanted = x.step.want !== undefined ? named[x.step.want] !== undefined : x.step.ing ? (T.parts || []).some(p => p.ing === x.step.ing && p.done) : !!T.done;
          if (set && set.simple === 'auto' && !wanted) bad(w, x.sid + ' cooks by itself in Simple, so the ticket must say how far (' + (x.step.want || 'done') + ')');
        }
      });
    }

    /* ── gross-outs (spec 4.6) ── */
    const addIngs = new Set(Object.values(stations).flatMap(S => (S.steps || []).filter(s => s.kind === 'add').map(s => s.ing)));
    const grossIds = new Set();
    (pack.gross || []).forEach((g, i) => {
      const w = 'gross[' + i + ']';
      if (!isObj(g)) return bad(w, 'is { id, on, say, fx }');
      idOk(w, g.id);
      if (grossIds.has(g.id)) bad(w, 'id twice: ' + g.id);
      grossIds.add(g.id);
      if (typeof g.say !== 'string' || !g.say) bad(w, 'needs the words that name it (say)');
      if (!list(g.on).length) bad(w, 'happens to nothing (on)');
      const step = g.step === undefined ? 'add' : g.step;
      if (step === 'add') {
        if (g.slot !== undefined) bad(w, 'a gross-out on an Add step names no slot');
        list(g.on).forEach(x => { if (ingOk(w, x) && !addIngs.has(x)) bad(w, x + ' is never offered on an Add step'); });
      } else if (step === 'pick') {
        if (!slots[g.slot]) return bad(w, 'a gross-out on a pick names its slot');
        list(g.on).forEach(x => { if (!slotValues(g.slot).includes(x)) bad(w, x + ' is not a ' + g.slot); });
        const where = Object.values(stations).flatMap(S => (S.steps || []).filter(s => s.kind === 'pick' && s.slot === g.slot));
        if (!where.length) bad(w, 'no station picks ' + g.slot);
        if (where.some(s => s.repeat)) bad(w, 'never on a repeat pick (' + g.slot + ')');
        if (slotValues(g.slot).length + 1 > L.MAX_ANSWERS) bad(w, g.slot + ' has ' + slotValues(g.slot).length + ' values: with Swap It that is over ' + L.MAX_ANSWERS + ' answers');
      } else bad(w, "a gross-out sits on an Add step or a pick (step 'add' or 'pick'), never on cooking or a flourish");
    });

    /* ── people (merged with the cast) ── */
    const ids = new Set();
    const ROLES = CAST.CUSTOMER_ROLES;
    const knownSetKey = k => !!picks[k] || !!slots[k];
    const setCheck = (where, set) => {
      if (set === undefined) return;
      if (!isObj(set)) return bad(where, 'is { <pick>: value }');
      for (const [k, v] of Object.entries(set)) {
        if (!knownSetKey(k)) { bad(where, 'unknown pick ' + k); continue; }
        const can = picks[k] ? picks[k].values.concat(picks[k].fancy || []) : slotValues(k);
        list(v).forEach(x => { if (!can.includes(x)) bad(where, x + ' is not a ' + k); });
      }
    };
    for (const C of pack.regulars || []) {
      const w = 'regulars.' + C.id;
      if (!C.id) bad(w, 'needs an id');
      else idOk(w, C.id);
      if (ids.has(C.id)) bad(w, 'id twice');
      ids.add(C.id);
      if (!C.name || !C.art) bad(w, 'is not in the cast (packs/cast/cast.js), so has no name or pictures');
      else if (!ROLES.includes(C.role)) bad(w, 'is a ' + C.role + ' in the cast, not someone who orders');
      (C.likes || []).forEach(([r, wt]) => { if (!recipes[r]) bad(w, 'likes unknown recipe ' + r); else if (!(wt > 0)) bad(w, 'a like needs a weight above 0'); });
      (C.always || []).forEach(r => { if (!recipes[r]) bad(w, 'always orders unknown recipe ' + r); });
      (C.usual || []).forEach((u, i) => { if (!recipes[u.recipe]) bad(w, 'usual is an unknown recipe ' + u.recipe); setCheck(w + '.usual[' + i + '].set', u.set); });
      (C.dislikes || []).forEach(d => ingOk(w, d));
      setCheck(w + '.set', C.set);
      setCheck(w + '.wants', C.wants);
      if (C.favourite && (!recipes[C.favourite.recipe] || !(C.favourite.bonus > 0))) bad(w, 'a favourite needs a recipe and a bonus above 0');
      if (C.visitor !== undefined && C.visitor !== false && C.visitor !== null && !(isObj(C.visitor) && ODD_LEVELS.includes(C.visitor.level === undefined ? CAST.VISITOR_LEVEL : C.visitor.level))) bad(w, 'visitor is { level: 4 } or { level: 5 }');
      // Someone who never takes an ingredient never orders a recipe that always comes with it.
      const fixedOrders = (C.usual || []).map(u => u.recipe).concat(C.always || [], C.favourite ? [C.favourite.recipe] : []);
      for (const r of fixedOrders) {
        for (const d of C.dislikes || []) if (recipes[r] && recipes[r].item && (recipes[r].item.parts || []).some(p => p.ing === d && !p.opt)) bad(w, 'never takes ' + d + ', but ' + r + ' always comes with it');
      }
    }
    if (!(pack.regulars || []).some(C => C.art && !C.visitor)) bad('regulars', 'nobody with pictures orders here, so no one can come in');
    const M = pack.manager;
    if (!M || !M.id || !M.art) bad('manager', 'the assistant manager needs an id and pictures (art: the uniform folder)');
    else if (M.role !== CAST.ROLE.manager) bad('manager', M.id + ' is not the cast\'s manager');

    /* ── items written out: the tutorial's, odd orders', the event finale's ── */
    const itemCheck = (where, t) => {
      if (!isObj(t) || !recipes[t.recipe]) return bad(where, 'unknown recipe ' + (t && t.recipe));
      const X = recipes[t.recipe], partIngs = ((X.item || {}).parts || []).map(p => p.ing).filter(x => typeof x === 'string');
      const addSteps = recipeSteps(X).filter(x => x.step.kind === 'add').map(x => x.step.ing);
      setCheck(where + '.set', t.set);
      list(t.hold).concat(list(t.holds)).forEach(x => { if (!partIngs.includes(x)) bad(where, 'holds ' + x + ', which ' + t.recipe + ' never has'); });
      list(t.add).concat(list(t.adds)).forEach(x => { if (!addSteps.includes(x)) bad(where, 'adds ' + x + ', which no Add step of ' + t.recipe + ' offers'); });
      if (t.picks !== undefined) {
        if (!isObj(t.picks)) return bad(where, 'picks is { <slot>: value | [values] }');
        for (const [slot, v] of Object.entries(t.picks)) {
          const ps = recipeSteps(X).filter(x => x.step.kind === 'pick' && x.step.slot === slot);
          if (!ps.length) { bad(where, t.recipe + ' never picks ' + slot); continue; }
          list(v).forEach(x => { if (!slotValues(slot).includes(x)) bad(where, x + ' is not a ' + slot); });
          const rep = ps.find(x => x.step.repeat);
          if (Array.isArray(v) && (!rep || v.length < 1 || v.length > rep.step.repeat.max)) bad(where, slot + ': a list only for a repeat, 1 to its max');
        }
      }
    };

    /* ── the tutorial ── */
    const T = pack.tutorial;
    if (!T && strict) bad('tutorial', 'every restaurant has a tutorial: one guided order');
    if (T) {
      const C = (pack.regulars || []).find(c => c.id === T.customer);
      if (!C || !C.art) bad('tutorial', 'its customer must be one of the regulars, with pictures');
      if (!Array.isArray(T.items) || !T.items.length) bad('tutorial', 'needs its order (items)');
      (T.items || []).forEach((it, i) => itemCheck('tutorial.items[' + i + ']', it));
      if (T.gross) {
        const it = (T.items || [])[T.gross.item], E = (pack.gross || []).find(g => g.id === T.gross.event);
        if (!it || !E || !recipes[it.recipe]) bad('tutorial.gross', 'must be a gross-out of its own item');
        else if (T.gross.slot !== undefined) {
          const X = recipes[it.recipe], fixed = (X.item.slots || {})[T.gross.slot];
          const want = (it.picks || {})[T.gross.slot] !== undefined ? it.picks[T.gross.slot] : isPick(fixed) ? (it.set || {})[fixed.pick] : fixed;
          if (E.step !== 'pick' || E.slot !== T.gross.slot) bad('tutorial.gross', T.gross.event + ' does not happen to the ' + T.gross.slot);
          else if (want === undefined || !list(E.on).includes(want)) bad('tutorial.gross', 'the ticket must want a ' + T.gross.slot + ' that ' + T.gross.event + ' happens to (set it)');
        } else if ((E.step || 'add') !== 'add' || !list(E.on).includes(T.gross.ing)) bad('tutorial.gross', 'must be an event that can happen to an ingredient of its item');
        else if (!recipes[it.recipe].item.parts.some(p => p.ing === T.gross.ing) || list(it.hold).includes(T.gross.ing)) bad('tutorial.gross', 'the ticket must want ' + T.gross.ing);
      }
    }

    /* ── the ladder ── */
    if (pack.levels !== undefined) {
      if (!isObj(pack.levels)) bad('levels', 'is { 1: {...}, ... 5: {...} }');
      else for (const [k, lv] of Object.entries(pack.levels)) {
        const n = +k, w = 'levels.' + k;
        if (!(isInt(n) && n >= 1 && n <= 5)) { bad(w, 'levels are 1 to 5'); continue; }
        if (!isObj(lv)) { bad(w, 'is an object'); continue; }
        Object.keys(lv).forEach(x => { if (!LEVEL_KEYS.includes(x)) bad(w, 'unknown setting ' + x); });
        if (lv.items !== undefined) {
          const it = lv.items;
          if (!(Array.isArray(it) && isInt(it[0]) && isInt(it[1]) && it[0] >= 1 && it[0] <= it[1])) bad(w, 'items is [lo, hi], 1 or more');
          else if (n <= 2 && it[1] !== 1) bad(w, 'levels 1 and 2 are one item');
          else if (it[1] > 2) bad(w, 'at most two items an order (a main and a side or drink)');
        }
        ['more', 'change', 'repeat', 'grossRate', 'odd'].forEach(x => { if (lv[x] !== undefined && !prob(lv[x])) bad(w, x + ' is a chance, 0 to 1'); });
        ['maxOptional', 'grossMax'].forEach(x => { if (lv[x] !== undefined && !(isInt(lv[x]) && lv[x] >= 0)) bad(w, x + ' is a whole number'); });
        if (lv.fancy !== undefined && typeof lv.fancy !== 'boolean') bad(w, 'fancy is true or false');
        if (n <= 2 && (lv.grossRate > 0 || lv.grossMax > 0)) bad(w, 'no gross-outs below level 3');
        if (n === 3 && lv.grossMax > 2) bad(w, 'at most 2 gross-outs a shift at level 3');
        if (n <= 3 && lv.odd > 0) bad(w, 'ridiculous orders start at level 4');
      }
    }

    /* ── ridiculous orders (spec 4.4) ── */
    const odds = pack.oddOrders;
    if (odds !== undefined && !Array.isArray(odds)) bad('oddOrders', 'is a list');
    else if (strict && !(odds || []).length) bad('oddOrders', 'every restaurant has its ridiculous orders');
    const oddIds = new Set();
    (Array.isArray(odds) ? odds : []).forEach((t, i) => {
      const w = 'oddOrders[' + i + ']';
      if (!isObj(t)) return bad(w, 'is { id, recipe, ... }');
      idOk(w, t.id);
      if (oddIds.has(t.id)) bad(w, 'id twice: ' + t.id);
      oddIds.add(t.id);
      const level = t.level === undefined ? 4 : t.level;
      if (!ODD_LEVELS.includes(level)) bad(w, 'level is 4 or 5');
      if (recipes[t.recipe] && recipes[t.recipe].level === 'event') bad(w, 'an odd order is a normal recipe, not an event one');
      else if (recipes[t.recipe] && (recipes[t.recipe].level || 1) > level) bad(w, t.recipe + ' comes at level ' + recipes[t.recipe].level + ', after this odd order');
      itemCheck(w, t);
      if (t.say !== undefined && t.say !== 'order.odd.' + t.id) bad(w, 'say names its moment: order.odd.' + t.id);
      if (t.who !== undefined) list(t.who).forEach(id => { if (!ids.has(id)) bad(w, 'who: ' + id + ' does not come here'); });
    });

    /* ── the five-star event (spec 4.4) ── */
    const E = pack.events;
    if (E !== undefined && !isObj(E)) bad('events', 'is { five: {...} }');
    else if (strict && !(E && E.five)) bad('events', 'every restaurant has its five-star event (events.five)');
    for (const [id, ev] of Object.entries(isObj(E) ? E : {})) {
      const w = 'events.' + id;
      idOk(w, id);
      if (!isObj(ev)) { bad(w, 'is { name, finale, ... }'); continue; }
      if (typeof ev.name !== 'string' || !ev.name) bad(w, 'needs its name ("The Pizza Party")');
      const F = ev.finale;
      if (!isObj(F)) bad(w, 'needs its finale: { customer, items }');
      else {
        if (!ids.has(F.customer)) bad(w + '.finale', F.customer + ' does not come here');
        if (!Array.isArray(F.items) || !F.items.length || F.items.length > EVENT_ITEMS) bad(w + '.finale', 'has 1 to ' + EVENT_ITEMS + ' items');
        (F.items || []).forEach((it, i) => itemCheck(w + '.finale.items[' + i + ']', it));
      }
      if (ev.customers !== undefined) list(ev.customers).forEach(c => { if (!ids.has(c)) bad(w, 'customers: ' + c + ' does not come here'); });
      if (ev.recipes !== undefined) list(ev.recipes).forEach(r => { if (!recipes[r]) bad(w, 'unknown recipe ' + r); });
      if (ev.items !== undefined && !(Array.isArray(ev.items) && isInt(ev.items[0]) && isInt(ev.items[1]) && ev.items[0] >= 1 && ev.items[0] <= ev.items[1] && ev.items[1] <= EVENT_ITEMS)) bad(w, 'items is [lo, hi] within 1 to ' + EVENT_ITEMS);
      if (ev.style !== undefined && !isObj(ev.style)) bad(w, 'style is a level\'s settings');
    }

    /* ── the rest ── */
    if (pack.theme !== undefined) {
      if (!isObj(pack.theme)) bad('theme', 'is a flat map of colour tokens');
      else for (const [k, v] of Object.entries(pack.theme)) {
        if (!THEME.includes(k)) bad('theme', 'unknown token ' + k);
        if (typeof v !== 'string' || !v) bad('theme.' + k, 'is a CSS colour');
      }
    }
    if (pack.courses !== undefined && !(Array.isArray(pack.courses) && pack.courses.every(c => typeof c === 'string' && ID.test(c)))) bad('courses', 'is a list of course names');
    if (pack.poses !== undefined && !(isObj(pack.poses) && isObj(pack.poses.customer) && isObj(pack.poses.manager))) bad('poses', 'is { customer: {...}, manager: {...} }');
    return errs;
  }

  return { validate, KINDS, RESERVED_STATIONS, MIN_SPEED, THEME, LEVEL_KEYS };
});
