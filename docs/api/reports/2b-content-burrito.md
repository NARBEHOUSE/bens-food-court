# Phase 2b report: content-burrito (Ben's Burritos, pack `burrito`)

Status: done 2026-11-09, in two runs. The first was cut off while its last jsdom pass ran; the second (20:48) found
every step done, re-checked everything on the current files, added the whole-chain run and finished this report.
A later run reads this file, `docs/backup/` (`.before-2i` of `index.html` and `tests/dom-play.cjs`) and the files
below.

## Progress

| Step | State |
|---|---|
| 1. `packs/burrito/pack.js`; `docs/api/packs/burrito.md` (sections 10 and 12) | done: schema `[]`, presses burritos 14, bowls and tacos 13, chips 4, worst whole order 28 |
| 2. `index.html`: the pack line, then the script line, after the cafe's | done ("the page boots" ok after each) |
| 3. `packs/burrito/script.js`, `format: 3`; `docs/api/packs/burrito-script.md` | done: 384 lines, `SC.check` `[]`, `SC.coverage` `[]` |
| 4. jsdom `--pack burrito`; the burrito's named runs | done (first run: 31/31 and 8/8; second run: 39/39, 8/8, and the new whole-chain run ok) |
| 5. this report | done |

## What I built (paths from the game folder)

| File | What |
|---|---|
| `packs/burrito/pack.js` (new) | the restaurant as data: 3 stations, 11 recipes, 6 slots, the `toast` stage set, 3 gross-outs, 11 customers, 5 odd orders, The Burrito Challenge, the tutorial, theme, help; `format: 3` |
| `packs/burrito/script.js` (new) | 384 lines: Mitch's in the burrito uniform, the 'customer' fallbacks, the locals' full sets (Inferno 45, Rita 46), the cameo's (Chef Hiro 30), every regular's and visitor's lines about the food here |
| `docs/api/packs/burrito.md` | the pack in words, in pizza.md's layout; section 10 is food-burrito's contract, 12 the script's |
| `docs/api/packs/burrito-script.md` | the script in words: conventions, who they are here, counts |
| `index.html` (my two lines) | `packs/burrito/pack.js` and `packs/burrito/script.js` after the cafe's two |
| `tests/dom-play.cjs` (my block only) | 9 named runs, seeds 101-109; filter "Burritos:" |

## The pack in brief (burrito.md has it all)

- **Burrito Line** (`prep`): Style Burrito/Bowl/Tacos → Rice and Beans (burritos and bowls; tacos skip both) → Protein
  Chicken/Steak/Veggies/None → Add or Skip, one at a time: cheese, lettuce, pico, corn, sour cream, guacamole,
  jalapeños, onions (tacos only) → Hot Sauce Mild/Medium/Hot/None → a flourish by itself: `wrap` (burritos), `fold`
  (tacos), `arrange` (bowls); then `burst` on the Everything and Challenge burritos: the bursting-burrito joke, wrapped
  again in a second tortilla, never a mistake (spec 4.6).
- **Griddle** (burritos and tacos): stage set `toast` (soft, lightlyToasted, toasted, extraCrispy, burnt). Simple "How
  toasted?"; Timed "Lift the Press", tool `grillPress`, sound `press`; Burnt is Timed's last stage. The toast is a
  `want` (said in line order), so **food-burrito reads `made.picks.toast`; there is no `made.done`**.
- **Chip Basket**: Salsa Red/Green/Mango → Add guacamole → Add lime. Nothing pages, nothing repeats (4 values at most).
- **Ladder** (`levels: {}`): level 1 chicken, steak, bean-and-cheese burritos and the chicken bowl; 2 adds the veggie
  bowl, steak and chicken tacos, chips and salsa; 3 the Everything and Fire burritos.
