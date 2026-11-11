# Shifts, the ladder, the cast merge and saves (core-b, 2026-11-08)

The API of `js/core/{shift,orders,cast,savefmt,progress,schema}.js` for the page and the tests. The pack format is
`docs/api/pack-format.md`, the script `docs/api/script.md`, the line `docs/api/line.md`, the court's rules
`docs/api/court-rules.md`. Everything here is pure (no DOM, storage, clock or `Math.random`) and loads in Node.

`index.html` loads `js/core/cast.js` and `js/core/schema.js` in a `<!-- core: -->` block **before
`js/core/script.js`** (script.js reads `BB.cast` when it loads). Keep that order.

## 1. Loading a restaurant: `BB.cast`

```js
const pack = BB.cast.merge(BBCast, BBPacks[id]);          // use only merged packs, everywhere
const problems = BB.schema.validate(pack);                // [] when it checks out
const script = BB.script.merge(pack, BBScripts[id], BBScripts.cast);
const drawn = BBCast.drawn(BBArt.cast);                   // customers whose pictures are all there (spec 4.5)
BB.audio.use(pack);
```

- `merge(cast, pack)` -> a copy of the pack: `regulars` with each persona (`PERSONA`: name, art, role, scale, who,
  voice, tts, twin, short, exact, newest, tipScale, threeStarScale) taken **only** from the cast and every other field
  from the pack; `manager` = the cast's manager in the pack's uniform (`art: pack.manager.art`); `poses` = the pack's
  or `BB.cast.POSES` (the Burger Bar's moment -> pose map). A cast visitor gets `visitor: { level: 4 }` unless the
  pack says. Merging twice changes nothing; nothing is mutated.
- Also: `person(pack, id)` (the manager or a customer), `customers(pack)`, `isLocalHere(c)`, `ROLE`,
  `CUSTOMER_ROLES`, `VISITOR_LEVEL`.

## 2. A shift: `BB.shift` (S)

```js
const s = S.create(pack, { seed, level: R.level(C, state, id), drawn, settings: { cooking, speed, orders, shiftLength } });
const ev = S.create(pack, { seed, level: 4, event: 'five', drawn, settings });     // the five-star event
const tut = S.create(pack, { seed: 1, tutorial: true, drawn, settings: Object.assign(settings, { cooking: 'simple' }) });
```

`create(pack, opts)`: `opts = { seed, settings, level, event, drawn, tutorial, recipes? }`.

| opt | What |
|---|---|
| `settings` | `{ cooking: 'simple'\|'timed', speed: 'verySlow'\|'slow'\|'normal', orders: 'stars'\|'one', shiftLength: 3\|5\|8 }` (copied into the shift) |
| `level` | the restaurant's stars, 1-5 (`BB.courtRules.level`). **Leave it out only off the ladder** (old pages, tests): then every recipe but the event's, `pack.orderStyles[settings.orders]`, the pack's `grossRate`/`grossMax`, no visitors or odd orders. `milestone` is ignored now |
| `event` | `'five'` for the five-star event shift (`pack.events.five`); ignored when the pack has none |
| `drawn` | ids who may come in; leave it out to let in everyone with `art` (tests) |
| `tutorial` | the guided order: length 1, always warns, never saved |

What it does (spec 4.3-4.5): recipes by `recipe.level`; the level's style (pack-format.md section 12) and gross-outs;
Order Size `'one'` makes every order one item; combos by course; at levels 4-5 exactly one visitor (never first) when
one is drawn, and at most one odd order (levels' `odd` odds); an event shift has Shift Length orders, the finale last.
A tutorial customer or event orderer who isn't drawn is replaced by the first drawn regular. **Nobody drawn: the shift
comes back finished and empty** (`done: true`, `length: 0`; `next` returns null).

**The shift** is plain JSON: `{ v: 2, pack, packVersion, rng, seed, settings, level, event, tutorial, drawn, recipes,
length, n, queue, plan, grossPlan, results, coins, order, done, counted, last? }`. `plan[i]` marks special orders:
`{ visitor: true }`, `{ odd: <id> }`, `{ finale: true }`.

| Call | Returns |
|---|---|
| `next(pack, s)` | the order on the line (creates it from the queue). Its `ticket` = `{ customer: { id, name, tipScale?, threeStarScale?, favourite? }, items, visitor?: true, odd?: <oddId>, event?: <id>, finale?: true }` |
| `question(pack, s)`, `answer(pack, s, id)` | as `docs/api/line.md` |
| `tick(pack, s, dt, hold)` | Timed: moves the food on; `hold` true while either switch is down freezes the clock (spec 0.7) |
| `serve(pack, s)` | after Serve: `{ customer, name, recipes, stars, count, tip, favourite, grossServed, swaps, visitor?, odd?, finale?, mistakes }`; moves on; `s.done` after the last |
| `results(s)` | spec 4.1: `{ pack, level, event: <id>\|null, tutorial, orders, stars: [1-3 per order], avgStars, coins }` plus `finished, threeStars, best` (level is null off the ladder) |
| `claim(s)` | the results the **first** time a finished shift is claimed; null after (also after a save and reload) and while unfinished |
| `resumable(pack, s)` | a saved shift this restaurant can carry on: same pack and version, not finished, not a tutorial |
| `restart(pack, s, { seed? })` | a new shift with the same level, event, drawn, tutorial and settings (Restart Shift) |
| `levelOf(pack, n)`, `styleFor(pack, s)`, `recipesFor(pack, level)`, `recipeLevel(recipe)`, `castOf(pack, drawn)`, `placeGross` | the pieces, for tests and tools |

**What the page says from the ticket:** `ticket.visitor` -> `visitor.arrive` before the greet; `ticket.odd` -> the
customer says `order.odd.<id>` instead of `W.said()` (the ticket stays the normal one); `ticket.finale` / `ticket.event`
-> the event's own lines. Event shifts: Mitch says `event.intro` (with `{ name: pack.events.five.name }`) before the
first order.

## 3. Leaving, resuming, finishing (spec 4.2), with the court

```js
// entering a restaurant (after the tutorial offer and the event card)
const saved = BB.save.shift.load();                       // savefmt.read('shift', ...) drops other packs and old versions
if (saved && saved.done) { const res = S.claim(saved); if (res) count(res); BB.save.shift.clear(); }   // finished but never counted
else if (saved && S.resumable(pack, saved)) begin(saved, true);   // read the ticket again, then the line
else begin(S.create(pack, {...}), false);
// any route out (Food Court, Main Menu, Exit Game, the hub closing): save the shift as it is; never count it
// Restart Shift (the only route that discards one): begin(S.restart(pack, s), false)
// the shift finishes:
const res = S.claim(s);                                    // once
if (res) { const out = BB.courtRules.addShift(BBCourt, state, pack.id, res); BB.progress.addShift(pack, progress, res); }
BB.save.shift.clear();                                     // or save it (counted) and clear later: claim stays null
```

A tutorial never touches `bb-shift:<pack>`; `claim` on it still returns results with `tutorial: true` (court-rules sets
`tutorialDone` from it; progress adds nothing).

## 4. Orders: `BB.orders` (O)

`order(pack, s, { customer, style, recipes, newest })`, `resolve(pack, recipe, s, ctx)`, `fixed(pack, s, t, { dislikes })`
(an item as written: tutorials, odd orders, the finale), `hold`, `styleOf(pack, style)` (a style object, or a name in
`pack.orderStyles`), `canOrder(pack, recipes, dislikes)` (never a recipe that always comes with a disliked part),
`courses(pack)`, `pickValues`, `grouped`. Item specs are as `docs/api/line.md` section 2.

## 5. Saves: `BB.savefmt` (F) and `BB.progress` (PR)

| Key | Record `{ v, kind, pack, packVersion, data }` |
|---|---|
| `bb-settings` | settings, version 3 (below) |
| `bb-progress:<pack>` | `{ v: 2, coins, shifts }`, version 2 |
| `bb-shift:<pack>` | the shift (section 2), version 2 |
| `bb-court` | the court's (`BB.courtRules`, docs/api/court-rules.md), not here |

- `F.key(kind, pack)` (`pack` a pack or its id), `F.wrap(kind, pack, data)` (`pack` null for settings),
  `F.read(kind, raw, pack)` -> `{ ok: true, data, upgraded?, handoff? }` or `{ ok: false, reason, keep }`
  (`keep`: a newer game's record, or another pack's: leave it), `F.canWrite(kind, stored)`.
- **Settings v3** (`F.DEFAULT_SETTINGS`, in card order): `cooking, speed, shiftLength, orders, manager,
  characterVoices, theme, motion, textSize, sfx`. `orders` is Order Size: `'stars'` (Follow the Stars, the default) or
  `'one'` (One Item). `F.SETTING_VALUES` lists each setting's values (the cycle order); a value outside them reads as
  the default. Version 2 saves: Orders Simple -> `'one'`, Usual and Fancy -> `'stars'`; `music` dropped; `graphics`
  dropped and returned **once** as `read(...).handoff.graphics`: call `NarbeGraphics` `setChoice(handoff.graphics)`,
  then save the settings (version 3 has no handoff).
- `F.resetKeys(localStorageKeys)` -> the keys Reset Progress clears: `bb-court`, every `bb-progress:*` and
  `bb-shift:*` (`F.isProgressKey(k)`).
- `PR.create(pack)` -> `{ v: 2, coins: 0, shifts: 0 }`; `PR.addShift(pack, g, results)` adds a finished shift's coins
  once (pass `S.claim`'s results; a tutorial or empty shift adds nothing) -> `{ coins }`. Nothing spends coins.
  Version 1 progress keeps `coins`, `shifts`, `tutorialOffered`, `tutorialDone` (for `BB.courtRules.migrate`); the
  old shop fields go. `shop`, `buy` and `ids` are gone.

## 6. tests/bot.cjs

`restaurants()` (every `packs/<id>/pack.js` but court, cast and shared, filtered by `BB_PACKS`: `[{ id, raw, pack,
rawScript, script, error }]`, merged), `diner`, `golden` + `GOLDEN_DRAWN` (the frozen Burger Bar and who it drew),
`testPizza` (= `pizza`), `CAST`, `TEST_CAST`, `merge(pack, cast?)`, `scriptDone(pack)`, every core module (`R O L J S W
SC schema F C PR`), the bots (`right`, `random`, `play`, `makeOrder`, `run`, `flat`, `pathTo`), `pressesFor(pack,
items, cooking)`, `itemAt(pack, recipe, level, seed)`, `recipesAt(pack, level)` and `pressReport(packOrId)`.
`tests/fixtures/ladder-pizza.js` is a whole restaurant on the ladder for tests.
