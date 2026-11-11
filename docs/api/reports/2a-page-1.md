# Phase 2a report: page-1 (2026-11-09, the finishing run)

# page-1 report: phase 2a finishing run (resumed), 2026-11-09

The Burger Bar's counter now sits low (decision 4). Every check in the brief passes:
- the Node suite is 226 of 226;
- the final jsdom driver suite is 16 of 16 runs;
- 50 review frames of the Burger Bar, which I read myself.

## Decision 4 first: the counter
- **The counter set** in `js/food/diner.js` (that set only):
  - Solved like a station: `line: 0.80`, `surface { y: 0.92, back: -0.3 }`.
  - Camera `pos [0, 1.18, 4.2] at [0, 1.02, -0.3] fov 42`, only 0.26 above the counter top, so the order never shrinks at 21:9.
  - The back edge lands at 85.6% of a 16:9 window, 82% at 16:10, 80% at 4:3 and 96.7% at 21:9.
  - Restyled as the court picture draws the Burger Bar: a steel top, a chrome edge, a cherry-red panel with chrome bands.
- **`js/world.js`**:
  - `BB.world.counterLine()` and `surfaceLine(name)` give `{ line, y, px }` for the current window. `onScreen(fx, fy)` maps any point of the picture to the window.
  - The order on the counter stays between the counter's back edge and the nearest depth the window still shows, inside a span worked out per window (`minScreenX`). An item is shrunk only when it cannot fit, and the order is placed again on every resize.
  - When an order is served it slides to the customer and is taken, so the counter is clear for the bell.
- **`js/stage.js` and `css/bb.css`**: `stage.layout()` places everything at the counter from the line, through CSS variables on `body`:
  - **Served customer:** eyes (18% of the figure canvas) on the painted horizon (46.5% of the picture), hips (56%) on the line, centred at 24% across. Gus's head now starts at about 31% of a 16:9 screen; it was at about 10%.
  - **Children:** they keep the same feet line, so Kai shows head and shoulders. A child's bubble sits just above the head.
  - **Mitch:** stands behind the counter on the right.
  - **Bubbles:** they grow upwards from above the painted queue's heads.
  - **Props:** the register, the bell and the Back in 5 sign stand on the counter top. The receipt and the answer column sit up on the right.
- **Proof:**
  - 36 counter frames at 16:9, 16:10, 4:3 and 21:9, each set showing Mitch, an order, the review, the reaction, the receipt and bell, Kai ordering and at the review, three items, and the event's giant. They are in `art-source/review/page1-frames/`, with sheets `sheet-counter-{16x9,16x10,4x3,21x9}.png` that draw the line and the queue's box.
  - In every frame the painted queue is clear above the line, heads are well inside the screen, and the order sits on the counter top, fully on screen.
  - Four new driver runs, one per window shape, check the same thing numerically at every review.

## Other work in this run
- **`js/game.js`:**
  - A tutorial no longer clears `bb-shift:<pack>` when it finishes or is restarted (it used to delete a saved real shift).
  - The review clears the last station's answers before the counter scene.
- **`js/ui.js`:**
  - An Enter hold keeps counting toward Pause when a playout ends under it and the line opens. A held key still freezes the Timed clock.
  - The event card's Food Court now leaves the restaurant properly.
  - **Auto Scan guard:** a one-switch scan that should be moving but has not moved for one interval plus 1.5 s gets its clock back (details under "The one-switch flake").
- **`css/bb.css`:** the control panel's defaults are now darker (`#626c75` to `#3f464c`, lip `#23282c`), so the highlight is 3.7:1 and 6.7:1 against it (it was 1.1:1 and 2.1:1).
- **`tests/dom-play.cjs`:**
  - New options: window `size`, `queue`, `counter` checks, `leave`, `keepShift`, `slowSpeech`, `clockLag`.
  - The 5 s Enter hold now really starts during an arrival.
  - Take It Off is now really held 3 s across a stage boundary.
  - Waits are timed instead of counted.
  - The page's timers never fire early (see below).
- **`tools/review-frames.cjs` and `tools/review_compose.py`:** the new menu and court flow, `--pack`, `--aspects`, the sessions `counter`, `tut`, `timed` and `motion`, any window size, and a `--guides` overlay.
- **Docs:** new `docs/api/page.md`; updated rows in `docs/api/world.md` (backed up as `docs/backup/docs/api/world.md.before`).
- **Backups this run:** `index.html.before-2c`, `css/bb.css.before-2b`, `js/{game,ui,stage,save,main}.js.before-2b`, `js/{packs,court,world}.js.before-2a`, `js/food/diner.js.before`, `tests/dom-play.cjs.before-2b`, `tools/review-frames.cjs.before-2a` and `tools/review_compose.py.before-2a`, all under `docs/backup/`.

