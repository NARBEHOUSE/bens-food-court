# The pack format (core-b, 2026-11-08)

Everything a restaurant is, as data: `packs/<pack>/pack.js`. The engine (`js/core/`) reads it and nothing else, so
a restaurant is a pack with no code. This page is the whole format; `js/core/schema.js` checks it. The line's own
details (how each step asks, pages and is judged) are in `docs/api/line.md` (core-a), the script in
`docs/api/script.md`, the page's API in `docs/api/shift.md`.

**Worked examples:** `tests/fixtures/ladder-pizza.js` is a whole restaurant on this format (levels, courses, odd
orders, the event, visitors, locals, a theme). `tests/packs/test-pizza/pack.js` shows every kind of step.

**Check your pack** (from the game folder, `BB_PACKS` limits the restaurant loops to yours):

```
BB_PACKS=pizza node --test "tests/*.test.cjs"
node -e "console.table(require('./tests/bot.cjs').pressReport('pizza'))"     # presses per recipe per level (spec 4.3)
node -e "const b=require('./tests/bot.cjs'); console.log(b.schema.validate(b.merge(require('./packs/pizza/pack.js'))))"
```

---

## 1. The file

```js
/** Ben's Pizza Parlor - the restaurant, as data (docs/api/pack-format.md). */
(function (root, data) {
  if (typeof module === 'object' && module.exports) module.exports = data;
  else (root.BBPacks = root.BBPacks || {}).pizza = data;          // the key is the pack id
})(typeof window === 'undefined' ? globalThis : window, {
  id: 'pizza', version: 1, name: "Ben's Pizza Parlor", format: 3,
  /* every field below */
});
```

Its lines are `packs/<pack>/script.js` (`BBScripts.<pack>`, docs/api/script.md). Plain data only: no functions, no
`Math.random`.

**Ids.** Every id inside a pack (ingredients, stations, slots, slot values, stages, stage sets, picks, recipes,
gross-outs, odd orders, auto steps, events) matches `/^\w+$/`: letters, digits, `_`. No dashes, no spaces. The pack id
is the restaurant's id from spec 2.1.

## 2. Top level

| Field | Required | What |
|---|---|---|
| `id` | yes | the pack id (spec 2.1): `pizza`, `smoothie`, `cafe`, `sushi`, `burrito`, `icecream`, `diner` |
| `version` | yes | a number. Change it when a saved shift could no longer be carried on (it drops `bb-shift:<pack>`; coins stay) |
| `name` | yes | the full name: "Ben's Pizza Parlor" |
| `format` | | `3` once the script is complete: the moment-coverage tests then check it (docs/api/script.md) |
| `help` | ★ | one paragraph for Pause > Help: how this restaurant's line works. Not checked |
| `theme` | | colour tokens (section 14) |
| `courses` | | the order of courses on a ticket, `['main', 'side', 'drink']`; default: as they first come in `recipes` |
| `manager` | yes | `{ id: 'mitch', art: 'mitch-pizza' }` (section 10) |
| `regulars` | yes | who orders here and what (section 10) |
| `stageSets`, `stageNames` | | cooking (section 3) |
| `cookSpeeds`, `wantedScale` | | the pack's default speeds for every stage set (section 3) |
| `sizeSets` | | the Burger Bar's cup sizes (`of: 'size'` picks); new packs use a slot instead |
| `ingredients` | yes | everything that goes on (section 4) |
| `slots` | | named picks (section 5) |
| `picks` | | how orders choose values (section 8) |
| `stations` | yes | the line (sections 6-7) |
| `recipes` | yes | the menu (section 9) |
| `gross` | | gross-outs (section 11) |
| `levels` | | the ladder, over the engine's numbers (section 12) |
| `oddOrders` | ★ | ridiculous orders (section 13) |
| `events` | ★ | `{ five: {...} }`, the five-star event (section 13) |
| `tutorial` | ★ | the guided order (section 13) |
| `poses` | | moment -> pose; leave it out (the Burger Bar's map is the default, `BB.cast.POSES`) |

★ Required of every finished restaurant. A pack that still has the Burger Bar's old `orderStyles` (the live diner
until content-diner moves it) is not held to the ★ rules or to stage-set words.

