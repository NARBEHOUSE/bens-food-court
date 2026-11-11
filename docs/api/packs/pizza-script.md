# Ben's Pizza Parlor, the script in words (content-pizza: pizza-script, 2026-11-08)

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
- **`complain.gross.*` lines have no blanks**: each event is on one topping, so the lines name it: the cheese (hair), the mushrooms (mouldy), the pepperoni (fly).
- **Tutorial warnings are listed only for what the tutorial order runs through** (`SC.varsFor`), and `nearly.1` no longer names the customer ("Nearly {want}. That's the one on the ticket."). `tutorial.warn.unasked.1` says "the ticket has no {ings}"; `tutorial.warn.pick` says "He said {wanted}." / "The ticket says {wanted}." (was "{slot}, {want}": "sauce, none").
- The file is 317 lines now. `node tools/voice-clips.cjs pizza` lists its clips; the whole game's report is
  `docs/api/reports/3-voicecut.md`.

`packs/pizza/script.js` (`BBScripts.pizza`, 371 lines, every one with a `delivery` note) is the worked example of a
restaurant script for phase 2b. Format: `docs/api/script.md`. Who must say what: `docs/api/packs/pizza.md` section 12.
The pack now says `format: 3`, so `tests/script.test.cjs` checks it (`BB_PACKS=pizza node --test "tests/script.test.cjs"`).
Read this instead of the file when you write the next restaurant's script.

**Check it** (from the game folder):

```
BB_PACKS=pizza node --test "tests/script.test.cjs"
node -e "const b=require('./tests/bot.cjs');const R=b.restaurants().find(r=>r.id==='pizza');console.log(b.SC.check(R.pack,R.script),b.SC.coverage(R.pack,R.script))"
```

## 1. What lives where

| Lines | File | Why |
|---|---|---|
| Mitch's, in the pizza uniform: shift, uniform, every tutorial station and cook step, every warning, every gross-out, `nearly`, the one-liners, the Pizza Party | `packs/pizza/script.js` | they name the oven, the peel, Tony |
| The `'customer'` fallbacks for every F moment (react.3/2/1, react.gross, every complain.*, every order.odd.*) | `packs/pizza/script.js` | the pack must write them (script.md 3) |
| Locals' full sets (Tony, Pam): greet, smalltalk, goodbye, order.gag, dislikes, odd orders, reactions, complaints | `packs/pizza/script.js` | locals have no cast lines |
| The cameo's full set (Breeze, the Smoothie Shack's local, here as a level-4 visitor): visitor.arrive, greet, smalltalk, goodbye, reactions, complaints | `packs/pizza/script.js` | a cameo's lines live in the pack that brings him (cast-script.md) |
| Regulars' and visitors' lines about the pizza: reactions, favourites, dislikes, twin/usual, odd orders, complaints, a few restaurant-flavoured greets | `packs/pizza/script.js` | they name the food |
| Their greet, smalltalk, goodbye (and mentions) | `packs/cast/script.js` | merged in; they count as the speaker's own |

## 2. Conventions settled here (copy them)

- **Ids are `<moment>.<n>`**, the moment id verbatim: `react.3.1`, `complain.gross.fly.2`, `order.odd.heartShaped.1`,
  `tutorial.cook.oven.2`. Unique per speaker. The cast script uses `.c<n>`, so the two never collide. Clip ids come out
  as `tony/pizza:react.3.1`, `bev/pizza:customer.complain.pick.1.sauce.noSauce` (a fallback said by Bev).
- **One `each` per line**, naming the one blank whose value changes the words, and a line uses one varying blank
  only (plus `{name}`): `{ing}`/`{ings}` on Add moments (each `'ing'` or `'ings'`), `{want}` on stage and pick moments
  (each `'want'`). A `complain.done` line never has both `{want}` and `{got}`: the recording would be per `want` while
  the words changed with `got`.
- **Pick lines say "for the {slot}, I said {want}"** (or "the ticket says {slot}: {want}"), never "{want} {slot}":
  the None sauce fills as "none", so "I said none sauce" reads wrong while "for the sauce, I said none" and "for the
  slices, I said 8" read right. With each `'want'` the clip is per slot and value (`.sauce.noSauce`, `.slices.eight`),
  four slots × three values = twelve recordings a line.
- **No line starts with a varying blank**: the fill is lower case ("sauce", "golden"), so a leading blank would start a
  caption in lower case. `{name}` keeps its case (the event's name, the customer's), so `{name} was a hit!` is fine.
- **Gross-outs are all on Add steps**, so `gross.*`, `complain.gross.*`, `tutorial.warn.gross` and `.grossSkip` use
  `{ing}`/`{ings}` only. The blank fills with the one ingredient each gross-out sits on (hair: cheese, mouldy:
  mushrooms, fly: pepperoni), so a line can also name the food outright; the blank keeps it true if pizza-pack moves one.
- **Dislikes are named, not blanked**: Tony's `order.dislike` says "pineapple" and Oakes's says "onions" (each has one
  dislike here), which reads better and records once. A pack whose customer has several dislikes should use `{ing}`.
