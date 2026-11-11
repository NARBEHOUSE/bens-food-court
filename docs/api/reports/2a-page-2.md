# Phase 2a report: page-2 (2026-11-09)

# page-2 report: the court and the main menu (phase 2a, 2026-11-09)

The real court is built and the main menu now sits over it, as decision 5 asks. Page-1's stand-in, the tutorial picker and the card listing restaurants are all gone. Every check passes:
- the Node suite is 226 of 226;
- the full jsdom driver is 26 of 26 runs;
- the ten court runs and the "leaving" run pass again on the final files.

I read the 52 court review frames myself and retuned the crowd spots from them.

## What I built
All files are in `C:/Users/ass/OneDrive/BEN'S SOFTWARE/Documents/Python Projects/Benny's PC Hub/bennyshub/apps/games/BENSFOODCOURT/`.

**`js/court.js` (rewritten).** The court on its picture.
- **Layout:** `#court` is laid out like object-fit: contain. Without the picture, the storefronts are drawn as coloured shapes.
- **Storefronts:** each has a name plate and a star sign ("★★★☆☆ 3") at Text Size. The star sign also says "Five-star event next", "Shift in progress" or "Grand Opening", in the scan label's own words.
- **Closed restaurants** are desaturated and dimmed, with the shutter down and a "Coming Soon" note. They are never scanned, and neither are restaurants whose pack isn't loaded.
- **The progress board** on the plinth shows `nextGoal().board`.
- **The crowd** follows popularity:
  - each restaurant's own drawn customers stand at the front of its queue, shoppers fill the rest;
  - diners show from head to hips in the seats;
  - shoppers stroll slowly and stand still under Reduced;
  - nobody covers a sign or stands in front of the board over it.
- **Scan:** shops, or the parts of the U, then the Back in 5 sign as Pause. Clicks are hit-tested on each storefront's outline first, then on its box, and the box reaching lower wins in an overlap.
- **Highlight:** the scan frame plus the storefront lifted out of the picture with a thick halo, drawn under every sign. Under Reduced there is a halo but no lift.
- **Moments and camera:** the Grand Opening, the gold sign, the celebration and `court.return`, a zoom in and out (a cut under Reduced), and shopper chatter as captions only.

**`js/ui.js`:**
- The main menu is Play, How to Play, Settings, Exit Game. It says "Ben's Food Court. Play, How to Play, Settings, or Exit Game."
- How to Play shows spec 6.1's exact text, speaks all of it on open, and has one item, Back. Its text shrinks from `--label` toward `--small` only as far as it must to fit (`fitHowto`).
- The court Pause's Main Menu now goes to `BB.court.menu()`.
- The `tutorials` and `court` cards are gone.
- New: `BB.ui.pick(id)`, and a lit part also lights its storefronts.

**Other files:**
- `js/game.js`: Food Court calls `BB.court.show({ from })`; Main Menu and Reset Progress mid-shift call `BB.court.menu()`.
- `js/main.js`: boot ends in `BB.court.menu()`.
- `index.html`: adds `#court` and `#courtCam`.
- `css/bb.css`: the court section, the blur, `titleCard` and `howtoCard`, and Mitch and the announcer's caption on the court.
- `packs/court/court.js`: only the queues, seats and stroll lines changed (checked by diff against the backup). `tests/court.test.cjs` passes 24 of 24.
- `tests/dom-play.cjs`, `tools/review-frames.cjs` and `tools/review_compose.py`, described below.
- `docs/api/page.md`: section 6 is new, and sections 1, 5, 8 and 9 are updated.

**Frames:** `art-source/review/page2-frames/` holds 52 frames and 14 sheets.

**Backups** under `docs/backup/`:
- `index.html.before-2e`, `css/bb.css.before-2d`;
- `js/court.js.before-2c`, `js/{ui,game,stage,main}.js.before-2d`, `js/{save,packs}.js.before-2c`;
- `tests/dom-play.cjs.before-2d`, `tools/review-frames.cjs.before-2c`, `tools/review_compose.py.before-2c`;
- `packs/court/court.js.before-2a`, `docs/api/page.md.before-2a`.

I backed up `stage.js`, `save.js` and `packs.js` but did not change them.

## Format and API
The full description is `docs/api/page.md` section 6.

| Call | What it does |
|---|---|
| `BB.court.menu()` | The main menu over the court, out of focus. |
| `play()` | A 0.6 s focus pull, then the moments, `court.return`, the prompt, and the scan at -1. |
| `show({ from })` | Zooms out of that storefront, then plays the news. |
| `enter(id)` | Zooms in, then `BB.game.enter`. |
| `pause()` / `resume()` | Opens the court Pause / returns to the scan at -1. |
| `help()`, `refresh()` | Help's words; redraw after Reset Progress. |
| `hit(x, y)`, `stops()`, `scene()`, `state()`, `layout()`, `goalKey` | For the checks and the review frames. |

