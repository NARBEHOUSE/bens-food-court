<!-- Engine map, 2026-11-08: Tests and build tools. Written by a read-only mapping agent. -->

# Tests and build tools: technical map (Ben's Burger Bar → Ben's Food Court)

All paths are relative to `BENSFOODCOURT/`. Baseline on 2026-11-08: `node --test "tests/*.test.cjs"` runs 53 tests and all pass in about 0.3 s. The jsdom tools need `JSDOM=<dir>/node_modules/jsdom`, which is not a hub dependency. Everything here runs in Node or Python; no browser is involved.

## 1. Rule tests

**`tests/bot.cjs`** is the shared harness.
- It loads `packs/diner/pack.js` and `tests/packs/test-pizza/pack.js` by fixed path (:7-8), plus every `js/core` module (:9-11).
- `right(pack, o, q)` (:15-25) returns the ticket's answer from `L.expected(pack, item, station, step)`:
  - `'swap'` when the ingredient is bad.
  - Under Timed cooking, `'takeOff'` at the wanted stage, or `null` to mean "tick 1 s and ask again".
  - For a pick, it searches one level of `row`.
- `play(pack, s, choose, opts)` (:29-45) returns `{presses, warnings, result}`. It drives `S.next/question/answer/tick/serve`, throws on a refused answer or after 2000 steps, and passes tutorial warnings to `opts.onWarn`.
- `random(s)` (:48-59) gives seeded legal answers: a 20% chance per Timed poll to take the food off, and a 30% chance of a redo at the review.

| File | What it checks | Pack-generic? |
|---|---|---|
| `pack.test.cjs` | Schema passes (:10-13). Schema catches a broken diner (:15-26). Core code names no diner id (:28-35). For `[diner, pizza]`: at most `L.MAX_ANSWERS`=4 answers and rows of at most 5 (:56-66); every recipe gets 3★ in Simple and Timed (:68-76). A 4-order shift gets 3★ every order on both packs (:79-85). Diner press counts 13/13/14/14 (:87-94). | The loop is generic. :15-35 and :87-94 are diner-only. |
| `line.test.cjs` | Patty offers, Skip/no-cook, Simple vs Timed refusals, Swap It, redo rows, stack order, the Timed clock (5 s a stage, the wanted stage ×2), the tutorial's warnings. | All diner. |
| `judge.test.cjs` | Stars from the mistake count (0→3, 1-2→2, 3 or more→1), each mistake kind named, tip `price*(0.6+0.2*stars)` plus the favourite bonus. | Diner. `made()` hardcodes the grill plus 9 board steps (:14-20). |
| `shift.test.cjs` | Queue (:8-19), gross-out placement over 600 seeds (:21-44), tutorial (:46-58), warnings only in the tutorial (:60-70), mid-order save and restore (:72-92), 600 bot shifts (:94-111), order sizes (:113-132), Gus orders two (:134-147), Sal never gets lettuce (:149-170), Timed take-off (:172-181). | :8-44 and :60-132 are generic in logic; the average bounds at :42 are tuned to the diner's `grossRate`. The rest is diner. |
| `script.test.cjs` | Lines well formed (:12-24), required moments present (:26-38), picks don't repeat (:40-53), hash and recording match (:55-63), full clip list (:65-78). | :12-38 and :55-63 are generic. Script path at :7. `ADDS` (:10) is unused. |
| `words.test.cjs` | Order and ticket wording, ticket matches the line (:36-55), order parts are in the recording list (:57-70), review text, prompts and labels (:90-105), receipt lines, settings migration (:124-134). | :36-70 and :90-105 are generic. :133 hardcodes `id:'diner'`. |

Gaps:
- shift.test :8-19 uses the same `c.art` truthiness check as `S.castOf` (shift.js:21), so it never checks that the pictures exist.
- No test checks that every pose named in `pack.poses` exists in the art manifest.

## 2. `tests/dom-play.cjs`: the real page in jsdom

