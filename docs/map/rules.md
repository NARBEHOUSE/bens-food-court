<!-- Engine map, 2026-11-08: Hub rules (accessibility, scanning). Written by a read-only mapping agent. -->

# Hub rules the Food Court must obey: technical map

**Which document wins:** ACCESSIBILITY.md (A) outranks DESIGN.md (D), which outranks the BENS-FOOD-COURT proposal (P) (D:9-10, P:2). On graphics, GRAPHICS-QUALITY.md (GQ) and `shared/graphics-quality.js` are newer than A:234. A:234 still calls Auto "the new-install default", but Auto was removed on 2026-10-14 (GQ:119-123). The code has modes `high|standard|low`, game choices `hub|high|standard|low`, and turns old Auto saves into High (graphics-quality.js:6-9).

## 1. Switch input

| Rule (testable) | Source | Where it lives now |
|---|---|---|
| Only `Space` and `Enter`/`NumpadEnter` are used. Nothing may need a third key. | A:99-116 | ui.js:194-195 |
| Mouse and touch work alongside the switch, never as the only route. | A:114-116 | ui.js:167, 180-191 `pointAndPick(id)`, 417-420; `GHOST_MS=380` (pointer only) |
| A choice acts on **release**. A short Space press steps forward. Holding Space for `SCAN_BACK_HOLD=3000` ms scans backward, one step per scan interval. | A:212 | ui.js:26, 221-227, 241-257 |
| Space Brake is the one keydown exception: Auto Scan freezes on keydown. | A:186-194 | ui.js:219 `brakePress()`, 253 `brakeRelease()` |
| Input Sensitivity (50/100/200/300 ms, default 50) is a cooldown, not a minimum press length. Add no second debounce. | A:214-218; scan-manager.js:8-11, 119-153 | The shared guard runs in the capture phase (platform.js:189-196). The game adds none and must keep it that way. |
| Screen changes clear their own held keys but must not reset the shared cooldown. Never call `NarbeScanManager.resetInputState()`; only the hand-off back to the hub resets it. | A:218 | `swallowHeld()` ui.js:200-204: a key already down when a screen opens has its release ignored |
| Window blur and cancellation clear half-held keys. | A:208, A:606-611 | ui.js:259-263, 414-415 (`narbe-input-cancelled`) |
| Holding Enter for 5 s opens Pause, with a ring from 2 s. The release after that is swallowed. Player hints never state a duration. | D:479-482; A:212 | ui.js:26, 229 (only in context `line`), 232-240; hint text ui.js:173-177 |
| Ben cannot short-tap. Nothing in play may depend on release timing, and a press held for a minute must do the same as one held for a second (user feedback, no-short-taps note). | memory | **Gap:** Timed "Take It Off" reads the stage when Enter is released (line.js:256-258), and the cooking clock keeps running while Enter is held (game.js:343-358; the guard at :347 ignores held keys). |

## 2. Scanning

- **Controller.** `NarbeChoiceScanAdapter.create({holdThreshold, stateHost, speak, statusHost, onContext, onHighlight, onSelect})` (ui.js:44-69).
  - A context is `{key, kind, items:[{id, label(), element, ref}], statusHost, redraw?}`. Item ids must be unique and stable (choice-scan.js:24-30).
  - `sync(ctx,{fresh:true,restoreId})` opens a context (adapter:113-131, choice-scan.js:249-264). `sync(ctx)` redraws it and keeps the highlight on the same id. If that id is gone, the highlight returns to -1.
- **The blank -1.** It is silent in two-switch play, and Enter does nothing there (choice-scan.js:191-197). It says "park" only with Auto Scan and Parking on. Only the root has -1, and parking and loop counting happen only there (A:172-184, 207).
- **Rows.** Use `enterGroup(lvl,{wrap:true, backStop:true})`. The adapter adds `{id:'narbe:row-back',label:'Back'}` after the last item (adapter:10, 70, 132-139).
  - A row loops in both directions and draws a dashed outline around itself on the Back stop.
  - Space on the Back stop is used up and does nothing (adapter:159-163).
  - Rows have no visible Back buttons.
  - Never edit `choice-scan.js` for this (Companion sync).
