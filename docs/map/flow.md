<!-- Engine map, 2026-11-08: Page flow (game, save, audio). Written by a read-only mapping agent. -->

# Page-flow map: the Burger Bar engine, for Ben's Food Court

All paths are relative to `C:/Users/ass/OneDrive/BEN'S SOFTWARE/Documents/Python Projects/Benny's PC Hub/bennyshub/apps/games/BENSFOODCOURT/`. Hub modules are in `C:/Users/ass/OneDrive/BEN'S SOFTWARE/Documents/Python Projects/Benny's PC Hub/bennyshub/shared/`. This map comes from reading the code. Nothing was run or edited.

## 1. Load order and how the pack is referenced

`index.html` loads its scripts in this order:
1. Hub modules (L40-50): safe-audio, platform, graphics-quality, choice-scan, voice-manager, scan-manager, choice-scan-adapter and the rest.
2. three.js (L52).
3. `js/core/{rng,orders,line,judge,words,script,shift,progress,savefmt}.js` (L54-62). `schema.js` is not loaded.
4. The diner pack (L64-67).
5. `js/{save,audio,world,stage,ui,game,main}.js` (L69-75).

| Global | Set at | Shape | Read by |
|---|---|---|---|
| `BBPacks.diner` | packs/diner/pack.js:25 | `{id:'diner', version:2, name, stageSets, stageNames, cookSpeeds, ingredients, stations, picks, recipes, orderStyles, gross, grossRate, grossMax, manager:{id,name,art,tts}, poses:{customer,manager}, regulars[], tutorial, backdrops}` | save.js:10, audio.js:12, game.js:11, stage.js:12, world.js:15 |
| `BBScripts.diner` | packs/diner/script.js:16 | `{lines:[{id, who, moment, text, each?, delivery?}]}` (145 lines) | game.js:11 |
| `BBArt.diner` | packs/diner/art/manifest.js | `{cast:{folder:[pose]}, backdrops[], props[], castSize, backdropSize}` | stage.js:15 (looked up on each use) |
| `BBVoice.diner` | packs/diner/voice/manifest.js | `{"<speaker>/<clip>": {file, hash, heard, flag, seed}}` (510 clips) | audio.js:14 (looked up on each use) |

Every module that reads the pack stores it in a `const` when its script loads. The `'diner'` key and the `packs/diner/...` paths are typed into the code, so the page can only ever run one pack.

## 2. Boot (main.js:4-13)

`boot()` runs these steps in order:
1. `BB.audio.init()` preloads the sound effects.
2. `BB.stage.init()`.
3. `BB.ui.init()` sets up the scanner and keys, then `applyLook`.
4. `await BB.world.init()`.
5. `await BB.stage.setScene('counter')`, then `BB.world.showCounter([])`.
6. Hides `#loading`.
7. `BB.ui.openCard('title')`.

## 3. Screens and states

State in game.js (L18-27):
- `s`: the shift.
- `busy`.
- `screen`: `'none'|'arrive'|'line'|'review'|'receipt'`.
- `paused`, `blurred`.
- `used`: clip ids said this shift, plus `tutorial:<moment>` markers.
- `spotted`, `joked`, `lastReview`, `lastResult`, `clock`.

In ui.js, `ctx` is `'none'|'card'|'line'` (ui.js:28). Each card is built by `SCREENS[name](opts)` (ui.js:314-399).