**Gone, or never read:** `orderStyles`, `grossRate`, `grossMax` (the ladder replaces them; only shifts made off the
ladder read them), `recipes.<id>.unlock` and `.milestone` (use `level`), `backdrops` (each station names its
backdrop; the counter is every pack's), `dailySpecialBonus`. Persona fields in `regulars` (section 10).
**Not checked:** `look` beyond its `shape`, `sounds`, `help`, `world`.

## 3. Cooking stages

```js
stageSets: {
  bake: { stages: ['raw', 'light', 'golden', 'crispy', 'burnt'],   // first .. last; Timed food left on stops at the last
          choose: ['light', 'golden', 'crispy'],                    // Simple's answers, at most 4
          ask: 'How crispy?',                                       // Simple's question
          stop: 'Pull It Out',                                      // Timed's button ("Stop the Blender", "Stop the Pour")
          speed: { verySlow: 14, slow: 9, normal: 6 },              // optional: seconds a stage, per Cooking Speed
          wantedScale: 2,                                           // optional: the ticket's stage lasts this many times longer
          simple: 'auto' },                                         // optional: Simple cooks it to the ticket's stage by itself
},
stageNames: { raw: 'Raw', light: 'Light', golden: 'Golden', crispy: 'Crispy', burnt: 'Burnt' },   // one map for every set
cookSpeeds: { verySlow: 12, slow: 8, normal: 5 },                   // the default speed of every set
wantedScale: 2,
```

- Every stage has a name in `stageNames`. At least two stages; `choose` is inside `stages`, at most 4.
- **Every set names its words** (★): `ask` and `stop`.
- **At least as slow as the Burger Bar** (spec 5.3): each set's speed (`speed`, else `cookSpeeds`) is at least Very
  Slow 12 s, Slow 8 s, Normal 5 s a stage, and its `wantedScale` (else the pack's) at least 2. Slower is fine.
- **Timed burnt is the last stage.** Burnt crust, burnt coffee and the like are the set's last stage, never a gross-out.
- `simple: 'auto'`: in Simple (and the tutorial) the step never asks; it cooks to exactly the ticket's stage (so
  every recipe through it must say that stage: `done`, or the cook step's `want` slot). Timed asks as usual. The
  cafe's espresso pour.
- A Timed control prop is the station's `tool` (section 6).

## 4. Ingredients

```js
ingredients: {
  dough:   { name: 'Dough', look: { shape: 'disc', colour: 0xf3dfa8 } },
  garlic:  { name: 'Garlic Clove', plural: 'Garlic Cloves', look: { shape: 'chips' } },  // plural: counts and complaints
  patty:   { name: 'Patty', plural: 'Patties', stages: 'patty', look: { shape: 'patty' } }, // stages: it cooks (a cook step must follow its Add)
  cheese:  { name: 'Cheese', each: 'patty', look: { shape: 'slice' } },   // one Add puts one on every patty
  ketchup: { name: 'Ketchup', sauce: true, look: { shape: 'sauce' } },   // comes down the line in a squeeze bottle
  bun:     { name: 'Bun', layers: { bottom: 'Bottom Bun', top: 'Top Bun' }, look: { shape: 'bun' } },
  cup:     { name: 'Cup', sizes: 'cup', look: { shape: 'cup' } },        // the Burger Bar's sizeSets
},
```

`name` and `look.shape` are required. Shapes and their look fields are the food modules' (docs/api/world.md); the
schema only checks that a shape is named. A "None" is never an ingredient: it is a slot value (section 5).

## 5. Slots: named picks

```js
slots: {
  crust: { name: 'Crust', say: '{value} crust', values: [
    { id: 'thin', name: 'Thin' }, { id: 'regular', name: 'Regular' }, { id: 'deepDish', name: 'Deep Dish' }] },
  sauce: { name: 'Sauce', say: '{value} sauce', values: [
    { id: 'red', name: 'Red' }, { id: 'white', name: 'White' }, { id: 'bare', name: 'None', say: 'sauce: none' }] },
  scoop: { name: 'Scoop', plural: 'Scoops', values: [ /* ... */ ] },          // a repeat is named for one pick
},
```

- `name`: the question ("Crust: Thin, Regular or Deep Dish?") and the `{slot}` word in lines.
- `values[]`: `id`, `name` (the answer's label and the `{want}`/`{value}` word), optional `say`, optional `look` (a
  value the food draws: needs a `shape`). Ids unique in the slot. A pick needs at least two values.
- `say` (optional, must contain `{value}`): how a value reads on the ticket and in the customer's order; default
  `"<value> <slot name>"`. **Give every None value its own `say`** (`'sauce: none'`): the ticket never says "no X".
- `plural` (repeats): default `name + 's'`. The ticket says "two chocolate scoops and one vanilla scoop".
- More than 4 values page with More… on the line; that is fine (but a gross-out can't sit on such a pick).

## 6. Stations

```js
stations: {
  prep: { name: 'Prep Table', backdrop: 'prep', redo: 'Redo the Pizza', builds: { on: 'pizza', base: 'dough' },
          steps: [ /* section 7 */ ] },
  oven: { name: 'Oven', backdrop: 'oven', redo: 'Bake Again', tool: 'peel', sounds: { cook: 'oven', done: 'peel' },
          steps: [{ kind: 'cook', stages: 'bake' }] },
},
```

| Field | | What |
|---|---|---|
| `name` | yes | the station's name, said on a fresh phase ("Oven. How crispy?") |
| `backdrop` | yes | one of the pack's backdrops (spec 5.2 table): `prep`, `oven`... Several stations may share one. Never `counter` |
| `redo` | yes | the review's words for doing it again: `'Bake Again'` (words, not `true`) |
| `builds` | | `{ on, base?, cap? }`: the item is built on `on` (a plate, a cup); `base` goes first, `cap` last |
| `tool` | | the name of the Timed control prop the page draws (`peel`, `blenderSwitch`, `basket`, `scoop`: the page agent settles the names); a drawn button if missing or unknown |
| `sounds` | | `{ add?, cook?, stage?, done?, auto? }` (docs/api/audio.md 5.2); not checked here |
| `steps` | yes | the line, in order (section 7) |

**Station ids** are `/^\w+$/` and never `intro`, `ticket`, `review`, `serve`, `gross`, `warn`, `cook` or `counter`
(`tutorial.<station>` would clash with the tutorial's own moments). Every station gets a `tutorial.<station>` line,
and a station with a cook step a `tutorial.cook.<station>` line (docs/api/script.md).

## 7. Steps

| Step | Shape | The player answers |
|---|---|---|
| add | `{ kind: 'add', ing, max?, when? }` | Add / Skip (Done after one, when max > 1) / Swap It |
| cook | `{ kind: 'cook', ing?, stages?, want?, when? }` | Simple: a stage; Timed: the `stop` button |
| pick, slot | `{ kind: 'pick', slot, repeat?: { max }, when? }` | a value (Done after the first, on a repeat) / Swap It |
| pick, Burger Bar | `{ kind: 'pick', from: [ing, ...] }` or `{ kind: 'pick', of: 'size' \| 'flavour' }` | a value |
| auto | `{ kind: 'auto', id, show, sound?, when? }` | nothing: a flourish that runs by itself |

```js
steps: [
  { kind: 'pick', slot: 'crust' },
  { kind: 'pick', slot: 'sauce' },
  { kind: 'add', ing: 'mozzarella' },
  { kind: 'add', ing: 'basil', when: { recipes: ['margherita'] } },             // only on a Margherita
  { kind: 'add', ing: 'garlic', max: 3, when: { slot: 'crust', in: ['deepDish'] } },  // only on a deep dish
  { kind: 'auto', id: 'spin', show: 'doughSpin' },                               // show: the flourish the food module plays
]
// a station that cooks the item to a recipe slot's stage (two cook steps on one item use want):
steps: [{ kind: 'add', ing: 'butter' }, { kind: 'cook', stages: 'warm', want: 'heat' }, { kind: 'pick', slot: 'dips', repeat: { max: 3 } }]
```

- **add**: `max` (a whole number, default 1) lets the player add it again; the ticket says the count ("two garlic
  cloves"). An ingredient that cooks must be followed by a cook step for it in the same station.
- **cook**: `stages` names its stage set (else its ingredient's). It cooks `ing` (the parts added at this station),
  else the station's `from` pick, else the item. `want`: the name of a recipe slot whose value is the wanted stage.
- **pick, slot**: the slot's values; `repeat: { max }` picks again until Done or max (order never matters). A repeat
  can't carry a gross-out.
- **auto**: `id` (unique in the station) goes into `made().auto`; `show` names the flourish. Never judged, never a
  gross-out. The burrito's wrap. `sound` (optional, integrate-2b): a sound name played for this step instead of
  the station's `auto` hook (the burrito's `burst`); `tests/voices.test.cjs` checks it exists.
- **when**: `{ recipes: [ids] }` and/or `{ slot, in: [values] }`; read from the ticket, never from what the player
  picked, so the same ticket always asks the same steps. A step that doesn't apply is skipped and never judged. Use
  it for steps only some recipes have (milk only on espresso drinks, toasting only a burrito) and for anything an
  odd order or event needs.
- **At most 4 answers on a screen**, plus Ticket and Pause. A pick of more values pages itself; an Add has 2 (3 with
  Swap It).

## 8. Picks: how orders choose values

```js
picks: {
  bake:  { values: ['light', 'golden', 'crispy'], normal: 'golden' },
  crust: { values: ['thin', 'regular', 'deepDish'], normal: 'regular' },
  scoop: { values: ['vanilla', 'chocolate', 'strawberry'], normal: 'vanilla',
           fancy: ['vanilla', 'chocolate', 'strawberry', 'mintChip', 'cookieDough'] },   // level 5 uses fancy
},
```

A recipe's `{ pick: 'crust' }` is drawn per order: `normal`, or at the level's `change` odds a random value (from
`fancy` at a fancy level). `normal` must be one of `values`. With no `picks` entry of that name, a `{ pick: '<slot>' }`
draws from the slot's own values (normal: the first).

## 9. Recipes

```js
recipes: {
  margherita: {
    name: 'Margherita', plural: 'Margheritas', price: 8,
    level: 1,                 // 1-5 (default 1): the first star level it is ordered at; 'event': only in the event
    course: 'main',           // combos: one item per course, in `courses` order (main + side, main + drink)
    stations: ['prep', 'oven', 'cutter'],          // the line, in order
    item: {
      ing: 'pizza',                                // what the item is (the food draws it; a `from` pick or builds.on)
      done: { pick: 'bake' },                      // the item's stage, for a cook step that cooks the item
      slots: { crust: { pick: 'crust' },           // every slot its line picks: { pick }, a fixed value,
               sauce: 'red',                       //   or for a repeat { pick, count: [lo, hi] } or a fixed list
               cut: { pick: 'cut' } },
      parts: [{ ing: 'mozzarella' }, { ing: 'basil', opt: 'in' }],     // what goes on
    },
  },
  knots: { name: 'Garlic Knots', price: 4, level: 2, course: 'side', stations: ['warmer'],
    item: { ing: 'knots', slots: { heat: { pick: 'heat' }, dips: { pick: 'dip', count: [1, 3] } },
            parts: [{ ing: 'butter', opt: 'in' }, { ing: 'parmesan' }, { ing: 'parmesan' }] } },
  heartPizza: { name: 'Heart-Shaped Pizza', price: 20, level: 'event', look: { giant: true }, stations: ['prep', 'oven', 'cutter'],
    item: { ing: 'pizza', done: { pick: 'bake' }, slots: { crust: 'regular', sauce: 'red', cut: 'c8' }, parts: [{ ing: 'mozzarella' }] } },
  // A giant item's special look (the heart) is its look, never a new slot value: a value would add a choice to every pizza.
},
```

- `name`, `price` (above 0) and `stations` are required. `plural` for "Two Margheritas". `rare: true` makes it a
  rare pick (weight 0.1).
- **`level`** is the only recipe gate (spec 4.3): a level-n shift offers every recipe of level n or below. Level
  `'event'` recipes come only in the five-star event, never in a normal shift or an odd order. **Giant items** are
  event recipes with `look: { giant: true }` (the food draws them 1.6 times bigger; docs/api/world.md 3.7); they never
  add choices.
- **`course`** (a word): at level 3 and up an order of two items is two courses (never two mains, except a twin's two
  of one thing), listed in course order. Recipes with no course: any two different recipes.
- **parts**: `{ ing, done?, opt? }`. `opt: 'in'` can be held ("no basil": the ticket simply leaves it off), `opt:
  'out'` can be added. A part's `done` is that ingredient's stage (the patty's). Never more of an ingredient than its
  Add step's `max` (an `each` ingredient counts once).
- **slots**: the ticket must name **every slot its line picks** and every `want` its cook steps cook to (steps passed
  by `when` excepted). A value is fixed (`'red'`), drawn (`{ pick: 'sauce' }`), or for a repeat drawn `count` times
  (`{ pick: 'scoop', count: [1, 3] }`, within the step's max; the level decides how many, never the customer) or a
  fixed list (`['vanilla', 'vanilla']`).
- **Stages** a recipe wants (its `done`, a part's `done`, a `want` slot's values) must be stages of the set that
  cooks them, and among its `choose` so Simple can make them (a `simple: 'auto'` set needs neither).
- **The Burger Bar's own fields** still work: `item.size` with an `of: 'size'` pick, `item.nameFrom: 'flavour'` with
  an `of: 'flavour'` pick and one `{ pick }` part.

## 10. People

Who someone is (name, pictures, voice, traits) is the cast's (`packs/cast/cast.js`, docs/api/cast.md). A pack lists
who orders here and what; `BB.cast.merge(BBCast, pack)` fills in the rest, and everything uses merged packs.

```js
manager: { id: 'mitch', art: 'mitch-pizza' },        // his uniform folder (the diner's: 'mitch-burger')
regulars: [
  { id: 'marge', likes: [['cheese', 3]], usual: [{ recipe: 'cheese', set: { crust: 'regular', bake: 'golden', cut: 'c8' } }] },
  { id: 'gus', likes: [['pepperoni', 2], ['meatLovers', 2]] },
  { id: 'bev', likes: [['meatLovers', 3]], favourite: { recipe: 'meatLovers', bonus: 2 } },
  { id: 'vernon', set: { crust: 'thin', bake: 'light', cut: 'c8' } },
  { id: 'sal', likes: [['pepperoni', 3]], dislikes: ['lettuce'] },
  { id: 'oakes', dislikes: ['onions'] },
  { id: 'tony', likes: [['margherita', 3]], dislikes: ['pineapple'] },     // a local
  { id: 'reginald', visitor: { level: 4 } },
  { id: 'kai', visitor: { level: 4 } },
],
```

| Field (pack) | What |
|---|---|
| `id` | a cast id (spec 2.2). Someone the cast doesn't know can't come in |
| `likes` | `[[recipe, weight]]`: what they lean to (others weigh 0.5, rare ones 0.1) |
| `usual` | `[{ recipe, set }]`: their fixed order, made exactly as written when every recipe is on offer at this level ("the usual, hon": they say `order.usual`) |
| `always` | `[recipes]`: always in their order, as the item count allows |
| `favourite` | `{ recipe, bonus }`: a bonus tip and `react.favourite` at three stars; never stars |
| `set`, `wants` | `{ <pick or slot name>: value }`: values they always have (wants wins over set) |
| `dislikes` | `[ingredient ids of this pack]`: held where the recipe has them as `opt: 'in'`, never added; they never order a recipe that always comes with one. Sal: lettuce wherever there is lettuce; Oakes: onions wherever there are onions (spec 2.3) |
| `visitor` | `{ level: 4 }` or `{ level: 5 }`: a special visitor (Reginald, Kai, a cameo): out of the normal queue; exactly one visitor a shift from that level, never first; says `visitor.arrive`. A cast visitor without it comes at level 4 |
| `gag` | not a field: a local's running gag is their `order.gag` lines |

**Never in a pack's regulars** (the cast's, ignored here): `name`, `art`, `role`, `scale`, `who`, `voice`, `tts`,
`twin`, `short`, `exact`, `newest`, `tipScale`, `threeStarScale`. The traits act everywhere: `twin` (Gus) orders two of
one thing where the level allows two items; `short` (Kai) one item; `exact` (Vernon) strays further from the recipe
(change at least 0.5); `newest` (Reginald) adds the newest recipe on offer.

**Customer rules** (spec 0.6): a personality changes *what* someone orders, never how many presses it takes. The
level and Order Size decide item and repeat counts. "A dozen", "for twelve", "all the protein" are `order.gag`
lines over a normal order. The tests check that no customer's order of a recipe takes more presses than anyone's.

## 11. Gross-outs (spec 4.6)

```js
gross: [
  { id: 'hair', on: ['mozzarella', 'basil'], say: '{name} with a hair on it', fx: { hair: true } },          // on an Add step
  { id: 'mouldy', on: ['mushrooms'], say: 'the mouldy mushrooms', fx: { tint: 0x86b83c, stink: true } },
  { id: 'skin', step: 'pick', slot: 'sauce', on: ['red', 'white'], say: '{name} sauce with a skin on it', fx: { tint: 0x8a4a2a } },
],
```

- `id`, `say` (how the spoken label names it; `{name}` is the ingredient's or the value's name, lower case) and `on`
  are required; `fx` is how it looks (docs/api/world.md).
- **On an Add step** (`step` left out or `'add'`): `on` lists ingredients offered on an Add step.
- **On a pick** (`step: 'pick'`): `slot` and `on` (that slot's values, leave out None). Only a single, non-repeat pick
  whose values plus Swap It fit on one screen: **three values or fewer**. The bad one is always the value the ticket
  wants.
- **Never on cooking or an auto step.** Burnt is the stage set's last stage; the bursting burrito is a flourish.
- In play: from level 3, never on a shift's first order, never two on one order, at most `grossMax` a shift, only on
  something the ticket wants. Each gross-out needs `gross.<id>` (Mitch) and `complain.gross.<id>` lines.

## 12. The ladder (spec 4.3)

A shift at star level n (1-5) uses `levels[n]`: the engine's numbers below, with any the pack gives on top.

| Level | items | more | change | maxOptional | repeat | fancy | grossRate | grossMax | odd |
|---|---|---|---|---|---|---|---|---|---|
| 1 | [1, 1] | | 0.2 | 2 | 0 | | 0 | 0 | 0 |
| 2 | [1, 1] | | 0.3 | | 0.3 | | 0 | 0 | 0 |
| 3 | [1, 2] | 0.35 | 0.3 | | 0.4 | | 0.3 | 2 | 0 |
| 4 | [1, 2] | 0.35 | 0.4 | | 0.5 | | 0.3 | 2 | 0.5 |
| 5 | [1, 2] | 0.45 | 0.5 | | 0.5 | true | 0.35 | 2 | 0.6 |

```js
levels: { 3: { more: 0.5 }, 5: { odd: 0.8 } },        // only what differs
```

- `items`: [lo, hi] items an order; each past `lo` at `more` odds. Levels 1-2 are one item; 3-5 at most two.
- `change`: how far an order strays from the recipe as written: a `{ pick }` is random at these odds; an `opt: 'in'`
  part is held at half of them, an `opt: 'out'` part added at 0.4 of them. `maxOptional`: the most optional parts
  kept ("with just ..."). `repeat`: each repeat pick past `lo` at these odds. `fancy`: picks use their `fancy` lists.
- `grossRate`, `grossMax`: none below level 3; at most 2 a shift at level 3. `odd`: the odds that a shift has one
  ridiculous order (levels 4-5 only).
- **Order Size** (the setting): Follow the Stars, or One Item, which makes every order one item (odd orders, event
  orders and the finale too). Stars and unlocks still count.
- **Press budget** (checked): in Simple a level-1 item takes at most **14** presses, Serve included (the Burger Bar's
  13-14); no order at any level more than **28**, Simple or Timed (each More… row entered is a press). Report your
  counts per recipe and level from `pressReport` above.

## 13. Ridiculous orders, the five-star event, the tutorial

**`oddOrders`** (level 4-5; at most one a shift, never the first order or the visitor's):

```js
oddOrders: [
  { id: 'justCrust', recipe: 'cheese', holds: ['mozzarella'], picks: { sauce: 'bare' } },         // "just the crust, no pizza"
  { id: 'everything', level: 5, recipe: 'meatLovers', adds: ['peppers', 'onions', 'olives'] },
  { id: 'sevenShots', recipe: 'latte', who: ['jitters'], adds: ['shot'], say: 'order.odd.sevenShots' },
],
```

| Field | What |
|---|---|
| `id` | its id; the customer says `order.odd.<id>` instead of the order sentence (pack 'customer' lines are the fallback) |
| `level` | 4 (default) or 5: the first level it can come at |
| `recipe` | a normal recipe (not `'event'`) of that level or below |
| `set` | `{ <pick>: value }` for the recipe's picks |
| `holds` | ingredients left off (any part of the recipe) |
| `adds` | ingredients put on, one part each (an Add step of the recipe must offer it; a count Add can go up) |
| `picks` | `{ <slot>: value \| [values] }`: slot values as fixed (a list for a repeat, within its max) |
| `who` | optional: only these customers get it |
| `say` | optional; if given, exactly `'order.odd.<id>'` |

**An odd order is made exactly as written** (content-burrito, 2b): the customer's own preferences (`wants`, `set`,
dislikes) do not apply to it. So a customer whose character is a preference (Inferno's heat, Jitters's "no whipped
cream") needs a `who` list on every odd order that would break it, or the odd order must suit them.

It is one item made as written (the customer's dislikes still held), with a plain, complete ticket. Anything the
line can't make (five patties, seven shots) is said in the line, never made.

**`events.five`** (★, spec 4.4):

```js
events: {
  five: {
    name: 'The Pizza Party',                           // said when it starts; {name} in event.* lines
    finale: { customer: 'pam', items: [{ recipe: 'heartPizza', set: { bake: 'golden' } }] },   // always last; 1-3 items
    customers: ['marge', 'gus', 'bev', 'tony', 'pam'],  // optional: who orders (default: everyone who comes here)
    recipes: ['cheese', 'pepperoni', 'garlicKnots'],    // optional: what they order (default: the level-4 recipes)
    items: [1, 3],                                      // optional: items an order, at most 3 (default: level 4's)
  },
},
```

The event shift has Shift Length orders at level-4 complexity (level 4's numbers and gross-outs), the last always the
finale; no visitors, no odd orders. Event-only recipes go in the finale (or in `recipes`). Items are written as in
the tutorial: `{ recipe, set?, hold?, add?, picks? }`. Groups without pictures are spoken of, never shown: Bev orders
"for the team" in her `order.gag`. A customer or the finale's customer who isn't drawn is replaced by the first drawn
regular. Mitch says `event.intro`, then `event.celebrate` or `event.again`.

**`tutorial`** (★): one guided order, always Simple; Mitch warns before each mistake.

```js
tutorial: {
  customer: 'marge',
  items: [{ recipe: 'pepperoni', set: { crust: 'thin', sauce: 'red', bake: 'golden', cut: 'c8' }, hold: ['peppers'] }],
  gross: { item: 0, slot: 'sauce', event: 'skin' },     // or { item: 0, ing: 'mozzarella', event: 'hair' }
},
```

The gross-out must be one that can happen to something the ticket wants (set the slot value it happens to).

## 14. Theme (spec 5.6)

```js
theme: { pageBg: '#7a1f1f', panelTop: '#c8102e', star: '#ffd75e', ticketAccent: '#c8102e' },
```

A flat map of CSS colours; keys only from: `pageBg panelTop panelBottom panelLip plateTop plateBottom mark labelBg
ticketAccent ticketNow perforation hudBg gaugeBg star boardGlow woodInset cardValue logoTop logoMain wheelInk
wheelSteel wheelDark board wood`. Missing ones keep the Burger Bar's. Never the highlight colours. Colours the
highlight sits on keep 3:1 against #ffd400; text keeps 4.5:1 (not checked here).

## 15. What the schema checks

Everything above, on the merged pack: ids, known references, step kinds, slots and values, stage sets (words, speeds,
`choose`), recipe slots and stages the line can make, part counts, gross-out placement, the people (in the cast, a
customer role, valid likes, sets, dislikes, visitors), the manager (the cast's manager), the tutorial, `levels`,
`oddOrders`, `events`, `theme` keys, `courses`. `node --test "tests/pack.test.cjs"` runs it on every restaurant, then
plays every recipe at every level for 3 stars in Simple and Timed, checks the press budget, the same presses for every
customer, that tickets list everything, and whole shifts at every level, the event and the tutorial.