- **No hub-only controls in the game.** Parking, Loops, Space Brake and Wait for Speech stay in Hub Settings only (A:226, D:470-472).
- **Five-choice limit** (D:104-109):
  - Line screens: at most 4 answers (`L.MAX_ANSWERS`, line.js:24), plus Ticket, plus Pause, plus -1. With more than 4 values, the screen shows 3 and a "More…" row (line.js:180). A row holds at most `MAX_ANSWERS+1` (pack.test.cjs:57-62).
  - Cards are not limited in code: Settings has 18 items, Pause has 6.
  - The court (P:85): with 4 or fewer open restaurants, the root is the restaurants plus Pause. With 5 or more open, the root is Left, Bottom, Right and Pause, and each part is a row with a Back stop.
- **Menus open with nothing highlighted.** Every new card, results screen and confirmation opens at -1 with a full Auto interval. The title is spoken, not item 1 (A:204, user note of 2026-10-02).
  - Going back inside a nested task restores the same item by id (A:206). A separate menu that is returned to may open fresh.
  - Settings→Back and Cancel on a confirmation currently restore the old item by id (ui.js:366, 384). A allows this, but the user's note asks for -1 even when going back to a previous menu.
  - Continue from Pause reopens the line fresh (game.js:519-526).
- **Phases.** Within one phase the highlight stays on the same answer. A new phase opens fresh (D:151-153; ui.js:106-119).
- **Pause placement.** Pause is the last item on every line screen (game.js:248). It is the real "Back in 5" sign, `#back5`, bottom left (index.html:23; D:372-377). Order: answers, Ticket, Pause.
  - The Pause card is Continue · Help · Restart Shift · Settings · Main Menu · Exit Game (ui.js:370-380), which matches A:415-420.
  - Restart Shift, Main Menu and Exit Game each go through `confirm()`: Cancel first, consequence spoken on open (ui.js:276, 381-387; A:427-479).
- **Scan state display.** A braked scan shows only a dotted outline (`.lit.braked`, bb.css:125). Parked shows a badge in `#choiceStatus`, which sits outside the choices (index.html:33, bb.css:134).

## 3. Speech

- **One speech channel.** `NarbeVoiceManager.speak(text,{pitch,rate,volume,force,onComplete})` returns `{started,finished,cancel}`.
  - It cancels whatever is already speaking (voice-manager.js:97-98).
  - `finished` resolves on end, error, cancel, disabled speech or a timeout of at most 10 s (voice-manager.js:94-96, 124-128).
  - So any character line spoken by text to speech while a scan is live cuts off the scan label, or is cut off by it.
- **Scan speech wins** (D:297-309):
  - Character and Mitch lines play only while the scan is suspended. `BB.ui.suspend()` runs before every playout (game.js:96, 128, 176, 273, 300, 378, 421).
  - A heads-up during a live scan plays only if it is a recorded clip (HTML5 Audio). Otherwise it is a caption (game.js:361-372).
  - Mitch is silent while Pause, Settings or a card is open.
  - Priority: gross-outs and heads-ups, then tutorial lines, then jokes. At most one joke per customer, no line repeated in a shift, and never a remark on time, speed or skill.
- **Wait for Speech** counts only speech the scanner owns: `choice.announce` via `BB.ui.announce` (ui.js:93-100).
- **Scenes breathe.** Playouts wait for their speech before moving on. `narrate()` is capped at 12 s (game.js:65-70) and each recorded clip at 15 s (audio.js:59).
- **Captions.** Character Voices is `voices|captions|off` (savefmt.js:28; audio.js:70-92).
  - Captions Only keeps the caption up for `max(1300 ms, 62 ms per character)` (audio.js:28).
  - Off skips the line entirely (audio.js:73). Anything the player needs must therefore also come through the game's own voice, the ticket or the receipt: the ticket read-out (game.js:160) and Hear It Again (game.js:480-490).
  - Scan labels follow Text to Speech only.
- **Per-character voices.** Today each character only gets their own pitch and rate (pack.js:191-219; audio.js:41-49), because `speak()` always uses the player's chosen voice (voice-manager.js:132). The proposal's "different TTS voice per character" (P:78) needs an opt-in `options.voice` added to the shared voice-manager.js. Never call `speechSynthesis` directly (A:264, 274-275).
- **Labels.** Short, and they say the meaning (A:566-572).

