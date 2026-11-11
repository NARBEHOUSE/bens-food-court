# Phase 2b report: content-smoothie (Ben's Smoothie Shack, pack `smoothie`)

Written as I went (pilot.md 5.1); this is the final version. No earlier run of this lane had written anything.

## What I built

| File | What |
|---|---|
| `packs/smoothie/pack.js` (new) | the restaurant as data, `format: 3` |
| `packs/smoothie/script.js` (new) | 386 lines, `format: 3`, a delivery note on every line |
| `docs/api/packs/smoothie.md` (new) | the pack in words; section 10 is food-smoothie's contract, section 12 every moment and who says it |
| `docs/api/packs/smoothie-script.md` (new) | the script in words: conventions, canon kept, counts |
| `index.html` (shared; backup `docs/backup/index.html.before-2g`) | my two lines after the pizza's: `packs/smoothie/pack.js`, `packs/smoothie/script.js` |
| `tests/dom-play.cjs` (shared; backup `docs/backup/tests/dom-play.cjs.before-2g`) | the smoothie's 8 named runs (after the pizza's block, seeds 61-68) and two seed lines in `courtRecord()` (below) |

## The format and content, in brief (details: smoothie.md)

- **Line.** `prep` "Prep Table" (builds on the blender jug): Size Small/Medium/Large (ids `smallCup` `mediumCup`
  `largeCup`: js/core quotes `"medium"`, which the pack test forbids as an id) → Base Juice/Milk/Yogurt/Oat Milk → auto
  `pour` (`basePour`, sound `pour`) → Add or Skip strawberries, banana, mango, pineapple, blueberries, spinach, protein,
  honey, ice. `blender` "Blender" (tool `blenderSwitch`; sounds blender, blenderStop, pour): cook `blend` (Unblended →
  Chunky → Smooth → Super Smooth → Soupy; "How smooth?" / "Stop the Blender"; Soupy is Timed's last stage, never a
  gross-out) → auto `fill` (`cupFill`). `bowlBar` "Bowl Bar" (prep backdrop): Add or Skip granola, banana,
  strawberries, blueberries, honey. No More… pages, no repeat picks, so the driver needed no teaching for them.
- **Menu.** L1 Strawberry Banana Smoothie, Tropical Smoothie, Berry Blast; L2 Green Smoothie, Protein Shake (spinach
  optional); L3 Açaí Bowl (course `bowl`: blender, then bowl bar); event Trophy Smoothie (`trophyCup`, giant).
  `courses: ['smoothie', 'bowl']`, `levels: {}`.
