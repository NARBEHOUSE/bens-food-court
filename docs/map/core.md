<!-- Engine map, 2026-11-08: Rules engine (js/core). Written by a read-only mapping agent. -->

# Rules engine map: js/core/*.js and the pack format

Base folder: `C:/Users/ass/OneDrive/BEN'S SOFTWARE/Documents/Python Projects/Benny's PC Hub/bennyshub/apps/games/BENSFOODCOURT/`. Every file:line below is relative to it. Every core function takes `pack` as its first argument and keeps no state in the module, so the API can already serve more than one pack. The single-pack assumptions are in the data rules, the wording, the saves and the code that calls the core.

## Pack format (packs/diner/pack.js, tests/packs/test-pizza/pack.js)

- **Top level:** `id`, `version` (changing it drops saved shifts), `name`.
- **Cooking stages:**
  - `stageSets.x = { stages: [start … end], choose: [Simple options, at most 4] }`.
  - `stageNames` is one flat map for the whole pack.
  - `cookSpeeds: { verySlow, slow, normal }` (seconds per stage) and `wantedScale`.
  - `sizeSets.x = [{ id, name }]` (pack.js:34-47).
- **Ingredients:** `ingredients.x = { name, plural?, stages?, sizes?, each?, sauce?, layers?, look: { shape } }`. `each` puts one copy on every cooked ingredient of that kind (cheese on each patty).
- **Stations:** `stations.x = { name, backdrop, redo, builds?: { on, base, cap }, steps }`.
- **Picks:** `picks.x = { values, normal, fancy? }`.
- **Recipes:** `recipes.x = { name, plural, price, unlock, milestone, rare?, stations, item }`.
  - `unlock` 0 or missing means a starter recipe.
  - `item = { ing: id|{pick}, nameFrom?: 'flavour', size?, done?, parts: [{ ing: id|{pick}, done?, opt?: 'in'|'out' }] }`.
- **Order styles:** `orderStyles.{simple,usual,fancy} = { items: [lo, hi], change, more?, maxOptional?, fancy? }`.
- **Gross-outs:** `gross: [{ id, on, say, fx }]`, plus `grossRate` and `grossMax`.
- **Other:** `manager`, `poses`, `tutorial: { customer, items: [{ recipe, set, hold }], gross: { item, ing, event } }`, `backdrops`. `dailySpecialBonus` is never read by the core.
- **Customer:** `{ id, name, art, tts, likes: [[rid, weight]], usual: [{ recipe, set }], always, dislikes: [ing], favourite: { recipe, bonus }, twin, short, exact, newest, set, wants, tipScale, threeStarScale }`. A customer with no `art` never comes in.

## Step kinds (line.js)

Answers are stored in `item.answers['<sid>.<n>']` (`keyOf`, line.js:26).

- **add `{ ing, max? }`**
  - Options are `add`, `skip`, and `swap` only when a gross-out is waiting on this step (line.js:159-166).
  - With `max` above 1, `add` stays on the same step (fresh false) until it reaches max (line.js:247).
  - `skip` ends the step; it is labelled Done once one has been added (words.js:239).
  - The answer is a count.
- **cook `{ ing? }`**
  - What it cooks (`cookIng`, line.js:37-43): `step.ing`; otherwise the answer to the station's first `from` pick, wherever that pick sits; otherwise `spec.ing`.
  - Simple offers `cook:<stage>` for each `choose` stage (line.js:176). Timed offers only `takeOff` (line.js:171-175).
  - If the step has an `ing` and none was added at this station, the step is passed with the answer `null` and a `nothingToCook` event (line.js:110-114, 125-130).
  - The answer is a stage.
- **pick** (`pickValues`, line.js:45-56)
  - `from: [ing]` offers that list.
  - `of:'size'` offers the ids in the item ingredient's sizeSet.
  - `of:'flavour'` offers `.values` (never `.fancy`) of the recipe's one `{pick}` part.
  - More than 4 values: the first 3 plus `{ id:'more', row: rest }` (line.js:180). `answer('more')` is refused; the row's items answer `pick:<v>` directly. Rows don't nest and a test caps a row at 5 (pack.test.cjs:62), so a pick can have at most 8 values.
  - A `from` answer also becomes the item's identity: `made()` sets `out.ing` to it (line.js:360), and a cook step with no `ing` in that station cooks it.

