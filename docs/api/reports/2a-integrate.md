# integrate report: phase 2a pilot finished (2026-11-09)

The Pizza Parlor is now in the page and plays from the court the same way the Burger Bar does. Every test and every driver run passes; I read all the review frames, and one frame problem is still open (the Pizza Parlor's third queue person, below).

All paths are relative to `C:/Users/ass/OneDrive/BEN'S SOFTWARE/Documents/Python Projects/Benny's PC Hub/bennyshub/apps/games/BENSFOODCOURT/`. I backed up every file before editing it, under `docs/backup/`, without overwriting any older backup.

## What I fixed and built

1. **`index.html`** (`.before-2f`):
   - Added `js/food/pizza.js` to the world block, and `packs/pizza/pack.js` and `script.js` after the diner's lines, as page.md §2 says.
   - I left out the voice manifest line. The file doesn't exist, a script that fails to load shows as a console error in a browser, and recorded voices are off anyway. The voice pass adds the line together with the file; page.md §2 now says this.
   - Every script and stylesheet loads, with no console errors. The only warning is three.js's own deprecation notice.

2. **`tests/dom-play.cjs`** (`.before-2e`):
   - **New first run, "the page boots".** It fails on any load error, console error or unexpected warning. It also fails if a `packs/<id>/pack.js`, `script.js` or `js/food/<id>.js` exists on disk but the page doesn't load it.
   - **The whole chain** now goes: main menu over the out-of-focus court → Play → the Burger Bar for a shift → results → Food Court → the Pizza Parlor for a shift → results → back to the court.
   - **12 Pizza Parlor runs:**
     - the first-visit tutorial;
     - Timed with no mistakes (every order 3 stars);
     - Pull It Out held across a stage boundary;
     - one switch;
     - eight customers at level 4;
     - the five-star event, ending with the gold sign;
     - Motion Full (3 dough tosses);
     - the counter at 16:9, 16:10, 4:3 and 21:9;
     - an unlock earned by a pizza shift: the results card says "Ben's Smoothie Shack is open.", then the shop's Grand Opening plays on the court.
   - **Problems the pizza exposed, fixed in the driver:**
     - Dislike lines were only recognised by the diner's clip-id style (`sal/dislike.1`). The pizza's are `tony/pizza:order.dislike.1`, so a run where Tony skipped pineapple failed.
     - Motion Full required a squeeze-bottle squirt, which the pizza doesn't have. It now checks squirts only where a pack has squeeze sauces, and flourishes where a pack has automatic steps.
     - The event and level-4/5 runs seeded the diner by name, so running them at the pizza never reached the event. Seeds can now say `here`, meaning whichever restaurant the run plays.
     - A run can now name its own restaurant, and `--pack` plays every run that names none.
   - **The Timed bot was taking food off almost immediately.** It had a 3% chance per look at the clock to stop, so nearly every Timed order came out raw: every Timed order in the earlier runs scored 2 stars. It now decides once per cooking step whether to make a timing mistake. With no mistakes asked for, it always swaps gross-outs and the run must score 3 stars. Timed now gives 3, 3, 3 at both restaurants.

3. **`tests/pack.test.cjs`** (`.before-2a`): a theme test for every pack (spec 5.6). The highlight (#ffd400) must be at least 3:1 against panelTop, panelBottom, pageBg, board and boardGlow.

4. **`packs/diner/pack.js`** (`.before-2b`) and **`docs/api/packs/diner.md`** §14 (page-1's request): the panel is now #626c75 / #3f464c with lip #23282c. The highlight is 3.7:1 and 6.7:1 against it; it was 1.1:1.

5. **`css/bb.css`** (`.before-2e`) and **`tools/review_compose.py`** (`.before-2d`):
   - The register now stands at the front edge of the counter top (`bottom: min(--prop-b, 2vh)`).
   - At 4:3 it used to cover the legs of the Pizza Parlor's third painted queue person; now it is clear at every window shape.
   - At 16:9 it also rises about 80 px less into both pictures.

6. **Docs:**
   - new `docs/api/pilot.md`;
   - `docs/api/page.md` §2, 7, 8 and 9;
   - `docs/api/packs/pizza.md` §10 "Sets" (the counter is now solved to 0.80);
   - `docs/api/world.md` kit table (`surfaceOf`, `onSurface`);
   - `docs/api/court-rules.md` (no tutorial picker; the new scan order round the U; the part label);
   - the header comment of `packs/court/court.js` (no tutorial picker);
   - saved this run's three reports as `docs/api/reports/2a-page-1.md`, `2a-page-2.md` and `2a-food-pizza.md`.

## Test results (run from the game folder)

- **Node:** `node --test "tests/*.test.cjs"` gives 229 tests, 229 pass, 0 fail, 0 skipped, 0 todo (the 226 from before plus 3 theme tests).
  - With `BB_PACKS=pizza`: 214 tests, 213 pass, 1 skipped. The skip is the diner's manifest test, which `BB_PACKS` leaves out.
- **jsdom driver:** `JSDOM=… node tests/dom-play.cjs`.
  - Before my changes: 26 of 26.
  - After: first set 39 of 39, second set 39 of 39, both ending "every run reached its end with no script errors". Each set took about 32 minutes while other jobs ran alongside.
- **The 25 runs that name no restaurant, played at the pizza:** 25 of 25. This is `--pack pizza` without repeating the pizza's own runs; the runner is `C:/Users/ass/AppData/Local/Temp/claude/4e617c7b76a8b4f0/1b4d6419-b056-4e9b-88c7-478478eb8671/scratchpad/pizza-generic.cjs`. They include:
  - the 5 s Enter hold during an arrival;
  - the page clock falling behind its timers;
  - level 5 and level 4;
  - Pause and Food Court mid-shift;
  - the parts of the U.
- **Food frames:** `node tools/food-frames.cjs pizza art-source/review/integrate-food-pizza guides` made 111 frames; all 36 counter frames fit.
- **Review frames:** `node tools/review-frames.cjs` into `art-source/review/integrate-pizza` (`--pack pizza counter tut timed motion`), `integrate-diner` (`--pack diner`, same sessions) and `integrate-court` (`menu howto settings court tiers moments parts closed`), then `python tools/review_compose.py <dir> --guides`. That is 50 + 50 + 42 frames on 27 sheets, and I read them all.

## Decision 4: both restaurants at 16:9 and 4:3

- **Counter line:** the counter top's back edge is at 85.6% of a 16:9 window and 80% of a 4:3 one. All eight counter runs (four shapes, both restaurants) check this at every review.
- **Served customer:** eyes on the painted horizon, hips at the counter. Gus's head starts at about 29% down a 16:9 screen. Kai shows head and shoulders.
- **The order:** on the counter top, fully on screen and left of the queue. The pizza is 249 x 89 px at 30-49% across on 16:9, and 68 px wide at 21:9.
- **Counter tops:** the diner's steel and cherry red and the pizza's cream top with a red-and-white checked edge both match their pictures' painted counters.
- **Painted queue:** the Burger Bar's is fully clear.
  - The Pizza Parlor's third queue person stands at 73-85% across, but the page assumes the queue sits at 52-76%. The register covering him at 4:3 is fixed.
  - Still open: the four-slip review column touches his hair at 16:9 and covers his forehead at 4:3. Mitch also stands in front of him while he talks, as he does at the Burger Bar at 4:3.
  - I didn't shrink the column. Its slips would drop below ACCESSIBILITY.md's 64 px minimum target size, and moving it higher runs into the customer counter at Extra Large text.

## Decision 5: every item passes

- **Opening:** the game opens on the live court, blurred and dimmed, with the title card sharp over it. The blur is a CSS filter on the court layer, sized at 1.2% of the picture's height; there is no canvas blur.
- **Main menu:** Play, How to Play, Settings, Exit Game (with its confirm), spoken as "Ben's Food Court. Play, How to Play, Settings, or Exit Game."
- **Play:** the court comes into focus in 615-618 ms, or cuts straight in under Reduced motion. Any court moments play, then the storefront scan opens with nothing highlighted. No other card appears.
- **How to Play:** spec 6.1's exact text, all spoken on open, with one Back item to the main menu. It fits without scrolling and never shrinks below Text Size: 9 lines at 33.5 px on 16:9 at Extra Large, 10 lines at 33.8 px on 4:3 at Extra Large.
- **Settings:** the 17 rows over the blurred court; Back returns to the main menu.
- **Main Menu from either Pause:** returns to the card with the court blurred behind it.
- **No tutorial picker anywhere:**
  - there is no Tutorial menu item, picker card, `BB.court.picker` or picker run;
  - the `tut` review session goes through a restaurant's first-visit offer;
  - the driver fails if a picker card ever opens.

  The first-visit offer, the tutorial itself and Restart Tutorial are unchanged.

## Spec 9

| Check | Result |
|---|---|
| Node: every pack validates; at most 4 answers; 3 stars in Simple and Timed; press budget; the judge; tickets; no ids in js/core; court rules; moment coverage; food looks; voices told apart; same presses for everyone | pass |
| The whole chain (both restaurants) | pass |
| Pause in a restaurant and on the court | pass |
| Settings keeps the hub rows | pass |
| First-visit tutorial card | pass, both restaurants |
| An unlock and a five-star event with seeded progress | pass, both restaurants |
| One-switch Auto Scan | pass, both restaurants |
| 5 s Enter hold in an arrival; Timed clock runs after | pass, both restaurants |
| Take It Off held across a stage boundary | pass (diner: Take It Off; pizza: Pull It Out) |
| Every card opens at -1; at most 5 court stops per level | pass |
| Review frames | pass, with the one open finding above |

## Not done

- **Per-picture queue box:** each counter picture's queue should be measured and stored with the pack or its art manifest, so the review column and Mitch can keep clear of it.
- **21:9:** only a 24 px strip of counter top shows, so the order is drawn small there. food-pizza's suggested fix is in `pilot.md` section 7.
- **Driver gaps:** the driver can't yet play "More…" pages or repeat picks. No loaded pack has either, but the Ice Cream Emporium's flavours will.
- **No browser checks:** the blur, highlight halo, ink outlines and real fonts are only approximated by jsdom and the composer. The favicon links point to `bennyshub/images/`, as in every hub game; those files only exist on the website.

## Requests

1. **Coordinator, shared code:**
   - `shared/choice-scan.js` `arm()` should re-arm when a timer wakes early.
   - Long narration such as How to Play gets cut off by Auto Scan's timing.
2. **Coordinator, `js/core`:**
   - `SC.varsFor` misses the diner's `of` picks.
   - `everyClip` lists `{name}` lines only once.
   - `js/core/court.js:282` still has a stale tutorial-picker comment.
3. **Phase 2b agents:**
   - Follow `docs/api/pilot.md`.
   - Measure your counter picture's queue.
   - Name dislike lines `order.dislike.<n>`.
   - Ask the `index.html` owner for your lines; "the page boots" fails until they're in.
   - Add your own named runs and join the chain.
4. **Phase 3 art (optional):** redraw the pizza counter picture with the third queue person inside 52-76% across, if the user prefers that to the layout fix.
