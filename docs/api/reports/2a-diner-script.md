# Phase 2a report: diner-script (2026-11-08)

Everything in the lane is done and verified; nothing further to request. The report:

# diner-script report: Ben's Burger Bar, the full script

## What I built

- **`C:/Users/ass/OneDrive/BEN'S SOFTWARE/Documents/Python Projects/Benny's PC Hub/bennyshub/apps/games/BENSFOODCOURT/packs/diner/script.js`**: 324 lines, the 145 the Burger Bar recorded against (text, id, moment and `each` unchanged, checked line by line against the backup) plus 179 new ones, every new line with a delivery note. Backup: `docs/backup/packs/diner/script.js.before-2a` (`.before` already existed).
- **`packs/diner/pack.js`**: one change, `format: 3` (with a two-line comment) after `version: 3`. Nothing else the script needed. Backup: `docs/backup/packs/diner/pack.js.before-2a`.
- **`docs/api/packs/diner-script.md`** (new): the script in words for the content agents after me: conventions, who has what, what the page does with each moment, the clip list for the voice pass, how to copy it.
- **`docs/api/packs/diner.md`**: section 1's `format` row and section 12 now point at diner-script.md. Backup: `docs/backup/docs/api/packs/diner.md.before`.

No cameo: diner-pack added none, so none was written.

## Format / API summary (details in diner-script.md)

- Ids: kept ones as they were; new ones `<moment>.<n>` (`odd.fivePatties.1`, `arrive.1`, `uniform.1`, `fryer.1`, `cookFryer.1`, `eventIntro.1`, `gag.1`). The cast's `.c<n>` never collide. `plainIds: true` stays.
- One changing blank per line (`{want}` or `{got}`, never both). The diner has no slots, so no line uses `{slot}`/`{value}`; pick complaints say "I said {want}" and fill as "fries", "small", "cola" (verified with real judge mistakes). Count complaints name the patty with no blank, because `SC.varsFor` enumerates `each: 'ing'` over max-1 Add steps and would record the wrong ingredients.
- `order.odd.<id>` lines are the whole order sentence (greet, then this instead of `W.said`), naming the recipe and the ridiculous part; the ticket stays the truth. 'customer' fallback for all three, plus own lines: all seven regulars for fivePatties, six for nothingGreen, four for bunInside.
- `order.dislike`: Sal's two kept; Oakes has five, each a fresh over-researched reason to hate onions, no blanks.
- `order.gag`: Bev's three "for the team" lines (under 8 s) for the event finale; required of nobody here (no locals).
- `visitor.arrive` is an entrance, not an introduction (the cast greet introduces them).
- `uniform`: three jokes about the red shirt, paper hat and the tie and taped badge under them.
- Tutorial second lines fit Marge's bacon cheeseburger (she/the green stuff/"a bun sandwich"); fryer, drinks and cook.fryer have two each though the tutorial never visits them.
- Event lines take `{name}` mid-sentence ("It's {name}.", "{name} fell short."); a failed event is carried by the contestants or Mitch, never the player.
- Restaurant-flavoured extras on top of the cast's: one `smalltalk` per speaker (Delores blocking Sal's cart, Bev's team sprinting round it, the fryer's hum), `goodbye` for Marge, Dale, Oakes, Reginald, Kai.

## Line counts (own lines in packs/diner/script.js; cast greet/smalltalk/goodbye merged in on top)

