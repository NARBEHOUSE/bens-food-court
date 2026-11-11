# Phase 2b report: food-burrito (Ben's Burritos' 3D food, `js/food/burrito.js`)

The lane is done. Ben's Burritos draws its own food everywhere: on the burrito line, at the chip basket, on the griddle and on the counter. It plays from the court with every check green. This was one run, with nothing cut off.

## What I built (paths from the game folder)

| File | What |
|---|---|
| `js/food/burrito.js` (new, about 1,250 lines) | All 23 shapes, 5 layouts, the sets `counter`, `prep` and `griddle`, the `griddle` cook, 4 flourishes, a `tin` line, two fx (`hair`, `spots`), `counter.arrange` and the ramps |
| `index.html` | One line, `<script src="js/food/burrito.js"></script>`, after smoothie.js (backup `docs/backup/index.html.before-2m`) |
| `tools/review-frames.cjs` | A small fix to `choose()` (backup `docs/backup/tools/review-frames.cjs.before-2f`): with five or more restaurants open, the court scans the parts of the U first. `choose('shop:<id>')` now steps into the part that holds the storefront, as dom-play's `toShop()` does. Before this, every session stopped on the court with "could not choose shop:burrito". |
| `docs/api/food.md` | New section 12, "Ben's Burritos" (backup `docs/backup/docs/api/food.md.before-2d`) |
| `packs/burrito/pack.js` | **Not changed.** Its section-10 data already matched what I measured. |

`js/food/kit.js` is not changed. I added nothing there that another lane needs.

## Format and API (the full version is in food.md section 12)

- **How fillings are drawn.** Nothing stacks. Each layout keeps a **ground**: the food's height at any point. It gives each part a **region** of that ground:
  - a rounded band down a tortilla or a taco
  - a wedge or a heap in a bowl

  A part builds its mound or pieces on the ground there, then raises the ground for the next part. So a burrito's ten layers follow each other's surface. The hot sauce is a tube laid along that surface, so it never floats. Copy `ground`/`region` for any food that piles loose things on loose things.
- **Layouts.** The vessel drawn is the **style picked** (`made.picks.style`); nothing is drawn until a style is picked. The toast is read from `made.picks.toast`, or `o.stage` on the griddle.
  - **Burrito:** flat on its foil until `wrap`. Then it is rolled and cut on the bias, so the cross-section of what went in faces the viewer. Its closed end is in foil.
  - **After `burst`:** a second, fatter tortilla goes over it (two tortilla rings show at the cut), and a scrap of foil in front holds spilled beans, rice and sour cream.
  - **Bowl:** loose heaps until `arrange`, then one wedge per part with nothing touching.
  - **Tacos:** open on a steel tray until `fold`, then half-moons in steel cradles. On the griddle they are three pressed half-moons.
  - **Chips:** a checked paper boat, the salsa cup, the guacamole cup, and a lime on the rim.
  - **Giant:** the burrito plus a flame pennant.
- **Flourishes.** One answer brings the sauce pick, the wrap and the burst together, so `made` already holds all three. Each flourish first draws `without(made, [...])`, then plays its own step. A flourish whose style was not picked just pops.
- **Doneness** is a colour and a mark, and neighbouring stages differ in both at the griddle's size:

  | Stage | Colour | Mark |
  |---|---|---|
  | Soft | cream | no stripes |
  | Lightly Toasted | light gold | 2 faint stripes |
  | Toasted | golden brown | 3 brown stripes and toasty spots |
  | Extra Crispy | deep brown | 4 dark stripes and blisters |
  | Burnt | charcoal | black stripes and smoke |

### Measured lines and the counter

| Set | Line | Notes |
|---|---|---|
| prep | 62.5% (asked 62) | Every one of 19 columns; the board camera; the painted steel is the surface |
| griddle | 74.4% (asked 65) | The dark plate under its back lip; the board camera; `plate (-0.02, 0.5, 0.02)`, `giantMax 1.0` |
| counter | 0.80 | `surface { y: 0.92, back: -0.2 }`; camera 1.15 above the top, `pos [0, 2.07, 4.4] at [0, 0.52, -1.2] fov 38`; `spots [(-0.3, 0.92, 0.55)]`, `contentScale 1.25` |

The counter is a cream top over orange planks, with the storefront's orange edge and a dark brown trim on the customer's side. Only flat things are built on the counter, so the painted queue stays clear.

Counter fit, from food-frames at 720 px high:

