1. **[BLOCKER] §5 ("a full script"), §8 ("script coverage"), §9 (content-\*, core-b).** The spec leaves out the proposal's whole script section.
   - **What is wrong:**
     - The engine only plays today's moments: greet, order.usual/twin/dislike, react.\*, complain.\*, after.\*, nearly, gross.\<id\>, shift.start/end, and tutorial.\* keyed on 'grill'/'board' (game.js:265).
     - Many proposal lines have no moment id and no time to play: small talk while the food is made, goodbyes, mentions of other restaurants, the unique customers' gags, how a ridiculous order is said, Mitch's tutorial line for every station, his uniform jokes, the five-star intro and celebration, shoppers' chatter, storefront announcements, and the gold-sign and grand-celebration cheers. §6.2 names only four Mitch court moments.
     - "Naming exactly what was wrong" fails for the new picks. complain.pick is "That's not what I ordered.", and script.test only allows the blanks {ing, ings, want, name}.
     - The diner's shared `customer` lines are about burgers ("Now that is a burger.").
     - No minimum number of variants ("several variations each"). No rule for which file holds a regular's lines for one restaurant versus packs/cast/script.js.
     - Seven content agents and the page agent write in parallel, so moment names will differ, and the §8 coverage check has no list to check against.
   - **Add §5.1 "The script".** core-b exports this as `SC.MOMENTS` in js/core/script.js and docs/api/script.md; game.js and the coverage test read it.
     - **Customers**, at every restaurant they visit. Each pack writes its own `customer` fallback lines.
       - greet; order.usual; order.twin; order.dislike {ing}
       - order.gag: their running gag, said after the order, about 8 s at most
       - order.odd.\<oddId\>: oddOrders[].say names this moment
       - smalltalk
       - react.3/2/1; react.favourite; react.gross
       - complain.extra/unasked/missing {ing}; complain.tooMany/tooFew; complain.done {want}
       - complain.pick {slot}{want}, e.g. "I said white sauce"
       - complain.more; complain.gross.\<id\> {ing}
       - goodbye
       - mention {about}: only in packs/cast/script.js. Said only when that restaurant is open and is not this one, at most once per shift.
     - **Mitch:**
       - shift.start; shift.end
       - uniform: on the first shift at a restaurant each session
       - tutorial.intro/ticket/review/serve/gross
       - tutorial.\<stationId\> for every station; tutorial.cook.\<stationId\> for every cook step
       - tutorial.warn.\*, with warn.pick {slot}{want}
       - gross.\<id\> for every gross-out; nearly {want}; after.3/1/gross
       - event.intro; event.celebrate; event.again
     - **Court** (packs/court/script.js):
       - Mitch: court.return {goal}, court.unlock {name}, court.goldSign {name}, court.celebrate, court.promoted.
       - A new cast speaker `pa` with its own voice: court.announce.open/gold {name}.
       - `shopper`: court.chatter, captions only while a scan is live.
       - Each regular: court.cheer.
     - **When they play:**
       - smalltalk once per order, in the playout after the last station and before the review.
       - goodbye after the reaction and complaints, before the receipt.
       - Both are skipped when Character Voices is Off.
       - Every character line plays only while the scan is suspended.
     - **Files:** packs/\<pack\>/script.js holds every line about that restaurant's food, including the regulars' lines there. packs/cast/script.js holds only lines that work anywhere: greet, smalltalk, goodbye, mention.
     - **Variety:** at least 3 variants per speaker for greet, smalltalk, goodbye and react.3/2/1. At least 2 for each Mitch gross-out and tutorial moment.
     - **Allowed blanks:** ing, ings, want, name, slot, got, count, goal, about.

