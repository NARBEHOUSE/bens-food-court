# Ben's Sushi, the pack in words (content-sushi, phase 2b, 2026-11-09)

`packs/sushi/pack.js` (pack version 1). Format: `docs/api/pack-format.md`; the line `docs/api/line.md`; the script
`docs/api/script.md`; sounds `docs/api/audio.md`; the food `docs/api/world.md` and `docs/api/food.md`.
**food-sushi works from section 10** (every look, set, flourish and cook to draw). **The script is section 12** (every
moment and who must say it; written: `packs/sushi/script.js`, in words `docs/api/packs/sushi-script.md`).

**Check it** (from the game folder):

```
node -e "const B=require('./tests/bot.cjs'),SC=require('./js/core/script.js'),R=B.restaurants().find(r=>r.id==='sushi');console.log(B.schema.validate(R.pack),SC.check(R.pack,R.script),SC.coverage(R.pack,R.script))"
node -e "console.table(require('./tests/bot.cjs').pressReport('sushi'))"
BB_PACKS=sushi node --test "tests/*.test.cjs"
```

## 1. At a glance

| | |
|---|---|
| id, name | `sushi`, "Ben's Sushi" (court: "Sushi", right arm, slot 1 (upper), locked at the start, the 3rd to unlock) |
| version | 1 |
| format | `3`: `packs/sushi/script.js` covers every moment (333 lines; `SC.check` and `SC.coverage` `[]`; in words `docs/api/packs/sushi-script.md`) |
| manager | `{ id: 'mitch', art: 'mitch-sushi' }`: headband, sushi chef's jacket, a very serious face |
| backdrops | `counter`, and by station `prep` (prep, soup) and `roll` (mat, board). All three exist (`BBArt.sushi`) |
| courses | `['main', 'side']`: rolls are mains, miso soup the side |
| levels | `{}`: the engine's ladder unchanged |
| no paging | every pick has 2 or 3 values, so no screen ever shows More… (the driver needs nothing new) |

## 2. The line: stations and steps

| Station | backdrop | Steps, in order | redo | tool | sounds |
|---|---|---|---|---|---|
| `prep` "Prep Table" | `prep` | builds on `roll` (the bamboo mat). Pick `roll` → Pick `rice` → Add, one each: salmon, tuna, crab, cucumber, avocado, cream cheese, sesame seeds, spicy mayo, eel sauce | "Redo the Roll" | | (add: `plop`; the two sauces `squirt`) |
| `mat` "Rolling Mat" | `roll` | Cook, stage set `roll` (cooks the item), `simple: 'auto'` | "Roll It Again" | none: the page's drawn button (`.ctl.btn.tool`) | `{ cook: 'mat' }` |
| `board` "Cutting Board" | `roll` | Pick `pieces` → auto `slice` (show `rollSlice`); both only `when: { slot: 'roll', in: ['regular', 'insideOut'] }` | "Slice Again" | | `{ auto: 'knife' }` |
| `soup` "Soup Station" | `prep` | builds on `soup` (the bowl). Pick `miso` → auto `ladle` (show `misoLadle`) → Add tofu, seaweed, mushrooms | "Redo the Soup" | | (add: `plop`) |

A roll runs prep → mat → board; a miso soup runs soup. **A hand roll is a cone and is never sliced**: the board's two
steps pass it by (`when`, read from the ticket), the ticket leaves the pieces out, and the review never offers "Slice
Again" for it. That is the only `when` in the pack: a hand roll is one press shorter (12 with Serve, Simple).

What the player hears (words.js; Timed changes only the mat):

- "Prep Table. Roll: Regular, Inside-Out or Hand Roll?" → "Rice: White, Brown or None?" → "Salmon." Add / Skip, then
  "Tuna.", "Crab." … "Eel Sauce.". A bad one: "The salmon, smelling off." Add / Skip / Swap It.
- The mat, Simple: nothing to answer. It rolls by itself to the ticket's tightness (the proposal's "it rolls and slices
  with a flourish"; the cafe's espresso pour works the same way). Timed: "Rolling Mat. Stop rolling when it is right.",
  one button **Stop Rolling**; left on, it stops at Squashed.
