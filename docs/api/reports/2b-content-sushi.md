# Report: content-sushi (phase 2b, 2026-11-09)

Lane: Ben's Sushi (pack id `sushi`). Finished: pack, script, docs, page lines, driver runs. Two driver failures
remain, both outside my files (Requests).

## What I built (files)

| File | What |
|---|---|
| `packs/sushi/pack.js` (new) | the restaurant as data, `format: 3`, version 1 |
| `packs/sushi/script.js` (new) | 333 lines: Mitch (71), 'customer' fallbacks (39), Chef Hiro (43), Dennis (45), the cameo Inferno (25), the regulars' and visitors' sushi lines |
| `docs/api/packs/sushi.md` (new) | the pack in words; **section 10 is food-sushi's contract** (every look, set, flourish, cook stage, the custom `wink` fx), section 12 every script moment |
| `docs/api/packs/sushi-script.md` (new) | the script in words: conventions, the people, counts per speaker |
| `index.html` | two lines after the burrito's: `packs/sushi/pack.js`, `packs/sushi/script.js` (backup `docs/backup/index.html.before-2j`) |
| `tests/dom-play.cjs` | nine named runs "Ben's Sushi: …", seeds 121-129, one Edit after the burrito's block (backup `docs/backup/tests/dom-play.cjs.before-2j`) |

## Format / API summary

- **Line**: `prep` (Prep Table, backdrop prep): pick roll Regular/Inside-Out/Hand Roll → pick rice White/Brown(/None)
  → Add or Skip salmon, tuna, crab, cucumber, avocado, cream cheese, sesame seeds, spicy mayo (sauce), eel sauce
  (sauce). `mat` (Rolling Mat, backdrop roll): cook, stage set `roll` flat/loose/firm/tight/squashed, "How tight?",
  "Stop Rolling", `simple: 'auto'`, no `tool` (drawn button), sound `mat`. `board` (Cutting Board, roll): pick pieces
  6/8/10 → auto `slice` (show `rollSlice`, sound `knife`), both only for regular and inside-out (a hand roll is a cone,
  never sliced). `soup` (Soup Station, prep): pick miso White/Red → auto `ladle` (`misoLadle`) → Add tofu, seaweed,
  mushrooms.
- **Recipes**: L1 California, Spicy Tuna, Veggie; L2 Philly, Dragon, Miso Soup (side); L3 Rainbow, Build Your Own;
  event Sushi Boat (`giant: true`).
- **Gross-outs**: `smelly` (salmon, Add), `wink` (tuna, Add, custom fx), `hair` (rice pick), `soggy` (roll pick).
- **People**: marge (usual California, dislikes salmon/tuna: "nothing raw, hon"), gus (twin: "two of every roll"),
  bev (favourite spicy tuna), vernon (set regular/white/tight/8; his lines name Chef Hiro), sal (favourite California,
  asks for a hot dog roll); locals hiro (set regular/white/firm/8), dennis (dislikes eel sauce; tutorial customer);
  visitors reginald, kai, cameo inferno (always spicy tuna).
- **Odd orders**: noFishNoRice, sushiBurrito, justGinger, theWorks (L5). **Event** "The Sushi Boat": finale Chef
  Hiro, Sushi Boat + red miso; his react.3.1 "[long pause] Hm. Yes." is the approval.
- **Theme** navy and wood; highlight on pageBg 12.52, panelTop 8.16, panelBottom/board 10.34, boardGlow 7.36.
- **Presses** (`pressReport`, Serve included): every roll 13 Simple / 14 Timed (hand roll 12 / 13), miso 5; two
  rolls 25 / 27; finale 17 / 18; tutorial 17 (+1 Swap It).

## Decisions where I chose (all in sushi.md)

- **The cook is the rolling**, `simple: 'auto'` like the cafe's pour: Simple's only mat/board choice is the pieces
  (spec 5.3 "pieces a pick in Simple and Timed alike, with a flourish"; proposal "it rolls and slices with a flourish").
  The proposal's Timed "stop the knife on each cut line" would be a new mechanic; spec 5.1's stage set replaces it.
  Squashed is Timed's last stage. So `tutorial.warn.done` does not apply here.