2. **[MAJOR] §0.7, with §6.3 Pause and §6.4 Settings.**
   - **What is wrong:**
     - (a) §0.7 says cards and the court "act on key down", and cites docs/map/rules.md, which says the opposite. Choices act on release (ACCESSIBILITY §2 and §4); the Space brake is the only keydown action. The real in-play problem is in rules.md §1 (no-short-taps row): Timed Take It Off reads the stage on release while the clock keeps running under a held switch. The spec never fixes it.
     - (b) §0.7 caps every card at five stops, but the restaurant Pause has 7 items and Settings has 17.
     - (c) The proposal's Pause has five items: Resume · Ticket · Settings · Back to Food Court · Exit. The spec swaps in Continue, Help, Restart and Main Menu, which ACCESSIBILITY §7 justifies, but doesn't say so. It drops Ticket with no reason.
   - **Add to §0.7:** "Every choice acts on release; only the Space brake acts on keydown. Line screens, the court and the tutorial picker never offer more than five stops on one level. Settings and Pause are flat cards and are exempt, as in the Burger Bar. In Timed cooking the clock holds while any switch is down, so Take It Off records the stage shown when the press began."
   - **Add to §6.3:** "Pause: Continue · Ticket (speaks the order without closing; off when there is no order; from the proposal) · Help · Restart Shift · Settings · Food Court · Main Menu · Exit Game. Continue, Help, Restart Shift and Main Menu come from ACCESSIBILITY §7, which outranks the proposal."

3. **[MAJOR] §4.1 "Leaving mid-shift" against §6.2, §6.3 and §8.**
   - **What is wrong:**
     - §4.1 clears the saved shift when the player leaves by Food Court, Main Menu or Exit, and keeps nothing if fewer than 3 orders were served.
     - §6.2 ("shift in progress") and §6.3 ("A saved shift there resumes") assume the shift is still there.
     - ACCESSIBILITY §7 says a tired player "should come back to where they were".
     - Today's Pause promises "This shift is saved, and you can continue it later."
     - The proposal says leaving "keeps what's been earned so far". The 3-order cut-off throws away one or two served orders.
     - core-b's banking and the page's leaving will be built the opposite way.
   - **Replace the §4.1 bullet:** "Leaving mid-shift (Food Court, Main Menu, Exit Game, or the hub closing the game) never ends or clears the shift. It stays in bb-shift:\<pack\>, the storefront says 'shift in progress', and entering resumes at the next customer. Its served orders count once, when it finishes. Only Restart Shift (confirm: 'This shift's orders start again.') discards it. Every leave confirm says 'This shift is saved.'"
   - **In §8:** replace "banking a left shift" with "a left shift resumes and counts once when finished".

4. **[MAJOR] §2 ("the proposal's table ... is the brief"), each restaurant's own customers, §0.6, §5.** The brief is handed over with no rules for adapting it.
   - **What is wrong:**
     - **Order-size gags break §0.6:** Gus's "two coffees and a dozen donuts" and "two of every roll", Pam "for twelve", Rita "one of everything", Brock "all the protein".
     - **Vernon at sushi** "judges it alongside Chef Hiro", which puts two customers on one ticket.
     - **Sal at the smoothie shack** "refuses, then orders anyway", which reads as changing his mind.
     - **Things the line doesn't have:**
       - Bev's pickled jalapeños (not a burrito topping) and "Meat lover's" (not on the pizza menu).
       - Marge's "cream, two sugars" (§5 hedges "sugar if ... needs it") and "bean and cheese" (protein has no None).
       - Gus's "two larges" (pizza has no size).
       - Vernon's "extra hot" and "nothing touching".
     - **Long gags:** Breeze's very long order adds dead time before the line starts.
     - **Likes and dislikes across menus:** nothing says how "same likes and dislikes everywhere" works (Sal's lettuce, Oakes's onions). Nothing says what cast.js "traits" holds versus a pack's regulars entry, and the cast and core-b agents settle that in parallel in phase 1.
   - **Add to §2, "Adapting the brief":**
     - "Order size always follows the level (§4.2). Size gags are said, never made: Gus gets two of one thing wherever the level allows two items. 'A dozen', 'two of every roll', 'for twelve', 'one of everything' and 'all the protein' are order.gag lines over a normal order."
     - "Anything the line lacks is a line, except these values, which the content agents add: burrito topping Jalapeños, burrito protein None, pizza recipe Meat Lover's, and cafe Sugar (an Add, max 2, only when the drink is Drip). Pizza has no size; 'two larges' is said."
     - "Vernon orders alone at sushi; his lines mention Chef Hiro. Sal's refusal is his greet line; his order never changes. Long gags (Breeze, Lulu) are one order.gag line of about 8 s at most."
     - "cast.js holds who someone is everywhere: id, name, art, scale, who, voice, tts, twin, exact, short, tipScale, threeStarScale. Each pack's regulars entry holds what they order there: likes, usual, favourite, dislikes (that pack's ingredient ids), visitor, level."
     - "Sal dislikes lettuce in every pack that has it. Oakes dislikes onions in every pack that has them; pico does not count."