- **`order.gag` is 20 words or fewer** (8 s at a character's rate). Tony's gags are pineapple and purism; Pam's are "for
  twelve" (four) plus one "for the whole party" that still reads true when she orders the Pizza Party's finale.
- **`order.odd.<id>` lines describe the ridiculous request** without contradicting the plain ticket (no halves, no
  anchovies, no heart on a normal shift: "I'm proposing" is the joke, the ticket is a round pepperoni). The fallback
  has two per odd order; eight customers have their own `heartShaped` (each proposing to someone true to them), and a
  few have their own `justCrust`, `halfAndHalf` or `allTheWay`.
- **Tutorial lines say "he"** because the tutorial customer is Tony; a pack with a different tutorial customer rewrites
  the pronoun. `tutorial.cook.oven` names the Simple choice (Golden) and mentions Pull It Out for Timed.
- **`nearly.1` uses `{name}`** ("That's what {name} wanted", DESIGN.md's example) and `nearly.2` does not. `{name}` is
  not a varying blank, so `everyClip` lists `nearly.1` once with the speaker's own name in it: the voice pass must
  either record it per customer or leave `{name}` lines to text to speech (Request to core-b in the report).
- **The cast's greet/smalltalk/goodbye cover the regulars' minimums**; the pack adds one restaurant-flavoured `greet`
  for seven of them (Marge, Gus, Bev, Vernon, Sal, Oakes, Reginald). With two or more own lines a speaker never falls
  back, so a character with exactly one own complaint line says it plus the two fallbacks.
- **Tone checks I applied to every line**: the joke is on the customer, the food or Mitch; nothing about the player's
  speed or skill; nobody hurries anyone (no "quick", "hurry", "I've got twenty minutes"); PG; Tony's humour is grandeur
  and passion (no accent, no nationality); Breeze's is in his words, not their length.

## 3. Counts per speaker and moment

| Speaker | Lines | greet / smalltalk / goodbye | react.3 / .2 / .1 | react.gross | Other |
|---|---|---|---|---|---|
| mitch | 71 | | | | shift.start 5, shift.end 4, uniform 3; gross.hair/mouldy/fly 3 each; nearly 2; after.3 3, after.1 3, after.gross 2; tutorial.intro/ticket/prep/oven/cook.oven/cut/knotBasket/gross/review/serve 2 each; tutorial.warn.extra/unasked/missing/done/pick/gross/grossSkip 2 each; event.intro/celebrate/again 2 each |
| customer (fallback) | 37 | | 3 / 3 / 3 | 2 | complain.extra/unasked/missing/done/pick/more 2 each; complain.gross.hair/mouldy/fly 2 each; order.odd.justCrust/halfAndHalf/heartShaped/allTheWay 2 each |
| tony (local) | 45 | 5 / 5 / 4 | 4 / 3 / 3 | 2 | order.dislike 3, order.gag 4, order.odd justCrust/heartShaped/allTheWay 1 each, complain.extra/unasked/missing/done/pick/more 1 each, complain.gross.hair/mouldy/fly 1 each |
| pam (local) | 40 | 5 / 5 / 4 | 3 / 3 / 3 | 1 | order.gag 5, order.odd heartShaped/justCrust/halfAndHalf 1 each, complain.extra/unasked/missing/pick/more 1 each, complain.gross.fly/hair/mouldy 1 each |
| breeze (cameo visitor) | 29 | 4 / 4 / 3 | 3 / 3 / 3 | 1 | visitor.arrive 3, complain.missing/extra/pick/done 1 each, complain.gross.fly 1 |
| marge | 19 | 1 (+ cast) | 3 / 3 / 3 | 1 | order.usual 2, order.odd heartShaped/justCrust 1 each, complain.extra/missing/pick/done 1 each |
| gus | 17 | 1 (+ cast) | 3 / 3 / 3 | 1 | order.twin 2, order.odd.heartShaped 1, complain.extra/missing/done 1 each |
| bev | 19 | 1 (+ cast) | 3 / 3 / 3 | 1 | react.favourite 2, order.odd.heartShaped 1, complain.extra/unasked/missing/pick/done 1 each |
| vernon | 19 | 1 (+ cast) | 3 / 3 / 3 | 1 | order.odd heartShaped/allTheWay 1 each, complain.pick 2, complain.done/extra/missing/more 1 each |
| sal | 19 | 1 (+ cast) | 3 / 3 / 3 | 1 | react.favourite 2, order.odd heartShaped/halfAndHalf 1 each, complain.extra/unasked/missing/done 1 each |
| oakes | 21 | 1 (+ cast) | 3 / 3 / 3 | 1 | order.dislike 3, order.odd heartShaped/halfAndHalf 1 each, complain.extra/unasked/missing/done/pick 1 each |
| reginald (visitor) | 18 | 1 (+ cast) | 3 / 3 / 3 | 1 | visitor.arrive 3, complain.extra/missing/pick/done 1 each |
| kai (visitor) | 17 | cast only | 3 / 3 / 3 | 1 | visitor.arrive 3, complain.extra/missing/pick/done 1 each |

`SC.everyClip` lists 2174 clips for the pizza (1989 from this file, with every value of each changing blank; 185 from
the cast's lines for its people); every blank fills except the cast's `{about}`, which `pickMention` fills at play time.

## 4. What the page should know

- `order.gag` is a local-at-home moment (`CAST.isLocalHere`): Tony and Pam only. Breeze has none, on purpose.
- Pam's `order.gag.5` ("for the whole party") is the one that fits the Pizza Party's finale; the other four say
  "twelve". If the page ever wants the event to pick a gag, it can prefer that id.
- `react.gross`, `complain.*` and `order.odd.*` have 'customer' fallbacks, so any customer with fewer than two own
  lines says their own line plus those (`SC.candidates`).
- Lines carry `[gasp]`, `[pause]`, `[sigh]` tags for the voice pass; `SC.clean` drops them for captions and TTS.