**Setup**
- Loads `index.html` at `http://hub.local/apps/games/BENSFOODCOURT/index.html` (:84-85) with `runScripts:'dangerously'`.
- `HubFiles` (:23-31) maps that origin to the hub root (`GAME/../../..`). So the hub's real `choice-scan`, `voice-manager` and `scan-manager` run.
- `beforeParse` seeds two localStorage keys (:86-91):
  - `bb-settings` = `{v:2, pack:'diner', packVersion, data:{motion:'reduced', shiftLength:3, …opts.settings}}`
  - `narbe-scan-settings`
- `stub()` (:41-76) fakes speech (each utterance ends after 6 + length/4 ms), `matchMedia`, media `play` (ends after 20 ms), `animate`, and canvas `getContext`. It traps `window.THREE` so that `WebGLRenderer` becomes a `FakeRenderer` that counts renders.

**Driving and pacing**
- Waits until `BB.ui.__dbg().card==='title'` (:94). `__dbg` is at ui.js:424-428 and returns `{ctx, card, index, id, depth, backStop, parked, items, active}`.
- `press(code)` (:98-105): keydown, 30 ms, keyup, then 320 ms quiet so the hub's input-sensitivity filter accepts the next press.
- `choose(id)` (:107-115):
  - Two switches: Space until `dbg().id===id`, then Enter, at most 40 tries.
  - Auto Scan: polls every 20 ms, up to 600 times, then Enter.
- `settle()` (:116) waits while `BB.game.busy` is true or the scanner is inactive. `must(id, card)` (:117-122) chooses and asserts which card follows.

**Main loop** (:157-222, 240 s timeout)
- On cards: `results` ends the run; `title` → `continue`; `pause` → `continue`; any other card throws "stuck".
- Otherwise it reads `BB.game.screen` and `BB.game.shift()` (game.js:545):
  - `receipt`: records the stars; the first time, an optional pause tour runs `pause→settings→back→menu→yes→title` (:178-186). Then 15% `again`, then `next`.
  - `review`: optional `ticket`; a 20% redo chance, at most 3 redos; then `serve`.
  - `line`: the answer comes from `L.expected` (:206-211), with deliberate wrong answers at `opts.mistakes||0.08` (:213). Because it uses `||`, a run can't ask for zero mistakes. Under Timed it polls every 60 ms and takes the food off at the wanted stage (3% early).

**Assertions** (:223-239)
- The run reaches `results`.
- No window errors, unhandled rejections, `console.error` or jsdom errors. The filter at :81 allows a missing `voice/manifest.js`.
- Dislike lines said ≥ orders that held a dislike (:170-174, :225-228).
- With `watchWheel`:
  - At least one sauce squirt; it wraps `BB.world.lineOutcome` and checks `incoming.userData.bottle`.
  - The wheel turned and stopped at `BB.stage.wheelTheta`=0.
- At least 10 3D renders.
- The script exits with 1 if any run failed.

**Runs** (:243-253; filter by words in the label, :256):
1. Tutorial with 35% mistakes.
2. A shift with the settings tour, pause and continue, and redos.
3. Timed cooking.
4. Auto Scan at 1 s.
5. Fancy orders, 5 customers, captions only, Mitch off.
6. Eight customers, the whole cast (480 s).
7. Motion Full: the wheel turns and the sauce squirts.

## 3. Review frames

**`JSDOM=… node tools/review-frames.cjs <out> [tut|motion|timed|sal]`** (default output `art-source/review/frames`, :21)
- Each `session(name, settings, plan)` (:41-140) opens a fresh jsdom page with the same loader. Fake speech lasts 40 + 9×length ms (:52-55) so characters are caught mid-line, and the renderer keeps the last scene and camera.
- `shot(moment)` (:89-137) does two things:
  1. Hides `ShaderMaterial` outline shells and cuts partly drawn geometry (`drawRange`). It then calls `NR.render(THREE, scene, camera, 1280, 720, {ss:2, sky: magenta})` from `apps/games/NARBEKART/tools/node_render.cjs` (:19) and writes `<nn>-<session>-<moment>.3d.png`.
  2. Saves the 2D stage to `.json`:
     - `scene`, `backdrop` (the name only, matched by regex at :114)
     - customer and Mitch `src`, register and bell visibility
     - `controls[] {id, kind, cls, label, lit}` and `bare`
     - ticket lines and `ticketMany`, bubble, receipt, gauge
     - `lit`, `hud`, and `wheel` from `BB.stage.wheelGeometry(W,H,text,theta)`
