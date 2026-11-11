# Phase 2b food-cafe report

Ben's Cafe now has its own 3D food. Every look, set, flourish and cook step in `docs/api/packs/cafe.md` section 10 is
built. The Cafe plays end to end from the court on its own food, and all the checks below pass.

## What I built

| File | Change | Backup |
|---|---|---|
| `js/food/cafe.js` | New file, about 1,000 lines | none (new file) |
| `index.html` | One line in the world block: `<script src="js/food/cafe.js"></script>`, after the pizza's line | `docs/backup/index.html.before-2k` |
| `tools/food-frames.cjs` | Small edits (listed below) | `docs/backup/tools/food-frames.cjs.before-2b` |
| `docs/api/food.md` | Section 10 added: the Cafe's module, its traps and its FIT table | `docs/backup/docs/api/food.md.before-2b` |

I did not change `js/food/kit.js`. I did not change `packs/cafe/pack.js`, because no set or look data needed changing.

**The changes to `tools/food-frames.cjs`** (the steps pilot.md section 7 asks for):

- It loads `BBArt.<pack>.counter` before world.js. The queue box and the eye line now come from each counter picture's own layout file.
- It turns on `BB.world.useAnchor(true)` and draws the counter backdrop at `BB.world.anchor()`. The 21:9 counter frames now match the page.
- The line and FIT measurements use `world.surfaceLine()` and `world.onScreen()`.
- The "combo" frame pairs a pack's two courses (for the Cafe, a drink and a donut).
- A Timed cook step that has a `want` (the pour and the fryer) is walked to its last stage, with a frame at each stage. One quirk: each frame shows the stage before the one in its name.

The pizza's frames still render the same.

## What the food looks like

- **Drinks:** a paper cup sized by the size pick. The coffee's colour and its height in the cup both follow the strength. Three lines on the inside wall show how far it reached: Mild leaves two showing, Smooth one, Bold none. Burnt is near black, with a dark ring and smoke.
  - Milk tops the drink up and makes it paler. A cappuccino gets a foam cap.
  - Add-ons each show: a cream swirl, a crema ring for the extra shot, vanilla and caramel drizzles, sugar cubes, a whipped-cream peak, the latte-art heart and the lid. On the counter, two torn sugar packets lie beside a coffee with sugar.
- **Donuts:** a ring, or a jelly ball with jam showing. They sit on wax paper.
  - Frying shows by colour and by mark: Golden has a pale band round its middle, Dark Golden a darker band and brown flecks, and Burnt is near black with cracks and smoke.
  - The glaze is a glossy shell with drips. The toppings sit on the glaze itself.
- **Waiting on the line:** milk jugs, a steel creamer, a shot glass, pump bottles, a teaspoon with a sugar cube, the red whipped-cream can and glass jars of toppings. Each has its own way of going in: tipped and poured, pumped, dropped, piped, or shaken out.
- **Flourishes:** the latte-art heart forms as milk pours in; the lid drops and snaps on; the donut flips face-down into a bowl of its glaze and comes up glazed.
- **Gross-outs:** the stale dough, the spoiled milk jug and the fly all show on the line and on the counter.

## Measured lines

- **coffee: 0.611** (the spec table asked for 65). The painted cream bar top is only a 4% strip. The bare work surface left for the game starts under the ink line of its front edge.
- **donuts: 0.596** (asked for 62). The bare pale counter starts under the steel back counter's front edge.
- **counter: 0.80**, with surface `{ y: 0.92, back: -0.25 }`.

## Format and API

All of this is written up in `docs/api/food.md` section 10.

- **Layouts:** `coffeeCup` (with `setFill` and `surface` for pours) and `donut` (with `noGlaze` for the frame before the dunk).
- **Line handlers:** `jug`, `creamer`, `shotGlass`, `pump`, `spoon`, `whipCan` and `jar`. Each applies its waiting part's gross-out itself.
- **Cook steps:** `pour` and `fry`.
- **Flourishes:** `latteArt`, `lidOn` and `glazeDunk`.
- **Hooks:**
  - `coffee` `pick`: the size drops the cup, the drink pours, the milk jug tips in.
  - `donuts` `pick`: the dough drops onto the paper; a glaze leaves the donut bare until the dunk.
