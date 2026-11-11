# Phase 2b, lane content-cafe: Ben's Cafe (pack id `cafe`)

Status: done (steps 1-5). Written as the lane went.

## What I built

| File | What |
|---|---|
| `packs/cafe/pack.js` (new; version 1, `format: 3`) | Two lines on two backdrops. **coffeeBar** (coffee): Size → Drink (Drip/Latte/Cappuccino/Hot Chocolate) → the pour (cook, `simple: 'auto'`, Timed "Stop the Pour", tool `espressoLever`; coffee only) → Milk Whole/Oat/Skim (milk drinks) → latte art (auto) → Add/Skip cream (drip), extra shot (coffee), vanilla, caramel, sugar max 2 (drip), whipped cream → lid (auto; drip, hot chocolate). **dough** → **fryer** (Golden/Dark Golden, "Lift the Basket", `fryerBasket`) → **glaze** (glaze, dunk auto, sprinkles, coconut, nuts) on the donuts backdrop. 14 recipes (8 drinks, 5 donuts, the event's Giant Donut), courses drink+donut, ladder unchanged, 3 gross-outs, 4 odd orders, the Morning Rush, the tutorial, theme, help |
| `packs/cafe/script.js` (new; 358 lines, each with a delivery note) | Mitch 77, 'customer' fallbacks 41, Jitters 51, Walt 30, Priya 27, Marge 21, Gus 18, Bev 19, Vernon 19, Sal 19, Reginald 18, Kai 18 |
| `docs/api/packs/cafe.md` | the pack in words; §10 every look, set, flourish and cook for food-cafe; §12 every moment and who says it; §18 traps for the next lanes |
| `docs/api/packs/cafe-script.md` | the script in words: conventions, who they are, counts |
| `index.html` (2 lines, restaurants block) | `packs/cafe/pack.js`, `packs/cafe/script.js` (backup `docs/backup/index.html.before-2h`) |
| `tests/dom-play.cjs` (12 runs) | "the Cafe: …": tutorial, Timed no mistakes, the held stop, one switch, level 4, the event, Motion Full, the counter at 4 shapes, and a whole chain diner → pizza → cafe as a new run (the shared chain run untouched) (backup `docs/backup/tests/dom-play.cjs.before-2h`) |

## Format and API settled

- **Changes to the brief** (cafe.md §2): milk is Whole/Oat/Skim on milk drinks and a drip takes Cream (an Add), so
  spoiled milk sits on a pick of three (spec 4.6's own example) instead of being dropped; the pour is coffee only; its
  stage is the strength (Mild/Smooth/Bold, Burnt last) as a `want`, drawn per order; flourishes on every drink (art or
  lid) and every glazed donut (dunk); sugar counts fixed per recipe.
- **Gross-outs**: `stale` (dough pick), `spoiled` (milk pick), `fly` (sprinkles Add); kit fx only.
- **People**: Marge's usual (cream, two sugars), Gus twin ("a dozen donuts" said), Bev and Sal favourites, Vernon oat
  ("extra hot" said), Priya's usual and favourite (large bold Red Eye), Jitters dislikes whipped cream; visitors
  Reginald, Kai (`dislikes: ['coffee']`: coffee is the item, so he never orders one) and the cameo Grandpa Walt.
- **Event**: The Morning Rush; finale Jitters: Giant Donut + large bold Red Eye.
- **Tutorial**: Jitters; latte (large, bold, whole, extra shot) + sprinkle donut; the whole milk comes down spoiled.
- **Theme**: warm brown and cream; highlight ≥ 5.16:1 on every surface it sits on, text ≥ 4.5:1, stars ≥ 3.29:1.
- **Size ids** `smallCup`/`mediumCup`/`largeCup` (an id `medium` fails pack.test: words.js says "medium" in a comment).

## Tests run

- `node -e "…step-1…"` (pilot.md 4): `[] [] []`.
- `node -e "console.table(require('./tests/bot.cjs').pressReport('cafe'))"`: Simple/Timed with Serve: coffee 10/11;
  black coffee, red eye 9/10; latte, cappuccino, vanilla latte, Wake-Up Call 8/9; hot chocolate 7/7; donuts 7/7. Worst
  whole order 21 (two Coffees, Timed; 1,800 shifts); tutorial 15 with its Swap It; finale 15/16.
- `BB_PACKS=cafe node --test "tests/*.test.cjs"`: 216 tests, 209 pass, 0 fail, 1 skipped (the diner-only manifest
  test), 6 todo (js/food/cafe.js).
- `node --test "tests/*.test.cjs"`: 267 tests, 255 pass, 0 fail, 0 skipped, 12 todo (cafe and smoothie food).
- `JSDOM=… node tests/dom-play.cjs "the page boots"`: ok (pack line, then script line).
- `JSDOM=… node tests/dom-play.cjs --pack cafe`: 25 runs, 23 ok, 2 FAIL: Motion Full (no flourish in a shift of drip
  coffees: fixed by the lid step) and the counter at 21:9 (it ran while the seams lane was editing world.js, stage.js,
  bb.css and dom-play.cjs at 15:44-15:45; the same check passed in the named run a few minutes later).
- Reruns after the fix: `JSDOM=… node tests/dom-play.cjs --pack cafe "Motion Full"`: 3 runs, 3 ok (the generic
  Motion Full now has 3 flourishes); `… --pack cafe "the counter at 21:9"`: the generic run ok, the Cafe's ok.
- `JSDOM=… node tests/dom-play.cjs "the Cafe"`: 12 runs, 12 ok (the chain counted each of the three once).
- Node sweeps: 6,000 orders by the right bot at every level, both modes: all three stars; 7,500 orders: Kai never
  ordered coffee, Jitters never got whipped cream; 400/400 three-customer level-1 shifts have a flourish.

## Not done

- `js/food/cafe.js` is food-cafe's (next in this lane): until it exists the page borrows the diner's food, so the
  coffee and donut stations draw nothing ("no 3D set" warnings) and the food tests are TODO. Review frames of the cafe
  wait for it too.
- Voices: text to speech only (no voice manifest line until the voice pass).
- The shared whole-chain run still plays diner and pizza only; the cafe's chain is its own run.

## Requests

- **food-cafe**: build `docs/api/packs/cafe.md` §10: 19 look shapes, the `coffeeCup` and `donut` layouts, sets
  `counter`/`coffee`/`donuts` (measure the coffee and donut lines: the table's 65/62 look nearer 58/57 by eye), cooks
  `pour` (strength as colour + a fill mark) and `fry`, flourishes `latteArt`, `lidOn`, `glazeDunk`; then add
  `js/food/cafe.js` to the world block of `index.html`.
- **page / seams**: in the tutorial, a `cooked` event with `auto: true` could say `tutorial.cook.<station>` once (the
  pour is never explained today); the cafe's queue box is `BBArt.cafe.counter` (59.9-82.2%), matching my measurement.
- **coordinator (js/core, tests)**: pack.test's "no js/core file names an id" also matches comments (words.js's
  "medium" blocks that id); `W.said()` says "no sugars" when one of two copies of a counted part is held (holds are per
  ingredient), so recipes cannot make a count optional; `SC.everyClip` and `{name}` (`nearly.1`), as the pizza asked.
- **integrate**: fold "the Cafe: the whole chain…" into the shared chain run if one chain is wanted.

## Hub rulebooks

ACCESSIBILITY.md followed where it touches content: every gross-out is named in its spoken label ("Oat milk,
spoiled"), the pour's strength and the fryer's doneness are words plus marks (never colour alone), labels stay short,
and the humour is adult and never talks down. Nothing here departs from the spec for it.
