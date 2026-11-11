# Phase 2a report: diner-pack (2026-11-08)

I converted the Burger Bar onto the ladder, and the whole diner part of the Node suite passes except for one test that is now out of date (Request 1). The old page fails at boot on the new pack, as expected until page-1 switches it over.

## What I built
- **`packs/diner/pack.js`** (pack version 3), rewritten. Backup: `docs/backup/packs/diner/pack.js.before`.
- **`packs/diner/script.js`**: set `plainIds: true` and moved Mitch's line `cook` from moment `tutorial.cook` to `tutorial.cook.grill`. That rename was the only id the new format forced: `SC.check` flagged it, and nothing else. All 145 lines keep their text and ids. I did not set `format: 3`. Backup: `docs/backup/packs/diner/script.js.before`.
- **`docs/api/packs/diner.md`**: the full template. It covers stations and words, stage sets, recipes, the ladder, odd orders, the event, who orders what, gross-outs, every look, sounds, script coverage, help, theme with measured contrast, the tutorial, press counts, what changed for the player, notes for the page, and how to copy it.

## Format summary
- **Dropped:** `orderStyles`, `grossRate`, `grossMax`, `unlock`, `milestone`, `backdrops`, `poses` (the cast's default map is identical), `dailySpecialBonus`, and every persona field.
- **Unchanged from the old pack (checked by diff):** ingredients, recipe items, picks, gross-outs, board steps, tutorial.
- **Recipe levels:**
  - Level 1: hamburger, cheeseburger.
  - Level 2: bacon cheeseburger, double cheeseburger, fries, onion rings (fryer, with salt).
  - Level 3: fountain drink, lemonade or iced tea, as combos. `courses` is `['main', 'side', 'drink']`.
  - Level 4: the Diner Tower (rare).
  - Event only: `teamStack`, "The Team Stack", with `look: { giant: true }`.
  - `levels: {}`, so the engine's ladder applies as is.
- **Stations:**

  | Station | Backdrop | Tool | Sounds |
  |---|---|---|---|
  | grill | grill | `spatula` | `{ cook: 'sizzle', done: 'flip' }` |
  | board | board | none | defaults (plop; sauces squirt) |
  | fryer | fryer | `basket` | `{ cook: 'fryer', add: 'salt' }` |
  | drinks | drinks | none | `{ done: 'fountain' }` |

- **Stage set words:** patty asks "How done?" with "Take It Off"; fried asks "How crispy?" with "Lift the Basket".
- **Manager:** `{ id: 'mitch', art: 'mitch-burger' }`.
- **Regulars:** marge, gus, bev, vernon, sal, dale, oakes, plus reginald and kai with `visitor: { level: 4 }`. Sal dislikes lettuce; Oakes dislikes onion.
- **Odd orders:** `fivePatties` (level 4, the 3-patty Tower) and `nothingGreen` (level 4, bacon cheeseburger without lettuce or pickles, plus mustard and mayo).
- **Event:** "The Burger Eating Contest". Gus, Sal, Dale, Vernon, Marge and Oakes order as contestants; the finale is Bev's Team Stack, well done, "for the team".
- **Theme:** all 24 tokens set to today's colours. **Help:** one paragraph. **Tutorial:** unchanged.

Things I added or decided beyond the brief:
- **Extra odd order `bunInside` at level 5** (from the proposal and spec 2.3). Delete one entry to drop it.
- **New per-customer settings from DESIGN.md's cast table, no extra presses:** Dale's rings are always extra crispy, Oakes always gets lemonade, Kai's drinks are small.
- **Marge keeps a one-item usual.** A two-item usual with iced tea would let her personality set the item count, which only the level may do.
- **Reginald always orders the Tower,** because "newest" means the first recipe of the highest level.
- **The grill's question is now "How done?"** instead of "Cook the patty. How done?", because the new format requires stage-set words.
- **Priya and Tasha no longer come to the Burger Bar,** per spec 5.4.

## Tests
- **Before converting:** `node --test "tests/*.test.cjs"` gave 212 tests: 208 pass, 0 fail, 4 skipped.
- **After, whole suite:** 226 tests: 216 pass, 1 fail, 3 skipped, 6 todo.
  - The fail is `tests/script.test.cjs:138`, which asserts the diner has no event moments (Request 1).
  - The 6 todo are pizza's food module, which isn't written yet (food-pizza's lane).
  - Every diner test passes: schema, persona/level gating, 4 answers per screen, 3 stars in Simple and Timed, press budget, same presses for every customer, tickets, whole shifts and event, merge, food, cast, voices and station sounds.
- **`BB_PACKS=diner node --test "tests/*.test.cjs"`:** 212 tests: 208 pass, 1 fail (the same one), 3 skipped.
- **Script:** `SC.check` on the merged diner script, including content-cast's new cast script (243 lines), reports no problems.
- **Press counts** (`node -e "console.table(require('./tests/bot.cjs').pressReport('diner'))"`; Simple and Timed are the same at every level, Serve included):

  | Recipe | Levels | Presses |
  |---|---|---|
  | hamburger, cheeseburger | 1–5 | 13 |
  | bacon cheeseburger | 2–5 | 13 |
  | double cheeseburger | 2–5 | 14 |
  | fries, onion rings | 2–5 | 4 |
  | fountain, lemonade | 3–5 | 4 |
  | Tower | 4–5 | 14 |
  | Team Stack | event | 14 |

  Odd orders take 14, 13 and 13. Worst whole orders from the bot shifts:
  - Level 1: 13.
  - Level 2: 14.
  - Levels 3–5: 27 (Gus's two doubles).
  - Event: 28 (two doubles plus one Swap It).
  - The ceiling is 28, which is exactly the budget.
- **`JSDOM=… node tests/dom-play.cjs`:**
  - Before converting, 6 of 7 runs passed. "One switch (Auto Scan 1 s)" already failed: "could not choose add" while the scanner still showed the `tutorialOffer` card.
  - After converting, every run fails at boot. `js/game.js:14` reads `pack.poses` from the raw pack, which now comes from the cast merge, so `BB.game` is never defined. Then `ui.js:316` (`G().savedShift()`) throws and ends the process.
  - I ran Timed, one switch, eight customers and Motion Full separately; each fails the same way. This is page-1's switch-over; I didn't hold the conversion back for it.

## Not done
- The new script lines are diner-script's job. They need: `visitor.arrive`, Oakes's `order.dislike`, the three `order.odd.*` lines, Dale's `react.favourite`, `uniform`, `tutorial.fryer`, `tutorial.drinks`, `tutorial.cook.fryer`, the three `event.*` lines, more `react.3/.2/.1`, and a second line for each Mitch tutorial moment. The full list is in section 12 of diner.md.
- `format: 3` is left for diner-script.

## Hub rulebooks against the spec
I didn't need to follow ACCESSIBILITY.md or GRAPHICS-QUALITY.md against the spec anywhere.

## Requests
1. **Owner of `tests/script.test.cjs` (integrate):** lines 137–138 assert "the live Burger Bar (no event yet): no event moments". The spec gives the diner `events.five`, so please assert the diner has `event.intro` instead, or drop the check.
2. **Owner of `js/core/orders.js`:** `O.canOrder` only checks a recipe's parts, so Oakes (dislikes onion) can still order Onion Rings, where the rings are the item. Please also refuse a recipe whose `item.ing` is disliked; I'll then add `'rings'` to his dislikes.
3. **Owner of `js/core/words.js`:** the fryer's pick prompt reads "Fryer. Fries and Onion Rings?". It should say "or", as slot picks do (the list call at words.js:402). Players hear it for the first time at level 2.
4. **page-1:**
   - Use only the merged pack, and create shifts with `level` and `drawn`. Without a level, a shift now falls back to one plain item.
   - Each scene's picture is its station's `backdrop`. Mitch's pictures are `mitch-burger`.
   - Draw the tools `spatula` and `basket`.
   - bb.css's theme defaults must be exactly the diner theme values (diner.md section 14).
   - Read `help` for Pause > Help.
   - Play the drinks station's `done` (fountain) with the pour, not after it.
   - Say a customer's own `order.gag` line when they have one, at least on the event finale, so Bev's "for the team" is heard.
5. **page / integrate:** today's highlight (#ffd400) is only about 1.1:1 against the panel top colour (#c9d1d8) and 2.1:1 against the panel bottom (#8d969e). Spec 5.6 asks for 3:1.

Files are in the game folder (`bennyshub/apps/games/BENSFOODCOURT`):
- packs/diner/pack.js
- packs/diner/script.js
- docs/api/packs/diner.md
