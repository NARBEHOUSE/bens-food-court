# Phase 2b report: food-smoothie (Ben's Smoothie Shack's 3D food, pack `smoothie`)

The Smoothie Shack now draws its own food: every look, set, flourish and cook from `smoothie.md` section 10 is done.
- The Node suite has 0 failures.
- All 41 `--pack smoothie` jsdom runs pass, including content-smoothie's 8 named runs and the counter at all four
  window shapes.
- In the food frames, all 31 counter frames fit.

No earlier run of this lane had started, so this is all new work.

## What I built

| File | What |
|---|---|
| `js/food/smoothie.js` (new) | the shack's 3D food, 1,614 lines |
| `index.html` (shared; backup `docs/backup/index.html.before-2l`) | one line in the world block, after `cafe.js`: `<script src="js/food/smoothie.js"></script>` |
| `docs/api/food.md` (shared; backup `docs/backup/docs/api/food.md.before-2c`) | new section 11, "Ben's Smoothie Shack", for the agents after me |
| `tools/review-frames.cjs` (shared; backup `docs/backup/tools/review-frames.cjs.before-2e`) | one small edit: a restaurant that is closed at the start is seeded open, with its Grand Opening seen. Without it, every session failed with "could not choose shop:smoothie" |

I did not touch `kit.js`, `tools/food-frames.cjs` (food-cafe had already made the pilot.md 7 change), the pack or the script.

## The food (details in food.md 11)

- **The smoothie is built inside a clear blender jug.**
  - The base pours in from a pitcher. The pitchers are labelled with an orange, cow spots or oats; yogurt comes in a tub.
  - Each fruit or extra drops in whole: strawberries, banana chunks, mango cubes, pineapple wedges, blueberries, spinach, a protein scoop with a puff, a honey ribbon from a honey bear, and ice.
  - The blender is a pink motor base like the ones on the shelf.
  - The `cupFill` flourish: the jug lifts off, tips, and the cup fills while the jug empties.
- **The cup is clear, with a teal sleeve and a pink hibiscus.** It has a domed lid, a striped straw, and the first fruit on the rim.
  - Where I followed the rulebook against the spec: the spec says a white paper cup. But the court picture and the prep shelf both draw clear cups, and a paper cup would hide the colour, which is the point of the drink (the "not green" joke depends on it). That follows GRAPHICS-QUALITY's rule that the 3D should match the painted world.
  - The banana waits on the line as a whole yellow banana rather than a peeled one, so it reads at once and a brown one reads as spoiled.
- **Colours are mixed from what went in**, using each fruit's weight in sRGB. Strawberry Banana comes out pink, Tropical yellow, Berry Blast berry, Green green, Protein pale green, and the "not green" order yellow.
- **The five blend stages differ by colour and by mark at the cook view's size:**
  - Unblended: whole pieces.
  - Chunky: lighter, with streaks and chunks.
  - Smooth: specks.
  - Super Smooth: deeper, with a gloss.
  - Soupy: pale and lower, with foam and bubbles.
- **The açaí bowl** is a half coconut. The purple dome has spoon swirls, with rows of granola, banana slices, strawberry slices and blueberries, and a honey zigzag over them.
- **The trophy** is a gold two-handled cup with a mound of smoothie, an umbrella, two straws and a pineapple wedge.
- **The two new gross-out effects:**
  - `bug`: a beetle, legs up, in a big clear ice cube.
  - `sock`: a striped tube sock poking out of the ice. The jug's lid comes off for it.
- **A spoiled fruit that went in** becomes the garnish on the rim, spoiled, so it shows at the counter.

## Format and API

- **Settled numbers:**

  | Set | `line` | `surface` | Camera |
  |---|---|---|---|
  | counter | 0.80 | `{ y: 0.92, back: -0.2 }` | pos `[0, 1.97, 4.3]`, at `[0, 0.62, -1.4]`, fov 36 (about 13° down) |
  | prep (also the bowl bar) | 0.623, measured | `{ y: 0.5, back: -0.5 }` | the board camera |
  | blender | 0.652, measured | `{ y: 0.5, back: -0.5 }` | pos `[0.22, 2.62, 4.15]`, at `[0.22, 1.1, 0.1]`, fov 30; `cook: 'blender'` |

  - Prep asked for 62; measured row 638, every column within 1 px.
  - Blender asked for 65; measured row 668.
