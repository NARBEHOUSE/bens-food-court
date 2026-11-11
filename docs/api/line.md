# The line: steps, slots, the ticket and the judge (core-a, 2026-11-08)

The settled format and API of `js/core/{line,judge,words,orders}.js` and `tests/bot.cjs`. Read this instead of the
code. `tests/packs/test-pizza/pack.js` uses every feature below and is the worked example.

The Burger Bar is unchanged: on the frozen diner (`tests/packs/diner-golden/`) every order, ticket, spoken line,
question, label, event, `made()` field, review sentence, score and receipt line is byte-identical to before
(checked on 55,118 traced lines), apart from the new fields named below.

## 1. Pack format

### Slots: named picks

```js
slots: {
  crust: { name: 'Crust', say: '{value} crust', values: [{ id: 'thin', name: 'Thin' }, { id: 'deepDish', name: 'Deep Dish' }] },
  sauce: { name: 'Sauce', say: '{value} sauce', values: [{ id: 'red', name: 'Red' }, { id: 'bare', name: 'None', say: 'sauce: none' }] },
  dips:  { name: 'Dip', plural: 'Dips', values: [...] },            // a repeat: named for ONE pick
}
```

- `name`: the line's question ("Crust: Thin or Deep Dish?") and the complaint word ({slot}, lower case).
- `values[].id` matches `/^\w+$/`; `values[].name` is the answer's label and the {want} word.
- `say` (optional): how a value reads on the ticket, in the customer's order and in the review. `{value}` is the
  value's name in lower case. **Default: `'<value> <slot name>'`**, so "Thin" → "thin crust".
- `values[].say` (optional): that value's own words. **Give every "None" value one**: the default would read
  "none sauce", and the ticket never says "no X" (spec 0.6), so write e.g. `'sauce: none'`.
- `plural` (optional, repeats): default `name + 's'`. Name a repeat slot for one pick ("Dip", "Scoop"): the
  ticket says "two pesto dips and one ranch dip".

### Steps (in `stations.<sid>.steps`)

| Step | Shape | Answers (ids) | Answer stored |
|---|---|---|---|
| add | `{ kind:'add', ing, max?, when? }` | `add`, `skip` (Done once one is added, max > 1), `swap` | count |
| cook | `{ kind:'cook', ing?, stages?, want?, when? }` | Simple `cook:<stage>`; Timed `takeOff` | stage |
| pick, slot | `{ kind:'pick', slot, repeat?: { max }, when? }` | `pick:<value>`; `done` (repeat, after the first); `swap` | value, or [values] for a repeat |
| pick, diner | `{ kind:'pick', from: [ing] }` or `{ kind:'pick', of:'size'|'flavour' }` | `pick:<value>` | value |
| auto | `{ kind:'auto', id, show, when? }` | none: it runs by itself | `true` |

- **`when`**: `{ recipes: [ids] }` and/or `{ slot, in: [values] }` (both must hold when both are given). It is read
  from the **ticket** (`spec`), never from what was picked, so the same ticket always asks the same steps and the
  ticket can list them. A repeat slot matches when any of its values is in `in`. A step that doesn't apply is passed
  with answer `null` and a `passed` event; the judge skips it; the ticket leaves it out.
- **cook** `stages`: the stage set it uses; without it, its ingredient's (`ingredients.<ing>.stages`, as the diner).
  It cooks `ing` (the parts added at this station), else the station's `from` pick, else the item (`spec.ing`).
  **`want`**: the name of a recipe slot whose value is the wanted stage (`spec.picks[want]`, see 1.4); without it,
  the `ing` part's `done`, else `spec.done`. Use `want` when one item has two cook steps.
- **repeat**: picks the slot again until Done or `max`. No Done before the first pick. Order never matters to the judge.
- **auto**: `id` goes in `made().auto`; `show` names the flourish the page/food module plays. Never judged, never a
  gross-out. Flourishes at the very start of an order run inside `create()`, whose events are not returned.

### Stage sets

```js
stageSets.<x> = { stages: [first … last], choose: [Simple's answers, at most 4],
  ask?: 'How crispy?', stop?: 'Pull It Out', speed?: { verySlow, slow, normal }, wantedScale?: 2, simple?: 'auto' }
```

- `ask`: Simple's question. Prompt: `<Station>. <ask>` on a fresh phase, else `<ask>`. Default: "Cook the patty. How done?"
- `stop`: the Timed button label ("Pull It Out"); spoken "Pull it out. Golden"; prompt "Pull it out when it is
  right." Default: "Take It Off".
