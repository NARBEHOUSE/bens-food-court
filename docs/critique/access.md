Spec reviewed: C:/Users/ass/OneDrive/BEN'S SOFTWARE/Documents/Python Projects/Benny's PC Hub/bennyshub/apps/games/BENSFOODCOURT/docs/FOODCOURT-BUILD.md

1. BLOCKER — §0 rule 7, "act on key down"
Problem:
- ACCESSIBILITY §2 and §4 outrank this spec. They say "Never act on keydown for a menu action" and "Ordinary choices act on release".
- docs/map/rules.md §1, which rule 7 cites as its source, says "A choice acts on release".
- Rule 7's own 5-second Enter hold only works on release. With keydown, every Pause hold would first select the highlighted item.
- Held-Space back-scan would step forward before it scans back.
- The user's no-short-taps note keeps release inside scan lists.
- The page agent owns ui.js and could rewrite input to match rule 7.
Replace with: "Choices act on release through the hub's choice scanner, as ui.js does now. Keydown only starts things: the Space brake (Auto Scan with Space Brake on), the 3 s back-scan timer, and the Pause ring (shown from 2 s; Pause opens at 5 s and that release is swallowed)."

2. BLOCKER — §9 core-a "gross-outs on any step", and the gross-out lists in §5
Problem: DESIGN.md allows gross-outs "only ever on an Add step" so that Swap It fits and the spoken label can name the problem. Opening this to every step breaks other rules:
- **Answer limit:** spoiled milk on the milk pick (Whole/Oat/Skim/None) plus Swap It is 5 answers. Freezer burn on a paged flavour pick (3 + More… + Swap) is also 5.
- **Simple mode:** burnt crust, burnt coffee, the melted puddle and the sock in the blender land on cook steps, where "Simple always comes out as chosen".
- **Catching it:** the bursting burrito is on the automatic wrap step. There is no answer to catch it with and no label to name it, so it is a mistake the player cannot avoid.
- Content agents will each present these differently.
Add: "A gross-out sits only on a step the player answers: an Add step, or a pick step whose values plus Swap It are at most 4 answers. The bad one is the value the ticket wants, and its label names it ('Oat milk, spoiled'). Never on a cook step: burnt or overcooked is Timed's last stage, or it arrives already made on an Add or pick step. Never on an auto step: the burrito burst is a joke playout that re-wraps itself and costs nothing. Schema rejects a gross-out on any step that would go over 4 answers with Swap It."

3. MAJOR — §2 cast notes and the "Regulars across the court" brief, against §0 rule 6
Problem: Rule 6 says a personality never changes how many presses an order takes, but the brief says otherwise:
- Pam orders "for twelve" and Rita orders "one of everything".
- Gus orders "two coffees and a dozen donuts" and "two of every roll".
- Brock wants "all the protein", and Bev's sundae is "for the team".
- Vernon "judges it alongside Chef Hiro": two customers at once, which is a new mechanic.
- Breeze (a "very long, very relaxed time") and Lulu ("agonises out loud") add dead time before every one of their orders.
- Orders of 12 to 14 items also overflow the review row and the counter spots.
Add: "Personality never sets the item count, repeat counts (patties, scoops, shots, protein) or how long the order speech is. The level sets item count. Gus's 'two' is his `twin`, only where the level allows two items. Pam's twelve, Rita's everything, Gus's dozen and Bev's team live in their lines; their tickets are normal size ('one of everything' = one item with every topping, the same presses as none). Vernon and Hiro come as separate customers. Greeting plus order is at most about two sentences; Breeze's gag is in his words, not their length. Node check: for the same recipes and level, every customer's order takes the same number of presses."

4. MAJOR — §4.1 and §4.3, the five-star event
Problem:
- "A fixed shift of group orders … just bigger orders" puts no limit on order size. "A giant stack of orders" could be any size.
- "Fixed" ignores Shift Length (3/5/8), which is the player's fatigue setting.
- The event is "the next shift there" until it is passed, so a player who can't manage group orders can never play a normal shift at that restaurant again.
- The 6th and 7th restaurants and the celebration all need every restaurant at five stars, so every event gates them.
- Nothing on the storefront says an event is coming.
Add: "An event shift has Shift Length orders, each at most 3 items at level-4 complexity, and the review pages them. The size of the occasion comes from who orders and what they say. When an event is due, the storefront label adds 'five-star event next', and entering opens a card at -1 that says the event's name: Start the Event · Normal Shift · Food Court. A normal shift there never changes stars, and the event stays due."