5. **[MAJOR] §4.3 five-star event, and the §5 event entries.**
   - **What is wrong:**
     - "Group orders ... just bigger orders" leaves open who stands at the counter. The wedding party, the office building, the volleyball teams and the Little League team have no art, and a customer without art never comes in (§3).
     - It doesn't say how big an order can get (§0.6, the review's item row, number words).
     - Some finales can't be made: Inferno's burrito "with every sauce" (hot sauce is one pick), the Kitchen Sink, and the heart pizza "if shapes exist".
     - "Chef Hiro's approval gives the gold sign" competes with "a good event shift gives the 5th star".
   - **Add:**
     - "An event is 5 orders; Shift Length does not apply. Each order comes from a cast member with art who visits this restaurant. Groups without art are spoken of, not shown (Bev orders for her team)."
     - "At most 3 items per order, each a normal recipe on the normal line. 'Giant' is the look (an item flag the food module draws bigger) and the ticket's name ('The Kitchen Sink'), never extra choices. The sink holder and the heart crust are values of event-only recipes (recipe.level 'event')."
     - "What the line can't make is said: Inferno's 'every sauce' is hot sauce Hot plus his line."
     - "The event is good, and gives the 5th star and gold sign, when its average is at least 2.0, like any shift. Chef Hiro's order comes last, and his reaction is the approval."
     - "Mitch says event.intro before the first order, event.celebrate after a good event, and event.again after a failed one."

6. **[MAJOR] §5 gross-outs, §9 core-a ("gross-outs on any step"), §0.8.**
   - **What is wrong:**
     - The spec says DESIGN.md's rules hold everywhere, and DESIGN says gross-outs happen "only ever on an Add step". The spec then allows them on any step without saying how the player catches them.
     - **Cook and automatic steps:** burnt crust (oven), sock in the blender, a burrito that bursts (automatic wrap), melted puddle (scoop). On these steps there is no Swap It, and in Simple a "burnt" result breaks "always comes out as chosen".
     - **Four-value picks:** burnt coffee on the 4-value drink pick and spoiled milk on the 4-value milk pick. Swap It would be a 5th answer, over §0.7's limit of 4.
     - **Paged picks:** freezer burn on the flavour pick, which already pages with More….
   - **Add:**
     - "A gross-out is always a bad thing offered before it is used, on an Add step or on a pick of at most 3 values. Swap It is one of at most 4 answers, and the spoken label names the problem."
     - "A gross-out is never the result of a cook or automatic step. Overcooking stays a Timed doneness mistake. This extends DESIGN's Add-only rule on purpose."
     - "Content agents move or replace gross-outs that can't sit on such a step (e.g. the sock goes in the ice Add; the burst burrito becomes a torn tortilla at the style pick) and list each change in their report."

7. **[MAJOR] §6.6, §9 audio: per-character voices can't be built as written.**
   - **What is wrong:**
     - `NarbeVoiceManager.speak` always passes `getCurrentVoice()` and ignores `options.voice` (shared/voice-manager.js, inside speak()).
     - Nobody owns shared/, and the spec doesn't say whether to edit it (a file every hub game uses) or go around it. The rulebook forbids calling speechSynthesis directly.
     - Nothing checks that characters sound different from each other.
   - **Add:**
     - "js/audio.js speaks character lines with NarbeVoiceManager.cancel(), then NarbePlatform.speech.speak(text, {voice, pitch, rate, volume}). It speaks only when NarbeVoiceManager.getSettings().ttsEnabled is on, caps waiting with getSpeechTimeout(text), never calls speechSynthesis, and does not edit shared/."
     - "Voices come from getEnglishVoices() after waitForVoices(). Use the first tts.voices fragment that matches; otherwise hash(id) % n, skipping the player's voice. Cache the choice and pick again when the voice list changes."
     - "Scan labels, the ticket read-out and the Hear It Again summary stay in the player's voice."
     - "§8: no two speakers heard at one restaurant share the same voice, pitch and rate."