| State | Entered by | Scan ids | Exits |
|---|---|---|---|
| title card | boot, `quit()`, Back | `continue` (only when `savedShift()`), `start`, `tutorial`, `settings`, `exit` (ui.js:315-328) | `continueShift()`, `startShift()`, `startTutorial()` |
| tutorialOffer card | `startShift()` when `!progress.tutorialOffered` (game.js:75-78) | `tutorial`, `skip` (ui.js:329-336) | `startTutorial()`, `startShift(true)` |
| settings card | `openSettings(from)` (ui.js:277) | tts, voice, cooking, speed, shiftLength, orders, manager, characterVoices, theme, motion, textSize, graphics, autoScan, scanSpeed, sfx, music, reset, back (ui.js:337-369) | title or pause, with `restoreId` |
| arrive (playout) | `nextCustomer()` | nothing (scan suspended) | `step(true)` |
| line | `step()`, then `present()`, then `BB.ui.line(root, fresh, prompt)` | `add`/`skip`/`swap`, `cook:<stage>`, `takeOff`, `pick:<v>`, `more`, then `ticket`, `pause`. Root key `line:<cust>:<n>:<item>:<station>` (game.js:223) | `onChoice` |
| review | `review(q, forceFresh)` (L375-403) | `serve` on `#register`, redo slips (rows via `rowEntries`, L405-415), `ticket` slip, `pause` | serve or redo |
| receipt | `serveNow()`, then `receiptChoices(fresh)` (L464-479) | `next` on `#bell`, `again`, `pause` | `nextCustomer()`, `hearAgain()` (L480-490) |
| results card | `finish()` (L509) | `again`, `menu`, `exit` (ui.js:388-398) | `startShift(true)`, `quit()` |
| pause card | the Pause item, or holding Enter 5 s in the line context (ui.js:229-240) | `continue`, `help`, `restart`, `settings`, `menu`, `exit` (ui.js:370-380) | `resume()`, `startShift(true)`, `quit()`, `exitGame()` |
| confirm card | `confirm()` (ui.js:276) | `cancel`, `yes` | back to the previous card, or runs the action |

## 4. Shift lifecycle (game.js)

- **`startShift(skipOffer)`** (L73-82): the first time, it opens the tutorial offer. Otherwise it runs `BB.save.shift.clear()` then `begin(S.create(pack, {seed: Date.now()%1000000007+1, settings: settings(), milestone: MILESTONE}), false)`.
- **`settings()`** (L38-41) copies `{cooking, speed, orders, shiftLength}` into the shift when it is created.
- **`startTutorial()`** (L83-87): `S.create(pack, {seed:1, tutorial:true, settings:{…, cooking:'simple'}})`. The queue is `[pack.tutorial.customer]` (shift.js:37).
- **`continueShift()` / `savedShift()`** (L88-92): load `bb-shift:diner`, then `begin(saved, true)`.
- **`begin(shift, resumed)`** (L94-108):
  - Resets `used`, `spotted` and `paused`; sets `BB.ui.context = 'none'`; goes to the counter scene.
  - On a new shift, Mitch says `tutorial.intro`, or `shift.start` if jokes are on.
  - Then one of three: `step(true)` if an order is mid-line, `serveNow()` if it was rung up but not yet served, or `nextCustomer()`.
- **`nextCustomer()`** (L125-165):
  - Calls `finish()` if the shift is done; otherwise `S.next`, `save()`, the `arrive` pose and the greeting.
  - The order is one of: `order.usual`; the full order from parts; or the full order plus an `order.dislike` line. A twin order adds `order.twin`.
  - Changes scene to the first station, puts the ticket up with a spin, `narrate('Ticket. '+W.ticket())`, adds `tutorial.ticket` in the tutorial, then `step(true)`.
- **`step(forceFresh)`** (L169-188): `S.question`, then either the review or `setScene(q.station)` + `showStation` + the tutorial phase line + `spotGross`. Then starts or stops the Timed clock and calls `present`.
- **`onChoice(ref)`** (L285-307): ignored while `busy`.
  - `pause`, `ticket`, `next` and `again` are handled directly.
  - Otherwise it calls `S.answer`, which returns one of: `{refused}`; `{warn}` (the tutorial, handled by `warn()` at L271-282); or `{events}`.
  - With events it runs `playout(events)` (L310-337), then `save()`, then `serveNow()` or `step(false)`.
- **Timed clock** (L340-358): every 250 ms it calls `S.tick(pack,s,dt)` unless `paused||blurred||busy||document.hidden||ctx!=='line'`.
  - A `stage` event calls `world.grillStage`, updates the gauge, plays `tick` and announces the stage.
  - A `nearly` event calls `nearly(e)`.
- **`serveNow()`** (L418-456): `kaching`, `world.serveOut()`, `S.serve`, `save()`, the reaction pose and lines, Mitch, `BB.stage.receipt(r)`, then `receiptChoices(true)`.
- **`finish()`** (L493-510):
  - Real shift: `S.results`, then progress `coins += res.coins; shifts += 1`. Tutorial: sets `tutorialDone`.
  - Then `shift.clear()`, Mitch says `shift.end`, `s = null`, and the results card opens.