- **Counter:** `counter.arrange` works like the pizza's, but packs several items against the queue side.
- **Cameras:** the kitchen camera looks down about 40 degrees, so the drink is read inside the cup. The counter camera sits 1.0 above the counter top, and the order is drawn 1.3 times up.

**Counter FIT (16:9 / 16:10 / 4:3 / 21:9).** All 39 counter frames are on screen and left of the painted queue at 59.9%.

| Order | 16:9 | 16:10 | 4:3 | 21:9 |
|---|---|---|---|---|
| One coffee | 214x205 | 214x205 | 214x205 | 214x205 |
| Coffee and donut | 508x226 | 440x213 | 375x181 | 518x226 |
| The Morning Rush finale | 481x205 | 410x184 | 344x156 | 586x252 |

## Tests run (from the game folder)

| Command | Result |
|---|---|
| `BB_PACKS=cafe node --test "tests/food.test.cjs"` | 14/14 pass, run after every change |
| `BB_PACKS=cafe node --test "tests/*.test.cjs"` | 221 tests, 216 pass, 0 fail, 5 skipped. The skips are diner and pizza tests that `BB_PACKS` leaves out. |
| `node --test "tests/*.test.cjs"` | 302 tests, 290 pass, 0 fail, 0 skipped, 12 todo. The todos are `js/food/burrito.js` and `js/food/sushi.js`, which other lanes have not written yet. |
| `JSDOM=… node tests/dom-play.cjs --pack cafe` | 43 runs: 42 ok, 1 fail |
| `"the page boots"`, re-run afterwards | ok |
| `"the Cafe: the whole chain…"` | ok |
| The Cafe's Motion Full, Timed and Timed-hold runs, and the first-visit run, re-run after my last kitchen edits | ok |
| `node tools/food-frames.cjs cafe art-source/review/food-cafe guides` | 117 frames, counter fit 39/39 |
| `node tools/review-frames.cjs art-source/review/cafe-frames --pack cafe counter tut timed motion`, then `python tools/review_compose.py … --guides` | Done, and I read every sheet |

The one failure in the `--pack cafe` set was "the page boots". It failed because `js/food/smoothie.js` was on disk but not yet on the page; the smoothie lane added its line during my run. The rest of the 42 includes every counter run at all four window shapes and the Cafe's own 11 named runs.

**Frames I read:**

- `food-cafe` (every sheet).
- `cafe-frames`: the counter sheets at 16:9 (the 16:10, 4:3 and 21:9 shapes were checked with food-frames and the jsdom counter runs), the tutorial, Timed and motion.
- Nothing I draw covers the painted queue, and the order stays on the counter top at every window shape.
- On the line, a held lid now waits behind the cup and to the left, away from the "Back in 5" sign.

## Where I followed the rulebooks over the spec

- **GRAPHICS-QUALITY:** cues are never thinned on Low; small things are drawn bigger (the jars, the shot glass, the spoon).
- **ACCESSIBILITY:** doneness and strength show by colour and by mark at the size the cook view draws them. White-on-white has its own cue: the sugar glaze is mixed with the fried colour underneath, and the cappuccino's foam has a crema ring.

## Not done

- The latte-art heart cannot be seen at the counter: the camera is too low to see into an open cup. It shows on the line and in the latte-art flourish.
- On a Large cup, the page's Timed gauge covers the far rim (the drink itself stays visible). Medium and Small cups are fully clear.

## Requests

- **page:** The Timed gauge sits at a fixed spot (`bb.css #gauge`: left 42%, top 53vh). Placing it from the food's on-screen box, or above the set's line, would keep it off any food that stands tall. I lowered the cup and the fryer to stay clear of it.
- **page / integrate:** The tutorial never explains the pour, because the Simple pour is automatic. This repeats content-cafe's request.
- **coordinator:** None from this lane beyond those two.
