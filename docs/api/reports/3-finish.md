# Phase 3, lane finish (2026-11-10)

Nothing went to a games.json, the F: drive or the website; no voices; no browser, Electron or GPU (Node, jsdom, CPU
frames only).

## Files changed (backed up first)

- `DESIGN.md` rewritten as the whole game's design as built (396 lines, was 870): the flow, the court, stars and
  unlocks, levels, the seven restaurants and their recipes, the line, the ticket, cooking, rating with the complaint
  split, gross-outs, tutorial, cast and Mitch, expressions, writing tone, the counter layout, no floating UI, Pause,
  controls, Settings, look, sound, voices (text to speech now; new voices later), saves, how it is built. No history.
  The section names other files cite ("Writing tone", "Voices and the script", "Gross-outs", "Expressions", ...) are
  kept. Backup `docs/backup/DESIGN.md.before`.
- `docs/api/pilot.md`: new section 9, opening the game from VS Code. Backup `docs/backup/docs/api/pilot.md.before-2e`.
- This report. No code changed.

## Checks

- `node --test "tests/*.test.cjs"`: **323/323 pass**, 0 fail, 0 skip, 0 todo (at the start and after each file).
- Pilot step 1 for all seven: `[[],[],[]]` each (schema, script, moment coverage). Presses (bot.pressReport): level-1
  Simple at most 13 diner, 13 pizza, 10 cafe, 13 smoothie, 14 burrito, 13 sushi, 14 icecream; no row over 14.
- **jsdom, the full set: 135/135 ok**, no script error, the only warning three.js's own deprecation note. The 97 runs
  of `RUNS` (0-96), runs 13-17 at `--pack smoothie|burrito|sushi|icecream` (20) and runs 3-5 at the other six (18),
  each in its own process, 12 at a time, two foreground batches (pool: scratchpad `phase3/finish/pool.cjs`, results
  `results.jsonl`). No reruns were needed.
- Frames (CPU): `tools/review-frames.cjs` counter and counterxl at 16:9 and 4:3 for all seven, and the court sessions
  menu, howto, settings, court, seven, tiers, moments, parts, closed; `tools/review_compose.py --guides`. Read: every
  counter sheet at 16:9 and 4:3, Extra Large at 4:3 (sushi) and 16:9 (icecream), several single frames, and the court's
  seven, tiers and moments sheets.

### Spec 9, all seven

| Check | Result |
|---|---|
| Every pack validates | yes, all seven (`[]`) |
| At most 4 answers on a line screen | yes (line tests; schema) |
| Every recipe at every level makes 3 stars, Simple and Timed | yes (bot, suite); jsdom Timed no-mistake runs 3,3,3 at all seven |
| Press budget | yes, level 1 at most 14, nothing over 28 |
| Judge counts every mistake kind; tickets list everything | yes (judge, words tests; voicecut readout test) |
| No js/core file names an id | yes (suite) |
| Court rules: unlocks, stars never down, event gives the 5th, one celebration, a left shift counts once | yes (court tests 39-56; jsdom run 4 at all seven) |
| Moment coverage, every speaker, every restaurant | yes (`SC.coverage` `[]`) |
| Food builders resolve every look | yes, all seven (food tests) |
| No two speakers sound the same | yes (voices tests 8, 9, 12) |
| Same recipe, same presses for every customer | yes (suite) |
| jsdom: the whole chain, every open restaurant | yes, run 28: 21 orders, back to the court |
| Pause in a restaurant and on the court; Settings keeps the hub rows | yes (runs 3 at all seven, 19) |
| First-visit tutorial card | yes, all seven |
| An unlock and a five-star event, seeded | yes (22, 47, 55, 75, 84, 93; 11 and the event at each) |
| One-switch Auto Scan | yes, all seven (7, 39, 51, 59, 71, 80, 89; 8, 26) |
| 5 s Enter hold during an arrival | yes, run 5 at all seven |
| Take It Off held across a stage boundary | yes, at all seven (run 6: pressed at Raw, took Raw) |
| Every card opens at -1; court at most 5 stops | yes (every run checks) |
| Review frames read | yes (below) |