- `n` restarts in every session (:88), so files from different sessions interleave in the sheet.

**Sessions**
- `tut`: intro, order, ticket with Mitch, then the first `grill`, `dial`, `gross`, `line` (lettuce) and `bottle` (ketchup) steps, then review, reaction and receipt. The tags are at :170-171.
- `motion`: wheel-in and wheel-turn, caught by θ windows; the ketchup squirt shot when the bead is more than 40% drawn (:204-213).
- `timed`: sleeps a fixed 5600 ms (:227).
- `sal`: wraps `BB.audio.say` to shoot his order, his dislike line and his reaction.

**`python tools/review_compose.py <out>`**
- `compose(frame3d, state)` (:183-322) mirrors `css/bb.css` at 1280×720 (1vw = 12.8 px):
  - Backdrop from `packs/diner/art` (:15, :186).
  - Customer at the counter at 9vw/3vh, 88vh tall; Mitch at right −3vw at the counter, at −4vw/33vh in the kitchen.
  - The 3D frame with magenta keyed out; `key_magenta` (:47-59) is a pure-Python per-pixel loop.
  - The wheel and ticket (`draw_wheel` :127-180, `ticket_image` :86-117).
  - The Pause sign, "Ring It Up" and "Next Customer" (:209-229).
  - The controls column: plate marks come from a burger-doneness label map (:277); the spatula prop is at :265.
  - Gauge, bubble, receipt and hud.
- It writes `<stem>.png` per frame and a 2-column `sheet.png`.

## 4. Art generation

1. **Prompt builder: `art-source/jobs/write_prompts.py`**
   - Usage: `write_prompts.py models | poses <chars> | backdrops | props [names]`. It writes `jobs/<job>.txt` and prints TSV lines `job\trefs` to stdout (:245-246).
   - All its data is in the code:

     | What | Where | Notes |
     |---|---|---|
     | `STYLE`, `FIGURE` | :14-26 | Says "comedy diner game"; the figure fills 88% of the height on white |
     | `CAST` | :28-56 | 6 characters |
     | `POSES`, `MITCH_POSES` | :59-82 | 10 poses each |
     | `poses_for()` | :88-89 | Keyed on the literal name `'mitch'` |
     | `VERNON_NOTE` | :84-85 | Vernon keeps his arms folded |
     | `BACKDROPS` | :133-175 | Counter, grill, board, with layout boxes that match the stage (customer zone 10-55%; bottom 22% left for the counter; station backdrops leave the bottom 35-38% plain for the 3D food) |
     | `PROPS` | :184-196 | Register, ticket wheel, bell, Back in 5 sign, spatula |

   - `pose_prompt` (:109-124) says "image 1 = APPROVED neutral; change ONLY pose and expression", with two poses per job (:228-232).
   - Save paths: `art-source/cast/<char>/<pose>.png` at 1024×1536, `art-source/backdrops/<n>.png` at 1536×1024, `art-source/props/<n>.png` at 1024×1024. Each also saves a `-prompt.md`.
2. **Job runner: `run_jobs.sh <tsv>` and `astra.sh`**
   - `run_jobs.sh` (PAR=5) calls `astra.sh <job> [refs…]`, logs `HH:MM:SS job: exit=N`, and writes `<job>.run`. It runs jobs in batches: `wait` after every fifth job (:9), not a rolling pool.
   - `astra.sh` runs the VS Code extension's `codex.exe exec -C <game root> --sandbox workspace-write` at medium reasoning, with one `-i` per reference image, the prompt on stdin, and `timeout 2400`. It writes `<job>.reply.txt` (the `pwd -W` fix is at :8) and `<job>.log`.
   - **Bug:** `trial.tsv`, `wave1.tsv`, `wave2.tsv` and `props.tsv` have CRLF line endings, and `read` keeps the `\r`. The reference images reached codex as `…neutral.png\r`; `poses-mitch-shrug.log:41` shows Astra stripping it itself. `sal-poses.tsv` has LF endings.