- **`quit()`** (L109-118): stops the clock and speech, `save()`, opens the title card.
- **`pause()`** (L513-518): sets `paused`, calls `BB.audio.stop()`, opens the pause card.
- **`resume()`** (L519-526): from the receipt, `receiptChoices(true)`; from an arrival, `nextCustomerResume()`; otherwise `step(true)`.

**Exported** (L539-546): `BB.game = {startShift, startTutorial, continueShift, savedShift, quit, resume, pause, help, onChoice, inShift, blur, focus, shift, busy, screen}`.

**Data shapes**
- **Shift** (shift.js:30-36): `{v, pack, packVersion, rng, seed, settings, tutorial, recipes, length, n, queue[], grossPlan[], results[], coins, order, done, last?:{order,score}}`.
- **Order** (line.js:78-88): `{ticket:{customer:{id,name,tipScale?,threeStarScale?,favourite?}, items:[spec]}, items:[{spec,answers,gross,swaps}], at:{item,st,step}, phase, pending, tutorial, redo, timer, fresh}`.
- **Question** (line.js:154-183): `{kind, item, station, step, key, fresh, options:[{id,value?,row?}], ing?, max?, have?, offer?, gross?, count?, timed?, stage?, of?}`.
- **Serve result** (shift.js:105-116): `{customer, name, recipes, stars, count, tip, favourite, grossServed, swaps, mistakes[]}`.
- **Results** (shift.js:119-125): `{orders, coins, stars[], threeStars, best}`.

## 5. How the characters speak

- **`lineFor(who, moment, vars)`** (L46-48) calls `SC.pick(pack, script, who, moment, vars, used, rnd, isManager(who) ? null : 'customer')` and returns `{line, text, clip}`.
  - A speaker with fewer than two lines of their own for a moment also gets the shared `customer` lines (script.js:51-56).
  - No clip repeats until that moment runs out (script.js:83-84).
  - Clip ids look like `<speaker>/[<kind>.]<lineId>[.<value>]` (script.js:61-64).
- **`speakAs(who, text, clip, pose, parts)`** (L50-58) sets the pose (Mitch defaults to `talk`), shows the bubble, `await BB.audio.say({who, text, clip, parts})`, then clears the bubble.
- **`talk(who, moment, vars, pose)`** (L59-63) is `lineFor` plus `speakAs`.
- **Orders** (L144-151): the text is `W.said()`; the parts are `W.orderParts()`, with clips named `<cust>/order.<partId>`. Part ids include `recipe.x`, `done.x`, `no.x`, `add.x` and `and` (words.js:114-145).
- **`narrate(text)`** (L65-70) is the game's own voice. It calls `NarbeVoiceManager.speak(text)` and gives up after 12 s.
- **`BB.audio.say(line)`** (audio.js:70-92) first calls `stop()`, then follows the Character Voices setting:
  - `off`: returns at once, so there is no voice and no caption.
  - `captions`: the bubble stays for `max(1300, len*62)` ms.
  - `voices`: plays the recording if `SC.recording(manifest, clip, text)` matches. That check compares the hash of the tagged words (script.js:92-95). An order plays from recordings only when every part is recorded (L82-85). Clips play from `packs/diner/voice/`, with a 15 s guard and text-to-speech if one fails.
- **`tts()`** (audio.js:41-49) calls `v.speak(words, {pitch: P.tts.pitch||1, rate: clamp(0.5..2, playerRate*P.tts.rate)})`. The pitch replaces the player's pitch; the rate is multiplied by the player's rate. If the hub's text to speech is off, the line stays silent for its reading time.
- **Limits of `NarbeVoiceManager.speak`** (voice-manager.js:97-138):
  - It cancels any current speech first (L98).
  - It always uses `getCurrentVoice()` (L130-133). So every character speaks in the player's scan voice, with only pitch and rate changed.
  - `NarbePlatform.speech.speak` copies its options onto the utterance (platform.js:267), so a `voice` object would pass straight through if it were forwarded.
  - `getVoices()` returns `[]` until the hub's voice preference has loaded (platform.js:290-295).
  - The hub can register six Windows voices (David, Zira, Mark, Hazel, George, Susan; register_onecore_voices.py:7-13).
- The cast lookup is written twice: game.js:30 and audio.js:27.

## 6. Mitch's rules, as coded

