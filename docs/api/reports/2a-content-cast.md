# Phase 2a report: content-cast (2026-11-08)

## Report: lane content-cast, 2a review

### Files

- Reviewed and edited: `C:/Users/ass/OneDrive/BEN'S SOFTWARE/Documents/Python Projects/Benny's PC Hub/bennyshub/apps/games/BENSFOODCOURT/packs/cast/script.js` (312 lines, format 3, 243 lines of script) and `.../BENSFOODCOURT/packs/court/script.js` (113 lines, format 3, 68 lines of script). Ids unchanged.
- Backups (new, nothing overwritten): `.../BENSFOODCOURT/docs/backup/packs/cast/script.js.before`, `.../BENSFOODCOURT/docs/backup/packs/court/script.js.before`.
- Written: `.../BENSFOODCOURT/docs/api/cast-script.md`. Both file headers already pointed at it, but the earlier run was cut off before writing it. It says what each file holds, the per-speaker counts, what pack scripts still write for the eleven cast people (three own `react.3/2/1` per restaurant; usual/twin/dislike/favourite/visitor.arrive; never a mention), the `{about}`/`{goal}`/`{name}` grammar, the play order on returning to the court, and the voice-pass notes.

### What I checked

Every line of both files against spec 0.5/0.6, DESIGN.md "Writing tone" and its cast table, cast.js who/voice, the proposal's briefs and "Regulars across the court" table, and the diner script's established voices. A scan script (scratchpad) counted lines, rendered every `{about}` with BBCourt `said`, every `{goal}` with the five goal clauses and every `{name}` with the seven full names, and flagged food words in anywhere-lines, "you/your", speed/skill words and loud/rasp delivery notes. I also checked the two art-dependent mentions against the backdrop prompts: the Cafe's crowned coffee bean (Reginald) and the fire extinguisher by the hottest sauce at Ben's Burritos (Dale) are both in the prompts.

Result: the writing holds. Every mention matches the proposal's table for what that person orders there; every blank reads mid-sentence; no line mentions speed or skill; no swearing; the humour is pigeons, Delores, Gerald and the doctor, never an accent; the anywhere-lines name no restaurant's food (only meal words and a traffic cone). Note on the brief's "a food name in a cast line": the mention lines do name food, by contract. A mention is about another restaurant, never the one it is said in, and the brief asks it to be true to what the person orders there, so docs/api/script.md's own example (`two of every roll`) names food. I left those. Sal's hot dogs are his cart's, not a restaurant's; Oakes's onion paper says "a certain bulb".

### What I changed (three lines of words, 31 delivery notes)

1. `priya/greet.c4`: "Hello. Yes, these are scrubs. No, I won't look at your rash." → "...No, I won't look at anybody's rash." The old line put a rash on the player (spec 0.5; ACCESSIBILITY §1 respect for the player).
2. `priya/mention.c4` (about diner): "I order breakfast at {about} at nine at night, and I don't want to talk about it." → "I have dinner at {about} at seven in the morning, and I don't want to talk about it." The diner pack has no breakfast item (grep: no pancake/breakfast), so the old line was untrue to the restaurant; her DESIGN.md quirk (meals at the wrong hour, refuses to discuss it) survives.
3. `sal/greet.c3`: "Ay, how ya doin'? Don't answer. I'm starvin'." → "Ay, how ya doin'? Me, I'm starvin'. That's how I'm doin'." "Don't answer" snapped at a player who cannot answer; the joke now stays on Sal. Delivery 'loud, friendly' → 'gruff, friendly'.
4. Delivery notes only, no words changed, per DESIGN.md's voice test ("her delivery notes ask for firm, not loud"; loud/rasp words made the clones shout and distort, and `tools/voices.json` already has `calm: true` for Bev): Bev's 26 notes 'booming, …' → 'firm, like a coach, …', bare 'booming' → 'firm and commanding, like a coach' (the diner's wording), 'one sharp whistle, then booming' → '…then firm and commanding', including `bev/cheer.1` in the court file; `sal/cheer.1` 'loud, delighted' → 'gruff, delighted'; `dale/greet.c1` 'slow, gravelly drawl' → 'slow drawl, unhurried'; `brock/cheer.1` 'loud, eager' → 'eager and hyped, big grin'. Bev's section comment now states the rule. Where this follows DESIGN.md over the lane brief's "match cast.js voice" (cast.js still says "booming"), that is deliberate.

Kept after consideration: Bev's "Hit the showers! Not you! ME!", Dale's "Check your tire pressure", Marge's "Wear a coat" (pleasantries, joke on the speaker); the two Kai/Reginald "novel you can hold" lines are a deliberate cross-reference and never meet (one visitor per shift).

### Counts (unchanged)

greet / smalltalk / goodbye / mention: marge 6/7/6/7, gus 6/7/6/7, bev 6/6/6/7, vernon 6/6/6/7, sal 6/6/6/7, dale 4/5/4/7, priya 5/5/4/7, oakes 4/5/4/5 (burrito pizza diner cafe icecream), tasha 4/5/4/4 (smoothie pizza diner icecream), reginald 4/5/4/7, kai 4/5/4/7. Every person has a mention for every restaurant they visit. Court: Mitch return 8, unlock 4, goldSign 4, celebrate 3, promoted 3; pa announce.open 4, announce.gold 4; shopper chatter 16 (none names the player; each true at any point in the game); court.cheer 1 each for all 22 customers in cast.js (5 regulars, 4 recurring, 2 visitors, 11 locals), none missing.

### Tests

- `cd ".../BENSFOODCOURT" && node --test "tests/script.test.cjs"`: 17 tests, 15 pass, 0 fail, 2 skipped (diner and pizza "its script… covers every moment": their packs are not at format 3 yet, other lanes). checkCast with all seven pack ids, checkCourt and courtCoverage all pass. Same result before and after my edits.
- `node --test "tests/*.test.cjs"`: 226 tests, 218 pass, 0 fail, 2 skipped (the same two), 6 TODO (all "js/food/pizza.js is not written yet", the food-pizza agent's lane). No failure from any lane.

### Flags for the final voice pass

- Bev: `tools/voices.json` `calm` gives the model her lines with full stops and lower case; captions keep the caps and "!". Every note of hers now says firm, never loud.
- Marge: voices.json respells "hon" → "hun" for the model; the lines keep "hon" (comma before it) for captions.
- Tags kept for recording, dropped for TTS/captions: `[sigh]` (Vernon, Lulu), `[whistle]` (Bev goodbye.c5: TTS says just "Bev OUT!"), `[sings] Laaaa!` (Tony's cheer: TTS will read "Laaaa"), `[peels tape]` (Mitch promoted).
- Gus and Sal keep the diner's dialect spellings (drivin', ain't); Dale and Inferno's cast.js voice briefs still say "gravelly", which round 2 avoids in voice designs.
- Two mentions can never play as spec 5.4 stands (Dale's about the diner, Priya's about the Cafe); they are there for a second restaurant and cost nothing.

### Not done / Requests

- Nothing outstanding in my lane. Request to the page agent: pass `said` from BBCourt into `SC.pickMention`, play `pa` before Mitch on a gold sign or opening, and use the locals' cheers when they are drawn (court-rules says "every drawn regular"; the 11 locals have one each).
- Request to the diner-script and content-pizza agents: the eleven cast people already meet the variety minimum for greet/smalltalk/goodbye from the cast file; their packs still need three own `react.3`, `react.2` and `react.1` per visiting regular (a 'customer' fallback does not count toward min 3).