3. **Review sheets: `tools/sheet.py <out.png> <cell height> <images…>`.** Five columns, each labelled `parent/stem`. Generic.
4. **Cut-outs: `tools/build_art.py [chars…]`** (runs in the ComfyUI venv, needs CUDA)
   - `load_model()` loads BiRefNet in fp16 (:32-40).
   - `matte()` pads to a square, runs at 1024, and clears near-white "paper" (:43-57). `defringe()` removes the white blended into edges (:60-67). Outputs newer than their source are skipped (mtime).
   - Output goes to `packs/diner/art` (:23):

     | Kind | Size | Treatment |
     |---|---|---|
     | Cast | 768×1152 | Full canvas, no crop, so pose swaps never jump; quality 88 |
     | Props | ≤640 square | Cropped to the bounding box; quality 90 |
     | Backdrops | 1536×1024 | `BLUR` boxes (empty now); quality 86 |

   - `main()` (:143-160) rebuilds props only when no names are given.
   - It writes `manifest.js` as `BBArt.diner` (:157): `{cast:{folder:[poses]}, backdrops, props, castSize, backdropSize}`. `stage.js:15-24,49` reads it.

## 5. Sounds and voices

- **`make-sounds.cjs [names]`** writes 22.05 kHz WAVs to `packs/diner/sound` (:14).
  - One seeded noise stream (:17-18) feeds every sound, so new sounds must be added at the end to keep existing files byte-identical. `sizzle` also uses `Math.random` (:44).
  - Of the 12 sounds, 9 are shared UI sounds; `sizzle`, `flip` and `squirt` are burger-only.
- **`voice-clips.cjs`** lists clips `{clip, speaker, text, delivery?, moment, hash, order, recorded}`.
  - The diner pack, script and manifest are fixed (:15-22).
  - Order parts come from `S.recipesFor(pack, 2)` (:27).
  - Today that is 852 line clips plus 57 order parts per customer.
- **`voices.py design|record|use`** (Voice Studio lives on F:, :32)
  - Voice ids are `bb-<speaker>`, so one voice per character can be reused across packs.
  - The output folder and manifest are fixed to `packs/diner/voice` and `BBVoice.diner` (:41, :193).
  - `voices.json` has no entry for Sal or any new character.
  - `voice-styles.py:240` and `voice-test.py:181` read `packs/diner/art/cast/<n>/neutral.webp`.
  - All of this waits for the final voice pass.

## 6. Places that are burger-specific or assume one pack

- **Tests:**
  - bot.cjs:7-8, and the `diner` import in line, judge, words, script and shift tests.
  - pack.test.cjs:15-35 and :87-94.
  - shift.test.cjs:42, :46-58, :134-181 (:151 is the script path).
  - script.test.cjs:7, :27-33, :40-53, :65-78. The moment list at :27-33 includes `tutorial.grill` and `tutorial.board`, which mirror game.js:265 (`q.station==='grill'`).
  - words.test.cjs:11-34, :72-88, :107-122, :133.
- **dom-play.cjs:**
  - The module-level `pack` (:20), used at :141, :172, :194, :203 and :206.
  - The URL and settings seed (:85, :87), the squirt check (:132).
  - The title-menu flow (:150-154, :162, :178-186) and the run list (:243-253).
- **review-frames.cjs:** :23, :49, :114, :116-117. Line :169 uses `w.BB.packs`, a hook that doesn't exist. Also :170-171, :204-213, :227 and :233-258.
- **review_compose.py:** :15, :209-229 (prop files and labels), :265, :277, and hardcoded colours.
- **build_art.py:** :23, :157.
- **write_prompts.py:** :14-20, :28-56, :88-89, :127-196, and the save paths at :105, :111, :204 and :212.
- **make-sounds.cjs:** :14.
- **voice-clips.cjs:** :15-22, :27.
- **voices.py:** :41, :168, :193, :244.
- **test-pizza:** its global key is `testPizza` while its id is `test-pizza` (:10 vs :12), and its manager is Sal (:65). The real pizza pack must not copy either.

## 7. To support the Food Court

