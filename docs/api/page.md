# The page: the main menu, the court, a restaurant's shifts, the counter (page-1 and page-2, phase 2a, 2026-11-09)

What `index.html` and `js/{packs,save,stage,ui,court,game,main}.js` do, the hooks the rest of the build calls, how a
new restaurant is wired in, and the jsdom driver and review frames. Spec: FOODCOURT-BUILD.md 4.2, 5.2, 5.5, 6. The
court and the main menu over it are section 6 (page-2).

## 1. Modules, in load order (index.html)

| File | Global | What |
|---|---|---|
| hub `shared/*` | `NarbeScanManager`, `NarbeChoiceScanAdapter`, `NarbeVoiceManager`, `NarbeGraphics` ... | the hub's scanner, voice, input guard, graphics quality (never edited) |
| `js/vendor/three.min.js`, `<!-- world -->` | `THREE`, `BB.food` | the kit and each restaurant's food module |
| `js/core/*`, `<!-- core -->` | `BB.line words orders judge cast schema script shift progress savefmt courtRules` | the rules (pure; the Node tests run the same files) |
| `packs/court/{court,script}.js` | `BBCourt`, `BBScripts.court` | the court as data, its lines |
| `packs/<id>/{pack,script}.js`, `art/manifest.js` (`voice/manifest.js` from the voice pass) | `BBPacks.<id>`, `BBScripts.<id>`, `BBArt.<id>` (`BBVoice.<id>`) | each restaurant |
| `<!-- audio -->`, `<!-- cast -->` | `BBSounds`, `BBCast`, `BBArt.{cast,shared,court,<pack>}` | sounds, the cast, the art manifests |
| `packs/cast/script.js` | `BBScripts.cast` | lines that work anywhere |
| `js/save.js` | `BB.save` | `bb-settings` v3, `bb-court`, `bb-progress:<pack>`, `bb-shift:<pack>` (spec 7) |
| `js/audio.js`, `js/world.js` | `BB.audio`, `BB.world` | voices and sounds; the 3D frame |
| `js/stage.js` | `BB.stage` | the 2D stage: backdrop, customer, Mitch, props, wheel, controls, gauge, bubble, receipt, HUD; the counter's layout |
| `js/packs.js` | `BB.packs` | the restaurants on the page, merged |
| `js/ui.js` | `BB.ui` | switch input, the scan, the menu boards |
| `js/court.js` | `BB.court` | the court on its picture, and the main menu over it out of focus (section 6) |
| `js/game.js` | `BB.game` | a restaurant's shifts |
| `js/main.js` | | boot: sounds, stage, input, 3D, the graphics hand-off, then `BB.court.menu()` |

Keep the phase-1 blocks (`<!-- world -->`, `<!-- core -->`, `<!-- audio -->`, `<!-- cast -->`) and their order.

## 2. Wiring in a new restaurant (the exact lines)

In the world block, after `js/food/diner.js` and the restaurants already there (the pizza's is
`<script src="js/food/pizza.js"></script>`, integrate 2026-11-09):

```html
<script src="js/food/<id>.js"></script>
```

In the restaurants block, after the pizza's two lines (the art manifests of the six new restaurants are already in
the cast block, so do not add those again):

```html
<script src="packs/<id>/pack.js"></script>
<script src="packs/<id>/script.js"></script>
```

**No voice manifest line yet** (integrate, 2026-11-09). A `<script>` whose file is not there is a console error in a
browser (a failed load, whatever its `onerror` does), and recorded voices are off until the voice pass
(`BBCourt.recordedVoices`). No restaurant has recordings: the diner's old takes and its
`packs/diner/voice/manifest.js` line went on 2026-11-10 (moved to
`archives/games/2026-11-10/BENSFOODCOURT-removed/packs/diner/voice`), so every line is text to speech. The voice pass adds
`<script src="packs/<id>/voice/manifest.js"></script>` together with the file. `tests/dom-play.cjs "the page boots"`
fails on a line whose file is missing, and on a pack, script or food module on disk that the page does not load.

Nothing else: `BB.packs` finds `BBPacks.<id>`, the court lists it (`BBCourt.restaurants`), and stage, world and
audio follow the active pack. A restaurant BBCourt lists whose `pack.js` is not loaded is "not built yet" (a
development state): the court draws it greyed out and never scans it. The whole recipe for a new restaurant, with
the pizza as the worked example, is `docs/api/pilot.md`.

## 3. `BB.packs` (js/packs.js)