**Steps are not filtered per recipe.** A recipe only names its stations (`stationsOf`, line.js:27). `settle()` (line.js:118-151) runs every step of each of those stations for every item. "Not in this recipe" just means the expected answer is 0, so Skip is right. Every burger is asked all nine toppings, and the Fries recipe still asks fries or rings. `nothingToCook` is the only step that passes itself.

## An order, its questions and answers (line.js)

- **`create(pack, { customer, items: [Spec] }, { gross: { item, ing, event }, tutorial, settings })`** (line.js:76-91) returns plain JSON:
  `{ ticket, items: [{ spec, answers, gross: [{ ing, event, key }], swaps }], at: { item, st, step }, phase: line|review|served, pending, tutorial, redo, timer: { key, s, t }, fresh }`.
- **`question()`** returns `{ kind, item, station, step, key, fresh, options: [{ id, value?, row? }] }`, plus:
  - add: `ing`, `max`, `have`, `offer`, `gross`
  - cook: `ing`, `count`, `timed`, `stage`
  - pick: `of`
  - At review it returns `{ kind:'review', fresh, options }`.
- **`answer()`** returns one of:
  - `{ events }`
  - `{ refused: true }`, with nothing changed
  - `{ warn, events: [] }` in the tutorial, with nothing applied
- **Events:** added, skipped, swapped, grossServed, cooked, picked, nothingToCook, cooking, phase, phaseDone, review, redo, served. `tick` adds stage and nearly.
- **Flow:** items run in ticket order and stations in recipe order, then one review for the whole order.
- **`made()`** (line.js:334-380) returns `{ recipe, ing, size?, done?, parts: [{ ing, done?, layer?, flavour?, gross? }], gross }`.
  - A station with `builds` stacks the base, then each cooked part followed by one copy of its `each` ingredient, then the rest, then the cap.
  - The `cooked` list spans all stations and is never reset (line.js:337), so it assumes one building station per recipe.

## Expected answers, the judge, review and redo

**`expected()`** (line.js:58-71):

| Step | What the ticket wants |
|---|---|
| add | `min(parts with that ingredient, max or 1)`. Parts beyond `max` are capped without any warning. |
| cook with `ing` | that part's `done` |
| cook without `ing` | `spec.done` |
| pick `from` | the list value equal to `spec.ing` or to a part |
| pick size | `spec.size` |
| pick flavour | the first part marked `flavour: true` |

**`judge.mistakes`** (judge.js:22-45) walks every step:
- add with max above 1: a `count` mistake, n = abs(got − want).
- other adds: `extra` (with `held` when the ingredient is in `spec.holds`) or `missing`.
- cook: `done`, only when both want and got exist and differ. A recipe with no `done` can never be wrong on cooking, even Charred in Timed.
- pick: `pick`.
- each gross-out served: `gross`.

**`score`** (judge.js:50-61):
- Stars: 3 for no mistakes, 2 for one or two, 1 for more.
- Tip: `max(1, round(sum of prices × (0.6 + 0.2 × stars) × tipScale × threeStarScale at 3 stars)) + favourite.bonus`.
- In the tutorial, `warning()` (line.js:200-216) runs the same comparison before a choice is applied.

**`reviewOptions`** (line.js:187-196):
- With 3 or fewer redo choices: `serve` plus `redo:<i>:<sid>` for each item and station.
- Otherwise: `serve` plus a row of the items; an item with more than one station gets its own `redo:<i>` row.
- An order with more than 5 items overflows that row.

**`review()`** (line.js:278-296):
- The redo id is matched with `\w+`, so station ids can't contain `-`.
- A redo wipes that station's answers and gross-out records, reruns only that station, then returns to the review (line.js:140-145).
- A pending gross-out is not offered again.

## Timed cooking

- Timed only applies when `settings.cooking === 'timed'` and it is not the tutorial (line.js:33).
- Reaching a cook step starts `timer { key, s: 0, t: 0 }` (line.js:132-135).
- **`tick(pack, o, dt, settings)`** (line.js:301-319):
  - Each stage lasts `cookSpeeds[speed]`, falling back to verySlow.
  - The ticket's stage lasts `wantedScale` times as long.
  - It emits `stage`, and `nearly` one stage before the wanted one.
  - Food stops at the last stage.
