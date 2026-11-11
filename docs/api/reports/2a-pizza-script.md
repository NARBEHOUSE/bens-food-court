# Phase 2a report: pizza-script (2026-11-08)

## Report: pizza-script (lane content-pizza, script part)

**Built**

- `C:/Users/ass/OneDrive/BEN'S SOFTWARE/Documents/Python Projects/Benny's PC Hub/bennyshub/apps/games/BENSFOODCOURT/packs/pizza/script.js` (new, 371 lines, every line with a `delivery` note; `BBScripts.pizza`, `format: 3`).
- `.../packs/pizza/pack.js`: one change, `format: 3` (backup: `docs/backup/packs/pizza/pack.js.before`). Nothing else in the pack needed fixing.
- `.../docs/api/packs/pizza-script.md` (new): the script in words, the conventions to copy in phase 2b, the counts.
- `.../docs/api/packs/pizza.md`: three small edits (format row, section 12 "written", section 17) (backup: `docs/backup/docs/api/packs/pizza.md.before`).

**Format / API summary** (full detail in pizza-script.md)

- Ids are `<moment>.<n>` verbatim (`react.3.1`, `complain.gross.fly.2`, `tutorial.cook.oven.2`); clip ids come out as `tony/pizza:react.3.1`, `bev/pizza:customer.complain.pick.1.sauce.noSauce`.
- One `each` per line, one varying blank per line: `{ing}`/`{ings}` on Add moments, `{want}` on stage and pick moments. No `complain.done` line mixes `{want}` and `{got}` (the recording would be per want while the words changed with got).
- Pick lines use "for the {slot}, I said {want}" / "the ticket says {slot}: {want}" (pizza-pack's request), so the None sauce reads "for the sauce, I said none" and slices "for the slices, I said 8". With each `'want'`, a pick line records per slot and value (12 clips).
- No line starts with a varying blank (the fill is lower case); `{name}` keeps its case.
- All gross-outs are Add steps, so every gross line uses `{ing}`/`{ings}`. Tony's and Oakes's `order.dislike` name pineapple/onions outright (one dislike each here; reads better, records once).
- `order.gag`: 12–20 words each (8 s at their rates). Tony: pineapple and purism, four lines. Pam: "for twelve" ×4, plus `order.gag.5` "for the whole party" that stays true when she orders the Pizza Party finale.
- `order.odd.*`: two fallbacks each; all eight non-visitors have their own `heartShaped` (each proposing to someone true to them: Harold from bingo, Delores the truck, the team, eleven followers, a research partner…); Tony, Pam, Vernon, Sal, Oakes have more.
- Breeze (cameo) gets his full set here (arrive, greet, smalltalk, goodbye, reactions, complaints) because a cameo's lines live in the pack that brings him; no `order.gag` for him since `order.gag` is locals-at-home only.
- Seven regulars get one restaurant-flavoured `greet` each on top of the cast's.
- Tutorial lines say "he" (Tony is the tutorial customer); `tutorial.cook.oven` names Golden and mentions Pull It Out for Timed.
- Tone: joke on the customer, the food or Mitch; nothing about speed or skill; nobody hurries anyone; PG; Tony's humour is grandeur and passion only; Breeze's is in his words. I followed the hub rulebook against the spec nowhere.

**Counts per speaker and moment** (371 total)

| Speaker | Lines | greet/smalltalk/goodbye | react.3/.2/.1 | gross | Other |
|---|---|---|---|---|---|
| mitch | 71 | | | | shift.start 5, shift.end 4, uniform 3; gross.hair/mouldy/fly 3 each; nearly 2; after.3 3, after.1 3, after.gross 2; tutorial intro/ticket/prep/oven/cook.oven/cut/knotBasket/gross/review/serve 2 each; warn extra/unasked/missing/done/pick/gross/grossSkip 2 each; event intro/celebrate/again 2 each |
| customer | 37 | | 3/3/3 | 2 | complain extra/unasked/missing/done/pick/more 2 each; complain.gross hair/mouldy/fly 2 each; order.odd justCrust/halfAndHalf/heartShaped/allTheWay 2 each |
| tony | 45 | 5/5/4 | 4/3/3 | 2 | dislike 3, gag 4, odd justCrust/heartShaped/allTheWay 1 each, complain extra/unasked/missing/done/pick/more 1 each, complain.gross ×3 |
| pam | 40 | 5/5/4 | 3/3/3 | 1 | gag 5, odd heartShaped/justCrust/halfAndHalf, complain extra/unasked/missing/pick/more, complain.gross ×3 |
| breeze | 29 | 4/4/3 | 3/3/3 | 1 | visitor.arrive 3, complain missing/extra/pick/done, complain.gross.fly |
| marge | 19 | 1 (+cast) | 3/3/3 | 1 | usual 2, odd heartShaped/justCrust, complain extra/missing/pick/done |
| gus | 17 | 1 (+cast) | 3/3/3 | 1 | twin 2, odd heartShaped, complain extra/missing/done |
| bev | 19 | 1 (+cast) | 3/3/3 | 1 | favourite 2, odd heartShaped, complain extra/unasked/missing/pick/done |
| vernon | 19 | 1 (+cast) | 3/3/3 | 1 | odd heartShaped/allTheWay, complain.pick 2, done/extra/missing/more |
| sal | 19 | 1 (+cast) | 3/3/3 | 1 | favourite 2, odd heartShaped/halfAndHalf, complain extra/unasked/missing/done |
| oakes | 21 | 1 (+cast) | 3/3/3 | 1 | dislike 3, odd heartShaped/halfAndHalf, complain extra/unasked/missing/done/pick |
| reginald | 18 | 1 (+cast) | 3/3/3 | 1 | visitor.arrive 3, complain extra/missing/pick/done |
| kai | 17 | cast only | 3/3/3 | 1 | visitor.arrive 3, complain extra/missing/pick/done |

The cast script (`packs/cast/script.js`, format 3) is present and complete, so no greet/smalltalk/goodbye gap for any non-local.

**Tests run** (from the game folder)

| Command | Result |
|---|---|
| `BB_PACKS=pizza node --test "tests/script.test.cjs"` | 16 tests, 16 pass, 0 fail, 0 skipped (the pizza coverage test now runs) |
| `node --test "tests/*.test.cjs"` | 226 tests, 220 pass, 0 fail, 0 skipped, 6 todo (all food-pizza's `js/food/pizza.js`) |
| Direct: `SC.check` / `SC.coverage` / `schema.validate` on the merged pizza | 0 problems / 0 gaps / `[]` |
| Direct: `SC.everyClip` | 2174 clips (1989 from this file, 185 from the cast); 0 clips start lower-case; the only unfilled blanks are the cast's 54 `mention` lines (`{about}` is filled by `pickMention` at play time) |

Spot checks printed: "The sauce! I said none! I remember, I was singing at the time!", "Check the ticket. It says slices: 8.", "Nearly golden. That's what Coach Bev wanted.", "The Pizza Party was a hit! …". I did not run the jsdom driver: index.html does not load the pizza yet (the page lane's).

**Not done**

- Nothing in my lane. `format: 3` is set and the coverage passes.
- The 6 todo tests are food-pizza's module, not the script.

**Requests**

- **integrate / page**: load `packs/pizza/script.js` in index.html. My grep of index.html finds only `packs/diner/script.js`; neither `packs/cast/script.js` nor `packs/court/script.js` is loaded there yet either, despite the coordinator note — please verify.
- **core-b (`SC.everyClip`)**: `nearly.1` uses `{name}` (DESIGN.md's own example, "That's what Marge wanted"). `{name}` is not a varying blank, so `everyClip` lists it once with the *speaker's* name baked in ("That's what Mitch wanted"). For the voice pass, either enumerate the pack's customers for `nearly` lines with `{name}`, or treat `{name}` lines as text-to-speech-only. `nearly.2` has no name and is unaffected. Not a test failure.
- **page (optional)**: at the Pizza Party finale, prefer `pam/pizza:order.gag.5` ("for the whole party") over her "twelve" gags if the page ever chooses a gag deliberately; all five are true enough either way.
- **voice pass**: `order.gag` lines are ≤ 20 words; Tony's `order.gag.1` is 19 words at rate 0.95, so trim it if it overruns 8 s when recorded.