- **Each shape has three forms**, chosen by `o.form`: `'line'`, `'jug'` (with `o.r`) and `'bowl'` (with `o.row`).
- **The layout builds expose the pour controls:** `jug`, `cup`, `setBase`/`baseY`, `setJug`, `setCup`/`cupY`.
- **The trophy is sized by its own layout** (`giantDone`), so no set uses `giantMax`.
- **`counter.arrange`:** the order stays right of a child's face when it fits there (the customer at 24% of the picture plus 7.5% of the window). Otherwise it uses the whole stretch from the Pause sign. It is always left of `anchors.maxScreenX`.

**Counter fit** (food-frames, 720 px high):

| Order | Size | Left edge to right edge |
|---|---|---|
| One medium cup, at every shape | 89 × 166 px | 40–47% |
| Small cup | 73 × 135 px | |
| Large cup | 109 × 204 px | |
| Smoothie and bowl | 323 × 173 px | 24–49% (4:3: 20–53%) |
| Two smoothies | 208 × 166 px | 36–52% |
| Finale (trophy and bowl) | 402 × 230 px | 21–52% (4:3: 21–57%) |

All of these sit left of the queue, which starts at 57%.

## Tests (run from the game folder)

| Command | Result |
|---|---|
| `BB_PACKS=smoothie node --test "tests/food.test.cjs"` | 14 pass, 0 fail |
| `node --test "tests/*.test.cjs"` (final) | 302 tests: 290 pass, 0 fail, 0 skipped, 12 todo (the burrito, sushi and icecream food modules are not written yet) |
| `node tools/food-frames.cjs smoothie art-source/review/food-smoothie guides` | 102 frames; counter fit 31 of 31 fine; every sheet read, in three rounds of fixes |
| `JSDOM=… node tests/dom-play.cjs "the page boots"` | ok |
| `JSDOM=… node tests/dom-play.cjs --pack smoothie` | 41 of 41 ok, "every run reached its end with no script errors" |
| `JSDOM=… node tests/dom-play.cjs --pack smoothie "counter at"` (after my last edits) | 5 of 5 ok (16:9, 16:10, 4:3, 21:9, and 4:3 at Extra Large text) |
| `JSDOM=… node tools/review-frames.cjs art-source/review/smoothie-frames --pack smoothie counter tut timed motion`, then `python tools/review_compose.py art-source/review/smoothie-frames --guides` | done; all 7 sheets read |

The `--pack smoothie` pass ran before my last three small edits: the spoiled garnish, the bigger and darker bug, and the lid coming off for the sock. The 5 counter runs above ran after them.

What I checked on the review sheets:
- The order sits on the counter top, fully on screen, and nothing of mine covers the painted queue at any of the four shapes.
- Kai's face stays clear.
- The tutorial reaches every station, the Timed blender view works, and the wheel flourish shows.

## Not done

- **Any blender colour other than pink.** The motor base is the pink one from the shelf.

## Requests

1. **Page (`tools/review-frames.cjs` / `review_compose.py`):** the jug and cup come out pink in the page review frames. The 3D is keyed over magenta only, so anything see-through picks up the magenta. `food-frames.cjs` keys it twice (over magenta and over green), and there the glass is clear. Please use the same two-key method. This only affects the review tool, not the game.
2. **Page (`css/bb.css` `#gauge`, `top: 53vh`):** at the blender, the Timed gauge crosses the jug's lid. The blend and its marks stay visible below it. Could the gauge be placed from the set, either above the food on screen or from an anchor the food module gives?
3. **Page / integrate:** keep the `review-frames.cjs` seed line, and note it beside `courtRecord()` in `page.md` §8 and `pilot.md` §5.5.
4. **Page:** please draw `blenderSwitch` as the Timed control. The review frame already shows a lever prop labelled "Stop the Blender", so this may already be done.