- **Presses** (`pressReport`): every smoothie 13 (Serve included), the bowl 7, at every level, Simple and Timed. Whole
  orders over 3000 bot orders a level: L1-2 at most 13; L3-5 and the event at most 26 (Gus's twin plus a Swap It);
  tutorial 20 (19 + the Swap It); event finale 19.
- **Gross-outs**, all on Add steps: `brown` banana, `mouldy` strawberries, `bug` and `sock` in the ice (spec 4.6's
  sock; two new fx keys for food-smoothie).
- **People.** Regulars marge (usual: strawberry banana), gus (twin: "two shakes, same deal"), bev (favourite: protein
  shake), vernon (set small, oat milk, super smooth; exact), sal (refusals as his greet; dislikes spinach), tasha (set
  large). Locals breeze (the tutorial customer; his gag in his words, never their length) and brock ("all the protein",
  said; favourite protein shake; the event finale). Visitors reginald, kai and the cameo tony (dislikes pineapple, the
  mirror of the pizza's Breeze cameo).
- **Odd orders** `everyFruit`, `notGreen` (holds spinach: it comes out yellow), `dogShake` (small, no honey), `wipeout`
  (L5). **Event** The Beach Volleyball Tournament; finale Brock: Trophy Smoothie + Açaí Bowl.
- **Theme** tropical teal: the highlight ≥ 4.18:1 on every surface it sits on, text ≥ 5.86:1, the mango stars ≥ 3.24:1
  (computed in smoothie.md 14; `tests/pack.test.cjs` checks the five).
- **Script.** `SC.check` and `SC.coverage` both `[]`; Mitch 72, fallback 39, Breeze 45, Brock 47, Tony 35, the regulars
  and visitors 17-24 each; 2067 clips, every blank fills. 42 lines that matched the pizza's or the cast's words were
  rewritten; lines that could read untrue after an odd order or a bowl were reworded; Marge kept to her canon.

## Where I followed something other than the letter of the brief

- **Sal's dislike is spinach** (spec 2.3 names lettuce, which this menu lacks; "rabbit food" is his joke): he never
  orders a Green Smoothie, and spinach is an optional part of the Protein Shake so his `order.dislike` can be heard.
- **Tony is the cameo** (spec 2.2 allows one), so the pineapple running joke goes both ways.
- **ACCESSIBILITY.md** ("keep speech short", "not a child"): labels stay short ("Add the brown, mushy banana"); no line
  hurries anyone or mentions speed or skill.

## Tests run (from the game folder)

- `node -e "...schema.validate(R.pack), SC.check(R.pack,R.script), SC.coverage(R.pack,R.script)"` → `[] [] []`.
- `node -e "console.table(require('./tests/bot.cjs').pressReport('smoothie'))"` → 13 for every smoothie, 7 the bowl.
- `BB_PACKS=smoothie node --test "tests/*.test.cjs"` → 221 tests, 210 pass, **0 fail**, 5 skipped (diner- and
  pizza-only tests BB_PACKS leaves out), 6 todo (js/food/smoothie.js not written yet).
- `node --test "tests/*.test.cjs"` → 287 tests, 269 pass, **0 fail**, 0 skipped, 18 todo (the food modules other
  lanes have not written yet, the smoothie's among them).
- Scratch bots (not in the suite): 18600 random-play orders at every level, the event and the tutorial, both modes:
  nothing throws, every complaint the judge gives finds a filled line.
- `JSDOM=<jsdom> node tests/dom-play.cjs --pack smoothie` (15:32-16:05): 33 runs, **31 ok**, every one of the 8 named
  smoothie runs ok (tutorial, Timed no mistakes 3/3/3, Stop the Blender held across a stage, one switch, eight at
  level 4, the event with the gold sign, Motion Full with 6 flourishes, its Grand Opening then Skip It and a shift).
  2 failed: the generic Grand Opening (the driver had marked the smoothie visited: fixed, second seed line below) and
  the counter at 21:9 (its line check, while another lane was rewriting world.js's counter anchor and dom-play's
  counter checks mid-run). Re-run after: `--pack smoothie "the page boots"`, `"a Grand Opening with seeded progress"`,
  `"the counter at 21:9"` and the pizza's 21:9: **4 of 4 ok**.
- A second full `--pack smoothie` pass (16:05-16:40): 38 runs (another lane added six "How to Play heard in full"
  runs meanwhile), **34 ok**, all 8 named smoothie runs ok again. The 4 failures were new How to Play runs while their
  lane was still editing ui.js and stage.js; re-run after: all 6 of them ok at `--pack smoothie` (the sixth, the
  first-visit card from the court, needed my seed to open the smoothie for a court-only run that walks up to that
  card: added) and at the default. So every run at the smoothie has passed, the last few on re-runs.

## The driver change (shared file, my lines only)

`courtRecord()` in `tests/dom-play.cjs`: (1) a run played at a restaurant shut at the start (not court-only unless it walks up to the
first-visit card, no `moments`) seeds it open with its Grand Opening seen, and every restaurant that unlocks before it: without it every
`--pack smoothie` run failed at the court ("the court offers no way to smoothie"); burrito, sushi and icecream get it
for free; no run at the diner, pizza or cafe changes. (2) A court-only run leaves a shut-at-start restaurant's first
visit to come unless it seeds `tutorialDone`, so the Grand Opening banner stays up.

## Not done

- The 3D food (food-smoothie's lane): until `js/food/smoothie.js` exists the page borrows the diner's module and warns
  "smoothie has no 3D set prep/blender"; the food tests stay TODO.
- Review frames: not made by this lane (they would show the diner's food); food-smoothie's.
- The whole-chain run still plays the diner and the pizza only (a shared run; Request below).

## Requests

- **food-smoothie**: smoothie.md section 10: 14 shapes, layouts `smoothieCup`, `acaiBowl`, `trophyCup` (giant), sets
  `counter` (line 0.80, golden bamboo top, teal plank front), `prep` (also the bowl bar) and `blender` (cook `blender`),
  the flourishes `basePour` and `cupFill`, the blend stages by colour and mark, the smoothie's colour mixed from what
  went in, and fx `bug` and `sock`.
- **page / integrate**: keep the two `courtRecord()` lines and note them in `docs/api/page.md` 8 and `pilot.md` 5.5;
  put the smoothie on the whole chain (`chain: ['diner', 'pizza', 'smoothie']`, seeded open) when that run is next
  touched; draw `blenderSwitch` as the blender's Timed control. The counter's measured queue (x 56.5-80.5%, heads
  49.5%, feet 71-72%) agrees with `BBArt.smoothie.counter` (0.57-0.802, 0.494, 0.713).
- **voice pass**: the lines carry `[sigh]`, `[pause]`, `[gasp]`; Brock's notes never ask for loud (cast-script.md 3).
