# Phase 3, lane fix: the three reviewers' findings (2026-11-10)

Every finding was reproduced first (the reviewers' own probes in the scratchpad, `phase3/a11y-review/early-press.cjs`
and `phase3/review-rules/dom1.cjs`, plus `phase3/fix/settings-probe.cjs`), then fixed and run again. Backups:
`docs/backup/<path>.before*` (next free suffix). Nothing went to a games.json, the F: drive or the website; no voices.

## Findings

| # | Finding | Result |
|---|---|---|
| 1 | A press that starts during a playout acts on release | **fixed** (ui.js onKeyDown: a key that goes down while the scan is suspended has its release ignored; it still counts as down for the Timed clock and the 5 s Pause hold. line() also swallows held keys on the non-fresh path). Probe `early`: actedOnRelease false (was true). |
| 2 | The line's Ticket and the review's "Here it is" cut off under one switch | **fixed** (BB.ui.narrate exported; the line's Ticket and the review prompt (`line(..., { narrate: true })`) hold Auto Scan until the words end, then one interval). announce() no longer writes "ketchup.. Ticket". Probe `autoticket` at 70 ms/char: the ticket ended at 4.4 s, "Pause" came at 6.6 s (was cut at 2.0 s). |
| 3, 9 | Long tickets and tutorial lines cut at the voice manager's 10 s cap | **fixed** in both paths: game.js narrate() keeps waiting past a 'timeout' while `speechSynthesis.speaking` (250 ms looks, 2 min cap, stops if the run changes); audio.js say() does the same past its cap (reads `env.speechSynthesis.speaking` only; the guard test now allows exactly that one read). Probe `tut` (pizza, 70 ms/char): the 164-char ticket ended at 11.5 s, Mitch's 202-char prep table line at 14.2 s; `ticket2`: a 220-char ticket ended at 15.4 s. New test in voices.test.cjs. |
| 4 | Timed: "Take it off" label names the first stage | **fixed** (game.js entryOf: the takeOff entry's say is worked out when spoken; on a stage change with Take It Off lit only its label is said). Probe `timed`: "Take it off. Raw / Rare / Medium" as the gauge moved; scanning back on Medium says "Take it off. Medium". |
| 5 | Receipt stars differ by colour only | **fixed** (stage.js: unearned ☆ plus the number, "★★☆ 2"; bb.css `.num`). Frame `fix/cafe/counter@16x9-06-receipt.png`. |
| 6 | Pause label clipped at Extra Large on the court and in the kitchen | **fixed** (bb.css `#back5 { bottom: max(5vh, --small x 1.9) }`; composer mirrors it). Frame `fix/court/court@16x9-xlarge-01-in-focus.png`: the whole label shows. |
| 7 | A finished shift left from its last receipt is not counted | **fixed** (game.js bank(): Food Court, Main Menu, Exit Game, Restart Shift and pagehide count a finished, uncounted, non-tutorial shift and clear its save; counted shifts are never saved again; Pause texts say "This shift is finished and counted." when done). Probe dom1: popularity 2 to 3 and the Smoothie Shack's Grand Opening queued on return (was not counted). |
| 8 | Settings changed mid-shift ignored, even by Restart Shift | **fixed** (Restart Shift passes the current Settings for a real shift; Cooking Speed applies at once through BB.save.onChange and on resuming a saved shift; Cooking and Order Size say "From the next shift."). Probe: speed normal to verySlow live; restart took length 5 and Simple. |
| 10 | Tutorial Pause promises a replay | **fixed** ("The tutorial stops here."). |
| 11 | Ice Cream Help: "first three flavours" | **fixed** ("The first two flavors"; verified in line.js pickOptions: room 3 with Done, so 2 + More). |
| 12 | One Item still serves two-item tutorials | **fixed by wording**: the tutorial is meant to visit every station, so the row now says "Every order in a shift is one item." |
| 13 | Hear It Again says "1 stars" | **fixed**. |
| 14 | Burrito "Redo the Order" | **fixed** ("Redo the Fillings"; docs/api/packs/burrito.md too). |
| 15 | Ice cream gauge and bubble over the cone | **fixed for the gauge** (bb.css: at the Emporium's freezer case the gauge sits at 66%; composer mirrors it). Frame `fix/icecream/timed-01-timed-scoop.png`: the cup in its stand is clear. **Left:** Mitch's 3.5 s "nearly" bubble can still touch a tall cone's rim (kitchen bubble placement is shared by every station). |
| 16 | British and US spelling mixed | **fixed** in player text: 56 words in the scripts, cast and ice cream pack (favorite, flavor, color, gray, apologize, practicing, honor, parlor, cozy...), the receipt's "(a favorite!)". Identifiers kept. "Colour Profile" kept: it is the spec's and the hub's row name (Fish Mystery, Sphere Splash). New `tests/spelling.test.cjs`. |
| 17 | Gus's "three states" and Delores told twice | **fixed** (pizza react.3.2 "haul it to Tulsa", burrito react.3.3 "drive all night", cast goodbye.c5 "Delores and I thank ya.", complain.c5 "Hold on, buddy. Even Delores would send this back."). |
| 18 | Goal board covers the line at Extra Large | **fixed** (court.js fitBoard: the letters step down until the board's top is under the lowest foot of the lines behind it, never under 72% of Text Size; measured with offsets so the camera zoom does not affect it; composer mirrors it). Frame `fix/court/court@16x9-xlarge-01-in-focus.png`: everyone in line stands clear; the board's letters are 21 px (28 px Text Size, still above Normal's 18). |
| 19 | Served Cafe drinks dwarf the customer | **fixed** (cafe.js CUP_COUNTER 0.7: a drink on the counter, the donut keeps its scale). Frame `fix/cafe/counter@16x9-09-three-items.png`: Bev's arms and clipboard show, the cup is under her shoulders. |
| 20 | Help texts disagree | **fixed** (diner starts "Ben's Burger Bar." and ends with the shared Swap It sentence; ice cream "a cone, a waffle cone or a cup"; sushi "White, Brown or None"). |
| 21 | Grand Opening board shows the next goal early | **fixed** (court.js boardLines: a storefront whose Grand Opening has not reached its banner step counts as shut). Frame `fix/court/moments@16x9-open-01-shutter-rolling.png`: "The Smoothie Shack opens next." |

## Files changed (each backed up first)

js/ui.js, js/game.js, js/audio.js, js/court.js, js/stage.js, js/food/cafe.js, css/bb.css; packs/burrito/pack.js,
packs/diner/pack.js, packs/icecream/pack.js, packs/sushi/pack.js; packs/{burrito,cast,diner,icecream,pizza,smoothie,
sushi}/script.js, packs/cast/cast.js (spelling, the Gus lines); tests/voices.test.cjs (the cap test, the guard),
tests/spelling.test.cjs (new); tools/review_compose.py, tools/review-frames.cjs (mirror the board fit, the Back in 5
sign, the gauge, the receipt number); docs/api/page.md (BB.ui.line opts, narrate, litId), docs/api/packs/burrito.md.

## Checks

- `node --test "tests/*.test.cjs"`: 323/323 pass (320 at the start; +1 voices, +2 spelling).
- jsdom (`tests/dom-play.cjs`), all ok, no script errors: the page boots; leaving (counted once); a 3-customer shift
  with the settings tour, Pause and resume; the 5 s Enter hold during the arrival (Timed); Timed holding Take It Off
  at all seven; one switch at all seven and through the parts of the U; the tutorial at all seven; every "heard in
  full" run; the court Pause; the crowd tiers; a Grand Opening; a gold sign; the Pizza unlock and the Burritos'
  earned Grand Opening; the Cafe counter at 16:9.
- Frames (CPU, `art-source/review/fix/`): court (every shape, Extra Large), moments, the Emporium's Timed scoop, the
  Cafe counter at 16:9 and 4:3.

## Not done

- Mitch's short "nearly" bubble in the kitchen can still touch the rim of a tall cone at the freezer case (finding
  15's second half); the kitchen bubble's place is shared by every station and was left alone.
- The board at Extra Large on a 16:9 window is 21 px rather than 28 px (the fit's floor is 72%); at 21:9 Normal it
  steps 22 to 21 px.