## 4. Settings rows

- **Current order** (A:391-413; ui.js:337-369; D:498-527): Text to Speech, Voice, Cooking, Cooking Speed (disabled with Simple), Shift Length, Orders, Assistant Manager, Character Voices, Colour Profile, Motion, Text Size, Graphics Quality, Auto Scan ("On — One Switch" / "Off — Two Switches"), Scan Speed (1-5 s), Sound Effects, Music, Reset Progress (two-step), Back.
- **Never remove** Text to Speech, Voice, Auto Scan or Scan Speed: the game is also played outside the hub (D:524-527). The proposal's settings list (P:75) leaves out Text to Speech and Voice; both must stay.
- **Reachable** from the main menu and from every Pause (A:391-394).
- Disabled rows are skipped (ui.js:153). A change keeps the same item highlighted and speaks the new meaning (ui.js:301-308).
- **Bug: the Graphics Quality row does nothing.** `pick('graphics')` (ui.js:358) writes `bb-settings.graphics` (savefmt.js:32), and nothing reads it. The renderer uses `NarbeGraphics.openGame('bensfoodcourt')` (world.js:16). This breaks GQ:55 ("store quality only through this manager"). The row's id should be `graphics-quality`, not `graphics` (D:603-604, GQ:77-80).

## 5. Motion, text size, theme, graphics

- **Motion.** Full/Reduced sets `body[data-motion]` (ui.js:401-405). Reduced turns off all CSS animation (bb.css:213), and the JS checks `reduced()` (game.js:16, stage.js:16, world.js:17). Anything that moves by itself gets a speed setting that defaults to slow (A:549-551). The no-flash precedent is Magic Button (A:514).
- **Text Size.** `body[data-text]` sets `--label`/`--small` (bb.css:17-18). Words are drawn in code, never painted into the art (D:384-386).
- **Theme.** `body[data-theme="contrast"]` changes `--lit` to `#00e5ff` (bb.css:206-210).
- **Highlight.** Colour plus thickness: an 8 px outline (bb.css:122) and corner brackets at least 64 px (ui.js:85). Never colour alone (A:560-564).
- **Graphics.** Load `platform.js`, then `graphics-quality.js`; `await handle.ready` before creating the renderer; use `rendererOptions`, `pixelRatio` on resize and `subscribe` (world.js:644, 651-655, 667 ✓). One handle per document, disposed at teardown. Graphics never changes timing, rules or random results (GQ:53-101).
- **Missing script.** `index.html` does not load `shared/electron-bridge.js` first (A:238; index.html:40-41). Sibling games do, e.g. NARBEBUILDNBASH/index.html:20.

## 6. Saves

- Saved to localStorage as things happen (A:422-425). Access settings are never saved by the game (save.js:4-6).
- **Keys:** `bb-settings` (shared by every pack; savefmt.js:19), `bb-progress:<pack>`, `bb-shift:<pack>`.
- **Record shape:** `{v,kind,pack,packVersion,data}` (savefmt.js:53-55).
  - A save from a newer version is never overwritten (savefmt.js:84-89).
  - A pack version change drops only the shift in progress (savefmt.js:72-80).
  - The tutorial is never saved (save.js:57).
- **Gap:** coins are added to progress only when a shift ends (game.js:497-501). The proposal says leaving partway through keeps what was earned (P:77), so earnings must be added per order.

## 7. Writing tone and customer rules

- **Tone.** Written for adults: no baby talk, no "great job!", no talking down. The joke lands on the customer, never on the player, and nothing comments on speed or skill (D:111-115; A:30-31).
- **Customer rules** (D:263-269, P:168):
  - Order size follows the Orders setting, whoever is ordering. A personality changes what they order, never the number of presses.
  - The ticket spells out every item, every count and everything that goes on, in the order the line asks for it (D:83-96).
  - No customer brings a new mechanic, changes their mind, leaves or hurries the player.
  - Snark aims at the food.
  - "I said no X" only if they said it; otherwise "I didn't ask for X" (D:199-203).
  - At most two complaints, then `complain.more`.
  - A favourite adds a tip, never stars (D:206-208).
  - One customer at a time.