| speaker | total | react 3/2/1 | gross | complaints | order moments | from cast |
|---|---|---|---|---|---|---|
| mitch | 83 | | gross.* 3/3/3/2/2 | tutorial: every moment 2; warnings 2 each | shift.start 5, end 4, uniform 3, nearly 3, after.* 3/3/3, event.* 2/2/2 | |
| customer | 38 | 3/3/3 | 2 | extra 2, unasked 2, missing 2, tooMany 2, tooFew 2, done 3, pick 2, more 2, gross.* 1 each | odd ×3 | |
| marge | 23 | 3/3/3 | 1 | extra, unasked, missing, done | usual 2, odd 2 | 6/7/6 |
| gus | 22 | 3/3/3 | 1 | extra, unasked, missing, done | twin 2, odd 2 | 6/7/6 |
| bev | 25 | 3/3/3 | 1 | extra, unasked, missing, done | gag 3, odd 2, favourite 2 | 6/6/6 |
| vernon | 22 | 3/3/3 | 1 | extra, unasked, missing, done, pick | odd 3 | 6/6/6 |
| sal | 27 | 3/3/3 | 1 | extra, unasked, missing, done, pick, more | dislike 2, odd 3, favourite 2 | 6/6/6 |
| dale | 21 | 3/3/3 | 1 | extra, unasked, missing, done, pick | odd 2, favourite 2 | 4/5/4 |
| oakes | 25 | 3/3/3 | 1 | extra, unasked, missing, done, pick | dislike 5, odd 3 | 4/5/4 |
| reginald | 19 | 3/3/3 | 1 | extra, unasked, missing, done, pick | visitor.arrive 2 | 4/5/4 |
| kai | 19 | 3/3/3 | 1 | extra, unasked, missing, done, pick | visitor.arrive 2 | 4/5/4 |

Plus diner greet 3 each for the five originals and smalltalk 1 for all nine. Clips to record (merged): 1,984 (1,779 from this file, 205 cast).

## Tests (all from the game folder)

- `BB_PACKS=diner node --test "tests/script.test.cjs"`: **16 tests, 16 pass, 0 fail, 0 skipped** (the diner's coverage test now runs instead of skipping).
- `node --test "tests/*.test.cjs"`: **226 tests, 219 pass, 0 fail, 1 skipped (pizza's script coverage until its pack says format 3), 6 todo (pizza's food module)**. Was 218 pass / 2 skipped before this lane.
- `SC.check` on the merged diner script: `[]`. `SC.coverage`: `[]`. Every blank in every line fills with real pack values (a Node check over all `each` lines and the event name). `schema.validate` on the merged pack with `format: 3`: `[]`.
- Original-line check: 145 of 145 unchanged, 0 duplicate ids, 0 new lines without a delivery note.
- `JSDOM=… node tests/dom-play.cjs`: fails at boot, same as diner-pack reported (`js/ui.js:316`, `G().savedShift()` on an undefined `BB.game`, because `js/game.js:14` reads `pack.poses` from the raw pack). That is page-1's switch-over; no file of mine is involved.

## Hub rulebooks against the spec

None needed. ACCESSIBILITY.md §1 ("not a child, and should not be talked to like one") and the spec's tone rules agree; every line was written to both.

## Not done

- No cameo local at the Burger Bar (none was added by diner-pack; adding one would need pack.js changes beyond my remit and their full line set).
- The jsdom runs cannot be re-checked for the new moments (visitor.arrive, order.odd, uniform, event.*) until page-1's page boots on the merged pack.

## Requests

1. **page-1 (js/game.js):** say `visitor.arrive` before a visitor's greet; a customer's own `order.gag` after the order when they have one (Bev's "for the team" on the event finale, else her team is never mentioned); `order.odd.<id>` instead of the order sentence; `uniform` with the first `shift.start` at a restaurant in a session; `event.*` with `{ name: pack.events.five.name }`. Pass the judge's mistake or the tutorial warning itself as vars.
2. **Owner of js/core/script.js (core-b):** `SC.varsFor` enumerates `from` picks but not the diner's `of: 'size'` / `of: 'flavour'` picks, so the size and drink values of pick complaints (small, medium, large, cola, lemon-lime, orange soda, lemonade, iced tea) are missing from `everyClip` and will play as text to speech after the voice pass. Please add `sizeSets` and the recipes' `of` pick values when `each` is `want`/`got` on a `.pick` moment.
3. **Voice pass (later):** Bev's new lines carry "firm and commanding, not shouted" delivery notes, matching the round-1 picks; her caps are emphasis for captions, not volume.
