# Phase 3, lane art-polish (2026-11-10)

## 1. Every character, every pose, every outfit

- Audit (scratchpad `phase3/art-polish/audit.cjs`): BBCast.people x BBCast.poses x packs/cast/art/manifest.js x the
  files on disk x `BBArt.cast.extent`. 22 customers, each with the ten customer poses plus `eating`; `BBCast.drawn()`
  returns all 22. Mitch: the seven uniforms the packs name (`mitch-burger`, `-pizza`, `-smoothie`, `-cafe`, `-burrito`,
  `-sushi`, `-icecream`) with all ten manager poses, plain `mitch` with the ten plus `promoted`; every pose has its
  extent. Nothing in the manifest is missing on disk; nothing on disk is outside the manifest. `build_art.py --dry`:
  "art-source/cast has every pose of every character and uniform." Nothing needed drawing.
- Looked at all 330 cut-outs on contact sheets over dark and red rows (scratchpad `cust1-4.png`, `mitch1-2.png`):
  each outfit is the same in every pose (zoomed the uniform hats on facepalm: the cafe beanie, burrito bandana, ice
  cream paper hat, pizza hat are all there), no halos or fringes on dark or red, expressions read.

## 2. The Pizza Parlor's and the Sushi Bar's painted queues moved left

- `art-source/jobs/write_queue_moves.py` (new): `move-queue-*` jobs (Astra, the picture as reference), then
  `--nudge` jobs (`nudge-queue-*`) and one hand-written `nudge2-queue-sushi-counter.txt`. Each result went back
  through `tools/paste_back.py` (only the changed region; outside the boxes mean |diff| 3.9-7.3, unchanged).
- Pizza: the same kid and the same woman with the shopping bags; two looks the rule bans were swapped: the red
  tracksuit man (Bev's tracksuit) is now a grey-haired tourist with a map and a camera, and the kid's smiley balloon
  (Pam's party balloons) is a toy dinosaur. Sushi: the same businessman, umbrella couple and teenager; the teenager now
  holds the phone in front of the face instead of up at arm's length. Everything else is the original pixels.
- Measured again (zoomed 1% grids): pizza `queue [0.526, 0.751]`, heads 0.407, feet 0.742; sushi `queue [0.545,
  0.735]`, heads 0.373, feet 0.55; eyes and horizon unchanged. `.layout.json` updated, `build_art.py` rebuilt both
  `counter.webp` and the pizza and sushi manifests (BB_CUTOUT=cpu; no cut-outs were needed).
- Frames: `art-source/review/art-polish/{pizza,sushi}/` (counter session, 16:9, 16:10, 4:3, 21:9, `--guides`). Mitch
  is `at: right` in every frame with a customer; worked out from each frame's `placed` for all ten of his poses, every
  pose is on screen at every shape (the closest: pointing at 4:3, 2 px to spare at the pizza, 7 px at the sushi). The
  cyan queue box is clear of the column, receipt, bubbles, register and bell.
- Seen, not mine (stage.js): at 16:9 and 16:10 the receipt and Mitch's bubble overlap (frame 05 "Three stars. I am
  framing the receipt."): `fitReceipt()` does not keep off Mitch's bubble. pilot.md also lists the Cafe and the
  Burritos with Mitch off the right edge at 4:3; those pictures were not in this lane.

## 3. Name plates fit their sign boards

- `js/court.js`: `PLATE_FIT = { w: 0.94, h: 0.9, min: 11 }`; the plate's max-width/max-height are the board's (it
  used to grow to 130%); `fitPlates()` (after render, on resize, after a Text Size change) steps the letters down a
  pixel at a time while the plate's content spills (words wrap at spaces first), never under 11 px. Without layout
  (jsdom) it changes nothing.
- `tools/review_compose.py` draws the same rule. `tools/review-frames.cjs` session `plates`: all seven open, the court
  at 16:9, 16:10, 4:3, 21:9 x Normal, Large, Extra Large. Before: the composer noted plates bigger than boards
  (smoothie, ice cream, pizza, diner, cafe). After: no plate note in any of the 12 frames. Looked at 4:3 Normal and
  Extra Large: "Smoothie / Shack" and "Ice Cream / Emporium" wrap to two lines inside their boards; Extra Large stays
  larger than Normal and legible.

## 4. The ice cream pour sound

- `tools/make-sounds.cjs`: `icecream/pour` (0.60 s, vol 0.26, a slow soft glug, low-passed at 1.8 kHz; --check: 0%
  above 2.5 kHz, centroid 851 Hz, ok). Named with `sound: 'pour'` on the shake station's `milk` and `glass` auto steps
  (pack-format.md 7). Index rewritten (42 sounds); audio.md's table has the row. The scoop dip and the banana tuck
  stay silent (not asked; each would be another sound on most orders).

## 5. Milkshake plate swatches

- `packs/icecream/pack.js` milkshake ramp (used only for the plate swatches and gauges; the 3D shake cup draws its own
  flavour colour): lumpy a8794a, thick c99a5f, creamy e2bf8a, thin f3e2c4, puddle fffaf0. Lightness 55/67/79/90/98
  (was 89/91/95 for thick/creamy/thin). Words and marks unchanged. Side-by-side plate mock-up in the scratchpad
  (`swatches.png`): the three plates now read apart at a glance.

## Checks

- `node --test "tests/*.test.cjs"`: 320/320 pass (one earlier run had 9 script failures from another lane's
  js/core/script.js edit in progress; they passed on the next run).
- `JSDOM=<jsdom> node tests/dom-play.cjs --pack pizza`: 45 ok, 0 FAIL; `--pack sushi`: 41 ok, 0 FAIL; `--pack icecream`:
  43 ok, 0 FAIL; each "every run reached its end with no script errors" (logs: scratchpad `phase3/art-polish/dom-*.log`).
- `node tools/make-sounds.cjs --check`: exit 0.
- Frames read: `art-source/review/art-polish/{pizza,sushi}` (counter, 4 shapes), `icecream` (counter, 16:9 and 4:3),
  `court` (seven, court, howto sessions), `plates` (12 court frames).

## Backups

docs/backup/: art-source/backdrops/{pizza,sushi}-counter.{png,layout.json}.before, packs/{pizza,sushi}/art/
{backdrops/counter.webp,manifest.js}.before, js/court.js.before-2f, css/bb.css.before-2g (not changed in the end),
tools/review_compose.py.before-2h, tools/review-frames.cjs.before-2i, tools/make-sounds.cjs.before-2b,
packs/icecream/pack.js.before, packs/shared/sound/sounds.js.before, docs/api/audio.md.before-2c,
docs/api/page.md.before-2g, docs/api/pilot.md.before-2d, docs/api/packs/sushi.md.before.