- "Cutting Board. Pieces: 6, 8 or 10?" 6 / 8 / 10, then the knife slices it.
- "Soup Station. Miso: White or Red?" → the ladle → "Tofu." Add / Skip, "Seaweed.", "Mushrooms.".
- Review: "Here it is." Ring It Up, the redo words, or Redo… (a row) when there are more than three.

The ticket, as written: "California Roll: regular roll, white rice, with crab, cucumber and avocado, firm, 8 pieces."
A hand roll: "California Roll: hand roll, white rice, with crab, cucumber and avocado, firm." Soup: "Miso Soup: white
miso, with tofu and seaweed."

**Fillings and toppings are Add steps, not a repeat pick** (pilot.md 5.2): the fish gross-outs sit on them, Marge's
raw-fish dislike and Dennis's eel sauce are held as recipe parts, and nothing pages behind More….

**Why the roll is the cook, and why Simple doesn't ask it.** Spec 5.1 gives every pack a stage set with a Timed
control; spec 5.3 makes the pieces "a pick in Simple and Timed alike, with a flourish"; the proposal's Simple is
"choose 6, 8 or 10 pieces and it rolls and slices with a flourish". So the cook is the rolling (how tight), Timed stops
it, and in Simple it rolls by itself to the ticket (`simple: 'auto'`): Simple's only cooking choice is the pieces,
exactly as the proposal has it. The proposal's Timed "stop the knife on each cut line" would be a new mechanic (several
stops in one step); the spec's single pick replaces it.

## 3. Cooking: one stage set

| set | stages (first .. last) | Simple `choose` | ask | stop | speed |
|---|---|---|---|---|---|
| `roll` | flat, loose, firm, tight, squashed | Loose, Firm, Tight (never asked: `simple: 'auto'`) | "How tight?" | "Stop Rolling" | pack `cookSpeeds` 12 / 8 / 5 s a stage, `wantedScale` 2 |

Stage names: Flat, Loose, Firm, Tight, Squashed. **Squashed is Timed's last stage** (one mistake, `complain.done`),
never a gross-out. Every roll cooks to the recipe's `done: { pick: 'tight' }` (normal Firm). The tutorial is always
Simple, so it never asks: `tutorial.warn.done` does not apply here (`SC.moments` leaves it out).

## 4. Recipes

`level` is the only gate. "As written" is the ticket with the normal picks (change 0).

| id | Name | level | course | stations | price | As written (the ticket) | Can change |
|---|---|---|---|---|---|---|---|
| `californiaRoll` | California Roll | 1 | main | prep, mat, board | 8 | regular roll, white rice, with crab, cucumber and avocado, firm, 8 pieces | roll, rice, tight, pieces; adds sesame |
| `spicyTunaRoll` | Spicy Tuna Roll | 1 | main | " | 9 | …with tuna, cucumber and spicy mayo… | picks; holds cucumber; adds sesame |
| `veggieRoll` | Veggie Roll | 1 | main | " | 7 | …with cucumber and avocado… | picks; adds cream cheese, sesame |
| `phillyRoll` | Philly Roll | 2 | main | " | 9 | …with salmon, cucumber and cream cheese… | picks; holds cucumber; adds sesame |
| `dragonRoll` | Dragon Roll | 2 | main | " | 11 | …with crab, cucumber, avocado, sesame seeds and eel sauce… | picks; holds sesame |
| `misoSoup` | Miso Soup (plural "Bowls of Miso Soup") | 2 | side | soup | 3 | white miso, with tofu and seaweed | miso; adds mushrooms |
| `rainbowRoll` | Rainbow Roll | 3 | main | prep, mat, board | 13 | …with salmon, tuna, crab, cucumber and avocado… | picks; holds cucumber |
| `buildYourOwn` | Build Your Own Roll | 3 | main | " | 12 | …with salmon, tuna, crab, cucumber and avocado… | picks; holds salmon, tuna, crab, avocado; adds cream cheese, sesame, spicy mayo, eel sauce |
| `sushiBoat` | Sushi Boat | `'event'` | main | " | 26 | regular roll, white rice, with salmon, tuna, crab, cucumber, avocado and sesame seeds, firm, 10 pieces; `look: { shape: 'sushiBoat', giant: true }` | the finale only |