5. MAJOR — §4.1 "the saved shift is cleared", against §6.2 "shift in progress", §6.3 "A saved shift there resumes", and ACCESSIBILITY §7 Persistence
Problem:
- Under §4.1, a saved shift only survives an unclean exit, so the label and resume in §6.2 and §6.3 almost never apply.
- A tired player who picks Exit can't "come back to where they were", as the rulebook requires.
- With fewer than 3 served, all of that shift's work is lost. That is likely at Shift Length 3, the setting a tired player picks.
- The confirm wording for the new Food Court route is not given.
- core-b, court-rules and page will each implement this differently.
Replace with: "Leaving keeps the shift. Food Court, Main Menu and Exit save it as it is. The storefront says 'shift in progress'. Entering resumes it and reads the ticket again before the line. Tips bank per order; stars and popularity count only a finished shift. Restart Shift is the only route that discards a shift. Every route out confirms, Cancel first, with the consequence spoken on open: 'This shift is saved. You can finish it later.' / 'This shift is saved, and you go back to the hub.' / Restart: 'This shift starts again. Orders served so far are lost.'"
If the team keeps bank-and-clear instead, each confirm must say "This shift ends now; your N orders count", or "won't count, fewer than three".

6. MAJOR — §0 rule 8 and §5 cooking steps (Timed)
Problem: The Burger Bar's forgiving-timing contract is not carried to the six new cooking steps.
- **Held switch:** Take It Off reads the stage on release while the clock keeps running (rules.md §1, "Gap"). Ben holds his switch, so a 3 s hold across a stage boundary takes the wrong stage. §8 has no check for this.
- **Speed:** content agents set their own stage speeds with no floor. The espresso pour or the scoop could become a reaction test, and an announced stage should hold about 4 s or more.
- **Wording:** "stop the pour at the line" and "round and full" describe a picture, not named stages.
- **Sushi:** "Timed may stay a pick" leaves the decision to two different agents.
Add:
- "The cooking clock freezes while either switch is down, so Take It Off takes the stage showing at keydown, however long the press. dom-play holds it 3 s across a stage boundary."
- "Every stage set is at least as slow as the diner: Very Slow 12 s, Slow 8 s, Normal 5 s per stage, the wanted stage ×2. Schema enforces this."
- "Every Timed stop is a named stage, spoken on change and shown on the gauge as a word plus a mark."
- "Timed sushi stays a pick."

7. MAJOR — §6.2 court lines and §6.3 tutorial, results and events: outcomes that are never spoken
Problem:
- With Character Voices Off, `BB.audio.say` returns at once (audio.js:73). The first-visit tutorial then loses Mitch's teaching, and its warnings refuse a press with no explanation. That breaks A §9: "speak … on error".
- The event intro and the court moments go silent the same way.
- The court's own prompt is not defined. With Mitch on, the goal is said twice before every scan; with Mitch Off, it is never said.
- Under Hints Only, it is unclear whether `court.*` lines are hints or jokes.
- `court.return` plays on every return, a wait before every scan.
- The goal line's blanks are not agreed between court-rules, content-cast and core-b.
Add:
- "Tutorial lines and warnings ignore Assistant Manager and Character Voices Off. With Off, they are spoken in the game's voice and captioned."
- "The results card says stars gained, a restaurant opened, the gold sign and the celebration. An event names itself when it starts."
- "The court prompt is 'Food court.', plus any news and the next goal only when Mitch won't say them."
- "`court.*` lines are hints. `court.return` plays only when the goal has changed. Court lines may use {next}, {count} and {stars} from `nextGoal()`."
- "Help says each open restaurant's stars and the next goal."

