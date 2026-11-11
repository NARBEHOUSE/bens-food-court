# Phase 2b report: integrate-2b (all seven restaurants)

Status: DONE (2026-11-10). Steps 1-2 by the first integrate-2b agent; steps 3-5 by a second agent after the first
ended its turn while its jsdom batches ran (they died with it).

## Progress
- [x] 1. Requests from every 2b report
- [x] 2. Node suite, pilot step 1 for seven packs, press reports
- [x] 3. jsdom set (batches): 135/135 ok
- [x] 4. Review frames read: 2b-integrate-seven + 2b-integrate-<id> (all seven); nothing needed a fix
- [x] 5. pilot.md "All seven restaurants" (8.2 notes, 8.4 Time, new 8.5 Results); spec 9 table below

## Facts
- Node suite at start: 317/317 pass (0 fail, 0 skip, 0 todo); BB_PACKS=diner: 220 pass, 1 skipped (the diner-only manifest test).
- Pilot step 1: [] [] [] for all seven packs.
- Node suite at the end (no code changed in steps 3-5): 317/317 pass, 0 fail, 0 skip, 0 todo.
- Press report (min-max over levels, Simple and Timed, Serve included): diner 13-14 (sides 4), pizza 13 (knots 5),
  smoothie 13 (bowl 7), cafe 7-11, sushi 12-14 (miso 5), burrito 13-14 (chips 4), icecream 11-14 (shake 5). Level 1 at most 14 everywhere.

## Fixes made (backups in docs/backup)
1. tests/dom-play.cjs (.before-2l): unlockChecks() checks the restaurant the seed opens (first in unlock order whose
   Grand Opening is unseen), not the Smoothie Shack by name (content-sushi R2, content-burrito). partsChecks() accepts a
   lone storefront at the root (a part with one open shop is that shop) and walks only the parts (content-sushi R2,
   food-sushi R2). Verified: --pack sushi "five open" ok; "Grand Opening" runs ok (sushi checks sushi).
2. js/game.js (.before-2f) + packs/burrito/pack.js (.before): an auto step may name its own `sound` (burst plays
   burst.wav, not the station's wrap). tests/voices.test.cjs (.before) checks every auto step's sound exists.
3. js/game.js: the tutorial (always Simple) explains a station that cooks by itself as it cooks
   (tutorial.<station> + tutorial.cook.<station>, once each): the Cafe's pour, the sushi mat (content-cafe, food-cafe).
   packs/cafe/script.js (.before): tutorial.cook.coffeeBar.2 no longer tells Simple to Stop the Pour.
4. js/game.js: a sauce's squirt plays `diner:squirt` (the sound lives only in the diner's folder; the sushi's sauces
   warned "no sound squirt").
5. js/stage.js (.before-2f): a child is drawn at the counter no smaller than CHILD_MIN 0.71 (Little Lulu, 0.66, stands
   on a step; her court size is unchanged) (content-icecream, food-icecream). dom-play checks the drawn scale; two new
   runs serve Lulu first at 16:10 and 21:9: both ok.
6. tests/dom-play.cjs: new runs "the whole chain, all seven open" (seeded open) and "the court with all seven open at
   every crowd tier" (crowdChecks: per storefront never more than its tier, nobody missing, the crowd grows:
   7, 14, 42, 71 people at popularity 0, 3, 7, 10: ok).
