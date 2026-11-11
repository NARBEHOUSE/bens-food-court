1. BLOCKER. §3 (js/packs.js) and §9 (cast, core-b, page): the cast is never merged into the packs anywhere Node can test, and cast.js has no format.
   Problem: §3 gives "merges cast + pack + scripts" to js/packs.js, which page writes in phase 2. §9 gives "script merge (cast + pack)" and "schema for everything" to core-b in phase 1. No one merges a character's persona into a pack's regulars. castOf keeps only `pack.regulars` that have `art` (shift.js:21), and game.js:30 and audio.js:27 look people up in `pack.regulars`/`pack.manager`. So a pack whose people live in packs/cast/cast.js has no customers. core-b's every-pack tests can't run, and neither can any content agent's tests while page is still writing js/packs.js. The spec also never says:
   - the global name or entry shape of cast.js ("role", "traits" are undefined);
   - which fields belong to the character and which to the pack: twin, short, exact, newest, tipScale, threeStarScale, visitor and its level, dislikes;
   - which copy wins when both have a field (the diner's inline tts would override the cast's);
   - how a pack names Mitch's uniform. The Burger Bar's is `mitch-burger`, so a `'mitch-'+pack.id` rule silently falls back to plain Mitch.
   Add: "core-b owns js/core/cast.js (UMD, `BB.cast`). `merge(cast, pack)` returns the pack with `regulars` and `manager` filled in. js/packs.js, tests/bot.cjs and schema use only merged packs. packs/cast/cast.js sets `BBCast = { people: { <id>: { name, art, role:'manager'|'regular'|'local'|'visitor'|'extra', who, voice, tts:{ voices, pitch, rate }, twin?, short?, exact?, newest?, tipScale?, threeStarScale?, visitor?:{ level } } } }`. A pack has `regulars: [{ id, likes?, usual?, always?, favourite?, set?, wants?, dislikes?: [this pack's ingredient ids], visitor?:{ level } }]` and `manager: { id:'mitch', art:'<uniform folder>' }` (diner: 'mitch-burger'). Persona fields come only from the cast; the pack's own fields win for everything else."

2. MAJOR. §4.3, §6.2, §6.6, §9 (core-b, content-cast, content-<pack>, page): moment names, merge order and clip ids have no owner, and nine phase-2 agents write against them at the same time.
   Problem: game.js chooses which moments are said, the content agents write lines for them, and core-b's coverage test checks them. Nobody fixes the names for:
   - tutorial lines per station (game.js:265 picks tutorial.grill or tutorial.board by checking `q.station==='grill'`);
   - auto steps;
   - the event intro and celebration;
   - a visitor arriving;
   - an odd order's "own spoken phrasing" (otherwise it has to go through W.said() in core-a's words.js, which is finished before core-b invents odd orders);
   - Mitch's uniform jokes.
   Also undefined:
   - which file holds a regular's lines for one restaurant;
   - whether cast lines count as the speaker's "own" in candidates() (script.js:51-56);
   - line ids that collide between the two scripts (one clip id means one no-repeat entry and one manifest key);
   - a blank for slot values (fill() turns {want}/{got} into words only through stageNames);
   - the blanks in the court's goal line.
   Putting the pack into every clip id would orphan the diner's recorded keys (packs/diner/voice/manifest.js). Mitch's voice is already approved.
   Add: "core-b exports `BB.script.moments(pack)`: every moment game.js may call, with its speakers and allowed blanks. It includes `tutorial.<stationId>`, `tutorial.cook`, `event.<id>.intro`, `event.<id>.done`, `visitor.arrive`, `odd.<id>` (the customer says it; the ticket stays plain), `uniform` (Mitch, at shift start), and `court.return|unlock|goldSign|celebrate` with {restaurant}, {stars} and {count}. {value} is the blank for a slot value. game.js calls only listed moments, and the coverage test checks each one per pack. content-<pack> writes every line said only at its restaurant, Mitch's and the regulars' included. content-cast writes lines that are true anywhere (no food names). The diner's existing regular lines stay in packs/diner/script.js. The merged script is pack lines plus cast lines, both counted as the speaker's own; the pack's 'customer' lines stay the fallback. Line ids are unique per speaker across the merged script. Clip ids: diner lines keep today's ids; all others are `<speaker>/<source>:<id>[.value]`, where source is the pack id, 'cast' or 'court'."

