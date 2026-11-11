/** Ben's Food Court - orders.
 *
 *  One generator for every customer. A customer's personality picks WHAT they order; the
 *  order style (the level and Order Size) alone decides HOW MUCH: item counts and repeat
 *  counts (DESIGN.md "Customers and cast"; FOODCOURT-BUILD.md 0.6).
 *
 *  An order item ("spec") is a recipe template made concrete:
 *    { recipe, ing, size?, done?, picks?, parts: [{ ing, done?, flavour? }], holds: [ing], adds: [ing], with? }
 *  picks: each of the recipe's slots (item.slots) made concrete, { <slot>: value | [values] }:
 *    a fixed value stays; { pick } is chosen like any other pick; { pick, count: [lo, hi] } is a
 *    repeat: a list of lo..hi values, alike ones together ("two chocolate, one vanilla").
 *  with: the only toppings, when a Simple order trims them ("with just lettuce and ketchup").
 *  The line (line.js) asks the player to make it, the judge (judge.js) checks against it
 *  and words.js reads it out.
 *
 *  A style is { items: [lo, hi], change, more?, repeat?, maxOptional?, fancy? }: a level of
 *  the ladder (shift.js) or, for the Burger Bar's old packs and the tests, the name of one of
 *  pack.orderStyles. Recipes with a `course` make combos: the items of one order are of
 *  different courses (a main and a side or a drink), listed in course order.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./rng.js'));
  else (root.BB = root.BB || {}).orders = factory(root.BB.rng);
})(typeof window === 'undefined' ? globalThis : window, function (R) {
  'use strict';

  const clone = o => JSON.parse(JSON.stringify(o));
  const isPick = v => !!v && typeof v === 'object' && !Array.isArray(v) && !!v.pick;

  /** A style object: given as one, or named from pack.orderStyles (the old packs), or a plain
   *  one-item style when the pack names none. */
  function styleOf(pack, style) {
    if (style && typeof style === 'object') return style;
    const S = pack.orderStyles || {};
    return S[style || 'usual'] || S.usual || { items: [1, 1], change: 0.3 };
  }

  /** The values a pick may take: pack.picks[name], or, when the pack lists no pick of that name,
   *  the values of the slot of that name. */
  function pickValues(pack, name, fancy) {
    const P = (pack.picks || {})[name];
    if (P) return ((fancy && P.fancy) || P.values).slice();
    const S = (pack.slots || {})[name];
    return S ? S.values.map(v => v.id) : [];
  }
  /** What a pick usually is: its `normal` when that is on offer, else the first value. */
  function normalOf(pack, name, values) {
    const P = (pack.picks || {})[name];
    return P && values.includes(P.normal) ? P.normal : values[0];
  }
  /** Alike values together, in the order each first came up: [a, b, a] -> [a, a, b]. */
  function grouped(list) {
    const order = [];
    list.forEach(v => { if (!order.includes(v)) order.push(v); });
    return order.flatMap(v => list.filter(x => x === v));
  }

  /** A recipe template -> one concrete item. s carries the rng.
   *  ctx = { style, set: { pick: value | [values] }, dislikes: [ing], maxOptional, exact, change? }
   *  change 0 gives the recipe exactly as written (and a repeat its lowest count). */
  function resolve(pack, recipeId, s, ctx) {
    ctx = ctx || {};
    const style = styleOf(pack, ctx.style);
    const change = ctx.change !== undefined ? ctx.change : ctx.exact ? Math.max(style.change, 0.5) : style.change;
    const set = ctx.set || {}, dislikes = ctx.dislikes || [];
    const chosen = {};
    /** One value of a pick, chosen fresh. k: which one of a repeat (a `set` list is used in turn). */
    const draw = (name, k) => {
      if (set[name] !== undefined) { const v = set[name]; return Array.isArray(v) ? v[k % v.length] : v; }
      const values = pickValues(pack, name, style.fancy);
      return R.chance(s, change) ? R.pick(s, values) : normalOf(pack, name, values);
    };
    const pick = (v) => {
      if (!isPick(v)) return { value: v, picked: false };
      const name = v.pick;
      if (!(name in chosen)) chosen[name] = draw(name, 0);       // each pick name once per item
      return { value: chosen[name], picked: true };
    };
    const T = pack.recipes[recipeId].item;
    const spec = { recipe: recipeId, ing: pick(T.ing).value, parts: [], holds: [], adds: [] };
    if (T.size) spec.size = pick(T.size).value;
    if (T.done) spec.done = pick(T.done).value;
    if (T.slots) {
      spec.picks = {};
      for (const [slot, v] of Object.entries(T.slots)) {
        if (isPick(v) && v.count !== undefined) {
          // A repeat: how many comes from the order style, never from who is ordering.
          const [lo, hi] = Array.isArray(v.count) ? v.count : [v.count, v.count];
          const more = style.repeat !== undefined ? style.repeat : style.more !== undefined ? style.more : 0.5;
          let n = lo;
          if (change > 0) while (n < hi && R.chance(s, more)) n += 1;
          const list = [];
          for (let k = 0; k < n; k++) list.push(draw(v.pick, k));
          spec.picks[slot] = grouped(list);
        } else spec.picks[slot] = isPick(v) ? pick(v).value : Array.isArray(v) ? v.slice() : v;
      }
    }
    const optional = [];
    for (const tp of T.parts) {
      const ingPick = pick(tp.ing);
      const p = { ing: ingPick.value };
      if (ingPick.picked) p.flavour = true;
      if (tp.done) p.done = pick(tp.done).value;
      if (tp.opt === 'in') {
        if (dislikes.includes(p.ing) || R.chance(s, change * 0.5)) { if (!spec.holds.includes(p.ing)) spec.holds.push(p.ing); continue; }
        optional.push(p);
      } else if (tp.opt === 'out') {
        if (dislikes.includes(p.ing) || !R.chance(s, change * 0.4)) continue;
        spec.adds.push(p.ing);
        optional.push(p);
      }
      spec.parts.push(p);
    }
    const max = ctx.maxOptional !== undefined ? ctx.maxOptional : style.maxOptional;
    if (max !== undefined && optional.length > max) {
      const cut = R.shuffle(s, optional.slice()).slice(max);
      cut.forEach(p => { spec.parts.splice(spec.parts.indexOf(p), 1); });
      spec.holds = spec.holds.filter(h => !cut.some(p => p.ing === h));
      spec.adds = spec.adds.filter(h => !cut.some(p => p.ing === h));
      spec.with = optional.filter(p => !cut.includes(p)).map(p => p.ing);
    }
    return spec;
  }

  /** Hold some parts of an item (the tutorial's "no onions"). */
  function hold(spec, ings) {
    for (const id of ings || []) {
      const before = spec.parts.length;
      spec.parts = spec.parts.filter(p => p.ing !== id);
      if (spec.parts.length < before && !spec.holds.includes(id)) spec.holds.push(id);
      spec.adds = spec.adds.filter(a => a !== id);
    }
    return spec;
  }

  /** Does a recipe always come with something: the item itself, or a part that is never optional? */
  const needs = (pack, r, ing) => { const I = pack.recipes[r].item; return I.ing === ing || I.parts.some(p => p.ing === ing && !p.opt); };
  /** The recipes a customer can order: never one that always comes with something they dislike. */
  function canOrder(pack, recipes, dislikes) {
    if (!dislikes || !dislikes.length) return recipes;
    const ok = recipes.filter(r => !dislikes.some(d => needs(pack, r, d)));
    return ok.length ? ok : recipes;
  }
  /** Courses in order: pack.courses, then any others as they first come in pack.recipes. */
  function courses(pack) {
    const out = (pack.courses || []).slice();
    Object.values(pack.recipes).forEach(X => { if (X.course !== undefined && !out.includes(X.course)) out.push(X.course); });
    return out;
  }

  /** The items a customer orders.
   *  ctx = { customer, style: a style object or an orderStyles name, recipes: [ids on offer], special, newest }
   *  The style alone sets how many items (items, more; Order Size "One Item" is items [1, 1]);
   *  `short` caps an order at one item and `twin` makes two of one thing where two are allowed.
   *  Recipes with a course make combos: each item of a different course, in course order. */
  function order(pack, s, ctx) {
    const C = ctx.customer, style = styleOf(pack, ctx.style);
    const recipes = canOrder(pack, Object.keys(pack.recipes).filter(r => ctx.recipes.includes(r)), C.dislikes);
    let [lo, hi] = style.items;
    if (C.short) hi = Math.min(hi, 1);
    lo = Math.min(lo, hi);
    // Each item past the first comes with style.more's chance (default: even odds).
    let n = lo;
    while (n < hi && R.chance(s, style.more === undefined ? 0.5 : style.more)) n += 1;
    if (C.twin && hi >= 2) n = Math.max(n, 2);
    const rctx = { style, set: Object.assign({}, C.set, C.wants), dislikes: C.dislikes, exact: C.exact };
    const make = (r, set, change) => resolve(pack, r, s, Object.assign({}, rctx, { set: Object.assign({}, rctx.set, set), change }));

    // "The usual, hon": the same every time, as written.
    if (C.usual && C.usual.every(u => recipes.includes(u.recipe))) {
      return C.usual.slice(0, Math.max(1, hi)).map(u => make(u.recipe, u.set, 0));
    }
    const likes = new Map((C.likes || []).filter(([r]) => recipes.includes(r)));
    const weight = r => (likes.get(r) || (pack.recipes[r].rare ? 0.1 : 0.5)) + (r === ctx.special ? 2 : 0);
    if (C.twin && n >= 2) {
      const one = make(R.weighted(s, recipes.map(r => [r, weight(r)])));
      return [one, clone(one)];
    }
    // A combo: no two items of one course, when the recipes have courses.
    const course = r => pack.recipes[r].course;
    const combos = recipes.some(r => course(r) !== undefined);
    const fits = (r, chosen) => !chosen.includes(r) && (!combos || !chosen.some(c => course(c) === course(r)));
    const chosen = [];
    (C.always || []).forEach(r => { if (recipes.includes(r) && chosen.length < n && fits(r, chosen)) chosen.push(r); });
    if (C.newest && ctx.newest && recipes.includes(ctx.newest) && fits(ctx.newest, chosen) && chosen.length < n) chosen.push(ctx.newest);
    while (chosen.length < n) {
      const left = recipes.filter(r => fits(r, chosen));
      if (!left.length) break;
      chosen.push(R.weighted(s, left.map(r => [r, weight(r)])));
    }
    if (combos) {
      const rank = courses(pack), at = r => (course(r) === undefined ? rank.length : rank.indexOf(course(r)));
      chosen.sort((a, b) => at(a) - at(b));
    }
    return chosen.map(r => make(r));
  }

  /** An item exactly as written: the tutorial's, an odd order's, an event finale's.
   *  t = { recipe, set?, hold?: [ing], holds?: [ing], add?: [ing], adds?: [ing], picks?: { <slot>: value | [values] } }
   *  ctx = { dislikes }: the customer's, held where the recipe has them as optional parts and never
   *  added. A repeat keeps its lowest count unless `picks` gives the whole list. */
  function fixed(pack, s, t, ctx) {
    ctx = ctx || {};
    const dislikes = ctx.dislikes || [];
    const spec = hold(resolve(pack, t.recipe, s, { change: 0, set: t.set, dislikes: ctx.dislikes, maxOptional: Infinity }),
      (t.hold || []).concat(t.holds || []));
    const T = pack.recipes[t.recipe].item;
    for (const ing of (t.add || []).concat(t.adds || [])) {
      if (dislikes.includes(ing)) continue;
      const tp = T.parts.find(p => p.ing === ing);
      spec.parts.push(tp && tp.done && !isPick(tp.done) ? { ing, done: tp.done } : { ing });
      spec.holds = spec.holds.filter(h => h !== ing);
      if (!spec.adds.includes(ing)) spec.adds.push(ing);
    }
    for (const [slot, v] of Object.entries(t.picks || {})) {
      if (!spec.picks) spec.picks = {};
      spec.picks[slot] = Array.isArray(v) ? grouped(v.slice()) : v;
    }
    return spec;
  }

  return { resolve, hold, order, fixed, styleOf, canOrder, courses, pickValues, grouped };
});
