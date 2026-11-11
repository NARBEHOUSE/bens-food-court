# Ben's Smoothie Shack, the script in words (content-smoothie, 2026-11-09)

## Voicecut (phase 3, 2026-11-10): what changed in this script

The user approved cutting the voice script: no recordings exist, and every line is text to speech until a future
voice pass. **The tables and notes below describe the script before this cut where they mention `complain.extra`,
`.unasked`, `.missing`, `.tooMany`, `.tooFew`, `.done`, `.pick` or `.more`: those moments are gone.** Now:

- **Every customer's per-food complaint lines were deleted** (they were recorded once per value, per customer). A
  customer now says one of their own `complain` lines, which name no food and live in `packs/cast/script.js` (8 to 10
  each, locals too; their best old jokes kept, food-free). This pack keeps two 'customer' fallbacks for `complain`.
- **Mitch reads the mistake** (`mistake.extra`, `mistake.unasked`, `mistake.missing`, `mistake.done`, `mistake.pick`, `mistake.more`), one line each, from the ticket and so with
  no pronoun: "The ticket said no {ings}." / "Nobody ordered {ings}." / "The ticket said {ing}. That got left off." /
  "The ticket said {want}." / "The ticket said {wanted}.".
  After two readouts (one after a gross-out) he says `mistake.more`; the receipt still lists every mistake in text.
- **`complain.gross.*` lines have no blanks**: each event is on one thing: the banana (brown), the strawberries (mouldy), the ice (bug, sock).
- **Tutorial warnings are listed only for what the tutorial order runs through** (`SC.varsFor`), and `nearly.1` no longer names the customer. `tutorial.warn.unasked.1` says "the ticket has no {ings}"; `tutorial.warn.pick` uses {wanted} ("Breeze asked for juice base.").
- The file is 331 lines now. `node tools/voice-clips.cjs smoothie` lists its clips; the whole game's report is
  `docs/api/reports/3-voicecut.md`.

`packs/smoothie/script.js` (`BBScripts.smoothie`, 386 lines, every one with a `delivery` note). Format:
`docs/api/script.md`. Who must say what: `docs/api/packs/smoothie.md` section 12. The pack and the script both say
`format: 3`, so `tests/script.test.cjs` checks it. The worked example it follows is the pizza's
(`docs/api/packs/pizza-script.md`); this page says only what is the smoothie's own.

**Check it** (from the game folder; each prints `[]`):

```
node -e "const B=require('./tests/bot.cjs'),SC=require('./js/core/script.js'),R=B.restaurants().find(r=>r.id==='smoothie');console.log(B.schema.validate(R.pack),SC.check(R.pack,R.script),SC.coverage(R.pack,R.script))"
BB_PACKS=smoothie node --test "tests/script.test.cjs"
```

## 1. What lives where

| Lines | Why here |
|---|---|
| Mitch's, in the Hawaiian shirt: shift, uniform, the tutorial at prep, blender (and its cooking) and the bowl bar, every warning, the four gross-outs, `nearly`, the one-liners, the Beach Volleyball Tournament | they name the blenders, the props on the backdrops, Breeze and Brock |
| The `'customer'` fallbacks for every F moment (react.3/2/1, react.gross, complain.*, the four order.odd.*) | the pack must write them |
| The locals' full sets (Breeze, Brock): greet, smalltalk, goodbye, order.gag, odd orders, reactions, complaints, every gross-out | locals have no cast lines |
| The cameo's full set (Tony, the Pizza Parlor's tenor, a level-4 visitor here): visitor.arrive, greet, smalltalk, goodbye, order.dislike, reactions, complaints | a cameo's lines live in the pack that brings him |
| Regulars' and visitors' smoothie lines: reactions, favourites, usual, twin, dislikes, odd orders, complaints, a restaurant-flavoured greet each (four for Sal) | they name the food |
| Their greet, smalltalk, goodbye and mentions | `packs/cast/script.js` (merged in) |

## 2. Conventions (the pizza's, plus these)

- **Ids** `<moment>.<n>`; clip ids `<speaker>/smoothie:<id>[.<value>]`, e.g. `breeze/smoothie:order.gag.3`,
  `vernon/smoothie:complain.pick.1.base.oatMilk`, `gus/smoothie:customer.complain.gross.sock.1.ice`.
- **One varying blank per line**, never at the start; pick lines "for the {slot}, I said {want}" (each `want`; the
  clip is per slot and value: `.size.largeCup`, `.base.oatMilk`). {want} on `complain.done`, `nearly` and the warnings
  is a stage ("super smooth").