3. MAJOR. §9 (cast, audio, world) against page owning index.html: phase-1 files can't load into the page, cast's moves break it, and cast and audio both own the sound folders.
   Problem: index.html is the only script list (dom-play.cjs and review-frames.cjs load it), and page doesn't own it until phase 2. So in phase 1:
   - world's js/food/kit.js and js/food/diner.js can't be loaded, so world can't keep the diner drawing;
   - cast's packs/cast/cast.js and new manifests can't be loaded, so audio can't reach the cast's voices in the page;
   - moving packs/diner/art/{cast,props} and packs/diner/sound breaks stage.js (BBArt.diner and packs/diner/art paths, stage.js:15-24, 49) and audio.js (audio.js:20), which stay unchanged until phase 2. Any phase-1 jsdom run or review frame after cast finishes has no characters, props or sounds.
   Sounds also have two owners. cast "moves sounds → packs/shared/sound", while audio owns packs/shared/sound, packs/<pack>/sound and make-sounds.cjs (which writes packs/diner/sound, :14). Moving all twelve also puts the diner's cooking sounds (sizzle, flip, squirt) in the shared folder, against §6.6.
   Add: "Phase 1 copies and never moves. packs/diner/art/{cast,props} stay, and build_art keeps writing BBArt.diner, until page has switched stage.js over; the coordinator deletes the old folders in phase 3. Sound files belong to audio alone: plop, swoosh, toss, tick, ding, kaching, stars, buzz and ew go to packs/shared/sound; sizzle, flip and squirt stay in packs/diner/sound; cast doesn't touch sound. Phase-1 owners may add their own new files to index.html as marked blocks (world: kit.js and food/diner.js after three.min.js; cast: packs/cast/cast.js and the new manifests before js/save.js). page keeps those blocks."

4. MAJOR. §0.4 with §9: two owners back up to the same file.
   Problem: `docs/backup/<file>.before` uses only the file name, and names repeat:
   - tests/packs/test-pizza/pack.js (core-a) and packs/diner/pack.js (content-diner) both become pack.js.before;
   - js/core/script.js (core-b) and packs/diner/script.js (content-diner) both become script.js.before.
   The second agent either skips because of "once" or overwrites. With no git, that backup is the only way back.
   Add: "Back up to `docs/backup/<path from the game folder>.before`, e.g. `docs/backup/packs/diner/pack.js.before`."

