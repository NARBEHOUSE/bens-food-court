/** Ben's Food Court - the court itself, as data (docs/FOODCOURT-BUILD.md 2.1, 4.1, 6.2, 7).
 *
 *  The court's rules (js/core/court.js, BB.courtRules) read this and nothing else, so they
 *  never name a restaurant, an arm or a number. Changing an unlock, a threshold or a crowd
 *  is a change here, not in the rules. docs/api/court-rules.md is the format.
 *
 *  restaurants  spec 2.1, listed in SCAN ORDER, round the upside-down U from the bottom left:
 *               up the left arm (lower slot, then upper), along the top from left to right,
 *               then down the right arm (upper slot, then lower). The flat scan and the parts
 *               use this order (there is no tutorial picker since 2026-11-09: the first visit
 *               offers each restaurant's tutorial). The bottom side of the court is open.
 *                 pack   the pack id (packs/<pack>/)
 *                 name   the full name ("Ben's Pizza Parlor"): announcements, results
 *                 short  the scan name ("Pizza Parlor"): scan labels, parts, Help
 *                 said   how a sentence names it ("the Pizza Parlor"): goals and results
 *                 arm    which part of the U it stands on (an `arms` id)
 *                 slot   its place on that arm: 1 is the upper one on an arm, the left one
 *                        along the top
 *                 start  open from the start
 *                 unlock its place in the unlock order (null for a start restaurant)
 *  arms         the parts of the U, in the order the court's root scans them.
 *  unlocks      spec 4.1, in order: each opens `pack` once EVERY open restaurant has at
 *               least `stars` stars.
 *  rules        spec 4.1's thresholds.
 *  crowd        spec 6.2 as the user re-asked it (2026-11-10): how many wait in a storefront's line and how
 *               many eat at its tables, by popularity (row = popularity).
 *  floor        who they are: each restaurant's own customers, each character at most once on the court
 *               (BB.courtRules.floor); visitors only where the restaurant's level has reached visitorsFrom.
 *  layout       spec 6.2: boxes and spots in percent of the court picture.
 */
