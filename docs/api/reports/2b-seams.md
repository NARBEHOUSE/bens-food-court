# Phase 2b report: seams (2026-11-09)

Status: done (2026-11-09; a second run finished the checks the first was cut off before: see "Second run"). A later
run of this lane reads this file, the backups (`docs/backup/**/*.before*`, the newest suffix of each) and the files
below.

## Second run (2026-11-09 evening): what it found and fixed

The first run was cut off after writing this report but before its last checks (the diner re-run, `--pack pizza`) and
after its frames (stage.js and world.js changed once more after them). The second run re-ran everything and re-drew
every frame (`art-source/review/2b-seams-{diner,pizza,court}-r2/`, read; the first run's sets are superseded).

- **The diner's one item still touched Kai's chin box at 4:3** (the first run's 0.04 move did nothing: world.js's queue
  clamp held the plate there). `js/world.js`: each item is now clamped at its own near side (`anchors.maxXAt(z)`, the
  same limit at that depth; onCounter); `js/food/diner.js` (counter set only): the one-item spot `(-0.42, T, 0.28)` and
  the counter's plates 0.75 (were 0.85): at 4:3 the queue holds the plate's right rim, so a smaller plate lets the
  burger (its size kept) sit right of his face. 30 of 30 diner counter runs pass (six sets of five, in parallel).
- **The sign's name half-hidden under a bubble** (frame `counterxl@4x3-04-reaction`, pizza): stage.js `signCovered()`
  now also leaves the name off while a speech bubble covers part of it (the board shows blank), as for the column and
  the receipt; `bubble()` re-checks it.
- `tests/dom-play.cjs`: the face check's failure now prints the order's position, box and clamp; two `heard` runs
  renamed "Long words heard in full" (Help, the first-visit card).

## What I built (all paths from the game folder; every file backed up first)

| File | What changed |
|---|---|
| `art-source/backdrops/*counter.layout.json` (7 new) | each counter picture's measured layout, beside it |
| `tools/build_art.py` (manifests only; `.before-2a`) | copies the layout into `BBArt.<pack>.counter`; `BBArt.cast.extent` (each pose's figure above the hips); warns when a picture is newer than its layout. Run: it rewrote only the 7 restaurant manifests and the cast manifest (0 of 346 images rebuilt) |
| `js/stage.js` (`.before-2e`) | `layout()` per picture: `placeProps`, `placeMitch`, `fitColumn`, `fitReceipt`, `fitBubble`, `placeSign`/`signCovered`; `placed` carries every box |
| `css/bb.css` (`.before-2f`) | the counter backdrop's anchor, `#signName`, Mitch's three spots, `.cols2`/`.row` column, receipt and bubble variables, `--reg-w`, 64 px slips |
| `js/world.js` (`.before-2b`) | the counter's anchor on wide windows (`anchor`, `useAnchor`), `onScreen(..., name)`, `counterAnchors` with `queue`/`maxScreenX`/`lineY`, `maxX` clamped left of the queue |
| `js/food/pizza.js`, `js/food/diner.js` (counter set only) | the order kept left of the picture's own `queue[0]` (`anchors.maxScreenX`; the pizza's camera to `anchors.lineY`); the diner's `maxX` now from the picture |
| `js/ui.js` (`.before-2e`) | long card words heard in full under Auto Scan (`holdFor`, `narrate`, `narrate: true` cards) |
| `js/core/script.js` (`.before-2a`), `js/core/court.js` (comment) | `varsFor` of-picks; `{name}`/`{goal}` per value; `everyClip` with `names`/`goals`/`said`; `givenFor` |
| `tests/counter.test.cjs`, `tests/clips.test.cjs` (new); `tests/cast.test.cjs` | layouts sane and in sync; clips the page asks for are listed with the same words; the diner manifest's shape test allows the appended `counter` key |
| `tests/dom-play.cjs` (my checks) | per-picture counter checks (`counterGeom`, `checkCounter`, `counterWatch`), an XL 4:3 counter run, five `heard in full` runs, `speechMsPerChar` |
| `tools/review-frames.cjs`, `tools/review_compose.py` | `counterxl` session, a Mitch-with-customer frame, the anchor, the sign, the column modes, the receipt/bubble boxes; `--guides` draws each picture's own box |
| `docs/api/page.md`, `world.md`, `pilot.md`, `script.md` | page 5, 7, 7.1, 7.2, 8, 9; world 2, 3.2, 3.6; pilot 5.3, 5.4, 7; script 4, 5 |

## The seven counter pictures (fractions of the 1536 x 1024 picture)

| Pack | queue x0-x1 | heads | feet | eyes | horizon used | sign face [x0, y0, x1, y1] |
|---|---|---|---|---|---|---|
| diner (`counter.png`) | 0.513-0.770 | 0.450 | 0.763 | 0.495 | 0.48 | [0.296, 0.056, 0.703, 0.143] |
| pizza | 0.513-0.845 | 0.403 | 0.755 | 0.470 | 0.47 | [0.346, 0.047, 0.653, 0.127] |
| smoothie | 0.570-0.802 | 0.494 | 0.713 | 0.526 | 0.48 | [0.313, 0.168, 0.516, 0.216] |
| cafe | 0.599-0.822 | 0.550 | 0.760 | 0.590 | 0.48 | [0.341, 0.131, 0.659, 0.206] |
| sushi | 0.659-0.878 | 0.372 | 0.550 | 0.433 | 0.45 | null (noren curtains) |
| burrito | 0.564-0.835 | 0.462 | 0.665 | 0.510 | 0.48 | [0.359, 0.036, 0.639, 0.124] |
| icecream | 0.550-0.798 | 0.508 | 0.723 | 0.565 | 0.48 | [0.339, 0.086, 0.733, 0.171] |

Queue: first person's left edge to the last one's right edge, what they hold included (balloon, sunflowers, fan,
excitement marks). Heads: the highest point (the pizza's hair bun, the sushi umbrella). The pictures were drawn at
eye level, so the horizon runs through the painted adults' eyes (0.43-0.59: the queues stand at different depths);
the served customer's eyes are held to spec 5.2's 0.45-0.48 so they look the same everywhere. Only other painted
people: faint shopper silhouettes behind far shop windows (diner x 0.61-0.78, icecream x 0.21-0.30; decor, 3% tall).

## Format and API (details in page.md 7, world.md 3.6, script.md 5)

- `BBArt.<pack>.counter = { queue: [x0, x1], heads, feet, eyes, horizon, sign }`; `BBArt.cast.extent[folder][pose]
  = [x0, x1, top]`.
- `BB.stage.placed`: `queue`, `keep`, `customer`, `head`, `column {mode: one|two|row}`, `mitch {at: customer|right|off,
  fig}`, `receipt`, `bubble {tall}`, `register {w}`, `bell`, `back5`, `hud`, `sign {on, shown, covered}`, `anchor`.
- `BB.world.anchor(name)`, `useAnchor(on)`, `onScreen(fx, fy, picture, name)`, `counterAnchors()`; a module's
  `counter.arrange` gets `anchors.queue`, `maxScreenX`, `lineY`, `aspect`, `heads`, and a clamped `maxX`.
- ui.js: a card with `narrate: true`, or `narrate(text)` (Help, Ticket), holds the card's automatic scan with the
  scanner's own input hold until the words end (past the 10 s cap: until the engine stops), then one interval.
- script.js: `clipId` appends the camel-cased key of `{name}`/`{goal}` words; `everyClip(pack, script, { customers,
  names, goals, said })`; `givenFor`.

## Choices and where the rulebooks won

- Mitch with a customer stands right of the queue while at least half his face shows; otherwise he speaks from off
  the right edge (named bubble, voice). Pizza at 4:3 always; pizza 16:9 in his wide poses; expect the same at the
  sushi bar (queue to 87.8%).
- 21:9 anchor: the line where 16:9 has it, but the queue's heads kept 31% down the window so the answer row and a
  three-line bubble fit above them: diner 104 px of counter top (was 24), pizza 52 px.
- A bubble short of room above the queue grows wider, over the corner count while it speaks, rather than over the
  painted people.
- ACCESSIBILITY §4 over the task's "a press acts at once": under one switch with the Space brake on (the hub
  default) Space on the blank is consumed and Enter there does nothing, on every card, so How to Play is heard to its
  end before Back comes round (about 40 s with a real voice). With the brake off, Space steps at once and may cut it.
- ACCESSIBILITY §9 (64 px targets, Text Size) kept: slips `max(64px, ...)`, the register never under 64 px; at
  Extra Large text legibility wins (below).

## Tests (from the game folder; `<jsdom>` as in pilot.md)

- Second run, final: `node --test "tests/*.test.cjs"`: 302 tests, 278 pass, 0 fail, 0 skipped, 24 todo (the todos are
  the food modules the food lanes have not written yet; other lanes added packs meanwhile). `BB_PACKS=diner`: 220 pass,
  1 skipped (the diner-only manifest test, as pilot.md says). New in my lane: `tests/counter.test.cjs` 8/8,
  `tests/clips.test.cjs` 5/5.
- Step 1 of pilot.md for every loaded pack (diner, pizza, smoothie, cafe, burrito): schema, `SC.check`,
  `SC.coverage` all `[]` (first run).
- `tools/build_art.py` (the venv Python): "built 0 of 346 (346 up to date); manifests rewritten: smoothie, burrito,
  pizza, diner, cafe, sushi, icecream", then "cast" (first run).
- jsdom, second run, after the last change: "the page boots" ok; "counter at" 13/13 (diner, pizza, Cafe at four
  shapes, the diner at 4:3 Extra Large) plus 30/30 diner counter runs; the court runs 17/17 (whole chain x3 incl. the
  Cafe's and Burritos' chains, court Pause, focus pull x2, Grand Opening x2, gold sign, celebration, parts x2, pointer);
  "heard in full" 6/6. `--pack pizza`: 45/45 ok ("every run reached its end with no script errors").
- 21:9 measured (dom-play `wide`): diner anchor 0.70, line 85.6%, 104 px of counter top; pizza 0.57, 92.8%, 52 px;
  the Cafe 0.70, 104 px (was 24 px for all).
- Frames, all read: `art-source/review/2b-seams-diner-r2/` and `2b-seams-pizza-r2/` (`counter` and `counterxl` at 16:9,
  16:10, 4:3, 21:9; 10 frames each, `--guides`), `2b-seams-court-r2/` (menu 16:9/4:3, How to Play Normal/XL at 16:9
  and 4:3). The first run's `2b-seams-{diner,pizza,court}/` are superseded.

## Legibility first (Extra Large text; named frames)

- `counterxl@21x9` (pizza): the answer row's bottom 17-60 px into the queue's top, the receipt over the first two
  queue people, tall bubbles over the queue's heads. The pizza's queue is tall and 21:9 at 720 px leaves 223 px.
- `counterxl@16x9-06-receipt` (pizza and diner) and `counterxl@4x3-06-receipt` (pizza): the receipt (about 400 px
  tall at XL) overlaps the queue's top-left corner.
- `counterxl@21x9-05-mitch-with-customer` and `-06-receipt` (diner): Mitch's three-line bubble and the receipt reach the
  top of the queue's box.
- Everything at Normal text keeps clear at all four shapes, at both restaurants (and the Cafe's runs).

## Not done

- `tools/food-frames.cjs` (the food agents' tool) still uses the old shared queue box and the centred picture (world.js
  only anchors when `useAnchor(true)`, so its frames stay consistent); pilot.md 7 says the four-line change.
- No browser: real font metrics, the bubble and receipt heights, the sign lettering are reckoned (stage.js measures with
  a canvas in a browser and keeps the reckoning otherwise).

## Requests

1. **The five food agents** (`tools/food-frames.cjs` is yours): load `packs/<id>/art/manifest.js` into
   `globalThis.BBArt` before world.js, take `COUNTER.queue` from its `counter`, call `BB.world.useAnchor(true)` and
   draw the backdrop at `BB.world.anchor('counter')` on a wide window. In `counter.arrange` read `anchors.maxScreenX`
   and `anchors.lineY` (pilot.md 7, world.md 3.6); never 52%.
2. **Coordinator, shared code**: `shared/choice-scan.js` `arm()` re-arming when a timer wakes early is still open
   (the page works round it). Long narration needed no shared change.
3. **Voice pass**: record from `SC.everyClip(pack, script, { customers, said })` (and the court's with `names` and
   `goals`): `{name}` lines are now one clip per value. `tools/voice-clips.cjs` (the Burger Bar's) passes only
   `customers`, so its event and mention clips need `said`.
4. **Art, phase 3 (optional)**: the Pizza Parlor's and the sushi bar's queues reach 84.5% and 87.8% across, so with a
   customer there Mitch speaks from off the right edge at 4:3; a queue inside about 55-78% would keep him in view.
