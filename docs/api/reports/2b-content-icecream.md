# Phase 2b report: content-icecream (Ben's Ice Cream Emporium, pack `icecream`)

Status: done 2026-11-10, in one run (no earlier run of this lane had written anything). Backups:
`docs/backup/index.html.before-2o`, `docs/backup/tests/dom-play.cjs.before-2k`.

## What I built (paths from the game folder)

| File | What |
|---|---|
| `packs/icecream/pack.js` (new) | the restaurant as data, `format: 3`: 3 stations, 8 recipes, 3 slots, 2 stage sets, 3 gross-outs, 11 customers, 4 odd orders, The Kitchen Sink, the tutorial, theme, help |
| `packs/icecream/script.js` (new) | 379 lines, a delivery note on every line |
| `docs/api/packs/icecream.md` | the pack in words (pizza.md's layout); section 10 is food-icecream's contract, 12 every script moment, 18 the driver |
| `docs/api/packs/icecream-script.md` | the script in words: conventions, who they are, counts |
| `index.html` (shared, 2 lines) | `packs/icecream/pack.js`, `packs/icecream/script.js` after the sushi's two |
| `tests/dom-play.cjs` (shared, my lines) | taught repeats and More… rows (`leafOf`, `pathOf`, the repeat answer, row entry); 9 named runs, seeds 141-149 |

## The pack in brief

- **Freezer Case** (`scoop`, backdrop scoop, tool `scoop`): Holder Cone / Waffle Cone / Cup (cones, cups, sundaes) →
  flourish `scoopDip` → cook `size` (Scrape → Small / Regular / Huge → Avalanche; "How big?" / "Stop the Scoop") →
  **Scoop, a repeat pick (max 3) of 7 flavours**: Vanilla, Chocolate on screen, More… holds Strawberry, Mint Chip,
  Cookie Dough, Rocky Road, Bubblegum; Done from the second → flourish `bananaTuck` (splits).
- **Topping Bar**: Add or Skip sprinkles, hot fudge, caramel, whipped cream, nuts, cherry.
- **Shake Machine** (toppings backdrop, tool `blenderSwitch`): Flavour Vanilla / Chocolate / Strawberry → `milkPour` →
  cook `shake` (Lumpy → Thick / Creamy / Thin → Melted Puddle; "Stop the Mixer") → `shakePour` → whipped cream, cherry.
- **Menu**: L1 cone, cup, hot fudge sundae; L2 caramel sundae, waffle cone deluxe, milkshake (Rocky Road and Bubblegum
  join); L3 banana split; event Kitchen Sink Sundae (giant, in a sink). Courses `scoop`, `shake`.
- **Presses** (`pressReport`): every item 11-14 with Serve, the shake 5; L1 at most 14. Scratch sweep of 18,600 bot
  orders: L1-2 ≤ 14, L3 ≤ 26, L4-5 ≤ 27, event ≤ 28, tutorial 17; right answers always 3 stars.
- **Gross-outs**: `hair` (sprinkles), `tomato` (the cherry that is a tomato), `freezerBurn` (the shake's 3-value
  flavour pick). New fx keys for food: `tomato`, `frost`.
- **People**: Marge (usual: vanilla in a cup), Gus (twin), Bev (favourite hot fudge sundae; the event's finale, with an
  `order.gag` "for the team"), Vernon (regular size, exact), Sal (wants chocolate; dislikes the cherry: "fruit's rabbit
  food"), Tasha (huge); locals **Lulu** (wants vanilla everywhere; the agonising is in her lines) and **Walt** (1955;
  favourite hot fudge sundae; thick shakes; tutorial customer; own odd order `malted`); visitors Reginald, Kai and the
  cameo **Brock** (cheat day).
- **Odd orders**: `tenScoop` (L5; three huge), `ketchup` (a strawberry cup), `justCherry`, `malted` (Walt).
- **Theme** pastel pink: raspberry panels (highlight 4.37:1 or more on every checked surface), pastel plates, ticket
  line, logo and board frame.

## Where I departed from the brief (and why)

- **The cameo is Brock, not Pam**: `tests/cast.test.cjs` failed "lulu and pam are both Zira, only 0.83 apart".
- **Freezer burn on the shake's flavour pick**: the scoops are a repeat, which can't carry a gross-out (spec 4.6).
  **The melted puddle** is the shake's last Timed stage. Both listed in icecream.md 9.
- **Waffle Cone Deluxe is two scoops**, not two or three: Gus's two of them reached 28 before any Swap It.
- **Vernon's "single scoop"**: the count is the level's (spec 0.6), so his lines are about size and roundness.
- ACCESSIBILITY §9 (never colour alone): sizes and thicknesses show by size or mark (written into section 10).

## Tests run (from the game folder; `<jsdom>` as in pilot.md)

- pilot.md step 1 (`schema.validate`, `SC.check`, `SC.coverage`): `[] [] []`.
- `node -e "console.table(require('./tests/bot.cjs').pressReport('icecream'))"`: as above.
- `node --test "tests/*.test.cjs"` (final): **317 tests, 311 pass, 0 fail, 0 skipped, 6 todo** (`js/food/icecream.js`).
- `SC.everyClip`: 2026 clips, none unfilled. Scratch sweep: every complaint the judge gives finds a filled line; Lulu
  always vanilla, Sal always chocolate and never a cherry.
- `JSDOM=<jsdom> node tests/dom-play.cjs "the page boots"` after each index.html line: ok.
- `JSDOM=<jsdom> node tests/dom-play.cjs --pack icecream`: **38 ok, 2 FAIL**, about 35 min. All 8 named Emporium runs
  ok: tutorial (Walt, 3 stars, 20 warnings at mistakes 0.35), Timed no mistakes 3/3/3 (a More… row entered), held Stop
  the Scoop (the stage at keydown taken), one switch, eight at level 4 (Reginald; a dislike line), the event 3/3/3 with
  the gold sign, Motion Full (3 flourishes), the Grand Opening then Skip It and a shift. Every generic run ok except
  **the counter at 16:10 and at 21:9: "a child's shoulders are hidden by the counter"**, both and only the runs Lulu
  came to (see Requests).
- `JSDOM=<jsdom> node tests/dom-play.cjs "the Ice Cream Emporium: the whole chain"`: **ok**, 127 s (seven open, the
  parts of the U, 3 More… rows entered through the page).

## Not done

- The 3D food (food-icecream): until `js/food/icecream.js` exists the page borrows the diner's module and warns "no 3D
  set scoop/toppings"; 6 food tests stay TODO.
- Review frames (they would show the diner's food): food-icecream's.
- Voices: text to speech until the voice pass.

## Requests

- **page (js/stage.js) or cast (packs/cast/cast.js)**: Little Lulu (`scale: 0.66`) fails dom-play's child check at the
  counter at every window shape: with the eyes on the horizon (0.45-0.48) and the hips at the 0.80 line, the figure is
  about 0.84-0.92 of the picture tall, so a 0.66 child's shoulders (headTop + 0.34 h × scale) land at about 81.5%,
  under the line; Kai (0.74) lands at about 77%. Spec 5.2 wants head and shoulders to show. Options: the page lifts a
  child to a minimum shoulder line (a step stool would suit Lulu), or the cast raises her scale to about 0.72. Nothing
  in my files can fix it.
- **food-icecream**: icecream.md section 10 (looks, layouts, the four flourishes, the `scoop` and `shake` cooks by size
  or surface and mark, fx `tomato` and `frost`, the counter left of `queue[0]` = 0.55); then its `index.html` line.
- **page / integrate**: the `scoop` prop as the size's Timed control, `blenderSwitch` as the mixer's; note the driver's
  repeat and More… support in pilot.md 5.5 and page.md.
- **audio** (optional): the Emporium's flourishes are silent (no icecream pour sound exists).
- **content-cast**: Vernon's icecream mention says "exactly one" scoop; the level can give him two.