8. **[MAJOR] §1 and §6.3, first-visit tutorial ("skippable", "a spoken offer to skip").**
   - **What is wrong:**
     - No switch route to Skip is defined. Line screens can already hold 4 answers plus Ticket plus Pause.
     - Today's game asks first with a card (tutorialOffer). docs/map/rules.md §9 proposes a card with a Food Court item. The proposal says the tutorial "runs automatically".
     - The spec doesn't say that skipping sets tutorialDone, or where the tutorial ends.
   - **Add:**
     - "First visit (tutorialDone false): the tutorial starts at once with tutorial.intro, which says Pause has Skip Tutorial."
     - "The tutorial's Pause card adds Skip Tutorial after Continue. It asks first, with Cancel first, and says: 'Skip the tutorial? You can play it from the main menu.'"
     - "Skipping or finishing sets tutorialDone. Skipping starts a normal shift. Finishing, and a replay from the main menu, opens results with Start a Shift · Food Court · Exit Game. No line screen gains a stop."

9. **[MAJOR] §5 Themes and §3 props: re-skinning has no shared format.**
   - **What is wrong:**
     - The proposal re-skins the ticket carousel, Pause sign, Add/Skip controls, review, register and star card. The spec gives colour words only, with no `pack.theme` format.
     - The content agents (pack.js) and the page agent (bb.css, stage.js) write the two halves in parallel in phase 2, so the keys won't match.
     - The Pause sign, register, bell and ticket-wheel art are single shared images (packs/shared/art/props), which colour tokens can't re-skin. The spec neither drops that part nor allows a restaurant its own prop images.
   - **Add:**
     - "pack.theme is a flat map whose keys are exactly the tokens in docs/map/ui.md (c), plus board and wood, camelCased."
     - "bb.css defines each token with today's diner value as the default, and stage.usePack writes the pack's values on :root. Packs never set --lit or --lit-ink, High Contrast wins, and Add/Skip/Swap keep their icon and word."
     - "Prop images stay shared and are not re-coloured, a deliberate narrowing of the proposal, unless packs/\<pack\>/art/props/\<name\>.webp exists, which the stage then uses first."

10. **[MAJOR] §4.1, §6.2, §6.3: the grand celebration and gold-sign moments are dropped.**
    - **What is wrong:**
      - The proposal's finale has three parts: fireworks over the court, every regular comes out to cheer, and Mitch is promoted, peeling the ASST. tape off his badge. The spec has only "Grand celebration (once)" and the court.celebrate line.
      - No agent is told to build it, and no art exists for the promoted Mitch. Every pose and uniform prompt keeps the taped badge.
      - The gold-sign celebration is only a Mitch line, and that is skipped when Assistant Manager is Off.
    - **Add to §6.2, "Moments on the court"** (page agent in js/court.js; art and sound needs listed for the coordinator and audio):
      - "Grand Opening: the shutter rolls up (a cut under Reduced), the banner stays until the first visit, and the PA says court.announce.open."
      - "Gold sign: the gold sign drops onto the sign board with sparkles. The PA says court.announce.gold and Mitch says court.goldSign."
      - "Grand celebration (once, on the first return after the seventh gold sign): fireworks with no full-screen flash (under Reduced, still bursts that fade). Every regular with art stands on the floor in happy or laughing and says one court.cheer. Mitch says court.celebrate, then court.promoted as the ASST. tape comes off; add a `promoted` pose to the art list. The board then reads 'All seven at five stars'."
      - "All of it is said before the court scan opens. The pops are short, quiet and below 2.5 kHz."

11. **[MINOR] §6.4 Settings.**
    - **What is wrong:**
      - The proposal asks for "sound and music volume". The spec's row list leaves out Sound Effects and Music (only "every current row except Orders" implies them) and keeps them On/Off.
      - The game has no music (flow.md §9: the Music row plays nothing), and no agent is asked to make any.
      - The listed row order differs from today's canonical order.
      - Removing Orders also removes the only in-game dial for how complex orders are (ACCESSIBILITY §1, "build for the whole range"). Once a restaurant reaches 3 stars, every shift has two-item orders and gross-outs, for good.
    - **Add:**
      - "Rows in order: Text to Speech, Voice, Cooking, Cooking Speed, Shift Length, Assistant Manager, Character Voices, Colour Profile, Motion, Text Size, Graphics Quality, Auto Scan, Scan Speed, Sound Effects (Off/Low/Medium/High), Music (Off/Low/Medium/High), Reset Progress, Back."
      - "Decide music: either the audio agent makes one quiet loop for the court and one per restaurant, or the Music row is left out until music exists."
      - "Say why Orders goes, or keep 'Orders: Follow the Stars / Keep It Simple'."

