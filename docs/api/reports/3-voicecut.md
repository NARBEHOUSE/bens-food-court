# Phase 3, lane voicecut: the voice script cut (2026-11-10)

The user approved cutting the voice script. No recordings exist; every line is text to speech until a future voice
pass. Nothing went to any games.json, the F: drive or the website.

## The new design

- **A customer's complaint names no food.** New moment `complain` (customer, min 8, fallback): one short line in their
  own voice when a served order has a mistake that is not a gross-out. All 22 people who come to a counter have 8 to
  10 in `packs/cast/script.js` (187 lines, locals too), true at any restaurant and for any kind of mistake. Their best
  old jokes were kept food-free (Sal: "Hey. HEY. This ain't what I said." / "What am I, talkin' to the pigeons here?";
  Vernon: "Noticing is my cardio."; Kai: "I don't make typos. I'm ten. I don't type."; Bev: "That's a FUMBLE!").
- **Mitch reads the mistake** (`mistake.extra/unasked/missing/tooMany/tooFew/done/pick/more`, one line each per pack,
  from the ticket so no pronoun is needed): "The ticket said no onions." / "Nobody ordered cherries." / "The ticket said
  pickles. That got left off." / "The ticket said medium." / "The ticket said thin crust." / "The ticket said two
  sugars. We came up short." Up to two (one after a gross-out), then `mistake.more`. Skipped with Mitch Off or
  Character Voices Off; the receipt and Hear It Again still list every mistake.
- **New blank `{wanted}`**: the ticket's value said whole (`W.wantedSay`, `W.countSay`): "no rice" for a None value
  (was "rice: none" / "I said none"), "a vanilla scoop" for one pick of a repeat, "one patty" / "no scoops" for counts.
- **Gross-out complaints** (`complain.gross.*`) now take no blanks: the 70 lines that used `{ing}`/`{value}` name the
  event's own food in plain words ("There's a hair in the beans.", "This cherry is a tomato.", "my burger").
- **Tutorial warnings** stay per value in Mitch's voice, listed only for what the tutorial order runs through
  (`SC.varsFor` narrows by `pack.tutorial`: its Add steps, its own ingredients, its holds and the customer's dislikes,
  its picks, its one gross-out): 780 clips to 386.
- **`nearly`** no longer names the customer (6 lines): one clip per stage, not per stage per customer (289 to 67).
- **Vernon's "exactly one"** at the Emporium (content-icecream's request): `smalltalk.scoop`, "I take one scoop.
  Exactly one. The ticket may say otherwise. The ticket does not have a blog." True with one scoop or two.

## Grammar fixed (every value of every slot generated and read)

- "there's no {ing}" with plurals ("there's no sprinkles") in 6 warnings: now "the ticket has no {ings}".
- Mitch's diner `hair.1` "a hair on that pickles": now "on the {ing}".
- Pick warnings "the ticket says none" / "{slot}, {want}": now `{wanted}` ("The ticket says no protein.").
- The old customer complaints with these faults (Reginald's "There is sesame seeds", "I said no {ing}" with plurals)
  were deleted with the moments.
- `tests/clips.test.cjs` now plays every mistake the judge can make through Mitch's readout at all seven and fails on
  an unfilled blank, "one <plural>" or "none <noun>".

## Files changed (backups in docs/backup/, next free suffix)

- `js/core/script.js` (.before-2c): MOMENTS (8 complain.* out; `complain`, 8 `mistake.*` in; `complain.gross` no
  blanks; `{wanted}` in BLANKS/VARYING), `clipValue`, `words`, `varsFor`/`tutorialReach`/`allVarsFor` (counts, tutorial
  narrowing).
- `js/core/words.js` (.before-2a): `blanks` gives `wanted`; `wantedSay`, `countSay`.
- `js/game.js` (.before-2g): the serve: react, `complain`, Mitch's readout, goodbye; `mistakeMoment`.
- `packs/{diner,pizza,cafe,smoothie,burrito,sushi,icecream}/script.js`: 418 per-food complaint lines deleted, 70 gross
  complaints rewritten, Mitch's readouts and two 'customer' fallbacks added per pack, the warning and `nearly` fixes.
  `packs/cast/script.js`: the 187 complaints.
- `tools/voice-clips.cjs` (.before-2a): `all` lists each clip id once (cast lines filed under `cast` and its
  manifest); a by-speaker and by-moment tally on stderr.
- Tests: `tests/script.test.cjs`, `tests/clips.test.cjs` (+1 test), `tests/words.test.cjs`, `tests/dom-play.cjs`
  (a run counts `complaints` and `readouts` and fails on any line said with a blank left in it).
- Docs: `docs/api/script.md`, `docs/api/cast-script.md`, each `docs/api/packs/<id>-script.md` (a Voicecut section at
  the top; the old per-speaker tables below it are marked as before the cut).

## Tests

- `node --test "tests/*.test.cjs"`: 320/320 pass, 0 skip, 0 todo (was 319; one new).
- `SC.check` and `SC.coverage`: [] [] for all seven; `checkCast`, `checkCourt` clean (in the suite).
- jsdom (`RUNS[i]` by index): 28/28 ok: every tutorial (1, 2, 36, 48, 56, 68, 77, 86), eight customers at level 4 at
  all seven (10, 40, 52, 60, 72, 81, 90), one switch at all seven (7, 39, 51, 59, 71, 80, 89), 3 (pause, settings,
  redo), 9 (Mitch Off: 3 complaints, 0 readouts), 12, 28 (the whole chain, all seven: 18 complaints, 26 readouts).
- No frames: this lane changed no art or layout (Mitch already speaks at the counter for his after-jokes; the driver's
  covering checks passed with his readouts).

## The clip list: `node tools/voice-clips.cjs all`

**8,003 clips** (was 19,142 listed / 17,663 distinct). By speaker: mitch 1,635, marge 564, sal 563, bev 560, gus 556,
vernon 546, reginald 539, kai 536, oakes 257, walt 213, brock 201, hiro 197, tony 196, inferno 194, breeze 192, tasha
183, priya 133, jitters 128, rita 124, lulu 115, pam 110, dennis 104, dale 101, pa 56. Per restaurant: diner 1,144,
pizza 1,359, cafe 1,449, smoothie 1,323, burrito 1,515, sushi 1,186, icecream 1,475, court 491.

By moment: order.part 3,268 (kept, as asked), order.odd 677, complain.gross 513, tutorial.warn 386, mistake 341,
court.return 336, react 875, greet 192, complain 187, smalltalk 154, gross 121, goodbye 121, the rest under 75 each.

## Not done / open

- **Above the 5,000-6,000 target.** order.part alone is 3,268. The rest of the gap is two multipliers outside the
  brief: 'customer' fallback lines recorded in every speaker's voice who has fewer than two of their own (471 of the
  513 `complain.gross` clips, 553 of the 677 `order.odd`), and `court.return` (Mitch, 8 lines x 42 goals, in
  `packs/court/script.js`, not this lane's). Giving each gross-out one fallback line, or letting only own lines say
  `complain.gross`, would save 235 to 471; a `court.return` without `{goal}` about 328.
- Order parts: `<speaker>/order.slot.sauce.noSauce` is one clip id with two texts ("hot sauce: none" at the Burritos,
  "sauce: none" at the Pizza Parlor). Order part ids should carry the pack (words.js `allOrderParts`, not this lane).
- The diner's size readout says "The ticket said medium." for a medium cup, the same words as a medium patty.