**Test harness and Node tests**
- **`tests/packs.cjs` (new).**
  - `packIds()` reads the court's restaurant list (e.g. `packs/court.js`: `[{id, name, side, start, unlockAt}]`).
  - `loadPack(id)`, `loadScript(id)` (the pack script merged with a shared cast script, if one is added) and `loadArt(id)` (pack manifest plus shared manifest).
  - Move `questions()` (pack.test.cjs:38-54) into bot.cjs.
  - Keep the diner test files as "golden" wording tests, and add a small golden test per new pack (tutorial line, ticket text, press counts).
- **`tests/every-pack.test.cjs`**, looping over every pack:
  - Schema; at most 4 answers per screen; every recipe 3★ in Simple and Timed.
  - The tutorial plays to 3★ with its swap; warnings appear only in the tutorial; save and restore is exact.
  - Bot shifts across every setting; queue and gross-out rules, with bounds taken from `grossRate`/`grossMax`.
  - Ticket matches the line; order parts are in the recording list; every step has a prompt and labels.
  - The script is well formed and has every needed moment for `castOf(pack)` and the manager. Export the moment list and the allowed blanks (add `{count}` for slices) from `js/core/script.js`, so game.js and this test share one list.
  - The `twin`, `dislikes` and `usual` rules hold for every regular that has them; each single item stays within a press budget.
  - Run the "core names no ingredient" check over the ids of all packs.
  - Add a guard that `js/*.js` never names a pack. Today it does at game.js:11, stage.js:12, world.js:15, audio.js:12 and save.js:10.
- **`tests/cast.test.cjs`:**
  - Shared regulars are identical in every pack (id, name, art, tts, who, voice): Marge, Gus, Bev, Vernon and Sal, plus Dale, Priya, Oakes, Reginald, Tasha and Kai.
  - Dislikes are valid per pack. schema.js:126 rejects `lettuce` in a pack that has none, so Sal needs a dislike set per pack.
  - `manager.id==='mitch'` everywhere, with `art:'mitch-<pack>'`.
  - Each restaurant's own customers appear in that pack only.
  - Every speaker in a pack has a distinct TTS pitch and rate.
- **`tests/art.test.cjs`:** every art folder has all poses named in `poses.customer` and `poses.manager`. Every backdrop (including those of stations used by offered recipes) and every stage prop is in the manifest and on disk.
- **`tests/court.test.cjs`:**
  - Burger Bar, Pizza Parlor and Cafe are open at the start.
  - The 4th, 5th and 6th restaurants open when every open restaurant reaches 3★, 4★ and 5★; the 7th when all six are at 5★; the celebration when all seven are at 5★.
  - Unlock order: Smoothie Shack, Burritos, Sushi, Ice Cream Emporium.
  - Stars and popularity never drop.
  - The court scan never offers more than 5 choices.
  - Each storefront speaks its name and stars.
  - Progress migrates from `bb-progress:diner`.

**dom-play.cjs**
- New options `opts.pack`, `opts.court` (court progress seeded in `beforeParse`) and `opts.enter`.
- Read the active pack from a new page hook, `w.BB.game.pack()`, instead of the module constant.
- New `enterRestaurant(id)`: Play → court → the group (when 5 or more are open) → the storefront → play or skip the first-visit tutorial.
- New `backToCourt()`; the pause path becomes Back to Food Court → re-enter → Continue. The settings tour moves to the court menu.
- Split `watchWheel`: always check the wheel, but check the squirt only in packs with a `sauce:true` Add step.
- New assertions:
  - The backdrop src contains `packs/<id>/`, and Mitch's src contains `manager.art`.
  - Whole-cast runs hear every customer in `castOf(pack)`.
  - The court never drops after a shift.
- Generate runs for each pack (tutorial, two switches, Timed, Auto Scan, whole cast), plus court runs: enter all seven, unlock the 4th, the grouped scan, leave mid-shift.
- Add `--pack` and `--jobs N` (child processes; runs spend most of their time sleeping). Use `??` for `mistakes`.

**Review frames**
- `review-frames.cjs <out> [--pack id|--all] [sessions]`, writing to `<out>/<pack>/<session>-<nn>-<moment>.*`.
- Take moment tags from the pack data (first step of each station, cook, pick, sauce, gross).
- Compute the Timed wait from `cookSpeeds[speed]` and the stage index.
- New sessions: a generic `cast` session (replaces `sal`), a `mitch` uniform-poses session, and a `court` session.
- The state JSON gains `pack`, `theme`, full src paths for backdrops and props, plate `marks` (count `.marks i`, stage.js:211) and the label text from the page.
- `review_compose.py` takes the art folder, props, labels, marks and colours from the state; gains a court mode; uses numpy for `key_magenta`; writes one sheet per pack.