- **Gross-outs**: the brown guacamole (an Add), a hair in the beans and a fly in the salsa (picks of three).
- **People**: locals `inferno` (favourite Fire Burrito; `wants` hot sauce and extra crispy) and `rita` (favourite
  Everything Burrito; "one of everything" said, never made; the tutorial customer); regulars `marge` (usual: bean and
  cheese), `gus` (two of one thing), `bev` (steak burrito; counts six jalapeños), `vernon` (bowls; brown rice, black
  beans, mild), `sal` (never lettuce), `oakes` (tacos; never onions, a new reason each time); level-4 visitors
  `reginald`, `kai` and the cameo `hiro` (Ben's Sushi; always a chicken burrito, lightly toasted: he judges the roll).
- **Odd orders**: `doubleWrap`, `noAvocado`, `hottest`, `justTortilla` (level 5), and Inferno's own `fireAlarm`.
- **Event**: The Burrito Challenge; the finale is Inferno's giant Challenge Burrito (extra crispy, "every sauce" said)
  and chips with green salsa.
- **Theme**: green and burnt orange; highlight 3.83:1 or more.

## Facts settled (for the agents after)

- Ids js/core quotes fail `tests/pack.test.cjs`: `medium`, `extra`, `done`, `one`, `two`, `plain`, `event`, `tutorial`;
  so the sauces are `mildSauce`, `mediumSauce`, `hotSauce`, `noSauce`.
- Changes to the brief (burrito.md 2): onions on tacos only (Oakes needs onions; pico does not count); "Veggies"; the
  style fixed by each recipe; the toast a `want`; the burst a flourish; a flourish for every style.
- An odd order is made as written: `wants` and `set` do not reach it, so Inferno has only his own and every other odd
  order lists the regulars and Rita in `who`.
- `SC.everyClip` (2b-seams) now records Mitch's `nearly.1` (`{name}`) as 33 clips (11 customers × 3 stages): every
  clip is filled except the cast's `{about}` mentions, filled at play time.
- The page already draws the griddle's Timed control as the shared `grillPress` prop (stage.js `tool`).
- Rulebooks: ACCESSIBILITY §9 ("never signal state with colour alone", short labels) is met within the spec: each toast
  stage is a colour and a stripe count, the sauces carry 1-3 chili marks, the griddle plates their marks. Nothing in
  my lane needed the rulebooks over the spec.

## Tests (from the game folder; `<jsdom>` as in pilot.md)

- `node -e "...find(r=>r.id==='burrito')...validate, SC.check, SC.coverage"` (pilot.md 4, step 1): `[] [] []`.
- `node -e "console.table(require('./tests/bot.cjs').pressReport('burrito'))"`: burritos 14, bowls and tacos 13,
  chips 4, Simple and Timed, every level.
- `node --test "tests/*.test.cjs"`: 287 tests, 269 pass, **0 fail**, 0 skipped, 18 todo (the burrito's, cafe's and
  smoothie's food modules are not written yet).
- `BB_PACKS=burrito node --test "tests/*.test.cjs"`: 221 tests, 210 pass, **0 fail**, 5 skipped (BB_PACKS leaves the
  diner and pizza out), 6 todo (`js/food/burrito.js`).
- `JSDOM=<jsdom> node tests/dom-play.cjs "Burritos:"`: first run 8 of 8 ok (16:39); second run: see below.
- `JSDOM=<jsdom> node tests/dom-play.cjs --pack burrito`: first run 31 of 31 ok, exit 0 (16:25-16:48); second run: see
  below.
- Scratch sweeps (first run): 1500 orders a level and mode, all three stars, presses at most 14 (levels 1-2) and 28;
  Sal never lettuce, Oakes never onions; random answers filled 109,402 complaint lines, none left a blank. Script lint:
  a delivery note on every line, no line starts with a blank, gags at most 20 words.

### Second run (20:48), on the current files

- `JSDOM=<jsdom> node tests/dom-play.cjs "Burritos:"` (20:50-20:58, before the chain run was added): **8 of 8 ok**,
  exit 0 (tutorial with the brown guacamole swapped; Timed no mistakes 3/3/3; Lift the Press held across a stage;
  one switch; eight at level 4 with Kai, a gross-out and two dislike lines; the event and gold sign; Motion Full; the
  Grand Opening earned by a Smoothie Shack shift).
- `JSDOM=<jsdom> node tests/dom-play.cjs --pack burrito` (20:50-21:22): **39 of 39 ok**, exit 0: every run that names
  no restaurant (first visit, Pause/Settings/resume, Main Menu and Restart, Timed with the 5 s hold, Take It Off held,
  one switch, the clock lag, level 5, eight at level 4, the event, Motion Full, the counter at 16:9, 16:10, 4:3, 21:9
  and 4:3 Extra Large, the court runs, How to Play heard in full) and my 7 named runs that play at the burrito.
- `node --test "tests/*.test.cjs"` again at 21:22: 287 tests, 269 pass, 0 fail, 0 skipped, 18 todo.
- New named run, `JSDOM=<jsdom> node tests/dom-play.cjs "Burritos: the whole chain"`: **ok**, exit 0 (133 s): main
  menu, How to Play, Settings, the Burger Bar, the Pizza Parlor and the Burritos (seeded open with the Smoothie Shack,
  reached through the U's left arm), a shift each, back to the court; all three up to two stars.

## Not done

- The 3D food (food-burrito): until `js/food/burrito.js` exists the page borrows the diner's module and warns "burrito
  has no 3D set prep/griddle"; the 6 food tests stay TODO.
- Review frames: not made here (they would show the diner's food); food-burrito's, once its module draws.
- Voices: text to speech until the final voice pass.

## Requests

- **food-burrito**: `docs/api/packs/burrito.md` section 10: 23 shapes, 5 layouts (`burrito`, `bowl`, `tacos`,
  `chipsBasket`, `giantBurrito`), sets `counter` (`line: 0.80`, `surface { y, back }`, the order left of
  `BBArt.burrito.counter.queue[0]` = 0.564, copy the pizza's `counter.arrange`), `prep` (also the chip basket) and
  `griddle` (cook `griddle`), four flourishes (`burritoWrap`, `tacoFold`, `bowlArrange`, `burritoBurst`), the toast by
  colour and stripes, read from `made.picks.toast`; then its `index.html` line.
- **page**: play `packs/burrito/sound/burst.wav` for the auto step whose id is `burst` (audio.md 5.2 lists it as the
  page's); game.js plays the station's one `sounds.auto` (`wrap`) for every flourish today.
- **page / integrate** (`tests/dom-play.cjs`): `unlockChecks()` (the `moments: 'unlock'` path) checks the Smoothie
  Shack by name, so the burrito's Grand Opening run is the earned kind (`unlockAfter: 'burrito'` after a Smoothie
  Shack shift). Make it check the restaurant that opened if a court-moment Grand Opening plus first visit is wanted
  for every locked restaurant.
- **coordinator**: worth a line in pack-format.md 13: an odd order ignores the customer's `wants` and `set`, so a
  customer whose character is a want needs `who` lists on every odd order.
- **voice pass**: `[pause]`/`[sigh]` tags; Inferno's notes say intense or proud, never loud (round-1 test: shouting).