12. **[MINOR] §5 cooking steps.**
    - **What is wrong:**
      - **Changes from the proposal that are hedged or not stated:**
        - Sushi Timed "may stay a pick"; the proposal stops the knife on each cut line.
        - Burrito "press and lift" and donut "flip and pull" aren't addressed.
        - Espresso Simple "Short/Regular/Long" is new; the proposal gives espresso no Simple choice, which implies automatic.
      - **Per-restaurant cooking words and the Timed control are undefined.** words.js says "How done?" and "Take It Off", and the Timed control is the burger spatula.
      - **The ice cream's shake machine** has no station or backdrop (the backdrops are counter, scoop, toppings).
    - **Add:**
      - "Sushi Timed is the same pick as Simple; a cut on each line would be several timed presses. This is a deliberate cut."
      - "Burrito and donut Timed are one stop each."
      - "Espresso Simple is automatic to the ticket's pour (`simple: 'auto'`), as proposed, unless Short/Regular/Long is kept with a stated reason."
      - "Each stage set names its words (ask/stop, e.g. 'Pull It Out', 'Stop the Blender', 'Stop the Pour'). Each cook station names its Timed control prop (peel, blender switch, fryer basket, scoop), falling back to a drawn button."
      - "Milkshakes use a 'shake' station drawn on the scoop backdrop."

13. **[MINOR] §6.2 court presentation.**
    - **What is wrong:**
      - The proposal's crowd is "a line out the door and full tables", with shoppers wandering through the seating area. The spec has crowds in front of the counters "avoiding the tables", no seated diners, and no rules for how shoppers move.
      - It doesn't say to leave out a part with no open restaurant (with 5 open, Right is empty).
      - Part labels are undefined, and it's unclear how long the Grand Opening banner stays.
    - **Add:**
      - "Crowd by popularity: 0–2, one or two shoppers passing. 3–6, a short queue. 7–9, a queue out the door plus diners at the nearest tables. 10, every nearby table full. Table seats are measured into the court.js layout."
      - "Shoppers stroll slowly and never jump; under Reduced they stand still."
      - "A part with no open restaurant is not scanned. Part labels read like 'Left. Smoothie Shack, Burritos.'"
      - "The Grand Opening banner stays until the restaurant's first visit."

14. **[MINOR] §2 and §4.3: cast wiring.**
    - **What is wrong:**
      - Special visitors "plus each restaurant's choice" is unspecified.
      - The proposal's four-star "rush of a sports team" and "celebrity" are dropped without saying so.
      - Cross-restaurant cameos ("a character from one restaurant could show up as a customer in another") are missing, and docs/map/tests.md even proposes testing that each restaurant's own customers appear only there.
      - `mitch-burger` breaks the `mitch-<pack>` pattern for pack `diner`.
      - "Uses its uniform's art when it exists" doesn't say per folder or per pose, and the remaining poses arrive during the build.
    - **Add:**
      - "Visitors: Reginald and Kai everywhere at level 4, plus Chef Hiro at sushi. The sports-team rush is the Burger Bar's event; the celebrity is dropped (no character)."
      - "A content agent may add one other restaurant's own customer to its regulars as visitor: true, level: 4 (a cameo)."
      - "pack.manager.art names the uniform folder: 'mitch-burger' for diner, 'mitch-\<pack\>' otherwise. Once a uniform's neutral exists the whole folder is used, and a missing pose falls back to that folder's neutral, never to plain mitch."

15. **[MINOR] §9 phases against the proposal's build order.**
    - **What is wrong:**
      - The proposal builds the court with the Burger Bar under it first, then the six restaurants "starting with the Pizza Parlor" (the engine already has a test pizza pack), then Ben playtests and press counts and timing are tuned.
      - The spec starts all seven content packs at once against a brand-new core API: no pilot, no playtest step, and no press-count reporting. Too many presses was what led to the M2 redesign.
    - **Add:**
      - "Phase 2 starts with page, content-diner and content-pizza (then food-pizza) as the pilot. The other five content/food pairs start once the pilot's docs/api notes exist."
      - "Every content agent reports the Simple press count of each recipe at each level, and flags any item over the Tower's 14 line choices."
      - "Phase 4, after this build: Ben's playtest of the court and each restaurant, with press counts and timing tuned from it."