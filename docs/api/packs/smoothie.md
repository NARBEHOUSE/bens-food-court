# Ben's Smoothie Shack, the pack in words (content-smoothie, 2026-11-09)

`packs/smoothie/pack.js` (pack version 1), the first restaurant to unlock (left arm, upper). Format:
`docs/api/pack-format.md`; the line `docs/api/line.md`; the script `docs/api/script.md`; sounds `docs/api/audio.md`;
the food `docs/api/world.md` and `docs/api/food.md`. Worked example: the Pizza Parlor (`docs/api/packs/pizza.md`).
**food-smoothie works from section 10** (every look, set, flourish and cook to draw). **The script works from
section 12** (every moment and who must say it).

**Check it** (from the game folder):

```
node -e "const B=require('./tests/bot.cjs'),SC=require('./js/core/script.js'),R=B.restaurants().find(r=>r.id==='smoothie');console.log(B.schema.validate(R.pack),SC.check(R.pack,R.script),SC.coverage(R.pack,R.script))"
node -e "console.table(require('./tests/bot.cjs').pressReport('smoothie'))"
BB_PACKS=smoothie node --test "tests/*.test.cjs"
```

## 1. At a glance

| | |
|---|---|
| id, name | `smoothie`, "Ben's Smoothie Shack" (court: "Smoothie Shack", left arm, slot 1, locked at the start, the 1st to unlock) |
| version | 1 |
| format | `3`: `packs/smoothie/script.js` covers every moment (content-smoothie, 2026-11-09; the script in words: `docs/api/packs/smoothie-script.md`) |
| manager | `{ id: 'mitch', art: 'mitch-smoothie' }`: Hawaiian shirt, lei, sunglasses on his head (tie and taped badge underneath) |
| backdrops | `counter`, and by station `prep` (prep, bowlBar) and `blender` (blender). All three exist (`BBArt.smoothie`) |
| courses | `['smoothie', 'bowl']`: smoothies first, the acai bowl second |
| levels | `{}`: the engine's ladder unchanged |
| no paging | the base pick has 4 values (4 answers, Ticket, Pause), every other pick 3; nothing pages behind More…, nothing repeats |

## 2. The line: stations and steps

| Station | backdrop | Steps, in order | redo | tool | sounds |
|---|---|---|---|---|---|
| `prep` "Prep Table" | `prep` | builds on `smoothie` (the blender jug). Pick `size` → Pick `base` → auto `pour` (show `basePour`) → Add, one each: strawberries, banana, mango, pineapple, blueberries, spinach, protein, honey, ice | "Redo the Smoothie" | | `{ auto: 'pour' }` (add: `plop`) |
| `blender` "Blender" | `blender` | Cook, stage set `blend` (cooks the item: the smoothie in its jug, or the acai) → auto `fill` (show `cupFill`) | "Blend Again" | `blenderSwitch` | `{ cook: 'blender', done: 'blenderStop', auto: 'pour' }` |
| `bowlBar` "Bowl Bar" | `prep` | Add, one each: granola, banana, strawberries, blueberries, honey | "Redo the Bowl" | | (add: `plop`) |

A smoothie runs prep → blender; an acai bowl runs blender → bowlBar (blended first, then topped). No `when` steps:
every smoothie is asked every step, so every smoothie takes the same presses whatever is in it.

What the player hears (words.js; Timed changes only the blender):