- `takeOff` records whatever stage the food is at, including raw or charred.
- `timerProgress` drives the gauge (line.js:321-329).
- Speeds and the scale belong to the pack, not to each stage set.

## Orders (orders.js)

**`order(pack, s, { customer, style, recipes, special, newest })`** (orders.js:92-124):
- The style is `orderStyles[settings.orders]` and nothing else (shift.js:89).
- Item count: start at `lo`, then add one per `more` chance, up to `hi`.
- Customer rules:
  - `short` caps the order at 1 item.
  - `twin` gives exactly two identical items when `hi` is at least 2.
  - `usual` gives the fixed order.
  - Everyone else gets their `always` recipes, then `newest`, then distinct recipes by weight: `likes` weight, else 0.5; `rare` recipes 0.1; +2 for `special`.
- shift.js never passes `special` or `newest`, so Reginald's `newest` and `dailySpecialBonus` do nothing.

**`resolve(pack, rid, s, ctx)`** (orders.js:29-77) returns a Spec `{ recipe, ing, size?, done?, parts: [{ ing, done?, flavour? }], holds, adds, with? }`:
- Each pick name is chosen once per item (orders.js:38): a random value at `change` odds (the fancy list under a fancy style), else `normal`. `set` overrides it.
- `opt:'in'` parts are held for a dislike or at `change × 0.5` odds.
- `opt:'out'` parts are added at `change × 0.4` odds unless disliked.
- `maxOptional` trims the optional parts down to `with`.
- Every `{pick}` part is flagged `flavour` (orders.js:56).
- `exact` raises `change` to at least 0.5.

**rng.js:** a seeded generator whose state is kept in `s.rng` (rng.js:14-19). The core never calls Math.random.

## Shifts and gross-outs (shift.js)

**`create(pack, { seed, settings: { cooking, speed, orders, shiftLength }, milestone | recipes, tutorial })`** (shift.js:27-53) returns `{ v, pack, packVersion, rng, seed, settings, tutorial, recipes, length, n, queue, grossPlan, results, coins, order, done }`.
- **Recipes:** those with `milestone` up to `opts.milestone || 2` (shift.js:23, 33). game.js:13 passes 2.
- **Queue:** customers with `art`, in shuffled rounds; everyone once before anyone twice, never the same one back to back (shift.js:38-45).
- **Tutorial:** length 1, queue `[tutorial.customer]` (shift.js:37).
- **Gross plan:** never the first order, `grossRate` odds per order, at most `grossMax` (shift.js:46-51).

**`next()`** (shift.js:80-94):
- Tutorial items are `resolve` with change 0 and `set`, then `hold`, plus `tutorial.gross`.
- Otherwise it calls `orders.order`.
- **`placeGross()`** (shift.js:56-70) picks evenly among the (item, ingredient) pairs where the ingredient is on the ticket, sits on an add step and is listed by some event. It then picks the event evenly.

**On the line**, `pending` matches the item and the ingredient on an add step (line.js:99-102):
- Add serves the bad one.
- Skip sends it back.
- Swap clears it and asks again.

**`serve()`** (shift.js:101-117) returns `{ customer, name, recipes, stars, count, tip, favourite, grossServed, swaps }` and stores `s.last = { order, score }`. **`results()`** returns `{ orders, coins, stars, threeStars, best }`.

## Words and script limits that bind every pack

- **The ticket.** `spelled()` (words.js:85-97) prints only:
  - the head: the recipe name, or the flavour name with `nameFrom`, after the size
  - counts of ingredients that cook
  - `done`
  - the add-step ingredients, de-duplicated

  Other picks, and how many of an ingredient that doesn't cook, never reach the ticket.
- **Numbers.**
  - NUMBER ends at six and ORDINAL at "a fifth" (words.js:20-21).
  - `orderParts` produces `text: undefined` for groups of 7 or more (words.js:119).
  - `allOrderParts` lists only `count.2` and `count.3` (words.js:151).