Slots and picks (level 5 uses fancy lists; none are set, so level 5 draws from the same values):

| slot (question) | values (label; ticket words) | pick: values, normal |
|---|---|---|
| `roll` "Roll" | regular "Regular", insideOut "Inside-Out", handRoll "Hand Roll"; "regular roll", "inside-out roll", "hand roll" | regular/insideOut/handRoll, regular |
| `rice` "Rice" | white "White", brown "Brown", noRice "None"; "white rice", "rice: none" | white/brown, white (None only in the odd order `noFishNoRice`) |
| `pieces` "Pieces" | six "6", eight "8", ten "10"; "8 pieces" | six/eight/ten, eight |
| `miso` "Miso" | whiteMiso "White", redMiso "Red"; "white miso" | whiteMiso/redMiso, whiteMiso |
| (pick `tight`, the roll's stage) | loose, firm, tight | loose/firm/tight, firm |

**Values added** (spec 2.3 lets the content agent add values so the brief fits the line): rice **None** (`noRice`,
"rice: none"), for the proposal's "a roll with no fish and no rice"; never drawn otherwise. The miso soup's line (miso
White/Red, tofu, seaweed, mushrooms) is this lane's: the spec names the side and nothing more.

**Combos** (level 3 up): one item, or two at the level's `more` odds: a roll and a miso soup. Never two rolls except
Gus's two of one thing. Order Size "One Item" makes every order one item.

## 5. The ladder (`levels: {}`)

| Level | On offer | Items | Gross-outs | Extras |
|---|---|---|---|---|
| 1 | california, spicy tuna, veggie | 1; at most 2 optional parts; change 0.2 | none | |
| 2 | + philly, dragon, miso soup | 1; change 0.3 | none | |
| 3 | + rainbow, build your own | 1 or 2 (35% two): a roll + miso | 0.3 an order, at most 2 a shift, never the first | |
| 4 | the same | as 3, change 0.4 | as 3 | one odd order at 50% a shift; one visitor (Reginald, Kai or Inferno), never first |
| 5 | the same | as 4, change 0.5 | 0.35, at most 2 | odd orders at 60%, `theWorks` too |

## 6. Ridiculous orders (level 4 and 5)

| id | level | recipe | the change | The ticket | Who | Presses (Simple) |
|---|---|---|---|---|---|---|
| `noFishNoRice` | 4 | californiaRoll | holds crab; rice None ("no fish and no rice") | California Roll: regular roll, rice: none, with cucumber and avocado, firm, 8 pieces | anyone | 13 |
| `sushiBurrito` | 4 | rainbowRoll | hand roll, adds spicy mayo ("a sushi burrito, don't cut it"; it belongs at the burrito place) | Rainbow Roll: hand roll, white rice, with salmon, tuna, crab, cucumber, avocado and spicy mayo, firm | gus bev vernon sal dennis (never Marge: raw fish; never Hiro) | 12 |
| `justGinger` | 4 | veggieRoll | holds avocado, 6 pieces ("just the ginger": the ginger is said, never made; the roll is "to put it on") | Veggie Roll: regular roll, white rice, with cucumber, firm, 6 pieces | anyone | 13 |
| `theWorks` | 5 | buildYourOwn | inside-out, 10 pieces, adds cream cheese, sesame, spicy mayo, eel sauce | Build Your Own Roll: inside-out roll, white rice, with everything on the line, firm, 10 pieces | anyone (dislikes still held: Marge's fish, Dennis's eel sauce) | 13 |

## 7. The five-star event: The Sushi Boat

```js
events: { five: { name: 'The Sushi Boat',
  customers: ['marge', 'gus', 'bev', 'vernon', 'sal', 'dennis', 'reginald', 'kai', 'inferno'],
  finale: { customer: 'hiro', items: [{ recipe: 'sushiBoat', set: { tight: 'firm' } }, { recipe: 'misoSoup', set: { miso: 'redMiso' } }] } } }
```

- Shift Length orders at level-4 complexity from the court's regulars, Dennis and the visitors; the last is always
  **Chef Hiro's** (spec 4.4: "his reaction is the approval"; the 5th star still follows the average rule).
- The finale: "Sushi Boat: regular roll, white rice, with salmon, tuna, crab, cucumber, avocado and sesame seeds, firm,
  10 pieces. Miso Soup: red miso, with tofu and seaweed." 17 presses in Simple, 18 Timed. The boat is drawn giant and
  adds no choices. Hiro is a local here, so he says his `order.gag` after it (the page plays it for a local at home
  and for the finale's orderer). If Hiro isn't drawn, the first drawn regular (Marge) orders it.
- Mitch: `event.intro`, `event.celebrate`, `event.again`.

## 8. Who comes in, and what they order

| id | role here | likes (others 0.5) | also | Brief (proposal / spec 2.3) |
|---|---|---|---|---|
| `marge` | regular | california 3, veggie 1 | `usual`: california, regular, white, firm, 8 (`order.usual`); `dislikes: ['salmon', 'tuna']`: never a roll that must have raw fish, held where optional (`order.dislike`) | California roll, "nothing raw, hon" |
| `gus` | regular | california 2, spicy tuna 2, dragon 1 | cast `twin` from level 3 (`order.twin`: "two of every roll" is said) | "Two of every roll" |
| `bev` | regular | spicy tuna 3 | `favourite`: spicy tuna, +2 (`react.favourite`) | Spicy tuna |
| `vernon` | regular | rainbow 2, spicy tuna 1, california 1 | `set`: regular, white, tight, 8; cast `exact` | "Judges it alongside Chef Hiro": orders alone; his lines name Hiro |
| `sal` | regular | california 3, spicy tuna 1 | `favourite`: california, +2; no lettuce here, no dislike | "Asks if there's a hot dog roll" (his lines) |
| `hiro` | local | veggie 3, rainbow 2, california 1 | `set`: regular, white, firm, 8; `order.gag`; the event's finale | Chef Hiro, the stern master who comes in to judge |
| `dennis` | local | california 3, veggie 3, spicy tuna 1, miso 1 | `dislikes: ['eelSauce']` (`order.dislike`); `order.gag`; the tutorial's customer | the nervous first-timer who has never had sushi |
| `reginald` | visitor, level 4 | rainbow 2, dragon 1 | cast `newest` | the critic |
| `kai` | visitor, level 4 | california 2, veggie 2 | cast `short`: one item | the young reviewer |
| `inferno` | visitor, level 4 (cameo, spec 2.2) | spicy tuna 3 | `always: ['spicyTunaRoll']` | Ben's Burritos' hot-sauce fanatic, here for the spicy mayo; returns Chef Hiro's visit to the burrito place |

## 9. Gross-outs (from level 3)

| id | step | on | label (`say`) | fx | What it does |
|---|---|---|---|---|---|
| `smelly` | Add | salmon | "the {name}, smelling off" → "The salmon, smelling off." | `stink` (#9fbf5a), `tint` #d49a7e | Mitch `gross.smelly`; served: `react.gross`, `complain.gross.smelly` |
| `wink` | Add | tuna | "the {name}, winking at you" → "The tuna, winking at you." | **`wink`: food-sushi's own fx** (an eye on the tuna that winks; Reduced: the eye drawn shut in a wink, no motion) | as above, `.wink` |
| `hair` | pick `rice` (3 values) | white, brown | "{name} rice with a hair in it" → "White rice with a hair in it." | `hair` | `.hair` (lines use {value}/{slot}) |
| `soggy` | pick `roll` (3 values) | regular, insideOut, handRoll | "{name}, soggy seaweed" → "Inside-out, soggy seaweed." | `droop`, `tint` #4f6a3a (on the nori) | `.soggy` |

Swap It replaces it and asks again; on a pick, choosing another value is a pick mistake. A squashed roll is Timed's
last stage instead (spec 4.6). The tutorial teaches Swap It on the hair in the rice (a pick).

## 10. For food-sushi: every look, set, flourish and cook

`made()` of a roll: `{ recipe, ing: 'roll', done: 'firm', parts: [{ ing: 'crab' }, …, { ing: 'tuna', gross? }], gross,
picks: { roll, rice, pieces? }, counts: {}, auto: ['slice'] }` (no `pieces` and no `slice` for a hand roll). Miso:
`{ recipe: 'misoSoup', ing: 'soup', parts: [tofu, wakame, mushrooms?], picks: { miso }, auto: ['ladle'] }`.
**Recipe looks name the layout**: read `pack.recipes[made.recipe].look.shape` (`sushiRoll`, `sushiBoat`, `misoSoup`),
and **`made.picks.roll` decides the roll's form** (a log cut into pieces; inside-out with the rice outside; a hand
roll cone).

| look.shape | used by | set(s) | how it looks | with cooking (`made.done`, or `o.stage` on the mat) |
|---|---|---|---|---|
| `rollMat` | ingredient `roll` (the vessel) | prep, mat; counter: a wooden serving board instead | a square bamboo rolling mat (slats, string ties; the colour #d9b26a). On the counter the roll sits on a low wooden geta board, a little longer than the cut roll | the mat curls round the roll on the mat set |
| `nori` | roll `regular` (#1f3326) | prep, mat, board, counter | a dark green-black nori sheet laid flat on the mat; once rolled, the nori is the roll's outside | rolled: see `sushiRoll` |
| `noriInside` | roll `insideOut` | " | the same sheet; once rolled the **rice is outside**, the nori a thin dark ring inside each piece | " |
| `noriCone` | roll `handRoll` | " | a half sheet that, once rolled, is a cone held upright (a stand or the board's slot), the fillings showing at the open top | the cone tightens (Loose: the nori's edge lifting; Tight: a gloss; no string band, it would vanish at the counter); never sliced |
| `rice` | rice `white` (#fbf8f0), `brown` (#c8a171) | prep, mat, board, counter | a grainy layer of rice pressed over most of the nori (grains as small bumps, not a flat slab) | rolled: the rice ring in every cut face |
| `noRice` | rice `noRice` | " | nothing on the nori: bare dark sheet (a few seeds of nothing; make "rice: none" read as bare) | the rolled log is thinner |
| `salmon` | salmon (#f28a5b) | " | a strip of orange salmon with pale fat lines, laid across the rice | in every cut face, an orange patch |
| `tuna` | tuna (#c8283c) | " | a strip of deep red tuna | a red patch |
| `crab` | crab (#f4e6dc) | " | crab sticks: white with a red-orange top edge | a white-and-red patch |
| `cucumber` | cucumber (#5aa63a) | " | thin green batons with pale centres | a green square in the cut face |
| `avocado` | avocado (#b7cf5a) | " | pale green crescent slices | a yellow-green patch |
| `creamCheese` | cream cheese (#fbf7ee) | " | a white block strip | a white patch (needs a cue against the rice: a faint blue-grey shadow edge; food.md 7, white on white) |
| `sesame` | sesame seeds (#e9d9a6) | " | tiny pale seeds sprinkled over the top (`shake` fits) | rolled in where they fell (food audit 2026-11-11): in the rice ring of each cut face; inside-out, among the fillings (the sheet was flipped before them) |
| `sauce` | spicy mayo (#f08a3c), eel sauce (#4a2414), `sauce: true` | " | squeeze-bottle zigzags (the kit's `squirt`) over the band of fillings, two sauces side by side | rolled in with the fillings (food audit 2026-11-11: on top it hung in arcs over the pieces): a swirl in every cut face; a hand roll keeps it on top of the open mouth |
| `rollCut` | pieces `six`/`eight`/`ten` (`look.pieces`) | board, counter | the log cut into that many rounds, set out in a row (or two rows of 5 for ten), cut faces up so the fillings show | none (cut after rolling) |
| `misoBowl` | ingredient `soup` (the vessel, #8a1f1a) | prep (soup station), counter | a red lacquer soup bowl, black inside | none |
| `misoBroth` | miso `whiteMiso` (#e0b86a), `redMiso` (#8a4a22) | " | cloudy broth filling the bowl, the miso swirling faintly | none |
| `tofu` | tofu (#fbf6e8) | " | small white cubes floating | none |
| `wakame` | seaweed (#2f5a2a) | " | dark green ribbons floating | none |
| `enoki` | mushrooms (#f1e9d2) | " | a small bunch of thin white enoki mushrooms | none |
| `sushiRoll` | recipe look: every roll but the boat | layout | prep: the mat, the nori, the rice, the fillings laid across in a band, toppings waiting; mat: rolled into a log; board and counter: the cut pieces in a row on the board (hand roll: the cone), toppings and sauces over them | the log's tightness (below) |
| `sushiBoat` | recipe look of `sushiBoat`, `giant: true` | layout | a little wooden boat (bow and stern, a mast flag optional) with the ten pieces lined along its deck; the kit draws it 1.6 times bigger (cap with `giantMax`) | as `sushiRoll` |
| `misoSoup` | recipe look of `misoSoup` | layout | the lacquer bowl with broth, tofu, seaweed, mushrooms; a lid beside it optional | none |

**The cook on the mat (`roll` set), shown by stage as a shape and a mark** (food.md 7: neighbouring stages differ by
colour and by mark at the cook view's size):

| stage | how the roll looks on the mat | a mark |
|---|---|---|
| `flat` | the filled sheet lying flat on the mat | none |
| `loose` | rolled, a soft, slightly oval log with a visible gap where the nori meets | one loose seam line |
| `firm` | a neat round log, the seam closed | the seam tucked, one band of string on the mat |
| `tight` | a smaller, very round log, the mat wrapped hard round it | two bands; the mat's slats close together |
| `squashed` | flattened into an oval, rice squeezing out of both ends | rice blobs at the ends, a dent on top |

**Sets** (measure your own surface lines; spec 5.2 asked prep 62, roll 60; the counter is solved to `line: 0.80` with a
`surface { y, back }` like every restaurant, decision 3):

- `counter`: `line 0.80`, `surface { y, back }` solved to the picture; everything flat on the counter top, nothing
  above the line, the whole order left of the painted queue: `BBArt.sushi.counter` (queue 0.545-0.735 since phase 3, heads 0.373,
  feet 0.550, horizon 0.45, **sign: null**, the sushi bar has noren curtains, no sign board). Copy the pizza's
  `counter.arrange`; a roll on its board and a miso bowl side by side. Colours from the court picture's sushi
  storefront (pale hinoki wood top, navy noren) and the counter picture's own returns.
- `prep`: the mat low and left of centre, the next filling or topping on the right (`incoming`), `giantMax` for the
  boat. Its `pick` hook: a `roll` pick lays the nori (or the half sheet), a `rice` pick spreads the rice.
- `prep` again for the soup station: the bowl, the `misoLadle` flourish after the miso pick (a ladle pours the broth
  in; Reduced: the broth is simply there), then tofu, seaweed and mushrooms dropped in.
- `roll` (mat): the cook. `show(c, s)` draws the roll at `s.stage` (table above); Simple's `run` rolls to the chosen
  stage (the mat lifts and turns; `mat` sound). Timed: the mat turns a stage at a time. **The Timed control is the
  page's drawn button** labelled "Stop Rolling" (no shared tool prop fits; spec 5.3's fallback, bb.css
  `.ctl.btn.tool`).
- `roll` (board): the `pieces` pick, then the **`rollSlice`** flourish: a knife slices the log into the picked count,
  the pieces part a hair and turn their faces up (`knife` sound as the flourish starts; one `knife` a cut is fine,
  audio.md 5.2). Reduced: the pieces simply appear cut.
- **`wink`** (a custom fx key, world.md 3.8): an eye on the tuna (on the line, and on the served roll if it got
  through) that opens and winks every few seconds; Reduced: drawn mid-wink, still.

## 11. Sounds

`mat`: `cook: 'mat'` (the bamboo mat rolls). `board`: `auto: 'knife'` (the slice flourish). Every Add plays `plop`,
the two sauces `squirt`, each Timed stage `tick`. The page plays `swoosh` (Skip), `toss` (Swap It), `ding`, `kaching`,
`stars`, `ew` as for the diner; no `fly` gross-out here, so no `buzz`. `knife` and `mat` are in `packs/sushi/sound`
(`BBSounds`); `tests/voices.test.cjs` checks them. The ladle has no sound (none fits).

## 12. Every script moment and who must say it

`SC.moments(pack)` on the merged pack, 234 coverage items with an empty script. F = the pack's 'customer' fallback
counts for anyone with fewer than two of their own.

- **Customers, everyone** (marge gus bev vernon sal hiro dennis reginald kai inferno): `greet` ×3, `smalltalk` ×3,
  `goodbye` ×3 (the cast script supplies these for the regulars and Reginald and Kai; **hiro, dennis and inferno need
  their own here**); F: `react.3`/`.2`/`.1` ×3 each **of their own** for every speaker, `react.gross`,
  `complain.extra`/`.unasked`/`.missing` ({ing}{ings}), `complain.done` ({want}: loose, firm, tight, flat, squashed),
  `complain.pick` ({slot}{want}: roll, rice, pieces, miso), `complain.more`, `complain.gross.smelly`/`.wink`
  ({ing}{ings}), `complain.gross.hair`/`.soggy` ({slot}{value}).
- **Some**: `visitor.arrive` reginald kai inferno; `order.usual` marge; `order.twin` gus ("two of every roll");
  `order.dislike` marge (salmon, tuna: "nothing raw, hon"), dennis (eel sauce); `order.gag` hiro, dennis (locals at
  home; ≤ 8 s; Hiro's also after the Sushi Boat); `react.favourite` bev, sal; F `order.odd.noFishNoRice`,
  `.justGinger`, `.theWorks` (marge gus bev vernon sal hiro dennis) and `.sushiBurrito` (gus bev vernon sal dennis).
- **Mitch** (2 each unless 1): `shift.start`, `shift.end`, `uniform` (1); `tutorial.intro`, `.ticket`, `.review`,
  `.serve`, `.gross`; `tutorial.prep`, `.mat`, `.board`, `.soup`, `tutorial.cook.mat`;
  `tutorial.warn.extra`/`.unasked`/`.missing`/`.pick`/`.gross`/`.grossSkip` (no `.done`: Simple never asks the mat);
  `gross.smelly`, `.wink` ({ing}), `gross.hair`, `.soggy` ({value}); `nearly` ({want}{name}), `after.3`, `after.1`,
  `after.gross`, `event.intro`/`.celebrate`/`.again` ({name}) (1).
- **Not needed**: `complain.tooMany`/`.tooFew` (no Add with a max above 1, no repeat).
- **Blank words**: {slot} roll, rice, pieces, miso; {want}/{got} regular, inside-out, hand roll, white, brown, **none**,
  6, 8, 10, white, red (miso); stages loose, firm, tight, flat, squashed. Pick lines must read for every value: "For
  the {slot}, I said {want}" ("for the rice, I said none", "for the pieces, I said 8").
- **The brief**: Chef Hiro judges (the roll, the rice, his apprentice, himself, Mitch: never the player); Dennis's first
  time, every time; Marge's "nothing raw, hon"; Gus's "two of every roll" (`order.twin`); Bev's spicy tuna; Vernon
  judges it alongside Chef Hiro; Sal asks for a hot dog roll; Inferno wants it hotter; the odd orders as in section 6.

## 13. Help

As `help` in the pack (Pause > Help): the prep table (roll, rice, fillings, toppings), the mat (Simple: by itself;
Timed: Stop Rolling at the ticket's tightness), the board (pieces; a hand roll is never sliced), the soup station, and
"the ticket lists everything… Swap It brings a fresh one".

## 14. Theme: sushi navy and wood

| token | value | token | value | token | value |
|---|---|---|---|---|---|
| pageBg | #0b1630 | ticketAccent | #1d3768 | cardValue | #ffe7a3 |
| panelTop | #1d3768 | ticketNow | #e2eaf6 | logoTop | #f4e6c8 |
| panelBottom | #122650 | perforation | #b6c0d4 | logoMain | #fbf5e6 |
| panelLip | #081227 | hudBg | rgba(11,22,48,.86) | wheelInk | #111a2b |
| plateTop | #fbf5e6 | gaugeBg | rgba(6,14,32,.92) | wheelSteel | #dfe4e8 |
| plateBottom | #eadcc0 | star | #c97c00 | wheelDark | #1d3768 |
| mark | #1d3768 | boardGlow | #203e72 | board | #122650 |
| labelBg | rgba(8,18,39,.9) | woodInset | #3b2614 | wood | #c99a62 (a pale hinoki frame) |

An indigo control panel and navy menu boards in a pale wood frame; rice-paper plates and paper. **Contrast, computed**
(WCAG; translucent tokens composited over white, the worst backdrop):

- The highlight #ffd400 on: pageBg 12.52, panelTop 8.16, panelBottom 10.34, board 10.34, boardGlow 7.36, gaugeBg
  11.22, hudBg 8.31, labelBg 10.03 (need 3; `tests/pack.test.cjs` checks the first five).
- Text: ink on plateTop 16.94, plateBottom 13.60, ticketNow 15.21; ticketAccent on paper 11.68, on ticketNow 9.64; white
  on labelBg 14.35, hudBg 11.90, gaugeBg 16.06, panelTop 11.68; chalk on board 12.89 and boardGlow 9.18; cardValue
  12.13 / 8.63; logoTop 11.98 / 8.53; logoMain 13.61 / 9.68 (need 4.5).
- Graphics: star on the receipt's paper 3.30, board 4.49, boardGlow 3.19; mark on the plates 10.73 / 8.62 (need 3).

## 15. The tutorial

Dennis (the bar's own nervous first-timer: his first sushi, and the player's first roll); one guided order through
every station: "California Roll: inside-out roll, white rice, with crab, cucumber and avocado, firm, 8 pieces. Miso
Soup: white miso, with tofu and seaweed." The white rice comes down with a hair in it (`gross: { item: 0, slot:
'rice', event: 'hair' }`), so Swap It is taught once, on a pick. Always Simple (the mat rolls by itself); Mitch warns
before each mistake. 17 presses done right, plus the Swap It: 18.

## 16. Press counts (`pressReport('sushi')`, Serve included; the same at every level)

| recipe | levels | Simple | Timed |
|---|---|---|---|
| californiaRoll, spicyTunaRoll, veggieRoll | 1-5 | 13 (roll, rice, 9 Adds, pieces, Serve); a hand roll 12 | 14; a hand roll 13 (Stop Rolling) |
| phillyRoll, dragonRoll | 2-5 | 13 / 12 | 14 / 13 |
| misoSoup | 2-5 | 5 (miso, 3 Adds, Serve) | 5 |
| rainbowRoll, buildYourOwn | 3-5 | 13 / 12 | 14 / 13 |
| sushiBoat (event) | event | 13 alone; the finale with miso 17 | 14; 18 |

Whole orders: level 1 and 2 at most 13 Simple, 14 Timed; two items at most 25 Simple (Gus's two rolls), 27 Timed; a
roll and miso 17 / 18. Budget (spec 4.3): level 1 ≤ 14 Simple, any order ≤ 28.

## 17. Requests (for the owners named)

- **food-sushi**: section 10, including the custom `wink` fx and the `rollSlice` and `misoLadle` flourishes.
- **page**: the mat's Timed control is the drawn button (no `tool`): nothing new, `.ctl.btn.tool` already draws it.