5. MAJOR. §5 and §9 core-a ("gross-outs on any step") against DESIGN.md "Gross-outs" and §0.7-0.8: the spec gives no meaning, and as briefed it breaks the answer limit and Simple-mode safety.
   Problem: DESIGN.md, whose rules "hold in every restaurant", allows gross-outs only on Add steps, caught with Swap It and named in the label. §5 puts them on:
   - the Cafe milk pick: Whole/Oat/Skim/None plus Swap It is 5 answers;
   - the ice-cream flavour pick: 3 plus More… plus Swap It is 5;
   - cook steps (burnt crust, burnt coffee): in Simple nothing lets the player see or prevent them, against §0.8;
   - the automatic wrap (a bursting burrito): there is no answer to catch it with.
   core-a, seven content agents and world (which draws the bad thing) will each invent a different meaning.
   Add: "A gross-out sits on something the ticket wants:
   - at an Add step, as now;
   - at a pick step, on the wanted value. The label names it ('Whole milk, gone off'); choosing it serves it; Swap It replaces it and asks again; choosing another value is a pick mistake;
   - at a cook step, on what goes onto the heat, shown and swappable before cooking.
   A step that can host one has at most 3 other answers (schema checks this; never on a paged pick). Never on an auto step, and never as the result of cooking: the bursting burrito is a no-mistake visual joke after the wrap, and burnt crust and burnt coffee are dropped (Timed's last stage already covers burning). Spoiled milk and freezer burn move to steps with 3 or fewer answers, or are dropped."

6. MAJOR. §4.1, §6.2, §6.3, §7 and §9 (core-b "banking, results" against court-rules): leaving contradicts resuming, and court-rules reads a result shape that a parallel agent defines.
   Problem: §4.1 says leaving by Food Court, Main Menu or Exit banks the shift and clears the saved one. But §6.2 labels "shift in progress", and §6.3 says "A saved shift there resumes". "Banks what was earned" never says what is earned: §7 has no coins, yet the HUD, receipt and results show them (game.js:121, 478). The 3-served rule sits under js/core/court.js while "banking" is core-b's. court-rules has to judge "good" from S.results() fields (average, event, tutorial) that core-b is defining at the same time. Restart Shift and an event shift left part-way are not covered.
   Add: "Leaving a restaurant by any menu route ends the shift. game.js calls `S.bank(s)` (core-b: `results(s)` plus `left:true`), passes it to `court.addShift`, then clears bb-shift:<pack>. court.addShift ignores tutorial results and left results with fewer than 3 orders; a left event shift is judged like a finished one. A saved shift exists only if the page closed without a menu route (hub Back, power loss), and entering the restaurant resumes it. Both agents code to `results = { pack, level, event: id|null, tutorial, left, orders, stars:[1-3 per order], avgStars, coins }`. Restart Shift banks the same way as leaving. Coins: choose either 'shown on the receipt and results only, never saved' or 'kept in bb-progress:<pack>.coins'."

7. MAJOR. §6.5 and §9 (core-a against world): the made() shape the 3D builds from changes while world is coding against it.
   Problem: world, running alongside core-a, moves every builder into js/food/diner.js and defines the registry that receives made(). core-a changes made() to "record every pick". Today:
   - a `from` pick overwrites made.ing (line.js:360: fries or rings at the fryer);
   - size and done are item-level;
   - a flavour is a part with `flavour:true`.
   If core-a moves picks to a new field or stops the overwrite, world's diner breaks, and the food agents code to whatever world documented.
   Add: "made() keeps every current field and meaning: `ing` is still set by a from pick or builds.on; `size`; `done`; `parts[{ ing, done?, layer?, flavour?, gross? }]`; `gross`. It only adds `picks: { <slot>: value | [values in line order] }`, `counts: { <ing>: n }` for repeats, and `auto: [ids of auto steps that ran]`."

8. MAJOR. §9 (core-a and core-b): tests/bot.cjs belongs to core-b, but core-a needs it first.
   Problem: every test file, core-a's included, imports tests/bot.cjs. Its right()/random() solvers (bot.cjs:15-59) know only add, cook and from/of picks, and pack.test.cjs's "3 stars in Simple and Timed" loop uses them. core-a adds slots, repeats with Done, steps skipped by `when`, auto steps, cooking variants and paging, and moves test-pizza onto them, but may not touch bot.cjs. core-b owns it and starts only after core-a.
   Add: "tests/bot.cjs belongs to core-a while core-a runs (solvers for every new step kind), then passes to core-b, who adds loading packs through the cast merge and the every-pack loop."

9. MAJOR. §3 and §9 (core tests against content-diner): golden diner tests pin files that content-diner rewrites, and the every-pack loops have no filter.
   Problem: tests owned by core-a and core-b assert the live diner's data and wording:
   - press counts 13/13/14/14 (pack.test.cjs:87-94);
   - the tutorial order "Bacon Cheeseburger, medium, no onions." (shift.test.cjs:50-52);
   - Vernon's and Bev's complaint text (script.test.cjs);
   - Sal's lines read from packs/diner/script.js (shift.test.cjs:151);
   - judge.test's nine board steps.
   In phase 2 content-diner rewrites packs/diner/{pack,script}.js (levels, fryer, combos, odd orders, lines moving to the cast script) and owns none of these tests. Also, because tests "loop over every pack in packs/", each content agent's run loads six other packs that are being written at that moment.
   Add: "Before changing anything, core-a copies today's packs/diner/{pack,script}.js to tests/packs/diner-golden/. Every diner-specific assertion runs on that copy; the live diner goes only through the every-pack checks. The loops read `BB_PACKS=<id,...>` so an agent can test its own pack alone."

10. MAJOR. §6.6 and §9 audio: per-character voices can't go through NarbeVoiceManager, and the file that would allow it has no owner.
    Problem: `NarbeVoiceManager.speak` always passes getCurrentVoice() and ignores any voice option (shared/voice-manager.js:132). The audio agent would have to either:
    - edit that hub file, which every game loads and no agent owns; or
    - call NarbePlatform.speech.speak directly, bypassing the single active ticket, the 10 s finish cap and Wait for Speech that ACCESSIBILITY.md §4-5 rely on.
    Separately, "Guy" and "Aria" are Edge online voices. The hub's Electron has about six OneCore voices (David, Zira, Mark, Hazel, George, Susan) for about thirty speakers, so the fallback pick plus pitch and rate will do most of the work.
    Add: "Before phase 1 the coordinator adds an opt-in to shared/voice-manager.js speak(): `voice: options.voice || getCurrentVoice()`. No current caller passes a voice, so every other game is unchanged. audio gets the voice from `voiceFor(person)`: the first device voice whose name contains a `tts.voices` fragment, otherwise a stable hash pick among English voices other than the scan voice. The choice is cached and re-made after waitForVoices() and when the voice list changes."

11. MAJOR. §5, §6.4-6.6 and §9: pack fields the page reads have no name, format or owner, while page and content run in parallel.
    Problem: none of these has a field name:
    - the theme (its token names live in css/bb.css, which is page's);
    - help text (game.js:532-537 is burger text);
    - per-station cooking sounds (audio names them in phase 1, content must refer to them, page plays them);
    - the step wording words.js hard-codes: "How done?", "Take It Off", "Empty cup", and "Drink" in pick mistakes (words.js:184, 220-221, 243, 276). core-a's list in §9 doesn't mention this wording.
    core-b's "schema for everything" can't know the fields that world, audio and page define in parallel, and a strict schema would reject them. The schema also still doesn't check that station ids match `\w+`, which the redo ids need (line.js:280).
    Add:
    - "Themes live in css/bb.css as `body[data-pack=<id>]` token overrides, written by page from §5. Packs have no theme field.
    - `pack.help` is one plain-text paragraph; content writes it and page speaks it.
    - core-a adds wording fields, with today's words as defaults: `stageSets.<x>.ask` ('How smooth?'), `stageSets.<x>.stop` ('Stop the Blender'), `slots.<x>.say`.
    - audio publishes each pack's sound names by cooking kind. A station lists `sounds:{ add?, cook?, stage?, done?, auto? }`; SafeAudio ids are `bb-<pack>-<name>`.
    - Schema checks core fields strictly, including ids against /^\w+$/. It ignores `look` beyond `shape`, and the `sounds`, `help` and `world` fields; food.test.cjs and dom-play check those."

12. MAJOR. §5 and §6.5 (content, world, food-<pack>, page, build_art): the station ↔ backdrop ↔ 3D set ↔ surface line link is undefined, and "cooking stations 65%" is wrong for two restaurants.
    Problem:
    - §5 names steps with no backdrop of their own (pizza cut, burrito wrap, the ice-cream shake machine) or under a different name (smoothie 'bar' vs backdrop 'prep', burrito 'line' vs 'prep').
    - stage.js reads `pack.backdrops[scene]` and never reads `stations[sid].backdrop`.
    - The backdrops already made set the surface line per picture, not per role: art-source cafe-donuts (where the donut fryer is) and icecream-scoop (the cooking step) are at 62%, not 65%.
    - The unprefixed diner sources (counter.png, grill.png, board.png) don't fit cast's `<pack>-<name>` routing.
    - Smoothie and the ice-cream shakes share "the blender" but have separate food agents running in parallel.
    - No phase-2 agent owns js/food/diner.js for any new looks content-diner adds.
    Add:
    - "Each station names `backdrop:` one of §5's names; several stations may share one, and `pack.backdrops` goes. The 3D set is keyed by that name.
    - Surface lines: 65% for diner grill and fryer, pizza oven, smoothie blender, cafe coffee, burrito griddle; 60% for sushi roll; 62% for diner board and drinks, pizza prep, smoothie prep, cafe donuts, sushi prep, burrito prep, icecream scoop and toppings; 78% for every counter.
    - Pizza cut and burrito wrap run on 'prep'. Shakes run on 'scoop' unless a 'shake' backdrop is added to §5 and the art queue.
    - The unprefixed counter, grill and board sources are the diner's.
    - js/food/kit.js also holds the builders several packs share: blender jar, pour/fill, scatter, squeeze bottle, heap.
    - content-diner uses only the looks js/food/diner.js lists in docs/api/world.md, or files a Request."

13. MAJOR. §3 ("a character without art never comes in") and §9 (core-b, page): this rule can't be implemented once every character has an art name.
    Problem: castOf lets in anyone with a truthy `art` field (shift.js:21), and js/core can't see the art manifests. With every folder named in packs/cast/cast.js, characters whose pictures aren't built yet (most of the roughly 30 new ones while the art pipeline runs) come in invisible. That includes tutorial customers, visitors and event orderers. If nobody qualifies at all, S.create loops forever (shift.js:40-44: an empty round never fills the queue).
    Add: "`S.create(pack, { drawn:[ids] })`: only drawn ids come in (queue, visitors, events, tutorial). The page builds `drawn` from BBArt.cast: the folder exists and has every pose in poses.customer. Node tests pass every id. A tutorial customer or event orderer who isn't drawn is replaced by the first drawn regular. If nobody is drawn, S.create returns a finished shift instead of hanging."

14. MINOR. §7, §6.3, §6.4, §6.6 and §3: the court save shape and the court globals.
    Problem:
    - (a) `stars` is stored even though §4.1 derives it, and `gold` and `eventDone` record the same fact.
    - (b) §6.3 plays the gold-sign and celebration moments on returning to the court, but only the Grand Opening has a "seen" flag. Exiting from the results card loses those moments, or `celebrated`, if set when earned, suppresses the celebration.
    - (c) `tutorialDone` must also be set by Skip, or the first-visit tutorial runs again.
    - (d) Settings v3 "keeps everything else", which includes `graphics`. That is a rule violation: GRAPHICS-QUALITY.md says "Store quality only through this manager", with row id `graphics-quality`. The in-game row still never reaches the renderer, so §6.5's "Low thins details" can't follow it.
    - (e) js/core/court.js and js/court.js would both become `BB.court`. packs/court/court.js has no named global, yet audio reads `BBCourt.recordedVoices`, which isn't in court-rules' scope.
    Add: "A bb-court restaurant is `{ popularity, stars (only ever raised), opened, grandOpeningSeen, gold, goldSeen, tutorialDone (set on finish or Skip), shifts }`; `data: { restaurants, celebrated, celebrationSeen }`; `eventDone` is dropped. Settings v3 also drops `graphics` after calling NarbeGraphics setChoice(old) once. The row is `graphics-quality`, through the handle world exports as `BB.world.graphics`. Globals: the rules are `BB.courtRules` (js/core/court.js), the screen is `BB.court` (js/court.js), and the data is `BBCourt = { version, recordedVoices:false, restaurants:[...], unlocks:[...], layout:{} }`."

15. MINOR. §2, §4.2, §4.3 and §5: ladder, event and joke details the engine, or the customer rules, can't take as written.
    Problem:
    - (a) "Starter recipes" and `recipe.level` don't say what happens to `unlock` (coin prices) and `milestone`. Schema's starter check is `!R.unlock` (schema.js:74), and game.js passes milestone 2. Until content-diner adds levels, the diner would offer fries, drinks and the Tower at level 1.
    - (b) Event orders need a drawn cast member at the counter: "Coach Bev's team", "a wedding party", "the office building" and "the Little League team" aren't characters. They must also keep one customer at a time and fit review paging and the ticket wheel. The spec should say that "Chef Hiro's approval gives the gold sign" means the same average rule.
    - (c) Some briefs ask for things the line can't make: the Tower with "five patties" (grill max is 3 and world.js has three grill slots; the existing `tower` recipe is a 3-patty menu item), Pam "ordering for twelve", Gus's "dozen donuts", Rita's "one of everything", seven extra shots, a ten-scoop tower.
    - (d) The level-4 row says "one special visitor per shift", but §4.3 says "at most one".
    Add: "`recipe.level` (default 1) is the only recipe gate. `unlock` and `milestone` are ignored, and content removes them. core-b's docs give the default levels as numbers. Each entry in `events.<id>.orders[]` names a cast customer (e.g. Bev for her team, Hiro for the boat) and has at most six items, covered by the paging tests. The gold sign follows the same average rule everywhere. Anything beyond the line's limits is an `odd.<id>` spoken joke with a normal-sized ticket for that level. Every level-4 or level-5 shift has exactly one visitor, never first, when one is drawn."