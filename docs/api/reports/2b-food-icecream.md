# Phase 2b report: food-icecream (Ben's Ice Cream Emporium, pack `icecream`)

The Emporium has its own 3D food now, so the page no longer borrows the diner's. The jsdom driver passes all 40 runs
at the Emporium, the Node suite passes all 317 tests, and all 35 counter frames are on screen and left of the
painted queue. This was the first run of this lane: nothing was on disk from an earlier one.

## What I built (paths from the game folder)
| File | What |
|---|---|
| `js/food/icecream.js` (new, about 1,530 lines) | Every look, layout, set, cook, line handler, flourish and new gross-out effect in `icecream.md` section 10 |
| `index.html` | One line, `<script src="js/food/icecream.js"></script>`, after the sushi's line in the world block. Backup: `docs/backup/index.html.before-2p` |
| `docs/api/food.md` | New section 14, the Emporium: the format, the sets, the traps and the counter fit. Backup: `docs/backup/docs/api/food.md.before-2e` |
| `docs/api/reports/2b-food-icecream.md` | This report |

I did not change `kit.js`, `tools/food-frames.cjs` or `packs/icecream/pack.js`.

## Format and API (food.md 14 has all of it)
- **Two layouts draw everything.**
  - `scoopItem` draws the cone, cup, sundae, banana split and kitchen sink looks. It draws the holder, then places the scoops for that holder with `scoopPlaces`:
    - stacked on a cone;
    - side by side in a cup, then a third on top;
    - in a row in the boat;
    - heaped in the sink, two in front and one behind.
  - Every scoop is the size in `made.done`.
  - The toppings get three things from the layout: `tops` (the scoops with nothing above them), `crowns` (where the cream and the cherry go) and `surface` (the top scoops' real upper surface).
  - `shakeItem` draws the milkshake. Until `made.auto` has `glass`, it is the steel cup on a 3D mint mixer, with the empty glass waiting beside it. After that, it is the full glass with a straw, cream and a cherry.
  - Both layouts mark where an Add lands with an empty group named `stack`, which world.js's `c.top()` reads.
- **The sets:**
  - The counter set uses `line 0.80` and `surface { y: 0.92, back: -0.2 }`. Its camera is the smoothie's, so tall food stands up.
  - Its top is cream (#fff3ec) with pale veins, and a pink edge (#f16487) and white trim on the customer's side. These colours come from the counter picture's own counter and the court storefront.
  - Its anchors: one item at (-0.2, 0.92, 0.16), `contentScale 1.45`, `front 1.0`, `minScreenX 0.14`.
  - `counter.arrange` is the smoothie's. It puts the order right of the served customer's face when it fits, and always left of `anchors.maxScreenX`.
- **Measured lines** (food.md section 4):
  - Scoop: **0.622**, the freezer case's steel ledge (asked 62).
  - Toppings: **0.648**, the marble's front edge, the same in every column (asked 62).
- **Food is drawn bigger on the kitchen sets.** The board camera is far for food this small, so on the line sets the item is drawn 1.6 times, never taller than 0.95 units. The jars, pots and cans are drawn 1.8 to 1.9 times.
- **Cooking shows by size or surface, by mark AND by colour** (ACCESSIBILITY §9):
  - **The scoop:** the ball in the scooper grows. Under it is a dark sizing plate with flat rings: none at Scrape, one at Small, two at Regular, three at Huge, four red at Avalanche, when the ball also slumps and drips.
    - The ring colours are grey, mint, pink, gold and red. They are also `ramps.scoopBall`, so the size plates' swatches match them.
  - **The shake:**
    - Lumpy: scoops sitting in white milk.
    - Thick: a darker dome with stiff peaks.
    - Creamy: smooth, with a swirl.
    - Thin: flat and paler, with bubbles.
    - Melted Puddle: pale, with foam and a ring up the cup wall.
- **The new gross-out effects:**
  - `tomato`: the cherry grows 1.22 times, turns a matte orange-red, loses its stem and shine, and gets a green star calyx.
  - `frost`: white crystals and a grey crust on the top of the scoop.
- **The flourishes** (Reduced resolves each at once):
  - `scoopDip`: the scooper goes to the painted warm-water well for this window shape (`onPicture`), dips and drips.
  - `bananaTuck`: the banana halves slide in.
  - `milkPour`: milk pours from a jug.
  - `shakePour`: the steel cup tips over the glass and the glass fills.
- **How each topping waits and goes on:**
  - Sprinkles and nuts wait in a glass jar and are tipped out (`k.tip`).
  - Fudge and caramel wait in a warmer pot; a ladle pours them.
  - The cream can turns over and the swirl grows.
  - The next cherry, or the tomato, hops out of its jar.
  - A freezer-burned shake flavour waits in a dish, drawn larger.
  - Clear glass is never inked, so glass rims, bases and streaks make it show on the white marble.

## Where the rulebooks guided me (no conflict with the spec)
- **ACCESSIBILITY §9:** no size or thickness is shown by colour alone. Each also has a size or surface and a mark.
- **White on white needs a cue** (food.md section 7): vanilla scoops and vanilla shakes have vanilla-bean specks, so they never read as whipped cream.

## Tests (from the game folder)
- `BB_PACKS=icecream node --test "tests/food.test.cjs"`: 14/14 pass. I ran it after every change.
- `node --test "tests/*.test.cjs"`: 317 tests, 317 pass, 0 fail, 0 skipped, 0 todo. I ran it before and after the jsdom run.
- `node tools/food-frames.cjs icecream art-source/review/food-icecream guides`: 122 frames, and the counter fit is fine on 35 of 35. I read all 11 sheets several times and fixed what I saw (below).
- `JSDOM=… node tests/dom-play.cjs "the page boots"`: ok.
- `JSDOM=… node tests/dom-play.cjs --pack icecream`: **40 ok, 0 FAIL**, "every run reached its end with no script errors".
  - The counter passed at 16:9, 16:10, 4:3, 21:9, and at 4:3 with Extra Large text.
  - All 8 of content-icecream's named Emporium runs passed: tutorial, Timed with no mistakes (3/3/3), the stage-boundary hold, one switch, level 4, the event, Motion Full and the Grand Opening.
  - content-icecream's two Lulu counter failures did not come back in this run. Lulu's counter runs are worth re-checking (see Requests).
- Review frames: `art-source/review/icecream-frames` (counter, tut, timed and motion), then `python tools/review_compose.py art-source/review/icecream-frames --guides`. I read every sheet:
  - At all four window shapes, nothing covers the painted queue, and the order lies on the counter top and fully on screen.
  - The Kitchen Sink finale lies at 19-49% at 16:9 and reaches 54% at 4:3.
  - The freezer case, the topping bar, the shake machine and the Timed scoop look right.

## What the frames showed and what I fixed
- The food was far too small on the kitchen sets, so I scaled it up there.
- The shake looked grey through the glass. I raised the saturation by 80%, added a 30% glow, and set the glass to 15% opacity with front faces only.
- The painted mixer stands under the page's answer column, so I draw a 3D mixer while the shake is in its steel cup.
- A mint ring disappeared over the mint tub, so the rings now sit on a dark plate.
- The sauce caps hid the flavours, so they now cover only the top of each scoop and run down in drips.
- Two scoops side by side read as one blob. I moved them further apart.
- The sprinkles were too big, so I halved them.
- The glass jars and the glass boat were invisible on the marble. They now have tinted rims and highlight streaks.
- The Kitchen Sink stood over the customer's middle. The scoops are now heaped lower, each with its own crown, and the sink draws itself 1.15 times on the counter instead of the kit's 1.6 times.
- The holder covered the painted cone dispenser, so I moved it between the dispensers.

## Not done
- **Nothing with a real GPU:** the ink outlines and the timing of the motion are unchecked, because the CPU renderer hides the outline hulls.
- **No real browser:** the frames come from the CPU review renderer. The magenta tint on the clear glasses and jars in the page's review frames is the review tool's background showing through. The smoothie's cups show it too, and the food-frames renders don't.
- **The flourishes are silent:** no ice cream pour sound exists (content-icecream's request to audio).

## Requests
- **Page (`tools/review-frames.cjs`):** its `choose()` cannot step into a More… row. It loops on "could not choose pick:strawberry" whenever a scoop behind More… is due.
  - I worked around it with a patched copy in my scratchpad (`scratchpad/2b-food-icecream/review-frames-rows.cjs`). The fix enters the row first, using a `pathOf` like `dom-play.cjs`'s.
  - The shared tool still needs that fix.
- **Page (`review-frames.cjs`, optional):** composite transparent 3D over the backdrop rather than over the magenta key, so clear glass reads true in review frames.
- **Page / cast:** content-icecream saw Lulu's shoulders hidden by the counter at 16:10 and 21:9. My run had no failure, but it may not have drawn Lulu. Keep the request open until a run that draws Lulu passes.
- **content-icecream (optional):** the milkshake ramp colours (`lumpy`…`puddle`) are nearly the same pale cream on the plates. The 3D shows the stage by colour and by mark, but the plate swatches carry little colour. Darker steps from thick to pale would help.
