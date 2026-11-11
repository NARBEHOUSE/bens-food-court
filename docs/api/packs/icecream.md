# Ben's Ice Cream Emporium, the pack in words (content-icecream, 2026-11-10)

`packs/icecream/pack.js` (pack version 1), the seventh restaurant, the fourth and last to unlock (right arm, lower).
**The first pack with a repeat pick and a More… page** (the scoops). Format: `docs/api/pack-format.md`; the line
`docs/api/line.md`; the script `docs/api/script.md` (this pack's in `icecream-script.md`); sounds `docs/api/audio.md`;
the food `docs/api/world.md` and `docs/api/food.md`. **food-icecream works from section 10** (every look, set,
flourish and cook to draw). Section 12 is every script moment and who must say it.

**Check it** (from the game folder):

```
node -e "const B=require('./tests/bot.cjs'),SC=require('./js/core/script.js'),R=B.restaurants().find(r=>r.id==='icecream');console.log(B.schema.validate(R.pack),SC.check(R.pack,R.script),SC.coverage(R.pack,R.script))"
node -e "console.table(require('./tests/bot.cjs').pressReport('icecream'))"
BB_PACKS=icecream node --test "tests/*.test.cjs"
```

## 1. At a glance

| | |
|---|---|
| id, name | `icecream`, "Ben's Ice Cream Emporium" (court: "Ice Cream Emporium", right arm, slot 2; locked at the start, opens 4th of the four, when every open restaurant has 5 stars) |
| version | 1 |
| manager | `{ id: 'mitch', art: 'mitch-icecream' }`: striped shirt, bow tie, paper soda-jerk hat |
| backdrops | `counter`, and by station `scoop` (scoop) and `toppings` (toppings, shake). All three exist (`BBArt.icecream`) |
| courses | `['scoop', 'shake']`: cones, cups, sundaes and splits are `scoop`; the milkshake is `shake` |
| levels | `{}`: the engine's ladder unchanged |
| paging | the scoop pick has 7 values: the first screen shows Vanilla, Chocolate and **More…** (Strawberry, Mint Chip, Cookie Dough, Rocky Road, Bubblegum), and Done from the second scoop on. Every other pick has 3 values |
| repeats | the scoop pick is a repeat (`max: 3`); its count is the recipe's and the level's, never the customer's |

## 2. The line: stations and steps

| Station | backdrop | Steps, in order | redo | tool | sounds |
|---|---|---|---|---|---|
| `scoop` "Freezer Case" | `scoop` | Pick `holder` (cones, cups and sundaes; `when` recipes) → auto `dip` (show `scoopDip`) → Cook, stage set `size` (the item) → Pick `scoops`, repeat max 3 → auto `banana` (show `bananaTuck`, banana splits only) | "Scoop Again" | `scoop` | `{ cook: 'scoop', done: 'scoop' }` |
| `toppings` "Topping Bar" | `toppings` | Add, one each: sprinkles, hot fudge, caramel, whipped cream, nuts, cherry | "Redo the Toppings" | | (add: `plop`) |
| `shake` "Shake Machine" | `toppings` (its mixer, right) | Pick `shakeFlavour` → auto `milk` (show `milkPour`) → Cook, stage set `shake` → auto `glass` (show `shakePour`) → Add whipped cream → Add cherry | "Mix Again" | `blenderSwitch` | `{ cook: 'mixer', done: 'mixerStop' }` |

Cones, cups, sundaes and the Waffle Cone Deluxe run scoop → toppings; the banana split and the Kitchen Sink run scoop
(no holder: a boat dish, a sink) → toppings; the milkshake runs the shake machine alone.

What the player hears (words.js; Timed changes only the two cook steps):

- "Freezer Case. Holder: Cone, Waffle Cone or Cup?" → the scoop dips in the warm-water well → "How big?" Small /
  Regular / Huge (Timed: "Stop the scoop when it is right.", one button **Stop the Scoop**, said "Stop the scoop.
  Regular"; left on, it stops at Avalanche) → "Scoop: Vanilla, Chocolate or more?" → "A second scoop: Vanilla,
  Chocolate, more or Done?" → (a third, or Done). A banana split then plays the banana tucking in.
- "Topping Bar. Sprinkles." Add / Skip, then "Hot fudge.", "Caramel.", "Whipped cream.", "Nuts.", "Cherry.". A bad
  one: "Sprinkles with a hair in them.", "A cherry that is actually a tomato." Add / Skip / Swap It.
- "Shake Machine. Flavour: Vanilla, Chocolate or Strawberry?" (a bad one: "Chocolate ice cream, freezer-burned", with
  Swap It) → the milk glugs in → "How thick?" Thick / Creamy / Thin (Timed: **Stop the Mixer**; left on, it stops at
  Melted Puddle) → it pours into the glass → "Whipped cream." Add / Skip → "Cherry." Add / Skip.
- Review: "Here it is." Ring It Up and the redo words.

**Why the scoops are a repeat and the toppings are not.** Spec 5.3 and the proposal both say "flavours one scoop at a
time" and "toppings one at a time, Add or Skip". A scoop is a choice among seven flavours, which an Add step can't be
(seven Add steps a scoop would blow the press budget); a topping is yes or no, and only an Add step can carry a
gross-out, a dislike and "nothing else on it" (pilot.md 5.2). The cost of the repeat: no gross-out on the scoops (the
freezer burn sits on the shake's three-value flavour pick instead, spec 4.6), and the More… row for five flavours.

**The size before the flavours** follows spec 5.3's order (holder, scoop size, flavours). The size is the item's
`done`, so every scoop on it is that size.

## 3. Cooking: two stage sets

| set | stages (first .. last) | Simple `choose` | ask | stop | speed |
|---|---|---|---|---|---|
| `size` | scrape, small, regular, huge, avalanche | Small, Regular, Huge | "How big?" | "Stop the Scoop" | pack `cookSpeeds` 12 / 8 / 5 s a stage, `wantedScale` 2 |
| `shake` | lumpy, thick, creamy, thin, puddle | Thick, Creamy, Thin | "How thick?" | "Stop the Mixer" | the same |

Stage names: Scrape, Small, Regular, Huge, Avalanche; Lumpy, Thick, Creamy, Thin, Melted Puddle. **Avalanche and
Melted Puddle are Timed's last stages** (one mistake, `complain.done`), never gross-outs: the proposal's "melted
puddle" gross-out lands here (spec 4.6 lets a content agent move a brief gross-out that can't sit on an Add or a
small pick). The ticket says the size word alone: "in a cone, regular, one vanilla scoop".

## 4. Recipes

"As written" is the ticket with the normal picks (change 0).

| id | Name | level | course | stations | price | As written (the ticket) | Can change |
|---|---|---|---|---|---|---|---|
| `cone` | Ice Cream Cone | 1 | scoop | scoop, toppings | 3 | in a cone, regular, one vanilla scoop, nothing else on it | holder (cone / waffle cone), size, 1-2 scoops from the five classics; adds sprinkles, hot fudge, nuts |
| `cup` | Cup of Ice Cream (plural "Cups of Ice Cream") | 1 | scoop | scoop, toppings | 3 | in a cup, regular, one vanilla scoop, nothing else on it | size, 1-2 classic scoops; adds sprinkles, caramel, whipped cream |
| `fudgeSundae` | Hot Fudge Sundae | 1 | scoop | scoop, toppings | 5 | in a cup, regular, two vanilla scoops, with hot fudge, whipped cream, nuts and cherry | size, 2 classic scoops; holds nuts, cherry |
| `caramelSundae` | Caramel Sundae | 2 | scoop | scoop, toppings | 5 | in a cup, regular, two chocolate scoops, with caramel, whipped cream, nuts and cherry | size, 2 scoops of all seven; holds nuts, cherry; adds sprinkles |
| `waffleDeluxe` | Waffle Cone Deluxe | 2 | scoop | scoop, toppings | 6 | in a waffle cone, regular, two chocolate scoops, with sprinkles, hot fudge and nuts | size, 2 scoops of all seven; holds sprinkles, nuts |
| `milkshake` | Milkshake | 2 | shake | shake | 4 | chocolate, creamy, with whipped cream and cherry | flavour, thickness; holds whipped cream, cherry |
| `bananaSplit` | Banana Split | 3 | scoop | scoop, toppings | 7 | regular, three vanilla scoops, with hot fudge, whipped cream, nuts and cherry | size, 3 classic scoops; holds nuts, cherry; adds caramel |
| `kitchenSink` | Kitchen Sink Sundae | `'event'` | scoop | scoop, toppings | 20 | huge (the finale), one vanilla scoop, one chocolate scoop and one strawberry scoop, with sprinkles, hot fudge, caramel, whipped cream, nuts and cherry; `look: { shape: 'kitchenSinkSundae', giant: true }` | the finale only |

Slots and picks (level 5 uses the fancy lists):

| slot (question) | values (label; ticket words) | picks |
|---|---|---|
| `holder` "Holder" | cone "Cone", waffleCone "Waffle Cone", cup "Cup"; "in a cone" | `coneHolder`: cone / waffleCone, normal cone (cups and sundaes fix `cup`, the deluxe `waffleCone`) |
| `scoops` "Scoop" (plural "Scoops"), repeat max 3 | vanilla, chocolate, strawberry, mintChip "Mint Chip", cookieDough "Cookie Dough", rockyRoad "Rocky Road", bubblegum; "two chocolate scoops and one vanilla scoop" | `classic`: the first five, normal vanilla, fancy all seven; `allFlavours`: all seven, normal chocolate (the level-2 recipes: Rocky Road and Bubblegum from level 2, spec 5.3) |
| `shakeFlavour` "Flavour" | vanilla, chocolate, strawberry; "chocolate" | `shakeFlavour`, normal chocolate |
| (cook) | size: `size` small / regular / huge, normal regular; shake: `thickness` thick / creamy / thin, normal creamy | |

**How many scoops**: a cone or cup is one scoop as written, two at the level's repeat odds (levels 2 up: 0.3, 0.4, 0.5,
0.5); sundaes and the deluxe are two, the split three, the sink three. (The deluxe was two or three; three scoops of
flavours behind More… put Gus's two of them at 28, the edge of the budget, before any Swap It, so it is two.) Never the customer (spec 0.6).

**Combos** (level 3 up): one item, or two at the level's `more` odds: an ice cream and a milkshake, in that order.
Never two ice creams except Gus's two of one thing.

## 5. The ladder (`levels: {}`)

| Level | On offer | Items | Gross-outs | Extras |
|---|---|---|---|---|
| 1 | cone, cup, hot fudge sundae; five flavours | 1; at most 2 optional toppings; change 0.2; one scoop on cones and cups | none | |
| 2 | + caramel sundae, waffle cone deluxe, milkshake; Rocky Road, Bubblegum | 1; change 0.3; repeat 0.3 | none | |
| 3 | + banana split | 1 or 2: ice cream + shake | 0.3 an order, at most 2 a shift, never the first | |
| 4 | the same | as 3, change 0.4 | as 3 | one odd order at 50% a shift; one visitor (Reginald, Kai or Brock), never first |
| 5 | the same | as 4, change 0.5, fancy (all seven flavours everywhere) | 0.35, at most 2 | odd orders at 60%, `tenScoop` too |

## 6. Ridiculous orders (level 4 and 5)

The customer says `order.odd.<id>` instead of the order; the ticket is plain and complete. An odd order is made as
written, so the customers' `wants` don't reach it: Lulu (always vanilla) and Sal (always chocolate, never a cherry)
are left out of the ones that would contradict them.

| id | level | recipe | the change | The ticket | Who |
|---|---|---|---|---|---|
| `tenScoop` | 5 | cone | huge; scoops chocolate, vanilla, strawberry ("ten scoops" is said: three is the most a cone takes) | Ice Cream Cone: in a cone, huge, one chocolate scoop, one vanilla scoop and one strawberry scoop… | marge gus bev vernon tasha walt |
| `ketchup` | 4 | cup | one strawberry scoop ("with ketchup" is said: no ketchup on the line; "it's red") | Cup of Ice Cream: in a cup, regular, one strawberry scoop… | marge gus bev vernon tasha walt |
| `justCherry` | 4 | fudgeSundae | holds hot fudge, whipped cream and nuts ("just the cherry": the scoops stay, it needs something to sit on) | Hot Fudge Sundae: in a cup, regular, two vanilla scoops, with cherry | marge gus bev vernon tasha lulu walt |
| `malted` | 4 | milkshake | thick, chocolate ("a malted, like 1955": no malt on the line) | Milkshake: chocolate, thick, with whipped cream and cherry | walt |

## 7. The five-star event: The Kitchen Sink

```js
events: { five: { name: 'The Kitchen Sink',
  customers: ['marge', 'gus', 'vernon', 'sal', 'tasha', 'lulu', 'walt', 'reginald', 'kai'],
  finale: { customer: 'bev', items: [{ recipe: 'kitchenSink', set: { size: 'huge' } },
    { recipe: 'milkshake', set: { shakeFlavour: 'chocolate', thickness: 'thick' } }] } } }
```

- The Little League team, **spoken of, never shown** (the counter picture's painted queue has a little-league kid in
  it, which is a happy accident): the families order at level-4 complexity; the finale, always last, is Coach Bev's
  giant Kitchen Sink Sundae for the whole team, served in an actual sink, and a thick chocolate shake for the coach.
  Bev says her `order.gag` ("for the team") with it. If Bev isn't drawn, the first drawn regular orders it.
- The finale: "Kitchen Sink Sundae: huge, one vanilla scoop, one chocolate scoop and one strawberry scoop, with
  sprinkles, hot fudge, caramel, whipped cream, nuts and cherry. Milkshake: chocolate, thick, with whipped cream and
  cherry." 16 presses.
- Mitch: `event.intro`, `event.celebrate`, `event.again` (`{name}` = "The Kitchen Sink").

## 8. Who comes in, and what they order

| id | role here | likes (others 0.5) | also | Brief (proposal / spec 2.3) |
|---|---|---|---|---|
| `marge` | regular | cup 3 | `usual`: a cup, regular, one vanilla scoop (`order.usual`) | "Vanilla in a cup" |
| `gus` | regular | cone 3, deluxe 1 | cast `twin`: two of one thing from level 3 (`order.twin`) | "Two cones" |
| `bev` | regular | fudge sundae 3, caramel sundae 2 | `favourite`: hot fudge sundae, +2; the event's finale ("for the team") | "A sundae for the team" |
| `vernon` | regular | cup 3, cone 1 | `set`: regular size, creamy shakes; cast `exact` | "Single scoop, exact": the count is the level's, so his exactness is the size and the rim |
| `sal` | regular | cone 2, fudge sundae 2, shake 1 | `wants`: chocolate everywhere; `dislikes: ['cherry']` (fruit is rabbit food): held on sundaes, splits, shakes (`order.dislike`) | "Chocolate, no rabbit food" |
| `tasha` | regular (spec 5.4) | shake 3, deluxe 2, cone 1 | `set`: huge ("whatever, huge") | the deadpan skater |
| `lulu` | local | cone 3, cup 2, fudge sundae 1 | `wants`: vanilla everywhere (she agonises out loud, then picks vanilla; the ticket shows the final pick); `order.gag`; scale 0.66 | Little Lulu |
| `walt` | local | fudge sundae 3, shake 2, split 2 | `favourite`: hot fudge sundae, +2; `wants`: thick shakes; `order.gag`; the tutorial customer; his own odd order `malted` | Grandpa Walt, "like 1955" |
| `reginald` | visitor, level 4 | split 2, caramel sundae 1 | cast `newest` | the critic |
| `kai` | visitor, level 4 | cone 2, shake 2 | cast `short`: one item | the young reviewer |
| `brock` | visitor, level 4 (cameo, spec 2.2) | shake 3, split 2, deluxe 2 | the Smoothie Shack's gym bro on his cheat day | cross-court: "all the protein" turned inside out |

Pam (the Pizza Parlor's party mom) was the first cameo choice; `tests/cast.test.cjs` says she and Lulu are both
Zira only 0.83 SAPI steps apart, so she can't share a shift with Lulu. Brock passes every cast and voice test here.
Every flavour a customer wants (Lulu's vanilla, Sal's chocolate) is on the first screen, so nobody's order takes more
presses than anyone else's.

## 9. Gross-outs (from level 3)

| id | on | label (`say`) | fx | What it does |
|---|---|---|---|---|
| `hair` | sprinkles (Add) | "{name} with a hair in them" → "Sprinkles with a hair in them." | kit `hair` | Mitch `gross.hair`; served: `react.gross`, `complain.gross.hair` |
| `tomato` | cherry (Add, topping bar and shake machine) | "a {name} that is actually a tomato" → "A cherry that is actually a tomato." | **new** `tomato`: the cherry drawn as a cherry tomato (matte, lighter red, a green star of a stem) | as above, `.tomato`; the tutorial's |
| `freezerBurn` | shake flavour pick (vanilla, chocolate, strawberry) | "{name} ice cream, freezer-burned" → "Chocolate ice cream, freezer-burned." | **new** `frost` (white frost crystals, a grey crust) plus `tint` #c9d6de | Mitch `gross.freezerBurn` ({value}); served: `complain.gross.freezerBurn` ({value}) |

Swap It replaces it and asks again; Skip sends an Add back (a missing-topping mistake if the ticket wanted it);
another flavour on the pick is a pick mistake. Changes to the brief (spec 4.6): the freezer burn moved to the shake's
flavour pick (the scoops are a repeat, which can't carry one); the melted puddle is the shake's last Timed stage.

## 10. For food-icecream: every look, set, flourish and cook

`made()` of a cone: `{ recipe: 'cone', ing: 'iceCream', done: 'regular', parts: [{ ing: 'sprinkles', gross? }], gross,
picks: { holder: 'waffleCone', scoops: ['chocolate', 'chocolate', 'vanilla'] }, counts: {}, auto: ['dip'] }`
(`picks.scoops` in pick order, alike ones together on a ticket but in the order picked here). A banana split: `ing:
'bananaSplit'`, no holder, `auto: ['dip', 'banana']`. The sink: `ing: 'kitchenSink'`. A milkshake: `{ recipe:
'milkshake', ing: 'milkshake', done: 'thick', picks: { shakeFlavour }, parts: [whippedCream, cherry], auto: ['milk',
'glass'] }`. **`made.done` is the scoop size** on every scoop item (every scoop on it is that size) and the
thickness on a shake. **Recipe looks name the layout**: read `pack.recipes[made.recipe].look.shape`.

| look.shape | used by | set(s) | how it looks | with cooking |
|---|---|---|---|---|
| `scoopBall` | ingredient `iceCream` (the scoop being sized); every `scoops` value (`colour`, `flecks`, `chunks`) | scoop, toppings, counter | a round scoop with the scooper's ridge and a ruffled skirt where it sits, `look.colour`; `flecks` small dark or bright bits (strawberry pieces, mint chips, bubblegum balls), `chunks` bigger lumps (cookie dough, marshmallows) | size from `made.done` (or `o.stage` in the scooper): `iceCream.look.sizes` gives a radius scale per stage (scrape 0.35, small 0.7, regular 0.9, huge 1.15, avalanche 1.45: a lopsided heap sliding off) |
| `plainCone` | holder `cone` | scoop, toppings, counter | a pointed cake cone, pale golden with a grid of shallow squares, in a cone stand | none |
| `waffleCone` | holder `waffleCone` | " | a taller, wider waffle cone, darker gold, a deep diamond pattern, a rolled rim | none |
| `stripedCup` | holder `cup` | " | a pink-and-white striped paper cup (as the dispenser in the scoop picture), a spoon in it once there is a scoop | none |
| `bananaBoat` | ingredient `bananaSplit` (the item) | " | a long glass boat dish | none |
| `sinkBasin` | ingredient `kitchenSink` (the item) | " | an actual steel kitchen sink with a tap and a plug chain, filled with ice cream | none |
| `shakeCup` | ingredient `milkshake` | toppings (the mixer), counter | the steel mixing cup on the mixer; then the tall fluted glass with a red-and-white striped straw | the shake's surface by stage: lumpy (scoops sticking up), thick (a domed top), creamy (smooth, a slow swirl), thin (a flat liquid top, little bubbles), puddle (thin and pale, a melted ring); its `ramp` colours the plates; the flavour colour comes from `made.picks.shakeFlavour` |
| `shakeScoop` | `shakeFlavour` values | toppings | a scoop of that colour dropped into the steel cup | none |
| `rainbowSprinkles` | sprinkles | toppings, counter | rainbow jimmies scattered over the top scoop (the jar in the toppings picture) | none |
| `fudgeDrizzle` | hot fudge | " | glossy dark fudge poured over the top and running down the sides in drips | none |
| `caramelDrizzle` | caramel | " | the same, amber | none |
| `whippedSwirl` | whipped cream | " | a piped white swirl with a peak on the top scoop (on a shake, on the glass) | none |
| `choppedNuts` | nuts | " | tan chopped nuts scattered on the cream or the top scoop | none |
| `maraschino` | cherry | " | a glossy red cherry with a long stem, on the very top | none |
| `coneStack` | recipe look: cone, waffle cone deluxe | layout | the holder upright in a cone stand, the scoops stacked on it one above the other, the toppings on the top scoop | by `made.done` |
| `cupStack` | recipe look: cup | layout | the cup, the scoops side by side then stacked, the toppings on top | by `made.done` |
| `sundaeCup` | recipe look: both sundaes | layout | the cup (the holder value), two scoops, the sauce running down them, cream, nuts, cherry | by `made.done` |
| `bananaSplit` | recipe look: banana split | layout | the boat dish, three scoops in a row, a banana half along each side, the toppings on the scoops | by `made.done` |
| `kitchenSinkSundae` | recipe look: Kitchen Sink, `giant: true` | layout | the sink, its three scoops heaped, every topping, a cherry on top; the kit draws it 1.6 times bigger (cap it with `giantMax` on scoop and toppings) | by `made.done` (huge in the finale) |
| `shakeGlass` | recipe look: milkshake | layout | the tall glass, straw, cream and cherry on top | by `made.done` |

**Flourishes** (auto steps, never judged; Reduced resolves each at once):

- `scoopDip` (every scoop item, after the holder): the scooper dips into the warm-water well (the sink with the tap in
  the scoop picture) and comes out dripping. Played for cones, cups and sundaes; for a banana split and the sink it is
  the first step of the order, so it runs inside `create()` and is never played (line.md).
- `bananaTuck` (banana split, after the scoops): two banana halves slide in along the sides of the boat.
- `milkPour` (shake): milk glugs into the steel cup over the scoop.
- `shakePour` (shake, after the mixer): the cup tips and the shake pours into the tall glass.

**Sets** (measure your own lines: the 5.2 table asked for scoop 62 and toppings 62):

- `counter`: `line: 0.80`, `surface { y, back }` (spec 5.2, decision 3): a white marble top with a pink edge over
  pink panels and white trim, as the court picture draws the Emporium (`BBCourt.layout` box [75, 57, 100, 89]); the
  whole order left of the painted queue (`BBArt.icecream.counter.queue[0]` = 0.55; heads 0.508, feet 0.723, horizon
  0.48, sign [0.339, 0.086, 0.733, 0.171]) and right of the Pause sign at every window shape: copy the pizza's
  `counter.arrange`. Build nothing above the line. Two items side by side: an ice cream and a shake, or Gus's two.
- `scoop`: the freezer case's top (the seven tubs, left to right vanilla, chocolate, strawberry, mint chip, cookie
  dough, rocky road, bubblegum: the same order as the slot's values) with the holder low and left of centre; the
  holder pick sets the cone, cup or boat in a stand; its `pick` hook drops each scoop on as it is picked (the scoop
  sound plays at the last). The cook `scoop` (the size): the scooper over the tub, the ball growing a stage at a
  time; Simple runs it to the chosen stage; Timed grows it with a size mark (1-3 rings, say) and the word; at
  Avalanche the ball slumps over the side. **Size shows as a size and a mark**, not colour alone (ACCESSIBILITY §9).
- `toppings`: the item on the marble counter (low, centre left), the next topping waiting in its jar or warmer on the
  right (`incoming`); the shake machine (the mint-green mixer, right) for the shake station: the steel cup on the
  spindle, cook `shake` (the cup turns, the surface changes by stage, a mark per stage), then `shakePour`.

New gross-out fx: `tomato` (the cherry), `frost` (the shake's scoop). The rest are the kit's.

## 11. Sounds

`scoop`: `cook: 'scoop'` (the ball lands as the size is set), `done: 'scoop'` (after the last scoop). `shake`:
`cook: 'mixer'`, `done: 'mixerStop'`. Every Add plays `plop`, each Timed stage `tick`. The flourishes have no sound of
their own (no icecream pour sound exists; the page's `auto` hook stays silent for these stations). All exist
(`packs/icecream/sound`).

## 12. Every script moment and who must say it

`SC.moments(pack)` on the merged pack (F: the pack's `'customer'` fallback counts for anyone with fewer than two of
their own):

- **Customers, everyone** (marge gus bev vernon sal tasha lulu walt reginald kai brock): `greet` ×3, `smalltalk` ×3,
  `goodbye` ×3 (the cast script supplies them for the regulars and visitors; Lulu, Walt and Brock need their own
  here); F: `react.3`/`.2`/`.1` ×3 each of their own, `react.gross`, `complain.extra`/`.unasked`/`.missing`
  ({ing}{ings}), `complain.tooMany`/`.tooFew` (the scoops: {count} is the wanted number of scoops),
  `complain.done` ({want}: a size or a thickness), `complain.pick` ({slot}{want}: holder, scoop, flavour),
  `complain.more`, `complain.gross.hair`/`.tomato` ({ing}), `complain.gross.freezerBurn` ({value}, {slot} "flavour").
- **Some**: `visitor.arrive` reginald kai brock; `order.usual` marge; `order.twin` gus; `order.dislike` sal (the
  cherry); `order.gag` lulu, walt (and bev, the finale's orderer: "for the team"); `react.favourite` bev, walt;
  F `order.odd.tenScoop`, `.ketchup` (marge gus bev vernon tasha walt), `.justCherry` (+ lulu), `.malted` (walt).
- **Mitch**: `shift.start`, `shift.end`, `uniform`; `tutorial.intro`, `.ticket`, `.review`, `.serve`, `.gross`,
  `tutorial.scoop`, `.toppings`, `.shake`, `tutorial.cook.scoop`, `.cook.shake`; `tutorial.warn.extra`/`.unasked`/
  `.missing`/`.tooMany`/`.tooFew`/`.done`/`.pick`/`.gross`/`.grossSkip` (2 each); `gross.hair`, `.tomato`,
  `.freezerBurn` (2 each); `nearly` ({want}{name}); `after.3`, `after.1`, `after.gross`; `event.intro`/`.celebrate`/
  `.again` ({name}).
- **Blank words**: {slot} holder, scoop, flavour; {want}/{got} cone, waffle cone, cup, vanilla … bubblegum, small,
  regular, huge, thick, creamy, thin (and scrape, avalanche, lumpy, melted puddle as {got}); {count} one, two, three.

## 13. Help

As `pack.help`: the freezer case (holder, size, each scoop and Done, More for the rest of the flavours), the topping
bar, the shake machine, the ticket, Swap It.

## 14. Theme: pastel pink

| token | value | token | value | token | value |
|---|---|---|---|---|---|
| pageBg | #4a1030 | ticketAccent | #a3215a | cardValue | #ffe7a3 |
| panelTop | #b02a63 | ticketNow | #ffe0ee | logoTop | #ffd6e7 |
| panelBottom | #7f1c47 | perforation | #e7b3c9 | logoMain | #fff7fb |
| panelLip | #460c29 | hudBg | rgba(76,16,49,.86) | wheelInk | #2a1020 |
| plateTop | #fff7fb | gaugeBg | rgba(52,10,34,.92) | wheelSteel | #ece4e8 |
| plateBottom | #fde0ec | star | #c97c00 | wheelDark | #b02a63 |
| mark | #6b3a1f | boardGlow | #7a1d48 | board | #5a1238 |
| labelBg | rgba(70,12,41,.9) | woodInset | #460c29 | wood | #ffc6dc (a pastel pink frame) |

Pastel pink can't carry the yellow highlight (#ffc6dc is 1.02:1 against #ffd400), so the panels and boards are
raspberry and berry, and the pastel pink is the plates, the ticket's current line, the logo and the boards' frame
(the highlight's own frame and brackets mark it there, as on the pizza's white frame). Contrast, computed (WCAG;
translucent tokens composited over white; `tests/pack.test.cjs` checks the first five):

- The highlight #ffd400 on: panelTop 4.37, panelBottom 6.79, board 9.29, boardGlow 7.00, pageBg 10.42, gaugeBg 9.90
  (need 3).
- Text: wheelInk on plateTop 16.72, plateBottom 14.29, ticketNow 14.37; ticketAccent on paper (#fffdf6) 7.06 and on
  ticketNow 5.87; white on labelBg 12.02, hudBg 9.99, gaugeBg 14.18; chalk (#fff7e6) on board 12.48 and boardGlow
  9.39; cardValue 10.90 / 8.21; logoTop 10.15 / 7.64; logoMain 12.64 / 9.51; white on a lit panel item 6.25 (need 4.5).
- Graphics: star on the receipt's paper 3.24, board 4.03, boardGlow 3.04; mark on the plates 8.87 / 7.58 (need 3).

## 15. The tutorial

Grandpa Walt (the Emporium's own); one guided order through every station: "Hot Fudge Sundae: in a cup, regular, two
vanilla scoops, with hot fudge, whipped cream, nuts and cherry. Milkshake: chocolate, thick, with whipped cream and
cherry." The sundae's cherry comes down as a tomato (`gross: { item: 0, ing: 'cherry', event: 'tomato' }`), so Swap
It is taught once. Always Simple; Mitch warns before each mistake. 17 presses done right, plus the Swap It.

## 16. Press counts (`pressReport('icecream')`, Serve included; Simple and Timed alike)

| recipe | levels | presses |
|---|---|---|
| cone, cup | 1 | 11-12 (holder, size, a scoop (+1 if it is behind More…), Done, 6 toppings, Serve) |
| cone, cup | 2-5 | 11-14 (two scoops) |
| fudgeSundae | 1-5 | 12-14 |
| caramelSundae, waffleDeluxe | 2-5 | 12-14 |
| milkshake | 2-5 | 5 (flavour, thickness, cream, cherry, Serve) |
| bananaSplit | 3-5 | 11-14 (no holder; three scoops end the pick without Done) |
| kitchenSink + shake (the finale) | event | 16 |

Budget (spec 4.3): level 1 ≤ 14, any order ≤ 28. Every item is at most 13 presses before Serve. Whole orders over
18,600 bot orders (300 shifts a level, the event and the tutorial, Simple and Timed; scratch sweep, not in the suite):
levels 1-2 at most 14; level 3 at most 26; levels 4-5 at most 27 (Gus's two of a kind); the event at most 28 (two
items and a Swap It); the tutorial 17. Every right-answer order three stars.

## 17. Requests

- **food-icecream**: section 10; then its `index.html` line.
- **page / integrate**: draw the `scoop` prop as the size's Timed control and `blenderSwitch` as the mixer's.

## 18. The page and the driver (repeats and More… rows)

- The page already played them (game.js gives a More… answer its `rowItems`; ui.js enters it as a row with a spoken
  Back stop). Nothing on the page changed.
- `tests/dom-play.cjs` now plays them (content-icecream, pilot.md 5.5): `leafOf(options, value)` finds an answer by its
  value at any depth of rows; `pathOf(options, id)` gives the rows to enter on the way; the line step answers a repeat
  with the ticket's values still to go (`L.remaining`), then Done. `stats.rowsEntered` counts the rows entered.
- The ice cream's named runs: "the Ice Cream Emporium: ..." (seeds 141-149), including its Grand Opening (all six
  others at five stars) and the whole chain (diner, pizza, icecream, seven open: the parts of the U).