- **Gate** (`managerSays(kind)`, L33-37): always true in the tutorial. Otherwise the setting `off` silences him, and jokes need `hintsJokes`.
- **Jokes**:
  - `shift.start` (L102) and `shift.end` (L506).
  - At most one per customer (`joked`): `after.gross`, `after.1`, or `after.3` on half of 3-star serves; never after 2 stars (L446-449).
- **Hints**:
  - `spotGross` (L256-263): once per step and event for each customer. It plays before the step's prompt, because `step()` awaits it before `present()`.
  - `nearly` (L363-372): spoken only if that exact line is recorded. Otherwise it is a 3.5 s caption with the worried pose, so it never cuts off scan speech.
- **Tutorial lines** (not gated): `tutorial.intro`, `.ticket`, `.grill`/`.board`/`.cook` once each (L264-269), `.gross`, `.review`, `.serve`, and `tutorial.warn.*` (L274-277).
- **Silence**: every line except `nearly` is said during a playout with the scan suspended. `pause()` stops speech. No line repeats in a shift.

## 7. Saves (save.js, core/savefmt.js)

- **Keys**: `bb-settings` (shared), `bb-progress:diner` and `bb-shift:diner` (savefmt.js:19). They are worked out once, when save.js loads (save.js:17, 28, 37).
- **Record format**: `{v, kind, pack, packVersion, data}` (savefmt.js:53-55). Versions: settings 2, progress 1, shift 1.
- **Reading** (savefmt.js:59-82):
  - A save from a newer version is read as defaults and never written over (save.js:19, `canWrite`).
  - Settings ignore the pack (L67-71).
  - A save from a different pack is rejected.
  - If the pack version changed, the shift is dropped and progress keeps only unlocks that still exist.
- **API** (save.js:39-63): `get`, `set` (with listeners), `all`, `onChange`, `progress()` (the live object), `saveProgress`, `resetProgress` (clears progress and the shift), `shift.load()`, `shift.save(s)` (skips the tutorial), `shift.clear()`.
- **When the shift is saved**: at L130, L303, L427 and L110. `save()` clears it once the shift is done (L42).
- **Progress**:
  - `progress.create` (progress.js:22-23) gives `{v, coins, unlocked, order, decor, decorOwned, best, visitors, regulars, shifts}`.
  - game.js adds `tutorialOffered` (L76, L85) and `tutorialDone` (L500), and only ever updates `coins` and `shifts` (L499).
  - `BB.progress.addShift` is never called.

## 8. Burger and single-pack assumptions

- **index.html**:
  - :6 title "Ben's Burger Bar"; :24-25 "Ring It Up" and "Next Customer".
  - :37 "Warming up the grill…".
  - :64-67 the four diner scripts; :9 a single stylesheet.
- **main.js**: :9-12 starts at the counter scene and the Burger Bar title card.
- **save.js**: :10 `BBPacks.diner`; :17/28/37 keys fixed at load; :50 reset clears the diner only.
- **audio.js**:
  - :12 the pack; :14 `BBVoice.diner`; :27 the cast lookup; :57 `packs/diner/voice/`.
  - :13 the sound list, including burger sounds (sizzle, flip, squirt).
  - :20 `packs/diner/sound/`, with global SafeAudio ids `bb-<name>` that two packs would share.
- **game.js**:
  - **Pack, recipes, poses**: :11 pack and script; :13 `MILESTONE = 2`; :14 poses; :30 the cast.
  - **Station views**: :193-202 a station is drawn as the grill (`showGrill`) only if its cook step names an `ing`, otherwise as the board (`showBoard`). The test pizza's `oven` has no `ing`, so it gets the board view and no Timed gauge (:197).
  - **Cooking**: :322 `dropOnGrill`; :328-330 sizzle/flip, and `dataset.scene==='grill'` gates `cookGrill`, so other cookers get no cooking animation; :352 `grillStage`.
  - **Gross-outs and controls**: :203 the `'fly'` gross-out plays `buzz`; :230 the spatula control.
  - **Tutorial**: :265 `q.station==='grill'` and the moments `tutorial.grill`/`tutorial.board`.
  - **Build and props**: :331 the bun cap; :386-387 and :466-476 the register and bell.
  - **Progress and help**: :499 only coins are banked; :532-537 the help text is about burgers.
  - `'counter'` is a reserved scene (:98, 135, 382; bb.css:31-90).
