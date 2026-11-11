/** Ben's Food Court - a restaurant's progress: its coins (FOODCOURT-BUILD.md 4.1 and 7).
 *
 *  Coins are the tips, shown on the receipt and the results and kept here, per restaurant, in
 *  bb-progress:<pack>. Nothing spends them yet, so they only ever go up. Stars, popularity,
 *  unlocks and the tutorial flag are the court's (js/core/court.js, bb-court).
 *  A shift's coins count once, when it finishes (spec 4.2): pass addShift the results that
 *  BB.shift.claim returns. A tutorial adds nothing.
 *  Plain JSON; fields this file doesn't know are kept.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.BB = root.BB || {}).progress = factory();
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';

  const VERSION = 2;

  /** A restaurant's progress before its first shift. */
  function create() {
    return { v: VERSION, coins: 0, shifts: 0 };
  }

  /** Fold a finished shift in (results from BB.shift.claim). -> { coins: the coins added } */
  function addShift(pack, g, results) {
    if (!g || !results || results.tutorial || !(results.orders > 0)) return { coins: 0 };
    const coins = Math.max(0, Math.round(+results.coins || 0));
    g.coins = Math.max(0, +g.coins || 0) + coins;
    g.shifts = Math.max(0, +g.shifts || 0) + 1;
    return { coins };
  }

  return { VERSION, create, addShift };
});
