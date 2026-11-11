# Report: food-sushi (phase 2b, 2026-11-09)

Ben's Sushi's 3D food is finished, and every page check at the sushi bar passes except one. That one fails on the
driver's `partsChecks()`, which content-sushi already reported (Requests). I added `js/food/sushi.js` to `index.html`.
The Node suite passes 302 of 302 tests, with 0 todo. In Motion Full the sauces squirt, the knife slices and the ladle
pours.

## Files (game folder)
- `js/food/sushi.js` (new, about 1300 lines).
- `index.html`: one line, `<script src="js/food/sushi.js"></script>`, after `burrito.js` in the world block. Backup
  `docs/backup/index.html.before-2n`.
- `tools/food-frames.cjs` (backup `.before-2c`): when a stage set has `simple: 'auto'`, the Timed walk runs to the
  last stage and pictures every stage (`timed-<ing>-stage-<name>`). The Simple walk shows none of them. This does not
  change the Cafe's walk.
- `docs/api/food.md`: new section 13, Ben's Sushi (backup `docs/backup/docs/api/food.md.before-2d`).
- `packs/sushi/pack.js`: unchanged. None of its set or look data needed settling.
- Review frames: `art-source/review/food-sushi/` (100 frames, 8 sheets) and `art-source/review/sushi-frames/`
  (counter at 4 shapes, tut, timed, motion; composed with `--guides`).

## Format and API (details in food.md 13)
- **One layout for every roll**, `sushiRoll`, in one of four forms. Every part's shape reads the form from `o.roll`:
  - `sheet`: at prep, and on the mat at stage 0.
  - `log`: on the mat, curled by stage, or on the board before the slice.
  - `pieces`: 6 or 8 in a row, or 10 in two rows. Each piece leans toward the viewer so its cut face reads.
  - `cone`: the hand roll, lying on its side.
- **The base** is the vessel look `rollMat`: the bamboo mat, the cutting board, the geta on the counter, or the boat.
  The Sushi Boat is the kit's giant 1.6; the line sets cap it at 1.0.
- **Inside-out** at prep is the flipped sheet: the fillings lie on the nori, with a rice border round it. Its rice pick
  plays the spread, then the flip.
- **Each filling's cut-face patch differs by shape as well as colour.** Cream cheese is a white patch on a blue-grey
  edge (the white-on-white cue).
- **`misoSoup`**: a red lacquer bowl, black inside. The broth uses `setLevel(t)` and has a faint swirl; tofu, wakame
  and enoki float on it. At the soup station it is drawn 1.6x.
- **Sets:**
  - `counter`: `line 0.80`, `surface { y: 0.92, back: -0.2 }`, the pizza's camera. A golden hinoki top `0xf4c56a` (the
    counter picture's own sushi counter, #f9c955-#fdd276), an orange-wood edge, flat seams and grain.
  - `prep`: `line 0.628`, measured; the spec asked 62.
  - `roll`: `line 0.620`, measured; the spec asked 60. It has `cook: 'mat'`.
  - Both kitchen sets use the diner's board camera, 25% closer. The painted counter is the surface, with no furniture.
- **The mat cook.** Each stage is a colour AND a mark, and neighbouring stages differ at the cook view's size. I
  compared all five in one crop:

  | Stage | Colour | Mark |
  |---|---|---|
  | Flat | white rice sheet | none |
  | Loose | pale nori | mat barely curled, open seam |
  | Firm | dark nori | mat wrapped, one red string band |
  | Tight | near-black glossy nori | smaller, wrapped further, two bands |
  | Squashed | flattened | mat flat, rice blobs, a dent |

  `ramps.rollMat` gives the dial plates the same colours.
- **Lines:**
  - `bowl`: fillings and soup floaters wait in a seigaiha bowl like the shelf's, and are tipped on with `k.tip`.
  - `squirt` and `shake`: the kit's bottle at 0.72x and shaker at 0.8x, wrapped so the kit's squeeze keeps the scale.
- **Flourishes:**
  - `rollSlice`: the knife makes N-1 cuts, then the pieces part.
  - `misoLadle`: a wooden ladle pours, and the broth level rises.
- **`fx.wink`**: an eyeball with a tuna-red lid turning round its horizontal axis. In Motion Reduced it is drawn
  mid-wink.
- **`counter.arrange`**: the pizza's solve. The right edge is also held to `anchors.maxXAt` (without that, two rolls'
  geta were pushed together), with a 0.24 gap between items.