- **Nearby files**:
  - ui.js:297-298 ("One burger, sometimes two."); :318-323 the logo, "Ben's Burger Bar", the burger icon; :377/:395 "Main Menu".
  - stage.js:22/24/49 `packs/diner/art/…`; :77 Mitch's art is `pack.manager.art`, so one uniform.
  - tests/dom-play.cjs:87, 94-95, 153-162, 184-185 and tools/review-frames.cjs:49 drive the title flow with `'diner'`.

## 9. Bugs found while mapping (from reading the code, not run)

1. **Pause during a playout doesn't hold.**
   - Holding Enter opens Pause whenever `ctx==='line'` (ui.js:229), and `ctx` stays `'line'` during playouts, because `suspend()` (ui.js:128-131) only clears the scan.
   - `pause()` has no `busy` check. `BB.audio.stop()` ends the awaited `say()` early, so the playout carries on talking under the Pause card.
   - The playout's next `BB.ui.line()` then calls `closeCard()` (ui.js:107), which removes the Pause card while `paused` stays true. In Timed mode the clock stays frozen (game.js:347).
   - After the Food Court's "Back to Food Court" sets `s = null`, the same playout would read the null shift (game.js:156, 161).
2. **Finishing the tutorial deletes a saved real shift.** `finish()` clears the saved shift unconditionally (L502), and the tutorial is never saved.
3. **Shift Length mid-shift says "From the next order."** (ui.js:342/350), but the length is fixed when the shift is created (shift.js:34). It takes effect on the next shift.
4. **New Shift and Restart Shift throw away a saved shift's coins** (L80). Restart during the tutorial starts a real shift (ui.js:375).
5. **Smaller gaps**:
   - The Music setting plays nothing.
   - `customer()` at L32 is never used.
   - Best orders and the visitors' book are never recorded, though the Reset Progress text names "best orders" (ui.js:365).

## 10. To support the Food Court

**Loading packs**
- **`packs/court.js`**: `BBCourt = {version, recordedVoices:false, restaurants:[{id, name, side:'left'|'bottom'|'right', open, theme}], unlockOrder[], unlocks:[{open:4, need:3}, …]}`.
- **`packs/cast/{cast.js, script.js, art/manifest.js, voice/manifest.js}`** holds the shared Mitch and regulars:
  - `BBCast.people[id] = {name, art, tts}`.
  - Each pack's `regulars` entries hold only that menu's `likes`, `usual`, `dislikes` and `favourite`, merged over the shared entry.
  - Mitch's art resolves to `packs/<id>/art/cast/mitch/` (his uniform) first.
- **`js/packs.js`**: `BB.packs.use(id) → Promise<{pack, script, art, voice}>`.
  - It adds `<script>` tags for the four pack files, which works from file:// and in Electron.
  - It runs `BB.schema.validate`, so add `js/core/schema.js` to index.html.
  - It merges the cast and joins the shared and pack scripts (`where:[packId]` can filter lines).
  - It provides one `person(id)` and `cast()` for game.js, audio.js and shift.js.
- **Rebinding**: each module gets a `use(pack)` in place of its fixed `const`: `BB.save.use`, `BB.audio.use`, `BB.stage.use`, `BB.world.use`. A quicker stopgap is one page per restaurant (`index.html?r=pizza`, with a loader that writes the pack tags before save.js), but every restaurant visit would then reload the page.

**game.js**
- **`open(packId, {tutorial})`**: `await BB.packs.use()`, then set `pack`, `script`, `POSE` and `MPOSE` again.
  - First visit (`!progress.tutorialDone`): run the tutorial, with Skip available.
  - Otherwise a saved shift goes to `begin(saved, true)`, straight to the counter.
  - Otherwise `startShift(true)`.
- **`startShift`**: replace `milestone: MILESTONE` with `level: BB.court.stars(pack.id)`, so shift.js applies the star ladder.
- **`leave()`** (Back to Food Court):
  - Bank `s.coins - (s.banked||0)` into progress and set `s.banked`.
  - Save the shift, then `BB.court.open({from})`.
  - `finish()` then adds only the coins not yet banked.
- **`finish()`**:
  - Clear the saved shift only when `!s.tutorial`.
  - Call `BB.court.addShift(pack.id, res)`, which returns `{starsBefore, starsAfter, popularity, opened}`. Stars never go down.
  - This is also where the five-star and gold-sign moments go.