7. tools/review-frames.cjs (.before-2g): choose() steps into More... rows (food-icecream's scratch patch folded in);
   each restaurant frame is rendered over magenta AND green (.3dg.png); new session `seven` (all seven open: menu,
   How to Play Normal/XL, court, right arm, Emporium lit; 16:9, 4:3). tools/review_compose.py (.before-2f): key_two()
   composites from the two renders (clear cups, glass, steam untinted; smoothie, burrito, icecream requests); falls
   back to the magenta key for old frames.
8. tools/voice-clips.cjs (.before): `node tools/voice-clips.cjs [<id>|court|all] [out.json]`, every restaurant on its
   merged pack/script with customers and `said`, and the court with names and goals (goals gathered by playing the
   court rules through 400 random progressions). all: 19,143 clips (court 492, of which court.return 336), none with
   an unfilled blank (seams R3).
9. Docs: pilot.md (.before-2a) intro + 5.5 + 7 + new section 8 "All seven restaurants"; page.md (.before-2d) 8 and 9;
   pack-format.md (.before) 7 (auto `sound`) and 13 (an odd order ignores wants/set: burrito's request); audio.md
   (.before) 5.2.

## Requests, each
| From | Request | Done? |
|---|---|---|
| seams 1 | food agents read anchors; food-frames per pilot 7 | done by food-cafe (food-frames reads BBArt counter, anchors 21:9) |
| seams 2 | shared choice-scan arm() re-arm | not mine: shared code (coordinator). The page and driver work round it |
| seams 3 | voice-clips with said/names/goals | DONE (fix 8) |
| seams 4 | pizza/sushi queues reach 84-88% | art, phase 3 |
| seams 5 | cafe "no 3D set" warns | gone: cafe.js exists |
| content-cafe | tutorial never explains the pour | DONE (fix 3) |
| content-cafe | "no js/core id" test matches comments; W.said "no sugars"; everyClip {name} | coordinator (js/core); everyClip {name} was done by seams. Not changed: the packs avoid both today |
| content-cafe | fold the Cafe chain into the shared one | DONE differently: new all-seven chain run; the per-restaurant chains stay |
| food-cafe / food-smoothie | Timed gauge placed from the food's box | NOT done: needs a browser measure; both lanes lowered food under it. Phase 3 |
| content-smoothie | keep courtRecord lines; note in page.md 8 / pilot 5.5 | kept + noted |
| content-smoothie | smoothie on the whole chain | DONE (all-seven chain) |
| content-smoothie / food-smoothie / content-icecream | blenderSwitch / scoop drawn as Timed control | already: game.js draws the station's `tool` |
| food-smoothie 1 / food-burrito / food-icecream | review frames magenta tint | DONE (fix 7) |
| food-smoothie 3 | keep review-frames seed line, note it | kept + noted (page.md 8/9) |
| content-burrito / food-burrito | burst.wav for the burst step | DONE (fix 2) |
| content-burrito / content-sushi | unlockChecks by name | DONE (fix 1) |
| content-burrito | pack-format 13 note on odd orders | DONE |
| content-sushi / food-sushi | partsChecks lone storefront | DONE (fix 1) |
| food-sushi 1 | Simple: move the scene to the mat for the auto cook | NOT done: the roll-up already shows on the prep table's mat (sushi.js finish); moving the scene would double it and needs a browser look. Phase 3. The tutorial now explains the mat (fix 3) |
| food-sushi 3 | sushi counter picture's tall queue at 21:9 | art, phase 3 |
| content-icecream / food-icecream | Lulu's shoulders under the counter | DONE (fix 5) |
| content-icecream | note driver repeat/More... in pilot 5.5 + page.md | DONE |
| content-icecream | ice cream pour sound | audio, phase 3 (flourishes stay silent) |
| content-icecream | Vernon "exactly one" scoop mention | content-cast: phase 3 |
| food-icecream | review-frames More... rows | DONE (fix 7) |
| food-icecream | darker shake plate swatches | content-icecream, optional: phase 3 |
| (found here) | sushi sauces warned `no sound "squirt"` | DONE (fix 4) |

## jsdom (step 3; second agent, 2026-11-10)

`JSDOM=<jsdom> node tests/dom-play.cjs` split by index: a scratch runner required `{ run, RUNS }` and played
`RUNS[i]` as `main()` does (`--pack` fills `pack` only for runs that name none), up to ten batches side by side with
the counter frames rendering. The first 117 took 02:39-02:55 wall clock (6,107 s of run time). **135 runs, 135 ok,
0 FAIL, no rerun needed, no warning but three.js's deprecation.**

| Group | Runs | Result |
|---|---|---|
| Default set, index 0-35 (no restaurant named: the Burger Bar, and the court) | 36 | 36 ok |
| The Pizza Parlor's named runs + its unlock of the Smoothie Shack (36-47) | 12 | 12 ok |
| The Smoothie Shack's (48-55, its Grand Opening earned) | 8 | 8 ok |
| The Cafe's (56-67, counter at four shapes, its chain) | 12 | 12 ok |
| Ben's Burritos' (68-76, Grand Opening earned by a Smoothie Shack shift, its chain) | 9 | 9 ok |
| Ben's Sushi's (77-85, Grand Opening, its chain) | 9 | 9 ok |
| The Ice Cream Emporium's (86-96, Grand Opening, its chain, Lulu at 16:10 and 21:9) | 11 | 11 ok |
| "the counter at" 16:9, 16:10, 4:3, 21:9, 4:3 XL; `--pack` smoothie, burrito, sushi, icecream | 20 | 20 ok |
| Pause + Settings tour + Food Court mid-shift; leaving by Main Menu; 5 s Enter hold (runs 3-5), `--pack` each of the other six | 18 | 18 ok |

Highlights: the page boots with all seven loaded (0.2 s). **The whole chain, all seven open** (260.6 s): main menu
checked, 21 orders, back to the court through `part:left part:top part:right`; every restaurant's results named its
second star except the Smoothie Shack's (its shift averaged 1.67, under 2.0: correctly no news). **Every crowd
tier** with all seven: 7, 14, 42, 71 people. **The grand celebration** once: 22 cheers, 7 pops, at most 3 a second.
Grand Openings in unlock order: the Smoothie Shack (earned by a Pizza Parlor shift), the Burritos ("The Smoothie
Shack is up to four stars. Ben's Burritos is open."), Sushi, the Emporium, each with shutter, chime, paChime, the PA
and Mitch's unlock line. Every restaurant's event gave "five stars and its gold sign". Level 5 (184.6 s) was the
longest single shift.

## Review frames (step 4)

- `art-source/review/2b-integrate-seven/` (`seven`): main menu, How to Play Normal and XL, the court in focus, the
  right arm lit, inside it (Sushi lit), the Emporium lit; 16:9 and 4:3. All seven storefronts in colour (none
  greyed), each name plate on its sign. Composer notes: on the court at 4:3 the Smoothie Shack's and the
  Emporium's name plates are a few px wider than their boards (still read whole).
- `art-source/review/2b-integrate-<id>/` for all seven (`counter`, 16:9 and 4:3, ten moments each; the diner's
  partial set from the first agent replaced). Read all fourteen sheets: every painted queue is clear of the column,
  the receipt, the bubbles, the register and the food; the food sits on the counter top left of the queue (the
  Cafe's donut on its paper, the smoothie cups, the cones in their holders, the sushi board, the Kitchen Sink, the
  giant burrito); names on the blank signs at 4:3 everywhere (the sushi bar has no board) and at 16:9 where the
  board is whole (Cafe, Smoothie Shack, Emporium).
- Findings, none a defect: Mitch "with the customer" is off the right edge (his bubble speaks from the edge) at 4:3
  at the pizza, the Cafe, the Burritos and the sushi, and at 16:9 at the sushi (page.md 7 allows it); at 4:3 the
  Emporium's sign goes blank while the answer column covers its right end (designed, page.md 7.2). Both in pilot 8.2.

## Spec 9 for all seven

D diner, P pizza, C cafe, Sm smoothie, B burrito, Su sushi, I icecream.

| Check | D | P | C | Sm | B | Su | I | How |
|---|---|---|---|---|---|---|---|---|
| Every pack validates | pass | pass | pass | pass | pass | pass | pass | pack.test; pilot step 1 `[] [] []` |
| At most 4 answers per line screen; every recipe/level 3 stars, Simple and Timed | pass | pass | pass | pass | pass | pass | pass | pack.test, line.test |
| Press budget (level 1 at most 14, any order at most 28) | 13-14 | 13 | 7-11 | 13 | 13-14 | 12-14 | 11-14 | pack.test, pressReport |
| The judge counts every mistake kind | pass | pass | pass | pass | pass | pass | pass | judge.test (one shared judge) |
| Tickets list everything | pass | pass | pass | pass | pass | pass | pass | pack.test |
| No js/core file names an id | pass | pass | pass | pass | pass | pass | pass | pack.test, line.test |
| Court rules (unlocks, stars never down, the event, one celebration, a left shift resumes and counts once) | pass | pass | pass | pass | pass | pass | pass | court.test, shift.test; jsdom leave/pauses at each |
| Moment coverage, every speaker | pass | pass | pass | pass | pass | pass | pass | script.test |
| Food builders resolve every look | pass | pass | pass | pass | pass | pass | pass | food.test |
| No two speakers sound the same | pass | pass | pass | pass | pass | pass | pass | cast.test, voices.test |
| Same recipes, same presses for every customer | pass | pass | pass | pass | pass | pass | pass | pack.test |
| jsdom: the whole chain | pass | pass | pass | pass | pass | pass | pass | "all seven open" + per-restaurant chains |
| jsdom: Pause in a restaurant | pass | pass | pass | pass | pass | pass | pass | runs 3-4 at each |
| jsdom: Pause on the court | pass | pass | pass | pass | pass | pass | pass | run 19 (the court is shared) |
| jsdom: Settings keeps the hub rows | pass | pass | pass | pass | pass | pass | pass | run 3's tour at each |
| jsdom: the first-visit tutorial card | pass | pass | pass | pass | pass | pass | pass | each "first visit" run |
| jsdom: an unlock, seeded | open at start | open at start | open at start | pass | pass | pass | pass | the Grand Opening runs |
| jsdom: a five-star event and gold sign, seeded | pass | pass | pass | pass | pass | pass | pass | each event run |
| jsdom: one-switch Auto Scan | pass | pass | pass | pass | pass | pass | pass | each one-switch run; the parts of the U |
| jsdom: 5 s Enter hold in an arrival, Pause stays, Timed clock after | pass | pass | pass | pass | pass | pass | pass | run 5 at each |
| jsdom: the Timed tool held 3 s across a stage boundary | pass | pass | pass | pass | pass | pass | pass | each tool-held run |
| jsdom: every card opens at -1 | pass | pass | pass | pass | pass | pass | pass | every two-switch run |
| jsdom: at most 5 court stops a level | pass | pass | pass | pass | pass | pass | pass | every run on the court, 3-7 open |
| Review frames read | pass | pass | pass | pass | pass | pass | pass | counter + seven here; stations, cooking, tut, timed, motion by each food lane (`<id>-frames`); court moments in `2b-integrate-court` |

## Open for phase 3 (carried from the lanes or found here; nothing blocks)

- The Timed gauge placed from the food's on-screen box (needs a browser measure; the cafe's Large cup rim, the
  blender lid).
- The sushi's Simple auto roll stays on the prep mat (a browser look before moving it).
- Art: the pizza's and sushi's wide painted queues (Mitch off the right edge: 4:3 pizza, Cafe, Burritos, sushi;
  16:9 sushi); the sushi's thin counter top at 21:9; the court name plates a few px wider than the Smoothie Shack's
  and the Emporium's boards at 4:3.
- Audio: an ice cream pour sound (flourishes are silent). Cast: Vernon's "exactly one" scoop mention. Optional darker
  shake plate swatches. Shared `choice-scan.js` `arm()` re-arm (coordinator). Voices: all text to speech until the
  voice pass (`node tools/voice-clips.cjs all`: 19,143 clips).