8. MAJOR — §0 rule 7 "never more than five stops on one level", against §6.3 Pause and §6.4 Settings
Problem:
- Rule 7 limits every card to five stops, but the restaurant Pause has 7 items and Settings about 17.
- rules.md, which rule 7 cites, applies the limit only to the line and the court ("Settings has 18 items, Pause has 6").
- §6.4's list leaves out Sound Effects (a canonical row in A §7), Music and Back.
- §6.4 lists the hub rows last, out of the rulebook's order.
- The Graphics Quality row still writes a value nothing reads (rules.md §4).
Add: "The five-stop limit binds line screens, each court level and each tutorial-picker level. Pause and Settings keep the rulebook's flat lists. Settings order: Text to Speech · Voice · Cooking · Cooking Speed · Shift Length · Assistant Manager · Character Voices · Colour Profile · Motion · Text Size · Graphics Quality (id `graphics-quality`, through NarbeGraphics; the v3 migration hands the old `graphics` value to `setChoice` once, then drops it) · Auto Scan ('On — One Switch' / 'Off — Two Switches') · Scan Speed · Sound Effects · Music (or drop it; it plays nothing) · Reset Progress (two-step) · Back (to the card it came from: main menu, court Pause or restaurant Pause)."

9. MAJOR — §6.3 "its tutorial runs automatically with a spoken offer to skip"
Problem:
- This can be built as a card, as a Skip stop on the line (breaks 4 answers + Ticket + Pause), or as a Skip item in Pause (makes 8 items).
- It doesn't say whether Skip is recorded. bb-court has only `tutorialDone`, so the offer could come back on every visit.
- The tutorial's results card is not specified.
- Restart during a tutorial starts a real shift (flow.md §9.4).
- Finishing a tutorial clears a saved real shift (game.js:502), and the picker now reaches every restaurant's tutorial.
Add: "First visit opens that restaurant's tutorialOffer card at -1, spoken '<Name>. First time here? Mitch can walk you through one order.': Play the Tutorial · Skip It · Food Court. Both Play and Skip set `tutorialDone`. The tutorial never adds a stop to the line or Pause. Tutorial results: Start a Shift · Food Court · Exit Game. Restart in a tutorial restarts the tutorial. A tutorial never touches `bb-shift:<pack>`."