- **Simple never shows the mat.** `simple: 'auto'` cooks the roll inside the answer that ends the prep table, and
  game.js changes scene only in `step()`. So the prep set's `finish` hook rolls it up on the prep mat when `made.done`
  is set (Simple only).

**Counter FIT** (food-frames, 720 high): 37 of 37 frames are on screen and left of the queue.

| Order | 16:9 | 4:3 | 21:9 |
|---|---|---|---|
| One roll (8 pieces on a geta) | 405 x 61 px, 25-57% | 405 x 61 px | 364 x 54 px |
| Roll and miso | 548 x 69 px, 18-61% | 454 x 58 px, to 65.6% | — |
| Two rolls | 555 x 43 px | 452 x 35 px | — |
| Hand roll | 175 x 82 px | — | — |
| Miso soup | 117 x 68 px | — | — |
| Finale | 538 x 99 px | 431 x 79 px | 405 x 40 px |

## Tests run (from the game folder; `JSDOM=<the task's jsdom path>`)
- `BB_PACKS=sushi node --test tests/food.test.cjs`: 14 pass, 0 fail (no look missing a builder), after every edit.
- `node --test "tests/*.test.cjs"`: 302 tests, 302 pass, 0 fail, 0 skipped, 0 todo (run three times; last after the
  final edit).
- `node tools/food-frames.cjs sushi art-source/review/food-sushi guides`: 100 frames, counter fit 37 of 37. I read
  every sheet.
- `node tests/dom-play.cjs "the page boots"`: ok.
- `node tests/dom-play.cjs --pack sushi`: 39 ok, 1 FAIL. The failure is "five open: the parts of the U" ("Cannot read
  properties of undefined (reading 'length')"): the driver's `partsChecks()` assumes every top-level stop is an arm
  (content-sushi Request 2). All five "counter at" runs pass; I re-ran them after my last counter edit: 5 of 5 ok.
- `node tests/dom-play.cjs "Sushi:"`: 9 of 9 ok, among them Motion Full (it failed before this module), the tutorial,
  Timed with three stars, Stop Rolling held, one switch, eight at level 4, the event and the whole chain. I re-ran all
  nine after the last anchor edits: 9 of 9 ok.
- `node tools/review-frames.cjs art-source/review/sushi-frames --pack sushi counter tut timed motion`, then
  `python tools/review_compose.py art-source/review/sushi-frames --guides`. I read every sheet:
  - Nothing of mine covers the painted queue at any window shape. The order lies on the counter top, fully on screen.
  - In the tutorial's gross-out frame, the waiting rice bowl sat under the answer column. I moved the prep line's
    waiting spot to x 0.54 and the mat to x -0.1, and checked it again in the food frames.

## Rulebooks
- GRAPHICS-QUALITY / mainstream polish: the stacked feedback is all motion-aware (Reduced resolves at once). The roll
  rolls up, the knife cuts, the pieces part, the ladle pours, the nori drops and the inside-out sheet flips. No rule
  was changed for looks.
- I followed the spec everywhere; nothing went against it.

## Not done
- The cone on the prep mat curls into a cone, but the hand-roll stages are judged by the same bands and colours as a
  log. That is fine at the cook view's size; I did not draw a separate tightening shape.
- No garnish (ginger, wasabi) on the geta: a green or pink blob could be mistaken for avocado or salmon.

## Requests
1. **integrate (owner of game.js and the page):**
   - In Simple, the mat station's auto cook never shows. The `cooked` event plays while the prep table is on show, and
     the mat's `cook` and `done` sounds play right after my prep `finish` roll-up, not with it.
   - Fix suggestion: let `playout` move the scene to a station that cooks on its own (`simple: 'auto'`) before its
     `cooked` event, and call the set's cook `run`.
   - My `cooks.mat.run` already rolls a stage at a time. The prep `finish` hook would then step aside if
     `made.done` is set and the page shows the mat (tell me the flag and I will add the check).
2. **integrate (owner of `tests/dom-play.cjs`):** as content-sushi asked, `partsChecks()` should skip a top-level stop
   that is a single storefront. It fails "five open: the parts of the U" at `--pack sushi`.
3. **seams / art (21:9):** at 21:9 the sushi counter shows only a thin strip of counter top. The anchor is 0.50,
   because the painted queue is tall (heads at 0.372). The roll is drawn at about 364 x 54 px and the boat at
   405 x 40 px. Redrawing the counter picture with the queue lower would give the order room.