- `speed`, `wantedScale`: this set's seconds per stage and the ticket's stage multiplier; default `pack.cookSpeeds`,
  `pack.wantedScale`. (Spec 5.3: at least 12/8/5 s and ×2; the schema enforces it, not the line.)
- `simple: 'auto'`: in Simple (and the tutorial) the step never asks; it cooks to exactly the ticket's stage and
  emits `cooked` with `auto: true`. Timed asks as usual.

### Recipes

`item.slots: { <slot>: value | { pick } | { pick, count: [lo, hi] } }` (a number `count` means `[n, n]`; an array value
is a fixed repeat).

- `{ pick: '<name>' }` names `pack.picks.<name>` (`values`, `normal`, `fancy`) as the diner's `{ pick }` does. When
  the pack lists no pick of that name but has a slot of that name, its values are the slot's and `normal` is the first.
- The value of a `want` slot is a stage of the cook step's stage set.

### Gross-outs (spec 4.6)

```js
gross: [
  { id: 'hair', on: ['mozzarella'], say: '{name} with a hair on it', fx },                    // an Add step, as before
  { id: 'skin', step: 'pick', slot: 'sauce', on: ['red', 'white'], say: '{name} sauce with a skin on it', fx },
]
```

- A pick gross-out names its `slot`; `on` lists the values it can happen to (leave out "None"). `{name}` is the
  value's name in lower case. The bad value is always the one the ticket wants.
- It is offered only on a single (not repeat) slot pick whose values plus Swap It fit on one screen (at most 3
  values). Never on a paged pick, a repeat, a cook step or an auto step: a pending one there is simply never shown.
- Waiting gross-out (`L.create` `opts.gross`, `pack.tutorial.gross`, what `placeGross` returns):
  `{ item, ing, event }` on an Add step; `{ item, slot, event }` on a pick.

## 2. The order item (spec), from orders.js

`{ recipe, ing, size?, done?, picks?, parts, holds, adds, with? }`. `picks` exists only when the recipe has `item.slots`:
`{ <slot>: value | [values] }`.

- A fixed value stays. `{ pick }` is drawn like any pick: `normal`, or at `change` odds a random value (the fancy
  list under a fancy style); `set[<pick name>]` overrides it; each pick name is drawn once per item.
- A repeat draws its count from the **order style**, never the customer: `lo`, plus one per chance (`style.repeat`,
  else `style.more`, else 0.5) up to `hi`; `change` 0 (tutorial, a usual) gives `lo`. Each value is drawn on its own;
  `set` may be one value (all of them) or a list (used in turn). Alike values are put together (`O.grouped`).
- Recipes without `slots` draw exactly the random numbers they did before.

## 3. line.js

- `create(pack, { customer, items: [spec] }, { gross, tutorial, settings })`, `question(pack, o, settings)`,
  `answer(pack, o, id, settings)` → `{ events }` | `{ refused: true }` | `{ warn, events: [] }` (tutorial), as before.
- **`tick(pack, o, dt, settings, hold)`**: `hold` true while either switch is down. The clock then stands still (no
  events, `timerProgress` unchanged), so Take It Off, acting on release, takes the stage that was showing when the
  press began however long the hold. The page passes its keys-down state on every tick. `S.tick` doesn't pass it yet
  (core-b): call `BB.line.tick(pack, s.order, dt, s.settings, hold)` or have `S.tick` forward a 4th argument.
- `timerProgress(pack, o, settings)`: as before, with the set's own speed and scale.
- Helpers: `applies(step, spec)`, `asks(pack, item, sid)` (a station asks this item something), `expected(pack,
  item, sid, n)` (repeat: a list; a step not applying: null), `remaining(want, have)`, `stageSet`, `setIdOf`,
  `stageSeconds`, `wantedScaleOf`, `pickValues`, `cookIng`, `keyOf`, `stationsOf`, `current`, `MAX_ANSWERS` (4), `ROW` (5).

### Questions

All: `{ kind, item, station, step, key, fresh, options }`.

- add: `ing, max, have, offer, gross: { event } | null`.
- cook: `ing, count, set` (the stage set id: read `ask`/`stop`/stages from it), and Timed `timed, stage`.
- slot pick: `of:'slot', slot, gross: { event, value } | null`; a repeat adds `repeat: { max }, have, offer, picked`.
- diner pick: `of: 'ing'|'size'|'flavour'`.
- review: `{ kind:'review', fresh, options }`.