- "Prep Table. Size: Small, Medium or Large?" → "Base: Juice, Milk, Yogurt or Oat Milk?" → the base glugs into the
  jug → "Strawberries." Add / Skip ("Add strawberries"), then "Banana.", "Mango.", "Pineapple.", "Blueberries.",
  "Spinach.", "Protein.", "Honey.", "Ice.". A bad one: "The brown, mushy banana." Add / Skip / Swap It ("Swap the
  brown, mushy banana for a fresh one").
- "Blender. How smooth?" Chunky / Smooth / Super Smooth. Timed: "Blender. Stop the blender when it is right.", one
  button **Stop the Blender** (said "Stop the blender. Smooth"); left on, it ends Soupy. Then it pours into the cup.
- "Bowl Bar. Granola." Add / Skip, "Banana.", "Strawberries.", "Blueberries.", "Honey.".
- Review: "Here it is." Ring It Up, Redo the Smoothie, Blend Again (with a bowl: Redo… as a row when there are more
  than three).

**Fruits and extras are Add steps, not a repeat pick** (pilot.md 5.2): the gross-outs sit on them, Sal's spinach and
Tony's pineapple are held as recipe parts, and nothing hides behind More….

## 3. Cooking: one stage set

| set | stages (first .. last) | Simple `choose` | ask | stop | speed |
|---|---|---|---|---|---|
| `blend` | unblended, chunky, smooth, superSmooth, soupy | Chunky, Smooth, Super Smooth | "How smooth?" | "Stop the Blender" | pack `cookSpeeds` 12 / 8 / 5 s a stage, `wantedScale` 2 (the Burger Bar's grill) |

Stage names: Unblended, Chunky, Smooth, Super Smooth, Soupy. **Soupy (over-blended: thin, foamy) is Timed's last
stage** (one mistake, `complain.done`), never a gross-out. Every recipe's `done` is `{ pick: 'blend' }` (normal
Smooth). The acai bowl blends in the same blender with the same words.

## 4. Recipes

`level` is the only gate. Prices are the tip's base. "As written" is the ticket with the normal picks (change 0).

| id | Name | level | course | stations | price | As written (the ticket) | Can change |
|---|---|---|---|---|---|---|---|
| `strawberryBanana` | Strawberry Banana Smoothie | 1 | smoothie | prep, blender | 6 | medium cup, juice base, with strawberries, banana and ice, smooth | size, base, blend; holds ice; adds blueberries, honey |
| `tropical` | Tropical Smoothie | 1 | smoothie | prep, blender | 7 | medium cup, juice base, with banana, mango, pineapple and ice, smooth | picks; holds banana, ice; adds honey |
| `berryBlast` | Berry Blast | 1 | smoothie | prep, blender | 7 | medium cup, yogurt base, with strawberries, blueberries and ice, smooth | picks (`creamyBase`); holds ice; adds banana, honey |
| `greenSmoothie` | Green Smoothie | 2 | smoothie | prep, blender | 8 | medium cup, juice base, with banana, pineapple, spinach, honey and ice, smooth | picks; holds pineapple, honey, ice; adds mango |
| `proteinShake` | Protein Shake | 2 | smoothie | prep, blender | 8 | medium cup, milk base, with banana, spinach, protein, honey and ice, smooth | picks (`milkBase`); holds spinach, honey, ice; adds strawberries |
| `acaiBowl` | Açaí Bowl | 3 | bowl | blender, bowlBar | 9 | smooth, with granola, banana, strawberries, blueberries and honey | blend; holds strawberries, blueberries, honey |
| `trophySmoothie` | Trophy Smoothie | `'event'` | smoothie | prep, blender | 20 | large cup, juice base, with strawberries, banana, mango, pineapple, blueberries, honey and ice, smooth (the finale sets super smooth); `look: { shape: 'trophyCup', giant: true }` | the finale only |

Slots and picks (level 5 uses the fancy lists):

| slot (question) | values (label; ticket words) | picks: values, normal, fancy |
|---|---|---|
| `size` "Size" | smallCup "Small", mediumCup "Medium", largeCup "Large"; "large cup" | `size`: all three, mediumCup |
| `base` "Base" | juice "Juice", milk "Milk", yogurt "Yogurt", oatMilk "Oat Milk"; "oat milk base" | `base` juice/milk/yogurt, juice, fancy + oatMilk; `creamyBase` yogurt/milk/juice, yogurt, fancy + oatMilk; `milkBase` milk/oatMilk/yogurt, milk |
| (stage) | the `blend` set | `blend`: chunky/smooth/superSmooth, smooth |

The size ids are `smallCup`/`mediumCup`/`largeCup`, not `medium`: `js/core/words.js` quotes `"medium"` and
`tests/pack.test.cjs` fails a pack id that js/core quotes.

**Combos** (level 3 up): one item, or two at the level's `more` odds: a smoothie and an acai bowl, in that order.
Never two smoothies except Gus's two of one thing. Order Size "One Item" makes every order one item.

## 5. The ladder (`levels: {}`)

| Level | On offer | Items | Gross-outs | Extras |
|---|---|---|---|---|
| 1 | strawberry banana, tropical, berry blast | 1; at most 2 optional parts; change 0.2 | none | |
| 2 | + green smoothie, protein shake | 1; change 0.3 | none | |
| 3 | + açaí bowl | 1 or 2 (35% two, Gus's twin on top: 40% measured): smoothie + bowl | 0.3 an order, at most 2 a shift, never the first | |
| 4 | the same | as 3, change 0.4 | as 3 | one odd order at 50% a shift; one visitor (Reginald, Kai or Tony), never first |
| 5 | the same | as 4, change 0.5, fancy (oat milk on every base) | 0.35, at most 2 | odd orders at 60%, `wipeout` too |

Measured over 300 five-order shifts a level in each mode (3000 orders a level, every one 3 stars with the right
answers): two-item orders 40% at level 3, 32% at 4, 37% at 5; the gross-outs land on the banana (brown) about twice as
often as on the strawberries (mouldy), and the bug and the sock share the ice (about 100 each).

## 6. Ridiculous orders (level 4 and 5)

The customer says `order.odd.<id>` instead of the order; the ticket is plain and complete. At most one a shift, never
the first order or the visitor's.

| id | level | recipe | the change | The ticket | Who | Presses |
|---|---|---|---|---|---|---|
| `everyFruit` | 4 | tropical | adds strawberries, blueberries ("every fruit you've got") | Tropical Smoothie: medium cup, juice base, with strawberries, banana, mango, pineapple, blueberries and ice, smooth | anyone | 13 |
| `notGreen` | 4 | greenSmoothie | holds spinach ("a green smoothie, but not green": it comes out yellow) | Green Smoothie: medium cup, juice base, with banana, pineapple, honey and ice, smooth | anyone | 13 |
| `dogShake` | 4 | proteinShake | small cup, holds honey ("a protein shake for my dog": said; the ticket is a small protein shake) | Protein Shake: small cup, milk base, with banana, spinach, protein and ice, smooth (Sal's holds the spinach) | anyone | 13 |
| `wipeout` | 5 | tropical | adds strawberries, blueberries, spinach, protein, honey; large cup, super smooth ("everything; blend it until it gives up") | Tropical Smoothie: large cup, juice base, with strawberries, banana, mango, pineapple, blueberries, spinach, protein, honey and ice, super smooth | anyone (Sal's spinach still held) | 13 |

## 7. The five-star event: The Beach Volleyball Tournament

```js
events: { five: { name: 'The Beach Volleyball Tournament',
  customers: ['marge', 'gus', 'bev', 'vernon', 'sal', 'tasha', 'breeze', 'reginald', 'kai'],
  finale: { customer: 'brock', items: [{ recipe: 'trophySmoothie', set: { blend: 'superSmooth' } },
    { recipe: 'acaiBowl', set: { blend: 'smooth' } }] } } }
```

- Two volleyball teams, **spoken of, never shown**: Breeze captains one (they didn't know they were keeping score),
  Brock the other. Both teams order between games: Shift Length orders at level-4 complexity from the drawn cast, no
  visitors, no odd orders.
- The finale, always last: Brock orders the giant Trophy Smoothie for the winners (Breeze's team) and an acai bowl for
  himself. "Trophy Smoothie: large cup, juice base, with strawberries, banana, mango, pineapple, blueberries, honey and
  ice, super smooth. Açaí Bowl: smooth, with granola, banana, strawberries, blueberries and honey." 19 presses. The
  trophy is drawn giant and adds no choices. Brock says his `order.gag` after it (game.js: the finale's customer).
- Mitch: `event.intro`, `event.celebrate`, `event.again` (`{name}`: the event).

## 8. Who comes in, and what they order

| id | role here | likes (others 0.5) | also | Brief (proposal / spec 2.3) |
|---|---|---|---|---|
| `marge` | regular | strawberry banana 3 | `usual`: strawberry banana, medium, juice, smooth (`order.usual`) | "Strawberry banana" |
| `gus` | regular | tropical 2, protein shake 2 | cast `twin`: two of one thing from level 3 (`order.twin`: "two shakes, same deal") | "Two shakes, same deal" |
| `bev` | regular | protein shake 3 | `favourite`: protein shake, +2 tip (`react.favourite`) | "Protein shake" |
| `vernon` | regular | berry blast 2, green 1 | `set`: small cup, oat milk (every base pick), super smooth; cast `exact` | "Very specific blend" |
| `sal` | regular | strawberry banana 2, protein shake 2 | `dislikes: ['spinach']`: never a green smoothie (it always has it); held on the protein shake, where it is optional, and he says why (`order.dislike`) | "Refuses, then orders anyway": the refusal is his greet (spec 2.3); spinach is this menu's rabbit food (my adaptation: no lettuce here) |
| `tasha` | regular (spec 5.4) | berry blast 3, tropical 1 | `set`: large cup | deadpan skater; pretends not to care, cheers quietly on three stars |
| `breeze` | local | tropical 3, açaí bowl 2 | `order.gag` (his words, not their length); the tutorial customer | slow surfer |
| `brock` | local | protein shake 4, green 1 | `favourite`: protein shake, +2; `order.gag`: "all the protein" is said, never made; the event's finale | gym bro |
| `reginald` | visitor, level 4 | açaí bowl 2 | cast `newest`: the newest recipe on offer (the açaí bowl) | the critic |
| `kai` | visitor, level 4 | strawberry banana 2, berry blast 1 | cast `short`: one item | the young reviewer |
| `tony` | visitor, level 4 (cameo, spec 2.2) | berry blast 3, green 2 | `dislikes: ['pineapple']`: never a tropical; holds it on the green (`order.dislike`) | the Pizza Parlor's tenor in a shack full of pineapple; the mirror of the pizza's Breeze cameo |

Measured: Tony comes as the level-4 visitor in about a third of shifts, Reginald and Kai the rest. `tests/cast.test.cjs`
(who can meet, voices) passes with all eleven listed.

## 9. Gross-outs (from level 3; all on Add steps)

| id | on | label (`say`) | fx | What it does |
|---|---|---|---|---|
| `brown` | banana | "the brown, mushy {name}" → "The brown, mushy banana." | `tint` #7a5524, `spots` (#3b2410, 10), `droop` | Mitch `gross.brown`; served: `react.gross`, `complain.gross.brown` |
| `mouldy` | strawberries | "the mouldy {name}" → "The mouldy strawberries." | `spots` (#e4eadc, 12: white fuzz), `tint` #8c6a62, `stink` | as above, `.mouldy` |
| `bug` | ice | "{name} with a bug in it" → "Ice with a bug in it." | **`bug`** (new: food-smoothie's fx) | as above, `.bug` |
| `sock` | ice | "{name} with a sock in it" → "Ice with a sock in it." | **`sock`** (new), `stink` | as above, `.sock` (spec 4.6: the sock goes in the ice Add) |

The banana and strawberries gross-outs also happen at the bowl bar (the same ingredients). Swap It replaces it and asks
again; Skip sends it away (a missing-ingredient mistake if the ticket wanted it). The receipt says e.g. "Ice: ice with a
sock in it". Soupy is Timed's last stage instead of an over-blending gross-out (spec 4.6).

## 10. For food-smoothie: every look, set, flourish and cook

`made()` of a smoothie: `{ recipe, ing: 'smoothie', done: 'smooth', parts: [{ ing: 'strawberries' }, { ing: 'banana',
gross? }, ...], gross, picks: { size: 'mediumCup', base: 'juice' }, counts: {}, auto: ['pour', 'fill'] }` (`auto`
grows as the flourishes run: `pour` after the base pick, `fill` after the blender). `k.sequence` gives vessel
`smoothie` (the jug: prep builds on it) and the parts in line order: the size value (`paperCup`), the base value
(`baseLiquid`), then the fruits and extras. An acai bowl: `{ recipe: 'acaiBowl', ing: 'acai', done, parts: [granola,
banana, strawberries, blueberries, honey], picks: {}, auto: ['fill'] }`: body `acai` at `made.done`, then the
toppings. **Recipe looks name the layout** (`layoutOf` reads `pack.recipes[made.recipe].look.shape`): `smoothieCup`,
`acaiBowl`, `trophyCup`.

**The smoothie's colour is the mix of what went in** (the fun of it): average the `look.colour` of the fruits and the
spinach (spinach counts double, so a Green Smoothie reads green; blueberries one and a half), then move it 30% toward a
milk, yogurt or oat milk base's colour (15% toward juice). Ice, protein and honey change nothing. A Strawberry Banana
comes out pink, a Tropical orange-yellow, a Berry Blast berry-purple, a Green Smoothie green, a Protein Shake
a pale green (cream-beige when its spinach is held), and the `notGreen` odd order (no spinach) yellow: the joke depends on it.

| look.shape | used by | set(s) | how it looks | with cooking (`made.done`, or `o.stage` in the blender) |
|---|---|---|---|---|
| `blenderJug` | ingredient `smoothie` (the vessel) | prep, blender | a clear blender jug with measuring lines, a black lid and a handle (the kit's `blenderJar`); at prep it stands on the counter, at the blender on the motor base; what is in it shows through the glass | its contents by stage (below); `look.ramp` is the thickness plates' swatches (a blended pink at each stage) |
| `paperCup` | size values `smallCup` 0.82, `mediumCup` 1, `largeCup` 1.22 (`look.size`) | prep (waiting empty right of the jug), counter | a white paper cup with a teal band and a pink hibiscus, a domed clear lid and a striped straw; `look.size` scales it; the three must differ at the counter's size | none |
| `baseLiquid` | base values `juice` #ffa62b, `milk` #fbfaf4, `yogurt` #f4efe2 (`look.thick`), `oatMilk` #eadcc0 | prep | a layer of liquid in the bottom of the jug, `look.colour`; yogurt is a thick dollop, not a flat layer; poured from a pitcher like the shelf's (orange juice, the cow jug, yogurt, oat milk) | none (it blends in) |
| `strawberries` | strawberries | prep, bowl bar, counter | about 5 red strawberries with green tops and seed dots; in the jug whole; on the bowl halved, cut side up, in a row | blend away (below) |
| `banana` | banana | prep, bowl bar, counter | waiting: a peeled banana; in the jug two chunks; on the bowl a row of round slices | " |
| `mangoChunks` | mango | prep | about 8 orange cubes | " |
| `pineappleChunks` | pineapple | prep | about 8 yellow wedges | " |
| `blueberries` | blueberries | prep, bowl bar, counter | about 20 small blue-purple berries (one `k.scatter`); on the bowl a row | " |
| `spinachLeaves` | spinach | prep | a handful of dark green leaves (`leaf` pieces) | " |
| `proteinPowder` | protein | prep | a scoop of beige powder (a heap) from the tub on the shelf; a small puff as it goes in (Full motion) | " |
| `honey` | honey | prep, bowl bar, counter | waiting: a honey dipper or bear bottle; in the jug a golden ribbon; on the bowl a zigzag drizzle across the top (the kit's `bead`, path `drizzle`) | none |
| `iceCubes` | ice | prep | 4 to 6 clear pale-blue cubes (never fewer than 4 at Low: a cue) | they shatter away as it blends |
| `granola` | granola | bowl bar, counter | a strip of golden-brown clusters (`k.heap` of `chunk`) across the bowl | none |
| `acaiBlend` | ingredient `acai` (the bowl's body) | blender, bowl bar, counter | in the jug: frozen deep-purple chunks with a splash of juice; in the bowl: a thick purple dome, spoon-swirled | by stage, as the smoothie; `look.ramp` gives its purple swatches |
| `smoothieCup` | recipe look: every smoothie but the trophy | layout | at prep and the blender (before `fill` is in `made.auto`): the jug with its contents, and at prep the empty paper cup of `made.picks.size` waiting right of it; after `fill` and on the counter: the paper cup of that size, filled near the lid in the blended colour, lid, straw, and a garnish of the first fruit on the rim (a strawberry, a pineapple wedge, a banana slice) | the blend shows in the cup: a chunky smoothie has flecks, a soupy one foam |
| `acaiBowl` | recipe look of `acaiBowl` | layout | a half-coconut bowl (or a teal ceramic one): the purple acai domed in it, the toppings in neat rows across the top (granola, banana slices, strawberry halves, blueberries) and the honey zigzag over them: the classic acai bowl | by `made.done` (the dome's texture) |
| `trophyCup` | recipe look of `trophySmoothie`, `giant: true` | layout | a gold two-handled trophy cup on a little plinth, filled with the smoothie's colour, a paper umbrella, two straws (for the team) and a pineapple wedge; the kit draws it 1.6 times bigger (cap it on prep and the blender with `giantMax`) | as `smoothieCup` |

**The blend, stage by stage** (the cook view and the counter): **doneness shows as a colour and a mark**, and
neighbouring stages differ at the cook view's size by both.

| stage | colour | mark |
|---|---|---|
| unblended | separate: the base layer at the bottom, every fruit piece whole and its own colour | whole pieces, sharp edges, ice cubes |
| chunky | the mixed colour, streaky | many visible chunks and flecks in a swirl |
| smooth | the mixed colour, even | a few specks, a matt top |
| superSmooth | the mixed colour, a little deeper | no specks, a glossy highlight band on the top |
| soupy | paler (30% toward white), thin | a layer of white foam and bubbles on top, the level a little lower |

**Sets** (measure your own lines, docs/api/food.md 4; the pictures were asked for prep 62 and blender 65, and the
generation notes say prep's bamboo rail ends at y 635 of 1024 and the blender's teal counter starts at y 666):

- `counter`: `line 0.80`, `surface { y, back }`, its own camera (copy the pizza's `counter.arrange`, food.md 5); a
  **golden bamboo plank top with a teal plank front**, as the court picture draws the Smoothie Shack's counter (teal
  vertical planks, golden bamboo, teal round stools; `art-source/backdrops/court.png` at about x 0-25%, y 19-57%). The
  order sits on the top between the Pause sign and the painted queue (measured by content-smoothie on
  `art-source/backdrops/smoothie-counter.png`: the three painted people fill x 56.5-80.5%, y 49.5-72% of the picture:
  the jogger 56.5-63.5%, the ranger 66.5-72.5%, the teen 75-80.5%; heads from 49.5%, feet at 71-72%); a smoothie and a bowl side by side, two smoothies side by side, the trophy alone
  shrunk to fit.
- `prep`: the jug low and left of centre (`stack`), the waiting cup of the chosen size beside it, the next ingredient
  on the right (`incoming`), `giantMax` for the trophy. Its `pick` hook: a `size` pick sets the empty cup down (small,
  medium or large); a `base` pick tips that base's pitcher toward the jug. Its `auto` (or `autos`): **`basePour`**, the
  base glugs into the jug and the level rises (sound `pour`; Reduced: the layer is there at once). On the bowl bar (the
  same backdrop) the item is the acai bowl, toppings landing in their rows.
- `blender`: the jug on a motor base like the shelf's four (pick one colour, the switch on its front); `cook:
  'blender'`: `show(c, s)` draws the jug's contents at `s.stage`; Simple's `run` blends to the chosen stage (the
  contents swirl, `k.spin`, the jug shakes a little, then settles); Timed: it swirls on and the contents change a stage
  at a time, foam at soupy. The Timed control prop is the page's `blenderSwitch`. Its `auto`: **`cupFill`**, the jug
  lifts off and pours into the paper cup (a smoothie) or spoons into the bowl (an acai bowl), the level rising in the
  cup (`k.pour`; sound `pour`; Reduced: it is full at once).

Gross-out fx: the kit's `tint`, `spots`, `droop`, `stink`, plus **two new keys food-smoothie adds in `fx`**: `bug` (a
small dark beetle frozen inside one ice cube, legs up, clearly visible through the ice) and `sock` (a striped tube sock
poking out of the ice, with the kit's stink lines). Both sit at or above the box top (world.md 3.8).

## 11. Sounds

`prep`: `auto: 'pour'` (the base glugs in); `blender`: `cook: 'blender'` (the motor runs), `done: 'blenderStop'` (it
winds down and the jug lifts off), `auto: 'pour'` (into the cup). Every Add plays the default `plop`, each Timed stage
`tick`. The page plays `swoosh` (Skip), `toss` (Swap It), `ding`, `kaching`, `stars`, `ew` as for the diner. All exist
(`packs/smoothie/sound`, `packs/shared/sound`); `tests/voices.test.cjs` checks them.

## 12. For the script: every moment and who must say it

`SC.moments(pack)` on the merged pack: 58 moments, 278 coverage items. **Written** (content-smoothie, 2026-11-09): `packs/smoothie/script.js`, 386 lines, `SC.check` and `SC.coverage` both empty; conventions and counts in `docs/api/packs/smoothie-script.md`. F = the pack's 'customer' fallback lines count
for anyone with fewer than two of their own.

- **Customers, everyone** (marge gus bev vernon sal tasha breeze brock reginald kai tony): `greet` ×3, `smalltalk` ×3,
  `goodbye` ×3 (the cast script supplies these for the regulars and visitors; **breeze, brock and tony need their own
  here**); `react.3`/`.2`/`.1` ×3 of their own; F: `react.gross`, `complain.extra`/`.unasked`/`.missing` ({ing}{ings}),
  `complain.done` ({want}: stage words), `complain.pick` ({slot}{want}), `complain.more`,
  `complain.gross.brown`/`.mouldy`/`.bug`/`.sock` ({ing}{ings}).
- **Some**: `visitor.arrive` reginald kai tony; `order.usual` marge; `order.twin` gus; `order.dislike` sal (spinach),
  tony (pineapple); `order.gag` breeze, brock (locals at home; ≤ 8 s; Brock's also after the event finale);
  `react.favourite` bev, brock; F `order.odd.everyFruit`, `.notGreen`, `.dogShake`, `.wipeout` (every non-visitor).
- **Mitch** (2 each unless 1): `shift.start`, `shift.end`, `uniform` (1); `tutorial.intro`, `.ticket`, `.review`,
  `.serve`, `.gross`; `tutorial.prep`, `.blender`, `.bowlBar`, `tutorial.cook.blender`;
  `tutorial.warn.extra`/`.unasked`/`.missing`/`.done`/`.pick`/`.gross`/`.grossSkip`; `gross.brown`, `.mouldy`, `.bug`,
  `.sock`; `nearly` ({want}{name}), `after.3`, `after.1`, `after.gross`, `event.intro`/`.celebrate`/`.again` ({name}) (1).
- **Not needed**: `complain.tooMany`/`.tooFew` and their warnings (no Add with a max above 1, no repeat).
- **Blank words**: {slot} size, base; {want}/{got} small, medium, large, juice, milk, yogurt, oat milk; stages chunky,
  smooth, super smooth, unblended, soupy; {ing} the 10 Add ingredients (strawberries, banana, mango, pineapple,
  blueberries, spinach, protein, honey, ice, granola) or smoothie / açaí for `done`. Pick lines say "for the {slot}, I
  said {want}" ("for the size, I said large", "for the base, I said oat milk").
- **The brief**: Breeze's gag is in his words (a surfer's calm, short sentences), Brock's is "all the protein" (said,
  never made); Marge's strawberry banana usual; Gus's "two shakes, same deal" (`order.twin`); Bev's protein shake;
  Vernon's very specific blend; Sal refuses, then orders (his restaurant-flavoured `greet` lines) and never takes
  spinach; Tasha pretends not to care; Tony among the pineapples; the odd orders as in section 6; the tutorial
  customer is Breeze ("he"); the finale is Brock's.

## 13. Help

"Ben's Smoothie Shack. Every smoothie starts at the prep table: pick the cup size, then the base, then Add or Skip each
fruit and extra as it comes down the line. Then the blender: in Simple, pick how smooth it is, Chunky, Smooth or Super
Smooth; in Timed, watch it blend and Stop the Blender when it reaches the thickness on the ticket. It pours itself into
the cup. An açaí bowl blends first, then gets its toppings at the bowl bar. The ticket lists everything: add what's on
it, skip what isn't. If something looks wrong, Swap It brings a fresh one."

## 14. Theme: tropical teal

| token | value | token | value | token | value |
|---|---|---|---|---|---|
| pageBg | #08393a | ticketAccent | #0b6663 | cardValue | #ffe7a3 |
| panelTop | #0f6f6c | ticketNow | #d6f5ec | logoTop | #ffd36b (pineapple gold) |
| panelBottom | #0a4e4c | perforation | #9fd0c5 | logoMain | #ffa8cc (smoothie pink) |
| panelLip | #052c2b | hudBg | rgba(6,52,51,.86) | wheelInk | #10201f |
| plateTop | #fffaf0 | gaugeBg | rgba(4,36,36,.92) | wheelSteel | #dfe8e6 |
| plateBottom | #e3f4ee | star | #c97c00 (mango) | wheelDark | #0f6f6c |
| mark | #8a2457 (berry) | boardGlow | #0a4543 | board | #06302f |
| labelBg | rgba(5,44,43,.9) | woodInset | #5a3d12 | wood | #d9a640 (golden bamboo frame) |

A teal control panel and dark teal menu boards in a golden bamboo frame, as the shack's pillars; white plates and mint
paper. **Contrast, computed** (WCAG; translucent tokens composited over white, the worst backdrop), each token in its
diner job (diner.md 14):

- The highlight #ffd400 on: panelTop 4.18, panelBottom 6.65, boardGlow 7.54, pageBg 8.85, gaugeBg 9.06, board 9.97
  (need 3; `tests/pack.test.cjs` checks the five it lists).
- Text: ink on plateTop 17.71, plateBottom 16.18, ticketNow 15.91; ticketAccent on paper 6.67 and on ticketNow 5.86;
  white on labelBg 11.14, hudBg 8.91, gaugeBg 12.96, panelTop 5.98; chalk on board 12.64 and boardGlow 9.56; cardValue
  11.70 / 8.85; logoTop 10.05 / 7.60; logoMain 7.97 / 6.03 (need 4.5).
- Graphics: star on the receipt's paper 3.24, board 4.33, boardGlow 3.27; mark on the plates 8.17 / 7.46 (need 3). (A
  lighter teal board failed the star: 2.35 on #125c5a; the boards are dark so the mango stars stay at 3:1 on both.)

## 15. The tutorial

Breeze (the shack's own); one guided order through every station: "Tropical Smoothie: medium cup, juice base, with
banana, mango, pineapple and ice, smooth. Açaí Bowl: smooth, with granola, banana, strawberries, blueberries and
honey." The banana comes down the line brown and mushy (`gross: { item: 0, ing: 'banana', event: 'brown' }`), so Swap
It is taught once. Always Simple; Mitch warns before each mistake. 19 presses done right, plus the Swap It: 20.

## 16. Press counts (`pressReport('smoothie')`, Serve included; Simple and Timed alike, the same at every level)

| recipe | levels | presses |
|---|---|---|
| strawberryBanana, tropical, berryBlast | 1-5 | 13 (size, base, 5 fruits, 4 extras, blender, Serve) |
| greenSmoothie, proteinShake | 2-5 | 13 |
| acaiBowl | 3-5 | 7 (blender, 5 toppings, Serve) |
| trophySmoothie (event) | event | 13 alone; the finale with the bowl 19 |

Whole orders (bots, 3000 a level, both modes): levels 1 and 2 at most 13; levels 3-5 and the event at most 26 (Gus's
two smoothies, 25, plus a Swap It); a smoothie with a bowl 19 (20 with a Swap It); every odd order 13; the tutorial 20.
Budget (spec 4.3): level 1 ≤ 14, any order ≤ 28.

## 17. Requests (for the owners named)

- **page / whoever owns `index.html`**: done by this lane under the shared-file rules (`packs/smoothie/pack.js`, then
  `packs/smoothie/script.js`, after the pizza's two lines).
- **page**: draw the `blenderSwitch` as the blender's Timed control (a button labelled "Stop the Blender" until then);
  play the auto events `basePour` (prep) and `cupFill` (blender).
- **food-smoothie**: section 10, including the two new fx keys `bug` and `sock`.
- **page / integrate** (`tests/dom-play.cjs`, done by content-smoothie under the shared-file rules): `courtRecord()`
  seeds a restaurant that is shut at the start open (Grand Opening seen, with every restaurant that unlocks before it)
  for a run played at it (a court-only run only when it walks up to the first-visit card), and leaves its first visit to come on a court-only run; the smoothie's 8 named runs follow
  the pizza's block (seeds 61-68). Put the smoothie on the whole chain (seeded open) when that run is next touched.