`get(id)` -> `{ id, raw, pack, script, art, problems }`, built once: `pack = BB.cast.merge(BBCast, BBPacks[id])`,
`script = BB.script.merge(pack, BBScripts[id], BBScripts.cast)`, `art = BBArt[id]`, `problems = BB.schema.validate(pack)`
(warned once; the page still runs). The rest of the page only ever reads merged packs. Also `ids()`, `has(id)`,
`use(id|null)` (the restaurant the player is in), `active`, `activeId`, `drawn()` (`BBCast.drawn(BBArt.cast)`: who
may come in, spec 4.5) and `built()` (BBCourt's restaurants whose pack is loaded, in scan order).

## 4. `BB.game` (js/game.js)

| Call | Does |
|---|---|
| `enter(id, { tutorial?, again? })` | into a restaurant: `BB.packs.use`, `stage.usePack` (theme under `body[data-pack=<id>]`), `world.usePack`, `audio.use`; then the first-visit card `tutorialOffer` (unless `again`), a saved `bb-shift:<id>` resumed (the ticket read again), a finished-but-uncounted one counted, the `event` card when `BB.courtRules.eventDue`, else `S.create(pack, { level: R.level(...), drawn, settings })` |
| `offer('tutorial'\|'skip'\|'court')` | the first-visit card: Play and Skip set `tutorialDone` |
| `startShift({ event? })`, `startTutorial()`, `restart()`, `again()` | a new shift (the event when asked and due); the tutorial (never saved); Restart Shift (the only discard; restarts a tutorial as a tutorial); Another Shift |
| `leaveToCourt()`, `quit()`, `exitGame()` | every route out saves the shift as it is (spec 4.2), lets go of the pack, stage, food and sounds; then the court, the main menu, the hub |
| `pause()`, `resume()` | Pause: the clock stops, speech stops, the card opens. Continue restarts the current screen: an interrupted arrival reads the ticket and starts the line |
| `afterReset()` | after Reset Progress: a shift in hand is dropped, the main menu opens |
| `help()`, `ticketWords()` | Pause's Help (`pack.help`) and Ticket |
| `onChoice(ref)` | a scanned choice on the line, the review or the receipt |
| `inShift()`, `inTutorial()`, `shift()`, `pack()`, `busy`, `screen` (`arrive line review receipt none`), `paused`, `run` | for ui.js and the jsdom checks |

**The run counter** (spec 6.3): `run` goes up in `enter`, `begin` (every shift start), `pause`, `resume` and every
leave (`leaveToCourt`, `quit`, `afterReset`). Each playout takes `token()` at its start and returns as soon as
`stale(t)` after any await, so Pause, leaving or a new shift never has an old scene talking under it. `BB.ui.line()`
never closes a card it did not open: a line that arrives while a card is up is ignored.

**Counting:** a finished shift is claimed once (`S.claim`), then `BB.courtRules.addShift` and `BB.progress.addShift`,
and `bb-shift` is cleared. The results card says `R.shiftWords` (stars gained, a restaurant opened, the gold sign, the
celebration); Mitch says `event.celebrate` / `event.again` / `shift.end` before it opens.

**Moments** (docs/api/script.md): `greet`, `visitor.arrive` before a visitor's greet, `order.odd.<id>` instead of the
order sentence, `order.usual`, `order.dislike`, `order.twin`, a customer's own `order.gag` after the order (locals at
home, and whoever orders the event's finale: Bev's "for the team"), `smalltalk` or once a shift a `mention` (via
`SC.pickMention` with BBCourt's `said`), `react.*`, `complain.*` with the judge's mistake as vars, `goodbye`; Mitch's
`uniform` with the first shift at a restaurant in a session, `shift.start/end`, `event.*` with `{ name }`, every
`tutorial.*` (essential: said in the game's voice when Character Voices is Off), `gross.<id>`, `nearly` (a caption
unless recorded), `after.*`. `smalltalk` and `goodbye` are skipped with Character Voices Off; every line plays while
the scan is suspended.

**The line:** `S.tick(pack, s, dt, BB.ui.heldKeys())` (the clock stands still while a switch is down); pick rows get
`rowItems` (More… and `more:<n>` pages, entered as rows); the gauge and dial read `q.set`; `auto` events and `cooked`
with `auto` play through `BB.world.outcome`, every sound inside `onApply` via `BB.audio.station(station, hook)`
(sauces keep `squirt`); the Timed control is the station's `tool` prop with the stage set's `stop` words (a drawn
button when there is no picture); the wheel's ticket is `W.spelled().bits`.

## 5. `BB.ui` (js/ui.js): input, the scan, the cards

`line(root, fresh, prompt, opts?)` (root `{ key, kind?, items: [{ id, label(), element, ref }], redraw?, onChoice?, onPause?,
direct? }`; `opts.narrate`: a long prompt, Auto Scan waits until it is heard), `suspend()`, `openCard(name, opts)`,
`closeCard()`, `refreshCard()`, `announce(text)`, `narrate(text)` (long words heard in full: the line's Ticket, Help),
`litId()`, `confirm(...)`,
`openSettings()`, `exitGame()`, `heldKeys()`, `pick(id)` (a click or tap on a choice by its id: the court's
storefronts, hit on their outlines by js/court.js), `context`, `card`, `__dbg()` (`{ ctx, card, place, index, id,
depth, backStop, parked, items, active, held, scan }`). A lit element with `data-members` (a part of the court) also
gives `.litMember` to the `.store[data-pack]` of each member. A card may name a `cls` for its board (`titleCard`,
`howtoCard`).

**Cards** (every one opens at -1, returns from Back and Cancel included; only rows restore by id). There is no
tutorial picker and no card of restaurants (spec 6.1, 2026-11-09): the court's storefronts are scanned on its
picture (section 6).

| card | items |
|---|---|
| `title` (the main menu, over the court out of focus; says "Ben's Food Court. Play, How to Play, Settings, or Exit Game.") | `play howto settings exit` |
| `howto` (How to Play: spec 6.1's text as its body, all of it spoken on open) | `back` (to the main menu) |
| `courtPause` (the court's Pause) | `continue help settings menu exit` |
| `tutorialOffer` | `tutorial skip court` |
| `event` | `event shift court` |
| `settings` (spec 6.4, in order) | `tts voice cooking speed shiftLength orders manager characterVoices theme motion textSize graphics-quality autoScan scanSpeed sfx reset back` (`speed` is greyed and unscanned with Simple cooking) |
| `pause` (a restaurant's) | `continue ticket help restart settings court menu exit` |
| `confirm` | `cancel yes` (Cancel first, the consequence spoken on open) |
| `results` | `again court exit` ("Start a Shift" after a tutorial) |

**Keys:** choices act on release. Keydown only starts the Space brake (Auto Scan), the 3 s back-scan and the Pause
ring (from 2 s; Pause at 5 s inside a restaurant, playouts included, and on the court's root once its scan is live;
that release is swallowed). A key held across a screen change keeps counting toward Pause and keeps the Timed clock
frozen; its release is ignored. Blur or the hub's input guard clears every key.

**Auto Scan never stops by itself.** The hub's scanner (`shared/choice-scan.js`) arms each step with a timer and a
due time read from `Date.now()`, and drops a timer that wakes before that due time without arming another; a clock
that lags its timers (a busy machine) then leaves the highlight where it is until a switch is pressed. ui.js's
`keepScanning()` (every 200 ms) gives a scan that should be moving (live, not parked, braked, held, waiting for
speech or suspended, no key down) its clock back after an interval plus 1.5 s without a move, the way a press and
release would.

**Long words on a card are heard in full under Auto Scan** (2b-seams, 2026-11-09; the user: speech is never cut off by
an automatic step). The hub's scan moves after one interval (with Wait for Speech, once the words end, but at most 10 s
later: the voice manager's cap), and the label it speaks next cuts them off. So a card with `narrate: true` (How to
Play, the first-visit offer, the event card, a confirm's consequence, the results) and what Help and Ticket say
(`narrate(text)`) hold the card's automatic scan with the scanner's own input hold (`setInputHeld`, as while a switch is
down; nothing in `shared/` changes) until the words end (past the 10 s cap, until the engine stops speaking, two
minutes at most), then a full interval. A press that acts (Space steps, Enter selects) ends the hold at once and may
cut the words; one that does nothing (the brake's Space or Enter on the blank) leaves them be, so under the hub's
default one-switch settings How to Play is heard to its end before Back comes round (about 40 s with a real voice).
Two switches: nothing moves by itself, nothing is held. Text to Speech off: the scan moves after one interval.
`tests/dom-play.cjs "heard in full"` checks it (Wait for Speech off and on, past the cap, TTS off, a press, Help, the
first-visit card).

## 6. The court and the main menu over it (js/court.js, page-2; spec 6.1, 6.2)

**The layer.** `#court` (in `#stage`, after `#backdrop`) is the court picture's own box, laid out by hand like
`object-fit: contain` (`layoutBox()`: the numbers exist without a layout engine); `#courtCam` inside it carries the
camera (the zoom) and the focus. Everything in it is placed in percent of the picture. At the court `#backdrop` is the
same picture filling the window, blurred and dark: what shows beside (or above and below) the picture. Layers, back
to front: `.pic` (no picture: a plain floor and `.paints`, the storefronts drawn as their outlines in a colour each),
`.greys`, `.crowd.back`, `.board`, `.crowd.front`, `.stores` (every `.store` scan box, then every `.lift`, then every
`.group`), `.parts`, `.fx`, `.say`.

**The picture's drawing aids** (js/court.js, measured from art-source/backdrops/court.png; BBCourt.layout keeps the
boxes, signs, plinth and spots): `OUTLINE` (each storefront's outline: the greyed copy, the lifted highlight, pointer
hits), `OPENING` (each counter opening: the shutter and the banner), `FRAME` (the scan frame's box: the outline's
bounds, the Pizza Parlor's left edge at 23.6% and the Cafe's right at 78.7% so the brackets stay off the Smoothie
Shack's and Sushi's signs), `BOARD` (the board's foot: the middle of `BBCourt.layout.board`, 1.9% below its bottom
edge, so 50, 57 today), `LINEUP` (the celebration's two
rows). A grown-up is `9.3 + 3.3 * y / 100` % of the picture's height tall, feet at y (the picture's perspective,
measured on the stools); a cast canvas has its feet at 95.5% and hips at 56%; seated, only head to hips shows, hips on
the seat spot.

**What is drawn:**
- **Storefronts** at BBCourt.layout's boxes: a name plate on the sign board and a star sign under it ("★★★☆☆ 3",
  plus "Five-star event next", "Shift in progress" (the scan label's words) or "Grand Opening"), all in code at Text
  Size (`--small`; a plate never grows past its board (phase 3, court.js `fitPlates`, `PLATE_FIT`): its words wrap at
  spaces, then step down a pixel at a time, never under 11 px). A closed restaurant, one before its Grand Opening and one whose pack is not loaded
  are greyed (`.grey`: the storefront's outline, desaturated and dimmed; the name stays readable) and never scanned;
  a closed one has its shutter down with a "Coming Soon" note. The Grand Opening banner hangs across the counter
  until the first visit. The gold sign: the plate turns gold under the gold sign's star crest.
- **The progress board** on the plinth: `nextGoal().board`, the sentence in gold chalk, the tallies sharing a line
  when they fit; `width: clamp(28%, 20 x --small, 50%)`, its foot at `BOARD.base`, growing upward.
- **The crowd** (the user, 2026-11-10: "have them stand and wait like they're in line ... show people sitting at chairs
  and eating as you get more popular ... characters you'd be serving in the games"): `BB.courtRules.crowd` says how many
  stand in each storefront's line and sit at its tables (by popularity: 1 at the counter at 0-2, 2 and a diner at 3-4, 3
  at 5-6, 4 from 7; diners from 3, every seat at 10; court-rules.md), and `BB.courtRules.floor` says who, from `pools()`
  (each pack's `regulars` and the cast, drawn customers only): that restaurant's locals, its regulars, and Reginald and
  Kai where its level is 4 or more, EACH CHARACTER AT MOST ONCE on the court (22 customers: with many restaurants open
  the last spots stay empty; the star signs already say how popular each is). Nothing moves: the front of a line stands
  `neutral`, the rest `waiting`, all facing the front of their line; a diner sits head to hips in the `eating` pose
  (`happy` for a character without one) with one of the restaurant's own dishes on the table in front of them
  (`dishFor`: `BBArt.court.food` `<pack>-<name>`, the same dish for that diner every time, fitted into 40% x 30% of a
  grown-up's height at the seat's `fx, fy`, one step in front of the diner). Only storefronts in the scan get anyone
  (a closed one, one before its Grand Opening or one not loaded stays empty). Whose feet are behind the board's foot is
  drawn behind it; whoever would stand over a sign, or in front of the board and over it, is left out (the layout keeps
  that from happening at Normal text; `scene().dropped` lists anyone left out). The highlighted storefront's lifted copy
  goes over everyone (under every sign).
- **Out of focus** (the main menu, `#court.soft`): `filter: blur(var(--blur)) brightness(.74) saturate(.9)` on
  `#courtCam`, `--blur` 1.2% of the picture's height. `body[data-court]` is `soft` or
  `focus` (the card's scrim is lighter over the soft court); `body[data-court-mode]` is court.js's mode (`menu arrive
  moment scan paused zoom away`): the Back in 5 sign shows at `scan`, `paused` and `zoom`.

**The scan** (root key `court`, `kind: 'court'`): `scanStops()` is `BB.courtRules.stops()` without the shops whose
pack is not loaded (a part left with one shop is that shop), then `pause` (the Back in 5 sign, `#back5`, its
`data-id` set to `pause`). Ids `shop:<pack>`, `part:<arm>`, `pause`; labels from `BB.courtRules.label` and the part
labels ("Left. Burritos, Smoothie Shack."). A part is a row (`ref.row`, entered by ui.js `enterRow` with
`{ wrap: true, backStop: true }`): ACCESSIBILITY.md section 4 lands a row on its first item and loops it through a
spoken Back stop, and Back restores the part by identity (the hub rulebook over spec 0.8's "each court part opens at
-1"; the root and every card do open at -1). The highlight: the scan frame round the store's `FRAME` box (or the
part's box round its members) plus the storefront lifted out of the picture with a thick halo round its outline
(`.lift`, made visible by `liftRules()`: CSS made from BBCourt that pairs a lit `.store`, or a `.litMember`, with its
`.lift` and `.group`; Reduced: the halo without the lift). A click or tap on the court is hit-tested by court.js
(`hit(x, y)` in percent: inside an outline first, else inside BBCourt's box; in an overlap the store whose box reaches
lower wins) and goes through `BB.ui.pick('shop:<pack>')`, so it works from any level. Holding Enter 5 s opens the
court Pause once the scan is live (`onPause`).

**The routes** (`BB.court`):

| call | does |
|---|---|
| `menu()` | the main menu: the court out of focus behind the `title` card (boot; Main Menu from the court's Pause, defocusing in 0.6 s; Main Menu from a restaurant: game.js `quit()`; after Reset Progress mid-shift) |
| `play()` | Play: `show({ focus: true })`: the card closes and the court comes into focus (0.6 s; a cut under Reduced) |
| `show({ from? })` | back from a restaurant (game.js `leaveToCourt()`, the results' and the first-visit card's Food Court): zooms out of that storefront (a cut under Reduced); then every `news()` moment, marked `seen` and saved after it plays; then Mitch's `court.return` when `nextGoal().key` changed (kept in `goalKey`: each session starts with one); then the prompt and the scan at -1 |
| `enter(id)` | choose a storefront: zoom in (460 ms; a cut under Reduced), then `BB.game.enter(id)` |
| `pause()` / `resume()` | the `courtPause` card / back to the scan at -1 ("Food court.") |
| `help()` | `BB.courtRules.help` (each open restaurant's stars, then the goal): the court Pause's Help |
| `refresh()` | draw the court again (ui.js after Reset Progress) |
| `hit(x, y)`, `stops()`, `scene()`, `state()`, `layout()` | for the checks and review frames: the store at a point; the scan's stops; everything drawn, in percent of the picture; `{ mode, moment, soft, zoom, goalKey, walkers, people, lineup, scan }`; the box for this window (`scene()` also has `people` with `id`, `pack`, `pose`, the `dishes`, and `dropped`) |

**The prompt** is "Food court." plus each news sentence when Character Voices is Off (nobody announced it) and the
goal's words when it changed and Mitch will not say it (Assistant Manager or Character Voices Off).

**The moments** (court lines from `SC.court(BBScripts.court)` through `SC.pick`, said with `BB.audio.say`, Mitch in his
shirt and tie at the bottom corner away from the storefront the moment is about, the announcer's caption along the
bottom; every line awaited, so no scene cuts one off):
- **Grand Opening:** `court:shutter` as the shutter rolls up (1.4 s) and the grey copy fades, confetti; the storefront
  opens, the banner comes in, sparkles; `court:chime`; `court:paChime`; pa `court.announce.open {name}`; Mitch
  `court.unlock {name}` (`thumbsUp`). Reduced: a cut, no confetti, still sparkles that fade.
- **Gold sign:** the crest drops onto the sign board (0.55 s) and the plate turns gold; `court:signDrop`; sparkles and
  `court:sparkle`; `court:paChime`; pa `court.announce.gold`; Mitch `court.goldSign` (`thumbsUp`).
- **The grand celebration** (once): the crowd steps away and every drawn customer (`BBCast.drawn`) stands in two rows
  on the open floor, happy; fireworks (each burst small, never over a sign, a new one at most every 350 ms) with pops
  (`court:pop1-3` in turn, at most 3 a second, only between lines); each says one `court.cheer` (laughing while they
  do), Mitch `court.celebrate` (`laughing`), then `court.promoted` in the `promoted` pose; a last volley. Reduced:
  still bursts that fade. With Character Voices Off nobody speaks and the line-up stands a moment.
- **Chatter:** every 9 to 18 s while the scan is live, a customer on the floor who has `court.chatter` lines shows one
  as a caption over them with their name (never spoken; not with Character Voices Off) for its reading time, never
  over the highlighted storefront (it goes when the highlight arrives). The shoppers' lines went to the cast members
  they suit (packs/court/script.js; chatter.2, about the scooter guard, was dropped).

**game.js hooks it relies on:** `BB.game.enter(id)`, `leaveToCourt()` -> `BB.court.show({ from })`, `quit()` and
`afterReset()` -> `BB.court.menu()`.

## 7. The counter (spec 5.2, decision 4; each picture's own layout: 2b-seams, 2026-11-09)

The counter set is solved like a station (`line: 0.80`, `surface: { y, back }`): its top's back edge lands at 80% of
the picture (85.6% of a 16:9 window, 82% of 16:10, 80% of 4:3). **A window wider than 16:9 anchors the counter
picture lower** (world.js `anchor('counter')`, bb.css `background-position: 50% var(--counter-bg-y)`): the line stays
where a 16:9 window has it (85.6%), as long as the picture's painted queue keeps its heads 31% down the window (room for
the answer row and a three-line bubble above them). At 21:9 the diner's anchor is 0.70 (104 px of counter top under the line at 720 high; it
was 24 px), the pizza's 0.57 (its queue is tall: 52 px), the sushi bar's would be 0.50. `BB.world.counterLine()`
reports `{ line, y, px }` for this window; `BB.world.onScreen(fx, fy, picture, 'counter')` maps any point of the
counter picture (cover, anchored); `BB.world.anchor(name)` is the anchor (stage.js turns it on with `BB.world.useAnchor(true)` at init; off, as in tools/food-frames.cjs, the counter is solved to its centred picture). `stage.layout()` places everything at the
counter from them (on boot, resize, Text Size and every `setScene('counter')`) and sets CSS variables on `body`:
`--line`, `--fig-h`, `--fig-top`, `--cust-x`, `--mitch-x`, `--say-x`, `--say-b`, `--mitch-say-r`, `--kid-say-x/-b/-w`,
`--prop-b`, `--bell-x`, `--reg-w`, `--counter-bg-y` (and `--col-top`, `--slip-w` on `#controls`, `--rcpt-x/-y/-w` on
`#receipt`). `BB.stage.placed` holds the same numbers in px, with the boxes the checks read: `queue` (the painted
queue on this window), `keep` (it, plus a margin), `customer`, `head`, `column` (`mode`: one, two or row), `mitch`
(`at`: customer, right or off; `fig`, his figure's box), `receipt`, `bubble` (`tall`), `register`, `bell`, `back5`, `hud`, `sign`.

**Each counter picture has its own layout.** `art-source/backdrops/<picture>.layout.json` beside the picture
(`counter.layout.json` the diner's, `<pack>-counter.layout.json` the others'), copied by `tools/build_art.py` into the
pack's art manifest:

```js
BBArt.<pack>.counter = { queue: [x0, x1], heads, feet, eyes, horizon, sign: [x0, y0, x1, y1] | null }
```

Fractions of the 1536 x 1024 picture: `queue` the painted queue's left and right edge (what they hold included),
`heads` the top of its highest head, `feet` its lowest foot, `eyes` the painted adults' eye line, `horizon` where the
served customer's eyes go (held to spec 5.2's 0.45-0.48), `sign` the blank sign board's face (null: none). The seven
are in `docs/api/reports/2b-seams.md`; `tests/counter.test.cjs` checks every pack's (and that the manifest matches the
file). A redrawn picture is measured again in its `.layout.json` (build_art.py warns when the picture is newer).
Without one the page falls back to stage.js `PIC` (phase 2a's shared box, 52-76% across, heads from 43%).

### 7.1 What keeps clear of the painted queue (`stage.js`)

Nothing the page draws at the counter covers the box `[queue[0], heads, queue[1], feet]` (plus a margin, `keep`) but the
served customer:

- **The served customer:** a figure's canvas (768 x 1152, every pose) is sized so the eyes (18% of it) meet the
  picture's horizon and the hips (56%) the line; centred at 24% of the picture. The 3D counter hides them from the
  hips down. A child (cast `scale`) is drawn smaller from the canvas's bottom centre, so only head and shoulders show;
  their bubble sits just above the head, left of the queue.
- **Mitch** (`placeMitch`, `body[data-mitch-at]`): while nobody is being served he stands at the customer's spot
  (the uniform joke, `shift.start`, `shift.end`, the event lines), his bubble where a customer's goes. With a customer
  there he stands right of the queue (his old spot, 88% across, when that is clear), as far past the right edge as his
  pose needs (each pose's figure is in `BBArt.cast.extent`, built by `tools/build_art.py`) while at least half his
  face shows; where it cannot, he speaks from just off the right edge (`at: 'off'`: his named bubble against the edge,
  his voice). The Pizza Parlor's and the Sushi Bar's queues were moved left in phase 3 (they end at 75.1% and 73.5%), so
  there he stands on screen in every pose at every shape.
- **The answer column** (`fitColumn`, at the review and the receipt): under the corner count; where one column would
  reach the queue, two columns (`.cols2`), or one row above the queue's heads (`.row`; its slips `--slip-w` wide with
  their words wrapping when the row must squeeze). Each is tried below the restaurant's name on the sign board first.
  The scan order stays top to bottom, left to right; every slip keeps 64 px and the Text Size; it never covers the
  served customer's head. A browser measures the real box and goes on to the next way if the words came out bigger.
- **The receipt** (`fitReceipt`): right of centre under the corner count, as before; else raised to end above the
  queue's heads (left of the corner count if it must), else narrowed into the room between the customer's head and
  the queue; never over the head, the column or the count. Where nothing clears (Extra Large text), the place that
  covers the queue least: legibility first.
- **Bubbles** (`fitBubble`) grow upwards from above the queue's heads, beside the speaker's head; where the room
  above the heads is short (a wide window, a tall queue, long words) a bubble grows wider instead (`--say-w`), away from
  its speaker, to the window's edge (over the corner count while it speaks) or, Mitch's on the right, short of the
  customer's head. Only where no width is enough does it hang from the top (`.tall`: legibility first).
- **Props:** the register on the right at the counter top's front edge, as big as fits right of the queue or below its
  feet (`--reg-w`, never under 64 px); the bell in front of the customer, its right edge short of the queue; the Back in
  5 sign far left. The corner count stays top right.
- **The order** (world.js): kept between the counter's `back` edge and the nearest depth the window still shows,
  shrunk only when it would not fit, placed again on a new window shape, and left of the picture's own `queue[0]`
  (`anchors.maxScreenX`: docs/api/world.md 3.6).

### 7.2 The restaurant's name on the sign board

Every counter picture but the sushi bar's has a blank sign board across the top, like its storefront's on the court
(where the page writes the name plate). `#signName` (stage.js `placeSign`) writes the restaurant's short name there
(BBCourt's `short`: Burger Bar, Pizza Parlor, Cafe; never written per id) in Arial Black in the pack's ticket accent,
placed from the measured board for this window and sized to fit it (62% of its height, 86% of its width at most). It is
left out when the window shows less than 85% of the board's height (a 16:9 window shows only its bottom edge; 21:9
none) or the letters would be under 14 px, and while the answer column, the receipt or a speech bubble covers part of the words (the board shows blank under
them; 2b-seams, second run).

## 8. tests/dom-play.cjs

`JSDOM=<jsdom> node tests/dom-play.cjs [words] [--pack <id>]`: each run loads `index.html` in jsdom with the hub's
real scanner, voice manager and input guard (speech, media, canvas and WebGL faked) and plays by Space and Enter
from the main menu. **Integrate's additions (2026-11-09):** the first run, "the page boots" (`bootCheck`), fails on
any script or stylesheet that does not load, any console error, any warning but three.js's own, and any
`packs/<id>/pack.js`, `script.js` or `js/food/<id>.js` on disk that the page does not load. A run may name its
restaurant (`pack`); `--pack <id>` plays every run that names none at `<id>` (and skips runs named for another), and
a run's `court: { here: {...} }` seeds whichever restaurant it plays. `chain: [ids]` plays a shift at each in turn
(Food Court from the results, the next storefront, back to the court). `unlockAfter: <id>` (with `backToCourt`): the
shift's results name the opening and that restaurant's Grand Opening plays on the court. The bot plans a Timed
timing mistake once per cook step at the run's `mistakes` rate (it used to take the food off at a 3% chance per look
at the clock, so Timed runs nearly always served it raw), swaps every gross-out with `mistakes: 0`, and a run with
`mistakes: 0` (no hold of Take It Off, no tutorial) must give three stars to every order. Motion Full checks the
squirts where the pack has squeeze-bottle sauces and a flourish (an auto step) where it has them. A dislike line is
found by its id whatever the pack's id style (`sal/dislike.1`, `tony/pizza:order.dislike.1`). The Pizza Parlor has its
own runs (the tutorial, Timed with the peel, Pull It Out held, one switch, level 4, the event, Motion Full, the
counter at four shapes, an unlock after its shift), and the whole chain plays the Burger Bar and then the Pizza
Parlor. Every run fails on any script error and checks every card and the court opens at -1 (two-switch
runs), that every court level offers at most 5 stops and never a closed restaurant or one whose pack is not loaded, and
that no tutorial picker opens. Into a restaurant: Play, the court scan (`courtLive`), its storefront (inside its part
when five or more are open). Options (the `RUNS` table): `pack`, `seed`, `settings` (bb-settings data), `scan`
(narbe-scan-settings), `court` (bb-court entries per restaurant: `{ diner: { popularity, stars } }`),
`celebrationSeen`, `builtAs` (stand-ins, a copy of the diner under these ids, so the court has more restaurants to
scan; never played), `offer` (a first visit), `tutorial` (`'offer'`), `menu` (the main menu's four items and its words,
How to Play at -1 with spec 6.1's whole text shown and spoken, Settings, all over the court out of focus), `courtPause`
(the Back in 5 sign, Help, Settings, Exit's confirm, Continue at -1, the 5 s hold, Main Menu over the blurred court),
`focusCheck` (`'reduced'` | `'full'`: Play's focus pull is a cut / takes 0.6 s), `moments` (`'unlock'` | `'gold'` |
`'celebrate'`: the moment's sounds and lines in order, its storefront after, once only), `parts` (the root of parts,
each a row landing on its first storefront with a Back stop after its last; Back comes home to the part), `pointer`
(clicks: on an outline, in an overlap of boxes, from inside a part, and a real one into the Burger Bar), `backToCourt`
(Food Court from the results: the court opens at -1), `courtOnly` (no shift), `tour` (Settings and its 17 rows),
`pauses` (Pause, Settings, Food Court mid-shift (the storefront says "shift in progress"), resume: counted once),
`redo`, `leave` (Pause, Main Menu keeps the shift and brings back the main menu over the blurred court, Restart Shift
starts it again, counted once), `keepShift` (a saved shift waits at the restaurant; a tutorial, from the first-visit
card, must leave it alone), `holdPause` (a 5 s Enter hold that starts in an
arrival; with `slowSpeech`, lines last as long as a voice would), `holdTakeOff` (Take It Off held 3 s across a stage
boundary: the stage at keydown is taken), `watchWheel` (Motion Full), `event` + `expectGold`, `mistakes` (default
0.08), `size` ([w, h]: the window), `queue` (who comes in first), `counter` (at every review: the counter line for the
window and the counter picture's anchor, the customer's eyes on the picture's own horizon and the hips, a child's head
and shoulders, the order fully on screen, on the counter top, left of the picture's own `queue[0]` and off a child's
face; the answer column (in the mode stage.js chose), the register, the corner count and the Back in 5 sign clear of
the picture's painted queue box (`BBArt.<pack>.counter`); all the while, Mitch, the receipt, the bell and the bubbles
clear of it, Mitch never at the customer's spot with a customer there nor over them. At Extra Large text a covering is
a note in the run's `legibilityFirst`, not a failure; 2b-seams), `heard` (`{ what: 'howto' | 'help' | 'offer', press? }`: long
words on a card under Auto Scan, section 5), `speechMsPerChar` (the fake speech's length per character), `clockLag` (ms: the page's clock falls behind its timers at the first line
step; the Auto Scan must pick itself up), `timeout`, `storage`, `verbose`. Waits are timed, not counted, and nothing
is judged while a playout runs, so a slow machine only makes a run slower. The page's timers never fire early by
`Date.now()` (as in a browser; Node's count from its cached loop time): under CPU load that early wake stopped the
one-switch scan for good, the run's old flake. A dislike counts only for an order said in full (a ridiculous order
and "the usual" are said their own way, as game.js does: the old level-4/5 flake).

**Phase 2b's additions (the lanes, then integrate-2b, 2026-11-10):**
- **Restaurants shut at the start** (smoothie, burrito, sushi, icecream; content-smoothie): `courtRecord()` seeds the
  run's own restaurant open, its Grand Opening seen, with every restaurant that unlocks before it, for any run played
  there (not a court-only run, unless it walks up to the first-visit card, and not a court-moment run). A court-only
  run leaves a shut-at-start restaurant's first visit to come unless it seeds `tutorialDone`.
  `tools/review-frames.cjs` seeds the same way (food-smoothie).
- **Repeat picks and More… rows** (content-icecream): `leafOf()` / `pathOf()` find an answer at any depth of More…
  rows and the bot steps into each row on the way; a repeat is picked to its count, then Done.
- **`unlockChecks()`** checks the restaurant the seed opens: the first in unlock order whose Grand Opening the seeded
  record has not seen (the Smoothie Shack, or the run's own at `--pack sushi` / `icecream`). **`partsChecks()`**
  accepts a lone storefront at the root (a part with one open shop is that shop: six open leave the right arm with
  one) and walks only the parts (integrate-2b).
- **`crowd: true`** (court-only; crowd-cast, 2026-11-10): with every restaurant open, popularity 0, 3, 7 and 10 in turn:
  each storefront's line and diners within its tier (`BB.courtRules.crowd`), someone at every counter, everyone a drawn
  customer (never a shopper) and nobody twice, nobody moving, the line's poses (front `neutral`, the rest `waiting`),
  each diner `eating` with a dish of that restaurant's, nobody left out for covering a sign or the board, and the crowd
  never shrinking (7, 20, 22, 22 people; 0, 7, 8, 8 eating). `ALL_OPEN` seeds the four shut-at-start restaurants open.
- **A child at the counter** is checked at the scale the page draws: the cast's, but no smaller than stage.js's
  `CHILD_MIN` (0.71: Little Lulu stands on a step). Two runs serve Lulu first at 16:10 and 21:9.
- **Each restaurant's own runs** (filter with their words): "the Pizza Parlor:", "the Smoothie Shack:", "the Cafe:",
  "Ben's Burritos:", "Ben's Sushi:", "the Ice Cream Emporium:", each with its first visit's tutorial, Timed with its
  tool, the tool held across a stage boundary, one switch, level 4, the event and gold sign, Motion Full, and (the
  four shut at the start) its Grand Opening; the counter at four shapes comes from `--pack <id>`. Whole chains: the
  diner and pizza; with the Cafe, the Burritos, Sushi, the Emporium; and **"the whole chain, all seven open"**.

## 9. tools/review-frames.cjs and tools/review_compose.py

```
JSDOM=<jsdom> node tools/review-frames.cjs <out> [--pack <id>] [--aspects 16:9,16:10,4:3,21:9] [sessions]
python tools/review_compose.py <out> [--guides]
```

Sessions: `counter` at every shape (Mitch, an order, the review, the reaction, Mitch with the customer there, the
receipt and bell, Kai ordering and at the review, three items, the event's giant), `counterxl` (the same at Extra
Large text), `tut` (the tutorial at 16:9, from the first-visit card), `timed` (the
tool and gauge), `motion` (Full motion: the wheel, a squirt); and the court (no 3D): `menu` (the main menu over the
court out of focus, 16:9 and 4:3), `howto` (How to Play at Normal and Extra Large text, 16:9 and 4:3), `settings`,
`court` (in focus just after Play, the Burger Bar lit, the Pizza Parlor lit, the Pause sign lit; 4:3, 21:9, Extra
Large, Motion Full), `tiers` (every restaurant at popularity 0, 3, 7, 10, 4:3 at 10, and `-busy`: the Burger Bar and the Pizza Parlor
fully busy with only the start three open, the longest lines the cast fills, at 16:9 and 4:3), `moments` (a Grand Opening, a gold sign and
the celebration, each midway, Motion Full), `parts` (a part lit, inside the top part, its Back stop), `closed` (the
start; the packs-not-loaded state). Each frame is `<session>-<nn>-<moment>.json`, plus `.3d.png` (the CPU render) in a
restaurant; a court frame's JSON is `{ kind: 'court', court: BB.court.scene(), card, mitch, bubble, back5, lit ... }`.
The composer lays the 2D stage over the 3D as bb.css does, or draws the court layer (the picture, greyed copies, the
crowd, the board, the signs, the lifted highlight, effects, the blur behind a card) and the card, and writes
`<frame>.png` and `sheet-<session>.png`. `--guides`: the counter line, the picture's own painted queue box (`placed.queue`, cyan; the margin kept round it,
dashed), and what stage.js placed (the column, the receipt, the register, the bell, the customer's head, Mitch's figure, the
sign), with the anchor, the column's mode and where Mitch stands written on the line; on the court, the
storefront boxes, the board's estimate and everyone's box. **Two keys (integrate-2b):** each restaurant frame is
also rendered over green (`.3dg.png`), and the composer works out each pixel's coverage from the two renders
(`key_two`, as `tools/food-frames.cjs` does), so clear cups, glass and steam come out untinted; a frame with only a
`.3d.png` falls back to the magenta key. **`choose()`** steps into a part of the U for a storefront (food-burrito) and
into the More… row(s) that hold a line answer (food-icecream). Session **`plates`** (phase 3): all seven open, the court in focus at all four shapes and Normal, Large and Extra Large text (the composer notes any plate bigger than its board). Session **`seven`** (integrate-2b): all seven open,
16:9 and 4:3: the main menu, How to Play at Normal and Extra Large text, the court in focus, the right arm lit and
entered, the Ice Cream Emporium lit. It prints notes (a plate bigger than its board, the board's
estimate off, How to Play's text size). The page-2 set is in `art-source/review/page2-frames/`; integrate's (with the
pizza on the page, 2026-11-09) in `art-source/review/integrate-{pizza,diner,court}/`, and the pizza's food frames in
`art-source/review/integrate-food-pizza/`; 2b-seams's (each picture's own layout) in `art-source/review/2b-seams-{diner,pizza,court}-r2/` (second run; the first run's sets without -r2 are superseded).