### Paging (never more than 4 answers on a screen)

- A pick: the values, then `done`/`swap`. Too many: the first values and `{ id:'more', row }`. A row holds up to 5;
  past that, 4 and `{ id:'more:2', row }`, and so on (`more:3`…). So up to 8 values need one row, 9 page again.
  A repeat keeps a place for Done from its first pick, so values never move between the screen and the row.
  `more` ids are rows, never answers: answer the value inside directly (`pick:<value>`).
- The review: up to 3 redo choices beside Serve; more go in `{ id:'redo', row }` of the items (an item with more than
  one station is `{ id:'redo:<i>', row }`). A row of more than 4 pages: 4 and `{ id:'more', row }` (`more:2`…).
  A station that asks the item nothing (all passed by `when`, or only flourishes) is never offered.
- The page must give every `row` its own `rowItems` (game.js does it for the review, not yet for picks).

### Events (new ones in bold)

`added, skipped, swapped, grossServed, cooked, picked, nothingToCook, cooking, phase, phaseDone, review, redo, served`;
`tick`: `stage`, `nearly`; and:

- **`passed`** `{ item, station, key }`: a step this ticket does not use.
- **`auto`** `{ item, station, key, id, show }`: a flourish ran.
- `cooked` gains **`auto: true, key`** when Simple cooked a `simple:'auto'` set by itself.
- `picked` for a slot: `{ item, of:'slot', slot, value, n? }` (`n`: picks so far, repeats).
- **`pickDone`** `{ item, slot, values, n }`: Done on a repeat.
- `swapped` / `grossServed` on a pick: `{ item, slot, value, event }` (no `ing`).

### made(pack, o, i)

Every field and meaning as before (`recipe`, `ing` set by a `from` pick or `builds.on`, `size`, `done`, `parts[{ ing,
done?, layer?, flavour?, gross? }]`, `gross`), plus, always present, after the old ones:

- `picks: { <slot>: value | [values in pick order] }`: every slot pick made, and the stage of each cook step with `want`.
- `counts: { <ing>: n }`: each Add step with `max` above 1 that has been answered (the diner's patties included).
- `auto: [ids]`: flourishes that ran, in line order.

`gross` entries for a pick are `{ slot, value, event, key }`.

## 4. judge.js

`mistakes(pack, o)` skips flourishes and steps the ticket doesn't use. Mistakes (each with `item` and `n`):

| kind | shape | when |
|---|---|---|
| extra / missing | `{ ing, held? }` | as before |
| count | `{ ing, want, got }` / `{ of:'slot', slot, want, got }` | Add with max > 1; a repeat with too many or too few (n = the difference) |
| done | `{ ing, want, got }` | any cook step's stage, `want` ones included |
| pick | `{ of:'slot', slot, want, got }` / `{ of, want, got }` | wrong slot value; on a repeat, n = values not on the ticket (order never matters) |
| gross | `{ ing, event }` / `{ slot, value, event }` | a bad thing served |

Tutorial warnings for slot picks: `pick { of:'slot', slot, want, got }`, `gross { slot, value, event }`, `grossSkip
{ slot, want, got, event }`, and on a repeat `tooMany` / `tooFew { of:'slot', slot, want, have }` (counts).

## 5. words.js (now depends on line.js; index.html already loads line.js first)

- **The ticket** (`ticket`, `item`, `spelled`) walks the item's stations and steps in order, skipping steps the ticket
  doesn't use: a cooked Add says how many and how done ("two patties, medium"); a run of Adds is "with …" (an Add with
  max > 1 says its count: "two garlic cloves"); a cook step its stage ("crispy"); a slot pick its value's words; a
  repeat "two pesto dips and one ranch dip"; `from`/`of` picks are the name; flourishes say nothing. "nothing else on
  it" stands where the first run of Adds is when nothing is added anywhere.
  `spelled()` → `{ head, bits, cooked, on }`: **`bits` is the whole line in order** (`ticket` = head + ": " +
  bits); `cooked` (the non-Add bits) and `on` (the Add words) are kept for stage.js until the page reads `bits`.
- **The customer** (`said`, `orderParts`): name, dones, then the slots the order chose (`{ pick }` slots, and every
  `want` stage), then holds/adds. New part ids: `slot.<slot>.<value>`, `slotn.<slot>.<n>.<value>` (repeat groups,
  joined by `and`), `done.<stage>`. `allOrderParts` lists them all.
