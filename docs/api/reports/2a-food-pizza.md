# Phase 2a report: food-pizza (2026-11-09, resumed)

# food-pizza (resumed): report

The pizza's counter now sits low, as decision 4 asks. Its top's back edge is on the 80% line at every window shape, nothing covers the painted queue, and every order sits on the counter top, fully on screen and left of the queue. Every frame was reviewed and the faults found were fixed. The Node suite is 226/226 green, and `docs/api/food.md` is written for the five food agents after me.

## Files (backups were made first)
- **`js/food/pizza.js`** (backup `docs/backup/js/food/pizza.js.before-2a`):
  - **Counter:** solved to `line: 0.80` with `surface { y: 0.92, back: -0.2 }`. The camera is at `[0, 2.17, 4.4]` looking at `[0, 0.56, -1.2]`, fov 38, so its horizon meets the painted one at 46% of a 16:9 window. It draws a cream top with a brick-red edge and two rows of red-and-white checked tiles, matching the court picture and the counter picture. Nothing rises above the line; I removed the old shakers.
  - **Where the order goes:** `counter.arrange` keeps the whole order between 14% of the window (the Back in 5 sign) and 52% of the picture (the queue), at the window's own shape. world.js calls it again on every resize.
  - **Toppings and cut:** toppings now lie on one surface instead of piling about 0.1 high. The cut used to float above the rim and stick out past the crust. It now runs over the toppings, notches the rim, stops at the crust's edge, and is crust-brown so a black hair still reads.
  - **Heart pizza:** sits on a heart-shaped tray. It is capped in size on the prep table (1.05) and in the oven (1.1).
  - **Garlic knots:** their doneness marks, butter and parmesan used to float in the air like flies. They now sit on the knots' surface. The basket is drawn 1.3x larger, and knots no longer bubble in the oven.
  - **Prep and oven:** the flat 3D slabs are gone, so the painted marble and stone show.
  - **Small things:** topping tins are 1.2x larger, sized so pieces stay inside. Light, Golden and Crispy cheese are now clearly different colours as well as different marks. Burnt smoke is darker. White sauce has herb flecks so it reads on pale dough.
- **`js/food/kit.js`** (extended only; backup `kit.js.before-2b`): added `k.surfaceOf(g, minUp)` and `k.onSurface(S, n, seed, lift)`, for anything that lands on lumpy food.
- **`tools/food-frames.cjs`** (backup `food-frames.cjs.before-2a`):
  - Renders counter frames at 16:10, 4:3 and 21:9, resizing the window the way the game does (`aspects` does it for every counter frame).
  - Adds decision-4 guides: the counter line, the served customer's eyes-to-hips box, and the queue box.
  - Measures every counter frame the way `tests/dom-play.cjs` checks the page: on screen, size, height above the line, past 52%. Problems are summarised in `index.txt`.
- **`docs/api/food.md`**: how to write a food module step by step, with the pizza as the second worked example. It covers measuring a surface line, the counter and its camera trade-off, using the frames tool, and the traps the pizza hit.
- **Review frames:** `art-source/review/food-pizza/`, 111 frames and 10 sheets. All 36 counter frames pass the fit check.

## Format and API
- **Sets:**

  | Set | Line | Notes |
  |---|---|---|
  | counter | 0.80 | `spots [(-0.5, 0.92, 0.57)]`, `row 0.57`, `contentScale 0.9`, `back -0.2`, `front 1.06`, `minScreenX 0.14` |
  | prep | 0.654 (measured) | `giantMax 1.05` |
  | oven | 0.694 (measured) | `giantMax 1.1` |

- **Pizza size on the counter:**

  | Order | 16:9 | 4:3 | 21:9 |
  |---|---|---|---|
  | one pizza | 249 x 89 px | 249 x 89 px | 68 x 22 px |
  | pizza and knots | 430 px wide | 322 px wide | 328 px wide |

  All of these are fully on screen and left of 52%.
- **Looks and layouts:** unchanged from `docs/api/packs/pizza.md` section 10.

## Tests run
- `node --test "tests/*.test.cjs"`: 226 tests, 226 pass, 0 fail, 0 skipped, 0 todo.
- `BB_PACKS=pizza node --test "tests/food.test.cjs"`: 14 pass, 0 fail.
- `node tools/food-frames.cjs pizza`: 111 frames, counter fit 36 of 36 fine.
- `JSDOM=… node tests/dom-play.cjs "the counter at"`: all 4 runs ok. These test the diner, since `index.html` does not load the pizza yet; they confirm the `kit.js` change. The 16:9 run failed once at about 11:00 with "the order covers kai's face". That was the diner while page-1 was changing it, and it passed when re-run.

## Rulebooks
I followed ACCESSIBILITY.md's "never signal state with colour alone": every oven stage, both crusts and the knots change mark as well as colour. Nothing in my lane conflicted with the spec.

## Not done
- **21:9:** only a 24-pixel strip of counter shows, so world.js shrinks the pizza to about 27% (68 px). It is on screen but small for a low-vision player.
- **Pizza never run in the page:** `index.html` doesn't load it yet, so it has not been played through `dom-play.cjs`.
- **Ink outlines:** the CPU frames hide them, so the in-game look is unchecked.

## Requests
- **page / integrate:** in the world block of `index.html`, directly after `<script src="js/food/diner.js"></script>`, add:
  `<script src="js/food/pizza.js"></script>`
  Then run `JSDOM=… node tests/dom-play.cjs "the counter at" --pack pizza`.
- **page-1 / coordinator (21:9):** on windows wider than about 2:1, anchor the counter backdrop lower (`background-position` about `50% 85%`) and make `lineOnScreen` follow. That leaves about 22% of the window below the line instead of 3%.
- **integrate (content-pizza is finished):** `docs/api/packs/pizza.md` section 10, "Sets", still says the counter uses the diner's fixed camera. It is now solved to 0.80; `food.md` section 9 has the details.
- **world.md owner:** add `surfaceOf` and `onSurface` to the kit table in section 4.
