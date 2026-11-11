/** Ben's Food Court - the rating (DESIGN.md "Rating").
 *
 *  Accuracy only, never time. Every step the ticket uses is checked against what the ticket
 *  wants (line.expected), and each difference is a mistake:
 *    extra     a topping added that is not on the ticket   (held: "I said no cheese!";
 *              never asked for: "I didn't ask for onions.")
 *    missing   a topping skipped that the ticket wanted    ("Where are my pickles?")
 *    count     too many or too few: patties or another Add with a max above 1, or the picks
 *              of a repeat (scoops); one mistake for each one over or under
 *    done      the wrong doneness, or the wrong stage of any cook step (one per step)
 *    pick      the wrong size, drink, side or slot value ({ slot, want, got }); on a repeat,
 *              one for each pick that is not one the ticket wants (the order never matters)
 *    gross     a bad ingredient or a bad picked value served
 *  Steps passed by `when` and flourishes (auto steps) are never judged.
 *  Stars: 3 with none, 2 with one or two, 1 with more. No zero, no fail.
 *  Tip: price x (0.6 + 0.2 x stars), at least 1; a favourite adds a bonus to the tip and
 *  never touches the stars.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./line.js'));
  else (root.BB = root.BB || {}).judge = factory(root.BB.line);
})(typeof window === 'undefined' ? globalThis : window, function (L) {
  'use strict';

  const asList = v => (Array.isArray(v) ? v : v === undefined || v === null ? [] : [v]);

  /** A repeat pick: how many, then which. */
  function repeatMistakes(out, i, step, want, got) {
    const w = asList(want), g = asList(got);
    if (g.length !== w.length) out.push({ item: i, kind: 'count', of: 'slot', slot: step.slot, want: w.length, got: g.length, n: Math.abs(g.length - w.length) });
    const left = w.slice(), wrong = [];
    g.forEach(v => { const k = left.indexOf(v); if (k >= 0) left.splice(k, 1); else wrong.push(v); });
    const n = Math.min(wrong.length, left.length);           // a value in place of one the ticket wants
    if (n) out.push({ item: i, kind: 'pick', of: 'slot', slot: step.slot, want: left[0], got: wrong[0], n });
  }

  function mistakes(pack, o) {
    const out = [];
    o.items.forEach((item, i) => {
      for (const sid of L.stationsOf(pack, item)) {
        pack.stations[sid].steps.forEach((step, n) => {
          if (step.kind === 'auto' || !L.applies(step, item.spec)) return;
          const key = L.keyOf(sid, n), want = L.expected(pack, item, sid, n), got = item.answers[key];
          if (step.kind === 'add') {
            const g = got || 0, w = want || 0;
            if ((step.max || 1) > 1) {
              if (g !== w) out.push({ item: i, kind: 'count', ing: step.ing, want: w, got: g, n: Math.abs(g - w) });
            } else if (g > w) out.push({ item: i, kind: 'extra', ing: step.ing, n: 1, held: (item.spec.holds || []).includes(step.ing) });
            else if (g < w) out.push({ item: i, kind: 'missing', ing: step.ing, n: 1 });
          } else if (step.kind === 'cook') {
            // No patty at all is counted once, as a count mistake, not again as doneness.
            if (want && got && got !== want) out.push({ item: i, kind: 'done', ing: L.cookIng(pack, item, sid, step), want, got, n: 1 });
          } else if (step.kind === 'pick' && step.slot !== undefined) {
            if (want === null) return;                       // the ticket wants nothing here
            if (step.repeat) repeatMistakes(out, i, step, want, got);
            else if (got !== want) out.push({ item: i, kind: 'pick', of: 'slot', slot: step.slot, want, got: got === undefined || got === null ? null : got, n: 1 });
          } else if (step.kind === 'pick') {
            if (want && got !== want) out.push({ item: i, kind: 'pick', of: step.of || 'ing', want, got: got || null, n: 1 });
          }
        });
      }
      item.gross.forEach(g => out.push(g.slot !== undefined
        ? { item: i, kind: 'gross', slot: g.slot, value: g.value, event: g.event, n: 1 }
        : { item: i, kind: 'gross', ing: g.ing, event: g.event, n: 1 }));
    });
    return out;
  }

  const starsFor = count => (count === 0 ? 3 : count <= 2 ? 2 : 1);

  /** The serve: { stars, count, mistakes, tip, favourite } */
  function score(pack, o) {
    const list = mistakes(pack, o);
    const count = list.reduce((k, m) => k + m.n, 0);
    const stars = starsFor(count);
    const C = o.ticket.customer || {};
    const price = o.items.reduce((k, it) => k + pack.recipes[it.spec.recipe].price, 0);
    let scale = C.tipScale || 1;
    if (stars === 3 && C.threeStarScale) scale *= C.threeStarScale;
    const fav = C.favourite && o.items.some(it => it.spec.recipe === C.favourite.recipe) ? C.favourite : null;
    const tip = Math.max(1, Math.round(price * (0.6 + 0.2 * stars) * scale)) + (fav ? fav.bonus : 0);
    return { stars, count, mistakes: list, tip, favourite: !!fav };
  }

  return { mistakes, score, starsFor };
});