- **Station views and sounds**:
  - Add `pack.stations[sid].view: 'heat'|'build'`. `showStation` and `playout` should switch on it instead of the `'grill'` checks.
  - Sounds come from `station.sounds` and `gross[].sound`.
  - The tutorial moment becomes `station.tutorial || 'tutorial.'+sid`.
- **Help**: `help()` returns `pack.help`.
- **Playout token**:
  - Keep a counter `run`. `pause()`, `leave()` and `begin()` increase it.
  - Every async scene returns as soon as `run` has changed after an `await`.
  - This fixes bug 1.
- **Pause menu**: add Ticket (the existing `ref.kind==='ticket'` path) and Back to Food Court; keep Help.
- **Event hooks**: special visitors arrive in `nextCustomer`, and event shifts come from `S.create(…, {event})`.

**save.js and savefmt.js**
- **Per-pack keys**: `use(pack)` recomputes `PKEY` and `HKEY` and reloads progress.
- **Settings**: keep `bb-settings` as the single court-wide settings record; it already ignores the pack.
- **Volumes**: add `sfxVolume` and `musicVolume` through `MIGRATIONS.settings[2]`.
- **Court record**:
  - `VERSIONS.court = 1` and `key('court') = 'bb-court'`, read and written through `BB.save.court.get()/save()`.
  - It holds `{stars:{id:0-5}, popularity:{id:n}, open[], announced[], gold[], celebrated}`.
- **Reset**: `resetProgress()` walks `BBCourt.restaurants` and clears the court record too.
- **Optional**: call `BB.progress.addShift` from `finish()` so best orders and visitors are recorded.

**audio.js**
- **`use(pack)`**:
  - The manifest list becomes `[{data: BBVoice[id], base: 'packs/'+id+'/voice/'}, {data: BBVoice.cast, base: 'packs/cast/voice/'}]`.
  - Sound ids become `bb-<id>-<name>` from `pack.sounds`; common sounds stay shared.
- **A different voice per character**:
  - Add `tts: {voices:['Mark','David'], pitch, rate}` per person, with the preferred voice names first.
  - **Choosing**: `voiceFor(P)` takes the first English voice whose name matches. Otherwise it takes `list[SC.hash(P.id) % list.length]`, leaving out the player's scan voice.
  - **Updating**: cache the choice, refresh it on voice-list or settings changes, and wait for `waitForVoices()`.
  - **Speaking**, either way:
    - Change shared/voice-manager.js:132 to honour `options.voice`. No current caller passes it, but it is a shared hub file.
    - Or keep it in the game: call `NarbeVoiceManager.cancel()`, then `NarbePlatform.speech.speak(words, {voice, pitch, rate, volume})` with a timeout from `getSpeechTimeout()`.
  - **Spread**: with roughly six installed voices and about 25 characters, voice, pitch and rate together have to tell characters apart. Mitch and the regulars keep one assignment across every restaurant because it lives in the shared cast.
- **Recorded voices off until the final pass**:
  - Add `const RECORDED = BBCourt.recordedVoices === true || /[?&]voices=recorded/.test(location.search)`, and have `manifest()` return `{}` when it is off.
  - Every line then uses text to speech, and Mitch's `nearly` stays a caption.
  - The clips stay on disk, and the final pass flips one flag. Removing index.html:67 also works, but it is cruder.

**index.html and main.js**
- **Page**: title "Ben's Food Court" and a non-burger loading line.
- **Scripts**: replace L64-67 with `packs/court.js`, `packs/cast/*`, `js/core/schema.js`, `js/packs.js` and `js/court.js`.
- **Court screen**: add a `#court` layer with storefronts as real objects.
- **Restaurant colours**: add `body data-pack` for each restaurant's colours. The colours in bb.css:3-15 are already CSS variables, and `data-theme` is taken by the Colour Profile setting.
- **main.js**: boot into `BB.court.open()` (Play, Tutorial, Settings, Exit) instead of `openCard('title')`. Tutorial replay picks a restaurant, then calls `BB.game.open(id, {tutorial:true})`.

**Nearby files**
- **ui.js**: the title card becomes the court menu; the results card gets "Back to Food Court"; the Orders setting's descriptions come from each pack.
- **Tests**: update tests/dom-play.cjs and tools/review-frames.cjs to enter through the court.