- **Out of focus:** a CSS blur on `#courtCam` of 1.2% of the picture's height, dimmed to 74%, with no canvas work.
- **Page hooks:** `body[data-court]` is `soft` or `focus`; `body[data-court-mode]` gives the court's current mode.
- **Ids:** `shop:<pack>`, `part:<arm>`, `pause`.
- **Prompt:** "Food court." plus anything nobody said aloud.
- **Moments:** sounds and lines in the order the spec and audio.md give. Each line is awaited, the moment is marked `seen` and saved.

## Tests (run from the game folder)
- `node --test "tests/*.test.cjs"`: 226 tests, 226 pass, 0 fail, 0 skipped, 0 todo.
- `JSDOM=… node tests/dom-play.cjs`: 26 of 26, "every run reached its end with no script errors". These are page-1's 16 runs plus 10 new court runs:
  - the whole chain, from the out-of-focus main menu (its items, its words, How to Play, Settings) through a shift and back to the court at -1;
  - the court Pause by sign and by 5 s hold, with Help, Exit's confirm and Main Menu;
  - the focus pull: a cut under Reduced, 617 ms with Motion Full;
  - the Grand Opening, gold sign and celebration, each in order and each once (22 cheers, at most 3 pops a second);
  - the parts of the U with two switches and with Auto Scan;
  - pointer clicks: on an outline, in an overlap, and from inside a part.
- Rerun on the final files: the 10 court runs and "leaving", 11 of 11 ok.
- I fixed a flake in page-1's check: an order that is ridiculous or "the usual" is no longer counted as owing a dislike line, matching game.js. Level 5 failed on it once.
- `node tools/review-frames.cjs art-source/review/page2-frames menu howto settings court tiers moments parts closed tut`, then `python tools/review_compose.py …`. How to Play fits at every size checked:

| Window | Text Size | Lines | Font size |
|---|---|---|---|
| 16:9 | Normal | 8 | 28.2 px |
| 16:9 | Extra Large | 9 | 33.5 px |
| 4:3 | Normal | 7 | 22.5 px |
| 4:3 | Extra Large | 10 | 33.8 px |

  No case scrolls, and none goes below `--small`.

## Hub rulebook over the spec
- **Court parts:** they follow ACCESSIBILITY.md §4 rather than spec 0.8's "each court part opens at -1". A part is a row: it lands on its first storefront and loops through a spoken Back stop, and Back returns to that part. The root and every card do open at -1.

## Choices I made from the art
- **Gold sign:** the picture's gold frame is far too tall for the sign boards, so the gold sign is a gold name plate under the art's star crest.
- **Grand Opening:** the banner hangs across the counter, and its words are on the star sign. At Text Size, words on the banner forced its balloons onto the sign.
- **Scan frame:** trimmed at the Pizza Parlor's left edge (23.6%) and the Cafe's right edge (78.7%), so the brackets stay off the Smoothie Shack's and Sushi's signs.
- **Announcer's caption:** runs along the bottom, so it never covers the sign being announced.

## Not done
- **No browser:** the blur, halo, lift and How to Play's fit were checked through jsdom and the composer's copy of the CSS, not on a real screen.
- **One-switch reading:** in Auto Scan, the hub's scan moves to Back and cuts How to Play's long text. With Wait for Speech off that happens after one scan interval (2 s by default); with it on, after about 10 s. I did not freeze the scan, because that would override the player's hub settings.
- **Pizza:** it isn't wired in yet, so the review frames used stand-ins.
- **Extra Large text:** the board grows over the upper tables and the Burger Bar's queue. This is legibility first.

## Requests
1. **Court-rules owner:**
   - `docs/api/court-rules.md` still describes the tutorial picker and an old scan order, and the header of `packs/court/court.js` still mentions the picker.
   - Optionally move `OUTLINE` and `OPENING` from `js/court.js` into `BBCourt.layout`.
2. **Integrate:** wire in the pizza. The `builtAs` stand-ins step aside automatically when the real pack loads. Then rerun `dom-play` and the court review sessions.
3. **Coordinator:** decide whether long narration such as How to Play should get past the hub's Auto Scan timing (a scan interval, or about 10 s with Wait for Speech); that needs shared code.
4. **Art (phase 3):** a wide, short gold sign and a slimmer Grand Opening banner, if the user wants these in the art itself.
5. **Ben's playtest:** popularity 7 to 10 makes a dense crowd. The counts can be tuned in `BBCourt.crowd`.