| Order | 16:9 | 4:3 |
|---|---|---|
| one burrito | 228 x 102 px, 34.9-52.7% (the same size at every shape) | 29.9-53.6% |
| burrito and chips | 463 x 99 | 354 x 76 |
| two burritos | 451 x 95 | |
| the finale | 424 x 177 (541 x 226 at 21:9) | |

36 of 36 counter frames are on screen, on the counter top and left of the painted queue.

## Tests (run from the game folder; `<jsdom>` as in pilot.md)

| Command | Result |
|---|---|
| `BB_PACKS=burrito node --test "tests/food.test.cjs"` | 14/14 pass (every look has a builder; sets, lenses, assembly, cooking and gross-outs all pass) |
| `node --test "tests/*.test.cjs"` (final) | 302 tests, **302 pass**, 0 fail, 0 skipped, 0 todo |
| `BB_PACKS=burrito node --test "tests/*.test.cjs"` | 221 tests, 216 pass, 0 fail, 5 skipped (the diner and pizza are left out) |
| `node tools/food-frames.cjs burrito art-source/review/food-burrito guides` | 127 frames, all read; 36/36 counter frames fine |
| `JSDOM=<jsdom> node tests/dom-play.cjs --pack burrito` | **36 of 39 ok.** Three failed. "The page boots" failed because `js/food/sushi.js` was on disk but not yet on the page (the sushi lane's; it now passes, below). The other two were "the counter at 4:3" and "4:3 with Extra Large text": the burrito's raised foil end touched Kai's chin box by 5 px. I fixed that by moving the one-item spot from x -0.42 to -0.3. |
| `... dom-play.cjs --pack burrito "counter at"` (after the fix) | 5/5 ok (16:9, 16:10, 4:3, 21:9, and 4:3 with Extra Large text) |
| `... dom-play.cjs "the page boots"` | ok |
| `... dom-play.cjs "Burritos:"` | **9/9 ok**: the tutorial, Timed, Lift the Press held, one switch, level 4, the event, Motion Full, the Grand Opening, the whole chain |
| `... tools/review-frames.cjs art-source/review/burrito-frames --pack burrito counter tut timed motion` + `python tools/review_compose.py art-source/review/burrito-frames --guides` | Every sheet read |

What the review sheets showed:
- **Counter, at all four window shapes:**
  - Every order lies on the counter top, between the Back in 5 sign and the painted queue.
  - It sits beside Kai's face, never over it.
  - Nothing covers the painted queue.
- **Tutorial:** every station is right, including the brown guacamole waiting in its pan with Swap It.
- **Timed:** the griddle's press tool stays clear of the food.

The review frames were made before the spot moved 3% right. The page's "counter at" runs above check the new spot.

## What the frames made me fix (food-frames, read three times)

- The counter order was too small (140 px) and sat on the back edge. I made it bigger and moved it forward.
- The rolled burrito was too thin.
- The foil's crinkle lines stuck out past the foil sheet.
- Bowl wedges and taco strips read as loose confetti. Each is now a solid heap with pieces on top, and only the protein gets a heap in a taco (one heap per topping built a white dome).
- The bowl was too deep to see into from the counter; it is shallower now.
- The taco cradles cut through the shells; they now hug them.
- A dark hair could not be seen on black beans; it is pale there now.
- The giant burrito brought its burst spill onto the griddle.
- The mango salsa read as pale peach.

## Rulebooks

- **GRAPHICS-QUALITY:** none of the frames needed a rulebook to overrule the spec.
- **ACCESSIBILITY §9, colour never alone:**
  - Doneness is a colour plus a stripe count.
  - The sauces carry 1 to 3 chili marks on their bottles.
  - White on white has a cue: sour cream has a cool shadow and a gloss, white rice has cilantro flecks, onions have lilac edges.

## Not done

- Nothing in my lane. I can't see ink outlines or motion in Node: the CPU renderer hides the outline hulls. The taco shells and mounds deliberately have no hull (an open shell's hull would fill it black in a browser).
- The Timed steam came out pink in the composed review frame. In food-frames it is white, so this looks like `review_compose.py` keying a see-through puff, not the game.

## Requests

- **page (review_compose.py owner):** translucent puffs (steam) are composed pink in `burrito-frames/timed-01`. Please check the keying of see-through pixels.
- **page:** as content-burrito asked, play `burst.wav` for the auto step `burst` (the burst flourish is about 1.7 s long).
- **Other food lanes:** `tools/review-frames.cjs` `choose()` now steps into a part of the U. Use `--pack <id>` as before.