## The one-switch flake: found and fixed
I reproduced it with three Auto Scan runs at once:
- The scan sat on the blank for 90 s with nothing parked, braked, held or waiting.
- **Cause:** the hub's `shared/choice-scan.js` arms each step with `due = Date.now() + interval`. A timer that wakes before `due` is dropped and nothing new is armed.
- Node's timers count from libuv's cached loop time, which lags `Date.now()` on a busy machine, so the scan stopped for good.
- **Proof** (scratchpad script): with a 400 ms clock lag the hub scan made 0 moves in 6 s; one press and release brought it back.
- **Driver fix:** its timers now behave like a browser's and never wake early.
- **Page fix:** ui.js's guard gives a stalled scan its clock back, which protects real players too.
- **Check:** three runs at once now pass, and a new `clockLag` run proves the guard works.

## Format / API
Full details are in `docs/api/page.md`:
- the modules and load order;
- the exact `index.html` lines that wire in a restaurant (`js/food/<id>.js` in the world block; `pack.js`, `script.js` and `voice/manifest.js`);
- `BB.packs`, `BB.game`, the run counter, the card ids and items, and the court hooks page-2 must keep;
- the counter layout numbers;
- the driver and review-frames options.

## Tests (run from the game folder)
- `node --test "tests/*.test.cjs"`: 226 tests, 226 pass, 0 fail, 0 skipped, 0 todo.
- `JSDOM=… node tests/dom-play.cjs` (final, with every change in): 16 runs, 16 ok, "every run reached the results board with no script errors".
- **The earlier full run:** 14 of 15. Motion Full failed with "no sauce was squirted": a 1-star order keeps at most two optional toppings, so whether a sauce is on the ticket was luck. The driver now adds the first sauce anyway. Re-run alone: ok, 4 squirts.
- **One switch, three at once:**
  - First batch: 2 of 3, which reproduced the flake.
  - After the fix: 3 of 3, plus the `clockLag` run 1 of 1, all while the full suite and the frames were also running.
- `node tests/dom-play.cjs "counter at"`: 4 of 4.
- `node tests/dom-play.cjs "saved shift left alone"`: 1 of 1.
- `node tools/review-frames.cjs art-source/review/page1-frames --pack diner`, then `python tools/review_compose.py … --guides`: 50 frames and 7 sheets.

## Hub rulebook over the spec
Readability comes before "nothing covers the queue" (ACCESSIBILITY §10, status stays readable at every size). At Extra Large text a bubble too tall for the room above the queue hangs from the top of the screen. A receipt with several mistakes can reach the queue's heads.

## Not done
- **The real court:** that is page-2's, so `js/court.js` is still the stand-in.
- **The pizza:** not wired into `index.html`; that is integrate's.
- **"More…" pages:** wired, but no loaded pack pages a pick, so no driver run covers them.
- **jsdom has no layout**, so real bubble heights are not measured.

## Requests
1. **integrate (owner of `packs/diner/pack.js`):** set the theme's `panelTop: '#626c75'`, `panelBottom: '#3f464c'` and `panelLip: '#23282c'`, and update `docs/api/packs/diner.md` §14. Until then the diner's own theme keeps the old light panel.
2. **integrate:**
   - Wire in the pizza (page.md §2), then run `dom-play --pack pizza` and `review-frames --pack pizza`.
   - The pizza counter's `maxX 0.55` lets a second item reach about 61% of a 16:9 window. The painted queue starts at 52% of the picture, which the counter runs check, so lower `maxX` or use `minScreenX`.
3. **Coordinator (hub shared code; lanes may not edit it):** in `shared/choice-scan.js` `arm()`, arm again for the rest of the time when the timer wakes before `due`. Every hub game with one-switch scanning can stall this way.
4. **page-2:**
   - Keep the hooks in page.md §6.
   - Play the court's moments:
     - `pa` speaks before Mitch on a gold sign or a grand opening;
     - every drawn regular and local says `court.cheer` at the celebration;
     - Mitch says `court.return` only when `nextGoal().key` changes.
   - Show `#back5` as the court's Pause stop.
   - Put the tutorial picker on the court.
5. **World lane (`tests/food.test.cjs`), optional:** a Node check that the counter's order stays on screen and left of 52% at all four window shapes.

Files are in `C:/Users/ass/OneDrive/BEN'S SOFTWARE/Documents/Python Projects/Benny's PC Hub/bennyshub/apps/games/BENSFOODCOURT/`:
- `js/food/diner.js`
- `js/world.js`
- `js/stage.js`
- `js/ui.js`
- `js/game.js`
- `css/bb.css`
- `tests/dom-play.cjs`
- `tools/review-frames.cjs`
- `tools/review_compose.py`
- `docs/api/page.md`
- `docs/api/world.md`
- `art-source/review/page1-frames/`