**build_art.py**
- Replace `SRC`/`OUT` with targets:
  - `--shared`: `art-source/shared/cast` → `packs/shared/art` (`BBArt.shared`).
  - `--pack <id>`: `art-source/packs/<id>/{cast,backdrops,props}` → `packs/<id>/art` (`BBArt[id]`). Mitch's uniforms are cast folders `mitch-<id>`.
  - `--court`: → `court/art` (`BBArt.court`).
  - `--all`.
- The stage looks for a cast folder in the pack manifest first, then the shared one.
- Load BiRefNet once for all targets.
- New kinds: storefronts (cropped, ≤1024), shopper sprites (cropped, ≤256), and a larger court backdrop if the court zooms in.
- Report poses missing for each character's role.
- Move the five regulars to the shared folders. Back up first, and move their outputs with them so the mtime skip keeps working. Update the portrait paths in `voice-styles.py:240` and `voice-test.py:181`.

**write_prompts.py**
- Per-pack settings, `PACKS[id] = {place, theme}`, filled into all three style blocks.
- `SHARED_CAST` and `PACK_CAST[id]`:

  | Restaurant | Own customers |
  |---|---|
  | Pizza Parlor | Tony, the birthday-party mom |
  | Smoothie Shack | Breeze, the gym bro |
  | Cafe | Jitters (Priya, from the shared cast, is the Cafe's main regular) |
  | Sushi | Chef Hiro, the first-timer |
  | Burritos | Inferno, the construction worker |
  | Ice Cream Emporium | Little Lulu, Grandpa Walt |

  - Each character gets a `note` (the general form of `VERNON_NOTE`) and a `fill`. Kids should use about 0.65 of the height: the canvas is never cropped, so the prompt sets how tall they look on screen.
- **Mitch's uniforms:**
  - `uniform <pack>`: one job, reference `cast/mitch/neutral.png`. "Keep the face, body, pose, the shirt, red tie and taped MANAGER badge; add <uniform>". Saves to `art-source/packs/<id>/cast/mitch-<id>/neutral.png`.
  - Then `uniform-poses <pack>`: one job per pose, with two references, the uniform neutral and the approved `cast/mitch/<pose>.png`: "pose from image 2, costume from image 1".
  - `poses_for()` should go by role, not by name.
  - Uniform props (such as the cafe cup) only in poses with a free hand.
  - Still undecided: whether the Burger Bar gets the paper-hat uniform from the proposal or keeps today's Mitch.
- **New backdrops:** `counter()` and `station()` templates that keep today's layout percentages. Per-restaurant scenes:
  - Pizza: prep, oven
  - Smoothie: bar, blender
  - Cafe: espresso, donut fryer
  - Sushi: rolling, slicing
  - Burritos: line, griddle
  - Ice cream: freezer, toppings, shake machine
  - The court: the floor, 7 storefronts at fixed boxes, shutter and Coming Soon sign, Grand Opening banner, star signs, gold sign, progress board, shoppers.
- Put the pack in each job name (`pizza-backdrop-counter`). Add `--tsv <file>` that writes LF line endings, and a `check <tsv>` mode that lists jobs whose files are missing.

**Runner, sounds and voices**
- `run_jobs.sh`: strip `\r`, use a rolling pool (`wait -n`), skip jobs that are already done, allow `jobs/<pack>/` subfolders. That is about 200 jobs: 17 characters × 6, 6 uniforms × 10, about 25 backdrops and about 35 props.
- `make-sounds.cjs --pack`: shared UI sounds go to `packs/shared/sound`. Add each restaurant's cooking sounds and the court sounds after the existing 12. Frequent ones stay soft and below about 2.5 kHz.
- `voice-clips.cjs` and `voices.py --pack`: per-pack paths and manifest key, the `recipesFor` level as a parameter, and new characters in `voices.json`, all at the final voice pass.