- **Diner wording.** "How done?" and "Take It Off" (words.js:220-221, 243), "Ring It Up" (253), "Empty cup" (184), "Drink" in pick mistakes (276).
- **script.js.**
  - `candidates()` adds the shared `customer` lines when a speaker has fewer than two of their own (script.js:51-56).
  - Clip ids are `speaker/[who.]id[.value]`, with no pack in them (script.js:61-64).
  - `valuesFor` (script.js:69-76) gives: for `want`, every `choose` stage; for `ing`, an event's `on` list or every add with max 1; for `each:'event'`, nothing.
  - Speaker names come from `pack.regulars` plus the manager (script.js:115).

## Saves (savefmt.js, progress.js)

**savefmt.js:**
- Keys: `bb-settings` (one for the whole game), `bb-progress:<pack>`, `bb-shift:<pack>` (savefmt.js:19).
- Each record is `{ v, kind, pack, packVersion, data }`.
- VERSIONS: settings 2, progress 1, shift 1. The shift version is defined again at shift.js:19.
- DEFAULT_SETTINGS (savefmt.js:22-35): cooking, speed, shiftLength, orders, manager, characterVoices, theme, motion, textSize, graphics, sfx, music. The only migration is settings 1 to 2 (savefmt.js:39-51).
- `read()` (savefmt.js:59-82):
  - A record of another kind, or from a newer version, is left untouched.
  - Settings are merged onto the defaults and the pack is ignored.
  - A record from another pack is left untouched.
  - When the pack version changes, the shift is dropped and progress `unlocked`/`order` are filtered to known recipes. That filter also drops bought extras and upgrades (savefmt.js:76-78).
- `wrap()` needs a pack even for settings.

**progress.js:**
- `create()` returns `{ v, coins, unlocked, order, decor, decorOwned, best: { rid: stars }, visitors, regulars, shifts }`. game.js:76 and 500 add `tutorialOffered` and `tutorialDone` on top.
- `shop` and `buy` handle recipes, extras, upgrades and decor; no pack defines extras, upgrades or decor.
- `addShift` reads `shift.served[].customer.id` (progress.js:76). A shift actually has `results[]` with `customer` as a plain string, so `addShift` would throw. Nothing calls it: game.js:499 adds the coins itself.
- Nothing stores restaurant stars, popularity or any court state.

## schema.validate (schema.js:16-144)

**What it checks:**
- **Pack:** an id and a numeric version.
- **Stage sets:** at least 2 named stages; `choose` non-empty, inside `stages`, at most 4.
- **Ingredients:** a name, known stage and size sets, a known `each`, a `look.shape`.
- **Stations:**
  - a name and steps; known `builds` ingredients; kinds add, cook or pick
  - add: a known ingredient, `max` at least 1, and a later cook step in the same station for any ingredient that cooks
  - cook: an `ing` must be one that cooks; a cook with no `ing` and no earlier `from` pick needs every recipe through that station to have an item that cooks
  - pick: either `from` with at least 2 known ingredients (ones that cook, if the station has a cook with no `ing`), or `of` size or flavour
- **Picks:** `normal` is one of the values.
- **Recipes:**
  - at least one starter
  - each has a price, name and known stations
  - its item is made by its stations (or is `builds.on`)
  - a size needs a station that picks size, and a valid size
  - stages are valid; parts are made by its stations; `opt` is in or out
  - a flavour pick needs exactly one `{pick}` part
- **Gross-outs:** an id, `say`, and `on` ingredients that each sit on some Add step.
- **Cast:** customer poses exist; regulars have unique ids and valid references; a favourite has a bonus above 0; someone has art; the manager has art.
- **Tutorial:** its customer, recipes and gross-out are consistent.