- **Proposal items that break these rules:**

  | Proposal item | Line | Rule it breaks |
  |---|---|---|
  | Breeze's very long order | P:122 | Dead time before the line starts |
  | "orders for twelve", "a dozen donuts", "one of everything" | P:112, 186, 154 | Size must follow the Orders setting |
  | Bun on the inside | P:102 | New mechanic |
  | Whole teams or parties ordering at once | P:103, 114, 124, 135 | One customer at a time |
  | Burrito "press and lift", sushi "stop the knife" | P:150, 140 | Timed on the release |
  | Ice cream "up to five" flavours on one screen | P:160 | At most 4 answers |
  | Gross-outs on steps other than Add (burnt crust, spoiled milk, burnt coffee, bursting burrito, sock in the blender) | P:110, 120, 131, 151-152 | Gross-outs only on an Add step, with Swap It and a spoken label (D:224-241) |

## 8. Places in this area tied to the burger restaurant or to one pack

- **index.html:** :6 title; :37 "Warming up the grill…"; :64-67 loads the diner pack only.
- **ui.js:**
  - :28 contexts are only `none|card|line`.
  - :63-68 non-card choices go to `G().onChoice`, which returns when there is no shift (game.js:286).
  - :121-126 `enterRow` needs `lineRoot`.
  - :229 the 5 s pause hold works only in `line`.
  - :277-278, :366 settings returns only to title or pause.
  - :297-298 burger wording.
  - :315-328 title card is the Burger Bar.
  - :329-336 tutorial offer is not per restaurant.
  - :370-380 Pause has no Food Court item; :388-398 results has none either.
  - :424-428 `__dbg()`.
- **game.js:** :11 `BBPacks.diner`; :73-79 the tutorial offer is triggered by Start Shift; :109-118 `quit()` opens the title; :532-537 help text is about burgers.
- **audio.js:** :12, 14, 20, 57 diner paths. At :20 the sound names `'bb-'+n` would clash across packs: SafeAudio keeps the first URL loaded for a name (safe-audio.js:197).
- **save.js:** :10, 28, 37 are bound to the diner pack. **stage.js:** :12, 15, 22, 24, 49. **world.js:** :15.
- **tests/dom-play.cjs:** :87 seeds the diner pack; :94-95 waits for the `title` card.

## 9. What the new screens must do