- **Gross-outs are all on Add steps**, each on one ingredient (brown: banana, mouldy: strawberries, bug and sock: ice),
  so the `gross.*` and `complain.gross.*` lines use {ing}/{ings} and their grammar fits that one food ("Those {ings}
  are wearing little fur coats").
- **Dislikes are named, not blanked**: Sal's `order.dislike` says "spinach" (held on a Protein Shake), Tony's
  "pineapple" (held on a Green Smoothie). The page says it only after an order that held it (`game.js`), never after
  an odd order.
- **`order.gag` ≤ 20 words.** Breeze's five are surfer calm in short sentences (his gag is in his words, not their
  length; nothing about anyone's speed); Brock's five are "all the protein" (said, never made) and Kevin, his shaker
  bottle. Every one of Brock's also reads true after the event's finale (the page has the finale's customer say a gag).
- **`order.odd.<id>` lines describe the request without contradicting the plain ticket**: `everyFruit` "every fruit"
  (all five), `notGreen` "a green smoothie, but not green" (no spinach), `dogShake` "a small one, no honey, for my
  dog" (said; the dog never drinks it: "he just likes to be included"), `wipeout` "everything, the biggest cup,
  blended until it gives up". Sal has two `wipeout` lines of his own that keep the spinach out, so he never falls back
  to a line that claims it.
- **Sal's greet is his refusal** (spec 2.3): four restaurant-flavoured greets ("I ain't orderin' nothin'... Fine.
  One.") join his six cast greets, so about two in five of his visits start with a refusal and the order sentence
  follows at once. His order never changes for it.
- **The tutorial customer is Breeze**: Mitch's tutorial lines say "he" and "Breeze", and the cook line names Smooth
  (the tutorial's blend).
- **Props named in lines are in the pictures** (the counter's crab in sunglasses, coconut with a face, flamingo in the
  rafters, surf-report board, fruit basket with a pineapple; the blender wall's earmuffs, ukulele, flip-flop; the
  shack's giant cup on the roof in the court picture). Mitch's corporate is still his mom (the pizza's joke), once.
- **Rewritten for freshness**: 42 lines that matched the pizza's or the cast's words were rewritten; three stay on
  purpose (Marge's "The usual, hon.", DESIGN.md's "And that's not even everything.", Mitch's `nearly.1`).
- **Canon kept**: Marge was married forty years and is widowed (the cast's smalltalk); Harold from bingo is new (the
  pizza's and the cafe's odd orders), so her lines name him only as that. Gus's Delores is the truck; Vernon's eleven
  followers and Gerald; Sal's pigeons, cousin, doctor and wife; Breeze's board has never been in the ocean and he
  talked to Brock for an hour (the pizza's Breeze lines); Tony sang twenty minutes at Breeze's pineapple.
- **Delivery notes**: Bev's say "firm, like a coach" (never loud; her `calm` flag lowers the caps for the voice
  model); Sal's say gruff, Brock's pumped or eager, never loud (cast-script.md 3); Breeze's dreamy, slow, serene;
  Tony's operatic; Tasha's flat. `[sigh]`, `[pause]`, `[gasp]` tags stay for the recording.

## 3. Counts per speaker and moment

| Speaker | Lines | greet / smalltalk / goodbye | react.3 / .2 / .1 | react.gross | Other |
|---|---|---|---|---|---|
| mitch | 72 | | | | shift.start 5, shift.end 4, uniform 3; gross.brown/mouldy/bug/sock 3 each; nearly 2; after.3 3, after.1 3, after.gross 2; tutorial.intro/ticket/prep/blender/cook.blender/bowlBar/gross/review/serve 2 each; tutorial.warn.extra/unasked/missing/done/pick/gross/grossSkip 2 each; event.intro/celebrate/again 2 each |
| customer (fallback) | 39 | | 3 / 3 / 3 | 2 | complain.extra/unasked/missing/done/pick/more 2 each; complain.gross.brown/mouldy/bug/sock 2 each; order.odd.everyFruit/notGreen/dogShake/wipeout 2 each |
| breeze (local) | 45 | 5 / 5 / 4 | 4 / 3 / 3 | 2 | order.gag 5; order.odd ×4 (1 each); complain.extra/unasked/missing/done/pick/more 1 each; complain.gross ×4 (1 each) |
| brock (local) | 47 | 5 / 5 / 4 | 4 / 3 / 3 | 2 | order.gag 5; react.favourite 2; order.odd ×4; complain.* 1 each; complain.gross ×4 |
| tony (cameo visitor) | 35 | 4 / 4 / 3 | 3 / 3 / 3 | 1 | visitor.arrive 3, order.dislike 3, complain.extra/unasked/missing/done/pick/more 1 each, complain.gross.mouldy/sock 1 each |
| tasha | 17 | 1 (+ cast) | 3 / 3 / 3 | 1 | order.odd everyFruit/notGreen 1 each, complain.extra/missing/done/pick 1 each |
| marge | 19 | 1 (+ cast) | 3 / 3 / 3 | 1 | order.usual 2, order.odd everyFruit/dogShake 1 each, complain.extra/missing/pick/done 1 each |
| gus | 17 | 1 (+ cast) | 3 / 3 / 3 | 1 | order.twin 2, order.odd.wipeout 1, complain.extra/missing/done 1 each |
| bev | 18 | 1 (+ cast) | 3 / 3 / 3 | 1 | react.favourite 2, order.odd.everyFruit 1, complain.extra/missing/pick/done 1 each |
| vernon | 18 | 1 (+ cast) | 3 / 3 / 3 | 1 | order.odd.notGreen 1, complain.pick 2, complain.done/extra/missing/more 1 each |
| sal | 24 | 4 (+ cast) | 3 / 3 / 3 | 1 | order.dislike 3, order.odd notGreen 1 and wipeout 2, complain.extra/unasked/missing/done 1 each |
| reginald (visitor) | 18 | 1 (+ cast) | 3 / 3 / 3 | 1 | visitor.arrive 3, complain.extra/missing/pick/done 1 each |
| kai (visitor) | 17 | cast only | 3 / 3 / 3 | 1 | visitor.arrive 3, complain.extra/missing/pick/done 1 each |

`SC.everyClip` lists 2067 clips for the smoothie (1883 from this file's lines with every value of each changing blank,
184 from the cast's lines for its people); every blank fills except the cast's `{about}`, which `pickMention` fills at play time.

## 4. What the page should know

- `order.gag` is a local-at-home moment: Breeze and Brock only (and Brock after the event's finale).
- `react.favourite`: Bev and Brock, both on the Protein Shake.
- Lines carry `[sigh]`, `[pause]`, `[gasp]` tags; `SC.clean` drops them for captions and TTS.
- Names with accents: the ticket says "Açaí Bowl" (pack names) and Mitch's lines say "açaí"; ids stay `acai`, `acaiBowl`.