**What it does not check:**
- orderStyles and cookSpeeds
- that wanted stages are inside `choose` (otherwise Simple can't make them)
- that a flavour `fancy` list is inside the line's `.values` (line.js:53 against orders.js:23)
- part counts at most the add step's `max`
- at most 8 pick values
- station ids matching `\w+`
- the pick names in `set`/`wants`
- that a `done` exists for every cook step the judge checks

A test guard (pack.test.cjs:28-35) fails if any core file quotes a pack's ingredient, station or recipe id.

## What the engine cannot express

1. **Several picks per item.** Pizza crust, sauce and slices; coffee drink and milk; sushi roll and rice; burrito style, rice, beans, protein and hot sauce; donut dough and glaze.
   - `from` re-identifies the item (line.js:360).
   - `flavour` is limited to one per recipe (schema.js:104, line.js:68).
   - `size` is a single sizeSet.
   - Values must be ingredients (schema.js:64), so "None" has to be a fake ingredient.
   - None of these picks reach the ticket.
2. **Repeated flavour picks** (ice cream scoops).
   - Picks have no max and no Done.
   - Only one value per pick name per item (orders.js:38).
   - `expected` reads only the first flavour part.
3. **Slicing as a pick after the oven.** The step order is allowed, but the value must be a fake ingredient, it re-identifies the item if it is a `from` pick, and it is missing from both the ticket and the review (words.js:199).
4. **Steps for only some recipes.** Milk only on espresso drinks; toasting only for a burrito, not a bowl; cone or cup. There is no `when`.
5. **Cooking that isn't a doneness or a single stop.**
   - Simple always asks (line.js:176; `choose` is required, schema.js:26), so there is no automatic espresso pour and no "rolls and slices with a flourish".
   - No timing with several stops (the knife on each cut line).
   - Speeds are set per pack only.
   - A picked part can't be cooked to its own doneness (the burrito protein, line.js:63).
   - There is no automatic step (wrapping).
6. **Gross-outs anywhere but Add steps** (line.js:101, shift.js:61). This rules out burnt crust or coffee, spoiled milk, hair in the rice or beans, soggy seaweed, a burst burrito, freezer burn and a sock in the blender.
7. **Counts on the ticket** for anything that doesn't cook, and numbers past six: extra shots, protein, a dozen donuts, ten scoops.
8. **Order complexity from the restaurant's stars.**
   - Style comes only from `settings.orders` (shift.js:89).
   - Recipes are gated by `milestone` (shift.js:23).
   - Gross-outs happen from the very first shift (shift.js:46-51).
   - There is no `level` anywhere.
9. **Combos** ("a coffee and a donut together"). The engine picks distinct weighted recipes with no course (orders.js:115-123). Separate coffee and donut stations already work, the way the diner's grill, fryer and drinks do.
10. **Ridiculous orders.** There is no named template with its own spoken line, no ingredient outside the recipe template (ketchup on ice cream), and no halves, nesting, reversed stacks or another restaurant's recipe.
11. **Special visitors.** Every customer with art rotates through (shift.js:38-45). There is no star minimum, rarity, one-per-shift visitor, or two customers on one ticket.
12. **Five-star events.**
    - Only normal and tutorial shifts exist.
    - The fixed-order code path is tied to `s.tutorial`, which turns warnings on, forces Simple and sets length 1.
    - A group order of more than 5 items overflows the review row (line.js:191-195).
13. **Court state.** Stars that never go down, popularity, unlocks, whether each restaurant's tutorial was seen, the celebration, and keeping coins when leaving mid-shift.
14. **A shared cast.**
    - Regulars are written into each pack.
    - Dislikes are ingredient ids (orders.js:59, 62), so Sal's lettuce and "rabbit food" can't follow him across menus.
    - Clip ids aren't separated by pack.

## Code outside js/core that assumes one pack

- **`BBPacks.diner`:** game.js:11, save.js:10, stage.js:12, world.js:15, audio.js:12.
- **`packs/diner/` paths:** stage.js:22, 24, 49; audio.js:20, 57; index.html:64-67.
- **In game.js:**
  - line 13: `MILESTONE`
  - line 203: `'fly'`
  - line 265: tutorial moments keyed on `'grill'`
  - line 330: the `'grill'` scene
  - line 499: coins are kept only at the end of a shift
  - lines 533-536: burger help text
- **The More… row is broken on the page.** A pick's More… option gets no `rowItems` (game.js:217), so selecting it enters an empty row (ui.js:123).

## To support the Food Court

1. **line.js: slots.**
   - New step shape: `{ kind:'pick', slot, repeat?: { max } }`, with `pack.slots.x = { values: [{ id, name, look }], none?, say }`.
   - The Spec gains `picks.{slot}` (an array for repeats).
   - `expected()` reads it by index; repeats offer `done` after the first.
   - `made()` fills `out.picks` and leaves `out.ing` alone.
   - Keep `from`/`of` for the diner.
2. **line.js: `step.when`** (`{ recipes }` or `{ slot, in }`). `settle()` passes steps that don't match with a `null` answer, like nothingToCook, and the judge skips them.
3. **line.js: cooking.**
   - `step.want` names which doneness it is judged on: `spec.dones[key]`, falling back to `spec.done`.
   - `step.ing: { slot }` cooks a picked part.
   - Per-stage-set `speed` and `wantedScale` (line.js:307-308, 327-328).
   - `stageSets.x.simple: 'auto'`: in Simple, apply the ticket's stage and emit an `auto` event.
   - A new `auto` step kind for wrapping and flourishes.
4. **line.js: paging.** Split item rows over 4 and picks over 8 values with `more` (line.js:180, 191-195).
5. **Gross-outs on any step.** Events get `step: add|pick|cook|auto`. `grossHere` (line.js:99-102) and `placeGross` (shift.js:56-70) match on item plus step key.
6. **orders.js.**
   - `ctx.styleSpec`, so a star level can carry its own style object.
   - `recipe.course` plus `ctx.combos`.
   - `{ pick, each: true }` and `{ pick, count: [lo, hi] }`.
   - `pack.oddOrders: [{ id, level, recipe, set, holds, adds, extra, say }]`, applied by a new `applyOdd(pack, spec, tpl)` that sets `spec.odd`.
   - Dislikes by tag: `ingredients.x.tags` and `C.dislikeTags`.
7. **shift.js.**
   - `create(pack, { level, event })`.
   - `recipesFor(pack, { level, unlocked })`, using `recipe.level`.
   - `pack.levels[n] = { style, combos, grossRate, grossMax, oddRate, visitorRate }`.
   - At most one visitor per shift (`visitor: true, level`), never first.
   - `pack.events[id] = { name, customers, orders: [{ customer, items: [{ recipe, set, hold, add }], say }], gross }`, built through a `fixedItems()` split out of the tutorial branch (shift.js:85-87).
   - `bank(s)` for leaving mid-shift.
   - `results()` gains `event` and `avgStars`.
8. **New js/core/court.js, with data in packs/court.js.**
   - Data: `restaurants: [{ pack, name, open }]`, unlock steps `[{all:3},{all:4},{all:5},{all:5}]`, unlock order Smoothie, Burritos, Sushi, Ice Cream.
   - Functions: `create(court)`; `addShift(court, g, packId, results)` returning `{ starsUp, opened, celebrate }`; `level(g, packId)`; `isOpen()`; `nextGoal()` for Mitch's line and the progress board.
   - The rule for earning a star is still a design decision. The proposal says good shifts, never down, and five stars through the event.
9. **savefmt.js.**
   - A global `court` kind (`bb-court`, no pack check).
   - A settings v3 migration, for example `orders: 'auto'` to follow the stars, plus volume settings.
   - `wrap(kind, pack|null)`.
   - Keep extras and upgrades when the pack version changes.
   - One shift VERSION.
10. **progress.js.** Rewrite `addShift` to read `s.results`, or delete it. Put `tutorialOffered`, `tutorialDone` and `tutorialSeen` in `create`.
11. **words.js.**
    - Slots in the ticket, the customer's order, the review and the order parts.
    - Counts for repeats of things that don't cook.
    - Numbers up to twelve, with a guard beyond that.
    - `pack.words` or stage-set `ask`/`stop` to replace the diner wording.
    - `spec.odd` said from its template.
12. **script.js.** `merge(shared, pack)`; clip ids `speaker/<pack>/<id>` for pack lines; values for `each:'event'`; a blank for slot values.
13. **schema.js.** Check every new field plus the unchecked list above, against the merged cast.
14. **packs/cast.js.**
    - Shared personas: `id, name, art, tts, voice, twin, exact, short, tipScale, threeStarScale, dislikeTags`.
    - Each pack lists `regulars: [{ id, likes, usual, favourite, set }]` and its own Mitch art.
    - `castOf`, `regular`, `everyClip` and the schema read the merged view.
15. **Tests.**
    - Run the pack, shift and words loops over every `packs/*`: at most 4 answers, 3 stars in Simple and Timed, the ticket lists slots and repeats, no core file quotes an id.
    - Court unlocks, and stars that never go down.
    - Event and visitor shifts.