- **The review** (`made`) walks the same way over what was made; a bad picked value is said by its gross-out.
- **Labels**: a slot value's label is its name, or its gross-out ("Red sauce with a skin on it"); `done` → "Done",
  said "Done, two pesto dips"; `more`/`more:<n>` → "More…". Prompts: "Prep Table. Crust: Thin, Regular or Deep
  Dish?", a repeat's next "A second dip: Ranch, Garlic, more or Done?".
- **Numbers**: `NUMBER` and `ORDINAL` reach twelve; `number(n)` gives digits past twelve, `ordinal(n)` "another".
- **`blanks(pack, m)`**: lower-case words for a mistake's or warning's blanks: `{ ing, ings, slot, want, got, value,
  count }`. A slot pick gives `{ slot:'sauce', want:'white', got:'red' }` ("I said white sauce"); counts give number
  words; dones give stage words.
- `mistake(pack, m)`: receipt lines, e.g. "Sauce: wanted white, got none", "Dips: wanted 2, got 3", "Sauce: red sauce
  with a skin on it".
- New exports: `ORDINAL, number, ordinal, slotName, slotPlural, valueName, valueSay, repeatSay, grossPick, blanks,
  lineSteps`; `list(words, or)` joins with "or" when `or` is true.

## 6. tests/bot.cjs

Exports `G, load, diner` (live), **`golden`, `goldenScript`** (frozen diner: every diner-specific assertion uses
these), **`testPizza`** (new model) and `pizza` (the same pack; the old-model copy is retired to
`docs/backup/tests/packs/test-pizza/old-model.js`), the core modules, and:

- `right(pack, o, q)`, the ticket's answer for every kind: add (swap a bad one first, Add to the count, then Skip/Done);
  cook (Simple `cook:<wanted>`, the first choice when the ticket names none; Timed `takeOff` at the wanted stage,
  else `null` = tick a second); slot pick (swap a bad one first, then the wanted value searched through every More…
  row; a repeat picks the remaining wanted values one by one, then `done`); diner picks as before; review `serve`.
  Steps passed by `when`, flourishes and Simple's automatic cooking never ask.
- `random(s)`: any legal answer at any depth (values, Done, Swap It, Add/Skip); Timed takes off at 20% a second; the
  review serves at 70%, else redoes a station.
- `play(pack, s, choose, opts)` (a shift's order, as before); `makeOrder(pack, recipes, opts)` and `run(pack, o,
  settings, choose)` (an order without a shift; `run` counts a press per More… row entered); `flat(options)`,
  `pathTo(options, id)`.

## 7. Left for others

The three core-b items below were done by core-b (2026-11-08; see docs/api/pack-format.md and shift.md). The page
items are phase 2a's.

- **core-b, schema.js**: accept kind `auto`; slot picks (`slot`, `repeat.max`); `when`; cook `stages`/`want`;
  stage-set `ask/stop/speed/wantedScale/simple`; `slots` (ids `/^\w+$/`, values, say, plural); `item.slots`
  (known slot or `want` name, values in range, `count` within `repeat.max`); pick gross-outs (`step:'pick'`,
  `slot`, `on` within the slot, never on a repeat, values + Swap ≤ 4); `tutorial.gross` with `slot`; a `simple:'auto'`
  set needs the ticket's stage. Then point bot.cjs's `pizza` at `tests/packs/test-pizza/pack.js` and delete
  `old-model.js`.
- **core-b, shift.js**: `placeGross` should also place pick gross-outs (`{ item, slot, event }`, single picks of ≤ 3
  values whose wanted value is in `on`), skip steps whose `when` doesn't apply, and filter events by `step`;
  `S.tick(pack, s, dt, hold)` should forward `hold`.
- **core-b, script.js**: `fill()` turns {want}/{got} into stage names only; for slot picks use `W.blanks` (or
  `W.valueName`) and add {slot}/{value}; `valuesFor` could list slot values for `each:'want'` on pick lines.
- **page**: pass the keys-down state to `tick`; give pick rows `rowItems` (game.js:217) and handle `more:<n>` rows;
  read `q.set` (not `pack.ingredients[q.ing].stages`) for the gauge and dial; play `auto` events and `cooked` with
  `auto`; render `spelled().bits` on the wheel; map slot mistakes to `complain.pick` / `tutorial.warn.pick` with
  `W.blanks`.