**Court (a new `court` context; a CHOICE scan)**
1. Opens fresh at -1, and only after every playout has finished speaking (zoom out, Grand Opening, celebration, Mitch's line). Its title is spoken through the scanner (owned).
2. Root: the open storefronts (the real elements), then Pause as a real sign, last. With 5 or more open, the root is the parts (Left/Bottom/Right) plus Pause, each part entered with `enterGroup(…,{wrap:true,backStop:true})`. Omit a part with no open restaurant (A:174). Never more than 5 stops.
3. Stable ids: `shop:<packId>`, `part:<left|bottom|right>`, `pause`. Labels are short: "Pizza Parlor, three stars", plus "shift in progress" when one is saved.
4. Closed storefronts are not scanned. Their status, the next unlock and the overall goal are spoken through Help, not only by Mitch, because Mitch can be Off. Stars and the gold sign show a word or number, not only colour.
5. Holding Enter for 5 s opens the court's Pause. Tapping a storefront selects it even when it sits inside a part.
6. Shoppers: still under Reduced motion, and they never jump to a new spot. No text-to-speech chatter while the scan is live; use captions, or speak only while the scan is parked or suspended. Repeated sounds stay short (under about 0.4 s), below 2.5 kHz and quiet.
7. Court Pause: Continue · Help · Settings · Main Menu · Exit Game. Exit asks first, Cancel first, consequence spoken.

**Main menu:** Play · Tutorial · Settings · Exit Game. Opens at -1 and speaks "Ben's Food Court". Exit asks first (Cancel first, "You will go back to the hub."), then sends the hub its exit message (`{action:'focusBackButton'}`), or goes to `../../../index.html` when opened directly (A:350-374). No restaurant has its own main menu.

**Tutorial picker:** a separate card that opens at -1 and speaks its title.
- Lists only open restaurants, in court order: with 4 or fewer, the restaurants plus Back; with more, the same parts as the court, as rows with Back stops, plus Back.
- Starts that pack's tutorial (game.js:86).
- Its results card offers Start a Shift · Food Court · Main Menu · Exit Game.

**Pause inside a restaurant:** Continue (keep this name, not the proposal's "Resume") · Help (per pack) · Restart Shift · Settings · Food Court · Main Menu · Exit Game.
- Every route out asks first, Cancel first, and says accurately that the shift is saved.
- The proposal's "Ticket" in Pause (P:77) repeats the line's own Ticket stop. If kept, it speaks the ticket without closing the card, like Help.
- While Pause is open, Mitch is silent and the cooking clock is stopped.

**Entering a restaurant:** suspend the scan and call `swallowHeld()`. Zoom in on Full motion, cut on Reduced. Keep one renderer.
- First visit: the tutorial offer (Play the Tutorial · Skip It · Food Court), at -1, spoken.
- Otherwise go straight to the counter, or continue the saved shift. The first line screen opens fresh.

**Leaving a restaurant:** stop the clock and the audio, add the earnings to progress, save the shift, suspend the scan, zoom out. The court then opens fresh, the same way the hub does when a game closes (A:369-371).

## To support the Food Court

1. **index.html:** add `electron-bridge.js` after safe-audio.js; retitle the page to Ben's Food Court and use a neutral loading line; load every pack's files (or add a loader) and a new `js/court.js`.
2. **ui.js:**
   - Add the context `court`, with `BB.ui.court(root, fresh, prompt)`, and make `enterRow` work on any root.
   - Route `onSelect` for `kind:'court'` to `BB.court.onChoice(ref)`.
   - Let `watchPauseHold` work in `court`.
   - `settingsReturn` values: `title|pause|courtPause`.
   - New cards: `tutorialPick` and `courtPause`. Give `tutorialOffer` a `pack` option and a Food Court item. Add Food Court to `pause` and `results`.
   - Let `pointAndPick` reach storefronts inside parts. Add court state to `__dbg()`.
3. **Graphics row:** id `graphics-quality`; its label comes from `handle.label()` and its action is `handle.cycle()` followed by `choice.announce`. Export the one handle as `BB.world.graphics`. Add a settings v3 migration that calls `setChoice(old)` once and then drops `graphics` from `DEFAULT_SETTINGS`.
4. **Help and Mitch:** move help text into `pack.help` and add `courtHelp()`. Add Mitch moments `court.return`, `court.unlock` and `court.celebrate`, played before the court scan opens and skipped when Assistant Manager is Off.
5. **game.js:**
   - `enter(packId)` and `leaveToCourt()`.
   - Make the tutorial offer per pack and show it on entry.
   - Add earnings to progress per order in `serveNow`.
   - Timed cooking: stop the clock while a switch is down (add `BB.ui.keysDown()` and check it in the guard at game.js:347), or record the stage at keydown.
6. **audio.js:** sound names `'bb-'+pack.id+'-'+n`; voice paths per pack. Optionally add `voice: options.voice || getCurrentVoice()` to shared voice-manager.js:132; that changes a shared file, so coordinate first.
7. **Court save:** a new `bb-court` record, `{v,kind:'court',data:{restaurants:{<id>:{stars,popularity,opened,grandOpeningSeen}},celebrated}}`, built in a pure `js/core/court.js` that Node tests can load. Stars and popularity only ever go up (`max`). Reset Progress keeps its two steps and says that every restaurant is cleared: it clears `bb-court`, every `bb-progress:*` and every `bb-shift:*`.
8. **CSS:** restaurant colour themes go through `body[data-shop]` variables. They never redefine `--lit`/`--lit-ink`, and High Contrast overrides them.
9. **tests/dom-play.cjs:**
   - Play the whole chain by Space and Enter: main menu → court → restaurant → Pause → Settings → Food Court → Main Menu → Exit.
   - Check that the court's root never has more than 5 stops and that rows hold at most 4 restaurants plus Back.
   - Check that every new card opens at -1.
   - Check that no text-to-speech the scanner does not own plays while the scan is active.
   - Check that holding Take It Off for 3 s across a stage boundary still records the stage at keydown.
   - Check that Settings keeps the tts, voice, autoScan and scanSpeed rows.