### What the frames show

- Every counter at 16:9 and 4:3: the served customer, the order on the counter left of the queue, the column, the
  receipt, the register and the bell keep clear of the painted queue (cyan box) in every frame read.
- Mitch at 4:3 is off the right edge at the **Cafe** and the **Burritos** (his named bubble speaks from the edge; as
  page.md 7 allows). On screen everywhere else.
- Extra Large, Ice Cream Emporium at 16:9: the corner count ("Customer 2 of 3 · 5 coins") overlaps the right end of
  the restaurant's name on the sign board ("Emporiu..."). Cosmetic; the name is said elsewhere.
- Extra Large receipts (sushi 4:3, icecream 16:9) touch the top corner of the queue box, over empty floor, no face.
- Court: names on their boards at 16:9 and 4:3, the board legible, closed stores grey behind shutters, lines and
  diners still; Grand Opening, gold sign and celebration read well.

## Trim: refused by the permission system

One `rm` of the items below was refused ("Irreversible Local Destruction"). As asked, nothing was worked round. Each is
proven unneeded (build_art.py reads only `art-source/{cast,backdrops,props,court-food}/*.png` at the top level; every
one of those maps 1:1 to a built `.webp` and every `.webp` is in a manifest):

| Path (under art-source/) | Size | Why it can go |
|---|---|---|
| `review/art-polish`, `review/fix`, `review/review-visual` | 637 MB, CPU frames | old review frames |
| `review/finish` (this lane's) | 435 MB | review frames; regenerate with pilot.md 8.4 step 5 |
| `backdrops/candidates/` | 46 MB, 33 files | unused counter takes (one, `cafe-counter-2.png`, is a byte copy of the used picture) |
| `cast-eating/*.png` | 27.5 MB, 22 files | byte-identical to `cast/<id>/eating.png` (keep the prompt `.md` files) |
| `jobs/*.log`, `*.run`, `*.reply.txt` | 2.7 MB, 846 files | Astra job output; the prompts, `.tsv` lists and scripts stay |

No `__pycache__`, stray logs or scratch were found elsewhere. Kept: `docs/backup`, tests, tools, docs, the sources.

## Sizes (now)

- **What players download** (index.html, css, js, packs): **36.9 MB, 486 files**; the cast's 324 pose pictures are
  27.2 MB of it; js 1.7 MB (three.min.js 0.63 MB); each restaurant 0.7-1.2 MB. Plus the hub's shared scripts: 0.10 MB,
  12 files.
- **The whole game folder: 1,655 MB, 5,748 files**; about 520 MB after the refused deletes.
- **Art sources** (art-source without review): **541 MB, 1,849 files**: cast 408, backdrops 92 (46 of it candidates),
  cast-eating 28, props 11, jobs 2, court-food 0.4. What build_art.py needs: about 465 MB.
- **Anything else large:** `art-source/review` 1,062 MB; `docs/backup` 13 MB.

## Opening it from VS Code (pilot.md 9)

`index.html` loads `../../../shared/*.js`, so it must be served from `bennyshub` or above. Open the `Benny's PC Hub`
folder in VS Code, right-click `bennyshub/apps/games/BENSFOODCOURT/index.html` > Open with Live Server, then
`http://127.0.0.1:5500/bennyshub/apps/games/BENSFOODCOURT/index.html`. Without the extension: in `bennyshub`,
`python -m http.server 8080 --bind 127.0.0.1`, then `http://127.0.0.1:8080/apps/games/BENSFOODCOURT/index.html`. Each
address keeps its own saves. file:// would mostly run by the code (no fetch) but blocks the hub's Speaker Mode worker
and keeps saves apart; not tried in a browser.

## Not done

- The deletes above (permission).
- Mitch off the right edge at 4:3 at the Cafe and the Burritos; the Extra Large corner count over the Emporium's sign
  name at 16:9.