(function (root, data) {
  if (typeof module === 'object' && module.exports) module.exports = data;
  else root.BBCourt = data;
})(typeof window === 'undefined' ? globalThis : window, {
  version: 1,
  // Recorded clips stay off until the final voice pass (spec 6.6): every line is text to
  // speech. The voice pass flips this one flag.
  recordedVoices: false,

  arms: [
    { id: 'left', name: 'Left' },
    { id: 'top', name: 'Top' },
    { id: 'right', name: 'Right' },
  ],

  restaurants: [
    { pack: 'burrito', name: "Ben's Burritos", short: 'Burritos', said: "Ben's Burritos", arm: 'left', slot: 2, start: false, unlock: 2 },
    { pack: 'smoothie', name: "Ben's Smoothie Shack", short: 'Smoothie Shack', said: 'the Smoothie Shack', arm: 'left', slot: 1, start: false, unlock: 1 },
    { pack: 'pizza', name: "Ben's Pizza Parlor", short: 'Pizza Parlor', said: 'the Pizza Parlor', arm: 'top', slot: 1, start: true, unlock: null },
    { pack: 'diner', name: "Ben's Burger Bar", short: 'Burger Bar', said: 'the Burger Bar', arm: 'top', slot: 2, start: true, unlock: null },
    { pack: 'cafe', name: "Ben's Cafe", short: 'Cafe', said: 'the Cafe', arm: 'top', slot: 3, start: true, unlock: null },
    { pack: 'sushi', name: "Ben's Sushi", short: 'Sushi', said: "Ben's Sushi", arm: 'right', slot: 1, start: false, unlock: 3 },
    { pack: 'icecream', name: "Ben's Ice Cream Emporium", short: 'Ice Cream Emporium', said: 'the Ice Cream Emporium', arm: 'right', slot: 2, start: false, unlock: 4 },
  ],

  unlocks: [
    { pack: 'smoothie', stars: 3 },   // the 4th restaurant: every open one at 3 stars
    { pack: 'burrito', stars: 4 },    // the 5th: every open one at 4 stars
    { pack: 'sushi', stars: 5 },      // the 6th: every open one at 5 stars
    { pack: 'icecream', stars: 5 },   // the 7th: every open one at 5 stars
  ],

  rules: {
    good: 2.0,           // a finished shift is good when its average stars reach this
    popularityMax: 10,   // each good shift adds 1, up to this; at this a restaurant is fully busy
    // Stars come from popularity and are only ever raised. A normal shift never gives more
    // than the last of these; the next star comes only from the event.
    stars: [
      { popularity: 0, stars: 1 },
      { popularity: 1, stars: 2 },
      { popularity: 3, stars: 3 },
      { popularity: 5, stars: 4 },
    ],
    // The five-star event is due at this popularity with these stars. A good event shift
    // gives `gives` stars and the gold sign; a failed one can be tried again.
    event: { popularity: 7, stars: 4, gives: 5 },
  },

  // The crowd by popularity, one row per popularity 0..popularityMax (the user, 2026-11-10: "instead of having the
  // characters bounce around ... just have them stand and wait like they're in line ... and show people sitting at
  // chairs and eating as you get more popular"). Nobody strolls. queue: people standing still in the storefront's
  // line, the front one at the counter; seated: diners at its tables, eating its food ('all' = every seat it has,
  // and a count above its seats seats them all). The game's own customers fill these (floor), each at most once on
  // the whole court, so with many restaurants open the last spots stay empty.
  //   0-2 one at the counter · 3-4 two in line, one diner · 5 three · 6 three, two diners
  //   7 four, two diners · 8-9 four, three diners · 10 four, every seat
  crowd: [
    { tier: 'quiet', queue: 1, seated: 0 },          // 0
    { tier: 'quiet', queue: 1, seated: 0 },          // 1
    { tier: 'quiet', queue: 1, seated: 0 },          // 2
    { tier: 'shortQueue', queue: 2, seated: 1 },     // 3
    { tier: 'shortQueue', queue: 2, seated: 1 },     // 4
    { tier: 'shortQueue', queue: 3, seated: 1 },     // 5
    { tier: 'shortQueue', queue: 3, seated: 2 },     // 6
    { tier: 'outTheDoor', queue: 4, seated: 2 },     // 7
    { tier: 'outTheDoor', queue: 4, seated: 3 },     // 8
    { tier: 'outTheDoor', queue: 4, seated: 3 },     // 9
    { tier: 'full', queue: 4, seated: 'all' },       // 10: fully busy
  ],

  // Who stands in the lines and sits at the tables (BB.courtRules.floor): level-4 visitors (Reginald, Kai) only at a
  // restaurant whose ladder level (its stars) has reached this.
  floor: { visitorsFrom: 4 },

  // Measured from art-source/backdrops/court.png (1536 x 1024; shipped as
  // packs/court/art/court.webp). Everything is in percent of the picture, drawn with
  // object-fit: contain semantics.
  //   boxes  [x0, y0, x1, y1]: sign = the blank sign board (name plate and star sign go
  //          here); store = the whole storefront (scan frame, zoom, shutter).
  //   queue  [x, y], where a person's FEET go, the front of the line (at the counter) first; each line
  //          steps away from its counter so every face shows (the line faces its front).
  //   seats  [x, y, fx, fy]: a chair that faces the viewer (behind its table): the diner's HIPS go at x, y
  //          (the table hides them below the hips) and their food stands on the table at fx, fy; nearest
  //          first; no seat belongs to two stores. Only the chairs behind a table are seats (the cast is
  //          drawn from the front, so a diner in a chair on the near side would turn their back to the
  //          table), plus the two booths' benches.
  // The court is an upside-down U (the user, 2026-11-08): three storefronts along the top
  // facing down into the court, two down each side facing in, the bottom open onto the mall.
  // Signs and the plinth are measured (flood fill from a point inside each blank board);
  // store boxes are set by eye. The lines and seats were set again by eye in the review frames
  // for the standing crowd (crowd-cast, 2026-11-10): the top row's lines stand along their own
  // stools and turn down towards the middle at the fourth (never onto the side stalls, the
  // tables' diners or the progress board), the side stalls' lines step out towards the
  // middle, and the bottom stalls' lines stand along the open concourse.
  layout: {
    picture: { w: 1536, h: 1024 },
    board: [43.9, 47.6, 56.1, 55.1],   // the plinth's top: the progress board's easel stands on it
    stores: {
      burrito: {
        sign: [5.5, 62.2, 20.1, 69.6], store: [0, 57, 24, 89],
        queue: [[21.8, 93.0], [25.0, 94.2], [28.2, 95.4], [31.4, 96.6]],
        seats: [[28.3, 79.1, 30.6, 79.0], [35.5, 79.1, 33.4, 79.0], [39.9, 82.8, 41.3, 84.0], [45.4, 82.8, 44.1, 84.0]],
      },
      smoothie: {
        sign: [6.3, 31.1, 18.8, 38.5], store: [0, 19, 25, 57],
        queue: [[21.8, 55.0], [24.4, 56.8], [27.0, 59.0], [29.6, 61.0]],
        seats: [[29.8, 52.5, 31.2, 53.8], [35.4, 52.5, 34.1, 53.8]],
      },
      pizza: {
        sign: [19.9, 10.5, 33.5, 15.6], store: [14, 0, 36.5, 35],
        queue: [[31.4, 35.0], [28.8, 35.2], [26.2, 35.6], [27.0, 38.6]],
        seats: [[38.3, 37.3, 39.7, 38.6], [43.8, 37.3, 42.6, 38.6]],
      },
      diner: {
        sign: [41.5, 10.9, 58.6, 15.5], store: [36.5, 0, 63.5, 34.5],
        queue: [[52.8, 35.0], [50.0, 35.2], [47.2, 35.4], [47.0, 38.2]],
        seats: [[43.5, 64.3, 42.2, 65.6], [56.5, 64.3, 57.8, 65.6], [38.0, 64.3, 39.4, 65.6], [62.0, 64.3, 60.6, 65.6]],
      },
      cafe: {
        sign: [66.3, 10.7, 80.3, 16.0], store: [63.5, 0, 86, 35],
        queue: [[68.6, 35.0], [71.2, 35.2], [73.8, 35.6], [73.0, 38.6]],
        seats: [[61.7, 37.3, 60.3, 38.6], [56.2, 37.3, 57.4, 38.6]],
      },
      sushi: {
        sign: [81.5, 31.1, 93.9, 38.4], store: [75, 21, 100, 57],
        queue: [[78.2, 55.0], [75.6, 56.8], [73.0, 59.0], [70.4, 61.0]],
        seats: [[70.2, 52.5, 68.8, 53.8], [64.6, 52.5, 65.9, 53.8]],
      },
      icecream: {
        sign: [79.2, 62.5, 94.5, 69.8], store: [75, 57, 100, 89],
        queue: [[78.2, 93.0], [75.0, 94.2], [71.8, 95.4], [68.6, 96.6]],
        seats: [[71.7, 79.1, 69.4, 79.0], [64.5, 79.1, 66.6, 79.0], [60.1, 82.8, 58.7, 84.0], [54.6, 82.8, 55.9, 84.0]],
      },
    },
  },
});