10. MAJOR — Pause during playouts (rule 7's Pause hold, plus the new playouts in §6.2 and §6.3)
Problem:
- flow.md §9 bug 1 is not in the spec. During an arrival `ctx` stays `'line'`, so a 5 s hold opens Pause while the customer keeps talking.
- The next `BB.ui.line()` then closes the Pause card, `paused` stays true, and the Timed clock freezes.
- The spec adds more playouts: zoom in and out, court moments, event intros.
- The new Food Court route sets `s = null` while a playout is still running.
Add: "game.js keeps a run counter. `pause()`, `leaveToCourt()`, `quit()`, `begin()` and court enter/leave bump it. Every playout returns if it changed across an await. `resume()` restarts the current screen; an interrupted arrival reads the ticket and starts the line. `BB.ui.line()` never closes a card it didn't open. The court's hold only works once its scan is live. dom-play holds Enter 5 s during an arrival and checks that Pause stays until Continue and the Timed clock runs afterwards."

11. MAJOR — §5 themes and §6.2 court art: High Contrast and the highlight
Problem:
- Content agents write `pack.theme` and page writes bb.css, both in phase 2, with no shared token list. The names won't match, and core-b's schema (phase 1) has nothing to check against.
- Nothing stops a theme from setting `--lit`, from using `data-theme` (which the Colour Profile setting already uses), or from being applied inline, where it beats High Contrast.
- The highlight is yellow #ffd400: about 1.4:1 on white and about 1.1:1 on pastel pink. On pizza red-and-white and ice cream pastel it is nearly invisible as colour (A §9).
- The court props could have painted words that ignore Text Size and High Contrast.
- The gold sign shows five stars by colour alone.
Add: "`pack.theme` keys are exactly the tokens in docs/map/ui.md (c), applied under `body[data-pack]`. Themes never set `--lit`, `--lit-ink`, the scan frame or the hold ring. High Contrast overrides every theme token. Colours the highlight or text sits on keep 3:1 against #ffd400 and 4.5:1 for text. Court art carries no words: name plates, star counts, 'Coming Soon', 'Grand Opening', 'Five Stars' on the gold sign and the board text are drawn in code at Text Size."

12. MAJOR — §6.2, §6.3 and §6.5: Reduced motion, flashing and court speech
Problem:
- Only the storefront zoom has a Reduced rule. Shoppers wander and the shutter rolls with none.
- The celebration's fireworks have no no-flash rule. The hub precedent is Magic Button: no full-screen flash.
- Seven food agents will build spins, rolls, wraps and pours with no `reduced()` rule.
- Under Reduced, the gross-out fly is never placed and sits inside the food (world.md §7).
- Shopper chatter is scripted with no rule against TTS while the scan is live, and `NarbeVoiceManager.speak` cancels scan labels.
Add: "Under Reduced: shoppers stand still, each court moment cuts to its end state with its words, every food module resolves at once (`k.reduced()`), and gross-out fx sit still on top of the food. Fireworks never flash the whole screen or strobe (at most 3 flashes a second). Shopper chatter is caption-only, never TTS, and never over the highlighted storefront. No ambient loop plays under speech. dom-play checks that no speech the scanner doesn't own starts while a scan is live."

13. MAJOR — §4.2 "The Orders setting goes away"
Problem:
- Orders was the only order-size setting. From 3 stars every restaurant serves two-item orders, about twice the presses.
- Every unlock after the 4th needs all open restaurants at 4 and then 5 stars. A player who tires can't progress without that extra effort (A §1: "give the player a way to choose how hard the game pushes back").
- There is no press budget. Odd orders with repeats have no limit: the Tower's five patties against a grill max of 3, the ten-scoop tower, seven extra shots.
- words.js number words stop at six.
Add: "Keep `orders` as Order Size: Follow the Stars (default) / One Item. One Item makes every order, odd order and event order one item; stars and unlocks still count. Node check: in Simple, a level-1 item takes the diner's 13–14 presses or fewer, and no order at any level takes more than 28. Repeats stay within the step's max; bigger numbers are only jokes. Number words cover every count used. Any step added for odd orders or events uses `when`."

14. MAJOR — §6.6 per-character TTS voices, and §9 ownership
Problem:
- `NarbeVoiceManager.speak` always uses `getCurrentVoice()` and ignores `options.voice` (shared/voice-manager.js:132), so audio.js alone can't give characters their own voices.
- shared/voice-manager.js is used by every hub app and is owned by no agent.
- The audio agent will either edit that shared file, or call `speechSynthesis` directly and keep its own TTS state (A §5 forbids this).
Add: "Do not edit shared/voice-manager.js. audio.js speaks a character line by calling `NarbeVoiceManager.cancel()`, then `NarbePlatform.speech.speak(words, {voice, pitch, rate, volume})`, and only when `NarbeVoiceManager.getSettings().ttsEnabled` (otherwise it stays silent for reading time). It races `finished` against `getSpeechTimeout`. `BB.audio.stop()` cancels it, and scanner speech always wins. Voices come from `getEnglishVoices()`, never the current scan voice when another exists; with only one voice, pitch and rate tell characters apart."

15. MINOR — §6.1, §6.2 and §8: scan order, returns, pointer and checks
Problem:
- The scan order of the flat court list, the parts and the tutorial picker is not defined.
- At 6 open, the right part holds only Sushi, which costs an extra press plus a Back loop.
- "Menus open unhighlighted" doesn't cover Back from Settings or Cancel on a confirm; both restore by id today. The user's standing note says -1 even on Back.
- No pointer route reaches a storefront inside a part.
- The court Pause's Exit confirm is not stated.
- §8 leaves out the checks listed in rules.md §9.
Add: "Scan order follows the U: left 1, left 2, bottom 1–3, right 2, right 1, in the flat list, the parts and the picker. A part with one open restaurant appears at the root as that shop. Every card, the court and each part open at -1, including Back and Cancel returns; only rows restore by id. A click or tap enters a storefront from any level. Court Pause Exit confirms ('You will go back to the hub.', Cancel first). dom-play asserts -1 on every open, at most 5 stops per court level, and parts of at most 3 shops plus Back."