- **A hand roll is never sliced** (`when` on the board's two steps); one press shorter; the same-presses test passes.
- **Added value** rice None (`noRice`, "rice: none"), only for "no fish and no rice" (spec 2.3). The miso soup line
  is mine (the spec names only the side).
- **Cameo**: Inferno (the burrito pack brought Chef Hiro; he returns the visit).
- Greets kept to 15 words (cast-script rule), gags ≤ 20 words, one varying blank per line, none at the start, a
  delivery on every line. Soggy-seaweed lines use no blank ("hand roll" reads badly after "the soggy").
- Hub rulebooks: nothing in my lane went against the spec. The theme keeps 3:1 / 4.5:1 (ACCESSIBILITY.md); the Motion
  Full visuals are food-sushi's.

## Tests run

- `node -e "…schema.validate, SC.check, SC.coverage…"` (pilot.md step 1): `[] [] []`.
- `node -e "console.table(require('./tests/bot.cjs').pressReport('sushi'))"`: as above, budget kept.
- `BB_PACKS=sushi node --test "tests/*.test.cjs"`: 221 tests, 210 pass, 0 fail, 5 skipped, 6 todo (the todos:
  `js/food/sushi.js` not written yet).
- `node --test "tests/*.test.cjs"` (after every file, and last): 302 tests, 278 pass, 0 fail, 0 skipped, 24 todo (food
  modules of smoothie, cafe, sushi, burrito not written yet).
- `JSDOM=… node tests/dom-play.cjs "the page boots"`: ok.
- `JSDOM=… node tests/dom-play.cjs --pack sushi`: 30 ok, 2 FAIL:
  - "a 3-customer shift with Motion Full": "no sauce was squirted on". The squirt counts only when the incoming sauce
    has its bottle (`inc.userData.bottle`), which the food module draws; until `js/food/sushi.js` exists the sushi has
    no 3D `prep` set ("nothing is drawn there"). Clears when food-sushi builds prep with the kit's squirt.
  - "five open: the parts of the U … into the Burger Bar": `Cannot read properties of undefined (reading 'length')`.
    At `--pack sushi` the run seeds the sushi bar open, so six are open and the right arm holds one shop, which
    `js/core/court.js` `stops()` makes a plain shop stop by design ("a part with one open shop is that shop");
    `partsChecks()` reads `s.stops.length` on every root stop. A driver assumption, not the pack.
- `JSDOM=… node tests/dom-play.cjs "Sushi:"` (my nine runs): 8 ok, 1 FAIL (Motion Full, the same squirt cause). OK:
  the first-visit tutorial (Dennis, the hair in the rice), Timed with no mistakes (3,3,3), Stop Rolling held across a
  stage boundary, one switch, eight customers at level 4, the event with the gold sign ("Ben's Sushi has five stars
  and its gold sign"), the Grand Opening (shutter, chime, paChime, pa, Mitch), the whole chain with six open.

## Not done

- Review frames (`tools/review-frames.cjs`): not run; they mean little before `js/food/sushi.js` exists.
- Motion Full passes only once food-sushi draws the prep set's sauce bottles and the `rollSlice`/`misoLadle` flourishes.
- Every line is text to speech; no voice manifest line (the voice pass adds it).

## Requests

- **food-sushi**: `docs/api/packs/sushi.md` section 10: every look, the mat's five stages (shape plus mark), the
  `rollSlice` and `misoLadle` flourishes, the custom `wink` fx, the counter set (`line 0.80`, `surface`, left of the
  queue 0.659; `sign: null`), the sauces' squeeze bottles on prep (the Motion Full runs need them). Then add
  `js/food/sushi.js` to `index.html`'s world block.
- **tests/dom-play.cjs owner (integrate)**:
  1. `partsChecks()`: skip root stops of `kind: 'shop'` (a one-shop arm), or don't let the "five open" run seed the
     run's own restaurant open. It fails only at `--pack sushi` (six open, the right arm one shop).
  2. `unlockChecks()` (the `moments: 'unlock'` runs) reads the Smoothie Shack by name. My Grand Opening run passes its
     sound, announcer and Mitch checks for the sushi bar, but the storefront checks look at the Smoothie Shack. Please
     read the restaurant from the run (`opts.pack` when it is shut at the start). I left those lines alone.
- **page**: nothing new; the mat's Timed control is the drawn `.ctl.btn.tool` button.
